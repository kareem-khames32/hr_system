'use client'
import { definitionCodeOf, isLeaveRequest, leaveCodeOf } from '../../../api/src/common/leave-contract'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import LetterDownloadButton from '@/components/LetterDownloadButton'
import RequestPayload from '@/components/RequestPayload'
import BonusRequestForm from '@/components/requests/BonusRequestForm'
import DeductionRequestForm from '@/components/requests/DeductionRequestForm'
// بطاقة صاحب الطلب أعلى التفاصيل — وطلب الموارد البشرية نيابةً يقول اتقدّم لمين
import RequestEmployeeCard from '@/components/requests/RequestEmployeeCard'
import OvertimePreview from '@/components/OvertimePreview'
import OvertimeRequestSummary from '@/components/OvertimeRequestSummary'
import TimeSelect, { normalizeTime, timeSpanMinutes } from '@/components/TimeSelect'
import { EmployeePicker } from '@/components/EmployeePicker'
import { payloadFieldKind, payloadFieldLabel, payloadNumberProps, payloadSummary, payloadValueLabel } from '@/lib/request-payload'
import { leaveAttachmentName, leaveAttachmentRequiredNow, leaveAttachmentRuleText, leaveCountsCalendarDays as countsCalendarDaysOf, leaveHalfDayAllowed, leaveRulesHint } from '@/lib/leave-catalog'
import { salaryIncreaseRequestFields, salaryIncreaseRequestPayload } from '@/lib/employee-salary-change-api'
import {
  Plus,
  Search,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ClipboardList,
  ChevronLeft,
  X,
  Send,
  Users,
  EyeOff,
  Paperclip,
  Package,
  AlertTriangle,
  Info,
} from 'lucide-react'
import {
  getTypeByCode,
  statusLabels,
  statusStyles,
  categoryLabels,
  type RequestStatus,
} from '@/data/requestsCatalog'
import {
  fetchRequestTypes,
  apiFetch,
  fetchRequest,
  createRequest,
  cancelRequest,
  resubmitRequest,
  uploadFile,
  fetchAvailableAssets,
  fetchCatalog,
  fetchEmployeeDirectory,
  fetchTeams,
  fetchMyCustody,
  fetchWorkingDays,
  fetchMyApprovedLeaves,
  fetchActiveLeaveTypes,
  fetchMyOffboardingCase,
  previewOvertime,
  withdrawOffboarding,
  can,
  type ApiRequest,
  type ApiRequestType,
  type ApiEmployeeDirectoryEntry,
  type ApiTeam,
  type ApiCustody,
  type ApiLeave,
  type ApiLeaveTypeOption,
  type CustomFieldDef,
  type ApiOvertimePreview,
} from '@/lib/api'

// الإجازة المعتمدة كما يرجعها الباك — تحمل «نطاق اليوم» فوق نوع ApiLeave
type ApprovedLeave = ApiLeave & { period?: 'FULL' | 'MORNING' | 'EVENING' }

// ===== أدوات فك حقول JSON القادمة من الباك (payload / resolvedSteps / requiredFields) =====
interface ResolvedStep {
  stepOrder: number
  role: string
  approverEmployeeId?: number | null
  slaDays?: number | null
  escalateTo?: string | null
  dueAt?: string | null
  actedAt?: string | null
  action?: string | null
}

// خط الفلوس: كارتا «خصم» و«مكافأة» صارا نموذجَي طلب حقيقيين داخل هذه الشاشة (DeductionRequestForm و
// BonusRequestForm) مربوطين بكتالوجَي «أنواع الخصومات» و«أنواع المكافآت» ونقطتَي الإنشاء الفردي نفسيهما —
// بلا انتقال لشاشة أخرى ولا فورم عام ولا محرك ثانٍ. شاشتا /payroll/deductions و/payroll/bonuses باقيتان
// كما هما للمجموعات، ولكل نموذج رابط ثانوي إليهما لمن يملك صلاحيتهما.

