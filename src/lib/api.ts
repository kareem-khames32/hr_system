// طبقة الاتصال بالباك إند — مصدر واحد لكل نداءات الـ API
// التوكن يُحفظ في localStorage (تذكرني) أو sessionStorage (جلسة فقط)

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'

const TOKEN_KEY = 'hr_access_token'
const USER_KEY = 'hr_current_user'

export interface CurrentUser {
  id: number
  email: string
  displayName: string
  role: string
  branchId: number | null
  employeeId: number | null
  // صلاحيات إضافية ممنوحة فوق الدور (hr/finance/custody_officer/it/executive...)
  permissions?: string[]
}

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return (
    localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
  )
}

export const getCurrentUser = (): CurrentUser | null => {
  if (typeof window === 'undefined') return null
  const raw =
    localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CurrentUser
  } catch {
    return null
  }
}

export const saveSession = (
  token: string,
  user: CurrentUser,
  remember: boolean
) => {
  const store = remember ? localStorage : sessionStorage
  store.setItem(TOKEN_KEY, token)
  store.setItem(USER_KEY, JSON.stringify(user))
}

export const clearSession = () => {
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem(TOKEN_KEY)
    store.removeItem(USER_KEY)
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

// نداء عام — يضيف التوكن تلقائياً ويرمي ApiError برسالة السيرفر
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    let message = `خطأ في الاتصال (${res.status})`
    try {
      const body = await res.json()
      message = Array.isArray(body.message)
        ? body.message.join('، ')
        : (body.message ?? message)
    } catch {
      /* الرد ليس JSON */
    }
    throw new ApiError(res.status, message)
  }

  // ردود فارغة (endpoint يرجّع null) لا تكسر التحليل
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}

// ===== Auth =====
export interface LoginResponse {
  accessToken: string
  user: CurrentUser
}

export const login = (email: string, password: string) =>
  apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

// اختصارات الأفعال — كل نداءات النظام من هنا
const get = <T>(path: string) => apiFetch<T>(path)
const post = <T>(path: string, body?: unknown) =>
  apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
const patch = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
const del = <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' })

