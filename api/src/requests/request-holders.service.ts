import { Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In } from 'typeorm'
import { AuthService, type JwtPayload } from '../auth/auth.service'
import { branchScopeOf } from '../auth/guards'
import { User } from '../auth/user.entity'
import { Employee } from '../employees/employee.entity'
import { activeDelegationsFrom } from './approval-delegations'
import { ApproverResolver, FUNCTIONAL_APPROVER_ROLES, holdsFunctionalStep, type ResolvedStep } from './approver-resolver.service'
import type { Request } from './entities/request.entity'
import { waitingPeople, waitingSince, type HolderIdentity, type RequestWaitingAt, type WaitingStepHolders } from './request-holders'
import { RequestsService, type DelegableRequest } from './requests.service'

/** الطلب بالخانات اللي حكم «الخطوة مستنية مين» بيقراها */
export type AwaitedRequest = DelegableRequest & Pick<Request, 'status' | 'branchId' | 'currentStep'>

/** حساب الخطوة الحالية مستنياه، ومين بينوب عنهم في الطلب ده لو الخطوة عنده بتفويض */
export interface AwaitedAccount { account: JwtPayload; actingFor?: ReadonlySet<number> }

/** صف طلب زي ما القوايم والتفاصيل بيرجّعوه (السري المحجوب معلَّم confidentialMasked ومن غير صاحبه) */
export interface WaitingRow {
  id: number
  status: string
  typeCode: string
  definitionCode?: string | null
  currentStep?: number | null
  resolvedSteps?: string | null
  requesterId: number | null
  createdByUserId: number | null
  branchId?: number | null
  submittedAt?: Date | string | null
  confidentialMasked?: boolean
}

const isFunctional = (role: string) => (FUNCTIONAL_APPROVER_ROLES as readonly string[]).includes(role)
const chunks = <T,>(items: readonly T[], size = 1000): T[][] => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size))

/**
 * B-ADD.17: «الطلب واقف عند مين» بحكم المحرك نفسه. الحسابات اللي الخطوة الحالية مستنياها هي اللي RequestsService.stepAwaitsAccount بيقول
 * عليها (حكم صندوق الاعتماد من غير مخرج مدير النظام ولا مخرج الموارد البشرية للطلب الواقف) — نفس الحساب اللي بريد «طلب بانتظار اعتمادك»
 * وإشارة «المعتمد الحالي» بيمشوا عليه (NotificationsService بينادي accountsAwaited)، فالاسم اللي بيتكتب هو اللي الطلب في صندوقه فعلًا.
 */
