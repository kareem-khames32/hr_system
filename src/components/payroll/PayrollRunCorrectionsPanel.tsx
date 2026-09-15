'use client'

import { useCallback, useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import type { ApiPayrollRun } from '@/lib/api'
import { formatMoney } from '@/lib/money'
import {
  createPayrollReversal,
  createPayrollSupplementary,
  fetchPayrollCorrections,
  PAYROLL_RUN_TYPE_LABELS,
  payrollReversalBlockers,
  previewPayrollReversal,
  REVERSAL_LINE_STATUS_LABELS,
  reversalCorrectionReasonReady,
  SUPPLEMENTARY_BASIS_LABELS,
  type PayrollCorrectionsView,
  type PayrollReversalBlocker,
  type PayrollReversalPreview,
  type PayrollRunType,
} from '@/lib/payroll-corrections-api'

// C8 / الخطوة 31: تصحيح المسير المصروف دون تعديل صفوفه. مسير عكس صرف مربوط (معاينة إلزامية ببصمتها وسبب مكتوب، ثم اعتماد بمستخدم غير المنشئ
// وتنفيذ بقيد استرداد من أزرار المسير) يعيد الإضافي والأقساط والقيود لحالتها قبل الصرف بقيود REVERSAL، ثم مسير تكميلي مربوط بنسخة سياسة الأصل وفترته،
// وتقرير التسويات للسلسلة. الخادم هو المرجع في الموانع والأرقام والصلاحيات (payroll.reverse للعكس، payroll.calculate للتكميلي).
const STATUS_LABELS: Record<string, string> = { DRAFT: 'مسودة', CALCULATED: 'محسوب', APPROVED: 'معتمد', PAID: 'مصروف', CANCELLED: 'ملغى' }
const TYPE_BADGE: Record<PayrollRunType, string> = { REGULAR: 'bg-gray-100 text-gray-700', REVERSAL: 'bg-red-50 text-red-700', SUPPLEMENTARY: 'bg-blue-50 text-blue-700' }
const REASON_HINT = 'ما الخطأ ومن اكتشفه ومرجعه — 20 حرفًا وثلاث كلمات مختلفة على الأقل، ويُحفظ في سجل المسيرين'
const toggle = (ids: number[], id: number) => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id].sort((a, b) => a - b)
const errorText = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback

type Person = { employeeId: number; fullName?: string | null; employeeCode?: string | null }

function BlockerList({ blockers, label }: { blockers: PayrollReversalBlocker[]; label: (employeeId: number) => string }) {
  if (!blockers.length) return null
  return (
    <ul role="alert" className="space-y-1 rounded-xl bg-red-50 p-3 text-sm text-red-700">
      {blockers.map((blocker, index) => <li key={`${blocker.code}-${blocker.employeeId}-${index}`}>{label(blocker.employeeId)}: {blocker.message}</li>)}
    </ul>
  )
}

