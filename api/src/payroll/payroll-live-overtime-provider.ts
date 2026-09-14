import type { EntityManager } from 'typeorm'
import type { OvertimeEntry } from '../requests/entities/attendance.entities'
import { overtimeFinancialValue } from './overtime-financial'
import { PayrollDecimal } from './payroll-decimal'
import { PAYROLL_LIVE_SOURCE_ROW_LIMIT, type PayrollLiveSourceSection } from './payroll-live-source-contract'

const LIMIT = PAYROLL_LIVE_SOURCE_ROW_LIMIT
const statuses = ['DETECTED', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED']
interface Claim { kind: 'PAYROLL' | 'SETTLEMENT'; id: number; status: string; sourceRef: string }
interface ClosedPeriod { runId: number; period: string; sourceRef: string; startDate: string; endDate: string }
interface LiveOvertimeRow {
  id: number; requestId: number | null; payrollRunId: number | null; date: string; status: string; source: string; sourceRef: string
  pricingState: 'APPROVAL_SNAPSHOT' | 'LEGACY_UNPRICED' | 'NOT_APPROVED' | 'INVALID'
  approvedAmount: string | null; approvedMinutes: number | null; eligible: boolean; retroactive: boolean
  reasons: string[]; claims: Claim[]; closedPeriod: ClosedPeriod | null; approvalSnapshot: unknown; rawCalculationSnapshot: string | null
}
const object = (value: unknown): value is Record<string, any> => value !== null && typeof value === 'object' && !Array.isArray(value)
const id = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0
const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith('0000-') &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
function rawJson(value: unknown): Record<string, any> | null {
  if (value === null) return null
  if (typeof value !== 'string' || value.length > 1000000) throw new Error('JSON_SOURCE_INVALID')
  const parsed: unknown = JSON.parse(value)
  if (!object(parsed)) throw new Error('JSON_SOURCE_INVALID')
  const stack: Array<{ value: unknown; depth: number }> = [{ value: parsed, depth: 0 }]
  let nodes = 0
  while (stack.length) {
    const current = stack.pop()!
    if (++nodes > 50000 || current.depth > 24) throw new Error('JSON_SOURCE_INVALID')
    if (typeof current.value === 'number' && (!Number.isFinite(current.value) || (Number.isInteger(current.value) && !Number.isSafeInteger(current.value)))) throw new Error('JSON_SOURCE_INVALID')
    if (current.value && typeof current.value === 'object') for (const child of Object.values(current.value)) stack.push({ value: child, depth: current.depth + 1 })
  }
  return parsed
}
function money(value: unknown): PayrollDecimal {
  if (typeof value !== 'string' || !/^\d{1,16}(?:\.\d{1,2})?$/.test(value)) throw new Error('MONEY_SOURCE_INVALID')
  return PayrollDecimal.from(value)
}
function safeApprovalMoney(value: unknown, saved: PayrollDecimal) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return false
  const amount = PayrollDecimal.from(String(value)), cents = amount.multiply(PayrollDecimal.from('100'))
  return cents.denominator === 1n && cents.numerator <= BigInt(Number.MAX_SAFE_INTEGER) && amount.compare(saved) === 0
}

