import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { randomBytes } from 'node:crypto'
import { DataSource, EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, branchScopeSql, inBranchScope, userHasPerm } from '../auth/guards'
import { PayrollDecimal } from '../payroll/payroll-decimal'
import { readLoanInstallmentPositions } from '../payroll/payroll-installment-balances'
import { repayLoanEarly } from '../payroll/payroll-installment-ledger'
import { loanScheduleAmounts } from '../requests/loan-installment-requests'
import { addDays, LoanCapPolicyValues, loanMoney, normalizeLoanCapPolicyInput } from './loan-caps'
import { evaluateEmployeeLoanCap, isLoanCapRequestType, LOAN_CAP_POLICY_COLUMNS, loanRequestDayWindow, localDate, parseLoanCapPolicyRow } from './loan-request-caps'
import { collectLoanRecovery, LOAN_RECOVERY_COLUMNS, openRecoveryAmount, writeOffLoanRecovery } from './loan-recovery'
import type { LoanCapPolicyDto, LoanRepaymentDto } from './loans.dto'

const blank = (value: unknown) => value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
// ما يراه الموظف من حركات دفتره: الخصم الفعلي والتأجيل والسداد، لا حجوزات المسير الداخلية.
// DEFERRED_BY_EXEMPTION (الخطوة 26): تأجيل القسط بقرار إعفاء مالي عند صرف المسير — يراه الموظف في دفتر سلفه
// REVERSAL (C8 / الخطوة 31): عكس خصم القسط بعكس صرف المسير — عاد القسط مستحقًا
const EMPLOYEE_EVENT_ACTIONS = ['PAYROLL_POSTED', 'DEFERRED', 'SETTLED_EARLY', 'EARLY_REPAYMENT', 'DEFERRED_BY_EXEMPTION', 'REVERSAL']

@Injectable()
export class LoansService {
  constructor(private readonly ds: DataSource) {}

  private async employeeInScope(em: EntityManager, user: JwtPayload, employeeId: number, notFound = 'الموظف غير موجود') {
    const [employee] = await em.query('SELECT [id],[branchId],[fullName],[employeeCode] FROM [employees] WHERE [id]=@0', [employeeId])
    // صف SQL خام: الفرع رقم أو null — والمقارنة بفروع النطاق (فرع أو أكتر)
    if (!employee || !inBranchScope(branchScopeOf(user), employee.branchId == null ? null : Number(employee.branchId))) throw new NotFoundException(notFound)
    return employee
  }

  // ===== AD-01: سياسات السقوف المؤرخة =====
  async listPolicies() {
    const today = localDate()
    const rows = await this.ds.query(`SELECT ${LOAN_CAP_POLICY_COLUMNS} FROM [loan_cap_policies] ORDER BY [policyKey], [version] DESC`)
    return rows.map((row: any) => {
      const policy = parseLoanCapPolicyRow(row)
      return { ...policy, currentlyEffective: policy.isActive && policy.effectiveFrom <= today && (policy.effectiveTo === null || policy.effectiveTo >= today) }
    })
  }

  private async policyById(em: EntityManager, id: number) {
    const [row] = await em.query(`SELECT ${LOAN_CAP_POLICY_COLUMNS} FROM [loan_cap_policies] WHERE [id]=@0`, [id])
    if (!row) throw new NotFoundException('سياسة السقوف غير موجودة')
    return parseLoanCapPolicyRow(row)
  }

  private async assertScopeRefs(em: EntityManager, values: LoanCapPolicyValues) {
    if (!values.scopeIds) return
    const table = ({ BRANCH: 'branches', DEPARTMENT: 'departments', TEAM: 'teams', EMPLOYEES: 'employees' } as Record<string, string>)[values.scopeType]
    const rows = await em.query(`SELECT [id] FROM [${table}] WHERE [id] IN (SELECT CAST([value] AS int) FROM OPENJSON(@0))`, [JSON.stringify(values.scopeIds)])
    if (rows.length !== values.scopeIds.length) throw new BadRequestException('أحد عناصر نطاق السياسة غير موجود')
  }

