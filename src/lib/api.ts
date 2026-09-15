// طبقة الاتصال بالباك إند — مصدر واحد لكل نداءات الـ API
// التوكن يُحفظ في localStorage (تذكرني) أو sessionStorage (جلسة فقط)
import type { EmployeeStatus, AttendanceStatus, CustodyStatus, OvertimeStatus, LeaveStatus, LeavePeriod, LoanStatus, TransferStatus, LetterStatus, BalanceType, LeaveTypeCode } from '../../api/src/common/domain-status'
import type { OvertimeEvidence } from '../../api/src/attendance/overtime-evidence'
import { clearEmployeeAddDrafts } from './employee-add-draft'
export type { EmployeeStatus, AttendanceStatus, CustodyStatus, OvertimeStatus, LeaveStatus, LeavePeriod, LoanStatus, TransferStatus, LetterStatus, BalanceType, LeaveTypeCode } from '../../api/src/common/domain-status'
import type { PayrollCalendarChange } from './payroll-calendar-api'

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
    clearEmployeeAddDrafts(store)
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, unknown>
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
    // انتهاء الجلسة/توكن غير صالح (401 ومعنا توكن): امسح الجلسة ووجّه لصفحة
    // الدخول بدل تناثر «Unauthorized» في كل ويدجت. نستثني نداء تسجيل الدخول
    // نفسه (401 هناك = بيانات خاطئة تُعرض كما هي)
    if (
      res.status === 401 &&
      token &&
      !path.includes('/auth/login') &&
      typeof window !== 'undefined'
    ) {
      clearSession()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=1'
      }
    }
    let message = `خطأ في الاتصال (${res.status})`
    let details: Record<string, unknown> | undefined
    try {
      const body = await res.json()
      if (body && typeof body === 'object' && !Array.isArray(body)) details = body
      message = Array.isArray(body.message)
        ? body.message.join('، ')
        : (body.message ?? message)
    } catch {
      /* الرد ليس JSON */
    }
    throw new ApiError(res.status, message, details)
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
  managerEmployeeId?: number; costCenter?: string | null // كود من كتالوج مراكز التكلفة
  isActive: boolean; isHeadquarters: boolean
  // تجاوز العطلة الأسبوعية للفرع (FRI,SAT) — فارغ = إعداد النظام attendance.weekend_days
  weekendDays?: string | null
  // دولة الفرع (EG/SA...) — تسري عليه عطلات دولته فقط؛ فارغ = كل العطلات
  country?: string | null
}
export interface ApiDepartment {
  id: number; name: string; nameEn?: string; code?: string
  branchId: number; parentId?: number | null; managerEmployeeId?: number; isActive: boolean
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
  workScheduleId?: number; annualLeaveEntitled?: boolean
  flexOverrideMode?: 'INHERIT' | 'ENABLED' | 'DISABLED'
  attendanceRuleVersion?: number | null; attendanceRuleEffectiveFrom?: string | null
  attendanceEffectiveFrom?: string; attendanceChangeReason?: string
  managerEmployeeId?: number; joinDate?: string; status: EmployeeStatus
  basicSalary?: number; payMethod: string; bankName?: string; iban?: string
  housingAllowance?: number; transportAllowance?: number; otherAllowance?: number
  costCenterId?: number; photoFileId?: number
  birthDate?: string; gender?: string; maritalStatus?: string; nationality?: string
  address?: string; emergencyContactName?: string; emergencyContactPhone?: string
  contractType?: string; contractStart?: string; contractEnd?: string
  contractNumber?: string; contractDurationMonths?: number; noticePeriodDays?: number
  contractFileRef?: string // مرفق العقد (payload فقط) — يُنشئ مستند «عقد»
  // ===== حقول الملف الكامل (أعمدة مستقلة على الكيان) =====
  birthPlace?: string; passportNo?: string; passportExpiry?: string
  phoneAlt?: string; country?: string; postalCode?: string
  emergencyRelation?: string; emergencyPhoneAlt?: string
  actualStartDate?: string; workType?: string; probationEndDate?: string
  recruitmentSource?: string; gradeId?: number; workLocation?: string
  currency?: string; salaryCycle?: string; bankBranch?: string
  gosiNumber?: string; isGosiRegistered?: boolean; gosiBaseSalary?: number
  // ===== إصلاحات ذهاب/عودة — أعمدة مستقلة =====
  fingerprintCode?: string; personalEmail?: string
  phoneAllowance?: number; workNatureAllowance?: number
  // ===== مراجع المستندات (payload فقط) — الباك يُنشئ EmployeeDocument لكل عنصر =====
  documentRefs?: { docType: string; fileRef: string; number?: string }[]
  // توثيق الأرشفة — للفلترة في شاشة الأرشيف
  archivedAt?: string; archiveReason?: string
  isActive: boolean; createdAt: string
}
export interface ApiRequestType {
  id: number; code: string; nameAr: string; category: string
  requiredFields?: string; approvalChainId?: number; destinationHandler: string
  customFields?: string; visibleTo?: string; requiredAttachments?: string
  approvalChainName?: string
  affectsBalance: boolean; isSecurityRoute: boolean; isConfidential: boolean
  autoGeneratesPdf: boolean; phase: string; isActive: boolean
  // false = وجهته لسه متبنّتش: لا يُقدَّم ولا يُفعَّل (REQ-3) — من الكتالوج وبانِي الطلبات
  destinationSupported?: boolean
  // D12: RECORD_ONLY = «تسجيل فقط» (الطلب المعتمد هو السجل بلا أثر آلي)
  executionMode?: 'RECORD_ONLY' | 'EXECUTES' | 'UNSUPPORTED'
  executionLabel?: string | null
  definitionCode?: string
  leaveTypeCode?: LeaveTypeCode | null
  leaveProfiles?: ApiRequestType[]
  requiresDefinitionSelection?: boolean
}
export interface ApiRequest {
  id: number; typeCode: string; requesterId: number; branchId?: number
  definitionCode?: string | null
  status: string; currentStep?: number; payload?: string
  destinationRef?: string; resolvedSteps?: string
  createdAt: string; submittedAt?: string; completedAt?: string
  approvals?: ApiApproval[]
  // صندوق الموافقات: بيانات المقدّم من السيرفر (بلا GET /employees)
  requesterName?: string; requesterCode?: string; requesterJobTitle?: string
  // سرّي محجوب لغير أطرافه: requesterId/payload/تعليقات المعتمدين = null
  confidentialMasked?: boolean
  overtimeReviewRequired?: boolean
  overtime?: ApiOvertimeRequestDetail | null
}
export type ApiOvertimeEvidence = OvertimeEvidence
export interface ApiOvertimePreview extends OvertimeEvidence {
  canSubmit: boolean
  resubmission?: boolean
  existingRecord: { id: number; status: OvertimeStatus; requestId: number | null } | null
}
export interface ApiOvertimeRequestDetail {
  // الخطوة 13: جاهزية راتب شهر يوم العمل قبل الاعتماد النهائي (بلا مبالغ)؛ null بعد الاعتماد أو عند تعذر القراءة.
  wageEvidence?: { wagePayrollPeriod: string; ready: boolean; code: string | null; reason: string | null; message: string | null;
    sourceKind: 'MONTHLY_HISTORY' | 'CURRENT_FILE_UNVERIFIED' | null } | null
  id: number; requestId: number; date: string; status: OvertimeStatus; source: string
  hoursRequested: number | null; hoursActual: number | null; approvedMinutes: number | null
  amountSnapshot: number | null; hourlyRateSnapshot: number | null; originalPeriod: string | null; deferredFromRunId: number | null
  calculationSnapshot: { schemaVersion: number;
    submission: { evidence: OvertimeEvidence; requestedMinutes: number | null; submittedAt: string; submittedByUserId: number } | null;
    review: { approvedMinutes: number; reductionReason?: string; actorUserId?: number } | null;
    approval: { approvedMinutes: number; hourlyRate: number; multiplier: number; amount: number; dayKind: string; approvedAt: string; approverId: number } | null;
  } | null
  events: { id: number; eventType: string; actorUserId: number | null; stepOrder: number | null;
    reason: string | null; createdAt: string; beforeMinutes: number | null; approvedMinutes: number | null }[]
}
export interface ApiApproval {
  id: number; requestId: number; step: number; approverId: number
  action: string; comment?: string; actedAt: string
}
export interface ApiAttendanceDay {
  id: number; employeeId: number; branchId?: number; date: string
  checkIn?: string; checkOut?: string
  shiftName: string; shiftStart: string; shiftEnd: string
  // مرجع وردية الكتالوج + مصدر الوردية: default = جدول العمل الافتراضي مفترَض،
  // none (unscheduled) = بلا وردية ولا جدول — البصمة بلا تأخير ولا أوفرتايم
  shiftId?: number | null
  scheduleSource?: 'override' | 'week' | 'employee' | 'default' | 'none' | null
  unscheduled?: boolean
  // mission/remote = مأمورية/عمل عن بُعد معتمد — يوم معذور بلا تأخير ولا غياب
  // missing_punch = يوم منقضٍ ببصمة طرف واحد — لا يُعدّ حضوراً، ينتظر تصحيح بصمة
  status: AttendanceStatus
  attendanceExempt?: boolean
  exemption?: { id: number; effectiveFrom: string; effectiveTo: string | null; terminatedFrom: string | null; requiresCheckinForPresence: boolean } | null
  lateMinutes: number; earlyLeaveMinutes: number; workMinutes: number
  rawLateMinutes?: number | null; unexcusedLateMinutes?: number | null
  shortfallMinutes?: number | null; countedWorkMinutes?: number | null; earlyArrivalMinutes?: number | null
  flexOutcome?: string | null; attendanceReviewRequired?: boolean; attendanceReviewReason?: string | null
  provenance?: 'LEGACY_STORED'
  attendanceRuleSnapshot?: { flexEnabled: boolean; flexWindowMinutes: number | null; requiredWorkMinutes: number
    effectiveRequiredWorkMinutes: number; expectedEndMinute: number | null; employeeOverrideMode: string
    sourceVersion?: number | null; employeeVersion?: number | null; shortfallToleranceMinutes: number } | null
  // دقائق معذورة بإذن معتمد — لا تُخصم
  excusedMinutes: number
  // دقائق إذن «بخصم» — تدخل خصم المسير
  deductibleMinutes?: number
  // موظف بصم يوم إجازته الكاملة — تعارض بانتظار قرار HR
  leaveConflict?: boolean
  // بصمات خارج نافذتي الدخول والخروج (HH:mm مفصولة بفاصلة) — لمراجعة HR
  punchAnomalies?: string | null
  // السماحية المطبَّقة فعلاً على اليوم (سماحية الوردية إن حُدّدت وإلا العامة) —
  // null = يوم بلا مرجع تأخير (إجازة/عطلة/بلا وردية) أو صف أقدم من الحقل
  graceUsed?: number | null
  // صف عرض لحظي غير مخزّن: غياب اليوم الجاري قبل تجسيده (لم يبصم بعد بداية ورديته)
  live?: boolean
  // مصدر وقتي اليوم (عمود «التحقق» — السجل اليومي): DEVICE = جهاز البصمة، MANUAL =
  // إدخال يدوي من HR، CORRECTION = تصحيح بصمة معتمد — null = بلا وقت أو مصدر غير محدد
  punchSource?: 'DEVICE' | 'MANUAL' | 'CORRECTION' | null
  // سبب الإدخال اليدوي (لو MANUAL)
  manualReason?: string | null
}
export interface ApiAttendanceExemption {
  id: number; employeeId: number; effectiveFrom: string; effectiveTo: string | null
  reasonCode: 'executive' | 'field_role' | 'remote' | 'contractual' | 'medical' | 'other'; reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  overtimeEligibleOverride: boolean | null; unpaidLeaveDeductibleOverride: boolean | null
  requiresCheckinForPresence: boolean; createdByUserId: number; approvedByUserId: number | null
  approvedAt: string | null; executiveApprovedByUserId: number | null; executiveApprovedAt: string | null
  terminatedFrom: string | null; terminationReason: string | null; terminatedByUserId: number | null
  createdAt: string; updatedAt: string
}
export const fetchMyAttendanceExemptions = () => get<ApiAttendanceExemption[]>('/attendance-exemptions/mine')
export const fetchEmployeeAttendanceExemptions = (employeeId: number) => get<ApiAttendanceExemption[]>(`/attendance-exemptions/employee/${employeeId}`)
export const createAttendanceExemption = (body: Pick<ApiAttendanceExemption, 'employeeId' | 'effectiveFrom' | 'reasonCode' | 'reason'> &
  Partial<Pick<ApiAttendanceExemption, 'effectiveTo' | 'overtimeEligibleOverride' | 'unpaidLeaveDeductibleOverride' | 'requiresCheckinForPresence'>>) => post<ApiAttendanceExemption>('/attendance-exemptions', body)
