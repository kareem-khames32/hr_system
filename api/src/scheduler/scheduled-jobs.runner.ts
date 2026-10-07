import { Injectable, Type } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { AttendanceScheduler } from '../attendance/attendance-scheduler.service'
import { DeviceSyncService } from '../attendance/device-sync.service'
import { OffboardingService } from '../offboarding/offboarding.service'
import { PayrollDailyAccrualScheduler } from '../payroll/payroll-daily-accrual.scheduler'
import { TypedDeductionsScheduler } from '../payroll/typed-deductions-scheduler.service'
import { LeaveAttachmentDeadlineJob } from '../requests/leave-attachment-deadline.job'
import { RequestsScheduler } from '../requests/requests-scheduler.service'
import { RequestsService } from '../requests/requests.service'
import { QueueService } from '../queue/queue.service'
import { NotificationsService } from '../notifications/notifications.service'
import { TasksService } from '../tasks/tasks.service'
import { SavedReportsService } from '../reports/saved-reports.service'
import { Scheduled } from './scheduled-jobs'
import { ScheduledJobsService } from './scheduled-jobs.service'

// كل مواعيد النظام في مكان واحد (خطة التنفيذ B1.4): كل مهمة هنا بـ@Scheduled (موعدها بتوقيت النظام الصريح) وبتعدي على
// ScheduledJobsService.tick (الموديول والقفل وخانة الدقيقة والسجل). الشغل نفسه في خدماته زي ما هو — والدوال اللي هنا بتنادي النسخة
// اللي بترمي الخطأ عشان «فشلت» تتسجل. النداء المباشر (الاختبارات واللحاق وقت الإقلاع) لسه بينادي دوال الخدمات من غير الغلاف.
@Injectable()
export class ScheduledJobsRunner {
  constructor(private readonly jobs: ScheduledJobsService, private readonly refs: ModuleRef) {}

  private use<T>(type: Type<T>): T {
    return this.refs.get(type, { strict: false })
  }

  @Scheduled('attendance.materialize-absences')
  materializeAbsences() {
    return this.jobs.tick('attendance.materialize-absences', () => this.use(AttendanceScheduler).catchUp(false))
  }

  @Scheduled('attendance.materialize-absences.catch-up')
  materializeAbsencesCatchUp() {
    return this.jobs.tick('attendance.materialize-absences.catch-up', () => this.use(AttendanceScheduler).catchUp(true))
  }

  @Scheduled('attendance.device-sync')
  deviceSync() {
    return this.jobs.tick('attendance.device-sync', () => this.use(DeviceSyncService).scheduledSync())
  }

  @Scheduled('overtime.reconcile-auto')
  overtimeReconcile() {
    return this.jobs.tick('overtime.reconcile-auto', () => this.use(RequestsService).reconcileAutoOvertime())
  }

  @Scheduled('payroll.daily-accrual')
  payrollDailyAccrual() {
    return this.jobs.tick('payroll.daily-accrual', () => this.use(PayrollDailyAccrualScheduler).hourlyWork())
  }

  @Scheduled('payroll.deductions-sla')
  deductionsSla() {
    return this.jobs.tick('payroll.deductions-sla', () => this.use(TypedDeductionsScheduler).processStepSlaWork())
  }

  @Scheduled('offboarding.finalize-due')
  offboardingFinalizeDue() {
    return this.jobs.tick('offboarding.finalize-due', () => this.use(OffboardingService).finalizeDue())
  }

  @Scheduled('leave.attachment-deadline')
  leaveAttachmentDeadline() {
    return this.jobs.tick('leave.attachment-deadline', () => this.use(LeaveAttachmentDeadlineJob).dailyWork())
  }

  @Scheduled('leave.year-start')
  leaveYearStart() {
    return this.jobs.tick('leave.year-start', () => this.use(RequestsScheduler).yearStartWork())
  }

  @Scheduled('requests.scheduled-transfers')
  scheduledTransfers() {
    return this.jobs.tick('requests.scheduled-transfers', () => this.use(RequestsScheduler).transfers())
  }

  @Scheduled('documents.expiry-events')
  documentExpiryEvents() {
    return this.jobs.tick('documents.expiry-events', () => this.use(QueueService).recordDocumentExpiryEvents())
  }

  @Scheduled('requests.escalations')
  escalations() {
    return this.jobs.tick('requests.escalations', () => this.use(RequestsScheduler).escalations())
  }

  @Scheduled('notifications.daily-digest')
  notificationsDailyDigest() {
    return this.jobs.tick('notifications.daily-digest', () => this.use(NotificationsService).digestHourlyWork())
  }

  @Scheduled('tasks.reminders')
  tasksReminders() {
    return this.jobs.tick('tasks.reminders', () => this.use(TasksService).runReminders())
  }

  // B2.13-ب: التقارير المحفوظة المستحقة النهارده لبريد أصحابها
  @Scheduled('reports.scheduled')
  scheduledReports() {
    return this.jobs.tick('reports.scheduled', () => this.use(SavedReportsService).sendDue())
  }

  // B2.4: ومعاه مهام الطابور المنتهية (DONE) الأقدم من نفس المدة — الطابور ماكانلوش تنضيف
  @Scheduled('scheduler.prune-runs')
  pruneRuns() {
    return this.jobs.tick('scheduler.prune-runs', async () => {
      await this.jobs.prune()
      await this.use(QueueService).pruneDone()
    })
  }
}
