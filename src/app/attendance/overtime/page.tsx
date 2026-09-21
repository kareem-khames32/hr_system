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
  Lock,
  Unlock,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Building2,
} from 'lucide-react'
import {
  confirmOvertime,
  fetchDepartments,
  fetchBranches,
  fetchConfig,
  updateConfig,
  fetchOvertimePeriods,
  createOvertimePeriod,
  updateOvertimePeriod,
  deleteOvertimePeriod,
  can,
  getCurrentUser,
  lockedBranchIdOf,
  type ApiOvertimeEntry,
  type ApiDepartment,
  type ApiBranch,
  type ApiOvertimePeriod,
  type ApiOvertimePeriodRecompute,
} from '@/lib/api'
import { OrgTargetPicker, describeOrgTarget, initialOrgTarget, type OrgTarget } from '@/components/OrgTargetPicker'
import { localToday } from '@/lib/dates'
import { fetchOvertimeLogRange } from '@/lib/attendance-range-api'
import { dayRangeError, dayRangeLabel, type DayRange } from '@/lib/payroll-month-range'
import { DayRangeFilter, usePayrollDayRange } from '@/components/DayRangeFilter'
import { formatMoney } from '@/lib/money'
import { statusLabels as requestStatusLabels, type RequestStatus } from '@/data/requestsCatalog'

// ============================================================
// البصمة دليل للمراجعة؛ الساعات والقيمة تثبتان عند اكتمال دورة الاعتماد.
// المستثنى المستحق يستخدم ساعات صريحة معتمدة بدل استنتاجها من البصمة.
// دورة حياة السطر: DETECTED → SUBMITTED → APPROVED → PAID
// القائمة هنا من السيرفر: /attendance/overtime?from=&to= — كل حالات الفترة (الافتراضي شهر الرواتب)
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
  // الفترة باليوم — الافتراضي شهر الرواتب الجاري (مثلًا 23 → 22)
  const { range, setRange, context } = usePayrollDayRange()
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
  // إدارة فترات فتح/قفل الإضافي لمن يدير الحضور بس (الفرض الحقيقي في الباك)
  const [canManagePeriods, setCanManagePeriods] = useState(false)
  useEffect(() => { setCanManagePeriods(can('attendance.manage')) }, [])

  // سجل الشهر من السيرفر (كل الحالات) + قيمة الإعداد الحيّة
  const load = async (r: DayRange | null) => {
    if (!r || dayRangeError(r)) return
    setLoading(true)
    setError('')
    try {
      const log = await fetchOvertimeLogRange(r)
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
    load(range)
  }, [range])

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
      await load(range)
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
              <p className="text-sm text-gray-500">ساعات مدفوعة (في الفترة)</p>
              <p className="text-2xl font-bold text-success-600">{stats.paidHours}</p>
            </div>
          </div>
        </div>

        {/* التصفية */}
        <div className="card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative flex-1 min-w-[16rem]">
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
            <DayRangeFilter idPrefix="overtime" value={range} onChange={setRange} cycleStartDay={context?.cycleStartDay} today={context?.today} />
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
                        ? `لا يوجد أوفرتايم مسجَّل في الفترة ${range ? dayRangeLabel(range) : ''}`
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
                        <><span className="font-semibold text-gray-800">{formatMoney(e.amountSnapshot)}</span>
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

        {/* قاعدة الحساب وشرط الاستحقاق (قاعدة المالك 17 سبتمبر) */}
        <OvertimeRuleSection onChanged={() => load(range)} />

        {/* فترات فتح وقفل الإضافي — كانت في الإعدادات ← أيام العمل */}
        {canManagePeriods && <OvertimePeriodsSection onChanged={() => load(range)} />}
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

// ============================================================
// فترات فتح وقفل الإضافي — تواريخ بعينها (زي رمضان) تفتح أو تقفل حساب الإضافي
// بغض النظر عن الإعداد العام. المقفولة تكسب لو اتداخلوا.
// ============================================================
// قاعدة حساب الإضافي وشرط الاستحقاق — القيمة من إعداد overtime.detection_threshold_hours
// ============================================================
const THRESHOLD_KEY = 'overtime.detection_threshold_hours'

