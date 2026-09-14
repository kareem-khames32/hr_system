// الخطوة 9 (مسار R2): نفس نص القيمتين المؤقتتين في api/src/common/data-placeholders.ts وترحيل 20260914_021.
// أعاد ترحيل 20260914_024 القيم الأصلية (فارغ/NULL)؛ النص يبقى هنا حارسًا: لو ظهر تُنبّه الشاشة، والخادم لا يطبعه ولا يحفظه.
export const COMPANY_NAME_PLACEHOLDER = 'اسم الشركة غير مُدخل (يُستكمل من الإعدادات)'
export const JOB_TITLE_PLACEHOLDER = 'مسمى وظيفي غير مُدخل (يُستكمل)'

export function isDataPlaceholder(value: unknown): boolean {
  return typeof value === 'string' && [COMPANY_NAME_PLACEHOLDER, JOB_TITLE_PLACEHOLDER].includes(value.trim())
}