export const approveAttendanceExemption = (id: number, reason: string, executive = false) =>
  post<ApiAttendanceExemption>(`/attendance-exemptions/${id}/${executive ? 'approve-executive' : 'approve'}`, { reason })
export const cancelAttendanceExemption = (id: number, reason: string) => post<ApiAttendanceExemption>(`/attendance-exemptions/${id}/cancel`, { reason })
export const terminateAttendanceExemption = (id: number, effectiveFrom: string, reason: string) =>
  post<ApiAttendanceExemption>(`/attendance-exemptions/${id}/terminate`, { effectiveFrom, reason })

export interface ApiLeave {
  id: number; requestId?: number; employeeId: number; leaveTypeCode: LeaveTypeCode
  /** @deprecated compatibility alias */
  leaveType: LeaveTypeCode
  fromDate: string; toDate: string; days: number; status: LeaveStatus
  period?: LeavePeriod
  isUnpaid: boolean
  revokedByUserId?: number | null
  revokedAt?: string | null
  employeeName?: string; employeeCode?: string
}
// سجل الإجازات مرقّم من السيرفر — الإحصاءات بنفس الفلاتر عدا الحالة
export interface ApiLeavePage {
  items: ApiLeave[]; total: number; page: number; pageSize: number
  stats: { all: number; approved: number; cancelled: number; approvedDays: number }
}
export interface LeavesQuery {
  month?: string; from?: string; to?: string; status?: string
  leaveTypeCode?: LeaveTypeCode; leaveType?: LeaveTypeCode; q?: string; page?: number; pageSize?: number
}
export interface ApiBalance {
  employeeId: number; balanceType: BalanceType; period: string
  opening: { days: number; taken: number; expiry: string | null; expired: boolean; available: number }
  // annualEntitlement: استحقاق السنة كاملة — accruedToDate: المتراكم منه لتاريخه (= entitled)
  annualEntitlement?: number; accruedToDate?: number
  // المسحوب على المكشوف من الاستحقاق (بعد نفاد المُرحّل) — 0 لو مفيش عجز
  deficit?: number
  entitled: number; entitledTaken: number; totalTaken: number; remaining: number
  adjustmentDays: number
}
export interface ApiPayrollRun {
  id: number; branchId: number | null; period: string; startDate: string; endDate: string
  // الخطوة 16: DRAFT = مسودة تعريف قبل أول حساب (بلا عضوية ولا مبالغ)
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID' | 'CANCELLED'; totalNet: number
  name?: string | null
  policyId?: number | null; policyVersionId?: number | null
  scopeType?: 'COMPANY' | 'BRANCH' | 'DEPARTMENT' | 'TEAM' | 'COST_CENTER' | 'CUSTOM'
  snapshotVersion?: number
  approvedAt?: string; paidAt?: string; createdAt: string
  items?: ApiPayrollItem[]
  members?: ApiPayrollRunMember[]
  conflicts?: ApiPayrollConflict[]
  pendingOvertime?: Array<{ id: number; employeeId: number; date: string; status: 'DETECTED' | 'SUBMITTED'; requestId: number | null; detectedMinutes: number | null; requestedMinutes: number | null }>
  // الخطوة 14: فجوة أو تداخل مع فترة الشهر السابق/التالي لنفس الموظفين
  periodContinuity?: Array<{ kind: 'GAP' | 'OVERLAP'; previousPeriod: string; nextPeriod: string; from: string; to: string; days: number
    otherRunId: number | null; otherRunName: string | null; otherStatus: string; employeeIds: number[] }>
  blocking?: boolean
  // C8 / الخطوة 31: مسير عكس صرف أو تكميلي مربوط بمسير مصروف (null = أصلي)، وسبب التصحيح المكتوب
  runType?: 'REGULAR' | 'REVERSAL' | 'SUPPLEMENTARY' | null
  parentRunId?: number | null
  correctionReason?: string | null
}
export interface ApiPayrollMemberSnapshot {
  version: number; capturedAt: string; fullName: string; employeeCode: string
  jobTitle?: string | null
  branchId: number | null; departmentId: number | null; teamId: number | null; costCenterId: number | null
  branchName?: string | null; departmentName?: string | null; teamName?: string | null; costCenterName?: string | null
  coverFrom: string | null; coverTo: string | null; coverDays: number | null
  prorataFactor: number | null; monthlyDays: number | null
  basicSalary: number | null; allowances: number | null; gross: number | null; grossEarned: number | null
  hireDate?: string | null; leaveDate?: string | null
  monthlyComponents?: number[]; earnedComponents?: number[]; salaryMode?: string | null; manualReason?: string
  // الخطوتان 16 و17: مكان الموظف آخر يوم في الفترة، والانتقال خارج النطاق، والحجز في مسير آخر
  orgDate?: string | null
  transferredOut?: { lastInScopeDate: string; branchName: string | null; departmentName: string | null; teamName: string | null } | null
  alreadyInRun?: { otherRunId: number | null; name: string | null; status: string; startDate: string; endDate: string; overlapDays: number; kind: string } | null
  salaryComponents?: Array<{ code: string; nameAr: string; nameEn: string; monthlyAmount: number; earnedAmount: number }>
  exemptDays?: number; isAttendanceExempt?: boolean
  // الخطوة 13: مصدر راتب شهر المسير أو سبب استبعاده
  salarySource?: { kind: 'MONTHLY_HISTORY' | 'CURRENT_FILE_UNVERIFIED'; referencePeriod: string; currency: string | null
    effectivePayrollPeriod: string | null; effectiveToPayrollPeriod: string | null; historyRevision: number | null; sourceRef: string | null; warning: string | null } | null
  salaryIssue?: { code: string; message: string } | null
  attendanceExemptions?: Array<{
    id: number; effectiveFrom: string; effectiveTo: string | null; terminatedFrom: string | null; reasonCode: string
    overtimeEligible: boolean; unpaidLeaveDeductible: boolean; overtimeSource: string; unpaidLeaveSource: string
  }>
}
export interface ApiPayrollRunMember {
  id?: number; runId?: number; employeeId: number
  membershipStatus: 'INCLUDED' | 'EXCLUDED' | null
  exclusionReason: string | null
  inclusionSource?: 'SCOPE' | 'MANUAL_INCLUDE' | null
  snapshot: ApiPayrollMemberSnapshot | null
}
export interface ApiPayrollConflict {
  employeeId: number; otherRunId: number | null; name: string | null; status: string
  startDate: string; endDate: string; overlapDays: number; blocking: boolean
  kind: 'EXACT' | 'OVERLAP'
}
export interface ApiPayrollRunEvent {
  id: number; runId: number; eventType: string; actorUserId: number
  reason: string | null; createdAt: string
  payload: {
    before?: Partial<ApiPayrollEventSnapshot> | null
    after?: Partial<ApiPayrollEventSnapshot> | null
    diff?: { addedEmployeeIds: number[]; removedEmployeeIds: number[]; changedEmployeeIds: number[] }
    allowDraftConflicts?: boolean
    conflictRunIds?: Array<number | null>
    [key: string]: unknown
  } | null
}
export interface ApiPayrollEventSnapshot {
  snapshotVersion: number; members: ApiPayrollRunMember[]; items: ApiPayrollItem[]; totalNet: number
  status?: ApiPayrollRun['status']; approvedBy?: number | null; approvedAt?: string | null
}
export interface ApiPayrollItem {
  allowances?: number
  id: number; runId: number; employeeId: number; basicSalary: number
  overtimeHours: number; overtimeAmount: number; lateMinutes: number
  latenessDeduction: number; unpaidLeaveDays: number; unpaidLeaveDeduction: number
  shortfallMinutes?: number; shortfallDeduction?: number
  absenceDays?: number; absenceDeduction?: number
  otherDeductions?: number; otherAdditions?: number
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
  // underReview = ما ينتظر قرار المستخدم الحالي (نفس صندوق الاعتماد)
  requests: { underReview: number; completed: number; rejected: number; total: number }
  // attended = كل من حضر فعلاً (في الموعد + متأخر + منصرف بدري + عطلة/نصف يوم ببصمة، لا الإجازة الكاملة)؛ present = في الموعد فقط
  attendanceToday: { attended: number; present: number; late: number; earlyLeave: number; absent: number }
  // موظفون في إجازة يوم كامل اليوم (كل موظف مرة)، ونصف اليوم يُعدّ منفصلاً
  onLeaveToday: number
  halfDayLeaveToday: number
  payrollRuns: Array<{ id: number; branchId: number; period: string; status: string; totalNet: number }>
}

