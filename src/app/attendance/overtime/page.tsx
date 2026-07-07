'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Fingerprint,
  CalendarClock,
  Wallet,
  Settings2,
  AlertTriangle,
} from 'lucide-react'

// ============================================================
// الأوفرتايم × البصمة (§7.1 من البريف)
// المبدأ: البصمة تثبت أن الساعات اشتُغلت، والموافقة تثبت أنها
// مسموح صرفها. المدفوع = المعتمَد ∩ الفعلي (من البصمة).
// دورة حياة السطر: DETECTED → SUBMITTED → APPROVED → PAID
// ============================================================

type OvertimeSource = 'BIOMETRIC_DETECTED' | 'PRE_REQUESTED'
type OvertimeStatus = 'DETECTED' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REJECTED'

interface OvertimeEntry {
  id: string
  employeeId: string
  employeeName: string
  department: string
  date: string
  source: OvertimeSource
  hoursRequested: number | null // المطلوبة/المعتمدة مسبقاً
  hoursActual: number | null // الفعلية من البصمة
  payableHours: number | null // = min(المعتمد، الفعلي) — التقاطع
  status: OvertimeStatus
  rate: number
  note?: string
}

const sourceLabels: Record<OvertimeSource, string> = {
  BIOMETRIC_DETECTED: 'مُكتشَف من البصمة',
  PRE_REQUESTED: 'مطلوب مسبقاً',
}

const statusConfig: Record<OvertimeStatus, { label: string; className: string }> = {
  DETECTED: { label: 'غير مؤكَّد (بانتظار التقديم)', className: 'bg-gray-100 text-gray-600' },
  SUBMITTED: { label: 'مُقدَّم (بانتظار المدير)', className: 'bg-warning-50 text-warning-700' },
  APPROVED: { label: 'معتمَد (بانتظار المسير)', className: 'bg-indigo-100 text-indigo-700' },
  PAID: { label: 'مدفوع ✓', className: 'bg-success-50 text-success-700' },
  REJECTED: { label: 'مرفوض', className: 'bg-red-100 text-red-700' },
}

const initialEntries: OvertimeEntry[] = [
  // مسار لاحق: البصمة اكتشفت ساعات زيادة — لسه ما اتقدّمتش كمطالبة
  {
    id: 'OT-101',
    employeeId: 'EMP010',
    employeeName: 'ليلى حسن العتيبي',
    department: 'تقنية المعلومات',
    date: '2026-07-06',
    source: 'BIOMETRIC_DETECTED',
    hoursRequested: null,
    hoursActual: 2.5,
    payableHours: null,
    status: 'DETECTED',
    rate: 1.5,
    note: 'انصراف 21:30 مقابل نهاية وردية 19:00',
  },
  // مسار لاحق: اتقدّمت كمطالبة والبصمة مرفقة كدليل
  {
    id: 'OT-100',
    employeeId: 'EMP005',
    employeeName: 'أحمد محمد علي',
    department: 'تقنية المعلومات',
    date: '2026-07-05',
    source: 'BIOMETRIC_DETECTED',
    hoursRequested: 2,
    hoursActual: 2.25,
    payableHours: null,
    status: 'SUBMITTED',
    rate: 1.5,
    note: 'إغلاق تسليم العميل — البصمة مرفقة كدليل',
  },
  // مسار مسبق: طلب قبل اليوم واعتُمد، والبصمة أكدت أقل من المعتمد
  {
    id: 'OT-098',
    employeeId: 'EMP009',
    employeeName: 'عمر ياسر الشهري',
    department: 'المبيعات',
    date: '2026-07-02',
    source: 'PRE_REQUESTED',
    hoursRequested: 4,
    hoursActual: 3,
    payableHours: 3, // min(4, 3)
    status: 'APPROVED',
    rate: 1.5,
    note: 'جرد نهاية الشهر — البصمة أكدت 3 من 4 ساعات معتمدة',
  },
  // مسار مسبق مكتمل: دخل المسير واتدفع
  {
    id: 'OT-095',
    employeeId: 'EMP007',
    employeeName: 'خالد عبدالعزيز النمر',
    department: 'المالية',
    date: '2026-06-25',
    source: 'PRE_REQUESTED',
    hoursRequested: 3,
    hoursActual: 3.5,
    payableHours: 3, // min(3, 3.5) — الزيادة عن المعتمد لا تُدفع
    status: 'PAID',
    rate: 2.0,
    note: 'إقفال مسير يونيو — دُفع في مسير 23 يونيو → 22 يوليو',
  },
  // مرفوض: بصمة متأخرة بدون تكليف
  {
    id: 'OT-097',
    employeeId: 'EMP006',
    employeeName: 'سارة أحمد الزهراني',
    department: 'الموارد البشرية',
    date: '2026-06-30',
    source: 'BIOMETRIC_DETECTED',
    hoursRequested: 1.5,
    hoursActual: 1.5,
    payableHours: null,
    status: 'REJECTED',
    rate: 1.5,
    note: 'رفض المدير: لا يوجد تكليف — تواجد شخصي',
  },
]

