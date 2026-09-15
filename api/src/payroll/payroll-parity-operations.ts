// B5 / الخطوة 23: فترة التكافؤ التشغيلية قبل التحويل إلى POLICY — موثقة ومقروءة من المسيرات الحقيقية، لا محاكاة.
// الخطة: أول 3 أشهر رواتب حية تُعتمد وتُصرف كل مسيراتها بوضع SHADOW (المصروف = الحساب القديم) وتقرير تكافؤ كل مسير مرفق بحدث اعتماده،
// ثم شهران آخران بالطريقة نفسها، ثم قرار التحويل من المالك أو مفوض مكتوب اسمه في ملف التسليم.
// قاعدة D13 (قاعدة المالك) تبقى نافذة لكل مسير: حامل payroll.approve يحوّل مسيرًا بعينه إلى POLICY لو تقرير تكافؤه صفر أو كل فرق له سبب مسجل.
// تصحيح المراجعة: الشهر لا يُحتسب بمسير واحد مصروف بينما مسير آخر في الشهر نفسه LEGACY أو غير مصروف؛ والمسير التجريبي المعلّم بسبب لا يُحتسب ولا يحجب.
export const PAYROLL_PARITY_OPERATIONAL_PLAN = Object.freeze({
  baselineMonths: 3,
  extensionMonths: 2,
  totalMonths: 5,
  counts: 'شهر رواتب كل مسيراته الحية (غير الملغاة وغير المعلّمة تجريبية) بوضع SHADOW ومعتمدة ومصروفة، وتقرير تكافؤ كل مسير منها مرفق ببصمته في حدث اعتماده',
  signer: 'مسؤول الرواتب الذي اعتمد المسير يوقّع على تقرير تكافؤه بحدث الاعتماد (البصمة والأسباب المكتوبة)',
  decision: 'قرار التحويل العام إلى POLICY بعد الخمسة أشهر يعتمده المالك أو مفوض مكتوب اسمه في ملف التسليم، ويُسجل في حدث تغيير وضع المحرك لكل مسير',
  // ملف التسليم (PAYROLL_HANDOFF_LATEST.md، القسم 2): صاحب القرار المالك، ولا مفوض مسمى حتى يكتب المالك اسمه هناك.
  decisionOwner: 'المالك (كريم)',
  delegate: null as string | null,
})

export type PayrollParityOperationsStage = 'BASELINE' | 'EXTENSION' | 'DECISION_DUE'
export type PayrollParityOperationsScope = 'COMPANY' | 'BRANCH'

export interface PayrollParityOperationsRunInput {
  runId: number; name: string | null; period: string; status: string; engineMode: string | null
  approvedAt: Date | string | null; approvedBy: number | null; approvedByName: string | null; paidAt: Date | string | null
  approvedEvent: Record<string, unknown> | null
  // مسير تجريبي معلّم «لا يُحتسب» بسبب مكتوب (غيابها = يُحتسب متى استوفى الشروط)
  parityExcludedReason?: string | null; parityExcludedBy?: number | null; parityExcludedByName?: string | null; parityExcludedAt?: Date | string | null
}

const objectOrNull = (value: unknown) => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null

/** سبب عدم أهلية المسير بذاته (null = أهل: SHADOW ومصروف وتقريره موقّع). */
function ineligibleReason(row: PayrollParityOperationsRunInput, parityReportHash: string | null): string | null {
  if (row.engineMode !== 'SHADOW') return `وضع المحرك ${row.engineMode ?? 'قبل D13'} — فترة التكافؤ تُحتسب بمسيرات SHADOW فقط`
  if (row.status === 'DRAFT') return 'مسودة لم تُحتسب بعد'
  if (row.status === 'CALCULATED') return 'محسوب ولم يُعتمد بعد'
  if (parityReportHash === null) return 'حدث الاعتماد بلا بصمة تقرير تكافؤ'
  if (row.status !== 'PAID') return 'معتمد ولم يُصرف بعد'
  return null
}

