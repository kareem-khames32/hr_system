'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Download, FileSpreadsheet, Printer } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { fetchBankSheet, fetchPayrollRuns, type ApiBankSheet, type ApiPayrollRun } from '@/lib/api'
import { downloadCsv } from '@/lib/csv'
import { formatMoney } from '@/lib/money'

// كشف البنوك (قرار المالك): لكل مسير — مين بيتحوله كام على أي بنك، وكام نقدي، وإجمالي كل بنك.
// حساب الفرع بيشوف مسيرات وموظفي فرعه بس (الخادم بيفلتر).

const runLabel = (run: Pick<ApiPayrollRun, 'name' | 'period'>) => run.name || `مسير ${run.period}`
const HEADER = ['الرقم الوظيفي', 'الاسم', 'طريقة الصرف', 'البنك', 'الآيبان', 'صافي الراتب', 'تحويل بنكي', 'نقدي']

function sheetRows(sheet: ApiBankSheet) {
  return sheet.rows.map(row => [row.employeeCode, row.fullName, row.payMethodLabel, row.bankName ?? '', row.iban ?? '',
    row.netPay.toFixed(2), row.bankAmount.toFixed(2), row.cashAmount.toFixed(2)])
}

function sheetTotals(sheet: ApiBankSheet) {
  return [
    ...sheet.banks.map(bank => [`إجمالي ${bank.bankName}`, `${bank.employees} موظف`, '', '', '', '', bank.total.toFixed(2), '']),
    ['الإجمالي', `${sheet.totals.employees} موظف`, '', '', '', sheet.totals.net.toFixed(2), sheet.totals.bank.toFixed(2), sheet.totals.cash.toFixed(2)],
  ]
}

const fileBase = (sheet: ApiBankSheet) => `كشف-البنوك-${sheet.run.period}-${sheet.run.id}`