export default function OvertimePage() {
  const [entries, setEntries] = useState(initialEntries)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSource, setFilterSource] = useState<'' | OvertimeSource>('')
  const [filterStatus, setFilterStatus] = useState<'' | OvertimeStatus>('')
  // §9: الأوفرتايم المكتشف من البصمة يتطلب تأكيداً قبل الدفع (config)
  const [requireConfirmation, setRequireConfirmation] = useState(true)

  const filtered = entries.filter(
    (e) =>
      (e.employeeName.includes(searchQuery) || e.id.includes(searchQuery)) &&
      (!filterSource || e.source === filterSource) &&
      (!filterStatus || e.status === filterStatus)
  )

  const stats = {
    detected: entries.filter((e) => e.status === 'DETECTED').length,
    submitted: entries.filter((e) => e.status === 'SUBMITTED').length,
    approvedHours: entries
      .filter((e) => e.status === 'APPROVED')
      .reduce((s, e) => s + (e.payableHours ?? 0), 0),
    paidHours: entries
      .filter((e) => e.status === 'PAID')
      .reduce((s, e) => s + (e.payableHours ?? 0), 0),
  }

  // الموظف/المدير يقدّم الساعات المكتشفة كمطالبة
  const submitDetected = (id: string) => {
    setEntries(
      entries.map((e) =>
        e.id === id
          ? { ...e, status: 'SUBMITTED', hoursRequested: e.hoursActual }
          : e
      )
    )
  }

  // المدير يعتمد → المدفوع = min(المعتمد، الفعلي)
  const approve = (id: string) => {
    setEntries(
      entries.map((e) =>
        e.id === id
          ? {
              ...e,
              status: 'APPROVED',
              payableHours: Math.min(e.hoursRequested ?? 0, e.hoursActual ?? 0),
            }
          : e
      )
    )
  }

  const reject = (id: string) => {
    setEntries(
      entries.map((e) => (e.id === id ? { ...e, status: 'REJECTED', payableHours: null } : e))
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">سجل الأوفرتايم (overtime_entries)</h1>
            <p className="text-gray-500 mt-1">
              المدفوع = الساعات المعتمَدة ∩ المشتغَلة فعلياً من البصمة — مساران يغذّيان نفس السجل
            </p>
          </div>
          {/* §9 Config */}
          <label className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 cursor-pointer">
            <Settings2 size={18} className="text-indigo-500" />
            <span className="text-sm text-gray-700">
              المكتشَف من البصمة يتطلب تأكيداً قبل الدفع
            </span>
            <input
              type="checkbox"
              checked={requireConfirmation}
              onChange={(e) => setRequireConfirmation(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600"
            />
          </label>
        </div>

        {/* Lifecycle strip */}
        <div className="card p-4">
          <div className="flex items-center justify-center gap-3 text-sm">
            <span className="badge bg-gray-100 text-gray-600">DETECTED مُكتشَف</span>
            <span className="text-gray-300">←</span>
            <span className="badge bg-warning-50 text-warning-700">SUBMITTED مُقدَّم</span>
            <span className="text-gray-300">←</span>
            <span className="badge bg-indigo-100 text-indigo-700">APPROVED معتمَد</span>
            <span className="text-gray-300">←</span>
            <span className="badge bg-success-50 text-success-700">PAID مدفوع في المسير</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <Fingerprint size={24} className="text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مكتشَف غير مؤكَّد</p>
              <p className="text-2xl font-bold text-gray-700">{stats.detected}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
              <Clock size={24} className="text-warning-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">بانتظار المدير</p>
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
              <p className="text-sm text-gray-500">ساعات مدفوعة (هذه الدورة)</p>
              <p className="text-2xl font-bold text-success-600">{stats.paidHours}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
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

        {/* Entries Table */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-right px-4 py-3">الموظف</th>
                  <th className="text-center px-4 py-3">التاريخ</th>
                  <th className="text-center px-4 py-3">المصدر</th>
                  <th className="text-center px-4 py-3">المطلوبة</th>
                  <th className="text-center px-4 py-3">الفعلية (بصمة)</th>
                  <th className="text-center px-4 py-3 bg-success-50">المدفوعة (∩)</th>
                  <th className="text-center px-4 py-3">المعامل</th>
                  <th className="text-center px-4 py-3">الحالة</th>
                  <th className="text-center px-4 py-3">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="table-row">
                    <td className="table-cell">
                      <p className="font-medium text-gray-800 text-sm">{e.employeeName}</p>
                      <p className="text-[10px] text-gray-400 font-mono" dir="ltr">
                        {e.id} • {e.employeeId}
                      </p>
                      {e.note && <p className="text-xs text-gray-400 mt-0.5">{e.note}</p>}
                    </td>
                    <td className="table-cell text-center text-xs font-mono text-gray-500" dir="ltr">
                      {e.date}
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
                      {e.hoursRequested ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="table-cell text-center font-mono text-sm text-cyan-700">
                      {e.hoursActual ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="table-cell text-center bg-success-50/40">
                      {e.payableHours != null ? (
                        <span className="font-bold text-success-700">{e.payableHours} س</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="table-cell text-center text-sm text-gray-500">×{e.rate}</td>
                    <td className="table-cell text-center">
                      <span className={`badge text-xs ${statusConfig[e.status].className}`}>
                        {statusConfig[e.status].label}
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      {e.status === 'DETECTED' && (
                        <button
                          onClick={() => submitDetected(e.id)}
                          className="text-xs px-3 py-1.5 bg-warning-50 text-warning-700 rounded-lg hover:bg-warning-100"
                        >
                          تقديم كمطالبة
                        </button>
                      )}
                      {e.status === 'SUBMITTED' && (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => approve(e.id)}
                            className="text-xs px-3 py-1.5 bg-success-50 text-success-700 rounded-lg hover:bg-success-100 flex items-center gap-1"
                          >
                            <CheckCircle2 size={12} />
                            اعتماد
                          </button>
                          <button
                            onClick={() => reject(e.id)}
                            className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center gap-1"
                          >
                            <XCircle size={12} />
                            رفض
                          </button>
                        </div>
                      )}
                      {e.status === 'APPROVED' && (
                        <span className="text-xs text-indigo-500">يدخل المسير القادم آلياً</span>
                      )}
                      {e.status === 'PAID' && (
                        <span className="text-xs text-success-600">مُقفل ✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* القاعدة */}
        <div className="card p-4 bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>القاعدة:</strong> البصمة تثبت أن الساعات <strong>اشتُغلت</strong>، والموافقة تثبت
            أنها <strong>مسموح صرفها</strong> — أي واحدة لوحدها لا تكفي. المدفوع دائماً =
            الأقل بين المعتمَد والفعلي (لاحظ OT-095: اعتُمد 3 والبصمة أظهرت 3.5 → دُفع 3 فقط،
            وOT-097: بصمة بدون تكليف → رُفضت).
          </p>
        </div>
      </div>
    </MainLayout>
  )
}
