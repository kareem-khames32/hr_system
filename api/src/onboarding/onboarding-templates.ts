import type { EntityManager } from 'typeorm'

// B3.1-أ: قوالب التهيئة بالنطاق — اختيار قالب الموظف (الأدق أولًا) وفحص وجود ترحيل 103. الجدول والعمود الجداد برّه قراءة
// وكتابة الكيانات القايمة: الكود شغال قبل الترحيل (القالب العام بس، وإنشاء قالب بنطاق مرفوض برسالة الترحيل).

export const ONBOARDING_TEMPLATES_MIGRATION_MISSING = 'قوالب التهيئة بالنطاق محتاجة ترحيل 20261007_103 على قاعدة البيانات'
export const ONBOARDING_TEMPLATE_SCOPE_REQUIRED = 'القالب محتاج نطاق: فرع أو مسمى أو درجة أو نوع تعاقد (القالب من غير نطاق هو القالب العام)'
export const ONBOARDING_CONTRACT_TYPES: readonly string[] = ['permanent', 'fixed_term', 'part_time', 'seasonal']

let ready: boolean | null = null
/** جدول القوالب وعمود الربط (ترحيل 103) موجودين؟ الموجود بيتحفظ. الناقص بيتفحص مع كل نداء لحد ما الترحيل يتطبق. */
export async function onboardingTemplatesReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.onboarding_templates', N'U') IS NOT NULL
    AND COL_LENGTH(N'dbo.onboarding_template_items', N'templateId') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetOnboardingTemplatesCache() { ready = null }

export interface OnboardingTemplateScope { branchId: number | null; jobTitle: string | null; gradeId: number | null; contractType: string | null }
export interface OnboardingTemplateSubject { branchId?: number | null; jobTitle?: string | null; gradeId?: number | null; contractType?: string | null }

/** نص المسمى للمقارنة: من غير مسافات زيادة ولا فرق حروف كبيرة (المسمى في ملف الموظف نص حر) */
export const templateTitleKey = (value: unknown): string => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()

/** عدد خانات النطاق المكتوبة — الأكتر = الأدق */
export const templateSpecificity = (scope: OnboardingTemplateScope): number =>
  [scope.branchId != null, templateTitleKey(scope.jobTitle) !== '', scope.gradeId != null, !!scope.contractType].filter(Boolean).length

/** القالب بيطابق الموظف لما **كل** خانة مكتوبة في نطاقه تساوي ملفه؛ قالب من غير ولا خانة مابيطابقش حد (ده القالب العام) */
export function templateMatches(scope: OnboardingTemplateScope, employee: OnboardingTemplateSubject): boolean {
  if (templateSpecificity(scope) === 0) return false
  if (scope.branchId != null && Number(employee.branchId) !== Number(scope.branchId)) return false
  if (templateTitleKey(scope.jobTitle) !== '' && templateTitleKey(employee.jobTitle) !== templateTitleKey(scope.jobTitle)) return false
  if (scope.gradeId != null && Number(employee.gradeId) !== Number(scope.gradeId)) return false
  if (scope.contractType && String(employee.contractType ?? '') !== scope.contractType) return false
  return true
}

/** قوالب الموظف المطابقة بالترتيب: الأدق أولًا، وعند التساوي الأقدم (رقم أصغر) */
export function matchingOnboardingTemplates<T extends OnboardingTemplateScope & { id: number }>(templates: readonly T[], employee: OnboardingTemplateSubject): T[] {
  return templates.filter(template => templateMatches(template, employee))
    .sort((a, b) => templateSpecificity(b) - templateSpecificity(a) || a.id - b.id)
}
