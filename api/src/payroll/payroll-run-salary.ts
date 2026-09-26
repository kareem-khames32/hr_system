import { ConflictException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { MONTHLY_SALARY_COMPONENTS, WORK_PRESSURE_ALLOWANCE } from '../employees/compensation'
import { PAYROLL_MONTHLY_SALARY_HISTORY_VERSION, PayrollPeriodSalaryError, selectPayrollPeriodSalary } from './payroll-period-salary'
import { readSalaryHistory, salaryHistorySchemaMissing } from './payroll-salary-history'

/**
 * الخطوة 13 وقاعدة المالك: راتب شهر المسير يُختار من السجل الشهري حسب شهر المسير نفسه، لا من راتب الملف الحالي.
 * «MONTHLY_HISTORY» (الافتراضي): بلا دليل شهري يُستبعد الموظف بسبب ظاهر.
 * «MONTHLY_HISTORY_OR_CURRENT_FILE»: وضع انتقالي صريح؛ من لا يملك سجلًا شهريًا يُحسب براتب الملف الحالي
 * ويُوسم مصدره «غير موثق» في لقطة العضو. من يملك سجلًا شهريًا لا يرجع أبدًا لراتب الملف.
 */
export const PAYROLL_SALARY_EVIDENCE_MODE_KEY = 'payroll.salary_evidence_mode'
export const PAYROLL_SALARY_EVIDENCE_MODES = ['MONTHLY_HISTORY', 'MONTHLY_HISTORY_OR_CURRENT_FILE'] as const
export type PayrollSalaryEvidenceMode = typeof PAYROLL_SALARY_EVIDENCE_MODES[number]
export const PAYROLL_SALARY_EVIDENCE_DEFAULT: PayrollSalaryEvidenceMode = 'MONTHLY_HISTORY'

type SalaryKey = typeof MONTHLY_SALARY_COMPONENTS[number]['key']
type NoEffectKey = typeof WORK_PRESSURE_ALLOWANCE.key

export interface PayrollRunSalarySource {
  kind: 'MONTHLY_HISTORY' | 'CURRENT_FILE_UNVERIFIED'
  referencePeriod: string
  currency: string | null
  // المكونات الست بمبالغها النصية، وبدل ضغط العمل (ترحيل 071) بس لما يكون له قيمة — فلقطة من غيره زي ما كانت بالحرف
  amounts: Record<SalaryKey, string> & Partial<Record<NoEffectKey, string>>
  sourceRef: string | null
  historyVersionId: number | null
  historyRevision: number | null
  historyContentHash: string | null
  effectivePayrollPeriod: string | null
  effectiveToPayrollPeriod: string | null
  warning: string | null
}

// monthlyComponents = المكونات الست (أساس كل المؤثرات: سعر اليوم والساعة والخصومات والسقف ومحرك السياسة) بنفس ترتيبها،
// وworkPressureAllowance = بدل ضغط العمل الشهري لوحده (بيتصرف كامل بتناسب أيام الخدمة بس، برّه كل أساس)؛ صفر لمن مالوش.
export type PayrollRunSalarySelection =
  | { ok: true; monthlyComponents: number[]; workPressureAllowance: number; source: PayrollRunSalarySource }
  | { ok: false; code: PayrollRunSalaryIssueCode; message: string }

// الأكواد تُحفظ في payroll_run_members.exclusionReason (nvarchar(30)).
export type PayrollRunSalaryIssueCode =
  | 'NO_SALARY_DEFINED'
  | 'SALARY_DAILY_HISTORY_ONLY'
  | 'SALARY_PAYROLL_PERIOD_GAP'
  | 'SALARY_PAYROLL_PERIOD_INVALID'
  | 'SALARY_HISTORY_INVALID'
  | 'SALARY_HISTORY_SCHEMA_MISSING'
  | 'SALARY_COMPONENT_INVALID'

export interface PayrollSalaryEmployee {
  id: number
  currency?: string | null
  basicSalary?: unknown; housingAllowance?: unknown; transportAllowance?: unknown
  phoneAllowance?: unknown; workNatureAllowance?: unknown; otherAllowance?: unknown
  workPressureAllowance?: unknown
}

export function parsePayrollSalaryEvidenceMode(value: string | null | undefined): PayrollSalaryEvidenceMode {
  const mode = value ?? PAYROLL_SALARY_EVIDENCE_DEFAULT
  if (!(PAYROLL_SALARY_EVIDENCE_MODES as readonly string[]).includes(mode)) {
    throw new ConflictException({ code: 'PAYROLL_SALARY_EVIDENCE_MODE_INVALID', message: 'إعداد مصدر راتب شهر المسير غير صالح؛ راجع الإعدادات' })
  }
  return mode as PayrollSalaryEvidenceMode
}

const keys = MONTHLY_SALARY_COMPONENTS.map(component => component.key) as SalaryKey[]

function exactAmount(value: unknown): string | null {
  const text = typeof value === 'number' ? (Number.isFinite(value) ? value.toFixed(2) : '') : typeof value === 'string' ? value.trim() : value == null ? '0' : ''
  if (!/^\d{1,16}(?:\.\d{1,2})?$/.test(text)) return null
  const [whole, fraction = ''] = text.split('.')
  return `${whole.replace(/^0+(?=\d)/, '')}.${fraction.padEnd(2, '0')}`
}

function componentsOf(amounts: Record<SalaryKey, string>): number[] | null {
  const values = keys.map(key => Number(amounts[key]))
  return values.every(value => Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.round(value * 100))) ? values : null
}

