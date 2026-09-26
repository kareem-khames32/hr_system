// سلسلة اعتماد لكل فئة طلبات (طلب المالك 26 سبتمبر): «طلبات الإجازة كلها ماشية على نفس السيناريو — ليه كل نوع ليه سلسلته؟»
// كل فئة ليها سلسلة عامة مربوطة في requests_config بالمفتاح requests.category_chain.<الفئة> = رقم السلسلة (مفيش عمود جديد).
// النوع «ماشي على سلسلة الفئة» لو approvalChainId بتاعه = سلسلة الفئة؛ غير كده «سلسلة خاصة». الإجازات والحضور ممكن يشاوروا
// على نفس السلسلة. نسخة الفرع = نفس كود السلسلة بفرع (resolveChain زي ما هو)، فبتسري على كل نوع ماشي على الفئة.
// المالية من غير سلسلة فئة افتراضيًا: كل طلب مالي بسلسلته. دوال صافية — الخدمة والاختبارات بيستخدموها.
import type { RequestCategory } from './entities/request-type.entity'
import { LOAN_DEFERRAL_TYPE } from './loan-installment-requests'

export const REQUEST_CATEGORIES: readonly RequestCategory[] = [
  'leaves', 'time_attendance', 'financial', 'employment_status', 'personal_data',
  'letters', 'custody_assets', 'training', 'employee_relations',
]

// مرآة categoryLabels في src/data/requestsCatalog.ts — للرسائل واسم السلسلة الجديدة
export const REQUEST_CATEGORY_LABELS: Record<RequestCategory, string> = {
  leaves: 'الإجازات',
  time_attendance: 'الحضور والوقت',
  financial: 'المالية',
  employment_status: 'الحالة الوظيفية',
  personal_data: 'البيانات الشخصية',
  letters: 'الخطابات والشهادات',
  custody_assets: 'العهدة والأصول',
  training: 'التدريب والتطوير',
  employee_relations: 'علاقات الموظفين',
}

export const isRequestCategory = (value: unknown): value is RequestCategory =>
  typeof value === 'string' && (REQUEST_CATEGORIES as readonly string[]).includes(value)

export const CATEGORY_CHAIN_KEY_PREFIX = 'requests.category_chain.'
export const categoryChainKey = (category: RequestCategory) => `${CATEGORY_CHAIN_KEY_PREFIX}${category}`
export const isCategoryChainKey = (key: string) => key.startsWith(CATEGORY_CHAIN_KEY_PREFIX)

// القيمة الفاضية (أو أي حاجة مش رقم موجب) = الفئة مالهاش سلسلة
export function parseCategoryChainId(value: string | null | undefined): number | null {
  const text = String(value ?? '').trim()
  if (!/^\d+$/.test(text)) return null
  const id = Number(text)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export function categoryChainMap(rows: ReadonlyArray<{ key: string; value: string }>): Map<RequestCategory, number> {
  const map = new Map<RequestCategory, number>()
  for (const row of rows) {
    if (!isCategoryChainKey(row.key)) continue
    const category = row.key.slice(CATEGORY_CHAIN_KEY_PREFIX.length)
    const chainId = parseCategoryChainId(row.value)
    if (isRequestCategory(category) && chainId !== null) map.set(category, chainId)
  }
  return map
}

// أنواع سلسلتها مش في إيدها — مايتحسبوش على الفئة ومالهمش «خصّص/رجّع»:
// تأجيل القسط بيمشي على سلسلة السلفة نفسها (resolveChain)، و«خصم»/«مكافأة» بيتقدّموا من شاشتهم بسلسلتها
// (مرآة MONEY_WORKSPACE_TYPES وLEGACY_BONUS_HANDLER في requests.service.ts)
export function fixedChainReason(type: { code: string; destinationHandler?: string | null }): string | null {
  if (type.code === LOAN_DEFERRAL_TYPE) return 'بيمشي على سلسلة السلفة نفسها'
  if (type.code === 'PAYROLL_DEDUCTION') return 'بيتقدّم من شاشة الخصومات وبيمشي في اعتمادها'
  if (type.code === 'PAYROLL_BONUS' || type.destinationHandler === 'payroll_bonus') return 'بيتقدّم من شاشة المكافآت وبيمشي في اعتمادها'
  return null
}

// الإضافي مايتنفذش من غير معتمدين صريحين (requests.service: «الإضافي يتطلب خطوات اعتماد صريحة»)
export const isOvertimeRequestType = (type: { code: string; destinationHandler?: string | null }) =>
  ['OVERTIME', 'OVERTIME_AUTO'].includes(type.code) || ['overtime_entries', 'overtime_auto'].includes(type.destinationHandler ?? '')

export type TypeChainMode = 'category' | 'custom' | 'none' | 'fixed'

export function typeChainMode(
  type: { code: string; destinationHandler?: string | null; approvalChainId?: number | null },
  categoryChainId: number | null
): TypeChainMode {
  if (fixedChainReason(type)) return 'fixed'
  if (!type.approvalChainId) return 'none'
  return categoryChainId !== null && Number(type.approvalChainId) === categoryChainId ? 'category' : 'custom'
}

// كود سلسلة جديد مش مستخدم في أي نطاق (عام أو فرع): نسخة الفرع بتتربط بالكود، فكود قديم لفرع
// كان هيلزق نسخته في السلسلة الجديدة من غير ما حد يقصد
export function nextFreeChainCode(base: string, taken: ReadonlySet<string>): string {
  const clean = base.toUpperCase().replace(/[^A-Z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50) || 'CHAIN'
  const padded = clean.length >= 3 ? clean : `${clean}___`.slice(0, 3)
  if (!taken.has(padded)) return padded
  for (let n = 2; n < 10000; n++) {
    const suffix = `_${n}`
    const candidate = `${padded.slice(0, 50 - suffix.length)}${suffix}`
    if (!taken.has(candidate)) return candidate
  }
  throw new Error('مفيش كود سلسلة فاضي')
}