function ReversalPreviewView({ preview, label }: { preview: PayrollReversalPreview; label: (row: Person) => string }) {
  return (
    <div className="space-y-2">
      <p className={`rounded-xl p-3 text-sm ${preview.blocked ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-800'}`}>
        {preview.blocked
          ? `العكس ممنوع: ${preview.blockers.length} مانعًا — عالجها ثم أعد المعاينة`
          : `سيُنشأ مسير عكس محسوب لـ${preview.employees} موظف بصافي -${formatMoney(preview.totalNet)}؛ لا أثر مالي قبل اعتماده وتنفيذه`}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="table-header">
              <th className="p-2 text-right">الموظف</th><th className="p-2 text-center">الصافي المعكوس</th><th className="p-2 text-center">إضافي يعود معتمدًا</th>
              <th className="p-2 text-center">أقساط تعود مستحقة</th><th className="p-2 text-center">ترحيل يُلغى</th><th className="p-2 text-center">قيود خصم / إضافة تُعاد</th>
              <th className="p-2 text-center">سلف تُفتح</th><th className="p-2 text-center">قرارات إعفاء تبقى</th><th className="p-2 text-right">موانع وتنبيهات</th>
            </tr>
          </thead>
          <tbody>
            {preview.lines.map(line => (
              <tr key={line.itemId} className="border-t border-gray-100 align-top">
                <td className="p-2">{label(line)}</td>
                <td className="p-2 text-center font-mono">-{formatMoney(line.netPay)}</td>
                <td className="p-2 text-center font-mono">{line.overtimeEntries}</td>
                <td className="p-2 text-center font-mono">{line.installments} ({formatMoney(line.installmentAmount)})</td>
                <td className="p-2 text-center font-mono">{line.voidedContinuations}</td>
                <td className="p-2 text-center font-mono">{formatMoney(line.reinstatedDebits)} / {formatMoney(line.reinstatedCredits)}</td>
                <td className="p-2 text-center font-mono">{line.settledLoansReopened}</td>
                <td className="p-2 text-center font-mono">{line.preservedExemptionDecisions}</td>
                <td className="p-2">
                  {line.blockers.map((blocker, index) => <p key={`b-${index}`} className="text-red-700">{blocker.message}</p>)}
                  {(line.warnings ?? []).map((warning, index) => <p key={`w-${index}`} className="text-amber-800">{warning.message}</p>)}
                  {!line.blockers.length && !(line.warnings ?? []).length && <span className="text-gray-400">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function PayrollRunCorrectionsPanel({ run, employeeName, onOpenRun }: {
  run: Pick<ApiPayrollRun, 'id' | 'status' | 'runType' | 'snapshotVersion'>
  employeeName: (id: number) => string
  onOpenRun: (runId: number) => Promise<void> | void
}) {
  const [data, setData] = useState<PayrollCorrectionsView | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reverseIds, setReverseIds] = useState<number[]>([])
  const [reverseReason, setReverseReason] = useState('')
  const [preview, setPreview] = useState<PayrollReversalPreview | null>(null)
  const [previewKey, setPreviewKey] = useState('')
  const [blockers, setBlockers] = useState<PayrollReversalBlocker[]>([])
  const [reverseError, setReverseError] = useState('')
  const [supplementIds, setSupplementIds] = useState<number[]>([])
  const [supplementName, setSupplementName] = useState('')
  const [supplementReason, setSupplementReason] = useState('')
  const [supplementError, setSupplementError] = useState('')

  const load = useCallback(() => {
    setError('')
    fetchPayrollCorrections(run.id).then(setData).catch(e => { setData(null); setError(errorText(e, 'تعذر تحميل مسار تصحيح المسير')) })
  }, [run.id])
  useEffect(() => {
    setReverseIds([]); setReverseReason(''); setPreview(null); setPreviewKey(''); setBlockers([]); setReverseError('')
    setSupplementIds([]); setSupplementName(''); setSupplementReason(''); setSupplementError('')
    load()
  }, [load, run.status, run.snapshotVersion])

  const label = (row: Person) => `${row.fullName ?? employeeName(row.employeeId)}${row.employeeCode ? ` (${row.employeeCode})` : ''}`
  const selectionKey = JSON.stringify(reverseIds)
  const previewCurrent = !!preview && previewKey === selectionKey

  const runPreview = async () => {
    if (!data?.permissions.canReverse || busy || !reverseIds.length) return
    setBusy(true); setReverseError(''); setBlockers([])
    try {
      const result = await previewPayrollReversal(run.id, reverseIds)
      setPreview(result); setPreviewKey(selectionKey)
    } catch (e) {
      setPreview(null); setReverseError(errorText(e, 'تعذرت معاينة العكس'))
    } finally { setBusy(false) }
  }
  const createReversal = async () => {
    if (!preview || !previewCurrent || preview.blocked || !reversalCorrectionReasonReady(reverseReason) || busy) return
    setBusy(true); setReverseError('')
    try {
      // الإنشاء يرسل بصمة المعاينة المعروضة؛ أي تغيّر في البنود أو آثارها منذ المعاينة يُرفض PAYRUN-REVERSAL-PREVIEW-STALE
      const created = await createPayrollReversal(run.id, { employeeIds: reverseIds, reason: reverseReason.trim(), previewHash: preview.previewHash })
      await onOpenRun(created.id)
    } catch (e) {
      setReverseError(errorText(e, 'تعذر إنشاء مسير العكس')); setBlockers(payrollReversalBlockers(e)); setPreview(null)
    } finally { setBusy(false) }
  }
  const createSupplementary = async () => {
    if (!data?.permissions.canSupplement || !supplementIds.length || !reversalCorrectionReasonReady(supplementReason) || busy) return
    setBusy(true); setSupplementError('')
    try {
      const created = await createPayrollSupplementary(run.id, { employeeIds: supplementIds, name: supplementName.trim() || undefined, reason: supplementReason.trim() })
      await onOpenRun(created.id)
    } catch (e) {
      setSupplementError(errorText(e, 'تعذر إنشاء المسير التكميلي'))
    } finally { setBusy(false) }
  }

  const runType: PayrollRunType = data?.run.runType ?? run.runType ?? 'REGULAR'
  const correction = data?.correction
  const reconciliation = data?.reconciliation
  const unreversed = data ? data.reversible.filter(row => !row.reversal).map(row => row.employeeId) : []

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <RotateCcw size={18} className="text-primary-600" />
          <h3 className="font-bold text-gray-800">تصحيح المسير المصروف: العكس والمسير التكميلي</h3>
          <span className={`badge ${TYPE_BADGE[runType]}`}>{PAYROLL_RUN_TYPE_LABELS[runType]}</span>
        </div>
        <button type="button" onClick={load} disabled={busy} className="text-sm text-primary-700 underline disabled:opacity-50">تحديث</button>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!data && !error && <p className="text-sm text-gray-400">جارٍ تحميل مسار تصحيح المسير…</p>}

      {data && correction && <>
        <p className="text-sm text-gray-600">المسير المصروف لا تُعدَّل صفوفه ولا بنوده. يُصحح بمسير عكس صرف مربوط به ثم مسير تكميلي بالأرقام الصحيحة، ويظهر الفرق في تقرير التسويات.</p>
        {correction.correctionReason && <p className="text-sm text-gray-800">سبب التصحيح: {correction.correctionReason}</p>}
        {correction.parentRun && (
          <p className="text-sm text-gray-700">
            مربوط بالمسير المصروف{' '}
            <button type="button" className="text-primary-700 underline" onClick={() => onOpenRun(correction.parentRun!.id)}>#{correction.parentRun.id} {correction.parentRun.name ?? ''}</button>
            {' '}({STATUS_LABELS[correction.parentRun.status] ?? correction.parentRun.status})
          </p>
        )}
        {correction.children.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-800">المسيرات المربوطة بهذا المسير</p>
            <ul className="space-y-1 text-sm">
              {correction.children.map(child => (
                <li key={child.id} className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-1">
                  <span className={`badge ${TYPE_BADGE[child.runType]}`}>{child.runTypeLabel}</span>
                  <button type="button" className="text-primary-700 underline" onClick={() => onOpenRun(child.id)}>#{child.id} {child.name ?? ''}</button>
                  <span className="text-gray-600">{STATUS_LABELS[child.status] ?? child.status} • صافي <span className="font-mono">{formatMoney(child.totalNet)}</span></span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* مسير العكس: سطوره وما نفّذه كل سطر */}
        {runType === 'REVERSAL' && (
          <div className="space-y-2">
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              لا أثر مالي قبل اعتماد مسير العكس بمستخدم غير من أنشأه ثم تنفيذه بقيد استرداد (القناة والمرجع) من أزرار المسير أعلاه. التنفيذ يعيد الإضافي معتمدًا بلا مسير،
              والأقساط مستحقة بحركة REVERSAL في دفترها، وقيود الدفتر بقيود إعادة تُستهلك في المسير التكميلي، ويحرر حجز فترة الموظف. إلغاؤه قبل التنفيذ يلغي سطوره ويبقيها محفوظة.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header"><th className="p-2 text-right">الموظف</th><th className="p-2 text-center">الصافي المعكوس</th><th className="p-2 text-center">الحالة</th><th className="p-2 text-right">ما أعاده التنفيذ</th></tr>
                </thead>
                <tbody>
                  {correction.lines.map(line => (
                    <tr key={line.id} className="border-t border-gray-100">
                      <td className="p-2">{employeeName(line.employeeId)}</td>
                      <td className="p-2 text-center font-mono">-{formatMoney(line.netPay)}</td>
                      <td className="p-2 text-center">{line.statusLabel}</td>
                      <td className="p-2 text-xs text-gray-600">{line.effects
                        ? `إضافي ${line.effects.overtime} • أقساط ${line.effects.installments} • قيود دفتر ${line.effects.obligations} • سلف أُعيد فتحها ${line.effects.reopenedLoans} • حجوزات فترة ${line.effects.releasedClaims}`
                        : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* المسير المصروف (أصلي أو تكميلي): اختيار البنود ومعاينة العكس وإنشاؤه */}
        {data.reversible.length > 0 && (
          <div className="space-y-3 rounded-xl border border-gray-200 p-4">
            <p className="font-medium text-gray-800">عكس صرف بنود من هذا المسير</p>
            {!data.permissions.canReverse && <p className="text-sm text-gray-500">إنشاء العكس لحامل صلاحية «عكس صرف مسير مصروف»؛ تظهر هنا البنود وحالة عكسها للاطلاع.</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    {data.permissions.canReverse && <th className="w-10 p-2"><span className="sr-only">اختيار</span></th>}
                    <th className="p-2 text-right">الموظف</th><th className="p-2 text-center">الصافي المصروف</th><th className="p-2 text-center">العكس</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reversible.map(row => (
                    <tr key={row.itemId} className="border-t border-gray-100">
                      {data.permissions.canReverse && (
                        <td className="p-2 text-center">
                          <input type="checkbox" aria-label={`اختيار ${label(row)} للعكس`} checked={reverseIds.includes(row.employeeId)} disabled={busy || !!row.reversal}
                            onChange={() => setReverseIds(ids => toggle(ids, row.employeeId))} />
                        </td>
                      )}
                      <td className="p-2">{label(row)}</td>
                      <td className="p-2 text-center font-mono">{formatMoney(row.netPay)}</td>
                      <td className="p-2 text-center">{row.reversal
                        ? <button type="button" className="text-primary-700 underline" onClick={() => onOpenRun(row.reversal!.reversalRunId)}>{REVERSAL_LINE_STATUS_LABELS[row.reversal.status] ?? row.reversal.status} (#{row.reversal.reversalRunId})</button>
                        : <span className="text-gray-400">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.permissions.canReverse && <>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secondary text-sm disabled:opacity-50" disabled={busy || !unreversed.length} onClick={() => setReverseIds(unreversed)}>تحديد كل غير المعكوسين</button>
                <button type="button" className="btn-secondary text-sm disabled:opacity-50" disabled={busy || !reverseIds.length} onClick={() => setReverseIds([])}>إلغاء التحديد</button>
              </div>
              <label htmlFor={`reversal-reason-${run.id}`} className="block text-sm font-medium text-gray-700">سبب العكس (مطلوب)</label>
              <textarea id={`reversal-reason-${run.id}`} rows={2} maxLength={1000} value={reverseReason} onChange={e => setReverseReason(e.target.value)} disabled={busy}
                className="input w-full" placeholder={REASON_HINT} />
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secondary text-sm disabled:opacity-50" disabled={busy || !reverseIds.length} onClick={runPreview}>معاينة العكس</button>
                <button type="button" className="btn-primary text-sm disabled:opacity-50" onClick={createReversal}
                  disabled={busy || !previewCurrent || preview?.blocked !== false || !reversalCorrectionReasonReady(reverseReason)}>إنشاء مسير العكس</button>
              </div>
              {preview && !previewCurrent && <p className="text-xs text-amber-800">تغيّر التحديد بعد المعاينة؛ أعد المعاينة قبل الإنشاء.</p>}
              {reverseError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{reverseError}</p>}
              {previewCurrent && preview && <ReversalPreviewView preview={preview} label={label} />}
              {!previewCurrent && <BlockerList blockers={blockers} label={employeeId => employeeName(employeeId)} />}
            </>}
          </div>
        )}

        {/* المسير التكميلي المربوط: المؤهلون (من عُكس بنده أو استُبعد من الأصل) وإنشاء المسودة */}
        {runType !== 'REVERSAL' && run.status === 'PAID' && (
          <div className="space-y-3 rounded-xl border border-gray-200 p-4">
            <p className="font-medium text-gray-800">مسير تكميلي مربوط بهذا المسير</p>
            {!data.supplementary.available
              ? <p className="text-sm text-gray-500">{data.supplementary.reason}</p>
              : !data.supplementary.candidates.length
                ? <p className="text-sm text-gray-500">لا مؤهل للمسير التكميلي الآن: من صُرف في هذا المسير يُعكس بنده أولًا ويظهر هنا بعد تنفيذ العكس، ومعه المستبعدون من المسير الأصلي.</p>
                : <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="table-header">
                          {data.permissions.canSupplement && <th className="w-10 p-2"><span className="sr-only">اختيار</span></th>}
                          <th className="p-2 text-right">الموظف</th><th className="p-2 text-center">الأساس</th><th className="p-2 text-right">الأهلية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.supplementary.candidates.map(row => (
                          <tr key={row.employeeId} className="border-t border-gray-100 align-top">
                            {data.permissions.canSupplement && (
                              <td className="p-2 text-center">
                                <input type="checkbox" aria-label={`اختيار ${label(row)} للمسير التكميلي`} checked={supplementIds.includes(row.employeeId)}
                                  disabled={busy || !row.eligible} onChange={() => setSupplementIds(ids => toggle(ids, row.employeeId))} />
                              </td>
                            )}
                            <td className="p-2">{label(row)}</td>
                            <td className="p-2 text-center">{SUPPLEMENTARY_BASIS_LABELS[row.basis] ?? row.basis}</td>
                            <td className="p-2 text-xs">
                              {row.eligible ? <span className="text-success-700">مؤهل</span> : <span className="text-red-700">{row.reason}</span>}
                              {row.warning && <p className="text-amber-800">{row.warning}</p>}
                              {row.draftRuns.length > 0 && <p className="text-gray-500">مسودات قائمة له: {row.draftRuns.map(draft => `#${draft.runId}`).join('، ')}</p>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {data.permissions.canSupplement && <>
                    <label htmlFor={`supplementary-name-${run.id}`} className="block text-sm font-medium text-gray-700">اسم المسير التكميلي (اختياري)</label>
                    <input id={`supplementary-name-${run.id}`} maxLength={200} value={supplementName} onChange={e => setSupplementName(e.target.value)} disabled={busy} className="input w-full" />
                    <label htmlFor={`supplementary-reason-${run.id}`} className="block text-sm font-medium text-gray-700">سبب المسير التكميلي (مطلوب)</label>
                    <textarea id={`supplementary-reason-${run.id}`} rows={2} maxLength={1000} value={supplementReason} onChange={e => setSupplementReason(e.target.value)} disabled={busy}
                      className="input w-full" placeholder={REASON_HINT} />
                    <button type="button" className="btn-primary text-sm disabled:opacity-50" onClick={createSupplementary}
                      disabled={busy || !supplementIds.length || !reversalCorrectionReasonReady(supplementReason)}>إنشاء مسودة المسير التكميلي</button>
                    {supplementError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{supplementError}</p>}
                  </>}
                </>}
            <p className="text-xs text-gray-500">المسودة التكميلية بنسخة سياسة المسير الأصلي وفترته وقائمة المختارين فقط (تُحذف منها أسماء ولا تُضاف)، ثم تُحتسب وتُعتمد وتُصرف من أزرار المسير المعتادة.</p>
          </div>
        )}

        {/* تقرير التسويات للسلسلة كلها (الأصلي والعكس والتكميلي) */}
        {reconciliation && reconciliation.runs.length > 1 && (
          <div className="space-y-2">
            <p className="font-medium text-gray-800">تقرير التسويات للسلسلة من المسير الأصلي #{data.root.id}</p>
            <p className="text-xs text-gray-500">الصافي الفعلي = المصروف − المعكوس المنفذ. فرق التسوية = التكميلي المصروف − المعكوس المنفذ: الموجب يُحوَّل للموظف والسالب يُسترد منه.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="table-header">
                    <th className="p-2 text-right">الموظف</th><th className="p-2 text-center">الأصلي</th><th className="p-2 text-center">معكوس منفذ</th><th className="p-2 text-center">عكس معلق</th>
                    <th className="p-2 text-center">تكميلي مصروف</th><th className="p-2 text-center">تكميلي جارٍ</th><th className="p-2 text-center">الصافي الفعلي</th><th className="p-2 text-center">فرق التسوية</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliation.employees.map(row => (
                    <tr key={row.employeeId} className="border-t border-gray-100">
                      <td className="p-2">{label(row)}</td>
                      <td className="p-2 text-center font-mono">{formatMoney(row.originalNet)}</td>
                      <td className="p-2 text-center font-mono">{formatMoney(row.reversedNet)}</td>
                      <td className="p-2 text-center font-mono">{formatMoney(row.pendingReversalNet)}</td>
                      <td className="p-2 text-center font-mono">{formatMoney(row.supplementaryPaidNet)}</td>
                      <td className="p-2 text-center font-mono">{formatMoney(row.supplementaryOpenNet)}</td>
                      <td className="p-2 text-center font-mono">{formatMoney(row.effectiveNet)}</td>
                      <td className="p-2 text-center font-mono">{formatMoney(row.settlementDifference)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 font-bold">
                    <td className="p-2">الإجمالي ({reconciliation.totals.employees} موظف)</td>
                    <td className="p-2 text-center font-mono">{formatMoney(reconciliation.totals.originalNet)}</td>
                    <td className="p-2 text-center font-mono">{formatMoney(reconciliation.totals.reversedNet)}</td>
                    <td className="p-2 text-center font-mono">{formatMoney(reconciliation.totals.pendingReversalNet)}</td>
                    <td className="p-2 text-center font-mono">{formatMoney(reconciliation.totals.supplementaryPaidNet)}</td>
                    <td className="p-2 text-center font-mono">{formatMoney(reconciliation.totals.supplementaryOpenNet)}</td>
                    <td className="p-2 text-center font-mono">{formatMoney(reconciliation.totals.effectiveNet)}</td>
                    <td className="p-2 text-center font-mono">{formatMoney(reconciliation.totals.settlementDifference)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </>}
    </div>
  )
}
