import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { User } from '../auth/user.entity'
import { Employee } from '../employees/employee.entity'
import { ApprovalDelegation } from './entities/approval-delegation.entity'
import {
  delegationCategories, delegationLocalDate, delegationSchemaReady, DELEGATION_DAYS_MAX, DELEGATION_MIGRATION_MISSING, DELEGATION_NOT_FOUND,
} from './approval-delegations'
import { isRequestCategory } from './request-category-chains'

export interface DelegationInput {
  /** المفوِّض — فاضي = صاحب الحساب نفسه. لغيره: صلاحية «بانِي دورات الاعتماد» */
  delegatorEmployeeId?: number | null
  delegateEmployeeId: number
  startDate: string
  endDate: string
  /** فاضي = كل الفئات */
  categories?: string[] | null
  reason?: string | null
}

export type DelegationState = 'UPCOMING' | 'ACTIVE' | 'ENDED' | 'REVOKED'

type StoredRow = {
  id: number; delegatorEmployeeId: number; delegateEmployeeId: number; startDate: string; endDate: string; categories: string | null; reason: string | null
  createdAt: Date; revokedAt: Date | null
}

const EMPLOYEE_NOT_FOUND = 'الموظف غير موجود'
const DATE = /^\d{4}-\d{2}-\d{2}$/
// التاريخين نص من القاعدة (عمود date من المشغّل بييجي بتوقيت الجهاز ويتزحزح)
const SELECT = `SELECT [id], [delegatorEmployeeId], [delegateEmployeeId], CONVERT(nvarchar(10), [startDate], 23) AS [startDate], CONVERT(nvarchar(10), [endDate], 23) AS [endDate],
  [categories], [reason], [createdAt], [revokedAt] FROM [approval_delegations]`
const validDate = (value: unknown): value is string =>
  typeof value === 'string' && DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)

/**
 * B2.6-ب: تفويض الاعتمادات — إنشاء وإلغاء وقايمة. الموظف ينشئ تفويضه لنفسه، وصاحب «بانِي دورات الاعتماد» عن موظف في نطاقه.
 * القاعدة نفسها (مين الخطوة مستنياه) في ApproverResolver.holdsStep؛ هنا السجل بس.
 */
