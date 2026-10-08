import { In, type EntityManager } from 'typeorm'
import { inBranchScope, type BranchScope } from '../auth/guards'
import { EmployeeStatusHistory } from '../requests/entities/employment.entities'
import { EmployeePaymentChange } from '../employees/employee-payment-change.entity'
import { PAYMENT_CHANGE_FIELDS, PAYMENT_CHANGE_FIELD_LABELS, PAYMENT_CHANGE_SOURCE_LABELS, paymentChangeValue, paymentChangesTableExists,
  type PaymentChangeField, type PaymentChangeSource } from '../employees/employee-payment-changes'
import { EmployeeSalaryHistoryVersion } from './payroll-salary-history.entities'
import { PayrollItem, PayrollRun, PayrollRunMember } from './payroll.entities'
import { payrollRunSeriesName } from './payroll-run-membership-moves'
import { payrollRunRefVisibility } from './payroll-run-visibility'
import { PAYROLL_LINE_NAMES } from './payroll-item-lines'
import { PAYROLL_STATUTORY_TOTAL_LABEL, payrollItemStatutoryCentsOfText } from './payroll-statutory'

// B1.7 (R10): «اتغيّر إيه من آخر مسير» — لكل موظف في المسير: الراتب والحساب البنكي وطريقة الصرف، ومين غيّر وإمتى، من بعد آخر مسير
// معتمد أو مصروف ليه. المصدر: تاريخ الراتب الشهري (مين وإمتى)، وسجل تغييرات الصرف (ترحيل 081)، وقبله أو قبل أول صف فيه سجل تغييرات
// الموظف القديم. نفس الجمع بيتسأل منه ضابط «اللي غيّر مايعتمدش لوحده». قراءة بس.
//
// CRP1-B01 (مراجعة Codex للمرحلة 1): الجمع نوعين. ضابط الاعتماد (قرار) بيجمع بكل المسيرات من غير قارئ. والعرض بيتجمع لقارئ بعينه:
// المسير السابق لكل موظف هو آخر مسير **القارئ يقدر يشوفه للموظف ده** (قاعدة مراجع المسير: payrollRunRefVisibility)، فلا شهر ولا مبلغ
// ولا حد «من بعد اعتماده» ولا عدّاد في الرد بييجي من مسير برّه نطاقه (موظف اتنقل من فرع تاني: مسيره هناك كأنه مش موجود).

/** قارئ العرض: نطاق فروعه ورقم ملفه (الموظف بيشوف مسيراته زي القسيمة). null في الجمع = داخلي بكل المسيرات (ضابط الاعتماد، مش عرض) */
export interface PayrollRunChangesViewer { scope: BranchScope; selfEmployeeId: number | null }

export interface PayrollRunMemberChange {
  kind: 'SALARY' | 'PAYMENT'
  field: string | null
  label: string
  oldValue: string | null
  newValue: string | null
  changedByUserId: number | null
  changedAt: string
  source: string | null
  reason: string | null
}
export interface PayrollRunMemberChanges {
  employeeId: number
  /** آخر مسير معتمد أو مصروف ليه قبل المسير ده — null = أول مرة في مسير. الرقم للاستعمال جوه الخادم بس (الرد بالشهر بس) */
  previousRunId: number | null
  previousPeriod: string | null
  since: string | null
  changes: PayrollRunMemberChange[]
}

const isoOf = (value: unknown) => value instanceof Date ? value.toISOString() : value == null ? null : new Date(String(value)).toISOString()

/**
 * فرق ساعة التطبيق عن ساعة القاعدة بالمللي ثانية (لأقرب ربع ساعة): تاريخ الراتب وسجل التغييرات القديم بيتختموا بـGETDATE (افتراضي
 * أعمدة الإنشاء)، والاعتماد وسجل الصرف بساعة التطبيق (مشغل mssql بـuseUTC=false). على نفس الخادم صفر، وفي حاوية SQL بتوقيت UTC
 * والتطبيق بتوقيت محلي = فرق المنطقة. ختم القاعدة + الفرق = اللحظة بساعة التطبيق
 */
