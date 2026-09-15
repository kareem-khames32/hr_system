'use client'

// الخطوة 16 (مراجعة): مسودة محفوظة — معاينة عضويتها مع «استبعاد بسبب مكتوب» لأي موظف داخل النطاق، ومنهم أصحاب مشاكل البيانات
// التي تمنع «احتساب المسودة». الحفظ تعديل لتعريف المسودة نفسها (PATCH)؛ المعاينة تبقى قراءة فقط.
import { useState } from 'react'
import {
  payrollRunErrorMessage, updatePayrollRunDraft,
  type PayrollExclusionCandidate, type PayrollMembershipPreview, type PayrollRunWithSelection,
} from '../../lib/payroll-runs-api'
import { PayrollMembershipPreviewView } from './PayrollMembershipPreviewView'

export function PayrollDraftMembership({ draft, preview, currency, canEdit, onUpdated }: {
  draft: PayrollRunWithSelection; preview: PayrollMembershipPreview; currency: string; canEdit: boolean
  onUpdated: () => void | Promise<void>
}) {
  const [target, setTarget] = useState<PayrollExclusionCandidate | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const stored = draft.selection?.exclusions ?? []

  const save = async () => {
    if (!target || reason.trim().length < 3 || busy) return
    setBusy(true); setError('')
    try {
      // الاستبعادات السابقة تُرسل كما هي (يحفظ الخادم من أضافها ومتى)، والجديد يُضاف بسببه.
      await updatePayrollRunDraft(draft.id, { exclusions: [
        ...stored.filter(row => row.employeeId !== target.employeeId).map(row => ({ employeeId: row.employeeId, reason: row.reason })),
        { employeeId: target.employeeId, reason: reason.trim() },
      ] })
      setTarget(null); setReason('')
      await onUpdated()
    } catch (e) {
      setError(payrollRunErrorMessage(e, 'تعذر حفظ الاستبعاد على المسودة'))
    } finally { setBusy(false) }
  }
  const problems = preview.totals.dataProblems

  return (
    <div className="space-y-3" data-testid="payroll-draft-membership">
      {problems > 0 && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
        {problems} موظف بمشكلة بيانات يمنعون «احتساب المسودة»{canEdit ? ' — صحح بياناتهم، أو اضغط «استبعاد بسبب مكتوب» على صفوفهم أدناه' : ''}.</p>}
      {target && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2" data-testid="payroll-draft-exclusion-form">
        <p className="text-sm font-medium text-amber-900">استبعاد {target.label} من المسودة #{draft.id} — السبب إجباري ويُحفظ على تعريف المسير</p>
        <div className="flex flex-wrap gap-2">
          <input autoFocus value={reason} onChange={e => setReason(e.target.value)} maxLength={500} disabled={busy} className="input flex-1 min-w-48"
            aria-label="سبب الاستبعاد" placeholder="سبب الاستبعاد (مثل: تاريخ آخر يوم عمل ناقص — يُصرف في مسير تكميلي)" />
          <button type="button" onClick={save} disabled={busy || reason.trim().length < 3} className="btn-primary text-sm disabled:opacity-50">حفظ الاستبعاد</button>
          <button type="button" onClick={() => { setTarget(null); setReason(''); setError('') }} disabled={busy} className="btn-secondary text-sm">إلغاء</button>
        </div>
      </div>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <PayrollMembershipPreviewView preview={preview} currency={currency} excludedIds={stored.map(row => row.employeeId)} disabled={busy}
        onExclude={canEdit ? candidate => { setTarget(candidate); setReason(''); setError('') } : undefined} />
    </div>
  )
}
