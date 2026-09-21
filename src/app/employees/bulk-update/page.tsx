'use client'

// تحديث بيانات مجموعة موظفين من ملف Excel أو CSV بكود الموظف:
// 1) نزّل القالب بالحقول اللي عايزها (ولو عايز: مملي ببيانات موظفين مختارين)  2) ارفع الملف → معاينة بكل تغيير والأخطاء (مفيش حفظ)
// 3) طبّق الصفوف السليمة بس — كل موظف لوحده بنفس قواعد وسجلات تعديل ملف الموظف.
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import {
  AlertTriangle, ArrowRight, CheckCircle2, Download, FileSpreadsheet, Info, Loader2, RefreshCw, Upload, XCircle,
} from 'lucide-react'
import {
  ApiError, can, fetchBranches, fetchDepartments, fetchEmployees, fetchTeams, getCurrentUser, getToken, lockedBranchIdOf,
  type ApiBranch, type ApiDepartment, type ApiEmployee, type ApiTeam,
} from '@/lib/api'
import { csvDateStamp, downloadCsv } from '@/lib/csv'
import { localToday } from '@/lib/dates'
import { OrgTargetPicker, initialOrgTarget, resolveOrgTarget, type OrgTarget } from '@/components/OrgTargetPicker'
import {
  BULK_CLEAR_WORD, BULK_FIELD_GROUPS, BULK_FIELDS, BULK_UPDATE_MAX_ROWS, type BulkFieldKey,
} from '../../../../api/src/employees/employee-bulk-update.fields'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'
// التطبيق على دفعات: كل طلب 100 صف عشان التقدم يبان والطلب مايطولش
const APPLY_BATCH = 100
const PAGE = 200

interface PreviewRow {
  row: number
  code: string
  employeeId: number | null
  employeeName: string | null
  status: 'ready' | 'unchanged' | 'error'
  changes: Array<{ field: string; label: string; old: string | null; new: string | null }>
  errors: string[]
  warnings: string[]
  salaryMonth: string | null
  branchChange: boolean
}
interface Preview {
  fileName: string
  format: 'xlsx' | 'csv'
  currentPayrollPeriod: string | null
  columns: Array<{ key: string; header: string }>
  ignoredColumns: string[]
  fileErrors: string[]
  summary: { total: number; ready: number; unchanged: number; error: number }
  needs: { salary: boolean; salaryMonth: boolean; org: boolean }
  rows: PreviewRow[]
}
interface ApplyRow { row: number; code: string; employeeName: string | null; status: 'applied' | 'failed' | 'skipped'; changes: number; message: string | null }