const parseJson = <T,>(raw: string | null | undefined, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const roleLabels: Record<string, string> = {
  direct_manager_of_requester: 'المدير المباشر',
  department_manager_of_requester: 'مدير القسم',
  branch_manager_of_requester: 'مدير الفرع',
  receiving_team_manager: 'المدير المستقبِل',
  hr: 'الموارد البشرية',
  finance: 'المالية',
  executive: 'الإدارة التنفيذية',
  custody_officer: 'أمين العهدة',
  payroll_officer: 'موظف الرواتب',
  it: 'تقنية المعلومات',
  specific_employee: 'موظف محدد',
}

const fieldLabels: Record<string, string> = {
  date: 'التاريخ',
  punchType: 'نوع البصمة',
  time: 'الوقت',
  fromDate: 'من تاريخ',
  toDate: 'إلى تاريخ',
  effectiveDate: 'تاريخ السريان',
  effectivePayrollPeriod: 'يسري من راتب شهر',
  lastWorkingDate: 'آخر يوم عمل',
  from: 'من الساعة',
  to: 'إلى الساعة',
  days: 'عدد الأيام',
  hours: 'عدد الساعات',
  amount: 'المبلغ',
  months: 'عدد الأشهر',
  newSalary: 'الراتب الجديد',
  increase_pct: 'نسبة الزيادة %',
  reason: 'السبب',
  description: 'الوصف',
  destination: 'جهة الانتداب',
  leaveType: 'نوع الإجازة',
  leaveTypeCode: 'نوع الإجازة',
  leaveId: 'رقم الإجازة',
  loanId: 'رقم السلفة',
  withEmployeeId: 'الموظف البديل',
  toEmployeeId: 'الموظف المستلم',
  toTeamId: 'الفريق الجديد',
  toTitle: 'المسمى الجديد',
  assignmentId: 'العهدة المراد نقلها',
  iban: 'الآيبان IBAN',
  name: 'الاسم',
  phone: 'رقم الهاتف',
  documentType: 'نوع الوثيقة',
  courseName: 'اسم الدورة',
  permissionType: 'نوع الإذن',
  period: 'نطاق اليوم',
  assetIds: 'الأصول المطلوبة',
  newStatus: 'الحالة الجديدة',
  note: 'ملاحظات',
}

// ===== «دوام يوم عطلة»: مدى «من/إلى» بدل قائمة أيام مكتوبة بالإيد =====
// أقصى عدد أيام في الطلب الواحد كما يفرضه الخادم (HOLIDAY_WORK_MAX_DATES)
const HOLIDAY_WORK_MAX_DAYS = 62
// صيغة الأيام المرسلة لا تتغير: نص أيام YYYY-MM-DD مفصولة بفاصلة عربية — نفس ما كان يكتبه المستخدم
const HOLIDAY_DATES_SEPARATOR = '، '
const holidayDatesText = (days: string[]) => days.join(HOLIDAY_DATES_SEPARATOR)
const holidayDatesList = (raw: string | undefined): string[] =>
  (raw ?? '').split(/[\s,،;؛]+/).filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
const localToday = () => new Date().toLocaleDateString('en-CA')
// كل أيام المدى شاملاً طرفيه — حساب على منتصف اليوم فلا تزحلق المنطقة الزمنية يوماً
const daysInRange = (from: string, to: string): string[] => {
  const out: string[] = []
  const end = Date.parse(`${to}T12:00:00Z`)
  for (let t = Date.parse(`${from}T12:00:00Z`); t <= end; t += 86400000) out.push(new Date(t).toISOString().slice(0, 10))
  return out
}

// نطاق اليوم للإجازات — القيم كود، والعرض عربي دائماً
const periodLabels: Record<string, string> = {
  FULL: 'يوم كامل',
  MORNING: 'النصف الصباحي',
  EVENING: 'النصف المسائي',
}

const optionLabel = (value: string) => ({ single: 'أعزب', married: 'متزوج', divorced: 'مطلق', widowed: 'أرمل',
  permanent: 'غير محدد المدة', fixed_term: 'محدد المدة', part_time: 'دوام جزئي', seasonal: 'موسمي' } as Record<string, string>)[value] ?? value

// وجهات التنفيذ — للأنواع المبنية من «بانِي الطلبات» (بدون تسريب كود الـ handler)
const handlerLabels: Record<string, string> = {
  none: 'تسجيل فقط — الطلب المعتمد هو السجل بلا أثر آلي',
  leave_calendar_balance: 'إجازة تُخصم من الرصيد',
  leave_calendar_payroll: 'إجازة بلا خصم رصيد',
  leave_calendar: 'إجازة تُخصم من الرصيد',
  leave_calendar_once: 'إجازة بلا خصم رصيد — التكرار حسب سياسة النوع',
  leave_deduct_balance: 'إجازة تُخصم من الرصيد',
  leave_no_balance: 'إجازة بلا خصم رصيد',
  leave_balance_restore: 'إرجاع رصيد الإجازة',
  overtime_entries: 'قيد أوفرتايم',
  attendance_log: 'سجل الحضور',
  attendance_corrections: 'تصحيح بصمة',
  holiday_work: 'بدل دوام أيام العطلات في المسير (من البصمة)',
  attendance_trips: 'سجل المأموريات',
  shift_schedule: 'جدول الورديات',
  loans_installments: 'سلفة بجدول أقساط',
  salary_update_history: 'تحديث راتب',
  payroll_bonus: 'مكافأة في المسير',
  payroll_allowance: 'بدل في المسير',
  payroll_adjustment: 'تسوية في المسير',
  transfers_effective_date: 'نقل بتاريخ سريان',
  employee_update_promotions: 'ترقية',
  employee_update: 'تحديث بيانات الموظف',
  employee_record: 'تحديث بيانات الموظف',
  employee_record_auto: 'تحديث آلي لبيانات الموظف',
  payroll_bank_secure: 'تغيير حساب بنكي (مسار أمني)',
  letter_pdf_generator: 'خطاب PDF قابل للتحميل بعد الاعتماد',
  custody_assignments_ack: 'عهدة بتأكيد استلام',
  custody_assignments: 'إرجاع عهدة',
  custody_return: 'إرجاع عهدة',
  custody_finance: 'العهدة والمالية',
  employee_status: 'تغيير حالة وظيفية',
  document_vault: 'خزنة الوثائق',
  expense_register: 'سجل المصروفات',
  training_register: 'سجل التدريب',
  training_expense: 'مصروفات التدريب',
}

// ودجة الحقل ونوعه من خريطة واحدة جنب تسميات المعتمد (src/lib/request-payload.ts) — الشاشة لا تخمّن
const isDateField = (f: string) => payloadFieldKind(f) === 'date'
const isNumberField = (f: string) => payloadFieldKind(f) === 'number'
// نوع الحقل المخصّص من الخادم يسبق الخريطة؛ الخادم لما يقول «text» (الافتراضي العام) الخريطة هي الحكم
const fieldKindOf = (key: string, configured?: CustomFieldDef['type']): string =>
  configured && configured !== 'text' ? configured : payloadFieldKind(key)

// حقول تُرسم كقوائم اختيار ذكية (بيانات حقيقية بدل إدخال رقم خام) — الموظف البديل في تبديل الوردية منتقي موظف
// بالاسم أو الكود بدل رقم الموظف الداخلي
const SMART_SELECT_FIELDS: readonly string[] = ['toTeamId', 'toEmployeeId', 'withEmployeeId', 'assignmentId']
// الحقول اللي بتختار موظف — قائمتها من الدليل المختصر
const EMPLOYEE_PICKER_FIELDS: readonly string[] = ['toEmployeeId', 'withEmployeeId']

// مفتاح غير معروف؟ نفكّ الـ camelCase لكلمات مقروءة — لا يظهر مفتاح خام أبداً
const humanizeKey = (k: string): string =>
  fieldLabels[k] ?? payloadFieldLabel(k)
// عنوان الحقل المخصّص كما ضبطه الخادم — إلا العنوان الافتراضي القديم «رقم الموظف البديل»: الحقل بقى منتقي موظف
// بالاسم أو الكود (القيمة المبعوتة لسه id الموظف)
const customFieldLabel = (f: CustomFieldDef): string =>
  f.key === 'withEmployeeId' && f.label === 'رقم الموظف البديل' ? fieldLabels.withEmployeeId : f.label

// شكل الصف في الشاشة — مشتق من ApiRequest
interface MyRequestRow {
  id: number
  displayId: string
  type: string
  typeCode: string
  submittedAt: string
  status: RequestStatus
  // سلسلة الاعتماد وخطوتها الحالية
  steps: { name: string; state: 'done' | 'current' | 'waiting' | 'rejected' }[]
  details: string
  destinationRecord?: string // مرجع الوجهة بعد الاكتمال
  // طلب قدّمته نيابة عن موظف آخر — اسمه من السيرفر
  onBehalfOfName?: string
}

const mapRequest = (r: ApiRequest, types: ApiRequestType[]): MyRequestRow => {
  const steps = parseJson<ResolvedStep[]>(r.resolvedSteps, [])
  return {
    id: r.id,
    displayId: `REQ-${r.id}`,
    type:
      types.flatMap(t => t.leaveProfiles ?? [t]).find(t => (t.definitionCode ?? t.code) === definitionCodeOf(r))?.nameAr ??
      types.find((t) => t.code === r.typeCode)?.nameAr ??
      getTypeByCode(r.typeCode)?.nameAr ??
      'طلب',
    typeCode: r.typeCode,
    submittedAt: (r.submittedAt ?? r.createdAt).slice(0, 10),
    status: r.status as RequestStatus,
    steps: steps.map((s) => ({
      name: roleLabels[s.role] ?? 'جهة اعتماد',
      state:
        ['REJECT', 'REJECTED'].includes(s.action ?? '')
          ? 'rejected'
          : ['APPROVE', 'APPPROVE', 'APPROVED'].includes(s.action ?? '')
          ? 'done'
          : s.stepOrder === r.currentStep
          ? 'current'
          : 'waiting',
    })),
    details: payloadSummary(r.payload),
    destinationRecord: r.destinationRef ?? undefined,
    onBehalfOfName: (r as { onBehalfOfName?: string }).onBehalfOfName,
  }
}

const statusIcons: Partial<Record<RequestStatus, typeof Clock>> = {
  SUBMITTED: Send,
  UNDER_REVIEW: Clock,
  APPROVED: CheckCircle2,
  IN_EXECUTION: RotateCcw,
  COMPLETED: CheckCircle2,
  REJECTED: XCircle,
  RETURNED_FOR_INFO: RotateCcw,
  DRAFT: FileText,
  CANCELLED: XCircle,
}

export default function MyRequestsPage() {
  const [types, setTypes] = useState<ApiRequestType[]>([])
  const [requests, setRequests] = useState<MyRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | RequestStatus>('all')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const [selectedDefinition, setSelectedDefinition] = useState('')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [requestNote, setRequestNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [editingRequest, setEditingRequest] = useState<ApiRequest | null>(null)
  const [requestDetail, setRequestDetail] = useState<ApiRequest | null>(null)
  const [overtimePreview, setOvertimePreview] = useState<ApiOvertimePreview | null>(null)
  const [overtimePreviewLoading, setOvertimePreviewLoading] = useState(false)
  const [overtimePreviewError, setOvertimePreviewError] = useState('')
  const [overtimePreviewRevision, setOvertimePreviewRevision] = useState(0)
  const [returnComment, setReturnComment] = useState('')
  // رفع الملفات لحقول «مرفق» — الحقل الجاري رفعه + أسماء الملفات المرفوعة
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({})
  // طلب العهدة — الأصول المتاحة + الاختيار المتعدد + سبب الطلب
  const [availableAssets, setAvailableAssets] = useState<
    Array<{ id: number; name: string; category: string; serialNumber?: string }>
  >([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [assetSearch, setAssetSearch] = useState('')
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([])
  const [custodyReason, setCustodyReason] = useState('')
  // نصف اليوم للإجازات
  const [leavePeriod, setLeavePeriod] = useState<'FULL' | 'MORNING' | 'EVENING'>('FULL')
  // إلغاء/تعديل إجازة — إجازاتي المعتمدة + الاختيار + سبب الإلغاء
  const [myLeaves, setMyLeaves] = useState<ApprovedLeave[]>([])
  const [myLeavesLoading, setMyLeavesLoading] = useState(false)
  const [selectedLeaveId, setSelectedLeaveId] = useState<number | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  // ملف الاستقالة النشط — بانر التراجع خلال فترة الإشعار
  const [offboardingCase, setOffboardingCase] = useState<{
    id: number
    status: string
    lastWorkingDay: string
  } | null>(null)
  const [withdrawingResignation, setWithdrawingResignation] = useState(false)
  // أنواع الإذن (استئذان) من الكتالوج
  const [permissionTypes, setPermissionTypes] = useState<
    Array<{ id: number; nameAr: string; isDeductible: boolean; maxDurationMinutes?: number | null; monthlyFreeMinutes?: number | null; isActive: boolean }>
  >([])
  const [permissionType, setPermissionType] = useState('')
  // أنواع الإجازة الفعّالة (السنوية/المرضية/بدون راتب...) — طلب إجازة موحّد يختار منها
  const [leaveTypes, setLeaveTypes] = useState<ApiLeaveTypeOption[]>([])
  // التقديم نيابة عن موظف آخر (بصلاحية)
  const canOnBehalf = can('requests.create_on_behalf')
  const [onBehalf, setOnBehalf] = useState(false)
  // دليل النطاق المختصر (نشطون فقط، بلا employees.view) — لمنتقيي النيابة ونقل العهدة
  const [employees, setEmployees] = useState<ApiEmployeeDirectoryEntry[]>([])
  const [onBehalfEmployeeId, setOnBehalfEmployeeId] = useState('')
  // مصادر القوائم الذكية — تُحمَّل كسولاً عند اختيار نوع يحتاجها
  const [teams, setTeams] = useState<ApiTeam[]>([])
  const [myCustody, setMyCustody] = useState<ApiCustody[] | null>(null)
  // أيام العمل الفعلية داخل مدى الإجازة — تلميح الخصم (آخر مدى محسوب)
  // self = محسوب بجدول الموظف نفسه (تقديم لنفسه) لا بفرع المستخدم (نيابة)
  const [workingDaysInfo, setWorkingDaysInfo] = useState<{
    from: string
    to: string
    self: boolean
    employeeId?: number
    total: number
    working: number
    skipped: string[]
  } | null>(null)
  // «دوام يوم عطلة»: مدى «من/إلى» بدل كتابة الأيام بالإيد — أيام العطلة الحقيقية جواه من نفس
  // حساب الخادم الذي يحكم به على الطلب (attendance/working-days ← calendarDay لكل يوم)
  const [holidayRange, setHolidayRange] = useState({ from: '', to: '' })
  const [holidayDays, setHolidayDays] = useState<string[]>([])
  const [holidayPicked, setHolidayPicked] = useState<string[]>([])
  const [holidayLoading, setHolidayLoading] = useState(false)
  const [holidayError, setHolidayError] = useState('')
  // الخادم ما قدرش يحسب العطلات (نيابةً بلا صلاحية مثلاً) → نفرد المدى يوم بيوم والمستخدم يعلّم اللي اشتغله
  const [holidayManual, setHolidayManual] = useState(false)

  const load = async () => {
    try {
      setError(null)
      const [typeList, mine, offCase] = await Promise.all([
        fetchRequestTypes(),
        // «طلباتي» وحدها تعرض معها ما قدّمه المستخدم نيابةً عن غيره، موسوماً باسمه
        apiFetch<ApiRequest[]>('/requests/mine?includeOnBehalf=1'),
        fetchMyOffboardingCase().catch(() => null),
      ])
      setTypes(typeList)
      setRequests(mine.map((r) => mapRequest(r, typeList)))
      setOffboardingCase(offCase)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'تعذّر الاتصال بالخادم — تأكد أن الـ API يعمل'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // فتح نموذج نوع بعينه من رابط (مثلاً «بصمة ناقصة» في كشف الحضور ← طلب تصحيح
  // بصمة معبّأ بالتاريخ والطرف الناقص): /requests?type=PUNCH_CORRECTION&date=…&punchType=OUT
  useEffect(() => {
    if (types.length === 0 || typeof window === 'undefined') return
    const qs = new URLSearchParams(window.location.search)
    const code = qs.get('type')
    const linkedProfile = types.flatMap(t => t.leaveProfiles ?? [t]).find(t => (t.definitionCode ?? t.code) === code && t.isActive)
    if (!code || (!types.some((t) => t.code === code && t.isActive) && !linkedProfile)) return
    const prefill: Record<string, string> = {}
    const date = qs.get('date')
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) prefill.date = date
    const punchType = qs.get('punchType')
    const forEmployee = qs.get('employeeId')
    if (forEmployee && /^\d+$/.test(forEmployee) && canOnBehalf) {
      setOnBehalf(true)
      setOnBehalfEmployeeId(forEmployee)
    }
    if (punchType === 'IN' || punchType === 'OUT') prefill.punchType = punchType
    if (linkedProfile?.definitionCode) {
      setSelectedDefinition(linkedProfile.definitionCode)
      if (linkedProfile.leaveTypeCode) prefill.leaveTypeCode = linkedProfile.leaveTypeCode
    }
    setSelectedType(linkedProfile?.definitionCode ? 'LEAVE' : code)
    setFieldValues(prefill)
    setShowNewModal(true)
    // الرابط يُستهلك مرة واحدة — لا يُعاد فتح النموذج بعد التقديم/إعادة التحميل
    window.history.replaceState(null, '', window.location.pathname)
  }, [types, canOnBehalf])

  // تحميل كسول حسب النوع المختار: أصول العهدة المتاحة / أنواع الإذن
  useEffect(() => {
    if (selectedType === 'CUSTODY_REQUEST' && availableAssets.length === 0) {
      setAssetsLoading(true)
      fetchAvailableAssets()
        .then(setAvailableAssets)
        .catch((err) =>
          setSubmitError(
            err instanceof Error ? err.message : 'تعذّر تحميل الأصول المتاحة'
          )
        )
        .finally(() => setAssetsLoading(false))
    }
    if (selectedType === 'LEAVE_MODIFY_CANCEL') {
      // تحميل طازج كل مرة — قائمة الإجازات المعتمدة تتغير مع كل اعتماد/إلغاء
      setMyLeavesLoading(true)
      // نيابةً عن موظف: إجازاته هو، مش إجازات صاحب الحساب
      fetchMyApprovedLeaves(onBehalf && onBehalfEmployeeId ? Number(onBehalfEmployeeId) : undefined)
        .then((leaves) => setMyLeaves(leaves as ApprovedLeave[]))
        .catch((err) =>
          setSubmitError(
            err instanceof Error ? err.message : 'تعذّر تحميل إجازاتك المعتمدة'
          )
        )
        .finally(() => setMyLeavesLoading(false))
    }
    if (selectedType === 'PERMISSION' && permissionTypes.length === 0) {
      fetchCatalog<{
        id: number
        nameAr: string
        isDeductible: boolean
        maxDurationMinutes?: number | null
        monthlyFreeMinutes?: number | null
        isActive: boolean
      }>('permission-types')
        .then(setPermissionTypes)
        .catch((err) =>
          setSubmitError(
            err instanceof Error ? err.message : 'تعذّر تحميل أنواع الإذن'
          )
        )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, onBehalf, onBehalfEmployeeId])

  // قائمة الموظفين — فقط لمن يملك صلاحية التقديم نيابة عن غيره
  useEffect(() => {
    if (showNewModal && canOnBehalf && employees.length === 0) {
      fetchEmployeeDirectory()
        .then(setEmployees)
        .catch((err) =>
          setSubmitError(
            err instanceof Error ? err.message : 'تعذّر تحميل قائمة الموظفين'
          )
        )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNewModal, canOnBehalf])

  // الأنواع المتاحة للموظف — كتالوج السيرفر هو مصدر الحقيقة الوحيد
  // (الباك يفلتر أصلاً حسب جمهور كل نوع visibleTo وحالة التفعيل). والنوع اللي
  // وجهته لسه متبنّتش مابيتقدّمش — مخفي من المنتقي (REQ-3)
  const availableRequestTypes = types.filter(
    (t) => t.isActive && t.destinationSupported !== false && (t.code !== 'OVERTIME_AUTO' || editingRequest?.typeCode === 'OVERTIME_AUTO')
  )

  // فئات الكتالوج الفعلية — المعروفة بترتيبها ثم أي فئة جديدة من السيرفر آخراً
  const knownCategoryOrder = Object.keys(categoryLabels)
  const availableCategories = Array.from(
    new Set(availableRequestTypes.map((t) => t.category))
  ).sort(
    (a, b) =>
      (knownCategoryOrder.indexOf(a) + 1 || 99) -
      (knownCategoryOrder.indexOf(b) + 1 || 99)
  )
  const categoryLabel = (cat: string) =>
    categoryLabels[cat as keyof typeof categoryLabels] ?? 'أخرى'

  const selectedGroup = availableRequestTypes.find((t) => t.code === selectedType)
  const leaveProfiles = selectedGroup?.leaveProfiles ?? []
  const activeProfile = leaveProfiles.find(p => p.definitionCode === selectedDefinition)
    ?? (leaveProfiles.length === 1 ? leaveProfiles[0] : undefined)
  const selectedTypeDef = selectedGroup?.leaveProfiles
    ? activeProfile ? { ...activeProfile, code: 'LEAVE' } : undefined
    : selectedGroup
  useEffect(() => {
    if (selectedType === 'LEAVE' && activeProfile?.leaveTypeCode) {
      setFieldValues(values => ({ ...values, leaveTypeCode: activeProfile.leaveTypeCode! }))
    }
  }, [selectedType, activeProfile?.definitionCode, activeProfile?.leaveTypeCode])
  const isSalaryIncrease = selectedTypeDef?.code === 'SALARY_INCREASE' || selectedTypeDef?.destinationHandler === 'salary_update_history'
  const configuredRequiredFields = parseJson<string[]>(selectedTypeDef?.requiredFields, [])
  // الحقول المخصّصة كاملة الوصف — إن وُجدت تحل محل الاستنتاج القديم
  const configuredCustomFields = parseJson<CustomFieldDef[]>(
    (selectedTypeDef as any)?.customFields,
    []
  )
  const customFields = isSalaryIncrease ? salaryIncreaseRequestFields(configuredCustomFields, configuredRequiredFields.map(key => ({ key, label: fieldLabels[key] ?? key, type: isNumberField(key) ? 'number' : key.toLowerCase().includes('date') ? 'date' : 'text', required: true }))) : configuredCustomFields
  const requiredFields = isSalaryIncrease ? customFields.filter(field => field.required).map(field => field.key) : configuredRequiredFields
  const hasCustomFields = customFields.length > 0
  // أسماء حقول النموذج الحالي — لاكتشاف الحقول الذكية وتحميل مصادرها
  const formFieldKeys = hasCustomFields ? customFields.map((f) => f.key) : requiredFields
  const isAutomaticOvertime = selectedType === 'OVERTIME_AUTO' && editingRequest?.typeCode === 'OVERTIME_AUTO'
  const isOvertime = selectedType === 'OVERTIME' || isAutomaticOvertime
  const overtimeDate = fieldValues.date ?? ''
  const overtimeEmployeeId = editingRequest?.requesterId ?? (onBehalf && onBehalfEmployeeId ? Number(onBehalfEmployeeId) : undefined)
  const overtimeResubmitId = editingRequest && parseJson<Record<string, unknown>>(editingRequest.payload, {}).date === overtimeDate ? editingRequest.id : undefined
  const overtimeHoursRequired = !isAutomaticOvertime && (overtimePreview?.evidenceMode === 'EXEMPT_APPROVAL' || customFields.some(field => field.key === 'hours' && field.required))
  const overtimePreviewCurrent = overtimePreview?.workDate === overtimeDate &&
    (overtimeEmployeeId == null || overtimePreview.employeeId === overtimeEmployeeId)
  useEffect(() => {
    setOvertimePreview(null)
    setOvertimePreviewError('')
    setOvertimePreviewLoading(false)
    if (!showNewModal || !isOvertime || !/^\d{4}-\d{2}-\d{2}$/.test(overtimeDate) || (onBehalf && !onBehalfEmployeeId)) return
    let cancelled = false
    setOvertimePreviewLoading(true)
    previewOvertime(overtimeDate, overtimeEmployeeId, overtimeResubmitId)
      .then(value => { if (!cancelled) setOvertimePreview(value) })
      .catch(err => { if (!cancelled) setOvertimePreviewError(err instanceof Error ? err.message : 'تعذر معاينة سجل اليوم') })
      .finally(() => { if (!cancelled) setOvertimePreviewLoading(false) })
    return () => { cancelled = true }
  }, [showNewModal, isOvertime, overtimeDate, overtimeEmployeeId, overtimeResubmitId, onBehalf, onBehalfEmployeeId, overtimePreviewRevision])

  // تحميل كسول لمصادر القوائم الذكية: الفرق / الموظفون / عهدتي النشطة
  useEffect(() => {
    if (!selectedType) return
    if (formFieldKeys.includes('toTeamId') && teams.length === 0) {
      fetchTeams()
        .then(setTeams)
        .catch((err) =>
          setSubmitError(
            err instanceof Error ? err.message : 'تعذّر تحميل قائمة الفرق'
          )
        )
    }
    if (formFieldKeys.some((key) => EMPLOYEE_PICKER_FIELDS.includes(key)) && employees.length === 0) {
      fetchEmployeeDirectory()
        .then(setEmployees)
        .catch((err) =>
          setSubmitError(
            err instanceof Error ? err.message : 'تعذّر تحميل قائمة الموظفين'
          )
        )
    }
    if (formFieldKeys.includes('assignmentId') && myCustody === null) {
      fetchMyCustody()
        .then(setMyCustody)
        .catch((err) =>
          setSubmitError(err instanceof Error ? err.message : 'تعذّر تحميل عهدتك')
        )
    }
    // طلب إجازة موحّد: حمّل أنواع الإجازة مرة عند اختيار نوع فيه حقل نوع الإجازة
    // (endpoint الخدمة الذاتية — الإداري /settings/leave-types كان يرجع 403 للموظف)
    if ((formFieldKeys.includes('leaveTypeCode') || formFieldKeys.includes('leaveType')) && leaveTypes.length === 0) {
      fetchActiveLeaveTypes()
        .then(setLeaveTypes)
        .catch((err) =>
          setSubmitError(
            err instanceof Error ? err.message : 'تعذّر تحميل أنواع الإجازة'
          )
        )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, selectedDefinition])

  // النماذج الخاصة: عهدة (اختيار أصول) / استئذان (نوع الإذن) / إجازات (نطاق اليوم)
  const isCustodyRequest = selectedTypeDef?.code === 'CUSTODY_REQUEST'
  const isPermission = selectedTypeDef?.code === 'PERMISSION'
  // طلب الإجازة الموحّد — يختار الموظف نوع الإجازة من قائمة (بدل نوع طلب لكل إجازة)
  const isLeave = selectedTypeDef?.code === 'LEAVE'
  // إلغاء/تعديل إجازة — منتقي الإجازة المعتمدة بدل الحقول العامة ونطاق اليوم
  const isLeaveCancel = selectedTypeDef?.code === 'LEAVE_MODIFY_CANCEL'
  // تصحيح/طلب بصمة — تلميح تعبئة البصمة الناقصة (النموذج يُبنى بالحقول العامة/المخصّصة)
  const isPunchCorrection = selectedTypeDef?.code === 'PUNCH_CORRECTION'
  // «خصم» و«مكافأة»: لكل منهما نموذجه الخاص المربوط بكتالوجه — لا حقول عامة ولا زر إرسال عام
  const isPayrollDeduction = selectedTypeDef?.code === 'PAYROLL_DEDUCTION'
  const isPayrollBonus = selectedTypeDef?.code === 'PAYROLL_BONUS'
  const isMoneyRequest = isPayrollDeduction || isPayrollBonus
  // «دوام يوم عطلة»: مدى «من/إلى» + شرائح أيام العطلة الحقيقية بدل خانة نص يكتبها المستخدم بيده
  const isHolidayWork = formFieldKeys.includes('dates')
  const isLeaveCategory = selectedTypeDef?.category === 'leaves' && !isLeaveCancel
  const isHalfDay = isLeaveCategory && leavePeriod !== 'FULL'
  // نوع الإجازة المختار في الطلب الموحّد + المرفق الإجباري إن وُجد
  const selectedLeaveTypeDef = isLeave
    ? leaveTypes.find((lt) => lt.code === (fieldValues.leaveTypeCode ?? fieldValues.leaveType))
    : undefined
  // طريقة عدّ النوع (أيام تقويم/أيام عمل) ونص اليوم والمرفق من قواعد النوع — السيرفر بيفرضها
  const leaveCountsCalendarDays = countsCalendarDaysOf(selectedLeaveTypeDef)
  const leaveHalfDayOk = leaveHalfDayAllowed(selectedLeaveTypeDef)
  const leaveAttachmentLabel = leaveAttachmentName(selectedLeaveTypeDef)
  const leaveDaysNow = isHalfDay ? 0.5 : (fieldValues.days ?? '').trim() === '' ? null : Number(fieldValues.days)
  const leaveAttachmentRequired = leaveAttachmentRequiredNow(selectedLeaveTypeDef, leaveDaysNow) ? leaveAttachmentLabel : ''
  const leaveAttachmentRuleHint = leaveAttachmentRuleText(selectedLeaveTypeDef)
  // النوع مابيسمحش بنص يوم: نرجع ليوم كامل
  useEffect(() => {
    if (isLeave && !leaveHalfDayOk && leavePeriod !== 'FULL') changeLeavePeriod('FULL')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLeave, leaveHalfDayOk, leavePeriod])

  // إجازة يوم كامل والتاريخان محددان — حقل الأيام يعكس أيام العمل الفعلية (قراءة فقط)
  const leaveFrom = (fieldValues.fromDate ?? '').trim()
  const leaveTo = (fieldValues.toDate ?? '').trim()
  const fullDayLeaveDatesSet = isLeaveCategory && !isHalfDay && !!leaveFrom && !!leaveTo

  // حساب أيام العمل داخل مدى الإجازة (مؤجَّل + كاش لآخر مدى) وضبط حقل الأيام آلياً
  useEffect(() => {
    if (!isLeaveCategory || isHalfDay || !leaveFrom || !leaveTo || leaveFrom > leaveTo) {
      setWorkingDaysInfo(null)
      return
    }
    // لنفسه: جدول عمله (= خصم السيرفر)؛ نيابةً: جدول الموظف المختار نفسه (الأدمن ممكن يكون من غير فرع)
    const self = !onBehalf
    const employeeId = onBehalf && onBehalfEmployeeId ? Number(onBehalfEmployeeId) : undefined
    if (onBehalf && !employeeId) {
      setWorkingDaysInfo(null)
      return
    }
    if (
      workingDaysInfo &&
      workingDaysInfo.from === leaveFrom &&
      workingDaysInfo.to === leaveTo &&
      workingDaysInfo.self === self &&
      workingDaysInfo.employeeId === employeeId
    )
      return
    const timer = setTimeout(() => {
      fetchWorkingDays(leaveFrom, leaveTo, employeeId ? { employeeId } : { self })
        .then((res) => {
          setWorkingDaysInfo({ from: leaveFrom, to: leaveTo, self, employeeId, ...res })
          // ضبط عدد الأيام كما يحسبها السيرفر — فقط إن ظل المدى كما هو
          setFieldValues((prev) =>
            (prev.fromDate ?? '').trim() === leaveFrom &&
            (prev.toDate ?? '').trim() === leaveTo
              ? { ...prev, days: String(leaveCountsCalendarDays ? res.total : res.working) }
              : prev
          )
        })
        .catch(() => setWorkingDaysInfo(null))
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaveFrom, leaveTo, isLeaveCategory, isHalfDay, onBehalf, onBehalfEmployeeId, leaveCountsCalendarDays])

  // تلميح الخصم تحت حقل الأيام — كهرماني عند وجود عطلات داخل المدى، أحمر لو كله عطلات
  const workingDaysHint =
    fullDayLeaveDatesSet &&
    workingDaysInfo &&
    workingDaysInfo.from === leaveFrom &&
    workingDaysInfo.to === leaveTo ? (
      leaveCountsCalendarDays ? (
        <p className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mt-1.5">
          <AlertTriangle size={13} className="shrink-0" />
          النوع ده بيتحسب بأيام التقويم — العطلات والويك إند داخل المدى تُحسب وتُخصم
        </p>
      ) : workingDaysInfo.working === 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 mt-1.5">
          <AlertTriangle size={13} className="shrink-0" />
          كل الأيام المختارة عطلات — الطلب سيُرفض
        </p>
      ) : workingDaysInfo.skipped.length > 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-1.5">
          <AlertTriangle size={13} className="shrink-0" />
          سيُخصم {workingDaysInfo.working} يوم فقط — {workingDaysInfo.skipped.length}{' '}
          يوم عطلة/ويك إند داخل المدى لا يُحسب
        </p>
      ) : null
    ) : null

  // ودجة ذكية بحسب اسم الحقل — قائمة اختيار حقيقية بدل رقم خام (null = حقل عادي)
  const renderSmartField = (key: string) => {
    if (key === 'toTeamId')
      return (
        <select
          className="input w-full"
          value={fieldValues[key] ?? ''}
          onChange={(e) => setFieldValue(key, e.target.value)}
        >
          <option value="">— اختر الفريق —</option>
          {teams
            .filter((t) => t.isActive)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>
      )
    // الموظف المستلم (نقل عهدة) والموظف البديل (تبديل وردية): بحث بالاسم أو الكود — والقيمة id الموظف زي ما الخادم مستنيها
    if (EMPLOYEE_PICKER_FIELDS.includes(key))
      return (
        <EmployeePicker
          employees={employees}
          value={fieldValues[key] ?? ''}
          onChange={(id) => setFieldValue(key, id)}
          aria-label={humanizeKey(key)}
        />
      )
    if (key === 'assignmentId') {
      const activeCustody = (myCustody ?? []).filter((c) => c.status === 'ACTIVE')
      if (myCustody !== null && activeCustody.length === 0)
        return (
          <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center">
            <Package size={22} className="mx-auto text-gray-300 mb-1" />
            <p className="text-xs text-gray-500">لا توجد عهد نشطة باسمك</p>
          </div>
        )
      return (
        <select
          className="input w-full"
          value={fieldValues[key] ?? ''}
          onChange={(e) => setFieldValue(key, e.target.value)}
        >
          <option value="">
            {myCustody === null ? 'جارٍ تحميل عهدتك...' : '— اختر العهدة —'}
          </option>
          {activeCustody.map((c) => (
            <option key={c.id} value={c.id}>
              {c.assetName ?? 'أصل'}
              {c.serialNumber ? ` — ${c.serialNumber}` : ''}
            </option>
          ))}
        </select>
      )
    }
    if (key === 'punchType')
      return (
        <select
          className="input w-full"
          value={fieldValues[key] ?? ''}
          onChange={(e) => setFieldValue(key, e.target.value)}
        >
          <option value="">— اختر نوع البصمة —</option>
          <option value="IN">بصمة حضور</option>
          <option value="OUT">بصمة انصراف</option>
        </select>
      )
    // وقت الإذن (من/إلى): حقل وقت بدل الكتابة الحرة — لو نوع تاني معرّف
    // «من/إلى» تاريخ أو رقم في حقوله المخصّصة يفضل زي ما هو
    if (
      (key === 'from' || key === 'to') &&
      (isPermission || fieldKindOf(key, customFields.find((f) => f.key === key)?.type) === 'time')
    )
      return (
        <TimeSelect
          value={fieldValues[key] ?? ''}
          onChange={(v) => setFieldValue(key, v)}
          aria-label={humanizeKey(key)}
        />
      )
    if (key === 'time') {
      const tv = fieldValues[key] ?? ''
      const pt = fieldValues.punchType
      const hh = /^\d{2}:/.test(tv) ? Number(tv.slice(0, 2)) : null
      // تحذير غلطة ص/م الشائعة: بصمة حضور بعد الظهر أو انصراف في الصبح الباكر
      const amPmWarn =
        hh != null &&
        ((pt === 'IN' && hh >= 14) || (pt === 'OUT' && hh < 10))
      return (
        <>
          {/* وقت تصحيح البصمة كل 5 دقايق (البصمة الحقيقية مش على ربع ساعة)؛ أوقات الإذن فوق فاضلة كل ربع ساعة */}
          <TimeSelect
            value={tv}
            onChange={(v) => setFieldValue(key, v)}
            stepMinutes={5}
            aria-label={humanizeKey(key)}
          />
          {amPmWarn && (
            <p className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-1.5">
              <AlertTriangle size={13} className="shrink-0" />
              {pt === 'IN'
                ? `بصمة حضور الساعة ${tv}؟ تأكد من صباحاً/مساءً (ص/م)`
                : `بصمة انصراف الساعة ${tv}؟ تأكد من صباحاً/مساءً (ص/م)`}
            </p>
          )}
        </>
      )
    }
    if (key === 'leaveType' || key === 'leaveTypeCode') {
      const selected = leaveTypes.find((lt) => lt.code === fieldValues[key])
      return (
        <>
          <select
            className="input w-full"
            value={fieldValues[key] ?? ''}
            disabled={!!selectedTypeDef?.leaveTypeCode}
            onChange={(e) => setFieldValue(key, e.target.value)}
          >
            <option value="">— اختر نوع الإجازة —</option>
            {/* السيرفر يرجّع الفعّال فقط */}
            {leaveTypes.map((lt) => (
              <option key={lt.code} value={lt.code}>
                {lt.nameAr}
              </option>
            ))}
          </select>
          {selected &&
            ((selected.balanceType ?? 'none') !== 'none' ? (
              <p className="text-xs text-gray-500 mt-1.5">
                تُخصم من رصيد{' '}
                {selected.balanceType === 'annual'
                  ? 'الإجازة السنوية'
                  : 'الإجازة المرضية'}
              </p>
            ) : selected.isPaid === false ? (
              <p className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-1.5">
                <AlertTriangle size={13} className="shrink-0" />
                إجازة بدون راتب — تُخصم من الراتب
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1.5">
                إجازة مدفوعة لا تُخصم من الرصيد
              </p>
            ))}
          {selected && (
            <p className="text-xs text-gray-500 mt-1">{leaveRulesHint(selected)}</p>
          )}
        </>
      )
    }
    return null
  }

  // اسم نوع الإجازة بالعربي — من كتالوج الأنواع إن أمكن، وإلا النص كما هو
  const leaveTypeLabel = (code: string): string =>
    leaveTypes.find((t) => t.code === code)?.nameAr ??
    code
  // permissionType = معرّف النوع المختار (نصاً) — مرجع ثابت بدل الاسم القابل للتعديل
  const selectedPermissionDef = permissionTypes.find(
    (p) => String(p.id) === permissionType
  )

  // تغيير نطاق اليوم: نصف يوم ⇒ النهاية = البداية والأيام 0.5 تلقائياً
  const changeLeavePeriod = (p: 'FULL' | 'MORNING' | 'EVENING') => {
    setLeavePeriod(p)
    if (p !== 'FULL') {
      setFieldValues((prev) => ({
        ...prev,
        toDate: prev.fromDate ?? '',
        days: '0.5',
      }))
    } else {
      setFieldValues((prev) => ({ ...prev, days: '' }))
    }
  }

  // تعديل قيمة حقل مع مزامنة نصف اليوم (البداية تسحب النهاية معها)
  const setFieldValue = (key: string, value: string) => {
    setFieldValues((prev) => {
      const next = { ...prev, [key]: value }
      if (isHalfDay && key === 'fromDate') next.toDate = value
      return next
    })
  }

  const resetHolidayPicker = () => {
    setHolidayRange({ from: '', to: '' })
    setHolidayDays([])
    setHolidayPicked([])
    setHolidayError('')
    setHolidayManual(false)
    setHolidayLoading(false)
  }

  // الأيام المختارة هي مصدر قيمة الحمولة `dates` — نفس النص الذي كان يُكتب بالإيد
  const pickHolidayDays = (days: string[]) => {
    const sorted = [...new Set(days)].sort()
    setHolidayPicked(sorted)
    setFieldValue('dates', holidayDatesText(sorted))
  }

  // مدى «من/إلى» ← أيام العطلة الحقيقية جواه: نفس حساب الخادم الذي يحكم به على الطلب
  // (attendance/working-days يسأل calendarDay لكل يوم، وهو نفسه ما يرفض به «يوم عمل عادي ليك»)
  useEffect(() => {
    if (!isHolidayWork) return
    const { from, to } = holidayRange
    const today = localToday()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
      setHolidayDays([]); setHolidayError(''); setHolidayManual(false); setHolidayLoading(false)
      pickHolidayDays([])
      return
    }
    // نيابةً عن موظف: عطلات جدوله هو، مش جدول صاحب الحساب
    const employeeId = onBehalf && onBehalfEmployeeId ? Number(onBehalfEmployeeId) : undefined
    if (onBehalf && !employeeId) return
    const past = daysInRange(from, to).filter((day) => day <= today)
    if (past.length === 0) {
      setHolidayDays([]); setHolidayManual(false); setHolidayLoading(false)
      setHolidayError('المدى كله لسه ماجاش — قدّم على أيام العطلة اللي اشتغلتها فعلًا')
      pickHolidayDays([])
      return
    }
    let cancelled = false
    setHolidayLoading(true)
    setHolidayError('')
    const timer = setTimeout(() => {
      fetchWorkingDays(from, to, employeeId ? { employeeId } : { self: true })
        .then((res) => {
          if (cancelled) return
          // skipped = الأيام غير العمل لهذا الموظف (ويك إند + عطلة رسمية) = الأيام المقبولة في الطلب
          const holidays = res.skipped.filter((day) => day <= today).sort()
          setHolidayManual(false)
          setHolidayDays(holidays)
          setHolidayError(holidays.length === 0 ? 'مفيش أيام عطلة في المدى ده — كله أيام عمل عادية ليك' : '')
          // اختيار سابق (طلب مُرجَع للاستكمال مثلاً) يُحترم ما دام داخل المدى؛ وإلا كل الأيام مختارة
          const prior = holidayDatesList(fieldValues.dates).filter((day) => holidays.includes(day))
          pickHolidayDays(prior.length ? prior : holidays)
        })
        .catch((err) => {
          if (cancelled) return
          // تعذّر حساب العطلات: نفرد المدى يوم بيوم والمستخدم يعلّم اللي اشتغله — والخادم يبقى الحكم
          const manual = past.length <= HOLIDAY_WORK_MAX_DAYS
          setHolidayManual(manual)
          setHolidayDays(manual ? past : [])
          setHolidayError(err instanceof Error ? err.message : 'تعذّر تحديد أيام العطلة داخل المدى')
          pickHolidayDays([])
        })
        .finally(() => { if (!cancelled) setHolidayLoading(false) })
    }, 400)
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHolidayWork, holidayRange.from, holidayRange.to, onBehalf, onBehalfEmployeeId])

  // فلترة الأصول بالبحث وتجميعها حسب الفئة
  const filteredAssets = availableAssets.filter(
    (a) =>
      !assetSearch.trim() ||
      a.name.includes(assetSearch.trim()) ||
      a.category.includes(assetSearch.trim()) ||
      (a.serialNumber ?? '').toLowerCase().includes(assetSearch.trim().toLowerCase())
  )
  const assetsByCategory = filteredAssets.reduce<
    Record<string, typeof filteredAssets>
  >((acc, a) => {
    ;(acc[a.category] ??= []).push(a)
    return acc
  }, {})

  const toggleAsset = (id: number) =>
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const filtered = requests.filter(
    (r) =>
      (filter === 'all' ||
        (filter === 'IN_EXECUTION'
          ? ['APPROVED', 'IN_EXECUTION'].includes(r.status)
          : r.status === filter)) &&
      (r.type.includes(searchQuery) || r.displayId.includes(searchQuery))
  )

  const counts: Record<string, number> = {
    all: requests.length,
    UNDER_REVIEW: requests.filter((r) => r.status === 'UNDER_REVIEW').length,
    IN_EXECUTION: requests.filter((r) => ['APPROVED', 'IN_EXECUTION'].includes(r.status)).length,
    COMPLETED: requests.filter((r) => r.status === 'COMPLETED').length,
    REJECTED: requests.filter((r) => r.status === 'REJECTED').length,
    RETURNED_FOR_INFO: requests.filter((r) => r.status === 'RETURNED_FOR_INFO').length,
  }

  // رفع ملف لحقل «مرفق» — يخزّن المرجع file:N في قيمة الحقل
  const handleFileUpload = async (key: string, file: File | null) => {
    if (!file) return
    setUploadingField(key)
    setSubmitError(null)
    try {
      const res = await uploadFile(file, { entityType: 'request' })
      setFieldValues((prev) => ({ ...prev, [key]: res.ref }))
      setUploadedFiles((prev) => ({ ...prev, [key]: res.originalName }))
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'فشل رفع الملف')
    } finally {
      setUploadingField(null)
    }
  }

  const handleSubmit = async () => {
    if (!selectedTypeDef || submitting) return
    const payload: Record<string, unknown> = {}
    if (isCustodyRequest) {
      // طلب العهدة: أصول مختارة من المتاح + سبب حر
      if (selectedAssetIds.length === 0) {
        setSubmitError('اختر أصلاً واحداً على الأقل من قائمة الأصول المتاحة')
        return
      }
      payload.assetIds = selectedAssetIds
      if (custodyReason.trim()) payload.reason = custodyReason.trim()
    } else if (isLeaveCancel) {
      // إلغاء/تعديل إجازة: إجازة معتمدة مختارة + سبب حر
      if (!selectedLeaveId) {
        setSubmitError('اختر الإجازة المراد إلغاؤها')
        return
      }
      payload.leaveId = selectedLeaveId
      if (cancelReason.trim()) payload.reason = cancelReason.trim()
    } else if (isSalaryIncrease) {
      // النسبة وأساس الاعتماد يشتقهما الخادم؛ لا نعيد إرسال القيم الداخلية من طلب معاد للتصحيح.
      try { Object.assign(payload, salaryIncreaseRequestPayload(fieldValues, customFields, SMART_SELECT_FIELDS)) }
      catch (cause) { setSubmitError(cause instanceof Error ? cause.message : 'راجع مبلغ الزيادة وتاريخ سريانها.'); return }
    } else if (hasCustomFields) {
      // النموذج المبني من تعريف الحقول المخصّصة
      for (const f of customFields) {
        const raw = (fieldValues[f.key] ?? '').trim()
        payload[f.key] =
          (f.type === 'number' || SMART_SELECT_FIELDS.includes(f.key)) && raw !== ''
            ? Number(raw)
            : raw
      }
    } else {
      for (const f of requiredFields) {
        const raw = (fieldValues[f] ?? '').trim()
        payload[f] = isNumberField(f) && raw !== '' ? Number(raw) : raw
      }
    }
    if (isPermission) {
      if (!permissionType) {
        setSubmitError('اختر نوع الإذن')
        return
      }
      // الإذن بيغطي فترته بالظبط: البداية والنهاية مطلوبين ومختلفين (النهاية قبل البداية = بيعدّي نص الليل)
      const from = normalizeTime(fieldValues.from), to = normalizeTime(fieldValues.to)
      if (!from || !to) {
        setSubmitError('اختار وقت بداية ونهاية الإذن')
        return
      }
      const minutes = timeSpanMinutes(from, to) ?? 0
      if (minutes <= 0) {
        setSubmitError('وقت نهاية الإذن لازم يكون بعد وقت البداية')
        return
      }
      if (selectedPermissionDef?.maxDurationMinutes && minutes > selectedPermissionDef.maxDurationMinutes) {
        setSubmitError(`مدة الإذن ${minutes} دقيقة أكتر من الحد المسموح للمرة الواحدة (${selectedPermissionDef.maxDurationMinutes} دقيقة)`)
        return
      }
      payload.from = from
      payload.to = to
      // المعرّف مرجع الحساب، والاسم للعرض عند المعتمد (السيرفر يثبّتهما من الكتالوج)
      payload.permissionTypeId = Number(permissionType)
      payload.permissionType = selectedPermissionDef?.nameAr ?? ''
    }
    if (isOvertime) {
      if (!overtimePreviewCurrent || !overtimePreview || overtimePreviewLoading || !overtimePreview.canSubmit) {
        setSubmitError('راجع معاينة اليوم وعالج الملاحظات قبل إرسال طلب الإضافي')
        return
      }
      const hours = isAutomaticOvertime ? '' : (fieldValues.hours ?? '').trim()
      if ((overtimeHoursRequired && !hours) || (hours && (!Number.isFinite(Number(hours)) || Number(hours) <= 0 || Math.abs(Number(hours) * 60 - Math.round(Number(hours) * 60)) > 0.000001))) {
        setSubmitError('اكتب ساعات موجبة تعادل عددًا صحيحًا من الدقائق؛ مثال: 2.25 لساعتين وربع')
        return
      }
      const reason = (fieldValues.reason ?? '').trim()
      if (!overtimePreview.window.open && !reason) { setSubmitError('اكتب سبب طلب الإضافي داخل الفترة المغلقة'); return }
      payload.date = overtimeDate
      if (isAutomaticOvertime) delete payload.autoDetected
      if (hours) payload.hours = Number(hours)
      else delete payload.hours
      if (reason) payload.reason = reason
      else delete payload.reason
      payload.previewFingerprint = overtimePreview.fingerprint
    }
    if (isHolidayWork) {
      // الأيام من الشرائح المختارة لا من كتابة حرة — والصيغة المرسلة نفس صيغة اليوم (YYYY-MM-DD مفصولة بفاصلة)
      if (holidayPicked.length === 0) {
        setSubmitError('علّم يوم عطلة واحد على الأقل من أيام المدى')
        return
      }
      if (holidayPicked.length > HOLIDAY_WORK_MAX_DAYS) {
        setSubmitError(`أقصى عدد أيام في المرة الواحدة ${HOLIDAY_WORK_MAX_DAYS} يوم — ضيّق المدى`)
        return
      }
      payload.dates = holidayDatesText(holidayPicked)
    }
    if (isLeaveCategory) {
      payload.period = leavePeriod
      if (isHalfDay) {
        // نصف يوم: يوم واحد فقط + 0.5 يوم مهما كان المدخل
        payload.toDate = (fieldValues.fromDate ?? '').trim()
        payload.days = 0.5
      }
      // مرفق إجباري لنوع الإجازة (تقرير طبي/عقد…) — يُرحّل في payload.attachmentUrl
      const attachRef = (fieldValues.attachmentUrl ?? '').trim()
      if (leaveAttachmentRequired && !attachRef) {
        setSubmitError(
          `«${selectedLeaveTypeDef?.nameAr}» تتطلب إرفاق: ${leaveAttachmentRequired}`
        )
        return
      }
      if (attachRef) payload.attachmentUrl = attachRef
    }
    if (onBehalf && !onBehalfEmployeeId) {
      setSubmitError('اختر الموظف الذي تقدّم الطلب نيابة عنه')
      return
    }
    if (requestNote.trim()) payload.note = requestNote.trim()
    setSubmitting(true)
    setSubmitError(null)
    try {
      if (editingRequest) {
        await resubmitRequest(editingRequest.id, payload)
      } else await createRequest(
        selectedTypeDef.code,
        payload,
        true,
        onBehalf && onBehalfEmployeeId ? Number(onBehalfEmployeeId) : undefined,
        selectedTypeDef.definitionCode
      )
      setSelectedType('')
      setSelectedDefinition('')
      setEditingRequest(null)
      setReturnComment('')
      setFieldValues({})
      setUploadedFiles({})
      setRequestNote('')
      setSelectedAssetIds([])
      setAssetSearch('')
      setCustodyReason('')
      setLeavePeriod('FULL')
      setPermissionType('')
      setSelectedLeaveId(null)
      setCancelReason('')
      resetHolidayPicker()
      setOnBehalf(false)
      setOnBehalfEmployeeId('')
      setShowNewModal(false)
      await load()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'تعذّر إرسال الطلب')
    } finally {
      setSubmitting(false)
    }
  }

  const withdraw = async (id: number) => {
    if (!confirm('سحب الطلب؟ لن يظهر للمعتمدين بعد السحب.')) return
    try {
      await cancelRequest(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر سحب الطلب')
    }
  }

  const resubmit = async (id: number) => {
    try {
      const detail = await fetchRequest(id)
      const payload = parseJson<Record<string, unknown>>(detail.payload, {})
      if (isLeaveRequest(detail)) payload.leaveTypeCode = leaveCodeOf(payload, definitionCodeOf(detail))
      setEditingRequest(detail)
      setSelectedType(isLeaveRequest(detail) ? 'LEAVE' : detail.typeCode)
      setSelectedDefinition(definitionCodeOf(detail))
      setFieldValues(Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, typeof v === 'string' ? v : String(v ?? '')])))
      setUploadedFiles(Object.fromEntries(Object.entries(payload).filter(([, v]) => typeof v === 'string' && v.startsWith('file:')).map(([k]) => [k, 'مرفق محفوظ — يمكن استبداله'])))
      setRequestNote(String(payload.note ?? ''))
      setLeavePeriod(['MORNING', 'EVENING'].includes(String(payload.period)) ? payload.period as 'MORNING' | 'EVENING' : 'FULL')
      setPermissionType(String(payload.permissionTypeId ?? ''))
      setSelectedAssetIds(Array.isArray(payload.assetIds) ? payload.assetIds.map(Number) : [])
      setCustodyReason(String(payload.reason ?? ''))
      setSelectedLeaveId(payload.leaveId ? Number(payload.leaveId) : null)
      setCancelReason(String(payload.reason ?? ''))
      // «دوام يوم عطلة» مُرجَع للاستكمال: المدى يُشتق من الأيام المحفوظة ويُعاد حلّها من الخادم
      const savedHolidayDays = holidayDatesList(typeof payload.dates === 'string' ? payload.dates : undefined).sort()
      resetHolidayPicker()
      if (savedHolidayDays.length) {
        setHolidayPicked(savedHolidayDays)
        setHolidayRange({ from: savedHolidayDays[0], to: savedHolidayDays[savedHolidayDays.length - 1] })
      }
      setOnBehalf(false)
      const last = [...(detail.approvals ?? [])].reverse().find(a => ['RETURN', 'RETURNED_FOR_INFO'].includes(a.action))
      setReturnComment(last?.comment || 'راجع بيانات الطلب وأكمل المطلوب قبل إعادة الإرسال')
      setSubmitError(null)
      setShowNewModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إعادة إرسال الطلب')
    }
  }

  // التراجع عن الاستقالة خلال فترة الإشعار — يرجع الملف نشطاً ويلغي إنهاء الخدمة
  const withdrawResignation = async () => {
    if (!offboardingCase || withdrawingResignation) return
    if (!confirm('هترجع نشطاً ويتلغى ملف إنهاء الخدمة — متأكد؟')) return
    setWithdrawingResignation(true)
    try {
      await withdrawOffboarding(offboardingCase.id)
      setOffboardingCase(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر التراجع عن الاستقالة')
    } finally {
      setWithdrawingResignation(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">طلباتي</h1>
            <p className="text-gray-500 mt-1">
              قدّم طلباتك وتابع حالتها وخطوة الاعتماد الحالية
            </p>
          </div>
          <button
            onClick={() => { setEditingRequest(null); setReturnComment(''); setSelectedType(''); setFieldValues({}); setRequestNote(''); setSelectedAssetIds([]); setCustodyReason(''); setUploadedFiles({}); resetHolidayPicker(); setShowNewModal(true) }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            طلب جديد
          </button>
        </div>

        {/* بانر الاستقالة السارية — التراجع متاح خلال فترة الإشعار */}
        {offboardingCase && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-500 shrink-0" />
              <p className="text-sm font-medium text-amber-800">
                استقالتك سارية — آخر يوم عمل{' '}
                <span dir="ltr">{String(offboardingCase.lastWorkingDay).slice(0, 10)}</span>. يمكنك
                التراجع عنها خلال فترة الإشعار.
              </p>
            </div>
            <button
              onClick={withdrawResignation}
              disabled={withdrawingResignation}
              className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap"
            >
              {withdrawingResignation ? 'جارٍ التراجع...' : 'التراجع عن الاستقالة'}
            </button>
          </div>
        )}

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Status Filters */}
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  ['all', 'الكل'],
                  ['UNDER_REVIEW', 'قيد المراجعة'],
                  ['IN_EXECUTION', 'قيد التنفيذ'],
                  ['COMPLETED', 'مكتمل'],
                  ['REJECTED', 'مرفوض'],
                  ['RETURNED_FOR_INFO', 'مُرجَع إليّ'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    filter === id
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                  <span
                    className={`mr-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                      filter === id ? 'bg-white/20' : 'bg-white'
                    }`}
                  >
                    {counts[id] ?? 0}
                  </span>
                </button>
              ))}
              <div className="relative flex-1 max-w-xs mr-auto">
                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="بحث برقم الطلب أو النوع..."
                  className="input pr-10 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Requests List */}
            <div className="space-y-4">
              {filtered.map((req) => {
                const StatusIcon = statusIcons[req.status] ?? Clock
                return (
                  <div key={req.id} className="card p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-4 min-w-0 flex-1 basis-64">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${statusStyles[req.status] ?? 'bg-gray-100 text-gray-500'}`}
                        >
                          <StatusIcon size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-bold text-gray-800">{req.type}</h3>
                            <span className={`badge text-xs ${statusStyles[req.status] ?? 'bg-gray-100 text-gray-500'}`}>
                              {statusLabels[req.status] ?? 'قيد المعالجة'}
                            </span>
                            {req.onBehalfOfName && (
                              <span className="badge text-xs bg-indigo-50 text-indigo-700">
                                نيابة عن {req.onBehalfOfName}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{req.details}</p>
                          {req.destinationRecord && (
                            <p className="text-xs text-success-600 mt-1">
                              ✓ الوجهة: {req.destinationRecord}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1" dir="ltr">
                            {req.displayId} • {req.submittedAt}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button className="text-xs px-3 py-1.5 bg-gray-100 rounded-lg" onClick={async () => { try { setRequestDetail(await fetchRequest(req.id)) } catch (e) { setError(e instanceof Error ? e.message : 'تعذّر تحميل التفاصيل') } }}>التفاصيل والتعليقات</button>
                        <LetterDownloadButton reference={req.destinationRecord} />
                        {['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'RETURNED_FOR_INFO'].includes(req.status) && (
                          <button
                            onClick={() => withdraw(req.id)}
                            className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600"
                          >
                            سحب الطلب
                          </button>
                        )}
                        {req.status === 'RETURNED_FOR_INFO' && (
                          <button
                            onClick={() => resubmit(req.id)}
                            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                          >
                            استكمال وإعادة إرسال
                          </button>
                        )}
                      </div>
                    </div>

                    {/* سلسلة الاعتماد */}
                    {req.steps.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400">سلسلة الاعتماد:</span>
                        {req.steps.map((step, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                                step.state === 'done'
                                  ? 'bg-success-50 text-success-700'
                                  : step.state === 'current'
                                  ? 'bg-warning-50 text-warning-700 ring-1 ring-warning-300'
                                  : step.state === 'rejected'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-50 text-gray-400'
                              }`}
                            >
                              {step.state === 'done' && <CheckCircle2 size={12} />}
                              {step.state === 'current' && <Clock size={12} />}
                              {step.state === 'rejected' && <XCircle size={12} />}
                              {step.name}
                              {step.state === 'current' && ' (الآن)'}
                            </div>
                            {i < req.steps.length - 1 && (
                              <ChevronLeft size={14} className="text-gray-300" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {filtered.length === 0 && (
                <div className="card p-12 text-center">
                  <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">لا توجد طلبات مطابقة</p>
                </div>
              )}
            </div>
          </>
        )}

        {requestDetail && <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setRequestDetail(null)}>
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-xl font-bold">تفاصيل الطلب #{requestDetail.id}</h2><button onClick={() => setRequestDetail(null)} aria-label="إغلاق التفاصيل"><X size={22} /></button></div>
            <RequestEmployeeCard requester={requestDetail.requester} submittedBy={requestDetail.submittedBy} />
            <RequestPayload payload={requestDetail.payload} />
            <OvertimeRequestSummary overtime={requestDetail.overtime ?? undefined} reviewRequired={requestDetail.overtimeReviewRequired} />
            <LetterDownloadButton reference={requestDetail.destinationRef} />
            <h3 className="font-bold">تعليقات المعتمدين</h3>
            {(requestDetail.approvals ?? []).map(a => <div key={a.id} className="p-3 bg-gray-50 rounded-xl"><p className="text-sm font-medium">{({ APPROVE: 'اعتماد', APPROVED: 'اعتماد', REJECT: 'رفض', REJECTED: 'رفض', RETURN: 'إرجاع للاستكمال', RETURNED_FOR_INFO: 'إرجاع للاستكمال', ESCALATED: 'تصعيد', CANCELLED: 'إلغاء', EXECUTION_FAILED: 'تعذّر التنفيذ المجدول' } as Record<string, string>)[a.action] ?? a.action}</p><p className="text-sm whitespace-pre-wrap">{a.comment || 'بدون تعليق'}</p><time className="text-xs text-gray-400">{a.actedAt?.slice(0, 10)}</time></div>)}
            {!requestDetail.approvals?.length && <p className="text-gray-500 text-sm">لم تُسجّل تعليقات بعد</p>}
          </div></div>}
        {/* New Request Modal */}
        {showNewModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{editingRequest ? `استكمال الطلب #${editingRequest.id}` : 'تقديم طلب جديد'}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    الطلبات الظاهرة لك حسب ما حدده المسؤول في «بانِي الطلبات»
                  </p>
                </div>
                <button
                  onClick={() => setShowNewModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {editingRequest && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4"><p className="font-bold text-sm">تعليق المعتمد</p><p className="text-sm whitespace-pre-wrap">{returnComment}</p></div>}
                {submitError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">
                    {submitError}
                  </div>
                )}

                {/* التقديم نيابة عن موظف آخر — بصلاحية فقط (الخصم والمكافأة لكل منهما منتقي موظفه بنطاق النوع) */}
                {canOnBehalf && !editingRequest && !isMoneyRequest && (
                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-primary-500"
                        checked={onBehalf}
                        onChange={(e) => {
                          setOnBehalf(e.target.checked)
                          if (!e.target.checked) setOnBehalfEmployeeId('')
                        }}
                      />
                      <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                        <Users size={14} className="text-indigo-500" />
                        تقديم نيابة عن موظف آخر
                      </span>
                    </label>
                    {onBehalf && (
                      <>
                        <EmployeePicker
                          employees={employees}
                          value={onBehalfEmployeeId}
                          onChange={(id) => setOnBehalfEmployeeId(id)}
                          aria-label="الموظف المقدَّم عنه الطلب"
                          required
                        />
                        <p className="text-xs text-gray-500">
                          سيُسجَّل الطلب باسم الموظف وسيظهر أنك منشئه
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* فئات الكتالوج */}
                {!editingRequest && <>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      !selectedCategory ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    الكل
                  </button>
                  {availableCategories.map((catId) => {
                    const count = availableRequestTypes.filter((t) => t.category === catId).length
                    if (!count) return null
                    return (
                      <button
                        key={catId}
                        onClick={() => setSelectedCategory(selectedCategory === catId ? '' : catId)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                          selectedCategory === catId
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {categoryLabel(catId)} ({count})
                      </button>
                    )
                  })}
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2 relative">
                  {availableCategories
                    .filter((cat) => !selectedCategory || cat === selectedCategory)
                    .map((cat) => (
                      <div key={cat}>
                        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm px-1 py-1.5 text-xs font-bold text-gray-400">
                          {categoryLabel(cat)}
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {availableRequestTypes
                            .filter((t) => t.category === cat)
                            .map((t) => {
                              const def = getTypeByCode(t.code)
                              return (
                                <button
                                  key={t.code}
                                  disabled={!!editingRequest}
                                  onClick={() => {
                                    // القرار ب3 (خط الفلوس): «خصم» و«مكافأة» يفتحان نموذجهما داخل الشاشة — بلا انتقال
                                    setSelectedType(t.code)
                                    setSelectedDefinition(t.leaveProfiles?.length === 1 ? t.leaveProfiles[0].definitionCode ?? '' : '')
                                    setFieldValues(t.leaveProfiles?.length === 1 && t.leaveProfiles[0].leaveTypeCode
                                      ? { leaveTypeCode: t.leaveProfiles[0].leaveTypeCode } : {})
                                    setUploadedFiles({})
                                    setSelectedAssetIds([])
                                    setAssetSearch('')
                                    setCustodyReason('')
                                    setLeavePeriod('FULL')
                                    setPermissionType('')
                                    setSelectedLeaveId(null)
                                    setCancelReason('')
                                    resetHolidayPicker()
                                    setSubmitError(null)
                                  }}
                                  className={`p-4 rounded-xl border-2 text-right transition-all flex items-center justify-between ${
                                    selectedType === t.code
                                      ? 'border-primary-500 bg-primary-50'
                                      : 'border-gray-100 hover:border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <FileText
                                      size={20}
                                      className={
                                        selectedType === t.code ? 'text-primary-600' : 'text-gray-400'
                                      }
                                    />
                                    <div>
                                      <p className="font-bold text-gray-800 text-sm">
                                        {t.nameAr}
                                        {t.autoGeneratesPdf && (
                                          <span className="mr-2 badge text-[10px] bg-teal-50 text-teal-700">PDF آلي</span>
                                        )}
                                        {/* D12: الطلب المعتمد هو السجل — بلا أثر آلي على الملف أو الراتب */}
                                        {t.executionMode === 'RECORD_ONLY' && (
                                          <span className="mr-2 badge text-[10px] bg-amber-50 text-amber-700" title="الطلب المعتمد هو السجل — لا يُنفَّذ أثر آلي">
                                            {t.executionLabel ?? 'تسجيل فقط'}
                                          </span>
                                        )}
                                        {t.isConfidential && (
                                          <span className="mr-2 badge text-[10px] bg-gray-800 text-white">
                                            <EyeOff size={9} className="inline ml-0.5" />
                                            سرّي
                                          </span>
                                        )}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {t.leaveProfiles && t.leaveProfiles.length > 1 ? 'اختر نموذج الإجازة لعرض مسار اعتماده' : <>السلسلة: {t.approvalChainName ?? 'حسب إعدادات نوع الطلب'} • التنفيذ:{' '}
                                        {/* «سجل فقط» صريح — حتى لو الكتالوج المحلي بيوصف وجهة أخرى (REQ-3) */}
                                        {t.destinationHandler === 'none' || t.executionMode === 'RECORD_ONLY'
                                          ? handlerLabels.none
                                          : handlerLabels[t.destinationHandler] ??
                                            '—'}</>}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg whitespace-nowrap">
                                    <Users size={12} />
                                    {categoryLabel(t.category)}
                                  </span>
                                </button>
                              )
                            })}
                        </div>
                      </div>
                    ))}
                  {availableRequestTypes.length === 0 && (
                    <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center">
                      <ClipboardList size={28} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">
                        لا توجد أنواع طلبات متاحة لك حالياً
                      </p>
                    </div>
                  )}
                </div>
                </>}

                {selectedType === 'LEAVE' && leaveProfiles.length > 1 && (
                  <div className="space-y-2">
                    <label htmlFor="leave-request-profile" className="block text-sm font-medium text-gray-700">نموذج الإجازة *</label>
                    <select id="leave-request-profile" className="input w-full" disabled={!!editingRequest}
                      value={selectedDefinition} onChange={(e) => {
                        const profile = leaveProfiles.find(p => p.definitionCode === e.target.value)
                        setSelectedDefinition(e.target.value)
                        setFieldValues(profile?.leaveTypeCode ? { leaveTypeCode: profile.leaveTypeCode } : {})
                        setUploadedFiles({}); setSubmitError(null)
                      }}>
                      <option value="">— اختر النموذج —</option>
                      {leaveProfiles.map(profile => <option key={profile.definitionCode} value={profile.definitionCode}>{profile.nameAr}</option>)}
                    </select>
                    {selectedTypeDef && <p className="text-xs text-gray-500">السلسلة: {selectedTypeDef.approvalChainName} • {handlerLabels[selectedTypeDef.destinationHandler] ?? 'إجازة'}</p>}
                  </div>
                )}

                {/* «خصم»: النموذج الحقيقي داخل الشاشة — أنواع الخصومات وقيمتها بطريقة حسابها وشهر المسير
                    والموظف والسبب والمرفق والأقساط، ثم سلسلة اعتماد النوع حتى الموارد البشرية */}
                {selectedType && isPayrollDeduction && <DeductionRequestForm onSubmitted={load} />}

                {/* «مكافأة»: نفس الحكاية — أنواع المكافآت وقيمتها بطريقة حسابها وشهر المسير والموظف
                    والسبب ومرجع المستند، ومعاينة حيّة للمبلغ والسلسلة من الخادم قبل الإرسال */}
                {selectedType && isPayrollBonus && <BonusRequestForm onSubmitted={load} />}

                {/* تصحيح/طلب بصمة: تلميح تعبئة البصمة الناقصة */}
                {selectedType && isPunchCorrection && (
                  <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 rounded-xl px-3 py-2.5">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <span>
                      حدد البصمة الناقصة (حضور أو انصراف) ووقتها — بعد الاعتماد
                      تُطبَّق على يومك تلقائياً
                    </span>
                  </div>
                )}

                {/* «دوام يوم عطلة»: مدى «من/إلى» والنظام يطلّع أيام العطلة الحقيقية جواه شرائح تُعلَّم —
                    المستخدم ما بيكتبش تواريخ بإيده، والمُرسَل يفضل نفس نص الأيام المفصولة بفاصلة */}
                {selectedType && isHolidayWork && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 rounded-xl px-3 py-2.5">
                      <Info size={14} className="shrink-0 mt-0.5" />
                      <span>
                        حدد مدى «من / إلى» والنظام يطلّع لك أيام العطلة اللي جواه (ويك إند وعطلات رسمية حسب جدولك
                        وفرعك) — شيل اللي ما اشتغلتوش. يوم العمل العادي مابيظهرش أصلاً، والخادم بيرفضه لو اتبعت.
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="holiday-work-from" className="block text-sm font-medium text-gray-700 mb-2">من تاريخ <span className="text-red-500">*</span></label>
                        <input
                          id="holiday-work-from"
                          type="date"
                          dir="ltr"
                          max={localToday()}
                          className="input w-full"
                          value={holidayRange.from}
                          onChange={(e) => setHolidayRange((range) => ({ from: e.target.value, to: range.to && range.to >= e.target.value ? range.to : e.target.value }))}
                        />
                      </div>
                      <div>
                        <label htmlFor="holiday-work-to" className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ <span className="text-red-500">*</span></label>
                        <input
                          id="holiday-work-to"
                          type="date"
                          dir="ltr"
                          min={holidayRange.from || undefined}
                          max={localToday()}
                          className="input w-full"
                          value={holidayRange.to}
                          onChange={(e) => setHolidayRange((range) => ({ ...range, to: e.target.value }))}
                        />
                      </div>
                    </div>
                    {holidayLoading && <p className="text-xs text-gray-500">جارٍ تحديد أيام العطلة داخل المدى…</p>}
                    {holidayError && (
                      <p role="alert" className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                        <AlertTriangle size={13} className="shrink-0" />
                        {holidayError}
                      </p>
                    )}
                    {holidayManual && holidayDays.length > 0 && (
                      <p className="text-xs text-gray-500">
                        تعذّر تمييز العطلات آلياً — دي كل أيام المدى؛ علّم اللي اشتغلته فعلاً، والخادم بيرفض أي يوم عمل عادي.
                      </p>
                    )}
                    {holidayDays.length > 0 && (
                      <>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <label className="block text-sm font-medium text-gray-700">
                            أيام العطلة اللي اشتغلتها <span className="text-red-500">*</span>
                          </label>
                          <div className="flex gap-2">
                            <button type="button" className="text-xs px-2.5 py-1 bg-gray-100 rounded-lg hover:bg-gray-200" onClick={() => pickHolidayDays(holidayDays)}>اختر الكل</button>
                            <button type="button" className="text-xs px-2.5 py-1 bg-gray-100 rounded-lg hover:bg-gray-200" onClick={() => pickHolidayDays([])}>امسح الكل</button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {holidayDays.map((day) => {
                            const picked = holidayPicked.includes(day)
                            return (
                              <button
                                key={day}
                                type="button"
                                aria-pressed={picked}
                                dir="ltr"
                                onClick={() => pickHolidayDays(picked ? holidayPicked.filter((value) => value !== day) : [...holidayPicked, day])}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                  picked
                                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                              >
                                {picked ? <CheckCircle2 size={12} /> : <X size={12} />}
                                {day}
                              </button>
                            )
                          })}
                        </div>
                        <p className="text-xs text-gray-500">
                          {holidayPicked.length === 0
                            ? 'علّم يوم عطلة واحد على الأقل قبل الإرسال'
                            : `${holidayPicked.length} يوم مختار من ${holidayDays.length} يوم عطلة في المدى`}
                          {holidayPicked.length > HOLIDAY_WORK_MAX_DAYS && ` — أقصى عدد أيام في المرة الواحدة ${HOLIDAY_WORK_MAX_DAYS} يوم`}
                        </p>
                      </>
                    )}
                    {/* رفض الخادم يظهر مقروءاً هنا كمان، جنب الشرائح اللي المستخدم محتاج يعدّلها */}
                    {submitError && /يوم عمل عادي|أيام عمل عادية/.test(submitError) && (
                      <p role="alert" className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
                        <AlertTriangle size={13} className="shrink-0" />
                        {submitError} — شيل الأيام دي من اختيارك.
                      </p>
                    )}
                  </div>
                )}

                {/* طلب إجازة موحّد: اختر نوع الإجازة ثم المدة — النظام يطبّق القاعدة */}
                {selectedType && isLeave && (
                  <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 rounded-xl px-3 py-2.5">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <span>
                      اختر نوع الإجازة ثم المدة ونطاق اليوم — يُطبَّق خصم الرصيد
                      المناسب تلقائياً بعد الاعتماد
                    </span>
                  </div>
                )}

                {/* طلب عهدة: اختيار أصول متعددة من المتاح فقط */}
                {selectedType && isCustodyRequest && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الأصول المطلوبة
                        <span className="text-red-500 mr-1">*</span>
                      </label>
                      <div className="relative mb-2">
                        <Search
                          size={16}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="text"
                          className="input pr-9 w-full"
                          placeholder="ابحث بالاسم أو الفئة أو الرقم التسلسلي..."
                          value={assetSearch}
                          onChange={(e) => setAssetSearch(e.target.value)}
                        />
                      </div>
                      {assetsLoading ? (
                        <div className="flex justify-center py-6">
                          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : filteredAssets.length === 0 ? (
                        <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center">
                          <Package size={28} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-sm text-gray-500">
                            {availableAssets.length === 0
                              ? 'لا توجد أصول متاحة حالياً'
                              : 'لا توجد أصول مطابقة للبحث'}
                          </p>
                        </div>
                      ) : (
                        <div className="border border-gray-100 rounded-xl max-h-64 overflow-y-auto">
                          {Object.entries(assetsByCategory).map(([cat, assets]) => (
                            <div key={cat}>
                              <div className="sticky top-0 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500">
                                {cat}
                              </div>
                              {assets.map((a) => (
                                <label
                                  key={a.id}
                                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-gray-50 last:border-b-0 transition-colors ${
                                    selectedAssetIds.includes(a.id)
                                      ? 'bg-primary-50'
                                      : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 accent-primary-500"
                                    checked={selectedAssetIds.includes(a.id)}
                                    onChange={() => toggleAsset(a.id)}
                                  />
                                  <span className="text-sm text-gray-700 flex-1">
                                    {a.name}
                                  </span>
                                  {a.serialNumber && (
                                    <span
                                      className="text-[11px] text-gray-400"
                                      dir="ltr"
                                    >
                                      {a.serialNumber}
                                    </span>
                                  )}
                                </label>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedAssetIds.length > 0 && (
                        <p className="text-xs text-primary-600 mt-2">
                          {payloadValueLabel('assetIds', selectedAssetIds)} ضمن
                          الطلب — يتحقق النظام من توفرها عند الإرسال
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        سبب الطلب
                      </label>
                      <input
                        type="text"
                        className="input w-full"
                        placeholder="مثال: عهدة جهاز للعمل الميداني"
                        value={custodyReason}
                        onChange={(e) => setCustodyReason(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* إلغاء/تعديل إجازة: اختيار الإجازة المعتمدة المراد إلغاؤها */}
                {selectedType && isLeaveCancel && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الإجازة المراد إلغاؤها
                        <span className="text-red-500 mr-1">*</span>
                      </label>
                      {myLeavesLoading ? (
                        <div className="flex justify-center py-6">
                          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : myLeaves.length === 0 ? (
                        <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center">
                          <ClipboardList size={28} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-sm text-gray-500">
                            لا توجد إجازات معتمدة قابلة للإلغاء
                          </p>
                        </div>
                      ) : (
                        <div className="border border-gray-100 rounded-xl max-h-64 overflow-y-auto">
                          {myLeaves.map((l) => (
                            <label
                              key={l.id}
                              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-gray-50 last:border-b-0 transition-colors ${
                                selectedLeaveId === l.id
                                  ? 'bg-primary-50'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name="leaveToCancel"
                                className="w-4 h-4 accent-primary-500"
                                checked={selectedLeaveId === l.id}
                                onChange={() => setSelectedLeaveId(l.id)}
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800">
                                  {leaveTypeLabel(l.leaveType)}
                                  {(l.period === 'MORNING' || l.period === 'EVENING') && (
                                    <span className="mr-2 badge text-[10px] bg-amber-50 text-amber-700">
                                      نصف يوم — {periodLabels[l.period]}
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  من {String(l.fromDate).slice(0, 10)} إلى{' '}
                                  {String(l.toDate).slice(0, 10)} • {Number(l.days)} يوم
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        سبب الإلغاء
                      </label>
                      <input
                        type="text"
                        className="input w-full"
                        placeholder="مثال: تأجّل السفر ولن أستخدم الإجازة"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* استئذان: نوع الإذن من كتالوج الإعدادات */}
                {selectedType && isPermission && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      نوع الإذن
                      <span className="text-red-500 mr-1">*</span>
                    </label>
                    <select
                      className="input w-full"
                      value={permissionType}
                      onChange={(e) => setPermissionType(e.target.value)}
                    >
                      <option value="">— اختر نوع الإذن —</option>
                      {permissionTypes
                        .filter((p) => p.isActive)
                        .map((p) => (
                          <option key={p.id} value={String(p.id)}>
                            {p.nameAr}
                          </option>
                        ))}
                    </select>
                    {selectedPermissionDef?.maxDurationMinutes ? (
                      <p className="text-xs text-gray-500 mt-1.5">
                        الحد الأقصى للمرة الواحدة: {selectedPermissionDef.maxDurationMinutes} دقيقة
                      </p>
                    ) : null}
                    {!selectedPermissionDef?.isDeductible && selectedPermissionDef?.monthlyFreeMinutes ? (
                      <p className="text-xs text-gray-500 mt-1">
                        رصيد الشهر: {selectedPermissionDef.monthlyFreeMinutes} دقيقة — تتقسم على أكتر من إذن أو تتاخد مرة واحدة
                      </p>
                    ) : null}
                    {(timeSpanMinutes(fieldValues.from, fieldValues.to) ?? 0) > 0 && (
                      <p className="text-xs text-gray-600 mt-1">
                        مدة الإذن: {timeSpanMinutes(fieldValues.from, fieldValues.to)} دقيقة
                        {(normalizeTime(fieldValues.to) ?? '') < (normalizeTime(fieldValues.from) ?? '') ? ' (بيعدّي نص الليل)' : ''}
                        {' '}— الإذن بيغطي الفترة دي بس، وأي تأخير أو خروج بدري براها بيتحسب عادي
                      </p>
                    )}
                    {selectedPermissionDef?.isDeductible && (
                      <p className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-1.5">
                        <AlertTriangle size={13} className="shrink-0" />
                        هذا النوع يُخصم من الراتب (الدقائق المتداخلة مع التأخير)
                      </p>
                    )}
                  </div>
                )}

                {/* النموذج من تعريف الحقول المخصّصة — يحل محل الاستنتاج القديم */}
                {selectedType && hasCustomFields && !isCustodyRequest && !isLeaveCancel && !isMoneyRequest && (
                  <div className="grid grid-cols-2 gap-3">
                    {customFields.filter(f => f.key !== 'dates' || !isHolidayWork).filter(f => !isOvertime || !['date', 'hours', 'reason', ...(isAutomaticOvertime ? ['autoDetected'] : [])].includes(f.key)).map((f) => (
                      <div key={f.key} className={f.type === 'file' || fieldKindOf(f.key, f.type) === 'textarea' ? 'col-span-2' : ''}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {customFieldLabel(f)}
                          {f.required && <span className="text-red-500 mr-1">*</span>}
                        </label>
                        {renderSmartField(f.key) ??
                        (f.type === 'select' ? (
                          <select
                            className="input w-full"
                            value={fieldValues[f.key] ?? ''}
                            onChange={(e) => setFieldValue(f.key, e.target.value)}
                          >
                            <option value="">— اختر —</option>
                            {(f.options ?? []).map((o) => (
                              <option key={o} value={o}>
                                {optionLabel(o)}
                              </option>
                            ))}
                          </select>
                        ) : f.type === 'file' ? (
                          <label
                            className={`flex items-center gap-2 p-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                              uploadedFiles[f.key]
                                ? 'border-success-300 bg-success-50'
                                : 'border-gray-200 hover:border-primary-300'
                            }`}
                          >
                            <Paperclip
                              size={16}
                              className={
                                uploadedFiles[f.key]
                                  ? 'text-success-500'
                                  : 'text-gray-400'
                              }
                            />
                            <span className="text-sm text-gray-600 flex-1 truncate">
                              {uploadingField === f.key
                                ? 'جارٍ رفع الملف...'
                                : uploadedFiles[f.key] ?? 'اختر ملفاً للرفع'}
                            </span>
                            {uploadingField === f.key && (
                              <span className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            )}
                            {uploadedFiles[f.key] && uploadingField !== f.key && (
                              <CheckCircle2 size={16} className="text-success-500" />
                            )}
                            <input
                              type="file"
                              className="hidden"
                              disabled={uploadingField !== null}
                              onChange={(e) =>
                                handleFileUpload(f.key, e.target.files?.[0] ?? null)
                              }
                            />
                          </label>
                        ) : fieldKindOf(f.key, f.type) === 'textarea' ? (
                          <textarea
                            className="input w-full min-h-[80px]"
                            maxLength={isSalaryIncrease && f.key === 'reason' ? 500 : 1000}
                            value={fieldValues[f.key] ?? ''}
                            onChange={(e) => setFieldValue(f.key, e.target.value)}
                          />
                        ) : (
                          <input
                            type={
                              fieldKindOf(f.key, f.type) === 'number'
                                ? 'number'
                                : fieldKindOf(f.key, f.type) === 'month'
                                ? 'month'
                                : fieldKindOf(f.key, f.type) === 'date'
                                ? 'date'
                                : 'text'
                            }
                            step={fieldKindOf(f.key, f.type) === 'number' ? payloadNumberProps(f.key).step : undefined}
                            min={fieldKindOf(f.key, f.type) === 'number' ? payloadNumberProps(f.key).min : undefined}
                            className="input w-full disabled:bg-gray-50 disabled:text-gray-400 read-only:bg-gray-50 read-only:text-gray-500"
                            dir={['date', 'month', 'number'].includes(fieldKindOf(f.key, f.type)) ? 'ltr' : undefined}
                            inputMode={isSalaryIncrease && f.key === 'newSalary' ? 'decimal' : undefined}
                            maxLength={isSalaryIncrease ? f.key === 'newSalary' ? 19 : f.key === 'reason' ? 500 : undefined : undefined}
                            disabled={
                              isHalfDay && (f.key === 'toDate' || f.key === 'days')
                            }
                            readOnly={f.key === 'days' && fullDayLeaveDatesSet}
                            value={fieldValues[f.key] ?? ''}
                            onChange={(e) => setFieldValue(f.key, e.target.value)}
                          />
                        ))}
                        {f.key === 'days' && workingDaysHint}
                      </div>
                    ))}
                  </div>
                )}

                {isSalaryIncrease && <p className="text-sm text-amber-800">زيادة الراتب تُطبّق بعد الاعتماد حسب تاريخ السريان؛ التاريخ المستقبلي لا يغيّر الأجر الحالي قبل موعده. نسبة الزيادة تُحتسب من الأجر المثبت في النظام.</p>}
                {/* الاستنتاج القديم — عند غياب الحقول المخصّصة */}
                {selectedType &&
                  !hasCustomFields &&
                  !isCustodyRequest &&
                  !isLeaveCancel &&
                  !isMoneyRequest &&
                  requiredFields.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {requiredFields.filter(f => f !== 'dates' || !isHolidayWork).filter(f => !isOvertime || !['date', 'hours', 'reason', ...(isAutomaticOvertime ? ['autoDetected'] : [])].includes(f)).map((f) => (
                        <div key={f} className={payloadFieldKind(f) === 'textarea' ? 'col-span-2' : ''}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {humanizeKey(f)}
                          </label>
                          {renderSmartField(f) ?? (payloadFieldKind(f) === 'textarea' ? (
                            <textarea
                              className="input w-full min-h-[80px]"
                              maxLength={1000}
                              value={fieldValues[f] ?? ''}
                              onChange={(e) => setFieldValue(f, e.target.value)}
                            />
                          ) : (
                            <input
                              type={
                                isDateField(f) ? 'date' : payloadFieldKind(f) === 'month' ? 'month' : isNumberField(f) ? 'number' : 'text'
                              }
                              step={isNumberField(f) ? payloadNumberProps(f).step : undefined}
                              min={isNumberField(f) ? payloadNumberProps(f).min : undefined}
                              className="input w-full disabled:bg-gray-50 disabled:text-gray-400 read-only:bg-gray-50 read-only:text-gray-500"
                              dir={['date', 'month', 'number'].includes(payloadFieldKind(f)) ? 'ltr' : undefined}
                              disabled={isHalfDay && (f === 'toDate' || f === 'days')}
                              readOnly={f === 'days' && fullDayLeaveDatesSet}
                              value={fieldValues[f] ?? ''}
                              onChange={(e) => setFieldValue(f, e.target.value)}
                            />
                          ))}
                          {f === 'days' && workingDaysHint}
                        </div>
                      ))}
                    </div>
                  )}

                {isOvertime && <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label htmlFor="overtime-date" className="block text-sm font-medium text-gray-700 mb-2">تاريخ العمل <span className="text-red-500">*</span></label><input id="overtime-date" type="date" readOnly={isAutomaticOvertime} className="input w-full read-only:bg-gray-50" value={overtimeDate} onChange={event => setFieldValue('date', event.target.value)} /></div>
                    {!isAutomaticOvertime && <div><label htmlFor="overtime-hours" className="block text-sm font-medium text-gray-700 mb-2">الساعات المطلوبة {overtimeHoursRequired ? <span className="text-red-500">*</span> : '(اختياري)'}</label><input id="overtime-hours" type="number" min="0" step="any" className="input w-full" placeholder="مثال: 2.25" value={fieldValues.hours ?? ''} onChange={event => setFieldValue('hours', event.target.value)} /><p className="text-xs text-gray-500 mt-1">عند تركها فارغة يُستخدم وقت النظام، إلا للمستثنى من الحضور.</p></div>}
                  </div>
                  <OvertimePreview preview={overtimePreviewCurrent ? overtimePreview : null} loading={overtimePreviewLoading} error={overtimePreviewError} onRefresh={() => setOvertimePreviewRevision(value => value + 1)} />
                  <div><label htmlFor="overtime-reason" className="block text-sm font-medium text-gray-700 mb-2">سبب طلب الإضافي {overtimePreview && !overtimePreview.window.open && <span className="text-red-500">*</span>}</label><textarea id="overtime-reason" rows={3} maxLength={500} className="input w-full" value={fieldValues.reason ?? ''} onChange={event => setFieldValue('reason', event.target.value)} placeholder="اشرح العمل الذي استلزم وقتًا إضافيًا" /></div>
                </div>}

                {/* الإجازات: نطاق اليوم — كامل أو نصف صباحي/مسائي */}
                {selectedType && isLeaveCategory && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      نطاق اليوم
                    </label>
                    <select
                      className="input w-full"
                      value={leavePeriod}
                      onChange={(e) =>
                        changeLeavePeriod(
                          e.target.value as 'FULL' | 'MORNING' | 'EVENING'
                        )
                      }
                    >
                      <option value="FULL">يوم كامل</option>
                      {/* نص اليوم بيظهر بس لو نوع الإجازة بيسمح بيه */}
                      {(!isLeave || leaveHalfDayOk) && (
                        <>
                          <option value="MORNING">النصف الصباحي</option>
                          <option value="EVENING">النصف المسائي</option>
                        </>
                      )}
                    </select>
                    {isHalfDay && (
                      <p className="text-xs text-gray-500 mt-1.5">
                        إجازة نصف يوم: تاريخ النهاية يُطابق البداية وعدد الأيام 0.5
                        تلقائياً
                      </p>
                    )}
                  </div>
                )}

                {/* مرفق إجباري لنوع الإجازة المختار (تقرير طبي/عقد زواج…) */}
                {selectedType && isLeave && leaveAttachmentLabel && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {leaveAttachmentRequired ? (
                        <>
                          مرفق مطلوب: {leaveAttachmentRequired}{' '}
                          <span className="text-red-500">*</span>
                        </>
                      ) : (
                        `مرفق: ${leaveAttachmentLabel} (اختياري)`
                      )}
                    </label>
                    {/* قاعدة النوع بنصها جنب زر الرفع (مطلوب / اختياري / فوق N يوم) */}
                    <p className="text-xs text-gray-500 mb-2">{leaveAttachmentRuleHint}</p>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-primary-500 transition-colors">
                      {fieldValues.attachmentUrl ? (
                        <div className="flex items-center justify-center gap-2 text-success-700 text-sm">
                          <CheckCircle2 size={16} />
                          <span className="truncate max-w-[200px]">
                            {uploadedFiles.attachmentUrl ?? 'تم الإرفاق'}
                          </span>
                          <button
                            type="button"
                            className="text-red-500 text-xs underline"
                            onClick={() => {
                              setFieldValue('attachmentUrl', '')
                              setUploadedFiles((prev) => {
                                const next = { ...prev }
                                delete next.attachmentUrl
                                return next
                              })
                            }}
                          >
                            إزالة
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer text-sm text-primary-600 font-medium hover:underline">
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) =>
                              handleFileUpload(
                                'attachmentUrl',
                                e.target.files?.[0] ?? null
                              )
                            }
                          />
                          {uploadingField === 'attachmentUrl'
                            ? 'جارٍ الرفع...'
                            : 'اختر ملف للإرفاق'}
                        </label>
                      )}
                    </div>
                  </div>
                )}

                {selectedType && !isMoneyRequest && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تفاصيل الطلب
                    </label>
                    <textarea
                      value={requestNote}
                      onChange={(e) => setRequestNote(e.target.value)}
                      className="input w-full h-24 resize-none"
                      placeholder="اكتب تفاصيل طلبك... (حقول النموذج الكاملة تُبنى حسب نوع الطلب)"
                    />
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={() => setShowNewModal(false)} className="btn-secondary">
                  {isMoneyRequest ? 'إغلاق' : 'إلغاء'}
                </button>
                {/* «خصم» و«مكافأة» لكل منهما زر إرساله داخل نموذجه (نقطة المال لا محرك الطلبات العام) */}
                {!isMoneyRequest && (
                <button
                  onClick={handleSubmit}
                  className="btn-primary flex items-center gap-2"
                  disabled={!selectedTypeDef || submitting || uploadingField !== null
                    // مرفق نوع الإجازة مطلوب مع الطلب ولم يُرفع — السيرفر يرفض التقديم
                    || !!(leaveAttachmentRequired && !(fieldValues.attachmentUrl ?? '').trim())
                    || (isOvertime && (overtimePreviewLoading || !overtimePreviewCurrent || !overtimePreview?.canSubmit))}
                >
                  <Send size={16} />
                  {submitting ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
                </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
