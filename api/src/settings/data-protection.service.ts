import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite } from '../auth/guards'
import { ModulesService } from '../modules-registry/modules.service'
import { recordOutboxEvent } from '../queue/outbox'
import { Task, TASK_OPEN_STATUSES } from '../tasks/task.entity'
import { tasksTableReady } from '../tasks/task-rules'
import {
  BREACH_NOTIFY_HOURS, BREACH_STATUS_LABELS, DataBreachIncident, RETENTION_MONTHS_MAX, RETENTION_TYPES, breachDeadline, breachFields, breachIncidentsReady, breachNote,
  retentionCutoff, retentionMonths, retentionTaskTitle, type BreachInput, type RetentionType,
} from './data-protection'

// B4.8 (ب): حماية البيانات — بيانات على مستوى الشركة: القراءة والكتابة لحساب بكل الفروع بصلاحية الإعدادات (الصلاحية في الضابط).
// مفيش مسح ولا تعديل لتاريخ الحادثة بعد تسجيلها: الحادثة بتتسجّل، بتتبلّغ، بتتقفل — وكل خطوة في سجل التدقيق.

const BREACH_MIGRATION_MISSING = { code: 'BREACH_MIGRATION_MISSING', message: 'سجل حوادث التسريب مش موجود — طبّق ترحيل 139' }
const BREACH_NOT_FOUND = { code: 'BREACH_NOT_FOUND', message: 'الحادثة مش موجودة' }
const BREACH_STATE = { code: 'BREACH_STATE', message: 'الخطوة دي مش متاحة في حالة الحادثة الحالية' }
const RETENTION_VALUE = { code: 'RETENTION_VALUE', message: `مدة الاحتفاظ بالشهور: رقم صحيح من 1 لـ${RETENTION_MONTHS_MAX}، أو فاضي لو من غير مدة` }
const RETENTION_TYPE = { code: 'RETENTION_TYPE', message: 'نوع البيانات ده مش من أنواع مدد الاحتفاظ' }
const TASK_DAYS = 14