export async function databaseClockSkewMs(em: EntityManager): Promise<number> {
  const [row] = await em.query('SELECT GETDATE() AS [now]')
  const read = row?.now instanceof Date ? row.now.getTime() : new Date(String(row?.now)).getTime()
  return Number.isFinite(read) ? Math.round((Date.now() - read) / 900000) * 900000 : 0
}
const json = (ids: number[]) => JSON.stringify(ids)

interface PreviousRunRow { employeeId: number; runId: number; period: string; approvedAt: Date | null; name: string | null }
// المسيرات المرشحة: معتمد أو مصروف (مش عكس) لحد شهر المسير ده، غير المسير نفسه، وللموظف بند فيه
const PREVIOUS_RUN_SOURCE = `FROM [payroll_items] i INNER JOIN [payroll_runs] r ON r.[id] = i.[runId]
        WHERE r.[status] IN ('APPROVED', 'PAID') AND (r.[runType] IS NULL OR r.[runType] <> 'REVERSAL') AND r.[id] <> @0 AND r.[period] <= @1
          AND i.[employeeId] IN (SELECT CAST([value] AS int) FROM OPENJSON(@2))`

/**
 * آخر مسير معتمد أو مصروف (مش عكس) لكل موظف لحد شهر المسير ده، غير المسير نفسه.
 * CRP1-B01: لقارئ بنطاق فروع، المسير اللي مايشوفهوش للموظف بيتعدّى وبناخد اللي قبله المرئي؛ ومن غير أي مسير مرئي الموظف مالوش سابق.
 */
async function previousApprovedRuns(em: EntityManager, run: Pick<PayrollRun, 'id' | 'period'>, employeeIds: number[], viewer: PayrollRunChangesViewer | null) {
  const result = new Map<number, { runId: number; period: string; approvedAt: Date | null; name: string | null }>()
  const previousOf = (row: PreviousRunRow) => ({ runId: Number(row.runId), period: row.period, approvedAt: row.approvedAt ? new Date(row.approvedAt) : null, name: row.name })
  for (let offset = 0; offset < employeeIds.length; offset += 1000) {
    const rows: PreviousRunRow[] = await em.query(`
      SELECT x.[employeeId], x.[runId], x.[period], x.[approvedAt], x.[name] FROM (
        SELECT i.[employeeId], r.[id] AS [runId], r.[period], r.[approvedAt], r.[name],
          ROW_NUMBER() OVER (PARTITION BY i.[employeeId] ORDER BY r.[period] DESC, r.[approvedAt] DESC, r.[id] DESC) AS [rn]
        ${PREVIOUS_RUN_SOURCE}
      ) x WHERE x.[rn] = 1`, [run.id, run.period, json(employeeIds.slice(offset, offset + 1000))])
    for (const row of rows) result.set(Number(row.employeeId), previousOf(row))
  }
  if (!viewer || viewer.scope === null || !result.size) return result
  // الأغلب إن آخر مسير مرئي (الموظف مااتنقلش): فحص واحد. واللي آخر مسير ليه مخفي بس بنجيب كل مرشحيه بنفس الترتيب وناخد أول مرئي
  const shown = await payrollRunRefVisibility(em, viewer.scope, [...result.values()].map(previous => previous.runId), [...result.keys()], viewer.selfEmployeeId)
  const concealed = [...result].filter(([employeeId, previous]) => !shown(previous.runId, employeeId)).map(([employeeId]) => employeeId)
  for (const employeeId of concealed) result.delete(employeeId)
  for (let offset = 0; offset < concealed.length; offset += 500) {
    const chunk = concealed.slice(offset, offset + 500)
    const rows: PreviousRunRow[] = await em.query(`SELECT i.[employeeId], r.[id] AS [runId], r.[period], r.[approvedAt], r.[name]
        ${PREVIOUS_RUN_SOURCE}
        ORDER BY i.[employeeId], r.[period] DESC, r.[approvedAt] DESC, r.[id] DESC`, [run.id, run.period, json(chunk)])
    const visible = await payrollRunRefVisibility(em, viewer.scope, rows.map(row => Number(row.runId)), chunk, viewer.selfEmployeeId)
    for (const row of rows) {
      const employeeId = Number(row.employeeId)
      if (!result.has(employeeId) && visible(Number(row.runId), employeeId)) result.set(employeeId, previousOf(row))
    }
  }
  return result
}