// ===== أنواع السيرفر الأساسية (مرآة كيانات الباك) =====
export interface ApiBranch {
  id: number; name: string; nameEn?: string; code: string; city?: string
  address?: string; phone?: string; email?: string
  managerEmployeeId?: number; costCenter?: string
  isActive: boolean; isHeadquarters: boolean
}
export interface ApiDepartment {
  id: number; name: string; nameEn?: string; code?: string
  branchId: number; parentId?: number; managerEmployeeId?: number; isActive: boolean
}
export interface ApiTeam {
  id: number; name: string; code?: string; departmentId: number
  leaderEmployeeId?: number; isActive: boolean
  department?: ApiDepartment
}
export interface ApiEmployee {
  id: number; employeeCode: string; fullName: string; fullNameEn?: string
  email?: string; phone?: string; nationalId?: string; jobTitle?: string
  branchId: number; departmentId?: number; teamId?: number
  managerEmployeeId?: number; joinDate?: string; status: string
  basicSalary?: number; payMethod: string; bankName?: string; iban?: string
  housingAllowance?: number; transportAllowance?: number; otherAllowance?: number
  costCenterId?: number
  // توثيق الأرشفة — للفلترة في شاشة الأرشيف
  archivedAt?: string; archiveReason?: string
  isActive: boolean; createdAt: string
}
export interface ApiRequestType {
  id: number; code: string; nameAr: string; category: string
  requiredFields?: string; approvalChainId?: number; destinationHandler: string
  affectsBalance: boolean; isSecurityRoute: boolean; isConfidential: boolean
  autoGeneratesPdf: boolean; phase: string; isActive: boolean
}
export interface ApiRequest {
  id: number; typeCode: string; requesterId: number; branchId?: number
  status: string; currentStep?: number; payload?: string
  destinationRef?: string; resolvedSteps?: string
  createdAt: string; submittedAt?: string; completedAt?: string
  approvals?: ApiApproval[]
}
export interface ApiApproval {
  id: number; requestId: number; step: number; approverId: number
  action: string; comment?: string; actedAt: string
}
export interface ApiAttendanceDay {
  id: number; employeeId: number; branchId?: number; date: string
  checkIn?: string; checkOut?: string
  shiftName: string; shiftStart: string; shiftEnd: string
  status: 'present' | 'late' | 'absent' | 'early_leave' | 'leave' | 'holiday' | 'partial_leave'
  lateMinutes: number; earlyLeaveMinutes: number; workMinutes: number
  // دقائق معذورة بإذن معتمد — لا تُخصم
  excusedMinutes: number
  // دقائق إذن «بخصم» — تدخل خصم المسير
  deductibleMinutes?: number
}
export interface ApiLeave {
  id: number; requestId?: number; employeeId: number; leaveType: string
  fromDate: string; toDate: string; days: number; status: string
  employeeName?: string; employeeCode?: string
}
export interface ApiBalance {
  employeeId: number; balanceType: string; period: string
  opening: { days: number; taken: number; expiry: string | null; expired: boolean; available: number }
  entitled: number; entitledTaken: number; totalTaken: number; remaining: number
}
export interface ApiPayrollRun {
  id: number; branchId: number; period: string; startDate: string; endDate: string
  status: 'CALCULATED' | 'APPROVED' | 'PAID'; totalNet: number
  approvedAt?: string; paidAt?: string; createdAt: string
  items?: ApiPayrollItem[]
}
export interface ApiPayrollItem {
  id: number; runId: number; employeeId: number; basicSalary: number
  overtimeHours: number; overtimeAmount: number; lateMinutes: number
  latenessDeduction: number; unpaidLeaveDays: number; unpaidLeaveDeduction: number
  loanInstallments: number; netPay: number; payMethod: string; breakdown?: string
}
export interface ApiUser {
  id: number; email: string; displayName: string; role: string
  branchId?: number; employeeId?: number; isActive: boolean; lastLoginAt?: string
}
export interface ApiDashboardStats {
  role: string
  employees: { total: number; active: number; probation: number }
  org: { branches: number; departments: number; teams: number }
  requests: { underReview: number; completed: number; rejected: number; total: number }
  attendanceToday: { present: number; late: number; earlyLeave: number; absent: number }
  onLeaveToday: number
  payrollRuns: Array<{ id: number; branchId: number; period: string; status: string; totalNet: number }>
}

// ===== اللوحة =====
export const fetchDashboardStats = () => get<ApiDashboardStats>('/dashboard/stats')

// ===== التكوين =====
export const fetchBranches = () => get<ApiBranch[]>('/branches')
export const createBranch = (b: Partial<ApiBranch>) => post<ApiBranch>('/branches', b)
export const updateBranch = (id: number, b: Partial<ApiBranch>) => patch<ApiBranch>(`/branches/${id}`, b)
export const fetchDepartments = () => get<ApiDepartment[]>('/departments')
export const createDepartment = (d: Partial<ApiDepartment>) => post<ApiDepartment>('/departments', d)
export const updateDepartment = (id: number, d: Partial<ApiDepartment>) => patch<ApiDepartment>(`/departments/${id}`, d)
export const fetchTeams = () => get<ApiTeam[]>('/teams')
export const createTeam = (t: Partial<ApiTeam>) => post<ApiTeam>('/teams', t)
export const updateTeam = (id: number, t: Partial<ApiTeam>) => patch<ApiTeam>(`/teams/${id}`, t)

// ===== الموظفون =====
export const fetchEmployees = () => get<ApiEmployee[]>('/employees')
export const fetchEmployee = (id: number) => get<ApiEmployee>(`/employees/${id}`)
export const createEmployee = (e: Partial<ApiEmployee>) => post<ApiEmployee>('/employees', e)
export const updateEmployee = (id: number, e: Partial<ApiEmployee>) => patch<ApiEmployee>(`/employees/${id}`, e)
export const archiveEmployee = (id: number, reason?: string) =>
  post<ApiEmployee>(`/employees/${id}/archive`, reason ? { reason } : {})

