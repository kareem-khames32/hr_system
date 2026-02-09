'use client'

import { useState } from 'react'
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

// Mock employee data
const employee = {
  id: '1',
  employeeId: 'EMP001',
  name: 'أحمد محمد علي السعيد',
  nameEn: 'Ahmed Mohammed Ali Alsaeed',
  avatar: 'أ',
  email: 'ahmed.m@company.com',
  personalEmail: 'ahmed.personal@gmail.com',
  phone: '+966 50 123 4567',
  phoneAlt: '+966 55 987 6543',
  department: 'تقنية المعلومات',
  jobTitle: 'مدير تقنية المعلومات',
  grade: 'Grade 5',
  status: 'active',
  joinDate: '2020/03/15',
  branch: 'الرياض',
  manager: 'محمد سالم العتيبي',
  managerTitle: 'المدير العام',
  nationality: 'سعودي',
  nationalId: '1234567890',
  passportNo: 'A12345678',
  passportExpiry: '2028/05/20',
  birthDate: '1990/05/15',
  birthPlace: 'الرياض',
  gender: 'ذكر',
  maritalStatus: 'متزوج',
  children: 2,
  address: 'حي العليا، شارع الملك فهد، الرياض، المملكة العربية السعودية',
  contractType: 'غير محدد المدة',
  contractStart: '2020/03/15',
  employmentType: 'دوام كامل',
  basicSalary: 15000,
  housingAllowance: 3750,
  transportAllowance: 1500,
  totalSalary: 20250,
  bankName: 'بنك الراجحي',
  bankAccount: 'SA00 0000 0000 0000 0000 0000',
  gosiNumber: '1234567890',
  education: [
    {
      degree: 'ماجستير',
      major: 'علوم الحاسب',
      university: 'جامعة الملك سعود',
      year: '2015',
    },
    {
      degree: 'بكالوريوس',
      major: 'هندسة البرمجيات',
      university: 'جامعة الملك فهد',
      year: '2012',
    },
  ],
  certifications: [
    { name: 'PMP', issuer: 'PMI', date: '2021/03', expiry: '2024/03' },
    { name: 'AWS Solutions Architect', issuer: 'Amazon', date: '2022/06', expiry: '2025/06' },
  ],
  skills: [
    { name: 'إدارة المشاريع', level: 'خبير' },
    { name: 'Python', level: 'متقدم' },
    { name: 'AWS', level: 'متقدم' },
    { name: 'SQL', level: 'متقدم' },
  ],
  languages: [
    { name: 'العربية', level: 'لغة أم' },
    { name: 'الإنجليزية', level: 'طلق' },
  ],
  leaveBalance: {
    annual: { total: 30, used: 12, remaining: 18 },
    sick: { total: 30, used: 3, remaining: 27 },
    emergency: { total: 6, used: 1, remaining: 5 },
  },
  assets: [
    { type: 'لابتوب', name: 'MacBook Pro 16"', assetId: 'LAP-001', date: '2020/03/15' },
    { type: 'جوال', name: 'iPhone 14 Pro', assetId: 'MOB-023', date: '2023/01/10' },
    { type: 'بطاقة دخول', name: 'Access Card', assetId: 'ACC-156', date: '2020/03/15' },
  ],
}

