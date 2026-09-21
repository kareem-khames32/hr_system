'use client'

// الخطوة 22 (B5): لوحة أحداث المسير — من فعل ماذا ومتى، بالاسم والسبب وأهم ما في الحدث
// (نسخة الحساب، الصافي، وضع المحرك، تقرير التكافؤ الموقّع، رخصة الشركة الصغيرة، قيد الصرف، الاستبعاد لحل تعارض).
import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { localDateStr } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { COLLECTION_CLASS_LABELS, fetchPayrollRunEventsView, PAY_CHANNEL_LABELS, payrollRunErrorMessage, type PayrollCollectionClass,
  type PayrollPayChannel, type PayrollRunEventView } from '../../lib/payroll-runs-api'

export const PAYROLL_RUN_EVENT_LABELS: Record<string, string> = {
  DRAFT_CREATED: 'أنشأ مسودة المسير', DRAFT_UPDATED: 'عدّل تعريف المسودة', CREATED: 'أنشأ المسير واحتسبه', CALCULATED: 'احتسب المسودة',
  RECALCULATED: 'أعاد حساب المسير', UNASSIGNED_ACKNOWLEDGED: 'أقر بتقرير «موظفون بلا مسير»', PARITY_EXPLAINED: 'كتب أسباب فروق التكافؤ',
  ENGINE_MODE_CHANGED: 'غيّر وضع محرك الحساب', PARITY_COUNTING_CHANGED: 'غيّر احتساب المسير في فترة التكافؤ', APPROVED: 'اعتمد المسير ووقّع تقرير التكافؤ', PAID: 'صرف المسير', REOPENED: 'أعاد فتح المسير', CANCELLED: 'ألغى المسير',
  // C8 / الخطوة 31: مسار العكس والمسير التكميلي بعد الصرف
  REVERSAL_CREATED: 'أنشأ مسير عكس صرف مربوطًا', REVERSAL_POSTED: 'نفّذ عكس صرف بنود من هذا المسير', REVERSAL_CANCELLED: 'ألغى مسير عكس قبل تنفيذه',
  SUPPLEMENTARY_CREATED: 'أنشأ مسيرًا تكميليًا مربوطًا بهذا المسير',
  // قرار المالك (22 سبتمبر): سلسلة اعتماد المسير، وصرف المسير موظف بموظف
  CHAIN_STEP_APPROVED: 'اعتمد خطوته في سلسلة الاعتماد', CHAIN_REJECTED: 'رفض المسير وأرجعه لمسؤول الرواتب', CHAIN_CHANGED: 'غيّر سلسلة الاعتماد والمسير في نص الاعتماد',
  DISBURSEMENT_MARKED: 'علّم صرف رواتب موظفين',
}
const SNAPSHOT_MODES: Record<string, string> = { FIRST_CALCULATION: 'التقاط أول', STORED: 'من اللقطة المحفوظة', REFRESHED: 'تحديث صريح للقطة' }

const record = (value: unknown) => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
const count = (value: unknown) => Array.isArray(value) ? value.length : 0

