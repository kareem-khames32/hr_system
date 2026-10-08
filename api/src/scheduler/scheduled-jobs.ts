import { Cron } from '@nestjs/schedule'
import { systemTimeZone } from './schedule-time-zone'

// قايمة المهام المجدولة (خطة التنفيذ B1.4) — مكان واحد لكل مواعيد النظام. كل مهمة بتشتغل من ScheduledJobsRunner بـ@Scheduled(id)،
// وكل تشغيل بيعدي على ScheduledJobsService.tick: موديولها مفعّل، وقفل SQL باسم lock (نسخة واحدة من الـAPI في المرة)، وصف واحد
// لكل دقيقة (نسخة تانية في نفس الدقيقة بتتعدّى)، وسجل التشغيل. النداء المباشر للدوال (الاختبارات واللحاق وقت الإقلاع) من غير الغلاف.
export interface ScheduledJobDef {
  /** الموعد بصيغة cron (5 خانات = دقائق، 6 = ثواني) بتوقيت النظام (systemTimeZone) */
  cron: string
  /** اسم المهمة في سجل الموديولات (jobEnabled) — null = مهمة أساسية بتشتغل دايمًا */
  module: string | null
  /** اسم قفل التشغيل: مهمتين بيعملوا نفس الشغل (التجسيد اليومي ولحاقه) بيشتركوا فيه فمابيتداخلوش */
  lock: string
  label: string
  schedule: string
}

export const SCHEDULED_JOBS = {
  'attendance.materialize-absences': { cron: '0 1 * * *', module: 'attendance.materialize-absences', lock: 'attendance.materialize-absences',
    label: 'تجسيد الغياب', schedule: 'كل يوم 01:00' },
  'attendance.materialize-absences.catch-up': { cron: '30 2-23 * * *', module: 'attendance.materialize-absences', lock: 'attendance.materialize-absences',
    label: 'لحاق تجسيد الغياب لو اتأخر', schedule: 'كل ساعة من 02:30 لـ23:30' },
  'attendance.device-sync': { cron: '*/5 * * * *', module: 'attendance.device-sync', lock: 'attendance.device-sync',
    label: 'سحب البصمات من الأجهزة', schedule: 'فحص كل 5 دقائق (فاصل السحب من إعدادات الحضور)' },
  'overtime.reconcile-auto': { cron: '45 */3 * * * *', module: 'overtime.reconcile-auto', lock: 'overtime.reconcile-auto',
    label: 'توجيه الإضافي المكتشف بالبصمة', schedule: 'كل 3 دقائق' },
  'payroll.daily-accrual': { cron: '15 * * * *', module: 'payroll.daily-accrual', lock: 'payroll.daily-accrual',
    label: 'التراكم اليومي للمسير', schedule: 'فحص كل ساعة عند الدقيقة 15 — الشغل في الساعة المضبوطة (والساعة 10 لحاق)' },
  'payroll.deductions-sla': { cron: '*/15 * * * *', module: 'payroll.deductions-sla', lock: 'payroll.deductions-sla',
    label: 'مهلة اعتماد الخصومات', schedule: 'كل 15 دقيقة' },
  'offboarding.finalize-due': { cron: '30 0 * * *', module: 'offboarding.finalize-due', lock: 'offboarding.finalize-due',
    label: 'إتمام إنهاء الخدمة المستحق', schedule: 'كل يوم 00:30' },
  'leave.attachment-deadline': { cron: '20 0 * * *', module: 'leave.attachment-deadline', lock: 'leave.attachment-deadline',
    label: 'مهلة مرفقات الإجازات بعد الرجوع', schedule: 'كل يوم 00:20' },
  'leave.year-start': { cron: '5 0 * * *', module: 'leave.year-start', lock: 'leave.year-start',
    label: 'ترحيل وتجديد أرصدة الإجازات', schedule: 'كل يوم 00:05' },
  'requests.scheduled-transfers': { cron: '15 0 * * *', module: 'requests.scheduled-transfers', lock: 'requests.scheduled-transfers',
    label: 'تنفيذ النقل المجدول', schedule: 'كل يوم 00:15' },
  'requests.escalations': { cron: '0 * * * *', module: 'requests.escalations', lock: 'requests.escalations',
    label: 'تصعيد الطلبات المتأخرة', schedule: 'كل ساعة' },
  'documents.expiry-events': { cron: '50 0 * * *', module: 'documents.expiry-events', lock: 'documents.expiry-events',
    label: 'أحداث المستندات اللي هتنتهي (للطابور)', schedule: 'كل يوم 00:50' },
  'notifications.daily-digest': { cron: '5 * * * *', module: 'notifications.daily-digest', lock: 'notifications.daily-digest',
    label: 'الملخص اليومي لإشعارات البريد', schedule: 'فحص كل ساعة عند الدقيقة 5 — الإرسال في الساعة المضبوطة (افتراضي 8 الصبح)' },
  'tasks.reminders': { cron: '30 7 * * *', module: 'tasks.reminders', lock: 'tasks.reminders',
    label: 'تذكير المهام وتصعيد المتأخر منها', schedule: 'كل يوم 07:30' },
  'onboarding.probation-tasks': { cron: '40 7 * * *', module: 'onboarding.probation-tasks', lock: 'onboarding.probation-tasks',
    label: 'مهام قرار فترة التجربة قبل نهايتها', schedule: 'كل يوم 07:40' },
  'privacy.retention-alerts': { cron: '50 7 * * *', module: 'privacy.retention-alerts', lock: 'privacy.retention-alerts',
    label: 'مهام مراجعة البيانات اللي عدّت مدة الاحتفاظ', schedule: 'كل يوم 07:50' },
  'reports.scheduled': { cron: '20 * * * *', module: 'reports.scheduled', lock: 'reports.scheduled',
    label: 'إرسال التقارير المجدولة بالبريد', schedule: 'فحص كل ساعة عند الدقيقة 20 — الإرسال من الساعة 7 الصبح' },
  'scheduler.prune-runs': { cron: '40 3 * * *', module: null, lock: 'scheduler.prune-runs',
    label: 'مسح سجل المهام ومهام الطابور المنتهية الأقدم من 30 يوم', schedule: 'كل يوم 03:40' },
} as const satisfies Record<string, ScheduledJobDef>

export type ScheduledJobId = keyof typeof SCHEDULED_JOBS
export const SCHEDULED_JOB_IDS = Object.keys(SCHEDULED_JOBS) as ScheduledJobId[]

/** سجل التشغيل بيتمسح بعد المدة دي */
export const SCHEDULED_RUNS_KEEP_DAYS = 30

/** موعد المهمة بالاسم وبتوقيت النظام الصريح — الاسم نفسه في SchedulerRegistry (الموعد الجاي في الشاشة) */
export const Scheduled = (id: ScheduledJobId) => Cron(SCHEDULED_JOBS[id].cron, { name: id, timeZone: systemTimeZone() })

/** خانة التشغيل: الدقيقة بتوقيت UTC — نسختين من الـAPI بيطلعوا نفس الخانة لنفس الموعد، فالتانية بتتعدّى */
export function scheduledSlot(at: Date): string {
  return `${at.toISOString().slice(0, 16)}Z`
}