@Injectable()
export class RequestHoldersService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly auth: AuthService,
    private readonly requests: RequestsService,
    private readonly resolver: ApproverResolver
  ) {}

  /**
   * لكل طلب: الحسابات اللي خطوته الحالية مستنياها (role: حاملي الدور اللي الخطوة اتصعّدت له بس). المرشحين: حاملي الأدوار الوظيفية
   * المستنية (holdsFunctionalStep)، وحسابات المعتمدين المسمّين، وبدلاءهم في تفويض ساري — والحكم النهائي لكل حساب في stepAwaitsAccount
   * بسياق تفويضه. كل القراءات وقت النداء: مفيش أسماء ولا صلاحيات متخزنة.
   */
  async accountsAwaited(requests: ReadonlyArray<AwaitedRequest>, role: string | null = null): Promise<Map<number, AwaitedAccount[]>> {
    const out = new Map<number, AwaitedAccount[]>()
    const waitingOf = new Map<number, ResolvedStep[]>()
    for (const req of requests) {
      const waiting = this.requests.waitingSteps(req).filter(step => !role || step.role === role)
      if (waiting.length) waitingOf.set(req.id, waiting)
    }
    if (!waitingOf.size) return out
    const all = [...waitingOf.values()].flat()
    // خطوة وظيفية = أي حساب بيحملها؛ وكلها هيكلية = حسابات المعتمدين المسمّين وبدلاءهم بس
    const functional = all.some(step => isFunctional(step.role))
    const named = [...new Set(all.map(step => step.approverEmployeeId).filter((id): id is number => id != null))]
    if (!functional && !named.length) return out
    // B2.6-ب: بدلاء المعتمدين المسمّين في تفويض ساري (المفوِّض ← بدلاؤه)
    const delegatesOf = new Map<number, Set<number>>()
    for (const row of named.length ? await activeDelegationsFrom(this.ds.manager, named) : []) {
      delegatesOf.set(row.delegatorEmployeeId, (delegatesOf.get(row.delegatorEmployeeId) ?? new Set<number>()).add(row.delegateEmployeeId))
    }
    const delegates = new Set([...delegatesOf.values()].flatMap(set => [...set]))
    const users: User[] = []
    if (functional) users.push(...await this.ds.getRepository(User).find({ where: { isActive: true } }))
    else for (const part of chunks([...new Set([...named, ...delegates])])) users.push(...await this.ds.getRepository(User).find({ where: { isActive: true, employeeId: In(part) } }))
    const accounts = await this.auth.accountPayloads(users)
    const byEmployee = new Map<number, JwtPayload[]>()
    for (const account of accounts) {
      if (account.employeeId != null) byEmployee.set(account.employeeId, [...(byEmployee.get(account.employeeId) ?? []), account])
    }
    const holding = new Map<string, JwtPayload[]>()
    for (const code of new Set(all.map(step => step.role).filter(isFunctional))) holding.set(code, accounts.filter(account => holdsFunctionalStep(account, code)))
    // مرشحين كل طلب، والبدلاء منهم
    const candidatesOf = new Map<number, Map<number, JwtPayload>>()
    const delegateRequests = new Map<number, AwaitedRequest[]>()
    for (const req of requests) {
      const waiting = waitingOf.get(req.id)
      if (!waiting) continue
      const candidates = new Map<number, JwtPayload>()
      for (const step of waiting) {
        for (const account of holding.get(step.role) ?? []) candidates.set(account.sub, account)
        if (step.approverEmployeeId == null) continue
        for (const account of byEmployee.get(step.approverEmployeeId) ?? []) candidates.set(account.sub, account)
        for (const delegate of delegatesOf.get(step.approverEmployeeId) ?? []) {
          for (const account of byEmployee.get(delegate) ?? []) {
            candidates.set(account.sub, account)
            const list = delegateRequests.get(account.sub) ?? []
            if (!list.includes(req)) delegateRequests.set(account.sub, [...list, req])
          }
        }
      }
      candidatesOf.set(req.id, candidates)
    }
    // سياق تفويض كل بديل على طلباته (delegationContext: نفس حكم الصندوق والقرار)
    const acting = new Map<number, ((req: DelegableRequest) => ReadonlySet<number> | undefined) | null>()
    const bySub = new Map(accounts.map(account => [account.sub, account]))
    for (const [sub, list] of delegateRequests) acting.set(sub, await this.requests.delegationContext(bySub.get(sub)!, list))
    for (const req of requests) {
      const candidates = candidatesOf.get(req.id)
      if (!candidates) continue
      const awaited: AwaitedAccount[] = []
      for (const account of candidates.values()) {
        const actingFor = delegateRequests.get(account.sub)?.includes(req) ? acting.get(account.sub)?.(req) : undefined
        if (this.requests.stepAwaitsAccount(account, req, role, actingFor)) awaited.push({ account, ...(actingFor ? { actingFor } : {}) })
      }
      if (awaited.length) out.set(req.id, awaited)
    }
    return out
  }

  /**
   * بيزوّد على كل طلب قيد المراجعة «واقف عند» (waitingAt): أسماء اللي خطوته الحالية مستنياهم ومسمّياتهم ومن إمتى. الصفوف جاية من قراءة
   * اتحكم فيها قبل كده (طلباتي، لوحة الطلبات بنطاقها، تفاصيل الطلب)؛ والسري المحجوب مابيتزوّدش عليه حاجة — اللي مخفي النهارده مخفي.
   */
  async attach<T extends WaitingRow>(user: JwtPayload, rows: T[]): Promise<Array<T & { waitingAt?: RequestWaitingAt }>> {
    const pending = rows.filter(row => row.status === 'UNDER_REVIEW' && !row.confidentialMasked && row.requesterId != null)
    if (!pending.length) return rows
    const requests = pending as unknown as AwaitedRequest[]
    const awaited = await this.accountsAwaited(requests)
    const waitingOf = new Map(requests.map(req => [req.id, this.requests.waitingSteps(req)]))
    // أسماء ومسمّيات وفروع الموظفين (المسمّين وأصحاب الحسابات)، وأسماء الحسابات اللي من غير موظف
    const employeeIds = new Set<number>(), accountIds = new Set<number>()
    for (const steps of waitingOf.values()) for (const step of steps) if (step.approverEmployeeId != null) employeeIds.add(step.approverEmployeeId)
    for (const list of awaited.values()) for (const { account } of list) { if (account.employeeId != null) employeeIds.add(account.employeeId); else accountIds.add(account.sub) }
    const employees = new Map<number, Pick<Employee, 'id' | 'fullName' | 'jobTitle' | 'branchId'>>()
    for (const part of chunks([...employeeIds])) {
      for (const row of await this.ds.getRepository(Employee).find({ where: { id: In(part) }, select: { id: true, fullName: true, jobTitle: true, branchId: true } })) employees.set(row.id, row)
    }
    const displayNames = new Map<number, string>()
    for (const part of chunks([...accountIds])) {
      for (const row of await this.ds.getRepository(User).find({ where: { id: In(part) }, select: { id: true, displayName: true } })) displayNames.set(row.id, row.displayName)
    }
    const employeeIdentity = (id: number): HolderIdentity | null => {
      const row = employees.get(id)
      return row ? { key: `e${row.id}`, employeeId: row.id, name: row.fullName, jobTitle: row.jobTitle ?? null, branchId: row.branchId ?? null } : null
    }
    const accountIdentity = (account: JwtPayload): HolderIdentity | null => account.employeeId != null ? employeeIdentity(account.employeeId)
      : displayNames.has(account.sub) ? { key: `u${account.sub}`, employeeId: null, name: displayNames.get(account.sub)!, jobTitle: null, branchId: account.branchId ?? null } : null
    const byName = (a: HolderIdentity, b: HolderIdentity) => a.name.localeCompare(b.name, 'ar') || a.key.localeCompare(b.key)
    const scope = branchScopeOf(user)
    const views = new Map<number, RequestWaitingAt>()
    for (const req of requests) {
      const waiting = waitingOf.get(req.id) ?? []
      if (!waiting.length) continue
      const accounts = awaited.get(req.id) ?? []
      const steps: WaitingStepHolders[] = waiting.map(step => {
        const identities = (list: AwaitedAccount[]) => list.map(row => accountIdentity(row.account)).filter((row): row is HolderIdentity => !!row).sort(byName)
        if (isFunctional(step.role) || step.approverEmployeeId == null) {
          return { role: step.role, named: null, delegates: [], accounts: identities(accounts.filter(row => this.resolver.holdsStep(row.account, step))) }
        }
        // الخطوة عند الحساب بتفويض: مش بتاعته، وبقت عليه بسياق تفويضه (نفس تعبير شارة «بالنيابة عن» في الصندوق)
        return { role: step.role, named: employeeIdentity(step.approverEmployeeId), accounts: [],
          delegates: identities(accounts.filter(row => !this.resolver.holdsStep(row.account, step) && this.resolver.holdsStep(row.account, step, row.actingFor))) }
      })
      const viewer = { requesterSide: this.requests.requesterSide(user, req), employeeId: user.employeeId ?? null, scope }
      views.set(req.id, { stepOrder: Number(req.currentStep), roles: [...new Set(waiting.map(step => step.role))],
        since: waitingSince(req as unknown as WaitingRow), ...waitingPeople(steps, viewer) })
    }
    const open = new Set<WaitingRow>(pending)
    return rows.map(row => (open.has(row) && views.has(row.id) ? { ...row, waitingAt: views.get(row.id) } : row))
  }
}
