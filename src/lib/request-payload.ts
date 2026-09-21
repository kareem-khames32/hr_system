// ملخّص حمولة الطلب للمعتمد — مشترك بين صندوق الموافقات و«طلباتي» وويدجت «طلبات في الانتظار».
// كل مفاتيح الحمولة تُعرض للمعتمد — المفتاح المخفي كان يمرّ تغييره بلا علمه (SEC-REQ-2)

const fieldLabels: Record<string, string> = {
  date: 'التاريخ',
  // طلب «دوام يوم عطلة»: الأيام مفصولة بفاصلة (YYYY-MM-DD) — النموذج يختارها من مدى، لا يكتبها المستخدم
  dates: 'أيام العطلة',
  fromDate: 'من تاريخ',
  toDate: 'إلى تاريخ',
  effectiveDate: 'تاريخ السريان',
  effectivePayrollPeriod: 'يسري من راتب شهر',
  from: 'من الساعة',
  to: 'إلى الساعة',
  days: 'عدد الأيام',
  daysByYear: 'الأيام على السنوات',
  hours: 'عدد الساعات',
  previewFingerprint: 'معاينة الحضور',
  amount: 'المبلغ',
  months: 'عدد الأشهر',
  firstInstallmentPeriod: 'شهر أول قسط',
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
  permissionTypeId: 'نوع الإذن',
  autoDetected: 'مصدر الطلب',
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
  installmentId: 'رقم القسط',
  toPeriod: 'يؤجَّل إلى شهر',
  withEmployeeId: 'الموظف البديل',
  employeeId: 'الموظف',
  punchType: 'نوع البصمة',
  time: 'الوقت',
  newStatus: 'الحالة الجديدة',
  attachmentUrl: 'المرفق',
  skippedHolidays: 'عطلات مستبعدة',
}

// ===== نوع ودجة الحقل — جنب التسميات عمداً عشان خريطة المعتمد وخريطة المُدخِل ما يفترقوش =====
// «ليه أكتب أنا بإيدي؟» — المفتاح نفسه اللي المعتمد بيقرا تسميته هو اللي بيحدد ودجة الإدخال:
// تاريخ ← حقل تاريخ، شهر مسير ← حقل شهر (زي شاشات الرواتب)، وقت ← TimeSelect المشترك،
// رقم ← حقل رقمي بخطوة وحد أدنى، والباقي نص أو نص طويل. المُرسَل للخادم ما بيتغيرش:
// كل ودجة بتطلع نفس النص اللي كان المستخدم بيكتبه بإيده (YYYY-MM-DD / YYYY-MM / HH:MM / رقم).
export type RequestFieldKind = 'date' | 'month' | 'time' | 'number' | 'text' | 'textarea'

const fieldKinds: Record<string, RequestFieldKind> = {
  // تواريخ
  date: 'date',
  fromDate: 'date',
  toDate: 'date',
  effectiveDate: 'date',
  contractStart: 'date',
  contractEnd: 'date',
  lastWorkingDate: 'date',
  // شهور المسير — نفس ودجة شاشات الرواتب (YYYY-MM)
  effectivePayrollPeriod: 'month',
  firstInstallmentPeriod: 'month',
  toPeriod: 'month',
  // أوقات — TimeSelect المشترك (input type="time")
  from: 'time',
  to: 'time',
  time: 'time',
  // أرقام
  days: 'number',
  hours: 'number',
  amount: 'number',
  months: 'number',
  newSalary: 'number',
  increase_pct: 'number',
  // نص طويل
  reason: 'textarea',
  description: 'textarea',
  note: 'textarea',
  // «دوام يوم عطلة»: نص أيام مفصولة بفاصلة — النموذج يبنيه من مدى «من/إلى» وشرائح الأيام
  dates: 'text',
}

/** ودجة المفتاح؛ المفتاح غير المعروف يرجع للاستنتاج القديم (تاريخ ثم رقم ثم نص). */
export function payloadFieldKind(key: string): RequestFieldKind {
  const explicit = fieldKinds[key]
  if (explicit) return explicit
  if (key === 'date' || key.includes('Date')) return 'date'
  if (/days|hours|amount|months|salary|pct/i.test(key) || /Id$/.test(key)) return 'number'
  return 'text'
}