/** أهم تفاصيل الحدث بنص عربي قصير (لا تُعرض الحمولة الخام). */
export function payrollRunEventDetails(event: Pick<PayrollRunEventView, 'eventType' | 'payload'>): string[] {
  const payload = event.payload ?? {}
  const after = record(payload.after)
  const details: string[] = []
  const version = after?.snapshotVersion ?? payload.snapshotVersion
  if (typeof version === 'number' && version > 0) details.push(`نسخة الحساب ${version}`)
  const totalNet = after?.totalNet ?? payload.totalNet
  if (typeof totalNet === 'number' && ['CREATED', 'CALCULATED', 'RECALCULATED', 'APPROVED', 'PAID'].includes(event.eventType)) details.push(`صافي المسير ${formatMoney(totalNet)}`)
  const diff = record(payload.diff)
  if (diff && event.eventType === 'RECALCULATED') details.push(`إضافة ${count(diff.addedEmployeeIds)} • حذف ${count(diff.removedEmployeeIds)} • تغيّر ${count(diff.changedEmployeeIds)}`)
  const snapshot = record(payload.policySnapshot)
  if (snapshot && typeof snapshot.mode === 'string') details.push(`لقطة السياسة: ${SNAPSHOT_MODES[snapshot.mode] ?? snapshot.mode}`)
  const collection = record(payload.collection)
  if (collection && Array.isArray(collection.order)) {
    details.push(`${collection.source === 'POLICY_VERSION' ? 'ترتيب تحصيل النسخة' : 'ترتيب التحصيل الافتراضي'}: ${collection.order.map(kind => COLLECTION_CLASS_LABELS[kind as PayrollCollectionClass] ?? kind).join(' ← ')}`)
  }
  const exclusions = Array.isArray(payload.exclusionsAdded) ? payload.exclusionsAdded.map(record).filter(Boolean) as Array<Record<string, unknown>> : []
  for (const row of exclusions) details.push(`استبعاد الموظف رقم ${row.employeeId}: ${row.reason}`)
  if (event.eventType === 'ENGINE_MODE_CHANGED') details.push(`من ${payload.from ?? 'قبل D13'} إلى ${payload.to}${payload.recalculationRequired ? ' — يلزم إعادة الحساب' : ''}`)
  if (event.eventType === 'PARITY_EXPLAINED' && typeof payload.count === 'number') details.push(`${payload.count} سببًا مكتوبًا`)
  if (event.eventType === 'PARITY_COUNTING_CHANGED') details.push(payload.counts === true ? 'يُحتسب في فترة التكافؤ' : 'مسير تجريبي: لا يُحتسب في فترة التكافؤ')
  if (event.eventType === 'UNASSIGNED_ACKNOWLEDGED' && typeof payload.rowCount === 'number') details.push(`${payload.rowCount} موظفًا في التقرير`)
  if (event.eventType === 'APPROVED') {
    if (typeof payload.engineMode === 'string') details.push(`وضع المحرك ${payload.engineMode}`)
    if (typeof payload.parityReportHash === 'string') details.push(`بصمة تقرير التكافؤ ${payload.parityReportHash.slice(0, 12)}`)
    const explained = record(payload.parityExplained)
    if (explained) details.push(`أسباب مكتوبة: فروق ${explained.differences ?? 0} • قيم غائبة ${explained.unavailable ?? 0}`)
    if (payload.smallCompanyException === true) details.push('بترخيص الشركة الصغيرة: المعتمِد هو من احتسب')
  }
  if (event.eventType === 'PAID') {
    if (typeof payload.channel === 'string') details.push(`القناة: ${PAY_CHANNEL_LABELS[payload.channel as PayrollPayChannel] ?? payload.channel}`)
    if (typeof payload.reference === 'string') details.push(`المرجع: ${payload.reference}`)
  }
  // C8 / الخطوة 31: روابط العكس والتكميلي وما أعاده التنفيذ
  if (event.eventType === 'DRAFT_CREATED' && payload.runType === 'SUPPLEMENTARY' && typeof payload.parentRunId === 'number') details.push(`مسير تكميلي مربوط بالمسير المصروف #${payload.parentRunId}`)
  if (['REVERSAL_CREATED', 'REVERSAL_POSTED', 'REVERSAL_CANCELLED'].includes(event.eventType)) {
    if (typeof payload.reversalRunId === 'number') details.push(`مسير العكس #${payload.reversalRunId}`)
    if (typeof payload.parentRunId === 'number') details.push(`المسير المصروف #${payload.parentRunId}`)
    if (Array.isArray(payload.employeeIds)) details.push(`${payload.employeeIds.length} موظف`)
    if (typeof payload.totalNet === 'number') details.push(`صافي العكس ${formatMoney(payload.totalNet)}`)
  }
  if (event.eventType === 'SUPPLEMENTARY_CREATED') {
    if (typeof payload.supplementaryRunId === 'number') details.push(`المسير التكميلي #${payload.supplementaryRunId}`)
    if (Array.isArray(payload.employeeIds)) details.push(`${payload.employeeIds.length} موظف`)
  }
  if (event.eventType === 'CHAIN_STEP_APPROVED' || event.eventType === 'CHAIN_REJECTED') {
    if (typeof payload.stepOrder === 'number') details.push(`الخطوة ${payload.stepOrder} من ${payload.stepCount ?? '—'}${typeof payload.stepLabel === 'string' ? ` «${payload.stepLabel}»` : ''}`)
    if (payload.final === true) details.push('الاعتماد النهائي')
    if (payload.smallCompanyException === true) details.push('بترخيص الشركة الصغيرة: المعتمِد هو من احتسب')
  }
  if (event.eventType === 'DISBURSEMENT_MARKED') {
    details.push(`${payload.paid === true ? 'تم الصرف' : 'لم يتم'} لـ${typeof payload.count === 'number' ? payload.count : 0} موظف`)
    if (typeof payload.total === 'number') details.push(`بإجمالي ${formatMoney(payload.total)}`)
  }
  const disbursement = record(payload.disbursement)
  if (event.eventType === 'PAID' && disbursement?.mode === 'PER_EMPLOYEE') {
    details.push(`صرف موظف بموظف: تم ${disbursement.paidCount ?? 0} • لم يتم ${disbursement.unpaidCount ?? 0}`)
  }
  const effects = record(payload.effects)
  if (effects) details.push(`أعاد التنفيذ: إضافي ${effects.overtime ?? 0} • أقساط ${effects.installments ?? 0} • قيود دفتر ${effects.obligations ?? 0} • حجوزات فترة ${effects.releasedClaims ?? 0}`)
  return details
}

