'use client'

import { OVERTIME_STATUS as statusConfig, type OvertimeStatus } from '@/lib/status-labels'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Fingerprint,
  CalendarClock,
  Wallet,
  AlertTriangle,
  Inbox,
} from 'lucide-react'
import {
  fetchOvertimeLog,
  confirmOvertime,
  fetchDepartments,
  type ApiOvertimeEntry,
  type ApiDepartment,
} from '@/lib/api'
import { localMonth, localToday } from '@/lib/dates'
import { statusLabels as requestStatusLabels, type RequestStatus } from '@/data/requestsCatalog'

// ============================================================
// البصمة دليل للمراجعة؛ الساعات والقيمة تثبتان عند اكتمال دورة الاعتماد.
// المستثنى المستحق يستخدم ساعات صريحة معتمدة بدل استنتاجها من البصمة.
// دورة حياة السطر: DETECTED → SUBMITTED → APPROVED → PAID
// القائمة هنا من السيرفر: /attendance/overtime?month= — كل حالات الشهر
// وحالة الطلب المرتبط (المكتشف يوجّهه الـcron لسلسلة الاعتماد فيصير SUBMITTED)
// ============================================================

type OvertimeSource = 'BIOMETRIC_DETECTED' | 'PRE_REQUESTED'

interface OvertimeEntry {
  id: number
  employeeId: number
  employeeName: string
  employeeCode: string
  department: string
  date: string
  source: OvertimeSource
  hoursRequested: number | null // المطلوبة/المعتمدة مسبقاً
  hoursActual: number | null // الفعلية من البصمة
  payableHours: number | null // = min(المعتمد، الفعلي) — التقاطع
  status: OvertimeStatus
  rate: number
  requestId: number | null // طلب السلسلة المرتبط (المسبق أو المكتشف الموجَّه)
  requestStatus: string | null
  isSelf: boolean
  canReject: boolean
  detectedMinutes: number | null
  rawMinutes: number | null
  approvedMinutes: number | null
  amountSnapshot: number | null
  dayKind: 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY' | null
  explicitHours: boolean
  // لماذا لم يصل «المكتشف» إلى دورة الاعتماد (نافذة مقفولة، أو يوم أقدم من حد الأثر الرجعي)
  windowOpen: boolean | null
  windowReason: string | null
  backdateDays: number | null
  blockers: string[]
}