/** بدل ضغط العمل الشهري بنص عشري صريح (والرقم للحساب): null = غير صالح. الغائب صفر (قيمته الافتراضية في القاعدة). */
function noEffectAmount(value: unknown): { text: string; amount: number } | null {
  const text = exactAmount(value)
  if (text === null) return null
  const amount = Number(text)
  return Number.isFinite(amount) && amount >= 0 && Number.isSafeInteger(Math.round(amount * 100)) ? { text, amount } : null
}
/** المبالغ المحفوظة في مصدر راتب الشهر: البدل الصفري مايتكتبش، فلقطة الموظف من غيره زي ما كانت قبل ترحيل 071 بالحرف. */
function withNoEffectAmount(amounts: Record<SalaryKey, string>, workPressure: { text: string; amount: number }): PayrollRunSalarySource['amounts'] {
  return workPressure.amount > 0 ? { ...amounts, [WORK_PRESSURE_ALLOWANCE.key]: workPressure.text } : amounts
}

/** يتطلب معاملة نشطة (قراءة السجل الشهري ببصمته). لا يكتب شيئًا. */
export async function selectPayrollRunSalary(em: EntityManager, employee: PayrollSalaryEmployee, referencePeriod: string,
  mode: PayrollSalaryEvidenceMode): Promise<PayrollRunSalarySelection> {
  // الخطوة 9 (مسار R2): مكونات الراتب الست كلها صفر = لا راتب معرّف (مثل الموظفين 1 و154 في hr_system)؛
  // يُستبعد بنفس الكود بدل بند بصافي صفر بلا تنبيه، سواء جاء الصفر من الملف (الوضع الانتقالي) أو من السجل الشهري.
  // بدل ضغط العمل لوحده مايعرّفش راتب (مالوش مؤثرات ومش أساس لحاجة)، فالحكم على الست زي ما كان.
  const zeroSalary = (source: string, workPressure: number): PayrollRunSalarySelection => ({ ok: false, code: 'NO_SALARY_DEFINED',
    message: `مكونات راتب شهر ${referencePeriod} كلها صفر في ${source}${workPressure > 0 ? ' (بدل ضغط العمل لوحده مايعرّفش راتب)' : ''}؛ الموظف بلا راتب معرّف فيُستبعد — أثبت راتبه «يسري من راتب شهر» ثم أعد الحساب` })
  const currentFile = (warning: string): PayrollRunSalarySelection => {
    const amounts = Object.fromEntries(keys.map(key => [key, exactAmount(employee[key])])) as Record<SalaryKey, string | null>
    const workPressure = noEffectAmount(employee[WORK_PRESSURE_ALLOWANCE.key])
    if (keys.some(key => amounts[key] === null) || workPressure === null) {
      return { ok: false, code: 'SALARY_COMPONENT_INVALID', message: 'أحد مكونات راتب الملف الحالي غير صالح؛ صححه قبل حساب المسير' }
    }
    const monthlyComponents = componentsOf(amounts as Record<SalaryKey, string>)
    if (!monthlyComponents) return { ok: false, code: 'SALARY_COMPONENT_INVALID', message: 'أحد مكونات راتب الملف الحالي غير صالح؛ صححه قبل حساب المسير' }
    if (monthlyComponents.every(value => value === 0)) return zeroSalary('ملف الموظف', workPressure.amount)
    return { ok: true, monthlyComponents, workPressureAllowance: workPressure.amount, source: { kind: 'CURRENT_FILE_UNVERIFIED', referencePeriod, currency: employee.currency ?? null,
      amounts: withNoEffectAmount(amounts as Record<SalaryKey, string>, workPressure), sourceRef: `employees:${employee.id}:current`, historyVersionId: null, historyRevision: null,
      historyContentHash: null, effectivePayrollPeriod: null, effectiveToPayrollPeriod: null, warning } }
  }
  let history: Awaited<ReturnType<typeof readSalaryHistory>>
  try {
    history = await readSalaryHistory(em, employee.id)
  } catch (error: any) {
    if (salaryHistorySchemaMissing(error)) {
      return mode === 'MONTHLY_HISTORY'
        ? { ok: false, code: 'SALARY_HISTORY_SCHEMA_MISSING', message: 'ترحيل سجل الأجر غير مطبق؛ لا يوجد دليل لراتب شهر المسير' }
        : currentFile('ترحيل سجل الأجر غير مطبق؛ استُخدم راتب الملف الحالي بلا دليل شهري')
    }
    if (error?.getResponse?.()?.code === 'SALARY_HISTORY_INVALID') {
      return { ok: false, code: 'SALARY_HISTORY_INVALID', message: 'سجل الأجر لا يطابق بصمته الموثقة؛ راجعه من شاشة سجل الأجر قبل الحساب' }
    }
    throw error
  }
  if (history.version?.contractVersion === PAYROLL_MONTHLY_SALARY_HISTORY_VERSION) {
    try {
      const selected = selectPayrollPeriodSalary(history, referencePeriod)
      const amounts = Object.fromEntries(keys.map(key => [key, selected.segment[key]])) as Record<SalaryKey, string>
      const monthlyComponents = componentsOf(amounts)
      // بدل ضغط العمل من نفس فترة السجل الشهري (تغييره بيتأرخ بشهر سريان زي أي مكوّن)
      const workPressure = noEffectAmount(selected.segment[WORK_PRESSURE_ALLOWANCE.key])
      if (!monthlyComponents || workPressure === null) return { ok: false, code: 'SALARY_PAYROLL_PERIOD_INVALID', message: 'مبالغ راتب شهر المسير تتجاوز الدقة المدعومة في الحساب' }
      if (monthlyComponents.every(value => value === 0)) return zeroSalary('سجل الأجر الشهري', workPressure.amount)
      return { ok: true, monthlyComponents, workPressureAllowance: workPressure.amount, source: { kind: 'MONTHLY_HISTORY', referencePeriod, currency: selected.segment.currency,
        amounts: withNoEffectAmount(amounts, workPressure),
        sourceRef: selected.sourceRef, historyVersionId: selected.versionId, historyRevision: selected.historyRevision,
        historyContentHash: selected.historyContentHash, effectivePayrollPeriod: selected.segment.effectivePayrollPeriod,
        effectiveToPayrollPeriod: selected.segment.effectiveToPayrollPeriod, warning: null } }
    } catch (error) {
      if (!(error instanceof PayrollPeriodSalaryError)) throw error
      // من اعتُمد سجله شهريًا لا يرجع لراتب الملف حتى في الوضع الانتقالي: الشهر غير الموثق نقص ظاهر.
      return error.state === 'MISSING'
        ? { ok: false, code: 'SALARY_PAYROLL_PERIOD_GAP', message: `لا يوجد راتب موثق لشهر ${referencePeriod} في سجل الأجر الشهري؛ أضف الشهر من سجل الأجر ثم أعد الحساب` }
        : { ok: false, code: 'SALARY_PAYROLL_PERIOD_INVALID', message: 'سجل الأجر الشهري غير صالح لهذا الشهر؛ راجعه من شاشة سجل الأجر' }
    }
  }
  if (mode === 'MONTHLY_HISTORY_OR_CURRENT_FILE') {
    return currentFile(history.version
      ? 'سجل الأجر مثبت بتواريخ يومية لا تحدد شهر الراتب؛ استُخدم راتب الملف الحالي مؤقتًا بلا دليل شهري'
      : 'لا يوجد سجل أجر شهري؛ استُخدم راتب الملف الحالي مؤقتًا بلا دليل شهري')
  }
  return history.version
    ? { ok: false, code: 'SALARY_DAILY_HISTORY_ONLY', message: `سجل أجر الموظف بتواريخ يومية لا تثبت راتب شهر ${referencePeriod}؛ حوّله إلى «يسري من راتب شهر» من شاشة سجل الأجر` }
    : { ok: false, code: 'NO_SALARY_DEFINED', message: `لا يوجد راتب موثق لشهر ${referencePeriod}؛ أثبت راتب الموظف «يسري من راتب شهر» ثم أعد الحساب` }
}

