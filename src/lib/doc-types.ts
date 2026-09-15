// أنواع مستندات الموظف — مصدر واحد للأكواد وأسمائها العربية.
// الباك يكتب الكود الإنجليزي (contract, national_id, ...) عند الرفع من فورم
// الموظف، والواجهة تعرضه بالعربي. أي نوع غير معروف يُعرض كما هو.
import { fetchCatalog } from './api'

export interface ApiDocType {
  id: number
  code: string
  nameAr: string
  isActive: boolean
}

export async function loadDocTypes(): Promise<ApiDocType[]> {
  const rows = await fetchCatalog<ApiDocType>('doc-types')
  for (const row of rows) BY_CODE.set(row.code, row.nameAr)
  return rows
}

// أسماء احتياطية للعرض فقط (قبل تحميل الكتالوج أو لكود قديم) — قائمة الاختيار تأتي من الكتالوج
export const DOC_TYPES: Array<{ code: string; label: string }> = [
  { code: 'contract', label: 'عقد عمل' },
  { code: 'national_id', label: 'هوية وطنية / رقم قومي' },
  { code: 'passport', label: 'جواز سفر' },
  { code: 'qualification_certificate', label: 'شهادة المؤهل' },
  { code: 'cv', label: 'السيرة الذاتية' },
  { code: 'experience_certificate', label: 'شهادة خبرة' },
  { code: 'formal_photo', label: 'صورة شخصية رسمية' },
  { code: 'iqama', label: 'إقامة' },
  { code: 'driver_license', label: 'رخصة قيادة' },
  { code: 'health_certificate', label: 'شهادة صحية' },
  { code: 'letter', label: 'خطاب رسمي' },
  // أكواد خطابات قديمة ليست في كتالوج أنواع المستندات — للعرض فقط
  { code: 'salary_certificate', label: 'خطاب تعريف بالراتب' },
  { code: 'bank_letter', label: 'خطاب تعريف للبنك' },
  { code: 'embassy_letter', label: 'خطاب تعريف للسفارة' },
  { code: 'clearance_form', label: 'نموذج إخلاء طرف' },
  { code: 'other', label: 'أخرى' },
]

const BY_CODE = new Map(DOC_TYPES.map((t) => [t.code, t.label]))

// اسم النوع بالعربي — يقبل الكود الإنجليزي أو نصاً عربياً كتبه المستخدم سابقاً
export const docTypeLabel = (code?: string) =>
  !code ? '' : (BY_CODE.get(code) ?? code)

// خيارات «نوع المستند»: الأنواع الفعّالة في الكتالوج وحدها (ما يقبله الخادم)؛
// نوع محفوظ خارجها يبقى خياراً «(نوع قديم)» كي لا يُمسح عند التعديل
export function docTypeSelectOptions(rows: ApiDocType[], current: string): Array<{ value: string; label: string }> {
  const options = rows.filter((row) => row.isActive).map((row) => ({ value: row.code, label: row.nameAr }))
  if (current && !options.some((option) => option.value === current)) {
    options.push({ value: current, label: `${docTypeLabel(current)} (نوع قديم)` })
  }
  return options
}
