import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import {
  DEPENDENTS_MIGRATION_MISSING, DEPENDENTS_PERMISSION, DEPENDENT_EMPLOYEE, Dependent, activeDependents, addDependent, cleanDependentValues, cleanRemoveReason, dependentViews, dependentsReady, removeDependent,
  updateDependent, type DependentActor, type DependentInput,
} from './dependent-rules'

// B3.14: سجل المعالين. الموظف بيشوف معالينه بس (والتغيير بطلب «تحديث المعالين»). صاحب الصلاحية بيقرا ويضيف ويعدّل ويحذف لموظف في نطاق
// فروعه بفرعه الحالي — وإلا «غير موجود» — والحكم بيتعاد تحت قفل صف الموظف (في عمليات السجل).
@Injectable()
export class DependentsService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private assertManager(user: JwtPayload) {
    if (!userHasPerm(user, DEPENDENTS_PERMISSION)) throw new ForbiddenException('الإجراء ده لصاحب صلاحية إدارة سجل المعالين')
  }
  private async assertReady(em: EntityManager) {
    if (!(await dependentsReady(em))) throw new BadRequestException(DEPENDENTS_MIGRATION_MISSING)
  }
  private actor(user: JwtPayload): DependentActor {
    const scope = branchScopeOf(user)
    return { userId: user.sub, allow: (employee) => inBranchScope(scope, employee.branchId) }
  }
  private async one(id: number) {
    const em = this.ds.manager
    const row = await em.getRepository(Dependent).findOneOrFail({ where: { id } })
    return (await dependentViews(em, [row]))[0]
  }

  /** «معاليني»: معالين صاحب الحساب الساريين */
  async mine(user: JwtPayload) {
    const em = this.ds.manager
    if (!user.employeeId || !(await dependentsReady(em))) return { available: false, dependents: [] }
    return { available: true, dependents: await dependentViews(em, await activeDependents(em, user.employeeId)) }
  }

  /** معالين موظف لصاحب الصلاحية — الموظف بفرعه الحالي في نطاقه، وإلا «غير موجود» */
  async list(user: JwtPayload, employeeId: number) {
    this.assertManager(user)
    const em = this.ds.manager
    if (!(await dependentsReady(em))) return { available: false, message: DEPENDENTS_MIGRATION_MISSING, dependents: [] }
    const employee = Number.isSafeInteger(employeeId) && employeeId > 0 ? await em.getRepository(Employee).findOne({ where: { id: employeeId } }) : null
    if (!employee || !inBranchScope(branchScopeOf(user), employee.branchId)) throw new NotFoundException(DEPENDENT_EMPLOYEE)
    return { available: true, dependents: await dependentViews(em, await activeDependents(em, employee.id)) }
  }

  async add(user: JwtPayload, input: DependentInput & { employeeId?: unknown }) {
    this.assertManager(user)
    if (typeof input.employeeId !== 'number' || !Number.isSafeInteger(input.employeeId) || input.employeeId < 1) throw new NotFoundException(DEPENDENT_EMPLOYEE)
    const employeeId = input.employeeId, values = cleanDependentValues(input, true, localDateOf(new Date()))
    const id = await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      return addDependent(em, employeeId, values, this.actor(user))
    })
    return this.one(id)
  }

  async update(user: JwtPayload, id: number, input: DependentInput) {
    this.assertManager(user)
    const values = cleanDependentValues(input, false, localDateOf(new Date()))
    await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      await updateDependent(em, id, values, this.actor(user))
    })
    return this.one(id)
  }

  async remove(user: JwtPayload, id: number, rawReason: unknown) {
    this.assertManager(user)
    const reason = cleanRemoveReason(rawReason)
    await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      await removeDependent(em, id, reason, this.actor(user))
    })
    return { removed: true }
  }
}