// ===== اللوحة =====
export const fetchDashboardStats = () => get<ApiDashboardStats>('/dashboard/stats')
// منحنى الحضور: آخر 7 أيام (week) أو 30 يوماً (month) حتى اليوم بنطاق الفرع —
// attended/absent/onLeave بتعريفات كروت اليوم (عمود اليوم = الكروت)
export interface ApiAttendanceTrend {
  period: 'week' | 'month'; from: string; to: string
  days: Array<{ date: string; attended: number; absent: number; onLeave: number }>
}
export const fetchAttendanceTrend = (period: 'week' | 'month') =>
  get<ApiAttendanceTrend>(`/dashboard/attendance-trend?period=${period}`)
// حضور اليوم لكل قسم بنطاق الفرع — id=null صف «بدون قسم» (المجموع = كروت اليوم)
export interface ApiDepartmentDayStats {
  id: number | null; name: string
  employees: number; attended: number; absent: number; onLeave: number
  exempt?: number
}
export const fetchDepartmentStats = () =>
  get<{ date: string; departments: ApiDepartmentDayStats[] }>('/dashboard/departments')
// يومي (لوحة الموظف): صف اليوم إن وُجد + وردية اليوم حتى قبل أول بصمة + هل هو يوم
// عمل لي + إجازتي المعتمدة التي تغطيه. null = حساب غير مرتبط بملف موظف
export interface ApiMyToday {
  date: string
  day: ApiAttendanceDay | null
  shift: { name: string; start: string; end: string; source: string } | null
  workingDay: boolean
  leave: { leaveTypeCode: LeaveTypeCode; leaveType: LeaveTypeCode; period: LeavePeriod } | null
}
export const fetchMyToday = () => get<ApiMyToday | null>('/attendance/my-today')

// حمولة الكتابة: null = مسح القيمة في الباك (حقل اختياري فُرِّغ في التعديل)، والغائب = بلا تغيير
export type Clearable<T> = { [K in keyof T]?: T[K] | null }

export const rejectCustody = (assignmentId: number, reason: string) =>
  post<ApiCustody>(`/custody/${assignmentId}/reject`, { reason })

// ===== التكوين =====
export const fetchBranches = () => get<ApiBranch[]>('/branches')
export const createBranch = (b: Clearable<ApiBranch>) => post<ApiBranch>('/branches', b)
export const updateBranch = (id: number, b: Clearable<ApiBranch> & { calendarChange?: PayrollCalendarChange }) => patch<ApiBranch>(`/branches/${id}`, b)
export const fetchDepartments = () => get<ApiDepartment[]>('/departments')
export const createDepartment = (d: Clearable<ApiDepartment>) => post<ApiDepartment>('/departments', d)
export const updateDepartment = (id: number, d: Clearable<ApiDepartment>) => patch<ApiDepartment>(`/departments/${id}`, d)
export const fetchTeams = () => get<ApiTeam[]>('/teams')
export const createTeam = (t: Clearable<ApiTeam>) => post<ApiTeam>('/teams', t)
export const updateTeam = (id: number, t: Clearable<ApiTeam>) => patch<ApiTeam>(`/teams/${id}`, t)

// ===== الموظفون =====
export const fetchEmployees = () => get<ApiEmployee[]>('/employees')
export const fetchEmployee = (id: number) => get<ApiEmployee>(`/employees/${id}`)
export const createEmployee = (e: Clearable<ApiEmployee>) => post<ApiEmployee>('/employees', e)
export type EmployeeUpdatePayload = Clearable<ApiEmployee> & { salaryChange?: import('./employee-salary-change-api').EmployeeSalaryChangeCommand; calendarChange?: PayrollCalendarChange }
export const updateEmployee = (id: number, e: EmployeeUpdatePayload) => patch<ApiEmployee>(`/employees/${id}`, e)
export const renewEmployeeContract = (id: number, data: {
  contractStart: string; contractEnd: string; reason: string; contractFileRef?: string
}) => post<ApiEmployee>(`/employees/${id}/contract/renew`, data)
export const archiveEmployee = (id: number, reason?: string) =>
  post<ApiEmployee>(`/employees/${id}/archive`, reason ? { reason } : {})
