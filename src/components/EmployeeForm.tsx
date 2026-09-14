'use client'
import { localToday } from '@/lib/dates'

import { currencyLabel } from '@/lib/currency'
import { employeeStatusLabels as statusLabels } from '@/lib/status-labels'
import { loadEmployeeAddDraft, saveEmployeeAddDraft, clearEmployeeAddDraft, type EmployeeAddDraft } from '@/lib/employee-add-draft'
import { buildEmployeeSalaryChange, employeeCreateSalaryPeriod, employeeSalaryChanged, employeeSalaryEditPayload, employeeSalaryTotal, employeePreviousSalaryCanBeConfirmed, fetchEmployeeSalaryStartContext, payrollMonthExplanation, type EmployeeSalaryChangeCommand, type EmployeeSalaryChangeContext, type EmployeeSalaryStartContext } from '@/lib/employee-salary-change-api'
import { SALARY_HISTORY_FIELDS } from '@/lib/payroll-salary-history-api'
import { buildCalendarChange, employeeCalendarPayload, type PayrollCalendarChange, type PayrollCalendarContext } from '@/lib/payroll-calendar-api'
import { CalendarContextSummary } from '@/components/PayrollCalendarChange'

import { useEffect, useRef, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  can,
  getCurrentUser,
  fetchBranches,
  fetchDepartments,
  fetchTeams,
  fetchEmployees,
  fetchEmployeeDirectory,
  fetchCatalog,
  fetchConfig,
  uploadFile,
  fetchFileObjectUrl,
  ApiBranch,
  ApiDepartment,
  ApiTeam,
  ApiEmployee,
  type ApiQualifications,
  type Clearable,
  type EmployeeStatus,
  deleteEducation,
  deleteCertification,
  deleteExperience,
  deleteSkill,
  deleteLanguage,
} from '@/lib/api'
import {
  User,
  Briefcase,
  Wallet,
  GraduationCap,
  FileText,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  Upload,
  Calendar,
  Phone,
  Mail,
  Building2,
  Clock,
} from 'lucide-react'
import Link from 'next/link'

// خيار «المدير المباشر» — من قائمة الموظفين أو الدليل المختصر (بلا employees.view)
type ManagerOption = Pick<ApiEmployee, 'id' | 'fullName' | 'jobTitle'>

// مركز التكلفة — من كتالوج الإعدادات
interface CostCenter {
  id: number
  code: string
  name: string
  isActive: boolean
}

// حالة النموذج الكاملة — نفس حقول شاشة الإضافة + صورة الموظف
export interface EmployeeFormState {
  firstNameAr: string
  fatherNameAr: string
  grandNameAr: string
  familyNameAr: string
  firstNameEn: string
  middleNameEn: string
  lastNameEn: string
  nationalId: string
  phone: string
  personalEmail: string
  birthDate: string
  gender: string
  maritalStatus: string
  nationality: string
  addressCity: string
  addressDistrict: string
  emergencyName: string
  emergencyPhone: string
  employeeCode: string
  fingerprintCode: string
  joinDate: string
  status: EmployeeStatus
  branchId: string
  departmentId: string
  teamId: string
  managerId: string
  jobTitle: string
  workEmail: string
  basicSalary: string
  housingAllowance: string
  transportAllowance: string
  otherAllowance: string
  phoneAllowance: string
  workNatureAllowance: string
  payMethod: string
  costCenterId: string
  bankName: string
  iban: string
  contractType: string
  contractStart: string
  contractEnd: string
  contractNumber: string
  contractDurationMonths: string
  noticePeriodDays: string
  // حقول قياسية جديدة (الملف الكامل) — كلها string في الحالة، تُحوَّل عند الإرسال
  birthPlace: string
  passportNo: string
  passportExpiry: string
  phoneAlt: string
  country: string
  postalCode: string
  emergencyRelation: string
  emergencyPhoneAlt: string
  actualStartDate: string
  workType: string
  probationEndDate: string
  recruitmentSource: string
  gradeId: string // كتالوج الدرجة → Number في الحمولة
  workLocation: string
  currency: string
  salaryCycle: string
  bankBranch: string
  gosiNumber: string
  isGosiRegistered: string // 'true' | 'false' | '' → boolean في الحمولة
  gosiBaseSalary: string
  photoFileId?: number
  workScheduleId?: number // جدول العمل المعيّن (للتعبئة المسبقة في التعديل)
  flexOverrideMode?: 'INHERIT' | 'ENABLED' | 'DISABLED'
  attendanceEffectiveFrom?: string
  attendanceChangeReason?: string
  annualLeaveEntitled?: boolean // يستحق سنوي؟ (تعبئة مسبقة في التعديل)
  openingBalanceDays?: number // الرصيد الافتتاحي الحالي (تعبئة مسبقة في التعديل)
  openingBalanceExpiry?: string | null // صلاحيته (تاريخ أو null)
}

// الحمولة المُرسلة للباك إند — حقول ApiEmployee + الرصيد الافتتاحي المُرحّل
// (يُطبَّق على رصيد الإجازة السنوية عند التعيين فقط، ليس عموداً على الموظف)
// صف واحد في إحدى قوائم المؤهلات/الخبرات (حقول نصية حرة حسب القائمة)
export type QualRow = Record<string, string>

// تسميات عربية لعرض الصفوف المضافة
const DEGREE_LABEL: Record<string, string> = {
  phd: 'دكتوراه',
  master: 'ماجستير',
  bachelor: 'بكالوريوس',
  diploma: 'دبلوم',
  high_school: 'ثانوي',
  other: 'أخرى',
}
const SKILL_LEVEL_LABEL: Record<string, string> = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  advanced: 'متقدم',
  expert: 'خبير',
}
const LANG_LEVEL_LABEL: Record<string, string> = {
  native: 'لغة أم',
  very_good: 'جيد جداً',
  good: 'جيد',
  basic: 'أساسي',
}

// قوائم المؤهلات الخمس — تُحفظ بعد إنشاء/تعديل الموظف (تحتاج employeeId)
export interface QualificationsPayload {
  education: QualRow[]
  certifications: QualRow[]
  experiences: QualRow[]
  skills: QualRow[]
  languages: QualRow[]
}

export type EmployeeFormPayload = Clearable<ApiEmployee> & {
  salaryChange?: EmployeeSalaryChangeCommand
  // الخطوة 13: «يسري من راتب شهر» لأجر التعيين (الإنشاء فقط)
  salaryEffectivePayrollPeriod?: string
  calendarChange?: PayrollCalendarChange
  openingBalanceDays?: number
  openingBalanceExpiry?: string | null
  qualifications?: QualificationsPayload
}

interface EmployeeFormProps {
  mode: 'add' | 'edit'
  initial?: Partial<EmployeeFormState>
  onSubmit: (payload: EmployeeFormPayload) => Promise<void>
  submitting: boolean
  error: string
  // المؤهلات المحفوظة (وضع التعديل) — تُعرض للحذف، والجديد يُضاف بجانبها
  employeeId?: number
  savedQualifications?: ApiQualifications | null
  salaryChangeContext?: EmployeeSalaryChangeContext | null
  salaryContextError?: string
  // لا يملك المستخدم «اعتماد المسير» → تعديل الأجر مقفول برسالة الصلاحية (SEC-06)
  salaryChangeForbidden?: boolean
  calendarContext?: PayrollCalendarContext | null
  calendarContextError?: string
}

// أيام الأسبوع
const weekDays = [
  { key: 'sunday', name: 'الأحد', shortName: 'ح' },
  { key: 'monday', name: 'الاثنين', shortName: 'ن' },
  { key: 'tuesday', name: 'الثلاثاء', shortName: 'ث' },
  { key: 'wednesday', name: 'الأربعاء', shortName: 'ر' },
  { key: 'thursday', name: 'الخميس', shortName: 'خ' },
  { key: 'friday', name: 'الجمعة', shortName: 'ج' },
  { key: 'saturday', name: 'السبت', shortName: 'س' },
]

// جدول العمل كما يرجعه السيرفر (كتالوج work-schedules) + عدد الموظفين المُثرى
interface WorkScheduleRow {
  id: number
  name: string
  description?: string
  weekendDays: string // 'FRI,SAT'
  startTime: string
  endTime: string
  isDefault: boolean
  isActive: boolean
  employeeCount?: number
  flexEnabled?: boolean | null
  flexWindowMinutes?: number | null
  requiredWorkMinutes?: number | null
}

// رمز اليوم (3 أحرف) لكل مفتاح — لاشتقاق أيام العمل من أيام نهاية الأسبوع
const DAY_CODES: Record<string, string> = {
  sunday: 'SUN', monday: 'MON', tuesday: 'TUE', wednesday: 'WED',
  thursday: 'THU', friday: 'FRI', saturday: 'SAT',
}
// يوم عمل؟ = ليس ضمن أيام نهاية الأسبوع للجدول
const isWorkingDay = (dayKey: string, weekendDays: string) =>
  !weekendDays
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .includes(DAY_CODES[dayKey])

// الألوان المتاحة للجداول
// ألوان الكروت بالفهرس (لا يخزّن السيرفر لوناً — تمييز بصري فقط)
const scheduleColorList = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-red-500',
]

const steps = [
  { id: 1, title: 'البيانات الشخصية', icon: User },
  { id: 2, title: 'البيانات الوظيفية', icon: Briefcase },
  { id: 3, title: 'البيانات المالية', icon: Wallet },
  { id: 4, title: 'المؤهلات والخبرات', icon: GraduationCap },
  { id: 5, title: 'المستندات', icon: FileText },
]

// خيارات ثابتة للقوائم — لحقن القيمة الحالية عند التعديل إن لم تكن ضمنها
const jobTitleOptions = ['مطور برمجيات', 'محلل نظم', 'مدير', 'أخصائي']
const nationalityOptions = ['سعودي', 'مصري', 'أردني', 'سوري', 'أخرى']
const bankOptions = ['بنك الراجحي', 'بنك الإنماء', 'البنك الأهلي', 'بنك الرياض', 'بنك ساب']

const makeInitialState = (initial?: Partial<EmployeeFormState>): EmployeeFormState => ({
  firstNameAr: '',
  fatherNameAr: '',
  grandNameAr: '',
  familyNameAr: '',
  firstNameEn: '',
  middleNameEn: '',
  lastNameEn: '',
  nationalId: '',
  phone: '',
  personalEmail: '',
  birthDate: '',
  gender: '',
  maritalStatus: '',
  nationality: '',
  addressCity: '',
  addressDistrict: '',
  emergencyName: '',
  emergencyPhone: '',
  employeeCode: '',
  fingerprintCode: '',
  joinDate: '',
  status: 'probation',
  branchId: '',
  departmentId: '',
  teamId: '',
  managerId: '',
  jobTitle: '',
  workEmail: '',
  basicSalary: '',
  housingAllowance: '',
  transportAllowance: '',
  otherAllowance: '',
  phoneAllowance: '',
  workNatureAllowance: '',
  payMethod: 'transfer',
  costCenterId: '',
  bankName: '',
  iban: '',
  contractType: '',
  contractStart: '',
  contractEnd: '',
  contractNumber: '',
  contractDurationMonths: '',
  noticePeriodDays: '',
  birthPlace: '',
  passportNo: '',
  passportExpiry: '',
  phoneAlt: '',
  country: '',
  postalCode: '',
  emergencyRelation: '',
  emergencyPhoneAlt: '',
  actualStartDate: '',
  probationEndDate: '',
  recruitmentSource: '',
  gradeId: '',
  workLocation: '',
  currency: 'SAR',
  salaryCycle: '',
  bankBranch: '',
  gosiNumber: '',
  isGosiRegistered: '',
  gosiBaseSalary: '',
  photoFileId: undefined,
  flexOverrideMode: 'INHERIT',
  attendanceEffectiveFrom: '',
  attendanceChangeReason: '',
  ...initial,
  workType: initial?.workType === 'fulltime' ? 'full_time' : initial?.workType === 'parttime' ? 'part_time' : initial?.workType ?? '',
})

