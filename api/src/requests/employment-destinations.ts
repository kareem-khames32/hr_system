import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { EntityManager, In, LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm'
import { Employee } from '../employees/employee.entity'
import { User } from '../auth/user.entity'
import { Team } from '../org/entities/team.entity'
import { Department } from '../org/entities/department.entity'
import { Branch } from '../org/entities/branch.entity'
import { Shift, WorkSchedule } from '../assets/assets.entities'
import { ScheduleDayOverride, ScheduleEntry } from '../attendance/attendance.entities'
import { localDateOf, weekKeyOf } from '../attendance/attendance.service'
import { isValidYmd } from '../offboarding/eos'
import { Request } from './entities/request.entity'
import { RequestType } from './entities/request-type.entity'
import { EmployeeStatusHistory, Transfer } from './entities/employment.entities'
import { recordEmployeeChange } from '../employees/employee-change-log'
import { CustodyAssignment } from './entities/custody.entities'
import { Leave } from './entities/leave.entities'
import { DATA_PLACEHOLDER_REJECTED, isDataPlaceholder } from '../common/data-placeholders'

const openCustodyStatuses = ['PENDING_ACK', 'PENDING_MANAGER_CONFIRM', 'ACTIVE', 'RETURN_REQUESTED']
export const EMPLOYMENT_PAYLOAD_KEYS: Record<string, string[]> = {
  employee_update: ['toTitle', 'effectiveDate'],
  employee_update_promotions: ['toTitle', 'effectiveDate', 'employeeId'],
  transfers_effective_date: ['employeeId', 'toTeamId', 'effectiveDate'],
  contracts_register: ['contractType', 'contractStart', 'contractEnd', 'contractNumber', 'effectiveDate'],
  shift_schedule: ['date', 'withEmployeeId', 'withDate'],
}
export const SCHEDULED_EMPLOYMENT_HANDLERS = ['employee_update', 'employee_update_promotions', 'contracts_register']
const exactTypes: Record<string, string[]> = {
  employee_update: ['TITLE_CHANGE'],
  contracts_register: ['CONTRACT_RENEWAL', 'CONTRACT_TYPE_CHANGE'],
  shift_schedule: ['SHIFT_SWAP'],
}
export const supportsEmploymentType = (type: Pick<RequestType, 'code' | 'destinationHandler'>) =>
  !exactTypes[type.destinationHandler] || exactTypes[type.destinationHandler].includes(type.code)

export const assertRequestDate = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !isValidYmd(value)) {
    throw new BadRequestException(`${label} مطلوب بصيغة YYYY-MM-DD وتاريخ تقويمي صحيح`)
  }
  return value
}
export const assertEmployeeId = (value: unknown, label = 'الموظف'): number => {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id <= 0 || typeof value === 'boolean') {
    throw new BadRequestException(`${label} مطلوب — رقم صحيح موجب`)
  }
  return id
}

