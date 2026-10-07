'use client'

import { useEffect, useState } from 'react'
import { Download, Save, Trash2 } from 'lucide-react'
import type { OrgFilterParams } from '@/lib/org-filter'
import {
  createSavedReport, deleteSavedReport, exportSavedReport, fetchSavedReports, updateSavedReport,
  SAVED_REPORT_PERIOD_LABELS, SAVED_REPORT_PERIOD_REPORTS,
  type ReportExportFormat, type SavedReportFrequency, type SavedReportItem, type SavedReportPeriod, type SavedReportsList,
} from '@/lib/reports-org-api'

// B2.13-ب: التقارير المحفوظة في صفحة التقارير — التقرير بيتحفظ بفلتر اللوحة الحالي باسم، وصاحبه ينزّله أو يحدد دورية إرساله لبريده.
// الخادم بيبنيه كل مرة بصلاحيات صاحبه ونطاقه وقتها (مش وقت الحفظ).
export function SavedReports({ orgParams, reports }: { orgParams: OrgFilterParams; reports: Array<{ id: string; title: string }> }) {
  const [list, setList] = useState<SavedReportsList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [report, setReport] = useState('')
  const [period, setPeriod] = useState<SavedReportPeriod>('current')
  const [frequency, setFrequency] = useState<SavedReportFrequency>('NONE')
  const [format, setFormat] = useState<ReportExportFormat>('xlsx')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const chosen = report || reports[0]?.id || ''
  const filtered = !!(orgParams.branchId || orgParams.departmentIds?.length || orgParams.teamId)

  const load = () => fetchSavedReports().then((data) => { setList(data); setError(null) })
    .catch((err) => setError(err instanceof Error ? err.message : 'تعذر تحميل التقارير المحفوظة'))
  useEffect(() => { load() }, [])

  // كل إجراء: تنفيذ ثم تحديث القايمة، والرفض برسالة الخادم
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await work()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تنفيذ الإجراء')
    } finally {
      setBusy(false)
    }
  }
  const save = () => run(async () => {
    await createSavedReport({ name, report: chosen, period, frequency, format }, orgParams)
    setName('')
  })
  const download = (item: SavedReportItem) => run(() => exportSavedReport(item.id, item.format))
  const remove = (item: SavedReportItem) => {
    if (confirmDelete !== item.id) return setConfirmDelete(item.id)
    setConfirmDelete(null)
    return run(() => deleteSavedReport(item.id))
  }

  if (!list) return error ? <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div> : null
  // من غير صلاحية الحفظ ومن غير تقارير محفوظة: مفيش حاجة تتعرض
  if (!list.canSave && list.items.length === 0) return null
  const frequencies = Object.entries(list.frequencies) as Array<[SavedReportFrequency, string]>
  const full = list.items.length >= list.max
  const field = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm'

  return (
    <div className="card space-y-4" data-saved-reports>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-gray-800">التقارير المحفوظة</h2>
        <p className="text-xs text-gray-500">التقرير بيتحفظ بفلتر اللوحة الحالي، والمجدول بيتبعت لبريدك من الساعة {list.sendHour} الصبح</p>
      </div>
      {!list.ready && <p className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">{list.migrationMessage}</p>}
      {list.ready && !list.mailReady && (
        <p className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm" data-saved-reports-mail-off>
          البريد مقفول من الإعدادات: التقارير المجدولة مش هتتبعت لحد ما يتفتح. التنزيل شغال.
        </p>
      )}
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}

      {list.ready && list.canSave && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <label className="block lg:col-span-2">
            <span className="text-xs text-gray-500">اسم التقرير</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={field} placeholder="مثال: حضور فرع الرياض" />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">التقرير</span>
            <select value={chosen} onChange={(e) => setReport(e.target.value)} className={field}>
              {reports.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">الفترة</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value as SavedReportPeriod)} className={field} disabled={!SAVED_REPORT_PERIOD_REPORTS.includes(chosen)}>
              {(Object.entries(SAVED_REPORT_PERIOD_LABELS) as Array<[SavedReportPeriod, string]>).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">الإرسال بالبريد</span>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as SavedReportFrequency)} className={field}>
              {frequencies.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <label className="block flex-1">
              <span className="text-xs text-gray-500">الصيغة</span>
              <select value={format} onChange={(e) => setFormat(e.target.value as ReportExportFormat)} className={field}>
                <option value="xlsx">Excel</option>
                <option value="pdf">PDF</option>
              </select>
            </label>
            <button type="button" onClick={save} disabled={busy || full || name.trim().length < 2 || !chosen} className="btn-primary flex items-center gap-2 disabled:opacity-50">
              <Save size={16} />
              حفظ
            </button>
          </div>
          <p className="text-xs text-gray-500 sm:col-span-2 lg:col-span-6">
            {filtered ? 'هيتحفظ بفلتر الفرع والقسم والفريق المختار دلوقتي.' : 'هيتحفظ من غير فلتر (كل نطاقك).'}
            {full && ` وصلت للحد (${list.max} تقرير).`}
          </p>
        </div>
      )}

      {list.items.length > 0 && (
        <ul className="divide-y divide-gray-100">
          {list.items.map((item) => (
            <li key={item.id} className="py-3 flex flex-wrap items-center justify-between gap-3" data-saved-report={item.id}>
              <div className="min-w-0">
                <p className="font-medium text-gray-800 break-words">{item.name}</p>
                <p className="text-xs text-gray-500">
                  {item.reportTitle}
                  {item.period ? ` • ${SAVED_REPORT_PERIOD_LABELS[item.period]}` : ''}
                  {item.filtered ? ' • بفلتر محفوظ' : ' • من غير فلتر'}
                  {item.lastSentOn ? <> • آخر إرسال <bdi>{item.lastSentOn}</bdi></> : null}
                </p>
                {item.lastError && <p className="text-xs text-red-600 break-words">تعذّر الإرسال: {item.lastError}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select aria-label="الإرسال بالبريد" value={item.frequency} disabled={busy || !list.canSave} className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                  onChange={(e) => run(() => updateSavedReport(item.id, { frequency: e.target.value as SavedReportFrequency }))}>
                  {frequencies.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
                <select aria-label="الصيغة" value={item.format} disabled={busy || !list.canSave} className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                  onChange={(e) => run(() => updateSavedReport(item.id, { format: e.target.value as ReportExportFormat }))}>
                  <option value="xlsx">Excel</option>
                  <option value="pdf">PDF</option>
                </select>
                <button type="button" title="تنزيل التقرير" onClick={() => download(item)} disabled={busy} className="p-2 bg-gray-100 rounded-lg hover:bg-primary-50 disabled:opacity-50">
                  <Download size={16} className="text-gray-600" />
                </button>
                {list.canSave && <button type="button" onClick={() => remove(item)} disabled={busy}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm disabled:opacity-50 ${confirmDelete === item.id ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-50'}`}>
                  <Trash2 size={16} />
                  {confirmDelete === item.id ? 'تأكيد الحذف' : 'حذف'}
                </button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