// ===== الطلبات =====
export const fetchRequestTypes = () => get<ApiRequestType[]>('/requests/types')
export const fetchMyRequests = () => get<ApiRequest[]>('/requests/mine')
export const fetchAllRequests = (q?: { status?: string; typeCode?: string }) => {
  const p = new URLSearchParams()
  if (q?.status) p.set('status', q.status)
  if (q?.typeCode) p.set('typeCode', q.typeCode)
  const qs = p.toString()
  return get<ApiRequest[]>(`/requests/all${qs ? `?${qs}` : ''}`)
}
export const fetchInbox = () => get<ApiRequest[]>('/requests/inbox')
export const fetchRequest = (id: number) => get<ApiRequest>(`/requests/${id}`)
export const createRequest = (typeCode: string, payload: Record<string, unknown>, submit = true, onBehalfEmployeeId?: number) =>
  post<ApiRequest>('/requests', { typeCode, payload, submit, ...(onBehalfEmployeeId ? { onBehalfEmployeeId } : {}) })
export const actOnRequest = (id: number, action: 'APPROVE' | 'REJECT' | 'RETURN', comment?: string) =>
  post<ApiRequest>(`/requests/${id}/act`, { action, comment })
export const cancelRequest = (id: number) => post<ApiRequest>(`/requests/${id}/cancel`)
export const resubmitRequest = (id: number, payload?: Record<string, unknown>) =>
  post<ApiRequest>(`/requests/${id}/resubmit`, { payload })

// ===== الحضور =====
export const fetchDailyAttendance = (date: string) => get<ApiAttendanceDay[]>(`/attendance/daily?date=${date}`)
export const fetchMonthlyAttendance = (employeeId: number, month: string) =>
  get<{ employeeId: number; month: string; days: ApiAttendanceDay[]; summary: Record<string, number> }>(
    `/attendance/monthly?employeeId=${employeeId}&month=${month}`)
export const fetchWeekSchedule = (week: string) =>
  get<Array<{ id: number; weekStart: string; employeeId: number; shiftName: string; startTime: string; endTime: string }>>(
    `/attendance/schedule?week=${week}`)
export const upsertWeekSchedule = (entries: Array<{ weekStart: string; employeeId: number; shiftName: string; startTime: string; endTime: string }>) =>
  post('/attendance/schedule', { entries })
export const ingestPunchesManual = (punches: Array<{ employeeCode: string; timestamp: string; deviceSn?: string }>) =>
  post<{ received: number; matched: number }>('/attendance/punches/manual', { punches })
export const fetchPendingOvertime = () => get<any[]>('/attendance/overtime/pending')
export const confirmOvertime = (id: number, approve: boolean) =>
  post(`/attendance/overtime/${id}/confirm`, { approve })

// ===== الإجازات =====
export const fetchLeaves = (month?: string) => get<ApiLeave[]>(`/leaves${month ? `?month=${month}` : ''}`)
export const fetchMyBalances = () => get<ApiBalance[]>('/requests/leave-balances/mine')
export const fetchEmployeeBalances = (employeeId: number) => get<ApiBalance[]>(`/requests/leave-balances/${employeeId}`)

// ===== الرواتب =====
export const fetchPayrollRuns = () => get<ApiPayrollRun[]>('/payroll/runs')
export const fetchPayrollRun = (id: number) => get<ApiPayrollRun>(`/payroll/runs/${id}`)
export const calculatePayroll = (branchId: number, period: string) =>
  post<ApiPayrollRun>('/payroll/runs/calculate', { branchId, period })
export const approvePayroll = (id: number) => post<ApiPayrollRun>(`/payroll/runs/${id}/approve`)
export const payPayroll = (id: number) => post<ApiPayrollRun>(`/payroll/runs/${id}/pay`)
export const fetchPayMethodReport = (id: number) =>
  get<Record<string, { count: number; total: number }>>(`/payroll/runs/${id}/pay-methods`)

// ===== المستخدمون والإعدادات =====
export const fetchUsers = () => get<ApiUser[]>('/users')
export const createUser = (u: { email: string; password: string; displayName: string; role: string; branchId?: number; employeeId?: number; permissions?: string[] }) =>
  post<ApiUser>('/users', u)
export const updateUser = (id: number, u: Partial<{ role: string; isActive: boolean; password: string; branchId: number; employeeId: number; permissions: string[] }>) =>
  patch<ApiUser>(`/users/${id}`, u)
