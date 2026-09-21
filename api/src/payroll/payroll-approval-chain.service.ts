import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource, EntityManager, In } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, branchScopeOf, userHasPerm } from '../auth/guards'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { PayrollItem, PayrollRun, PayrollRunMember } from './payroll.entities'
import { PayrollRunEvent } from './payroll-membership.entities'
import { PayrollApprovalChain, PayrollRunApproval } from './payroll-approval-chain.entities'
import {
  buildPayrollChainResolver, normalizePayrollChainSteps, parsePayrollChainSteps, payrollChainHash, payrollChainProgress, payrollChainReason, payrollChainResolver, payrollChainSeriesKey,
  payrollChainStepMatchesUser, readPayrollChains, readPayrollRunApprovals, resolvePayrollRunChain, voidPayrollRunApprovals,
  type PayrollChainProgress, type PayrollChainStep, type ResolvedPayrollChain,
} from './payroll-approval-chain'
import { PAYROLL_CALCULATION_EVENT_TYPES, PAYROLL_SELF_APPROVAL_KEY, payrollSelfApprovalAllowed, payrollSelfApprovalIssue } from './payroll-run-approval'
import { payrollRunSeriesName } from './payroll-run-membership-moves'
import { payrollRunTypeOf } from './payroll-corrections'
import { lockPayrollRunForCorrection } from './payroll-reversal-ledger'
import { describePayrollItemsLines } from './payroll-item-lines'
import { payrollItemSettlementPayout } from './payroll-settlement-salary'
import { PayrollService } from './payroll.service'

// سلسلة اعتماد المسير: إعدادها (سلسلة الشركة + سلسلة خاصة بمسير دائم)، و«مسيرات بانتظار اعتمادي»، واعتماد الخطوة أو رفضها بسبب.
// تسمية الشخص في السلسلة هي المنحة: صاحب الخطوة الحالية يقرأ المسير المنتظر عنده ويعتمد خطوته أو يرفضها حتى لو دوره
// بلا أي صلاحية رواتب — والمنحة محصورة في المسيرات المنتظرة عنده وطول ما هي منتظرة عنده بس.

const NOT_YOUR_TURN = 'المسير ده مش منتظر اعتمادك'

interface UserRef { id: number; name: string | null }

@Injectable()
export class PayrollApprovalChainService {
  constructor(private readonly dataSource: DataSource, private readonly payroll: PayrollService) {}

  private get manager() { return this.dataSource.manager }

  // ===== أسماء وحسابات =====
  private async userNames(em: EntityManager, ids: Array<number | null | undefined>) {
    const unique = [...new Set(ids.filter((id): id is number => Number.isSafeInteger(id) && Number(id) > 0))]
    if (!unique.length) return new Map<number, string>()
    const rows: Array<{ id: number; displayName: string | null }> = await em.query(
      `SELECT [id], [displayName] FROM [users] WHERE [id] IN (${unique.map((_, index) => `@${index}`).join(', ')})`, unique)
    return new Map(rows.map(row => [Number(row.id), row.displayName || 'حساب بلا اسم']))
  }

  private async roleNames(em: EntityManager) {
    const rows: Array<{ code: string; nameAr: string; isActive: boolean | number }> = await em.query('SELECT [code], [nameAr], [isActive] FROM [roles] ORDER BY [nameAr]')
    return rows.map(row => ({ code: String(row.code), nameAr: String(row.nameAr), isActive: row.isActive === true || Number(row.isActive) === 1 }))
  }

  private async selfApprovalAllowed(em: EntityManager) {
    const row = await em.getRepository(RequestsConfig).findOne({ where: { key: PAYROLL_SELF_APPROVAL_KEY } })
    return payrollSelfApprovalAllowed(row?.value ?? 'false')
  }

  // من احتسب نسخة الحساب الحالية: العمود المحفوظ، وللمسيرات السابقة له آخر حدث حساب مسجل (نفس قاعدة PayrollService).
  private async runCalculator(em: EntityManager, run: PayrollRun): Promise<number | null> {
    if (run.calculatedBy != null) return run.calculatedBy
    if (run.status === 'DRAFT') return null
    const event = await em.getRepository(PayrollRunEvent).findOne({ where: { runId: run.id, eventType: In([...PAYROLL_CALCULATION_EVENT_TYPES]) }, order: { id: 'DESC' } })
    return event?.actorUserId ?? null
  }

  private async hasRunAccess(user: JwtPayload, run: PayrollRun, em: EntityManager) {
    try { await this.payroll.assertRunAccess(user, run, em); return true }
    catch (error) { if (error instanceof ForbiddenException) return false; throw error }
  }

