'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ChevronDown, ChevronUp, ClipboardCheck } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { can } from '@/lib/api'
import { formatDateTime } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { useCurrency } from '@/lib/currency'
import { dayRangeLabel } from '@/lib/payroll-month-range'
import { PayrollApprovalChainStrip } from '@/components/payroll/PayrollApprovalChainStrip'
import { PayrollApprovalReviewTable, PayrollApprovalReviewTotals } from '@/components/payroll/PayrollApprovalReviewTable'
import { approvePayrollChainStep, fetchMyPayrollApprovals, fetchPayrollApprovalReview, rejectPayrollChainStep,
  type PayrollApprovalReview, type PayrollPendingApproval } from '@/lib/payroll-approval-chain-api'

// «مسيرات بانتظار اعتمادي» (قرار المالك 22 سبتمبر): المسيرات المحسوبة اللي خطوتها الحالية باسمي أو بدوري.
// تسميتي في السلسلة هي المنحة: بقرأ المسير المنتظر عندي (موظفيه وأرقامه) وبعتمد خطوتي أو برفضها بسبب — حتى لو دوري بلا أي صلاحية رواتب.

const RUN_TYPES: Record<string, string> = { REVERSAL: 'مسير عكس صرف', SUPPLEMENTARY: 'مسير تكميلي' }
const messageOf = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback
const runTitle = (run: { name: string | null; period: string }) => run.name || `مسير ${run.period}`

export default function PayrollMyApprovalsPage() {
  const currency = useCurrency()
  const [rows, setRows] = useState<PayrollPendingApproval[] | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)
  const [review, setReview] = useState<PayrollApprovalReview | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const load = useCallback(async () => {
    try { setRows(await fetchMyPayrollApprovals()) }
    catch (cause) { setRows([]); setError(messageOf(cause, 'تعذر تحميل المسيرات المنتظرة')) }
  }, [])
  useEffect(() => { load() }, [load])

  const open = async (runId: number) => {
    if (openId === runId) { setOpenId(null); setReview(null); return }
    setOpenId(runId); setReview(null); setReviewLoading(true); setError('')
    try { setReview(await fetchPayrollApprovalReview(runId)) }
    catch (cause) { setOpenId(null); setError(messageOf(cause, 'تعذر تحميل المسير')) }
    finally { setReviewLoading(false) }
  }

  const decide = async (run: PayrollPendingApproval, action: () => Promise<unknown>, text: string) => {
    if (busy) return
    setBusy(true); setError(''); setDone('')
    try {
      await action()
      setDone(text)
      setOpenId(null); setReview(null)
      await load()
    } catch (cause) {
      setError(messageOf(cause, 'تعذر تسجيل القرار'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">مسيرات بانتظار اعتمادي</h1>
            <p className="text-gray-500 mt-1">المسيرات المحسوبة اللي الدور فيها عليك: راجع الأرقام، ثم اعتمد خطوتك أو ارفض بسبب</p>
          </div>
          {can('payroll.view') && <Link href="/payroll" className="btn-secondary text-sm">مسير الرواتب</Link>}
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2"><AlertTriangle size={18} />{error}</div>}
        {done && <div role="status" className="bg-success-50 text-success-700 rounded-xl p-4">{done}</div>}
        {rows === null && <p className="text-sm text-gray-400">جارٍ التحميل…</p>}
        {rows !== null && rows.length === 0 && (
          <div className="card text-center py-12">
            <ClipboardCheck size={40} className="mx-auto text-gray-300" />
            <p className="text-gray-500 mt-3">مفيش مسيرات منتظرة اعتمادك دلوقتي.</p>
          </div>
        )}

        {rows?.map(run => (
          <div key={run.runId} className="card space-y-4" data-pending-run={run.runId}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-gray-800">{runTitle(run)} — {run.period}{RUN_TYPES[run.runType] ? ` (${RUN_TYPES[run.runType]})` : ''}</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {dayRangeLabel({ from: String(run.startDate).slice(0, 10), to: String(run.endDate).slice(0, 10) })} • {run.employees} موظف • صافي {formatMoney(run.totalNet)} {currency}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  احتسبه: {run.calculatedBy?.name ?? 'غير معروف'}{run.calculatedAt ? ` — ${formatDateTime(run.calculatedAt)}` : ''}
                  {run.waitingSince ? ` • منتظر عندك من ${formatDateTime(run.waitingSince)}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${run.isFinal ? 'bg-primary-50 text-primary-700' : 'bg-amber-50 text-amber-800'}`}>
                  الخطوة {run.stepOrder} من {run.stepCount}: {run.stepLabel}{run.isFinal ? ' — الاعتماد النهائي' : ''}
                </span>
                <button type="button" onClick={() => open(run.runId)} disabled={busy} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50" data-review-run>
                  {openId === run.runId ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {openId === run.runId ? 'اقفل المراجعة' : 'راجع المسير'}
                </button>
              </div>
            </div>
            {run.blocked && <p role="alert" className="rounded-xl bg-amber-50 text-amber-900 text-sm p-3">{run.blocked}</p>}

            {openId === run.runId && reviewLoading && <p className="text-sm text-gray-400">جارٍ تحميل المسير…</p>}
            {openId === run.runId && review && (
              <div className="space-y-4 border-t border-gray-100 pt-4">
                {review.run.correctionReason && <p className="rounded-xl bg-sky-50 text-sky-900 text-sm p-3">سبب التصحيح: {review.run.correctionReason}</p>}
                <PayrollApprovalReviewTotals totals={review.totals} />
                <PayrollApprovalReviewTable key={run.runId} rows={review.rows} />

                <PayrollApprovalChainStrip chain={review.chain} busy={busy}
                  onApprove={() => decide(run, () => approvePayrollChainStep(run.runId),
                    run.isFinal ? `اتعتمد «${runTitle(run)}» اعتماد نهائي — القسائم ظهرت للموظفين` : `اتعتمدت خطوتك في «${runTitle(run)}» وراح للي بعدك`)}
                  onReject={reason => decide(run, () => rejectPayrollChainStep(run.runId, reason), `اترفض «${runTitle(run)}» ورجع لمسؤول الرواتب بسببك المكتوب`)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </MainLayout>
  )
}