export function assertEmploymentValues(type: Pick<RequestType, 'code' | 'destinationHandler'>, p: Record<string, any>) {
  if (!EMPLOYMENT_PAYLOAD_KEYS[type.destinationHandler]) return
  if (!supportsEmploymentType(type)) throw new BadRequestException('وجهة التنفيذ غير متوافقة مع نوع الطلب')
  if (p.employeeId != null) assertEmployeeId(p.employeeId)
  if (p.effectiveDate != null && p.effectiveDate !== '') assertRequestDate(p.effectiveDate, 'تاريخ السريان')
  if (type.destinationHandler === 'transfers_effective_date') {
    assertRequestDate(p.effectiveDate, 'تاريخ السريان')
    assertEmployeeId(p.toTeamId, 'الفريق الجديد')
  }
  if (type.destinationHandler === 'employee_update' || type.destinationHandler === 'employee_update_promotions') {
    if (typeof p.toTitle !== 'string' || p.toTitle.trim().length < 2 || p.toTitle.trim().length > 100 || /[<>\x00-\x1f]/.test(p.toTitle)) {
      throw new BadRequestException('المسمى الوظيفي الجديد غير صالح — من 2 إلى 100 حرف بدون < أو >')
    }
    // الخطوة 9 (مسار R2): القيمة المؤقتة تُرفض عند التقديم لا بعد الاعتماد (كان التنفيذ وحده يرفضها فيعلق الطلب)
    if (isDataPlaceholder(p.toTitle)) throw new BadRequestException(DATA_PLACEHOLDER_REJECTED)
  }
  if (type.destinationHandler === 'shift_schedule') {
    assertRequestDate(p.date, 'تاريخ الوردية')
    assertEmployeeId(p.withEmployeeId, 'الموظف الآخر')
    if (p.withDate != null && p.withDate !== '') assertRequestDate(p.withDate, 'تاريخ وردية الموظف الآخر')
  }
  if (type.destinationHandler === 'contracts_register') {
    if (type.code === 'CONTRACT_RENEWAL') {
      assertRequestDate(p.contractStart, 'بداية العقد الجديد')
      assertRequestDate(p.contractEnd, 'نهاية العقد الجديد')
      if (p.effectiveDate && p.effectiveDate !== p.contractStart) throw new BadRequestException('تاريخ سريان التجديد هو بداية العقد الجديد')
    }
    if (type.code === 'CONTRACT_TYPE_CHANGE' && !['permanent', 'fixed_term', 'part_time', 'seasonal'].includes(p.contractType)) {
      throw new BadRequestException('نوع العقد مطلوب: permanent/fixed_term/part_time/seasonal')
    }
    if (p.contractType != null && !['permanent', 'fixed_term', 'part_time', 'seasonal'].includes(p.contractType)) {
      throw new BadRequestException('نوع العقد غير صالح')
    }
    for (const key of ['contractStart', 'contractEnd']) {
      if (p[key] != null && p[key] !== '') assertRequestDate(p[key], key === 'contractStart' ? 'بداية العقد' : 'نهاية العقد')
    }
    if (p.contractStart && p.contractEnd && p.contractEnd <= p.contractStart) throw new BadRequestException('نهاية العقد يجب أن تكون بعد بدايته')
    if (p.contractType === 'permanent' && p.contractEnd) throw new BadRequestException('العقد غير محدد المدة ليس له تاريخ انتهاء')
    if (p.contractNumber != null && (typeof p.contractNumber !== 'string' || p.contractNumber.trim().length > 60 || /[<>\x00-\x1f]/.test(p.contractNumber))) {
      throw new BadRequestException('رقم العقد غير صالح — 60 حرفاً بحد أقصى')
    }
  }
}

export function employmentEffectiveDate(type: Pick<RequestType, 'code' | 'destinationHandler'>, p: Record<string, any>) {
  return String(p.effectiveDate || (type.destinationHandler === 'contracts_register' ? p.contractStart : '') || localDateOf(new Date()))
}

/** All writes use the caller's transaction. Lock employee rows in ID order for two-party actions. */
export async function employmentEmployee(em: EntityManager, req: Request, lock = false): Promise<Employee> {
  const id = assertEmployeeId(req.requesterId)
  const emp = await em.getRepository(Employee).findOne({ where: { id }, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) })
  if (!emp) throw new BadRequestException('الموظف المستهدف غير موجود')
  if (!emp.isActive || ['terminated', 'archived'].includes(emp.status)) throw new BadRequestException('الموظف المستهدف غير نشط')
  if (req.branchId != null && emp.branchId !== req.branchId) throw new ForbiddenException('فرع الموظف تغير — أعد تقديم الطلب من فرعه الحالي')
  return emp
}

async function assertNoPendingEmployment(em: EntityManager, req: Request, handlers: string[]) {
  const types = await em.getRepository(RequestType).find({ where: { destinationHandler: In(handlers) } })
  if (!types.length) return
  const existing = await em.getRepository(Request).findOne({ where: {
    requesterId: req.requesterId, id: Not(req.id), typeCode: In(types.map(t => t.code)), status: 'IN_EXECUTION',
  } })
  if (existing) throw new BadRequestException(`يوجد طلب مجدول للموظف بالفعل (#${existing.id})`)
}