/**
 * التغييرات من بعد آخر مسير معتمد لكل موظف (الأقدم الأول). الموظف من غير مسير قبل كده: مالوش تغييرات (هو «جديد»).
 * viewer = قارئ العرض (آخر مسير يشوفه هو للموظف)؛ من غيره = جمع داخلي بكل المسيرات (ضابط الاعتماد) — مايترجعش في رد لحساب فروع.
 */
export async function collectPayrollRunMemberChanges(em: EntityManager, run: Pick<PayrollRun, 'id' | 'period'>, employeeIds: readonly number[],
  viewer: PayrollRunChangesViewer | null = null): Promise<Map<number, PayrollRunMemberChanges>> {
  const ids = [...new Set(employeeIds)].filter(id => Number.isSafeInteger(id) && id > 0)
  const previous = await previousApprovedRuns(em, run, ids, viewer)
  const result = new Map<number, PayrollRunMemberChanges>(ids.map(id => {
    const prev = previous.get(id)
    return [id, { employeeId: id, previousRunId: prev?.runId ?? null, previousPeriod: prev?.period ?? null, since: prev?.approvedAt ? prev.approvedAt.toISOString() : null, changes: [] }]
  }))
  const withSince = ids.filter(id => previous.get(id)?.approvedAt)
  if (!withSince.length) return result
  const sinceOf = (id: number) => previous.get(id)!.approvedAt!
  const earliest = new Date(Math.min(...withSince.map(id => sinceOf(id).getTime())))
  // ختم القاعدة ↔ ساعة التطبيق (تاريخ الراتب وسجل التغييرات القديم)
  const skew = await databaseClockSkewMs(em)
  const toDatabase = (value: Date) => new Date(value.getTime() - skew), fromDatabase = (value: Date | string) => new Date(new Date(value).getTime() + skew)
  const push = (employeeId: number, change: PayrollRunMemberChange) => {
    if (new Date(change.changedAt).getTime() > sinceOf(employeeId).getTime()) result.get(employeeId)!.changes.push(change)
  }
  for (let offset = 0; offset < withSince.length; offset += 1000) {
    const chunk = withSince.slice(offset, offset + 1000)
    // الراتب: كل نسخة اتسجلت في تاريخ الراتب الشهري بعد آخر مسير (مين وإمتى وليه)
    const versions = await em.getRepository(EmployeeSalaryHistoryVersion).createQueryBuilder('v')
      .select(['v.id', 'v.employeeId', 'v.revision', 'v.reason', 'v.createdBy', 'v.createdAt'])
      .where('v.employeeId IN (:...ids)', { ids: chunk }).andWhere('v.createdAt > :since', { since: toDatabase(earliest) }).getMany()
    for (const version of versions) push(version.employeeId, { kind: 'SALARY', field: null, label: 'الراتب', oldValue: null, newValue: null,
      changedByUserId: version.createdBy ?? null, changedAt: isoOf(fromDatabase(version.createdAt))!, source: null, reason: version.reason ?? null })
  }
  // الحساب البنكي وطريقة الصرف: السجل الجديد (081)، وسجل التغييرات القديم قبل أول صف فيه (أو كله لو الجدول مش موجود أو فاضي)
  const hasTable = await paymentChangesTableExists(em)
  let cutoff: Date | null = null
  if (hasTable) {
    const [first] = await em.query('SELECT MIN([changedAt]) AS [first] FROM [employee_payment_changes]')
    cutoff = first?.first ? new Date(first.first) : null
  }
  for (let offset = 0; offset < withSince.length; offset += 1000) {
    const chunk = withSince.slice(offset, offset + 1000)
    if (hasTable && cutoff) {
      const rows = await em.getRepository(EmployeePaymentChange).createQueryBuilder('c')
        .where('c.employeeId IN (:...ids)', { ids: chunk }).andWhere('c.changedAt > :since', { since: earliest }).orderBy('c.changedAt', 'ASC').getMany()
      for (const row of rows) push(row.employeeId, { kind: 'PAYMENT', field: row.field, label: PAYMENT_CHANGE_FIELD_LABELS[row.field as PaymentChangeField] ?? row.field,
        oldValue: row.oldValue, newValue: row.newValue, changedByUserId: row.changedByUserId, changedAt: isoOf(row.changedAt)!,
        source: PAYMENT_CHANGE_SOURCE_LABELS[row.source as PaymentChangeSource] ?? row.source, reason: null })
    }
    const legacy = await em.getRepository(EmployeeStatusHistory).createQueryBuilder('h')
      .where('h.employeeId IN (:...ids)', { ids: chunk }).andWhere('h.fieldName IN (:...fields)', { fields: [...PAYMENT_CHANGE_FIELDS] })
      .andWhere('h.changedAt > :since', { since: toDatabase(earliest) })
      .andWhere(cutoff ? 'h.changedAt < :cutoff' : '1 = 1', cutoff ? { cutoff: toDatabase(cutoff) } : {}).orderBy('h.changedAt', 'ASC').getMany()
    for (const row of legacy) {
      const field = row.fieldName as PaymentChangeField
      push(row.employeeId, { kind: 'PAYMENT', field, label: PAYMENT_CHANGE_FIELD_LABELS[field] ?? field,
        oldValue: paymentChangeValue(field, row.oldValue), newValue: paymentChangeValue(field, row.newValue),
        changedByUserId: row.changedByUserId ?? null, changedAt: isoOf(fromDatabase(row.changedAt))!, source: null, reason: row.reason ?? null })
    }
  }
  for (const entry of result.values()) entry.changes.sort((a, b) => a.changedAt.localeCompare(b.changedAt))
  return result
}

