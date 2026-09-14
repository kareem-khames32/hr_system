// ملخّص حمولة الطلب للمعتمد — مشترك بين صندوق الموافقات وويدجت «طلبات في الانتظار».
// كل مفاتيح الحمولة تُعرض للمعتمد — المفتاح المخفي كان يمرّ تغييره بلا علمه (SEC-REQ-2)

const fieldLabels: Record<string, string> = {
  date: 'التاريخ',
  fromDate: 'من تاريخ',
  toDate: 'إلى تاريخ',
  effectiveDate: 'تاريخ السريان',
  from: 'من الساعة',
  to: 'إلى الساعة',
  days: 'عدد الأيام',
  hours: 'عدد الساعات',
  previewFingerprint: 'معاينة الحضور',
  amount: 'المبلغ',
  months: 'عدد الأشهر',
  newSalary: 'الراتب الجديد',
  increase_pct: 'نسبة الزيادة %',
  reason: 'السبب',
  description: 'الوصف',
  destination: 'جهة الانتداب',
  iban: 'الآيبان IBAN',
  name: 'الاسم',
  phone: 'رقم الهاتف',
  phoneAlt: 'رقم هاتف بديل',
  maritalStatus: 'الحالة الاجتماعية',
  contractStart: 'بداية العقد',
  contractEnd: 'نهاية العقد',
  contractType: 'نوع العقد',
  contractFileRef: 'مستند العقد',
  documentType: 'نوع الوثيقة',
  courseName: 'اسم الدورة',
  note: 'ملاحظة',
  permissionType: 'نوع الإذن',
  period: 'نطاق اليوم',
  assetIds: 'الأصول المطلوبة',
  lastWorkingDate: 'آخر يوم عمل',
  leaveType: 'نوع الإجازة',
  leaveTypeCode: 'نوع الإجازة',
  // مفاتيح تغيّر سجل الموظف أو وجهة التنفيذ — تظهر للمعتمد دائماً
  email: 'البريد الإلكتروني',
  bankName: 'البنك',
  relation: 'صلة القرابة',
  address: 'العنوان',
  contactNumber: 'رقم التواصل',
  purpose: 'الغرض',
  toTitle: 'المسمى الجديد',
  toTeamId: 'الفريق الجديد',
  toEmployeeId: 'الموظف المستلم',
  assignmentId: 'العهدة',
  leaveId: 'رقم الإجازة',
  loanId: 'رقم السلفة',
  withEmployeeId: 'الموظف البديل',
  employeeId: 'الموظف',
  punchType: 'نوع البصمة',
  time: 'الوقت',
  newStatus: 'الحالة الجديدة',
  attachmentUrl: 'المرفق',
  skippedHolidays: 'عطلات مستبعدة',
}

const periodLabels: Record<string, string> = {
  FULL: 'يوم كامل',
  MORNING: 'النصف الصباحي',
  EVENING: 'النصف المسائي',
}

// قيم مقروءة — الأكواد لا تظهر للمستخدم أبداً
export const payloadValueLabel = (k: string, v: unknown): string => {
  if (k === 'previewFingerprint' && typeof v === 'string' && /^[a-f0-9]{64}$/.test(v)) return 'تمت معاينة سجل اليوم قبل التقديم'
  if (k === 'period') return periodLabels[String(v)] ?? String(v)
  if (k === 'maritalStatus' && v) return ({ single: 'أعزب', married: 'متزوج', divorced: 'مطلق', widowed: 'أرمل' } as Record<string, string>)[String(v)] ?? String(v)
  if (k === 'contractType' && v) return ({ fixed_term: 'محدد المدة', indefinite: 'غير محدد المدة', part_time: 'دوام جزئي', temporary: 'مؤقت' } as Record<string, string>)[String(v)] ?? String(v)
  if (Array.isArray(v)) return v.map((item) => payloadValueLabel(k, item)).join('، ') || '(قائمة فارغة)'
  if (v === null || v === '') return '(فارغ)'
  if (typeof v === 'boolean') return v ? 'نعم' : 'لا'
  if (typeof v === 'string' && v.startsWith('file:')) return 'مرفق'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

// مفتاح بلا تسمية يُفكّ لكلمات مقروءة بدل إخفائه
const labelOf = (k: string): string =>
  fieldLabels[k] ??
  k
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()

export const payloadFieldLabel = labelOf

// كل المفاتيح بلا حد أقصى ولا فلترة نوع — «مفتاح: قيمة • مفتاح: قيمة»
// omit: مفاتيح تعرضها الشاشة في أعمدتها الخاصة فقط (لا تُكرَّر) — الباقي كله يظهر
export const payloadSummary = (raw?: string | null, omit: string[] = []): string => {
  let payload: Record<string, unknown> = {}
  try {
    const v: unknown = raw ? JSON.parse(raw) : {}
    if (v && typeof v === 'object' && !Array.isArray(v)) payload = v as Record<string, unknown>
  } catch {
    /* حمولة تالفة — ملخّص فارغ */
  }
  return Object.entries(payload)
    .filter(([k]) => !omit.includes(k))
    .map(([k, v]) => `${labelOf(k)}: ${payloadValueLabel(k, v)}`)
    .join(' • ')
}
