// B4.4 (ب): الخصومات القانونية في بند المسير (ضريبة كسب العمل، صندوق الشهداء) — حساب نقي من غير قاعدة بيانات.
// مكانها breakdown.statutory (من غير عمود ولا ترحيل، زي «بدل ضغط العمل»): المجموع بيتطرح من الصافي في الآخر — بعد حماية الصافي والتأمينات
// والأقساط وبدل ضغط العمل — فكل الحساب القايم ماشي زي ما هو بالحرف، وكل اللي بيجمع أعمدة البند بياخد المجموع ده من هنا.
// بند من غير breakdown.statutory (الإعداد مقفول، أو فرع مش مصري، أو مسير قديم) = صفر = نفس الأرقام القديمة بالحرف.

export const PAYROLL_STATUTORY_CODES = ['INCOME_TAX', 'MARTYRS_FUND', 'HEALTH_INSURANCE'] as const
export type PayrollStatutoryCode = (typeof PAYROLL_STATUTORY_CODES)[number]
export const PAYROLL_STATUTORY_NAMES: Record<PayrollStatutoryCode, string> = { INCOME_TAX: 'ضريبة كسب العمل', MARTYRS_FUND: 'صندوق الشهداء', HEALTH_INSURANCE: 'التأمين الصحي الشامل' }
export const PAYROLL_STATUTORY_TOTAL_LABEL = 'الخصومات القانونية (ضريبة وصناديق)'

export interface PayrollStatutoryLine { code: PayrollStatutoryCode; amount: number }
export interface PayrollStatutorySnapshot {
  total: number
  lines: PayrollStatutoryLine[]
  /** لقطة حساب الضريبة (الرصيد التراكمي للسنة بيتقري منها) */
  egTax?: Record<string, unknown>
  martyrsFund?: Record<string, unknown>
  /** B4.4 (د): لقطة التأمين الصحي الشامل (الوعاء، النسب، عدد المعالين، وحصة صاحب العمل للعلم) */
  healthInsurance?: Record<string, unknown>
}

const centsOf = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null
  const cents = Math.round(value * 100)
  return Number.isSafeInteger(cents) ? cents : null
}

/**
 * سطور الخصومات القانونية المحفوظة في تفصيل البند بالقروش: [] لبند من غيرها، وnull لقيمة تالفة (المجموع مش مجموع سطوره، كود مش معروف،
 * مبلغ سالب) — التالف مابيتقريش صفر: اللي بيتحقق من الصافي بيرفض.
 */
export function payrollItemStatutoryLines(breakdown: unknown): Array<{ code: PayrollStatutoryCode; cents: number }> | null {
  const stored = breakdown && typeof breakdown === 'object' ? (breakdown as { statutory?: unknown }).statutory : undefined
  if (stored === undefined || stored === null) return []
  if (typeof stored !== 'object' || Array.isArray(stored)) return null
  const { total, lines } = stored as { total?: unknown; lines?: unknown }
  const totalCents = centsOf(total)
  if (totalCents === null || !Array.isArray(lines)) return null
  const result: Array<{ code: PayrollStatutoryCode; cents: number }> = []
  for (const line of lines) {
    const code = (line as { code?: unknown } | null)?.code, cents = centsOf((line as { amount?: unknown } | null)?.amount)
    if (cents === null || !PAYROLL_STATUTORY_CODES.includes(code as PayrollStatutoryCode) || result.some((row) => row.code === code)) return null
    result.push({ code: code as PayrollStatutoryCode, cents })
  }
  return result.reduce((sum, row) => sum + row.cents, 0) === totalCents ? result : null
}

/** مجموع الخصومات القانونية المحفوظ بالقروش: 0 لبند من غيرها، وnull لقيمة تالفة */
export function payrollItemStatutoryCents(breakdown: unknown): number | null {
  const lines = payrollItemStatutoryLines(breakdown)
  return lines === null ? null : lines.reduce((sum, row) => sum + row.cents, 0)
}

/** نفس المجموع من نص التفصيل المحفوظ (التقارير والفروق): نص تالف أو قيمة تالفة = صفر — القراءة للعرض، والتحقق عند الاعتماد هو اللي بيرفض */
export function payrollItemStatutoryCentsOfText(breakdown: string | null | undefined): number {
  if (!breakdown) return 0
  try { return payrollItemStatutoryCents(JSON.parse(breakdown)) ?? 0 } catch { return 0 }
}

/** المجموع القانوني كعمود في استعلام SQL على payroll_items (التقارير اللي بتجمع الأعمدة في القاعدة): 0 لبند من غيره أو بتفصيل مش JSON */
export const payrollStatutorySql = (alias: string): string =>
  `CASE WHEN ISJSON(${alias}.[breakdown]) = 1 THEN ISNULL(TRY_CAST(JSON_VALUE(${alias}.[breakdown], '$.statutory.total') AS decimal(18,2)), 0) ELSE CAST(0 AS decimal(18,2)) END`

/** لقطة الخصومات القانونية لبند: السطور اللي ليها مبلغ ومجموعها (بالقرش) */
export function payrollStatutorySnapshot(amounts: Partial<Record<PayrollStatutoryCode, number>>, details: Pick<PayrollStatutorySnapshot, 'egTax' | 'martyrsFund' | 'healthInsurance'>): PayrollStatutorySnapshot {
  const lines = PAYROLL_STATUTORY_CODES.flatMap((code) => {
    const cents = Math.round((amounts[code] ?? 0) * 100)
    if (!Number.isSafeInteger(cents) || cents < 0) throw new Error(`خصم قانوني غير صالح: ${code}`)
    return cents > 0 ? [{ code, amount: cents / 100 }] : []
  })
  return { total: lines.reduce((sum, line) => sum + Math.round(line.amount * 100), 0) / 100, lines, ...details }
}