@Injectable()
export class ApprovalDelegationsService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private manages(user: JwtPayload) { return userHasPerm(user, 'approval_chains.manage') }

  /** المفوِّض اللي مابقاش موظف شغال تفويضه واقف (approval-delegations.ts)، فبيتعرض «انتهى» */
  private state(row: Pick<StoredRow, 'startDate' | 'endDate' | 'revokedAt'>, today: string, delegatorActive: boolean): DelegationState {
    return row.revokedAt ? 'REVOKED' : row.endDate < today || !delegatorActive ? 'ENDED' : row.startDate > today ? 'UPCOMING' : 'ACTIVE'
  }

  /** الحساب يقدر يلغي التفويض؟ المفوِّض نفسه، أو صاحب الصلاحية والمفوِّض في نطاقه — والتفويض لسه مانتهاش ولا اتلغى */
  private mayRevoke(user: JwtPayload, row: Pick<StoredRow, 'delegatorEmployeeId'>, delegatorBranchId: number | null | undefined) {
    return (!!user.employeeId && user.employeeId === row.delegatorEmployeeId)
      || (this.manages(user) && delegatorBranchId != null && inBranchScope(branchScopeOf(user), delegatorBranchId))
  }

  /**
   * تفويضاتي (أنا المفوِّض)، واللي أنا بديل فيها (السارية والجاية)، ولصاحب الصلاحية: تفويضات موظفي نطاقه. الأسماء لموظفي نطاق القارئ،
   * وللطرف التاني في تفويض القارئ طرف فيه.
   */
  async list(user: JwtPayload) {
    const em = this.ds.manager, canManageOthers = this.manages(user), today = delegationLocalDate(new Date())
    if (!(await delegationSchemaReady(em))) return { available: false, canManageOthers, approver: false, mine: [], toMe: [], others: [] }
    const me = user.employeeId ?? null
    const mine: StoredRow[] = me ? await em.query(`${SELECT} WHERE [delegatorEmployeeId] = @0 ORDER BY [id] DESC OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY`, [me]) : []
    const toMe: StoredRow[] = me
      ? await em.query(`${SELECT} WHERE [delegateEmployeeId] = @0 AND [revokedAt] IS NULL AND [endDate] >= @1 ORDER BY [startDate], [id] OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY`, [me, today])
      : []
    const scope = branchScopeOf(user)
    // تفويضات غيري: للي المفوِّض فيها في نطاقي بس
    const others: StoredRow[] = !canManageOthers ? [] : await em.query(
      `${SELECT} d WHERE (@0 IS NULL OR d.[delegatorEmployeeId] <> @0) AND EXISTS (SELECT 1 FROM [employees] e WHERE e.[id] = d.[delegatorEmployeeId]
        ${scope === null ? '' : scope.length ? `AND e.[branchId] IN (${scope.map(Number).join(', ')})` : 'AND 1 = 0'})
       ORDER BY d.[id] DESC OFFSET 0 ROWS FETCH NEXT 200 ROWS ONLY`, [me])
    const ids = [...new Set([...mine, ...toMe, ...others].flatMap(row => [Number(row.delegatorEmployeeId), Number(row.delegateEmployeeId)]))]
    const employees = ids.length ? await em.getRepository(Employee).find({ where: { id: In(ids) }, select: { id: true, fullName: true, branchId: true, isActive: true } }) : []
    const byId = new Map(employees.map(row => [row.id, row]))
    const view = (row: StoredRow, party: boolean) => {
      const delegator = byId.get(Number(row.delegatorEmployeeId)), delegate = byId.get(Number(row.delegateEmployeeId))
      const shown = (employee: Employee | undefined) => !!employee && (party || inBranchScope(scope, employee.branchId))
      const state = this.state(row, today, !!delegator?.isActive)
      return {
        id: Number(row.id), delegatorEmployeeId: Number(row.delegatorEmployeeId), delegateEmployeeId: Number(row.delegateEmployeeId),
        delegatorName: shown(delegator) ? delegator!.fullName : null, delegateName: shown(delegate) ? delegate!.fullName : null,
        startDate: row.startDate, endDate: row.endDate, categories: delegationCategories(row.categories), reason: row.reason ?? null,
        createdAt: row.createdAt, revokedAt: row.revokedAt ?? null, state,
        canRevoke: (state === 'ACTIVE' || state === 'UPCOMING') && this.mayRevoke(user, row, delegator?.branchId),
      }
    }
    return { available: true, canManageOthers, approver: await this.structuralApprover(em, me),
      mine: mine.map(row => view(row, true)), toMe: toMe.map(row => view(row, true)), others: others.map(row => view(row, false)) }
  }

  /**
   * الموظف معتمد هيكلي؟ مدير مسجّل لموظف شغال، أو قائد فريق، أو مدير قسم أو إدارة أو فرع، أو مسمّى في خطوة سلسلة. بيها بند «بانتظار
   * موافقتي» بيظهر لحساب «موظف» والصندوق فاضي: منه بيسجّل تفويضه قبل إجازته.
   */
  private async structuralApprover(em: EntityManager, employeeId: number | null): Promise<boolean> {
    if (!employeeId) return false
    const [row]: Array<{ approver: number }> = await em.query(
      `SELECT CASE WHEN EXISTS (SELECT 1 FROM [employees] WHERE [managerEmployeeId] = @0 AND [isActive] = 1)
         OR EXISTS (SELECT 1 FROM [teams] WHERE [leaderEmployeeId] = @0)
         OR EXISTS (SELECT 1 FROM [departments] WHERE [managerEmployeeId] = @0)
         OR EXISTS (SELECT 1 FROM [branches] WHERE [managerEmployeeId] = @0)
         OR EXISTS (SELECT 1 FROM [approval_steps] WHERE [specificEmployeeId] = @0) THEN 1 ELSE 0 END AS [approver]`, [employeeId])
    return Number(row?.approver) === 1
  }

  async create(user: JwtPayload, input: DelegationInput) {
    const scope = branchScopeOf(user), today = delegationLocalDate(new Date())
    const delegatorId = input.delegatorEmployeeId ?? user.employeeId ?? null
    if (!delegatorId) throw new BadRequestException('حسابك مش مربوط بموظف — التفويض بيتسجّل على موظف')
    const forOther = delegatorId !== user.employeeId
    if (forOther && !this.manages(user)) throw new ForbiddenException('تفويض اعتمادات موظف تاني لصاحب صلاحية «بانِي دورات الاعتماد» بس')
    // اللي بيسجّل تفويض عن غيره مايحطّش نفسه بديل: كان هياخد خطوات غيره المفتوحة ويقرا طلباته السرية من غير ما صاحبها يفوّضه
    if (forOther && input.delegateEmployeeId === user.employeeId) {
      throw new BadRequestException('ماتقدرش تسجّل نفسك بديل عن موظف تاني — خلّيه يسجّل تفويضه بنفسه، أو يسجّله صاحب صلاحية غيرك')
    }
    if (!validDate(input.startDate) || !validDate(input.endDate)) throw new BadRequestException('تاريخ بداية ونهاية التفويض بصيغة YYYY-MM-DD')
    if (input.endDate < input.startDate) throw new BadRequestException('نهاية التفويض قبل بدايته')
    if (input.endDate < today) throw new BadRequestException('فترة التفويض خلصت — اختار نهاية من النهارده أو بعده')
    if (daysBetween(input.startDate, input.endDate) + 1 > DELEGATION_DAYS_MAX) throw new BadRequestException('فترة التفويض أقصاها سنة')
    const categories = [...new Set(input.categories ?? [])]
    if (categories.some(category => !isRequestCategory(category))) throw new BadRequestException('فئة طلبات غير معروفة')
    const reason = typeof input.reason === 'string' && input.reason.trim() ? input.reason.trim() : null
    if (reason && reason.length > 300) throw new BadRequestException('سبب التفويض بحد أقصى 300 حرف')
    if (input.delegateEmployeeId === delegatorId) throw new BadRequestException('البديل لازم يكون موظف تاني')

    return this.ds.transaction(async em => {
      if (!(await delegationSchemaReady(em))) throw new BadRequestException(DELEGATION_MIGRATION_MISSING)
      const employees = em.getRepository(Employee)
      const delegator = await employees.findOne({ where: { id: delegatorId }, select: { id: true, fullName: true, branchId: true, isActive: true } })
      // مفوِّض برّه نطاق صاحب الصلاحية = نفس رد الموظف اللي مش موجود
      if (!delegator || !delegator.isActive || (forOther && !inBranchScope(scope, delegator.branchId))) throw new NotFoundException(EMPLOYEE_NOT_FOUND)
      const delegate = await employees.findOne({ where: { id: input.delegateEmployeeId }, select: { id: true, fullName: true, branchId: true, isActive: true } })
      // نفس دليل الموظفين (/employees/directory): نشط وفي نطاق اللي بينشئ التفويض
      if (!delegate || !delegate.isActive || !inBranchScope(scope, delegate.branchId)) throw new NotFoundException(EMPLOYEE_NOT_FOUND)
      if (!(await em.getRepository(User).count({ where: { employeeId: delegate.id, isActive: true } }))) throw new BadRequestException('البديل مالوش حساب شغال في النظام')
      // تفويضين في نفس اللحظة لنفس المفوِّض: واحد ورا التاني
      await this.lockDelegator(em, delegatorId)
      const [overlap] = await em.query(
        `SELECT TOP (1) [id] FROM [approval_delegations] WHERE [delegatorEmployeeId] = @0 AND [revokedAt] IS NULL AND [startDate] <= @2 AND [endDate] >= @1`,
        [delegatorId, input.startDate, input.endDate])
      if (overlap) throw new ConflictException('للمفوِّض تفويض قايم في نفس الفترة — الغيه الأول أو اختار فترة تانية')
      const repo = em.getRepository(ApprovalDelegation)
      const saved = await repo.save(repo.create({
        delegatorEmployeeId: delegatorId, delegateEmployeeId: delegate.id, startDate: input.startDate, endDate: input.endDate,
        categories: categories.length ? JSON.stringify(categories) : null, reason, createdByUserId: user.sub, createdAt: new Date(), revokedAt: null, revokedByUserId: null,
      }))
      // منح حق اعتماد لحد تاني: في سجل التدقيق مع التفويض نفسه
      await recordAudit(em, { category: 'PERMISSIONS', action: 'APPROVAL_DELEGATION_CREATED', entityType: 'approval_delegation', entityId: saved.id, actorUserId: user.sub,
        branchId: delegator.branchId ?? null,
        // السجل بيتقري بفرع المفوِّض: اسم البديل بيتكتب لو من نفس الفرع بس (رقمه في التفاصيل)
        summary: `تفويض اعتمادات ${delegator.fullName} لـ${delegate.branchId === delegator.branchId ? delegate.fullName : 'موظف من فرع تاني'} من ${input.startDate} لـ${input.endDate}`,
        after: { delegatorEmployeeId: delegatorId, delegateEmployeeId: delegate.id, startDate: input.startDate, endDate: input.endDate, categories: categories.length ? categories : null } })
      return { id: saved.id }
    })
  }

  async revoke(user: JwtPayload, id: number) {
    return this.ds.transaction(async em => {
      if (!(await delegationSchemaReady(em))) throw new NotFoundException(DELEGATION_NOT_FOUND)
      const repo = em.getRepository(ApprovalDelegation)
      const row = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      const delegator = row ? await em.getRepository(Employee).findOne({ where: { id: row.delegatorEmployeeId }, select: { id: true, fullName: true, branchId: true } }) : null
      // تفويض مش بتاعه ولا في نطاق صلاحيته = نفس رد التفويض اللي مش موجود
      if (!row || !this.mayRevoke(user, row, delegator?.branchId)) throw new NotFoundException(DELEGATION_NOT_FOUND)
      if (row.revokedAt) throw new BadRequestException('التفويض ملغي فعلًا')
      const [dates]: Array<{ endDate: string }> = await em.query(`SELECT CONVERT(nvarchar(10), [endDate], 23) AS [endDate] FROM [approval_delegations] WHERE [id] = @0`, [id])
      if (dates.endDate < delegationLocalDate(new Date())) throw new BadRequestException('التفويض انتهى')
      await repo.update({ id }, { revokedAt: new Date(), revokedByUserId: user.sub })
      await recordAudit(em, { category: 'PERMISSIONS', action: 'APPROVAL_DELEGATION_REVOKED', entityType: 'approval_delegation', entityId: id, actorUserId: user.sub,
        branchId: delegator?.branchId ?? null, summary: `إلغاء تفويض اعتمادات ${delegator?.fullName ?? ''}`.trim(),
        before: { delegatorEmployeeId: row.delegatorEmployeeId, delegateEmployeeId: row.delegateEmployeeId } })
      return { id }
    })
  }

  private async lockDelegator(em: EntityManager, delegatorEmployeeId: number) {
    const rows = await em.query(
      `DECLARE @result int;
       EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 15000;
       SELECT @result AS lockResult;`, [`hr:approval-delegation:${delegatorEmployeeId}`])
    if (!rows.length || Number(rows[0].lockResult) < 0) throw new ConflictException('تعذر تسجيل التفويض دلوقتي — حاول تاني')
  }
}