// ملف Excel بسيط (جدول HTML يفتحه Excel) — الآيبان نص حتى لا يتحول لرقم، وأي نص يبدأ بـ= + - @ يتحيّد
function downloadExcel(sheet: ApiBankSheet) {
  const escape = (value: unknown) => {
    let text = value == null ? '' : String(value)
    if (/^[=+\-@]/.test(text) && Number.isNaN(Number(text))) text = `'${text}`
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  const row = (cells: unknown[], tag = 'td') => `<tr>${cells.map(cell => `<${tag} style="mso-number-format:'\\@'">${escape(cell)}</${tag}>`).join('')}</tr>`
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body dir="rtl"><table border="1">`
    + row(HEADER, 'th') + sheetRows(sheet).map(cells => row(cells)).join('') + sheetTotals(sheet).map(cells => row(cells)).join('') + '</table></body></html>'
  const url = URL.createObjectURL(new Blob([String.fromCharCode(0xfeff) + html], { type: 'application/vnd.ms-excel;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileBase(sheet)}.xls`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function PayrollBankSheetPage() {
  const [runs, setRuns] = useState<ApiPayrollRun[]>([])
  const [runId, setRunId] = useState('')
  const [sheet, setSheet] = useState<ApiBankSheet | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPayrollRuns()
      .then(list => {
        const usable = list.filter(run => run.status !== 'DRAFT' && run.status !== 'CANCELLED')
          .sort((a, b) => b.period.localeCompare(a.period) || b.id - a.id)
        setRuns(usable)
        const fromLink = new URLSearchParams(window.location.search).get('runId')
        const chosen = usable.find(run => String(run.id) === fromLink) ?? usable[0]
        if (chosen) setRunId(String(chosen.id))
      })
      .catch(cause => setError(cause instanceof Error ? cause.message : 'تعذّر تحميل المسيرات'))
  }, [])

  useEffect(() => {
    if (!runId) { setSheet(null); return }
    let alive = true
    setLoading(true); setError('')
    fetchBankSheet(Number(runId))
      .then(result => { if (alive) setSheet(result) })
      .catch(cause => { if (alive) { setSheet(null); setError(cause instanceof Error ? cause.message : 'تعذّر تحميل كشف البنوك') } })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [runId])

  const empty = !sheet || sheet.rows.length === 0
  const bankRows = useMemo(() => sheet?.rows ?? [], [sheet])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-800">كشف البنوك</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={empty} onClick={() => sheet && downloadCsv(`${fileBase(sheet)}.csv`, HEADER, [...sheetRows(sheet), ...sheetTotals(sheet)])}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50">
              <Download size={18} />
              تصدير ملف
            </button>
            <button type="button" disabled={empty} onClick={() => sheet && downloadExcel(sheet)} className="btn-secondary flex items-center gap-2 disabled:opacity-50">
              <FileSpreadsheet size={18} />
              تصدير إكسل
            </button>
            <button type="button" onClick={() => window.print()} className="btn-secondary flex items-center gap-2">
              <Printer size={18} />
              طباعة
            </button>
          </div>
        </div>

        <div className="card">
          <label className="label">المسير</label>
          <select className="input max-w-md" value={runId} onChange={(e) => setRunId(e.target.value)}>
            {runs.length === 0 && <option value="">مفيش مسيرات محسوبة</option>}
            {runs.map(run => <option key={run.id} value={run.id}>{runLabel(run)} — {run.period}</option>)}
          </select>
        </div>

        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {loading && <p className="text-sm text-gray-400">جارٍ التحميل…</p>}

        {sheet && !loading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card"><p className="text-sm text-gray-500">الموظفين</p><p className="text-2xl font-bold mt-1 text-gray-800">{sheet.totals.employees}</p></div>
              <div className="card"><p className="text-sm text-gray-500">صافي الرواتب</p><p className="text-2xl font-bold mt-1 text-gray-800" dir="ltr">{formatMoney(sheet.totals.net)}</p></div>
              <div className="card"><p className="text-sm text-gray-500">تحويل بنكي</p><p className="text-2xl font-bold mt-1 text-primary-600" dir="ltr">{formatMoney(sheet.totals.bank)}</p></div>
              <div className="card"><p className="text-sm text-gray-500">نقدي</p><p className="text-2xl font-bold mt-1 text-success-600" dir="ltr">{formatMoney(sheet.totals.cash)}</p></div>
            </div>

            {sheet.banks.length > 0 && (
              <div className="card overflow-x-auto">
                <h2 className="text-md font-bold text-gray-700 mb-3">إجمالي كل بنك</h2>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">البنك</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">الموظفين</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sheet.banks.map(bank => (
                      <tr key={bank.bankName}>
                        <td className="px-4 py-3 font-medium text-gray-800">{bank.bankName}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{bank.employees}</td>
                        <td className="px-4 py-3 text-center font-bold text-gray-800" dir="ltr">{formatMoney(bank.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="card overflow-x-auto">
              {empty ? <p className="text-sm text-gray-400">مفيش موظفين في المسير ده</p> : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {HEADER.map((title, index) => (
                        <th key={title} className={`px-4 py-3 ${index >= 5 ? 'text-center' : 'text-right'} text-sm font-medium text-gray-600 whitespace-nowrap`}>{title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bankRows.map(row => (
                      <tr key={row.employeeId}>
                        <td className="px-4 py-3 font-mono text-sm text-gray-600" dir="ltr">{row.employeeCode}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{row.fullName}</td>
                        <td className="px-4 py-3 text-gray-600">{row.payMethodLabel}</td>
                        <td className="px-4 py-3 text-gray-600">{row.bankName ?? '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600" dir="ltr">{row.iban ?? '—'}</td>
                        <td className="px-4 py-3 text-center text-gray-800" dir="ltr">{formatMoney(row.netPay)}</td>
                        <td className="px-4 py-3 text-center font-bold text-primary-700" dir="ltr">{formatMoney(row.bankAmount)}</td>
                        <td className="px-4 py-3 text-center font-bold text-success-700" dir="ltr">{formatMoney(row.cashAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}
