'use client'
import { useParams } from 'next/navigation'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  Monitor,
  Wallet,
  Users,
  UserCheck,
  Plus,
  Pencil,
  X,
  Lock,
  FileCheck2,
  UserMinus,
  ExternalLink,
  Trash2,
  RefreshCcw,
  Undo2,
} from 'lucide-react'
import {
  fetchOffboardingCase,
  completeClearanceItem,
  addSettlementLine,
  updateSettlementLine,
  deleteSettlementLine,
  recalcSettlementLines,
  approveSettlement,
  withdrawOffboarding,
  can,
  getCurrentUser,
  type ApiOffboardingCase,
  type ApiClearanceItem,
  type ApiSettlementLine,
} from '@/lib/api'
import { useCurrency } from '@/lib/currency'

// حالات الملف
const statusLabels: Record<string, string> = {
  IN_CLEARANCE: 'إخلاء طرف جارٍ',
  IN_SETTLEMENT: 'تصفية قيد المراجعة',
  SETTLED: 'معتمدة بانتظار آخر يوم',
  CLOSED: 'منتهية',
  CANCELLED: 'ملف ملغى',
}

const statusStyles: Record<string, string> = {
  IN_CLEARANCE: 'bg-warning-50 text-warning-600',
  IN_SETTLEMENT: 'bg-blue-100 text-blue-700',
  SETTLED: 'bg-indigo-100 text-indigo-700',
  CLOSED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

// أطراف إخلاء الطرف الخمسة — التسميات العربية وأيقوناتها
const partyConfig: Record<string, { label: string; icon: typeof UserCheck }> = {
  manager: { label: 'المدير المباشر', icon: UserCheck },
  custody: { label: 'العهدة والأصول', icon: Package },
  it: { label: 'تقنية المعلومات', icon: Monitor },
  finance: { label: 'المالية', icon: Wallet },
  hr: { label: 'الموارد البشرية', icon: Users },
}

const fmtDate = (v?: string | null) => (v ? String(v).slice(0, 10) : '—')

export default function OffboardingCasePage() {
  const params = useParams<{ id: string }>()
  const caseId = Number(params.id)
  const currency = useCurrency()
  const [det, setDet] = useState<ApiOffboardingCase | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // أخطاء الإجراءات (حارس العهدة/الطرف الخطأ) تُعرض نصاً كما وردت من الباك
  const [actionError, setActionError] = useState('')
  const [saving, setSaving] = useState(false)

  // مودال إتمام بند إخلاء طرف
  const [completeModal, setCompleteModal] = useState<ApiClearanceItem | null>(null)
  const [completeForm, setCompleteForm] = useState({ note: '', amount: '' })

  // مودالات بنود التصفية
  const [addLineModal, setAddLineModal] = useState(false)
  const [addLineForm, setAddLineForm] = useState({
    label: '',
    type: 'DEBIT' as 'CREDIT' | 'DEBIT',
    amount: '',
  })
  const [editLineModal, setEditLineModal] = useState<ApiSettlementLine | null>(null)
  const [editLineForm, setEditLineForm] = useState({ label: '', amount: '' })

  const load = async () => {
    try {
      setDet(await fetchOffboardingCase(caseId))
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل ملف إنهاء الخدمة')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (Number.isFinite(caseId)) load()
    else {
      setError('رقم الملف غير صالح')
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId])

  const items = det?.items ?? []
  const lines = det?.lines ?? []
  const doneCount = items.filter((i) => i.status === 'DONE').length
  const showSettlement =
    det && ['IN_SETTLEMENT', 'SETTLED', 'CLOSED'].includes(det.status)
  // البنود قابلة للتعديل فقط أثناء المراجعة — بعد الاعتماد كل شيء للقراءة
  const editable = det?.status === 'IN_SETTLEMENT'

  const handleCompleteItem = async () => {
    if (!completeModal || saving) return
    setSaving(true)
    setActionError('')
    try {
      await completeClearanceItem(completeModal.id, {
        note: completeForm.note || undefined,
        amount: completeForm.amount ? Number(completeForm.amount) : undefined,
      })
      setCompleteModal(null)
      setCompleteForm({ note: '', amount: '' })
      await load()
    } catch (err) {
      // رسالة الباك حرفياً — مثل «الموظف لا يزال ماسكاً N عهدة»
      setActionError(err instanceof Error ? err.message : 'تعذر إتمام البند')
    } finally {
      setSaving(false)
    }
  }

  const handleAddLine = async () => {
    if (!det || saving || !addLineForm.label || !addLineForm.amount) return
    setSaving(true)
    setActionError('')
    try {
      await addSettlementLine(det.id, {
        label: addLineForm.label,
        type: addLineForm.type,
        amount: Number(addLineForm.amount),
      })
      setAddLineModal(false)
      setAddLineForm({ label: '', type: 'DEBIT', amount: '' })
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'تعذر إضافة البند')
    } finally {
      setSaving(false)
    }
  }

  const handleEditLine = async () => {
    if (!editLineModal || saving) return
    setSaving(true)
    setActionError('')
    try {
      await updateSettlementLine(editLineModal.id, {
        label: editLineForm.label || undefined,
        amount: editLineForm.amount ? Number(editLineForm.amount) : undefined,
      })
      setEditLineModal(null)
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'تعذر تعديل البند')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLine = async (line: ApiSettlementLine) => {
    if (saving) return
    if (
      !window.confirm(
        `حذف البند «${line.label}»؟ البند التلقائي يرجع بإعادة التوليد`
      )
    )
      return
    setSaving(true)
    setActionError('')
    try {
      await deleteSettlementLine(line.id)
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'تعذر حذف البند')
    } finally {
      setSaving(false)
    }
  }

  const handleRecalc = async () => {
    if (!det || saving) return
    if (
      !window.confirm(
        'هيرجّع البنود التلقائية لأرقام النظام الحالية ويلغي أي تعديل عليها — البنود اليدوية لن تُمس'
      )
    )
      return
    setSaving(true)
    setActionError('')
    try {
      await recalcSettlementLines(det.id)
      await load()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'تعذر إعادة توليد البنود التلقائية'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleWithdraw = async () => {
    if (!det || saving) return
    if (!window.confirm('الموظف هيرجع نشطاً والملف هيتلغى — متأكد؟')) return
    setSaving(true)
    setActionError('')
    try {
      await withdrawOffboarding(det.id)
      await load()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'تعذر إلغاء ملف إنهاء الخدمة'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async () => {
    if (!det || saving) return
    if (
      !window.confirm(
        'اعتماد التصفية وقفلها؟ بعد الاعتماد تُقفل البنود نهائياً ويصدر سند التصفية وشهادة إخلاء الطرف.'
      )
    )
      return
    setSaving(true)
    setActionError('')
    try {
      await approveSettlement(det.id)
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'تعذر اعتماد التصفية')
    } finally {
      setSaving(false)
    }
  }

  const net = det?.net ?? det?.settlementNet ?? 0

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {/* القائمة لـ HR فقط — الجهات والموظف يفتحون ملفاً بعينه */}
          {can('offboarding.manage') ? (
            <Link href="/offboarding" className="hover:text-primary-600">
              إنهاء الخدمة
            </Link>
          ) : (
            <span>إنهاء الخدمة</span>
          )}
          <ArrowRight size={16} />
          <span className="text-gray-800">ملف #{params.id}</span>
        </div>

        {/* Error Banners */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
        )}
        {actionError && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0 text-red-500" />
            <span>{actionError}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !det ? (
          <div className="card p-12 text-center">
            <UserMinus size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">لم يتم العثور على ملف إنهاء الخدمة</p>
          </div>
        ) : (
          <>
            {/* Employee Header */}
            <div className="card p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
                    {(det.employeeName ?? det.employee?.fullName ?? '؟')
                      .trim()
                      .charAt(0)}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-800">
                      {det.employeeName ??
                        det.employee?.fullName ??
                        `موظف #${det.employeeId}`}
                    </h1>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                      <span dir="ltr">
                        {det.employeeCode ?? det.employee?.employeeCode ?? ''}
                      </span>
                      <span>
                        آخر يوم عمل:{' '}
                        <span dir="ltr" className="font-medium text-gray-700">
                          {fmtDate(det.lastWorkingDay)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`badge ${statusStyles[det.status] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {statusLabels[det.status] ?? det.status}
                  </span>
                  {det.settlementDocRef && (
                    <span
                      className="badge text-xs bg-primary-50 text-primary-700 font-mono"
                      dir="ltr"
                      title="سند التصفية"
                    >
                      {det.settlementDocRef}
                    </span>
                  )}
                  {det.clearanceCertRef && (
                    <span
                      className="badge text-xs bg-success-50 text-success-700 font-mono"
                      dir="ltr"
                      title="شهادة إخلاء الطرف"
                    >
                      {det.clearanceCertRef}
                    </span>
                  )}
                  {['IN_CLEARANCE', 'IN_SETTLEMENT', 'SETTLED'].includes(det.status) &&
                    can('offboarding.manage') && (
                      <button
                        onClick={handleWithdraw}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        <Undo2 size={16} />
                        إلغاء ملف إنهاء الخدمة
                      </button>
                    )}
                </div>
              </div>
            </div>

            {/* تحذير العهد المفتوحة */}
            {(det.openCustodyCount ?? 0) > 0 && (
              <div className="bg-warning-50 border border-warning-100 text-warning-700 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle size={20} className="text-warning-500 shrink-0" />
                <p className="text-sm font-medium flex-1">
                  الموظف لا يزال ماسكاً {det.openCustodyCount} عهدة مفتوحة — يجب
                  إرجاعها قبل إتمام بند العهدة والأصول
                </p>
                {/* سجل العهد لمسؤول العهد (custody.assign)، و«عهدي» للموظف نفسه — غيرهم بلا رابط */}
                {can('custody.assign') ? (
                  <Link
                    href="/employees/custody"
                    className="text-sm font-medium text-warning-700 underline hover:text-warning-600 shrink-0"
                  >
                    سجل العهد
                  </Link>
                ) : getCurrentUser()?.employeeId === det.employeeId ? (
                  <Link
                    href="/my/custody"
                    className="text-sm font-medium text-warning-700 underline hover:text-warning-600 shrink-0"
                  >
                    عهدي
                  </Link>
                ) : null}
              </div>
            )}

            {/* Clearance Checklist */}
            <div className="card overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    قائمة إخلاء الطرف
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    تكتمل التصفية تلقائياً بعد إتمام البنود الخمسة
                  </p>
                </div>
                <span className="badge bg-primary-50 text-primary-700 text-sm">
                  {doneCount} من {items.length || 5}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {items.map((item) => {
                  const cfg = partyConfig[item.party]
                  const Icon = cfg?.icon ?? CheckCircle2
                  const done = item.status === 'DONE'
                  return (
                    <div
                      key={item.id}
                      className="p-5 flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                            done ? 'bg-success-50' : 'bg-gray-100'
                          }`}
                        >
                          <Icon
                            size={22}
                            className={done ? 'text-success-500' : 'text-gray-400'}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-gray-800 text-sm">
                              {item.label || cfg?.label || item.party}
                            </h3>
                            <span className="text-xs text-gray-400">
                              ({cfg?.label ?? item.party})
                            </span>
                            {done ? (
                              <span className="badge text-xs bg-success-50 text-success-700 flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                تم
                              </span>
                            ) : (
                              <span className="badge text-xs bg-gray-100 text-gray-600 flex items-center gap-1">
                                <Clock size={12} />
                                معلّق
                              </span>
                            )}
                          </div>
                          {done && (
                            <div className="mt-1.5 text-xs text-gray-500 space-y-0.5">
                              {item.doneAt && (
                                <p>
                                  أُتمّ في: <span dir="ltr">{fmtDate(item.doneAt)}</span>
                                </p>
                              )}
                              {item.note && <p>ملاحظة: {item.note}</p>}
                              {item.amount != null && Number(item.amount) > 0 && (
                                <p className="text-red-600">
                                  خصم: {Number(item.amount).toLocaleString()} {currency}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* الزر للبنود اللي المستخدم يقدر يتصرف فيها بس (canAct من الباك) */}
                      {!done &&
                        det.status === 'IN_CLEARANCE' &&
                        (item.canAct ?? can('offboarding.manage')) && (
                        <button
                          onClick={() => {
                            setActionError('')
                            setCompleteForm({ note: '', amount: '' })
                            setCompleteModal(item)
                          }}
                          className="btn-primary text-sm px-4 py-2 shrink-0 flex items-center gap-2"
                        >
                          <CheckCircle2 size={16} />
                          إتمام البند
                        </button>
                      )}
                    </div>
                  )
                })}
                {items.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    لا توجد بنود إخلاء طرف في هذا الملف
                  </div>
                )}
              </div>
            </div>

            {/* المبالغ لأصحاب التصفية فقط — غيرهم يرى حالة الملف دون أرقام */}
            {showSettlement && det.canViewSettlement === false && (
              <div className="card p-6 flex items-center gap-3 text-sm text-gray-500">
                <Lock size={18} className="text-gray-400 shrink-0" />
                التصفية المالية لدى الموارد البشرية — بنودها ومبالغها متاحة لمسؤولي
                التصفية فقط
              </div>
            )}

            {/* Settlement Section */}
            {showSettlement && det.canViewSettlement !== false && (
              <div className="card overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      التصفية النهائية
                      {!editable && <Lock size={16} className="text-gray-400" />}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {editable
                        ? 'راجع البنود وعدّل المبالغ ثم اعتمد التصفية لقفلها'
                        : 'التصفية معتمدة ومقفلة — للقراءة فقط'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/employees/${det.employeeId}/settlement?case=${det.id}`}
                      className="btn-primary flex items-center gap-2 text-sm"
                    >
                      <ExternalLink size={16} />
                      فتح شاشة التصفية الكاملة
                    </Link>
                    {editable && (
                      <>
                        <button
                          onClick={() => {
                            setActionError('')
                            setAddLineModal(true)
                          }}
                          className="btn-secondary flex items-center gap-2 text-sm"
                        >
                          <Plus size={16} />
                          إضافة بند
                        </button>
                        <button
                          onClick={handleRecalc}
                          disabled={saving}
                          className="btn-secondary flex items-center gap-2 text-sm"
                        >
                          <RefreshCcw size={16} />
                          إعادة توليد البنود التلقائية
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-right">
                      <th className="py-3 px-4 text-sm font-medium text-gray-500">البند</th>
                      <th className="py-3 px-4 text-sm font-medium text-gray-500">النوع</th>
                      <th className="py-3 px-4 text-sm font-medium text-gray-500">المبلغ</th>
                      {editable && (
                        <th className="py-3 px-4 text-sm font-medium text-gray-500">إجراء</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.id} className="border-t border-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-800">{line.label}</span>
                            {line.isAuto && (
                              <span className="badge text-xs bg-indigo-100 text-indigo-700">
                                آلي
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`badge text-xs ${
                              line.type === 'CREDIT'
                                ? 'bg-success-50 text-success-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {line.type === 'CREDIT' ? 'إضافة' : 'خصم'}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-4 text-sm font-medium ${
                            line.type === 'CREDIT' ? 'text-success-700' : 'text-red-600'
                          }`}
                        >
                          {Number(line.amount).toLocaleString()} {currency}
                        </td>
                        {editable && (
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setActionError('')
                                  setEditLineForm({
                                    label: line.label,
                                    amount: String(line.amount),
                                  })
                                  setEditLineModal(line)
                                }}
                                className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center gap-1"
                              >
                                <Pencil size={12} />
                                تعديل
                              </button>
                              <button
                                onClick={() => handleDeleteLine(line)}
                                disabled={saving}
                                className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 flex items-center gap-1"
                                title="حذف البند"
                              >
                                <Trash2 size={12} />
                                حذف
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {lines.length === 0 && (
                      <tr>
                        <td
                          colSpan={editable ? 4 : 3}
                          className="p-8 text-center text-gray-400 text-sm"
                        >
                          لا توجد بنود تصفية بعد
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-100">
                      <td className="py-4 px-4 font-bold text-gray-800" colSpan={2}>
                        الصافي
                      </td>
                      <td
                        className={`py-4 px-4 font-bold text-lg ${
                          net >= 0 ? 'text-success-700' : 'text-red-600'
                        }`}
                        colSpan={editable ? 2 : 1}
                      >
                        {Number(net).toLocaleString()} {currency}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                {editable && can('settlement.approve') && (
                  <div className="p-6 border-t border-gray-100 flex items-center justify-end">
                    <button
                      onClick={handleApprove}
                      disabled={saving}
                      className="btn-primary flex items-center gap-2"
                    >
                      <FileCheck2 size={18} />
                      {saving ? 'جارٍ الاعتماد...' : 'اعتماد التصفية وقفلها'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* مودال إتمام بند إخلاء الطرف */}
        {completeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    إتمام البند:{' '}
                    {completeModal.label ||
                      partyConfig[completeModal.party]?.label ||
                      completeModal.party}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    يُسجَّل الإتمام باسمك ولا يمكن التراجع عنه
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCompleteModal(null)
                    setActionError('')
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {actionError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">
                    {actionError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظة (اختياري)
                  </label>
                  <textarea
                    value={completeForm.note}
                    onChange={(e) =>
                      setCompleteForm({ ...completeForm, note: e.target.value })
                    }
                    className="input w-full h-24 resize-none"
                    placeholder="أي ملاحظة تُسجَّل مع إتمام البند..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    خصم (اختياري)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={completeForm.amount}
                    onChange={(e) =>
                      setCompleteForm({ ...completeForm, amount: e.target.value })
                    }
                    className="input w-full"
                    dir="ltr"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    مبلغ يُخصم من التصفية النهائية إن وُجد (تلفيات، مستحقات...)
                  </p>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setCompleteModal(null)
                    setActionError('')
                  }}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleCompleteItem}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'جارٍ الإتمام...' : 'إتمام البند'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* مودال إضافة بند تصفية */}
        {addLineModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">إضافة بند تصفية</h2>
                <button
                  onClick={() => setAddLineModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {actionError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">
                    {actionError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    البند *
                  </label>
                  <input
                    type="text"
                    value={addLineForm.label}
                    onChange={(e) =>
                      setAddLineForm({ ...addLineForm, label: e.target.value })
                    }
                    className="input w-full"
                    placeholder="مثال: بدل إجازات غير مستخدمة"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      النوع *
                    </label>
                    <select
                      value={addLineForm.type}
                      onChange={(e) =>
                        setAddLineForm({
                          ...addLineForm,
                          type: e.target.value as 'CREDIT' | 'DEBIT',
                        })
                      }
                      className="input w-full"
                    >
                      <option value="CREDIT">إضافة (مستحق للموظف)</option>
                      <option value="DEBIT">خصم (على الموظف)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المبلغ *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={addLineForm.amount}
                      onChange={(e) =>
                        setAddLineForm({ ...addLineForm, amount: e.target.value })
                      }
                      className="input w-full"
                      dir="ltr"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setAddLineModal(false)}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAddLine}
                  disabled={saving || !addLineForm.label || !addLineForm.amount}
                  className="btn-primary"
                >
                  {saving ? 'جارٍ الإضافة...' : 'إضافة البند'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* مودال تعديل بند تصفية */}
        {editLineModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">تعديل بند التصفية</h2>
                  {editLineModal.isAuto && (
                    <p className="text-sm text-gray-500 mt-1">
                      بند آلي — تعديل المبلغ متاح قبل الاعتماد
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setEditLineModal(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {actionError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">
                    {actionError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    البند
                  </label>
                  <input
                    type="text"
                    value={editLineForm.label}
                    onChange={(e) =>
                      setEditLineForm({ ...editLineForm, label: e.target.value })
                    }
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المبلغ
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editLineForm.amount}
                    onChange={(e) =>
                      setEditLineForm({ ...editLineForm, amount: e.target.value })
                    }
                    className="input w-full"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditLineModal(null)}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleEditLine}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'جارٍ الحفظ...' : 'حفظ التعديل'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
