import { EntityManager, In, LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm'
import { EmployeeSuspension } from './employee-suspension.entity'
import { dateOnly, suspendedDatesInRange, suspensionPayrollDays, suspensionState } from './employee-suspension-rules'

// قراءات الإيقاف عن العمل المشتركة (ملف الموظف، تجسيد الغياب، المسير).
// قبل تطبيق ترحيل 20260916_044 الجدول غير موجود: القراءة ترجع فاضية بدل ما تُسقط الحضور أو المسير.
let tableReady = false
export async function suspensionTableReady(em: EntityManager): Promise<boolean> {
  // تطبيق جزئي (اختبار بوحدات محددة) بلا كيان الإيقاف = لا إيقافات
  if (!em.connection.hasMetadata(EmployeeSuspension)) return false
  if (tableReady) return true
  const rows = await em.query(`SELECT OBJECT_ID(N'dbo.employee_suspensions', N'U') AS objectId`)
  tableReady = rows?.[0]?.objectId != null
  return tableReady
}

const normalize = (row: EmployeeSuspension): EmployeeSuspension =>
  Object.assign(row, { fromDate: dateOnly(row.fromDate), toDate: dateOnly(row.toDate), plannedToDate: dateOnly(row.plannedToDate) })

/** إيقافات موظف (أو موظفين) غير الملغاة المتقاطعة مع المدى — أو كل سجله بلا مدى. */
export async function readEmployeeSuspensions(em: EntityManager, employeeIds: number | number[],
  range?: { from: string; to: string }, options: { includeCancelled?: boolean } = {}): Promise<EmployeeSuspension[]> {
  const ids = Array.isArray(employeeIds) ? employeeIds : [employeeIds]
  if (!ids.length || !(await suspensionTableReady(em))) return []
  const rows = await em.getRepository(EmployeeSuspension).find({
    where: {
      employeeId: ids.length === 1 ? ids[0] : In(ids),
      ...(options.includeCancelled ? {} : { status: Not('CANCELLED') }),
      ...(range ? { fromDate: LessThanOrEqual(range.to), toDate: MoreThanOrEqual(range.from) } : {}),
    },
    order: { fromDate: 'DESC', id: 'DESC' },
  })
  return rows.map(normalize)
}

/** الإيقافات السارية أو القادمة (من اليوم فصاعدًا) لكل الموظفين — لقائمة الموظفين باستعلام واحد. */
export async function readOpenSuspensions(em: EntityManager, today: string): Promise<Map<number, EmployeeSuspension[]>> {
  const byEmployee = new Map<number, EmployeeSuspension[]>()
  if (!(await suspensionTableReady(em))) return byEmployee
  const rows = await em.getRepository(EmployeeSuspension).find({ where: { status: Not('CANCELLED'), toDate: MoreThanOrEqual(today) } })
  for (const row of rows.map(normalize)) {
    const list = byEmployee.get(row.employeeId)
    if (list) list.push(row)
    else byEmployee.set(row.employeeId, [row])
  }
  return byEmployee
}

/** أيام الإيقاف داخل المدى — تجسيد الغياب يتخطاها (مش غياب). */
export async function suspendedDatesBetween(em: EntityManager, employeeId: number, from: string, to: string): Promise<Set<string>> {
  if (from > to) return new Set()
  return new Set(suspendedDatesInRange(await readEmployeeSuspensions(em, employeeId, { from, to }), from, to))
}

/** أيام الإيقاف المخصومة في فترة المسير (بلا ازدواج مع الإجازة بدون راتب في نفس اليوم). */
export async function readSuspensionPayrollDays(em: EntityManager, employeeId: number, from: string, to: string,
  unpaidLeaves: ReadonlyArray<{ fromDate: string; toDate: string; period?: string | null }>, leaveDeductible: (date: string) => boolean) {
  return suspensionPayrollDays(await readEmployeeSuspensions(em, employeeId, { from, to }), from, to, unpaidLeaves, leaveDeductible)
}

export function suspensionView(row: EmployeeSuspension, today: string) {
  return {
    id: row.id, employeeId: row.employeeId, fromDate: dateOnly(row.fromDate), toDate: dateOnly(row.toDate),
    plannedToDate: dateOnly(row.plannedToDate), reason: row.reason, status: row.status, state: suspensionState(row, today),
    endReason: row.endReason ?? null, endedAt: row.endedAt ?? null, endedByUserId: row.endedByUserId ?? null,
    createdByUserId: row.createdByUserId ?? null, createdAt: row.createdAt,
  }
}
export type EmployeeSuspensionView = ReturnType<typeof suspensionView>
