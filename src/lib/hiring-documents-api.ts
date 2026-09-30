// «مسوغات التعيين» (طلب المالك 30 سبتمبر — ترحيل 075): المستندات المعلَّمة «مطلوب للتعيين» في «أنواع المستندات» لازم تترفع
// لكل موظف. نداءات الواجهة: تقرير النواقص والتذكير و«المطلوب منّي»، وقراءة مهمة النظام «استلام مسوغات التعيين» في التهيئة.
import { apiFetch, type ApiOnboardingTask } from './api'

export interface HiringDocType {
  code: string
  nameAr: string
}

// صف في «نواقص مسوغات التعيين» — موظف شغال في نطاقك ناقصه مستند مطلوب أو أكتر
export interface HiringMissingRow {
  employeeId: number
  employeeCode: string
  fullName: string
  branchId: number
  branchName: string | null
  departmentId: number | null
  departmentName: string | null
  missing: HiringDocType[]
  requiredCount: number
  presentCount: number
  lastReminderAt: string | null
}

export interface HiringMissingReport {
  required: HiringDocType[] // الأنواع المطلوبة المفعّلة — فاضية = مفيش حاجة متعلّمة «مطلوب للتعيين»
  employees: HiringMissingRow[]
}

export const fetchHiringMissing = (query: { search?: string; branchId?: string | number | null } = {}) => {
  const params = new URLSearchParams()
  if (query.search?.trim()) params.set('search', query.search.trim())
  if (query.branchId) params.set('branchId', String(query.branchId))
  const qs = params.toString()
  return apiFetch<HiringMissingReport>(`/hiring-documents/missing${qs ? `?${qs}` : ''}`)
}

export interface HiringRemindersResult {
  sent: number // اتبعتلهم تذكير (ناقصهم حاجة)
  skipped: number // مالهمش ناقص دلوقتي فماتبعتلهمش
  reminders: Array<{ id: number; employeeId: number; sentAt: string; missing: HiringDocType[] }>
}

export const sendHiringReminders = (employeeIds: number[]) =>
  apiFetch<HiringRemindersResult>('/hiring-documents/reminders', { method: 'POST', body: JSON.stringify({ employeeIds }) })

// «مسوغات التعيين المطلوبة منك» في «مستنداتي»
export interface MyHiringDocuments {
  employeeLinked: boolean
  documents: Array<HiringDocType & { present: boolean }>
  missingCount: number
}

export const fetchMyHiringDocuments = () => apiFetch<MyHiringDocuments>('/hiring-documents/mine')

// ===== مهمة النظام في قائمة التهيئة =====
export const HIRING_DOCS_TASK_KEY = 'HIRING_DOCS'

export interface OnboardingHiringDocs {
  requiredCount: number
  presentCount: number
  missing: HiringDocType[]
}

type OnboardingTaskWithSystem = ApiOnboardingTask & { systemKey?: string | null; hiringDocs?: OnboardingHiringDocs }

/** تقدّم مسوغات التعيين لو المهمة هي «استلام مسوغات التعيين»، وإلا null (مهمة عادية). */
export const hiringDocsOfTask = (task: ApiOnboardingTask): OnboardingHiringDocs | null => {
  const system = task as OnboardingTaskWithSystem
  if (system.systemKey !== HIRING_DOCS_TASK_KEY) return null
  return system.hiringDocs ?? { requiredCount: 0, presentCount: 0, missing: [] }
}

// ===== نصوص الشاشات =====
/** «عقد عمل، فيش وتشبيه» */
export const hiringDocNames = (types: HiringDocType[]) => types.map((type) => type.nameAr).join('، ')

/** «3/5 مستندات» */
export const hiringProgressText = (docs: Pick<OnboardingHiringDocs, 'presentCount' | 'requiredCount'>) =>
  `${docs.presentCount}/${docs.requiredCount} مستندات`

/** سبب قفل خانة مهمة النظام — الناقص وإزاي تكتمل، أو إنها اكتملت لوحدها */
export const hiringTaskLockReason = (docs: OnboardingHiringDocs) =>
  docs.missing.length
    ? `ناقص: ${hiringDocNames(docs.missing)} — المهمة بتكتمل لوحدها لما يترفعوا من «مستندات الموظفين»`
    : 'اكتملت لوحدها بعد رفع كل المستندات المطلوبة'

/** رسالة نجاح «ابعت تذكير» */
export function reminderResultText(result: Pick<HiringRemindersResult, 'sent' | 'skipped'>): string {
  if (result.sent === 0) return 'ماتبعتش تذكير — الموظفين المختارين مالهمش نواقص دلوقتي'
  const sent = `اتبعت تذكير لـ ${result.sent} موظف`
  return result.skipped > 0 ? `${sent}، و${result.skipped} مالهمش نواقص فماتبعتلهمش` : sent
}

// رابط «ارفع المستند» → نموذج الإضافة في «مستندات الموظفين» مفتوح على الموظف ونوع المستند الناقص
const DOC_TYPE_CODE = /^[a-z][a-z0-9_]{1,49}$/

export const uploadMissingHref = (employeeId: number, docType?: string) =>
  `/employees/documents?${new URLSearchParams({ employeeId: String(employeeId), ...(docType ? { docType } : {}) })}`

/** قراءة الرابط ده في «مستندات الموظفين»: موظف برقم صحيح (ونوع بصيغة الكود لو موجود)، وإلا null */
export function uploadPrefillFromSearch(search: string): { employeeId: string; docType: string } | null {
  const params = new URLSearchParams(search)
  const employeeId = params.get('employeeId') ?? ''
  if (!/^[1-9]\d{0,9}$/.test(employeeId)) return null
  const docType = params.get('docType') ?? ''
  return { employeeId, docType: DOC_TYPE_CODE.test(docType) ? docType : '' }
}
