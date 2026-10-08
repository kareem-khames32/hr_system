import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { Shift } from '../assets/assets.entities'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, branchScopeOf, inBranchScope } from '../auth/guards'
import { recordOutboxEvent } from '../queue/outbox'
import { Skill, skillsReady } from '../skills/skills'
import { AttendanceService, localDateOf } from './attendance.service'
import {
  countOf, coverageFields, RULE_KIND_LABELS, RULE_KINDS, RULE_NOT_FOUND, ruleFields, SCHEDULE_CHECKS_MIGRATION_MISSING, scheduleChecksReady, ScheduleRule, ScheduleViolation, SEVERITIES, SEVERITY_LABELS, ShiftCoverageRule,
  weekViolations,
} from './schedule-checks'
import {
  applyFields, BRANCH_NOT_FOUND, copyFields, publishFields, ROTATION_NOT_FOUND, rotationFields, rotationShiftAt, rotationShiftIds, SCHEDULE_TOOLS_MIGRATION_MISSING, SchedulePublication, scheduledEmployeeIds,
  scheduleToolsReady, ShiftRotation, weekAfter, weekStartOf,
} from './schedule-tools'

// B5.5 (أ): أدوات الجدولة — نسخ أسبوع وتطبيق نمط تدوير بيبنوا صفوف الأسبوع وبيبعتوها لـ`upsertSchedule` القايم (نفس النطاق والأقفال وفترة
// الخدمة وحماية المسيرات المعتمدة)؛ والنشر سجل + حدث إشعار. الأنماط بنطاق فرعها (ونمط «كل الفروع» لحساب بكل الفروع).

const SHIFT_GONE = 'وردية في النمط مش موجودة أو مقفولة'
const ROTATION_INACTIVE = 'النمط مقفول'
const START_INDEX = 'خانة البداية أكبر من عدد خانات النمط'
const BLOCKED = (count: number) => `الجدول فيه ${count} مخالفة «منع» — صلّحها، أو اكتب سبب التجاوز وانشر`
const COVERAGE_GONE = 'الوردية أو المهارة مش موجودة أو مقفولة'
const NOTHING_SCHEDULED = 'مفيش ورديات للأسبوع ده في الفرع — احفظ الجدول الأول'
const flag = (value: unknown) => value === true || value === 1
const idOf = (value: unknown) => (value == null ? null : Number(value))

interface WeekRow { employeeId: number; shiftId: number | null; shiftName: string; startTime: string; endTime: string; branchId: number | null }

