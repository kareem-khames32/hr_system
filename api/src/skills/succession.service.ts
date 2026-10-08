import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope } from '../auth/guards'
import { reviewsReady } from '../performance/review-rules'
import { positionCode } from '../positions/position-rules'
import { EMPLOYEE_NOT_FOUND, gapOf, POSITION_NOT_FOUND, PositionSkillRequirement } from './skills'
import {
  BAND_LABELS, boxOf, isBand, NINE_BOX_MIGRATION_MISSING, nineBoxReady, performanceBand, PERFORMANCE_HIGH_FROM, PERFORMANCE_MEDIUM_FROM, potentialFields, TalentPotential,
  criticalFields, CriticalPosition, HIDDEN_NOMINEE, isReadiness, NOMINATION_NOT_FOUND, nominationFields, nominationPatch, NOMINEES_MAX, READINESS, READINESS_LABELS, SUCCESSION_MIGRATION_MISSING,
  SuccessionNomination, successionReady,
} from './succession'

// B5.4 (ب): الإحلال — الوظائف الحرجة في نطاق فروع الحساب (بفرع الوظيفة) وخلفاؤها. كل كتابة تحت قفل صف الوظيفة، وبسطر تدقيق على الوظيفة.
// سرّي: المسارات كلها بـ`succession.manage`، ومرشح فرعه الحالي برّه نطاق القارئ بيتعرض من غير اسم ولا رقم.

const NOT_CRITICAL = 'الوظيفة مش متعلّمة «حرجة» — علّمها الأول'
const IS_HOLDER = 'الموظف شاغل الوظيفة نفسها — مايترشحش خليفة ليها'
const ALREADY_NOMINATED = 'الموظف مرشح على الوظيفة دي قبل كده'
const ACTIVE = `e.[isActive] = 1 AND e.[status] IN (N'active', N'probation', N'notice_period')`
const flag = (value: unknown) => value === true || value === 1
const idOf = (value: unknown) => (value == null ? null : Number(value))
const marks = (ids: readonly number[]) => ids.map((_, index) => `@${index}`).join(', ')

interface PositionRow { id: number; branchId: number; status: string; title: string; branchName: string | null; departmentName: string | null }