export const fetchConfig = () => get<Array<{ key: string; value: string }>>('/settings/config')
export const updateConfig = (key: string, value: string) => patch('/settings/config', { key, value })
export const fetchLeaveTypes = () => get<any[]>('/settings/leave-types')
export const createLeaveType = (lt: Record<string, unknown>) => post('/settings/leave-types', lt)
export const updateLeaveType = (id: number, lt: Record<string, unknown>) => patch(`/settings/leave-types/${id}`, lt)
export const fetchApprovalChains = () => get<any[]>('/settings/approval-chains')

// بانِي السلاسل — إنشاء/تعديل/استبدال خطوات
export interface ChainStepInput {
  approverRole: string
  thresholdField?: string
  thresholdOp?: '>=' | '>' | '<' | '<='
  thresholdValue?: number
  slaDays?: number
  escalateTo?: string
}
export const createApprovalChain = (c: { code: string; nameAr: string; branchId?: number; steps: ChainStepInput[] }) =>
  post<any>('/settings/approval-chains', c)
export const updateApprovalChain = (id: number, c: { nameAr?: string; isActive?: boolean }) =>
  patch<any>(`/settings/approval-chains/${id}`, c)
export const replaceChainSteps = (id: number, steps: ChainStepInput[]) =>
  patch<any>(`/settings/approval-chains/${id}/steps`, { steps })

// ===== العهدة والأصول =====
export interface ApiAsset {
  id: number; name: string; category: string; serialNumber?: string
  currentHolderId?: number; holderName?: string | null
  // قيمة الأصل (اختيارية) — تُستخدم خصماً عند الفقد/التلف في التصفية
  value?: number | null
  status?: 'AVAILABLE' | 'ASSIGNED' | 'RETIRED'
}
export interface ApiCustody {
  id: number; requestId?: number; assetId: number; employeeId: number
  assignedAt: string; acknowledgedAt?: string; returnedAt?: string
  condition?: string; status: string
  employeeName?: string; employeeCode?: string
  assetName?: string; assetCategory?: string; serialNumber?: string
}
export const fetchAssets = () => get<ApiAsset[]>('/assets')
export const createAsset = (a: Partial<ApiAsset>) => post<ApiAsset>('/assets', a)
export const updateAsset = (id: number, a: Partial<ApiAsset>) => patch<ApiAsset>(`/assets/${id}`, a)
// الأصول المتاحة — لنموذج «طلب عهدة» (خدمة ذاتية)
export const fetchAvailableAssets = () =>
  get<Array<{ id: number; name: string; category: string; serialNumber?: string }>>('/assets/available')
export const retireAsset = (id: number) => post<ApiAsset>(`/assets/${id}/retire`)
export const reactivateAsset = (id: number) => post<ApiAsset>(`/assets/${id}/reactivate`)
export const fetchCustody = () => get<ApiCustody[]>('/custody')
export const assignCustody = (assetId: number, employeeId: number) =>
  post<ApiCustody>('/custody/assign', { assetId, employeeId })
export const returnCustody = (id: number, condition?: string) =>
  post<ApiCustody>(`/custody/${id}/return`, { condition })
// شطب مفقود/تالف — يرجّع قيمة الأصل كتلميح خصم للتصفية
export const writeOffCustody = (id: number, opts?: { lost?: boolean; condition?: string }) =>
  post<ApiCustody & { assetValue?: number | null; note?: string }>(`/custody/${id}/write-off`, opts ?? {})
export const acknowledgeCustody = (assignmentId: number) =>
  post<ApiCustody>(`/requests/custody/${assignmentId}/acknowledge`)
// الموظف يعلّم «سلّمت العهدة» → مسؤول العهد يؤكد بالاستلام الفعلي
export const requestCustodyHandover = (assignmentId: number) =>
  post<ApiCustody>(`/requests/custody/${assignmentId}/handover`)