// العودة على رأس العمل — للمؤرشف والمنتهي خدمته (توثيق بالسجل الوظيفي)
export const reactivateEmployee = (id: number) =>
  post<ApiEmployee>(`/employees/${id}/reactivate`)
// دليل مختصر للنشطين في النطاق (بلا employees.view) — لمنتقيات الشاشات غير الإدارية
export interface ApiEmployeeDirectoryEntry { id: number; fullName: string; employeeCode: string }
export const fetchEmployeeDirectory = () =>
  get<ApiEmployeeDirectoryEntry[]>('/employees/directory')

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
export const createRequest = (typeCode: string, payload: Record<string, unknown>, submit = true, onBehalfEmployeeId?: number, definitionCode?: string) =>
  post<ApiRequest>('/requests', { typeCode, payload, submit, ...(onBehalfEmployeeId ? { onBehalfEmployeeId } : {}), ...(definitionCode ? { definitionCode } : {}) })
export const actOnRequest = (id: number, action: 'APPROVE' | 'REJECT' | 'RETURN', comment?: string, approvedMinutes?: number) =>
  post<ApiRequest>(`/requests/${id}/act`, { action, comment, ...(approvedMinutes != null ? { approvedMinutes, reductionReason: comment } : {}) })
export const cancelRequest = (id: number) => post<ApiRequest>(`/requests/${id}/cancel`)
// توجيه الأوفرتايم المكتشف لسلسلة اعتماده يدوياً (الـ cron يشغّله تلقائياً)
export const reconcileOvertime = () =>
  post<{ routed: number }>('/requests/engine/reconcile-overtime')
export const resubmitRequest = (id: number, payload?: Record<string, unknown>) =>
  post<ApiRequest>(`/requests/${id}/resubmit`, { payload })
// طلب معتمد تعذّر تنفيذه في وجهته (REQ-2): إعادة التنفيذ أو القفل بالرفض — settings.manage
export const retryRequestExecution = (id: number) =>
  post<ApiRequest>(`/requests/${id}/retry-execution`)
export const rejectFailedRequestExecution = (id: number, comment: string) =>
  post<ApiRequest>(`/requests/${id}/reject-execution`, { comment })

// ===== الحضور =====
export const fetchDailyAttendance = (date: string) => get<ApiAttendanceDay[]>(`/attendance/daily?date=${date}`)
export const fetchMonthlyAttendance = (employeeId: number, month: string) =>
  get<{ employeeId: number; month: string; days: ApiAttendanceDay[]; summary: Record<string, number> }>(
    `/attendance/monthly?employeeId=${employeeId}&month=${month}`)
// إعادة حساب يوم كامل بنطاق المستخدم (بصمات + صفوف محسوبة/غياب؛ واليوم المنقضي يُجسَّد غيابه)
export const recomputeAttendanceDay = (date: string) =>
  post<{ recomputed: number; materialized: number; failed: number }>(
    `/attendance/recompute?date=${date}`)
export const fetchWeekSchedule = (week: string) =>
  get<Array<{ id: number; weekStart: string; employeeId: number; shiftId?: number | null; shiftName: string; startTime: string; endTime: string }>>(
    `/attendance/schedule?week=${week}`)
// skipped = موظفون تخطّاهم السيرفر (خارج نطاق فرعك أو أنت نفسك)
// shiftId = مرجع الوردية في الكتالوج — به يتم الربط (الاسم والأوقات لقطة احتياطية)
export const upsertWeekSchedule = (entries: Array<{ weekStart: string; employeeId: number; shiftId?: number; shiftName: string; startTime: string; endTime: string }>) =>
  post<{ saved: unknown[]; skipped: Array<{ employeeId: number; reason: string }> }>('/attendance/schedule', { entries })
export const clearWeekSchedule = (week: string, employeeId: number) =>
  del<{ deleted: boolean; failed: string[] }>(`/attendance/schedule/${week}/${employeeId}`)
// reason = سبب الإدخال اليدوي — يُحفظ على كل بصمة مع مُدخِلها
export const ingestPunchesManual = (punches: Array<{ employeeCode: string; timestamp: string; deviceSn?: string }>, reason?: string) =>
  post<{
    received: number; matched: number; recomputedDays?: number
    rejectedFuture?: number; rejectedInvalid?: number
  }>('/attendance/punches/manual', { punches, ...(reason ? { reason } : {}) })
// بصمة مسجّلة بمصدرها (سجل الإدخال اليدوي): من أدخلها ولماذا، وحالة يوم الحضور
// الذي طُبّقت عليه (اليدوية تُطبَّق فوراً — لا مسار اعتماد لها)
export interface ApiPunch {
  id: number; employeeId: number | null; employeeCode: string; employeeName: string | null
  date: string; time: string // التاريخ والوقت المحليان للبصمة
  source: 'DEVICE' | 'MANUAL' | null; deviceSn: string | null; reason: string | null
  createdByUserId: number | null; createdByName: string | null; receivedAt: string | null
  workDate: string; dayStatus: ApiAttendanceDay['status'] | null
  canDelete: boolean
}
export const fetchPunches = (q: { source?: 'MANUAL' | 'DEVICE'; month?: string } = {}) => {
  const qs = new URLSearchParams()
  if (q.source) qs.set('source', q.source)
  if (q.month) qs.set('month', q.month)
  const s = qs.toString()
  return get<ApiPunch[]>(`/attendance/punches${s ? `?${s}` : ''}`)
}
// حذف بصمة يدوية + إعادة حساب يومها (بصمة الجهاز لا تُحذف)
export const deleteManualPunch = (id: number) =>
  del<{ deleted: boolean; employeeId: number | null; date: string; recomputed: boolean }>(
    `/attendance/punches/${id}`)
// أيام العمل الفعلية في مدى — لتلميح نموذج الإجازة (العطلات لا تُخصم).
// self: حساب الموظف نفسه (فرعه + ويك إند جدول عمله) = ما يُخصم عند التقديم؛
// بدونه: ويك إند فرع المستخدم (الجدول الأسبوعي)
export const fetchWorkingDays = (from: string, to: string, opts?: { self?: boolean; employeeId?: number }) =>
  get<{ total: number; working: number; skipped: string[]; weekendDays?: string[] }>(
    `/attendance/working-days?from=${from}&to=${to}${opts?.self ? '&self=1' : ''}${opts?.employeeId ? `&employeeId=${opts.employeeId}` : ''}`)

// ===== قواعد استثناء أيام العمل (آخر سبت = دوام رسمي...) =====
export interface ApiScheduleRule {
  id: number
  name: string
  weekday: 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'
  occurrence: 'ALL' | '1ST' | '2ND' | '3RD' | '4TH' | 'LAST'
  effect: 'WORK' | 'OFF'
  branchId?: number | null
  isActive: boolean
}
export const fetchScheduleRules = () =>
  get<ApiScheduleRule[]>('/attendance/schedule-rules')
export const createScheduleRule = (r: Omit<ApiScheduleRule, 'id' | 'isActive'> & { calendarChange?: PayrollCalendarChange }) =>
  post<ApiScheduleRule>('/attendance/schedule-rules', r)
export const updateScheduleRule = (id: number, r: Partial<ApiScheduleRule> & { calendarChange?: PayrollCalendarChange }) =>
  patch<ApiScheduleRule>(`/attendance/schedule-rules/${id}`, r)
export const deleteScheduleRule = (id: number, calendarChange?: PayrollCalendarChange) =>
  apiFetch<{ deleted: boolean }>(`/attendance/schedule-rules/${id}`, { method: 'DELETE', ...(calendarChange ? { body: JSON.stringify({ calendarChange }) } : {}) })

// ===== فترات فتح/قفل الأوفرتايم بالتواريخ =====
export interface ApiOvertimePeriod {
  id: number
  name: string
  fromDate: string
  toDate: string
  effect: 'OPEN' | 'CLOSED'
  branchId?: number | null
  isActive: boolean
}
export const fetchOvertimePeriods = () =>
  get<ApiOvertimePeriod[]>('/attendance/overtime-periods')