  /** صاحب الخطوة: الشخص المسمّى منحته الاسم نفسه (بلا شرط فرع — المالك اختاره بعينه)، وحامل الدور يلتزم بنطاق فرعه. */
  private async ownsStep(user: JwtPayload, run: PayrollRun, step: Pick<PayrollChainStep, 'kind' | 'userId' | 'roleCode'>, em: EntityManager) {
    if (!payrollChainStepMatchesUser(step, user)) return false
    return step.kind === 'USER' ? true : this.hasRunAccess(user, run, em)
  }

  // ===== إعداد السلاسل (payroll.chain_manage) =====
  private chainView(row: PayrollApprovalChain | null, names: Map<number, string>, roles: Map<string, string>, updatedByName: string | null) {
    const steps = row ? parsePayrollChainSteps(row.steps) : []
    return { id: row?.id ?? null, revision: row?.revision ?? 0, updatedAt: row?.updatedAt ?? null, updatedByName,
      steps: steps.map(step => this.stepView(step, names, roles)) }
  }

  private stepView(step: PayrollChainStep, names: Map<number, string>, roles: Map<string, string>) {
    return { order: step.order, kind: step.kind, userId: step.userId, roleCode: step.roleCode, label: step.label,
      approverName: step.kind === 'USER' ? names.get(step.userId ?? 0) ?? 'حساب غير موجود' : roles.get(step.roleCode ?? '') ?? step.roleCode ?? '' }
  }

  async config(user: JwtPayload) {
    const em = this.manager
    const rows = await em.getRepository(PayrollApprovalChain).find({ order: { id: 'ASC' } })
    const stepsOf = new Map(rows.map(row => [row.id, parsePayrollChainSteps(row.steps)]))
    const names = await this.userNames(em, rows.flatMap(row => [row.updatedByUserId, ...stepsOf.get(row.id)!.map(step => step.userId)]))
    const roleRows = await this.roleNames(em)
    const roles = new Map(roleRows.map(role => [role.code, role.nameAr]))
    const company = rows.find(row => row.scope === 'COMPANY') ?? null
    // المسيرات الدائمة بأسمائها: المسيرات العادية غير الملغاة اللي المستخدم يشوفها (نطاق فرعه)، آخر شهر لكل اسم
    const visible = (await this.payroll.list(user)).filter(run => run.status !== 'CANCELLED' && payrollRunTypeOf(run) === 'REGULAR' && payrollRunSeriesName(run.name))
    const series = new Map<string, { seriesName: string; latestPeriod: string; latestRunId: number; latestStatus: string }>()
    for (const run of visible) {
      const key = payrollChainSeriesKey(run.name), seen = series.get(key)
      if (!seen || run.period > seen.latestPeriod || (run.period === seen.latestPeriod && run.id > seen.latestRunId)) {
        series.set(key, { seriesName: payrollRunSeriesName(run.name), latestPeriod: run.period, latestRunId: run.id, latestStatus: run.status })
      }
    }
    const overrides = rows.filter(row => row.scope === 'RUN_SERIES' && stepsOf.get(row.id)!.length)
      .filter(row => branchScopeOf(user) === null || series.has(payrollChainSeriesKey(row.seriesName)))
      .map(row => ({ seriesName: row.seriesName, ...this.chainView(row, names, roles, names.get(row.updatedByUserId) ?? null) }))
    return {
      company: this.chainView(company, names, roles, company ? names.get(company.updatedByUserId) ?? null : null),
      overrides,
      series: [...series.values()].sort((a, b) => a.seriesName.localeCompare(b.seriesName, 'ar')),
      roles: roleRows.filter(role => role.isActive && role.code !== 'employee').map(role => ({ code: role.code, nameAr: role.nameAr })),
      canEditCompany: branchScopeOf(user) === null,
    }
  }

