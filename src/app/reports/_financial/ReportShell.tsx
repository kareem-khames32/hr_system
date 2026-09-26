'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import { AlertTriangle, ArrowRight, CalendarRange, Download, Info, Printer, RefreshCw } from 'lucide-react'
import { fetchBranches, fetchCatalog, fetchDepartments, getCurrentUser, isCompanyWideUser, lockedBranchIdOf, type ApiBranch, type ApiDepartment } from '@/lib/api'
import { branchScopeOfUser, canSeeBranch, type BranchScope } from '@/lib/branch-scope'
import { PayrollPeriodSelect, usePayrollMonthContext } from '@/components/DayRangeFilter'
import { RUN_STATUS_LABELS, type FinancialFilters, type FinancialReportHeader } from './api'

interface CostCenterOption { id: number; code?: string; name: string }

const EMPTY_FILTERS: FinancialFilters = { period: '', branchId: '', departmentId: '', costCenterId: '', includeDraft: false }

/** تحميل تقرير مالي بالفلاتر: أول مرة من غير شهر (الخادم يختار شهر الرواتب الجاري) وبعدها بالشهر اللي رجع. */
export function useFinancialReport<T extends FinancialReportHeader>(fetcher: (filters: FinancialFilters) => Promise<T>) {
  const [filters, setFilters] = useState<FinancialFilters>(EMPTY_FILTERS)
  const [report, setReport] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // الشهر اللي الخادم اختاره بيتحط في الفلتر من غير ما يعيد تحميل نفس التقرير تاني
  const adopted = useRef<string | null>(null)
  // رد قديم (فلتر اتغير قبل ما يوصل) ما يغطيش على الأحدث
  const latest = useRef(0)
  const load = () => {
    if (filters.period && !/^\d{4}-\d{2}$/.test(filters.period)) return
    const request = ++latest.current
    setLoading(true)
    setError('')
    fetcher(filters)
      .then((data) => {
        if (request !== latest.current) return
        setReport(data)
        if (!filters.period && data.period) {
          setFilters((current) => {
            if (current.period) return current
            adopted.current = data.period
            return { ...current, period: data.period }
          })
        }
      })
      .catch((e) => {
        if (request !== latest.current) return
        setReport(null)
        setError(e instanceof Error ? e.message : 'تعذر تحميل التقرير')
      })
      .finally(() => {
        if (request === latest.current) setLoading(false)
      })
  }
  useEffect(() => {
    if (adopted.current !== null && adopted.current === filters.period) {
      adopted.current = null
      return
    }
    adopted.current = null
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.period, filters.branchId, filters.departmentId, filters.costCenterId, filters.includeDraft])
  return { filters, setFilters, report, loading, error, reload: load }
}

interface ShellProps {
  title: string
  description: string
  filters: FinancialFilters
  setFilters: (update: (current: FinancialFilters) => FinancialFilters) => void
  header: FinancialReportHeader | null
  loading: boolean
  error: string
  onRefresh: () => void
  onExport: () => void
  exportDisabled: boolean
  /** ملاحظة تحت الفلاتر عن مصدر الأرقام */
  note?: ReactNode
  children: ReactNode
}