@Injectable()
export class ScheduleToolsService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly attendance: AttendanceService) {}

  private async assertReady(em: EntityManager) {
    if (!(await scheduleToolsReady(em))) throw new BadRequestException(SCHEDULE_TOOLS_MIGRATION_MISSING)
  }

  private rotationView(row: ShiftRotation) {
    return { id: row.id, name: row.name, branchId: idOf(row.branchId), shiftIds: rotationShiftIds(row.shiftIds), isActive: flag(row.isActive) }
  }

  /** الأنماط في نطاق الحساب (ونمط «كل الفروع» للكل)، وورديات الكتالوج المفعّلة، وآخر مرات النشر في النطاق */
  async overview(user: JwtPayload) {
    const em = this.ds.manager, scope = branchScopeOf(user), companyWide = scope === null
    if (!(await scheduleToolsReady(em))) return { ready: false, companyWide, rotations: [], shifts: [], branches: [], publications: [] }
    const rotations = (await em.getRepository(ShiftRotation).find({ order: { name: 'ASC', id: 'ASC' } })).filter(row => row.branchId == null || inBranchScope(scope, Number(row.branchId)))
    const shifts = await em.getRepository(Shift).find({ where: { isActive: true }, order: { name: 'ASC', id: 'ASC' } })
    const branches: Array<{ id: number; name: string }> = (await em.query('SELECT [id], [name] FROM dbo.branches ORDER BY [name], [id]')).filter((row: { id: number }) => inBranchScope(scope, Number(row.id)))
      .map((row: { id: number; name: string }) => ({ id: Number(row.id), name: row.name }))
    const published: Array<{ id: number; weekStart: string; branchId: number; employeesCount: number; note: string | null; publishedAt: Date; publishedByName: string | null }> = await em.query(
      `SELECT TOP (60) p.[id], CONVERT(varchar(10), p.[weekStart], 23) AS [weekStart], p.[branchId], p.[employeesCount], p.[note], p.[publishedAt], u.[displayName] AS [publishedByName]
       FROM dbo.schedule_publications p LEFT JOIN dbo.users u ON u.[id] = p.[publishedByUserId] ORDER BY p.[id] DESC`)
    return { ready: true, companyWide, rotations: rotations.map(row => this.rotationView(row)),
      shifts: shifts.map(row => ({ id: row.id, name: row.name, startTime: row.startTime, endTime: row.endTime })), branches,
      publications: published.filter(row => inBranchScope(scope, Number(row.branchId))).slice(0, 30).map(row => ({ id: Number(row.id), weekStart: row.weekStart, branchId: Number(row.branchId),
        employeesCount: Number(row.employeesCount), note: row.note ?? null, publishedAt: row.publishedAt, publishedByName: row.publishedByName ?? null })) }
  }

  /** فرع النمط في نطاق الحساب (غير كده «الفرع مش موجود»)؛ ونمط «كل الفروع» لحساب بكل الفروع بس */
  private async assertRotationScope(em: EntityManager, user: JwtPayload, branchId: number | null) {
    if (branchId === null) return assertCompanyWideWrite(user)
    const [branch]: Array<{ id: number }> = await em.query('SELECT [id] FROM dbo.branches WHERE [id] = @0', [branchId])
    if (!branch || !inBranchScope(branchScopeOf(user), branchId)) throw new NotFoundException(BRANCH_NOT_FOUND)
  }

  private async activeShifts(em: EntityManager, shiftIds: number[]): Promise<Map<number, Shift>> {
    const found = new Map((await em.getRepository(Shift).find({ where: { id: In([...new Set(shiftIds)]), isActive: true } })).map(row => [row.id, row]))
    if (shiftIds.some(id => !found.has(id))) throw new BadRequestException(SHIFT_GONE)
    return found
  }

  /** إضافة نمط (من غير `id`) أو تعديله — تحت قفل صفه، وبسطر تدقيق */
  async saveRotation(user: JwtPayload, body: unknown, id?: number) {
    const { fields, error } = rotationFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const repo = em.getRepository(ShiftRotation)
      const existing = id == null ? null : await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      // نمط فرع برّه النطاق زي اللي مش موجود
      if (id != null && (!existing || (existing.branchId != null && !inBranchScope(branchScopeOf(user), Number(existing.branchId))))) throw new NotFoundException(ROTATION_NOT_FOUND)
      if (existing && existing.branchId == null) assertCompanyWideWrite(user)
      await this.assertRotationScope(em, user, fields.branchId)
      await this.activeShifts(em, fields.shiftIds)
      const values = { name: fields.name, branchId: fields.branchId, shiftIds: fields.shiftIds.join(','), isActive: fields.isActive, updatedByUserId: user.sub, updatedAt: new Date() }
      const row = existing ? { ...existing, ...values } : await repo.save(repo.create(values))
      if (existing) await repo.update({ id: existing.id }, values)
      await recordAudit(em, { category: 'SETTINGS', action: existing ? 'SHIFT_ROTATION_UPDATED' : 'SHIFT_ROTATION_CREATED', entityType: 'shift_rotation', entityId: String(row.id), actorUserId: user.sub,
        branchId: fields.branchId ?? undefined, summary: `${existing ? 'تعديل' : 'إضافة'} نمط تدوير الورديات «${fields.name}»`, before: existing ? this.rotationView(existing) : undefined, after: { id: row.id, ...fields } })
      return { id: row.id }
    })
  }

  /**
   * نسخ أسبوع: ورديات أسبوع المصدر لموظفين نطاق الحساب (واختياريًا فرع واحد — بفرع الموظف الحالي) لأسبوع الهدف. اللي له وردية في الهدف
   * بيتساب إلا مع «اكتب فوق». الكتابة من `upsertSchedule` القايم.
   */
  async copyWeek(user: JwtPayload, body: unknown) {
    const { fields, error } = copyFields(body, localDateOf(new Date()))
    if (!fields) throw new BadRequestException(error)
    const em = this.ds.manager
    await this.assertReady(em)
    const scope = branchScopeOf(user)
    if (fields.branchId !== null && !inBranchScope(scope, fields.branchId)) throw new NotFoundException(BRANCH_NOT_FOUND)
    const source: WeekRow[] = (await em.query(
      `SELECT s.[employeeId], s.[shiftId], s.[shiftName], s.[startTime], s.[endTime], e.[branchId] FROM dbo.weekly_schedule_entries s INNER JOIN dbo.employees e ON e.[id] = s.[employeeId] WHERE s.[weekStart] = @0 ORDER BY s.[employeeId]`,
      [fields.fromWeek])).map((row: WeekRow) => ({ ...row, employeeId: Number(row.employeeId), shiftId: idOf(row.shiftId), branchId: idOf(row.branchId) }))
    const mine = source.filter(row => inBranchScope(scope, row.branchId) && (fields.branchId === null || row.branchId === fields.branchId) && row.employeeId !== Number(user.employeeId ?? 0))
    const taken = new Set((await em.query('SELECT [employeeId] FROM dbo.weekly_schedule_entries WHERE [weekStart] = @0', [fields.toWeek]) as Array<{ employeeId: number }>).map(row => Number(row.employeeId)))
    const wanted = fields.overwrite ? mine : mine.filter(row => !taken.has(row.employeeId))
    if (!wanted.length) return { source: mine.length, copied: 0, alreadyScheduled: mine.length - wanted.length, skipped: [] }
    const result = await this.attendance.upsertSchedule(wanted.map(row => ({ weekStart: fields.toWeek, employeeId: row.employeeId, shiftName: row.shiftName, startTime: row.startTime, endTime: row.endTime,
      ...(row.shiftId ? { shiftId: row.shiftId } : {}) })), user)
    return { source: mine.length, copied: result.saved.length, alreadyScheduled: mine.length - wanted.length, skipped: result.skipped }
  }

  /** تطبيق نمط تدوير على موظفين من أسبوع لعدد أسابيع: كل أسبوع وردية الخانة اللي عليها الدور. الكتابة من `upsertSchedule` القايم. */
  async applyRotation(user: JwtPayload, body: unknown) {
    const { fields, error } = applyFields(body, localDateOf(new Date()))
    if (!fields) throw new BadRequestException(error)
    const em = this.ds.manager
    await this.assertReady(em)
    const rotation = await em.getRepository(ShiftRotation).findOne({ where: { id: fields.rotationId } })
    if (!rotation || (rotation.branchId != null && !inBranchScope(branchScopeOf(user), Number(rotation.branchId)))) throw new NotFoundException(ROTATION_NOT_FOUND)
    if (!flag(rotation.isActive)) throw new BadRequestException(ROTATION_INACTIVE)
    const slots = rotationShiftIds(rotation.shiftIds)
    if (fields.startIndex >= slots.length) throw new BadRequestException(START_INDEX)
    const shifts = await this.activeShifts(em, slots)
    const entries: Array<{ weekStart: string; employeeId: number; shiftName: string; startTime: string; endTime: string; shiftId: number }> = []
    for (let offset = 0; offset < fields.weeks; offset++) {
      const shift = shifts.get(rotationShiftAt(slots, fields.startIndex, offset))!
      for (const employeeId of fields.employeeIds) entries.push({ weekStart: weekAfter(fields.fromWeek, offset), employeeId, shiftName: shift.name, startTime: shift.startTime, endTime: shift.endTime, shiftId: shift.id })
    }
    const result = await this.attendance.upsertSchedule(entries, user)
    return { weeks: fields.weeks, saved: result.saved.length, skipped: result.skipped }
  }

  /**
   * نشر جدول أسبوع لفرع في نطاق الحساب: سجل بعدد الموظفين اللي لهم وردية، وحدث إشعار لحساباتهم. النشر مابيغيّرش الجدول، وكل نشر صف جديد.
   */
  async publish(user: JwtPayload, body: unknown) {
    const { fields, error } = publishFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const [branch]: Array<{ id: number }> = await em.query('SELECT [id] FROM dbo.branches WHERE [id] = @0', [fields.branchId])
      if (!branch || !inBranchScope(branchScopeOf(user), fields.branchId)) throw new NotFoundException(BRANCH_NOT_FOUND)
      const employeeIds = await scheduledEmployeeIds(em, fields.week, fields.branchId)
      if (!employeeIds.length) throw new BadRequestException(NOTHING_SCHEDULED)
      // (ب) فحص القواعد لحظة النشر: مخالفة «منع» بتوقّف النشر إلا بسبب تجاوز
      const violations = await weekViolations(em, fields.week, fields.branchId)
      const blocked = countOf(violations, 'BLOCK')
      if (blocked > 0 && !fields.overrideReason) throw new ConflictException(BLOCKED(blocked))
      const row = await em.getRepository(SchedulePublication).save(em.getRepository(SchedulePublication).create({ weekStart: fields.week, branchId: fields.branchId, employeesCount: employeeIds.length, note: fields.note,
        publishedByUserId: user.sub, publishedAt: new Date() }))
      if (violations.length) {
        const now = new Date(), repo = em.getRepository(ScheduleViolation)
        await repo.save(violations.map(item => repo.create({ publicationId: row.id, ruleKind: item.kind, severity: item.severity, employeeId: item.employeeId, shiftId: item.shiftId, detail: item.detail.slice(0, 300),
          overrideReason: item.severity === 'BLOCK' ? fields.overrideReason : null, createdAt: now })))
      }
      await recordOutboxEvent(em, { type: 'SCHEDULE_PUBLISHED', entityType: 'schedule_publication', entityId: row.id, key: `schedule-published:${row.id}`, payload: { publicationId: row.id } })
      await recordAudit(em, { category: 'SETTINGS', action: 'SCHEDULE_PUBLISHED', entityType: 'schedule_publication', entityId: String(row.id), actorUserId: user.sub, branchId: fields.branchId,
        summary: `نشر جدول أسبوع ${fields.week} (${employeeIds.length} موظف)`, after: { weekStart: fields.week, branchId: fields.branchId, employeesCount: employeeIds.length, warnings: countOf(violations, 'WARN'), blocked, overrideReason: blocked ? fields.overrideReason : null } })
      return { id: row.id, employeesCount: employeeIds.length, warnings: countOf(violations, 'WARN'), blocked }
    })
  }

  // ===== (ب) قواعد فحص الجدول =====

  private ruleView(row: ScheduleRule) {
    return { id: row.id, kind: row.kind, limitHours: Number(row.limitHours), severity: row.severity, branchId: idOf(row.branchId), isActive: flag(row.isActive) }
  }

  private coverageView(row: ShiftCoverageRule) {
    return { id: row.id, shiftId: row.shiftId, skillId: row.skillId, minLevel: row.minLevel, minCount: row.minCount, severity: row.severity, isActive: flag(row.isActive) }
  }

  /** القواعد في نطاق الحساب (وقواعد «كل الفروع» للكل)، وقواعد التغطية، والمهارات المفعّلة لو جداول المهارات موجودة */
  async rules(user: JwtPayload) {
    const em = this.ds.manager, scope = branchScopeOf(user)
    const kinds = RULE_KINDS.map(code => ({ code, label: RULE_KIND_LABELS[code] })), severities = SEVERITIES.map(code => ({ code, label: SEVERITY_LABELS[code] }))
    if (!(await scheduleChecksReady(em))) return { ready: false, kinds, severities, rules: [], coverage: [], skills: [] }
    const rules = (await em.getRepository(ScheduleRule).find({ order: { id: 'ASC' } })).filter(row => row.branchId == null || inBranchScope(scope, Number(row.branchId)))
    const coverage = await em.getRepository(ShiftCoverageRule).find({ order: { id: 'ASC' } })
    const skills = (await skillsReady(em)) ? await em.getRepository(Skill).find({ where: { isActive: true }, order: { name: 'ASC', id: 'ASC' } }) : []
    return { ready: true, kinds, severities, rules: rules.map(row => this.ruleView(row)), coverage: coverage.map(row => this.coverageView(row)), skills: skills.map(row => ({ id: row.id, name: row.name })) }
  }

  /** إضافة قاعدة (من غير `id`) أو تعديلها — بنطاق فرعها (وقاعدة «كل الفروع» لحساب بكل الفروع)، تحت قفل صفها، وبسطر تدقيق */
  async saveRule(user: JwtPayload, body: unknown, id?: number) {
    const { fields, error } = ruleFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      if (!(await scheduleChecksReady(em))) throw new BadRequestException(SCHEDULE_CHECKS_MIGRATION_MISSING)
      const repo = em.getRepository(ScheduleRule)
      const existing = id == null ? null : await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (id != null && (!existing || (existing.branchId != null && !inBranchScope(branchScopeOf(user), Number(existing.branchId))))) throw new NotFoundException(RULE_NOT_FOUND)
      if (existing && existing.branchId == null) assertCompanyWideWrite(user)
      await this.assertRotationScope(em, user, fields.branchId)
      const values = { ...fields, updatedByUserId: user.sub, updatedAt: new Date() }
      const row = existing ? { ...existing, ...values } : await repo.save(repo.create(values))
      if (existing) await repo.update({ id: existing.id }, values)
      await recordAudit(em, { category: 'SETTINGS', action: existing ? 'SCHEDULE_RULE_UPDATED' : 'SCHEDULE_RULE_CREATED', entityType: 'schedule_rule', entityId: String(row.id), actorUserId: user.sub,
        branchId: fields.branchId ?? undefined, summary: `${existing ? 'تعديل' : 'إضافة'} قاعدة جدول: ${RULE_KIND_LABELS[fields.kind]} = ${fields.limitHours} (${SEVERITY_LABELS[fields.severity]})`,
        before: existing ? this.ruleView(existing) : undefined, after: { id: row.id, ...fields } })
      return { id: row.id }
    })
  }

  /** إضافة قاعدة تغطية أو تعديلها — الورديات والمهارات كتالوج للشركة كلها، فالكتابة لحساب بكل الفروع؛ وبسطر تدقيق */
  async saveCoverage(user: JwtPayload, body: unknown, id?: number) {
    assertCompanyWideWrite(user)
    const { fields, error } = coverageFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      if (!(await scheduleChecksReady(em))) throw new BadRequestException(SCHEDULE_CHECKS_MIGRATION_MISSING)
      const repo = em.getRepository(ShiftCoverageRule)
      const existing = id == null ? null : await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (id != null && !existing) throw new NotFoundException(RULE_NOT_FOUND)
      const shift = await em.getRepository(Shift).findOne({ where: { id: fields.shiftId, isActive: true } })
      const skill = (await skillsReady(em)) ? await em.getRepository(Skill).findOne({ where: { id: fields.skillId, isActive: true } }) : null
      if (!shift || !skill) throw new BadRequestException(COVERAGE_GONE)
      const values = { ...fields, updatedByUserId: user.sub, updatedAt: new Date() }
      const row = existing ? { ...existing, ...values } : await repo.save(repo.create(values))
      if (existing) await repo.update({ id: existing.id }, values)
      await recordAudit(em, { category: 'SETTINGS', action: existing ? 'SHIFT_COVERAGE_UPDATED' : 'SHIFT_COVERAGE_CREATED', entityType: 'shift_coverage_rule', entityId: String(row.id), actorUserId: user.sub,
        summary: `${existing ? 'تعديل' : 'إضافة'} قاعدة تغطية: «${shift.name}» محتاجة ${fields.minCount} بمهارة «${skill.name}»`, before: existing ? this.coverageView(existing) : undefined, after: { id: row.id, ...fields } })
      return { id: row.id }
    })
  }

  /** فحص جدول أسبوع لفرع في نطاق الحساب — قراءة بس: المخالفات بأسماء موظفيها وورديتها */
  async checks(user: JwtPayload, weekRaw: unknown, branchRaw: unknown) {
    const week = weekStartOf(weekRaw), branchId = Number(branchRaw)
    if (!week) throw new BadRequestException('الأسبوع: تاريخ يوم أحد (بداية الأسبوع)')
    if (!Number.isSafeInteger(branchId) || branchId < 1) throw new BadRequestException('اختار الفرع')
    const em = this.ds.manager
    const [branch]: Array<{ id: number }> = await em.query('SELECT [id] FROM dbo.branches WHERE [id] = @0', [branchId])
    if (!branch || !inBranchScope(branchScopeOf(user), branchId)) throw new NotFoundException(BRANCH_NOT_FOUND)
    const violations = await weekViolations(em, week, branchId)
    const employeeIds = [...new Set(violations.map(row => row.employeeId).filter((id): id is number => id != null))]
    const names = new Map<number, string>()
    if (employeeIds.length) for (const row of await em.query(`SELECT [id], [fullName] FROM dbo.employees WHERE [id] IN (${employeeIds.map((_, index) => `@${index}`).join(', ')})`, employeeIds) as Array<{ id: number; fullName: string }>) names.set(Number(row.id), row.fullName)
    const shifts = new Map((await em.getRepository(Shift).find()).map(row => [row.id, row.name]))
    return { week, branchId, warnings: countOf(violations, 'WARN'), blocked: countOf(violations, 'BLOCK'),
      violations: violations.map(row => ({ ...row, kindLabel: (RULE_KIND_LABELS as Record<string, string>)[row.kind] ?? 'تغطية الوردية بالمهارة', severityLabel: SEVERITY_LABELS[row.severity],
        employeeName: row.employeeId == null ? null : names.get(row.employeeId) ?? null, shiftName: row.shiftId == null ? null : shifts.get(row.shiftId) ?? null })) }
  }
}