/** خطوة الحقل الرقمي وحده الأدنى — ضبط لوحة الأرقام فقط، بلا أي حساب مالي. */
export const payloadNumberProps = (key: string): { step: string; min: string } =>
  key === 'days' ? { step: '0.5', min: '0' }
    : key === 'hours' ? { step: '0.25', min: '0' }
    : key === 'months' ? { step: '1', min: '1' }
    : key === 'amount' || key === 'newSalary' ? { step: '0.01', min: '0' }
    : key === 'increase_pct' ? { step: '0.01', min: '0' }
    : /Id$/.test(key) ? { step: '1', min: '1' }
    : { step: 'any', min: '0' }

const periodLabels: Record<string, string> = {
  FULL: 'يوم كامل',
  MORNING: 'النصف الصباحي',
  EVENING: 'النصف المسائي',
}

// أكواد أنواع الإجازة → عربي — الكود لا يظهر للمستخدم في أي شاشة
export const leaveTypeCodeLabels: Record<string, string> = {
  ANNUAL: 'سنوية',
  SICK: 'مرضية',
  CASUAL: 'عارضة',
  UNPAID: 'بدون راتب',
  MATERNITY: 'وضع',
  PATERNITY: 'أبوة',
  HAJJ: 'حج',
  MARRIAGE: 'زواج',
  BEREAVEMENT: 'وفاة/عدة',
  EXAM: 'امتحانات',
  COMPENSATORY: 'تعويضية',
}

// عدد الأصول بصيغة عربية — بدل سرد معرّفاتها الخام
const assetCountLabel = (n: number): string =>
  n === 1 ? 'أصل واحد' : n === 2 ? 'أصلان' : n <= 10 ? `${n} أصول` : `${n} أصلاً`

// قيم مقروءة — الأكواد لا تظهر للمستخدم أبداً
export const payloadValueLabel = (k: string, v: unknown): string => {
  if (k === 'previewFingerprint' && typeof v === 'string' && /^[a-f0-9]{64}$/.test(v)) return 'تمت معاينة سجل اليوم قبل التقديم'
  if (k === 'period') return periodLabels[String(v)] ?? String(v)
  if (k === 'leaveType' || k === 'leaveTypeCode') return leaveTypeCodeLabels[String(v)] ?? String(v)
  if (k === 'autoDetected') return v ? 'اكتشفه محرك الحضور' : 'قدّمه الموظف'
  if (k === 'maritalStatus' && v) return ({ single: 'أعزب', married: 'متزوج', divorced: 'مطلق', widowed: 'أرمل' } as Record<string, string>)[String(v)] ?? String(v)
  if (k === 'contractType' && v) return ({ fixed_term: 'محدد المدة', indefinite: 'غير محدد المدة', part_time: 'دوام جزئي', temporary: 'مؤقت' } as Record<string, string>)[String(v)] ?? String(v)
  if (k === 'assetIds' && Array.isArray(v)) return assetCountLabel(v.length)
  if (Array.isArray(v)) return v.map((item) => payloadValueLabel(k, item)).join('، ') || '(قائمة فارغة)'
  if (v === null || v === '') return '(فارغ)'
  if (typeof v === 'boolean') return v ? 'نعم' : 'لا'
  if (typeof v === 'string' && v.startsWith('file:')) return 'مرفق'
  // كائن داخل الحمولة (أيام الإجازة على السنوات مثلاً) يُقرأ «مفتاح: قيمة» —
  // لا JSON ولا String(v) الذي كان يطبع [object Object]
  if (typeof v === 'object') {
    const rows = Object.entries(v as Record<string, unknown>).map(([child, item]) => `${labelOf(child)}: ${payloadValueLabel(child, item)}`)
    return rows.length ? rows.join('، ') : '(فارغ)'
  }
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

// حقول يكتبها الخادم للتدقيق (فحص سقف السلفة وقراراته) — تعرضها الشاشة ملخصًا عربيًا مستقلًا، ولا تظهر خامًا في حمولة الطلب.
export const SERVER_PAYLOAD_KEYS: readonly string[] = ['capCheck', 'capApprovals', 'exceptionalBy']

// كل مفاتيح المستخدم بلا حد أقصى ولا فلترة نوع — «مفتاح: قيمة • مفتاح: قيمة»
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
    .filter(([k]) => !omit.includes(k) && !SERVER_PAYLOAD_KEYS.includes(k))
    .map(([k, v]) => `${labelOf(k)}: ${payloadValueLabel(k, v)}`)
    .join(' • ')
}