  /** بحث المعتمدين بالاسم أو الكود أو الإيميل — حسابات الدخول النشطة فقط. */
  async approvers(_user: JwtPayload, search: string | undefined) {
    const term = (search ?? '').trim().slice(0, 100)
    const like = `%${term.replace(/[\\%_[]/g, char => `\\${char}`)}%`
    const rows: Array<Record<string, unknown>> = await this.manager.query(`SELECT TOP (30) u.[id], u.[displayName], u.[email], u.[role], u.[branchId], u.[employeeId],
        e.[employeeCode], e.[jobTitle], b.[name] AS [branchName], r.[nameAr] AS [roleName]
      FROM [users] u
      LEFT JOIN [employees] e ON e.[id] = u.[employeeId]
      LEFT JOIN [branches] b ON b.[id] = u.[branchId]
      LEFT JOIN [roles] r ON r.[code] = u.[role]
      WHERE u.[isActive] = 1 AND (@0 = N'' OR u.[displayName] LIKE @1 ESCAPE N'\\' OR u.[email] LIKE @1 ESCAPE N'\\'
        OR e.[employeeCode] LIKE @1 ESCAPE N'\\' OR e.[fullName] LIKE @1 ESCAPE N'\\')
      ORDER BY u.[displayName], u.[id]`, [term, like])
    return rows.map(row => ({ id: Number(row.id), displayName: String(row.displayName ?? ''), email: String(row.email ?? ''), roleCode: String(row.role ?? ''),
      roleName: row.roleName == null ? null : String(row.roleName), employeeCode: row.employeeCode == null ? null : String(row.employeeCode),
      jobTitle: row.jobTitle == null ? null : String(row.jobTitle), branchName: row.branchName == null ? null : String(row.branchName) }))
  }

  private async assertStepsExist(em: EntityManager, steps: PayrollChainStep[]) {
    const userIds = steps.filter(step => step.kind === 'USER').map(step => step.userId!)
    if (userIds.length) {
      const rows: Array<{ id: number; isActive: boolean | number; displayName: string | null }> = await em.query(
        `SELECT [id], [isActive], [displayName] FROM [users] WHERE [id] IN (${userIds.map((_, index) => `@${index}`).join(', ')})`, userIds)
      for (const step of steps.filter(row => row.kind === 'USER')) {
        const found = rows.find(row => Number(row.id) === step.userId)
        if (!found) throw new BadRequestException({ code: 'PAYRUN-CHAIN-STEP-USER', message: `الخطوة ${step.order}: حساب الدخول المختار مش موجود` })
        if (!(found.isActive === true || Number(found.isActive) === 1)) {
          throw new BadRequestException({ code: 'PAYRUN-CHAIN-STEP-USER-INACTIVE', message: `الخطوة ${step.order}: حساب «${found.displayName ?? ''}» موقوف ومش هيقدر يعتمد؛ اختار حد تاني` })
        }
      }
    }
    const roles = await this.roleNames(em)
    for (const step of steps.filter(row => row.kind === 'ROLE')) {
      const role = roles.find(row => row.code === step.roleCode)
      if (!role || !role.isActive) throw new BadRequestException({ code: 'PAYRUN-CHAIN-STEP-ROLE', message: `الخطوة ${step.order}: الدور المختار مش موجود أو موقوف` })
    }
  }

  private async saveChain(user: JwtPayload, scope: 'COMPANY' | 'RUN_SERIES', seriesName: string, input: unknown, expectedRevision: number | undefined) {
    const steps = normalizePayrollChainSteps(input)
    await this.manager.transaction(async em => {
      // قفل واحد لكل تعديلات السلاسل: حفظان متزامنان مايكتبوش فوق بعض
      const lock = await em.query(`DECLARE @result int;
        EXEC @result = sys.sp_getapplock @Resource = 'hr:payroll:approval-chains', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
        SELECT @result AS lockResult;`)
      if (!lock.length || Number(lock[0].lockResult) < 0) throw new ConflictException('سلسلة الاعتماد بتتعدل دلوقتي من حد تاني؛ جرّب تاني بعد شوية')
      await this.assertStepsExist(em, steps)
      const repo = em.getRepository(PayrollApprovalChain)
      const existing = await repo.findOneBy({ scope, seriesName })
      if (expectedRevision !== undefined && (existing?.revision ?? 0) !== expectedRevision) {
        throw new ConflictException({ code: 'PAYRUN-CHAIN-REVISION', message: 'السلسلة اتعدلت من حد تاني بعد ما فتحتها؛ حدّث الشاشة وعدّل من جديد' })
      }
      const before = existing ? parsePayrollChainSteps(existing.steps) : []
      // أثر التغيير على المسيرات اللي في نص الاعتماد (البصمة اتغيرت فالاعتماد بيبدأ من الأول) يتسجل قبل كتابة صف السلسلة:
      // قرار الخطوة بيقفل المسير الأول ثم يقرأ السلاسل، فالترتيب ده (قفل المسير ثم كتابة السلسلة) مايعملش تشابك أقفال معاه.
      if (payrollChainHash(before) !== payrollChainHash(steps)) {
        const others = (await readPayrollChains(em)).filter(chain => !(chain.scope === scope && payrollChainSeriesKey(chain.seriesName) === payrollChainSeriesKey(seriesName)))
        const next: ResolvedPayrollChain = { chainId: existing?.id ?? 0, scope, seriesName, revision: (existing?.revision ?? 0) + 1, steps, hash: payrollChainHash(steps) }
        await this.recordChainChange(em, user, scope, seriesName, buildPayrollChainResolver([...others, next]))
      }
      await repo.save({ ...(existing ?? {}), scope, seriesName, steps: JSON.stringify(steps), revision: (existing?.revision ?? 0) + 1,
        updatedByUserId: user.sub, updatedAt: new Date() })
    })
    return this.config(user)
  }