const GENERIC: Record<number, string> = {
  401: 'انتهت الجلسة — سجّل الدخول مرة أخرى',
  403: 'ليست لديك صلاحية لتنفيذ هذا الإجراء',
  413: 'حجم الملف أكبر من المسموح (5 ميجا)',
}
async function request(path: string, init: RequestInit): Promise<Response> {
  const token = getToken()
  let res: Response
  try {
    res = await fetch(`${API_BASE}/employees/bulk-update/${path}`, {
      ...init, headers: { ...(init.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
  } catch {
    throw new ApiError(0, 'تعذر الاتصال بالخادم — تحقق من الاتصال ثم أعد المحاولة')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message = Array.isArray(body?.message) ? body.message.join('، ') : String(body?.message ?? '')
    throw new ApiError(res.status, /[؀-ۿ]/.test(message) ? message : GENERIC[res.status] ?? `تعذر تنفيذ الطلب (${res.status})`)
  }
  return res
}
const errorText = (error: unknown) => error instanceof Error ? error.message : 'حصل خطأ غير متوقع'

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function fileNameOf(res: Response, fallback: string) {
  const header = res.headers.get('content-disposition') ?? ''
  const match = /filename\*=UTF-8''([^;]+)/i.exec(header)
  try { return match ? decodeURIComponent(match[1]) : fallback } catch { return fallback }
}

const STATUS_STYLE: Record<PreviewRow['status'], { label: string; className: string }> = {
  ready: { label: 'جاهز', className: 'bg-green-100 text-green-700' },
  unchanged: { label: 'من غير تغيير', className: 'bg-gray-100 text-gray-600' },
  error: { label: 'فيه أخطاء', className: 'bg-red-100 text-red-700' },
}
const RESULT_STYLE: Record<ApplyRow['status'], { label: string; className: string }> = {
  applied: { label: 'اتحفظ', className: 'bg-green-100 text-green-700' },
  failed: { label: 'فشل', className: 'bg-red-100 text-red-700' },
  skipped: { label: 'اتساب', className: 'bg-gray-100 text-gray-600' },
}

export default function EmployeesBulkUpdatePage() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [canSalary, setCanSalary] = useState(false)
  const [lockedBranchId, setLockedBranchId] = useState<number | null>(null)
  const [error, setError] = useState('')

  // 1) القالب
  const [picked, setPicked] = useState<BulkFieldKey[]>(['phone', 'email'])
  const [prefill, setPrefill] = useState(false)
  const [target, setTarget] = useState<OrgTarget>(initialOrgTarget())
  const [org, setOrg] = useState<{ branches: ApiBranch[]; departments: ApiDepartment[]; teams: ApiTeam[]; employees: ApiEmployee[] } | null>(null)
  const [downloading, setDownloading] = useState<'' | 'xlsx' | 'csv'>('')

  // 2) الملف والمعاينة
  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [filter, setFilter] = useState<'all' | PreviewRow['status']>('all')
  const [shown, setShown] = useState(PAGE)
  const [options, setOptions] = useState({ salaryMonth: '', salaryReason: '', salaryEvidence: '', orgEffectiveFrom: localToday(), orgReason: '' })

  // 3) التطبيق
  const [applying, setApplying] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [results, setResults] = useState<ApplyRow[] | null>(null)

  useEffect(() => {
    setAllowed(can('employees.edit'))
    setCanSalary(can('payroll.approve'))
    const user = getCurrentUser()
    const locked = lockedBranchIdOf(user)
    setLockedBranchId(locked)
    setTarget(initialOrgTarget(locked))
  }, [])

  // بيانات منتقي الموظفين بتتحمل لما يختار «املى القالب» بس
  useEffect(() => {
    if (!prefill || org) return
    Promise.all([fetchBranches(), fetchDepartments(), fetchTeams().catch(() => []), fetchEmployees()])
      .then(([branches, departments, teams, employees]) => setOrg({ branches, departments, teams, employees }))
      .catch(cause => setError(errorText(cause)))
  }, [prefill, org])

  const fieldGroups = useMemo(() => BULK_FIELD_GROUPS
    .filter(group => group.key !== 'salary' || canSalary)
    .map(group => ({ ...group, fields: BULK_FIELDS.filter(field => field.group === group.key) })), [canSalary])
  const targetIds = useMemo(() => org ? resolveOrgTarget(target, org.employees) : [], [org, target])
  const toggle = (key: BulkFieldKey) => setPicked(list => list.includes(key) ? list.filter(item => item !== key) : [...list, key])
  const toggleGroup = (keys: BulkFieldKey[]) => setPicked(list => keys.every(key => list.includes(key))
    ? list.filter(key => !keys.includes(key)) : Array.from(new Set([...list, ...keys])))

  const downloadTemplate = async (format: 'xlsx' | 'csv') => {
    setError('')
    if (!picked.length) { setError('اختار حقل واحد على الأقل للقالب'); return }
    if (prefill && targetIds.length > BULK_UPDATE_MAX_ROWS) { setError(`القالب بحد أقصى ${BULK_UPDATE_MAX_ROWS} موظف — صغّر الاختيار`); return }
    setDownloading(format)
    try {
      const res = await request('template', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: picked, format, ...(prefill ? { employeeIds: targetIds } : {}) }) })
      saveBlob(await res.blob(), fileNameOf(res, `قالب-تحديث-بيانات-الموظفين-${csvDateStamp()}.${format}`))
    } catch (cause) {
      setError(errorText(cause))
    } finally {
      setDownloading('')
    }
  }

  const formFor = (extra: Record<string, string> = {}) => {
    const form = new FormData()
    form.append('file', file!)
    const values: Record<string, string> = {
      salaryMonth: options.salaryMonth, salaryReason: options.salaryReason, salaryEvidence: options.salaryEvidence,
      orgEffectiveFrom: options.orgEffectiveFrom, orgReason: options.orgReason, ...extra,
    }
    for (const [key, value] of Object.entries(values)) if (value.trim()) form.append(key, value.trim())
    return form
  }

  const runPreview = async () => {
    if (!file) { setError('اختار الملف الأول'); return }
    setError('')
    setPreviewing(true)
    setResults(null)
    try {
      const res = await request('preview', { method: 'POST', body: formFor() })
      const data: Preview = await res.json()
      setPreview(data)
      setFilter(data.summary.error ? 'error' : 'all')
      setShown(PAGE)
      if (data.currentPayrollPeriod) setOptions(value => value.salaryMonth ? value : { ...value, salaryMonth: data.currentPayrollPeriod! })
    } catch (cause) {
      setPreview(null)
      setError(errorText(cause))
    } finally {
      setPreviewing(false)
    }
  }

  const readyRows = preview?.rows.filter(row => row.status === 'ready') ?? []
  const optionIssue = (() => {
    if (!preview) return ''
    if (preview.needs.salary) {
      if (preview.needs.salaryMonth && !options.salaryMonth) return 'اختار «يسري من راتب شهر» لتغييرات الراتب'
      if (!options.salaryReason.trim()) return 'اكتب سبب تغيير الراتب'
      if (!options.salaryEvidence.trim()) return 'اكتب مرجع قرار تغيير الراتب'
    }
    if (preview.needs.org) {
      if (!options.orgEffectiveFrom) return 'اختار تاريخ سريان نقل الفرع'
      if (options.orgReason.trim().length < 3) return 'اكتب سبب نقل الفرع'
    }
    return ''
  })()

  const apply = async () => {
    if (!preview || !file || !readyRows.length || optionIssue) return
    if (!window.confirm(`هيتحفظ ${readyRows.length} صف (كل موظف لوحده). الصفوف اللي فيها أخطاء أو من غير تغيير مش هتتلمس. نكمل؟`)) return
    setError('')
    setApplying(true)
    const collected: ApplyRow[] = []
    const numbers = readyRows.map(row => row.row)
    setProgress({ done: 0, total: numbers.length })
    try {
      for (let start = 0; start < numbers.length; start += APPLY_BATCH) {
        const batch = numbers.slice(start, start + APPLY_BATCH)
        const res = await request('apply', { method: 'POST', body: formFor({ rows: batch.join(',') }) })
        const data: { rows: ApplyRow[] } = await res.json()
        collected.push(...data.rows)
        setProgress({ done: Math.min(numbers.length, start + batch.length), total: numbers.length })
        setResults([...collected])
      }
    } catch (cause) {
      setError(`${errorText(cause)}${collected.length ? ` — اتحفظ ${collected.filter(row => row.status === 'applied').length} صف قبل ما يقف` : ''}`)
    } finally {
      setApplying(false)
      setResults([...collected])
    }
  }

  const downloadPreviewErrors = () => {
    if (!preview) return
    downloadCsv(`أخطاء-تحديث-الموظفين-${csvDateStamp()}.csv`, ['الصف', 'كود الموظف', 'الموظف', 'الأخطاء'],
      preview.rows.filter(row => row.status === 'error').map(row => [row.row, row.code, row.employeeName ?? '', row.errors.join(' — ')]))
  }
  const downloadResults = () => {
    if (!results) return
    downloadCsv(`نتيجة-تحديث-الموظفين-${csvDateStamp()}.csv`, ['الصف', 'كود الموظف', 'الموظف', 'النتيجة', 'السبب'],
      results.map(row => [row.row, row.code, row.employeeName ?? '', RESULT_STYLE[row.status].label, row.message ?? '']))
  }

  const visible = (preview?.rows ?? []).filter(row => filter === 'all' || row.status === filter)
  const counts = results ? {
    applied: results.filter(row => row.status === 'applied').length,
    failed: results.filter(row => row.status === 'failed').length,
    skipped: results.filter(row => row.status === 'skipped').length,
  } : null

  if (allowed === false) {
    return (
      <MainLayout>
        <div className="card p-8 text-center text-gray-600">الشاشة دي محتاجة صلاحية تعديل بيانات الموظفين</div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/employees" className="hover:text-primary-600">إدارة الموظفين</Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">تحديث جماعي من Excel</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-800">تحديث جماعي من Excel</h1>
          <p className="text-gray-500 mt-1">
            عدّل بيانات مجموعة موظفين مرة واحدة من ملف بكود الموظف — بتشوف كل تغيير قبل ما يتحفظ
          </p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* 1) القالب */}
        <section className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary-500 text-white text-sm flex items-center justify-center">1</span>
            <h2 className="font-bold text-gray-800">نزّل القالب واختار الحقول اللي هتعدّلها</h2>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {fieldGroups.map(group => {
              const keys = group.fields.map(field => field.key)
              const all = keys.every(key => picked.includes(key))
              return (
                <div key={group.key} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-700 text-sm">{group.label}</span>
                    <button type="button" className="text-xs text-primary-600 hover:underline" onClick={() => toggleGroup(keys)}>
                      {all ? 'شيل الكل' : 'حدد الكل'}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {group.fields.map(field => (
                      <label key={field.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300" checked={picked.includes(field.key)}
                          onChange={() => toggle(field.key)} />
                        <span>{field.label}</span>
                      </label>
                    ))}
                  </div>
                  {group.key === 'salary' && (
                    <p className="text-xs text-gray-500 mt-2">بيتسجل تغيير مؤرخ في سجل الأجر «يسري من راتب شهر»</p>
                  )}
                </div>
              )
            })}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-gray-300" checked={prefill} onChange={event => setPrefill(event.target.checked)} />
            املى القالب بالبيانات الحالية لموظفين أختارهم
          </label>
          {prefill && (
            org ? (
              <OrgTargetPicker value={target} onChange={setTarget} branches={org.branches} departments={org.departments}
                teams={org.teams} employees={org.employees} lockedBranchId={lockedBranchId} disabled={!!downloading} />
            ) : (
              <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> بنحمّل الفروع والموظفين…</p>
            )
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary flex items-center gap-2 disabled:opacity-50" disabled={!!downloading || !picked.length}
              onClick={() => downloadTemplate('xlsx')}>
              {downloading === 'xlsx' ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
              تنزيل قالب Excel
            </button>
            <button type="button" className="btn-secondary flex items-center gap-2 disabled:opacity-50" disabled={!!downloading || !picked.length}
              onClick={() => downloadTemplate('csv')}>
              {downloading === 'csv' ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              تنزيل CSV
            </button>
            <span className="text-xs text-gray-500">
              {picked.length} حقل{prefill ? ` — ${targetIds.length} موظف` : ' — قالب فاضي'}
            </span>
          </div>
          <div className="text-sm text-blue-800 bg-blue-50 rounded-xl p-3 flex gap-2">
            <Info size={18} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>عمود «كود الموظف» إجباري، والخلية الفاضية معناها «من غير تغيير». عشان تمسح قيمة اختيارية اكتب «{BULK_CLEAR_WORD}».</p>
              <p>الفرع والقسم والفريق بالاسم زي ما هو في النظام، والمدير المباشر بكوده. Excel أحسن من CSV لأنه بيحافظ على الأصفار في أول الأرقام.</p>
              <p>الحد {BULK_UPDATE_MAX_ROWS} صف في الملف.</p>
            </div>
          </div>
        </section>

        {/* 2) الرفع والمعاينة */}
        <section className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary-500 text-white text-sm flex items-center justify-center">2</span>
            <h2 className="font-bold text-gray-800">ارفع الملف وشوف المعاينة</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input ref={fileInput} type="file" accept=".xlsx,.csv" className="hidden"
              onChange={event => { setFile(event.target.files?.[0] ?? null); setPreview(null); setResults(null); setError('') }} />
            <button type="button" className="btn-secondary flex items-center gap-2" disabled={previewing || applying} onClick={() => fileInput.current?.click()}>
              <Upload size={18} /> {file ? 'غيّر الملف' : 'اختار الملف (.xlsx أو .csv)'}
            </button>
            {file && <span className="text-sm text-gray-700" dir="auto">{file.name}</span>}
            <button type="button" className="btn-primary flex items-center gap-2 disabled:opacity-50" disabled={!file || previewing || applying} onClick={runPreview}>
              {previewing ? <Loader2 size={18} className="animate-spin" /> : preview ? <RefreshCw size={18} /> : <FileSpreadsheet size={18} />}
              {preview ? 'اعمل المعاينة تاني' : 'معاينة'}
            </button>
          </div>

          {preview && (
            <div className="space-y-4">
              {preview.fileErrors.length > 0 && (
                <div className="bg-red-50 text-red-700 rounded-xl p-4 space-y-1">
                  <p className="font-medium">الملف محتاج تعديل قبل أي حفظ:</p>
                  {preview.fileErrors.map(message => <p key={message}>• {message}</p>)}
                </div>
              )}
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  الأعمدة اللي هتتقري: {preview.columns.filter(column => !['code', 'name'].includes(column.key)).map(column => column.header).join('، ') || '—'}
                </p>
                {preview.ignoredColumns.length > 0 && (
                  <p className="text-amber-700">أعمدة مش معروفة واتجاهلت: {preview.ignoredColumns.join('، ')}</p>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {([['all', 'كل الصفوف', preview.summary.total, 'text-gray-800'], ['ready', 'جاهز للحفظ', preview.summary.ready, 'text-green-600'],
                  ['error', 'فيه أخطاء', preview.summary.error, 'text-red-600'], ['unchanged', 'من غير تغيير', preview.summary.unchanged, 'text-gray-500']] as const)
                  .map(([key, label, value, color]) => (
                    <button key={key} type="button" onClick={() => { setFilter(key); setShown(PAGE) }}
                      className={`card p-3 text-right transition-colors ${filter === key ? 'ring-2 ring-primary-400' : 'hover:bg-gray-50'}`}>
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    </button>
                  ))}
              </div>

              {(preview.needs.salary || preview.needs.org) && preview.summary.ready > 0 && (
                <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3">
                  {preview.needs.salary && (
                    <div className="grid md:grid-cols-3 gap-3">
                      <div>
                        <label className="label">يسري من راتب شهر</label>
                        <input type="month" className="input w-full" value={options.salaryMonth} max={preview.currentPayrollPeriod ?? undefined}
                          onChange={event => setOptions({ ...options, salaryMonth: event.target.value })} />
                        <p className="text-xs text-gray-500 mt-1">عمود «يسري من راتب شهر» في الصف يغلب الاختيار ده</p>
                      </div>
                      <div>
                        <label className="label">سبب تغيير الراتب</label>
                        <input className="input w-full" maxLength={500} value={options.salaryReason} placeholder="مثلاً: الزيادة السنوية"
                          onChange={event => setOptions({ ...options, salaryReason: event.target.value })} />
                      </div>
                      <div>
                        <label className="label">مرجع القرار</label>
                        <input className="input w-full" maxLength={200} value={options.salaryEvidence} placeholder="رقم القرار أو الخطاب"
                          onChange={event => setOptions({ ...options, salaryEvidence: event.target.value })} />
                      </div>
                    </div>
                  )}
                  {preview.needs.org && (
                    <div className="grid md:grid-cols-3 gap-3">
                      <div>
                        <label className="label">تاريخ سريان نقل الفرع</label>
                        <input type="date" className="input w-full" value={options.orgEffectiveFrom} max={localToday()}
                          onChange={event => setOptions({ ...options, orgEffectiveFrom: event.target.value })} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="label">سبب النقل</label>
                        <input className="input w-full" maxLength={500} value={options.orgReason}
                          onChange={event => setOptions({ ...options, orgReason: event.target.value })} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn-success flex items-center gap-2 disabled:opacity-50"
                  disabled={applying || previewing || !readyRows.length || preview.fileErrors.length > 0 || !!optionIssue} onClick={apply}>
                  {applying ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  احفظ {readyRows.length} صف جاهز
                </button>
                {preview.summary.error > 0 && (
                  <button type="button" className="btn-secondary flex items-center gap-2" onClick={downloadPreviewErrors}>
                    <Download size={18} /> تقرير الأخطاء
                  </button>
                )}
                {optionIssue && readyRows.length > 0 && <span className="text-sm text-amber-700">{optionIssue}</span>}
                {progress && applying && (
                  <span className="text-sm text-gray-600">بيتحفظ… {progress.done} من {progress.total}</span>
                )}
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-2 text-right w-14">الصف</th>
                      <th className="p-2 text-right">الموظف</th>
                      <th className="p-2 text-right">التغييرات (القديم ← الجديد)</th>
                      <th className="p-2 text-right">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.slice(0, shown).map(row => (
                      <tr key={row.row} className="border-t border-gray-100 align-top">
                        <td className="p-2 text-gray-500" dir="ltr">{row.row}</td>
                        <td className="p-2">
                          <div className="font-medium text-gray-800">{row.employeeName ?? '—'}</div>
                          <div className="text-xs text-gray-500" dir="ltr">{row.code || '—'}</div>
                          <span className={`badge text-xs mt-1 inline-block ${STATUS_STYLE[row.status].className}`}>{STATUS_STYLE[row.status].label}</span>
                        </td>
                        <td className="p-2">
                          {row.changes.length === 0 ? <span className="text-gray-400">—</span> : (
                            <ul className="space-y-0.5">
                              {row.changes.map(change => (
                                <li key={change.field}>
                                  <span className="text-gray-500">{change.label}: </span>
                                  <span className="text-gray-400 line-through" dir="auto">{change.old ?? '—'}</span>
                                  <span className="text-gray-400 mx-1">←</span>
                                  <span className="text-green-700 font-medium" dir="auto">{change.new ?? '—'}</span>
                                </li>
                              ))}
                              {row.salaryMonth && <li className="text-xs text-gray-500">يسري من راتب شهر {row.salaryMonth}</li>}
                            </ul>
                          )}
                        </td>
                        <td className="p-2 space-y-1">
                          {row.errors.map(message => (
                            <p key={message} className="text-red-700 flex gap-1"><XCircle size={14} className="shrink-0 mt-0.5" />{message}</p>
                          ))}
                          {row.warnings.map(message => (
                            <p key={message} className="text-amber-700 flex gap-1"><AlertTriangle size={14} className="shrink-0 mt-0.5" />{message}</p>
                          ))}
                        </td>
                      </tr>
                    ))}
                    {visible.length === 0 && (
                      <tr><td colSpan={4} className="p-6 text-center text-gray-400">مفيش صفوف هنا</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {visible.length > shown && (
                <button type="button" className="btn-secondary text-sm" onClick={() => setShown(value => value + PAGE)}>
                  اعرض {Math.min(PAGE, visible.length - shown)} صف كمان (من {visible.length})
                </button>
              )}
            </div>
          )}
        </section>

        {/* 3) النتيجة */}
        {results && counts && (
          <section className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-primary-500 text-white text-sm flex items-center justify-center">3</span>
              <h2 className="font-bold text-gray-800">النتيجة</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-3"><p className="text-xs text-gray-500">اتحفظ</p><p className="text-2xl font-bold text-green-600">{counts.applied}</p></div>
              <div className="card p-3"><p className="text-xs text-gray-500">فشل</p><p className="text-2xl font-bold text-red-600">{counts.failed}</p></div>
              <div className="card p-3"><p className="text-xs text-gray-500">اتساب</p><p className="text-2xl font-bold text-gray-500">{counts.skipped}</p></div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn-secondary flex items-center gap-2" onClick={downloadResults}>
                <Download size={18} /> تنزيل تقرير النتيجة
              </button>
              {!applying && (
                <button type="button" className="btn-secondary flex items-center gap-2" onClick={runPreview}>
                  <RefreshCw size={18} /> اعمل معاينة للملف تاني
                </button>
              )}
            </div>
            {results.some(row => row.status === 'failed') && (
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr><th className="p-2 text-right w-14">الصف</th><th className="p-2 text-right">الموظف</th><th className="p-2 text-right">السبب</th></tr>
                  </thead>
                  <tbody>
                    {results.filter(row => row.status === 'failed').map(row => (
                      <tr key={row.row} className="border-t border-gray-100">
                        <td className="p-2 text-gray-500" dir="ltr">{row.row}</td>
                        <td className="p-2">{row.employeeName ?? row.code}</td>
                        <td className="p-2 text-red-700">{row.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </MainLayout>
  )
}
