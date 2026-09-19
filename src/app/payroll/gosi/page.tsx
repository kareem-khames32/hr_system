'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import { downloadCsv } from '@/lib/csv'
import { formatMoney } from '@/lib/money'
import { PayrollPeriodSelect, usePayrollMonthContext } from '@/components/DayRangeFilter'
import {
  fetchSocialInsuranceReport, fetchSocialInsuranceSettings, INSURANCE_CATEGORY_LABELS, INSURANCE_SYSTEM_LABELS, saveSocialInsuranceSettings,
  type SocialInsuranceReport, type SocialInsuranceSettings, type SocialInsuranceSettingsView,
} from '@/lib/social-insurance-api'

// التأمينات (16 سبتمبر): إعدادات النظامين (السعودية والمصرية) لكل الشركة + تقرير الشهر بحصة الموظف وحصة صاحب العمل.
// نظام كل فرع بيتحدد من «الإعدادات ← الفروع»، وحصة الموظف بتتخصم في المسير سطر «التأمينات الاجتماعية (حصة الموظف)».

type Field = keyof SocialInsuranceSettings
const SAUDI_FIELDS: Array<{ key: Field; label: string; pct?: boolean }> = [
  { key: 'saudiEmployeePct', label: 'السعودي — حصة الموظف %', pct: true },
  { key: 'saudiEmployerPct', label: 'السعودي — حصة صاحب العمل %', pct: true },
  { key: 'nonSaudiEmployeePct', label: 'غير السعودي — حصة الموظف %', pct: true },
  { key: 'nonSaudiEmployerPct', label: 'غير السعودي — حصة صاحب العمل %', pct: true },
  { key: 'saudiMinSalary', label: 'الحد الأدنى للأجر التأميني' },
  { key: 'saudiMaxSalary', label: 'الحد الأقصى للأجر التأميني' },
]
const EGYPTIAN_FIELDS: Array<{ key: Field; label: string; pct?: boolean }> = [
  { key: 'egyptianEmployeePct', label: 'حصة الموظف %', pct: true },
  { key: 'egyptianEmployerPct', label: 'حصة صاحب العمل %', pct: true },
  { key: 'egyptianMinSalary', label: 'الحد الأدنى للأجر التأميني' },
  { key: 'egyptianMaxSalary', label: 'الحد الأقصى للأجر التأميني' },
]

const Th =({ children, center }: { children: React.ReactNode; center?: boolean }) =>
  <th className={`px-4 py-3 ${center ? 'text-center' : 'text-right'} text-sm font-medium text-gray-600 whitespace-nowrap`}>{children}</th>

function reportTable(report: SocialInsuranceReport) {
  const header = ['كود الموظف', 'الموظف', 'الفرع', 'النظام', 'الفئة', 'رقم التأمينات', 'الأجر التأميني', 'نسبة الموظف %', 'حصة الموظف', 'نسبة صاحب العمل %', 'حصة صاحب العمل', 'الإجمالي', 'المصدر']
  const rows = report.rows.map(row => [row.employeeCode, row.fullName, row.branchName ?? '', INSURANCE_SYSTEM_LABELS[row.system], INSURANCE_CATEGORY_LABELS[row.category ?? ''] ?? '',
    row.gosiNumber ?? '', row.insuredSalary.toFixed(2), row.employeePct, row.employeeShare.toFixed(2), row.employerPct, row.employerShare.toFixed(2),
    ((Math.round(row.employeeShare * 100) + Math.round(row.employerShare * 100)) / 100).toFixed(2), row.source === 'PAYROLL' ? 'من المسير' : 'تقديري من الملف'])
  rows.push(['', 'الإجمالي', '', '', '', '', report.totals.insuredSalary, '', report.totals.employeeShare, '', report.totals.employerShare, report.totals.total, ''])
  return { header, rows }
}

