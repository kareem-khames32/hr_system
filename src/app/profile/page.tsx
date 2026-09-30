'use client'

import { employeeStatusLabels as statusLabels, requestStatusLabels, requestStatusStyles as requestStatusColors, custodyStatusLabels, custodyStatusStyles, payMethodLabels } from '@/lib/status-labels'
import { useLeaveCatalog } from '@/lib/leave-catalog'
import { currencyLabel, useCurrency } from '@/lib/currency'
import { docTypeLabel } from '@/lib/doc-types'
import { orgPlacement, unitPathLabel } from '@/lib/department-tree'

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
  X,
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
  ApiError,
  type CurrentUser,
  type ApiEmployee,
  type ApiLeave,
  type ApiBalance,
  type ApiRequest,
  type ApiRequestType,
  type ApiCustody,
  type ApiDocument,
  type ApiBranch,
  type ApiDepartment,
} from '@/lib/api'
import {
  availableRequestType,
  BANK_CHANGE_REQUEST_LINK,
  BANK_CHANGE_REQUEST_TYPE,
  IDENTITY_HINT,
  normalizeIdentityNumber,
  pendingPersonalDataRequest,
  PERSONAL_DATA_FIELDS,
  PERSONAL_DATA_REQUEST_TYPE,
  PERSONAL_DATA_SECTIONS,
  PROFILE_PHOTO_TYPES,
  profileFormChanges,
  profileFormIssue,
  profileFormValues,
  profilePhotoIssue,
  submitPersonalDataRequest,
  uploadMyPhoto,
  type PersonalDataField,
  type ProfileFormValues,
} from '@/lib/profile-api'

import { DISPLAY_LOCALE, localToday } from '@/lib/dates'

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

// الجنسيات الشائعة في خانة الجنسية — نفس اقتراحات نموذج الموظف عند الموارد البشرية (والكتابة الحرة مسموحة)
const nationalitySuggestions = ['سعودي', 'مصري', 'أردني', 'سوري', 'أخرى']

// خانة واحدة في نموذج «تعديل الملف» حسب نوعها — القيمة المحفوظة اللي مش من الاختيارات بتفضل ظاهرة ومتختارة
function ProfileFieldInput({ field, value, current, onChange }: { field: PersonalDataField; value: string; current: string; onChange: (value: string) => void }) {
  const id = `profile-edit-${field.key}`
  if (field.kind === 'select') {
    const options = field.options ?? []
    return (
      <select id={id} className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">اختر</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        {current && !options.some((option) => option.value === current) && <option value={current}>{current}</option>}
      </select>
    )
  }
  const type = field.kind === 'date' ? 'date' : field.kind === 'phone' ? 'tel' : field.kind === 'email' ? 'email' : 'text'
  return (
    <>
      <input
        id={id}
        type={type}
        className="input"
        dir={field.ltr || field.kind === 'date' ? 'ltr' : undefined}
        maxLength={field.kind === 'date' ? undefined : field.max}
        autoComplete={field.kind === 'identity' ? 'off' : undefined}
        list={field.key === 'nationality' ? 'profile-edit-nationalities' : undefined}
        value={value}
        onChange={(event) => onChange(field.kind === 'identity' ? normalizeIdentityNumber(event.target.value) : event.target.value)}
      />
      {field.key === 'nationality' && (
        <datalist id="profile-edit-nationalities">{nationalitySuggestions.map((item) => <option key={item} value={item} />)}</datalist>
      )}
    </>
  )
}