@Injectable()
export class DataProtectionService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly modules: ModulesService) {}

  // ===== سجل حوادث التسريب =====

  private incidentView(row: DataBreachIncident, now: Date) {
    return { id: row.id, title: row.title, details: row.details ?? null, discoveredAt: row.discoveredAt, notifyBy: row.notifyBy, status: row.status, statusLabel: BREACH_STATUS_LABELS[row.status],
      notifiedAt: row.notifiedAt ?? null, notificationNote: row.notificationNote ?? null, affectedCount: row.affectedCount ?? null, closedAt: row.closedAt ?? null, closeNote: row.closeNote ?? null,
      createdAt: row.createdAt, ...breachDeadline(row, now) }
  }

  private async incidents(em: EntityManager) {
    const now = new Date()
    return (await em.getRepository(DataBreachIncident).find({ order: { discoveredAt: 'DESC', id: 'DESC' } })).map(row => this.incidentView(row, now))
  }

  async overview(user: JwtPayload) {
    assertCompanyWideWrite(user)
    const em = this.ds.manager
    const available = await breachIncidentsReady(em)
    return { notifyHours: BREACH_NOTIFY_HOURS, incidentsAvailable: available, incidents: available ? await this.incidents(em) : [], retention: await this.retention(em) }
  }

  async createIncident(user: JwtPayload, input: BreachInput) {
    assertCompanyWideWrite(user)
    const now = new Date(), checked = breachFields(input, now)
    if (checked.error !== null) throw new BadRequestException(checked.error)
    await this.ds.transaction(async em => {
      if (!(await breachIncidentsReady(em))) throw new BadRequestException(BREACH_MIGRATION_MISSING)
      const made = await em.getRepository(DataBreachIncident).insert({ ...checked.fields, status: 'OPEN', notifiedAt: null, notificationNote: null, closedAt: null, closeNote: null,
        createdByUserId: user.sub, createdAt: now, updatedByUserId: null, updatedAt: null })
      await recordAudit(em, { category: 'SETTINGS', action: 'DATA_BREACH_RECORDED', entityType: 'data_breach_incident', entityId: made.identifiers[0].id as number, actorUserId: user.sub,
        summary: `تسجيل حادثة تسريب بيانات: ${checked.fields.title}`, after: { discoveredAt: checked.fields.discoveredAt, notifyBy: checked.fields.notifyBy, affectedCount: checked.fields.affectedCount } })
    })
    return this.overview(user)
  }

  /** «اتبلّغت» (من OPEN) أو «اتقفلت» (من OPEN أو NOTIFIED) — تحت قفل صف الحادثة والحكم بعده */
  async moveIncident(user: JwtPayload, id: number, step: 'notify' | 'close', rawNote: unknown) {
    assertCompanyWideWrite(user)
    const note = step === 'notify' ? breachNote(rawNote, 500, true) : breachNote(rawNote, 1000, false)
    if (note.error !== null) throw new BadRequestException(note.error)
    await this.ds.transaction(async em => {
      if (!(await breachIncidentsReady(em))) throw new BadRequestException(BREACH_MIGRATION_MISSING)
      const row = await em.getRepository(DataBreachIncident).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!row) throw new NotFoundException(BREACH_NOT_FOUND)
      const now = new Date()
      if (step === 'notify') {
        if (row.status !== 'OPEN') throw new BadRequestException(BREACH_STATE)
        await em.getRepository(DataBreachIncident).update({ id }, { status: 'NOTIFIED', notifiedAt: now, notificationNote: note.note, updatedByUserId: user.sub, updatedAt: now })
      } else {
        if (row.status === 'CLOSED') throw new BadRequestException(BREACH_STATE)
        await em.getRepository(DataBreachIncident).update({ id }, { status: 'CLOSED', closedAt: now, closeNote: note.note, updatedByUserId: user.sub, updatedAt: now })
      }
      await recordAudit(em, { category: 'SETTINGS', action: step === 'notify' ? 'DATA_BREACH_NOTIFIED' : 'DATA_BREACH_CLOSED', entityType: 'data_breach_incident', entityId: id, actorUserId: user.sub,
        summary: `${step === 'notify' ? 'إخطار الجهة المختصة بحادثة' : 'إقفال حادثة'} تسريب بيانات: ${row.title}`, before: { status: row.status }, after: { status: step === 'notify' ? 'NOTIFIED' : 'CLOSED' } })
    })
    return this.overview(user)
  }

  // ===== مدد الاحتفاظ =====

  /** عدد السجلات اللي عدّت مدتها لكل فرع (الفرع الفاضي تحت null) */
  private async expiredByBranch(em: EntityManager, type: RetentionType, cutoff: string): Promise<Map<number | null, number>> {
    const sql = type.key === 'ex_employees'
      ? 'SELECT [branchId], COUNT(*) AS [n] FROM [employees] WHERE [archivedAt] IS NOT NULL AND [archivedAt] < CONVERT(date, @0, 23) GROUP BY [branchId]'
      : 'SELECT [branchId], COUNT(*) AS [n] FROM [candidates] WHERE [hiredEmployeeId] IS NULL AND [createdAt] < CONVERT(date, @0, 23) GROUP BY [branchId]'
    const rows: Array<{ branchId: number | null; n: number }> = await em.query(sql, [cutoff])
    return new Map(rows.map(row => [row.branchId == null ? null : Number(row.branchId), Number(row.n)]))
  }

  private async retention(em: EntityManager) {
    const today = localDateOf(new Date())
    const rows: Array<{ key: string; value: string }> = await em.query(`SELECT [key], [value] FROM [requests_config] WHERE [key] IN (${RETENTION_TYPES.map((_, index) => `@${index}`).join(', ')})`,
      RETENTION_TYPES.map(type => type.configKey))
    const out: Array<{ key: string; label: string; hint: string; months: number | null; cutoff: string | null; expired: number }> = []
    for (const type of RETENTION_TYPES) {
      const months = retentionMonths(rows.find(row => row.key === type.configKey)?.value)
      const cutoff = months === null ? null : retentionCutoff(today, months)
      const expired = cutoff === null ? 0 : [...(await this.expiredByBranch(em, type, cutoff)).values()].reduce((sum, count) => sum + count, 0)
      out.push({ key: type.key, label: type.label, hint: type.hint, months, cutoff, expired })
    }
    return out
  }

  /** مدة احتفاظ نوع: رقم الشهور أو null (من غير مدة) — تحت قفل مدى على صف الإعداد، وبسطر تدقيق */
  async setRetention(user: JwtPayload, key: string, rawMonths: unknown) {
    assertCompanyWideWrite(user)
    const type = RETENTION_TYPES.find(entry => entry.key === key)
    if (!type) throw new NotFoundException(RETENTION_TYPE)
    const months = rawMonths === null || rawMonths === '' ? null : rawMonths
    if (months !== null && (typeof months !== 'number' || !Number.isInteger(months) || months < 1 || months > RETENTION_MONTHS_MAX)) throw new BadRequestException(RETENTION_VALUE)
    await this.ds.transaction(async em => {
      const rows: Array<{ value: string }> = await em.query('SELECT [value] FROM [requests_config] WITH (UPDLOCK, HOLDLOCK) WHERE [key] = @0', [type.configKey])
      const before = retentionMonths(rows[0]?.value), value = months === null ? '' : String(months)
      if (!rows.length) await em.query('INSERT INTO [requests_config] ([key], [value]) VALUES (@0, @1)', [type.configKey, value])
      else await em.query('UPDATE [requests_config] SET [value] = @1 WHERE [key] = @0', [type.configKey, value])
      await recordAudit(em, { category: 'SETTINGS', action: 'DATA_RETENTION_SET', entityType: 'requests_config', entityId: type.configKey, actorUserId: user.sub,
        summary: `مدة الاحتفاظ لـ«${type.label}»: ${months === null ? 'من غير مدة' : `${months} شهر`}`, before: { months: before }, after: { months } })
    })
    return this.overview(user)
  }

  /**
   * المهمة اليومية (privacy.retention-alerts): لكل نوع ليه مدة ولكل فرع فيه سجلات عدّت مدتها — مهمة مراجعة على الموارد البشرية في الفرع،
   * مرة واحدة طول ما المهمة مفتوحة. **مابتمسحش ولا بتغيّر أي سجل.** بترجّع عدد المهام اللي اتعملت.
   */
  async raiseRetentionTasks(today: string = localDateOf(new Date())): Promise<number> {
    if (!(await this.modules.jobEnabled('privacy.retention-alerts')) || !(await tasksTableReady(this.ds.manager))) return 0
    const due = new Date(Date.parse(`${today}T12:00:00Z`) + TASK_DAYS * 86400000).toISOString().slice(0, 10)
    let made = 0
    for (const type of (await this.retention(this.ds.manager)).filter(entry => entry.cutoff !== null && entry.expired > 0)) {
      const definition = RETENTION_TYPES.find(entry => entry.key === type.key)!
      const title = retentionTaskTitle(definition)
      for (const [branchId, count] of await this.expiredByBranch(this.ds.manager, definition, type.cutoff as string)) {
        if (branchId === null || count <= 0) continue
        made += await this.ds.transaction(async em => {
          // مهمة مفتوحة بنفس العنوان للفرع = اتنبّه خلاص (قفل مدى: تشغيلين مع بعض مايعملوش مهمتين)
          const [open]: unknown[] = await em.query(
            `SELECT TOP (1) [id] FROM [tasks] WITH (UPDLOCK, HOLDLOCK) WHERE [createdByUserId] = 0 AND [title] = @0 AND [branchId] = @1 AND [status] IN (${TASK_OPEN_STATUSES.map((_, index) => `@${index + 2}`).join(', ')})`,
            [title, branchId, ...TASK_OPEN_STATUSES])
          if (open) return 0
          const now = new Date(), tasks = em.getRepository(Task)
          const task = await tasks.save(tasks.create({ title, description: `${count} سجل عدّى مدة الاحتفاظ (${type.months} شهر — قبل ${type.cutoff}). راجعهم وقرّر: يفضلوا، يتأرشفوا، أو يتمسحوا. النظام مابيمسحش حاجة لوحده.`,
            assigneeEmployeeId: null, assigneeRole: 'hr', branchId, dueDate: due, createdByUserId: 0, priority: 'NORMAL', status: 'OPEN', requiresProof: false, proofNote: null, proofFileId: null,
            statusNote: null, closedByUserId: null, closedAt: null, remindedAt: null, escalatedAt: null, createdAt: now, updatedAt: now }))
          await recordOutboxEvent(em, { type: 'TASK_ASSIGNED', entityType: 'task', entityId: task.id, payload: { taskId: task.id, branchId: task.branchId } })
          return 1
        })
      }
    }
    return made
  }
}