// ===== المستندات =====
export interface ApiDocument {
  id: number; employeeId: number; docType: string; number?: string
  issueDate?: string; expiryDate?: string; fileRef?: string; notes?: string
  employeeName?: string; employeeCode?: string; expired?: boolean
}
export const fetchDocuments = (q?: { employeeId?: number; expiringDays?: number }) => {
  const p = new URLSearchParams()
  if (q?.employeeId) p.set('employeeId', String(q.employeeId))
  if (q?.expiringDays) p.set('expiringDays', String(q.expiringDays))
  const qs = p.toString()
  return get<ApiDocument[]>(`/documents${qs ? `?${qs}` : ''}`)
}
export const createDocument = (d: Partial<ApiDocument>) => post<ApiDocument>('/documents', d)
export const updateDocument = (id: number, d: Partial<ApiDocument>) => patch<ApiDocument>(`/documents/${id}`, d)

// ===== الكتالوجات (عطلات/ورديات/أجهزة/مسميات/درجات/أنواع أصول) =====
export type CatalogKind = 'holidays' | 'shifts' | 'devices' | 'job-titles' | 'grades' | 'asset-types' | 'permission-types' | 'cost-centers'
export const fetchCatalog = <T = any>(kind: CatalogKind) => get<T[]>(`/catalogs/${kind}`)
export const createCatalogItem = <T = any>(kind: CatalogKind, item: Record<string, unknown>) =>
  post<T>(`/catalogs/${kind}`, item)
export const updateCatalogItem = <T = any>(kind: CatalogKind, id: number, item: Record<string, unknown>) =>
  patch<T>(`/catalogs/${kind}/${id}`, item)

// ===== المرشحون =====
export interface ApiCandidate {
  id: number; fullName: string; email?: string; phone?: string
  positionTitle: string; branchId?: number; stage: string; notes?: string
  hiredEmployeeId?: number; createdAt: string
}
export const fetchCandidates = () => get<ApiCandidate[]>('/candidates')
export const createCandidate = (c: Partial<ApiCandidate>) => post<ApiCandidate>('/candidates', c)
export const updateCandidate = (id: number, c: Partial<ApiCandidate>) => patch<ApiCandidate>(`/candidates/${id}`, c)
export const hireCandidate = (id: number, h: { employeeCode: string; branchId: number; departmentId?: number; basicSalary?: number; joinDate?: string }) =>
  post<{ candidate: ApiCandidate; employee: ApiEmployee }>(`/candidates/${id}/hire`, h)

// ===== النقل والملف المجمّع والسلف =====
export const fetchTransfers = () => get<any[]>('/transfers')
export const fetchEmployeeProfile = (id: number) =>
  get<{ employee: ApiEmployee; leaves: ApiLeave[]; balances: any[]; history: any[]; documents: ApiDocument[]; loans: any[]; custody: ApiCustody[] }>(`/employees/${id}/profile`)
export const fetchEmployeeHistory = (id: number) => get<any[]>(`/employees/${id}/history`)
export const fetchLoans = () => get<any[]>('/loans')

// ===== التقارير =====
export const fetchHeadcountReport = () => get<any>('/reports/headcount')
export const fetchAttendanceReport = (month: string) => get<any[]>(`/reports/attendance?month=${month}`)
export const fetchLeavesReport = (year: string) => get<any>(`/reports/leaves?year=${year}`)
export const fetchPayrollReport = () => get<any>('/reports/payroll')
export const fetchOvertimeReport = (month: string) => get<any[]>(`/reports/overtime?month=${month}`)
export const fetchRequestsReport = () => get<any>('/reports/requests')

// ===== التقويم والإشعارات =====
export const fetchCalendar = (month?: string) =>
  get<{ month: string; holidays: any[]; leaves: ApiLeave[] }>(`/calendar${month ? `?month=${month}` : ''}`)
export const fetchNotifications = () =>
  get<Array<{ id: string; kind: string; title: string; body: string; at: string; link: string }>>('/notifications')

// ===== قسيمة الراتب وبانِي الطلبات =====
export const fetchPayslip = (itemId: number) =>
  get<{ item: ApiPayrollItem; run: ApiPayrollRun; employee: ApiEmployee }>(`/payroll/items/${itemId}`)
export const fetchAdminRequestTypes = () => get<ApiRequestType[]>('/settings/request-types')
export const updateRequestType = (id: number, d: { isActive?: boolean; approvalChainId?: number }) =>
  patch<ApiRequestType>(`/settings/request-types/${id}`, d)