  private async insertPolicy(em: EntityManager, key: string, version: number, v: LoanCapPolicyValues, supersedesId: number | null, actorId: number) {
    const [row] = await em.query(`INSERT INTO [loan_cap_policies] ([policyKey],[version],[name],[scopeType],[scopeIds],[salaryBase],[percentOfSalary],[flatCapAmount],
      [maxRequestsPerMonth],[maxAmountPerMonth],[maxOutstandingBalance],[maxInstallmentMonths],[monthDefinition],[effectiveFrom],[effectiveTo],[priority],[isActive],[supersedesId],[reason],[createdByUserId])
      OUTPUT INSERTED.[id] VALUES(@0,@1,@2,@3,@4,@5,CAST(@6 AS decimal(9,4)),CAST(@7 AS decimal(18,2)),@8,CAST(@9 AS decimal(18,2)),CAST(@10 AS decimal(18,2)),@11,@12,@13,@14,@15,1,@16,@17,@18)`,
    [key, version, v.name, v.scopeType, v.scopeIds ? JSON.stringify(v.scopeIds) : null, v.salaryBase, v.percentOfSalary, v.flatCapAmount,
      v.maxRequestsPerMonth, v.maxAmountPerMonth, v.maxOutstandingBalance, v.maxInstallmentMonths, v.monthDefinition, v.effectiveFrom, v.effectiveTo, v.priority, supersedesId, v.reason, actorId])
    return Number(row.id)
  }

  async createPolicy(user: JwtPayload, dto: LoanCapPolicyDto) {
    const values = normalizeLoanCapPolicyInput(dto)
    return this.ds.transaction(async em => {
      await this.assertScopeRefs(em, values)
      const id = await this.insertPolicy(em, `LCP-${randomBytes(6).toString('hex')}`, 1, values, null, user.sub)
      return this.policyById(em, id)
    })
  }

  /** تعديل = نسخة جديدة؛ السابقة تُقفل باليوم السابق لسريان الجديدة، أو تُعطَّل إن تساوى يوم السريان. */
  async createPolicyVersion(user: JwtPayload, id: number, dto: LoanCapPolicyDto) {
    const values = normalizeLoanCapPolicyInput(dto)
    if (!values.reason || values.reason.length < 3) throw new BadRequestException('سبب تعديل السياسة مطلوب؛ التعديل يُنشئ نسخة جديدة')
    return this.ds.transaction(async em => {
      const [raw] = await em.query(`SELECT ${LOAN_CAP_POLICY_COLUMNS} FROM [loan_cap_policies] WITH (UPDLOCK, HOLDLOCK) WHERE [id]=@0`, [id])
      if (!raw) throw new NotFoundException('سياسة السقوف غير موجودة')
      const base = parseLoanCapPolicyRow(raw)
      const [latest] = await em.query('SELECT MAX([version]) AS [version] FROM [loan_cap_policies] WITH (UPDLOCK, HOLDLOCK) WHERE [policyKey]=@0', [base.policyKey])
      if (Number(latest.version) !== base.version) throw new ConflictException({ code: 'LOAN_CAP_POLICY_STALE', message: 'عدّل آخر نسخة من السياسة فقط؛ حدّث الصفحة' })
      if (!base.isActive) throw new ConflictException({ code: 'LOAN_CAP_POLICY_INACTIVE', message: 'السياسة معطلة؛ أنشئ سياسة جديدة بدلًا من تعديلها' })
      if (values.effectiveFrom < base.effectiveFrom) throw new BadRequestException('سريان النسخة الجديدة لا يسبق سريان النسخة الحالية')
      await this.assertScopeRefs(em, values)
      if (values.effectiveFrom > base.effectiveFrom) {
        if (base.effectiveTo === null || base.effectiveTo >= values.effectiveFrom) {
          await em.query('UPDATE [loan_cap_policies] SET [effectiveTo]=@0 WHERE [id]=@1', [addDays(values.effectiveFrom, -1), base.id])
        }
      } else {
        await em.query(`UPDATE [loan_cap_policies] SET [isActive]=0,[deactivatedAt]=SYSUTCDATETIME(),[deactivatedByUserId]=@0,[deactivationReason]=@1 WHERE [id]=@2`,
          [user.sub, `استُبدلت بالنسخة ${base.version + 1} بنفس يوم السريان: ${values.reason}`.slice(0, 500), base.id])
      }
      const newId = await this.insertPolicy(em, base.policyKey, base.version + 1, values, base.id, user.sub)
      return this.policyById(em, newId)
    })
  }

