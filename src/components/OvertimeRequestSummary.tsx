'use client'

import Link from 'next/link'
import type { ApiOvertimeRequestDetail } from '@/lib/api'
import { DISPLAY_LOCALE } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

const number = (value: unknown): number | null => value == null || !Number.isFinite(Number(value)) ? null : Number(value)
const duration = (value: unknown) => {
  const minutes = number(value)
  if (minutes == null) return 'غير متاح'
  return `${Math.floor(minutes / 60)} س${minutes % 60 ? ` ${minutes % 60} د` : ''} (${minutes} دقيقة)`
}
const time = (value?: string | null) => {
  if (!value) return 'غير متاح'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'غير متاح' : date.toLocaleString(DISPLAY_LOCALE)
}
const dayLabels: Record<string, string> = { WEEKDAY: 'يوم عمل', WEEKEND: 'راحة أسبوعية', HOLIDAY: 'عطلة رسمية' }
const workdayClock = (minutes: number) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}${minutes >= 1440 ? ' (+1 يوم)' : ''}`
const eventLabels: Record<string, string> = {
  DETECTED: 'اكتشاف الساعات', DETECTION_REFRESHED: 'تحديث أدلة الاكتشاف', SUBMITTED: 'تقديم الطلب',
  RESUBMITTED: 'إعادة تقديم الأدلة', STEP_APPROVED: 'اعتماد خطوة', MINUTES_REDUCED: 'تخفيض الدقائق',
  APPROVED: 'اكتمال الاعتماد وتثبيت القيمة', APPROVED_ZERO: 'اكتمل الاعتماد والإضافي المحسوب = صفر', REJECTED: 'رفض', RETURNED: 'إعادة لاستكمال المعلومات',
  CANCELLED: 'إلغاء', AUTO_CANCELLED: 'إلغاء بعد مراجعة الحضور', CLAIM_RELEASED: 'تحرير حجز اليوم', STEP_ESCALATED: 'تصعيد الخطوة',
}

// طلب الفترة المقفولة اللي إضافيه بيتحسب من البصمات وقت الاعتماد النهائي (لسه ماتحسبش).
export function overtimeComputedAtApproval(overtime?: ApiOvertimeRequestDetail | null): boolean {
  const snapshot = overtime?.calculationSnapshot
  return snapshot?.submission?.computeAtApproval === true && !snapshot.approval && !snapshot.approvalResult
}

// نفس حد الخادم: آخر تخفيض ثم حد الطلب والدليل، والساعات الصريحة للمستثنى.
export function overtimeApprovalLimit(overtime?: ApiOvertimeRequestDetail | null): number | null {
  const snapshot = overtime?.calculationSnapshot
  const evidence = snapshot?.submission?.evidence
  if (!evidence?.schedule || !evidence.policy || !Array.isArray(evidence.blockers) || !Array.isArray(evidence.flags) || overtimeComputedAtApproval(overtime)) return null
  const requested = number(snapshot?.submission?.requestedMinutes)
  const detected = number(evidence.detectedMinutes)
  const base = evidence.evidenceMode === 'EXEMPT_APPROVAL' ? requested : detected == null ? null : Math.min(detected, requested ?? detected)
  const limit = number(snapshot?.review?.approvedMinutes) ?? base
  return limit != null && Number.isSafeInteger(limit) && limit > 0 ? limit : null
}

export default function OvertimeRequestSummary({ overtime, reviewRequired }: {
  overtime?: ApiOvertimeRequestDetail
  reviewRequired?: boolean
}) {
  if (!overtime && !reviewRequired) return null
  const snapshot = overtime?.calculationSnapshot
  const savedEvidence = snapshot?.submission?.evidence
  const evidence = savedEvidence?.schedule && savedEvidence.policy && Array.isArray(savedEvidence.blockers) && Array.isArray(savedEvidence.flags) ? savedEvidence : undefined
  const approval = snapshot?.approval
  const requested = snapshot?.submission?.requestedMinutes
  const approved = number(overtime?.approvedMinutes) ?? number(approval?.approvedMinutes)
  const amount = number(overtime?.amountSnapshot) ?? number(approval?.amount)
  const limit = overtimeApprovalLimit(overtime)
  const atApproval = overtimeComputedAtApproval(overtime)
  const result = snapshot?.approvalResult
  return (
    <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-4" aria-label="أدلة ومراجعة العمل الإضافي">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-bold text-gray-800">مراجعة العمل الإضافي</h3>
        {overtime && <span className="text-xs text-gray-500">اليوم <span dir="ltr">{overtime.date}</span> · القيد #{overtime.id}</span>}
      </div>
      {(reviewRequired || !evidence) && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        أدلة تقديم الإضافي غير مكتملة. أعد الطلب للمقدّم لتحديث الأدلة قبل الموافقة.
      </p>}
      {evidence && <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><p className="text-gray-500">الدوام المحفوظ</p><p className="font-medium">{evidence.schedule.name || 'بلا دوام محدد'} {evidence.schedule.start && <span dir="ltr">({evidence.schedule.start} – {evidence.schedule.end})</span>}</p></div>
          <div><p className="text-gray-500">نوع اليوم والمعامل</p><p className="font-medium">{dayLabels[approval?.dayKind ?? evidence.dayKind] ?? 'غير محدد'} · ×{approval?.multiplier ?? evidence.policy.multiplier}</p></div>
          {evidence.evidenceMode === 'EXEMPT_APPROVAL' ? <p className="sm:col-span-2 rounded-lg bg-white p-3 text-indigo-700">
            ساعات صريحة لموظف مستثنى مستحق للإضافي، باعتماد المدير والموارد البشرية؛ لا تُستخرج من البصمة.
          </p> : <>
            <div><p className="text-gray-500">بصمة الدخول</p><p>{time(evidence.firstIn)}</p></div>
            <div><p className="text-gray-500">بصمة الخروج</p><p>{time(evidence.lastOut)}</p></div>
            <div className="sm:col-span-2"><p className="text-gray-500">بداية الوقت الإضافي</p><p>{evidence.dayKind !== 'WEEKDAY' ? 'كل مدة العمل المثبتة في يوم العطلة' : evidence.schedule.overtimeStartMinute == null ? 'ساعات العمل المطلوبة ماكملتش' : <>بعد إكمال ساعات اليوم المطلوبة — <span dir="ltr">{workdayClock(evidence.schedule.overtimeStartMinute)}</span></>}</p></div>
            {evidence.dayKind === 'WEEKDAY' && evidence.workedMinutes != null && evidence.requiredMinutes != null && <>
              <div><p className="text-gray-500">الشغل الفعلي</p><p>{duration(evidence.workedMinutes)}</p></div>
              <div><p className="text-gray-500">ساعات العمل المطلوبة</p><p>{duration(evidence.requiredMinutes)}</p></div>
            </>}
            <div><p className="text-gray-500">المدة قبل التقريب والسقف</p><p>{duration(evidence.rawMinutes)}</p></div>
            <div><p className="text-gray-500">الساعات التي حسبها النظام</p><p className="font-semibold text-indigo-700">{duration(evidence.detectedMinutes)}</p></div>
          </>}
          <div><p className="text-gray-500">المطلوب من الموظف</p><p>{requested == null ? 'لم يحدد ساعات؛ المرجع رقم النظام' : duration(requested)}</p></div>
          <div><p className="text-gray-500">{approved != null ? 'الساعات المعتمدة نهائيًا' : 'الحد الحالي للاعتماد'}</p><p className="font-semibold">{duration(approved ?? limit)}</p></div>
        </div>
        <p className="text-xs text-gray-600">نافذة الإضافي: {evidence.window.open ? 'مفتوحة' : 'مغلقة — يتطلب الطلب سببًا'} · {evidence.window.reason}</p>
        <p className="text-xs text-gray-500">{evidence.evidenceMode !== 'EXEMPT_APPROVAL' && <>العتبة {evidence.policy.thresholdMinutes} دقيقة · التقريب للأسفل كل {evidence.policy.roundingMinutes} دقيقة · </>}{evidence.policy.maxDailyMinutes > 0 ? `السقف اليومي ${duration(evidence.policy.maxDailyMinutes)}` : 'السقف اليومي غير مفعّل'}</p>
        {evidence.evidenceMode === 'EXEMPT_APPROVAL' && evidence.policy.maxDailyMinutes > 0 && number(requested) != null && Number(requested) > evidence.policy.maxDailyMinutes && <p className="text-sm text-amber-800">الساعات المطلوبة تتجاوز السقف اليومي؛ يلزم تخفيضها قبل اكتمال الاعتماد.</p>}
        {evidence.flags.includes('DAILY_CAP_TRIMMED') && <p className="text-sm text-amber-800">خُفّضت الساعات المحتسبة إلى السقف اليومي؛ المدة الخام محفوظة أعلاه.</p>}
        {atApproval && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          الطلب اتقدم والفترة مقفولة: الإضافي هيتحسب من بصمات اليوم لحظة الاعتماد النهائي بنفس القاعدة (الشغل الفعلي − الساعات المطلوبة بشرط الاستحقاق)، ولو طلع صفر هيتسجل صفر. الأرقام اللي فوق وقت التقديم بس.
        </p>}
        {!atApproval && !result && !!evidence.blockers.length && <ul role="alert" className="space-y-1 text-sm text-red-700">{evidence.blockers.map((blocker, index) => <li key={`${blocker.code}-${index}`}>{blocker.message}</li>)}</ul>}
      </>}
      {result && <div className={`rounded-lg p-3 text-sm ${result.approvedMinutes > 0 ? 'bg-success-50 text-success-800' : 'bg-amber-50 text-amber-800'}`}>
        <p className="font-semibold">{result.message}</p>
        <p className="text-xs mt-1">الدخول/الخروج وقت الحساب: <span dir="ltr">{result.checkIn ?? '—'} / {result.checkOut ?? '—'}</span>
          {result.workedMinutes != null && <> · الشغل الفعلي {duration(result.workedMinutes)}</>}
          {result.requiredMinutes != null && <> · المطلوب {duration(result.requiredMinutes)}</>}
          {' '}· المحسوب {duration(result.detectedMinutes)}</p>
      </div>}
      {overtime?.wageEvidence && !overtime.wageEvidence.ready && <div role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 space-y-1">
        <p>يُسعَّر الإضافي عند الاعتماد النهائي على راتب شهر <span dir="ltr">{overtime.wageEvidence.wagePayrollPeriod}</span> الذي يقع فيه يوم العمل، ولا يوجد لهذا الشهر راتب موثق؛ الاعتماد النهائي سيُرفض حتى يُثبت راتب الشهر من <Link href="/payroll/salary-history" className="underline">سجل الأجر</Link>.</p>
        {overtime.wageEvidence.message && <p className="text-xs">{overtime.wageEvidence.message}</p>}
      </div>}
      {overtime?.wageEvidence?.ready && overtime.wageEvidence.sourceKind === 'CURRENT_FILE_UNVERIFIED' && <p className="text-xs text-amber-700">
        سيُسعَّر على راتب الملف غير الموثق لشهر <span dir="ltr">{overtime.wageEvidence.wagePayrollPeriod}</span> (الوضع الانتقالي لمصدر الراتب).
      </p>}
      {amount != null && <div className="rounded-lg bg-success-50 p-3 text-success-800">
        <p className="text-sm">القيمة المثبتة عند الاعتماد</p><p className="text-lg font-bold">{formatMoney(amount)}</p>
        {approval?.approvedAt && <p className="text-xs mt-1">اعتمدت في {time(approval.approvedAt)}</p>}
      </div>}
      {overtime?.originalPeriod && <p className="text-sm text-amber-800">{overtime.deferredFromRunId != null ? 'مستحق بأثر رجعي عن فترة' : 'فترة الاستحقاق الأصلية'} {overtime.originalPeriod}</p>}
      {!!overtime?.events.length && <div className="border-t border-indigo-100 pt-3">
        <h4 className="font-semibold text-sm text-gray-700 mb-2">سجل المراجعة والقرارات</h4>
        <ol className="space-y-2">
          {overtime.events.map(event => <li key={event.id} className="rounded-lg bg-white p-3 text-sm">
            <div className="flex justify-between gap-2 flex-wrap"><p className="font-medium">{eventLabels[event.eventType] ?? 'تحديث سجل الإضافي'}{event.stepOrder != null ? ` · الخطوة ${event.stepOrder}` : ''}</p><span className="text-xs text-gray-500">{time(event.createdAt)}</span></div>
            <p className="text-xs text-gray-500 mt-1">{event.actorUserId ? `بواسطة ${event.actorName || 'أحد المستخدمين'}` : 'بواسطة النظام'}</p>
            {event.beforeMinutes != null && event.approvedMinutes != null && <p className="mt-1">من {duration(event.beforeMinutes)} إلى {duration(event.approvedMinutes)}</p>}
            {event.reason && <p className="text-gray-700 mt-1 whitespace-pre-wrap">{event.reason}</p>}
          </li>)}
        </ol>
      </div>}
    </section>
  )
}