  /** المسيرات المحسوبة اللي عليها قرارات سارية وهتتغير سلسلتها بالحفظ ده: القرارات تتلغى ويتسجل حدث على المسير. */
  private async recordChainChange(em: EntityManager, user: JwtPayload, scope: 'COMPANY' | 'RUN_SERIES', seriesName: string,
    resolve: ReturnType<typeof buildPayrollChainResolver>) {
    const runs = await em.getRepository(PayrollRun).find({ where: { status: 'CALCULATED' }, order: { id: 'ASC' }, select: { id: true, name: true, snapshotVersion: true } })
    if (!runs.length) return
    const approvals = await readPayrollRunApprovals(em, runs.map(run => run.id))
    for (const run of runs) {
      const live = approvals.filter(row => row.runId === run.id && row.voidedAt == null && row.snapshotVersion === run.snapshotVersion && row.decision === 'APPROVED')
      if (!live.length) continue
      const chain = resolve(run)
      if (!live.some(row => !chain || row.chainHash !== chain.hash)) continue
      await lockPayrollRunForCorrection(em, run.id)
      const voided = await voidPayrollRunApprovals(em, run.id, 'CHAIN_CHANGED', { snapshotVersion: run.snapshotVersion, exceptHash: chain?.hash })
      await em.getRepository(PayrollRunEvent).save({ runId: run.id, eventType: 'CHAIN_CHANGED', actorUserId: user.sub,
        reason: 'سلسلة الاعتماد اتغيرت والمسير في نص الاعتماد؛ الاعتماد بيبدأ من الخطوة الأولى', payload: { scope, seriesName, voidedApprovals: voided, snapshotVersion: run.snapshotVersion } })
    }
  }

  async saveCompanyChain(user: JwtPayload, dto: { steps?: unknown; expectedRevision?: number }) {
    assertCompanyWideWrite(user)
    return this.saveChain(user, 'COMPANY', '', dto.steps, dto.expectedRevision)
  }

  async saveSeriesChain(user: JwtPayload, dto: { seriesName?: unknown; steps?: unknown; expectedRevision?: number }) {
    const seriesName = payrollRunSeriesName(typeof dto.seriesName === 'string' ? dto.seriesName : '')
    if (!seriesName || seriesName.length > 200) throw new BadRequestException({ code: 'PAYRUN-CHAIN-SERIES', message: 'اختار المسير الدائم اللي هتعمل له سلسلة خاصة' })
    // المسير الدائم لازم يكون موجود وفي نطاق المستخدم (حساب الفرع يعدّل سلاسل مسيرات فرعه بس): كل المسيرات غير الملغاة بالاسم ده
    // — في أي شهر — لازم تكون داخل نطاقه، فاسم مشترك مع فرع تاني مايتعدّلش من حساب فرع. «غير موجود» و«خارج نطاقك» رد واحد.
    const key = payrollChainSeriesKey(seriesName)
    const visibleIds = new Set((await this.payroll.list(user)).filter(run => run.status !== 'CANCELLED' && payrollChainSeriesKey(run.name) === key).map(run => run.id))
    const named = (await this.manager.getRepository(PayrollRun).find({ select: { id: true, name: true, status: true } }))
      .filter(run => run.status !== 'CANCELLED' && payrollChainSeriesKey(run.name) === key)
    if (!visibleIds.size || named.some(run => !visibleIds.has(run.id))) {
      throw new NotFoundException({ code: 'PAYRUN-CHAIN-SERIES-NOT-FOUND', message: 'مفيش مسير دائم بالاسم ده في نطاقك' })
    }
    return this.saveChain(user, 'RUN_SERIES', seriesName, dto.steps, dto.expectedRevision)
  }

