'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ShieldOff } from 'lucide-react'
import {
  approveExemption,
  attachExemption,
  EXEMPTION_DISPOSITION_LABELS,
  EXEMPTION_STATUS_META,
  EXEMPTION_TYPE_TARGET_LABELS,
  fetchExemptionCandidates,
  fetchExemptionEntries,
  fetchRunExemptions,
  grantExemption,
  previewExemption,
  rejectExemption,
  revokeExemption,
  type ExemptionCandidate,
  type ExemptionDisposition,
  type ExemptionEmployeeEntries,
  type ExemptionInput,
  type ExemptionPreview,
  type ExemptionScopeKind,
  type ExemptionView,
  type RunExemptionsView,
} from '@/lib/financial-exemptions-api'
import { formatMoney } from '@/lib/money'

// الخطوة 26 — الإعفاء المالي على شاشة المسير (EX-01..08): منفصل عن استثناء الحضور. يُسقط عن موظف في هذا المسير خصمًا واحدًا أو نوع خصم
// أو كل الخصومات القابلة للإعفاء؛ أقساط السلف تُؤجل ولا تُسقط، والنظامي والقضائي وغير القابل والاستردادات والإجازة بلا أجر تبقى.
// المنح بمعاينة إلزامية (المبلغ المقدر والمحمي والحدود والتوجيه للاعتماد)، ثم إعادة حساب المسير قبل اعتماده.
type Decision = { id: number; action: 'approve' | 'reject' | 'revoke' | 'attach'; text: string; revision: number }
const ACTION_LABELS: Record<Decision['action'], string> = { approve: 'اعتماد', reject: 'رفض', revoke: 'إلغاء الإعفاء', attach: 'إضافة مرجع المرفق' }

