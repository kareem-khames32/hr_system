'use client'

// الخطوة 23 (B5): فترة التكافؤ التشغيلية قبل التحويل العام إلى POLICY — موثقة ومقروءة من المسيرات الحقيقية، لا محاكاة.
// تصحيح المراجعة: الشهر يُحتسب فقط لو كل مسيراته الحية مكتملة، والمسير المعلّم تجريبيًا لا يُحتسب ولا يحجب، وصاحب القرار مسمى.
import { useEffect, useState } from 'react'
import { fetchPayrollParityHistory, payrollRunErrorMessage, type PayrollParityOperations } from '../../lib/payroll-runs-api'

export const PARITY_OPERATIONS_PLAN_TEXT = 'فترة التكافؤ التشغيلية (الخطوة 23): أول 3 مسيرات شهرية تُعتمد وتُصرف بوضع SHADOW وتقرير تكافؤها موقّع ببصمته في حدث الاعتماد، ثم شهران آخران بالطريقة نفسها، ثم قرار التحويل العام إلى POLICY من المالك أو مفوض مكتوب اسمه في ملف التسليم. الشهر يُحتسب فقط لو كل مسيراته الحية كذلك (مسير LEGACY أو غير مصروف في الشهر نفسه يوقفه)، والمسير المعلّم تجريبيًا بسبب مكتوب لا يُحتسب ولا يحجب شهره. قاعدة D13 تبقى: تحويل مسير بعينه متاح لحامل «اعتماد المسير» متى كان تكافؤه صفرًا أو كل فرق بسبب مسجل، ويُسجل القرار في سجل المسير.'

/** يُطلق بعد تعليم مسير تجريبيًا أو إعادته حتى يعيد العدّاد القراءة. */
export const PARITY_COUNTING_CHANGED_EVENT = 'payroll-parity-counting-changed'

export function PayrollParityOperationsSummary({ operations }: { operations: PayrollParityOperations }) {
  const blocked = (operations.periods ?? []).filter(period => !period.counted)
  const notCounted = operations.runs.filter(run => !run.counted && !run.excluded)
  const excludedRuns = operations.excludedRuns ?? operations.runs.filter(run => run.excluded).length
  return (
    <div className="space-y-1 text-xs text-gray-600">
      <p className="font-medium text-gray-800">{operations.message}</p>
      {operations.countedPeriods.length > 0 && <p>الأشهر المحتسبة: <span dir="ltr">{operations.countedPeriods.join('، ')}</span></p>}
      {blocked.slice(0, 3).map(period => (
        <p key={period.period}>الشهر <span dir="ltr">{period.period}</span> غير مكتمل: {period.blockers.map(blocker => `المسير #${blocker.runId} ${blocker.reason}`).join('؛ ')}</p>
      ))}
      {notCounted.slice(0, 5).map(run => (
        <p key={run.runId}>المسير #{run.runId} ({run.period}) لا يُحتسب: {run.notCountedReason}</p>
      ))}
      {excludedRuns > 0 && <p>{excludedRuns} مسيرًا معلّمًا تجريبيًا بسبب مكتوب: لا يُحتسب ولا يحجب شهره.</p>}
      <p>صاحب قرار التحويل العام: {operations.plan?.decisionOwner ?? 'المالك'} • {operations.plan?.delegate ? `المفوض المسمى: ${operations.plan.delegate}` : 'لا مفوض مسمى في ملف التسليم'}</p>
    </div>
  )
}

export function PayrollParityOperationsNote() {
  const [operations, setOperations] = useState<PayrollParityOperations | null>(null)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    const reload = () => setRefresh(value => value + 1)
    window.addEventListener(PARITY_COUNTING_CHANGED_EVENT, reload)
    return () => window.removeEventListener(PARITY_COUNTING_CHANGED_EVENT, reload)
  }, [])
  useEffect(() => {
    let cancelled = false
    fetchPayrollParityHistory()
      .then(result => { if (!cancelled) { setOperations(result); setError('') } })
      .catch(e => { if (!cancelled) setError(payrollRunErrorMessage(e, 'تعذر قراءة سجل التكافؤ التشغيلي')) })
    return () => { cancelled = true }
  }, [refresh])
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 space-y-2">
      <p className="text-xs text-blue-900">{PARITY_OPERATIONS_PLAN_TEXT}</p>
      {error && <p className="text-xs text-red-700">{error}</p>}
      {operations && <PayrollParityOperationsSummary operations={operations} />}
    </div>
  )
}