@Injectable()
export class SuccessionService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async assertReady(em: EntityManager) {
    if (!(await successionReady(em))) throw new BadRequestException(SUCCESSION_MIGRATION_MISSING)
  }

  /** صف الوظيفة تحت قفله، في نطاق الحساب ومش ملغاة — غير كده «مش موجودة» */
  private async lockPosition(em: EntityManager, user: JwtPayload, positionId: number): Promise<{ id: number; branchId: number }> {
    const [position]: Array<{ id: number; branchId: number; status: string }> = await em.query('SELECT [id], [branchId], [status] FROM dbo.positions WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [positionId])
    if (!position || position.status === 'CANCELLED' || !inBranchScope(branchScopeOf(user), Number(position.branchId))) throw new NotFoundException(POSITION_NOT_FOUND)
    return { id: Number(position.id), branchId: Number(position.branchId) }
  }

  private readiness() {
    return READINESS.map(code => ({ code, label: READINESS_LABELS[code] }))
  }

  /** الوظائف المعتمدة في نطاق الحساب بعلامة «حرجة»، وللحرجة: شاغلوها وخلفاؤها بترتيبهم وجاهزيتهم وفجوتهم عن مهاراتها المطلوبة */
  async overview(user: JwtPayload) {
    const em = this.ds.manager
    if (!(await successionReady(em))) return { ready: false, readiness: this.readiness(), positions: [], candidates: [] }
    const scope = branchScopeOf(user), today = localDateOf(new Date())
    const rows: PositionRow[] = await em.query(
      `SELECT p.[id], p.[branchId], p.[status], t.[title], b.[name] AS [branchName], d.[name] AS [departmentName]
       FROM dbo.positions p INNER JOIN dbo.job_titles t ON t.[id] = p.[jobTitleId] LEFT JOIN dbo.branches b ON b.[id] = p.[branchId]
         LEFT JOIN dbo.departments d ON d.[id] = p.[departmentId] AND d.[branchId] = p.[branchId]
       WHERE p.[status] <> N'CANCELLED' ORDER BY b.[name], d.[name], t.[title], p.[id]`)
    const visible = rows.map(row => ({ ...row, id: Number(row.id), branchId: Number(row.branchId) })).filter(row => inBranchScope(scope, row.branchId))
    const ids = visible.map(row => row.id)
    const critical = ids.length ? await em.getRepository(CriticalPosition).find({ where: { positionId: In(ids), isActive: true } }) : []
    const criticalIds = critical.map(row => row.positionId)
    const nominations = criticalIds.length ? await em.getRepository(SuccessionNomination).find({ where: { positionId: In(criticalIds), status: 'ACTIVE' }, order: { rank: 'ASC', id: 'ASC' } }) : []
    const requirements = criticalIds.length ? await em.getRepository(PositionSkillRequirement).find({ where: { positionId: In(criticalIds) } }) : []
    const holders: Array<{ positionId: number; fullName: string; branchId: number | null }> = criticalIds.length ? await em.query(
      `SELECT h.[positionId], e.[fullName], e.[branchId] FROM dbo.position_holders h INNER JOIN dbo.employees e ON e.[id] = h.[employeeId] WHERE h.[positionId] IN (${marks(criticalIds)}) ORDER BY e.[fullName], e.[id]`, criticalIds) : []
    const nomineeIds = [...new Set(nominations.map(row => row.employeeId))]
    const people = new Map<number, { fullName: string; employeeCode: string | null; branchId: number | null }>()
    const held: Array<{ employeeId: number; skillId: number; level: string | null; validUntil: string | null }> = []
    if (nomineeIds.length) {
      for (const row of await em.query(`SELECT [id], [fullName], [employeeCode], [branchId] FROM dbo.employees WHERE [id] IN (${marks(nomineeIds)})`, nomineeIds) as Array<{ id: number; fullName: string; employeeCode: string | null; branchId: number | null }>) {
        people.set(Number(row.id), { fullName: row.fullName, employeeCode: row.employeeCode ?? null, branchId: idOf(row.branchId) })
      }
      held.push(...(await em.query(`SELECT [employeeId], [skillId], [level], CONVERT(varchar(10), [validUntil], 23) AS [validUntil] FROM dbo.employee_skills WHERE [skillId] IS NOT NULL AND [employeeId] IN (${marks(nomineeIds)})`, nomineeIds) as typeof held)
        .map(row => ({ ...row, employeeId: Number(row.employeeId), skillId: Number(row.skillId) })))
    }
    const actorIds = [...new Set(nominations.map(row => row.nominatedByUserId))]
    const actors = new Map<number, string>()
    if (actorIds.length) for (const row of await em.query(`SELECT [id], [displayName] FROM dbo.users WHERE [id] IN (${marks(actorIds)})`, actorIds) as Array<{ id: number; displayName: string | null }>) actors.set(Number(row.id), row.displayName ?? '')
    const candidates: Array<{ id: number; fullName: string; employeeCode: string | null; branchId: number | null }> = await em.query(`SELECT e.[id], e.[fullName], e.[employeeCode], e.[branchId] FROM dbo.employees e WHERE ${ACTIVE} ORDER BY e.[fullName], e.[id]`)
    return {
      ready: true, readiness: this.readiness(),
      positions: visible.map(row => {
        const mark = critical.find(item => item.positionId === row.id) ?? null
        const required = requirements.filter(item => item.positionId === row.id)
        const seated = holders.filter(item => Number(item.positionId) === row.id)
        return {
          id: row.id, code: positionCode(row.id), title: row.title, branchName: row.branchName ?? null, departmentName: row.departmentName ?? null, critical: !!mark, reason: mark?.reason ?? null,
          requirements: required.length,
          // شاغل فرعه الحالي برّه النطاق بيتعدّ من غير اسم
          holders: seated.filter(item => inBranchScope(scope, idOf(item.branchId))).map(item => item.fullName), hiddenHolders: seated.filter(item => !inBranchScope(scope, idOf(item.branchId))).length,
          nominations: !mark ? [] : nominations.filter(item => item.positionId === row.id).map(item => {
            const person = people.get(item.employeeId), shown = !!person && inBranchScope(scope, person.branchId)
            const mine = held.filter(skill => skill.employeeId === item.employeeId)
            return { id: item.id, rank: item.rank, readiness: item.readiness, readinessLabel: isReadiness(item.readiness) ? READINESS_LABELS[item.readiness] : item.readiness, note: item.note ?? null,
              nominatedAt: item.nominatedAt, nominatedByName: actors.get(item.nominatedByUserId) ?? null, hidden: !shown,
              employeeId: shown ? item.employeeId : null, fullName: shown ? person!.fullName : HIDDEN_NOMINEE, employeeCode: shown ? person!.employeeCode : null,
              gaps: shown ? required.filter(need => gapOf(need.requiredLevel, mine.find(skill => skill.skillId === need.skillId), today) !== 'MET').length : null }
          }),
        }
      }),
      candidates: candidates.filter(row => inBranchScope(scope, idOf(row.branchId))).slice(0, 1000).map(row => ({ id: Number(row.id), fullName: row.fullName, employeeCode: row.employeeCode ?? null })),
    }
  }

  /** تعليم وظيفة «حرجة» بسبب، أو شيل العلامة (تعطيل من غير مسح) — صف واحد للوظيفة تحت قفل صفها */
  async setCritical(user: JwtPayload, positionId: number, body: unknown) {
    const { fields, error } = criticalFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const position = await this.lockPosition(em, user, positionId)
      const repo = em.getRepository(CriticalPosition)
      const row = await repo.findOne({ where: { positionId: position.id }, order: { id: 'ASC' } })
      const before = row ? { critical: flag(row.isActive), reason: row.reason ?? null } : undefined
      const values = { isActive: fields.critical, reason: fields.critical ? fields.reason : row?.reason ?? null, updatedByUserId: user.sub, updatedAt: new Date() }
      if (row) await repo.update({ id: row.id }, values)
      else if (fields.critical) await repo.save(repo.create({ positionId: position.id, ...values }))
      await recordAudit(em, { category: 'SETTINGS', action: 'POSITION_CRITICAL_SET', entityType: 'position', entityId: String(position.id), actorUserId: user.sub, branchId: position.branchId,
        summary: `الوظيفة ${positionCode(position.id)}: ${fields.critical ? 'اتعلّمت «حرجة»' : 'اتشالت علامة «حرجة»'}`, before, after: { critical: fields.critical, reason: values.reason } })
      return { positionId: position.id, critical: fields.critical }
    })
  }

  /**
   * ترشيح خليفة لوظيفة حرجة: الموظف على رأس العمل وفي نطاق الحساب (فرعه الحالي، تحت قفل صفه — غير كده «غير موجود»)، مش شاغل الوظيفة نفسها،
   * ومش مرشح ساري عليها. الترتيب آخر القايمة.
   */
  async nominate(user: JwtPayload, positionId: number, body: unknown) {
    const { fields, error } = nominationFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const position = await this.lockPosition(em, user, positionId)
      if (!(await em.getRepository(CriticalPosition).count({ where: { positionId: position.id, isActive: true } }))) throw new BadRequestException(NOT_CRITICAL)
      const [person]: Array<{ id: number; fullName: string; branchId: number | null }> = await em.query(`SELECT e.[id], e.[fullName], e.[branchId] FROM dbo.employees e WITH (UPDLOCK, ROWLOCK) WHERE e.[id] = @0 AND ${ACTIVE}`, [fields.employeeId])
      if (!person || !inBranchScope(branchScopeOf(user), idOf(person.branchId))) throw new NotFoundException(EMPLOYEE_NOT_FOUND)
      const [seat]: Array<{ employeeId: number }> = await em.query('SELECT [employeeId] FROM dbo.position_holders WHERE [employeeId] = @0 AND [positionId] = @1', [fields.employeeId, position.id])
      if (seat) throw new BadRequestException(IS_HOLDER)
      const repo = em.getRepository(SuccessionNomination)
      const current = await repo.find({ where: { positionId: position.id, status: 'ACTIVE' } })
      if (current.some(row => row.employeeId === fields.employeeId)) throw new ConflictException(ALREADY_NOMINATED)
      if (current.length >= NOMINEES_MAX) throw new BadRequestException(`الوظيفة ليها ${NOMINEES_MAX} مرشحين بالكتير`)
      const row = await repo.save(repo.create({ positionId: position.id, employeeId: fields.employeeId, rank: current.reduce((top, item) => Math.max(top, item.rank), 0) + 1, readiness: fields.readiness, note: fields.note,
        status: 'ACTIVE', nominatedByUserId: user.sub, nominatedAt: new Date(), removedByUserId: null, removedAt: null }))
      await recordAudit(em, { category: 'SETTINGS', action: 'SUCCESSION_NOMINATED', entityType: 'position', entityId: String(position.id), actorUserId: user.sub, branchId: position.branchId,
        summary: `ترشيح خليفة للوظيفة ${positionCode(position.id)} (${READINESS_LABELS[fields.readiness]})`, after: { nominationId: row.id, employeeId: fields.employeeId, rank: row.rank, readiness: fields.readiness } })
      return { id: row.id, rank: row.rank }
    })
  }

  /** الترشيح الساري تحت قفل صف وظيفته (الوظيفة في نطاق الحساب — غير كده «مش موجود») */
  private async lockNomination(em: EntityManager, user: JwtPayload, id: number): Promise<{ row: SuccessionNomination; branchId: number }> {
    const peek = await em.getRepository(SuccessionNomination).findOne({ where: { id } })
    if (!peek) throw new NotFoundException(NOMINATION_NOT_FOUND)
    let position: { id: number; branchId: number }
    try { position = await this.lockPosition(em, user, peek.positionId) } catch { throw new NotFoundException(NOMINATION_NOT_FOUND) }
    const row = await em.getRepository(SuccessionNomination).findOne({ where: { id, positionId: position.id, status: 'ACTIVE' }, lock: { mode: 'pessimistic_write' } })
    if (!row) throw new NotFoundException(NOMINATION_NOT_FOUND)
    return { row, branchId: position.branchId }
  }

  async updateNomination(user: JwtPayload, id: number, body: unknown) {
    const { fields, error } = nominationPatch(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const { row, branchId } = await this.lockNomination(em, user, id)
      const after = { readiness: fields.readiness, note: fields.note, rank: fields.rank ?? row.rank }
      await em.getRepository(SuccessionNomination).update({ id: row.id }, after)
      await recordAudit(em, { category: 'SETTINGS', action: 'SUCCESSION_UPDATED', entityType: 'position', entityId: String(row.positionId), actorUserId: user.sub, branchId,
        summary: `تعديل ترشيح خليفة للوظيفة ${positionCode(row.positionId)}`, before: { nominationId: row.id, readiness: row.readiness, note: row.note ?? null, rank: row.rank }, after: { nominationId: row.id, ...after } })
      return { id: row.id }
    })
  }

  /** شيل مرشح: حالة «اتشال» بمين وإمتى — من غير مسح */
  async removeNomination(user: JwtPayload, id: number) {
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const { row, branchId } = await this.lockNomination(em, user, id)
      await em.getRepository(SuccessionNomination).update({ id: row.id }, { status: 'REMOVED', removedByUserId: user.sub, removedAt: new Date() })
      await recordAudit(em, { category: 'SETTINGS', action: 'SUCCESSION_REMOVED', entityType: 'position', entityId: String(row.positionId), actorUserId: user.sub, branchId,
        summary: `شيل مرشح خليفة من الوظيفة ${positionCode(row.positionId)}`, before: { nominationId: row.id, employeeId: row.employeeId, rank: row.rank, readiness: row.readiness } })
      return { removed: true }
    })
  }

  // ===== (ج) شبكة 9-box =====

  /**
   * موظفين نطاق الحساب اللي على رأس العمل ولهم تقييم أداء معلن أو تقدير إمكانات: شريحة الأداء من درجة آخر تقييم معلن، وتقدير الإمكانات،
   * ورقم الخانة لما المحورين موجودين. قراءة بس.
   */
  async nineBox(user: JwtPayload) {
    const em = this.ds.manager
    const thresholds = { mediumFrom: PERFORMANCE_MEDIUM_FROM, highFrom: PERFORMANCE_HIGH_FROM }
    if (!(await nineBoxReady(em))) return { ready: false, thresholds, rows: [] }
    const scope = branchScopeOf(user)
    const people: Array<{ id: number; fullName: string; employeeCode: string | null; branchId: number | null }> = await em.query(`SELECT e.[id], e.[fullName], e.[employeeCode], e.[branchId] FROM dbo.employees e WHERE ${ACTIVE} ORDER BY e.[fullName], e.[id]`)
    const scores = new Map<number, number>()
    if (await reviewsReady(em)) {
      // آخر تقييم معلن لكل موظف (أكبر رقم تكليف)
      const rows: Array<{ employeeId: number; score: number }> = await em.query(`SELECT a.[employeeId], CAST(a.[finalScore] AS float) AS [score] FROM dbo.review_assignments a
        WHERE a.[status] IN (N'ANNOUNCED', N'ACKNOWLEDGED') AND a.[finalScore] IS NOT NULL ORDER BY a.[id]`)
      for (const row of rows) scores.set(Number(row.employeeId), Number(row.score))
    }
    const potentials = new Map((await em.getRepository(TalentPotential).find({ order: { id: 'ASC' } })).map(row => [row.employeeId, row]))
    return { ready: true, thresholds,
      rows: people.filter(row => inBranchScope(scope, idOf(row.branchId)) && (scores.has(Number(row.id)) || potentials.has(Number(row.id)))).map(row => {
        const id = Number(row.id), score = scores.get(id) ?? null, performance = performanceBand(score), saved = potentials.get(id)
        const potential = saved && isBand(saved.potential) ? saved.potential : null
        return { employeeId: id, fullName: row.fullName, employeeCode: row.employeeCode ?? null, score, performance, performanceLabel: performance ? BAND_LABELS[performance] : null,
          potential, potentialLabel: potential ? BAND_LABELS[potential] : null, note: saved?.note ?? null, box: boxOf(performance, potential) }
      }) }
  }

  /** تقدير إمكانات موظف على رأس العمل في نطاق الحساب (فرعه الحالي، تحت قفل صفه — غير كده «غير موجود»): صف واحد للموظف، بسطر تدقيق */
  async setPotential(user: JwtPayload, employeeId: number, body: unknown) {
    const { fields, error } = potentialFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      if (!(await nineBoxReady(em))) throw new BadRequestException(NINE_BOX_MIGRATION_MISSING)
      const [person]: Array<{ id: number; branchId: number | null }> = await em.query(`SELECT e.[id], e.[branchId] FROM dbo.employees e WITH (UPDLOCK, ROWLOCK) WHERE e.[id] = @0 AND ${ACTIVE}`, [employeeId])
      if (!person || !inBranchScope(branchScopeOf(user), idOf(person.branchId))) throw new NotFoundException(EMPLOYEE_NOT_FOUND)
      const repo = em.getRepository(TalentPotential)
      const row = await repo.findOne({ where: { employeeId }, order: { id: 'ASC' } })
      const values = { potential: fields.potential, note: fields.note, updatedByUserId: user.sub, updatedAt: new Date() }
      if (row) await repo.update({ id: row.id }, values)
      else await repo.save(repo.create({ employeeId, ...values }))
      await recordAudit(em, { category: 'SETTINGS', action: 'TALENT_POTENTIAL_SET', entityType: 'talent_potential', entityId: String(employeeId), actorUserId: user.sub, branchId: idOf(person.branchId) ?? undefined,
        summary: `تقدير إمكانات موظف: ${BAND_LABELS[fields.potential]}`, before: row ? { potential: row.potential, note: row.note ?? null } : undefined, after: { potential: fields.potential, note: fields.note } })
      return { employeeId, potential: fields.potential }
    })
  }
}