// الإطار المشترك للتقارير المالية: الفلاتر (شهر الرواتب بحدوده، الفرع، القسم، مركز التكلفة، المسيرات اللي لسه ما اتعتمدتش)،
// والمسيرات الداخلة في الأرقام، والتصدير لملف يفتح في Excel، والطباعة بعرض الصفحة.
export function FinancialReportShell(props: ShellProps) {
  const { title, description, filters, setFilters, header, loading, error, onRefresh, onExport, exportDisabled, note, children } = props
  const [companyWide, setCompanyWide] = useState(false)
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [costCenters, setCostCenters] = useState<CostCenterOption[]>([])
  const [myBranchId, setMyBranchId] = useState<number | null>(null)
  // نطاق فروع الحساب: حساب الفروع المتعددة يختار فرع من فروعه أو كلها (الخادم بيقصر التقرير على نطاقه)
  const [branchScope, setBranchScope] = useState<BranchScope>([])
  // التقارير دي على مسيرات شهر رواتب بالاسم؛ الاختيار بيوضّح أيامه بالظبط (23 أغسطس – 22 سبتمبر)
  const payrollMonth = usePayrollMonthContext()

  useEffect(() => {
    const user = getCurrentUser()
    setCompanyWide(isCompanyWideUser(user))
    setMyBranchId(lockedBranchIdOf(user))
    setBranchScope(branchScopeOfUser(user))
    fetchBranches().then(setBranches).catch(() => setBranches([]))
    fetchDepartments().then(setDepartments).catch(() => setDepartments([]))
    fetchCatalog<CostCenterOption>('cost-centers').then(setCostCenters).catch(() => setCostCenters([]))
  }, [])

  // الفرع بيتختار من القائمة لحساب الشركة ولحساب الفروع المتعددة؛ حساب الفرع الواحد مقفول على فرعه
  const picksBranch = companyWide || (branchScope !== null && branchScope.length > 1)
  const branchForDepartments = picksBranch ? (filters.branchId ? Number(filters.branchId) : null) : myBranchId
  const departmentOptions = departments.filter((department) => branchForDepartments === null || department.branchId === branchForDepartments)
  const branchName = (id: number | null) => (id === null ? null : branches.find((branch) => branch.id === id)?.name ?? `#${id}`)
  const filterText = [
    header?.branchId ? `الفرع: ${branchName(header.branchId)}` : 'كل الفروع',
    header?.departmentId ? `القسم: ${departments.find((d) => d.id === header.departmentId)?.name ?? `#${header.departmentId}`}` : null,
    header?.costCenterId ? `مركز التكلفة: ${costCenters.find((c) => c.id === header.costCenterId)?.name ?? `#${header.costCenterId}`}` : null,
    header?.includeDraft ? 'شامل المسيرات اللي لسه ما اتعتمدتش' : 'المسيرات المعتمدة والمصروفة بس',
  ].filter(Boolean).join(' — ')

  return (
    <MainLayout>
      <div className="space-y-6 fr-print">
        <div className="flex items-center gap-2 text-sm text-gray-500 fr-no-print">
          <Link href="/reports" className="hover:text-primary-600">التقارير</Link>
          <ArrowRight size={16} />
          <Link href="/payroll/reports" className="hover:text-primary-600">تقارير الرواتب</Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">{title}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
            <p className="text-gray-500 mt-1 fr-no-print">{description}</p>
            {header && (
              <div className="fr-print-only text-sm mt-1">
                <p>شهر الرواتب {header.period} (من {header.startDate} إلى {header.endDate}) — {filterText}</p>
                <p>
                  المسيرات: {header.runs.length ? header.runs.map((run) => `${run.name || `مسير #${run.id}`} (${RUN_STATUS_LABELS[run.status] ?? run.status})`).join('، ') : 'لا يوجد'}
                  {' '}— اتطبع {new Date().toLocaleDateString('en-CA')}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 fr-no-print">
            <button type="button" onClick={onRefresh} className="btn-secondary flex items-center gap-2" disabled={loading}>
              <RefreshCw size={18} />
              تحديث
            </button>
            <button type="button" onClick={() => window.print()} className="btn-secondary flex items-center gap-2" disabled={loading || !header}>
              <Printer size={18} />
              طباعة
            </button>
            <button
              type="button"
              onClick={onExport}
              className="btn-primary flex items-center gap-2"
              disabled={exportDisabled}
              title={exportDisabled ? 'مفيش صفوف تتصدر' : 'تصدير ملف يفتح في Excel'}
            >
              <Download size={18} />
              تصدير Excel
            </button>
          </div>
        </div>

        <div className="card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end fr-no-print">
          <PayrollPeriodSelect id="financial-report-period" label="شهر الرواتب" value={filters.period}
            cycleStartDay={payrollMonth?.cycleStartDay} today={payrollMonth?.today}
            onChange={(period) => setFilters((current) => ({ ...current, period }))} />
          <div>
            <label className="label">الفرع</label>
            {picksBranch ? (
              <select
                className="input"
                value={filters.branchId}
                onChange={(e) => setFilters((current) => ({ ...current, branchId: e.target.value, departmentId: '' }))}
              >
                <option value="">{companyWide ? 'كل الفروع' : 'كل فروعك'}</option>
                {branches.filter((branch) => canSeeBranch(companyWide ? null : branchScope, branch.id)).map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            ) : (
              <input className="input bg-gray-50" value={branchName(myBranchId) ?? 'فرعك'} disabled />
            )}
          </div>
          <div>
            <label className="label">القسم</label>
            <select
              className="input"
              value={filters.departmentId}
              onChange={(e) => setFilters((current) => ({ ...current, departmentId: e.target.value }))}
            >
              <option value="">كل الأقسام</option>
              {departmentOptions.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">مركز التكلفة</label>
            <select
              className="input"
              value={filters.costCenterId}
              onChange={(e) => setFilters((current) => ({ ...current, costCenterId: e.target.value }))}
            >
              <option value="">كل مراكز التكلفة</option>
              {costCenters.map((center) => (
                <option key={center.id} value={center.id}>{center.name}{center.code ? ` (${center.code})` : ''}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 pb-2.5">
            <input
              type="checkbox"
              checked={filters.includeDraft}
              onChange={(e) => setFilters((current) => ({ ...current, includeDraft: e.target.checked }))}
            />
            اعرض كمان المسيرات اللي لسه ما اتعتمدتش
          </label>
        </div>

        {header && (
          <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-800 space-y-2 fr-no-print">
            <p className="flex items-center gap-2 font-medium">
              <CalendarRange size={18} className="shrink-0" />
              شهر الرواتب {header.period}: من <span dir="ltr">{header.startDate}</span> إلى <span dir="ltr">{header.endDate}</span>
            </p>
            <p className="flex items-start gap-2">
              <Info size={18} className="mt-0.5 shrink-0" />
              <span>
                {header.runs.length === 0
                  ? `مفيش مسيرات ${header.includeDraft ? '' : 'معتمدة أو مصروفة '}داخلة في الشهر ده.`
                  : <>الأرقام من: {header.runs.map((run) => `${run.name || `مسير #${run.id}`} (${RUN_STATUS_LABELS[run.status] ?? run.status})`).join('، ')}.</>}
                {' '}الفرع والقسم ومركز التكلفة زي ما كانوا وقت المسير، والموظف اللي اتعكس صرفه مش محسوب.
                {note ? <> {note}</> : null}
              </span>
            </p>
            {header.pendingRuns.length > 0 && (
              <p className="flex items-start gap-2 text-amber-800">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <span>
                  فيه {header.pendingRuns.length} مسير لسه ما اتعتمدش ومش داخل الأرقام ({header.pendingRuns.map((run) => run.name || `مسير #${run.id}`).join('، ')}) —
                  علّم «اعرض كمان المسيرات اللي لسه ما اتعتمدتش» لو عايز تشوفه.
                </span>
              </p>
            )}
          </div>
        )}

        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2 fr-no-print">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : header && children}
      </div>

      <style>{`
        .fr-print-only { display: none; }
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body * { visibility: hidden; }
          .fr-print, .fr-print * { visibility: visible; }
          .fr-print { position: absolute; top: 0; right: 0; left: 0; background: #fff; color: #000; }
          .fr-no-print { display: none !important; }
          .fr-print-only { display: block !important; }
          .fr-print .card { box-shadow: none !important; border: 1px solid #ddd; padding: 6px !important; break-inside: avoid; }
          .fr-print .overflow-x-auto { overflow: visible !important; }
          .fr-print table { font-size: 8px; width: 100%; border-collapse: collapse; }
          .fr-print th, .fr-print td { padding: 2px 3px !important; border: 1px solid #ccc; white-space: nowrap; }
          .fr-print tr { break-inside: avoid; }
          .fr-print thead { display: table-header-group; }
          .fr-print tfoot { display: table-row-group; }
        }
      `}</style>
    </MainLayout>
  )
}

export function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
  )
}

export function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <th className={`text-right p-3 font-medium whitespace-nowrap ${className}`}>{children}</th>
}

export function EmptyState({ text }: { text: string }) {
  return <div className="card text-center py-12 text-gray-500">{text}</div>
}
