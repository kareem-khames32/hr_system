'use client'
import { localToday } from '@/lib/dates'
import { useParams } from 'next/navigation'

import { employeeStatusLabels as EMP_STATUS_AR, CUSTODY_STATUS, payMethodLabels as PAY_METHOD_AR } from '@/lib/status-labels'
import { leaveTypeLabel } from '@/lib/leave-catalog'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Edit,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  CreditCard,
  GraduationCap,
  FileText,
  Users,
  Clock,
  Award,
  Download,
  Printer,
  User,
  Globe,
  Hash,
  UserMinus,
  Calculator,
  FileSignature,
  Eye,
  X,
  Check,
  AlertCircle,
  Save,
} from 'lucide-react'
import {
  fetchEmployeeProfile,
  fetchBranches,
  fetchDepartments,
  fetchTeams,
  fetchEmployees,
  fetchFileObjectUrl,
  fetchQualifications,
  fetchCatalog,
  fetchActiveLeaveTypes,
  fetchCompanyInfo,
  fetchAttendanceRuleHistory,
  fetchUsers,
  createDocument,
  uploadFile,
  can,
  getCurrentUser,
  type ApiEmployee,
  type ApiQualifications,
  type ApiCompanyInfo,
  type ApiAttendanceRuleVersion,
} from '@/lib/api'
import { docTypeLabel } from '@/lib/doc-types'
import { describeEmployeeHistory, type EmployeeHistoryView } from '@/lib/employee-history'
import { displayEmployeeAddress } from '@/lib/employee-form-fields'
import { loadCurrency, currencyLabel, useCurrency } from '@/lib/currency'

// الحقول الشخصية والمالية الجديدة المدعومة في الباك إند (ليست بعد ضمن ApiEmployee)
type EmployeeExtras = {
  birthDate?: string
  gender?: string
  maritalStatus?: string
  nationality?: string
  address?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  housingAllowance?: number
  transportAllowance?: number
  otherAllowance?: number
  contractType?: string | null
  contractStart?: string | null
  contractEnd?: string | null
}

// نموذج العرض — يُملأ من الباك إند، والحقول غير المدعومة تظهر «—»
interface EmployeeVM {
  id: number
  employeeId: string
  name: string
  nameEn: string
  avatar: string
  photoFileId?: number
  email: string
  personalEmail: string
  phone: string
  phoneAlt: string
  department: string
  jobTitle: string
  grade: string
  status: string
  joinDate: string
  branch: string
  manager: string
  managerTitle: string
  nationality: string
  nationalId: string
  passportNo: string
  passportExpiry: string
  birthDate: string
  birthPlace: string
  gender: string
  maritalStatus: string
  address: string
  country: string
  postalCode: string
  contractType: string
  contractStart: string
  contractEnd: string
  contractDaysLeft: number | null
  contractNumber: string
  contractDurationMonths: string
  noticePeriodDays: string
  employmentType: string
  fingerprintCode: string
  actualStartDate: string
  probationEndDate: string
  recruitmentSource: string
  workLocation: string
  basicSalary: number
  housingAllowance: number
  transportAllowance: number
  otherAllowance: number
  phoneAllowance: number
  workNatureAllowance: number
  emergencyContactName: string
  emergencyContactPhone: string
  emergencyRelation: string
  emergencyPhoneAlt: string
  totalSalary: number
  payMethod: string
  salaryCycle: string
  currencyCode: string
  bankName: string
  bankBranch: string
  bankAccount: string
  gosiNumber: string
  isGosiRegistered: string
  gosiBaseSalary: string
  leaveBalance: { annual: { total: number; used: number; remaining: number } }
  // الفريق ومركز التكلفة وجدول العمل واستحقاق السنوي (كانت لا تظهر في الملف)
  team: string
  costCenter: string
  workSchedule: string // للعرض: اسم الجدول (أو الافتراضي / إعداد الفرع)
  workScheduleName: string // الاسم الخام لنص العقد — فارغ بلا جدول
  workScheduleFrom: string
  workScheduleTo: string
  workScheduleWeekend: string // عطلة الجدول المعيّن فقط (الافتراضي يتبع الفرع)
  annualLeaveEntitled: boolean
  flexOverrideMode: string
  attendanceRuleEffectiveFrom: string
  annualEntitlementDays: number | null // استحقاق السنة كاملة من رصيد السنة الجارية
  // عملة راتب الموظف نفسه (عملة النظام لو غير محددة على ملفه): رمز + اسم للخطابات
  salaryCurrency: string
  salaryCurrencyName: string
  branchCountry: string
}

interface BalanceView {
  total: number
  used: number
  remaining: number
  annualEntitlement: number | null
  openingDays: number
  openingTaken: number
  openingExpiry: string | null
  openingExpired: boolean
}

interface LeaveView {
  id: number
  typeLabel: string
  fromDate: string
  toDate: string
  days: number
  status: string
}

interface CustodyView {
  id: number
  assetName: string
  assetCategory: string
  status: string
  assignedAt: string
  acknowledgedAt: string
  returnedAt: string
}

type HistoryEventView = EmployeeHistoryView

// سطر في «سجل الدوام» — نسخة من قاعدة حضور الموظف (جدول/مرونة) بسريانها وسببها
interface AttendanceRuleRowView {
  id: number
  effectiveFrom: string
  schedule: string
  flex: string
  reason: string
  actor: string
}

interface DocView {
  id: number
  docType: string
  number: string
  expiryDate: string
  expired: boolean
  fileRef: string
}


const LEAVE_STATUS_AR: Record<string, string> = {
  APPROVED: 'معتمدة',
  UNDER_REVIEW: 'قيد المراجعة',
  PENDING: 'قيد المراجعة',
  REJECTED: 'مرفوضة',
  CANCELLED: 'ملغاة',
}




const GENDER_AR: Record<string, string> = {
  male: 'ذكر',
  female: 'أنثى',
}

const MARITAL_AR: Record<string, string> = {
  single: 'أعزب',
  married: 'متزوج',
  divorced: 'مطلق',
  widowed: 'أرمل',
}

const CONTRACT_TYPE_AR: Record<string, string> = {
  permanent: 'دائم',
  fixed_term: 'محدد المدة',
  part_time: 'دوام جزئي',
  seasonal: 'موسمي',
}

// نوع التوظيف — يقبل صيغتَي الكود (full_time و fulltime) الموجودتين في الفورم
const WORK_TYPE_AR: Record<string, string> = {
  full_time: 'دوام كامل',
  fulltime: 'دوام كامل',
  part_time: 'جزئي',
  parttime: 'جزئي',
  contract: 'عقد',
  temporary: 'مؤقت',
  consultant: 'استشاري',
  intern: 'متدرب',
}

const SALARY_CYCLE_AR: Record<string, string> = {
  monthly: 'شهري',
  weekly: 'أسبوعي',
  biweekly: 'كل أسبوعين',
}

const COUNTRY_AR: Record<string, string> = {
  SA: 'السعودية',
  AE: 'الإمارات',
  EG: 'مصر',
}

const RELATION_AR: Record<string, string> = {
  spouse: 'زوج/زوجة',
  parent: 'أب/أم',
  sibling: 'أخ/أخت',
  child: 'ابن/ابنة',
  other: 'أخرى',
}