export const createOvertimePeriod = (
  p: Omit<ApiOvertimePeriod, 'id' | 'isActive'>
) => post<ApiOvertimePeriod>('/attendance/overtime-periods', p)
export const updateOvertimePeriod = (id: number, p: Partial<ApiOvertimePeriod>) =>
  patch<ApiOvertimePeriod>(`/attendance/overtime-periods/${id}`, p)
export const deleteOvertimePeriod = (id: number) =>
  del<{ deleted: boolean }>(`/attendance/overtime-periods/${id}`)
export const fetchPendingOvertime = () => get<any[]>('/attendance/overtime/pending')
export const confirmOvertime = (id: number, approve: boolean, reason?: string) =>
  post(`/attendance/overtime/${id}/confirm`, { approve, reason })
export const previewOvertime = (date: string, employeeId?: number, requestId?: number) =>
  get<ApiOvertimePreview>(`/attendance/overtime/preview?date=${encodeURIComponent(date)}${employeeId != null ? `&employeeId=${employeeId}` : ''}${requestId != null ? `&requestId=${requestId}` : ''}`)
// سجل الأوفرتايم لشهر بكل الحالات + حالة الطلب المرتبط (SUBMITTED = في سلسلة الاعتماد).
// canConfirm = مكتشف لم يُوجَّه لسلسلة، ليس لك، ومعك صلاحية التأكيد
export interface ApiOvertimeEntry {
  id: number; requestId: number | null; employeeId: number; date: string
  source: 'BIOMETRIC_DETECTED' | 'PRE_REQUESTED'
  hoursRequested: number | null; hoursActual: number | null; payableHours: number | null
  rate: number
  status: OvertimeStatus
  payrollRunId: number | null
  employeeName: string | null; employeeCode: string | null; departmentId: number | null
  requestStatus: string | null; requestTypeCode: string | null
  isSelf: boolean; canConfirm: boolean; canReject?: boolean; requiresWorkflow?: boolean
  approvedMinutes?: number | null; amountSnapshot?: number | null; hourlyRateSnapshot?: number | null
  evidence?: OvertimeEvidence | null
  calculationSnapshot?: { submission?: { evidence?: OvertimeEvidence }; approval?: { dayKind?: string; amount?: number; approvedMinutes?: number } } | null
}
// OT-05: كل قيد جديد يمر بدورة اعتماد، بصرف النظر عن قيمة المفتاح القديم.
export const fetchOvertimeLog = (month: string) =>
  get<{ month: string; requiresConfirmation: boolean; entries: ApiOvertimeEntry[] }>(
    `/attendance/overtime?month=${month}`)

// ===== الإجازات =====
// سجل الإجازات مرقّم ومفلتر على السيرفر (LEV-22)
export const fetchLeaves = (query: LeavesQuery = {}) => {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== '') qs.set(k, String(v))
  }
  const s = qs.toString()
  return get<ApiLeavePage>(`/leaves${s ? `?${s}` : ''}`)
}
export const fetchMyBalances = () => get<ApiBalance[]>('/leaves/balances/mine')
export const fetchEmployeeBalances = (employeeId: number) => get<ApiBalance[]>(`/leaves/balances/${employeeId}`)
// أرصدة موظفي النطاق دفعة واحدة لشاشة الأرصدة (LEV-23) — error = تعذّر حساب رصيد هذا الموظف بعينه
export interface ApiEmployeeBalances {
  employee: Pick<ApiEmployee, 'id' | 'fullName' | 'employeeCode' | 'branchId' | 'departmentId' | 'joinDate' | 'status'>
  balances: ApiBalance[]
  error?: string
}
export const fetchBalancesBulk = (branchId?: number) =>
  get<ApiEmployeeBalances[]>(`/leaves/balances${branchId ? `?branchId=${branchId}` : ''}`)

export interface ApiBalanceAdjustment {
  id: number; employeeId: number; balanceType: BalanceType; period: string
  delta: number; beforeAdjustment: number; afterAdjustment: number
  beforeRemaining: number; afterRemaining: number; reason: string
  actorUserId: number; createdAt: string; idempotencyKey: string
}
export interface AdjustLeaveBalanceInput {
  balanceType: BalanceType; period: string; delta: number; reason: string
  idempotencyKey: string; expectedRemaining?: number
}
export const adjustLeaveBalance = (employeeId: number, input: AdjustLeaveBalanceInput) =>
  post<{ balance: ApiBalance; adjustment: ApiBalanceAdjustment; replayed: boolean }>(
    `/leaves/balances/${employeeId}/adjust`, input)

// ===== مؤهلات الموظف وخبراته (خمس قوائم مستقلة) =====
export interface ApiEducation {
  id: number; employeeId: number; degree: string; major?: string
  institution?: string; graduationYear?: number; fileRef?: string
}
export interface ApiCertification {
  id: number; employeeId: number; name: string; issuer?: string
  issueDate?: string; expiryDate?: string; fileRef?: string
}
export interface ApiExperience {
  id: number; employeeId: number; company: string; jobTitle?: string
  country?: string; fromDate?: string; toDate?: string; leaveReason?: string
}
export interface ApiSkill {
  id: number; employeeId: number; name: string; level?: string; yearsExperience?: number
}
export interface ApiLanguage {
  id: number; employeeId: number; language: string
  speaking?: string; writing?: string; reading?: string
}
export interface ApiQualifications {
  education: ApiEducation[]; certifications: ApiCertification[]
  experiences: ApiExperience[]; skills: ApiSkill[]; languages: ApiLanguage[]
}

export const fetchQualifications = (employeeId: number) =>
  get<ApiQualifications>(`/employees/${employeeId}/qualifications`)

export const addEducation = (employeeId: number, d: Partial<ApiEducation>) =>
  post<ApiEducation>(`/employees/${employeeId}/education`, d)
export const deleteEducation = (employeeId: number, rowId: number) =>
  del<{ ok: boolean }>(`/employees/${employeeId}/education/${rowId}`)

export const addCertification = (employeeId: number, d: Partial<ApiCertification>) =>
  post<ApiCertification>(`/employees/${employeeId}/certifications`, d)
export const deleteCertification = (employeeId: number, rowId: number) =>
  del<{ ok: boolean }>(`/employees/${employeeId}/certifications/${rowId}`)

export const addExperience = (employeeId: number, d: Partial<ApiExperience>) =>
  post<ApiExperience>(`/employees/${employeeId}/experiences`, d)
export const deleteExperience = (employeeId: number, rowId: number) =>
  del<{ ok: boolean }>(`/employees/${employeeId}/experiences/${rowId}`)

export const addSkill = (employeeId: number, d: Partial<ApiSkill>) =>
  post<ApiSkill>(`/employees/${employeeId}/skills`, d)
export const deleteSkill = (employeeId: number, rowId: number) =>
  del<{ ok: boolean }>(`/employees/${employeeId}/skills/${rowId}`)

export const addLanguage = (employeeId: number, d: Partial<ApiLanguage>) =>
  post<ApiLanguage>(`/employees/${employeeId}/languages`, d)
export const deleteLanguage = (employeeId: number, rowId: number) =>
  del<{ ok: boolean }>(`/employees/${employeeId}/languages/${rowId}`)

// ===== الرواتب =====
export const fetchPayrollRuns = () => get<ApiPayrollRun[]>('/payroll/runs')
export const fetchPayrollRun = (id: number) => get<ApiPayrollRun>(`/payroll/runs/${id}`)
export const approvePayroll = (id: number) => post<ApiPayrollRun>(`/payroll/runs/${id}/approve`)
export const reopenPayroll = (id: number, reason: string) => post<ApiPayrollRun>(`/payroll/runs/${id}/reopen`, { reason })
export const cancelPayroll = (id: number, reason: string) => post<ApiPayrollRun>(`/payroll/runs/${id}/cancel`, { reason })
export const fetchPayrollRunEvents = (id: number) => get<ApiPayrollRunEvent[]>(`/payroll/runs/${id}/events`)
export const fetchPayMethodReport = (id: number) =>
  get<Record<string, { count: number; total: number }>>(`/payroll/runs/${id}/pay-methods`)

// ===== المستخدمون والإعدادات =====
export const fetchUsers = () => get<ApiUser[]>('/users')
export const createUser = (u: { email: string; password: string; displayName: string; role: string; branchId?: number; employeeId?: number; permissions?: string[] }) =>
  post<ApiUser>('/users', u)