export async function validateTransfer(em: EntityManager, req: Request, p: Record<string, any>, lock = false, currentTransferId?: number) {
  const emp = await employmentEmployee(em, req, lock)
  if (p.employeeId != null && Number(p.employeeId) !== emp.id) throw new BadRequestException('الموظف المستهدف يجب أن يكون صاحب الطلب — استخدم التقديم نيابة عن الغير')
  const team = await em.getRepository(Team).findOne({ where: { id: assertEmployeeId(p.toTeamId, 'الفريق الجديد'), isActive: true } })
  const department = team && await em.getRepository(Department).findOne({ where: { id: team.departmentId, isActive: true } })
  const branch = department && await em.getRepository(Branch).findOne({ where: { id: department.branchId, isActive: true } })
  if (!team || !department || !branch) throw new BadRequestException('الفريق الجديد أو قسمه أو فرعه غير موجود أو غير نشط')
  if (team.id === emp.teamId) throw new BadRequestException('الموظف مسند بالفعل إلى الفريق المختار')
  if (department.branchId !== emp.branchId) {
    const creator = req.createdByUserId && await em.getRepository(User).findOne({ where: { id: req.createdByUserId, isActive: true } })
    if (!creator || creator.role !== 'super_admin') throw new ForbiddenException('النقل إلى فرع آخر متاح لمدير النظام فقط')
  }
  const custody = await em.getRepository(CustodyAssignment).count({ where: { employeeId: emp.id, status: In(openCustodyStatuses) } })
  if (custody) throw new BadRequestException(`على الموظف ${custody} عهدة مفتوحة — يجب إرجاعها أو نقلها قبل النقل`)
  const transfers = await em.getRepository(Transfer).find({ where: [
    { employeeId: emp.id, status: 'SCHEDULED' },
    { employeeId: emp.id, effectiveDate: p.effectiveDate, status: 'EXECUTED' },
  ] })
  const duplicate = transfers.find(t => t.id !== currentTransferId && (!req.id || t.requestId !== req.id))
  if (duplicate) throw new BadRequestException('يوجد نقل مجدول للموظف أو نقل نُفّذ بالفعل في تاريخ السريان')
  const managerId = team.leaderEmployeeId && team.leaderEmployeeId !== emp.id ? team.leaderEmployeeId
    : department.managerEmployeeId && department.managerEmployeeId !== emp.id ? department.managerEmployeeId : null
  if (managerId) {
    const manager = await em.getRepository(Employee).findOne({ where: { id: managerId, isActive: true, branchId: department.branchId } })
    if (!manager) throw new BadRequestException('مدير الفريق أو القسم غير نشط أو خارج فرع الفريق الجديد')
  }
  return { emp, team, department, managerId }
}

export async function validateEmploymentRequest(em: EntityManager, req: Request, type: RequestType, lock = false) {
  if (!EMPLOYMENT_PAYLOAD_KEYS[type.destinationHandler]) return
  const p = JSON.parse(req.payload || '{}')
  assertEmploymentValues(type, p)
  if (type.destinationHandler === 'shift_schedule') return validateSwap(em, req, p, lock)
  if (type.destinationHandler === 'transfers_effective_date') return validateTransfer(em, req, p, lock)
  const emp = await employmentEmployee(em, req, lock)
  if (p.employeeId != null && Number(p.employeeId) !== emp.id) throw new BadRequestException('الموظف المستهدف يجب أن يكون صاحب الطلب — استخدم التقديم نيابة عن الغير')
  if (type.destinationHandler === 'employee_update' || type.destinationHandler === 'employee_update_promotions') {
    if (emp.jobTitle === p.toTitle.trim()) throw new BadRequestException('لم يتغير المسمى الوظيفي')
    await assertNoPendingEmployment(em, req, ['employee_update', 'employee_update_promotions'])
  } else if (type.destinationHandler === 'contracts_register') {
    contractChanges(emp, type, p)
    await assertNoPendingEmployment(em, req, ['contracts_register'])
  }
}