export default function EmployeeForm({ mode, initial, onSubmit, submitting, error, employeeId, savedQualifications, salaryChangeContext = null, salaryContextError = '', salaryChangeForbidden = false, calendarContext = null, calendarContextError = '' }: EmployeeFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [stepError, setStepError] = useState('') // خطأ تحقق الخطوة
  // يستحق سنوي؟ — من بيانات الموظف في التعديل (افتراضي نعم)
  const [leaveEntitled, setLeaveEntitled] = useState(
    initial?.annualLeaveEntitled ?? true
  )
  const [selectedSchedule, setSelectedSchedule] = useState<number | ''>(
    initial?.workScheduleId ?? ''
  )
  const [scheduleList, setScheduleList] = useState<WorkScheduleRow[]>([])
  // ===== المؤهلات والخبرات — خمس قوائم تُحفظ بعد إنشاء الموظف (تحتاج employeeId)
  // كل قائمة صفوف تُضاف/تُحذف محلياً هنا، ثم تُرسل دفعةً في onSubmit
  const [eduRows, setEduRows] = useState<QualRow[]>([])
  const [certRows, setCertRows] = useState<QualRow[]>([])
  const [expRows, setExpRows] = useState<QualRow[]>([])
  const [skillRows, setSkillRows] = useState<QualRow[]>([])
  const [langRows, setLangRows] = useState<QualRow[]>([])
  // المؤهلات المحفوظة سابقاً (وضع التعديل) — تُعرض للحذف الفوري
  const [saved, setSaved] = useState<ApiQualifications | null>(savedQualifications ?? null)
  useEffect(() => setSaved(savedQualifications ?? null), [savedQualifications])

  // حذف صف محفوظ من الباك مباشرة ثم إزالته من العرض
  const deleteSavedRow = async (
    kind: keyof ApiQualifications,
    rowId: number
  ) => {
    if (!employeeId) return
    const fn = {
      education: deleteEducation,
      certifications: deleteCertification,
      experiences: deleteExperience,
      skills: deleteSkill,
      languages: deleteLanguage,
    }[kind]
    try {
      await fn(employeeId, rowId)
      setSaved((prev) =>
        prev
          ? { ...prev, [kind]: (prev[kind] as any[]).filter((r) => r.id !== rowId) }
          : prev
      )
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'تعذّر الحذف')
    }
  }

  // عرض الصفوف المحفوظة لقائمة مع زر حذف فوري (وضع التعديل فقط)
  const SavedList = ({
    kind,
    label,
  }: {
    kind: keyof ApiQualifications
    label: (r: any) => string
  }) => {
    const rows = (saved?.[kind] as any[]) ?? []
    if (rows.length === 0) return null
    return (
      <div className="mb-3 rounded-xl border border-gray-200 bg-white p-3">
        <p className="mb-2 text-xs font-medium text-gray-500">
          المحفوظ حالياً ({rows.length})
        </p>
        <ul className="divide-y divide-gray-100">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-gray-700">{label(r)}</span>
              <button
                type="button"
                className="text-xs font-medium text-red-500 hover:text-red-600"
                onClick={() => deleteSavedRow(kind, r.id)}
              >
                حذف
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // مسودّة الصف الجاري إدخاله لكل قائمة (تُفرَّغ بعد «إضافة»)
  const [eduDraft, setEduDraft] = useState<QualRow>({})
  const [certDraft, setCertDraft] = useState<QualRow>({})
  const [expDraft, setExpDraft] = useState<QualRow>({})
  const [skillDraft, setSkillDraft] = useState<QualRow>({})
  const [langDraft, setLangDraft] = useState<QualRow>({})

  // مرفق العقد — يُرفع فورًا ويُخزَّن مرجعه (ref) لإرساله ثم إنشاء مستند «عقد»
  const [contractFileRef, setContractFileRef] = useState('')
  const [contractFileName, setContractFileName] = useState('')
  const [contractUploading, setContractUploading] = useState(false)
  // المستندات الستة — كل ملف يُرفع فورًا ويُخزَّن {docType, fileRef} لإرساله
  // ثم إنشاء EmployeeDocument بالباك. docUploading يتتبّع حالة الرفع لكل نوع
  const [documentRefs, setDocumentRefs] = useState<{ docType: string; fileRef: string }[]>([])
  const [docUploading, setDocUploading] = useState<Record<string, boolean>>({})
  // سياسات الإجازة العامة (من الإعدادات) — تُعرض للقراءة فقط في نموذج الموظف
  const [policyCfg, setPolicyCfg] = useState<Record<string, string>>({})
  // الرصيد الافتتاحي المُرحّل — يُعبَّأ مسبقاً بقيمته الحالية في التعديل
  const initExpiry = initial?.openingBalanceExpiry
  const [openingBalance, setOpeningBalance] = useState(
    initial?.openingBalanceDays && initial.openingBalanceDays > 0
      ? String(initial.openingBalanceDays)
      : ''
  )
  const [openingExpiry, setOpeningExpiry] = useState<
    'end_of_year' | 'custom_date' | 'no_expiry'
  >(
    initExpiry === null || initExpiry === undefined
      ? initial?.openingBalanceDays
        ? 'no_expiry'
        : 'end_of_year'
      : String(initExpiry).slice(5) === '12-31'
        ? 'end_of_year'
        : 'custom_date'
  )
  const [openingExpiryDate, setOpeningExpiryDate] = useState(
    initExpiry && String(initExpiry).slice(5) !== '12-31'
      ? String(initExpiry).slice(0, 10)
      : ''
  )

  // بيانات القوائم من السيرفر
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [teams, setTeams] = useState<ApiTeam[]>([])
  // منتقي المدير المباشر — يكفيه id/الاسم/المسمى (القائمة الكاملة أو الدليل المختصر)
  const [allEmployees, setAllEmployees] = useState<ManagerOption[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [catalogError, setCatalogError] = useState('')

  // حقول النموذج المرتبطة بالباك إند — تُبذَر من initial
  const [form, setForm] = useState<EmployeeFormState>(() => makeInitialState(initial))
  const [salaryEvidence, setSalaryEvidence] = useState({ effectivePayrollPeriod: '', reason: '', evidenceReference: '', previousEffectivePayrollPeriod: '' })
  // الخطوة 13: أجر التعيين يُوثَّق «يسري من راتب شهر» مع الإنشاء؛ الحدود من الخادم حسب تاريخ التعيين ودورة الرواتب.
  const [salaryStart, setSalaryStart] = useState<EmployeeSalaryStartContext | null>(null)
  const [salaryStartError, setSalaryStartError] = useState('')
  const [createSalaryPeriod, setCreateSalaryPeriod] = useState('')
  const salaryStartDate = mode === 'add' ? (form.actualStartDate || form.joinDate || '') : ''
  useEffect(() => {
    if (mode !== 'add') return
    const controller = new AbortController()
    setSalaryStartError('')
    fetchEmployeeSalaryStartContext(salaryStartDate, controller.signal)
      .then(setSalaryStart)
      .catch(cause => {
        if (controller.signal.aborted) return
        setSalaryStart(null)
        setSalaryStartError(cause instanceof Error ? cause.message : 'تعذر تحديد شهر سريان أجر التعيين.')
      })
    return () => controller.abort()
  }, [mode, salaryStartDate])
  const [calendarInitialConfirmation, setCalendarInitialConfirmation] = useState(false)
  const calendarRequested = mode === 'edit' && (form.branchId !== (initial?.branchId ?? '') || calendarInitialConfirmation)
  const salaryLocked = mode === 'edit' && !salaryChangeContext
  const salaryChanged = mode === 'edit' && !!salaryChangeContext && employeeSalaryChanged(salaryChangeContext, form)
  const [draftUserId, setDraftUserId] = useState<number | null>(null)
  const [sessionDraft, setSessionDraft] = useState<EmployeeAddDraft | null>(null)
  const [draftError, setDraftError] = useState('')
  const [draftNotice, setDraftNotice] = useState('')
  const [restoreDraftOpen, setRestoreDraftOpen] = useState(false)

  const setField = <K extends keyof EmployeeFormState>(key: K, value: EmployeeFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // ===== صورة الموظف =====
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const objectUrlRef = useRef<string | null>(null)
  const uploadingAny = photoUploading || contractUploading || Object.values(docUploading).some(Boolean)

  useEffect(() => {
    if (mode !== 'add') return
    const userId = getCurrentUser()?.id
    if (!userId) return
    setDraftUserId(userId)
    try { setSessionDraft(loadEmployeeAddDraft(userId, makeInitialState())) }
    catch (err) { setDraftError(err instanceof Error ? err.message : 'تعذر قراءة مسودة الجلسة.') }
  }, [mode])

  const persistDraft = () => {
    if (mode !== 'add' || !draftUserId || submitting || uploadingAny) return
    const snapshot: EmployeeAddDraft = {
      schemaVersion: 1, userId: draftUserId, savedAt: new Date().toISOString(), currentStep,
      form, leaveEntitled, selectedSchedule, openingBalance, openingExpiry, openingExpiryDate,
      qualifications: { education: eduRows, certifications: certRows, experiences: expRows, skills: skillRows, languages: langRows },
      qualificationDrafts: { education: eduDraft, certifications: certDraft, experiences: expDraft, skills: skillDraft, languages: langDraft },
      contractFileRef, contractFileName, documentRefs,
    }
    try {
      saveEmployeeAddDraft(snapshot)
      setSessionDraft(snapshot); setDraftError('')
      setDraftNotice('حُفظت مسودة الإضافة في هذا التبويب. لم يُنشأ موظف في النظام.')
    } catch { setDraftError('تعذر حفظ المسودة في المتصفح. تحقق من إتاحة تخزين الجلسة ثم أعد المحاولة.') }
  }

  const discardSessionDraft = () => {
    if (!draftUserId) return
    try {
      clearEmployeeAddDraft(draftUserId)
      setSessionDraft(null); setDraftError(''); setRestoreDraftOpen(false)
      setDraftNotice('حُذفت المسودة المحفوظة من الجلسة. البيانات المفتوحة في النموذج باقية.')
    } catch { setDraftError('تعذر حذف مسودة الجلسة من المتصفح.') }
  }

  const restoreSessionDraft = async () => {
    if (!sessionDraft || submitting || uploadingAny) return
    setRestoreDraftOpen(false)
    setForm(sessionDraft.form); setCurrentStep(sessionDraft.currentStep)
    setLeaveEntitled(sessionDraft.leaveEntitled); setSelectedSchedule(sessionDraft.selectedSchedule)
    setOpeningBalance(sessionDraft.openingBalance); setOpeningExpiry(sessionDraft.openingExpiry); setOpeningExpiryDate(sessionDraft.openingExpiryDate)
    setEduRows(sessionDraft.qualifications.education); setCertRows(sessionDraft.qualifications.certifications); setExpRows(sessionDraft.qualifications.experiences); setSkillRows(sessionDraft.qualifications.skills); setLangRows(sessionDraft.qualifications.languages)
    setEduDraft(sessionDraft.qualificationDrafts.education); setCertDraft(sessionDraft.qualificationDrafts.certifications); setExpDraft(sessionDraft.qualificationDrafts.experiences); setSkillDraft(sessionDraft.qualificationDrafts.skills); setLangDraft(sessionDraft.qualificationDrafts.languages)
    setContractFileRef(sessionDraft.contractFileRef); setContractFileName(sessionDraft.contractFileName); setDocumentRefs(sessionDraft.documentRefs)
    setStepError(''); setDraftError(''); setPhotoError(''); replacePhotoUrl(null)
    setDraftNotice('استُرجعت المسودة. راجع البيانات والمرفقات ثم أضف الموظف عند اكتمالها.')
    if (sessionDraft.form.photoFileId) {
      setPhotoUploading(true)
      try { replacePhotoUrl(await fetchFileObjectUrl(sessionDraft.form.photoFileId)) }
      catch { setPhotoError('تعذر عرض الصورة المحفوظة؛ يمكنك إعادة رفعها أو حذفها قبل الإضافة.') }
      finally { setPhotoUploading(false) }
    }
  }

  const replacePhotoUrl = (url: string | null) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = url
    setPhotoUrl(url)
  }

  // تحميل صورة موجودة (وضع التعديل) عبر رابط blob بالتوكن
  useEffect(() => {
    let active = true
    const pid = initial?.photoFileId
    if (pid != null) {
      fetchFileObjectUrl(pid)
        .then((url) => {
          if (!active) {
            if (url) URL.revokeObjectURL(url)
            return
          }
          if (url) replacePhotoUrl(url)
        })
        .catch(() => {})
    }
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // تفريغ رابط الـ blob عند إزالة المكوّن
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    },
    []
  )

  const handlePhotoPick = async (file: File | null | undefined) => {
    if (!file) return
    setPhotoError('')
    // معاينة فورية محلية قبل اكتمال الرفع
    replacePhotoUrl(URL.createObjectURL(file))
    setPhotoUploading(true)
    try {
      const res = await uploadFile(file, { entityType: 'employee_photo', employeeId })
      setForm((prev) => ({ ...prev, photoFileId: res.id }))
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'فشل رفع الصورة')
    } finally {
      setPhotoUploading(false)
    }
  }

  // إضافة صف لقائمة مؤهلات: يتحقق من الحقل الإجباري ثم يفرّغ المسودّة
  const addQualRow = (
    draft: QualRow,
    setDraft: (r: QualRow) => void,
    setRows: React.Dispatch<React.SetStateAction<QualRow[]>>,
    requiredKey: string,
    requiredLabel: string
  ) => {
    if (!draft[requiredKey]?.trim()) {
      setStepError(`${requiredLabel} مطلوب قبل الإضافة`)
      return
    }
    setStepError('')
    setRows((prev) => [...prev, draft])
    setDraft({})
  }

  const removeQualRow = (
    setRows: React.Dispatch<React.SetStateAction<QualRow[]>>,
    idx: number
  ) => setRows((prev) => prev.filter((_, i) => i !== idx))

  // رفع مرفق العقد فورًا → مرجع file:N يُرسَل مع الحفظ لإنشاء مستند «عقد»
  const handleContractPick = async (file: File | null | undefined) => {
    if (!file) return
    setStepError('')
    setContractUploading(true)
    try {
      const res = await uploadFile(file, { entityType: 'contract', employeeId })
      setContractFileRef(res.ref)
      setContractFileName(res.originalName || file.name)
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'فشل رفع مرفق العقد')
    } finally {
      setContractUploading(false)
    }
  }

  // رفع مستند عام → uploadFile ثم إضافة/استبدال {docType, fileRef} في documentRefs.
  // append=true (شهادات الخبرة، multiple) يُلحق بدل الاستبدال لدعم عدة ملفات
  const handleDocPick = async (
    docType: string,
    file: File | null | undefined,
    append = false
  ) => {
    if (!file) return
    setStepError('')
    setDocUploading((prev) => ({ ...prev, [docType]: true }))
    try {
      const res = await uploadFile(file, { entityType: 'document', employeeId })
      setDocumentRefs((prev) =>
        append
          ? [...prev, { docType, fileRef: res.ref }]
          : [...prev.filter((d) => d.docType !== docType), { docType, fileRef: res.ref }]
      )
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'فشل رفع المستند')
    } finally {
      setDocUploading((prev) => ({ ...prev, [docType]: false }))
    }
  }

  const handlePhotoRemove = () => {
    replacePhotoUrl(null)
    setForm((prev) => ({ ...prev, photoFileId: undefined }))
    setPhotoError('')
  }

  useEffect(() => {
    Promise.all([fetchBranches(), fetchDepartments(), fetchTeams()])
      .then(([b, d, t]) => {
        setBranches(b)
        setDepartments(d)
        setTeams(t)
      })
      .catch((err) =>
        setCatalogError(err instanceof Error ? err.message : 'تعذر تحميل بيانات القوائم')
      )
    // منتقي المدير: القائمة الكاملة تحتاج employees.view — بدونها (صلاحية الإنشاء
    // وحدها) الدليل المختصر للنشطين في النطاق، فلا يسقط النموذج بـ403
    const managers: Promise<ManagerOption[]> = can('employees.view')
      ? fetchEmployees()
      : fetchEmployeeDirectory()
    managers.then(setAllEmployees).catch(() => setAllEmployees([]))
    // مراكز التكلفة اختيارية — فشلها لا يعطّل النموذج
    fetchCatalog<CostCenter>('cost-centers')
      .then((cc) => setCostCenters(cc.filter((c) => c.isActive)))
      .catch(() => setCostCenters([]))
    // جداول العمل الفعلية من الإعدادات — لا نعيّن جدولاً تلقائياً؛ بلا اختيار
    // صريح يبقى الموظف على عطلة الفرع/العام (لا نغلبها بجدول لم يختره المستخدم)
    fetchCatalog<WorkScheduleRow>('work-schedules', localToday())
      .then((ws) => setScheduleList(ws.filter((s) => s.isActive)))
      .catch(() => setScheduleList([]))
    // سياسات الإجازة العامة — للعرض للقراءة فقط (تُدار من صفحة السياسات)
    fetchConfig()
      .then((rows) => {
        const m: Record<string, string> = {}
        rows.forEach((r) => (m[r.key] = r.value))
        setPolicyCfg(m)
      })
      .catch(() => setPolicyCfg({}))
  }, [])

  const fullNameAr = [form.firstNameAr, form.fatherNameAr, form.grandNameAr, form.familyNameAr]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ')
  const fullNameEn = [form.firstNameEn, form.middleNameEn, form.lastNameEn]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ')

  const avatarLetter = (form.firstNameAr.trim() || fullNameAr).charAt(0)

  const filteredDepartments = form.branchId
    ? departments.filter((d) => d.branchId === Number(form.branchId))
    : departments
  const filteredTeams = form.departmentId
    ? teams.filter((t) => t.departmentId === Number(form.departmentId))
    : teams

  // إجمالي الراتب الشهري = الأساسي + البدلات الثابتة (يُحدَّث لحظياً في الخطوة المالية)
  const totalMonthlySalary = mode === 'add' ?
    (Number(form.basicSalary) || 0) +
    (Number(form.housingAllowance) || 0) +
    (Number(form.transportAllowance) || 0) +
    (Number(form.phoneAllowance) || 0) +
    (Number(form.workNatureAllowance) || 0) +
    (Number(form.otherAllowance) || 0) : 0

  const buildPayload = (): EmployeeFormPayload => {
    const payload: EmployeeFormPayload = {
      employeeCode: (form.employeeCode || form.fingerprintCode).trim(),
      fullName: fullNameAr,
      status: form.status,
      payMethod: form.payMethod,
    }
    if (form.branchId) payload.branchId = Number(form.branchId)
    if (fullNameEn) payload.fullNameEn = fullNameEn
    const email = (form.workEmail || form.personalEmail).trim()
    if (email) payload.email = email
    if (form.phone.trim()) payload.phone = form.phone.trim()
    if (form.nationalId.trim()) payload.nationalId = form.nationalId.trim()
    if (form.jobTitle) payload.jobTitle = form.jobTitle
    if (form.departmentId) payload.departmentId = Number(form.departmentId)
    if (form.teamId) payload.teamId = Number(form.teamId)
    if (form.managerId) payload.managerEmployeeId = Number(form.managerId)
    if (form.joinDate) payload.joinDate = form.joinDate
    if (mode === 'add' && form.basicSalary !== '') payload.basicSalary = Number(form.basicSalary)
    if (form.costCenterId) payload.costCenterId = Number(form.costCenterId)
    // جدول العمل المختار — يعيّن على الموظف فعلياً (يشتقّ منه المحرك)
    if (selectedSchedule !== '') payload.workScheduleId = Number(selectedSchedule)
    if (mode === 'add' || form.flexOverrideMode !== (initial?.flexOverrideMode ?? 'INHERIT') ||
      (selectedSchedule || null) !== (initial?.workScheduleId ?? null)) {
      payload.flexOverrideMode = form.flexOverrideMode ?? 'INHERIT'
      if (form.attendanceEffectiveFrom) payload.attendanceEffectiveFrom = form.attendanceEffectiveFrom
      if (form.attendanceChangeReason?.trim()) payload.attendanceChangeReason = form.attendanceChangeReason.trim()
    }
    // استحقاق السنوي — يتحكم فعلياً في تراكم الرصيد (مقفول = بلا سنوي)
    payload.annualLeaveEntitled = leaveEntitled
    if (form.bankName) payload.bankName = form.bankName
    const iban = form.iban.replace(/\s+/g, '').toUpperCase()
    if (iban) payload.iban = iban
    // الحقول الشخصية — تُرسل فقط عند تعبئتها
    if (form.birthDate) payload.birthDate = form.birthDate
    if (form.gender) payload.gender = form.gender
    if (form.maritalStatus) payload.maritalStatus = form.maritalStatus
    if (form.nationality) payload.nationality = form.nationality
    const address = [form.addressDistrict.trim(), form.addressCity.trim()]
      .filter(Boolean)
      .join('، ')
    if (address) payload.address = address
    if (form.emergencyName.trim()) payload.emergencyContactName = form.emergencyName.trim()
    if (form.emergencyPhone.trim()) payload.emergencyContactPhone = form.emergencyPhone.trim()
    // البدلات الثابتة
    if (mode === 'add' && form.housingAllowance !== '') payload.housingAllowance = Number(form.housingAllowance)
    if (mode === 'add' && form.transportAllowance !== '') payload.transportAllowance = Number(form.transportAllowance)
    if (mode === 'add' && form.otherAllowance !== '') payload.otherAllowance = Number(form.otherAllowance)
    // بيانات العقد — تُرسل فقط عند تعبئتها
    if (form.contractType) payload.contractType = form.contractType
    if (form.contractStart) payload.contractStart = form.contractStart
    if (form.contractEnd) payload.contractEnd = form.contractEnd
    if (form.contractNumber.trim()) payload.contractNumber = form.contractNumber.trim()
    if (form.contractDurationMonths !== '')
      payload.contractDurationMonths = Number(form.contractDurationMonths)
    if (form.noticePeriodDays !== '')
      payload.noticePeriodDays = Number(form.noticePeriodDays)
    // مرفق العقد (مرجع الملف) — الباك يُنشئ منه مستند «عقد»
    if (contractFileRef) payload.contractFileRef = contractFileRef
    // صورة الموظف
    if (form.photoFileId != null) payload.photoFileId = form.photoFileId
    // الرصيد الافتتاحي المُرحّل (اختياري) — يُطبَّق على رصيد السنوي في
    // الإنشاء والتعديل (لموظف قائم انتقل من نظام سابق)
    const openDays = Number(openingBalance)
    if (openingBalance !== '' && openDays > 0) {
      payload.openingBalanceDays = openDays
      payload.openingBalanceExpiry =
        openingExpiry === 'end_of_year'
          ? `${new Date().getFullYear()}-12-31`
          : openingExpiry === 'custom_date'
            ? openingExpiryDate || null
            : null // بدون انتهاء
    }
    // ===== حقول قياسية جديدة — تُرسل فقط عند وجود قيمة =====
    if (form.birthPlace.trim()) payload.birthPlace = form.birthPlace.trim()
    if (form.passportNo.trim()) payload.passportNo = form.passportNo.trim()
    if (form.passportExpiry) payload.passportExpiry = form.passportExpiry
    if (form.phoneAlt.trim()) payload.phoneAlt = form.phoneAlt.trim()
    if (form.country) payload.country = form.country
    if (form.postalCode.trim()) payload.postalCode = form.postalCode.trim()
    if (form.emergencyRelation) payload.emergencyRelation = form.emergencyRelation
    if (form.emergencyPhoneAlt.trim()) payload.emergencyPhoneAlt = form.emergencyPhoneAlt.trim()
    if (form.actualStartDate) payload.actualStartDate = form.actualStartDate
    if (form.workType) payload.workType = form.workType
    if (form.probationEndDate) payload.probationEndDate = form.probationEndDate
    if (form.recruitmentSource) payload.recruitmentSource = form.recruitmentSource
    if (form.gradeId) payload.gradeId = Number(form.gradeId)
    if (form.workLocation.trim()) payload.workLocation = form.workLocation.trim()
    if (mode === 'add' && form.currency) payload.currency = form.currency
    if (mode === 'add') {
      const salaryPeriod = employeeCreateSalaryPeriod(salaryStart, createSalaryPeriod, form)
      if (salaryPeriod) payload.salaryEffectivePayrollPeriod = salaryPeriod
    }
    if (form.salaryCycle) payload.salaryCycle = form.salaryCycle
    if (form.bankBranch.trim()) payload.bankBranch = form.bankBranch.trim()
    if (form.gosiNumber.trim()) payload.gosiNumber = form.gosiNumber.trim()
    if (form.isGosiRegistered) payload.isGosiRegistered = form.isGosiRegistered === 'true'
    if (form.gosiBaseSalary !== '') payload.gosiBaseSalary = Number(form.gosiBaseSalary)
    // ===== إصلاحات ذهاب/عودة — حقول مستقلة (بجانب سلوك الـfallback الحالي) =====
    if (form.fingerprintCode.trim()) payload.fingerprintCode = form.fingerprintCode.trim()
    if (form.personalEmail.trim()) payload.personalEmail = form.personalEmail.trim()
    if (mode === 'add' && form.phoneAllowance !== '') payload.phoneAllowance = Number(form.phoneAllowance)
    if (mode === 'add' && form.workNatureAllowance !== '')
      payload.workNatureAllowance = Number(form.workNatureAllowance)
    // ===== مراجع المستندات — payload فقط، الباك يُنشئ EmployeeDocument لكل عنصر =====
    if (documentRefs.length > 0) payload.documentRefs = documentRefs
    // ===== المؤهلات والخبرات — تُحفظ بعد الموظف (تحتاج employeeId) =====
    if (
      eduRows.length ||
      certRows.length ||
      expRows.length ||
      skillRows.length ||
      langRows.length
    ) {
      payload.qualifications = {
        education: eduRows,
        certifications: certRows,
        experiences: expRows,
        skills: skillRows,
        languages: langRows,
      }
    }
    // A cleared optional field must reach PATCH as null. Only fields that were
    // actually loaded with a value are cleared; untouched/unavailable data stays.
    if (mode === 'edit' && initial) {
      const optionalFields: Array<[keyof EmployeeFormState, keyof ApiEmployee]> = [
        ['departmentId', 'departmentId'], ['teamId', 'teamId'], ['managerId', 'managerEmployeeId'],
        ['costCenterId', 'costCenterId'], ['gradeId', 'gradeId'],
        ['contractEnd', 'contractEnd'], ['contractStart', 'contractStart'], ['contractType', 'contractType'],
        ['contractNumber', 'contractNumber'], ['contractDurationMonths', 'contractDurationMonths'],
        ['noticePeriodDays', 'noticePeriodDays'], ['bankName', 'bankName'], ['iban', 'iban'],
        ['birthDate', 'birthDate'], ['gender', 'gender'], ['maritalStatus', 'maritalStatus'],
        ['nationality', 'nationality'], ['nationalId', 'nationalId'], ['phone', 'phone'],
        ['personalEmail', 'personalEmail'], ['fingerprintCode', 'fingerprintCode'],
        ['emergencyName', 'emergencyContactName'], ['emergencyPhone', 'emergencyContactPhone'],
        ['birthPlace', 'birthPlace'], ['passportNo', 'passportNo'], ['passportExpiry', 'passportExpiry'],
        ['phoneAlt', 'phoneAlt'], ['country', 'country'], ['postalCode', 'postalCode'],
        ['emergencyRelation', 'emergencyRelation'], ['emergencyPhoneAlt', 'emergencyPhoneAlt'],
        ['actualStartDate', 'actualStartDate'], ['probationEndDate', 'probationEndDate'],
        ['recruitmentSource', 'recruitmentSource'], ['workLocation', 'workLocation'],
        ['bankBranch', 'bankBranch'], ['gosiNumber', 'gosiNumber'], ['gosiBaseSalary', 'gosiBaseSalary'],
        ['housingAllowance', 'housingAllowance'], ['transportAllowance', 'transportAllowance'],
        ['phoneAllowance', 'phoneAllowance'], ['workNatureAllowance', 'workNatureAllowance'], ['otherAllowance', 'otherAllowance'],
      ]
      for (const [field, target] of optionalFields) {
        if (initial[field] != null && initial[field] !== '' && String(form[field] ?? '').trim() === '') payload[target] = null
      }
      if (initial.workScheduleId != null && selectedSchedule === '') payload.workScheduleId = null
      if (initial.photoFileId != null && form.photoFileId == null) payload.photoFileId = null
      if ((initial.addressCity || initial.addressDistrict) && !form.addressCity.trim() && !form.addressDistrict.trim()) payload.address = null
      if (initial.workEmail && !form.workEmail.trim()) payload.email = null
    }
    if (mode === 'add') return payload
    const employeePayload = employeeCalendarPayload(payload, initial?.branchId ?? '', form.branchId, calendarContext, { effectiveFrom: form.attendanceEffectiveFrom ?? '', reason: form.attendanceChangeReason ?? '' }, calendarInitialConfirmation)
    return employeeSalaryEditPayload(employeePayload, salaryChangeContext, form, salaryEvidence)
  }

  const handleSubmit = async () => {
    for (const step of [1, 2, 3]) {
      const issue = stepIssue(step)
      if (issue) { setStepError(issue); setCurrentStep(step); return }
    }
    await onSubmit(buildPayload())
  }

  // تحقق الحقول الإجبارية لكل خطوة قبل السماح بالتالي
  const stepIssue = (step: number): string | null => {
    if (step === 3 && salaryChanged && salaryChangeContext) {
      try { buildEmployeeSalaryChange(salaryChangeContext, form, salaryEvidence) }
      catch (cause) { return cause instanceof Error ? cause.message : 'راجع بيانات تغيير الأجر.' }
    }
    if (step === 3 && mode === 'add') {
      try { employeeCreateSalaryPeriod(salaryStart, createSalaryPeriod, form) }
      catch (cause) { return cause instanceof Error ? cause.message : 'راجع شهر سريان أجر التعيين.' }
    }
    if (step === 1 && !form.firstNameAr.trim()) {
      return 'الاسم الأول مطلوب قبل المتابعة'
    }
    if (step === 2) {
      if (!(form.employeeCode.trim() || form.fingerprintCode.trim())) {
        return 'كود الموظف (أو كود البصمة) مطلوب'
      }
      if (!form.branchId) return 'اختر الفرع قبل المتابعة'
      if (!form.joinDate) return 'تاريخ التعيين مطلوب'
      const attendanceChanged = (form.flexOverrideMode ?? 'INHERIT') !== (initial?.flexOverrideMode ?? 'INHERIT') ||
        (selectedSchedule || null) !== (initial?.workScheduleId ?? null)
      if (mode === 'edit' && attendanceChanged) {
        if (!form.attendanceEffectiveFrom) return 'حدد تاريخ سريان تغيير الدوام أو المرونة'
        if (!form.attendanceChangeReason?.trim()) return 'اكتب سبب تغيير الدوام أو المرونة'
      }
      if (calendarRequested) {
        try { buildCalendarChange(calendarContext, { effectiveFrom: form.attendanceEffectiveFrom ?? '', reason: form.attendanceChangeReason ?? '' }) }
        catch (cause) { return (cause as Error).message }
      }
    }
    return null
  }

  const nextStep = () => {
    const issue = stepIssue(currentStep)
    if (issue) {
      setStepError(issue)
      return
    }
    setStepError('')
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const isEdit = mode === 'edit'
  const bannerError = stepError || error || catalogError

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {isEdit ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
            </h1>
            <p className="text-gray-500 mt-1">
              {isEdit ? 'تحديث بيانات الموظف في النظام' : 'إدخال بيانات الموظف الجديد في النظام'}
            </p>
          </div>
          <Link href="/employees" className="btn-secondary flex items-center gap-2">
            <X size={18} />
            إلغاء
          </Link>
        </div>

        {!isEdit && <div className="rounded-xl border border-primary-100 bg-primary-50 p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-semibold text-primary-900">مسودة إضافة الموظف</h2><p className="text-xs text-primary-800 mt-1 leading-6">حفظ يدوي للبيانات ومراجع المرفقات المرفوعة في جلسة هذا التبويب فقط. تُمسح عند إغلاق التبويب أو تسجيل الخروج أو إنشاء الموظف.</p>{sessionDraft && <p className="text-xs text-gray-600 mt-1">آخر حفظ: {new Date(sessionDraft.savedAt).toLocaleString('ar-EG-u-ca-gregory')}</p>}</div>
            <div className="flex flex-wrap gap-2">
              {sessionDraft && <button type="button" onClick={() => setRestoreDraftOpen(true)} disabled={submitting || uploadingAny} className="btn-secondary text-sm">استرجاع المسودة</button>}
              {(sessionDraft || draftError) && <button type="button" onClick={discardSessionDraft} disabled={!draftUserId || submitting || uploadingAny} className="btn-secondary text-sm">حذف المسودة</button>}
              <button type="button" onClick={persistDraft} disabled={!draftUserId || submitting || uploadingAny} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"><Save size={16} />حفظ مسودة الجلسة</button>
            </div>
          </div>
          {draftError && <p role="alert" className="text-sm text-red-700">{draftError}</p>}
          {draftNotice && <p role="status" className="text-sm text-green-800">{draftNotice}</p>}
          {uploadingAny && <p className="text-xs text-gray-600">انتظر اكتمال رفع المرفقات قبل حفظ المسودة أو استرجاعها.</p>}
        </div>}

        {/* Progress Steps */}
        <div className="card">
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex shrink-0 items-center">
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(step.id)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      currentStep === step.id
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                        : currentStep > step.id
                        ? 'bg-success-500 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <step.icon size={22} />
                  </button>
                  <span
                    className={`mt-2 text-sm font-medium ${
                      currentStep === step.id
                        ? 'text-primary-600'
                        : currentStep > step.id
                        ? 'text-success-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 sm:w-24 h-1 mx-2 sm:mx-4 rounded-full transition-all ${
                      currentStep > step.id ? 'bg-success-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="card">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4">
                البيانات الشخصية
              </h2>

              {/* Photo Upload */}
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl} alt="صورة الموظف" className="w-full h-full object-cover" />
                    ) : avatarLetter ? (
                      <span className="text-3xl font-bold text-gray-300">{avatarLetter}</span>
                    ) : (
                      <User size={36} className="text-gray-300" />
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <label className="btn-secondary text-sm py-2 px-4 flex items-center gap-2 cursor-pointer">
                      <Upload size={16} />
                      {photoUploading ? 'جارٍ الرفع...' : photoUrl ? 'تغيير الصورة' : 'رفع صورة'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoPick(e.target.files?.[0])}
                      />
                    </label>
                    {(photoUrl || form.photoFileId != null) && (
                      <button
                        type="button"
                        onClick={handlePhotoRemove}
                        className="text-xs text-red-500 hover:text-red-600"
                      >
                        إزالة
                      </button>
                    )}
                    {photoError && <p className="text-xs text-red-500">{photoError}</p>}
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-4">
                  {/* Name Fields - Arabic */}
                  <div>
                    <label className="label">الاسم الأول (عربي) *</label>
                    <input type="text" className="input" placeholder="أحمد" value={form.firstNameAr} onChange={(e) => setField('firstNameAr', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">اسم الأب (عربي)</label>
                    <input type="text" className="input" placeholder="محمد" value={form.fatherNameAr} onChange={(e) => setField('fatherNameAr', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">اسم الجد (عربي)</label>
                    <input type="text" className="input" placeholder="علي" value={form.grandNameAr} onChange={(e) => setField('grandNameAr', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">اسم العائلة (عربي)</label>
                    <input type="text" className="input" placeholder="السعيد" value={form.familyNameAr} onChange={(e) => setField('familyNameAr', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Name Fields - English */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">First Name</label>
                  <input type="text" className="input" placeholder="Ahmed" dir="ltr" value={form.firstNameEn} onChange={(e) => setField('firstNameEn', e.target.value)} />
                </div>
                <div>
                  <label className="label">Middle Name</label>
                  <input type="text" className="input" placeholder="Mohammed" dir="ltr" value={form.middleNameEn} onChange={(e) => setField('middleNameEn', e.target.value)} />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input type="text" className="input" placeholder="Alsaeed" dir="ltr" value={form.lastNameEn} onChange={(e) => setField('lastNameEn', e.target.value)} />
                </div>
                <div>
                  <label className="label">الاسم الكامل (تلقائي)</label>
                  <input
                    type="text"
                    className="input bg-gray-50"
                    value={fullNameAr}
                    disabled
                  />
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">تاريخ الميلاد</label>
                  <div className="relative">
                    <input type="date" className="input pl-10" value={form.birthDate} onChange={(e) => setField('birthDate', e.target.value)} />
                    <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="label">مكان الميلاد</label>
                  <input type="text" className="input" placeholder="الرياض" value={form.birthPlace} onChange={(e) => setField('birthPlace', e.target.value)} />
                </div>
                <div>
                  <label className="label">الجنس</label>
                  <select className="input" value={form.gender} onChange={(e) => setField('gender', e.target.value)}>
                    <option value="">اختر</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className="label">الحالة الاجتماعية</label>
                  <select className="input" value={form.maritalStatus} onChange={(e) => setField('maritalStatus', e.target.value)}>
                    <option value="">اختر</option>
                    <option value="single">أعزب</option>
                    <option value="married">متزوج</option>
                    <option value="divorced">مطلق</option>
                    <option value="widowed">أرمل</option>
                  </select>
                </div>
              </div>

              {/* Identity Documents */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">الجنسية</label>
                  <input className="input" list="employee-nationality-options" value={form.nationality} onChange={(e) => setField('nationality', e.target.value)} placeholder="اكتب الجنسية" />
                  <datalist id="employee-nationality-options">{nationalityOptions.map(n => <option key={n} value={n} />)}</datalist>
                </div>
                <div>
                  <label className="label">رقم الهوية / الإقامة</label>
                  <input type="text" className="input" placeholder="1234567890" dir="ltr" value={form.nationalId} onChange={(e) => setField('nationalId', e.target.value)} />
                </div>
                <div>
                  <label className="label">رقم جواز السفر</label>
                  <input type="text" className="input" placeholder="A12345678" dir="ltr" value={form.passportNo} onChange={(e) => setField('passportNo', e.target.value)} />
                </div>
                <div>
                  <label className="label">تاريخ انتهاء الجواز</label>
                  <input type="date" className="input" value={form.passportExpiry} onChange={(e) => setField('passportExpiry', e.target.value)} />
                </div>
              </div>

              {/* Contact Info */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                معلومات الاتصال
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">رقم الجوال</label>
                  <div className="relative">
                    <input type="tel" className="input pl-10" placeholder="+966 50 123 4567" dir="ltr" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="label">رقم جوال بديل</label>
                  <input type="tel" className="input" placeholder="+966 55 123 4567" dir="ltr" value={form.phoneAlt} onChange={(e) => setField('phoneAlt', e.target.value)} />
                </div>
                <div>
                  <label className="label">البريد الإلكتروني الشخصي</label>
                  <div className="relative">
                    <input type="email" className="input pl-10" placeholder="email@example.com" dir="ltr" value={form.personalEmail} onChange={(e) => setField('personalEmail', e.target.value)} />
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Address */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                العنوان
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">البلد</label>
                  <select className="input" value={form.country} onChange={(e) => setField('country', e.target.value)}>
                    <option value="">اختر</option>
                    <option value="SA">السعودية</option>
                    <option value="AE">الإمارات</option>
                    <option value="EG">مصر</option>
                  </select>
                </div>
                <div>
                  <label className="label">المدينة</label>
                  <input type="text" className="input" placeholder="الرياض" value={form.addressCity} onChange={(e) => setField('addressCity', e.target.value)} />
                </div>
                <div>
                  <label className="label">الحي</label>
                  <input type="text" className="input" placeholder="العليا" value={form.addressDistrict} onChange={(e) => setField('addressDistrict', e.target.value)} />
                </div>
                <div>
                  <label className="label">الرمز البريدي</label>
                  <input type="text" className="input" placeholder="12345" dir="ltr" value={form.postalCode} onChange={(e) => setField('postalCode', e.target.value)} />
                </div>
              </div>

              {/* Emergency Contact */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                جهة اتصال للطوارئ
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">الاسم</label>
                  <input type="text" className="input" placeholder="اسم جهة الاتصال" value={form.emergencyName} onChange={(e) => setField('emergencyName', e.target.value)} />
                </div>
                <div>
                  <label className="label">صلة القرابة</label>
                  <select className="input" value={form.emergencyRelation} onChange={(e) => setField('emergencyRelation', e.target.value)}>
                    <option value="">اختر</option>
                    <option value="spouse">زوج/زوجة</option>
                    <option value="parent">أب/أم</option>
                    <option value="sibling">أخ/أخت</option>
                    <option value="child">ابن/ابنة</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="label">رقم الجوال</label>
                  <input type="tel" className="input" placeholder="+966 50 123 4567" dir="ltr" value={form.emergencyPhone} onChange={(e) => setField('emergencyPhone', e.target.value)} />
                </div>
                <div>
                  <label className="label">رقم بديل</label>
                  <input type="tel" className="input" placeholder="+966 50 123 4567" dir="ltr" value={form.emergencyPhoneAlt} onChange={(e) => setField('emergencyPhoneAlt', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Employment Information */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4">
                البيانات الوظيفية
              </h2>

              {/* Employee ID */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">الرقم الوظيفي *</label>
                  <input type="text" className="input" placeholder="EMP001" dir="ltr" value={form.employeeCode} onChange={(e) => setField('employeeCode', e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">اكتب الرقم الوظيفي، أو سيُستخدم رقم البصمة عند تركه فارغاً</p>
                </div>
                <div>
                  <label className="label">رقم البصمة</label>
                  <input type="text" className="input" placeholder="001" dir="ltr" maxLength={20} value={form.fingerprintCode} onChange={(e) => setField('fingerprintCode', e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">كوده على جهاز البصمة — تُطابَق به البصمات أولاً ثم بالرقم الوظيفي</p>
                </div>
                <div>
                  <label className="label">تاريخ التعيين *</label>
                  <input type="date" className="input" value={form.joinDate} onChange={(e) => setField('joinDate', e.target.value)} />
                </div>
                <div>
                  <label className="label">تاريخ بداية العمل الفعلي</label>
                  <input type="date" className="input" value={form.actualStartDate} onChange={(e) => setField('actualStartDate', e.target.value)} />
                </div>
              </div>

              {/* Employment Type */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">نوع التوظيف</label>
                  <select className="input" value={form.workType} onChange={(e) => setField('workType', e.target.value)}>
                    <option value="">اختر</option>
                    <option value="full_time">دوام كامل</option>
                    <option value="part_time">دوام جزئي</option>
                    <option value="contract">عقد مؤقت</option>
                    <option value="consultant">استشاري</option>
                    <option value="intern">متدرب</option>
                  </select>
                </div>
                <div>
                  <label className="label">حالة الموظف</label>
                  <select className="input" value={form.status} onChange={(e) => { const nextStatus = e.target.value; if (nextStatus === 'active' || nextStatus === 'probation') setField('status', nextStatus) }}>
                    <option value="probation">{statusLabels.probation}</option>
                    <option value="active">نشط</option>
                    {form.status && !['probation', 'active'].includes(form.status) && (
                      <option value={form.status}>{statusLabels[form.status] ?? form.status}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="label">تاريخ انتهاء فترة التجربة</label>
                  <input type="date" className="input" value={form.probationEndDate} onChange={(e) => setField('probationEndDate', e.target.value)} />
                </div>
                <div>
                  <label className="label">مصدر التوظيف</label>
                  <select className="input" value={form.recruitmentSource} onChange={(e) => setField('recruitmentSource', e.target.value)}>
                    <option value="">اختر</option>
                    <option value="jobsite">موقع توظيف</option>
                    <option value="referral">ترشيح موظف</option>
                    <option value="agency">وكالة توظيف</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
              </div>

              {/* Organization Position */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                الموقع التنظيمي
              </h3>
              <div className="grid grid-cols-3 gap-4">

                <div>
                  <label className="label">الفرع *</label>
                  <select
                    className="input"
                    value={form.branchId}
                    disabled={mode === 'edit' && (!calendarContext || calendarContext.currentMatchesHistory === false)}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, branchId: e.target.value, departmentId: '', teamId: '' }))
                    }
                  >
                    <option value="">اختر</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">الإدارة/القسم</label>
                  <select
                    className="input"
                    value={form.departmentId}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, departmentId: e.target.value, teamId: '' }))
                    }
                  >
                    <option value="">اختر</option>
                    {filteredDepartments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">الفريق</label>
                  <select className="input" value={form.teamId} onChange={(e) => setField('teamId', e.target.value)}>
                    <option value="">بدون فريق (تابع للقسم مباشرة)</option>
                    {filteredTeams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">قائد الفريق يعتمد كمدير مباشر فقط إن لم يُحدَّد للموظف مدير مباشر</p>
                </div>
                <div>
                  <label className="label">المسمى الوظيفي</label>
                  <select className="input" value={form.jobTitle} onChange={(e) => setField('jobTitle', e.target.value)}>
                    <option value="">اختر</option>
                    {form.jobTitle && !jobTitleOptions.includes(form.jobTitle) && (
                      <option value={form.jobTitle}>{form.jobTitle}</option>
                    )}
                    {jobTitleOptions.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">الدرجة الوظيفية</label>
                  <select className="input" value={form.gradeId} onChange={(e) => setField('gradeId', e.target.value)}>
                    <option value="">اختر</option>
                    <option value="1">Grade 1</option>
                    <option value="2">Grade 2</option>
                    <option value="3">Grade 3</option>
                    <option value="4">Grade 4</option>
                    <option value="5">Grade 5</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">المدير المباشر</label>
                  <select className="input" value={form.managerId} onChange={(e) => setField('managerId', e.target.value)}>
                    <option value="">اختر (أو يتحدد من الفريق)</option>
                    {allEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName}{emp.jobTitle ? ` - ${emp.jobTitle}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">يتحدد تلقائياً عند اختيار الفريق</p>
                </div>
                <div>
                  <label className="label">موقع العمل</label>
                  <input type="text" className="input" placeholder="المكتب الرئيسي" value={form.workLocation} onChange={(e) => setField('workLocation', e.target.value)} />
                </div>
                <div>
                  <label className="label">مركز التكلفة</label>
                  <select
                    className="input"
                    value={form.costCenterId}
                    onChange={(e) => setField('costCenterId', e.target.value)}
                  >
                    <option value="">بدون مركز تكلفة</option>
                    {costCenters.map((cc) => (
                      <option key={cc.id} value={String(cc.id)}>
                        {cc.code} — {cc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contract Info */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                معلومات العقد
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">نوع العقد</label>
                  <select className="input" value={form.contractType} onChange={(e) => setField('contractType', e.target.value)}>
                    <option value="">اختر</option>
                    <option value="permanent">دائم (غير محدد المدة)</option>
                    <option value="fixed_term">محدد المدة</option>
                    <option value="part_time">دوام جزئي</option>
                    <option value="seasonal">موسمي</option>
                  </select>
                </div>
                <div>
                  <label className="label">رقم العقد</label>
                  <input type="text" className="input" placeholder="C-2026-001" dir="ltr" value={form.contractNumber} onChange={(e) => setField('contractNumber', e.target.value)} />
                </div>
                <div>
                  <label className="label">تاريخ بداية العقد</label>
                  <input type="date" className="input" value={form.contractStart} onChange={(e) => setField('contractStart', e.target.value)} />
                </div>
                <div>
                  <label className="label">تاريخ نهاية العقد</label>
                  <input type="date" className="input" value={form.contractEnd} onChange={(e) => setField('contractEnd', e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">اتركه فارغاً لعقد غير محدد المدة</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">مدة العقد (أشهر)</label>
                  <input type="number" min={0} className="input" placeholder="24" value={form.contractDurationMonths} onChange={(e) => setField('contractDurationMonths', e.target.value)} />
                </div>
                <div>
                  <label className="label">فترة الإشعار (أيام)</label>
                  <input type="number" min={0} className="input" placeholder="30" value={form.noticePeriodDays} onChange={(e) => setField('noticePeriodDays', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="label">مرفق العقد</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      className="input flex-1"
                      accept=".pdf"
                      onChange={(e) => handleContractPick(e.target.files?.[0])}
                    />
                  </div>
                  {contractUploading && (
                    <p className="text-xs text-gray-400 mt-1">جارٍ رفع المرفق…</p>
                  )}
                  {!contractUploading && contractFileRef && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ تم رفع المرفق{contractFileName ? ` — ${contractFileName}` : ''} (سيُحفظ كمستند «عقد»)
                    </p>
                  )}
                </div>
              </div>

              {/* Work Schedule */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2 flex items-center gap-2">
                <Clock size={18} className="text-primary-500" />
                جدول العمل
              </h3>
              <p className="text-sm text-gray-500 mb-4">اختر جدول العمل الذي سيتبعه الموظف (يمكن إنشاء جداول جديدة من الإعدادات)</p>

              {scheduleList.length === 0 && (
                <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-500 text-center">
                  لا توجد جداول عمل — أنشئ جدولاً من الإعدادات أولاً
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {scheduleList.map((schedule, idx) => {
                  const isSelected = selectedSchedule === schedule.id
                  const colorClass =
                    scheduleColorList[idx % scheduleColorList.length]
                  const workDaysCount = weekDays.filter((d) =>
                    isWorkingDay(d.key, schedule.weekendDays)
                  ).length

                  return (
                    <div
                      key={schedule.id}
                      onClick={() => setSelectedSchedule(schedule.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 shadow-lg shadow-primary-500/20'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <div className={`w-10 h-10 ${colorClass} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <Calendar size={20} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`font-bold ${isSelected ? 'text-primary-700' : 'text-gray-800'}`}>
                              {schedule.name}
                            </p>
                            {schedule.isDefault && (
                              <span className="px-2 py-0.5 bg-primary-100 text-primary-600 rounded-full text-xs font-medium">
                                افتراضي
                              </span>
                            )}
                          </div>
                          {schedule.description && (
                            <p className="text-sm text-gray-500 mt-1">{schedule.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 flex items-center gap-1">
                            <Clock size={14} />
                            ساعات العمل:
                          </span>
                          <span className={`font-medium ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
                            {schedule.startTime} - {schedule.endTime}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">أيام العمل:</span>
                          <span className={`font-medium ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
                            {workDaysCount} أيام في الأسبوع
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">عدد الموظفين:</span>
                          <span className={`font-medium ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
                            {schedule.employeeCount ?? 0} موظف
                          </span>
                        </div>
                      </div>

                      {/* أيام العمل — مشتقّة من أيام نهاية الأسبوع */}
                      <div className="flex gap-1 mt-4 pt-3 border-t border-gray-100">
                        {weekDays.map(day => (
                          <div
                            key={day.key}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              isWorkingDay(day.key, schedule.weekendDays)
                                ? `${colorClass} text-white`
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {day.shortName}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {selectedSchedule !== '' && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl flex items-start gap-3">
                  <Clock size={20} className="text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">
                      تم اختيار: {scheduleList.find(s => s.id === selectedSchedule)?.name}
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      المحرك يشتقّ العطلة الأسبوعية والساعات من هذا الجدول لهذا الموظف
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <label className="block text-sm font-medium text-gray-800">
                  المرونة لهذا الموظف
                  <select className="input mt-2 w-full" value={form.flexOverrideMode ?? 'INHERIT'}
                    onChange={event => setField('flexOverrideMode', event.target.value as 'INHERIT' | 'ENABLED' | 'DISABLED')}>
                    <option value="INHERIT">يتبع إعداد الوردية أو جدول العمل</option>
                    <option value="ENABLED">مفعلة لهذا الموظف</option>
                    <option value="DISABLED">موقوفة لهذا الموظف</option>
                  </select>
                </label>
                <p className="text-sm text-gray-600">مدة المرونة والساعات المطلوبة تُؤخذ من دوام اليوم. الاختيار الفردي يحدد التفعيل، والوقت بعد نهاية نافذة المرونة يُحسب تأخيرًا حتى لو استكمل الموظف ساعاته.</p>
                {form.flexOverrideMode === 'ENABLED' && <p className="text-sm text-amber-800">يلزم تعريف مدة مرونة صحيحة في الوردية أو جدول العمل قبل تفعيلها للموظف.</p>}
                {mode === 'edit' && <div className="space-y-2">
                  <CalendarContextSummary context={calendarContext} error={calendarContextError} />
                  {calendarContext && <label className="flex gap-2 items-start text-sm text-gray-700"><input type="checkbox" checked={calendarInitialConfirmation} disabled={submitting || calendarContext.currentMatchesHistory === false} onChange={event => setCalendarInitialConfirmation(event.target.checked)} />أؤكد سريان الفرع الحالي لهذا الموظف من تاريخ أحدده، حتى دون تغيير الفرع.</label>}
                  {!calendarContext && <p className="text-xs text-gray-600">تعديل الفرع متوقف، ويمكن حفظ باقي بيانات الموظف. أعد تحميل الصفحة لإعادة قراءة التقويم.</p>}
                </div>}
                {(mode === 'add' || calendarRequested || form.flexOverrideMode !== (initial?.flexOverrideMode ?? 'INHERIT') || (selectedSchedule || null) !== (initial?.workScheduleId ?? null)) && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm text-gray-700">يسري الفرع أو الدوام أو المرونة من
                      <input type="date" className="input mt-2 w-full" value={form.attendanceEffectiveFrom ?? ''}
                        onChange={event => setField('attendanceEffectiveFrom', event.target.value)} />
                    </label>
                    <label className="text-sm text-gray-700">سبب التغيير
                      <input type="text" maxLength={500} className="input mt-2 w-full" value={form.attendanceChangeReason ?? ''}
                        onChange={event => setField('attendanceChangeReason', event.target.value)} placeholder={mode === 'add' ? 'تعيين الموظف على الدوام' : 'سبب تعديل الدوام أو المرونة'} />
                    </label>
                    <p className="text-xs text-gray-500 sm:col-span-2">يُحفظ تاريخ التغيير وصاحبه. الفترات المعتمدة تظل محفوظة؛ التعديل يؤثر من تاريخ السريان المحدد.</p>
                    {mode === 'add' && <p className="text-xs text-gray-500 sm:col-span-2">عند الإنشاء يثبت هذا التاريخ سريان الدوام والفرع معًا. إن تركته فارغًا تبدأ التغطية من تاريخ إنشاء الملف، وليس تاريخ الالتحاق؛ إثبات تاريخ سابق يحتاج إدخاله مع السبب.</p>}
                  </div>
                )}
              </div>

              {/* Link to settings */}
              <div className="mt-4 p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 size={20} className="text-gray-400" />
                  <p className="text-sm text-gray-600">
                    لإنشاء جداول عمل جديدة أو تعديل الجداول الحالية
                  </p>
                </div>
                <a href="/settings/work-days" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  الذهاب للإعدادات ←
                </a>
              </div>

              {/* Leave Entitlements */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                استحقاقات الإجازات
              </h3>

              {/* Toggle for leave entitlement */}
              <div className={`p-4 rounded-xl flex items-center justify-between ${leaveEntitled ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${leaveEntitled ? 'bg-green-100' : 'bg-gray-200'}`}>
                    <Calendar size={20} className={leaveEntitled ? 'text-green-600' : 'text-gray-400'} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">يستحق إجازات سنوية</p>
                    <p className="text-sm text-gray-500">
                      {leaveEntitled ? 'الموظف يستحق إجازات سنوية' : 'الموظف لا يستحق إجازات سنوية'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLeaveEntitled(!leaveEntitled)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    leaveEntitled
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {leaveEntitled ? 'يستحق ✓' : 'لا يستحق'}
                </button>
              </div>

              {/* Leave fields - shown only if entitled */}
              {leaveEntitled && (
              <div className="space-y-4 mt-4">
                {/* قيم الاستحقاق العامة — للقراءة فقط، تُدار من صفحة السياسات.
                    الخاص بالموظف: مفتاح الاستحقاق أعلاه + الرصيد الافتتاحي أدناه */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">
                      قيم الاستحقاق العامة (على الشركة كلها)
                    </p>
                    <a
                      href="/settings/policies"
                      className="text-xs text-primary-600 hover:underline font-medium"
                    >
                      تعدّل من السياسات ←
                    </a>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {[
                      { l: 'الإجازة السنوية', v: `${policyCfg['leave.annual_entitled'] ?? '21'} يوم/سنة` },
                      {
                        l: 'طريقة الاستحقاق',
                        v:
                          policyCfg['leave.accrual_mode'] === 'yearly'
                            ? 'سنوي (دفعة واحدة)'
                            : policyCfg['leave.accrual_mode'] === 'daily'
                              ? 'يومي (تراكمي)'
                              : 'شهري (يتراكم كل شهر)',
                      },
                      { l: 'فترة التجربة قبل الاستحقاق', v: `${policyCfg['leave.probation_months'] ?? '0'} شهر` },
                      { l: 'الإجازة المرضية', v: '180 يوم (نظام العمل)' },
                      { l: 'الحد الأقصى للترحيل', v: `${policyCfg['leave.carryover_max_days'] ?? '10'} يوم` },
                      { l: 'صلاحية الرصيد المُرحّل', v: `${policyCfg['leave.carryover_expiry_months'] ?? '3'} شهر` },
                    ].map((f) => (
                      <div key={f.l}>
                        <p className="text-gray-400 text-xs mb-1">{f.l}</p>
                        <p className="font-bold text-gray-800">{f.v}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    قيم عامة تُطبَّق على كل الموظفين. الخاص بهذا الموظف: مفتاح «يستحق سنوي»
                    أعلاه + الرصيد الافتتاحي المُرحّل أدناه.
                  </p>
                </div>

              {/* الرصيد الافتتاحي المُرحّل — يعمل في الإضافة والتعديل */}
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 mt-4">
                <div className="flex items-start gap-3 mb-4">
                  <Calendar size={20} className="text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">رصيد افتتاحي مُرحّل (اختياري)</p>
                    <p className="text-sm text-amber-700 mt-0.5">
                      لموظف قائم لديه رصيد سابق قبل دخوله النظام — الرصيد الجديد
                      يُحسب تلقائياً من تاريخ التعيين، وهذا الرصيد يبقى صالحاً حتى
                      التاريخ المحدد
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">الرصيد الافتتاحي (يوم)</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="مثال: 15"
                      min="0"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">صلاحية الرصيد الافتتاحي</label>
                    <select
                      className="input"
                      value={openingExpiry}
                      onChange={(e) =>
                        setOpeningExpiry(e.target.value as typeof openingExpiry)
                      }
                    >
                      <option value="end_of_year">حتى نهاية السنة الحالية</option>
                      <option value="custom_date">حتى تاريخ أحدده</option>
                      <option value="no_expiry">بدون انتهاء</option>
                    </select>
                  </div>
                  {openingExpiry === 'custom_date' && (
                    <div>
                      <label className="label">تاريخ انتهاء الرصيد</label>
                      <input
                        type="date"
                        className="input"
                        value={openingExpiryDate}
                        onChange={(e) => setOpeningExpiryDate(e.target.value)}
                      />
                    </div>
                  )}
                </div>
                {openingBalance && Number(openingBalance) > 0 && (
                  <p className="text-xs text-amber-700 mt-3">
                    ✓ سيبدأ الموظف برصيد {openingBalance} يوم
                    {openingExpiry === 'end_of_year' && ' صالح حتى 31 ديسمبر'}
                    {openingExpiry === 'custom_date' && openingExpiryDate && ` صالح حتى ${openingExpiryDate}`}
                    {openingExpiry === 'no_expiry' && ' بدون تاريخ انتهاء'}
                    ، بالإضافة إلى الرصيد الجديد المتراكم من تاريخ التعيين
                  </p>
                )}
              </div>

              </div>
              )}

              {/* Work Email */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                البريد الإلكتروني للعمل
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">البريد الإلكتروني للعمل</label>
                  <input type="email" className="input" placeholder="ahmed.m@company.com" dir="ltr" value={form.workEmail} onChange={(e) => setField('workEmail', e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">البريد اختياري ولا يُنشأ تلقائياً</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Financial Information */}
          {currentStep === 3 && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4">
                البيانات المالية
              </h2>

              {/* Salary */}
              {salaryLocked && (salaryChangeForbidden
                ? <p role="alert" className="text-sm text-amber-800">تعديل الأجر يتطلب صلاحية «اعتماد المسير»؛ الحقول المالية للعرض فقط ويمكنك حفظ البيانات غير المالية.</p>
                : <p role="alert" className="text-sm text-amber-800">{salaryContextError || 'تعذر تحميل الأجر الحالي بدقة.'} تعديل الأجر غير متاح حتى إعادة تحميل الصفحة؛ يمكنك حفظ البيانات غير المالية.</p>)}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="label">الراتب الأساسي</label>
                  <input type={mode === 'edit' ? 'text' : 'number'} inputMode="decimal" disabled={salaryLocked} className="input disabled:opacity-50" placeholder="10000" dir="ltr" value={form.basicSalary} onChange={(e) => setField('basicSalary', e.target.value)} />
                </div>
                <div>
                  <label className="label">العملة</label>
                  <select className="input disabled:opacity-50" disabled={salaryLocked} value={form.currency} onChange={(e) => setField('currency', e.target.value)}>
                    {mode === 'edit' && <option value="">غير محددة — اختر عند تغيير الأجر</option>}
                    {mode === 'edit' && form.currency && !['SAR', 'EGP', 'AED'].includes(form.currency) && <option value={form.currency}>{form.currency} — القيمة الحالية</option>}
                    <option value="SAR">ريال سعودي (SAR)</option>
                    {/* D8: عملات المسير SAR وEGP؛ AED يظهر فقط لقيمة محفوظة سابقًا */}
                    {form.currency === 'AED' && <option value="AED">درهم إماراتي (AED)</option>}
                    <option value="EGP">جنيه مصري (EGP)</option>
                  </select>
                </div>
                <div>
                  <label className="label">طريقة الدفع</label>
                  <select className="input" value={form.payMethod} onChange={(e) => setField('payMethod', e.target.value)}>
                    <option value="transfer">تحويل بنكي</option>
                    <option value="visa">فيزا</option>
                    <option value="cash">نقدي</option>
                  </select>
                </div>
                <div>
                  <label className="label">دورة الراتب</label>
                  <select className="input" value={form.salaryCycle} onChange={(e) => setField('salaryCycle', e.target.value)}>
                    <option value="monthly">شهري</option>
                    <option value="biweekly">نصف شهري</option>
                    <option value="weekly">أسبوعي</option>
                  </select>
                </div>
                <div>
                  <label className="label">مركز التكلفة (اختياري)</label>
                  <select
                    className="input"
                    value={form.costCenterId}
                    onChange={(e) => setField('costCenterId', e.target.value)}
                  >
                    <option value="">بدون مركز تكلفة</option>
                    {costCenters.map((cc) => (
                      <option key={cc.id} value={String(cc.id)}>
                        {cc.code} — {cc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Allowances */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                البدلات الثابتة
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="label">بدل السكن</label>
                  <input type={mode === 'edit' ? 'text' : 'number'} inputMode="decimal" disabled={salaryLocked} className="input disabled:opacity-50" placeholder="2500" dir="ltr" value={form.housingAllowance} onChange={(e) => setField('housingAllowance', e.target.value)} />
                </div>
                <div>
                  <label className="label">بدل المواصلات</label>
                  <input type={mode === 'edit' ? 'text' : 'number'} inputMode="decimal" disabled={salaryLocked} className="input disabled:opacity-50" placeholder="1000" dir="ltr" value={form.transportAllowance} onChange={(e) => setField('transportAllowance', e.target.value)} />
                </div>
                <div>
                  <label className="label">بدل الهاتف</label>
                  <input type={mode === 'edit' ? 'text' : 'number'} inputMode="decimal" disabled={salaryLocked} className="input disabled:opacity-50" placeholder="500" dir="ltr" value={form.phoneAllowance} onChange={(e) => setField('phoneAllowance', e.target.value)} />
                </div>
                <div>
                  <label className="label">بدل طبيعة العمل</label>
                  <input type={mode === 'edit' ? 'text' : 'number'} inputMode="decimal" disabled={salaryLocked} className="input disabled:opacity-50" placeholder="0" dir="ltr" value={form.workNatureAllowance} onChange={(e) => setField('workNatureAllowance', e.target.value)} />
                </div>
                <div>
                  <label className="label">بدلات أخرى</label>
                  <input type={mode === 'edit' ? 'text' : 'number'} inputMode="decimal" disabled={salaryLocked} min="0" className="input disabled:opacity-50" placeholder="0" dir="ltr" value={form.otherAllowance} onChange={(e) => setField('otherAllowance', e.target.value)} />
                </div>
              </div>

              <div className="p-4 bg-primary-50 rounded-xl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-gray-700">إجمالي الراتب الشهري</span>
                  <span className="text-2xl font-bold text-primary-600">{mode === 'edit' ? employeeSalaryTotal(form) ?? 'غير مكتمل' : totalMonthlySalary.toLocaleString()} {form.currency ? currencyLabel(form.currency) : ''}</span>
                </div>
              </div>

              {mode === 'add' && <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 space-y-3">
                <h3 className="font-semibold text-gray-800">توثيق أجر التعيين</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  <label className="label">يسري من راتب شهر<input type="month" className="input mt-1" min={salaryStart?.minPayrollPeriod ?? undefined} max={salaryStart?.maxPayrollPeriod} value={createSalaryPeriod || salaryStart?.defaultPayrollPeriod || ''} onChange={event => setCreateSalaryPeriod(event.target.value)} /></label>
                </div>
                <p className="text-sm text-gray-600">يُوثَّق الأجر أعلاه في سجل الأجر الشهري عند الحفظ، فيدخل الموظف أول مسير له دون توثيق منفصل. الراتب يسري على شهر المسير كاملًا بلا تقسيم داخله، وأيام الفترة قبل تاريخ التعيين لا تُحسب غيابًا ولا خصمًا.{salaryStart && (createSalaryPeriod || salaryStart.defaultPayrollPeriod) === salaryStart.defaultPayrollPeriod ? ` — راتب شهر ${salaryStart.defaultPayrollPeriod} = من ${salaryStart.defaultPayrollPeriodBounds.startDate} إلى ${salaryStart.defaultPayrollPeriodBounds.endDate} (الدورة تبدأ يوم ${salaryStart.cycleStartDay})` : ''}</p>
                {salaryStart?.hirePayrollPeriod && salaryStart.hirePayrollPeriod < salaryStart.defaultPayrollPeriod && <p className="text-sm text-amber-800">تاريخ التعيين يقع في راتب شهر {salaryStart.hirePayrollPeriod}؛ اختره إن كان أجر العقد يسري منه، وإلا تبقى الشهور السابقة لإنشاء الملف غير موثقة.</p>}
                {salaryStartError && <p role="alert" className="text-sm text-amber-800">{salaryStartError}</p>}
                <p className="text-xs text-gray-500">أجر بلا مبالغ لا يُوثَّق ويُستبعد الموظف من المسير بسبب ظاهر. الزيادة من شهر لاحق تُقدَّم بطلب زيادة راتب بعد الإنشاء.</p>
              </div>}

              {salaryChanged && <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 space-y-4">
                <h3 className="font-semibold text-gray-800">موعد تطبيق تعديل الراتب</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  <label className="label">يسري من راتب شهر<input type="month" max={salaryChangeContext?.currentPayrollPeriod} className="input mt-1" value={salaryEvidence.effectivePayrollPeriod} onChange={event => setSalaryEvidence(previous => ({ ...previous, effectivePayrollPeriod: event.target.value }))} /></label>
                  <label className="label">سبب التغيير<input className="input mt-1" maxLength={500} value={salaryEvidence.reason} onChange={event => setSalaryEvidence(previous => ({ ...previous, reason: event.target.value }))} /></label>
                  <label className="label">مرجع العقد أو القرار<input className="input mt-1" maxLength={200} value={salaryEvidence.evidenceReference} onChange={event => setSalaryEvidence(previous => ({ ...previous, evidenceReference: event.target.value }))} /></label>
                </div>
                <p className="text-sm text-gray-600">الراتب الجديد يسري على شهر المسير كاملًا بلا تقسيم داخله{salaryChangeContext ? ` — ${payrollMonthExplanation(salaryChangeContext)}` : ''}. تعديل الملف يقبل شهر المسير الجاري أو شهرًا سابقًا. للزيادة من شهر لاحق استخدم <Link href="/requests" className="underline text-primary-700">طلب زيادة راتب</Link>؛ الأجر الحالي لا يتغير قبل بداية ذلك الشهر واعتماد الطلب.</p>
                {salaryChangeContext?.historyContract === 'DAILY' && <p className="text-sm text-amber-800">سجل أجر هذا الموظف بتواريخ يومية لا تحدد شهر الراتب؛ حوّله إلى «يسري من راتب شهر» من <Link href="/payroll/salary-history" className="underline">سجل الأجر</Link> قبل تعديل الراتب.</p>}
                {salaryChangeContext?.historyRevision === 0 && <div className="space-y-3 border-t border-primary-200 pt-3">
                  <p className="text-sm font-medium text-gray-800">القيم السابقة التي ستُوثّق عند تأكيد شهر سابق</p>
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    {Object.entries(SALARY_HISTORY_FIELDS).map(([key, label]) => <div key={key}><dt className="text-gray-600">{label}</dt><dd className="font-medium break-all" dir="ltr">{salaryChangeContext.current[key as keyof typeof SALARY_HISTORY_FIELDS] ?? 'غير محدد'}</dd></div>)}
                    <div><dt className="text-gray-600">العملة السابقة</dt><dd>{salaryChangeContext.current.currency || 'غير محددة'}</dd></div>
                  </dl>
                  <label className="label">أؤكد أن الأجر الحالي السابق يسري من راتب شهر — اختياري<input type="month" disabled={!employeePreviousSalaryCanBeConfirmed(salaryChangeContext)} className="input mt-1 max-w-xs disabled:opacity-50" value={salaryEvidence.previousEffectivePayrollPeriod} onChange={event => setSalaryEvidence(previous => ({ ...previous, previousEffectivePayrollPeriod: event.target.value }))} /></label>
                  {!employeePreviousSalaryCanBeConfirmed(salaryChangeContext) && <p className="text-sm text-amber-800">القيم السابقة غير مكتملة أو غير صالحة؛ لا يمكن إثبات فترة سابقة منها.</p>}
                  <p className="text-xs text-gray-500">اختر هذا الشهر فقط إذا كان المستند يثبت القيم السابقة المعروضة من ذلك الشهر حتى الشهر السابق للتغيير. تركه فارغًا يُبقي الشهور السابقة غير موثقة، ولا يفترض تاريخ التعيين أو مبالغ بديلة.</p>
                </div>}
              </div>}

              {/* Bank Details */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                المعلومات البنكية
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">اسم البنك</label>
                  <input className="input" list="employee-bank-options" value={form.bankName} onChange={(e) => setField('bankName', e.target.value)} placeholder="اكتب اسم البنك" />
                  <datalist id="employee-bank-options">{bankOptions.map(bank => <option key={bank} value={bank} />)}</datalist>
                </div>
                <div>
                  <label className="label">اسم الفرع</label>
                  <input type="text" className="input" placeholder="فرع العليا" value={form.bankBranch} onChange={(e) => setField('bankBranch', e.target.value)} />
                </div>
                <div>
                  <label className="label">رقم الحساب (IBAN)</label>
                  <input type="text" className="input" placeholder="SA00 0000 0000 0000 0000 0000" dir="ltr" value={form.iban} onChange={(e) => setField('iban', e.target.value)} />
                </div>
              </div>

              {/* Insurance */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                التأمينات الاجتماعية
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">رقم التأمينات (GOSI)</label>
                  <input type="text" className="input" placeholder="1234567890" dir="ltr" value={form.gosiNumber} onChange={(e) => setField('gosiNumber', e.target.value)} />
                </div>
                <div>
                  <label className="label">خاضع للتأمينات</label>
                  <select className="input" value={form.isGosiRegistered} onChange={(e) => setField('isGosiRegistered', e.target.value)}>
                    <option value="">اختر</option>
                    <option value="true">نعم</option>
                    <option value="false">لا</option>
                  </select>
                </div>
                <div>
                  <label className="label">الراتب الخاضع للتأمينات</label>
                  <input type="number" className="input" placeholder="12500" dir="ltr" value={form.gosiBaseSalary} onChange={(e) => setField('gosiBaseSalary', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Qualifications — خمس قوائم تُضاف صفوفها وتُحذف قبل الحفظ */}
          {currentStep === 4 && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4">
                المؤهلات والخبرات
              </h2>
              <p className="text-sm text-gray-500 -mt-4">
                أضِف كل عنصر بزر «إضافة» ليظهر في القائمة. تُحفظ كلها مع حفظ الموظف.
              </p>

              {/* ===== التعليم ===== */}
              <h3 className="text-md font-bold text-gray-700 border-b border-gray-100 pb-2">
                التعليم
              </h3>
              <SavedList kind="education" label={(r) => `${DEGREE_LABEL[r.degree] ?? r.degree}${r.major ? ` — ${r.major}` : ''}${r.institution ? ` · ${r.institution}` : ''}${r.graduationYear ? ` (${r.graduationYear})` : ''}`} />
              <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="label">المؤهل</label>
                    <select
                      className="input"
                      value={eduDraft.degree ?? ''}
                      onChange={(e) => setEduDraft({ ...eduDraft, degree: e.target.value })}
                    >
                      <option value="">اختر</option>
                      <option value="phd">دكتوراه</option>
                      <option value="master">ماجستير</option>
                      <option value="bachelor">بكالوريوس</option>
                      <option value="diploma">دبلوم</option>
                      <option value="high_school">ثانوي</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">التخصص</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="علوم الحاسب"
                      value={eduDraft.major ?? ''}
                      onChange={(e) => setEduDraft({ ...eduDraft, major: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">الجامعة/المعهد</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="جامعة الملك سعود"
                      value={eduDraft.institution ?? ''}
                      onChange={(e) => setEduDraft({ ...eduDraft, institution: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">سنة التخرج</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="2020"
                      dir="ltr"
                      value={eduDraft.graduationYear ?? ''}
                      onChange={(e) => setEduDraft({ ...eduDraft, graduationYear: e.target.value })}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="text-sm text-primary-500 hover:text-primary-600 font-medium"
                  onClick={() => addQualRow(eduDraft, setEduDraft, setEduRows, 'degree', 'المؤهل')}
                >
                  + إضافة مؤهل
                </button>
                {eduRows.length > 0 && (
                  <ul className="divide-y divide-gray-200 border-t border-gray-200 pt-2">
                    {eduRows.map((r, i) => (
                      <li key={i} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-gray-700">
                          {DEGREE_LABEL[r.degree] ?? r.degree}
                          {r.major ? ` — ${r.major}` : ''}
                          {r.institution ? ` · ${r.institution}` : ''}
                          {r.graduationYear ? ` (${r.graduationYear})` : ''}
                        </span>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-600 text-xs font-medium"
                          onClick={() => removeQualRow(setEduRows, i)}
                        >
                          حذف
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ===== الشهادات المهنية ===== */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                الشهادات المهنية
              </h3>
              <SavedList kind="certifications" label={(r) => `${r.name}${r.issuer ? ` — ${r.issuer}` : ''}${r.expiryDate ? ` · تنتهي ${String(r.expiryDate).slice(0, 10)}` : ''}`} />
              <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="label">اسم الشهادة</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="PMP"
                      value={certDraft.name ?? ''}
                      onChange={(e) => setCertDraft({ ...certDraft, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">الجهة المانحة</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="PMI"
                      value={certDraft.issuer ?? ''}
                      onChange={(e) => setCertDraft({ ...certDraft, issuer: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">تاريخ الحصول</label>
                    <input
                      type="date"
                      className="input"
                      value={certDraft.issueDate ?? ''}
                      onChange={(e) => setCertDraft({ ...certDraft, issueDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">تاريخ الانتهاء</label>
                    <input
                      type="date"
                      className="input"
                      value={certDraft.expiryDate ?? ''}
                      onChange={(e) => setCertDraft({ ...certDraft, expiryDate: e.target.value })}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="text-sm text-primary-500 hover:text-primary-600 font-medium"
                  onClick={() => addQualRow(certDraft, setCertDraft, setCertRows, 'name', 'اسم الشهادة')}
                >
                  + إضافة شهادة
                </button>
                {certRows.length > 0 && (
                  <ul className="divide-y divide-gray-200 border-t border-gray-200 pt-2">
                    {certRows.map((r, i) => (
                      <li key={i} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-gray-700">
                          {r.name}
                          {r.issuer ? ` — ${r.issuer}` : ''}
                          {r.expiryDate ? ` · تنتهي ${r.expiryDate}` : ''}
                        </span>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-600 text-xs font-medium"
                          onClick={() => removeQualRow(setCertRows, i)}
                        >
                          حذف
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ===== الخبرات السابقة ===== */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                الخبرات السابقة
              </h3>
              <SavedList kind="experiences" label={(r) => `${r.company}${r.jobTitle ? ` — ${r.jobTitle}` : ''}${r.fromDate ? ` · ${String(r.fromDate).slice(0, 10)} ← ${r.toDate ? String(r.toDate).slice(0, 10) : 'حتى الآن'}` : ''}`} />
              <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">اسم الشركة</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="شركة ABC"
                      value={expDraft.company ?? ''}
                      onChange={(e) => setExpDraft({ ...expDraft, company: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">المسمى الوظيفي</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="مطور برمجيات"
                      value={expDraft.jobTitle ?? ''}
                      onChange={(e) => setExpDraft({ ...expDraft, jobTitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">البلد</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="السعودية"
                      value={expDraft.country ?? ''}
                      onChange={(e) => setExpDraft({ ...expDraft, country: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">من تاريخ</label>
                    <input
                      type="date"
                      className="input"
                      value={expDraft.fromDate ?? ''}
                      onChange={(e) => setExpDraft({ ...expDraft, fromDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">إلى تاريخ</label>
                    <input
                      type="date"
                      className="input"
                      value={expDraft.toDate ?? ''}
                      onChange={(e) => setExpDraft({ ...expDraft, toDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">سبب الترك</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="فرصة أفضل"
                      value={expDraft.leaveReason ?? ''}
                      onChange={(e) => setExpDraft({ ...expDraft, leaveReason: e.target.value })}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="text-sm text-primary-500 hover:text-primary-600 font-medium"
                  onClick={() => addQualRow(expDraft, setExpDraft, setExpRows, 'company', 'اسم الشركة')}
                >
                  + إضافة خبرة
                </button>
                {expRows.length > 0 && (
                  <ul className="divide-y divide-gray-200 border-t border-gray-200 pt-2">
                    {expRows.map((r, i) => (
                      <li key={i} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-gray-700">
                          {r.company}
                          {r.jobTitle ? ` — ${r.jobTitle}` : ''}
                          {r.fromDate ? ` · ${r.fromDate} ← ${r.toDate || 'حتى الآن'}` : ''}
                        </span>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-600 text-xs font-medium"
                          onClick={() => removeQualRow(setExpRows, i)}
                        >
                          حذف
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ===== المهارات ===== */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                المهارات
              </h3>
              <SavedList kind="skills" label={(r) => `${r.name}${r.level ? ` — ${SKILL_LEVEL_LABEL[r.level] ?? r.level}` : ''}${r.yearsExperience ? ` · ${r.yearsExperience} سنة` : ''}`} />
              <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">المهارة</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="JavaScript"
                      value={skillDraft.name ?? ''}
                      onChange={(e) => setSkillDraft({ ...skillDraft, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">مستوى الإتقان</label>
                    <select
                      className="input"
                      value={skillDraft.level ?? ''}
                      onChange={(e) => setSkillDraft({ ...skillDraft, level: e.target.value })}
                    >
                      <option value="">اختر</option>
                      <option value="beginner">مبتدئ</option>
                      <option value="intermediate">متوسط</option>
                      <option value="advanced">متقدم</option>
                      <option value="expert">خبير</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">سنوات الخبرة</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="5"
                      dir="ltr"
                      value={skillDraft.yearsExperience ?? ''}
                      onChange={(e) =>
                        setSkillDraft({ ...skillDraft, yearsExperience: e.target.value })
                      }
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="text-sm text-primary-500 hover:text-primary-600 font-medium"
                  onClick={() => addQualRow(skillDraft, setSkillDraft, setSkillRows, 'name', 'المهارة')}
                >
                  + إضافة مهارة
                </button>
                {skillRows.length > 0 && (
                  <ul className="divide-y divide-gray-200 border-t border-gray-200 pt-2">
                    {skillRows.map((r, i) => (
                      <li key={i} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-gray-700">
                          {r.name}
                          {r.level ? ` — ${SKILL_LEVEL_LABEL[r.level] ?? r.level}` : ''}
                          {r.yearsExperience ? ` · ${r.yearsExperience} سنة` : ''}
                        </span>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-600 text-xs font-medium"
                          onClick={() => removeQualRow(setSkillRows, i)}
                        >
                          حذف
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ===== اللغات ===== */}
              <h3 className="text-md font-bold text-gray-700 mt-8 border-b border-gray-100 pb-2">
                اللغات
              </h3>
              <SavedList kind="languages" label={(r) => `${r.language}${r.speaking ? ` — تحدث: ${LANG_LEVEL_LABEL[r.speaking] ?? r.speaking}` : ''}${r.reading ? ` · قراءة: ${LANG_LEVEL_LABEL[r.reading] ?? r.reading}` : ''}`} />
              <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="label">اللغة</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="الإنجليزية"
                      value={langDraft.language ?? ''}
                      onChange={(e) => setLangDraft({ ...langDraft, language: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">مستوى التحدث</label>
                    <select
                      className="input"
                      value={langDraft.speaking ?? ''}
                      onChange={(e) => setLangDraft({ ...langDraft, speaking: e.target.value })}
                    >
                      <option value="">اختر</option>
                      <option value="native">لغة أم</option>
                      <option value="very_good">جيد جداً</option>
                      <option value="good">جيد</option>
                      <option value="basic">أساسي</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">مستوى الكتابة</label>
                    <select
                      className="input"
                      value={langDraft.writing ?? ''}
                      onChange={(e) => setLangDraft({ ...langDraft, writing: e.target.value })}
                    >
                      <option value="">اختر</option>
                      <option value="native">لغة أم</option>
                      <option value="very_good">جيد جداً</option>
                      <option value="good">جيد</option>
                      <option value="basic">أساسي</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">مستوى القراءة</label>
                    <select
                      className="input"
                      value={langDraft.reading ?? ''}
                      onChange={(e) => setLangDraft({ ...langDraft, reading: e.target.value })}
                    >
                      <option value="">اختر</option>
                      <option value="native">لغة أم</option>
                      <option value="very_good">جيد جداً</option>
                      <option value="good">جيد</option>
                      <option value="basic">أساسي</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-sm text-primary-500 hover:text-primary-600 font-medium"
                  onClick={() => addQualRow(langDraft, setLangDraft, setLangRows, 'language', 'اللغة')}
                >
                  + إضافة لغة
                </button>
                {langRows.length > 0 && (
                  <ul className="divide-y divide-gray-200 border-t border-gray-200 pt-2">
                    {langRows.map((r, i) => (
                      <li key={i} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-gray-700">
                          {r.language}
                          {r.speaking ? ` — تحدث: ${LANG_LEVEL_LABEL[r.speaking] ?? r.speaking}` : ''}
                          {r.writing ? ` · كتابة: ${LANG_LEVEL_LABEL[r.writing] ?? r.writing}` : ''}
                          {r.reading ? ` · قراءة: ${LANG_LEVEL_LABEL[r.reading] ?? r.reading}` : ''}
                        </span>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-600 text-xs font-medium"
                          onClick={() => removeQualRow(setLangRows, i)}
                        >
                          حذف
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Documents */}
          {currentStep === 5 && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4">
                المستندات
              </h2>

              <p className="text-gray-500">
                ارفع المستندات المتاحة لملف الموظف. يمكنك إضافة باقي المستندات لاحقاً.
              </p>

              {/* Required Documents */}
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-primary-300 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">صورة الهوية / الإقامة</p>
                        <p className="text-sm text-gray-400">PDF, JPG, PNG - حد أقصى 5MB</p>
                      </div>
                    </div>
                  </div>
                  <input type="file" className="w-full" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleDocPick('national_id', e.target.files?.[0])} />
                  {docUploading['national_id'] && <p className="text-xs text-gray-400 mt-2">جارٍ الرفع…</p>}
                  {!docUploading['national_id'] && documentRefs.some((d) => d.docType === 'national_id') && (
                    <p className="text-xs text-green-600 mt-2">✓ تم الرفع</p>
                  )}
                </div>

                <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-primary-300 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">صورة جواز السفر</p>
                        <p className="text-sm text-gray-400">PDF, JPG, PNG - حد أقصى 5MB</p>
                      </div>
                    </div>
                  </div>
                  <input type="file" className="w-full" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleDocPick('passport', e.target.files?.[0])} />
                  {docUploading['passport'] && <p className="text-xs text-gray-400 mt-2">جارٍ الرفع…</p>}
                  {!docUploading['passport'] && documentRefs.some((d) => d.docType === 'passport') && (
                    <p className="text-xs text-green-600 mt-2">✓ تم الرفع</p>
                  )}
                </div>

                <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-primary-300 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">شهادة المؤهل</p>
                        <p className="text-sm text-gray-400">PDF - حد أقصى 5MB</p>
                      </div>
                    </div>
                  </div>
                  <input type="file" className="w-full" accept=".pdf" onChange={(e) => handleDocPick('qualification_certificate', e.target.files?.[0])} />
                  {docUploading['qualification_certificate'] && <p className="text-xs text-gray-400 mt-2">جارٍ الرفع…</p>}
                  {!docUploading['qualification_certificate'] && documentRefs.some((d) => d.docType === 'qualification_certificate') && (
                    <p className="text-xs text-green-600 mt-2">✓ تم الرفع</p>
                  )}
                </div>

                <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-primary-300 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">السيرة الذاتية</p>
                        <p className="text-sm text-gray-400">PDF, DOC - حد أقصى 5MB</p>
                      </div>
                    </div>
                  </div>
                  <input type="file" className="w-full" accept=".pdf,.doc,.docx" onChange={(e) => handleDocPick('cv', e.target.files?.[0])} />
                  {docUploading['cv'] && <p className="text-xs text-gray-400 mt-2">جارٍ الرفع…</p>}
                  {!docUploading['cv'] && documentRefs.some((d) => d.docType === 'cv') && (
                    <p className="text-xs text-green-600 mt-2">✓ تم الرفع</p>
                  )}
                </div>

                <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-primary-300 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">شهادات الخبرة</p>
                        <p className="text-sm text-gray-400">PDF - حد أقصى 5MB لكل ملف</p>
                      </div>
                    </div>
                  </div>
                  <input
                    type="file"
                    className="w-full"
                    accept=".pdf"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files
                      if (files)
                        Array.from(files).forEach((f) =>
                          handleDocPick('experience_certificate', f, true)
                        )
                    }}
                  />
                  {docUploading['experience_certificate'] && <p className="text-xs text-gray-400 mt-2">جارٍ الرفع…</p>}
                  {documentRefs.filter((d) => d.docType === 'experience_certificate').length > 0 && (
                    <p className="text-xs text-green-600 mt-2">
                      ✓ تم رفع {documentRefs.filter((d) => d.docType === 'experience_certificate').length} ملف
                    </p>
                  )}
                </div>

                <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-primary-300 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">صورة شخصية رسمية</p>
                        <p className="text-sm text-gray-400">JPG, PNG - حد أقصى 2MB</p>
                      </div>
                    </div>
                  </div>
                  <input type="file" className="w-full" accept=".jpg,.jpeg,.png" onChange={(e) => handleDocPick('formal_photo', e.target.files?.[0])} />
                  {docUploading['formal_photo'] && <p className="text-xs text-gray-400 mt-2">جارٍ الرفع…</p>}
                  {!docUploading['formal_photo'] && documentRefs.some((d) => d.docType === 'formal_photo') && (
                    <p className="text-xs text-green-600 mt-2">✓ تم الرفع</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {bannerError && (
            <div className="bg-red-50 text-red-700 rounded-xl p-4 mt-8">{bannerError}</div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
              السابق
            </button>

            <div className="flex items-center gap-3">
              {!isEdit && <button type="button" onClick={persistDraft} disabled={!draftUserId || submitting || uploadingAny} className="btn-secondary flex items-center gap-2 disabled:opacity-50"><Save size={17} />حفظ مسودة الجلسة</button>}
              {currentStep === steps.length ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || (!isEdit && uploadingAny)}
                  className="btn-success flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={18} />
                  {isEdit ? 'حفظ التغييرات' : 'حفظ وإضافة الموظف'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn-primary flex items-center gap-2"
                >
                  التالي
                  <ChevronLeft size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
        {!isEdit && restoreDraftOpen && sessionDraft && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="restore-employee-draft-title"><div className="bg-white rounded-2xl p-6 max-w-md w-full"><h2 id="restore-employee-draft-title" className="text-lg font-bold">استرجاع مسودة الإضافة</h2><p className="text-sm text-gray-600 mt-3 leading-6">سيستبدل هذا الإجراء البيانات المفتوحة في النموذج بالمسودة المحفوظة بتاريخ {new Date(sessionDraft.savedAt).toLocaleString('ar-EG-u-ca-gregory')}. لم تُرسل المسودة إلى سجل الموظفين.</p><div className="flex justify-end gap-3 mt-6"><button type="button" onClick={() => setRestoreDraftOpen(false)} className="btn-secondary">العودة للنموذج</button><button type="button" onClick={() => void restoreSessionDraft()} className="btn-primary">استرجاع البيانات</button></div></div></div>}
      </div>
    </MainLayout>
  )
}