export const updateUser = (id: number, u: Partial<{ role: string; isActive: boolean; password: string; branchId: number | null; employeeId: number | null; permissions: string[] }>) =>
  patch<ApiUser>(`/users/${id}`, u)
export const fetchConfig = () => get<Array<{ key: string; value: string }>>('/settings/config')
export const updateConfig = (key: string, value: string, calendarChange?: PayrollCalendarChange) => patch('/settings/config', { key, value, ...(calendarChange ? { calendarChange } : {}) })
// بيانات الشركة لرأس المستندات المولَّدة (مفاتيح company.*) — الفارغ = غير مضبوط
export interface ApiCompanyInfo {
  name: string; nameEn: string; commercialRegister: string
  address: string; phone: string; logoFileId: number | null
}
export const fetchCompanyInfo = () => get<ApiCompanyInfo>('/settings/company')

// معادلات الرواتب: شرائح خصم التأخير
export interface ApiLatenessTier {
  id: number
  fromMinutes: number
  toMinutes: number | null
  mode: 'FRACTION' | 'MINUTES'
  value: number
  isActive: boolean
  label?: string | null
}
// الخطوة 21: الجدول القديم أرشيف للقراءة فقط؛ الكتابة عبر مجموعات الشرائح المؤرخة (src/lib/payroll-engine-api.ts)
export const fetchLatenessTiers = () =>
  get<ApiLatenessTier[]>('/payroll/rules/lateness-tiers')
export const fetchLeaveTypes = () => get<any[]>('/settings/leave-types')
// أنواع الإجازة الفعّالة لشاشات التقديم (خدمة ذاتية — بلا settings.manage)
export interface ApiLeaveTypeOption {
  id: number
  code: string
  nameAr: string
  isPaid: boolean
  balanceType: BalanceType | null
  /** @deprecated compatibility alias */
  balanceSource: BalanceType | null
  requiredAttachment: string | null
  maxDays: number | null
  oncePerService: boolean
}
export const fetchActiveLeaveTypes = () => get<ApiLeaveTypeOption[]>('/leaves/types')
export const createLeaveType = (lt: Record<string, unknown>) => post('/settings/leave-types', lt)
export const updateLeaveType = (id: number, lt: Record<string, unknown>) => patch(`/settings/leave-types/${id}`, lt)
export const fetchApprovalChains = () => get<any[]>('/settings/approval-chains')

// بانِي السلاسل — إنشاء/تعديل/استبدال خطوات
export interface ChainStepInput {
  approverRole: string
  specificEmployeeId?: number
  thresholdField?: string
  thresholdOp?: '>=' | '>' | '<' | '<='
  thresholdValue?: number
  slaDays?: number
  escalateTo?: string
  isParallel?: boolean
}
export const createApprovalChain = (c: { code: string; nameAr: string; branchId?: number; steps: ChainStepInput[] }) =>
  post<any>('/settings/approval-chains', c)
export const updateApprovalChain = (
  id: number,
  // branchId: null = دورة عامة (نقل النطاق بعد الإنشاء)
  c: { nameAr?: string; isActive?: boolean; autoApprove?: boolean; branchId?: number | null }
) => patch<any>(`/settings/approval-chains/${id}`, c)
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
  condition?: string; status: CustodyStatus
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
  post<ApiCustody>(`/custody/${assignmentId}/acknowledge`)
// الموظف يعلّم «سلّمت العهدة» → مسؤول العهد يؤكد بالاستلام الفعلي
export const requestCustodyHandover = (assignmentId: number) =>
  post<ApiCustody>(`/custody/${assignmentId}/handover`)
// أمين العهدة ينقل عهدة نشطة لموظف آخر → المستلم يقبل ثم مديره يؤكد
export const transferCustody = (
  assignmentId: number,
  toEmployeeId: number,
  note?: string
) =>
  post<ApiCustody>(`/custody/${assignmentId}/transfer`, {
    toEmployeeId,
    ...(note ? { note } : {}),
  })

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
export type CatalogKind = 'holidays' | 'shifts' | 'devices' | 'job-titles' | 'grades' | 'asset-types' | 'permission-types' | 'cost-centers' | 'work-schedules' | 'doc-types'
export const fetchCatalog = <T = any>(kind: CatalogKind, effectiveOn?: string) =>
  get<T[]>(`/catalogs/${kind}${effectiveOn ? `?effectiveOn=${encodeURIComponent(effectiveOn)}` : ''}`)
export const createCatalogItem = <T = any>(kind: CatalogKind, item: Record<string, unknown>) =>
  post<T>(`/catalogs/${kind}`, item)
export const updateCatalogItem = <T = any>(kind: CatalogKind, id: number, item: Record<string, unknown>) =>
  patch<T>(`/catalogs/${kind}/${id}`, item)
// حذف عطلة رسمية — الباك يعيد احتساب حضور أيامها (جداول العمل: deleteWorkSchedule)
export const deleteCatalogItem = (kind: CatalogKind, id: number, calendarChange?: PayrollCalendarChange) =>
  apiFetch<{ deleted: boolean; recomputed: number; materialized?: number; warning?: string }>(`/catalogs/${kind}/${id}`, { method: 'DELETE', ...(calendarChange ? { body: JSON.stringify({ calendarChange }) } : {}) })
// جدول عمل (كتالوج work-schedules) — GET يُثريه بعدد الموظفين المُسندين
export interface ApiWorkSchedule {
  id: number; name: string; description?: string | null
  weekendDays: string // أيام الراحة 'FRI,SAT' — '' = دوام 7 أيام
  startTime: string; endTime: string; isDefault: boolean; isActive: boolean
  employeeCount?: number
  flexEnabled?: boolean | null; flexWindowMinutes?: number | null; requiredWorkMinutes?: number | null
  attendanceRuleVersion?: number | null; attendanceRuleEffectiveFrom?: string | null
}
export interface ApiAttendanceRuleChange { effectiveFrom: string; changeReason: string }
export interface ApiAttendanceRuleVersion {
  id: number; sourceType: 'SHIFT' | 'WORK_SCHEDULE' | 'EMPLOYEE'; sourceId: number
  version: number; effectiveFrom: string | null; actorUserId: number | null
  reason: string; legacyBaseline: boolean; createdAt: string; snapshot: Record<string, unknown>
}
export const fetchAttendanceRuleHistory = (sourceType: ApiAttendanceRuleVersion['sourceType'], sourceId: number) =>
  get<ApiAttendanceRuleVersion[]>(`/attendance-rules/${sourceType}/${sourceId}/history`)
// إسناد جدول دفعة واحدة داخل نطاق الفرع: موظفون بعينهم أو قسم (نشطوه) أو كل النشطين
export const assignWorkSchedule = (
  id: number,
  target: { employeeIds: number[] } | { departmentId: number } | { all: true },
  change?: ApiAttendanceRuleChange
) =>
  post<{ scheduleId: number; matched: number; assigned: number; unchanged: number }>(
    `/catalogs/work-schedules/${id}/assign`,
    { ...target, ...change }
  )
// حذف جدول عمل غير افتراضي — moveTo: جدول نشط يُنقل إليه موظفوه أولاً (مطلوب لو مُسنَد)
export const deleteWorkSchedule = (id: number, moveTo?: number, change?: ApiAttendanceRuleChange) =>
  apiFetch<{ deleted: boolean; deactivated?: boolean; moved: number; movedTo: number | null }>(
    `/catalogs/work-schedules/${id}${moveTo ? `?moveTo=${moveTo}` : ''}`,
    { method: 'DELETE', body: JSON.stringify(change ?? {}) })

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
export interface ApiTransfer {
  id: number; requestId?: number | null; employeeId: number
  fromTeam: number | null; toTeam: number; effectiveDate: string
  status: TransferStatus; executedAt?: string | null
  employeeName: string; fromTeamName: string; toTeamName: string
  // سبب الإلغاء (نقل مجدول مكرر) أو آخر تعذّر تنفيذ سجله النظام على الطلب
  statusReason?: string | null
}
export interface ApiLoan {
  id: number; requestId?: number | null; employeeId: number
  amount: number | string; status: LoanStatus; disbursedAt?: string | null
}
export interface ApiLoanDetails extends ApiLoan {
  employeeName: string
  installments: Array<{ id: number; loanId: number; dueDate: string; amount: number | string; paid: boolean;
    paidAmount: string; remainingAmount: string; financialStatus: 'DUE' | 'PARTIAL' | 'DEFERRED' | 'PAID' | 'SETTLED';
    financialRevision: number; parentInstallmentId: number | null; originalDueDate: string; paidAt: string | null }>
  paidCount: number; paidAmount: string; remainingAmount: string
}
export interface ApiLetter {
  id: number; requestId?: number | null; employeeId: number; letterType: string
  purpose?: string | null; status: LetterStatus; generatedPdfRef?: string | null
}
export const fetchTransfers = () => get<ApiTransfer[]>('/transfers')
export const fetchEmployeeProfile = (id: number) =>
  get<{ employee: ApiEmployee; leaves: ApiLeave[]; balances: any[]; history: any[]; documents: ApiDocument[]; loans: ApiLoan[]; custody: ApiCustody[] }>(`/employees/${id}/profile`)
