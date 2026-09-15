'use client'

// الخطوة 22 (B5): الصرف يسجل من صرف وقناة الصرف ومرجعه (SRS PR-11)؛ القيد يظهر بعد الصرف على المسير وفي سجله.
// تبسيط الرواتب: القناة «مختلط حسب طريقة صرف كل موظف» والمرجع «اسم المسير وشهره» متعبّيان جاهزين، وقابلان للتعديل.
import { CheckCircle } from 'lucide-react'
import { PAY_CHANNEL_LABELS, type PayrollPayChannel, type PayrollRunScreenFields } from '../../lib/payroll-runs-api'

export interface PayRecordDraft { channel: PayrollPayChannel | ''; reference: string }
export const payRecordReady = (draft: PayRecordDraft) => draft.channel !== '' && draft.reference.trim().length >= 3 && draft.reference.trim().length <= 100

/** قيد الصرف الجاهز: القناة المختلطة ومرجع باسم المسير وشهره (حد المرجع 100 حرف). */
export function defaultPayRecord(run: { name?: string | null; period: string } | null | undefined): PayRecordDraft {
  if (!run) return { channel: 'MIXED', reference: '' }
  const reference = `${(run.name ?? '').trim() || 'مسير الرواتب'} ${run.period}`
  return { channel: 'MIXED', reference: reference.length > 100 ? `${reference.slice(0, 100 - run.period.length - 1).trim()} ${run.period}` : reference }
}

export function PayrollPayRecordForm({ draft, onChange, disabled, onPay }: { draft: PayRecordDraft; onChange: (draft: PayRecordDraft) => void; disabled: boolean; onPay: () => void }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-xs text-gray-600">قناة الصرف
        <select className="input text-sm mt-1 block" value={draft.channel} disabled={disabled} onChange={event => onChange({ ...draft, channel: event.target.value as PayRecordDraft['channel'] })}>
          {(Object.keys(PAY_CHANNEL_LABELS) as PayrollPayChannel[]).map(channel => <option key={channel} value={channel}>{PAY_CHANNEL_LABELS[channel]}</option>)}
        </select>
      </label>
      <label className="text-xs text-gray-600 flex-1 min-w-48">مرجع الصرف
        <input className="input text-sm mt-1 w-full" value={draft.reference} maxLength={100} disabled={disabled} onChange={event => onChange({ ...draft, reference: event.target.value })}
          placeholder="رقم التحويل أو الشيك أو اسم المسير" />
      </label>
      <button type="button" onClick={onPay} disabled={disabled || !payRecordReady(draft)} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
        title={payRecordReady(draft) ? undefined : 'اكتب مرجع الصرف أولًا'}>
        <CheckCircle size={16} />
        صرف المسير
      </button>
    </div>
  )
}

/** سطر قيد الصرف بعد الصرف: من صرف والقناة والمرجع. */
export function PayrollPayRecordSummary({ run }: { run: PayrollRunScreenFields }) {
  const record = run.payRecord
  if (!record) return null
  return (
    <p className="text-xs text-success-700">
      صرفه {record.paidBy ? record.paidBy.name ?? 'غير معروف' : 'غير مسجل'}
      {record.channelLabel ? ` • القناة: ${record.channelLabel}` : ''}{record.reference ? ` • المرجع: ${record.reference}` : ''}
    </p>
  )
}