  // ===== عرض السلسلة على مسير =====
  private async describe(em: EntityManager, user: JwtPayload, run: PayrollRun, chain: ResolvedPayrollChain | null, progress: PayrollChainProgress) {
    const calculatedBy = await this.runCalculator(em, run)
    const licence = await this.selfApprovalAllowed(em)
    const names = await this.userNames(em, [calculatedBy, progress.rejection?.actorUserId, ...progress.steps.flatMap(step => [step.userId, step.actorUserId])])
    const roles = new Map((await this.roleNames(em)).map(role => [role.code, role.nameAr]))
    const ref = (id: number | null | undefined): UserRef | null => id == null ? null : { id, name: names.get(id) ?? null }
    const current = progress.currentStep
    const mine = !!current && await this.ownsStep(user, run, current, em)
    // سبب يمنع صاحب الخطوة نفسه من التصرف (فصل المهام): هو من احتسب النسخة، أو اعتمد خطوة سابقة على نفس النسخة
    let blocked: { code: string; message: string } | null = null
    if (mine) {
      const sod = payrollSelfApprovalIssue({ calculatedBy, approverId: user.sub, selfApprovalAllowed: licence })
      if (sod) blocked = { code: sod.code, message: 'أنت من احتسب نسخة المسير دي — من احتسب المسير لا يعتمد أي خطوة فيه' }
      else if (progress.actedUserIds.includes(user.sub)) blocked = { code: 'PAYRUN-CHAIN-ALREADY-ACTED', message: 'اعتمدت خطوة سابقة على نفس المسير — محدش بيعتمد خطوتين لنفس نسخة الحساب' }
    }
    // تنبيه للمالك: الخطوة الحالية باسم من احتسب المسير، فهتفضل واقفة لحد ما السلسلة أو المحتسب يتغير
    const stuck = !!current && current.kind === 'USER' && current.userId != null && current.userId === calculatedBy && !licence
    const lastRejection = await em.getRepository(PayrollRunApproval).findOne({ where: { runId: run.id, decision: 'REJECTED' }, order: { id: 'DESC' } })
    const rejectionNames = lastRejection ? await this.userNames(em, [lastRejection.actorUserId]) : new Map<number, string>()
    return {
      runId: run.id, runName: run.name, period: run.period, runStatus: run.status, snapshotVersion: run.snapshotVersion,
      governed: progress.state !== 'NONE', state: progress.state,
      source: chain ? chain.scope : null, seriesName: chain && chain.scope === 'RUN_SERIES' ? chain.seriesName : null,
      calculatedBy: ref(calculatedBy), selfApprovalAllowed: licence,
      steps: progress.steps.map(step => ({ order: step.order, label: step.label, kind: step.kind, status: step.status,
        approverName: step.kind === 'USER' ? names.get(step.userId ?? 0) ?? 'حساب غير موجود' : roles.get(step.roleCode ?? '') ?? step.roleCode ?? '',
        approvedBy: ref(step.actorUserId), approvedAt: step.decidedAt })),
      currentStep: current ? { order: current.order, label: current.label, isFinal: current.order === progress.steps.length } : null,
      canAct: mine && !blocked, mine, blocked,
      stuckMessage: stuck ? 'الخطوة الحالية باسم من احتسب المسير، ومن احتسب لا يعتمد — غيّر صاحب الخطوة أو خلّي حد تاني يعيد الحساب' : null,
      rejection: progress.rejection ? { stepOrder: progress.rejection.stepOrder, stepLabel: progress.rejection.stepLabel, reason: progress.rejection.reason,
        by: ref(progress.rejection.actorUserId), at: progress.rejection.decidedAt } : null,
      // آخر رفض حصل على المسير (حتى لو على نسخة حساب سابقة) — يفضل ظاهر لمسؤول الرواتب بعد إعادة الحساب
      lastRejection: lastRejection ? { stepOrder: lastRejection.stepOrder, stepLabel: lastRejection.stepLabel, reason: lastRejection.reason,
        by: { id: lastRejection.actorUserId, name: rejectionNames.get(lastRejection.actorUserId) ?? null }, at: lastRejection.decidedAt,
        snapshotVersion: lastRejection.snapshotVersion, current: lastRejection.voidedAt == null && lastRejection.snapshotVersion === run.snapshotVersion } : null,
    }
  }

  private async load(em: EntityManager, runId: number) {
    const run = await em.getRepository(PayrollRun).findOneBy({ id: runId })
    if (!run) return null
    const chain = await resolvePayrollRunChain(em, run)
    const progress = payrollChainProgress({ run, chain, approvals: await readPayrollRunApprovals(em, [run.id]) })
    return { run, chain, progress }
  }

