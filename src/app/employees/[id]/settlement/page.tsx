'use client'
import { useParams } from 'next/navigation'

import { Suspense, useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  DollarSign,
  Printer,
  CheckCircle2,
  User,
  ArrowRight,
  AlertTriangle,
  Plus,
  Minus,
  Pencil,
  X,
  Building2,
  Shield,
  Receipt,
  ClipboardCheck,
  Lock,
  FileCheck2,
  UserMinus,
  Trash2,
  RefreshCcw,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  fetchOffboardingCase,
  fetchOffboardingCases,
  addSettlementLine,
  updateSettlementLine,
  deleteSettlementLine,
  recalcSettlementLines,
  approveSettlement,
  can,
  ApiError,
  type ApiOffboardingCase,
  type ApiSettlementLine,
} from '@/lib/api'
import { useCurrency } from '@/lib/currency'
import { SETTLEMENT_LABEL_MAX, settlementLabelIssue } from '@/lib/input-limits'

// حالات ملف إنهاء الخدمة — تسميات عربية فقط
const statusLabels: Record<string, string> = {
  IN_CLEARANCE: 'إخلاء طرف جارٍ',
  IN_SETTLEMENT: 'تصفية قيد المراجعة',
  SETTLED: 'معتمدة ومقفولة',
  CLOSED: 'منتهية',
  CANCELLED: 'ملغي — تراجع عن الاستقالة',
}

