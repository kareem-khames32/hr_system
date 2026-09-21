'use client'

// سلسلة اعتماد المسير على شاشة المسير (قرار المالك 22 سبتمبر): مين اعتمد ومين عليه الدور، و«اعتمد خطوتي» / «ارفض بسبب»
// لصاحب الخطوة الحالية بس، وسبب الرفض ظاهر لمسؤول الرواتب. مكوّن عرض: الشاشة هي اللي بتحمّل السلسلة وتنفّذ القرار.
import { useState } from 'react'
import { AlertTriangle, CheckCircle, Clock, Lock, XCircle } from 'lucide-react'
import { formatDateTime } from '../../lib/dates'
import { payrollChainRejectReasonReady, payrollChainStateText, PAYROLL_CHAIN_REJECT_REASON, type PayrollRunChain } from '../../lib/payroll-approval-chain-api'

const SOURCE_LABELS: Record<'COMPANY' | 'RUN_SERIES', string> = { COMPANY: 'سلسلة الشركة', RUN_SERIES: 'سلسلة خاصة بالمسير ده' }

export function PayrollApprovalChainStrip({ chain, busy, onApprove, onReject }: {
  chain: PayrollRunChain
  busy: boolean
  onApprove: () => void
  onReject: (reason: string) => void
}) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  if (!chain.governed) return null
  const previousRejection = chain.lastRejection && !chain.lastRejection.current ? chain.lastRejection : null
  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 my-4 space-y-3" data-approval-chain data-chain-state={chain.state}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-bold text-gray-800">سلسلة اعتماد المسير</h4>
          <p className="text-xs text-gray-600 mt-1" data-chain-state-text>{payrollChainStateText(chain)}</p>
        </div>
        {chain.source && <span className="badge bg-white text-indigo-700 border border-indigo-100">{SOURCE_LABELS[chain.source]}</span>}
      </div>

      <ol className="flex flex-wrap items-stretch gap-2" data-chain-steps>
        {chain.calculatedBy && (
          <li className="flex items-center gap-2 rounded-xl bg-white border border-gray-100 px-3 py-2 text-sm">
            <CheckCircle size={18} className="text-success-600 shrink-0" />
            <span><span className="block text-xs text-gray-500">الحساب — مسؤول الرواتب</span><span className="font-medium text-gray-800">{chain.calculatedBy.name ?? 'غير معروف'}</span></span>
          </li>
        )}
        {chain.steps.map(step => (
          <li key={step.order} data-chain-step={step.status}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${step.status === 'APPROVED' ? 'bg-white border-success-200'
              : step.status === 'CURRENT' ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-100 opacity-70'}`}>
            {step.status === 'APPROVED' ? <CheckCircle size={18} className="text-success-600 shrink-0" />
              : step.status === 'CURRENT' ? <Clock size={18} className="text-amber-600 shrink-0" /> : <Lock size={18} className="text-gray-400 shrink-0" />}
            <span>
              <span className="block text-xs text-gray-500">{step.order}. {step.label}{step.order === chain.steps.length ? ' — الاعتماد النهائي' : ''}</span>
              <span className="font-medium text-gray-800">{step.approvedBy?.name ?? step.approverName}{step.kind === 'ROLE' && !step.approvedBy ? ' (دور)' : ''}</span>
              {step.status === 'APPROVED' && step.approvedAt && <span className="block text-xs text-success-700">اعتمد {formatDateTime(step.approvedAt)}</span>}
              {step.status === 'CURRENT' && <span className="block text-xs text-amber-700">عليه الدور</span>}
            </span>
          </li>
        ))}
      </ol>

      {chain.rejection && (
        <div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800 space-y-1" data-chain-rejection>
          <p className="font-bold flex items-center gap-2"><XCircle size={16} />اترفض في خطوة «{chain.rejection.stepLabel}» — {chain.rejection.by?.name ?? 'أحد المعتمدين'}
            {chain.rejection.at ? ` — ${formatDateTime(chain.rejection.at)}` : ''}</p>
          <p>السبب: {chain.rejection.reason}</p>
          <p className="text-xs text-red-700">المسير رجع لمسؤول الرواتب: صحّح المطلوب ثم «إعادة حساب المسير» فتبدأ السلسلة من الخطوة الأولى.</p>
        </div>
      )}
      {previousRejection && (
        <p className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs text-gray-700" data-chain-previous-rejection>
          آخر رفض قبل إعادة الحساب (نسخة الحساب {previousRejection.snapshotVersion}) — {previousRejection.by?.name ?? 'أحد المعتمدين'}: {previousRejection.reason}
        </p>
      )}
      {chain.stuckMessage && <p role="alert" className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900 flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />{chain.stuckMessage}</p>}

      {chain.mine && chain.currentStep && (
        <div className="rounded-xl bg-white border border-amber-200 p-3 space-y-2" data-chain-my-step>
          <p className="text-sm font-medium text-gray-800">
            الدور عليك: «{chain.currentStep.label}»{chain.currentStep.isFinal ? ' — اعتمادك هو الاعتماد النهائي، وبعده القسائم تظهر للموظفين' : ''}
          </p>
          {chain.blocked && <p role="alert" className="text-sm text-amber-900 bg-amber-50 rounded-lg p-2">{chain.blocked.message}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onApprove} disabled={busy || !chain.canAct} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50" data-chain-approve>
              <CheckCircle size={16} />اعتمد خطوتي
            </button>
            <button type="button" onClick={() => setRejecting(open => !open)} disabled={busy || !chain.canAct} className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50" data-chain-reject-toggle>
              <XCircle size={16} />ارفض بسبب
            </button>
          </div>
          {rejecting && chain.canAct && (
            <div className="space-y-2">
              <label htmlFor={`chain-reject-${chain.runId}`} className="block text-sm font-medium text-gray-700">سبب الرفض (مطلوب — هيظهر لمسؤول الرواتب)</label>
              <textarea id={`chain-reject-${chain.runId}`} value={reason} onChange={event => setReason(event.target.value)} maxLength={PAYROLL_CHAIN_REJECT_REASON.max}
                rows={2} disabled={busy} className="input w-full" placeholder="اكتب المطلوب تصحيحه بوضوح" />
              <button type="button" disabled={busy || !payrollChainRejectReasonReady(reason)} onClick={() => onReject(reason.trim())}
                className="btn-secondary text-sm text-red-700 border-red-200 disabled:opacity-50" data-chain-reject-confirm>
                تأكيد الرفض وإرجاع المسير لمسؤول الرواتب
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PayrollApprovalChainStrip