  /** القراءة متاحة لحامل payroll.view في نطاقه، أو لصاحب الخطوة الحالية طول ما المسير منتظر عنده؛ غير كده رد واحد بلا كشف لوجود المسير. */
  private async assertCanRead(em: EntityManager, user: JwtPayload, loaded: Awaited<ReturnType<PayrollApprovalChainService['load']>>) {
    if (loaded) {
      if (userHasPerm(user, 'payroll.view') && await this.hasRunAccess(user, loaded.run, em)) return
      const current = loaded.progress.currentStep
      if (current && await this.ownsStep(user, loaded.run, current, em)) return
    } else if (userHasPerm(user, 'payroll.view') && branchScopeOf(user) === null) throw new NotFoundException('المسير غير موجود') // نطاق الشركة كلها: لا سر في «غير موجود»
    throw new ForbiddenException({ code: 'PAYRUN-CHAIN-NOT-YOUR-TURN', message: NOT_YOUR_TURN })
  }

  async runChain(user: JwtPayload, runId: number) {
    const em = this.manager
    const loaded = await this.load(em, runId)
    await this.assertCanRead(em, user, loaded)
    return this.describe(em, user, loaded!.run, loaded!.chain, loaded!.progress)
  }

  /** مراجعة المعتمد: رأس المسير وسلسلته وموظفوه باستحقاقاتهم واستقطاعاتهم وصافيهم (قراءة فقط). */
  async review(user: JwtPayload, runId: number) {
    const em = this.manager
    const loaded = await this.load(em, runId)
    await this.assertCanRead(em, user, loaded)
    const { run, chain, progress } = loaded!
    const items = await em.getRepository(PayrollItem).find({ where: { runId }, order: { employeeId: 'ASC' } })
    const members = await em.getRepository(PayrollRunMember).find({ where: { runId } })
    const snapshots = new Map(members.map(member => [member.employeeId, member.snapshot]))
    const lines = await describePayrollItemsLines(em, items)
    let earnings = 0, deductions = 0, net = 0
    const rows = items.map((item, index) => {
      const snapshot = snapshots.get(item.employeeId) ?? null
      const totals = lines[index].totals
      earnings += Math.round(totals.earnings * 100); deductions += Math.round(totals.deductions * 100); net += Math.round(totals.net * 100)
      return { itemId: item.id, employeeId: item.employeeId, employeeCode: snapshot?.employeeCode ?? '', fullName: snapshot?.fullName ?? `موظف رقم ${item.employeeId}`,
        branchName: snapshot?.branchName ?? null, departmentName: snapshot?.departmentName ?? null, teamName: snapshot?.teamName ?? null,
        earnings: totals.earnings, deductions: totals.deductions, net: totals.net, earningLines: lines[index].earnings, deductionLines: lines[index].deductions,
        settlementPayout: !!payrollItemSettlementPayout(item.breakdown) }
    }).sort((a, b) => a.employeeCode.localeCompare(b.employeeCode, 'en') || a.employeeId - b.employeeId)
    return {
      run: { id: run.id, name: run.name, period: run.period, startDate: run.startDate, endDate: run.endDate, status: run.status, runType: payrollRunTypeOf(run),
        correctionReason: run.correctionReason ?? null, calculatedAt: run.calculatedAt ?? null },
      chain: await this.describe(em, user, run, chain, progress),
      totals: { employees: rows.length, earnings: earnings / 100, deductions: deductions / 100, net: net / 100, negativeNet: rows.filter(row => row.net < 0).length },
      rows,
    }
  }

