'use client'

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
} from 'lucide-react'
import {
  fetchEmployeeProfile,
  fetchBranches,
  fetchDepartments,
  fetchTeams,
  fetchEmployees,
  type ApiEmployee,
} from '@/lib/api'
import { useCurrency, loadCurrency } from '@/lib/currency'

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
}

// نموذج العرض — يُملأ من الباك إند، والحقول غير المدعومة تظهر «—»
interface EmployeeVM {
  id: number
  employeeId: string
  name: string
  nameEn: string
  avatar: string
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
  children: string
  address: string
  contractType: string
  contractStart: string
  employmentType: string
  basicSalary: number
  housingAllowance: number
  transportAllowance: number
  otherAllowance: number
  emergencyContactName: string
  emergencyContactPhone: string
  totalSalary: number
  payMethod: string
  bankName: string
  bankAccount: string
  gosiNumber: string
  leaveBalance: { annual: { total: number; used: number; remaining: number } }
}

interface BalanceView {
  total: number
  used: number
  remaining: number
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

interface HistoryEventView {
  date: string
  title: string
  from: string
  to: string
  reason: string
  requestId?: number
  color: string
}

interface DocView {
  id: number
  docType: string
  number: string
  expiryDate: string
  expired: boolean
}

const LEAVE_TYPE_AR: Record<string, string> = {
  ANNUAL: 'إجازة سنوية',
  SICK: 'إجازة مرضية',
  CASUAL: 'إجازة طارئة',
  UNPAID: 'إجازة بدون راتب',
  MATERNITY: 'إجازة وضع',
  PATERNITY: 'إجازة أبوة',
  HAJJ: 'إجازة حج',
  MARRIAGE: 'إجازة زواج',
  BEREAVEMENT: 'إجازة وفاة/عدة',
  EXAM: 'إجازة امتحانات',
  COMPENSATORY: 'إجازة تعويضية',
}

const LEAVE_STATUS_AR: Record<string, string> = {
  APPROVED: 'معتمدة',
  UNDER_REVIEW: 'قيد المراجعة',
  PENDING: 'قيد المراجعة',
  REJECTED: 'مرفوضة',
  CANCELLED: 'ملغاة',
}

const CUSTODY_STATUS_AR: Record<string, { label: string; className: string }> = {
  PENDING_ACK: { label: 'بانتظار التأكيد', className: 'bg-indigo-100 text-indigo-700' },
  ACTIVE: { label: 'نشطة', className: 'bg-success-50 text-success-700' },
  RETURNED: { label: 'مُرجعة', className: 'bg-gray-100 text-gray-600' },
  RETURN_REQUESTED: { label: 'طلب إرجاع', className: 'bg-blue-100 text-blue-700' },
  LOST: { label: 'مفقودة', className: 'bg-red-100 text-red-700' },
  DAMAGED: { label: 'تالفة', className: 'bg-orange-100 text-orange-700' },
}

const EMP_STATUS_AR: Record<string, string> = {
  active: 'نشط',
  probation: 'فترة تجربة',
  suspended: 'موقوف',
  notice_period: 'فترة إشعار',
  resigned: 'مستقيل',
  archived: 'مؤرشف',
}

const PAY_METHOD_AR: Record<string, string> = {
  transfer: 'تحويل بنكي',
  cash: 'نقدي',
  visa: 'فيزا',
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

// السجل الوظيفي — تحويل مداخل salary:/team:/title:/iban: إلى عربية مقروءة
const parseHistoryEntry = (
  h: { oldStatus?: string; newStatus: string; reason?: string; changedAt: string; requestId?: number },
  teamNameById: Map<number, string>,
  currency: string
): HistoryEventView => {
  const split = (v: string): [string | null, string] => {
    const i = v.indexOf(':')
    return i > -1 ? [v.slice(0, i), v.slice(i + 1)] : [null, v]
  }
  const [kind, toVal] = split(h.newStatus ?? '')
  const [, fromVal] = split(h.oldStatus ?? '')
  const base = {
    date: fmtDate(h.changedAt),
    reason: h.reason ?? '—',
    requestId: h.requestId,
  }
  switch (kind) {
    case 'salary':
      return {
        ...base,
        title: 'تغيير راتب',
        from: `الراتب: ${Number(fromVal || 0).toLocaleString()} ${currency}`,
        to: `${Number(toVal || 0).toLocaleString()} ${currency}`,
        color: 'bg-success-100 text-success-600',
      }
    case 'team':
      return {
        ...base,
        title: 'نقل بين فرق',
        from: `الفريق: ${teamNameById.get(Number(fromVal)) ?? `#${fromVal}`}`,
        to: teamNameById.get(Number(toVal)) ?? `#${toVal}`,
        color: 'bg-blue-100 text-blue-600',
      }
    case 'title':
      return {
        ...base,
        title: 'ترقية',
        from: `المسمى: ${fromVal || '—'}`,
        to: toVal || '—',
        color: 'bg-indigo-100 text-indigo-600',
      }
    case 'iban':
      return {
        ...base,
        title: 'تغيير حساب بنكي',
        from: `الحساب: ${fromVal || '—'}`,
        to: toVal || '—',
        color: 'bg-orange-100 text-orange-600',
      }
    default:
      if ((h.newStatus ?? '') === 'data_update') {
        return {
          ...base,
          title: 'تحديث بيانات',
          from: '—',
          to: '—',
          color: 'bg-teal-100 text-teal-600',
        }
      }
      return {
        ...base,
        title: 'تغيير حالة',
        from: EMP_STATUS_AR[h.oldStatus ?? ''] ?? (h.oldStatus || '—'),
        to: EMP_STATUS_AR[h.newStatus] ?? h.newStatus,
        color: 'bg-primary-100 text-primary-600',
      }
  }
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

// Document templates
const documentTemplates = [
  {
    id: '1',
    name: 'عقد العمل',
    nameEn: 'Employment Contract',
    category: 'contracts',
    icon: FileSignature,
  },
  {
    id: '2',
    name: 'خطاب تعريف بالراتب',
    nameEn: 'Salary Certificate',
    category: 'letters',
    icon: FileText,
  },
  {
    id: '3',
    name: 'شهادة خبرة',
    nameEn: 'Experience Certificate',
    category: 'certificates',
    icon: Award,
  },
  {
    id: '4',
    name: 'خطاب تعريف للبنك',
    nameEn: 'Bank Letter',
    category: 'letters',
    icon: FileText,
  },
  {
    id: '5',
    name: 'خطاب تعريف للسفارة',
    nameEn: 'Embassy Letter',
    category: 'letters',
    icon: FileText,
  },
  {
    id: '6',
    name: 'إخلاء طرف',
    nameEn: 'Clearance Letter',
    category: 'forms',
    icon: FileText,
  },
]

// Sample contract with employee data filled
const generateDocument = (templateId: string, emp: EmployeeVM, currency: string) => {
  const templates: Record<string, string> = {
    '1': `بسم الله الرحمن الرحيم

عقد عمل

تم بعون الله وتوفيقه في يوم ${new Date().toLocaleDateString('ar-SA')} إبرام هذا العقد بين كل من:

الطرف الأول (صاحب العمل):
شركة التقنية المتقدمة
السجل التجاري: 1010123456
العنوان: الرياض، حي العليا، شارع الملك فهد

الطرف الثاني (الموظف):
الاسم: ${emp.name}
رقم الهوية: ${emp.nationalId}
الجنسية: ${emp.nationality}
العنوان: ${emp.address}

تمهيد:
حيث أن الطرف الأول شركة تعمل في مجال التقنية، وحيث أن الطرف الثاني يرغب في العمل لدى الطرف الأول، فقد اتفق الطرفان على الشروط التالية:

المادة الأولى: مدة العقد
مدة هذا العقد ${emp.contractType} تبدأ من ${emp.contractStart}.

المادة الثانية: طبيعة العمل
يعمل الطرف الثاني لدى الطرف الأول بمسمى ${emp.jobTitle} في قسم ${emp.department}.

المادة الثالثة: الأجر
يتقاضى الطرف الثاني راتباً شهرياً إجمالياً قدره ${emp.totalSalary.toLocaleString()} ${currency} موزعاً كالتالي:
- الراتب الأساسي: ${emp.basicSalary.toLocaleString()} ${currency}
- بدل السكن: ${emp.housingAllowance.toLocaleString()} ${currency}
- بدل النقل: ${emp.transportAllowance.toLocaleString()} ${currency}
- بدلات أخرى: ${emp.otherAllowance.toLocaleString()} ${currency}

المادة الرابعة: ساعات العمل
ساعات العمل 8 ساعات يومياً حسب نظام العمل السعودي.

المادة الخامسة: الإجازات
يستحق الموظف إجازة سنوية مدتها ${emp.leaveBalance.annual.total} يوم.

المادة السادسة: أحكام عامة
يخضع هذا العقد لأحكام نظام العمل السعودي.


الطرف الأول                                         الطرف الثاني
شركة التقنية المتقدمة                              ${emp.name}

التوقيع: _______________                           التوقيع: _______________`,

    '2': `التاريخ: ${new Date().toLocaleDateString('ar-SA')}
الموافق: ${new Date().toLocaleDateString('en-GB')}

إلى من يهمه الأمر،

خطاب تعريف بالراتب

تشهد شركة التقنية المتقدمة بأن السيد/ة ${emp.name} حامل الهوية رقم ${emp.nationalId} يعمل لديها بمسمى ${emp.jobTitle} في قسم ${emp.department} منذ تاريخ ${emp.joinDate}.

ويتقاضى راتباً شهرياً إجمالياً قدره ${emp.totalSalary.toLocaleString()} ${currency} فقط لا غير، موزعاً كالتالي:

- الراتب الأساسي: ${emp.basicSalary.toLocaleString()} ${currency}
- بدل السكن: ${emp.housingAllowance.toLocaleString()} ${currency}
- بدل المواصلات: ${emp.transportAllowance.toLocaleString()} ${currency}
- بدلات أخرى: ${emp.otherAllowance.toLocaleString()} ${currency}

أُعطي هذا الخطاب بناءً على طلبه دون أي مسؤولية على الشركة.

والله الموفق،

شركة التقنية المتقدمة
إدارة الموارد البشرية

_______________
التوقيع والختم`,

    '3': `التاريخ: ${new Date().toLocaleDateString('ar-SA')}

شهادة خبرة

تشهد شركة التقنية المتقدمة بأن السيد/ة ${emp.name} حامل الهوية رقم ${emp.nationalId} قد عمل لديها بمسمى ${emp.jobTitle} في قسم ${emp.department} خلال الفترة من ${emp.joinDate} وحتى تاريخه.

وخلال فترة عمله معنا أظهر كفاءة عالية والتزاماً في العمل.

نتمنى له التوفيق في مسيرته المهنية.

شركة التقنية المتقدمة
إدارة الموارد البشرية`,

    '4': `التاريخ: ${new Date().toLocaleDateString('ar-SA')}

إلى: ${emp.bankName}

الموضوع: خطاب تعريف

السلام عليكم ورحمة الله وبركاته،

نفيدكم بأن السيد/ة ${emp.name} حامل الهوية رقم ${emp.nationalId} يعمل لدى شركة التقنية المتقدمة بمسمى ${emp.jobTitle} منذ تاريخ ${emp.joinDate}.

ويتقاضى راتباً شهرياً إجمالياً قدره ${emp.totalSalary.toLocaleString()} ${currency} يُحوّل على حسابه البنكي رقم ${emp.bankAccount}.

هذا الخطاب صادر بناءً على طلب الموظف.

وتقبلوا وافر الاحترام والتقدير،

شركة التقنية المتقدمة
إدارة الموارد البشرية`,

    '5': `التاريخ: ${new Date().toLocaleDateString('ar-SA')}

إلى: السفارة / القنصلية

الموضوع: خطاب تعريف للحصول على تأشيرة

السلام عليكم ورحمة الله وبركاته،

نفيدكم بأن السيد/ة ${emp.name}
جواز السفر رقم: ${emp.passportNo}
الجنسية: ${emp.nationality}

يعمل لدى شركة التقنية المتقدمة بمسمى ${emp.jobTitle} منذ تاريخ ${emp.joinDate}.

ويتقاضى راتباً شهرياً إجمالياً قدره ${emp.totalSalary.toLocaleString()} ${currency}.

نتعهد بعودته إلى عمله بعد انتهاء إجازته.

وتقبلوا وافر الاحترام والتقدير،

شركة التقنية المتقدمة
إدارة الموارد البشرية`,

    '6': `نموذج إخلاء طرف

التاريخ: ${new Date().toLocaleDateString('ar-SA')}

بيانات الموظف:
الاسم: ${emp.name}
الرقم الوظيفي: ${emp.employeeId}
القسم: ${emp.department}
تاريخ التعيين: ${emp.joinDate}

أولاً: العهد والأصول
□ تم تسليم جميع العهد والأصول
□ لابتوب: ____________
□ جوال: ____________
□ بطاقة الدخول: ____________

ثانياً: الإدارة المالية
□ لا يوجد سلف مستحقة
□ تمت تسوية جميع المستحقات

ثالثاً: تقنية المعلومات
□ تم إلغاء الصلاحيات
□ تم حذف الحسابات

رابعاً: الموارد البشرية
□ تم استلام المستندات
□ تمت مقابلة الخروج

التوقيعات:
الموظف: _______________
المدير المباشر: _______________
الموارد البشرية: _______________
الإدارة المالية: _______________
تقنية المعلومات: _______________`,
  }
  return templates[templateId] || ''
}

export default function EmployeeProfilePage({
  params,
}: {
  params: { id: string }
}) {
  const [activeTab, setActiveTab] = useState('personal')
  const currency = useCurrency()
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [generatedDocument, setGeneratedDocument] = useState<string>('')
  const [showPreview, setShowPreview] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [employee, setEmployee] = useState<EmployeeVM | null>(null)
  const [balAnnual, setBalAnnual] = useState<BalanceView | null>(null)
  const [balSick, setBalSick] = useState<BalanceView | null>(null)
  const [leaves, setLeaves] = useState<LeaveView[]>([])
  const [custody, setCustody] = useState<CustodyView[]>([])
  const [historyEvents, setHistoryEvents] = useState<HistoryEventView[]>([])
  const [docs, setDocs] = useState<DocView[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [profile, branches, departments, teams, allEmployees, currencyNow] =
          await Promise.all([
            fetchEmployeeProfile(Number(params.id)),
            fetchBranches(),
            fetchDepartments(),
            fetchTeams(),
            fetchEmployees(),
            loadCurrency(),
          ])
        const e = profile.employee as ApiEmployee & EmployeeExtras
        const branchById = new Map(branches.map((b) => [b.id, b.name]))
        const deptById = new Map(departments.map((d) => [d.id, d.name]))
        const teamById = new Map(teams.map((t) => [t.id, t.name]))
        const empById = new Map(allEmployees.map((x) => [x.id, x]))

        const today = new Date().toISOString().slice(0, 10)
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
            total: Number(row.entitled ?? 0),
            used: Number(row.taken ?? 0),
            remaining:
              Number(row.entitled ?? 0) - Number(row.taken ?? 0) + openingAvailable,
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
          email: e.email ?? '—',
          personalEmail: '—',
          phone: e.phone ?? '—',
          phoneAlt: '—',
          department:
            e.departmentId != null ? deptById.get(e.departmentId) ?? '—' : '—',
          jobTitle: e.jobTitle ?? '—',
          grade: '—',
          status: e.status,
          joinDate: fmtDate(e.joinDate),
          branch: branchById.get(e.branchId) ?? '—',
          manager: manager?.fullName ?? '—',
          managerTitle: manager?.jobTitle ?? '',
          nationality: e.nationality || '—',
          nationalId: e.nationalId ?? '—',
          passportNo: '—',
          passportExpiry: '—',
          birthDate: fmtDate(e.birthDate),
          birthPlace: '—',
          gender: e.gender ? GENDER_AR[e.gender] ?? e.gender : '—',
          maritalStatus: e.maritalStatus
            ? MARITAL_AR[e.maritalStatus] ?? e.maritalStatus
            : '—',
          children: '—',
          address: e.address || '—',
          contractType: '—',
          contractStart: fmtDate(e.joinDate),
          employmentType: '—',
          basicSalary: Number(e.basicSalary ?? 0),
          housingAllowance: Number(e.housingAllowance ?? 0),
          transportAllowance: Number(e.transportAllowance ?? 0),
          otherAllowance: Number(e.otherAllowance ?? 0),
          emergencyContactName: e.emergencyContactName || '—',
          emergencyContactPhone: e.emergencyContactPhone || '—',
          totalSalary:
            Number(e.basicSalary ?? 0) +
            Number(e.housingAllowance ?? 0) +
            Number(e.transportAllowance ?? 0) +
            Number(e.otherAllowance ?? 0),
          payMethod: PAY_METHOD_AR[e.payMethod] ?? e.payMethod ?? '—',
          bankName: e.bankName ?? '—',
          bankAccount: e.iban ?? '—',
          gosiNumber: '—',
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
            typeLabel: LEAVE_TYPE_AR[l.leaveType] ?? l.leaveType,
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

        setHistoryEvents(
          (profile.history ?? []).map((h: any) =>
            parseHistoryEntry(h, teamById, currencyNow)
          )
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

  const handleGenerateDocument = (templateId: string) => {
    if (!employee) return
    setSelectedTemplate(templateId)
    const content = generateDocument(templateId, employee, currency)
    setGeneratedDocument(content)
    setShowPreview(true)
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>طباعة المستند</title>
            <style>
              body {
                font-family: 'Arial', 'Tahoma', sans-serif;
                padding: 40px;
                line-height: 1.8;
                white-space: pre-wrap;
              }
            </style>
          </head>
          <body>${generatedDocument}</body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
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
              <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-3xl flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-primary-500/30">
                {employee.avatar}
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
              <button className="btn-secondary flex items-center gap-2">
                <Printer size={18} />
                طباعة
              </button>
              <Link href={`/employees/${employee.id}/edit`} className="btn-primary flex items-center gap-2">
                <Edit size={18} />
                تعديل
              </Link>
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
                      <div className="border-t border-gray-100 my-1" />
                      <Link
                        href={`/employees/${employee.id}/terminate`}
                        className="flex items-center gap-3 px-4 py-3 text-danger-600 hover:bg-danger-50 transition-colors"
                        onClick={() => setShowActionsMenu(false)}
                      >
                        <UserMinus size={18} />
                        <span>إنهاء الخدمة</span>
                      </Link>
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
            {tabs.map((tab) => (
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
                      <p className="text-sm text-gray-500">عدد الأبناء</p>
                      <p className="font-medium text-gray-800 mt-1">{employee.children}</p>
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
                      <Phone size={18} className="text-primary-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">رقم الجوال</p>
                      <p className="font-medium text-gray-800" dir="ltr">{employee.emergencyContactPhone}</p>
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

              <div className="grid grid-cols-3 gap-6">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">الرقم الوظيفي</p>
                  <p className="font-bold text-primary-600 text-lg mt-1 font-mono">{employee.employeeId}</p>
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
                      <span className="text-gray-500">المسمى الوظيفي</span>
                      <span className="font-medium text-gray-800">{employee.jobTitle}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">الدرجة الوظيفية</span>
                      <span className="font-medium text-gray-800">{employee.grade}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-500">المدير المباشر</span>
                      <span className="font-medium text-gray-800">{employee.manager}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-md font-bold text-gray-700">معلومات العقد</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">نوع العقد</span>
                      <span className="font-medium text-gray-800">{employee.contractType}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">تاريخ بداية العقد</span>
                      <span className="font-medium text-gray-800">{employee.contractStart}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-500">حالة الموظف</span>
                      {statusBadge(employee.status)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Financial Tab */}
          {activeTab === 'financial' && (
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

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-md font-bold text-gray-700">المعلومات البنكية</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">اسم البنك</span>
                      <span className="font-medium text-gray-800">{employee.bankName}</span>
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
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-500">رقم التأمينات (GOSI)</span>
                      <span className="font-medium text-gray-800 font-mono">{employee.gosiNumber}</span>
                    </div>
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

              <div className="py-12 text-center">
                <GraduationCap size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">
                  لا توجد بيانات مؤهلات مسجلة — هذه البيانات غير مدعومة في النظام حالياً
                </p>
              </div>
            </div>
          )}

          {/* Leaves Tab */}
          {activeTab === 'leaves' && (
            <div className="space-y-8">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4">
                رصيد الإجازات
              </h2>

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
                          CUSTODY_STATUS_AR[asset.status]?.className ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {CUSTODY_STATUS_AR[asset.status]?.label ?? asset.status}
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
                <button
                  onClick={() => setShowDocumentModal(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <FileSignature size={18} />
                  إنشاء مستند
                </button>
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
                          <p className="font-medium text-gray-800">{doc.docType}</p>
                          <p className="text-xs text-gray-400" dir="ltr">{doc.number}</p>
                          <p className="text-xs text-gray-400 mt-0.5">الانتهاء: {doc.expiryDate}</p>
                        </div>
                        {doc.expired && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            منتهي
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>

              {/* Quick Generate Section */}
              <div className="pt-6 border-t border-gray-100">
                <h3 className="font-medium text-gray-700 mb-4">إنشاء مستند سريع</h3>
                <div className="grid grid-cols-3 gap-4">
                  {documentTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleGenerateDocument(template.id)}
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
                    </button>
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
                <h2 className="text-xl font-bold text-gray-900">إنشاء مستند</h2>
                <p className="text-sm text-gray-500 mt-1">اختر نوع المستند لإنشائه للموظف {employee.name}</p>
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
                  <button
                    key={template.id}
                    onClick={() => {
                      handleGenerateDocument(template.id)
                      setShowDocumentModal(false)
                    }}
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
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
              <Link
                href="/settings/document-templates"
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                إدارة قوالب المستندات
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

      {/* Document Preview Modal */}
      {showPreview && employee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  معاينة المستند - {documentTemplates.find(t => t.id === selectedTemplate)?.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">للموظف: {employee.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowPreview(false)
                  setGeneratedDocument('')
                  setSelectedTemplate(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-gray-100">
              <div className="bg-white rounded-lg shadow-lg p-8 max-w-3xl mx-auto min-h-[600px]">
                <pre className="whitespace-pre-wrap font-sans text-gray-800 text-sm leading-relaxed" dir="rtl">
                  {generatedDocument}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check size={18} />
                تم إنشاء المستند بنجاح
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowPreview(false)
                    setGeneratedDocument('')
                    setSelectedTemplate(null)
                  }}
                  className="btn-secondary"
                >
                  إغلاق
                </button>
                <button className="btn-secondary flex items-center gap-2">
                  <Download size={16} />
                  تحميل PDF
                </button>
                <button
                  onClick={handlePrint}
                  className="btn-primary flex items-center gap-2"
                >
                  <Printer size={16} />
                  طباعة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
