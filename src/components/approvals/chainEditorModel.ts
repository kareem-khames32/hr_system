// محرر سلسلة الاعتماد — الأنواع والتسميات والدوال الصافية، مشتركة بين «الاعتمادات والموافقات» (مكتبة كل السلاسل)
// و«بانِي الطلبات» (سلسلة كل فئة جوّه الطلبات نفسها). مسارات نسبية (لا @/) عشان اختبارات الخادم بتحمّل الملف ده.
import type { ApiBranch, ChainStepInput } from '../../lib/api'

// شكل سلسلة الاعتماد كما يرجعها الباك إند
export interface ApiChainStep {
  id: number
  chainId: number
  stepOrder: number
  approverRole: string
  isParallel: boolean
  thresholdField: string | null
  thresholdOp: string | null
  thresholdValue: number | null
  slaDays: number | null
  escalateTo: string | null
  canDelegate: boolean
  specificEmployeeId?: number | null
}

export interface ApiChain {
  id: number
  code: string
  nameAr: string
  branchId: number | null
  isActive: boolean
  // نوع الطلب المرتبط بالسلسلة — null للسلاسل المخصّصة (اليدوية) وسلاسل الفئات
  requestTypeCode: string | null
  // اسم النوع وفئته من الباك (مستقل عن فلترة جمهور الكتالوج)
  requestTypeName?: string | null
  requestTypeCategory?: string | null
  // دورة أساسية لنوع طلب (approvalChainId) — تسري على كل الفروع، فلا تُنقل لفرع
  isPrimary?: boolean
  // تنفيذ فوري بلا اعتمادات — يسري فقط حين تكون السلسلة بلا خطوات
  autoApprove: boolean
  steps: ApiChainStep[]
}

// أدوار المعتمدين الحقيقية في المحرك
export const roleLabels: Record<string, string> = {
  direct_manager_of_requester: 'المدير المباشر',
  department_manager_of_requester: 'مدير القسم',
  branch_manager_of_requester: 'مدير الفرع',
  receiving_team_manager: 'المدير المستقبِل',
  hr: 'الموارد البشرية',
  finance: 'المالية',
  custody_officer: 'أمين العهدة',
  it: 'تقنية المعلومات',
  executive: 'التنفيذي',
  payroll_officer: 'موظف الرواتب',
  specific_employee: 'موظف بعينه',
}

export const roleDescriptions: Record<string, string> = {
  direct_manager_of_requester: 'مدير مقدم الطلب المباشر',
  department_manager_of_requester: 'مدير قسم مقدم الطلب',
  branch_manager_of_requester: 'مدير فرع مقدم الطلب',
  receiving_team_manager: 'مدير الفريق المستقبِل (النقل)',
  hr: 'إدارة الموارد البشرية',
  finance: 'الإدارة المالية',
  custody_officer: 'المسؤول عن العُهد',
  it: 'قسم تقنية المعلومات',
  executive: 'الإدارة التنفيذية',
  payroll_officer: 'موظف الرواتب — يُحل بصلاحية اعتماد خطوات الرواتب',
  specific_employee: 'موظف محدد بالاسم يعتمد الخطوة',
}

// أدوار التصعيد — كل الأدوار عدا «موظف بعينه»
export const escalationRoles = Object.entries(roleLabels).filter(
  ([id]) => id !== 'specific_employee'
)

export const thresholdFieldLabels: Record<string, string> = {
  amount: 'المبلغ',
  increase_pct: 'نسبة الزيادة %',
}

export const thresholdOps = ['>=', '>', '<', '<='] as const

// كود السلسلة — نفس قيد الباك إند
export const CODE_RE = /^[A-Za-z0-9_-]{3,50}$/

// تحويل صوتي مبسّط عربي → لاتيني لاقتراح الكود من الاسم
const AR_TO_EN: Record<string, string> = {
  ا: 'A', أ: 'A', إ: 'E', آ: 'A', ء: '', ئ: 'Y', ؤ: 'W',
  ب: 'B', ت: 'T', ث: 'TH', ج: 'J', ح: 'H', خ: 'KH',
  د: 'D', ذ: 'TH', ر: 'R', ز: 'Z', س: 'S', ش: 'SH',
  ص: 'S', ض: 'D', ط: 'T', ظ: 'Z', ع: 'A', غ: 'GH',
  ف: 'F', ق: 'Q', ك: 'K', ل: 'L', م: 'M', ن: 'N',
  ه: 'H', ة: 'H', و: 'W', ي: 'Y', ى: 'A',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
}

export const suggestCode = (nameAr: string): string =>
  nameAr
    .trim()
    .split('')
    .map((ch) => {
      if (/[A-Za-z0-9_-]/.test(ch)) return ch.toUpperCase()
      if (/\s/.test(ch)) return '_'
      return AR_TO_EN[ch] ?? ''
    })
    .join('')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)

// نموذج الخطوة داخل البانِي — نصوص خام للحقول الاختيارية
export type StepForm = {
  key: string
  approverRole: string
  specificEmployeeId: string
  slaDays: string
  escalateTo: string
  thresholdField: string
  thresholdOp: string
  thresholdValue: string
  isParallel: boolean
}