const tabs = [
  { id: 'personal', label: 'البيانات الشخصية', icon: User },
  { id: 'employment', label: 'البيانات الوظيفية', icon: Briefcase },
  { id: 'financial', label: 'البيانات المالية', icon: CreditCard },
  { id: 'qualifications', label: 'المؤهلات', icon: GraduationCap },
  { id: 'leaves', label: 'الإجازات', icon: Calendar },
  { id: 'assets', label: 'العهد', icon: FileText },
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
const generateDocument = (templateId: string, emp: typeof employee) => {
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
يتقاضى الطرف الثاني راتباً شهرياً إجمالياً قدره ${emp.totalSalary.toLocaleString()} ريال موزعاً كالتالي:
- الراتب الأساسي: ${emp.basicSalary.toLocaleString()} ريال
- بدل السكن: ${emp.housingAllowance.toLocaleString()} ريال
- بدل النقل: ${emp.transportAllowance.toLocaleString()} ريال

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

ويتقاضى راتباً شهرياً إجمالياً قدره ${emp.totalSalary.toLocaleString()} ريال سعودي فقط لا غير، موزعاً كالتالي:

- الراتب الأساسي: ${emp.basicSalary.toLocaleString()} ريال
- بدل السكن: ${emp.housingAllowance.toLocaleString()} ريال
- بدل المواصلات: ${emp.transportAllowance.toLocaleString()} ريال

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

ويتقاضى راتباً شهرياً إجمالياً قدره ${emp.totalSalary.toLocaleString()} ريال سعودي يُحوّل على حسابه البنكي رقم ${emp.bankAccount}.

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

ويتقاضى راتباً شهرياً إجمالياً قدره ${emp.totalSalary.toLocaleString()} ريال سعودي.

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

export default function EmployeeProfilePage() {
  const [activeTab, setActiveTab] = useState('personal')
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [generatedDocument, setGeneratedDocument] = useState<string>('')
  const [showPreview, setShowPreview] = useState(false)

  const handleGenerateDocument = (templateId: string) => {
    setSelectedTemplate(templateId)
    const content = generateDocument(templateId, employee)
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
                  <span className="badge badge-success">نشط</span>
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
              <p className="text-xs text-gray-400 mt-0.5">5 سنوات و 10 أشهر</p>
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
                      <span className="badge badge-success">نشط</span>
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
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">الراتب الأساسي</p>
                  <p className="font-bold text-gray-800 text-xl mt-1">{employee.basicSalary.toLocaleString()} ر.س</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">بدل السكن</p>
                  <p className="font-bold text-gray-800 text-xl mt-1">{employee.housingAllowance.toLocaleString()} ر.س</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">بدل المواصلات</p>
                  <p className="font-bold text-gray-800 text-xl mt-1">{employee.transportAllowance.toLocaleString()} ر.س</p>
                </div>
                <div className="p-4 bg-primary-50 rounded-xl">
                  <p className="text-sm text-primary-600">إجمالي الراتب</p>
                  <p className="font-bold text-primary-600 text-xl mt-1">{employee.totalSalary.toLocaleString()} ر.س</p>
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
                  <h3 className="text-md font-bold text-gray-700">التأمينات الاجتماعية</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">رقم التأمينات (GOSI)</span>
                      <span className="font-medium text-gray-800 font-mono">{employee.gosiNumber}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-500">خاضع للتأمينات</span>
                      <span className="badge badge-success">نعم</span>
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

              {/* Education */}
              <div>
                <h3 className="text-md font-bold text-gray-700 mb-4">التعليم</h3>
                <div className="space-y-4">
                  {employee.education.map((edu, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                        <GraduationCap size={24} className="text-primary-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{edu.degree} - {edu.major}</p>
                        <p className="text-gray-600 mt-1">{edu.university}</p>
                        <p className="text-sm text-gray-400 mt-1">تخرج: {edu.year}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Certifications */}
              <div>
                <h3 className="text-md font-bold text-gray-700 mb-4">الشهادات المهنية</h3>
                <div className="grid grid-cols-2 gap-4">
                  {employee.certifications.map((cert, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
                        <Award size={24} className="text-warning-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{cert.name}</p>
                        <p className="text-gray-600 mt-1">{cert.issuer}</p>
                        <p className="text-sm text-gray-400 mt-1">
                          حصول: {cert.date} | انتهاء: {cert.expiry}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div>
                <h3 className="text-md font-bold text-gray-700 mb-4">المهارات</h3>
                <div className="flex flex-wrap gap-3">
                  {employee.skills.map((skill, index) => (
                    <div key={index} className="px-4 py-2 bg-primary-50 rounded-xl">
                      <span className="font-medium text-primary-700">{skill.name}</span>
                      <span className="text-primary-500 text-sm mr-2">({skill.level})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div>
                <h3 className="text-md font-bold text-gray-700 mb-4">اللغات</h3>
                <div className="flex flex-wrap gap-3">
                  {employee.languages.map((lang, index) => (
                    <div key={index} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl">
                      <Globe size={18} className="text-gray-500" />
                      <span className="font-medium text-gray-700">{lang.name}</span>
                      <span className="text-gray-500 text-sm">- {lang.level}</span>
                    </div>
                  ))}
                </div>
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
                <div className="p-6 bg-primary-50 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-bold text-gray-700">إجازة سنوية</p>
                    <Calendar size={24} className="text-primary-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">الإجمالي</span>
                      <span className="font-medium">{employee.leaveBalance.annual.total} يوم</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">المستخدم</span>
                      <span className="font-medium text-danger-600">{employee.leaveBalance.annual.used} يوم</span>
                    </div>
                    <div className="h-2 bg-primary-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${(employee.leaveBalance.annual.used / employee.leaveBalance.annual.total) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-primary-100">
                      <span className="font-medium text-gray-700">المتبقي</span>
                      <span className="font-bold text-primary-600">{employee.leaveBalance.annual.remaining} يوم</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-success-50 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-bold text-gray-700">إجازة مرضية</p>
                    <Calendar size={24} className="text-success-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">الإجمالي</span>
                      <span className="font-medium">{employee.leaveBalance.sick.total} يوم</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">المستخدم</span>
                      <span className="font-medium text-danger-600">{employee.leaveBalance.sick.used} يوم</span>
                    </div>
                    <div className="h-2 bg-success-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success-500 rounded-full"
                        style={{ width: `${(employee.leaveBalance.sick.used / employee.leaveBalance.sick.total) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-success-100">
                      <span className="font-medium text-gray-700">المتبقي</span>
                      <span className="font-bold text-success-600">{employee.leaveBalance.sick.remaining} يوم</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-warning-50 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-bold text-gray-700">إجازة طارئة</p>
                    <Calendar size={24} className="text-warning-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">الإجمالي</span>
                      <span className="font-medium">{employee.leaveBalance.emergency.total} يوم</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">المستخدم</span>
                      <span className="font-medium text-danger-600">{employee.leaveBalance.emergency.used} يوم</span>
                    </div>
                    <div className="h-2 bg-warning-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-warning-500 rounded-full"
                        style={{ width: `${(employee.leaveBalance.emergency.used / employee.leaveBalance.emergency.total) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-warning-100">
                      <span className="font-medium text-gray-700">المتبقي</span>
                      <span className="font-bold text-warning-600">{employee.leaveBalance.emergency.remaining} يوم</span>
                    </div>
                  </div>
                </div>
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
                {employee.assets.map((asset, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                        <FileText size={24} className="text-primary-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{asset.name}</p>
                        <p className="text-sm text-gray-500">{asset.type}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-mono text-primary-600">{asset.assetId}</p>
                      <p className="text-sm text-gray-400">استلام: {asset.date}</p>
                    </div>
                  </div>
                ))}
              </div>
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

              {/* Uploaded Documents */}
              <div>
                <h3 className="font-medium text-gray-700 mb-4">المستندات المرفوعة</h3>
                <div className="grid grid-cols-3 gap-4">
                  {['صورة الهوية', 'جواز السفر', 'عقد العمل', 'شهادة المؤهل', 'السيرة الذاتية'].map((doc, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-xl hover:border-primary-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <FileText size={20} className="text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{doc}</p>
                          <p className="text-xs text-gray-400">PDF - 1.2 MB</p>
                        </div>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <Download size={18} className="text-gray-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
      </div>

      {/* Document Template Selection Modal */}
      {showDocumentModal && (
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
      {showPreview && (
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
