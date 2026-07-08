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

  return res.json() as Promise<T>
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
  status: 'present' | 'late' | 'absent' | 'early_leave'
  lateMinutes: number; earlyLeaveMinutes: number; workMinutes: number
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
export const archiveEmployee = (id: number) => post<ApiEmployee>(`/employees/${id}/archive`)

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
export const createRequest = (typeCode: string, payload: Record<string, unknown>, submit = true) =>
  post<ApiRequest>('/requests', { typeCode, payload, submit })
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
export const createUser = (u: { email: string; password: string; displayName: string; role: string; branchId?: number; employeeId?: number }) =>
  post<ApiUser>('/users', u)
export const updateUser = (id: number, u: Partial<{ role: string; isActive: boolean; password: string; branchId: number; employeeId: number }>) =>
  patch<ApiUser>(`/users/${id}`, u)
export const fetchConfig = () => get<Array<{ key: string; value: string }>>('/settings/config')
export const updateConfig = (key: string, value: string) => patch('/settings/config', { key, value })
export const fetchLeaveTypes = () => get<any[]>('/settings/leave-types')
export const createLeaveType = (lt: Record<string, unknown>) => post('/settings/leave-types', lt)
export const updateLeaveType = (id: number, lt: Record<string, unknown>) => patch(`/settings/leave-types/${id}`, lt)
export const fetchApprovalChains = () => get<any[]>('/settings/approval-chains')
