'use client'

import { Fragment, useEffect, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react'
import { can } from '@/lib/api'
import { collectLoanRecovery, fetchLoanRecoveries, formatLoanMoney, loanMoneyInputValid, writeOffLoanRecovery, type LoanRecovery } from '@/lib/loans-api'

// AD-13: أرصدة السلف غير المغطاة بعد التصفية — تبقى PENDING_RECOVERY حتى تحصيلها أو شطبها بصلاحية مستقلة وسبب.
const statusLabels: Record<LoanRecovery['status'], string> = { PENDING_RECOVERY: 'بانتظار التحصيل', RECOVERED: 'محصّل', WRITTEN_OFF: 'مشطوب', CANCELLED: 'ملغى' }
const statusBadge: Record<LoanRecovery['status'], string> = { PENDING_RECOVERY: 'badge-warning', RECOVERED: 'badge-success', WRITTEN_OFF: 'badge-primary', CANCELLED: 'bg-gray-100 text-gray-600' }
const actionLabels: Record<string, string> = { CREATED: 'تسجيل الرصيد عند اعتماد التصفية', COLLECTED: 'تحصيل', WRITTEN_OFF: 'شطب', CANCELLED: 'إلغاء' }

export function LoanRecoveriesPanel({ currency }: { currency: string }) {
  const [rows, setRows] = useState<LoanRecovery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [action, setAction] = useState<{ row: LoanRecovery; kind: 'collect' | 'writeoff' } | null>(null)
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [perms, setPerms] = useState({ repay: false, writeOff: false })

  const load = () => { setLoading(true); setError(''); fetchLoanRecoveries().then(setRows).catch(e => setError(e instanceof Error ? e.message : 'تعذر تحميل الأرصدة')).finally(() => setLoading(false)) }
  useEffect(() => { setPerms({ repay: can('loans.repay'), writeOff: can('loans.write_off') }); load() }, [])

  const open = (row: LoanRecovery, kind: 'collect' | 'writeoff') => { setAction({ row, kind }); setAmount(''); setReference(''); setReason(''); setActionError('') }
  const submit = async () => {
    if (!action) return
    setBusy(true); setActionError('')
    try {
      if (action.kind === 'collect') await collectLoanRecovery(action.row.id, { amount: amount.trim(), reference: reference.trim(), reason: reason.trim() || undefined })
      else await writeOffLoanRecovery(action.row.id, reason.trim())
      setAction(null); load()
    } catch (e) { setActionError(e instanceof Error ? e.message : 'تعذر تنفيذ الإجراء') } finally { setBusy(false) }
  }
  const valid = action?.kind === 'collect' ? loanMoneyInputValid(amount) && reference.trim().length > 0 : reason.trim().length >= 10

  return (
    <div className="card overflow-hidden p-0">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-bold text-gray-800">أرصدة السلف بعد انتهاء الخدمة</h3>
        <p className="text-sm text-gray-500">ما لم تغطه مستحقات التصفية يبقى مدينًا ولا يُشطب تلقائيًا.</p>
      </div>
      {error && <div role="alert" className="bg-red-50 text-red-700 p-3 flex items-center gap-2"><AlertTriangle size={16} />{error}</div>}
      {loading ? <div className="py-10 text-center text-gray-400">جارٍ التحميل...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-right px-4 py-3">الموظف</th>
                <th className="text-center px-4 py-3">رصيد السلف</th>
                <th className="text-center px-4 py-3">المُقاصّ</th>
                <th className="text-center px-4 py-3">المدين المتبقي</th>
                <th className="text-center px-4 py-3">المفتوح الآن</th>
                <th className="text-center px-4 py-3">الحالة</th>
                <th className="text-center px-4 py-3">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <Fragment key={row.id}>
                  <tr className="table-row">
                    <td className="table-cell">
                      <p className="font-medium text-gray-800">{row.employeeName}</p>
                      <p className="text-xs text-gray-500">ملف #{row.caseId}{row.settlementDocRef ? ` — ${row.settlementDocRef}` : ''}{row.lastWorkingDay ? ` — آخر يوم ${row.lastWorkingDay}` : ''}</p>
                    </td>
                    <td className="table-cell text-center font-mono">{formatLoanMoney(row.loanBalance)}</td>
                    <td className="table-cell text-center font-mono">{formatLoanMoney(row.coveredAmount)}</td>
                    <td className="table-cell text-center font-mono">{formatLoanMoney(row.amount)}</td>
                    <td className="table-cell text-center font-mono font-bold">{formatLoanMoney(row.openAmount)} <span className="text-xs text-gray-500 font-sans">{currency}</span></td>
                    <td className="table-cell text-center"><span className={`badge ${statusBadge[row.status]}`}>{statusLabels[row.status]}</span></td>
                    <td className="table-cell text-center">
                      <div className="flex items-center justify-center gap-2">
                        {row.status === 'PENDING_RECOVERY' && perms.repay && <button className="btn-secondary text-sm" onClick={() => open(row, 'collect')}>تحصيل</button>}
                        {row.status === 'PENDING_RECOVERY' && perms.writeOff && <button className="btn-secondary text-sm text-danger-600" onClick={() => open(row, 'writeoff')}>شطب</button>}
                        <button aria-label="سجل الحركات" className="p-2 hover:bg-gray-100 rounded-lg" onClick={() => setExpanded(expanded === row.id ? null : row.id)}>{expanded === row.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                      </div>
                    </td>
                  </tr>
                  {expanded === row.id && (
                    <tr><td colSpan={7} className="bg-gray-50 px-6 py-3">
                      <ul className="text-sm text-gray-600 space-y-1">
                        {row.events.map(event => (
                          <li key={event.id}>{event.createdAt.slice(0, 10)} — {actionLabels[event.action] ?? event.action}{event.amount ? ` ${formatLoanMoney(event.amount)}` : ''}{event.reference ? ` — مرجع ${event.reference}` : ''} — المتبقي بعدها {formatLoanMoney(event.balanceAfter)}{event.reason ? ` — ${event.reason}` : ''}</li>
                        ))}
                      </ul>
                    </td></tr>
                  )}
                </Fragment>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">لا توجد أرصدة سلف بعد انتهاء الخدمة</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {action && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="recovery-action-title">
            <div className="flex items-center justify-between mb-4">
              <h3 id="recovery-action-title" className="font-bold text-gray-800 text-lg">{action.kind === 'collect' ? 'تحصيل رصيد سلفة' : 'شطب رصيد سلفة'}</h3>
              <button disabled={busy} onClick={() => setAction(null)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق"><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">{action.row.employeeName} — المفتوح {formatLoanMoney(action.row.openAmount)} {currency}</p>
            {action.kind === 'writeoff' && <p className="text-sm text-amber-800 bg-amber-50 rounded-xl p-3 mb-3">الشطب يغلق المتبقي كله ويُسجل باسمك وسببك في مسار التدقيق.</p>}
            {actionError && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 mb-3">{actionError}</div>}
            <div className="space-y-4">
              {action.kind === 'collect' && <>
                <div><label className="label" htmlFor="recovery-amount">المبلغ ({currency}) *</label>
                  <input id="recovery-amount" className="input" dir="ltr" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} disabled={busy} /></div>
                <div><label className="label" htmlFor="recovery-reference">المرجع *</label>
                  <input id="recovery-reference" className="input" maxLength={100} value={reference} onChange={e => setReference(e.target.value)} disabled={busy} /></div>
              </>}
              <div><label className="label" htmlFor="recovery-reason">{action.kind === 'writeoff' ? 'سبب الشطب * (10 أحرف على الأقل)' : 'ملاحظة'}</label>
                <textarea id="recovery-reason" className="input" rows={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} /></div>
            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button className="btn-primary flex-1 disabled:opacity-50" onClick={submit} disabled={busy || !valid}>{busy ? 'جارٍ التنفيذ...' : action.kind === 'collect' ? 'تسجيل التحصيل' : 'تأكيد الشطب'}</button>
              <button className="btn-secondary" disabled={busy} onClick={() => setAction(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
