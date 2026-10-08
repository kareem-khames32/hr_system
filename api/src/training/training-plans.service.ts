import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { TrainingCourse, TrainingEnrollment, TrainingSession } from './training.entities'
import { TrainingPlan, TrainingRequirement } from './training-plan.entities'
import { TRAINING_COURSE_NOT_FOUND, TRAINING_PERMISSION, TRAINING_SEAT_STATUSES, cleanTrainingCost, trainingReady } from './training-rules'

// B3.9-ج: ميزانية تدريب الأقسام وتقرير التكلفة مقابلها، والتدريب الإلزامي (لمسمى أو قسم) والناقص منه — لإدارة التدريب بنطاق الفروع،
// والمدير المباشر شايف الناقص عند فريقه. الأرقام للتقرير بس: مفيش قيد مالي.

export const TRAINING_PLANS_MIGRATION_MISSING = 'خطة التدريب محتاجة ترحيلي 20261009_120 و20261009_121 على قاعدة البيانات'
export const TRAINING_YEAR = 'السنة من 2000 لـ2100'
export const TRAINING_BUDGET = 'الميزانية: رقم من 0 (بكسرين عشريين بالكتير)'
export const TRAINING_DEPARTMENT_NOT_FOUND = 'القسم غير موجود'
export const TRAINING_REQUIREMENT_TARGET = 'التدريب الإلزامي لمسمى وظيفي (2–200 حرف) أو لقسم — واحد على الأقل'
export const TRAINING_REQUIREMENT_COMPANY = 'الإلزام بالمسمى على مستوى الشركة — لحساب من غير قيد فروع'
export const TRAINING_REQUIREMENT_EXISTS = 'الإلزام ده موجود قبل كده'
export const TRAINING_REQUIREMENT_NOT_FOUND = 'الإلزام غير موجود'
const ENDED = ['terminated', 'archived']
const day = (value: unknown): string => String(value).slice(0, 10)
const title = (value: unknown): string => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '')

let ready: boolean | null = null
/** جدولي ترحيلي 120 و121 موجودين؟ الموجود بيتحفظ */
export async function trainingPlansReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  if (!(await trainingReady(em))) return false
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.training_plans', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.training_requirements', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetTrainingPlansCache() { ready = null }

export function cleanTrainingYear(raw: unknown): number {
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d{4}$/.test(raw) ? Number(raw) : NaN
  if (!Number.isInteger(value) || value < 2000 || value > 2100) throw new BadRequestException(TRAINING_YEAR)
  return value
}