function downloadExcel(filename: string, header: string[], rows: unknown[][]) {
  const escape = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head>`
    + `<body dir="rtl"><table border="1"><tr>${header.map(cell => `<th>${escape(cell)}</th>`).join('')}</tr>`
    + rows.map(row => `<tr>${row.map(cell => `<td>${escape(cell)}</td>`).join('')}</tr>`).join('') + '</table></body></html>'
  const url = URL.createObjectURL(new Blob([String.fromCharCode(0xfeff) + html], { type: 'application/vnd.ms-excel;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url; link.download = filename
  document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function SettingsCard({ view, onSaved }: { view: SocialInsuranceSettingsView; onSaved: (view: SocialInsuranceSettingsView) => void }) {
  const [draft, setDraft] = useState<Record<Field, string>>(() => Object.fromEntries(Object.entries(view.settings).map(([key, value]) => [key, String(value)])) as Record<Field, string>)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const save = async () => {
    setSaving(true); setMessage(null)
    try {
      const payload = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, Number(value)])) as unknown as SocialInsuranceSettings
      if (Object.values(payload).some(value => !Number.isFinite(value))) throw new Error('كل النسب والحدود لازم تكون أرقام')
      onSaved(await saveSocialInsuranceSettings(payload))
      setMessage({ ok: true, text: 'اتحفظت الإعدادات — هتسري على المسيرات اللي تتحسب من دلوقتي' })
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'تعذر حفظ الإعدادات' })
    } finally { setSaving(false) }
  }
  const input = (field: { key: Field; label: string; pct?: boolean }) => {
    const stillDefault = !view.reviewedAt && Number(draft[field.key]) === view.defaults[field.key]
    return (
      <div key={field.key}>
        <label className="label flex items-center gap-2">
          {field.label}
          {stillDefault && <span className="badge badge-warning">راجعها</span>}
        </label>
        <input type="number" min={0} max={field.pct ? 100 : undefined} step="0.01" className="input w-full" dir="ltr" disabled={!view.canEdit}
          value={draft[field.key]} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })} />
      </div>
    )
  }
  const branchesOf = (system: 'SAUDI' | 'EGYPTIAN') => view.branches.filter(branch => branch.insuranceSystem === system).map(branch => branch.name)
  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">إعدادات التأمينات</h2>
          <p className="text-sm text-gray-500 mt-1">
            حصة الموظف = الأجر التأميني (بين الحد الأدنى والأقصى) × النسبة، والفلوس بتتقص لقرشين. الأجر التأميني من ملف الموظف، ولو مش مسجل بيتحسب على الأساسي.
            {' '}نظام كل فرع من <Link href="/settings/branches" className="text-primary-600 hover:underline">الفروع</Link>.
          </p>
          {!view.reviewedAt && <p className="text-sm text-warning-700 mt-1">القيم دي افتراضية — راجعها واحفظها قبل أول مسير.</p>}
        </div>
        {view.canEdit
          ? <button type="button" onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'جارٍ الحفظ…' : 'حفظ الإعدادات'}</button>
          : <span className="text-sm text-gray-500">الإعدادات دي لكل الشركة — بتتعدل من حساب على مستوى الشركة</span>}
      </div>
      {message && <p className={`text-sm ${message.ok ? 'text-success-700' : 'text-red-600'}`}>{message.text}</p>}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="font-medium text-gray-700">التأمينات السعودية (GOSI)</h3>
          <p className="text-xs text-gray-400">الفروع: {branchesOf('SAUDI').join('، ') || 'لا يوجد'}</p>
          <div className="grid grid-cols-2 gap-3">{SAUDI_FIELDS.map(input)}</div>
        </div>
        <div className="space-y-3">
          <h3 className="font-medium text-gray-700">التأمينات المصرية</h3>
          <p className="text-xs text-gray-400">الفروع: {branchesOf('EGYPTIAN').join('، ') || 'لا يوجد'}</p>
          <div className="grid grid-cols-2 gap-3">{EGYPTIAN_FIELDS.map(input)}</div>
        </div>
      </div>
    </div>
  )
}

export default function PayrollGosiPage() {
  const [view, setView] = useState<SocialInsuranceSettingsView | null>(null)
  // التقرير على مسيرات شهر رواتب بالاسم — الافتراضي شهر الرواتب الجاري (مش الشهر التقويمي)، والاختيار بيوضّح أيامه
  const payrollMonth = usePayrollMonthContext()
  const [period, setPeriod] = useState('')
  const [branchId, setBranchId] = useState('')
  const [report, setReport] = useState<SocialInsuranceReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = (target = period) => {
    if (!target) return
    setLoading(true); setError(null)
    fetchSocialInsuranceReport(target, branchId ? Number(branchId) : null)
      .then(setReport)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل تقرير التأمينات'))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    fetchSocialInsuranceSettings().then(setView).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل إعدادات التأمينات'))
  }, [])
  useEffect(() => {
    if (!payrollMonth || period) return
    setPeriod(payrollMonth.period)
    load(payrollMonth.period)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payrollMonth])

  const exportRows = (kind: 'csv' | 'xls') => {
    if (!report) return
    const table = reportTable(report)
    if (kind === 'csv') downloadCsv(`social-insurance-${report.period}.csv`, table.header, table.rows)
    else downloadExcel(`social-insurance-${report.period}.xls`, table.header, table.rows)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">التأمينات</h1>
            <p className="text-gray-500 mt-1">نسب التأمينات السعودية والمصرية، وتقرير الشهر بحصة الموظف وحصة صاحب العمل</p>
          </div>
          <Link href="/payroll" className="btn-secondary">العودة للرواتب</Link>
        </div>

        {view && <SettingsCard key={view.reviewedAt ?? 'defaults'} view={view} onSaved={(next) => { setView(next); load() }} />}

        <div className="card">
          <div className="flex flex-wrap items-end gap-4">
            <PayrollPeriodSelect id="gosi-period" label="شهر الرواتب" value={period} onChange={setPeriod} className="w-56"
              cycleStartDay={payrollMonth?.cycleStartDay} today={payrollMonth?.today} />
            {view && view.branches.length > 1 && (
              <div>
                <label className="label">الفرع</label>
                <select className="input" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
                  <option value="">كل الفروع</option>
                  {view.branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name} — {INSURANCE_SYSTEM_LABELS[branch.insuranceSystem]}</option>)}
                </select>
              </div>
            )}
            <button type="button" onClick={() => load()} disabled={loading || !period} className="btn-primary disabled:opacity-50">عرض</button>
            <button type="button" onClick={() => exportRows('csv')} disabled={!report?.rows.length} className="btn-secondary disabled:opacity-50">تصدير CSV</button>
            <button type="button" onClick={() => exportRows('xls')} disabled={!report?.rows.length} className="btn-secondary disabled:opacity-50">تصدير Excel</button>
          </div>
        </div>

        {error && <div className="card border border-red-200 text-red-700 text-sm">{error}</div>}
        {loading ? <p className="text-sm text-gray-400">جارٍ التحميل…</p> : report && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card"><p className="text-sm text-gray-500">الموظفين المسجلين</p><p className="text-2xl font-bold text-gray-800">{report.totals.employees}</p></div>
              <div className="card"><p className="text-sm text-gray-500">حصة الموظفين</p><p className="text-2xl font-bold text-gray-800">{formatMoney(report.totals.employeeShare)}</p></div>
              <div className="card"><p className="text-sm text-gray-500">حصة صاحب العمل</p><p className="text-2xl font-bold text-gray-800">{formatMoney(report.totals.employerShare)}</p></div>
              <div className="card"><p className="text-sm text-gray-500">إجمالي الاشتراكات</p><p className="text-2xl font-bold text-primary-700">{formatMoney(report.totals.total)}</p></div>
            </div>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr><Th>الموظف</Th><Th>الفرع</Th><Th>رقم التأمينات</Th><Th center>الأجر التأميني</Th><Th center>حصة الموظف</Th><Th center>حصة صاحب العمل</Th><Th center>المصدر</Th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.rows.map(row => (
                    <tr key={row.employeeId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/employees/${row.employeeId}`} className="font-medium text-gray-800 hover:text-primary-600">{row.fullName}</Link>
                        <p className="text-xs text-gray-400">{row.employeeCode} — {INSURANCE_CATEGORY_LABELS[row.category ?? ''] ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{row.branchName ?? '—'}<p className="text-xs text-gray-400">{INSURANCE_SYSTEM_LABELS[row.system]}</p></td>
                      <td className="px-4 py-3 text-gray-600" dir="ltr">{row.gosiNumber || '—'}</td>
                      <td className="px-4 py-3 text-center">{formatMoney(row.insuredSalary)}{row.salarySource === 'BASIC' && <p className="text-xs text-gray-400">على الأساسي</p>}</td>
                      <td className="px-4 py-3 text-center">{formatMoney(row.employeeShare)}<p className="text-xs text-gray-400">{row.employeePct}%</p></td>
                      <td className="px-4 py-3 text-center">{formatMoney(row.employerShare)}<p className="text-xs text-gray-400">{row.employerPct}%</p></td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${row.source === 'PAYROLL' ? 'badge-success' : 'badge-warning'}`}>{row.source === 'PAYROLL' ? 'من المسير' : 'تقديري'}</span>
                      </td>
                    </tr>
                  ))}
                  {!report.rows.length && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">مفيش موظفين مسجلين في التأمينات في فروع ليها نظام تأمينات</td></tr>
                  )}
                </tbody>
                {report.rows.length > 0 && (
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td className="px-4 py-3" colSpan={3}>الإجمالي</td>
                      <td className="px-4 py-3 text-center">{formatMoney(report.totals.insuredSalary)}</td>
                      <td className="px-4 py-3 text-center">{formatMoney(report.totals.employeeShare)}</td>
                      <td className="px-4 py-3 text-center">{formatMoney(report.totals.employerShare)}</td>
                      <td className="px-4 py-3 text-center">{formatMoney(report.totals.total)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}