function OvertimeRuleSection({ onChanged }: { onChanged: () => void }) {
  const [saved, setSaved] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const [canEdit, setCanEdit] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setCanEdit(can('settings.manage'))
    fetchConfig()
      .then((rows) => {
        const row = rows.find((r) => r.key === THRESHOLD_KEY)
        setSaved(row?.value ?? null)
        setValue(row?.value ?? '')
      })
      .catch(() => setSaved(null))
  }, [])

  const save = async () => {
    const hours = Number(value)
    if (!value.trim() || !Number.isFinite(hours) || hours < 0 || hours > 24 || Math.abs(hours * 60 - Math.round(hours * 60)) > 1e-8) {
      setError('اكتب عدد ساعات من 0 لـ 24 يساوي دقايق صحيحة (مثال: 1 أو 0.5)')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await updateConfig(THRESHOLD_KEY, String(hours))
      setSaved(String(hours))
      setValue(String(hours))
      setNotice('اتحفظ شرط الاستحقاق — بيسري على الحساب الجاي (المعتمد قبل كده مابيتغيرش)')
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حفظ شرط الاستحقاق')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="overtime-rule" className="card scroll-mt-6 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
          <Clock size={20} className="text-indigo-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">إزاي الإضافي بيتحسب</h2>
          <p className="text-sm text-gray-500">الإضافي بيتحسب بعد إكمال ساعات العمل المطلوبة لليوم، مش بعد ميعاد نهاية الوردية.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
        <label htmlFor="overtime-threshold-hours">شرط استحقاق الإضافي: الزيادة عن ساعات العمل المطلوبة لازم توصل</label>
        <input id="overtime-threshold-hours" type="number" min={0} max={24} step={0.25} dir="ltr"
          className="input w-24 py-1 text-center" value={value} disabled={!canEdit || busy}
          onChange={(e) => { setValue(e.target.value); setNotice('') }} placeholder={saved == null ? '—' : undefined} />
        <span>ساعة — ولو وصلت بتتحسب كلها</span>
        {canEdit && (
          <button onClick={save} disabled={busy || value === (saved ?? '')} className="btn-primary text-sm py-1.5 px-4 disabled:opacity-50">
            {busy ? 'بيتحفظ...' : 'حفظ'}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">
        مثال لوردية 9 ساعات وشرط ساعة: اشتغل 10 ساعات ← ساعة إضافي. اشتغل 9 ساعات و40 دقيقة ← صفر.
        جه متأخر ساعة ومشي بعد الميعاد بساعة ← صفر. جه بدري ساعة ومشي في ميعاده ← ساعة إضافي.
        الشغل الفعلي من أول بصمة دخول لآخر بصمة خروج ناقص الاستراحة غير المدفوعة ووقت الأذونات، وبعدها التقريب لتحت والسقف اليومي.
        في الويك إند والعطلات الرسمية كل مدة الشغل بتتحسب. الوردية ممكن يكون ليها شرط خاص بيغلب الإعداد ده.
      </p>
      {!canEdit && <p className="text-xs text-gray-400">تعديل الشرط محتاج صلاحية الإعدادات.</p>}
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {notice && <div role="status" className="bg-success-50 text-success-700 rounded-xl p-3 text-sm">{notice}</div>}
    </section>
  )
}

const recomputeNote = (r?: ApiOvertimePeriodRecompute) =>
  r && (r.recomputed || r.failed)
    ? ` — اتحسب تاني ${r.recomputed} يوم حضور جوه الفترة${r.failed ? `، وتعذر ${r.failed}` : ''}`
    : ''

function OvertimePeriodsSection({ onChanged }: { onChanged: () => void }) {
  const [periods, setPeriods] = useState<ApiOvertimePeriod[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [globalOpen, setGlobalOpen] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [lockedBranchId, setLockedBranchId] = useState<number | null>(null)
  const today = localToday()

  const reload = async () => {
    try {
      setPeriods(await fetchOvertimePeriods())
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل فترات الإضافي')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const user = getCurrentUser()
    setLockedBranchId(lockedBranchIdOf(user))
    reload()
    fetchBranches().then(setBranches).catch(() => setBranches([]))
    // الإعداد العام محتاج صلاحية الإعدادات — لو مش متاح بنكتفي بالإشارة لمكانه
    fetchConfig()
      .then((rows) => {
        const row = rows.find((r) => r.key === 'overtime.enabled')
        setGlobalOpen(row ? row.value === 'true' : true)
      })
      .catch(() => setGlobalOpen(null))
  }, [])

  const branchName = (branchId?: number | null) =>
    branchId == null ? 'كل الفروع' : branches.find((b) => b.id === branchId)?.name ?? `فرع #${branchId}`
  const canEdit = (p: ApiOvertimePeriod) => !lockedBranchId || p.branchId === lockedBranchId

  const toggle = async (p: ApiOvertimePeriod) => {
    setBusyId(p.id)
    setError('')
    setNotice('')
    try {
      const res = await updateOvertimePeriod(p.id, { isActive: !p.isActive })
      await reload()
      setNotice(`${p.isActive ? 'اتوقفت' : 'اتفعلت'} فترة «${p.name}»${recomputeNote(res.recompute)}`)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تعديل الفترة')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (p: ApiOvertimePeriod) => {
    if (!confirm(`متأكد إنك عايز تحذف فترة «${p.name}»؟`)) return
    setBusyId(p.id)
    setError('')
    setNotice('')
    try {
      const res = await deleteOvertimePeriod(p.id)
      await reload()
      setNotice(`اتحذفت فترة «${p.name}»${recomputeNote(res.recompute)}`)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حذف الفترة')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section id="overtime-periods" className="card scroll-mt-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <CalendarClock size={20} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">فترات فتح وقفل الإضافي</h2>
            <p className="text-sm text-gray-500">افتح أو اقفل حساب الإضافي لتواريخ معينة (زي رمضان أو الجرد)</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm py-2">
          <Plus size={16} />
          إضافة فترة
        </button>
      </div>

      {/* شرح مختصر: يعني إيه مفتوحة ومقفولة */}
      <div className="grid md:grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-success-50 border border-success-100 flex items-start gap-2">
          <Unlock size={18} className="text-success-600 mt-0.5 shrink-0" />
          <p className="text-sm text-success-700">
            <b>مفتوحة:</b> الإضافي بيتحسب من البصمة في الأيام دي، حتى لو الإضافي العام مقفول.
          </p>
        </div>
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2">
          <Lock size={18} className="text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">
            <b>مقفولة:</b> مفيش إضافي بيتحسب تلقائي من البصمة في الأيام دي، حتى لو الإضافي العام مفتوح. الموظف يقدر يقدّم طلب إضافي ليوم معين، ولما يتعتمد نهائي بيتحسب من بصمات اليوم بنفس القاعدة (ولو طلع صفر بيتسجل صفر).
          </p>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        لو فترتين على نفس اليوم المقفولة هي اللي تمشي. برا أي فترة بيمشي الإعداد العام
        {globalOpen === null ? ' (الإعدادات ← أيام العمل)' : globalOpen ? ' — وهو دلوقتي مفتوح' : ' — وهو دلوقتي مقفول'}.
        إضافة أو تعديل أو حذف فترة بيعيد حساب الأيام اللي فاتت جواها فورًا: القفل بيلغي الإضافي المكتشف
        اللي لسه ما اتبعتش للاعتماد، والفتح بيكتشف الإضافي في الأيام دي. اللي اتبعت للاعتماد فعلًا بيفضل
        قرار المعتمد، والمعتمد أو المصروف مابيتغيرش.
      </p>

      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm mb-4">{error}</div>}
      {notice && <div role="status" className="bg-success-50 text-success-700 rounded-xl p-3 text-sm mb-4">{notice}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : periods.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
          <p>مفيش فترات — الإضافي ماشي بالإعداد العام.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map((p) => {
            const isOpen = p.effect === 'OPEN'
            const busy = busyId === p.id
            const current = p.isActive && p.fromDate <= today && p.toDate >= today
            return (
              <div
                key={p.id}
                className={`border-2 rounded-2xl p-4 flex items-center justify-between gap-4 ${
                  p.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 ${isOpen ? 'bg-green-500' : 'bg-red-500'} rounded-xl flex items-center justify-center shrink-0`}>
                    {isOpen ? <Unlock size={20} className="text-white" /> : <Lock size={20} className="text-white" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-800">{p.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isOpen ? 'bg-success-100 text-success-700' : 'bg-red-100 text-red-700'}`}>
                        {isOpen ? 'مفتوحة — الإضافي بيتحسب' : 'مقفولة — مفيش إضافي'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.isActive ? 'bg-success-100 text-success-600' : 'bg-gray-200 text-gray-500'}`}>
                        {p.isActive ? 'شغالة' : 'متوقفة'}
                      </span>
                      {current && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">سارية النهارده</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      من <span dir="ltr">{p.fromDate}</span> إلى <span dir="ltr">{p.toDate}</span>
                    </p>
                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-xs">
                      <Building2 size={12} />
                      {branchName(p.branchId)}
                    </span>
                  </div>
                </div>
                {canEdit(p) ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggle(p)}
                      disabled={busy}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                        p.isActive ? 'bg-success-50 text-success-600 hover:bg-success-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {p.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      {p.isActive ? 'إيقاف' : 'تفعيل'}
                    </button>
                    <button
                      onClick={() => remove(p)}
                      disabled={busy}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={18} />
                      حذف
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 shrink-0">لكل الفروع — تعديلها لمدير الشركة</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <AddOvertimePeriodModal
          branches={branches}
          lockedBranchId={lockedBranchId}
          onClose={() => setShowAdd(false)}
          onCreated={async (created) => {
            await reload()
            setError('')
            setNotice(`اتضافت فترة «${created.name}»${recomputeNote(created.recompute)}`)
            onChanged()
          }}
        />
      )}
    </section>
  )
}

function AddOvertimePeriodModal({
  branches,
  lockedBranchId,
  onClose,
  onCreated,
}: {
  branches: ApiBranch[]
  lockedBranchId: number | null
  onClose: () => void
  onCreated: (created: ApiOvertimePeriod & { recompute?: ApiOvertimePeriodRecompute }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [effect, setEffect] = useState<ApiOvertimePeriod['effect']>('OPEN')
  // الفترة للشركة كلها أو فرع — نفس منتقي الاستهداف بمستوى الفرع بس
  const [target, setTarget] = useState<OrgTarget>(() => initialOrgTarget(lockedBranchId, ['company', 'branch']))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!name.trim()) { setError('اكتب اسم الفترة'); return }
    if (!fromDate || !toDate) { setError('حدد من تاريخ وإلى تاريخ'); return }
    if (fromDate > toDate) { setError('تاريخ البداية لازم يكون قبل أو يساوي تاريخ النهاية'); return }
    if (target.level !== 'company' && target.branchId == null) { setError('اختار الفرع'); return }
    setSaving(true)
    setError('')
    try {
      const created = await createOvertimePeriod({
        name: name.trim(),
        fromDate,
        toDate,
        effect,
        branchId: target.level === 'company' ? undefined : target.branchId,
      })
      await onCreated(created)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حفظ الفترة')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="ot-period-title" className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 id="ot-period-title" className="text-xl font-bold text-gray-800">إضافة فترة فتح أو قفل للإضافي</h2>
            <p className="text-gray-500 text-sm mt-1">الفترة بتسري على الأيام اللي جواها بس</p>
          </div>
          <button onClick={onClose} disabled={saving} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}

          <div>
            <label htmlFor="ot-period-name" className="block text-sm font-medium text-gray-700 mb-2">اسم الفترة</label>
            <input id="ot-period-name" type="text" value={name} maxLength={200} onChange={(e) => setName(e.target.value)}
              placeholder="مثال: رمضان — فتح الإضافي" className="input w-full" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ot-period-from" className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
              <input id="ot-period-from" type="date" dir="ltr" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input w-full" />
            </div>
            <div>
              <label htmlFor="ot-period-to" className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
              <input id="ot-period-to" type="date" dir="ltr" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input w-full" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الإضافي في الفترة دي</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'OPEN', title: 'مفتوح', desc: 'بيتحسب حتى لو الإعداد العام مقفول', Icon: Unlock, color: 'bg-green-500' },
                { value: 'CLOSED', title: 'مقفول', desc: 'مابيتحسبش حتى لو الإعداد العام مفتوح', Icon: Lock, color: 'bg-red-500' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setEffect(option.value)}
                  className={`p-4 rounded-xl border-2 text-right transition-all ${
                    effect === option.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${option.color} rounded-lg flex items-center justify-center shrink-0`}>
                      <option.Icon size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{option.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{option.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <OrgTargetPicker
            value={target}
            onChange={setTarget}
            branches={branches}
            levels={['company', 'branch']}
            lockedBranchId={lockedBranchId}
            disabled={saving}
            showCount={false}
          />

          <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
            {fromDate && toDate
              ? `من ${fromDate} إلى ${toDate} — الإضافي ${effect === 'OPEN' ? 'مفتوح' : 'مقفول'} لـ${describeOrgTarget(target, branches, [])}`
              : 'حدد التواريخ عشان تشوف ملخص الفترة'}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button onClick={submit} disabled={saving} className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'جارٍ الحفظ...' : 'حفظ الفترة'}
          </button>
          <button onClick={onClose} disabled={saving} className="flex-1 btn-secondary disabled:opacity-50">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}