export function summarizePayrollParityOperations(input: readonly PayrollParityOperationsRunInput[], options: { scope?: PayrollParityOperationsScope } = {}) {
  const plan = PAYROLL_PARITY_OPERATIONAL_PLAN
  const scope: PayrollParityOperationsScope = options.scope ?? 'COMPANY'
  // المسير الملغى خارج العد تمامًا (لا يُحتسب ولا يحجب شهره)
  const rows = input.filter(row => row.status !== 'CANCELLED')
  const assessed = rows.map(row => {
    const payload = row.approvedEvent ?? {}
    const parityReportHash = typeof payload.parityReportHash === 'string' && /^[a-f0-9]{64}$/.test(payload.parityReportHash) ? payload.parityReportHash : null
    const excludedReason = typeof row.parityExcludedReason === 'string' && row.parityExcludedReason.trim() ? row.parityExcludedReason.trim() : null
    return { row, parityReportHash, excludedReason, ineligible: excludedReason ? null : ineligibleReason(row, parityReportHash) }
  })
  // الشهر يُحتسب فقط لو كل مسيراته الحية (غير التجريبية) أهل، وفيه مسير واحد على الأقل
  const periodKeys = [...new Set(assessed.filter(entry => !entry.excludedReason).map(entry => entry.row.period))].sort()
  const periods = periodKeys.map(period => {
    const live = assessed.filter(entry => !entry.excludedReason && entry.row.period === period)
    const blockers = live.filter(entry => entry.ineligible !== null).map(entry => ({ runId: entry.row.runId, reason: entry.ineligible as string }))
    return { period, counted: blockers.length === 0, runIds: live.map(entry => entry.row.runId), blockers }
  })
  const periodOf = new Map(periods.map(period => [period.period, period]))
  const runs = assessed.map(({ row, parityReportHash, excludedReason, ineligible }) => {
    const period = periodOf.get(row.period)
    const counted = !excludedReason && ineligible === null && !!period?.counted
    const notCountedReason = counted ? null
      : excludedReason ? `مسير تجريبي لا يُحتسب: ${excludedReason}`
      : ineligible ?? `الشهر ${row.period} غير مكتمل: ${(period?.blockers ?? []).map(blocker => `المسير #${blocker.runId} ${blocker.reason}`).join('؛ ')}`
    return { runId: row.runId, name: row.name, period: row.period, status: row.status, engineMode: row.engineMode,
      approvedAt: row.approvedAt, approvedBy: row.approvedBy, approvedByName: row.approvedByName, paidAt: row.paidAt,
      parityReportHash, parityTotals: objectOrNull(row.approvedEvent?.parityTotals), parityExplained: objectOrNull(row.approvedEvent?.parityExplained),
      counted, notCountedReason,
      excluded: excludedReason ? { reason: excludedReason, by: row.parityExcludedBy ?? null, byName: row.parityExcludedByName ?? null, at: row.parityExcludedAt ?? null } : null }
  })
  const countedPeriods = periods.filter(period => period.counted).map(period => period.period)
  const months = countedPeriods.length
  const stage: PayrollParityOperationsStage = months < plan.baselineMonths ? 'BASELINE' : months < plan.totalMonths ? 'EXTENSION' : 'DECISION_DUE'
  const base = stage === 'BASELINE'
    ? `مرحلة خط الأساس: ${months} من ${plan.baselineMonths} أشهر مصروفة بوضع SHADOW بتقرير تكافؤ موقّع`
    : stage === 'EXTENSION'
      ? `مرحلة الشهرين الإضافيين: ${months} من ${plan.totalMonths} أشهر`
      : `اكتملت ${months} أشهر تكافؤ؛ قرار التحويل إلى POLICY للمالك أو مفوضه المكتوب — ${plan.delegate ? `المفوض المسمى: ${plan.delegate}` : `لا مفوض مسمى في ملف التسليم، فالقرار لـ${plan.decisionOwner}`}`
  const message = scope === 'BRANCH' ? `${base} (داخل نطاق فرعك؛ العد العام للشركة يُقرأ بنطاق الشركة)` : base
  return { plan, scope, months, countedPeriods, stage, message, periods, excludedRuns: runs.filter(run => run.excluded).length, runs }
}