export const fetchEmployeeHistory = (id: number) => get<any[]>(`/employees/${id}/history`)
export const fetchLoans = () => get<ApiLoanDetails[]>('/loans')

// ===== قوالب الخطابات ونسخها المنشورة =====
export interface ApiLetterTemplateDraft {
  title: string; greeting: string; body: string; closing: string; footer: string
}
export interface ApiLetterTemplateRevision extends ApiLetterTemplateDraft {
  id: number; revision: number; publishedAt: string
}
export interface ApiLetterTemplate {
  id: number; name: string; isActive: boolean; version: number
  draft: ApiLetterTemplateDraft
  publishedRevision: ApiLetterTemplateRevision | null
  updatedAt: string
}
export interface ApiLetterTemplateVariable {
  key: string; label: string; sample: string
}
export interface ApiLetterTemplateBinding {
  requestTypeCode: string; templateId: number
}
export interface ApiLetterTemplateCatalog {
  companyNameConfigured: boolean
  templates: ApiLetterTemplate[]
  bindings: ApiLetterTemplateBinding[]
  requestTypes: Array<{ code: string; nameAr: string }>
  variables: ApiLetterTemplateVariable[]
}
export const fetchLetterTemplates = () => get<ApiLetterTemplateCatalog>('/letters/templates')
export const createLetterTemplate = (input: { name: string; draft: ApiLetterTemplateDraft }) =>
  post<ApiLetterTemplate>('/letters/templates', input)
export const updateLetterTemplate = (id: number, input: { version: number; name?: string; draft?: ApiLetterTemplateDraft; isActive?: boolean }) =>
  patch<ApiLetterTemplate>(`/letters/templates/${id}`, input)
export const publishLetterTemplate = (id: number, version: number) =>
  post<ApiLetterTemplate>(`/letters/templates/${id}/publish`, { version })
export const bindLetterTemplate = (requestTypeCode: string, templateId: number) =>
  patch<ApiLetterTemplateBinding>(`/letters/template-bindings/${encodeURIComponent(requestTypeCode)}`, { templateId })
