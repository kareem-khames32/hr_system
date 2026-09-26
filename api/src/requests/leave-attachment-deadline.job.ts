import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { DataSource, In } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { branchScopeOf, branchScopeQb, userHasPerm } from '../auth/guards'
import type { JwtPayload } from '../auth/auth.service'
import { Employee } from '../employees/employee.entity'
import { Leave } from './entities/leave.entities'
import { leaveAttachmentOverdue } from './leave-attachment-rules'

export interface LeaveAttachmentNotice {
  leaveId: number; employeeId: number; leaveTypeCode: string; fromDate: string; toDate: string; attachmentDueDate: string | null
}
export interface LeaveAttachmentNotification {
  id: string; category: 'leave'; kind: 'warning' | 'error'; title: string; body: string; at: Date | string; link: string; keys?: string[]
}

const noticeOf = (leave: Leave): LeaveAttachmentNotice => ({ leaveId: leave.id, employeeId: leave.employeeId, leaveTypeCode: leave.leaveTypeCode,
  fromDate: leave.fromDate, toDate: leave.toDate, attachmentDueDate: leave.attachmentDueDate ?? null })

/**
 * مهمة يومية لمرفق الإجازة «بعد الرجوع» (قرار المالك 16 سبتمبر):
 * - PENDING لم تنقضِ مهلته → تذكير للموظف وللموارد البشرية (الإشعارات في النظام مشتقة من السجلات وقت القراءة، فالتذكير
 *   يظهر يوميًا بمعرّف اليوم ما دام المرفق معلقًا — notificationsFor أدناه تبنيه لبوابة الإشعارات).
 * - اليوم بعد attachmentDueDate بلا رفع → MISSED و isUnpaid = true فيخصم المسير أيامها، وإشعار للطرفين.
 * run(today) تُشغَّل مرة واحدة من الاختبار.
 */
