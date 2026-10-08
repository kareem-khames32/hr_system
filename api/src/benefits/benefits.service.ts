import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, branchScopeOf, inBranchScope } from '../auth/guards'
import { classFields, eligibleCoverage, InsuranceClass, InsuranceClassGrade, InsurancePolicy, insuranceReady, POLICY_STATE_LABELS, policyFields, policyState } from './insurance'

// B5.2 (أ): وثائق التأمين الطبي وفئاتها وأهلية الفئة بالدرجة. الوثائق تعريف للشركة كلها: القراءة بصلاحية الموديول، والكتابة لحساب بكل الفروع،
// تحت قفل صف الوثيقة، وبسطر تدقيق. مفيش مسح (تعطيل بس). تقرير الأهلية بنطاق فروع الحساب (فرع الموظف الحالي).

export const INSURANCE_MIGRATION_MISSING = 'جداول التأمين الطبي ناقصة — طبّق ترحيلات 143 و144 و145 الأول'
const POLICY_NOT_FOUND = 'وثيقة التأمين مش موجودة'
const CLASS_NOT_FOUND = 'فئة التأمين مش موجودة'
const CLASS_NAME_TAKEN = 'فيه فئة بنفس الاسم في الوثيقة دي'
const GRADE_UNKNOWN = 'درجة من درجات الفئة مش موجودة'
const GRADE_TAKEN = 'درجة من درجات الفئة مربوطة بفئة تانية مفعّلة في نفس الوثيقة'
const ACTIVE = `e.[isActive] = 1 AND e.[status] IN (N'active', N'probation', N'notice_period')`
const flag = (value: unknown) => value === true || value === 1