const RECRUITMENT_SOURCE_AR: Record<string, string> = {
  jobsite: 'موقع توظيف',
  referral: 'ترشيح موظف',
  agency: 'وكالة توظيف',
  linkedin: 'LinkedIn',
  other: 'أخرى',
}

const CURRENCY_AR: Record<string, string> = {
  SAR: 'ريال سعودي (SAR)',
  AED: 'درهم إماراتي (AED)',
  EGP: 'جنيه مصري (EGP)',
}

// اسم العملة كاملاً في نصوص الخطابات الرسمية (المبالغ بعملة الموظف نفسه)
const CURRENCY_NAME_AR: Record<string, string> = {
  SAR: 'ريال سعودي',
  AED: 'درهم إماراتي',
  EGP: 'جنيه مصري',
  USD: 'دولار أمريكي',
}

// أيام العطلة الأسبوعية بصيغة جدول العمل (FRI,SAT)
const WEEKDAY_AR: Record<string, string> = {
  SUN: 'الأحد',
  MON: 'الاثنين',
  TUE: 'الثلاثاء',
  WED: 'الأربعاء',
  THU: 'الخميس',
  FRI: 'الجمعة',
  SAT: 'السبت',
}

// النظام الحاكم في نص عقد العمل حسب دولة فرع الموظف — غير محددة = صياغة عامة
const LABOR_LAW_AR: Record<string, string> = {
  SA: 'نظام العمل السعودي',
  EG: 'قانون العمل المصري',
  AE: 'قانون تنظيم علاقات العمل الإماراتي',
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <span className="badge badge-success">نشط</span>
    case 'probation':
      return <span className="badge badge-warning">فترة تجربة</span>
    case 'suspended':
      return <span className="badge badge-danger">موقوف</span>
    case 'archived':
      return <span className="badge bg-gray-100 text-gray-600">مؤرشف</span>
    default:
      return (
        <span className="badge bg-gray-100 text-gray-600">
          {EMP_STATUS_AR[status] ?? status}
        </span>
      )
  }
}

const fmtDate = (v?: string | null) => (v ? String(v).slice(0, 10) : '—')

// قيمة نصية/رقمية كما هي — و«—» فقط لو غير موجودة فعلاً
const val = (v?: string | number | null) =>
  v === null || v === undefined || v === '' ? '—' : String(v)

// قيمة مترجمة من قاموس — والخام لو الكود غير معروف
const labelOf = (dict: Record<string, string>, v?: string | null) =>
  !v ? '—' : dict[v] ?? v

// عدد الأيام المتبقية حتى تاريخ معيّن (سالب = انتهى)
const daysUntil = (date?: string | null) => {
  if (!date) return null
  const end = new Date(String(date).slice(0, 10))
  const today = new Date(new Date().toISOString().slice(0, 10))
  return Math.round((end.getTime() - today.getTime()) / 86400000)
}

