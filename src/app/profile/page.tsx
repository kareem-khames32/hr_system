'use client'

import { employeeStatusLabels as statusLabels, requestStatusLabels, requestStatusStyles as requestStatusColors, custodyStatusLabels, custodyStatusStyles, payMethodLabels } from '@/lib/status-labels'
import { useLeaveCatalog } from '@/lib/leave-catalog'
import { currencyLabel, useCurrency } from '@/lib/currency'
import { docTypeLabel } from '@/lib/doc-types'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import {
  User,
  Mail,
  MapPin,
  Calendar,
  Building2,
  Briefcase,
  Edit2,
  Camera,
  FileText,
  Clock,
  Package,
} from 'lucide-react'
import {
  getCurrentUser,
  fetchEmployeeProfile,
  fetchMyBalances,
  fetchMyRequests,
  fetchRequestTypes,
  fetchBranches,
  fetchDepartments,
  fetchFileObjectUrl,
  uploadFile,
  updateEmployee,
  can,
  ApiError,
  type CurrentUser,
  type ApiEmployee,
  type ApiLeave,
  type ApiBalance,
  type ApiRequest,
  type ApiCustody,
  type ApiDocument,
  type ApiBranch,
  type ApiDepartment,
} from '@/lib/api'

import { DISPLAY_LOCALE } from '@/lib/dates'

const balanceTypeLabels: Record<string, string> = {
  annual: 'إجازة سنوية',
  sick: 'إجازة مرضية',
  casual: 'إجازة عارضة',
}


const leaveStatusLabels: Record<string, string> = {
  APPROVED: 'معتمدة',
  PENDING: 'قيد الاعتماد',
  REJECTED: 'مرفوضة',
  CANCELLED: 'ملغاة',
}






const serviceDuration = (joinDate?: string) => {
  if (!joinDate) return '—'
  const start = new Date(joinDate)
  const now = new Date()
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (months < 0) months = 0
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years === 0) return `${rem} أشهر`
  if (rem === 0) return `${years} سنوات`
  return `${years} سنوات و ${rem} أشهر`
}

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString(DISPLAY_LOCALE) : '—'