function contractChanges(emp: Employee, type: RequestType, p: Record<string, any>): Partial<Employee> {
  const renewal = type.code === 'CONTRACT_RENEWAL'
  const contractType = renewal ? emp.contractType : p.contractType
  if (renewal && p.contractType && p.contractType !== emp.contractType) throw new BadRequestException('تغيير نوع العقد له طلب مستقل')
  if (!['permanent', 'fixed_term', 'part_time', 'seasonal'].includes(contractType)) throw new BadRequestException('نوع العقد الحالي غير محدد — استخدم طلب تغيير نوع العقد أولاً')
  if (renewal && (emp.contractType === 'permanent' || !emp.contractEnd)) throw new BadRequestException('التجديد يتطلب عقداً حالياً له تاريخ انتهاء')
  if (!renewal && p.contractType === emp.contractType) throw new BadRequestException('نوع العقد الجديد مطابق للنوع الحالي')
  const start = p.contractStart || emp.contractStart || emp.joinDate
  const end = contractType === 'permanent' ? null : p.contractEnd || (renewal ? null : emp.contractEnd)
  assertRequestDate(start, 'بداية العقد')
  if (emp.joinDate && start < emp.joinDate) throw new BadRequestException('بداية العقد لا يمكن أن تسبق تاريخ الالتحاق')
  if (['fixed_term', 'seasonal'].includes(contractType) && !end) throw new BadRequestException('العقد محدد المدة أو الموسمي يتطلب تاريخ انتهاء')
  if (end && end <= start) throw new BadRequestException('نهاية العقد يجب أن تكون بعد بدايته')
  if (renewal && (start <= emp.contractEnd || end! <= emp.contractEnd)) throw new BadRequestException('العقد المجدد يجب أن يبدأ بعد انتهاء العقد الحالي')
  return { contractType, contractStart: start, contractEnd: end as any,
    contractDurationMonths: null as any,
    ...(p.contractNumber != null ? { contractNumber: p.contractNumber.trim() } : {}) }
}

export async function recordEmploymentChanges(em: EntityManager, req: Request, before: Employee, changes: Partial<Employee>, label: string) {
  for (const [field, value] of Object.entries(changes)) {
    const old = (before as any)[field]
    if ((old ?? null) === (value ?? null)) continue
    await recordEmployeeChange(em, { employeeId: before.id, requestId: req.id,
      fieldName: field, oldValue: old, newValue: value, reason: label })
  }
}

export async function executeContract(em: EntityManager, req: Request, type: RequestType, p: Record<string, any>) {
  await validateEmploymentRequest(em, req, type, true)
  const effectiveDate = employmentEffectiveDate(type, p)
  const ref = `CTR-${new Date().getFullYear()}-${String(req.id).padStart(6, '0')}`
  if (effectiveDate > localDateOf(new Date())) return { ref, completed: false, note: `مجدول للتنفيذ في ${effectiveDate}` }
  const emp = await employmentEmployee(em, req)
  const changes = contractChanges(emp, type, p)
  await recordEmploymentChanges(em, req, emp, changes, type.code === 'CONTRACT_RENEWAL' ? 'تجديد عقد معتمد' : 'تغيير نوع عقد معتمد')
  await em.getRepository(Employee).update({ id: emp.id }, changes)
  return { ref, completed: true }
}

type ShiftSnapshot = Pick<ScheduleDayOverride, 'shiftId' | 'shiftName' | 'startTime' | 'endTime'>
async function shiftSnapshot(em: EntityManager, emp: Employee, date: string): Promise<ShiftSnapshot> {
  const row = await em.getRepository(ScheduleDayOverride).findOne({ where: { employeeId: emp.id, date } })
    || await em.getRepository(ScheduleEntry).findOne({ where: { employeeId: emp.id, weekStart: weekKeyOf(date) } })
  if (row) {
    const live = row.shiftId && await em.getRepository(Shift).findOne({ where: { id: row.shiftId } })
    return { shiftId: live ? live.id : null as any, shiftName: live ? live.name : row.shiftName,
      startTime: live ? live.startTime : row.startTime, endTime: live ? live.endTime : row.endTime }
  }
  const ws = (emp.workScheduleId && await em.getRepository(WorkSchedule).findOne({ where: { id: emp.workScheduleId } }))
    || await em.getRepository(WorkSchedule).findOne({ where: { isDefault: true, isActive: true }, order: { id: 'ASC' } })
  if (!ws) throw new BadRequestException('أحد الموظفين بلا وردية أو جدول عمل في التاريخ المختار')
  return { shiftId: null as any, shiftName: ws.name, startTime: ws.startTime, endTime: ws.endTime }
}