// مسيرات السلسلة المرشحة بتتقري صفحة صفحة لحد أول مسير مرئي
const SERIES_PAGE = 20

/**
 * الخارجين: أعضاء آخر مسير معتمد أو مصروف من نفس السلسلة (نفس الاسم) قبل الشهر ده ومش في المسير ده — بنطاق القارئ (لقطة العضوية).
 * CRP1-B01: لحساب فروع، «آخر مسير في السلسلة» هو آخر واحد فيه عضو واحد على الأقل يشوفه (لقطة فرعه في نطاقه، أو مسير قديم من غير أعضاء
 * وفرعه في نطاقه). المسير اللي كله برّه نطاقه بيتعدّى كأنه مش موجود، فشهره مابيطلعش. حساب الشركة: آخر مسير في السلسلة زي ما هو.
 * CRP1R-N01: المسيرات المخفية بتتفلتر في الاستعلام نفسه قبل أي حد، فعددها مهما كان مابيزاحمش المسير المرئي (كان الحد 50 بيتطبق قبل
 * فحص النطاق، فخمسين مسير مخفي أحدث كانوا بيسقّطوا تنبيه الخارجين). الحكم النهائي لقاعدة الرؤية نفسها (payrollRunRefVisibility).
 */
export async function payrollRunLeavers(em: EntityManager, run: Pick<PayrollRun, 'id' | 'period' | 'name'>, memberIds: ReadonlySet<number>, scope: BranchScope) {
  const none = { previousPeriod: null as string | null, leavers: [] as Array<{ employeeId: number; employeeCode: string | null; fullName: string | null }> }
  const series = payrollRunSeriesName(run.name)
  if (!series) return none
  // نفس قاعدة الرؤية في الاستعلام: عضو لقطة فرعه في النطاق، أو مسير من غير أعضاء خالص وفرعه في النطاق
  const inScope = scope === null ? '' : ` AND (EXISTS (SELECT 1 FROM [payroll_run_members] m WHERE m.[runId] = r.[id]
        AND TRY_CAST(JSON_VALUE(CAST(m.[snapshot] AS nvarchar(max)), '$.branchId') AS int) IN (SELECT CAST([value] AS int) FROM OPENJSON(@5)))
      OR (NOT EXISTS (SELECT 1 FROM [payroll_run_members] m WHERE m.[runId] = r.[id]) AND r.[branchId] IN (SELECT CAST([value] AS int) FROM OPENJSON(@5))))`
  const pageSize = scope === null ? 1 : SERIES_PAGE
  for (let offset = 0; ; offset += pageSize) {
    const candidates: Array<{ id: number; period: string }> = await em.query(`SELECT r.[id], r.[period] FROM [payroll_runs] r
      WHERE LTRIM(RTRIM(r.[name])) = @0 AND r.[status] IN ('APPROVED', 'PAID')
      AND (r.[runType] IS NULL OR r.[runType] <> 'REVERSAL') AND r.[period] < @1 AND r.[id] <> @2${inScope}
      ORDER BY r.[period] DESC, r.[id] DESC OFFSET @3 ROWS FETCH NEXT @4 ROWS ONLY`,
    [series, run.period, run.id, offset, pageSize, ...(scope === null ? [] : [JSON.stringify(scope)])])
    for (const candidate of candidates) {
      const previousId = Number(candidate.id)
      const members = await em.getRepository(PayrollRunMember).find({ where: { runId: previousId }, select: { id: true, employeeId: true, membershipStatus: true, snapshot: true } })
      if (scope !== null) {
        // من غير استثناء «الموظف نفسه»: المطلوب هنا عضو من نطاق القارئ، مش قسيمته هو
        const shown = await payrollRunRefVisibility(em, scope, [previousId], members.map(member => member.employeeId))
        if (!(members.length ? members.some(member => shown(previousId, member.employeeId)) : shown(previousId, 0))) continue
      }
      const leavers = members.filter(member => (member.membershipStatus === 'INCLUDED' || member.membershipStatus == null) && !memberIds.has(member.employeeId)
        && inBranchScope(scope, member.snapshot?.branchId ?? null))
        .map(member => ({ employeeId: member.employeeId, employeeCode: member.snapshot?.employeeCode ?? null, fullName: member.snapshot?.fullName ?? null }))
      return { previousPeriod: String(candidate.period), leavers }
    }
    // حساب الشركة: أول مسير بس (زي ما كان). حساب الفروع: نكمّل لو الصفحة كاملة ومفيش فيها مرئي
    if (scope === null || candidates.length < pageSize) return none
  }
}