export const fetchRoles = () => get<Array<{ role: string; nameAr: string; scope: string; permissions: string[] }>>('/settings/roles')

// ===== الصلاحيات الدقيقة والأدوار =====
export interface ApiPermission { key: string; labelAr: string; group: string }
export interface ApiRole {
  id: number; code: string; nameAr: string
  permissions: string[]; isSystem: boolean; isActive: boolean
}
export const fetchPermissionsRegistry = () => get<ApiPermission[]>('/permissions-registry')
export const fetchRolesFull = () => get<ApiRole[]>('/roles')
export const createRole = (r: { code: string; nameAr: string; permissions: string[] }) =>
  post<ApiRole>('/roles', r)
export const updateRole = (id: number, r: { nameAr?: string; permissions?: string[]; isActive?: boolean }) =>
  patch<ApiRole>(`/roles/${id}`, r)
export const fetchUserPermissions = (userId: number) =>
  get<{ role: string; grants: string[]; revokes: string[]; effective: string[] }>(`/users/${userId}/permissions`)
export const setUserPermissions = (userId: number, grants: string[], revokes: string[]) =>
  apiFetch<{ role: string; grants: string[]; revokes: string[]; effective: string[] }>(
    `/users/${userId}/permissions`, { method: 'PUT', body: JSON.stringify({ grants, revokes }) })

// هل المستخدم الحالي يملك الصلاحية؟ (للإخفاء في الواجهة — الفرض الحقيقي في الباك)
export const can = (perm: string): boolean => {
  const u = getCurrentUser()
  if (!u) return false
  if (u.role === 'super_admin') return true
  const p = u.permissions ?? []
  return p.includes('*') || p.includes(perm)
}

// ===== بورتال الموظف (خدمة ذاتية) =====
export const fetchMyCustody = () => get<ApiCustody[]>('/custody/mine')
export const fetchMyPayslips = () =>
  get<Array<{ item: ApiPayrollItem; run: ApiPayrollRun }>>('/payroll/my-payslips')

// ===== العهدة: اعتماد المدير المباشر =====
export const managerConfirmCustody = (assignmentId: number) =>
  post<ApiCustody>(`/requests/custody/${assignmentId}/manager-confirm`)
export const fetchCustodyPendingMyConfirm = () =>
  get<ApiCustody[]>('/custody/pending-my-confirm')

// ===== إنهاء الخدمة (إخلاء الطرف + التصفية) =====
export interface ApiClearanceItem {
  id: number; caseId: number; party: string; label: string
  status: string; note?: string; amount?: number; doneBy?: number; doneAt?: string
}
export interface ApiSettlementLine {
  id: number; caseId: number; label: string; type: 'CREDIT' | 'DEBIT'
  amount: number; isAuto: boolean
}
export interface ApiOffboardingCase {
  id: number; employeeId: number; resignationRequestId?: number
  lastWorkingDay: string; status: string
  settlementNet?: number; settlementDocRef?: string; clearanceCertRef?: string
  employeeName?: string; employeeCode?: string
  employee?: ApiEmployee; items?: ApiClearanceItem[]; lines?: ApiSettlementLine[]
  openCustodyCount?: number; net?: number
  createdAt: string
}
export const fetchOffboardingCases = () => get<ApiOffboardingCase[]>('/offboarding')
export const fetchOffboardingCase = (id: number) => get<ApiOffboardingCase>(`/offboarding/${id}`)
export const completeClearanceItem = (itemId: number, d?: { note?: string; amount?: number }) =>
  post<ApiOffboardingCase>(`/offboarding/items/${itemId}/complete`, d ?? {})
export const addSettlementLine = (caseId: number, d: { label: string; type: 'CREDIT' | 'DEBIT'; amount: number }) =>
  post<ApiOffboardingCase>(`/offboarding/${caseId}/lines`, d)
export const updateSettlementLine = (lineId: number, d: { label?: string; amount?: number }) =>
  patch<ApiOffboardingCase>(`/offboarding/lines/${lineId}`, d)