const statusStyles: Record<string, string> = {
  IN_CLEARANCE: 'bg-warning-50 text-warning-600',
  IN_SETTLEMENT: 'bg-blue-100 text-blue-700',
  SETTLED: 'bg-indigo-100 text-indigo-700',
  CLOSED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

// طرق الصرف — تسميات عربية
const payMethodLabels: Record<string, string> = {
  transfer: 'تحويل بنكي',
  cash: 'نقدي',
  visa: 'فيزا',
}

const fmtDate = (v?: string | null) => (v ? String(v).slice(0, 10) : '—')

// خطأ التحميل لا يُقرأ «لا يوجد ملف»: 403 و5xx وانقطاع الاتصال برسائل واضحة،
// وباقي الأخطاء (404 مثلاً) برسالة السيرفر كما هي
const loadErrorMessage = (err: unknown) => {
  if (err instanceof ApiError) {
    if (err.status === 403) {
      // حارس الصلاحيات (RolesGuard) يرد برسالة Nest الافتراضية الإنجليزية
      return err.message && err.message !== 'Forbidden resource'
        ? err.message
        : 'لا تملك صلاحية عرض ملفات إنهاء الخدمة'
    }
    if (err.status >= 500) {
      return `تعذر تحميل ملف التصفية — خطأ في الخادم (${err.status})، حاول مرة أخرى`
    }
    return err.message
  }
  if (err instanceof TypeError) {
    return 'تعذر الاتصال بالخادم — تحقق من الاتصال وحاول مرة أخرى'
  }
  return err instanceof Error ? err.message : 'تعذر تحميل ملف التصفية'
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function SettlementContent({ employeeId, backHref }: { employeeId: number; backHref: string }) {
  const searchParams = useSearchParams()
  const caseParam = searchParams.get('case')
  const currency = useCurrency()

  const [det, setDet] = useState<ApiOffboardingCase | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [saving, setSaving] = useState(false)

  // مودال إضافة بند (استحقاق أو خصم)
  const [addModal, setAddModal] = useState<'CREDIT' | 'DEBIT' | null>(null)
  const [addForm, setAddForm] = useState({ label: '', amount: '' })
  // مودال تعديل بند يدوي
  const [editModal, setEditModal] = useState<ApiSettlementLine | null>(null)
  const [editForm, setEditForm] = useState({ label: '', amount: '' })

  const load = async () => {
    try {
      if (caseParam && Number.isFinite(Number(caseParam))) {
        setDet(await fetchOffboardingCase(Number(caseParam)))
        setNotFound(false)
      } else {
        // بدون رقم ملف — نبحث عن أحدث ملف إنهاء خدمة لهذا الموظف. خطأ القائمة
        // (403 بلا صلاحية/5xx عطل) يُعرض كخطأ — «لا يوجد ملف» للنتيجة الفارغة فقط
        const cases = await fetchOffboardingCases()
        const mine = cases
          .filter((c) => c.employeeId === employeeId)
          .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
        if (mine.length === 0) {
          setNotFound(true)
          setDet(null)
          setError('')
          return
        }
        setDet(await fetchOffboardingCase(mine[0].id))
        setNotFound(false)
      }
      setError('')
    } catch (err) {
      setNotFound(false)
      setError(loadErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (Number.isFinite(employeeId)) load()
    else {
      setError('رقم الموظف غير صالح')
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, caseParam])

  const emp = det?.employee
  const items = det?.items ?? []
  const lines = det?.lines ?? []
  const doneCount = items.filter((i) => i.status === 'DONE').length

  const inClearance = det?.status === 'IN_CLEARANCE'
  // البنود قابلة للتعديل فقط أثناء المراجعة ولمن يملك الصلاحية
  const isEditable = det?.status === 'IN_SETTLEMENT' && can('settlement.edit')
  const canApprove = det?.status === 'IN_SETTLEMENT' && can('settlement.approve')
  // الراتب والبنك والبنود والصافي لأصحاب التصفية فقط (الباك يحجبها عن غيرهم)
  const seesMoney = det?.canViewSettlement !== false

  const entitlements = lines.filter((l) => l.type === 'CREDIT')
  const deductions = lines.filter((l) => l.type === 'DEBIT')
  const totalEntitlements = entitlements.reduce((s, l) => s + Number(l.amount), 0)
  const totalDeductions = deductions.reduce((s, l) => s + Number(l.amount), 0)
  // الصافي — نفضّل قيمة الباك إند إن وُجدت
  const net = det?.net ?? det?.settlementNet ?? totalEntitlements - totalDeductions

  // سنوات الخدمة من التعيين حتى آخر يوم عمل (منزلة عشرية واحدة)
  const serviceYears = (() => {
    if (!emp?.joinDate || !det?.lastWorkingDay) return null
    const join = new Date(emp.joinDate)
    const last = new Date(det.lastWorkingDay)
    if (isNaN(join.getTime()) || isNaN(last.getTime())) return null
    const years = (last.getTime() - join.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    return Math.max(0, Math.round(years * 10) / 10)
  })()

  const fmtMoney = (v?: number | null) =>
    v == null ? '—' : `${Number(v).toLocaleString('en-US')} ${currency}`

  const salaryParts = [
    emp?.basicSalary,
    emp?.housingAllowance,
    emp?.transportAllowance,
    emp?.phoneAllowance,
    emp?.workNatureAllowance,
    emp?.otherAllowance,
  ]
  const hasSalary = salaryParts.some((v) => v != null)
  // إجمالي المكونات الست = أساس مكافأة نهاية الخدمة وبدل الرصيد؛ بدل ضغط العمل برّه (قرار المالك 26 سبتمبر) ويظهر لوحده تحت
  const totalSalary = salaryParts.reduce((s: number, v) => s + (Number(v) || 0), 0)
  const workPressure = Number(emp?.workPressureAllowance ?? 0) || 0

  const handleAddLine = async () => {
    // اسم البند حرفان على الأقل (AddLineDto) — لا يُرسل أقصر فتظهر رسالة الخادم الإنجليزية
    if (!det || !addModal || saving || settlementLabelIssue(addForm.label) || !addForm.amount) return
    setSaving(true)
    setActionError('')
    try {
      await addSettlementLine(det.id, {
        label: addForm.label.trim(),
        type: addModal,
        amount: Number(addForm.amount),
      })
      setAddModal(null)
      setAddForm({ label: '', amount: '' })
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'تعذر إضافة البند')
    } finally {
      setSaving(false)
    }
  }

  const handleEditLine = async () => {
    if (!editModal || saving || (editForm.label.trim() && settlementLabelIssue(editForm.label))) return
    setSaving(true)
    setActionError('')
    try {
      await updateSettlementLine(editModal.id, {
        label: editForm.label.trim() || undefined,
        amount: editForm.amount ? Number(editForm.amount) : undefined,
      })
      setEditModal(null)
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

  const handleApprove = async () => {
    if (!det || saving) return
    if (
      !window.confirm(
        'اعتماد التصفية وقفلها؟ بعد الاعتماد تُقفل البنود نهائياً ويصدر سند التصفية.'
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

  // جدول بنود (استحقاقات أو خصومات) — نفس التصميم للاثنين
  const renderLinesTable = (
    rows: ApiSettlementLine[],
    kind: 'CREDIT' | 'DEBIT',
    total: number
  ) => {
    const isCredit = kind === 'CREDIT'
    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">البند</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">المبلغ</th>
              {isEditable && <th className="w-20"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((line) => (
              <tr key={line.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-800">{line.label}</p>
                    {line.isAuto && (
                      <span className="badge text-xs bg-indigo-100 text-indigo-700">تلقائي</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-left">
                  <span className={`font-bold ${isCredit ? 'text-success-600' : 'text-red-600'}`}>
                    {isCredit ? '+' : '-'}
                    {Number(line.amount).toLocaleString('en-US')} {currency}
                  </span>
                </td>
                {isEditable && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => {
                          setActionError('')
                          setEditForm({ label: line.label, amount: String(line.amount) })
                          setEditModal(line)
                        }}
                        className="p-1 rounded hover:bg-gray-200 text-gray-500"
                        title="تعديل البند"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteLine(line)}
                        disabled={saving}
                        className="p-1 rounded hover:bg-red-100 text-red-500 disabled:opacity-50"
                        title="حذف البند"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={isEditable ? 3 : 2}
                  className="px-4 py-8 text-center text-gray-400 text-sm"
                >
                  {inClearance
                    ? 'تُنشأ البنود تلقائياً بعد اكتمال إخلاء الطرف'
                    : 'لا توجد بنود بعد'}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className={isCredit ? 'bg-success-50' : 'bg-red-50'}>
            <tr>
              <td className="px-4 py-3 font-bold text-gray-800">
                {isCredit ? 'إجمالي الاستحقاقات' : 'إجمالي الخصومات'}
              </td>
              <td
                className={`px-4 py-3 text-left font-bold ${
                  isCredit ? 'text-success-600' : 'text-red-600'
                }`}
                colSpan={isEditable ? 2 : 1}
              >
                {isCredit ? '+' : '-'}
                {total.toLocaleString('en-US')} {currency}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={backHref}
            aria-label="رجوع"
            className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <ArrowRight size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">تصفية مستحقات نهاية الخدمة</h1>
            <p className="text-gray-500 mt-1">مراجعة واعتماد المستحقات النهائية للموظف</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isEditable && (
            <button
              onClick={handleRecalc}
              disabled={saving}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCcw size={18} />
              إعادة توليد البنود التلقائية
            </button>
          )}
          {/* نموذج التصفية المطبوع بمبالغه — لأصحاب التصفية فقط */}
          {seesMoney && (
            <button
              onClick={() => window.print()}
              className="btn-secondary flex items-center gap-2"
            >
              <Printer size={18} />
              طباعة
            </button>
          )}
        </div>
      </div>

      {/* Error Banners */}
      {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
      {actionError && (
        <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="shrink-0 text-red-500" />
          <span>{actionError}</span>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : notFound ? (
        <div className="card p-12 text-center">
          <UserMinus size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">لا يوجد ملف إنهاء خدمة لهذا الموظف</p>
          <Link href={backHref} className="text-primary-600 hover:text-primary-700 font-medium">
            العودة لملف الموظف
          </Link>
        </div>
      ) : !det ? null : (
        <>
          {/* بانر النجاح بعد الاعتماد */}
          {det.settlementDocRef && (
            <div className="bg-success-50 border border-success-200 rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} className="text-success-600" />
              </div>
              <div>
                <h3 className="font-bold text-success-800">التصفية معتمدة ومقفولة</h3>
                <p className="text-sm text-success-700">
                  مستند التصفية:{' '}
                  <span dir="ltr" className="font-mono">
                    {det.settlementDocRef}
                  </span>
                  {seesMoney && (
                    <>
                      {' — '}الصافي: {Number(net).toLocaleString('en-US')} {currency}
                    </>
                  )}
                </p>
                {det.clearanceCertRef && (
                  <p className="text-sm text-success-700 mt-0.5">
                    شهادة إخلاء الطرف:{' '}
                    <span dir="ltr" className="font-mono">
                      {det.clearanceCertRef}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-12 gap-6">
            {/* Sidebar */}
            <div className="col-span-4 space-y-6">
              {/* Employee Card */}
              <div className="card">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center shrink-0">
                    <User size={32} className="text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-gray-800">
                      {emp?.fullName ?? det.employeeName ?? `موظف #${det.employeeId}`}
                    </h2>
                    <p className="text-gray-500">{emp?.jobTitle ?? '—'}</p>
                    <span
                      className={`badge text-xs mt-1 inline-block ${
                        statusStyles[det.status] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {statusLabels[det.status] ?? 'غير معروفة'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">الرقم الوظيفي</span>
                    <span className="font-medium text-gray-800" dir="ltr">
                      {emp?.employeeCode ?? det.employeeCode ?? '—'}
                    </span>
                  </div>
                  {seesMoney && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">رقم الهوية</span>
                      <span className="font-medium text-gray-800" dir="ltr">
                        {emp?.nationalId ?? '—'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">تاريخ التعيين</span>
                    <span className="font-medium text-gray-800" dir="ltr">
                      {fmtDate(emp?.joinDate)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">آخر يوم عمل</span>
                    <span className="font-medium text-gray-800" dir="ltr">
                      {fmtDate(det.lastWorkingDay)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">سنوات الخدمة</span>
                    <span className="font-bold text-primary-600">
                      {serviceYears != null ? `${serviceYears.toFixed(1)} سنة` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* الراتب والبنك لأصحاب التصفية فقط */}
              {seesMoney && (
                <>
                  {/* Salary Details */}
                  <div className="card">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <DollarSign size={18} className="text-primary-500" />
                      تفاصيل الراتب
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">الراتب الأساسي</span>
                        <span className="font-medium text-gray-800">{fmtMoney(emp?.basicSalary)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">بدل السكن</span>
                        <span className="font-medium text-gray-800">
                          {fmtMoney(emp?.housingAllowance)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">بدل المواصلات</span>
                        <span className="font-medium text-gray-800">
                          {fmtMoney(emp?.transportAllowance)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">بدل الهاتف</span>
                        <span className="font-medium text-gray-800">
                          {fmtMoney(emp?.phoneAllowance)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">بدل طبيعة العمل</span>
                        <span className="font-medium text-gray-800">
                          {fmtMoney(emp?.workNatureAllowance)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">بدلات أخرى</span>
                        <span className="font-medium text-gray-800">
                          {fmtMoney(emp?.otherAllowance)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 bg-gray-50 -mx-6 px-6 rounded-lg">
                        <span className="font-bold text-gray-800">{workPressure > 0 ? 'الإجمالي (أساس المكافأة)' : 'الإجمالي'}</span>
                        <span className="font-bold text-primary-600">
                          {hasSalary ? `${totalSalary.toLocaleString('en-US')} ${currency}` : '—'}
                        </span>
                      </div>
                      {workPressure > 0 && (
                        <div className="py-2 border-b border-gray-100">
                          <div className="flex justify-between">
                            <span className="text-gray-500">بدل ضغط العمل</span>
                            <span className="font-medium text-gray-800">{fmtMoney(workPressure)}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">مش داخل في مكافأة نهاية الخدمة ولا بدل الرصيد — بيوصل التصفية جوه «راتب آخر شهر» بتناسب أيام الخدمة بس.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bank Info */}
                  <div className="card">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Building2 size={18} className="text-primary-500" />
                      معلومات الصرف
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">طريقة الصرف</span>
                        <span className="font-medium text-gray-800">
                          {payMethodLabels[emp?.payMethod ?? ''] ?? '—'}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">البنك</span>
                        <span className="font-medium text-gray-800">{emp?.bankName ?? '—'}</span>
                      </div>
                      <div className="py-2">
                        <span className="text-gray-500">IBAN</span>
                        <p className="font-medium text-gray-800 mt-1 font-mono text-xs" dir="ltr">
                          {emp?.iban ?? '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Clearance Progress */}
              <div className="card">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <ClipboardCheck size={18} className="text-primary-500" />
                  إخلاء الطرف
                </h3>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-500">البنود المكتملة</span>
                  <span className="font-bold text-gray-800">
                    {doneCount} من {items.length}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success-500 rounded-full transition-all"
                    style={{
                      width: `${items.length ? (doneCount / items.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <Link
                  href={`/offboarding/${det.id}`}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium mt-4 inline-block"
                >
                  عرض ملف إنهاء الخدمة
                </Link>
              </div>
            </div>

            {/* Settlement Details */}
            <div className="col-span-8 space-y-6">
              {/* قفل التصفية أثناء إخلاء الطرف */}
              {inClearance && (
                <div className="bg-warning-50 border border-warning-100 text-warning-700 rounded-xl p-4 flex items-center gap-3">
                  <Lock size={20} className="text-warning-500 shrink-0" />
                  <p className="text-sm font-medium">
                    التصفية تُفتح تلقائياً بعد اكتمال إخلاء الطرف
                  </p>
                </div>
              )}

              {/* البنود والصافي لأصحاب التصفية — غيرهم (جهة إخلاء بـemployees.view مثلاً)
                  يرى حالة الملف دون أرقام، مثل صفحة /offboarding/[id] */}
              {seesMoney ? (
                <>
                  {/* Entitlements */}
                  <div className="card">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Plus size={18} className="text-success-500" />
                        الاستحقاقات
                      </h3>
                      {isEditable && (
                        <button
                          onClick={() => {
                            setActionError('')
                            setAddForm({ label: '', amount: '' })
                            setAddModal('CREDIT')
                          }}
                          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                          <Plus size={16} />
                          إضافة بند
                        </button>
                      )}
                    </div>
                    {renderLinesTable(entitlements, 'CREDIT', totalEntitlements)}
                  </div>

                  {/* Deductions */}
                  <div className="card">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Minus size={18} className="text-red-500" />
                        الخصومات
                      </h3>
                      {isEditable && (
                        <button
                          onClick={() => {
                            setActionError('')
                            setAddForm({ label: '', amount: '' })
                            setAddModal('DEBIT')
                          }}
                          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                          <Plus size={16} />
                          إضافة خصم
                        </button>
                      )}
                    </div>
                    {renderLinesTable(deductions, 'DEBIT', totalDeductions)}
                  </div>

                  {/* Net Amount */}
                  <div className="card bg-gradient-to-l from-primary-50 to-white border-2 border-primary-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
                          <Receipt size={32} className="text-primary-600" />
                        </div>
                        <div>
                          <p className="text-gray-600">صافي المستحقات النهائية</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {totalEntitlements.toLocaleString('en-US')} - {totalDeductions.toLocaleString('en-US')}{' '}
                            = {Number(net).toLocaleString('en-US')}
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p
                          className={`text-4xl font-bold ${
                            Number(net) >= 0 ? 'text-primary-600' : 'text-red-600'
                          }`}
                        >
                          {Number(net).toLocaleString('en-US')}
                        </p>
                        <p className="text-gray-500">{currency}</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="card flex items-center gap-3 text-sm text-gray-500">
                  <Lock size={18} className="text-gray-400 shrink-0" />
                  التصفية المالية لدى الموارد البشرية — بنودها ومبالغها متاحة لمسؤولي
                  التصفية فقط
                </div>
              )}

              {/* Approve */}
              {canApprove && (
                <div className="flex items-center justify-between">
                  <div className="p-4 bg-yellow-50 rounded-xl flex items-start gap-3 flex-1 ml-4">
                    <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-700">
                      <p className="font-medium">ملاحظة:</p>
                      <p>بعد الاعتماد لن يمكن تعديل بنود التصفية</p>
                    </div>
                  </div>
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

              {/* Info Note */}
              <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-3">
                <Shield size={20} className="text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">كيف تُحسب التصفية؟</p>
                  <p className="mt-1">
                    البنود التلقائية (مكافأة نهاية الخدمة، بدل رصيد الإجازات، خصم السلف والعهد
                    المفقودة) يحسبها النظام تلقائياً عند اكتمال إخلاء الطرف، ويمكن إضافة بنود
                    يدوية قبل الاعتماد. بعد الاعتماد يُقفل الملف نهائياً.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* مودال إضافة بند */}
      {addModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                إضافة {addModal === 'CREDIT' ? 'استحقاق' : 'خصم'}
              </h2>
              <button
                onClick={() => setAddModal(null)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {actionError && (
                <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">{actionError}</div>
              )}
              <div>
                <label className="label">اسم البند *</label>
                <input
                  type="text"
                  value={addForm.label}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder={
                    addModal === 'CREDIT' ? 'مثال: مكافأة إضافية' : 'مثال: تلفيات معدات'
                  }
                  className="input w-full"
                  maxLength={SETTLEMENT_LABEL_MAX}
                />
                {addForm.label !== '' && settlementLabelIssue(addForm.label) && (
                  <p className="text-xs text-amber-700 mt-1">{settlementLabelIssue(addForm.label)}</p>
                )}
              </div>
              <div>
                <label className="label">المبلغ *</label>
                <input
                  type="number"
                  min="0"
                  value={addForm.amount}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="0"
                  className="input w-full"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={handleAddLine}
                disabled={saving || !!settlementLabelIssue(addForm.label) || !addForm.amount}
                className="flex-1 btn-primary"
              >
                {saving ? 'جارٍ الإضافة...' : 'إضافة'}
              </button>
              <button onClick={() => setAddModal(null)} className="flex-1 btn-secondary">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال تعديل بند يدوي */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800">تعديل بند التصفية</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {editModal.isAuto
                    ? 'بند تلقائي — يرجع لأرقام النظام عند إعادة التوليد'
                    : 'التعديل متاح قبل اعتماد التصفية'}
                </p>
              </div>
              <button
                onClick={() => setEditModal(null)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {actionError && (
                <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">{actionError}</div>
              )}
              <div>
                <label className="label">اسم البند</label>
                <input
                  type="text"
                  value={editForm.label}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, label: e.target.value }))}
                  className="input w-full"
                  maxLength={SETTLEMENT_LABEL_MAX}
                />
                {editForm.label.trim() !== '' && settlementLabelIssue(editForm.label) && (
                  <p className="text-xs text-amber-700 mt-1">{settlementLabelIssue(editForm.label)}</p>
                )}
              </div>
              <div>
                <label className="label">المبلغ</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.amount}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="input w-full"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={handleEditLine}
                disabled={saving || (editForm.label.trim() !== '' && !!settlementLabelIssue(editForm.label))}
                className="flex-1 btn-primary"
              >
                {saving ? 'جارٍ الحفظ...' : 'حفظ التعديل'}
              </button>
              <button onClick={() => setEditModal(null)} className="flex-1 btn-secondary">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نموذج التصفية المطبوع — يظهر فقط عند الطباعة (لأصحاب التصفية) */}
      {det && seesMoney && (
        <div className="print-voucher" dir="rtl">
          <div className="pv-head">
            <h1>نموذج تصفية مستحقات نهاية الخدمة</h1>
            <div className="pv-meta">
              <span>
                رقم المستند:{' '}
                <span dir="ltr">{det.settlementDocRef ?? ''}</span>
                {!det.settlementDocRef && 'مسودة — قيد المراجعة'}
              </span>
              <span>
                تاريخ الطباعة: <span dir="ltr">{new Date().toLocaleDateString('en-CA')}</span>
              </span>
            </div>
          </div>

          <table className="pv-info">
            <tbody>
              <tr>
                <td className="pv-label">الاسم</td>
                <td>{emp?.fullName ?? det.employeeName ?? `موظف #${det.employeeId}`}</td>
                <td className="pv-label">الرقم الوظيفي</td>
                <td dir="ltr">{emp?.employeeCode ?? det.employeeCode ?? '—'}</td>
              </tr>
              <tr>
                <td className="pv-label">المسمى</td>
                <td>{emp?.jobTitle ?? '—'}</td>
                <td className="pv-label">تاريخ التعيين</td>
                <td dir="ltr">{fmtDate(emp?.joinDate)}</td>
              </tr>
              <tr>
                <td className="pv-label">آخر يوم عمل</td>
                <td dir="ltr">{fmtDate(det.lastWorkingDay)}</td>
                <td className="pv-label">سنوات الخدمة</td>
                <td>{serviceYears != null ? `${serviceYears.toFixed(1)} سنة` : '—'}</td>
              </tr>
            </tbody>
          </table>

          <table className="pv-lines">
            <thead>
              <tr>
                <th>البند</th>
                <th>النوع</th>
                <th>المبلغ ({currency})</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id}>
                  <td>{l.label}</td>
                  <td>{l.type === 'CREDIT' ? 'استحقاق' : 'خصم'}</td>
                  <td dir="ltr">{Number(l.amount).toLocaleString('en-US')}</td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={3}>لا توجد بنود</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>إجمالي الاستحقاقات</td>
                <td dir="ltr">{totalEntitlements.toLocaleString('en-US')}</td>
              </tr>
              <tr>
                <td colSpan={2}>إجمالي الخصومات</td>
                <td dir="ltr">{totalDeductions.toLocaleString('en-US')}</td>
              </tr>
              <tr className="pv-net">
                <td colSpan={2}>صافي المستحقات</td>
                <td dir="ltr">{Number(net).toLocaleString('en-US')}</td>
              </tr>
            </tfoot>
          </table>

          <p className="pv-ack">
            أقر أنا الموظف الموضح بياناته أعلاه باستلامي كامل مستحقاتي الموضحة بهذا
            النموذج، وبأنه لا يحق لي المطالبة بأي مستحقات أخرى بعد التوقيع.
          </p>

          <div className="pv-signs">
            {['الموظف', 'الموارد البشرية', 'الإدارة المالية'].map((party) => (
              <div key={party} className="pv-sign">
                <p className="pv-sign-title">{party}</p>
                <p>الاسم: ...........................</p>
                <p>التوقيع: ...........................</p>
                <p>التاريخ: ...........................</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .print-voucher { display: none; }
        @media print {
          @page { size: A4; margin: 12mm; }
          body * { visibility: hidden; }
          .print-voucher, .print-voucher * { visibility: visible; }
          .print-voucher {
            display: block !important;
            position: absolute;
            top: 0;
            right: 0;
            left: 0;
            background: #fff;
            color: #000;
            padding: 0;
            font-size: 12px;
            line-height: 1.8;
            box-shadow: none;
          }
          .print-voucher .pv-head {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 14px;
            page-break-inside: avoid;
          }
          .print-voucher .pv-head h1 {
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 8px;
            color: #000;
          }
          .print-voucher .pv-meta {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
          }
          .print-voucher table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
            page-break-inside: avoid;
          }
          .print-voucher th,
          .print-voucher td {
            border: 1px solid #000;
            padding: 5px 8px;
            text-align: right;
            color: #000;
          }
          .print-voucher .pv-label { font-weight: 700; width: 17%; }
          .print-voucher .pv-lines thead th { font-weight: 700; }
          .print-voucher .pv-lines tfoot td { font-weight: 700; }
          .print-voucher .pv-net td {
            font-weight: 700;
            font-size: 14px;
            border-top: 2px solid #000;
          }
          .print-voucher .pv-ack {
            border: 1px solid #000;
            padding: 10px 12px;
            margin-bottom: 24px;
            page-break-inside: avoid;
          }
          .print-voucher .pv-signs {
            display: flex;
            gap: 12px;
            page-break-inside: avoid;
          }
          .print-voucher .pv-sign {
            flex: 1;
            border: 1px solid #000;
            padding: 10px 12px;
            min-height: 110px;
          }
          .print-voucher .pv-sign-title {
            font-weight: 700;
            text-align: center;
            border-bottom: 1px solid #000;
            padding-bottom: 4px;
            margin-bottom: 10px;
          }
          .print-voucher .pv-sign p { margin: 8px 0 0; }
        }
      `}</style>
    </div>
  )
}

export default function SettlementPage() {
  const params = useParams<{ id: string }>()
  return (
    <MainLayout>
      <Suspense fallback={<Spinner />}>
        <SettlementContent
          employeeId={Number(params.id)}
          backHref={`/employees/${params.id}`}
        />
      </Suspense>
    </MainLayout>
  )
}