  /** «مسيرات بانتظار اعتمادي»: المسيرات المحسوبة اللي خطوتها الحالية باسمي أو بدوري. */
  async myPending(user: JwtPayload) {
    const em = this.manager
    // النداء ده بيتنده من القائمة الجانبية مع كل انتقال: بلا سلاسل أو بلا مسيرات محسوبة عليها سلسلة = رجوع فوري
    const resolve = await payrollChainResolver(em)
    // الأعمدة اللازمة فقط (بلا لقطة السياسة وتقرير التكافؤ الثقيلين)؛ أعمدة النطاق والتعريف لفحص نطاق حامل الدور
    const runs = (await em.getRepository(PayrollRun).find({ where: { status: 'CALCULATED' }, order: { period: 'DESC', id: 'DESC' },
      select: { id: true, name: true, period: true, startDate: true, endDate: true, status: true, snapshotVersion: true, totalNet: true, calculatedBy: true, calculatedAt: true,
        runType: true, parentRunId: true, scopeType: true, scopeIds: true, branchId: true, definition: true } })).filter(run => resolve(run))
    if (!runs.length) return []
    const approvals = await readPayrollRunApprovals(em, runs.map(run => run.id))
    const licence = await this.selfApprovalAllowed(em)
    const waiting: Array<{ run: PayrollRun; progress: PayrollChainProgress; calculatedBy: number | null }> = []
    for (const run of runs) {
      const chain = resolve(run)
      if (!chain) continue
      const progress = payrollChainProgress({ run, chain, approvals: approvals.filter(row => row.runId === run.id) })
      if (progress.state !== 'WAITING' || !progress.currentStep || !await this.ownsStep(user, run, progress.currentStep, em)) continue
      waiting.push({ run, progress, calculatedBy: await this.runCalculator(em, run) })
    }
    if (!waiting.length) return []
    const counts: Array<{ runId: number; employees: number }> = await em.query(
      `SELECT [runId], COUNT(*) AS [employees] FROM [payroll_items] WHERE [runId] IN (${waiting.map((_, index) => `@${index}`).join(', ')}) GROUP BY [runId]`, waiting.map(row => row.run.id))
    const names = await this.userNames(em, waiting.map(row => row.calculatedBy))
    return waiting.map(({ run, progress, calculatedBy }) => {
      const step = progress.currentStep!
      const previous = progress.steps.filter(row => row.status === 'APPROVED').slice(-1)[0]
      const sod = payrollSelfApprovalIssue({ calculatedBy, approverId: user.sub, selfApprovalAllowed: licence })
      const blocked = sod ? 'أنت من احتسب نسخة المسير دي — من احتسب المسير لا يعتمد أي خطوة فيه'
        : progress.actedUserIds.includes(user.sub) ? 'اعتمدت خطوة سابقة على نفس المسير' : null
      return { runId: run.id, name: run.name, period: run.period, startDate: run.startDate, endDate: run.endDate, runType: payrollRunTypeOf(run), totalNet: Number(run.totalNet),
        employees: Number(counts.find(row => Number(row.runId) === run.id)?.employees ?? 0),
        calculatedBy: calculatedBy == null ? null : { id: calculatedBy, name: names.get(calculatedBy) ?? null }, calculatedAt: run.calculatedAt ?? null,
        stepOrder: step.order, stepCount: progress.steps.length, stepLabel: step.label, isFinal: step.order === progress.steps.length,
        waitingSince: previous?.decidedAt ?? run.calculatedAt ?? null, canAct: !blocked, blocked }
    })
  }

  // ===== القرار على الخطوة =====
  private async act(user: JwtPayload, runId: number, decide: (em: EntityManager, context: { run: PayrollRun; chain: ResolvedPayrollChain; progress: PayrollChainProgress;
    step: PayrollChainProgress['steps'][number]; calculatedBy: number | null; licence: boolean }) => Promise<void>) {
    await this.manager.transaction(async em => {
      await lockPayrollRunForCorrection(em, runId)
      const loaded = await this.load(em, runId)
      const stranger = () => new ForbiddenException({ code: 'PAYRUN-CHAIN-NOT-YOUR-TURN', message: NOT_YOUR_TURN })
      if (!loaded) throw stranger()
      const { run, progress } = loaded
      // الخطوة الحالية موجودة فقط لمسير محسوب تحكمه سلسلة ونسخته غير مرتجعة؛ غير صاحبها — أيًّا كانت صلاحياته أو حالة المسير
      // أو وجوده — يستلم ردًا واحدًا لا يكشف شيئًا. الرافض نفسه (شاشته قديمة) يعرف إن نسخته مرتجعة.
      const step = progress.currentStep
      const chain = loaded.chain
      if (!step || !chain || !await this.ownsStep(user, run, step, em)) {
        if (progress.state === 'RETURNED' && progress.rejection?.actorUserId === user.sub) {
          throw new ConflictException({ code: 'PAYRUN-CHAIN-RETURNED', message: 'المسير اترفض ورجع لمسؤول الرواتب؛ لازم يتعاد حسابه قبل ما يتعتمد من جديد' })
        }
        throw stranger()
      }
      const calculatedBy = await this.runCalculator(em, run)
      const licence = await this.selfApprovalAllowed(em)
      // فصل المهام: من احتسب نسخة الحساب الحالية لا يتصرف في أي خطوة (إلا برخصة الشركة الصغيرة بمعناها القائم)
      const sod = payrollSelfApprovalIssue({ calculatedBy, approverId: user.sub, selfApprovalAllowed: licence })
      if (sod) throw new ForbiddenException(sod)
      if (progress.actedUserIds.includes(user.sub)) {
        throw new ForbiddenException({ code: 'PAYRUN-CHAIN-ALREADY-ACTED', message: 'اعتمدت خطوة سابقة على نفس المسير — محدش بيعتمد خطوتين لنفس نسخة الحساب' })
      }
      // قرارات ببصمة سلسلة قديمة على نفس النسخة لا تُحتسب؛ تتلغى صراحةً قبل القرار الجديد
      await voidPayrollRunApprovals(em, run.id, 'CHAIN_CHANGED', { snapshotVersion: run.snapshotVersion, exceptHash: chain.hash })
      await decide(em, { run, chain, progress, step, calculatedBy, licence })
    })
    // صاحب الخطوة بعد قراره ممكن مايبقاش له قراءة المسير؛ الرد حالة السلسلة كما يراها من له القراءة، وإلا تأكيد بسيط
    try { return await this.runChain(user, runId) }
    catch (error) { if (error instanceof ForbiddenException) return { runId, governed: true, acted: true }; throw error }
  }