export type ChainForm = {
  name: string
  code: string
  branchId: string
  steps: StepForm[]
}

export const emptyStep = (): StepForm => ({
  key: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  approverRole: 'direct_manager_of_requester',
  specificEmployeeId: '',
  slaDays: '',
  escalateTo: '',
  thresholdField: '',
  thresholdOp: '',
  thresholdValue: '',
  isParallel: false,
})

export const stepFormOf = (s: ApiChainStep, key: string): StepForm => ({
  key,
  approverRole: s.approverRole,
  specificEmployeeId:
    s.specificEmployeeId != null ? String(s.specificEmployeeId) : '',
  slaDays: s.slaDays != null ? String(s.slaDays) : '',
  escalateTo: s.escalateTo ?? '',
  thresholdField: s.thresholdField ?? '',
  thresholdOp: s.thresholdOp ?? '',
  thresholdValue: s.thresholdValue != null ? String(s.thresholdValue) : '',
  isParallel: !!s.isParallel,
})

// تحقق محلي يطابق قواعد الباك إند قبل الإرسال
export function validateChainForm(form: ChainForm, creating: boolean): string | null {
  if (form.name.trim().length < 3) {
    return 'اسم الدورة مطلوب (3 أحرف على الأقل)'
  }
  if (creating && !CODE_RE.test(form.code.trim())) {
    return 'كود الدورة: أحرف إنجليزية وأرقام و _ أو - فقط (من 3 إلى 50 خانة)'
  }
  for (const s of form.steps) {
    if (s.approverRole === 'specific_employee' && s.specificEmployeeId === '') {
      // نفس رسالة الباك إند حرفياً
      return 'خطوة «موظف بعينه» تحتاج تحديد الموظف'
    }
    const parts = [
      s.thresholdField.trim() !== '',
      s.thresholdOp !== '',
      s.thresholdValue.trim() !== '',
    ].filter(Boolean).length
    if (parts !== 0 && parts !== 3) {
      // نفس رسالة الباك إند حرفياً
      return 'الخطوة الشرطية تحتاج: حقل + معامل + قيمة عتبة'
    }
    if (s.slaDays !== '') {
      const n = Number(s.slaDays)
      if (!Number.isInteger(n) || n < 1) return 'مهلة الرد: عدد أيام صحيح (1 فأكثر)'
    }
    if (s.thresholdValue.trim() !== '' && Number.isNaN(Number(s.thresholdValue))) {
      return 'قيمة العتبة يجب أن تكون رقماً'
    }
  }
  return null
}

export const buildChainSteps = (form: ChainForm): ChainStepInput[] =>
  form.steps.map((s, i) => ({
    approverRole: s.approverRole,
    // «موازية مع السابقة»
    isParallel: i > 0 && s.isParallel,
    // «موظف بعينه»
    ...(s.approverRole === 'specific_employee' && s.specificEmployeeId !== ''
      ? { specificEmployeeId: Number(s.specificEmployeeId) }
      : {}),
    ...(s.slaDays !== '' ? { slaDays: Number(s.slaDays) } : {}),
    ...(s.escalateTo ? { escalateTo: s.escalateTo } : {}),
    ...(s.thresholdField.trim()
      ? {
          thresholdField: s.thresholdField.trim(),
          thresholdOp: s.thresholdOp as ChainStepInput['thresholdOp'],
          thresholdValue: Number(s.thresholdValue),
        }
      : {}),
  }))

// النسخة الخاصة بفرع = نفس كود سلسلة عامة بفرع — resolveChain في الخادم بيقدّمها لطلبات موظفي الفرع ده
export const generalChainOf = (chain: ApiChain, chains: ApiChain[]): ApiChain | null =>
  chain.branchId === null ? null : chains.find((c) => c.code === chain.code && c.branchId === null) ?? null

export const branchVersionsOfChain = (chain: ApiChain, chains: ApiChain[]): ApiChain[] =>
  chain.branchId !== null ? [] : chains.filter((c) => c.code === chain.code && c.branchId !== null)

export const branchesWithoutVersionOf = (chain: ApiChain, chains: ApiChain[], branches: ApiBranch[]): ApiBranch[] => {
  const taken = new Set(branchVersionsOfChain(chain, chains).map((c) => c.branchId))
  return branches.filter((b) => !taken.has(b.id))
}

// ملخص الخطوات في سطر: «المدير المباشر ← الموارد البشرية» (المتوازية بـ «+»)
export function chainStepsText(
  steps: ReadonlyArray<Pick<ApiChainStep, 'approverRole'> & { isParallel?: boolean }>,
  autoApprove = false
): string {
  if (!steps.length) return autoApprove ? 'تنفيذ فوري بلا اعتمادات' : 'لسه مالهاش خطوات — الطلب بيقف لحد ما تتضاف'
  return steps.reduce((text, step, index) => {
    const label = roleLabels[step.approverRole] ?? step.approverRole
    if (index === 0) return label
    return `${text}${step.isParallel ? ' + ' : ' ← '}${label}`
  }, '')
}