@Injectable()
export class LeaveAttachmentDeadlineJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(LeaveAttachmentDeadlineJob.name)
  private catchUpTimer: NodeJS.Timeout | null = null

  constructor(private readonly ds: DataSource) {}

  // لحاق بعد الإقلاع (تعطل الخادم وقت المهمة لا يؤخر التحويل يومًا كاملًا)
  onApplicationBootstrap() {
    this.catchUpTimer = setTimeout(() => void this.daily(), 60_000)
    this.catchUpTimer.unref?.()
  }

  onModuleDestroy() {
    if (this.catchUpTimer) clearTimeout(this.catchUpTimer)
  }

  // كل يوم 00:20
  @Cron('20 0 * * *')
  async daily() {
    if (!this.ds.isInitialized) return
    try {
      const { reminders, missed } = await this.run()
      if (reminders.length || missed.length) {
        this.logger.log(`مرفقات الإجازات بعد الرجوع: ${reminders.length} تذكير، ${missed.length} تحوّلت بدون راتب لانقضاء المهلة`)
      }
    } catch (e) {
      this.logger.error('تعذّر تشغيل مهمة مهلة مرفقات الإجازات', (e as Error)?.stack)
    }
  }

  async run(today: string = localDateOf(new Date())): Promise<{ today: string; reminders: LeaveAttachmentNotice[]; missed: LeaveAttachmentNotice[] }> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error('today بصيغة YYYY-MM-DD')
    const leaves = this.ds.getRepository(Leave)
    const pending = await leaves.find({ where: { status: 'APPROVED', attachmentStatus: 'PENDING' }, order: { attachmentDueDate: 'ASC', id: 'ASC' } })
    const reminders: LeaveAttachmentNotice[] = [], missed: LeaveAttachmentNotice[] = []
    for (const leave of pending) {
      if (!leaveAttachmentOverdue(leave.attachmentDueDate, today)) { reminders.push(noticeOf(leave)); continue }
      // شرطي على الحالة: رفع متزامن يسبق التحويل لا يُمحى
      const result = await leaves.update({ id: leave.id, status: 'APPROVED', attachmentStatus: 'PENDING' }, { attachmentStatus: 'MISSED', isUnpaid: true })
      if (result.affected) {
        missed.push(noticeOf(leave))
        this.logger.warn(`الإجازة #${leave.id} للموظف #${leave.employeeId}: انقضت مهلة المرفق (${leave.attachmentDueDate}) — تحولت أيامها بدون راتب`)
      }
    }
    return { today, reminders, missed }
  }

  /**
   * إشعارات مرفقات الإجازات للمستخدم: الموظف يُذكَّر يوميًا بمرفقه المعلق ويُخطر بالتحويل،
   * والموارد البشرية (leaves.revoke) في نطاق فرعها تُذكَّر بالمعلق مجمّعًا ويُخطر بكل تحويل.
   */
  async notificationsFor(user: JwtPayload, today: string = localDateOf(new Date())): Promise<LeaveAttachmentNotification[]> {
    const leaves = this.ds.getRepository(Leave)
    const items: LeaveAttachmentNotification[] = []
    const since = new Date(Date.parse(`${today}T12:00:00Z`) - 30 * 86400000).toISOString().slice(0, 10)
    if (user.employeeId) {
      const mine = await leaves.find({ where: { employeeId: user.employeeId, status: 'APPROVED', attachmentStatus: In(['PENDING', 'MISSED']) },
        order: { attachmentDueDate: 'DESC' }, take: 10 })
      for (const leave of mine) {
        if (leave.attachmentStatus === 'PENDING') {
          items.push({ id: `leave-attachment-reminder-${leave.id}-${today}`, category: 'leave', kind: 'warning', title: 'ارفع مرفق إجازتك',
            body: `إجازتك (${leave.fromDate} إلى ${leave.toDate}) تنتظر المرفق حتى ${leave.attachmentDueDate} — بعدها تتحول أيامها بدون راتب`,
            at: today, link: '/my/leaves' })
        } else if (leave.attachmentDueDate && leave.attachmentDueDate >= since) {
          items.push({ id: `leave-attachment-missed-${leave.id}`, category: 'leave', kind: 'error', title: 'تحولت إجازتك بدون راتب',
            body: `لم يُرفع مرفق إجازتك (${leave.fromDate} إلى ${leave.toDate}) حتى ${leave.attachmentDueDate} — تُخصم أيامها من الراتب`,
            at: leave.attachmentDueDate, link: '/my/leaves' })
        }
      }
    }
    if (userHasPerm(user, 'leaves.revoke')) {
      const scope = branchScopeOf(user)
      const qb = leaves.createQueryBuilder('l').where('l.status = :status', { status: 'APPROVED' })
        .andWhere('(l.attachmentStatus = :pending OR (l.attachmentStatus = :missed AND l.attachmentDueDate >= :since))', { pending: 'PENDING', missed: 'MISSED', since })
      if (scope !== null) {
        const [inScope, params] = branchScopeQb('e.branchId', scope)
        qb.andWhere(`l.employeeId IN (SELECT e.id FROM employees e WHERE ${inScope})`, params)
      }
      const rows = await qb.orderBy('l.attachmentDueDate', 'DESC').addOrderBy('l.id', 'DESC').take(50).getMany()
      const pending = rows.filter(row => row.attachmentStatus === 'PENDING')
      if (pending.length) {
        items.push({ id: `leave-attachment-pending-scope-${today}`, category: 'leave', kind: 'warning', keys: pending.map(row => String(row.id)),
          title: 'مرفقات إجازات معلقة', body: `${pending.length} إجازة تنتظر مرفقها بعد الرجوع — أقرب موعد ${pending.map(row => row.attachmentDueDate).filter(Boolean).sort()[0] ?? '—'}`,
          at: today, link: '/leaves' })
      }
      const missedRows = rows.filter(row => row.attachmentStatus === 'MISSED')
      const names = missedRows.length ? new Map((await this.ds.getRepository(Employee).find({ where: { id: In([...new Set(missedRows.map(row => row.employeeId))]) },
        select: { id: true, fullName: true } })).map(emp => [emp.id, emp.fullName])) : new Map<number, string>()
      for (const leave of missedRows) {
        if (leave.employeeId === user.employeeId) continue
        items.push({ id: `leave-attachment-missed-hr-${leave.id}`, category: 'leave', kind: 'error', title: 'إجازة تحولت بدون راتب',
          body: `${names.get(leave.employeeId) ?? `#${leave.employeeId}`}: لم يُرفع مرفق إجازته (${leave.fromDate} إلى ${leave.toDate}) حتى ${leave.attachmentDueDate}`,
          at: leave.attachmentDueDate ?? today, link: '/leaves' })
      }
    }
    return items
  }
}