  private decisionRow(context: { run: PayrollRun; chain: ResolvedPayrollChain; step: PayrollChainProgress['steps'][number] }, user: JwtPayload,
    decision: 'APPROVED' | 'REJECTED', reason: string | null): Partial<PayrollRunApproval> {
    return { runId: context.run.id, snapshotVersion: context.run.snapshotVersion, chainId: context.chain.chainId, chainHash: context.chain.hash,
      stepOrder: context.step.order, stepCount: context.chain.steps.length, stepLabel: context.step.label, approverKind: context.step.kind,
      approverRoleCode: context.step.roleCode, decision, reason, actorUserId: user.sub, decidedAt: new Date(), voidedAt: null, voidReason: null }
  }

  /** «اعتمد خطوتي»: خطوة وسطى تتسجل؛ آخر خطوة = الاعتماد النهائي بكل فحوصه وحجوزاته في نفس المعاملة (فشله يرجّع الخطوة كمان). */
  async approveStep(user: JwtPayload, runId: number) {
    return this.act(user, runId, async (em, context) => {
      const { run, chain, step, calculatedBy, licence } = context
      await em.getRepository(PayrollRunApproval).save(this.decisionRow(context, user, 'APPROVED', null))
      const isFinal = step.order === chain.steps.length
      await em.getRepository(PayrollRunEvent).save({ runId: run.id, eventType: 'CHAIN_STEP_APPROVED', actorUserId: user.sub, reason: null,
        payload: { snapshotVersion: run.snapshotVersion, stepOrder: step.order, stepCount: chain.steps.length, stepLabel: step.label, final: isFinal,
          chainId: chain.chainId, chainScope: chain.scope, chainHash: chain.hash, calculatedBy, smallCompanyException: calculatedBy === user.sub, selfApprovalSetting: licence } })
      if (isFinal) {
        await this.payroll.approveLocked(em, user, run, { chainId: chain.chainId, chainScope: chain.scope, chainHash: chain.hash, steps: chain.steps.length })
      }
    })
  }

  /** «ارفض بسبب»: القرارات السارية تتلغى، والنسخة ترجع لمسؤول الرواتب بسبب ظاهر؛ المسير يفضل CALCULATED. */
  async rejectStep(user: JwtPayload, runId: number, reasonInput: unknown) {
    const reason = payrollChainReason(reasonInput)
    return this.act(user, runId, async (em, context) => {
      const { run, chain, step } = context
      const voided = await voidPayrollRunApprovals(em, run.id, 'REJECTED', { snapshotVersion: run.snapshotVersion })
      await em.getRepository(PayrollRunApproval).save(this.decisionRow(context, user, 'REJECTED', reason))
      await em.getRepository(PayrollRunEvent).save({ runId: run.id, eventType: 'CHAIN_REJECTED', actorUserId: user.sub, reason,
        payload: { snapshotVersion: run.snapshotVersion, stepOrder: step.order, stepCount: chain.steps.length, stepLabel: step.label, voidedApprovals: voided,
          chainId: chain.chainId, chainScope: chain.scope, chainHash: chain.hash } })
    })
  }

  /** للقائمة الجانبية: عدد المسيرات المنتظرة عندي. */
  async myPendingCount(user: JwtPayload) {
    return { count: (await this.myPending(user)).length }
  }
}