  async deactivatePolicy(user: JwtPayload, id: number, reason: string) {
    return this.ds.transaction(async em => {
      const updated = await em.query(`UPDATE [loan_cap_policies] SET [isActive]=0,[deactivatedAt]=SYSUTCDATETIME(),[deactivatedByUserId]=@0,[deactivationReason]=@1
        OUTPUT INSERTED.[id] WHERE [id]=@2 AND [isActive]=1`, [user.sub, reason.trim(), id])
      if (!updated.length) throw new NotFoundException('السياسة غير موجودة أو معطلة بالفعل')
      return this.policyById(em, id)
    })
  }

  // ===== AD-02/04/06: ما يظهر قبل التقديم =====
  async capPreview(user: JwtPayload, query: { employeeId?: string; amount?: string; months?: string }) {
    const target = query.employeeId ? Number(query.employeeId) : user.employeeId
    if (!target) throw new BadRequestException('الحساب غير مربوط بموظف')
    return this.ds.transaction(async em => {
      if (target !== user.employeeId) {
        if (!['loans.exceptional', 'requests.create_on_behalf', 'payroll.view'].some(perm => userHasPerm(user, perm))) {
          throw new ForbiddenException('معاينة سقف موظف آخر للموارد البشرية فقط')
        }
        await this.employeeInScope(em, user, target)
      }
      const amount = blank(query.amount) ? '0.00' : loanMoney(query.amount, 'المبلغ', true)
      const evaluation = await evaluateEmployeeLoanCap(em, { employeeId: target, amount, months: query.months ? Number(query.months) : 1, asOf: localDate() })
      // أيام طلب السلفة من الشهر تظهر في نافذة الطلب قبل التقديم (لا تُحفظ في لقطة السقف)
      return { ...evaluation, requestWindow: await loanRequestDayWindow(em, localDate()) }
    })
  }

  // ===== AD-07: ما يراه المعتمد قبل قراره =====
  async requestCapReview(user: JwtPayload, requestId: number) {
    return this.ds.transaction(async em => {
      const [req] = await em.query(`SELECT r.[id],r.[typeCode],r.[requesterId],r.[branchId],r.[status],r.[payload],r.[resolvedSteps],t.[destinationHandler]
        FROM [requests] r LEFT JOIN [request_types] t ON t.[code]=r.[typeCode] WHERE r.[id]=@0`, [requestId])
      if (!req || !isLoanCapRequestType({ code: req.typeCode, destinationHandler: req.destinationHandler })) throw new NotFoundException('طلب السلفة غير موجود')
      let steps: Array<{ approverEmployeeId?: number | null }> = []
      try { steps = JSON.parse(req.resolvedSteps || '[]') } catch { steps = [] }
      const namedApprover = user.employeeId != null && Array.isArray(steps) && steps.some(step => step?.approverEmployeeId === user.employeeId)
      const privileged = ['requests.view_all', 'payroll.view', 'loans.cap_override', 'approve.hr', 'approve.finance', 'approve.executive', 'approve.payroll'].some(perm => userHasPerm(user, perm))
      const scope = branchScopeOf(user)
      if (!namedApprover && (!privileged || !inBranchScope(scope, req.branchId == null ? null : Number(req.branchId)))) throw new NotFoundException('طلب السلفة غير موجود')
      let payload: Record<string, any>
      try { payload = JSON.parse(req.payload || '{}') } catch { throw new ConflictException('حمولة طلب السلفة تالفة') }
      const schedule = loanScheduleAmounts(payload.amount, payload.months ?? 1)
      const currentAmount = blank(payload.approvedAmount) ? schedule.amount : loanMoney(payload.approvedAmount, 'المبلغ المعتمد')
      const current = await evaluateEmployeeLoanCap(em, { employeeId: req.requesterId, amount: currentAmount, months: schedule.months, asOf: localDate(), excludeRequestId: req.id })
      const submitted = payload.capCheck?.evaluation ?? null
      return {
        requestId: req.id, status: req.status, requesterId: req.requesterId, requestedAmount: schedule.amount, currentAmount, months: schedule.months,
        exceptional: payload.exceptional === true, exceptionalCategory: payload.exceptional === true ? payload.exceptionalCategory ?? null : null,
        exceptionalReason: payload.exceptional === true ? payload.reason ?? null : null, firstInstallmentPeriod: payload.firstInstallmentPeriod ?? null,
        submitted, current,
        policyChanged: submitted === null ? null : (submitted.policy?.id ?? null) !== (current.policy?.id ?? null) || (submitted.effectiveCap ?? null) !== (current.effectiveCap ?? null),
        approvals: Array.isArray(payload.capApprovals) ? payload.capApprovals : [], canOverride: userHasPerm(user, 'loans.cap_override'),
      }
    })
  }

