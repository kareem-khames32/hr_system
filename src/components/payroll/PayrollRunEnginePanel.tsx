'use client'

import { useMemo, useState } from 'react'
import { Cpu } from 'lucide-react'
import { can } from '../../lib/api'
import { ENGINE_MODE_LABELS, engineOf, explainPayrollParity, parityDifferences, parityReasonText, setPayrollEngineMode, type PayrollEngineMode, type PayrollParityExplanationInput } from '../../lib/payroll-engine-api'
import { PayrollParityOperationsNote } from './PayrollParityOperationsNote'
import { PayrollParityCountingControl, type PayrollParityCountingRun } from './PayrollParityCountingControl'

// الخطوة 20 / D13: وضع محرك الحساب للمسير وتقرير التكافؤ لكل موظف ولكل بند.
// SHADOW (الافتراضي) يصرف القديم ويحسب المحرك بجانبه. الاعتماد يتطلب تقرير تكافؤ للنسخة الحالية وكل فرق أو قيمة غائبة بسبب مكتوب؛
// التحويل إلى POLICY لحامل «اعتماد المسير» بعد أن يكون لكل فرق سبب مكتوب ولا قيمة غائبة.
const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  MATCHED: { label: 'مطابق', className: 'badge badge-success' }, DIFFERENT: { label: 'فروق بأسباب', className: 'badge badge-warning' },
  UNAVAILABLE: { label: 'قيمة غائبة', className: 'badge bg-gray-100 text-gray-700' }, ERROR: { label: 'تعذر الحساب', className: 'badge badge-danger' },
}
const VISIBLE_ROWS = 200

