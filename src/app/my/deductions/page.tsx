'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import { MinusCircle } from 'lucide-react'
import { useCurrency } from '@/lib/currency'
import { DEDUCTION_STATUS_META, fetchMyDeductions, formatDeductionMoney, objectDeduction, type MyDeductionView } from '@/lib/deductions-api'
import { TypedDeductionsWorkspace } from '@/components/payroll/TypedDeductionsWorkspace'

// DD-08: الموظف يرى كل خصم مصنف عليه فور إنشائه بحالته وسببه وجهته المُنزِلة ومصير أقساطه في المسير،
// ويعترض خلال المهلة (الاعتراض يلزم المعتمِد بالرد قبل الاعتماد) ويرى الرد.
// المدير الهيكلي يجد تحتها مساحة إنشاء خصومات فريقه ومتابعة ما ينتظر اعتماده.
export default function MyDeductionsPage() {
  const currency = useCurrency()
  const [rows, setRows] = useState<MyDeductionView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [objecting, setObjecting] = useState<MyDeductionView | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const load = () => {
    setLoading(true)
    fetchMyDeductions()
      .then(setRows)
      .catch(e => setError(e instanceof Error ? e.message : 'تعذر تحميل خصوماتك'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const submitObjection = async () => {
    if (!objecting) return
    if (text.trim().length < 10) { setFormError('اكتب نص الاعتراض (10 أحرف على الأقل).'); return }
    setBusy(true); setFormError('')
    try { await objectDeduction(objecting.id, text.trim()); setObjecting(null); setText(''); load() }
    catch (e) { setFormError(e instanceof Error ? e.message : 'تعذر تسجيل الاعتراض') } finally { setBusy(false) }
  }
  const hoursLeft = (minutes: number) => minutes >= 1440 ? `${Math.floor(minutes / 1440)} يوم` : `${Math.max(1, Math.floor(minutes / 60))} ساعة`

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">خصوماتي</h1>
          <p className="text-gray-500 mt-1">الخصومات المصنفة عليك (جودة، التزام، إداري...) بحالتها قبل نزول المسير وبعده، مع حق الاعتراض خلال المهلة</p>
        </div>
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><MinusCircle size={20} className="text-danger-500" />الخصومات عليّ</h3>
          {loading ? (
            <div className="flex items-center justify-center py-10"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-400">لا توجد خصومات مصنفة عليك</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="text-right px-3 py-3">النوع</th>
                    <th className="text-right px-3 py-3">الواقعة والسبب</th>
                    <th className="text-center px-3 py-3">المبلغ ({currency})</th>
                    <th className="text-center px-3 py-3">شهر المسير</th>
                    <th className="text-right px-3 py-3">الجهة المُنزِلة</th>
                    <th className="text-center px-3 py-3">الحالة</th>
                    <th className="text-right px-3 py-3">في المسير</th>
                    <th className="text-right px-3 py-3">الاعتراض</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className="table-row align-top">
                      <td className="table-cell text-sm">{row.type.nameAr}<span className="block text-xs text-gray-400">{row.type.categoryLabel} — {row.type.calcMethodLabel}: {row.inputValue}</span></td>
                      <td className="table-cell text-sm"><span dir="ltr" className="text-xs text-gray-400">{row.incidentDate}</span><p className="text-gray-600 whitespace-pre-wrap">{row.reason}</p>
                        {row.decisionReason && <p className="text-xs text-gray-500">سبب القرار: {row.decisionReason}</p>}</td>
                      <td className="table-cell text-center font-mono">{formatDeductionMoney(row.amount)}<span className="block text-xs text-gray-400">{row.amountIsFinal ? 'نهائي' : 'تقديري'}</span></td>
                      <td className="table-cell text-center font-mono" dir="ltr">{row.targetPeriod}{row.installments > 1 ? ` (${row.installments})` : ''}</td>
                      <td className="table-cell text-sm">{row.issuer.basisLabel}{row.issuer.name ? <span className="block text-xs text-gray-400">{row.issuer.name}</span> : null}</td>
                      <td className="table-cell text-center"><span className={`px-2 py-0.5 rounded-full text-xs ${DEDUCTION_STATUS_META[row.status]?.className ?? 'bg-gray-100 text-gray-600'}`}>{row.statusLabel}</span></td>
                      <td className="table-cell text-xs text-gray-600">
                        {row.obligations.length === 0 ? '—' : row.obligations.map((item, index) => (
                          <p key={index} className={item.reversal ? 'text-success-700' : ''}>{item.reversal ? 'عكس لصالحك — ' : ''}<span dir="ltr">{item.targetPeriod}</span>: {formatDeductionMoney(item.amount)} — {item.statusLabel}
                            {item.appliedAmount ? ` (المحصل ${formatDeductionMoney(item.appliedAmount)}${item.appliedPeriod ? ` — مسير ${item.appliedPeriod}` : ''})` : ''}</p>
                        ))}
                      </td>
                      <td className="table-cell text-xs text-gray-600">
                        {row.objections.map(item => (
                          <div key={item.id} className="mb-1">
                            <p className="whitespace-pre-wrap">«{item.text}»</p>
                            {item.response ? <p className="text-success-700 whitespace-pre-wrap">الرد: {item.response.text}</p> : <p className="text-warning-700">بانتظار الرد</p>}
                          </div>
                        ))}
                        {row.canObject && <button type="button" className="btn-secondary text-xs px-2 py-1" onClick={() => { setObjecting(row); setText(''); setFormError('') }}>
                          اعتراض (متبقٍ {hoursLeft(row.objectionMinutesLeft)})</button>}
                        {!row.canObject && row.objections.length === 0 && '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {objecting && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-3">
              <h4 className="font-bold text-gray-800">اعتراض على {objecting.type.nameAr} #{objecting.id}</h4>
              <p className="text-sm text-gray-600">{formatDeductionMoney(objecting.amount)} {currency} لشهر <span dir="ltr">{objecting.targetPeriod}</span>. يظهر اعتراضك لكل معتمِد، ولا يُعتمد الخصم قبل الرد عليه.</p>
              <textarea className="input min-h-[100px] w-full" maxLength={1000} value={text} onChange={event => setText(event.target.value)} placeholder="اكتب سبب اعتراضك" />
              {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => setObjecting(null)} disabled={busy}>رجوع</button>
                <button type="button" className="btn-primary" onClick={submitObjection} disabled={busy}>{busy ? 'جارٍ الإرسال…' : 'إرسال الاعتراض'}</button>
              </div>
            </div>
          </div>
        )}
        <TypedDeductionsWorkspace currency={currency} mode="manager" />
      </div>
    </MainLayout>
  )
}
