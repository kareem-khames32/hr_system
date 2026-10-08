import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { positionCode } from '../positions/position-rules'
import {
  assessmentFields, EMPLOYEE_NOT_FOUND, GAP_LABELS, gapOf, isSkillLevel, POSITION_NOT_FOUND, PositionSkillRequirement, requirementsOf, Skill, SKILL_LEVEL_LABELS, SKILL_LEVELS, SKILL_NOT_FOUND,
  SKILL_SOURCE_LABELS, skillFields, SKILLS_MIGRATION_MISSING, skillsReady, type GapStatus, type SkillLevel, type SkillSource,
} from './skills'

// B5.4 (أ): المهارات — المكتبة تعريف للشركة كلها (الكتابة لحساب بكل الفروع)؛ متطلبات الوظيفة المعتمدة بنطاق فرع الوظيفة وتحت قفل صفها؛
// تقييم مهارة الموظف لصاحب الصلاحية في نطاق فروعه أو لمديره المباشر، تحت قفل صف الموظف، وبسطر تدقيق فيه القديم والجديد والمصدر.
// مصفوفة الفجوة بفرع الموظف الحالي. مهارة الموظف المتقيّمة صف في `employee_skills` القايم (أعمدة الربط بـSQL — skills.ts).

const SKILL_NAME_TAKEN = 'فيه مهارة بنفس الاسم'
const SKILL_INACTIVE = 'مهارة من المهارات مش موجودة أو مقفولة'
const SELF_ASSESSMENT = 'ماينفعش تقيّم مهارتك بنفسك'
const NOT_EMPLOYEE = 'حسابك مش مربوط بملف موظف'
const ACTIVE = `e.[isActive] = 1 AND e.[status] IN (N'active', N'probation', N'notice_period')`
const flag = (value: unknown) => value === true || value === 1
const idOf = (value: unknown) => (value == null ? null : Number(value))
const marks = (ids: readonly number[]) => ids.map((_, index) => `@${index}`).join(', ')

interface Person { id: number; fullName: string; employeeCode: string | null; branchId: number | null }
interface HeldRow { id: number; employeeId: number; skillId: number; level: string | null; source: string | null; validUntil: string | null }

