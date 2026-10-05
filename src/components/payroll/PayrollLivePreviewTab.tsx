'use client'

// B1.14 (الراتب الحي): الفترة الجارية «لحد امبارح» من التراكم اليومي — من غير ما تعمل مسير. تقديري: الرقم النهائي من المسير بعد الحساب والاعتماد.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { can } from '@/lib/api'
import { currencyLabel } from '@/lib/currency'
import { formatMoney, formatMoneyOrDash } from '@/lib/money'
import { fetchPayrollLive, refreshPayrollLive, type PayrollLivePreview, type PayrollLiveRow } from '@/lib/payroll-live-api'
import { payrollRunErrorMessage } from '@/lib/payroll-runs-api'

const minutes = (value: number) => value > 0 ? `${value} د` : ''

export function PayrollLivePreviewTab() {
  const [data, setData] = useState<PayrollLivePreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [branch, setBranch] = useState('')
  const [onlyPending, setOnlyPending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setData(await fetchPayrollLive()) } catch (e) { setData(null); setError(payrollRunErrorMessage(e, 'تعذر تحميل معاينة الفترة')) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  // «حدّث الحساب»: يحسب الأيام الناقصة والمتسخة دلوقتي بدل ما تستنى مهمة الليل
  const refresh = async () => {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      // كل طلب بيحسب لحد ~20 ثانية وبيقول الباقي: الشاشة بتكمّل لحد ما يخلصوا، وبتقف لو جولة ماحسبتش حاجة
      let computed = 0
      for (;;) {
        const result = await refreshPayrollLive()
        setData(result.preview)
        if (result.disabled) { setNotice('التراكم اليومي مقفول من الإعدادات أو ترحيله مش متطبق'); return }
        computed += result.computed
        if (!(result.remaining > 0) || result.computed === 0) break
        setNotice(`بيحسب… لسه ${result.remaining} موظف`)
      }
      setNotice(computed > 0 ? `اتحسب ${computed} يوم-موظف` : 'كل الأيام محسوبة، مفيش حاجة جديدة')
    } catch (e) { setError(payrollRunErrorMessage(e, 'تعذر تحديث الحساب')) } finally { setBusy(false) }
  }

  const rows = useMemo(() => {
    const query = search.trim()
    return (data?.rows ?? []).filter((row: PayrollLiveRow) => (!branch || String(row.branchId ?? '') === branch) && (!onlyPending || !row.complete)
      && (!query || row.fullName.includes(query) || row.employeeCode.includes(query)))
  }, [data, search, branch, onlyPending])

  return (
    <div className="space-y-4" data-testid="payroll-live-preview">
      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-gray-800">الفترة الحالية لحد امبارح</h3>
            {data && <p className="text-xs text-gray-500">فترة {data.period}: من {data.startDate} لحد {data.upTo} (آخرها {data.endDate}) — من غير ما تعمل مسير</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading || busy} className="btn-secondary text-sm disabled:opacity-50">تحديث العرض</button>
            {can('payroll.calculate') && <button onClick={refresh} disabled={loading || busy} className="btn-primary text-sm disabled:opacity-50">{busy ? 'بيحسب…' : 'حدّث الحساب'}</button>}
          </div>
        </div>
        {data && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{data.note}</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p className="rounded-xl bg-success-50 p-3 text-sm text-success-700">{notice}</p>}
        {loading && !data && <p className="text-sm text-gray-400">جارٍ تحميل المعاينة…</p>}
        {data && !data.available && <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">التراكم اليومي محتاج ترحيله على قاعدة البيانات عشان المعاينة تشتغل.</p>}
        {data?.available && <>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="badge bg-gray-100 text-gray-700">الموظفين: {data.counts.employees}</span>
            <span className="badge bg-success-50 text-success-700">محسوبين لحد {data.upTo}: {data.counts.complete}</span>
            {data.counts.pending > 0 && <span className="badge bg-amber-50 text-amber-800">لسه محتاجين حساب: {data.counts.pending}</span>}
          </div>
          <div className="overflow-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead><tr className="table-header">
                <th className="text-right px-3 py-2">الفرع</th><th className="text-center px-3 py-2">الموظفين</th><th className="text-center px-3 py-2">الاستحقاق</th>
                <th className="text-center px-3 py-2">الإضافي</th><th className="text-center px-3 py-2">الخصومات</th><th className="text-center px-3 py-2">الصافي التقديري</th>
              </tr></thead>
              <tbody>
                {data.byBranch.map(group => <tr key={group.branchId ?? 'none'} className="table-row">
                  <td className="table-cell font-medium">{group.branchName ?? 'من غير فرع'}</td>
                  <td className="table-cell text-center">{group.totals.employees}</td>
                  <td className="table-cell text-center" dir="ltr">{formatMoney(group.totals.earned)}</td>
                  <td className="table-cell text-center" dir="ltr">{formatMoneyOrDash(group.totals.overtime)}</td>
                  <td className="table-cell text-center text-red-700" dir="ltr">{formatMoneyOrDash(group.totals.deductions)}</td>
                  <td className="table-cell text-center font-bold" dir="ltr">{formatMoney(group.totals.estimatedNet)} <span className="text-xs font-normal text-gray-400">{currencyLabel(group.currency)}</span></td>
                </tr>)}
                {data.byCurrency.map(group => <tr key={group.currency} className="bg-gray-50 font-bold">
                  <td className="table-cell">الإجمالي ({currencyLabel(group.currency)})</td>
                  <td className="table-cell text-center">{group.totals.employees}</td>
                  <td className="table-cell text-center" dir="ltr">{formatMoney(group.totals.earned)}</td>
                  <td className="table-cell text-center" dir="ltr">{formatMoneyOrDash(group.totals.overtime)}</td>
                  <td className="table-cell text-center text-red-700" dir="ltr">{formatMoneyOrDash(group.totals.deductions)}</td>
                  <td className="table-cell text-center" dir="ltr">{formatMoney(group.totals.estimatedNet)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </>}
      </div>

      {data?.available && <div className="card space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الكود" className="input max-w-xs" />
          {data.byBranch.length > 1 && <select value={branch} onChange={e => setBranch(e.target.value)} className="input max-w-xs">
            <option value="">كل الفروع</option>
            {data.byBranch.map(group => <option key={group.branchId ?? 'none'} value={String(group.branchId ?? '')}>{group.branchName ?? 'من غير فرع'}</option>)}
          </select>}
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={onlyPending} onChange={e => setOnlyPending(e.target.checked)} /> اللي لسه محتاجين حساب بس
          </label>
          <span className="text-xs text-gray-400">{rows.length} من {data.rows.length}</span>
        </div>
        <div className="max-h-[32rem] overflow-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead><tr className="table-header">
              <th className="text-right px-3 py-2">الموظف</th><th className="text-center px-3 py-2">الأيام</th><th className="text-center px-3 py-2">الاستحقاق</th>
              <th className="text-center px-3 py-2">الإضافي</th><th className="text-center px-3 py-2">التأخير</th><th className="text-center px-3 py-2">النقص والانصراف المبكر</th>
              <th className="text-center px-3 py-2">الغياب</th><th className="text-center px-3 py-2">بدون راتب</th><th className="text-center px-3 py-2">الإيقاف</th>
              <th className="text-center px-3 py-2">الصافي التقديري</th>
            </tr></thead>
            <tbody>{rows.map(row => <tr key={row.employeeId} className="table-row">
              <td className="table-cell">
                <p className="font-medium text-gray-800">{row.fullName}</p>
                <p className="text-xs text-gray-400">{[row.employeeCode, row.branchName, row.departmentName].filter(Boolean).join(' • ')}</p>
                {!row.complete && <p className="text-xs text-amber-700">{row.days === 0 ? 'لسه ماتحسبش' : row.dirtyDays > 0 ? `${row.dirtyDays} يوم محتاج إعادة حساب` : `محسوب لحد ${row.lastDate ?? '—'}`}</p>}
              </td>
              <td className="table-cell text-center">{row.days}</td>
              <td className="table-cell text-center" dir="ltr">{formatMoney(row.earned)}</td>
              <td className="table-cell text-center" dir="ltr">{formatMoneyOrDash(row.overtime)}<p className="text-xs text-gray-400">{minutes(row.overtimeMinutes)}</p></td>
              <td className="table-cell text-center text-red-700" dir="ltr">{formatMoneyOrDash(row.lateness)}<p className="text-xs text-gray-400">{minutes(row.lateMinutes)}</p></td>
              <td className="table-cell text-center text-red-700" dir="ltr">{formatMoneyOrDash(row.shortfall)}<p className="text-xs text-gray-400">{minutes(row.shortfallMinutes)}</p></td>
              <td className="table-cell text-center text-red-700" dir="ltr">{formatMoneyOrDash(row.absence)}<p className="text-xs text-gray-400">{row.absentDays > 0 ? `${row.absentDays} يوم` : ''}</p></td>
              <td className="table-cell text-center text-red-700" dir="ltr">{formatMoneyOrDash(row.unpaidLeave)}<p className="text-xs text-gray-400">{row.unpaidLeaveDays > 0 ? `${row.unpaidLeaveDays} يوم` : ''}</p></td>
              <td className="table-cell text-center text-red-700" dir="ltr">{formatMoneyOrDash(row.suspension)}<p className="text-xs text-gray-400">{row.suspendedDays > 0 ? `${row.suspendedDays} يوم` : ''}</p></td>
              <td className="table-cell text-center font-bold" dir="ltr">{formatMoney(row.estimatedNet)} <span className="text-xs font-normal text-gray-400">{currencyLabel(row.currency)}</span></td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>}
    </div>
  )
}