@Injectable()
export class BenefitsService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async assertReady(em: EntityManager) {
    if (!(await insuranceReady(em))) throw new BadRequestException(INSURANCE_MIGRATION_MISSING)
  }

  private async lockPolicy(em: EntityManager, id: number): Promise<InsurancePolicy> {
    const row = await em.getRepository(InsurancePolicy).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
    if (!row) throw new NotFoundException(POLICY_NOT_FOUND)
    return row
  }

  /** الوثائق بحالتها وفئاتها ودرجات كل فئة */
  async overview(user: JwtPayload) {
    const em = this.ds.manager, canEdit = branchScopeOf(user) === null
    const grades: Array<{ id: number; name: string }> = (await em.query('SELECT [id], [name] FROM [grades] WHERE [isActive] = 1 ORDER BY [id]')).map((row: { id: number; name: string }) => ({ id: Number(row.id), name: row.name }))
    if (!(await insuranceReady(em))) return { ready: false, canEdit, policies: [], grades }
    const today = localDateOf(new Date())
    const policies = await em.getRepository(InsurancePolicy).find({ order: { id: 'DESC' } })
    const classes = await em.getRepository(InsuranceClass).find({ order: { id: 'ASC' } })
    const links = classes.length ? await em.getRepository(InsuranceClassGrade).find({ where: { classId: In(classes.map(row => row.id)) }, order: { gradeId: 'ASC' } }) : []
    return {
      ready: true, canEdit, grades,
      policies: policies.map(policy => {
        const { state, daysLeft } = policyState(policy, today)
        return {
          id: policy.id, name: policy.name, insurerName: policy.insurerName, policyNumber: policy.policyNumber, country: policy.country, startDate: String(policy.startDate).slice(0, 10),
          endDate: String(policy.endDate).slice(0, 10), isActive: flag(policy.isActive), note: policy.note, state, stateLabel: POLICY_STATE_LABELS[state], daysLeft,
          classes: classes.filter(row => row.policyId === policy.id).map(row => ({ id: row.id, name: row.name, employeeShareMonthly: Number(row.employeeShareMonthly), isDefault: flag(row.isDefault),
            isActive: flag(row.isActive), gradeIds: links.filter(link => link.classId === row.id).map(link => link.gradeId) })),
        }
      }),
    }
  }

  async createPolicy(user: JwtPayload, body: unknown) {
    assertCompanyWideWrite(user)
    const checked = policyFields(body)
    if (checked.fields === null) throw new BadRequestException(checked.error)
    const fields = checked.fields
    await this.ds.transaction(async em => {
      await this.assertReady(em)
      const made = await em.getRepository(InsurancePolicy).insert({ ...fields, isActive: true, createdByUserId: user.sub, createdAt: new Date(), updatedByUserId: null, updatedAt: null })
      await recordAudit(em, { category: 'SETTINGS', action: 'INSURANCE_POLICY_CREATED', entityType: 'insurance_policy', entityId: String(made.identifiers[0].id), actorUserId: user.sub,
        summary: `وثيقة تأمين جديدة: ${fields.name} (${fields.insurerName})`, after: { ...fields } })
    })
    return this.overview(user)
  }

  /** تعديل بيانات الوثيقة أو تعطيلها/تفعيلها — تحت قفل صفها */
  async updatePolicy(user: JwtPayload, id: number, body: unknown) {
    assertCompanyWideWrite(user)
    const input = (body ?? {}) as Record<string, unknown>
    if (input.isActive !== undefined && typeof input.isActive !== 'boolean') throw new BadRequestException('«مفعّلة» نعم أو لا')
    await this.ds.transaction(async em => {
      await this.assertReady(em)
      const policy = await this.lockPolicy(em, id)
      const before = { name: policy.name, insurerName: policy.insurerName, policyNumber: policy.policyNumber, country: policy.country, startDate: String(policy.startDate).slice(0, 10),
        endDate: String(policy.endDate).slice(0, 10), note: policy.note }
      // اللي مااتبعتش بيفضل زي ما هو
      const checked = policyFields({ ...before, ...Object.fromEntries(Object.entries(input).filter(([key, value]) => key !== 'isActive' && value !== undefined)) })
      if (checked.fields === null) throw new BadRequestException(checked.error)
      const isActive = input.isActive === undefined ? flag(policy.isActive) : input.isActive as boolean
      await em.getRepository(InsurancePolicy).update({ id }, { ...checked.fields, isActive, updatedByUserId: user.sub, updatedAt: new Date() })
      await recordAudit(em, { category: 'SETTINGS', action: 'INSURANCE_POLICY_UPDATED', entityType: 'insurance_policy', entityId: String(id), actorUserId: user.sub,
        summary: `تعديل وثيقة التأمين: ${checked.fields.name}`, before: { ...before, isActive: flag(policy.isActive) }, after: { ...checked.fields, isActive } })
    })
    return this.overview(user)
  }

  /** فئة جديدة أو تعديل فئة — تحت قفل صف وثيقتها: الاسم فريد في الوثيقة، وافتراضية واحدة، والدرجة لفئة مفعّلة واحدة */
  private async saveClass(em: EntityManager, user: JwtPayload, policy: InsurancePolicy, existing: InsuranceClass | null, body: unknown) {
    const input = (body ?? {}) as Record<string, unknown>
    if (input.isActive !== undefined && typeof input.isActive !== 'boolean') throw new BadRequestException('«مفعّلة» نعم أو لا')
    const repo = em.getRepository(InsuranceClass), links = em.getRepository(InsuranceClassGrade)
    const currentGrades = existing ? (await links.find({ where: { classId: existing.id } })).map(row => row.gradeId) : []
    const base = existing ? { name: existing.name, employeeShareMonthly: Number(existing.employeeShareMonthly), isDefault: flag(existing.isDefault), gradeIds: currentGrades } : {}
    const checked = classFields({ ...base, ...Object.fromEntries(Object.entries(input).filter(([key, value]) => key !== 'isActive' && value !== undefined)) })
    if (checked.fields === null) throw new BadRequestException(checked.error)
    const fields = checked.fields, isActive = input.isActive === undefined ? (existing ? flag(existing.isActive) : true) : input.isActive as boolean
    const siblings = (await repo.find({ where: { policyId: policy.id } })).filter(row => row.id !== existing?.id)
    if (siblings.some(row => row.name === fields.name)) throw new BadRequestException(CLASS_NAME_TAKEN)
    if (fields.gradeIds.length) {
      const known: Array<{ id: number }> = await em.query(`SELECT [id] FROM [grades] WHERE [id] IN (${fields.gradeIds.map((_, index) => `@${index}`).join(', ')})`, fields.gradeIds)
      if (known.length !== fields.gradeIds.length) throw new BadRequestException(GRADE_UNKNOWN)
      const active = siblings.filter(row => flag(row.isActive)).map(row => row.id)
      if (isActive && active.length && await links.count({ where: { classId: In(active), gradeId: In(fields.gradeIds) } })) throw new BadRequestException(GRADE_TAKEN)
    }
    // الافتراضية واحدة: الجديدة بتشيلها من غيرها
    if (fields.isDefault && siblings.some(row => flag(row.isDefault))) await repo.update({ policyId: policy.id, isDefault: true }, { isDefault: false })
    const values = { name: fields.name, employeeShareMonthly: fields.employeeShareMonthly, isDefault: fields.isDefault, isActive, updatedByUserId: user.sub, updatedAt: new Date() }
    const classId = existing ? existing.id : Number((await repo.insert({ policyId: policy.id, ...values })).identifiers[0].id)
    if (existing) await repo.update({ id: existing.id }, values)
    const add = fields.gradeIds.filter(id => !currentGrades.includes(id)), remove = currentGrades.filter(id => !fields.gradeIds.includes(id))
    if (remove.length) await links.delete({ classId, gradeId: In(remove) })
    if (add.length) await links.insert(add.map(gradeId => ({ classId, gradeId })))
    await recordAudit(em, { category: 'SETTINGS', action: existing ? 'INSURANCE_CLASS_UPDATED' : 'INSURANCE_CLASS_CREATED', entityType: 'insurance_class', entityId: String(classId), actorUserId: user.sub,
      summary: `${existing ? 'تعديل' : 'إضافة'} فئة تأمين «${fields.name}» في وثيقة ${policy.name}`,
      before: existing ? { ...base, isActive: flag(existing.isActive) } : undefined, after: { ...fields, isActive } })
  }

  async createClass(user: JwtPayload, policyId: number, body: unknown) {
    assertCompanyWideWrite(user)
    await this.ds.transaction(async em => {
      await this.assertReady(em)
      await this.saveClass(em, user, await this.lockPolicy(em, policyId), null, body)
    })
    return this.overview(user)
  }

  async updateClass(user: JwtPayload, classId: number, body: unknown) {
    assertCompanyWideWrite(user)
    await this.ds.transaction(async em => {
      await this.assertReady(em)
      const found = await em.getRepository(InsuranceClass).findOneBy({ id: classId })
      if (!found) throw new NotFoundException(CLASS_NOT_FOUND)
      // الوثيقة الأول (نفس ترتيب الإضافة)، وبعدها الفئة بتتقري تاني تحت القفل
      const policy = await this.lockPolicy(em, found.policyId)
      const existing = await em.getRepository(InsuranceClass).findOneBy({ id: classId })
      if (!existing) throw new NotFoundException(CLASS_NOT_FOUND)
      await this.saveClass(em, user, policy, existing, body)
    })
    return this.overview(user)
  }

  /** تقرير الأهلية: كل موظف نشط في نطاق الحساب بوثيقة دولة فرعه وفئة درجته (قراءة بس) */
  async eligibility(user: JwtPayload) {
    const em = this.ds.manager
    await this.assertReady(em)
    const scope = branchScopeOf(user), today = localDateOf(new Date())
    const policies = await em.getRepository(InsurancePolicy).find()
    const classRows = await em.getRepository(InsuranceClass).find()
    const links = classRows.length ? await em.getRepository(InsuranceClassGrade).find({ where: { classId: In(classRows.map(row => row.id)) } }) : []
    const classes = classRows.map(row => ({ id: row.id, policyId: row.policyId, name: row.name, isDefault: flag(row.isDefault), isActive: flag(row.isActive),
      gradeIds: links.filter(link => link.classId === row.id).map(link => link.gradeId) }))
    const people: Array<{ id: number; fullName: string; employeeCode: string | null; branchId: number | null; gradeId: number | null; gradeName: string | null; country: string | null }> = await em.query(
      `SELECT e.[id], e.[fullName], e.[employeeCode], e.[branchId], e.[gradeId], g.[name] AS [gradeName], b.[country]
       FROM [employees] e LEFT JOIN [grades] g ON g.[id] = e.[gradeId] LEFT JOIN [branches] b ON b.[id] = e.[branchId] WHERE ${ACTIVE} ORDER BY e.[fullName], e.[id]`)
    const rows = people.filter(row => inBranchScope(scope, row.branchId == null ? null : Number(row.branchId))).map(row => {
      const coverage = eligibleCoverage({ country: row.country, gradeId: row.gradeId == null ? null : Number(row.gradeId) }, policies, classes, today)
      return { employeeId: Number(row.id), fullName: row.fullName, employeeCode: row.employeeCode ?? null, gradeName: row.gradeName ?? null,
        policyId: coverage?.policy.id ?? null, policyName: coverage?.policy.name ?? null, classId: coverage?.insuranceClass?.id ?? null, className: coverage?.insuranceClass?.name ?? null, by: coverage?.by ?? null }
    })
    return { today, rows, withoutPolicy: rows.filter(row => row.policyId === null).length, withoutClass: rows.filter(row => row.policyId !== null && row.classId === null).length }
  }
}
