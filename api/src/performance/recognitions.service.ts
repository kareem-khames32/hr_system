import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { EMPLOYEE_NOT_FOUND, Recognition, RECOGNITION_MIGRATION_MISSING, recognitionFields, RECOGNITIONS_PER_DAY, recognitionsReady } from './people-feedback'

// B5.10 (ج): التقدير بين الزملاء — كلمة شكر من موظف على رأس العمل لزميل في فرعه الحالي (تحت قفل صف ملف المرسل، وبحد في اليوم)، بتظهر في قايمة
// فرع المستلم. من غير أي أثر مالي. صاحب `performance.manage` بيخفي واحدة في نطاقه بسطر تدقيق.

const NOT_ACTIVE = 'ملفك مش على رأس العمل'
const FORMER = 'زميل سابق في الفرع'
const ACTIVE = `[isActive] = 1 AND [status] IN (N'active', N'probation', N'notice_period')`
const idOf = (value: unknown) => (value == null ? null : Number(value))
const marks = (ids: readonly unknown[]) => ids.map((_, index) => `@${index}`).join(', ')

@Injectable()
export class RecognitionsService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async assertReady(em: EntityManager) {
    if (!(await recognitionsReady(em))) throw new BadRequestException(RECOGNITION_MIGRATION_MISSING)
  }

  /**
   * قايمة التقدير: شكر فرع صاحب الحساب الحالي (وفروع نطاق صاحب `performance.manage`) اللي مااتخفاش، وزملاء فرعه. الاسم بيتعرض لو صاحبه لسه في
   * فرع الشكر — غير كده «زميل سابق في الفرع».
   */
  async feed(user: JwtPayload) {
    const em = this.ds.manager, me = user.employeeId == null ? null : Number(user.employeeId), canModerate = userHasPerm(user, 'performance.manage'), scope = branchScopeOf(user)
    if (!(await recognitionsReady(em))) return { ready: false, canSend: false, canModerate, perDay: RECOGNITIONS_PER_DAY, colleagues: [], feed: [] }
    const [self]: Array<{ branchId: number | null }> = me === null ? [] : await em.query(`SELECT [branchId] FROM dbo.employees WHERE [id] = @0 AND ${ACTIVE}`, [me])
    const myBranch = idOf(self?.branchId)
    const rows = (await em.getRepository(Recognition).find({ order: { id: 'DESC' }, take: 500 }))
      .filter(row => row.hiddenByUserId == null && ((myBranch !== null && row.branchId === myBranch) || (canModerate && inBranchScope(scope, row.branchId)))).slice(0, 60)
    const ids = [...new Set(rows.flatMap(row => [row.fromEmployeeId, row.toEmployeeId]))]
    const people = new Map<number, { fullName: string; branchId: number | null }>(ids.length ? (await em.query(`SELECT [id], [fullName], [branchId] FROM dbo.employees WHERE [id] IN (${marks(ids)})`, ids))
      .map((row: { id: number; fullName: string; branchId: number | null }) => [Number(row.id), { fullName: row.fullName, branchId: idOf(row.branchId) }]) : [])
    const nameIn = (id: number, branchId: number) => { const person = people.get(id); return person && person.branchId === branchId ? person.fullName : FORMER }
    const colleagues: Array<{ id: number; fullName: string }> = myBranch === null ? [] : await em.query(`SELECT [id], [fullName] FROM dbo.employees WHERE ${ACTIVE} AND [branchId] = @0 AND [id] <> @1 ORDER BY [fullName], [id]`, [myBranch, me])
    return { ready: true, canSend: myBranch !== null, canModerate, perDay: RECOGNITIONS_PER_DAY, colleagues: colleagues.map(row => ({ id: Number(row.id), fullName: row.fullName })),
      feed: rows.map(row => ({ id: row.id, fromName: nameIn(row.fromEmployeeId, row.branchId), toName: nameIn(row.toEmployeeId, row.branchId), message: row.message, createdAt: row.createdAt,
        toMe: me !== null && row.toEmployeeId === me, fromMe: me !== null && row.fromEmployeeId === me })) }
  }

  /** كلمة شكر لزميل على رأس العمل في فرعي الحالي (مش لنفسي)، بحد في اليوم — تحت قفل صف ملفي */
  async send(user: JwtPayload, body: unknown) {
    if (!user.employeeId) throw new ForbiddenException('حسابك مش مربوط بملف موظف')
    const me = Number(user.employeeId), now = new Date()
    const { fields, error } = recognitionFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const [self]: Array<{ branchId: number | null }> = await em.query(`SELECT [branchId] FROM dbo.employees WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0 AND ${ACTIVE}`, [me])
      if (!self || self.branchId == null) throw new ForbiddenException(NOT_ACTIVE)
      const [counted]: Array<{ total: number }> = await em.query('SELECT COUNT(*) AS [total] FROM dbo.recognitions WHERE [fromEmployeeId] = @0 AND [createdAt] >= @1', [me, new Date(`${localDateOf(now)}T00:00:00`)])
      if (Number(counted?.total) >= RECOGNITIONS_PER_DAY) throw new ConflictException(`${RECOGNITIONS_PER_DAY} كلمات شكر في اليوم بالكتير`)
      const [target]: Array<{ id: number }> = await em.query(`SELECT [id] FROM dbo.employees WHERE [id] = @0 AND [branchId] = @1 AND ${ACTIVE}`, [fields.toEmployeeId, Number(self.branchId)])
      if (!target || fields.toEmployeeId === me) throw new NotFoundException(EMPLOYEE_NOT_FOUND)
      const repo = em.getRepository(Recognition)
      const row = await repo.save(repo.create({ fromEmployeeId: me, toEmployeeId: fields.toEmployeeId, branchId: Number(self.branchId), message: fields.message, hiddenByUserId: null, createdAt: now }))
      return { id: row.id }
    })
  }

  /** إخفاء كلمة شكر من القايمة: لصاحب الصلاحية وفرعها في نطاقه (غير كده «مش موجودة»)، بسطر تدقيق */
  async hide(user: JwtPayload, id: number) {
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const repo = em.getRepository(Recognition)
      const row = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!row || row.hiddenByUserId != null || !inBranchScope(branchScopeOf(user), row.branchId)) throw new NotFoundException('كلمة الشكر مش موجودة')
      await repo.update({ id: row.id }, { hiddenByUserId: user.sub })
      await recordAudit(em, { category: 'SETTINGS', action: 'RECOGNITION_HIDDEN', entityType: 'recognition', entityId: String(row.id), actorUserId: user.sub, branchId: row.branchId, summary: 'إخفاء كلمة شكر من قايمة التقدير',
        after: { fromEmployeeId: row.fromEmployeeId, toEmployeeId: row.toEmployeeId } })
      return { id: row.id }
    })
  }
}
