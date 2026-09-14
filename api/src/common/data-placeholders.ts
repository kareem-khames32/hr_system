import { ValidateBy, type ValidationOptions } from 'class-validator'

// الخطوة 9 (مسار R2): نصا القيمتين المؤقتتين اللتين كتبهما ترحيل 20260914_021 في الحقول الفارغة (اسم الشركة والمسمى الوظيفي).
// أعاد ترحيل 20260914_024_r2b_step9_placeholder_restore القيم الأصلية (فارغ/NULL) لأنهما ظهرتا كبيانات حقيقية في المستندات والشاشات.
// يبقى النصان هنا حارسًا: لا يُطبعان في مستند، ولا يُحفظان من ملف الموظف أو طلب تغيير المسمى أو إعدادات الشركة.
// النص مطابق حرفيًا لترحيل 021 ولـ src/lib/data-placeholders.ts (اختبار api/test/r2-step9-data.test.cjs)؛ لا تغيّره.
export const COMPANY_NAME_PLACEHOLDER = 'اسم الشركة غير مُدخل (يُستكمل من الإعدادات)'
export const JOB_TITLE_PLACEHOLDER = 'مسمى وظيفي غير مُدخل (يُستكمل)'

const PLACEHOLDERS: readonly string[] = [COMPANY_NAME_PLACEHOLDER, JOB_TITLE_PLACEHOLDER]

/** true للقيمة المؤقتة نفسها (بعد قص المسافات)؛ الفارغ ليس قيمة مؤقتة ويُفحص منفصلًا. */
export function isDataPlaceholder(value: unknown): boolean {
  return typeof value === 'string' && PLACEHOLDERS.includes(value.trim())
}

/** القيمة بعد القص، والقيمة المؤقتة أو الغائبة = '' (بيان غير متوفر). */
export function withoutDataPlaceholder(value: unknown): string {
  const text = String(value ?? '').trim()
  return isDataPlaceholder(text) ? '' : text
}

export const DATA_PLACEHOLDER_REJECTED = 'هذه قيمة مؤقتة وليست بيانًا حقيقيًا؛ أدخل القيمة الفعلية أو اترك الحقل فارغًا'

/** يرفض حفظ القيمة المؤقتة كبيان مؤكد (DTO). */
export function IsNotDataPlaceholder(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy({ name: 'isNotDataPlaceholder', validator: {
    validate: (value: unknown) => !isDataPlaceholder(value),
    defaultMessage: () => DATA_PLACEHOLDER_REJECTED,
  } }, options)
}