/**
 * يقارن راتب شهر المسير المحفوظ براتب الشهر نفسه في السجل الحالي عند الاعتماد/الصرف؛ لا يعيد اختيار الوضع أو الشهر.
 * مراجعة السجل الشهري تُلحق ولا تُعدّل (المراجعة المحفوظة في اللقطة تبقى مقروءة)، فالمعيار قيمة هذا الشهر
 * (النوع والعملة والمكونات الست) لا بصمة السجل كله: زيادة أكتوبر أو تصحيح شهر آخر لا يوقف اعتماد سبتمبر،
 * وتصحيح راتب سبتمبر نفسه يوقفه حتى إعادة الحساب. راتب الملف غير الموثق يبقى مقيدًا بمرجع الملف.
 */
export function samePayrollRunSalarySource(saved: PayrollRunSalarySource, current: PayrollRunSalarySelection): boolean {
  if (!current.ok) return false
  const next = current.source
  // بدل ضغط العمل جزء من راتب الشهر: تعديله بعد الحساب يوقف الاعتماد لحد إعادة الحساب؛ غيابه من اللقطة = صفر
  const workPressure = (amounts: PayrollRunSalarySource['amounts'] | undefined) => amounts?.[WORK_PRESSURE_ALLOWANCE.key] ?? '0.00'
  if (saved.kind !== next.kind || saved.referencePeriod !== next.referencePeriod || (saved.currency ?? null) !== (next.currency ?? null) ||
    !keys.every(key => saved.amounts?.[key] === next.amounts[key]) || workPressure(saved.amounts) !== workPressure(next.amounts)) return false
  return saved.kind === 'MONTHLY_HISTORY' || saved.sourceRef === next.sourceRef
}