@Injectable()
export class TrainingPlansService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private assertManager(user: JwtPayload) {
    if (!userHasPerm(user, TRAINING_PERMISSION)) throw new ForbiddenException('الإجراء ده لصاحب صلاحية إدارة التدريب')
  }
  private async assertReady(em: EntityManager) {
    if (!(await trainingPlansReady(em))) throw new BadRequestException(TRAINING_PLANS_MIGRATION_MISSING)
  }

  /**
   * تقرير سنة: لكل قسم في نطاق الحساب — ميزانيته، والتكلفة الفعلية (تكلفة مقعد كل تسجيل حاجز مكان لموظفين القسم دلوقتي، في جلسات السنة اللي
   * مااتلغتش)، والباقي. الموظف اللي من غير قسم بيتجمع في صف «من غير قسم».
   */
  async budget(user: JwtPayload, rawYear: unknown) {
    this.assertManager(user)
    const year = cleanTrainingYear(rawYear ?? new Date().getFullYear())
    const em = this.ds.manager
    if (!(await trainingPlansReady(em))) return { available: false, message: TRAINING_PLANS_MIGRATION_MISSING, year, rows: [], totals: { budget: '0.00', spent: '0.00', remaining: '0.00', seats: 0 } }
    const scope = branchScopeOf(user)
    const departments = (await em.getRepository(Department).find({ order: { name: 'ASC' } })).filter((row) => inBranchScope(scope, row.branchId))
    const branches = new Map((await em.getRepository(Branch).find()).map((row) => [row.id, row.name]))
    const plans = new Map((await em.getRepository(TrainingPlan).find({ where: { year } })).map((row) => [row.departmentId, Number(row.budget)]))
    const sessions = (await em.getRepository(TrainingSession).find()).filter((row) => row.status !== 'CANCELLED' && day(row.startDate).startsWith(`${year}-`) && row.costPerSeat != null)
    const cost = new Map(sessions.map((row) => [row.id, Number(row.costPerSeat)]))
    const enrollments = sessions.length ? await em.getRepository(TrainingEnrollment).find({ where: { sessionId: In(sessions.map((row) => row.id)), status: In(TRAINING_SEAT_STATUSES) } }) : []
    const people = new Map((enrollments.length ? await em.getRepository(Employee).find({ where: { id: In([...new Set(enrollments.map((row) => row.employeeId))]) } }) : []).map((row) => [row.id, row]))
    const spent = new Map<number, { amount: number; seats: number }>()
    for (const row of enrollments) {
      const employee = people.get(row.employeeId)
      if (!employee || !inBranchScope(scope, employee.branchId)) continue
      const key = employee.departmentId ?? 0, entry = spent.get(key) ?? { amount: 0, seats: 0 }
      entry.amount += cost.get(row.sessionId) ?? 0; entry.seats += 1
      spent.set(key, entry)
    }
    const money = (value: number): string => (Math.round(value * 100) / 100).toFixed(2)
    const rows = departments.map((row) => {
      const budget = plans.get(row.id) ?? 0, used = spent.get(row.id) ?? { amount: 0, seats: 0 }
      return { departmentId: row.id, departmentName: row.name, branchName: branches.get(row.branchId) ?? null, hasBudget: plans.has(row.id), budget: money(budget), spent: money(used.amount), remaining: money(budget - used.amount),
        seats: used.seats, over: used.amount > budget && plans.has(row.id) }
    })
    const loose = spent.get(0)
    if (loose) rows.push({ departmentId: 0, departmentName: 'من غير قسم', branchName: null, hasBudget: false, budget: money(0), spent: money(loose.amount), remaining: money(-loose.amount), seats: loose.seats, over: false })
    const sum = (pick: (row: (typeof rows)[number]) => number) => rows.reduce((total, row) => total + pick(row), 0)
    return { available: true, year, rows, totals: { budget: money(sum((row) => Number(row.budget))), spent: money(sum((row) => Number(row.spent))), remaining: money(sum((row) => Number(row.budget) - Number(row.spent))), seats: sum((row) => row.seats) } }
  }

  /** ميزانية قسم لسنة — القسم في نطاق الحساب وإلا «غير موجود»؛ صف واحد لكل قسم وسنة (تحت قفل مدى) */
  async setBudget(user: JwtPayload, input: { year?: unknown; departmentId?: unknown; budget?: unknown }) {
    this.assertManager(user)
    const year = cleanTrainingYear(input.year)
    let budget: string | null
    try { budget = cleanTrainingCost(input.budget) } catch { throw new BadRequestException(TRAINING_BUDGET) }
    if (budget === null) throw new BadRequestException(TRAINING_BUDGET)
    await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const department = typeof input.departmentId === 'number' && Number.isSafeInteger(input.departmentId) ? await em.getRepository(Department).findOne({ where: { id: input.departmentId } }) : null
      if (!department || !inBranchScope(branchScopeOf(user), department.branchId)) throw new NotFoundException(TRAINING_DEPARTMENT_NOT_FOUND)
      const [existing]: Array<{ id: number; budget: unknown }> = await em.query('SELECT [id], [budget] FROM [training_plans] WITH (UPDLOCK, HOLDLOCK) WHERE [year] = @0 AND [departmentId] = @1', [year, department.id])
      const now = new Date()
      if (existing) await em.getRepository(TrainingPlan).update({ id: existing.id }, { budget, updatedByUserId: user.sub, updatedAt: now })
      else await em.getRepository(TrainingPlan).insert({ year, departmentId: department.id, budget, updatedByUserId: user.sub, updatedAt: now })
      await recordAudit(em, { category: 'SETTINGS', action: 'TRAINING_BUDGET_SET', entityType: 'department', entityId: department.id, actorUserId: user.sub, branchId: department.branchId,
        summary: `ميزانية تدريب «${department.name}» لسنة ${year}: ${budget}`, ...(existing ? { before: { budget: Number(existing.budget).toFixed(2) } } : {}), after: { year, budget } })
    })
    return this.budget(user, year)
  }

  // ===== التدريب الإلزامي =====

  /** الإلزام في نطاق الحساب: بقسم في نطاقه؛ والإلزام بالمسمى بس (كل الشركة) بيتقري للكل وبيتعدّل من حساب من غير قيد فروع */
  private async requirementRows(em: EntityManager, user: JwtPayload) {
    const scope = branchScopeOf(user)
    const rows = await em.getRepository(TrainingRequirement).find({ order: { id: 'ASC' } })
    const departmentIds = [...new Set(rows.map((row) => row.departmentId).filter((id): id is number => id != null))]
    const departments = new Map((departmentIds.length ? await em.getRepository(Department).find({ where: { id: In(departmentIds) } }) : []).map((row) => [row.id, row]))
    const visible = rows.filter((row) => row.departmentId == null || inBranchScope(scope, departments.get(row.departmentId)?.branchId ?? null))
    const courses = new Map((visible.length ? await em.getRepository(TrainingCourse).find({ where: { id: In([...new Set(visible.map((row) => row.courseId))]) } }) : []).map((row) => [row.id, row.name]))
    return { scope, visible, departments, courses }
  }

  async requirements(user: JwtPayload) {
    this.assertManager(user)
    const em = this.ds.manager
    if (!(await trainingPlansReady(em))) return { available: false, message: TRAINING_PLANS_MIGRATION_MISSING, canCompany: false, requirements: [], missing: [] }
    const { scope, visible, departments, courses } = await this.requirementRows(em, user)
    return { available: true, canCompany: scope === null, requirements: visible.map((row) => ({ id: row.id, courseId: row.courseId, courseName: courses.get(row.courseId) ?? '—', jobTitle: row.jobTitle ?? null,
      departmentId: row.departmentId ?? null, departmentName: row.departmentId != null ? departments.get(row.departmentId)?.name ?? null : null, canRemove: row.departmentId != null || scope === null })),
    missing: await this.missing(em, user, visible, courses, (employee) => inBranchScope(scope, employee.branchId)) }
  }

  /** الناقص: موظف شغال مطابق لإلزام ومالوش تسجيل «أكمل» في دورته */
  private async missing(em: EntityManager, user: JwtPayload, requirements: TrainingRequirement[], courses: Map<number, string>, allowed: (employee: Employee) => boolean) {
    if (!requirements.length) return []
    const people = (await em.getRepository(Employee).find({ where: { isActive: true }, order: { fullName: 'ASC' } })).filter((row) => !ENDED.includes(row.status) && allowed(row))
    if (!people.length) return []
    const sessions = await em.getRepository(TrainingSession).find({ where: { courseId: In([...new Set(requirements.map((row) => row.courseId))]) } })
    const courseOf = new Map(sessions.map((row) => [row.id, row.courseId]))
    // تسجيل لسه مفتوح في جلسة اتلغت مش «مسجّل»
    const cancelled = new Set(sessions.filter((row) => row.status === 'CANCELLED').map((row) => row.id))
    const enrollments = sessions.length ? await em.getRepository(TrainingEnrollment).find({ where: { sessionId: In(sessions.map((row) => row.id)), employeeId: In(people.map((row) => row.id)) } }) : []
    const state = new Map<string, 'done' | 'open'>()
    for (const row of enrollments) {
      const key = `${row.employeeId}:${courseOf.get(row.sessionId)}`
      if (row.status === 'COMPLETED') state.set(key, 'done')
      else if ((row.status === 'ENROLLED' || row.status === 'ATTENDED') && !cancelled.has(row.sessionId) && state.get(key) !== 'done') state.set(key, 'open')
    }
    const departmentIds = [...new Set(people.map((row) => row.departmentId).filter((id): id is number => id != null))]
    // Codex P3K-B09: القسم بفرعه الحالي هو: قسم اتنقل برّه نطاق الحساب مابيتسمّاش حتى لو موظفه لسه في النطاق
    const nameScope = branchScopeOf(user)
    const names = new Map((departmentIds.length ? await em.getRepository(Department).find({ where: { id: In(departmentIds) } }) : [])
      .filter((row) => inBranchScope(nameScope, row.branchId)).map((row) => [row.id, row.name]))
    const found = new Map<string, { employeeName: string; departmentName: string | null; courseName: string; enrolled: boolean }>()
    for (const requirement of requirements) {
      for (const employee of people) {
        if (requirement.departmentId != null && employee.departmentId !== requirement.departmentId) continue
        if (requirement.jobTitle && title(employee.jobTitle) !== requirement.jobTitle) continue
        const key = `${employee.id}:${requirement.courseId}`, status = state.get(key)
        if (status === 'done' || found.has(key)) continue
        found.set(key, { employeeName: employee.fullName, departmentName: employee.departmentId != null ? names.get(employee.departmentId) ?? null : null, courseName: courses.get(requirement.courseId) ?? '—', enrolled: status === 'open' })
      }
    }
    return [...found.values()]
  }

  async addRequirement(user: JwtPayload, input: { courseId?: unknown; jobTitle?: unknown; departmentId?: unknown }) {
    this.assertManager(user)
    const jobTitle = title(input.jobTitle) || null
    const wantsDepartment = input.departmentId !== undefined && input.departmentId !== null && input.departmentId !== ''
    if ((!jobTitle && !wantsDepartment) || (jobTitle !== null && (jobTitle.length < 2 || jobTitle.length > 200))) throw new BadRequestException(TRAINING_REQUIREMENT_TARGET)
    await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const course = typeof input.courseId === 'number' && Number.isSafeInteger(input.courseId) ? await em.getRepository(TrainingCourse).findOne({ where: { id: input.courseId } }) : null
      if (!course || course.isActive !== true) throw new BadRequestException(TRAINING_COURSE_NOT_FOUND)
      let departmentId: number | null = null
      if (wantsDepartment) {
        const department = typeof input.departmentId === 'number' && Number.isSafeInteger(input.departmentId) ? await em.getRepository(Department).findOne({ where: { id: input.departmentId } }) : null
        if (!department || !inBranchScope(branchScopeOf(user), department.branchId)) throw new NotFoundException(TRAINING_DEPARTMENT_NOT_FOUND)
        departmentId = department.id
      } else if (branchScopeOf(user) !== null) throw new ForbiddenException(TRAINING_REQUIREMENT_COMPANY)
      // مرة واحدة لنفس الدورة والمسمى والقسم (تحت قفل مدى على الدورة)
      const same: Array<{ jobTitle: string | null; departmentId: number | null }> = await em.query('SELECT [jobTitle], [departmentId] FROM [training_requirements] WITH (UPDLOCK, HOLDLOCK) WHERE [courseId] = @0', [course.id])
      if (same.some((row) => (row.jobTitle ?? null) === jobTitle && (row.departmentId ?? null) === departmentId)) throw new BadRequestException(TRAINING_REQUIREMENT_EXISTS)
      await em.getRepository(TrainingRequirement).insert({ courseId: course.id, jobTitle, departmentId, createdByUserId: user.sub, createdAt: new Date() })
    })
    return this.requirements(user)
  }

  async removeRequirement(user: JwtPayload, id: number) {
    this.assertManager(user)
    await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const row = await em.getRepository(TrainingRequirement).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      const department = row?.departmentId != null ? await em.getRepository(Department).findOne({ where: { id: row.departmentId } }) : null
      const scope = branchScopeOf(user)
      // إلزام قسم برّه النطاق زي اللي مش موجود؛ وإلزام الشركة بيتشال من حساب من غير قيد فروع بس
      if (!row || (row.departmentId != null && !inBranchScope(scope, department?.branchId ?? null))) throw new NotFoundException(TRAINING_REQUIREMENT_NOT_FOUND)
      if (row.departmentId == null && scope !== null) throw new ForbiddenException(TRAINING_REQUIREMENT_COMPANY)
      await em.getRepository(TrainingRequirement).delete({ id: row.id })
    })
    return this.requirements(user)
  }

  /** الناقص عند فريق المدير: مرؤوسيه المباشرين (من ملفاتهم) اللي فرعهم الحالي في نطاق حسابه */
  async teamMissing(user: JwtPayload) {
    const em = this.ds.manager
    if (!user.employeeId || !(await trainingPlansReady(em))) return { missing: [] }
    const requirements = await em.getRepository(TrainingRequirement).find({ order: { id: 'ASC' } })
    if (!requirements.length) return { missing: [] }
    const courses = new Map((await em.getRepository(TrainingCourse).find({ where: { id: In([...new Set(requirements.map((row) => row.courseId))]) } })).map((row) => [row.id, row.name]))
    const scope = branchScopeOf(user)
    return { missing: await this.missing(em, user, requirements, courses, (employee) => employee.managerEmployeeId === user.employeeId && inBranchScope(scope, employee.branchId)) }
  }
}
