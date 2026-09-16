'use client'

import { useLeaveCatalog } from '@/lib/leave-catalog'
import { definitionCodeOf, isLeaveRequest, leaveCodeOf } from '../../../../api/src/common/leave-contract'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  Calendar,
  ClipboardList,
  Layers,
  Paperclip,
  Plus,
  Stethoscope,
  Upload,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import {
  statusLabels,
  statusStyles,
  type RequestStatus,
} from '@/data/requestsCatalog'
import {
  attachLeaveFile,
  cancelRequest,
  createRequest,
  fetchMyApprovedLeaves,
  fetchMyBalances,
  fetchMyRequests,
  fetchRequestTypes,
  uploadFile,
  type ApiBalance,
  type ApiLeave,
  type ApiRequest,
  type ApiRequestType,
} from '@/lib/api'

// أنواع الأرصدة كما يرجعها السيرفر
const balanceTypeConfig: Record<
  string,
  { label: string; icon: typeof Calendar; iconBg: string; iconColor: string }
> = {
  annual: { label: 'السنوية', icon: Calendar, iconBg: 'bg-primary-50', iconColor: 'text-primary-500' },
  sick: { label: 'المرضية', icon: Stethoscope, iconBg: 'bg-blue-50', iconColor: 'text-blue-500' },
  casual: { label: 'الطارئة', icon: Zap, iconBg: 'bg-warning-50', iconColor: 'text-warning-500' },
  unpaid: { label: 'بدون راتب', icon: Wallet, iconBg: 'bg-gray-100', iconColor: 'text-gray-500' },
}

// أكواد أنواع الإجازة → عربي — طلب الإجازة الموحّد (LEAVE) يحمل النوع في الـ payload

const parseJson = <T,>(raw: string | null | undefined, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// نوع «إلغاء إجازة» — يلغي إجازة معتمدة ويرجّع رصيدها بعد الاعتماد
const CANCEL_TYPE = 'LEAVE_MODIFY_CANCEL'
// حالات يقدر صاحب الطلب يسحبه فيها قبل البت (نفس آلة الحالات في الباك)
const WITHDRAWABLE = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'RETURNED_FOR_INFO']
// طلب إلغاء لسه حي على الإجازة — مايتقدّمش طلب تاني لنفس الإجازة (LEV-7)
const LIVE_CANCEL = [...WITHDRAWABLE, 'APPROVED', 'IN_EXECUTION']