/** الراتب الشهري (المكونات الست) في بند المسير — للمقارنة بين آخر مسير والمسير ده */
export function payrollItemMonthlyGross(item: Pick<PayrollItem, 'breakdown'> | null | undefined): number | null {
  if (!item?.breakdown) return null
  try {
    const gross = Number(JSON.parse(item.breakdown).gross)
    return Number.isFinite(gross) ? gross : null
  } catch { return null }
}

// أعمدة البند اللي المقارنة بتقراها: الراتب الشهري من التفصيل، وطريقة الصرف، ومبالغ البنود والصافي (تنبيه تغيّر الصافي — B1.14)
export const PAYROLL_RUN_CHANGE_ITEM_COLUMNS = { id: true, runId: true, employeeId: true, breakdown: true, payMethod: true, basicSalary: true, allowances: true,
  overtimeAmount: true, otherAdditions: true, latenessDeduction: true, shortfallDeduction: true, absenceDeduction: true, unpaidLeaveDeduction: true,
  loanInstallments: true, otherDeductions: true, socialInsuranceDeduction: true, netPay: true } as const

export const payrollRunChangeItems = (em: EntityManager, runIds: number[], employeeIds: number[]) =>
  runIds.length && employeeIds.length ? em.getRepository(PayrollItem).find({ where: { runId: In(runIds), employeeId: In(employeeIds) },
    select: PAYROLL_RUN_CHANGE_ITEM_COLUMNS }) : Promise.resolve([] as PayrollItem[])