// عمر اليوم بالأيام حتى اليوم المحلي — نفس حساب الخادم لحد الأثر الرجعي
const dayAge = (date: string) =>
  Math.round((Date.parse(`${localToday()}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000)

// سبب بقاء السطر «مكتشفًا» بلا طلب اعتماد — يُعرض بدل الصمت
const routingBlock = (entry: OvertimeEntry): string | null => {
  if (entry.status !== 'DETECTED' || entry.requestId != null) return null
  if (entry.windowOpen === false) {
    return `نافذة الإضافي مقفولة على هذا اليوم${entry.windowReason ? ` — ${entry.windowReason}` : ''}`
  }
  const age = dayAge(entry.date)
  if (entry.backdateDays != null && Number.isFinite(age) && age > entry.backdateDays) {
    return `مضى على اليوم ${age} يومًا وحد الأثر الرجعي ${entry.backdateDays} يومًا — لم يعد يُقبل في دورة الاعتماد`
  }
  if (entry.blockers.length) return entry.blockers.join('؛ ')
  return null
}

const sourceLabels: Record<OvertimeSource, string> = {
  BIOMETRIC_DETECTED: 'مُكتشَف من البصمة',
  PRE_REQUESTED: 'طلب موظف',
}


const KNOWN_STATUSES: OvertimeStatus[] = ['DETECTED', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED']
const dayKindLabels = { WEEKDAY: 'يوم عمل', WEEKEND: 'راحة أسبوعية', HOLIDAY: 'عطلة رسمية' }
const duration = (minutes: number) => `${Math.floor(minutes / 60)} س ${minutes % 60 ? `${minutes % 60} د` : ''}`.trim()

const requestStatusLabel = (s: string) => requestStatusLabels[s as RequestStatus] ?? s

const round2 = (n: number) => Math.round(n * 100) / 100

export default function OvertimePage() {
  const [month, setMonth] = useState(localMonth())
  const [rows, setRows] = useState<ApiOvertimeEntry[]>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [actingId, setActingId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSource, setFilterSource] = useState<'' | OvertimeSource>('')
  const [filterStatus, setFilterStatus] = useState<'' | OvertimeStatus>('')
  const [rejectEntry, setRejectEntry] = useState<OvertimeEntry | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState('')

  // سجل الشهر من السيرفر (كل الحالات) + قيمة الإعداد الحيّة
  const load = async (m: string) => {
    setLoading(true)
    setError('')
    try {
      const log = await fetchOvertimeLog(m)
      setRows(log.entries)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل سجل الأوفرتايم')
    } finally {
      setLoading(false)
    }
  }

  // الأقسام لأسماء العرض — مرة واحدة (فشلها لا يُسقط الشاشة)
  useEffect(() => {
    fetchDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]))
  }, [])

  useEffect(() => {
    load(month)
  }, [month])

  const entries: OvertimeEntry[] = useMemo(() => {
    const depById = new Map(departments.map((d) => [d.id, d]))
    return rows.map((o): OvertimeEntry => ({
      id: Number(o.id),
      employeeId: Number(o.employeeId),
      employeeName: o.employeeName ?? `موظف ${o.employeeId}`,
      employeeCode: o.employeeCode ?? '',
      department: (o.departmentId != null && depById.get(o.departmentId)?.name) || '-',
      date: o.date,
      source: o.source === 'PRE_REQUESTED' ? 'PRE_REQUESTED' : 'BIOMETRIC_DETECTED',
      hoursRequested: o.hoursRequested != null ? Number(o.hoursRequested) : null,
      hoursActual: o.hoursActual != null ? Number(o.hoursActual) : null,
      payableHours: o.payableHours != null ? Number(o.payableHours) : null,
      status: KNOWN_STATUSES.includes(o.status) ? o.status : 'DETECTED',
      rate: o.rate != null ? Number(o.rate) : 1.5,
      requestId: o.requestId ?? null,
      requestStatus: o.requestStatus ?? null,
      isSelf: o.isSelf === true,
      canReject: o.canReject === true,
      detectedMinutes: o.evidence?.detectedMinutes ?? null,
      rawMinutes: o.evidence?.rawMinutes ?? null,
      approvedMinutes: o.approvedMinutes != null ? Number(o.approvedMinutes) : null,
      amountSnapshot: o.amountSnapshot != null ? Number(o.amountSnapshot) : null,
      dayKind: o.evidence?.dayKind ?? null,
      explicitHours: o.evidence?.evidenceMode === 'EXEMPT_APPROVAL',
      windowOpen: o.evidence?.window?.open ?? null,
      windowReason: o.evidence?.window?.reason ?? null,
      backdateDays: o.evidence?.policy?.backdateDays ?? null,
      blockers: (o.evidence?.blockers ?? []).map((blocker) => blocker.message),
    }))
  }, [rows, departments])

  const filtered = entries.filter(
    (e) =>
      (e.employeeName.includes(searchQuery) ||
        e.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(e.id).includes(searchQuery)) &&
      (!filterSource || e.source === filterSource) &&
      (!filterStatus || e.status === filterStatus)
  )

  // إحصاءات الشهر المحدد من كل حالاته
  const stats = {
    detected: entries.filter((e) => e.status === 'DETECTED').length,
    submitted: entries.filter((e) => e.status === 'SUBMITTED').length,
    approvedHours: round2(
      entries
        .filter((e) => e.status === 'APPROVED')
        .reduce((s, e) => s + (e.approvedMinutes != null ? e.approvedMinutes / 60 : e.payableHours ?? 0), 0)
    ),
    paidHours: round2(
      entries.filter((e) => e.status === 'PAID').reduce((s, e) => s + (e.approvedMinutes != null ? e.approvedMinutes / 60 : e.payableHours ?? 0), 0)
    ),
  }

  // رفض المكتشف غير الموجه بسبب محفوظ؛ الاعتماد من الطلب المرتبط وحده.
  const reject = async () => {
    if (!rejectEntry || actingId != null) return
    const reason = rejectReason.trim()
    if (!reason) { setRejectError('اكتب سبب رفض الإضافي'); return }
    const id = rejectEntry.id
    setActingId(id)
    setError('')
    setNotice('')
    try {
      await confirmOvertime(id, false, reason)
      setRejectEntry(null)
      await load(month)
      setNotice('تم رفض الإضافي وحفظ السبب')
    } catch (e) {
      setRejectError(e instanceof Error ? e.message : 'تعذر رفض الإضافي')
    } finally {
      setActingId(null)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* عنوان الشاشة */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">العمل الإضافي</h1>
            <p className="text-gray-500 mt-1">
              راجع دليل الساعات وتابع الطلب المرتبط حتى اكتمال اعتماده
            </p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-sm text-indigo-700 flex items-center gap-2">
            <CheckCircle2 size={18} />
            دورة الاعتماد مطلوبة قبل الصرف
          </div>
        </div>

        {/* رسائل النتيجة */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}
        {notice && (
          <div className="bg-success-50 text-success-700 rounded-xl p-4 flex items-center gap-2">
            <CheckCircle2 size={18} />
            {notice}
          </div>
        )}

        {/* مراحل الطلب */}
        <div className="card p-4">
          <div className="flex items-center justify-center gap-3 text-sm">
            <span className="badge bg-gray-100 text-gray-600">مُكتشَف</span>
            <span className="text-gray-300">←</span>
            <span className="badge bg-warning-50 text-warning-700">قيد المراجعة</span>
            <span className="text-gray-300">←</span>
            <span className="badge bg-indigo-100 text-indigo-700">معتمَد</span>
            <span className="text-gray-300">←</span>
            <span className="badge bg-success-50 text-success-700">مدفوع</span>
          </div>
        </div>

        {/* إحصاءات الشهر المحدد */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <Fingerprint size={24} className="text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مكتشَف ينتظر التوجيه</p>
              <p className="text-2xl font-bold text-gray-700">{stats.detected}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
              <Clock size={24} className="text-warning-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">بانتظار اكتمال الاعتماد</p>
              <p className="text-2xl font-bold text-warning-600">{stats.submitted}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <CalendarClock size={24} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ساعات معتمدة تنتظر المسير</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.approvedHours}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
              <Wallet size={24} className="text-success-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ساعات مدفوعة (هذا الشهر)</p>
              <p className="text-2xl font-bold text-success-600">{stats.paidHours}</p>
            </div>
          </div>
        </div>

        {/* التصفية */}
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="بحث بالموظف أو رقم السطر..."
                className="input pr-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="input w-44"
              title="شهر السجل"
            />
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as '' | OvertimeSource)}
              className="input w-52"
            >
              <option value="">كل المصادر</option>
              <option value="BIOMETRIC_DETECTED">مُكتشَف من البصمة</option>
              <option value="PRE_REQUESTED">مطلوب مسبقاً</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as '' | OvertimeStatus)}
              className="input w-56"
            >
              <option value="">كل الحالات</option>
              {Object.entries(statusConfig).map(([id, cfg]) => (
                <option key={id} value={id}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* سجل الإضافي */}
        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-right px-4 py-3">الموظف</th>
                  <th className="text-center px-4 py-3">التاريخ</th>
                  <th className="text-center px-4 py-3">المصدر</th>
                  <th className="text-center px-4 py-3">المطلوبة</th>
                  <th className="text-center px-4 py-3">المحتسبة من الدليل</th>
                  <th className="text-center px-4 py-3 bg-success-50">الساعات المعتمدة</th>
                  <th className="text-center px-4 py-3">المعامل</th>
                  <th className="text-center px-4 py-3">القيمة المعتمدة</th>
                  <th className="text-center px-4 py-3">الحالة</th>
                  <th className="text-center px-4 py-3">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-gray-400">
                      {entries.length === 0
                        ? `لا يوجد أوفرتايم مسجَّل في ${month}`
                        : 'لا توجد سطور مطابقة للبحث أو التصفية'}
                    </td>
                  </tr>
                )}
                {filtered.map((e) => (
                  <tr key={e.id} className="table-row">
                    <td className="table-cell">
                      <p className="font-medium text-gray-800 text-sm">{e.employeeName}</p>
                      <p className="text-[10px] text-gray-400 font-mono" dir="ltr">
                        OT-{e.id} • {e.employeeCode ? `${e.employeeCode} • ` : ''}{e.department}
                      </p>
                    </td>
                    <td className="table-cell text-center text-xs text-gray-500">
                      <p className="font-mono" dir="ltr">{e.date}</p>
                      <p className="mt-1">{e.dayKind ? dayKindLabels[e.dayKind] : 'نوع اليوم غير محفوظ'}</p>
                    </td>
                    <td className="table-cell text-center">
                      <span
                        className={`badge text-xs flex items-center gap-1 justify-center ${
                          e.source === 'BIOMETRIC_DETECTED'
                            ? 'bg-cyan-50 text-cyan-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {e.source === 'BIOMETRIC_DETECTED' ? (
                          <Fingerprint size={11} />
                        ) : (
                          <CalendarClock size={11} />
                        )}
                        {sourceLabels[e.source]}
                      </span>
                    </td>
                    <td className="table-cell text-center font-mono text-sm">
                      {e.hoursRequested != null ? `${e.hoursRequested} س` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="table-cell text-center text-sm text-cyan-700">
                      {e.explicitHours ? <span>ساعات صريحة بالطلب</span> : e.detectedMinutes != null ? duration(e.detectedMinutes)
                        : e.hoursActual != null ? `${e.hoursActual} س` : <span className="text-gray-300">—</span>}
                      {!e.explicitHours && e.rawMinutes != null && e.rawMinutes !== e.detectedMinutes && (
                        <p className="text-[10px] text-gray-400 mt-1">قبل التقريب والسقف: {duration(e.rawMinutes)}</p>
                      )}
                    </td>
                    <td className="table-cell text-center bg-success-50/40">
                      {['APPROVED', 'PAID'].includes(e.status) && (e.approvedMinutes != null || e.payableHours != null) ? (
                        <span className="font-bold text-success-700">{e.approvedMinutes != null ? duration(e.approvedMinutes) : `${e.payableHours} س`}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="table-cell text-center text-sm text-gray-500">×{e.rate}</td>
                    <td className="table-cell text-center text-sm">
                      {e.amountSnapshot != null && ['APPROVED', 'PAID'].includes(e.status) ? (
                        <><span className="font-semibold text-gray-800">{e.amountSnapshot.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <p className="text-[10px] text-gray-400 mt-1">مثبتة عند الاعتماد</p></>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="table-cell text-center">
                      <span className={`badge text-xs ${statusConfig[e.status].className}`}>
                        {statusConfig[e.status].label}
                      </span>
                      {e.requestId != null && e.requestStatus && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          الطلب <span className="font-mono" dir="ltr">#{e.requestId}</span>:{' '}
                          {requestStatusLabel(e.requestStatus)}
                        </p>
                      )}
                    </td>
                    <td className="table-cell text-center">
                      {e.requestId != null && (
                        <Link href={`/approvals-inbox?request=${e.requestId}`}
                          className="text-xs text-primary-600 hover:underline inline-flex items-center gap-1"
                          title="فتح دليل الطلب وحالة خطوات اعتماده">
                          <Inbox size={12} /> فتح الطلب #{e.requestId}
                        </Link>
                      )}
                      {e.status === 'DETECTED' && !e.requestId && (
                        <div className="space-y-2">
                          {routingBlock(e) ? (
                            <p className="text-xs text-amber-700 font-medium" title="لن يصل هذا السطر إلى دورة الاعتماد بوضعه الحالي">
                              {routingBlock(e)}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400">بانتظار التوجيه إلى دورة الاعتماد</p>
                          )}
                          {e.canReject && <button type="button"
                            onClick={() => { setRejectEntry(e); setRejectReason(''); setRejectError('') }}
                            disabled={actingId !== null}
                            className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 inline-flex items-center gap-1 disabled:opacity-50">
                            <XCircle size={12} /> رفض بسبب
                          </button>}
                        </div>
                      )}
                      {e.status === 'APPROVED' && (
                        <span className="text-xs text-indigo-500">معتمد بانتظار الصرف</span>
                      )}
                      {e.status === 'PAID' && (
                        <span className="text-xs text-success-600">مُقفل ✓</span>
                      )}
                      {e.status === 'CANCELLED' && <span className="text-xs text-gray-500">ملغي مع حفظ أثره</span>}
                      {e.status === 'REJECTED' && (
                        <span className="text-xs text-red-500">مرفوض</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>

        {/* القاعدة */}
        <div className="card p-4 bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            تُراجع الساعات من أدلة اليوم، وتثبت الساعات والقيمة عند اكتمال دورة الاعتماد.
            المستثنى من الحضور المستحق للإضافي يقدم ساعات صريحة يعتمدها المدير والموارد البشرية.
            افتح الطلب المرتبط للمراجعة والموافقة؛ الرفض هنا متاح للمكتشف الذي لم يُوجَّه بعد.
          </p>
        </div>
      </div>
      {rejectEntry && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="overtime-reject-title" className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 id="overtime-reject-title" className="text-lg font-bold text-gray-800">رفض إضافي {rejectEntry.employeeName}</h2>
            <p className="text-sm text-gray-500">اليوم {rejectEntry.date} · القيد #{rejectEntry.id}</p>
            <div>
              <label htmlFor="overtime-reject-reason" className="label">سبب الرفض</label>
              <textarea id="overtime-reject-reason" autoFocus required maxLength={500} rows={3}
                value={rejectReason} disabled={actingId !== null}
                onChange={event => { setRejectReason(event.target.value); setRejectError('') }}
                placeholder="وضح سبب رفض الساعات المكتشفة" className="input w-full" />
            </div>
            {rejectError && <p role="alert" className="text-sm text-red-600">{rejectError}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" disabled={actingId !== null} onClick={() => setRejectEntry(null)}>إلغاء</button>
              <button type="button" className="px-4 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50"
                disabled={actingId !== null || !rejectReason.trim()} onClick={reject}>
                {actingId !== null ? 'جارٍ الحفظ...' : 'حفظ الرفض والسبب'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