/** قراءة داخل معاملة الخادم: لا تسعير قديم، ولا حجز أو تصحيح أو تجسيد حضور. */
export async function readPayrollLiveOvertime(em: EntityManager, employeeId: number, periodStart: string, periodEnd: string): Promise<PayrollLiveSourceSection> {
  const issues: PayrollLiveSourceSection['issues'] = [], refs = new Set<string>(), result: LiveOvertimeRow[] = []
  let state: PayrollLiveSourceSection['state'] = 'AVAILABLE'
  const issue = (level: 'INVALID' | 'UNSUPPORTED', code: string, message: string, sourceRef?: string) => {
    if (state !== 'INVALID') state = level
    issues.push({ code, message, ...(sourceRef ? { sourceRef } : {}) })
  }
  const finish = (): PayrollLiveSourceSection => {
    let total = PayrollDecimal.from('0'), minutes = 0
    if (state === 'AVAILABLE') for (const row of result.filter(row => row.eligible)) {
      total = total.add(money(row.approvedAmount)); minutes += row.approvedMinutes!
      if (!Number.isSafeInteger(minutes)) issue('INVALID', 'OT_MINUTES_TOTAL_INVALID', 'إجمالي دقائق الإضافي يتجاوز الحد الآمن')
    }
    if (state !== 'AVAILABLE') for (const row of result) { row.eligible = false; if (!row.reasons.includes('SECTION_UNRESOLVED')) row.reasons.push('SECTION_UNRESOLVED') }
    return { state, data: { periodStart, periodEnd, rows: result, totals: state === 'AVAILABLE' ? { eligibleAmount: total.format(2, 'HALF_UP'), eligibleApprovedMinutes: minutes } : null, readOnly: true }, issues, sourceRefs: [...refs].sort() }
  }
  if (!id(employeeId) || !validDate(periodStart) || !validDate(periodEnd) || periodStart > periodEnd) {
    issue('INVALID', 'OT_PERIOD_INVALID', 'الموظف أو فترة قراءة الإضافي غير صالحين'); return finish()
  }

  // raw JSON وCAST يمنعان محول ORM من إخفاء فساد JSON أو فقد قروش decimal(18,2).
  const rows: any[] = await em.query(`SELECT TOP (5001) o.id,o.employeeId,o.requestId,CONVERT(varchar(10),o.[date],23) AS [date],o.source,o.status,o.payrollRunId,
    CONVERT(varchar(40),o.hoursRequested) AS hoursRequested,CONVERT(varchar(40),o.hoursActual) AS hoursActual,
    CONVERT(varchar(40),o.payableHours) AS payableHours,CONVERT(varchar(40),o.rate) AS rate,
    o.calculationSnapshot,o.approvedMinutes,CONVERT(varchar(40),o.hourlyRateSnapshot) AS hourlyRateSnapshot,
    CONVERT(varchar(40),o.amountSnapshot) AS amountSnapshot,o.originalPeriod,o.deferredFromRunId,
    (SELECT COUNT(*) FROM dbo.overtime_entries d WHERE d.employeeId=o.employeeId AND d.[date]=o.[date] AND d.status NOT IN ('REJECTED','CANCELLED')) AS activeDateCount
    FROM dbo.overtime_entries o WHERE o.employeeId=@0 AND o.[date]<=@2 AND (o.[date]>=@1 OR o.status='APPROVED') ORDER BY o.[date],o.id`, [employeeId, periodStart, periodEnd])
  const payrolls: any[] = await em.query(`SELECT TOP (5001) i.id,i.runId,i.breakdown,CONVERT(varchar(40),i.overtimeAmount) AS overtimeAmount,
    r.status,r.period,CONVERT(varchar(10),r.startDate,23) AS startDate,CONVERT(varchar(10),r.endDate,23) AS endDate
    FROM dbo.payroll_items i INNER JOIN dbo.payroll_runs r ON r.id=i.runId WHERE i.employeeId=@0 AND r.status IN ('APPROVED','PAID') ORDER BY r.id DESC,i.id`, [employeeId])
  const periods: any[] = await em.query(`SELECT TOP (5001) c.id,c.runId,c.periodKey AS period,CONVERT(varchar(10),c.startDate,23) AS startDate,
    CONVERT(varchar(10),c.endDate,23) AS endDate FROM dbo.payroll_period_claims c INNER JOIN dbo.payroll_runs r ON r.id=c.runId
    WHERE c.employeeId=@0 AND c.releasedAt IS NULL AND r.status IN ('APPROVED','PAID') ORDER BY c.id DESC`, [employeeId])
  const settlements: any[] = await em.query(`SELECT TOP (5001) c.id,c.status,c.settlementFinancialSnapshot,
    CASE WHEN EXISTS (SELECT 1 FROM dbo.settlement_lines l WHERE l.caseId=c.id AND l.isAuto=1) THEN 1 ELSE 0 END AS hasAutoLines,
    CASE WHEN EXISTS (SELECT 1 FROM dbo.overtime_entries o WHERE o.employeeId=c.employeeId AND o.status='APPROVED') THEN 1 ELSE 0 END AS hasApprovedOvertime
    FROM dbo.offboarding_cases c WHERE c.employeeId=@0 AND c.status IN ('SETTLED','CLOSED') ORDER BY c.id`, [employeeId])
  if (rows.length + payrolls.length + periods.length + settlements.length > LIMIT) {
    issue('UNSUPPORTED', 'OT_SOURCE_LIMIT', 'تجاوز عدد مصادر الإضافي والمطالبات حد القراءة 5000؛ يلزم تضييق المصدر أو مراجعته'); return finish()
  }
  const claims = new Map<number, Claim[]>(), closedPeriods: ClosedPeriod[] = []
  const addClaim = (entryId: number, claim: Claim) => {
    const previous = claims.get(entryId) ?? []
    if (previous.some(item => item.kind !== claim.kind || item.id !== claim.id)) issue('INVALID', 'OT_DUPLICATE_CLAIM', `قيد الإضافي رقم ${entryId} مرتبط بأكثر من مطالبة مالية`, claim.sourceRef)
    claims.set(entryId, [...previous, claim])
  }
  const addPeriod = (row: any, sourceRef: string) => {
    if (!id(row.runId) || typeof row.period !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.period) || !validDate(row.startDate) || !validDate(row.endDate) || row.startDate > row.endDate) {
      issue('INVALID', 'OT_CLOSED_PERIOD_INVALID', 'حدود الفترة المالية المقفلة غير صالحة', sourceRef); return
    }
    closedPeriods.push({ runId: row.runId, period: row.period, startDate: row.startDate, endDate: row.endDate, sourceRef })
  }
  for (const row of periods) {
    const ref = `payroll-period-claim:${row.id}`; refs.add(ref); addPeriod(row, ref)
  }
  for (const row of payrolls) {
    const ref = `payroll-item:${row.id}`; refs.add(ref)
    try {
      if (!id(row.id) || !id(row.runId) || !['APPROVED', 'PAID'].includes(row.status)) throw new Error()
      addPeriod(row, ref)
      const snapshot = rawJson(row.breakdown), amount = money(row.overtimeAmount), ids = snapshot?.overtimeEntryIds
      if (ids == null && amount.isZero()) continue
      if (!Array.isArray(ids) || ids.length > LIMIT || ids.some(value => !id(value)) || new Set(ids).size !== ids.length || (!amount.isZero() && !ids.length)) throw new Error()
      for (const entryId of ids) addClaim(entryId, { kind: 'PAYROLL', id: row.runId, status: row.status, sourceRef: ref })
    } catch { issue('INVALID', 'OT_PAYROLL_CLAIMS_INVALID', `مصادر إضافي المسير رقم ${row.runId} غير مثبتة أو تالفة`, ref) }
  }
  for (const row of settlements) {
    const ref = `settlement:${row.id}`; refs.add(ref)
    try {
      if (!id(row.id) || !['SETTLED', 'CLOSED'].includes(row.status)) throw new Error()
      const snapshot = rawJson(row.settlementFinancialSnapshot)
      if (snapshot === null) {
        if (row.hasAutoLines && row.hasApprovedOvertime) issue('UNSUPPORTED', 'OT_SETTLEMENT_CLAIMS_UNRESOLVED', `التصفية رقم ${row.id} بلا لقطة مصادر مع وجود إضافي معتمد؛ يلزم مراجعتها`, ref)
        continue
      }
      if (snapshot.version !== 1 || !Array.isArray(snapshot.overtime) || snapshot.overtime.length > LIMIT || !Array.isArray(snapshot.installments)) throw new Error()
      const seen = new Set<number>()
      for (const entry of snapshot.overtime) {
        if (!object(entry) || !id(entry.id) || seen.has(entry.id) || typeof entry.amount !== 'number' || !Number.isFinite(entry.amount) || entry.amount < 0) throw new Error()
        seen.add(entry.id); addClaim(entry.id, { kind: 'SETTLEMENT', id: row.id, status: row.status, sourceRef: ref })
      }
    } catch { issue('INVALID', 'OT_SETTLEMENT_CLAIMS_INVALID', `مصادر إضافي التصفية رقم ${row.id} تالفة`, ref) }
  }

  const seen = new Set<number>()
  for (const raw of rows) {
    const ref = `overtime:${raw.id}`; refs.add(ref)
    const row: LiveOvertimeRow = { id: raw.id, requestId: raw.requestId ?? null, payrollRunId: raw.payrollRunId ?? null, date: raw.date, status: raw.status, source: raw.source, sourceRef: ref,
      pricingState: 'NOT_APPROVED', approvedAmount: null, approvedMinutes: null, eligible: false, retroactive: raw.date < periodStart,
      reasons: [], claims: claims.get(raw.id) ?? [], closedPeriod: null, approvalSnapshot: null,
      rawCalculationSnapshot: typeof raw.calculationSnapshot === 'string' ? raw.calculationSnapshot : null }
    result.push(row)
    try {
      if (!id(raw.id) || seen.has(raw.id) || raw.employeeId !== employeeId || !validDate(raw.date) || raw.date > periodEnd || (raw.date < periodStart && raw.status !== 'APPROVED') || !statuses.includes(raw.status) ||
        !['PRE_REQUESTED', 'BIOMETRIC_DETECTED'].includes(raw.source) || (raw.requestId != null && !id(raw.requestId))) throw new Error('ROW')
      seen.add(raw.id)
      // This link is written atomically with PAID; an approval carrying it must not become available again.
      if (raw.payrollRunId != null && (!id(raw.payrollRunId) || raw.status !== 'PAID')) throw new Error('PAYROLL_LINK')
      if (!Number.isSafeInteger(raw.activeDateCount) || raw.activeDateCount < 0 ||
        (!['REJECTED', 'CANCELLED'].includes(raw.status) && raw.activeDateCount > 1)) throw new Error('DUPLICATE_DAY')
      const snapshot = rawJson(raw.calculationSnapshot)
      row.approvalSnapshot = snapshot
      if (!['APPROVED', 'PAID'].includes(raw.status)) { row.reasons.push(['REJECTED', 'CANCELLED'].includes(raw.status) ? raw.status : 'PENDING_APPROVAL'); continue }
      if (raw.status === 'PAID') row.reasons.push('ALREADY_PAID')
      for (const claim of row.claims) row.reasons.push(claim.kind === 'PAYROLL' ? 'CLAIMED_BY_PAYROLL' : 'CLAIMED_BY_SETTLEMENT')
      const hasNewFields = snapshot !== null || raw.approvedMinutes != null || raw.hourlyRateSnapshot != null || raw.amountSnapshot != null || raw.originalPeriod != null || raw.deferredFromRunId != null
      if (!hasNewFields) {
        row.pricingState = 'LEGACY_UNPRICED'; row.reasons.push('LEGACY_PRICE_UNAVAILABLE')
        issue('UNSUPPORTED', 'OT_LEGACY_UNPRICED', `قيد الإضافي القديم رقم ${raw.id} بلا مبلغ اعتماد مجمد؛ لا يُسعّر بسعر حالي`, ref); continue
      }
      const approvedAmount = money(raw.amountSnapshot)
      if (!safeApprovalMoney(snapshot?.approval?.amount, approvedAmount)) throw new Error('AMOUNT_PRECISION')
      const value = overtimeFinancialValue({ ...raw, calculationSnapshot: snapshot } as OvertimeEntry, 0)
      if (value.provenance !== 'APPROVAL_SNAPSHOT') throw new Error('APPROVAL')
      row.pricingState = 'APPROVAL_SNAPSHOT'; row.approvedAmount = raw.amountSnapshot; row.approvedMinutes = value.approvedMinutes
      if (row.retroactive) {
        row.closedPeriod = closedPeriods.find(period => period.startDate <= row.date && period.endDate >= row.date) ?? null
        if (!row.closedPeriod) row.reasons.push('BACKLOG_WITHOUT_CLOSED_PERIOD')
      }
      row.eligible = raw.status === 'APPROVED' && !row.claims.length && (!row.retroactive || row.closedPeriod !== null)
      if (row.eligible) row.reasons.push(row.retroactive ? 'ELIGIBLE_RETROACTIVE' : 'ELIGIBLE_CURRENT_PERIOD')
    } catch (error) {
      row.pricingState = 'INVALID'; row.eligible = false; row.approvalSnapshot = null
      const code = error instanceof Error && error.message === 'DUPLICATE_DAY' ? 'OT_DUPLICATE_DAY' : error instanceof Error && error.message === 'PAYROLL_LINK' ? 'OT_PAYMENT_LINK_INVALID' : error instanceof Error && error.message === 'AMOUNT_PRECISION' ? 'OT_APPROVAL_AMOUNT_UNSAFE' : 'OT_SOURCE_INVALID'
      row.reasons.push(code); issue('INVALID', code, `قيد الإضافي رقم ${raw.id} أو لقطة اعتماده غير صالحين؛ يلزم مراجعة المصدر`, ref)
    }
  }
  return finish()
}