// حذف بند قبل الاعتماد — التلقائي يرجع بإعادة التوليد
export const deleteSettlementLine = (lineId: number) =>
  del<ApiOffboardingCase>(`/offboarding/lines/${lineId}`)
// إعادة توليد البنود التلقائية من أرقام النظام الحالية (اليدوي لا يُمس)
export const recalcSettlementLines = (caseId: number) =>
  post<ApiOffboardingCase>(`/offboarding/${caseId}/recalc-lines`)
export const approveSettlement = (caseId: number) =>
  post<ApiOffboardingCase>(`/offboarding/${caseId}/approve-settlement`)
// التراجع عن الاستقالة خلال فترة الإشعار — الموظف نفسه أو HR
export const withdrawOffboarding = (caseId: number) =>
  post<ApiOffboardingCase>(`/offboarding/${caseId}/withdraw`)
// ملفي النشط (خدمة ذاتية) — null لو مفيش
export const fetchMyOffboardingCase = () =>
  get<{ id: number; status: string; lastWorkingDay: string; createdAt: string } | null>('/offboarding/mine')
// إلغاء إجازة معتمدة مباشرة (HR بصلاحية leaves.revoke)
export const revokeLeave = (leaveId: number) => post<ApiLeave>(`/leaves/${leaveId}/revoke`)
// إجازاتي المعتمدة — لمنتقي «إلغاء/تعديل إجازة»
export const fetchMyApprovedLeaves = () => get<ApiLeave[]>('/requests/my-leaves')

// ===== مزامنة أجهزة البصمة =====
export interface ApiSyncResult {
  deviceId: number; deviceName: string; ok: boolean
  pulled: number; inserted: number; matched: number; error?: string
}
export const syncDevice = (id: number) => post<ApiSyncResult>(`/attendance/devices/${id}/sync`)
export const syncAllDevices = () => post<ApiSyncResult[]>('/attendance/devices/sync-all')

// تجاوز وردية يوم بعينه (حالة خاصة) — clear:true يرجّع اليوم لوردية الأسبوع
export const setDayShiftOverride = (d: {
  employeeId: number; date: string
  shiftName?: string; startTime?: string; endTime?: string; clear?: boolean
}) => post('/attendance/schedule/day', d)
export const fetchWeekDayOverrides = (week: string) =>
  get<Array<{ id: number; employeeId: number; date: string; shiftName: string; startTime: string; endTime: string }>>(
    `/attendance/schedule/day-overrides?week=${week}`)

// ===== الملفات =====
export const uploadFile = async (
  file: File,
  meta?: { entityType?: string; entityId?: number; employeeId?: number }
): Promise<{ id: number; originalName: string; size: number; mime: string; ref: string }> => {
  const p = new URLSearchParams()
  if (meta?.entityType) p.set('entityType', meta.entityType)
  if (meta?.entityId) p.set('entityId', String(meta.entityId))
  if (meta?.employeeId) p.set('employeeId', String(meta.employeeId))
  const fd = new FormData()
  fd.append('file', file)
  const token = getToken()
  const res = await fetch(`${API_BASE}/files/upload?${p.toString()}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.message ?? 'فشل رفع الملف')
  }
  return res.json()
}
// رابط معاينة/تحميل ملف مخزّن (يتطلب توكن — استخدمه مع fetch أو افتحه بجلسة)
export const fileDownloadUrl = (id: number) => `${API_BASE}/files/${id}`

// ===== بانِي أنواع الطلبات =====
export interface CustomFieldDef {
  key: string; label: string; type: 'text' | 'number' | 'date' | 'select' | 'file'
  required?: boolean; options?: string[]
}
export const fetchDestinationHandlers = () =>
  get<Array<{ key: string; labelAr: string }>>('/settings/destination-handlers')
export const createRequestType = (d: {
  nameAr: string; category: string; code?: string
  customFields?: CustomFieldDef[]; requiredAttachments?: string
  destinationHandler?: string; approvalChainId?: number
  visibleTo?: { mode: string; ids: Array<number | string> }
}) => post<ApiRequestType>('/settings/request-types', d)
export const updateRequestTypeFull = (id: number, d: Record<string, unknown>) =>
  patch<ApiRequestType>(`/settings/request-types/${id}`, d)