async function validateSwap(em: EntityManager, req: Request, p: Record<string, any>, lock: boolean) {
  const otherId = assertEmployeeId(p.withEmployeeId, 'الموظف الآخر')
  if (otherId === req.requesterId) throw new BadRequestException('تبديل الوردية يتطلب موظفين مختلفين')
  const employees = new Map<number, Employee>()
  for (const id of [req.requesterId, otherId].sort((a, b) => a - b)) {
    const employee = await em.getRepository(Employee).findOne({ where: { id }, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) })
    if (!employee || !employee.isActive || ['terminated', 'archived', 'suspended'].includes(employee.status)) throw new BadRequestException('أحد موظفي تبديل الوردية غير موجود أو غير نشط')
    employees.set(id, employee)
  }
  const employee = employees.get(req.requesterId)!
  const other = employees.get(otherId)!
  if (employee.branchId !== other.branchId || (req.branchId != null && req.branchId !== employee.branchId)) throw new ForbiddenException('تبديل الوردية متاح لموظفين في نفس فرع الطلب فقط')
  const date = String(p.date)
  const withDate = String(p.withDate || p.date)
  for (const [emp, day] of [[employee, date], [other, withDate]] as const) {
    if (emp.joinDate && day < emp.joinDate) throw new BadRequestException('تاريخ الوردية يسبق التحاق الموظف')
    if (await em.getRepository(Leave).count({ where: { employeeId: emp.id, status: 'APPROVED', fromDate: LessThanOrEqual(day), toDate: MoreThanOrEqual(day) } })) {
      throw new BadRequestException('أحد الموظفين في إجازة معتمدة في تاريخ الوردية')
    }
  }
  const swaps = await em.getRepository(Request).find({ where: { id: Not(req.id), typeCode: 'SHIFT_SWAP', status: In(['UNDER_REVIEW', 'APPROVED', 'IN_EXECUTION', 'COMPLETED']), branchId: employee.branchId } })
  const targets = new Set([`${employee.id}:${date}`, `${other.id}:${withDate}`])
  for (const swap of swaps) {
    const data = JSON.parse(swap.payload || '{}')
    if (targets.has(`${swap.requesterId}:${data.date}`) || targets.has(`${Number(data.withEmployeeId)}:${data.withDate || data.date}`)) {
      throw new BadRequestException(`توجد مبادلة وردية أخرى لأحد الموظفين في التاريخ المختار (#${swap.id})`)
    }
  }
  const ownShift = await shiftSnapshot(em, employee, date)
  const otherShift = await shiftSnapshot(em, other, withDate)
  const time = /^([01]\d|2[0-3]):[0-5]\d$/
  for (const shift of [ownShift, otherShift]) {
    if (!time.test(shift.startTime) || !time.test(shift.endTime) || shift.startTime === shift.endTime) throw new BadRequestException('أوقات الوردية الحالية غير صالحة للتبديل')
  }
  if (ownShift.shiftId === otherShift.shiftId && ownShift.startTime === otherShift.startTime && ownShift.endTime === otherShift.endTime) throw new BadRequestException('الورديتان متطابقتان — لا يوجد تغيير لتنفيذه')
  return { employee, other, date, withDate, ownShift, otherShift }
}

export async function executeShiftSwap(em: EntityManager, req: Request, type: RequestType, p: Record<string, any>) {
  assertEmploymentValues(type, p)
  const swap = await validateSwap(em, req, p, true)
  for (const [employee, date, before, after] of [
    [swap.employee, swap.date, swap.ownShift, swap.otherShift],
    [swap.other, swap.withDate, swap.otherShift, swap.ownShift],
  ] as const) {
    const repo = em.getRepository(ScheduleDayOverride)
    const existing = await repo.findOne({ where: { employeeId: employee.id, date } })
    await repo.save({ ...(existing || {}), employeeId: employee.id, date, ...after })
    await recordEmployeeChange(em, { employeeId: employee.id, requestId: req.id,
      fieldName: 'shift', oldValue: before.shiftName, newValue: after.shiftName,
      reason: `تبديل وردية معتمد ${date}: ${before.startTime}-${before.endTime} → ${after.startTime}-${after.endTime}` })
  }
  return { ref: `SWP-${new Date().getFullYear()}-${String(req.id).padStart(6, '0')}`, completed: true }
}