export default function ProfilePage() {
  const leaveCatalog = useLeaveCatalog()
  const systemCurrency = useCurrency()
  const leaveTypeLabels = leaveCatalog.labels
  const [activeTab, setActiveTab] = useState('info')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [employee, setEmployee] = useState<ApiEmployee | null>(null)
  const [leaves, setLeaves] = useState<ApiLeave[]>([])
  const [custody, setCustody] = useState<ApiCustody[]>([])
  const [documents, setDocuments] = useState<ApiDocument[]>([])
  const [balances, setBalances] = useState<ApiBalance[]>([])
  const [requests, setRequests] = useState<ApiRequest[]>([])
  const [typeNames, setTypeNames] = useState<Record<string, string>>({})
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({})
  const [reloadRevision, setReloadRevision] = useState(0)
  const [fallbackNote, setFallbackNote] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  // تغيير الصورة لمن يملك تعديل ملفات الموظفين (الباك يفرض employees.edit ونطاق الفرع)
  const [canEditPhoto, setCanEditPhoto] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSectionErrors({})
    const sectionError = (section: string, err: unknown) => setSectionErrors((prev) => ({ ...prev, [section]: err instanceof Error ? err.message : 'تعذر التحميل' }))
    const currentUser = getCurrentUser()
    setUser(currentUser)
    setCanEditPhoto(can('employees.edit'))
    if (!currentUser || !currentUser.employeeId) {
      setLoading(false)
      return
    }
    const employeeId = currentUser.employeeId
    ;(async () => {
      try {
        fetchBranches()
          .then(setBranches)
          .catch((err) => sectionError('الفروع', err))
        fetchDepartments()
          .then(setDepartments)
          .catch((err) => sectionError('الأقسام', err))
        fetchMyBalances()
          .then(setBalances)
          .catch((err) => sectionError('أرصدة الإجازات', err))
        const myRequests = await fetchMyRequests().catch((err) => { sectionError('الطلبات', err); return [] as ApiRequest[] })
        setRequests(myRequests.slice(0, 5))
        // الاسم العربي لنوع الطلب — الكود لا يظهر للمستخدم
        fetchRequestTypes()
          .then((ts) =>
            setTypeNames(Object.fromEntries(ts.map((t) => [t.code, t.nameAr])))
          )
          .catch((err) => sectionError('أنواع الطلبات', err))
        try {
          const profile = await fetchEmployeeProfile(employeeId)
          setEmployee(profile.employee)
          setLeaves(profile.leaves ?? [])
          setCustody(profile.custody ?? [])
          setDocuments(profile.documents ?? [])
        } catch (err) {
          if (err instanceof ApiError && err.status === 403) {
            // لا تملك صلاحية الملف المجمّع — نكتفي بالأرصدة والطلبات وبيانات الحساب
            setFallbackNote(
              'لا تتوفر صلاحية عرض الملف المجمّع لحسابك — تُعرض بياناتك الأساسية وأرصدتك وطلباتك فقط.'
            )
          } else {
            throw err
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر تحميل الملف الشخصي')
      } finally {
        setLoading(false)
      }
    })()
  }, [reloadRevision])

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

  // رفع صورة جديدة ثم ربطها بملف الموظف — العرض يُعاد تحميله من photoFileId
  const handlePhotoPick = async (file: File | null | undefined) => {
    if (!file || !employee) return
    setError('')
    setPhotoUploading(true)
    try {
      const res = await uploadFile(file, { entityType: 'employee_photo' })
      await updateEmployee(employee.id, { photoFileId: res.id })
      setEmployee((prev) => (prev ? { ...prev, photoFileId: res.id } : prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحديث الصورة')
    } finally {
      setPhotoUploading(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  const branchName = (id?: number | null) =>
    branches.find((b) => b.id === id)?.name ?? '—'
  const departmentName = (id?: number | null) =>
    departments.find((d) => d.id === id)?.name ?? '—'

  const displayName = employee?.fullName ?? user?.displayName ?? '—'
  const avatarChar = displayName.charAt(0)

  const tabs = [
    { id: 'info', label: 'المعلومات الشخصية', icon: User },
    { id: 'leaves', label: 'الإجازات', icon: Calendar },
    { id: 'requests', label: 'الطلبات والعهدة', icon: Clock },
    { id: 'documents', label: 'المستندات', icon: FileText },
  ]

  return (
    <MainLayout>
      <div className="space-y-6">
        {leaveCatalog.error && <div role="alert" className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">تعذر تحميل أنواع الإجازات: {leaveCatalog.error} <button type="button" className="underline" onClick={leaveCatalog.retry}>إعادة المحاولة</button></div>}
        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {Object.entries(sectionErrors).map(([section, message]) => <div key={section} role="alert" className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">تعذر تحميل {section}: {message} <button type="button" onClick={() => setReloadRevision(value => value + 1)} className="underline">إعادة المحاولة</button></div>)}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !user ? (
          <div className="card text-center py-12">
            <User size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">الرجاء تسجيل الدخول لعرض الملف الشخصي</p>
          </div>
        ) : !user.employeeId ? (
          <div className="card text-center py-12">
            <User size={48} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-800 mb-2">{user.displayName}</h2>
            <p className="text-gray-500">
              حسابك غير مرتبط بملف موظف — لا يمكن عرض الملف الشخصي المجمّع.
            </p>
          </div>
        ) : (
          <>
            {fallbackNote && (
              <div className="bg-warning-50 text-warning-700 rounded-xl p-4">{fallbackNote}</div>
            )}

            {/* Profile Header */}
            <div className="card">
              <div className="flex items-start gap-6">
                <div className="relative">
                  <div className="w-32 h-32 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl flex items-center justify-center text-white text-5xl font-bold shadow-xl overflow-hidden">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      avatarChar
                    )}
                  </div>
                  <button className="absolute -bottom-2 -left-2 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
                    <Camera size={18} className="text-gray-600" />
                  </button>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-800">{displayName}</h1>
                      <p className="text-primary-600 font-medium">
                        {employee?.jobTitle ?? '—'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Building2 size={14} />
                          {departmentName(employee?.departmentId)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {branchName(employee?.branchId ?? user.branchId)}
                        </span>
                      </div>
                    </div>
                    <button className="btn-primary flex items-center gap-2">
                      <Edit2 size={18} />
                      تعديل الملف
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mt-6">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500">الرقم الوظيفي</p>
                      <p className="font-bold text-gray-800">{employee?.employeeCode ?? '—'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500">تاريخ الالتحاق</p>
                      <p className="font-bold text-gray-800">{formatDate(employee?.joinDate)}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500">الحالة</p>
                      <p className="font-bold text-gray-800">
                        {employee ? statusLabels[employee.status] ?? employee.status : '—'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500">مدة الخدمة</p>
                      <p className="font-bold text-gray-800">
                        {serviceDuration(employee?.joinDate)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'info' && (
              <div className="grid grid-cols-2 gap-6">
                <div className="card">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <User size={20} className="text-primary-600" />
                    البيانات الشخصية
                  </h2>
                  <div className="space-y-4">
                    <div className="flex justify-between py-3 border-b border-gray-100">
                      <span className="text-gray-500">الاسم الكامل</span>
                      <span className="font-medium text-gray-800">{displayName}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-gray-100">
                      <span className="text-gray-500">الاسم بالإنجليزية</span>
                      <span className="font-medium text-gray-800">
                        {employee?.fullNameEn ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-gray-100">
                      <span className="text-gray-500">رقم الهوية</span>
                      <span className="font-medium text-gray-800">
                        {employee?.nationalId ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-3">
                      <span className="text-gray-500">الرقم الوظيفي</span>
                      <span className="font-medium text-gray-800">
                        {employee?.employeeCode ?? '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Mail size={20} className="text-primary-600" />
                    معلومات التواصل
                  </h2>
                  <div className="space-y-4">
                    <div className="flex justify-between py-3 border-b border-gray-100">
                      <span className="text-gray-500">البريد الإلكتروني</span>
                      <span className="font-medium text-gray-800">
                        {employee?.email ?? user.email}
                      </span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-gray-100">
                      <span className="text-gray-500">رقم الجوال</span>
                      <span className="font-medium text-gray-800" dir="ltr">
                        {employee?.phone ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-gray-100">
                      <span className="text-gray-500">البنك</span>
                      <span className="font-medium text-gray-800">
                        {employee?.bankName ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-3">
                      <span className="text-gray-500">الآيبان</span>
                      <span className="font-medium text-gray-800" dir="ltr">
                        {employee?.iban ?? '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Briefcase size={20} className="text-primary-600" />
                    المعلومات الوظيفية
                  </h2>
                  <div className="space-y-4">
                    <div className="flex justify-between py-3 border-b border-gray-100">
                      <span className="text-gray-500">المسمى الوظيفي</span>
                      <span className="font-medium text-gray-800">
                        {employee?.jobTitle ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-gray-100">
                      <span className="text-gray-500">الفرع</span>
                      <span className="font-medium text-gray-800">
                        {branchName(employee?.branchId ?? user.branchId)}
                      </span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-gray-100">
                      <span className="text-gray-500">القسم</span>
                      <span className="font-medium text-gray-800">
                        {departmentName(employee?.departmentId)}
                      </span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-gray-100">
                      <span className="text-gray-500">الراتب الأساسي</span>
                      <span className="font-medium text-gray-800">
                        {employee?.basicSalary != null
                          ? `${Number(employee.basicSalary).toLocaleString('en-US')} ${employee.currency ? currencyLabel(employee.currency) : systemCurrency}`
                          : '—'}
                      </span>
                    </div>
                    {employee && <>
                      {/* بدل ضغط العمل (قرار المالك 26 سبتمبر): ظاهر للموظف في بيانات راتبه وداخل الإجمالي المصروف (من غير مؤثرات) */}
                      {([['بدل السكن', employee.housingAllowance], ['بدل النقل', employee.transportAllowance], ['بدل الهاتف', employee.phoneAllowance], ['بدل طبيعة العمل', employee.workNatureAllowance], ['بدلات أخرى', employee.otherAllowance], ['بدل ضغط العمل', employee.workPressureAllowance]] as const).map(([label, amount]) => <div key={label} className="flex justify-between py-3 border-b border-gray-100"><span className="text-gray-500">{label}</span><span>{Number(amount ?? 0).toLocaleString('en-US')} {employee.currency ? currencyLabel(employee.currency) : systemCurrency}</span></div>)}
                      <div className="flex justify-between py-3 font-bold"><span>إجمالي الراتب</span><span>{[employee.basicSalary, employee.housingAllowance, employee.transportAllowance, employee.phoneAllowance, employee.workNatureAllowance, employee.otherAllowance, employee.workPressureAllowance].reduce<number>((sum, amount) => sum + Number(amount ?? 0), 0).toLocaleString('en-US')} {employee.currency ? currencyLabel(employee.currency) : systemCurrency}</span></div>
                    </>}
                    <div className="flex justify-between py-3">
                      <span className="text-gray-500">طريقة الصرف</span>
                      <span className="font-medium text-gray-800">
                        {employee
                          ? payMethodLabels[employee.payMethod] ?? employee.payMethod
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Calendar size={20} className="text-primary-600" />
                    أرصدة الإجازات
                  </h2>
                  <div className="space-y-3">
                    {balances.length === 0 ? (
                      <p className="text-gray-500 text-sm">{sectionErrors['أرصدة الإجازات'] ? 'تعذر تحميل الأرصدة' : 'لا توجد أرصدة'}</p>
                    ) : (
                      balances.map((balance) => (
                        <div
                          key={`${balance.balanceType}-${balance.period}`}
                          className="p-3 bg-success-50 rounded-xl flex items-center gap-3"
                        >
                          <Calendar size={20} className="text-success-600" />
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">
                              {balanceTypeLabels[balance.balanceType] ?? balance.balanceType} —{' '}
                              {balance.period}
                            </p>
                            <p className="text-sm text-gray-500">
                              المتبقي {Number(balance.remaining)} من {Number(balance.entitled) + (balance.opening?.expired ? 0 : Number(balance.opening?.days ?? 0))}{' '}
                              يوم — المستهلك {Number(balance.totalTaken)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'leaves' && (
              <div className="card">
                <h2 className="text-lg font-bold text-gray-800 mb-6">آخر الإجازات</h2>
                {leaves.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    {fallbackNote ? 'بيانات الإجازات غير متاحة' : 'لا توجد إجازات مسجلة'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {leaves.slice(0, 8).map((leave) => (
                      <div
                        key={leave.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar size={20} className="text-gray-600" />
                          <div>
                            <p className="font-medium text-gray-800">
                              {leaveCatalog.label(leave.leaveType)} —{' '}
                              {Number(leave.days)} يوم
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(leave.fromDate)} - {formatDate(leave.toDate)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            requestStatusColors[leave.status] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {leaveStatusLabels[leave.status] ?? leave.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="grid grid-cols-2 gap-6">
                <div className="card">
                  <h2 className="text-lg font-bold text-gray-800 mb-6">آخر الطلبات</h2>
                  {requests.length === 0 ? (
                    <p className="text-gray-500 text-sm">{sectionErrors['الطلبات'] ? 'تعذر تحميل الطلبات' : 'لا توجد طلبات'}</p>
                  ) : (
                    <div className="space-y-3">
                      {requests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <FileText size={20} className="text-gray-600" />
                            <div>
                              <p className="font-medium text-gray-800">
                                {typeNames[request.typeCode] ?? `نوع طلب (${request.typeCode})`}{' '}
                                #{request.id}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatDate(request.createdAt)}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              requestStatusColors[request.status] ?? 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {requestStatusLabels[request.status] ?? request.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card">
                  <h2 className="text-lg font-bold text-gray-800 mb-6">العهدة</h2>
                  {custody.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      {fallbackNote ? 'بيانات العهدة غير متاحة' : 'لا توجد عهدة مسجلة'}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {custody.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <Package size={20} className="text-gray-600" />
                            <div>
                              <p className="font-medium text-gray-800">
                                {item.assetName ?? `أصل #${item.assetId}`}
                              </p>
                              <p className="text-sm text-gray-500">
                                {item.assetCategory ?? '—'} — أُسندت في{' '}
                                {formatDate(item.assignedAt)}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              custodyStatusStyles[item.status] ?? 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {custodyStatusLabels[item.status] ?? item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="card">
                <h2 className="text-lg font-bold text-gray-800 mb-6">المستندات الشخصية</h2>
                {documents.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    {fallbackNote ? 'بيانات المستندات غير متاحة' : 'لا توجد مستندات'}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <FileText size={32} className="text-primary-600 mb-2" />
                        <p className="font-medium text-gray-800">{docTypeLabel(doc.docType)}</p>
                        <p className="text-sm text-gray-500">
                          {doc.number ?? '—'}
                          {doc.expiryDate && ` — ينتهي ${formatDate(doc.expiryDate)}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  )
}