export function PayrollFinancialExemptionsPanel({ runId, runStatus, snapshotVersion, onChanged }: {
  runId: number; runStatus: string; snapshotVersion: number; onChanged?: () => Promise<void> | void
}) {
  const [data, setData] = useState<RunExemptionsView | null>(null)
  const [error, setError] = useState('')
  const [decision, setDecision] = useState<Decision | null>(null)
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [candidates, setCandidates] = useState<ExemptionCandidate[] | null>(null)
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [entries, setEntries] = useState<ExemptionEmployeeEntries | null>(null)
  const [scopeKind, setScopeKind] = useState<ExemptionScopeKind>('DEDUCTION_TYPE')
  const [target, setTarget] = useState('')
  const [disposition, setDisposition] = useState<ExemptionDisposition>('DROP')
  const [reason, setReason] = useState('')
  const [attachmentRef, setAttachmentRef] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [preview, setPreview] = useState<ExemptionPreview | null>(null)
  const [formError, setFormError] = useState('')

  const load = useCallback(() => {
    setError('')
    fetchRunExemptions(runId).then(setData).catch(e => setError(e instanceof Error ? e.message : 'تعذر تحميل الإعفاءات المالية'))
  }, [runId])
  useEffect(() => { if (['CALCULATED', 'APPROVED', 'PAID'].includes(runStatus)) load() }, [load, runStatus, snapshotVersion])

  const input = useMemo<ExemptionInput | null>(() => {
    if (!employeeId) return null
    const base = { runId, employeeId, scopeKind, reason: reason.trim(), attachmentRef: attachmentRef.trim() || undefined, overrideReason: overrideReason.trim() || undefined }
    if (scopeKind === 'ALL_DEDUCTIONS') return { ...base, disposition }
    if (!target) return null
    const [kind, ref] = target.split(':')
    if (scopeKind === 'DEDUCTION_TYPE') return kind === 'TYPED' ? { ...base, targetKind: 'TYPED', deductionTypeId: Number(ref), disposition } : { ...base, targetKind: kind }
    return { ...base, targetKind: kind, targetRef: ref, ...(kind === 'OBLIGATION' ? { disposition } : {}) }
  }, [runId, employeeId, scopeKind, target, disposition, reason, attachmentRef, overrideReason])
  const inputKey = JSON.stringify(input)
  useEffect(() => { setPreview(null) }, [inputKey])

  if (!['CALCULATED', 'APPROVED', 'PAID'].includes(runStatus)) return null
  if (error && !data) return <div className="card border border-red-200 text-sm text-red-700">{error}</div>
  if (!data) return null
  const rows = data.exemptions
  const settings = data.settings
  const typedTarget = scopeKind === 'ALL_DEDUCTIONS' || target.startsWith('TYPED:') || target.startsWith('OBLIGATION:')
  const loanTarget = scopeKind === 'ALL_DEDUCTIONS' || target === 'ADVANCE_INSTALLMENT' || target.startsWith('LOAN_INSTALLMENT:')

  const openForm = async () => {
    setShowForm(true); setFormError('')
    if (!candidates) {
      try { setCandidates((await fetchExemptionCandidates(runId)).employees) } catch (e) { setFormError(e instanceof Error ? e.message : 'تعذر تحميل الموظفين') }
    }
  }
  const selectEmployee = async (id: number | null) => {
    setEmployeeId(id); setEntries(null); setTarget(''); setScopeKind('DEDUCTION_TYPE'); setFormError('')
    if (!id) return
    try { setEntries(await fetchExemptionEntries(runId, id)) } catch (e) { setFormError(e instanceof Error ? e.message : 'تعذر تحميل خصومات الموظف') }
  }
  const runPreview = async () => {
    if (!input) return
    setBusy(true); setFormError('')
    try { setPreview(await previewExemption(input)) } catch (e) { setFormError(e instanceof Error ? e.message : 'تعذرت المعاينة') } finally { setBusy(false) }
  }
  const submit = async () => {
    if (!input || !preview) return
    setBusy(true); setFormError('')
    try {
      await grantExemption({ ...input, previewHash: preview.previewHash })
      setShowForm(false); setEmployeeId(null); setEntries(null); setTarget(''); setReason(''); setAttachmentRef(''); setOverrideReason(''); setPreview(null)
      load(); await onChanged?.()
    } catch (e) { setFormError(e instanceof Error ? e.message : 'تعذر حفظ الإعفاء') } finally { setBusy(false) }
  }
  const decide = async () => {
    if (!decision) return
    setBusy(true); setError('')
    try {
      if (decision.action === 'approve') await approveExemption(decision.id, decision.text.trim(), decision.revision)
      else if (decision.action === 'reject') await rejectExemption(decision.id, decision.text.trim(), decision.revision)
      else if (decision.action === 'revoke') await revokeExemption(decision.id, decision.text.trim(), decision.revision)
      else await attachExemption(decision.id, decision.text.trim())
      setDecision(null); load(); await onChanged?.()
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تنفيذ القرار') } finally { setBusy(false) }
  }
  const amountOf = (row: ExemptionView) => row.exemptedAmountSnapshot ?? row.estimatedAmount
  const allowAll = entries?.bases.includes('HR') ?? false
  const typeOptions = entries ? [
    ...(Number(entries.requested.lateness) > 0 ? [{ value: 'LATENESS', label: `${EXEMPTION_TYPE_TARGET_LABELS.LATENESS} — ${formatMoney(entries.requested.lateness)}` }] : []),
    ...(Number(entries.requested.shortfall) > 0 ? [{ value: 'SHORTFALL', label: `${EXEMPTION_TYPE_TARGET_LABELS.SHORTFALL} — ${formatMoney(entries.requested.shortfall)}` }] : []),
    ...(Number(entries.requested.absence) > 0 ? [{ value: 'ABSENCE', label: `${EXEMPTION_TYPE_TARGET_LABELS.ABSENCE} — ${formatMoney(entries.requested.absence)}` }] : []),
    ...(entries.installments.length ? [{ value: 'ADVANCE_INSTALLMENT', label: EXEMPTION_TYPE_TARGET_LABELS.ADVANCE_INSTALLMENT }] : []),
    ...entries.typedTypes.map(type => ({ value: `TYPED:${type.deductionTypeId}`, label: `${type.typeName ?? 'خصم مصنف'} — ${formatMoney(type.amount)}${type.exemptable ? '' : ' (غير قابل للإعفاء)'}`, disabled: !type.exemptable })),
  ] : []
  const entryOptions = entries ? [
    ...entries.attendanceDays.flatMap(day => [
      ...(Number(day.lateness) > 0 ? [{ value: `LATENESS_DAY:${day.date}`, label: `تأخير يوم ${day.date} — ${formatMoney(day.lateness)}` }] : []),
      ...(Number(day.shortfall) > 0 ? [{ value: `SHORTFALL_DAY:${day.date}`, label: `نقص ساعات يوم ${day.date} — ${formatMoney(day.shortfall)}` }] : []),
      ...(Number(day.absence) > 0 ? [{ value: `ABSENCE_DAY:${day.date}`, label: `غياب يوم ${day.date} — ${formatMoney(day.absence)}` }] : []),
    ]),
    ...entries.typedObligations.map(row => ({ value: `OBLIGATION:${row.obligationId}`, label: `${row.typeName ?? 'خصم مصنف'} — قيد #${row.obligationId} — ${formatMoney(row.amount)}${row.exemptable ? '' : ` (${row.protectedReason})`}`, disabled: !row.exemptable })),
    ...entries.installments.map(row => ({ value: `LOAN_INSTALLMENT:${row.installmentId}`, label: `قسط سلفة #${row.loanId} (استحقاق ${row.dueDate}) — ${formatMoney(row.amount)} — تأجيل` })),
  ] : []

  return (
    <div className="card border border-gray-200">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="font-bold text-gray-800 flex items-center gap-2"><ShieldOff size={18} /> الإعفاء المالي في المسير</h3>
        {data.permissions.canGrant && runStatus === 'CALCULATED' && !showForm && <button type="button" className="btn-secondary text-sm" onClick={openForm}>إعفاء جديد</button>}
      </div>
      <p className="text-xs text-gray-500 mb-3">منفصل عن استثناء الحضور: يُسقط عن موظف في هذا المسير خصمًا أو نوع خصم أو كل الخصومات القابلة للإعفاء دون تعديل السياسة أو مصدر الخصم. أقساط السلف تُؤجل ولا تُسقط، والاستقطاع النظامي والحكم القضائي وغير القابل للإعفاء والإجازة بلا أجر تبقى.</p>
      {error && <p role="alert" className="p-2 mb-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</p>}
      {data.recalcRequired && runStatus === 'CALCULATED' && (
        <p role="alert" className="p-3 mb-3 bg-amber-50 text-amber-900 rounded-xl text-sm">تغيّرت الإعفاءات المالية بعد آخر حساب ({data.recalcEmployeeIds.length} موظف)؛ أعد حساب المسير ليُطبقها — الاعتماد مرفوض قبل ذلك.</p>
      )}
      {data.pendingApproval > 0 && runStatus === 'CALCULATED' && <p className="p-2 mb-3 bg-warning-50 text-warning-800 rounded-lg text-sm">{data.pendingApproval} إعفاء بانتظار اعتماد الموارد البشرية؛ يُحسم قبل اعتماد المسير.</p>}

      {rows.length === 0 ? <p className="text-sm text-gray-400">لا إعفاءات مالية على هذا المسير.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead><tr className="bg-gray-50 text-gray-600">
              <th className="p-2">#</th><th className="p-2">الموظف</th><th className="p-2">الهدف والمصير</th><th className="p-2">المبلغ</th><th className="p-2">الحالة</th><th className="p-2">المانح والسبب</th><th className="p-2">إجراء</th>
            </tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-t border-gray-100 align-top">
                  <td className="p-2 font-mono">{row.id}</td>
                  <td className="p-2">{row.employeeName ?? `#${row.employeeId}`}<p className="text-xs text-gray-400">{row.employeeCode}</p></td>
                  <td className="p-2">{row.targetLabel}<p className="text-xs text-gray-500">{row.dispositionLabel}</p></td>
                  <td className="p-2 font-mono">{amountOf(row) ? formatMoney(amountOf(row)) : '—'}<p className="text-xs text-gray-400">{row.exemptedAmountSnapshot ? 'المُسقط فعلًا' : 'مقدر من آخر حساب'}</p></td>
                  <td className="p-2"><span className={`badge ${EXEMPTION_STATUS_META[row.status]?.className ?? ''}`}>{row.statusLabel}</span>
                    {row.decisionReason && <p className="text-xs text-gray-500 mt-1">{row.decisionReason}</p>}</td>
                  <td className="p-2 text-xs">{row.grantorBasisLabel} — {row.grantedByName ?? '—'}<p className="text-gray-700 whitespace-pre-wrap">{row.reason}</p>
                    {row.attachmentRef && <p className="text-gray-500">المرفق: {row.attachmentRef}</p>}
                    {row.overrides.length > 0 && <p className="text-amber-700">تجاوز حد موثق: {row.overrides.map(entry => String(entry.limit)).join('، ')}</p>}</td>
                  <td className="p-2 space-y-1">
                    {row.canApprove && <button type="button" className="btn-primary text-xs block" disabled={busy} onClick={() => setDecision({ id: row.id, action: 'approve', text: '', revision: row.revision })}>اعتماد</button>}
                    {row.canReject && <button type="button" className="btn-secondary text-xs block" disabled={busy} onClick={() => setDecision({ id: row.id, action: 'reject', text: '', revision: row.revision })}>رفض</button>}
                    {row.canRevoke && <button type="button" className="btn-secondary text-xs block" disabled={busy} onClick={() => setDecision({ id: row.id, action: 'revoke', text: '', revision: row.revision })}>إلغاء</button>}
                    {row.canAttach && !row.attachmentRef && <button type="button" className="btn-secondary text-xs block" disabled={busy} onClick={() => setDecision({ id: row.id, action: 'attach', text: '', revision: row.revision })}>مرفق</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {decision && (
        <div className="mt-3 p-3 border rounded-xl bg-gray-50">
          <p className="text-sm font-medium mb-2">{ACTION_LABELS[decision.action]} — الإعفاء #{decision.id}</p>
          <textarea className="input w-full" rows={2} value={decision.text} onChange={event => setDecision({ ...decision, text: event.target.value })}
            placeholder={decision.action === 'attach' ? 'مرجع المرفق (رقم المحضر أو المستند)' : decision.action === 'approve' ? 'ملاحظة الاعتماد (اختيارية)' : `السبب (${settings.reasonMinLength} حرفًا على الأقل)`} />
          <div className="flex gap-2 mt-2">
            <button type="button" className="btn-primary text-sm" disabled={busy || (decision.action !== 'approve' && decision.text.trim().length < (decision.action === 'attach' ? 3 : settings.reasonMinLength))} onClick={decide}>تأكيد</button>
            <button type="button" className="btn-secondary text-sm" disabled={busy} onClick={() => setDecision(null)}>تراجع</button>
          </div>
          {decision.action === 'revoke' && <p className="text-xs text-gray-500 mt-1">بعد الإلغاء أعد حساب المسير ليعود الخصم.</p>}
        </div>
      )}

      {showForm && (
        <div className="mt-4 p-4 border rounded-xl space-y-3">
          <div className="flex items-center justify-between"><p className="font-medium">إعفاء مالي جديد</p><button type="button" className="text-xs text-gray-500" onClick={() => setShowForm(false)}>إغلاق</button></div>
          {formError && <p role="alert" className="p-2 bg-red-50 text-red-700 rounded-lg text-sm">{formError}</p>}
          <label className="block text-sm">الموظف (عضو محسوب في هذا المسير وفي نطاقك)
            <select className="input w-full mt-1" value={employeeId ?? ''} onChange={event => selectEmployee(event.target.value ? Number(event.target.value) : null)}>
              <option value="">— اختر —</option>
              {(candidates ?? []).map(row => <option key={row.employeeId} value={row.employeeId}>{row.fullName ?? `#${row.employeeId}`} {row.employeeCode ? `(${row.employeeCode})` : ''} — {row.basisLabels.join('، ')}</option>)}
            </select>
          </label>
          {entries && (<>
            <p className="text-xs text-gray-600">سعر اليوم {formatMoney(entries.dayRate)} · حد المبلغ بلا مرفق {formatMoney(entries.attachmentThreshold)} ({entries.attachmentThresholdDays} يوم) · أساس المنح: {entries.basisLabels.join('، ')}</p>
            <div className="flex flex-wrap gap-4 text-sm">
              {allowAll && <label className="flex items-center gap-1"><input type="radio" checked={scopeKind === 'ALL_DEDUCTIONS'} onChange={() => { setScopeKind('ALL_DEDUCTIONS'); setTarget('') }} /> كل الخصومات القابلة للإعفاء</label>}
              <label className="flex items-center gap-1"><input type="radio" checked={scopeKind === 'DEDUCTION_TYPE'} onChange={() => { setScopeKind('DEDUCTION_TYPE'); setTarget('') }} /> نوع خصم</label>
              <label className="flex items-center gap-1"><input type="radio" checked={scopeKind === 'SINGLE_ENTRY'} onChange={() => { setScopeKind('SINGLE_ENTRY'); setTarget('') }} /> قيد واحد</label>
            </div>
            {scopeKind !== 'ALL_DEDUCTIONS' && (
              <select className="input w-full" value={target} onChange={event => setTarget(event.target.value)}>
                <option value="">— اختر {scopeKind === 'DEDUCTION_TYPE' ? 'النوع' : 'القيد'} —</option>
                {(scopeKind === 'DEDUCTION_TYPE' ? typeOptions : entryOptions).map(option => <option key={option.value} value={option.value} disabled={'disabled' in option ? option.disabled : false}>{option.label}</option>)}
              </select>
            )}
            {typedTarget && (
              <label className="block text-sm">مصير الخصم المصنف المشمول
                <select className="input w-full mt-1" value={disposition} onChange={event => setDisposition(event.target.value as ExemptionDisposition)}>
                  <option value="DROP">{EXEMPTION_DISPOSITION_LABELS.DROP}</option>
                  <option value="DEFER_ONE_PERIOD">{EXEMPTION_DISPOSITION_LABELS.DEFER_ONE_PERIOD}</option>
                </select>
              </label>
            )}
            {loanTarget && entries.installments.length > 0 && <p className="p-2 bg-amber-50 text-amber-900 rounded-lg text-sm">سيُؤجَّل القسط لا يُسقط: عند صرف المسير يُنشأ قسط جديد مستحق في الشهر التالي بمرجع الإعفاء.</p>}
            {(entries.recoveries.length > 0 || entries.typedObligations.some(row => !row.exemptable) || Number(entries.unpaidLeave) > 0) && (
              <div className="text-xs text-gray-600"><p className="font-medium">بنود غير قابلة للإعفاء تبقى:</p><ul className="list-disc pr-5">
                {entries.typedObligations.filter(row => !row.exemptable).map(row => <li key={row.obligationId}>{row.typeName ?? 'خصم مصنف'} #{row.obligationId} — {formatMoney(row.amount)}: {row.protectedReason}</li>)}
                {entries.recoveries.map(row => <li key={row.obligationId}>{row.label} #{row.obligationId} — {formatMoney(row.amount)}: {row.protectedReason}</li>)}
                {Number(entries.unpaidLeave) > 0 && <li>إجازة بدون راتب — {formatMoney(entries.unpaidLeave)}: عدم استحقاق لا خصم</li>}
              </ul></div>
            )}
            <label className="block text-sm">السبب (إلزامي، {settings.reasonMinLength} حرفًا وثلاث كلمات مختلفة على الأقل)
              <textarea className="input w-full mt-1" rows={2} value={reason} onChange={event => setReason(event.target.value)} />
            </label>
            <label className="block text-sm">مرجع المرفق (إلزامي فوق {formatMoney(entries.attachmentThreshold)})
              <input className="input w-full mt-1" value={attachmentRef} onChange={event => setAttachmentRef(event.target.value)} maxLength={300} />
            </label>
            {data.permissions.canOverride && (
              <label className="block text-sm">تبرير تجاوز الحدود (عند بلوغ حد إعفاءات الموظف أو فترة التهدئة أو إعادة إعفاء بعد إلغاء فقط)
                <textarea className="input w-full mt-1" rows={2} value={overrideReason} onChange={event => setOverrideReason(event.target.value)} />
              </label>
            )}
            <p className="text-xs text-gray-500">المانح وتاريخ المنح يُسجلان من الخادم. بعد الحفظ أعد حساب المسير ليُطبق الإعفاء.</p>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary text-sm" disabled={busy || !input || reason.trim().length < settings.reasonMinLength} onClick={runPreview}>معاينة</button>
              <button type="button" className="btn-primary text-sm" disabled={busy || !preview} onClick={submit}>حفظ الإعفاء</button>
            </div>
          </>)}
          {preview && (
            <div className="p-3 bg-gray-50 rounded-xl text-sm space-y-2">
              <p className="font-medium">المبلغ المُعفى المقدر: {formatMoney(preview.estimatedAmount)} — {preview.statusLabel} ({preview.basisLabel})</p>
              <div className="overflow-x-auto"><table className="w-full text-xs text-right">
                <thead><tr className="text-gray-500"><th className="p-1">البند</th><th className="p-1">الأصل</th><th className="p-1">المُعفى</th><th className="p-1">بعد الإعفاء</th></tr></thead>
                <tbody>{preview.lines.map((line, index) => <tr key={index} className="border-t"><td className="p-1">{line.label}{line.note ? ` — ${line.note}` : ''}</td><td className="p-1 font-mono">{formatMoney(line.originalAmount)}</td><td className="p-1 font-mono">{formatMoney(line.exemptedAmount)}</td><td className="p-1 font-mono">{formatMoney(line.afterAmount)}</td></tr>)}</tbody>
              </table></div>
              <ul className="list-disc pr-5 text-xs text-gray-700">{preview.warnings.map(warning => <li key={warning.code}>{warning.message}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