const when = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : `${localDateStr(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function PayrollRunEventsList({ events }: { events: readonly PayrollRunEventView[] }) {
  if (!events.length) return <p className="text-sm text-gray-400">لا توجد أحداث مسجلة لهذا المسير.</p>
  return (
    <ol className="space-y-2">
      {[...events].reverse().map(event => {
        const details = payrollRunEventDetails(event)
        return (
          <li key={event.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-gray-800">{event.actorName ?? `مستخدم #${event.actorUserId}`} — {PAYROLL_RUN_EVENT_LABELS[event.eventType] ?? `حدث ${event.eventType}`}</span>
              <span className="text-xs text-gray-500" dir="ltr">{when(event.createdAt)}</span>
            </div>
            {event.reason && <p className="mt-1 text-gray-700">السبب: {event.reason}</p>}
            {details.length > 0 && <p className="mt-1 text-xs text-gray-600">{details.join(' • ')}</p>}
          </li>
        )
      })}
    </ol>
  )
}

export function PayrollRunEventsPanel({ runId, refreshKey }: { runId: number; refreshKey: string }) {
  const [events, setEvents] = useState<PayrollRunEventView[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    setEvents(null); setError('')
    fetchPayrollRunEventsView(runId)
      .then(rows => { if (!cancelled) setEvents(rows) })
      .catch(e => { if (!cancelled) setError(payrollRunErrorMessage(e, 'تعذر تحميل سجل المسير')) })
    return () => { cancelled = true }
  }, [runId, refreshKey])
  return (
    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
      <p className="text-sm font-bold text-gray-800 flex items-center gap-2"><History size={16} className="text-primary-600" />سجل المسير: من فعل ماذا ومتى</p>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {events ? <div className="max-h-80 overflow-y-auto"><PayrollRunEventsList events={events} /></div> : !error && <p className="text-sm text-gray-400">جارٍ تحميل السجل…</p>}
    </div>
  )
}
