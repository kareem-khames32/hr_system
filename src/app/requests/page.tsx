'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
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
  fetchMyRequests,
  createRequest,
  cancelRequest,
  resubmitRequest,
  uploadFile,
  fetchAvailableAssets,
  fetchCatalog,
  fetchEmployees,
  fetchMyApprovedLeaves,
  fetchMyOffboardingCase,
  withdrawOffboarding,
  can,
  type ApiRequest,
  type ApiRequestType,
  type ApiEmployee,
  type ApiLeave,
  type CustomFieldDef,
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
  it: 'تقنية المعلومات',
  specific_employee: 'موظف بعينه',
}

const fieldLabels: Record<string, string> = {
  date: 'التاريخ',
  fromDate: 'من تاريخ',
  toDate: 'إلى تاريخ',
  effectiveDate: 'تاريخ السريان',
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
  leaveId: 'رقم الإجازة',
  loanId: 'رقم السلفة',
  withEmployeeId: 'رقم الموظف البديل',
  toEmployeeId: 'رقم الموظف المستلم',
  toTeamId: 'رقم الفريق الجديد',
  toTitle: 'المسمى الجديد',
  assignmentId: 'رقم العهدة',
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

// نطاق اليوم للإجازات — القيم كود، والعرض عربي دائماً
const periodLabels: Record<string, string> = {
  FULL: 'يوم كامل',
  MORNING: 'النصف الصباحي',
  EVENING: 'النصف المسائي',
}

// وجهات التنفيذ — للأنواع المبنية من «بانِي الطلبات» (بدون تسريب كود الـ handler)
const handlerLabels: Record<string, string> = {
  none: 'الطلب نفسه هو السجل',
  leave_calendar_balance: 'إجازة تُخصم من الرصيد',
  leave_calendar_payroll: 'إجازة بلا خصم رصيد',
  leave_calendar: 'التقويم',
  leave_calendar_once: 'التقويم (مرة في الخدمة)',
  leave_balance_restore: 'إرجاع رصيد الإجازة',
  overtime_entries: 'قيد أوفرتايم',
  attendance_log: 'سجل الحضور',
  attendance_corrections: 'تصحيح بصمة',
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
  letter_pdf_generator: 'خطاب PDF',
  custody_assignments_ack: 'عهدة بتأكيد استلام',
  custody_assignments: 'سجل العهد',
  custody_finance: 'العهدة والمالية',
  employee_status: 'تغيير حالة وظيفية',
  document_vault: 'خزنة الوثائق',
  expense_register: 'سجل المصروفات',
  training_register: 'سجل التدريب',
  training_expense: 'مصروفات التدريب',
}

const isDateField = (f: string) => f === 'date' || f.includes('Date')
const isNumberField = (f: string) =>
  /days|hours|amount|months|salary|pct/i.test(f) || /Id$/.test(f)

// مفتاح غير معروف؟ نفكّ الـ camelCase لكلمات مقروءة — لا يظهر مفتاح خام أبداً
const humanizeKey = (k: string): string =>
  fieldLabels[k] ??
  k
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()

// قيمة الحقل للعرض — تُترجم الأكواد المعروفة ولا تعرض مراجع خام
const formatPayloadValue = (k: string, v: unknown): string => {
  if (k === 'period') return periodLabels[String(v)] ?? 'يوم كامل'
  if (k === 'assetIds' && Array.isArray(v)) {
    const n = v.length
    return n === 1 ? 'أصل واحد' : n === 2 ? 'أصلان' : n <= 10 ? `${n} أصول` : `${n} أصلاً`
  }
  if (typeof v === 'boolean') return v ? 'نعم' : 'لا'
  if (typeof v === 'string' && v.startsWith('file:')) return 'مرفق'
  return String(v)
}

const payloadSummary = (raw?: string | null): string => {
  const payload = parseJson<Record<string, unknown>>(raw, {})
  return Object.entries(payload)
    .filter(([, v]) => v !== '' && v !== null && v !== undefined)
    .map(([k, v]) => `${humanizeKey(k)}: ${formatPayloadValue(k, v)}`)
    .join(' • ')
}

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
}