// «تعديل الملف» (قرار المالك 30 سبتمبر): بياناتي الحالية في نموذج، والتعديل بيتبعت طلب «تحديث بيانات شخصية» بالخانات اللي اتغيرت بس —
// بيمشي في سلسلة اعتماده ويتطبق على الملف بعد الاعتماد. طلب لسه ماخلصش = بنعرضه بدل ما يتبعت طلب مكرر. البنك ليه طلبه الآمن.
function ProfileEditDialog({ employee, pending, personalType, bankType, typesError, requestsError, onClose, onSubmitted }: {
  employee: ApiEmployee
  pending: ApiRequest | null
  personalType: ApiRequestType | null
  bankType: ApiRequestType | null
  typesError: boolean
  // طلباتي ماتحمّلتش: مانقدرش نتأكد إن مفيش طلب تعديل لسه ماخلصش — مفيش إرسال لحد إعادة المحاولة
  requestsError: boolean
  onClose: () => void
  onSubmitted: (request: ApiRequest) => void
}) {
  const [initial] = useState<ProfileFormValues>(() => profileFormValues(employee))
  const [values, setValues] = useState<ProfileFormValues>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const changes = profileFormChanges(employee, values)
  const typeName = personalType?.nameAr ?? 'تحديث بيانات شخصية'
  const canSubmit = !pending && !requestsError && !!personalType

  const submit = async () => {
    setError('')
    if (!changes.length) {
      setError('ماغيرتش أي بيانات — عدّل خانة واحدة على الأقل وبعدين ابعت الطلب')
      return
    }
    const issue = profileFormIssue(employee, changes, localToday())
    if (issue) {
      setError(issue)
      return
    }
    setBusy(true)
    try {
      onSubmitted(await submitPersonalDataRequest(changes))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إرسال طلب التعديل — أعد المحاولة')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4" onClick={() => !busy && onClose()}>
      <div
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-edit-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id="profile-edit-title" className="font-bold text-gray-800 text-lg">تعديل بياناتي</h3>
            <p className="text-sm text-gray-500 mt-1">التعديل بيتبعت طلب «{typeName}» وبيتطبق على ملفك بعد اعتماده.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="إغلاق" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {pending ? (
            <div role="status" className="bg-warning-50 text-warning-700 rounded-xl p-4 text-sm leading-6">
              {pending.status === 'RETURNED_FOR_INFO'
                ? `طلب تعديل بياناتك رقم #${pending.id} راجع لك لاستكمال معلومات — صحّحه وابعته تاني بدل ما تبعت طلب جديد.`
                : `عندك طلب تعديل بيانات رقم #${pending.id} لسه ما خلصش (${requestStatusLabels[pending.status] ?? pending.status}) — استنى قراره قبل ما تبعت طلب جديد.`}{' '}
              <Link href="/requests" className="underline font-medium">تابعه من «الطلبات»</Link>
            </div>
          ) : requestsError ? (
            <div role="status" className="bg-warning-50 text-warning-700 rounded-xl p-4 text-sm">
              تعذر تحميل طلباتك، فمش هنقدر نتأكد إن مفيش طلب تعديل لسه ما خلصش — اقفل النافذة واضغط «إعادة المحاولة» فوق.
            </div>
          ) : !personalType ? (
            <div role="status" className="bg-warning-50 text-warning-700 rounded-xl p-4 text-sm">
              {typesError
                ? 'تعذر تحميل أنواع الطلبات — اقفل النافذة واضغط «إعادة المحاولة» فوق.'
                : 'طلب «تحديث بيانات شخصية» مش متاح لحسابك — كلّم الموارد البشرية لتعديل بياناتك.'}
            </div>
          ) : (
            PERSONAL_DATA_SECTIONS.map((section) => (
              <fieldset key={section.key}>
                <legend className="text-sm font-bold text-gray-700 mb-3">{section.label}</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PERSONAL_DATA_FIELDS.filter((field) => field.section === section.key).map((field) => (
                    <div key={field.key} className={`min-w-0 ${field.key === 'address' ? 'sm:col-span-2' : ''}`}>
                      <label className="label" htmlFor={`profile-edit-${field.key}`}>{field.label}{field.required ? ' *' : ''}</label>
                      <ProfileFieldInput
                        field={field}
                        value={values[field.key]}
                        current={initial[field.key]}
                        onChange={(value) => setValues((prev) => ({ ...prev, [field.key]: value }))}
                      />
                    </div>
                  ))}
                </div>
                {section.key === 'identity' && <p className="text-xs text-gray-500 mt-2">{IDENTITY_HINT}</p>}
              </fieldset>
            ))
          )}

          <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600 space-y-1">
            {bankType && (
              <p>
                البنك والآيبان مش من هنا — ليهم طلب آمن:{' '}
                <Link href={BANK_CHANGE_REQUEST_LINK} className="text-primary-600 underline font-medium">«{bankType.nameAr}»</Link>
              </p>
            )}
            <p>البيانات الوظيفية والراتب بتتعدل من الموارد البشرية.</p>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-100 space-y-3">
          {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm break-words">{error}</div>}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-500">
              {canSubmit ? (changes.length ? `هيتبعت تعديل ${changes.length} ${changes.length === 1 ? 'خانة' : 'خانات'}` : 'ماغيرتش حاجة لسه') : ''}
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button type="button" onClick={onClose} disabled={busy} className="px-6 py-2.5 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
                {canSubmit ? 'إلغاء' : 'إغلاق'}
              </button>
              {canSubmit && (
                <button type="button" onClick={submit} disabled={busy || !changes.length} className="btn-primary disabled:opacity-60">
                  {busy ? 'جارٍ الإرسال...' : 'إرسال طلب التعديل'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

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
  // الصورة الشخصية: كل موظف يغيّر صورته بنفسه من غير اعتماد (PUT /employees/me/photo — ملفه هو بس)
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  // «تعديل الملف»: كتالوج الطلبات المتاح لي، وطلب «تحديث بيانات شخصية» اللي لسه ماخلصش (بدل طلب مكرر)
  const [requestTypes, setRequestTypes] = useState<ApiRequestType[]>([])
  const [pendingPersonal, setPendingPersonal] = useState<ApiRequest | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [notice, setNotice] = useState<{ text: string; requestsLink?: boolean } | null>(null)

  useEffect(() => {
    setSectionErrors({})
    const sectionError = (section: string, err: unknown) => setSectionErrors((prev) => ({ ...prev, [section]: err instanceof Error ? err.message : 'تعذر التحميل' }))
    const currentUser = getCurrentUser()
    setUser(currentUser)
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
        setPendingPersonal(pendingPersonalDataRequest(myRequests))
        // الاسم العربي لنوع الطلب — الكود لا يظهر للمستخدم
        fetchRequestTypes()
          .then((ts) => {
            setTypeNames(Object.fromEntries(ts.map((t) => [t.code, t.nameAr])))
            setRequestTypes(ts)
          })
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

  // رفع صورة جديدة (صور بس، لحد 10 ميجا) ثم ربطها بملفي من غير اعتماد — العرض يُعاد تحميله من photoFileId
  const handlePhotoPick = async (file: File | null | undefined) => {
    if (!file || !employee) return
    setError('')
    setNotice(null)
    const issue = profilePhotoIssue(file)
    if (issue) {
      setError(issue)
      if (photoInputRef.current) photoInputRef.current.value = ''
      return
    }
    setPhotoUploading(true)
    try {
      const photoFileId = await uploadMyPhoto(file)
      setEmployee((prev) => (prev ? { ...prev, photoFileId } : prev))
      setNotice({ text: 'اتغيرت صورتك.' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحديث الصورة — أعد المحاولة')
    } finally {
      setPhotoUploading(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  // طلب «تحديث بيانات شخصية» اتبعت: اتطبق فورًا (سلسلة «تنفيذ فوري») = نعيد تحميل الملف، وإلا بيستنى الاعتماد
  const handlePersonalDataSubmitted = (created: ApiRequest) => {
    setEditOpen(false)
    setRequests((prev) => [created, ...prev.filter((request) => request.id !== created.id)].slice(0, 5))
    if (created.status === 'COMPLETED') {
      setPendingPersonal(null)
      setNotice({ text: `اتطبق تعديل بياناتك على ملفك (طلب رقم #${created.id}).`, requestsLink: true })
      setReloadRevision((value) => value + 1)
    } else {
      setPendingPersonal(created)
      setNotice({ text: `اتبعت طلب تعديل بياناتك رقم #${created.id} — التعديل هيتطبق على ملفك بعد اعتماده.`, requestsLink: true })
    }
  }
  const personalType = availableRequestType(requestTypes, PERSONAL_DATA_REQUEST_TYPE)
  const bankType = availableRequestType(requestTypes, BANK_CHANGE_REQUEST_TYPE)

  const branchName = (id?: number | null) =>
    branches.find((b) => b.id === id)?.name ?? '—'
  const departmentName = (id?: number | null) =>
    departments.find((d) => d.id === id)?.name ?? '—'
  // «الإدارة ← القسم ← الفريق» (قرار المالك 27 سبتمبر): أقرب إدارة فوق قسمي — الإدارة التنفيذية في فرع برّه نطاقي باسمها العام
  const placement = orgPlacement(employee?.departmentId, departments)
  const administrationName = placement.administrationName ?? '—'

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
      <div className="space-y-6 min-w-0">
        {leaveCatalog.error && <div role="alert" className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">تعذر تحميل أنواع الإجازات: {leaveCatalog.error} <button type="button" className="underline" onClick={leaveCatalog.retry}>إعادة المحاولة</button></div>}
        {/* Error Banner */}
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4 break-words">{error}</div>}
        {notice && (
          <div role="status" className="bg-success-50 text-success-700 rounded-xl p-4 break-words">
            {notice.text}{' '}
            {notice.requestsLink && <Link href="/requests" className="underline font-medium">تابع طلباتك من «الطلبات»</Link>}
          </div>
        )}
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

            {/* Profile Header — على الموبايل الصورة فوق والبيانات تحتها، والكروت الأربعة في صفين */}
            <div className="card">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                <div className="relative shrink-0">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl flex items-center justify-center text-white text-4xl sm:text-5xl font-bold shadow-xl overflow-hidden">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      avatarChar
                    )}
                  </div>
                  {/* الصورة الشخصية: أي موظف يغيّرها لنفسه من غير اعتماد (صور بس لحد 10 ميجا) */}
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={!employee || photoUploading}
                    aria-label="تغيير الصورة الشخصية"
                    title="تغيير الصورة الشخصية"
                    className="absolute -bottom-2 -left-2 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-60"
                  >
                    {photoUploading ? (
                      <span className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera size={18} className="text-gray-600" />
                    )}
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept={PROFILE_PHOTO_TYPES.join(',')}
                    className="hidden"
                    aria-hidden="true"
                    tabIndex={-1}
                    onChange={(event) => handlePhotoPick(event.target.files?.[0])}
                  />
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0 text-center sm:text-start">
                      <h1 className="text-xl sm:text-2xl font-bold text-gray-800 break-words">{displayName}</h1>
                      <p className="text-primary-600 font-medium break-words">
                        {employee?.jobTitle ?? '—'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1 min-w-0 break-words">
                          <Building2 size={14} className="shrink-0" />
                          {unitPathLabel(employee?.departmentId, departments) || departmentName(employee?.departmentId)}
                        </span>
                        <span className="flex items-center gap-1 min-w-0 break-words">
                          <MapPin size={14} className="shrink-0" />
                          {branchName(employee?.branchId ?? user.branchId)}
                        </span>
                      </div>
                    </div>
                    {/* «تعديل الملف»: بياناتي في نموذج، والتعديل طلب «تحديث بيانات شخصية» بيتطبق بعد الاعتماد */}
                    <button
                      type="button"
                      onClick={() => { setNotice(null); setEditOpen(true) }}
                      disabled={!employee}
                      className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto shrink-0 disabled:opacity-60"
                    >
                      <Edit2 size={18} />
                      تعديل الملف
                    </button>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
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

            {/* Tabs — على الشاشة الضيقة بتتمرر بالعرض جوه شريطها، والصفحة نفسها مابتتمررش بالعرض */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors shrink-0 whitespace-nowrap ${
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <User size={20} className="text-primary-600" />
                    البيانات الشخصية
                  </h2>
                  <div className="space-y-4">
                    <div className="flex justify-between gap-3 py-3 border-b border-gray-100">
                      <span className="text-gray-500">الاسم الكامل</span>
                      <span className="font-medium text-gray-800 min-w-0 break-words">{displayName}</span>
                    </div>
                    <div className="flex justify-between gap-3 py-3 border-b border-gray-100">
                      <span className="text-gray-500">الاسم بالإنجليزية</span>
                      <span className="font-medium text-gray-800 min-w-0 break-words">
                        {employee?.fullNameEn ?? '—'}
                      </span>
                    </div>
                    {/* رقم الهوية أو الجواز (قرار المالك 28 سبتمبر: واحد منهم يكفي) — اللي موجود فيهم */}
                    <div className="flex justify-between gap-3 py-3 border-b border-gray-100">
                      <span className="text-gray-500">{!employee?.nationalId && employee?.passportNo ? 'رقم جواز السفر' : 'رقم الهوية / الإقامة'}</span>
                      <span className="font-medium text-gray-800 min-w-0 break-all" dir="ltr">
                        {employee?.nationalId || employee?.passportNo || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 py-3">
                      <span className="text-gray-500">الرقم الوظيفي</span>
                      <span className="font-medium text-gray-800 min-w-0 break-words">
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
                    <div className="flex justify-between gap-3 py-3 border-b border-gray-100">
                      <span className="text-gray-500">البريد الإلكتروني</span>
                      <span className="font-medium text-gray-800 min-w-0 break-words">
                        {employee?.email ?? user.email}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 py-3 border-b border-gray-100">
                      <span className="text-gray-500">رقم الجوال</span>
                      <span className="font-medium text-gray-800 min-w-0 break-all" dir="ltr">
                        {employee?.phone ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 py-3 border-b border-gray-100">
                      <span className="text-gray-500">البنك</span>
                      <span className="font-medium text-gray-800 min-w-0 break-words">
                        {employee?.bankName ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 py-3">
                      <span className="text-gray-500">الآيبان</span>
                      <span className="font-medium text-gray-800 min-w-0 break-all" dir="ltr">
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
                    <div className="flex justify-between gap-3 py-3 border-b border-gray-100">
                      <span className="text-gray-500">المسمى الوظيفي</span>
                      <span className="font-medium text-gray-800 min-w-0 break-words">
                        {employee?.jobTitle ?? '—'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 py-3 border-b border-gray-100">
                      <span className="text-gray-500">الفرع</span>
                      <span className="font-medium text-gray-800 min-w-0 break-words">
                        {branchName(employee?.branchId ?? user.branchId)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 py-3 border-b border-gray-100">
                      <span className="text-gray-500">الإدارة</span>
                      <span className="font-medium text-gray-800 min-w-0 break-words">{administrationName}</span>
                    </div>
                    <div className="flex justify-between gap-3 py-3 border-b border-gray-100">
                      <span className="text-gray-500">القسم</span>
                      <span className="font-medium text-gray-800 min-w-0 break-words">
                        {placement.departments.length
                          ? placement.departments.map((d) => d.name).join(' ← ')
                          : placement.administration ? '—' : departmentName(employee?.departmentId)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 py-3 border-b border-gray-100">
                      <span className="text-gray-500">الراتب الأساسي</span>
                      <span className="font-medium text-gray-800 min-w-0 break-words">
                        {employee?.basicSalary != null
                          ? `${Number(employee.basicSalary).toLocaleString('en-US')} ${employee.currency ? currencyLabel(employee.currency) : systemCurrency}`
                          : '—'}
                      </span>
                    </div>
                    {employee && <>
                      {/* بدل ضغط العمل (قرار المالك 26 سبتمبر): ظاهر للموظف في بيانات راتبه وداخل الإجمالي المصروف (من غير مؤثرات) */}
                      {([['بدل السكن', employee.housingAllowance], ['بدل النقل', employee.transportAllowance], ['بدل الهاتف', employee.phoneAllowance], ['بدل طبيعة العمل', employee.workNatureAllowance], ['بدلات أخرى', employee.otherAllowance], ['بدل ضغط العمل', employee.workPressureAllowance]] as const).map(([label, amount]) => <div key={label} className="flex justify-between gap-3 py-3 border-b border-gray-100"><span className="text-gray-500">{label}</span><span>{Number(amount ?? 0).toLocaleString('en-US')} {employee.currency ? currencyLabel(employee.currency) : systemCurrency}</span></div>)}
                      <div className="flex justify-between py-3 font-bold"><span>إجمالي الراتب</span><span>{[employee.basicSalary, employee.housingAllowance, employee.transportAllowance, employee.phoneAllowance, employee.workNatureAllowance, employee.otherAllowance, employee.workPressureAllowance].reduce<number>((sum, amount) => sum + Number(amount ?? 0), 0).toLocaleString('en-US')} {employee.currency ? currencyLabel(employee.currency) : systemCurrency}</span></div>
                    </>}
                    <div className="flex justify-between gap-3 py-3">
                      <span className="text-gray-500">طريقة الصرف</span>
                      <span className="font-medium text-gray-800 min-w-0 break-words">
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
                        className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-xl"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Calendar size={20} className="text-gray-600 shrink-0" />
                          <div className="min-w-0">
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
                          className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium ${
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h2 className="text-lg font-bold text-gray-800 mb-6">آخر الطلبات</h2>
                  {requests.length === 0 ? (
                    <p className="text-gray-500 text-sm">{sectionErrors['الطلبات'] ? 'تعذر تحميل الطلبات' : 'لا توجد طلبات'}</p>
                  ) : (
                    <div className="space-y-3">
                      {requests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-xl"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText size={20} className="text-gray-600 shrink-0" />
                            <div className="min-w-0">
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
                            className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium ${
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
                          className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-xl"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Package size={20} className="text-gray-600 shrink-0" />
                            <div className="min-w-0">
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
                            className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium ${
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer min-w-0 break-words"
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
        {editOpen && employee && (
          <ProfileEditDialog
            employee={employee}
            pending={pendingPersonal}
            personalType={personalType}
            bankType={bankType}
            typesError={!!sectionErrors['أنواع الطلبات']}
            requestsError={!!sectionErrors['الطلبات']}
            onClose={() => setEditOpen(false)}
            onSubmitted={handlePersonalDataSubmitted}
          />
        )}
      </div>
    </MainLayout>
  )
}
