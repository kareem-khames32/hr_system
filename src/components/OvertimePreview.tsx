'use client'

import Link from 'next/link'
import type { ApiOvertimePreview } from '@/lib/api'

const duration = (minutes: number) => `${Math.floor(minutes / 60)} ساعة و${minutes % 60} دقيقة`
const dayNames = { WEEKDAY: 'يوم عمل', WEEKEND: 'راحة أسبوعية', HOLIDAY: 'عطلة رسمية' }

export default function OvertimePreview({ preview, loading, error, onRefresh }: {
  preview: ApiOvertimePreview | null; loading: boolean; error: string; onRefresh: () => void
}) {
  return <section className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3" aria-label="معاينة احتساب الإضافي" aria-live="polite">
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-bold text-gray-800">احتساب الإضافي من سجل اليوم</h3>
      <button type="button" onClick={onRefresh} disabled={loading} className="text-sm text-primary-700 underline disabled:opacity-50">تحديث المعاينة</button>
    </div>
    {loading ? <p className="text-sm text-gray-600">جارٍ مراجعة الوردية والبصمات...</p> : error ? <p role="alert" className="text-sm text-red-700">{error}</p> : preview ? <>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-gray-500">الوردية</dt><dd>{preview.schedule.name || 'لا توجد وردية'} <span dir="ltr">{preview.schedule.start} – {preview.schedule.end}</span></dd></div>
        <div><dt className="text-gray-500">نوع اليوم والمضاعف المتوقع</dt><dd>{dayNames[preview.dayKind]} · ×{preview.policy.multiplier}</dd></div>
        <div><dt className="text-gray-500">الدخول / الانصراف</dt><dd dir="ltr">{preview.checkIn ?? '—'} / {preview.checkOut ?? '—'}</dd></div>
        <div><dt className="text-gray-500">حالة فترة الإضافي</dt><dd>{preview.window.open ? 'مفتوحة' : 'مغلقة — يلزم سبب للطلب'}</dd></div>
        {preview.evidenceMode === 'PUNCH' && <>
          {preview.dayKind === 'WEEKDAY' && preview.workedMinutes != null && preview.requiredMinutes != null && <>
            <div><dt className="text-gray-500">الشغل الفعلي</dt><dd>{duration(preview.workedMinutes)}</dd></div>
            <div><dt className="text-gray-500">ساعات العمل المطلوبة</dt><dd>{duration(preview.requiredMinutes)}</dd></div>
          </>}
          <div><dt className="text-gray-500">الزيادة قبل التقريب</dt><dd>{duration(preview.rawMinutes)}</dd></div>
          <div><dt className="text-gray-500">الوقت المحتسب من النظام</dt><dd className="font-bold text-primary-700">{duration(preview.detectedMinutes)}</dd></div>
        </>}
      </dl>
      <p className="text-xs text-gray-600">{preview.window.reason}</p>
      {preview.evidenceMode === 'EXEMPT_APPROVAL' ? <p className="text-sm text-amber-800">{preview.overtimeEligible ? 'الموظف مستثنى من الحضور ومسموح له بالإضافي بقرار اعتماد. اكتب الساعات المطلوبة؛ لا تُستنتج ساعات من البصمة في هذا المسار.' : 'الموظف مستثنى من الحضور ولا تسمح سياسة استثنائه الحالية باستحقاق الإضافي.'}{preview.policy.maxDailyMinutes > 0 && ` السقف اليومي ${duration(preview.policy.maxDailyMinutes)}.`}</p> : <p className="text-xs text-gray-600">الإضافي بيتحسب بعد إكمال ساعات العمل المطلوبة لليوم، مش بعد ميعاد نهاية الوردية. شرط الاستحقاق: الزيادة لازم توصل {preview.policy.thresholdMinutes} دقيقة — ولو وصلت بتتحسب كلها، والتقريب لتحت كل {preview.policy.roundingMinutes} دقيقة.{preview.policy.maxDailyMinutes > 0 && ` السقف اليومي ${duration(preview.policy.maxDailyMinutes)}.`}</p>}
      {!!preview.deferredBlockers?.length && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 space-y-1">
        <p>الفترة مقفولة: تقدر تقدّم الطلب، والإضافي هيتحسب من بصمات اليوم وقت الاعتماد النهائي بنفس القاعدة (ولو طلع صفر هيتسجل صفر).</p>
        <ul className="list-disc list-inside text-xs">{preview.deferredBlockers.map((blocker, index) => <li key={`${blocker.code}-${index}`}>{blocker.message}</li>)}</ul>
      </div>}
      {preview.rawMinutes > preview.detectedMinutes && preview.evidenceMode === 'PUNCH' && !preview.blockers.length && <p className="text-xs text-amber-800">الفرق بين الوقت الفعلي والمحتسب ناتج عن قواعد العتبة والتقريب والسقف اليومي.</p>}
      {preview.blockers.length > 0 && <ul role="alert" className="list-disc list-inside text-sm text-red-700 space-y-1">{preview.blockers.map((blocker, index) => <li key={`${blocker.code}-${index}`}>{blocker.message}</li>)}</ul>}
      {preview.existingRecord && !preview.resubmission && <div className="text-sm text-amber-800">يوجد سجل إضافي لهذا اليوم. {preview.existingRecord.requestId ? <Link className="underline" href={`/approvals-inbox?request=${preview.existingRecord.requestId}`}>متابعة الطلب #{preview.existingRecord.requestId}</Link> : 'سيظهر طلبه عند توجيهه لدورة الاعتماد.'}</div>}
      <p className="text-xs text-gray-500">هذه معاينة للساعات. تُثبّت القيمة المالية عند اكتمال الاعتماد.</p>
    </> : <p className="text-sm text-gray-600">اختر تاريخ العمل لعرض البصمات والساعات المحتسبة.</p>}
  </section>
}