@Injectable()
export class SkillsService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async assertReady(em: EntityManager) {
    if (!(await skillsReady(em))) throw new BadRequestException(SKILLS_MIGRATION_MISSING)
  }

  private skillView(row: Skill) {
    return { id: row.id, name: row.name, category: row.category ?? null, description: row.description ?? null, isActive: flag(row.isActive) }
  }

  private levels() {
    return SKILL_LEVELS.map(code => ({ code, label: SKILL_LEVEL_LABELS[code] }))
  }

  // ===== المكتبة =====

  async catalog(user: JwtPayload) {
    const em = this.ds.manager, canEdit = branchScopeOf(user) === null
    if (!(await skillsReady(em))) return { ready: false, canEdit, levels: this.levels(), skills: [] }
    const skills = await em.getRepository(Skill).find({ order: { category: 'ASC', name: 'ASC', id: 'ASC' } })
    return { ready: true, canEdit, levels: this.levels(), skills: skills.map(row => this.skillView(row)) }
  }

  /** اسم المهارة مايتكررش: الحكم تحت قفل مدى على الاسم */
  private async assertNameFree(em: EntityManager, name: string, exceptId: number | null) {
    const rows: Array<{ id: number }> = await em.query('SELECT [id] FROM dbo.skills WITH (UPDLOCK, HOLDLOCK) WHERE [name] = @0', [name])
    if (rows.some(row => Number(row.id) !== exceptId)) throw new ConflictException(SKILL_NAME_TAKEN)
  }

  async createSkill(user: JwtPayload, body: unknown) {
    assertCompanyWideWrite(user)
    const { fields, error } = skillFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      await this.assertNameFree(em, fields.name, null)
      const row = await em.getRepository(Skill).save(em.getRepository(Skill).create({ ...fields, updatedByUserId: user.sub, updatedAt: new Date() }))
      await recordAudit(em, { category: 'SETTINGS', action: 'SKILL_CREATED', entityType: 'skill', entityId: String(row.id), actorUserId: user.sub, summary: `مهارة جديدة في المكتبة «${row.name}»`, after: this.skillView(row) })
      return { id: row.id }
    })
  }

  async updateSkill(user: JwtPayload, id: number, body: unknown) {
    assertCompanyWideWrite(user)
    const { fields, error } = skillFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const row = await em.getRepository(Skill).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!row) throw new NotFoundException(SKILL_NOT_FOUND)
      await this.assertNameFree(em, fields.name, row.id)
      const before = this.skillView(row)
      await em.getRepository(Skill).update({ id: row.id }, { ...fields, updatedByUserId: user.sub, updatedAt: new Date() })
      await recordAudit(em, { category: 'SETTINGS', action: 'SKILL_UPDATED', entityType: 'skill', entityId: String(row.id), actorUserId: user.sub, summary: `تعديل المهارة «${fields.name}»`, before, after: { id: row.id, ...fields } })
      return { id: row.id }
    })
  }

  // ===== متطلبات الوظيفة المعتمدة =====

  /** الوظائف المعتمدة (غير الملغاة) في نطاق الحساب بمتطلباتها. قسم الوظيفة بيتسمّى لو لسه تبع فرعها. */
  async positions(user: JwtPayload) {
    const em = this.ds.manager
    await this.assertReady(em)
    const scope = branchScopeOf(user)
    const rows: Array<{ id: number; branchId: number; status: string; title: string; branchName: string | null; departmentName: string | null; holders: number }> = await em.query(
      `SELECT p.[id], p.[branchId], p.[status], t.[title], b.[name] AS [branchName], d.[name] AS [departmentName],
         (SELECT COUNT(*) FROM dbo.position_holders h WHERE h.[positionId] = p.[id]) AS [holders]
       FROM dbo.positions p INNER JOIN dbo.job_titles t ON t.[id] = p.[jobTitleId] LEFT JOIN dbo.branches b ON b.[id] = p.[branchId]
         LEFT JOIN dbo.departments d ON d.[id] = p.[departmentId] AND d.[branchId] = p.[branchId]
       WHERE p.[status] <> N'CANCELLED' ORDER BY b.[name], d.[name], t.[title], p.[id]`)
    const visible = rows.filter(row => inBranchScope(scope, Number(row.branchId)))
    const requirements = visible.length ? await em.getRepository(PositionSkillRequirement).find({ where: { positionId: In(visible.map(row => Number(row.id))) }, order: { id: 'ASC' } }) : []
    return { positions: visible.map(row => ({ id: Number(row.id), code: positionCode(Number(row.id)), title: row.title, branchName: row.branchName ?? null, departmentName: row.departmentName ?? null, status: row.status,
      holders: Number(row.holders), requirements: requirements.filter(item => item.positionId === Number(row.id)).map(item => ({ skillId: item.skillId, level: item.requiredLevel })) })) }
  }

  /** متطلبات الوظيفة بتتكتب كلها مع بعض تحت قفل صف الوظيفة (في نطاق الحساب، وإلا «مش موجودة»): القديم بيتشال والجديد بيتحط، بسطر تدقيق */
  async setRequirements(user: JwtPayload, positionId: number, body: unknown) {
    const { requirements, error } = requirementsOf(body)
    if (!requirements) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const [position]: Array<{ id: number; branchId: number; status: string }> = await em.query('SELECT [id], [branchId], [status] FROM dbo.positions WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [positionId])
      if (!position || position.status === 'CANCELLED' || !inBranchScope(branchScopeOf(user), Number(position.branchId))) throw new NotFoundException(POSITION_NOT_FOUND)
      if (requirements.length) {
        const found = await em.getRepository(Skill).find({ where: { id: In(requirements.map(row => row.skillId)), isActive: true } })
        if (found.length !== requirements.length) throw new BadRequestException(SKILL_INACTIVE)
      }
      const repo = em.getRepository(PositionSkillRequirement)
      const before = (await repo.find({ where: { positionId }, order: { id: 'ASC' } })).map(row => ({ skillId: row.skillId, level: row.requiredLevel }))
      await repo.delete({ positionId })
      const now = new Date()
      if (requirements.length) await repo.save(requirements.map(row => repo.create({ positionId, skillId: row.skillId, requiredLevel: row.level, updatedByUserId: user.sub, updatedAt: now })))
      await recordAudit(em, { category: 'SETTINGS', action: 'POSITION_SKILLS_SET', entityType: 'position', entityId: String(positionId), actorUserId: user.sub, branchId: Number(position.branchId),
        summary: `المهارات المطلوبة للوظيفة ${positionCode(positionId)}: ${requirements.length} مهارة`, before: { requirements: before }, after: { requirements } })
      return { positionId, requirements }
    })
  }

  // ===== الفجوة =====

  /** صفوف المصفوفة: كل موظف بوظيفته المعتمدة ومهاراتها المطلوبة وحكم كل واحدة على مهارته المتقيّمة */
  private async matrixRows(em: EntityManager, people: Person[]) {
    if (!people.length) return []
    const ids = people.map(person => person.id), today = localDateOf(new Date())
    const seats: Array<{ employeeId: number; positionId: number; title: string }> = await em.query(
      `SELECT h.[employeeId], h.[positionId], t.[title] FROM dbo.position_holders h INNER JOIN dbo.positions p ON p.[id] = h.[positionId] INNER JOIN dbo.job_titles t ON t.[id] = p.[jobTitleId]
       WHERE p.[status] <> N'CANCELLED' AND h.[employeeId] IN (${marks(ids)})`, ids)
    const positionIds = [...new Set(seats.map(row => Number(row.positionId)))]
    const requirements = positionIds.length ? await em.getRepository(PositionSkillRequirement).find({ where: { positionId: In(positionIds) }, order: { id: 'ASC' } }) : []
    const held: HeldRow[] = (await em.query(
      `SELECT [id], [employeeId], [skillId], [level], [source], CONVERT(varchar(10), [validUntil], 23) AS [validUntil] FROM dbo.employee_skills WHERE [skillId] IS NOT NULL AND [employeeId] IN (${marks(ids)})`, ids))
      .map((row: HeldRow) => ({ ...row, id: Number(row.id), employeeId: Number(row.employeeId), skillId: Number(row.skillId) }))
    const skillIds = [...new Set([...requirements.map(row => row.skillId), ...held.map(row => row.skillId)])]
    const names = new Map((skillIds.length ? await em.getRepository(Skill).find({ where: { id: In(skillIds) } }) : []).map(row => [row.id, row.name]))
    return people.map(person => {
      const seat = seats.find(row => Number(row.employeeId) === person.id) ?? null
      const own = held.filter(row => row.employeeId === person.id)
      const cells = seat === null ? [] : requirements.filter(row => row.positionId === Number(seat.positionId)).map(row => {
        const mine = own.find(item => item.skillId === row.skillId) ?? null
        const status: GapStatus = gapOf(row.requiredLevel, mine, today)
        return { skillId: row.skillId, skillName: names.get(row.skillId) ?? '—', required: row.requiredLevel, requiredLabel: isSkillLevel(row.requiredLevel) ? SKILL_LEVEL_LABELS[row.requiredLevel] : row.requiredLevel,
          level: mine?.level ?? null, levelLabel: mine && isSkillLevel(mine.level) ? SKILL_LEVEL_LABELS[mine.level] : null, source: mine?.source ?? null, validUntil: mine?.validUntil ?? null, status, statusLabel: GAP_LABELS[status] }
      })
      return { employeeId: person.id, fullName: person.fullName, employeeCode: person.employeeCode, positionId: seat ? Number(seat.positionId) : null, positionTitle: seat?.title ?? null, cells,
        gaps: cells.filter(cell => cell.status !== 'MET').length,
        // مهاراته المتقيّمة اللي مش مطلوبة لوظيفته
        extra: own.filter(row => !cells.some(cell => cell.skillId === row.skillId)).map(row => ({ skillId: row.skillId, skillName: names.get(row.skillId) ?? '—', level: row.level,
          levelLabel: isSkillLevel(row.level) ? SKILL_LEVEL_LABELS[row.level] : null, source: row.source ?? null, validUntil: row.validUntil ?? null })) }
    })
  }

  /** مصفوفة موظفين نطاق الحساب اللي على وظائف معتمدة — بفرع الموظف الحالي */
  async matrix(user: JwtPayload) {
    const em = this.ds.manager
    await this.assertReady(em)
    const scope = branchScopeOf(user)
    const people: Person[] = (await em.query(
      `SELECT e.[id], e.[fullName], e.[employeeCode], e.[branchId] FROM dbo.employees e WHERE ${ACTIVE} AND EXISTS (SELECT 1 FROM dbo.position_holders h WHERE h.[employeeId] = e.[id]) ORDER BY e.[fullName], e.[id]`))
      .map((row: Person) => ({ id: Number(row.id), fullName: row.fullName, employeeCode: row.employeeCode ?? null, branchId: idOf(row.branchId) })).filter((row: Person) => inBranchScope(scope, row.branchId))
    return { rows: await this.matrixRows(em, people) }
  }

  /** مصفوفة المرؤوسين المباشرين لصاحب الحساب (المدير المباشر موقع في الهيكل — من غير صلاحية) */
  async myTeam(user: JwtPayload) {
    const em = this.ds.manager, me = user.employeeId == null ? null : Number(user.employeeId)
    if (me === null || !(await skillsReady(em))) return { rows: [] }
    const people: Person[] = (await em.query(`SELECT e.[id], e.[fullName], e.[employeeCode], e.[branchId] FROM dbo.employees e WHERE e.[managerEmployeeId] = @0 AND e.[id] <> @0 AND ${ACTIVE} ORDER BY e.[fullName], e.[id]`, [me]))
      .map((row: Person) => ({ id: Number(row.id), fullName: row.fullName, employeeCode: row.employeeCode ?? null, branchId: idOf(row.branchId) }))
    return { rows: await this.matrixRows(em, people), levels: this.levels(), skills: (await em.getRepository(Skill).find({ where: { isActive: true }, order: { name: 'ASC', id: 'ASC' } })).map(row => ({ id: row.id, name: row.name })) }
  }

  /** فجوة صاحب الحساب هو */
  async mine(user: JwtPayload) {
    if (!user.employeeId) throw new ForbiddenException(NOT_EMPLOYEE)
    const em = this.ds.manager, me = Number(user.employeeId)
    if (!(await skillsReady(em))) return { ready: false, row: null }
    const [person]: Person[] = await em.query('SELECT [id], [fullName], [employeeCode], [branchId] FROM dbo.employees WHERE [id] = @0', [me])
    if (!person) return { ready: true, row: null }
    return { ready: true, row: (await this.matrixRows(em, [{ id: me, fullName: person.fullName, employeeCode: person.employeeCode ?? null, branchId: idOf(person.branchId) }]))[0] }
  }

  // ===== تقييم مهارة موظف =====

  /**
   * تقييم مهارة موظف من المكتبة: لصاحب `skills.manage` والموظف في نطاق فروعه، أو لمديره المباشر — والحكم بعد قفل صف الموظف (غير كده
   * «الموظف غير موجود»). ومحدش بيقيّم نفسه. صف واحد للموظف والمهارة في `employee_skills` (بيتحدّث تحت قفل مدى)، وسطر تدقيق بالقديم والجديد والمصدر.
   */
  async assess(user: JwtPayload, employeeId: number, skillId: number, body: unknown) {
    const { fields, error } = assessmentFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const [person]: Array<{ id: number; fullName: string; branchId: number | null; managerEmployeeId: number | null }> = await em.query(
        'SELECT [id], [fullName], [branchId], [managerEmployeeId] FROM dbo.employees WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [employeeId])
      const me = user.employeeId == null ? null : Number(user.employeeId)
      const byRight = userHasPerm(user, 'skills.manage') && !!person && inBranchScope(branchScopeOf(user), idOf(person.branchId))
      const byManager = !!person && me !== null && idOf(person.managerEmployeeId) === me
      if (!person || (!byRight && !byManager)) throw new NotFoundException(EMPLOYEE_NOT_FOUND)
      if (me !== null && me === Number(person.id)) throw new ForbiddenException(SELF_ASSESSMENT)
      const skill = await em.getRepository(Skill).findOne({ where: { id: skillId } })
      if (!skill || !flag(skill.isActive)) throw new NotFoundException(SKILL_NOT_FOUND)
      const [existing]: Array<{ id: number; level: string | null; source: string | null; validUntil: string | null }> = await em.query(
        `SELECT [id], [level], [source], CONVERT(varchar(10), [validUntil], 23) AS [validUntil] FROM dbo.employee_skills WITH (UPDLOCK, HOLDLOCK) WHERE [employeeId] = @0 AND [skillId] = @1 ORDER BY [id]`, [employeeId, skillId])
      const values: [SkillLevel, string, SkillSource, number, string | null] = [fields.level, skill.name, fields.source, user.sub, fields.validUntil]
      if (existing) {
        await em.query(`UPDATE dbo.employee_skills SET [level] = @0, [name] = @1, [source] = @2, [assessedByUserId] = @3, [assessedAt] = SYSDATETIME(), [validUntil] = @4 WHERE [id] = @5`, [...values, Number(existing.id)])
      } else {
        await em.query(`INSERT INTO dbo.employee_skills ([employeeId], [level], [name], [source], [assessedByUserId], [assessedAt], [validUntil], [skillId], [createdAt])
          VALUES (@5, @0, @1, @2, @3, SYSDATETIME(), @4, @6, SYSDATETIME())`, [...values, employeeId, skillId])
      }
      await recordAudit(em, { category: 'SETTINGS', action: 'EMPLOYEE_SKILL_ASSESSED', entityType: 'employee', entityId: String(employeeId), actorUserId: user.sub, branchId: idOf(person.branchId) ?? undefined,
        summary: `تقييم مهارة «${skill.name}» للموظف ${person.fullName}: ${SKILL_LEVEL_LABELS[fields.level]} (${SKILL_SOURCE_LABELS[fields.source]})`,
        before: existing ? { skillId, level: existing.level, source: existing.source, validUntil: existing.validUntil } : undefined,
        after: { skillId, level: fields.level, source: fields.source, validUntil: fields.validUntil, by: byRight ? 'RIGHT' : 'MANAGER' } })
      return { employeeId, skillId, level: fields.level }
    })
  }
}
