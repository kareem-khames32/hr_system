// B2.5: المهام العامة و«مهامي» (المهام العامة + مهام التهيئة اللي على جهتي + بنود الإخلاء اللي عليّ).
// مسارات نسبية (لا @/) عشان الاختبارات تقرا الملف مباشرة.
import { apiFetch } from './api'

export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'DONE' | 'CANCELLED'
export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH'

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: 'مفتوحة',
  IN_PROGRESS: 'جاري',
  WAITING: 'مستنية',
  DONE: 'خلصت',
  CANCELLED: 'اتلغت',
}
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = { LOW: 'عادية', NORMAL: 'متوسطة', HIGH: 'عالية' }
export const TASK_OPEN_STATUSES: TaskStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING']

export interface ApiTask {
  id: number
  title: string
  description: string | null
  /** المسؤول: موظف، أو دور وظيفي في فرع المهمة (واحد من الاتنين) */
  assigneeEmployeeId: number | null
  assigneeName: string | null
  assigneeCode: string | null
  assigneeRole: string | null
  assigneeRoleLabel: string | null
  branchId: number
  branchName: string | null
  createdByUserId: number
  createdByName: string | null
  createdAt: string
  dueDate: string | null
  /** مفتوحة وموعدها فات */
  overdue: boolean
  priority: TaskPriority
  status: TaskStatus
  requiresProof: boolean
  proofNote: string | null
  proofFileId: number | null
  /** ليه «مستنية»، أو ليه اتلغت، أو ليه اتفتحت تاني */
  statusNote: string | null
  closedAt: string | null
  closedByName: string | null
  /** شغل المسؤول: جاري، مستنية، خلصت. لمهمة تنفيذ طلب: اللي هي عليه أو مدير النظام، ومش صاحب الطلب ولا منشئه */
  canWork: boolean
  /** صاحب «إدارة المهام»، أو اللي كلّف بيها وهو مدير مسؤولها: تعديل، تحويل، إلغاء، إعادة فتح */
  canManage: boolean
  /** مهمة تنفيذ طلب معتمد (B2.6): مابتتدارش من هنا (canManage = false دايمًا)، وإقفالها من مسؤولها بيكمّل الطلب */
  execution: boolean
  /** رقم الطلب (لينك تفاصيله) للي يقدر يفتحه: اللي بيشتغل عليها وهي مفتوحة، واللي قفلها. ومعاه الإثبات والملاحظات ومين قفلها — لغيرهم null */
  requestId: number | null
}

/** مهمة تهيئة على جهتي — بتتقفل من شاشة التهيئة */
export interface ApiMyOnboardingTask {
  taskId: number
  employeeId: number
  employeeName: string
  employeeCode: string
  label: string
  party: string
  dueDate: string
}

/** بند إخلاء طرف عليّ — بيتقفل من ملف الإنهاء */
export interface ApiMyClearanceItem {
  itemId: number
  caseId: number
  party: string
  label: string
  status: string
  employeeId: number
  employeeName: string
  employeeCode: string
  lastWorkingDay: string
}

export interface ApiTaskCounts { open: number; overdue: number }

export interface ApiMyTasks {
  /** false = ترحيل 088 لسه ماتطبقش: المهام العامة مش متاحة، والتهيئة والإخلاء ظاهرين */
  available: boolean
  tasks: ApiTask[]
  onboarding: ApiMyOnboardingTask[]
  clearance: ApiMyClearanceItem[]
  counts: ApiTaskCounts
}

export interface ApiTaskAssignees {
  available: boolean
  canManage: boolean
  /** المدير المباشر ليه مرؤوسين، أو الحساب عنده «إدارة المهام» */
  canAssign: boolean
  employees: Array<{ id: number; fullName: string; employeeCode: string; jobTitle: string | null; branchName: string | null }>
  roles: Array<{ key: string; label: string }>
  branches: Array<{ id: number; name: string }>
}

export interface TaskInput {
  title?: string
  description?: string | null
  assigneeEmployeeId?: number
  assigneeRole?: string
  branchId?: number
  dueDate?: string | null
  priority?: TaskPriority
  requiresProof?: boolean
}

export interface TaskListFilter { status?: 'open' | 'done' | 'cancelled' | 'all'; overdue?: boolean; assigneeEmployeeId?: number }

// بعد أي تغيير في المهام (تكليف، حالة، تحويل): القايمة الجانبية بتعيد قراءة عدّاد «مهامي»
export const TASKS_CHANGED_EVENT = 'hr:tasks-changed'
export const notifyTasksChanged = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event(TASKS_CHANGED_EVENT)) }

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

export const fetchMyTasks = () => apiFetch<ApiMyTasks>('/tasks/mine')
export const fetchMyTasksCount = () => apiFetch<ApiTaskCounts>('/tasks/mine/count')
export const fetchTeamTasks = () => apiFetch<{ manager: boolean; tasks: ApiTask[] }>('/tasks/team')
export const fetchTaskAssignees = () => apiFetch<ApiTaskAssignees>('/tasks/assignees')
export const fetchTask = (id: number) => apiFetch<ApiTask>(`/tasks/${id}`)
export const fetchTasks = (filter: TaskListFilter = {}) => {
  const params = new URLSearchParams()
  if (filter.status) params.set('status', filter.status)
  if (filter.overdue) params.set('overdue', '1')
  if (filter.assigneeEmployeeId) params.set('assigneeEmployeeId', String(filter.assigneeEmployeeId))
  const query = params.toString()
  return apiFetch<{ available: boolean; tasks: ApiTask[] }>(`/tasks${query ? `?${query}` : ''}`)
}
export const createTask = (input: TaskInput) => apiFetch<ApiTask>('/tasks', json('POST', input))
export const updateTask = (id: number, input: TaskInput) => apiFetch<ApiTask>(`/tasks/${id}`, json('PATCH', input))
export const setTaskStatus = (id: number, input: { status: TaskStatus; note?: string; proofNote?: string; proofFileId?: number }) =>
  apiFetch<ApiTask>(`/tasks/${id}/status`, json('POST', input))