  // ===== AD-15: الدفتر — الموظف يرى سلفه فقط =====
  async myLoans(user: JwtPayload) {
    if (!user.employeeId) return []
    return this.ds.transaction(em => this.ledgerFor(em, user.employeeId!, undefined, false))
  }

  async loanLedger(user: JwtPayload, loanId: number) {
    return this.ds.transaction(async em => {
      const [loan] = await em.query('SELECT [id],[employeeId] FROM [loans] WHERE [id]=@0', [loanId])
      if (!loan) throw new NotFoundException('السلفة غير موجودة')
      const own = loan.employeeId === user.employeeId
      if (!own) {
        if (!userHasPerm(user, 'payroll.view')) throw new NotFoundException('السلفة غير موجودة')
        await this.employeeInScope(em, user, loan.employeeId, 'السلفة غير موجودة')
      }
      const [row] = await this.ledgerFor(em, loan.employeeId, loanId, !own)
      return row
    })
  }

  private async ledgerFor(em: EntityManager, employeeId: number, loanId: number | undefined, full: boolean) {
    const loans = await em.query(`SELECT [id],[requestId],[employeeId],CONVERT(varchar(40),[amount]) AS [amount],CONVERT(varchar(40),[requestedAmount]) AS [requestedAmount],
      [status],[disbursedAt],[isExceptional],[exceptionalCategory],[exceptionalReason],[firstInstallmentPeriod],[installmentMonths]${full ? ',[capSnapshot],[createdByUserId]' : ''}
      FROM [loans] WHERE [employeeId]=@0 ${loanId === undefined ? '' : 'AND [id]=@1'} ORDER BY [id] DESC`, loanId === undefined ? [employeeId] : [employeeId, loanId])
    if (!loans.length) return []
    const positions = await readLoanInstallmentPositions(em, employeeId)
    const repayments = await em.query(`SELECT [id],[loanId],CONVERT(varchar(40),[amount]) AS [amount],[method],[mode],[reference],[reason],[requestId],
      CONVERT(varchar(40),[balanceBefore]) AS [balanceBefore],CONVERT(varchar(40),[balanceAfter]) AS [balanceAfter],[createdAt]${full ? ',[actorId]' : ''}
      FROM [loan_repayments] WHERE [employeeId]=@0 ORDER BY [id]`, [employeeId])
    const events = await em.query(`SELECT [id],[loanId],[installmentId],[action],[reason],[requestId],[payrollRunId],[createdAt]${full ? ',[actorId]' : ''}
      FROM [loan_installment_events] WHERE [employeeId]=@0 ${full ? '' : `AND [action] IN (${EMPLOYEE_EVENT_ACTIONS.map(a => `'${a}'`).join(',')})`} ORDER BY [id]`, [employeeId])
    return loans.map((loan: any) => {
      const installments = positions.filter(row => row.loanId === loan.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id - b.id)
        .map(({ employeeId: _employee, ...row }) => row)
      const paidAmount = installments.reduce((sum, row) => sum.add(PayrollDecimal.from(row.paidAmount)), PayrollDecimal.from('0'))
      const remainingAmount = installments.filter(row => row.financialStatus === 'DUE').reduce((sum, row) => sum.add(PayrollDecimal.from(row.remainingAmount)), PayrollDecimal.from('0'))
      return {
        ...loan, isExceptional: loan.isExceptional === true || loan.isExceptional === 1, installments,
        paidCount: installments.filter(row => ['PAID', 'SETTLED'].includes(row.financialStatus)).length,
        paidAmount: paidAmount.format(2, 'DOWN'), remainingAmount: remainingAmount.format(2, 'DOWN'),
        repayments: repayments.filter((row: any) => row.loanId === loan.id), events: events.filter((row: any) => row.loanId === loan.id),
      }
    })
  }