// ===== B1.14: تنبيه «الصافي اتغيّر» قبل الاعتماد =====
export const PAYROLL_NET_CHANGE_ALERT_KEY = 'payroll.approval.net_change_alert_percent'
export const PAYROLL_NET_CHANGE_ALERT_DEFAULT = 20
/** نسبة التنبيه من الإعداد: عدد صحيح من 0 لـ1000 (0 = مقفول)، وأي قيمة تانية = الافتراضي */
export function payrollNetChangeAlertPercent(value: unknown): number {
  const percent = Number(value)
  return value !== null && value !== undefined && String(value).trim() !== '' && Number.isInteger(percent) && percent >= 0 && percent <= 1000 ? percent : PAYROLL_NET_CHANGE_ALERT_DEFAULT
}
const NET_CHANGE_LINES: ReadonlyArray<[keyof PayrollItem, string]> = [
  ['basicSalary', PAYROLL_LINE_NAMES.BASIC], ['allowances', PAYROLL_LINE_NAMES.SALARY_ALLOWANCES], ['overtimeAmount', PAYROLL_LINE_NAMES.OVERTIME],
  ['otherAdditions', PAYROLL_LINE_NAMES.OTHER_ADDITIONS], ['latenessDeduction', PAYROLL_LINE_NAMES.LATENESS], ['shortfallDeduction', PAYROLL_LINE_NAMES.SHORTFALL],
  ['absenceDeduction', PAYROLL_LINE_NAMES.ABSENCE], ['unpaidLeaveDeduction', PAYROLL_LINE_NAMES.UNPAID_LEAVE], ['loanInstallments', PAYROLL_LINE_NAMES.LOAN],
  ['otherDeductions', PAYROLL_LINE_NAMES.OTHER_DEDUCTIONS], ['socialInsuranceDeduction', PAYROLL_LINE_NAMES.SOCIAL_INSURANCE],
]
const centsOf = (value: unknown) => Math.round((Number(value) || 0) * 100)

export interface PayrollNetChange { previousNet: number; currentNet: number; percent: number | null; lines: Array<{ label: string; previous: number; current: number }> }
/**
 * صافي الموظف في المسير ده قدام صافيه في مسير المقارنة: لو الفرق قد النسبة أو أكتر بيرجّع الصافيين والنسبة والبنود اللي فرقت (سبب التغيير).
 * الصافي السابق صفر أو سالب: مفيش نسبة تتحسب، فأي فرق تنبيه (percent = null). النسبة 0 = التنبيه مقفول. قراءة بس من أعمدة البندين.
 */
export function payrollNetChange(previous: Partial<PayrollItem> | null | undefined, current: Partial<PayrollItem> | null | undefined, thresholdPercent: number): PayrollNetChange | null {
  if (!(thresholdPercent > 0) || !previous || !current) return null
  const before = centsOf(previous.netPay), after = centsOf(current.netPay)
  if (before === after) return null
  const percent = before > 0 ? Math.round(Math.abs(after - before) / before * 1000) / 10 : null
  if (percent !== null && percent < thresholdPercent) return null
  // B4.4 (ب): الخصومات القانونية المحفوظة في التفصيل (ضريبة، صندوق) بند من بنود الفرق زي الأعمدة — من غيرها في البندين مابتظهرش
  const lines = [...NET_CHANGE_LINES.map(([column, label]) => ({ label, previous: centsOf(previous[column]) / 100, current: centsOf(current[column]) / 100 })),
    { label: PAYROLL_STATUTORY_TOTAL_LABEL, previous: payrollItemStatutoryCentsOfText(previous.breakdown) / 100, current: payrollItemStatutoryCentsOfText(current.breakdown) / 100 }]
    .filter(line => line.previous !== line.current)
  return { previousNet: before / 100, currentNet: after / 100, percent, lines }
}