export function PayrollRunEnginePanel({ run, employeeName, onChanged }: { run: unknown; employeeName: (id: number) => string; onChanged: () => Promise<void> | void }) {
  const engine = engineOf(run)
  const status = (run as { status?: string } | null)?.status ?? ''
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [groupReasons, setGroupReasons] = useState<Record<string, string>>({})
  const [modeReason, setModeReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showMatched, setShowMatched] = useState(false)
  const differences = useMemo(() => parityDifferences(engine), [engine])
  if (!engine) return null
  const report = engine.report
  const runId = (run as { id: number }).id
  const approver = can('payroll.approve') && ['DRAFT', 'CALCULATED'].includes(status)
  const pending = differences.filter(row => !row.explanation)
  const draftExplanations: PayrollParityExplanationInput[] = pending.filter(row => (reasons[row.differenceKey!] ?? '').trim().length >= 3)
    .map(row => ({ employeeId: row.employeeId, component: row.code, reason: reasons[row.differenceKey!].trim() }))
  const groups = engine.approvalPendingGroups ?? []
  const draftGroups: PayrollParityExplanationInput[] = groups.filter(group => (groupReasons[group.reasonCode] ?? '').trim().length >= 3)
    .map(group => ({ reasonCode: group.reasonCode, reason: groupReasons[group.reasonCode].trim() }))
  const approvalIssueCount = engine.approvalIssueCount ?? null
  const firstApprovalIssue = engine.approvalIssues?.[0]

  const act = async (action: () => Promise<unknown>) => {
    setBusy(true); setError('')
    try { await action(); setReasons({}); setGroupReasons({}); setModeReason(''); await onChanged() } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تنفيذ العملية') }
    finally { setBusy(false) }
  }
  const switchTo = (mode: PayrollEngineMode) => act(() => setPayrollEngineMode(runId, { mode, reason: modeReason.trim(), explanations: mode === 'POLICY' ? draftExplanations : undefined }))
  const unresolvedForPolicy = engine.switchIssues.filter(issue => !(issue.issue === 'UNEXPLAINED' && draftExplanations.some(row => 'employeeId' in row && row.employeeId === issue.employeeId && row.component === issue.component)))

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cpu size={18} className="text-primary-600" />
          <h3 className="font-bold text-gray-800">محرك الحساب</h3>
          <span className={`badge ${engine.mode === 'POLICY' ? 'badge-success' : engine.mode === 'LEGACY' ? 'bg-gray-100 text-gray-700' : 'bg-blue-50 text-blue-700'}`}>{engine.mode ?? 'قبل D13'}</span>
          <span className="text-sm text-gray-600">{engine.modeLabel}</span>
        </div>
        {report && <span className="text-xs text-gray-500">نسخة الحساب {report.snapshotVersion} • بصمة التقرير <span className="font-mono" dir="ltr">{report.reportHash.slice(0, 12)}</span></span>}
      </div>
      {engine.recalcRequired && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">وضع المحرك تغيّر بعد آخر حساب؛ أعد حساب المسير قبل الاعتماد حتى يُصرف بالوضع المختار.</p>}
      {status === 'CALCULATED' && approvalIssueCount !== null && (approvalIssueCount === 0
        ? <p className="rounded-xl bg-gray-50 p-3 text-sm text-success-700">تقرير التكافؤ مستوفٍ للاعتماد: كل فرق أو قيمة غائبة له سبب مكتوب، ويُرفق التقرير وبصمته بحدث الاعتماد.</p>
        : <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">الاعتماد متوقف على تقرير التكافؤ: {approvalIssueCount} شرطًا غير مستوفى{firstApprovalIssue ? ` (${firstApprovalIssue.reason})` : ''}.</p>)}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!report ? <p className="text-sm text-gray-500">لا تقرير تكافؤ لهذا المسير بعد (المسير قبل الخطوة 20 أو لم يُحتسب).</p> : <>
        <p className="text-sm text-gray-700">{report.message}</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          {[['الموظفون', report.totals.employees], ['مطابق', report.totals.matched], ['بفروق', report.totals.different], ['قيمة غائبة', report.totals.unavailable + report.totals.error], ['عدد الفروق', report.totals.differences]]
            .map(([label, value]) => <div key={String(label)} className="rounded-lg bg-gray-50 p-2 text-center"><p className="text-gray-500 text-xs">{label}</p><p className="font-bold font-mono">{value}</p></div>)}
        </div>
        {report.sourceReadiness && report.sourceReadiness.length > 0 && <div className="space-y-1">
          <p className="text-sm font-medium text-gray-800">خطة المصادر: لماذا غابت قيم محرك السياسة وكيف تُستكمل</p>
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="table-header"><th className="p-2 text-right">رمز المصدر</th><th className="p-2 text-center">الموظفون</th><th className="p-2 text-right">طريق الإصلاح</th></tr></thead>
            <tbody>{report.sourceReadiness.map(row => <tr key={row.code} className="border-t border-gray-100 align-top">
              <td className="p-2 font-mono" dir="ltr">{row.code}</td><td className="p-2 text-center font-mono">{row.employees}</td><td className="p-2 text-gray-700">{row.remedy}</td>
            </tr>)}</tbody>
          </table></div>
        </div>}
        {differences.length > 0 && <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="table-header"><th className="p-2 text-right">الموظف</th><th className="p-2 text-right">البند</th><th className="p-2 text-center">القديم</th><th className="p-2 text-center">محرك السياسة</th><th className="p-2 text-center">الفرق</th><th className="p-2 text-right">سبب النظام</th><th className="p-2 text-right">السبب المكتوب</th></tr></thead>
          <tbody>{differences.slice(0, VISIBLE_ROWS).map(row => <tr key={row.differenceKey!} className="border-t border-gray-100 align-top">
            <td className="p-2">{employeeName(row.employeeId)}</td>
            <td className="p-2">{row.label}</td>
            <td className="p-2 text-center font-mono">{row.legacy}</td>
            <td className="p-2 text-center font-mono">{row.policy ?? '—'}</td>
            <td className="p-2 text-center font-mono">{row.difference ?? 'غائب'}</td>
            <td className="p-2 text-xs text-gray-600">{row.reason}</td>
            <td className="p-2 text-xs">{row.explanation ? <span className="text-success-700">{row.explanation.reason}{row.policy === null ? ' — قيمة غائبة: تكفي للاعتماد ولا تسمح بـPOLICY' : ''}</span>
              : approver ? <input value={reasons[row.differenceKey!] ?? ''} onChange={e => setReasons(current => ({ ...current, [row.differenceKey!]: e.target.value }))} maxLength={500} className="input-field text-xs"
                placeholder={row.policy === null ? 'سبب مكتوب للقيمة الغائبة (للاعتماد فقط)' : 'سبب مكتوب لهذا الفرق'} />
              : <span className="text-amber-800">بلا سبب مكتوب</span>}</td>
          </tr>)}</tbody>
        </table>
        {differences.length > VISIBLE_ROWS && <p className="text-xs text-gray-500 mt-1">يُعرض أول {VISIBLE_ROWS} من {differences.length} بندًا؛ اكتب سببًا واحدًا لكل رمز سبب نظام أدناه لتغطية الباقي.</p>}
        </div>}
        <button type="button" onClick={() => setShowMatched(value => !value)} className="text-xs text-primary-700 underline">{showMatched ? 'إخفاء' : 'عرض'} تقرير كل موظف</button>
        {showMatched && <div className="overflow-x-auto"><table className="w-full text-xs">
          <thead><tr className="table-header"><th className="p-2 text-right">الموظف</th><th className="p-2">الحالة</th><th className="p-2 text-right">البنود (القديم / السياسة)</th></tr></thead>
          <tbody>{report.rows.map(row => <tr key={row.employeeId} className="border-t border-gray-100 align-top">
            <td className="p-2">{employeeName(row.employeeId)}</td>
            <td className="p-2 text-center"><span className={STATUS_LABELS[row.status]?.className}>{STATUS_LABELS[row.status]?.label ?? row.status}</span></td>
            <td className="p-2 font-mono">{row.components.map(item => `${item.label}: ${item.legacy} / ${item.policy ?? '—'}`).join(' • ')}</td>
          </tr>)}</tbody>
        </table></div>}
      </>}
      {approver && <div className="space-y-2 border-t border-gray-100 pt-3">
        {groups.length > 0 && <div className="space-y-2">
          <p className="text-sm font-medium text-gray-800">أسباب جماعية لكل رمز سبب نظام (تغطي كل ما ينقصه سبب بنفس الرمز في هذه النسخة)</p>
          {groups.map(group => <div key={group.reasonCode} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-mono text-xs" dir="ltr">{group.reasonCode}</span>
            <span className="text-xs text-gray-600">{group.count} بندًا لـ{group.employees} موظف{group.unavailable ? ` (${group.unavailable} قيمة غائبة)` : ''} — {parityReasonText(report, group.reasonCode) ?? ''}</span>
            <input value={groupReasons[group.reasonCode] ?? ''} onChange={e => setGroupReasons(current => ({ ...current, [group.reasonCode]: e.target.value }))} maxLength={500}
              className="input-field flex-1 min-w-64 text-xs" placeholder="سبب مكتوب للمجموعة" />
          </div>)}
        </div>}
        {pending.length > 0 && <button type="button" onClick={() => act(() => explainPayrollParity(runId, [...draftExplanations, ...draftGroups]))}
          disabled={busy || !(draftExplanations.length + draftGroups.length)} className="btn-secondary text-sm disabled:opacity-50">حفظ الأسباب المكتوبة ({draftExplanations.length + draftGroups.length})</button>}
        <div className="flex flex-wrap items-center gap-2">
          <input value={modeReason} onChange={e => setModeReason(e.target.value)} maxLength={500} className="input-field flex-1 min-w-64" placeholder="سبب تغيير وضع المحرك (مطلوب)" />
          {engine.mode !== 'POLICY' && <button type="button" onClick={() => switchTo('POLICY')} disabled={busy || modeReason.trim().length < 3 || unresolvedForPolicy.length > 0 || status !== 'CALCULATED'}
            title={unresolvedForPolicy.length ? unresolvedForPolicy.slice(0, 3).map(issue => issue.reason).join('؛ ') : undefined} className="btn-primary text-sm disabled:opacity-50">تحويل إلى POLICY</button>}
          {engine.mode !== 'SHADOW' && <button type="button" onClick={() => switchTo('SHADOW')} disabled={busy || modeReason.trim().length < 3} className="btn-secondary text-sm disabled:opacity-50">العودة إلى SHADOW</button>}
          {engine.mode !== 'LEGACY' && <button type="button" onClick={() => switchTo('LEGACY')} disabled={busy || modeReason.trim().length < 3}
            title="LEGACY بلا ظل لا يُعتمد: الاعتماد يتطلب تقرير تكافؤ SHADOW" className="btn-secondary text-sm disabled:opacity-50">LEGACY بلا ظل (لا يُعتمد)</button>}
        </div>
        {engine.mode !== 'POLICY' && unresolvedForPolicy.length > 0 && <p className="text-xs text-gray-500">التحويل إلى POLICY متوقف: {unresolvedForPolicy.length} شرط غير مستوفى ({unresolvedForPolicy[0].reason}). السبب المكتوب لقيمة غائبة يكفي للاعتماد ولا يرفع هذا المنع.</p>}
        <p className="text-xs text-gray-500">{Object.entries(ENGINE_MODE_LABELS).map(([mode, label]) => `${mode}: ${label}`).join(' • ')}. تغيير الوضع يلزم إعادة حساب المسير قبل الاعتماد.</p>
      </div>}
      {/* الخطوة 23 (B5): فترة التكافؤ التشغيلية الموثقة وعدّاد الأشهر من المسيرات الحقيقية، وتعليم المسير التجريبي «لا يُحتسب» */}
      <PayrollParityCountingControl run={run as PayrollParityCountingRun} onChanged={onChanged} />
      <PayrollParityOperationsNote />
    </div>
  )
}