const mapRequest = (r: ApiRequest, types: ApiRequestType[]): MyRequestRow => {
  const steps = parseJson<ResolvedStep[]>(r.resolvedSteps, [])
  return {
    id: r.id,
    displayId: `REQ-${r.id}`,
    type:
      types.find((t) => t.code === r.typeCode)?.nameAr ??
      getTypeByCode(r.typeCode)?.nameAr ??
      'طلب',
    typeCode: r.typeCode,
    submittedAt: (r.submittedAt ?? r.createdAt).slice(0, 10),
    status: r.status as RequestStatus,
    steps: steps.map((s) => ({
      name: roleLabels[s.role] ?? 'جهة اعتماد',
      state:
        s.action === 'REJECT'
          ? 'rejected'
          : s.action === 'APPROVE' || (s.actedAt && s.action !== 'RETURN')
          ? 'done'
          : s.stepOrder === r.currentStep
          ? 'current'
          : 'waiting',
    })),
    details: payloadSummary(r.payload),
    destinationRecord: r.destinationRef ?? undefined,
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
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [requestNote, setRequestNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
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
    Array<{ id: number; nameAr: string; isDeductible: boolean; maxDurationMinutes?: number | null; isActive: boolean }>
  >([])
  const [permissionType, setPermissionType] = useState('')
  // التقديم نيابة عن موظف آخر (بصلاحية)
  const canOnBehalf = can('requests.create_on_behalf')
  const [onBehalf, setOnBehalf] = useState(false)
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [onBehalfEmployeeId, setOnBehalfEmployeeId] = useState('')

  const load = async () => {
    try {
      setError(null)
      const [typeList, mine, offCase] = await Promise.all([
        fetchRequestTypes(),
        fetchMyRequests(),
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
      fetchMyApprovedLeaves()
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
  }, [selectedType])

  // قائمة الموظفين — فقط لمن يملك صلاحية التقديم نيابة عن غيره
  useEffect(() => {
    if (showNewModal && canOnBehalf && employees.length === 0) {
      fetchEmployees()
        .then(setEmployees)
        .catch((err) =>
          setSubmitError(
            err instanceof Error ? err.message : 'تعذّر تحميل قائمة الموظفين'
          )
        )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNewModal, canOnBehalf])

  // الأنواع المتاحة للموظف — من كتالوج السيرفر (المرحلة P1 التي يقدّمها الموظف)
  const availableRequestTypes = types.filter(
    (t) =>
      t.isActive &&
      t.phase === 'P1' &&
      (getTypeByCode(t.code)?.submitter.includes('E') ?? true)
  )

  const selectedTypeDef = availableRequestTypes.find((t) => t.code === selectedType)
  const requiredFields = parseJson<string[]>(selectedTypeDef?.requiredFields, [])
  // الحقول المخصّصة كاملة الوصف — إن وُجدت تحل محل الاستنتاج القديم
  const customFields = parseJson<CustomFieldDef[]>(
    (selectedTypeDef as any)?.customFields,
    []
  )
  const hasCustomFields = customFields.length > 0

  // النماذج الخاصة: عهدة (اختيار أصول) / استئذان (نوع الإذن) / إجازات (نطاق اليوم)
  const isCustodyRequest = selectedTypeDef?.code === 'CUSTODY_REQUEST'
  const isPermission = selectedTypeDef?.code === 'PERMISSION'
  // إلغاء/تعديل إجازة — منتقي الإجازة المعتمدة بدل الحقول العامة ونطاق اليوم
  const isLeaveCancel = selectedTypeDef?.code === 'LEAVE_MODIFY_CANCEL'
  const isLeaveCategory = selectedTypeDef?.category === 'leaves' && !isLeaveCancel
  const isHalfDay = isLeaveCategory && leavePeriod !== 'FULL'

  // اسم نوع الإجازة بالعربي — من كتالوج الأنواع إن أمكن، وإلا النص كما هو
  const leaveTypeLabel = (code: string): string =>
    types.find((t) => t.code === code)?.nameAr ??
    types.find((t) => t.code === `LEAVE_${code}`)?.nameAr ??
    getTypeByCode(code)?.nameAr ??
    getTypeByCode(`LEAVE_${code}`)?.nameAr ??
    code
  const selectedPermissionDef = permissionTypes.find(
    (p) => p.nameAr === permissionType
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
    } else if (hasCustomFields) {
      // النموذج المبني من تعريف الحقول المخصّصة
      for (const f of customFields) {
        const raw = (fieldValues[f.key] ?? '').trim()
        payload[f.key] = f.type === 'number' && raw !== '' ? Number(raw) : raw
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
      payload.permissionType = permissionType
    }
    if (isLeaveCategory) {
      payload.period = leavePeriod
      if (isHalfDay) {
        // نصف يوم: يوم واحد فقط + 0.5 يوم مهما كان المدخل
        payload.toDate = (fieldValues.fromDate ?? '').trim()
        payload.days = 0.5
      }
    }
    if (onBehalf && !onBehalfEmployeeId) {
      setSubmitError('اختر الموظف الذي تقدّم الطلب نيابة عنه')
      return
    }
    if (requestNote.trim()) payload.note = requestNote.trim()
    setSubmitting(true)
    setSubmitError(null)
    try {
      await createRequest(
        selectedTypeDef.code,
        payload,
        true,
        onBehalf && onBehalfEmployeeId ? Number(onBehalfEmployeeId) : undefined
      )
      setSelectedType('')
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
      await resubmitRequest(id)
      await load()
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
            onClick={() => setShowNewModal(true)}
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
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${statusStyles[req.status] ?? 'bg-gray-100 text-gray-500'}`}
                        >
                          <StatusIcon size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold text-gray-800">{req.type}</h3>
                            <span className={`badge text-xs ${statusStyles[req.status] ?? 'bg-gray-100 text-gray-500'}`}>
                              {statusLabels[req.status] ?? 'قيد المعالجة'}
                            </span>
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
                      <div className="flex items-center gap-2 shrink-0">
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

        {/* New Request Modal */}
        {showNewModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">تقديم طلب جديد</h2>
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
                {submitError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">
                    {submitError}
                  </div>
                )}

                {/* التقديم نيابة عن موظف آخر — بصلاحية فقط */}
                {canOnBehalf && (
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
                        <select
                          className="input w-full"
                          value={onBehalfEmployeeId}
                          onChange={(e) => setOnBehalfEmployeeId(e.target.value)}
                        >
                          <option value="">— اختر الموظف —</option>
                          {employees
                            .filter((emp) => emp.isActive)
                            .map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.fullName} — {emp.employeeCode}
                              </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500">
                          سيُسجَّل الطلب باسم الموظف وسيظهر أنك منشئه
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* فئات الكتالوج */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      !selectedCategory ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    الكل
                  </button>
                  {Object.entries(categoryLabels).map(([catId, catLabel]) => {
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
                        {catLabel} ({count})
                      </button>
                    )
                  })}
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto">
                  {availableRequestTypes
                    .filter((t) => !selectedCategory || t.category === selectedCategory)
                    .map((t) => {
                      const def = getTypeByCode(t.code)
                      return (
                        <button
                          key={t.code}
                          onClick={() => {
                            setSelectedType(t.code)
                            setFieldValues({})
                            setUploadedFiles({})
                            setSelectedAssetIds([])
                            setAssetSearch('')
                            setCustodyReason('')
                            setLeavePeriod('FULL')
                            setPermissionType('')
                            setSelectedLeaveId(null)
                            setCancelReason('')
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
                                {t.isConfidential && (
                                  <span className="mr-2 badge text-[10px] bg-gray-800 text-white">
                                    <EyeOff size={9} className="inline ml-0.5" />
                                    سرّي
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                السلسلة: {def?.approvalChain ?? '—'} • الوجهة:{' '}
                                {def?.destination ??
                                  handlerLabels[t.destinationHandler] ??
                                  '—'}
                              </p>
                            </div>
                          </div>
                          <span className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg whitespace-nowrap">
                            <Users size={12} />
                            {categoryLabels[t.category as keyof typeof categoryLabels] ?? 'أخرى'}
                          </span>
                        </button>
                      )
                    })}
                </div>

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
                          {formatPayloadValue('assetIds', selectedAssetIds)} ضمن
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
                          <option key={p.id} value={p.nameAr}>
                            {p.nameAr}
                          </option>
                        ))}
                    </select>
                    {selectedPermissionDef?.maxDurationMinutes ? (
                      <p className="text-xs text-gray-500 mt-1.5">
                        الحد الأقصى: {selectedPermissionDef.maxDurationMinutes} دقيقة
                      </p>
                    ) : null}
                    {selectedPermissionDef?.isDeductible && (
                      <p className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-1.5">
                        <AlertTriangle size={13} className="shrink-0" />
                        هذا النوع يُخصم من الراتب (الدقائق المتداخلة مع التأخير)
                      </p>
                    )}
                  </div>
                )}

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
                      <option value="MORNING">النصف الصباحي</option>
                      <option value="EVENING">النصف المسائي</option>
                    </select>
                    {isHalfDay && (
                      <p className="text-xs text-gray-500 mt-1.5">
                        إجازة نصف يوم: تاريخ النهاية يُطابق البداية وعدد الأيام 0.5
                        تلقائياً
                      </p>
                    )}
                  </div>
                )}

                {/* النموذج من تعريف الحقول المخصّصة — يحل محل الاستنتاج القديم */}
                {selectedType && hasCustomFields && !isCustodyRequest && !isLeaveCancel && (
                  <div className="grid grid-cols-2 gap-3">
                    {customFields.map((f) => (
                      <div key={f.key} className={f.type === 'file' ? 'col-span-2' : ''}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {f.label}
                          {f.required && <span className="text-red-500 mr-1">*</span>}
                        </label>
                        {f.type === 'select' ? (
                          <select
                            className="input w-full"
                            value={fieldValues[f.key] ?? ''}
                            onChange={(e) => setFieldValue(f.key, e.target.value)}
                          >
                            <option value="">— اختر —</option>
                            {(f.options ?? []).map((o) => (
                              <option key={o} value={o}>
                                {o}
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
                        ) : (
                          <input
                            type={
                              f.type === 'date'
                                ? 'date'
                                : f.type === 'number'
                                ? 'number'
                                : 'text'
                            }
                            className="input w-full disabled:bg-gray-50 disabled:text-gray-400"
                            disabled={
                              isHalfDay && (f.key === 'toDate' || f.key === 'days')
                            }
                            value={fieldValues[f.key] ?? ''}
                            onChange={(e) => setFieldValue(f.key, e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* الاستنتاج القديم — عند غياب الحقول المخصّصة */}
                {selectedType &&
                  !hasCustomFields &&
                  !isCustodyRequest &&
                  !isLeaveCancel &&
                  requiredFields.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {requiredFields.map((f) => (
                        <div key={f}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {humanizeKey(f)}
                          </label>
                          <input
                            type={
                              isDateField(f) ? 'date' : isNumberField(f) ? 'number' : 'text'
                            }
                            className="input w-full disabled:bg-gray-50 disabled:text-gray-400"
                            disabled={isHalfDay && (f === 'toDate' || f === 'days')}
                            placeholder={f === 'from' || f === 'to' ? 'HH:MM' : undefined}
                            value={fieldValues[f] ?? ''}
                            onChange={(e) => setFieldValue(f, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                {selectedType && (
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
                  إلغاء
                </button>
                <button
                  onClick={handleSubmit}
                  className="btn-primary flex items-center gap-2"
                  disabled={!selectedType || submitting || uploadingField !== null}
                >
                  <Send size={16} />
                  {submitting ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