  // ===== AD-14: سداد مبكر يسجله المخوّل =====
  async repay(user: JwtPayload, loanId: number, dto: LoanRepaymentDto) {
    return this.ds.transaction(async em => {
      const [loan] = await em.query('SELECT [id],[employeeId] FROM [loans] WHERE [id]=@0', [loanId])
      if (!loan) throw new NotFoundException('السلفة غير موجودة')
      await this.employeeInScope(em, user, loan.employeeId, 'السلفة غير موجودة')
      const amount = blank(dto.amount) ? null : loanMoney(dto.amount, 'مبلغ السداد')
      return repayLoanEarly(em, { employeeId: loan.employeeId, loanId, amount, reference: dto.reference, method: dto.method, mode: dto.mode,
        reason: dto.reason ?? null, requestId: null, actorId: user.sub })
    })
  }

  // ===== AD-13: أرصدة ما بعد الإنهاء =====
  async listRecoveries(user: JwtPayload) {
    // فروع النطاق معاملات @n (فرع أو أكتر؛ الفاضي 1 = 0)
    const params: unknown[] = []
    const inScope = branchScopeSql('[branchId]', branchScopeOf(user), params)
    const rows = await this.ds.query(`SELECT ${LOAN_RECOVERY_COLUMNS} FROM [loan_recovery_balances]
      ${inScope ? `WHERE [employeeId] IN (SELECT [id] FROM [employees] WHERE ${inScope})` : ''} ORDER BY [id] DESC`, params)
    if (!rows.length) return []
    const ids = JSON.stringify(rows.map((row: any) => row.id)), employeeIds = JSON.stringify([...new Set(rows.map((row: any) => row.employeeId))])
    const employees = await this.ds.query('SELECT [id],[fullName],[employeeCode],[branchId] FROM [employees] WHERE [id] IN (SELECT CAST([value] AS int) FROM OPENJSON(@0))', [employeeIds])
    const cases = await this.ds.query(`SELECT [id],[status],CONVERT(varchar(10),[lastWorkingDay],23) AS [lastWorkingDay],[settlementDocRef] FROM [offboarding_cases]
      WHERE [id] IN (SELECT [caseId] FROM [loan_recovery_balances] WHERE [id] IN (SELECT CAST([value] AS int) FROM OPENJSON(@0)))`, [ids])
    const events = await this.ds.query(`SELECT [id],[recoveryId],[action],CONVERT(varchar(40),[amount]) AS [amount],CONVERT(varchar(40),[balanceAfter]) AS [balanceAfter],[reference],[reason],[actorId],[createdAt]
      FROM [loan_recovery_events] WHERE [recoveryId] IN (SELECT CAST([value] AS int) FROM OPENJSON(@0)) ORDER BY [id]`, [ids])
    return rows.map((row: any) => {
      const employee = employees.find((item: any) => item.id === row.employeeId), kase = cases.find((item: any) => item.id === row.caseId)
      return { ...row, sourceSnapshot: JSON.parse(row.sourceSnapshot), openAmount: openRecoveryAmount(row), employeeName: employee?.fullName ?? `#${row.employeeId}`,
        employeeCode: employee?.employeeCode ?? null, caseStatus: kase?.status ?? null, lastWorkingDay: kase?.lastWorkingDay ?? null, settlementDocRef: kase?.settlementDocRef ?? null,
        events: events.filter((event: any) => event.recoveryId === row.id) }
    })
  }

  private async recoveryInScope(em: EntityManager, user: JwtPayload, id: number) {
    const [row] = await em.query('SELECT [employeeId] FROM [loan_recovery_balances] WHERE [id]=@0', [id])
    if (!row) throw new NotFoundException('رصيد السلفة المتبقي غير موجود')
    await this.employeeInScope(em, user, row.employeeId, 'رصيد السلفة المتبقي غير موجود')
  }

  async collectRecovery(user: JwtPayload, id: number, dto: { amount: unknown; reference: string; reason?: string }) {
    return this.ds.transaction(async em => {
      await this.recoveryInScope(em, user, id)
      return collectLoanRecovery(em, { recoveryId: id, amount: dto.amount, reference: dto.reference, reason: dto.reason ?? null, actorId: user.sub })
    })
  }

  async writeOffRecovery(user: JwtPayload, id: number, reason: string) {
    return this.ds.transaction(async em => {
      await this.recoveryInScope(em, user, id)
      return writeOffLoanRecovery(em, { recoveryId: id, reason, actorId: user.sub })
    })
  }
}