export const previewLetterTemplate = async (draft: ApiLetterTemplateDraft): Promise<Blob> => {
  const token = getToken()
  const response = await fetch(`${API_BASE}/letters/templates/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ draft }),
  })
  if (!response.ok) {
    let message = `تعذر إنشاء معاينة الخطاب (${response.status})`
    try {
      const body: { message?: string | string[] } = await response.json()
      if (body.message) message = Array.isArray(body.message) ? body.message.join('، ') : body.message
    } catch { /* Keep the status message when the response is not JSON. */ }
    throw new ApiError(response.status, message)
  }
  if (!response.headers.get('content-type')?.toLowerCase().includes('application/pdf')) {
    throw new Error('لم يرجع الخادم ملف PDF صالحًا للمعاينة')
  }
  return response.blob()
}

// ===== التقارير =====
export const fetchHeadcountReport = () => get<any>('/reports/headcount')
export const fetchAttendanceReport = (month: string) => get<any[]>(`/reports/attendance?month=${month}`)
export const fetchLeavesReport = (year: string) => get<any>(`/reports/leaves?year=${year}`)
export const fetchPayrollReport = () => get<any>('/reports/payroll')
export const fetchOvertimeReport = (month: string) => get<any[]>(`/reports/overtime?month=${month}`)
export const fetchRequestsReport = () => get<any>('/reports/requests')

// ===== التقويم والإشعارات =====
// daysInMonth: أيام الإجازة الواقعة داخل الشهر المطلوب فقط (الممتدة لشهر آخر تُقصّ عليه)
export const fetchCalendar = (month?: string, range?: { from: string; to: string }) => {
  const query = new URLSearchParams()
  if (month) query.set('month', month)
  if (range) { query.set('from', range.from); query.set('to', range.to) }
  return get<{ month: string; from: string; to: string; holidays: Array<{ id: number; name: string; date: string; endDate?: string | null }>; leaves: Array<ApiLeave & { daysInMonth?: number; daysInRange?: number }>; weekendDays: string[] }>(`/calendar${query.size ? `?${query}` : ''}`)
}
// الإشعارات مشتقة من الأحداث: التصنيف صريح من السيرفر، والقراءة والحذف محفوظان لكل مستخدم
export interface ApiNotification {
  id: string; kind: string; category: string; title: string; body: string
  at: string; link: string; read: boolean
}
export const fetchNotifications = () => get<ApiNotification[]>('/notifications')
// حدث نافذة بعد أي تغيير في حالة الإشعارات — الجرس وشاشة الإشعارات يعيدان التحميل
export const NOTIFICATIONS_CHANGED = 'hr:notifications-changed'
const announceNotifications = <T>(p: Promise<T>) =>
  p.then((r) => {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED))
    return r
  })
// بلا ids = تحديد كل الإشعارات الظاهرة كمقروءة
export const markNotificationsRead = (ids?: string[]) =>
  announceNotifications(
    patch<{ ok: boolean; updated: number }>('/notifications/read', ids ? { ids } : {})
  )
// حذف إشعار من قائمتي — الإشعار المجمّع (عدّاد) يرجع لو ظهر فيه عنصر جديد
export const dismissNotification = (id: string) =>
  announceNotifications(del<{ ok: boolean }>(`/notifications/${encodeURIComponent(id)}`))

// ===== قسيمة الراتب وبانِي الطلبات =====
export const fetchPayslip = (itemId: number) =>
  get<{ item: ApiPayrollItem; run: ApiPayrollRun; employee: ApiEmployee }>(`/payroll/items/${itemId}`)
export const fetchAdminRequestTypes = () => get<ApiRequestType[]>('/settings/request-types')
export const updateRequestType = (id: number, d: { isActive?: boolean; approvalChainId?: number }) =>
  patch<ApiRequestType>(`/settings/request-types/${id}`, d)

// ===== الصلاحيات الدقيقة والأدوار =====
export interface ApiPermission { key: string; labelAr: string; group: string }
export interface ApiRole {
  id: number; code: string; nameAr: string
  permissions: string[]; isSystem: boolean; isActive: boolean
  // عدد مستخدمي الدور بنطاق فرع المنفّذ (من GET /roles فقط)
  userCount?: number
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
  post<ApiCustody>(`/custody/${assignmentId}/manager-confirm`)
export const fetchCustodyPendingMyConfirm = () =>
  get<ApiCustody[]>('/custody/pending-my-confirm')

// ===== إنهاء الخدمة (إخلاء الطرف + التصفية) =====
export interface ApiClearanceItem {
  id: number; caseId: number; party: string; label: string
  status: string; note?: string; amount?: number; doneBy?: number; doneAt?: string
  canAct?: boolean // المستخدم الحالي يقدر يتمّ البند (جهته/المدير المباشر/HR)
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
  employee?: ApiOffboardingEmployee | null; items?: ApiClearanceItem[]; lines?: ApiSettlementLine[]
  openCustodyCount?: number; net?: number
  // البنود والمبالغ والراتب لأصحاب التصفية فقط (settlement.edit/approve)
  canViewSettlement?: boolean
  // EMP-2: سبب الإنهاء (TERMINATION_REASON_LABELS) — لـ HR وأصحاب التصفية والموظف ومديره
  terminationReason?: string
  // EMP-1: الإنهاء من طرف الشركة — لـ HR وأصحاب التصفية فقط
  noticeDate?: string; notes?: string; exitInterviewNotes?: string
  openedBy?: number; accessRevokedAt?: string
  createdAt: string
}
// الموظف داخل ملف إنهاء الخدمة — مختصر، والهوية/الراتب/البنك لأصحاب التصفية فقط
export type ApiOffboardingEmployee = Pick<ApiEmployee, 'id' | 'employeeCode' | 'fullName'> &
  Partial<Pick<ApiEmployee,
    | 'fullNameEn' | 'jobTitle' | 'branchId' | 'departmentId' | 'teamId' | 'status' | 'joinDate'
    | 'nationalId' | 'basicSalary' | 'housingAllowance' | 'transportAllowance' | 'phoneAllowance' | 'workNatureAllowance' | 'otherAllowance'
    | 'payMethod' | 'bankName' | 'iban'>>
// «بنود إخلاء عليّ» — بند معلّق على جهتي أو كمدير مباشر
export interface ApiMyClearanceItem {
  itemId: number; caseId: number; party: string; label: string; status: string
  employeeId: number; employeeName: string; employeeCode: string; lastWorkingDay: string
}
export const fetchOffboardingCases = () => get<ApiOffboardingCase[]>('/offboarding')
export const fetchOffboardingCase = (id: number) => get<ApiOffboardingCase>(`/offboarding/${id}`)
export type TerminationReason = 'resignation' | 'termination' | 'dismissal' | 'contract_end' | 'retirement' | 'death' | 'disability' | 'force_majeure'
export interface CreateOffboardingInput {
  employeeId: number; reason: TerminationReason; lastWorkingDay: string
  noticeDate?: string; notes?: string; exitInterviewNotes?: string; revokeAccess?: boolean
}
export interface ApiOffboardingPreview {
  employeeId: number; reason: TerminationReason; lastWorkingDay: string; blockReason: string | null
  serviceYears: number; canViewSettlement: boolean
  eos: { firstYears: number; laterYears: number; firstTierMonths: number; laterMonths: number; fullMonths: number; factor: number; factorLabel: string }
  openCustody: Array<{ id: number; status: string; assetName: string; serialNumber: string | null }>
  lines?: Array<{ label: string; type: 'CREDIT' | 'DEBIT'; amount: number }>; net?: number
}
export const fetchOffboardingPreview = (input: Pick<CreateOffboardingInput, 'employeeId' | 'reason' | 'lastWorkingDay'>) =>
  get<ApiOffboardingPreview>(`/offboarding/preview?${new URLSearchParams({ employeeId: String(input.employeeId), reason: input.reason, lastWorkingDay: input.lastWorkingDay })}`)
export const createOffboardingCase = (input: CreateOffboardingInput) => post<ApiOffboardingCase>('/offboarding', input)
export const fetchMyClearanceItems = () => get<ApiMyClearanceItem[]>('/offboarding/my-items')
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
export const fetchMyApprovedLeaves = () => get<ApiLeave[]>('/leaves/mine')

// ===== تهيئة الموظفين الجدد (قالب + مهام لكل موظف بجهة مسؤولة وموعد) =====
export type OnboardingParty = 'hr' | 'it' | 'custody' | 'finance' | 'manager'
// PENDING قيد التنفيذ · DONE تمّت · SKIPPED غير مطلوبة لهذا الموظف
export type OnboardingTaskStatus = 'PENDING' | 'DONE' | 'SKIPPED'
export interface ApiOnboardingTask {
  id: number; employeeId: number; templateItemId: number | null
  label: string; party: OnboardingParty; dueDate: string; sortOrder: number
  status: OnboardingTaskStatus; note: string | null
  doneAt: string | null; doneByName: string | null
  canAct: boolean // المستخدم الحالي يتمّها أو يعيد فتحها (جهتها/المدير المباشر/HR)
}
export interface ApiOnboardingEmployee {
  id: number; employeeCode: string; fullName: string; jobTitle: string | null
  branchId: number; branchName: string; status: string; joinDate: string | null
  canManage: boolean // HR: إضافة مهمة وتعديل الوصف والجهة والموعد والاستبعاد
  tasks: ApiOnboardingTask[]
}
export interface ApiOnboardingTemplateItem {
  id: number; label: string; party: OnboardingParty
  dueOffsetDays: number; sortOrder: number; isActive: boolean
}
// الموظفون الجدد بتاريخ الالتحاق (آخر windowDays يوم أو المنتظر التحاقهم) ومهامهم
export const fetchOnboarding = () =>
  get<{ windowDays: number; canManageTemplate: boolean; employees: ApiOnboardingEmployee[] }>('/onboarding')
export const updateOnboardingTask = (
  id: number,
  d: { status?: OnboardingTaskStatus; note?: string; label?: string; party?: OnboardingParty; dueDate?: string }
) => patch<ApiOnboardingTask>(`/onboarding/tasks/${id}`, d)
export const addOnboardingTask = (
  employeeId: number,
  d: { label: string; party: OnboardingParty; dueDate: string }
) => post<ApiOnboardingTask>(`/onboarding/${employeeId}/tasks`, d)
// قالب المهام (settings.manage) — يسري على من تُنسخ قائمته بعد التعديل
export const fetchOnboardingTemplate = () =>
  get<ApiOnboardingTemplateItem[]>('/onboarding/template')
export const createOnboardingTemplateItem = (d: {
  label: string; party: OnboardingParty; dueOffsetDays: number; sortOrder?: number; isActive?: boolean
}) => post<ApiOnboardingTemplateItem>('/onboarding/template', d)
export const updateOnboardingTemplateItem = (
  id: number,
  d: Partial<Omit<ApiOnboardingTemplateItem, 'id'>>
) => patch<ApiOnboardingTemplateItem>(`/onboarding/template/${id}`, d)

// ===== مزامنة أجهزة البصمة =====
export interface ApiSyncResult {
  deviceId: number; deviceName: string; ok: boolean
  pulled: number; inserted: number; matched: number; error?: string
  rejected?: number // بصمات رفضها الاستقبال (وقت مستقبلي/كود غير صالح)
}
export const syncDevice = (id: number) => post<ApiSyncResult>(`/attendance/devices/${id}/sync`)
export const syncAllDevices = () => post<ApiSyncResult[]>('/attendance/devices/sync-all')
// أكواد جهاز بلا موظف مطابق (بصمات يتيمة) — تُربط بضبط «رقم البصمة» في ملف الموظف
export interface ApiUnmatchedCode {
  employeeCode: string; count: number
  firstPunch: string; lastPunch: string; deviceSns: string[]
}
export const fetchUnmatchedPunches = () =>
  get<ApiUnmatchedCode[]>('/attendance/punches/unmatched')

// تجاوز وردية يوم بعينه (حالة خاصة) — clear:true يرجّع اليوم لوردية الأسبوع
// shiftId = مرجع الوردية في الكتالوج — به يتم الربط (الاسم والأوقات لقطة احتياطية)
export const setDayShiftOverride = (d: {
  employeeId: number; date: string
  shiftId?: number; shiftName?: string; startTime?: string; endTime?: string; clear?: boolean
}) => post('/attendance/schedule/day', d)
// تجاوز وردية يوم لمجموعة موظفين دفعة واحدة (نطاق: شركة/فرع/قسم)
export const setDayShiftOverridesBulk = (d: {
  employeeIds: number[]; dates: string[]
  shiftId?: number; shiftName?: string; startTime?: string; endTime?: string; clear?: boolean
}) => post<{
  ok: boolean; applied: number; employees: number; days: number
  // سبب فشل كل موظف/يوم — لا يُبلع
  failed?: Array<{ employeeId: number; date: string; error: string }>
  skipped?: number // موظفون استُبعدوا: خارج نطاق فرعك أو أنت نفسك
}>('/attendance/schedule/day/bulk', d)
export const fetchWeekDayOverrides = (week: string) =>
  get<Array<{ id: number; employeeId: number; date: string; shiftId?: number | null; shiftName: string; startTime: string; endTime: string }>>(
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

export const downloadLetter = async (id: number) => {
  const res = await fetch(`${API_BASE}/letters/${id}/download`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.message ?? 'تعذّر تحميل الخطاب')
  }
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = `خطاب-${id}.pdf`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

// جلب ملف كـ blob URL بالتوكن — لعرض الصور في <img> (اللي مبيبعتش الهيدر)
// النتيجة تُلغى بـ URL.revokeObjectURL عند التفريغ
export const fetchFileObjectUrl = async (id: number): Promise<string | null> => {
  const token = getToken()
  try {
    const res = await fetch(`${API_BASE}/files/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) return null
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

// ===== بانِي أنواع الطلبات =====
export interface CustomFieldDef {
  key: string; label: string; type: 'text' | 'number' | 'date' | 'month' | 'select' | 'file'
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