export default function MyLeavesPage() {
  const leaveCatalog = useLeaveCatalog()
  const leaveTypeLabels = leaveCatalog.labels
  const [balances, setBalances] = useState<ApiBalance[]>([])
  const [leaveRequests, setLeaveRequests] = useState<ApiRequest[]>([])
  const [types, setTypes] = useState<ApiRequestType[]>([])
  // إجازاتي المعتمدة (بطلبها الأصل) — مصدر زرار «طلب إلغاء»
  const [approvedLeaves, setApprovedLeaves] = useState<ApiLeave[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  // طلب إلغاء إجازة معتمدة: الإجازة المختارة + سبب اختياري
  const [cancelTarget, setCancelTarget] = useState<ApiLeave | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [submittingCancel, setSubmittingCancel] = useState(false)
  // رفع مرفق «بعد الرجوع» لإجازة معتمدة تنتظره
  const [uploadingId, setUploadingId] = useState<number | null>(null)

  const load = async () => {
    try {
      const [bals, mine, typeList, approved] = await Promise.all([
        fetchMyBalances(),
        fetchMyRequests(),
        fetchRequestTypes(),
        fetchMyApprovedLeaves(),
      ])
      setBalances(bals)
      // طلبات الإجازة فقط من طلباتي — النوع الموحّد LEAVE + الأنواع القديمة LEAVE_*
      setLeaveRequests(
        mine.filter((r) => isLeaveRequest(r) || r.typeCode === CANCEL_TYPE)
      )
      setTypes(typeList)
      setApprovedLeaves(approved)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل أرصدتك')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const typeNameOf = (code: string) =>
    types.find((t) => t.code === code)?.nameAr ?? 'إجازة'

  // الإجازة المعتمدة لكل طلب إجازة (Leave.requestId)، وبرقمها لطلبات الإلغاء
  const approvedByRequest = new Map<number, ApiLeave>()
  const approvedById = new Map<number, ApiLeave>()
  for (const l of approvedLeaves) {
    if (l.requestId != null) approvedByRequest.set(l.requestId, l)
    approvedById.set(l.id, l)
  }
  // إجازات عليها طلب إلغاء حي — الباك يرفض طلب إلغاء تاني لنفس الإجازة
  const cancelPendingFor = new Set(
    leaveRequests
      .filter((r) => r.typeCode === CANCEL_TYPE && LIVE_CANCEL.includes(r.status))
      .map((r) => Number(parseJson<Record<string, unknown>>(r.payload, {}).leaveId))
  )
  // النوع متاح لي (مفعّل وجمهوره يشملني) — الكتالوج مفلتر بالسيرفر
  const canRequestCancel = types.some((t) => t.code === CANCEL_TYPE)

  // سحب طلب إجازة لسه مابتّش فيه (مسودة/مقدَّم/قيد المراجعة/مُرجَع) — يخرج من صندوق المعتمدين
  const withdraw = async (r: ApiRequest) => {
    if (!confirm('سحب الطلب؟ لن يظهر للمعتمدين بعد السحب.')) return
    setError('')
    setNotice('')
    setBusyId(r.id)
    try {
      await cancelRequest(r.id)
      setNotice(`تم سحب الطلب REQ-${r.id}`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر سحب الطلب')
    } finally {
      setBusyId(null)
    }
  }

  // مرفق «بعد الرجوع»: رفع الملف بآلية الملفات نفسها ثم ربط مرجعه بالإجازة — قبل الموعد وإلا تتحول أيامها بدون راتب
  const awaitingAttachment = approvedLeaves.filter((l) => l.attachmentStatus === 'PENDING')
  const missedAttachment = approvedLeaves.filter((l) => l.attachmentStatus === 'MISSED')
  const attachFor = async (leave: ApiLeave, file: File | undefined) => {
    if (!file) return
    setError('')
    setNotice('')
    setUploadingId(leave.id)
    try {
      const uploaded = await uploadFile(file, { entityType: 'leave_attachment', entityId: leave.id })
      await attachLeaveFile(leave.id, uploaded.ref)
      setNotice('تم رفع مرفق الإجازة — أيامها محسوبة بأجرها')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر رفع المرفق')
    } finally {
      setUploadingId(null)
    }
  }

  const openCancel = (leave: ApiLeave) => {
    setCancelTarget(leave)
    setCancelReason('')
    setCancelError('')
  }

  // طلب إلغاء إجازة معتمدة (LEAVE_MODIFY_CANCEL) — يمر على سلسلة اعتماده، والرصيد
  // يرجع والإجازة تتلغي بعد الاعتماد النهائي
  const submitCancel = async () => {
    if (!cancelTarget) return
    setCancelError('')
    setNotice('')
    setSubmittingCancel(true)
    try {
      const payload: Record<string, unknown> = { leaveId: cancelTarget.id }
      if (cancelReason.trim()) payload.reason = cancelReason.trim()
      await createRequest(CANCEL_TYPE, payload, true)
      setCancelTarget(null)
      setNotice('تم تقديم طلب إلغاء الإجازة — يرجع رصيدها بعد الاعتماد')
      await load()
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'تعذّر تقديم طلب الإلغاء')
    } finally {
      setSubmittingCancel(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {leaveCatalog.error && <div role="alert" className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">تعذر تحميل أنواع الإجازات: {leaveCatalog.error} <button type="button" className="underline" onClick={leaveCatalog.retry}>إعادة المحاولة</button></div>}
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إجازاتي وأرصدتي</h1>
            <p className="text-gray-500 mt-1">
              رصيدك بطبقاته: المُرحّل بصلاحيته + استحقاق السنة − المستهلك (محسوب من السيرفر)
            </p>
          </div>
          <Link href="/leaves/request" className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            طلب إجازة
          </Link>
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {notice && (
          <div className="bg-green-50 text-green-700 rounded-xl p-4 flex items-center gap-2">
            <span className="flex-1">{notice}</span>
            <button onClick={() => setNotice('')} className="p-1 hover:bg-green-100 rounded-lg">
              <X size={16} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Balance layer cards */}
            <div className="grid grid-cols-2 gap-4">
              {balances.length === 0 && (
                <div className="card p-8 text-center col-span-2">
                  <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">لا توجد أرصدة إجازات لحسابك</p>
                </div>
              )}
              {balances.map((b) => {
                const cfg =
                  balanceTypeConfig[b.balanceType.toLowerCase()] ?? {
                    label: b.balanceType,
                    icon: Calendar,
                    iconBg: 'bg-gray-100',
                    iconColor: 'text-gray-500',
                  }
                const TypeIcon = cfg.icon
                const remaining = Number(b.remaining)
                const openingAvailable = Number(b.opening.available)
                const hasOpening = Number(b.opening.days) > 0
                return (
                  <div key={b.balanceType} className="card">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 ${cfg.iconBg} rounded-2xl flex items-center justify-center`}>
                          <TypeIcon size={24} className={cfg.iconColor} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">إجازة {cfg.label}</h3>
                          <p className="text-xs text-gray-400">فترة {b.period}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={`text-3xl font-bold ${remaining < 5 ? 'text-red-600' : 'text-success-600'}`}>
                          {remaining}
                        </p>
                        <p className="text-xs text-gray-400">يوم متبقٍ</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 bg-blue-50 rounded-xl">
                        <p className="text-lg font-bold text-blue-700">{Number(b.annualEntitlement ?? b.entitled)}</p>
                        <p className="text-xs text-blue-600">استحقاق السنة</p>
                        {b.accruedToDate != null && Number(b.accruedToDate) !== Number(b.annualEntitlement) && (
                          <p className="text-[10px] text-blue-500 mt-0.5">
                            المتراكم حتى اليوم {Number(b.accruedToDate)}
                          </p>
                        )}
                      </div>
                      <div className="p-3 bg-red-50 rounded-xl">
                        <p className="text-lg font-bold text-red-700">{Number(b.totalTaken)}</p>
                        <p className="text-xs text-red-600">مستهلك</p>
                      </div>
                      <div className="p-3 bg-success-50 rounded-xl">
                        <p className="text-lg font-bold text-success-700">{remaining}</p>
                        <p className="text-xs text-success-600">متبقٍ</p>
                      </div>
                    </div>

                    {/* طبقة الرصيد المُرحّل وصلاحيتها */}
                    {hasOpening && (
                      <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center gap-3">
                        <Layers size={18} className="text-purple-500 shrink-0" />
                        <div className="text-xs text-purple-700">
                          <span className="font-bold">
                            طبقة مُرحّلة: {openingAvailable} يوم ساري
                          </span>{' '}
                          (أصلها {Number(b.opening.days)} − استهلك {Number(b.opening.taken)})
                          {' — '}
                          {b.opening.expired ? (
                            <span className="text-red-600 font-medium">سقطت بانتهاء صلاحيتها</span>
                          ) : b.opening.expiry ? (
                            <span>صالحة حتى {b.opening.expiry}</span>
                          ) : (
                            <span>بدون تاريخ انتهاء</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* إجازات تنتظر مرفقًا بعد الرجوع (تقرير طبي…) — بموعدها */}
            {(awaitingAttachment.length > 0 || missedAttachment.length > 0) && (
              <div className="card border border-warning-200">
                <div className="flex items-center gap-2 mb-3">
                  <Paperclip size={18} className="text-warning-600" />
                  <h2 className="font-bold text-gray-800">مرفقات الإجازات بعد الرجوع</h2>
                </div>
                <div className="space-y-2">
                  {awaitingAttachment.map((l) => (
                    <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-warning-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{leaveTypeLabels[l.leaveType] ?? l.leaveType}</p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          من <span dir="ltr">{String(l.fromDate).slice(0, 10)}</span> إلى <span dir="ltr">{String(l.toDate).slice(0, 10)}</span>
                          {' — '}ارفع المرفق حتى <span dir="ltr" className="font-bold">{String(l.attachmentDueDate ?? '').slice(0, 10)}</span>
                          {' '}وإلا تتحول أيامها بدون راتب
                        </p>
                      </div>
                      <label className={`btn-primary text-xs flex items-center gap-1.5 ${uploadingId !== null ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
                        <Upload size={14} />
                        {uploadingId === l.id ? 'جارٍ الرفع...' : 'إرفاق المستند'}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          disabled={uploadingId !== null}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            e.target.value = ''
                            void attachFor(l, file)
                          }}
                        />
                      </label>
                    </div>
                  ))}
                  {missedAttachment.map((l) => (
                    <div key={l.id} className="p-3 bg-red-50 rounded-xl text-xs text-red-700">
                      {leaveTypeLabels[l.leaveType] ?? l.leaveType} (<span dir="ltr">{String(l.fromDate).slice(0, 10)}</span> إلى{' '}
                      <span dir="ltr">{String(l.toDate).slice(0, 10)}</span>): لم يُرفع المرفق حتى{' '}
                      <span dir="ltr">{String(l.attachmentDueDate ?? '').slice(0, 10)}</span> — تحولت أيامها بدون راتب
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* My leave requests */}
            <div className="card overflow-hidden p-0">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-800">طلبات إجازاتي</h2>
                <span className="text-sm text-gray-400">{leaveRequests.length} طلب</span>
              </div>
              {leaveRequests.length === 0 ? (
                <div className="p-12 text-center">
                  <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">لم تقدّم طلبات إجازة بعد</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="table-header">
                        <th className="text-right px-4 py-3">النوع</th>
                        <th className="text-center px-4 py-3">من</th>
                        <th className="text-center px-4 py-3">إلى</th>
                        <th className="text-center px-4 py-3">الأيام</th>
                        <th className="text-center px-4 py-3">تاريخ التقديم</th>
                        <th className="text-center px-4 py-3">الحالة</th>
                        <th className="text-center px-4 py-3">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRequests.map((r) => {
                        const payload = parseJson<Record<string, unknown>>(r.payload, {})
                        const status = r.status as RequestStatus
                        // النوع الموحّد يحمل نوع الإجازة في الـ payload — نعرضه بدل الاسم العام
                        const leaveCode = leaveCodeOf(payload, definitionCodeOf(r))
                        const typeName =
                          leaveTypeLabels[leaveCode] ?? typeNameOf(r.typeCode)
                        const isCancelReq = r.typeCode === CANCEL_TYPE
                        // طلب الإلغاء بيحمل رقم الإجازة بس — مداها من الإجازة طول ما هي معتمدة
                        const target = isCancelReq
                          ? approvedById.get(Number(payload.leaveId))
                          : undefined
                        // إجازة هذا الطلب لو معتمدة حالياً — مصدر «طلب إلغاء»
                        const approvedLeave = isCancelReq ? undefined : approvedByRequest.get(r.id)
                        const fromDate = payload.fromDate ?? target?.fromDate
                        const toDate = payload.toDate ?? target?.toDate
                        const days = payload.days ?? (target ? Number(target.days) : undefined)
                        return (
                          <tr key={r.id} className="table-row">
                            <td className="table-cell">
                              <p className="font-medium text-gray-800 text-sm">
                                {typeName}
                                {target && (
                                  <span className="text-xs font-normal text-gray-500">
                                    {' '}— {leaveTypeLabels[target.leaveType] ?? target.leaveType}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-400" dir="ltr">
                                REQ-{r.id}
                              </p>
                            </td>
                            <td className="table-cell text-center font-mono text-sm text-gray-600" dir="ltr">
                              {fromDate != null ? String(fromDate).slice(0, 10) : '—'}
                            </td>
                            <td className="table-cell text-center font-mono text-sm text-gray-600" dir="ltr">
                              {toDate != null ? String(toDate).slice(0, 10) : '—'}
                            </td>
                            <td className="table-cell text-center font-bold text-gray-700">
                              {days != null ? String(days) : '—'}
                            </td>
                            <td className="table-cell text-center text-sm text-gray-500" dir="ltr">
                              {(r.submittedAt ?? r.createdAt).slice(0, 10)}
                            </td>
                            <td className="table-cell text-center">
                              <span className={`badge text-xs ${statusStyles[status] ?? 'bg-gray-100 text-gray-600'}`}>
                                {statusLabels[status] ?? r.status}
                              </span>
                            </td>
                            {/* سحب المعلّق قبل البت، وطلب إلغاء المعتمد عبر «إلغاء إجازة» */}
                            <td className="table-cell text-center">
                              {WITHDRAWABLE.includes(r.status) ? (
                                <button
                                  onClick={() => withdraw(r)}
                                  disabled={busyId === r.id}
                                  className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                >
                                  {busyId === r.id ? 'جارٍ السحب...' : 'سحب'}
                                </button>
                              ) : approvedLeave && cancelPendingFor.has(approvedLeave.id) ? (
                                <span className="text-xs text-warning-600">طلب إلغائها قيد المعالجة</span>
                              ) : approvedLeave && canRequestCancel ? (
                                <button
                                  onClick={() => openCancel(approvedLeave)}
                                  className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                >
                                  طلب إلغاء
                                </button>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* طلب إلغاء إجازة معتمدة (LEAVE_MODIFY_CANCEL) */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-lg">طلب إلغاء إجازة</h3>
              <button
                onClick={() => setCancelTarget(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {cancelError && (
              <div className="bg-red-50 text-red-700 rounded-xl p-3 mb-4 text-sm">{cancelError}</div>
            )}

            <div className="p-3 bg-gray-50 rounded-xl mb-4">
              <p className="text-sm font-medium text-gray-800">
                {leaveTypeLabels[cancelTarget.leaveType] ?? cancelTarget.leaveType}
                {(cancelTarget.period === 'MORNING' || cancelTarget.period === 'EVENING') && (
                  <span className="mr-2 badge text-[10px] bg-amber-50 text-amber-700">نصف يوم</span>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                من {String(cancelTarget.fromDate).slice(0, 10)} إلى{' '}
                {String(cancelTarget.toDate).slice(0, 10)} • {Number(cancelTarget.days)} يوم
              </p>
            </div>

            <label className="label">سبب الإلغاء (اختياري)</label>
            <input
              type="text"
              className="input w-full"
              placeholder="مثال: تأجّل السفر ولن أستخدم الإجازة"
              value={cancelReason}
              maxLength={300}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-2">
              الطلب يمر على سلسلة اعتماد «إلغاء إجازة»، والإجازة تتلغي ورصيدها يرجع بعد الاعتماد النهائي.
            </p>

            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={submitCancel}
                disabled={submittingCancel}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingCancel ? 'جارٍ الإرسال...' : 'تقديم طلب الإلغاء'}
              </button>
              <button onClick={() => setCancelTarget(null)} className="btn-secondary">
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