const tenureText = (joinDate?: string | null) => {
  if (!joinDate) return '—'
  const start = new Date(joinDate)
  const now = new Date()
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())
  if (months < 0) return '—'
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m} شهر`
  return `${y} سنة و ${m} شهر`
}

const tabs = [
  { id: 'personal', label: 'البيانات الشخصية', icon: User },
  { id: 'employment', label: 'البيانات الوظيفية', icon: Briefcase },
  { id: 'financial', label: 'البيانات المالية', icon: CreditCard },
  { id: 'qualifications', label: 'المؤهلات', icon: GraduationCap },
  { id: 'leaves', label: 'الإجازات', icon: Calendar },
  { id: 'assets', label: 'العهد', icon: FileText },
  { id: 'history', label: 'السجل الوظيفي', icon: Clock },
  { id: 'documents', label: 'المستندات', icon: FileText },
]

// القوالب التي يدعمها مسار الخطابات: الطلب والاعتماد والحفظ تتم في الخادم.
const documentTemplates = [
  { id: 'LETTER_SALARY', name: 'تعريف راتب', nameEn: 'Salary Certificate', icon: FileText },
  { id: 'LETTER_EMPLOYMENT', name: 'خطاب توظيف', nameEn: 'Employment Letter', icon: FileSignature },
  { id: 'LETTER_EXPERIENCE', name: 'شهادة خبرة', nameEn: 'Experience Certificate', icon: Award },
  { id: 'LETTER_NOC', name: 'خطاب عدم ممانعة', nameEn: 'No Objection Letter', icon: FileText },
  { id: 'LETTER_EMBASSY', name: 'خطاب سفارة / تأشيرة', nameEn: 'Embassy Letter', icon: FileText },
  { id: 'LETTER_BANK_LOAN', name: 'خطاب قرض بنكي', nameEn: 'Bank Loan Letter', icon: FileText },
]
export default function EmployeeProfilePage() {
  const params = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState('personal')
  const systemCurrency = useCurrency()
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showDocumentModal, setShowDocumentModal] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [employee, setEmployee] = useState<EmployeeVM | null>(null)
  const canViewFinancial = !!employee && (getCurrentUser()?.employeeId === employee.id || can('payroll.view') || can('employees.edit'))
  const currency = employee?.salaryCurrency || systemCurrency
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [balAnnual, setBalAnnual] = useState<BalanceView | null>(null)
  const [balSick, setBalSick] = useState<BalanceView | null>(null)
  const [leaves, setLeaves] = useState<LeaveView[]>([])
  const [custody, setCustody] = useState<CustodyView[]>([])
  const [historyEvents, setHistoryEvents] = useState<HistoryEventView[]>([])
  const [docs, setDocs] = useState<DocView[]>([])
  const [ruleHistory, setRuleHistory] = useState<AttendanceRuleRowView[]>([])
  // المؤهلات والخبرات — خمس قوائم من مسارها الخاص
  const [quals, setQuals] = useState<ApiQualifications | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [profile, branches, departments, teams, allEmployees, currencyNow, qualifications, grades, workSchedules, costCenters, leaveTypes, attendanceRules, systemUsers] =
          await Promise.all([
            fetchEmployeeProfile(Number(params.id)),
            fetchBranches(),
            fetchDepartments(),
            fetchTeams(),
            fetchEmployees(),
            loadCurrency(),
            fetchQualifications(Number(params.id)).catch(() => null),
            fetchCatalog<{ id: number; name: string }>('grades').catch(
              () => [] as { id: number; name: string }[]
            ),
            fetchCatalog<import('@/lib/api').ApiWorkSchedule>('work-schedules', localToday()),
            fetchCatalog<{ id: number; code: string; name: string }>('cost-centers'),
            fetchActiveLeaveTypes(),
            // سجل الدوام (سبب تغيير الجدول/المرونة) — اختياري: فشله لا يعطل الملف
            fetchAttendanceRuleHistory('EMPLOYEE', Number(params.id)).catch(() => [] as ApiAttendanceRuleVersion[]),
            // أسماء المستخدمين لعرض اسم من سجّل التغيير بدل «المستخدم #12» — اختياري
            fetchUsers().catch(() => [] as Array<{ id: number; displayName: string; email: string }>),
          ])
        setQuals(qualifications)
        const e = profile.employee as ApiEmployee & EmployeeExtras
        const branchById = new Map(branches.map((b) => [b.id, b.name]))
        const deptById = new Map(departments.map((d) => [d.id, d.name]))
        const teamById = new Map(teams.map((t) => [t.id, t.name]))
        const empById = new Map(allEmployees.map((x) => [x.id, x]))
        const gradeById = new Map(grades.map((g) => [g.id, g.name]))

        const schedule = workSchedules.find(s => s.id === e.workScheduleId)
        const effectiveSchedule = schedule ?? workSchedules.find(s => s.isDefault && s.isActive)
        const today = new Date().toLocaleDateString('en-CA')
        const currentYear = String(new Date().getFullYear())
        const balanceOf = (type: string): BalanceView | null => {
          const rows = (profile.balances ?? []).filter(
            (b: any) => b.balanceType === type
          )
          if (rows.length === 0) return null
          const row =
            rows.find((b: any) => String(b.period) === currentYear) ?? rows[0]
          const openingExpired =
            !!row.openingExpiry && String(row.openingExpiry).slice(0, 10) < today
          const openingAvailable = openingExpired
            ? 0
            : Math.max(0, Number(row.openingDays ?? 0) - Number(row.openingTaken ?? 0))
          return {
            annualEntitlement: row.annualEntitlement == null ? null : Number(row.annualEntitlement),
            total: Number(row.effectiveEntitled ?? row.entitled ?? 0),
            used: Number(row.taken ?? 0),
            remaining:
              row.remaining != null ? Number(row.remaining) : openingAvailable + Math.max(0, Number(row.effectiveEntitled ?? row.entitled ?? 0) - Math.max(0, Number(row.taken ?? 0) - Number(row.openingTaken ?? 0))),
            openingDays: Number(row.openingDays ?? 0),
            openingTaken: Number(row.openingTaken ?? 0),
            openingExpiry: row.openingExpiry
              ? String(row.openingExpiry).slice(0, 10)
              : null,
            openingExpired,
          }
        }
        const annual = balanceOf('annual')
        const sick = balanceOf('sick')
        setBalAnnual(annual)
        setBalSick(sick)

        const manager = e.managerEmployeeId
          ? empById.get(e.managerEmployeeId)
          : undefined

        setEmployee({
          id: e.id,
          employeeId: e.employeeCode,
          name: e.fullName,
          nameEn: e.fullNameEn ?? '',
          avatar: (e.fullName ?? '').trim().charAt(0) || 'م',
          photoFileId: e.photoFileId,
          email: e.email ?? '—',
          personalEmail: val(e.personalEmail),
          phone: e.phone ?? '—',
          phoneAlt: val(e.phoneAlt),
          department:
            e.departmentId != null ? deptById.get(e.departmentId) ?? '—' : '—',
          jobTitle: e.jobTitle ?? '—',
          grade:
            e.gradeId != null
              ? gradeById.get(e.gradeId) ?? `#${e.gradeId}`
              : '—',
          status: e.status,
          joinDate: fmtDate(e.joinDate),
          branch: branchById.get(e.branchId) ?? '—',
          manager: manager?.fullName ?? '—',
          managerTitle: manager?.jobTitle ?? '',
          nationality: e.nationality || '—',
          nationalId: e.nationalId ?? '—',
          passportNo: val(e.passportNo),
          passportExpiry: e.passportExpiry ? fmtDate(e.passportExpiry) : '—',
          birthDate: fmtDate(e.birthDate),
          birthPlace: val(e.birthPlace),
          gender: e.gender ? GENDER_AR[e.gender] ?? e.gender : '—',
          maritalStatus: e.maritalStatus
            ? MARITAL_AR[e.maritalStatus] ?? e.maritalStatus
            : '—',
          address: displayEmployeeAddress(e.address) || '—',
          country: labelOf(COUNTRY_AR, e.country),
          postalCode: val(e.postalCode),
          contractType: e.contractType
            ? CONTRACT_TYPE_AR[e.contractType] ?? e.contractType
            : '—',
          contractStart: fmtDate(e.contractStart),
          contractEnd: fmtDate(e.contractEnd),
          contractDaysLeft: daysUntil(e.contractEnd),
          contractNumber: val(e.contractNumber),
          contractDurationMonths: val(e.contractDurationMonths),
          noticePeriodDays: val(e.noticePeriodDays),
          employmentType: labelOf(WORK_TYPE_AR, e.workType),
          fingerprintCode: val(e.fingerprintCode),
          actualStartDate: e.actualStartDate ? fmtDate(e.actualStartDate) : '—',
          probationEndDate: e.probationEndDate ? fmtDate(e.probationEndDate) : '—',
          recruitmentSource: labelOf(RECRUITMENT_SOURCE_AR, e.recruitmentSource),
          workLocation: val(e.workLocation),
          basicSalary: Number(e.basicSalary ?? 0),
          housingAllowance: Number(e.housingAllowance ?? 0),
          transportAllowance: Number(e.transportAllowance ?? 0),
          otherAllowance: Number(e.otherAllowance ?? 0),
          phoneAllowance: Number(e.phoneAllowance ?? 0),
          workNatureAllowance: Number(e.workNatureAllowance ?? 0),
          emergencyContactName: e.emergencyContactName || '—',
          emergencyContactPhone: e.emergencyContactPhone || '—',
          emergencyRelation: labelOf(RELATION_AR, e.emergencyRelation),
          emergencyPhoneAlt: val(e.emergencyPhoneAlt),
          totalSalary:
            Number(e.basicSalary ?? 0) +
            Number(e.housingAllowance ?? 0) +
            Number(e.transportAllowance ?? 0) +
            Number(e.otherAllowance ?? 0) +
            Number(e.phoneAllowance ?? 0) +
            Number(e.workNatureAllowance ?? 0),
          payMethod: PAY_METHOD_AR[e.payMethod] ?? e.payMethod ?? '—',
          salaryCycle: labelOf(SALARY_CYCLE_AR, e.salaryCycle),
          currencyCode: labelOf(CURRENCY_AR, e.currency),
          bankName: e.bankName ?? '—',
          bankBranch: val(e.bankBranch),
          bankAccount: e.iban ?? '—',
          gosiNumber: val(e.gosiNumber),
          isGosiRegistered:
            e.isGosiRegistered == null ? '—' : e.isGosiRegistered ? 'نعم' : 'لا',
          gosiBaseSalary:
            e.gosiBaseSalary == null
              ? '—'
              : Number(e.gosiBaseSalary).toLocaleString(),
          team: teamById.get(e.teamId ?? 0) ?? '—',
          costCenter: costCenters.find(c => c.id === e.costCenterId)?.name ?? '—',
          workSchedule: effectiveSchedule ? effectiveSchedule.name + (schedule ? '' : ' (افتراضي)') : 'بلا جدول',
          workScheduleName: effectiveSchedule?.name ?? '',
          workScheduleFrom: effectiveSchedule?.startTime ?? '',
          workScheduleTo: effectiveSchedule?.endTime ?? '',
          workScheduleWeekend: schedule?.weekendDays ?? '',
          annualLeaveEntitled: e.annualLeaveEntitled !== false,
          flexOverrideMode: ({ INHERIT: 'يتبع الوردية أو جدول العمل', ENABLED: 'مفعلة لهذا الموظف', DISABLED: 'موقوفة لهذا الموظف' } as Record<string, string>)[e.flexOverrideMode ?? 'INHERIT'],
          attendanceRuleEffectiveFrom: e.attendanceRuleEffectiveFrom ?? 'لا يوجد تاريخ سريان مسجل',
          annualEntitlementDays: annual?.annualEntitlement ?? null,
          salaryCurrency: e.currency ? currencyLabel(e.currency) : currencyNow,
          salaryCurrencyName: e.currency ? (CURRENCY_AR[e.currency] ?? e.currency) : currencyNow,
          branchCountry: branches.find(b => b.id === e.branchId)?.country ?? '',
          leaveBalance: {
            annual: {
              total: annual?.total ?? 0,
              used: annual?.used ?? 0,
              remaining: annual?.remaining ?? 0,
            },
          },
        })

        setLeaves(
          (profile.leaves ?? []).map((l: any) => ({
            id: l.id,
            typeLabel: leaveTypeLabel(l.leaveType, leaveTypes),
            fromDate: fmtDate(l.fromDate),
            toDate: fmtDate(l.toDate),
            days: Number(l.days ?? 0),
            status: LEAVE_STATUS_AR[l.status] ?? l.status,
          }))
        )

        setCustody(
          (profile.custody ?? []).map((c: any) => ({
            id: c.id,
            assetName: c.assetName ?? `#${c.assetId}`,
            assetCategory: c.assetCategory ?? '—',
            status: c.status,
            assignedAt: fmtDate(c.assignedAt),
            acknowledgedAt: c.acknowledgedAt ? fmtDate(c.acknowledgedAt) : '',
            returnedAt: c.returnedAt ? fmtDate(c.returnedAt) : '',
          }))
        )

        // السجل الوظيفي: عنوان عربي لكل حقل وأسماء الفريق/القسم/الفرع/المدير بدل «teamId:3»
        const employeeCurrency = e.currency ? currencyLabel(e.currency) : currencyNow
        setHistoryEvents(
          (profile.history ?? []).map((h: any) =>
            describeEmployeeHistory(h, {
              teams: teamById,
              departments: deptById,
              branches: branchById,
              grades: gradeById,
              employees: new Map(allEmployees.map((x) => [x.id, x.fullName])),
              costCenters: new Map(costCenters.map((c) => [c.id, c.name])),
              currency: employeeCurrency,
              statusLabels: EMP_STATUS_AR,
              payMethodLabels: PAY_METHOD_AR,
            })
          )
        )

        // سجل الدوام: كل نسخة قاعدة حضور للموظف بتاريخ سريانها وسببها ومن سجّلها
        const userNameById = new Map(
          (systemUsers ?? []).map((u) => [u.id, (u.displayName || u.email || '').trim()])
        )
        // بلا صلاحية قراءة المستخدمين: «أحد المستخدمين» — لا رقم مستخدم خام على أي شاشة
        const actorName = (userId: number) => userNameById.get(userId)?.trim() || 'أحد المستخدمين'
        const scheduleNameById = new Map(workSchedules.map((s) => [s.id, s.name]))
        const flexLabels: Record<string, string> = { INHERIT: 'يتبع الوردية أو جدول العمل', ENABLED: 'مفعلة', DISABLED: 'موقوفة' }
        setRuleHistory(
          attendanceRules.map((v) => {
            const scheduleId = v.snapshot?.workScheduleId as number | null | undefined
            const flexMode = String(v.snapshot?.flexOverrideMode ?? 'INHERIT')
            return {
              id: v.id,
              effectiveFrom: v.effectiveFrom ? String(v.effectiveFrom).slice(0, 10) : v.legacyBaseline ? 'قبل بدء السجل' : '—',
              schedule: scheduleId == null ? 'بدون جدول (يتبع الفرع)' : scheduleNameById.get(scheduleId) ?? `#${scheduleId}`,
              flex: flexLabels[flexMode] ?? flexMode,
              reason: v.reason?.trim() || '—',
              actor: `${v.actorUserId ? actorName(v.actorUserId) : 'النظام'} · ${fmtDate(v.createdAt)}`,
            }
          })
        )

        setDocs(
          (profile.documents ?? []).map((d: any) => ({
            id: d.id,
            docType: d.docType,
            number: d.number ?? '—',
            expiryDate: d.expiryDate ? fmtDate(d.expiryDate) : '—',
            expired:
              d.expired ??
              (!!d.expiryDate && String(d.expiryDate).slice(0, 10) < today),
            fileRef: d.fileRef ?? '',
          }))
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر تحميل ملف الموظف')
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  // صورة الموظف — رابط blob بالتوكن (يُلغى عند التفريغ)
  useEffect(() => {
    const pid = employee?.photoFileId
    if (pid == null) {
      setPhotoUrl(null)
      return
    }
    let active = true
    let created: string | null = null
    fetchFileObjectUrl(pid).then((url) => {
      if (!active) {
        if (url) URL.revokeObjectURL(url)
        return
      }
      if (url) {
        created = url
        setPhotoUrl(url)
      }
    })
    return () => {
      active = false
      if (created) URL.revokeObjectURL(created)
    }
  }, [employee?.photoFileId])

  // فتح ملف مستند مخزّن — يُجلب بالتوكن كـ blob ثم يُفتح في نافذة جديدة
  const viewFile = async (fileRef: string) => {
    const fileId = Number(fileRef.slice(5))
    if (!Number.isFinite(fileId) || fileId <= 0) return
    setError('')
    const url = await fetchFileObjectUrl(fileId)
    if (!url) {
      setError('تعذر عرض الملف')
      return
    }
    window.open(url)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/employees" className="hover:text-primary-600">
            الموظفين
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">ملف الموظف</span>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && employee && (
          <>
        {/* Profile Header */}
        <div className="card">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-3xl flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-primary-500/30 overflow-hidden">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt={employee.name} className="w-full h-full object-cover" />
                ) : (
                  employee.avatar
                )}
              </div>

              {/* Basic Info */}
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-800">{employee.name}</h1>
                  {statusBadge(employee.status)}
                </div>
                <p className="text-gray-500 mt-1">{employee.nameEn}</p>
                <p className="text-primary-600 font-mono text-sm mt-1">{employee.employeeId}</p>

                <div className="flex items-center gap-6 mt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Briefcase size={16} className="text-gray-400" />
                    <span>{employee.jobTitle}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 size={16} className="text-gray-400" />
                    <span>{employee.department}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin size={16} className="text-gray-400" />
                    <span>{employee.branch}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4">
                  <a
                    href={`mailto:${employee.email}`}
                    className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                  >
                    <Mail size={16} />
                    {employee.email}
                  </a>
                  <a
                    href={`tel:${employee.phone}`}
                    className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                    dir="ltr"
                  >
                    <Phone size={16} />
                    {employee.phone}
                  </a>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* طباعة ملف الموظف المعروض بنافذة طباعة المتصفح (وتتيح الحفظ PDF) — كان زرًا بلا تنفيذ */}
              <button type="button" onClick={() => window.print()} title="طباعة ملف الموظف أو حفظه PDF" className="btn-secondary flex items-center gap-2">
                <Printer size={18} />
                طباعة
              </button>
              {/* التعديل بصلاحيته — الحفظ يحتاج employees.edit */}
              {can('employees.edit') && (
                <Link href={`/employees/${employee.id}/edit`} className="btn-primary flex items-center gap-2">
                  <Edit size={18} />
                  تعديل
                </Link>
              )}
              <div className="relative">
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="p-2.5 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <MoreVertical size={18} className="text-gray-600" />
                </button>

                {showActionsMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowActionsMenu(false)}
                    />
                    <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                      <Link
                        href={`/employees/${employee.id}/settlement`}
                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setShowActionsMenu(false)}
                      >
                        <Calculator size={18} className="text-primary-500" />
                        <span>تصفية المستحقات</span>
                      </Link>
                      {/* EMP-1: الإنهاء لـ HR (offboarding.manage) ولموظف على رأس العمل —
                          فترة الإشعار معناها ملف مفتوح بالفعل (تصفية المستحقات) */}
                      {can('offboarding.manage') &&
                        ['active', 'probation', 'suspended'].includes(employee.status) && (
                          <>
                            <div className="border-t border-gray-100 my-1" />
                            <Link
                              href={`/employees/${employee.id}/terminate`}
                              className="flex items-center gap-3 px-4 py-3 text-danger-600 hover:bg-danger-50 transition-colors"
                              onClick={() => setShowActionsMenu(false)}
                            >
                              <UserMinus size={18} />
                              <span>إنهاء الخدمة</span>
                            </Link>
                          </>
                        )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <p className="text-sm text-gray-500">تاريخ التعيين</p>
              <p className="font-bold text-gray-800 mt-1">{employee.joinDate}</p>
              <p className="text-xs text-gray-400 mt-0.5">{tenureText(employee.joinDate === '—' ? null : employee.joinDate)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">المدير المباشر</p>
              <p className="font-bold text-gray-800 mt-1">{employee.manager}</p>
              <p className="text-xs text-gray-400 mt-0.5">{employee.managerTitle}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">الدرجة الوظيفية</p>
              <p className="font-bold text-gray-800 mt-1">{employee.grade}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">رصيد الإجازات</p>
              <p className="font-bold text-primary-600 mt-1">{employee.leaveBalance.annual.remaining} يوم</p>
              <p className="text-xs text-gray-400 mt-0.5">إجازة سنوية</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card p-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            {tabs.filter((tab) => tab.id !== 'financial' || canViewFinancial).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="card">
          {/* Personal Information Tab */}
          {activeTab === 'personal' && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4">
                البيانات الشخصية
              </h2>

              <div className="grid grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  <h3 className="text-md font-bold text-gray-700">المعلومات الأساسية</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">تاريخ الميلاد</p>
                      <p className="font-medium text-gray-800 mt-1">{employee.birthDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">مكان الميلاد</p>
                      <p className="font-medium text-gray-800 mt-1">{employee.birthPlace}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">الجنس</p>
                      <p className="font-medium text-gray-800 mt-1">{employee.gender}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">الحالة الاجتماعية</p>
                      <p className="font-medium text-gray-800 mt-1">{employee.maritalStatus}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">الجنسية</p>
                      <p className="font-medium text-gray-800 mt-1">{employee.nationality}</p>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <h3 className="text-md font-bold text-gray-700">وثائق الهوية</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">رقم الهوية الوطنية</p>
                      <p className="font-medium text-gray-800 mt-1 font-mono">{employee.nationalId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">رقم جواز السفر</p>
                      <p className="font-medium text-gray-800 mt-1 font-mono">{employee.passportNo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">تاريخ انتهاء الجواز</p>
                      <p className="font-medium text-gray-800 mt-1">{employee.passportExpiry}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-md font-bold text-gray-700 mb-4">معلومات الاتصال</h3>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                        <Phone size={18} className="text-primary-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">رقم الجوال</p>
                        <p className="font-medium text-gray-800" dir="ltr">{employee.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                        <Mail size={18} className="text-primary-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">البريد الإلكتروني للعمل</p>
                        <p className="font-medium text-gray-800">{employee.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                        <Phone size={18} className="text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">رقم جوال بديل</p>
                        <p className="font-medium text-gray-800" dir="ltr">{employee.phoneAlt}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                        <Mail size={18} className="text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">البريد الإلكتروني الشخصي</p>
                        <p className="font-medium text-gray-800">{employee.personalEmail}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-md font-bold text-gray-700 mb-4">العنوان</h3>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                    <MapPin size={18} className="text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">العنوان الحالي</p>
                    <p className="font-medium text-gray-800 mt-1">{employee.address}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8 mt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Globe size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">البلد</p>
                      <p className="font-medium text-gray-800">{employee.country}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Hash size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">الرمز البريدي</p>
                      <p className="font-medium text-gray-800" dir="ltr">{employee.postalCode}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-md font-bold text-gray-700 mb-4">جهة اتصال للطوارئ</h3>
                <div className="grid grid-cols-2 gap-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                      <User size={18} className="text-primary-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">الاسم</p>
                      <p className="font-medium text-gray-800">{employee.emergencyContactName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                      <Users size={18} className="text-primary-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">صلة القرابة</p>
                      <p className="font-medium text-gray-800">{employee.emergencyRelation}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                      <Phone size={18} className="text-primary-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">رقم الجوال</p>
                      <p className="font-medium text-gray-800" dir="ltr">{employee.emergencyContactPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Phone size={18} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">هاتف طوارئ بديل</p>
                      <p className="font-medium text-gray-800" dir="ltr">{employee.emergencyPhoneAlt}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Employment Tab */}
          {activeTab === 'employment' && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4">
                البيانات الوظيفية
              </h2>

              <div className="grid grid-cols-4 gap-6">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">الرقم الوظيفي</p>
                  <p className="font-bold text-primary-600 text-lg mt-1 font-mono">{employee.employeeId}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">كود البصمة</p>
                  <p className="font-bold text-gray-800 text-lg mt-1 font-mono" dir="ltr">{employee.fingerprintCode}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">تاريخ التعيين</p>
                  <p className="font-bold text-gray-800 text-lg mt-1">{employee.joinDate}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">نوع التوظيف</p>
                  <p className="font-bold text-gray-800 text-lg mt-1">{employee.employmentType}</p>
                </div>
              </div>

              {/* تفاصيل التعيين — بداية العمل الفعلي وفترة التجربة ومصدر التوظيف */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-sm text-gray-500">المرونة في الحضور</p>
                <p className="font-bold text-gray-800 mt-1">{employee.flexOverrideMode}</p>
                <p className="text-sm text-gray-600 mt-1">السريان: {employee.attendanceRuleEffectiveFrom}. مدة المرونة والساعات المطلوبة من تعريف دوام اليوم.</p>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">بداية العمل الفعلي</p>
                  <p className="font-bold text-gray-800 text-lg mt-1">{employee.actualStartDate}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">انتهاء فترة التجربة</p>
                  <p className="font-bold text-gray-800 text-lg mt-1">{employee.probationEndDate}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">مصدر التوظيف</p>
                  <p className="font-bold text-gray-800 text-lg mt-1">{employee.recruitmentSource}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-md font-bold text-gray-700">الموقع التنظيمي</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">الفرع</span>
                      <span className="font-medium text-gray-800">{employee.branch}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">الإدارة</span>
                      <span className="font-medium text-gray-800">{employee.department}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">الفريق</span>
                      <span className="font-medium text-gray-800">{employee.team}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">المسمى الوظيفي</span>
                      <span className="font-medium text-gray-800">{employee.jobTitle}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">الدرجة الوظيفية</span>
                      <span className="font-medium text-gray-800">{employee.grade}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">المدير المباشر</span>
                      <span className="font-medium text-gray-800">{employee.manager}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">موقع العمل</span>
                      <span className="font-medium text-gray-800">{employee.workLocation}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">مركز التكلفة</span>
                      <span className="font-medium text-gray-800">{employee.costCenter}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-500">جدول العمل</span>
                      <span className="font-medium text-gray-800">
                        {employee.workSchedule}
                        {employee.workScheduleFrom && employee.workScheduleTo
                          ? ` (${employee.workScheduleFrom} - ${employee.workScheduleTo})`
                          : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-md font-bold text-gray-700">معلومات العقد</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">رقم العقد</span>
                      <span className="font-medium text-gray-800 font-mono" dir="ltr">{employee.contractNumber}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">نوع العقد</span>
                      <span className="font-medium text-gray-800">{employee.contractType}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">تاريخ بداية العقد</span>
                      <span className="font-medium text-gray-800">{employee.contractStart}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">تاريخ نهاية العقد</span>
                      <span className="font-medium text-gray-800">{employee.contractEnd}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">مدة العقد</span>
                      <span className="font-medium text-gray-800">
                        {employee.contractDurationMonths === '—'
                          ? '—'
                          : `${employee.contractDurationMonths} شهر`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">فترة الإشعار</span>
                      <span className="font-medium text-gray-800">
                        {employee.noticePeriodDays === '—'
                          ? '—'
                          : `${employee.noticePeriodDays} يوم`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">المتبقي على انتهاء العقد</span>
                      {employee.contractDaysLeft == null ? (
                        <span className="font-medium text-gray-800">—</span>
                      ) : employee.contractDaysLeft < 0 ? (
                        <span className="badge badge-danger">منتهي</span>
                      ) : employee.contractDaysLeft < 60 ? (
                        <span className="badge badge-danger">{employee.contractDaysLeft} يوم</span>
                      ) : (
                        <span className="font-medium text-gray-800">{employee.contractDaysLeft} يوم</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-500">حالة الموظف</span>
                      {statusBadge(employee.status)}
                    </div>
                  </div>
                </div>
              </div>

              {/* سجل الدوام — تاريخ السريان والسبب ومن سجّل تغيير الجدول أو المرونة */}
              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-md font-bold text-gray-700 mb-4">سجل الدوام</h3>
                {ruleHistory.length === 0 ? (
                  <p className="text-sm text-gray-500">لا توجد تغييرات دوام مسجلة لهذا الموظف</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 border-b border-gray-100">
                          <th className="py-2 text-right font-medium">يسري من</th>
                          <th className="py-2 text-right font-medium">جدول العمل</th>
                          <th className="py-2 text-right font-medium">المرونة</th>
                          <th className="py-2 text-right font-medium">السبب</th>
                          <th className="py-2 text-right font-medium">سجّله</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ruleHistory.map((row) => (
                          <tr key={row.id} className="border-b border-gray-50 align-top">
                            <td className="py-2 whitespace-nowrap" dir="ltr">{row.effectiveFrom}</td>
                            <td className="py-2">{row.schedule}</td>
                            <td className="py-2">{row.flex}</td>
                            <td className="py-2 whitespace-pre-wrap break-words">{row.reason}</td>
                            <td className="py-2 whitespace-nowrap">{row.actor}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Financial Tab */}
          {activeTab === 'financial' && canViewFinancial && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4">
                البيانات المالية
              </h2>

              {/* Salary Breakdown */}
              <div className="grid grid-cols-5 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">الراتب الأساسي</p>
                  <p className="font-bold text-gray-800 text-xl mt-1">{Number(employee.basicSalary).toLocaleString()} {currency}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">بدل السكن</p>
                  <p className="font-bold text-gray-800 text-xl mt-1">{Number(employee.housingAllowance).toLocaleString()} {currency}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">بدل المواصلات</p>
                  <p className="font-bold text-gray-800 text-xl mt-1">{Number(employee.transportAllowance).toLocaleString()} {currency}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">بدلات أخرى</p>
                  <p className="font-bold text-gray-800 text-xl mt-1">{Number(employee.otherAllowance).toLocaleString()} {currency}</p>
                </div>
                <div className="p-4 bg-primary-50 rounded-xl">
                  <p className="text-sm text-primary-600">إجمالي الراتب</p>
                  <p className="font-bold text-primary-600 text-xl mt-1">{Number(employee.totalSalary).toLocaleString()} {currency}</p>
                </div>
              </div>

              {/* بدلات إضافية — محفوظة على الموظف وتُعرض مستقلة */}
              <div className="space-y-4">
                <h3 className="text-md font-bold text-gray-700">بدلات إضافية</h3>
                <div className="grid grid-cols-5 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">بدل الهاتف</p>
                    <p className="font-bold text-gray-800 text-xl mt-1">{Number(employee.phoneAllowance).toLocaleString()} {currency}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">بدل طبيعة العمل</p>
                    <p className="font-bold text-gray-800 text-xl mt-1">{Number(employee.workNatureAllowance).toLocaleString()} {currency}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-md font-bold text-gray-700">المعلومات البنكية</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">اسم البنك</span>
                      <span className="font-medium text-gray-800">{employee.bankName}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">فرع البنك</span>
                      <span className="font-medium text-gray-800">{employee.bankBranch}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-500">رقم الحساب (IBAN)</span>
                      <span className="font-medium text-gray-800 font-mono text-sm">{employee.bankAccount}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-md font-bold text-gray-700">طريقة صرف الراتب</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">طريقة الصرف</span>
                      <span className="font-medium text-gray-800">{employee.payMethod}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">العملة</span>
                      <span className="font-medium text-gray-800">{employee.currencyCode}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-500">دورة الراتب</span>
                      <span className="font-medium text-gray-800">{employee.salaryCycle}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* التأمينات الاجتماعية */}
              <div className="pt-6 border-t border-gray-100 space-y-4">
                <h3 className="text-md font-bold text-gray-700">التأمينات الاجتماعية</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">رقم التأمينات (GOSI)</span>
                    <span className="font-medium text-gray-800 font-mono">{employee.gosiNumber}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">خاضع للتأمينات</span>
                    <span className="font-medium text-gray-800">{employee.isGosiRegistered}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">الراتب الخاضع للتأمينات</span>
                    <span className="font-medium text-gray-800">
                      {employee.gosiBaseSalary === '—'
                        ? '—'
                        : `${employee.gosiBaseSalary} ${currency}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Qualifications Tab */}
          {activeTab === 'qualifications' && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4">
                المؤهلات والخبرات
              </h2>

              {(() => {
                const q = quals
                const total =
                  (q?.education?.length ?? 0) +
                  (q?.certifications?.length ?? 0) +
                  (q?.experiences?.length ?? 0) +
                  (q?.skills?.length ?? 0) +
                  (q?.languages?.length ?? 0)
                if (!q || total === 0) {
                  return (
                    <div className="py-12 text-center">
                      <GraduationCap size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">
                        لا توجد بيانات مؤهلات مسجلة — تُضاف من «تعديل الموظف ← المؤهلات والخبرات»
                      </p>
                    </div>
                  )
                }
                const Section = ({
                  title,
                  rows,
                  render,
                }: {
                  title: string
                  rows: any[]
                  render: (r: any) => { main: string; sub?: string }
                }) =>
                  rows.length === 0 ? null : (
                    <div>
                      <h3 className="text-md font-bold text-gray-700 border-b border-gray-100 pb-2 mb-3">
                        {title}
                        <span className="text-xs font-normal text-gray-400 mr-2">
                          ({rows.length})
                        </span>
                      </h3>
                      <ul className="divide-y divide-gray-100">
                        {rows.map((r) => {
                          const v = render(r)
                          return (
                            <li key={r.id} className="py-3">
                              <p className="text-gray-800 font-medium">{v.main}</p>
                              {v.sub && (
                                <p className="text-sm text-gray-500 mt-0.5">{v.sub}</p>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                const DEG: Record<string, string> = {
                  phd: 'دكتوراه',
                  master: 'ماجستير',
                  bachelor: 'بكالوريوس',
                  diploma: 'دبلوم',
                  high_school: 'ثانوي',
                  other: 'أخرى',
                }
                const LVL: Record<string, string> = {
                  beginner: 'مبتدئ',
                  intermediate: 'متوسط',
                  advanced: 'متقدم',
                  expert: 'خبير',
                }
                const LANG: Record<string, string> = {
                  native: 'لغة أم',
                  very_good: 'جيد جداً',
                  good: 'جيد',
                  basic: 'أساسي',
                }
                const d = (x?: string) => (x ? String(x).slice(0, 10) : '')
                return (
                  <div className="space-y-8">
                    <Section
                      title="التعليم"
                      rows={q.education ?? []}
                      render={(r) => ({
                        main: `${DEG[r.degree] ?? r.degree}${r.major ? ` — ${r.major}` : ''}`,
                        sub: [r.institution, r.graduationYear].filter(Boolean).join(' · '),
                      })}
                    />
                    <Section
                      title="الشهادات المهنية"
                      rows={q.certifications ?? []}
                      render={(r) => ({
                        main: r.name,
                        sub: [
                          r.issuer,
                          d(r.issueDate) && `صدرت ${d(r.issueDate)}`,
                          d(r.expiryDate) && `تنتهي ${d(r.expiryDate)}`,
                        ]
                          .filter(Boolean)
                          .join(' · '),
                      })}
                    />
                    <Section
                      title="الخبرات السابقة"
                      rows={q.experiences ?? []}
                      render={(r) => ({
                        main: `${r.company}${r.jobTitle ? ` — ${r.jobTitle}` : ''}`,
                        sub: [
                          r.country,
                          d(r.fromDate) && `${d(r.fromDate)} ← ${d(r.toDate) || 'حتى الآن'}`,
                          r.leaveReason,
                        ]
                          .filter(Boolean)
                          .join(' · '),
                      })}
                    />
                    <Section
                      title="المهارات"
                      rows={q.skills ?? []}
                      render={(r) => ({
                        main: r.name,
                        sub: [
                          r.level && (LVL[r.level] ?? r.level),
                          r.yearsExperience && `${r.yearsExperience} سنة خبرة`,
                        ]
                          .filter(Boolean)
                          .join(' · '),
                      })}
                    />
                    <Section
                      title="اللغات"
                      rows={q.languages ?? []}
                      render={(r) => ({
                        main: r.language,
                        sub: [
                          r.speaking && `تحدث: ${LANG[r.speaking] ?? r.speaking}`,
                          r.writing && `كتابة: ${LANG[r.writing] ?? r.writing}`,
                          r.reading && `قراءة: ${LANG[r.reading] ?? r.reading}`,
                        ]
                          .filter(Boolean)
                          .join(' · '),
                      })}
                    />
                  </div>
                )
              })()}
            </div>
          )}

          {/* Leaves Tab */}
          {activeTab === 'leaves' && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4">
                رصيد الإجازات
              </h2>

              {/* استحقاق السنوي المحفوظ على الموظف (مفتاح «يستحق إجازات سنوية» في النموذج) */}
              <div className={`p-4 rounded-xl flex items-center justify-between ${employee.annualLeaveEntitled ? 'bg-green-50' : 'bg-gray-50'}`}>
                <span className="text-gray-600">يستحق إجازة سنوية</span>
                <span className="font-bold text-gray-800">
                  {employee.annualLeaveEntitled ? 'نعم' : 'لا'}
                  {employee.annualLeaveEntitled && employee.annualEntitlementDays != null
                    ? ` — ${employee.annualEntitlementDays} يوم/سنة`
                    : ''}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-6">
                {balAnnual && (
                <div className="p-6 bg-primary-50 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-bold text-gray-700">إجازة سنوية</p>
                    <Calendar size={24} className="text-primary-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">الإجمالي</span>
                      <span className="font-medium">{balAnnual.total} يوم</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">المستخدم</span>
                      <span className="font-medium text-danger-600">{balAnnual.used} يوم</span>
                    </div>
                    <div className="h-2 bg-primary-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${balAnnual.total ? Math.min(100, (balAnnual.used / balAnnual.total) * 100) : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-primary-100">
                      <span className="font-medium text-gray-700">المتبقي</span>
                      <span className="font-bold text-primary-600">{balAnnual.remaining} يوم</span>
                    </div>
                    {balAnnual.openingDays > 0 && (
                      <p className="text-xs text-gray-500 pt-1">
                        رصيد مُرحَّل: {balAnnual.openingDays} يوم (مستخدم {balAnnual.openingTaken})
                        {balAnnual.openingExpiry &&
                          ` — ${balAnnual.openingExpired ? 'انتهى في' : 'ينتهي في'} ${balAnnual.openingExpiry}`}
                      </p>
                    )}
                  </div>
                </div>
                )}

                {balSick && (
                <div className="p-6 bg-success-50 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-bold text-gray-700">إجازة مرضية</p>
                    <Calendar size={24} className="text-success-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">الإجمالي</span>
                      <span className="font-medium">{balSick.total} يوم</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">المستخدم</span>
                      <span className="font-medium text-danger-600">{balSick.used} يوم</span>
                    </div>
                    <div className="h-2 bg-success-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success-500 rounded-full"
                        style={{ width: `${balSick.total ? Math.min(100, (balSick.used / balSick.total) * 100) : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-success-100">
                      <span className="font-medium text-gray-700">المتبقي</span>
                      <span className="font-bold text-success-600">{balSick.remaining} يوم</span>
                    </div>
                    {balSick.openingDays > 0 && (
                      <p className="text-xs text-gray-500 pt-1">
                        رصيد مُرحَّل: {balSick.openingDays} يوم (مستخدم {balSick.openingTaken})
                        {balSick.openingExpiry &&
                          ` — ${balSick.openingExpired ? 'انتهى في' : 'ينتهي في'} ${balSick.openingExpiry}`}
                      </p>
                    )}
                  </div>
                </div>
                )}

                {!balAnnual && !balSick && (
                  <div className="col-span-3 py-12 text-center">
                    <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">لا توجد أرصدة إجازات مسجلة لهذا الموظف</p>
                  </div>
                )}
              </div>

              {/* سجل الإجازات */}
              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-md font-bold text-gray-700 mb-4">سجل الإجازات</h3>
                {leaves.length === 0 ? (
                  <p className="text-gray-500 text-sm">لا توجد إجازات مسجلة</p>
                ) : (
                  <div className="space-y-4">
                    {leaves.map((l) => (
                      <div key={l.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                            <Calendar size={24} className="text-primary-600" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{l.typeLabel}</p>
                            <p className="text-sm text-gray-500" dir="ltr">
                              {l.fromDate} ← {l.toDate}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-800">{l.days} يوم</p>
                          <p className="text-sm text-gray-400">{l.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assets Tab */}
          {activeTab === 'assets' && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4">
                العهد والأصول
              </h2>

              <div className="space-y-4">
                {custody.length === 0 && (
                  <div className="py-12 text-center">
                    <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">لا توجد عهد مسجلة لهذا الموظف</p>
                  </div>
                )}
                {custody.map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                        <FileText size={24} className="text-primary-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{asset.assetName}</p>
                        <p className="text-sm text-gray-500">{asset.assetCategory}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <span
                        className={`badge text-xs ${
                          (CUSTODY_STATUS as Record<string, { label: string; className: string }>)[asset.status]?.className ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {(CUSTODY_STATUS as Record<string, { label: string; className: string }>)[asset.status]?.label ?? asset.status}
                      </span>
                      <p className="text-sm text-gray-400 mt-1">استلام: {asset.assignedAt}</p>
                      {asset.acknowledgedAt && (
                        <p className="text-xs text-indigo-500">أقرّ بالاستلام: {asset.acknowledgedAt}</p>
                      )}
                      {asset.returnedAt && (
                        <p className="text-xs text-gray-400">أُرجعت: {asset.returnedAt}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Job History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4">
                السجل الوظيفي — كل تغيير مؤرَّخ وموثَّق
              </h2>

              {historyEvents.length === 0 ? (
                <div className="py-12 text-center">
                  <Clock size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">لا توجد أحداث في السجل الوظيفي بعد</p>
                </div>
              ) : (
              <div className="relative space-y-0">
                {historyEvents.map((event, index, arr) => (
                  <div key={index} className="flex gap-4 relative">
                    {/* الخط الزمني */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 ${event.color}`}
                      >
                        <Clock size={18} />
                      </div>
                      {index < arr.length - 1 && (
                        <div className="w-0.5 flex-1 bg-gray-100 my-1" />
                      )}
                    </div>
                    {/* التفاصيل */}
                    <div className="pb-8 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-gray-800">{event.title}</h3>
                        <span className="text-xs text-gray-400" dir="ltr">
                          {event.date}
                        </span>
                      </div>
                      <div className="mt-2 p-4 bg-gray-50 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400">من:</span>
                          <span className="text-gray-600">{event.from}</span>
                          <span className="text-gray-300 mx-1">←</span>
                          <span className="text-gray-400">إلى:</span>
                          <span className="font-medium text-gray-800">{event.to}</span>
                        </div>
                        <p className="text-sm text-gray-500">السبب: {event.reason}</p>
                        {event.requestId && (
                          <p className="text-xs text-gray-400">
                            المرجع: طلب رقم #{event.requestId}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h2 className="text-lg font-bold text-gray-800">المستندات</h2>
                <div className="flex items-center gap-2">
                {can('documents.manage') && <Link href={`/employees/documents/create?employeeId=${employee.id}`} className="btn-primary flex items-center gap-2">
                  <FileText size={18} />
                  إنشاء مستند من قالب
                </Link>}
                <button
                  onClick={() => setShowDocumentModal(true)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <FileSignature size={18} />
                  طلب خطاب
                </button>
                </div>
              </div>

              {/* Registered Documents */}
              <div>
                <h3 className="font-medium text-gray-700 mb-4">المستندات المسجلة</h3>
                {docs.length === 0 ? (
                  <p className="text-gray-500 text-sm">لا توجد مستندات مسجلة لهذا الموظف</p>
                ) : (
                <div className="grid grid-cols-3 gap-4">
                  {docs.map((doc) => (
                    <div key={doc.id} className="p-4 border border-gray-200 rounded-xl hover:border-primary-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <FileText size={20} className="text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{docTypeLabel(doc.docType)}</p>
                          <p className="text-xs text-gray-400" dir="ltr">{doc.number}</p>
                          <p className="text-xs text-gray-400 mt-0.5">الانتهاء: {doc.expiryDate}</p>
                        </div>
                        {doc.expired && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            منتهي
                          </span>
                        )}
                      </div>
                      {doc.fileRef.startsWith('file:') && (
                        <button
                          onClick={() => viewFile(doc.fileRef)}
                          className="mt-3 w-full flex items-center justify-center gap-2 p-2 bg-primary-50 rounded-lg hover:bg-primary-100 text-sm text-primary-600"
                          title="عرض الملف"
                        >
                          <Eye size={16} />
                          معاينة الملف
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                )}
              </div>

              {/* Quick Generate Section */}
              <div className="pt-6 border-t border-gray-100">
                <h3 className="font-medium text-gray-700 mb-2">طلب خطاب للموظف</h3>
                <p className="text-sm text-gray-500 mb-4">اختر الخطاب لاستكمال الطلب؛ يُنشأ المستند ويُحفظ بعد الاعتماد.</p>
                <div className="grid grid-cols-3 gap-4">
                  {documentTemplates.map((template) => (
                    <Link
                      key={template.id}
                      href={`/requests?type=${template.id}&employeeId=${employee.id}`}
                      className="p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all text-right group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                          <template.icon size={20} className="text-primary-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{template.name}</p>
                          <p className="text-xs text-gray-400">{template.nameEn}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
          </>
        )}
      </div>

      {/* Document Template Selection Modal */}
      {showDocumentModal && employee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">طلب خطاب</h2>
                <p className="text-sm text-gray-500 mt-1">اختر الخطاب لاستكمال طلبه للموظف {employee.name}؛ يُحفظ المستند بعد الاعتماد.</p>
              </div>
              <button
                onClick={() => setShowDocumentModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {documentTemplates.map((template) => (
                  <Link
                    key={template.id}
                    href={`/requests?type=${template.id}&employeeId=${employee.id}`}
                    className="p-4 border border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-right group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                        <template.icon size={24} className="text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{template.name}</p>
                        <p className="text-sm text-gray-500">{template.nameEn}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
              <Link
                href="/settings/letter-templates"
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                إدارة قوالب الخطابات
              </Link>
              <button
                onClick={() => setShowDocumentModal(false)}
                className="btn-secondary"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </MainLayout>
  )
}

