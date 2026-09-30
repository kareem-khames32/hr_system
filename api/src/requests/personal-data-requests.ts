// «تحديث بيانات شخصية» (PERSONAL_DATA_UPDATE، وجهته employee_record) — قرار المالك 30 سبتمبر: «تعديل الملف» من «ملفي الشخصي» بيبعت
// الطلب ده، بيمشي في سلسلة اعتماده، ويتطبق بعد الاعتماد النهائي بنفس قواعد تعديل الموارد البشرية. القايمة والقواعد الصرف في
// employees/employee-personal-data.ts (مشتركة مع الواجهة)؛ هنا اللي محتاج القاعدة: التفرد وقفله، والتطبيق مع سجل التغييرات.
import { BadRequestException, ConflictException } from '@nestjs/common'
import { isEmail } from 'class-validator'
import { EntityManager, Not, Raw } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { Employee } from '../employees/employee.entity'
import { recordEmployeeChange } from '../employees/employee-change-log'
import { identityKeySql } from '../employees/employee-input-rules'
import { isPersonalDataKey, PERSONAL_DATA_KEYS, PERSONAL_EMAIL_MESSAGE, personalDataChanges, personalDataIssue, personalDataRequestedValue,
  type PersonalDataChange } from '../employees/employee-personal-data'
import type { Request } from './entities/request.entity'

export const PERSONAL_DATA_HANDLER = 'employee_record'
export const PERSONAL_DATA_NO_CHANGE = 'لم تتغير أي بيانات في الطلب'
// كل حقل في القايمة عمود على الموظف بنفس الاسم (فحص وقت الترجمة)
export const PERSONAL_DATA_COLUMNS: ReadonlyArray<keyof Employee> = PERSONAL_DATA_KEYS
const BANK_COLUMNS = new Set(['iban', 'bankName', 'bankBranch', 'payMethod', 'bankTransferAmount'])

const parsePayload = (raw: string | null | undefined): Record<string, unknown> => {
  try {
    const value: unknown = raw ? JSON.parse(raw) : {}
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  } catch { return {} }
}

/**
 * عمود موظف برّه القايمة في الحمولة (البنك، الراتب، الفرع، الأكواد، التواريخ، بريد العمل…) = رفض برسالة بتقول الطريق الصح، حتى لو
 * المفتاح متعرّف حقل في «أنواع الطلبات» — المعالج مابيطبقوش أصلًا، فالموظف مايفتكرش إنه اتغير. employeeColumns = أعمدة الكيان.
 */
export function assertPersonalDataKeys(payload: Record<string, unknown>, employeeColumns: ReadonlySet<string>) {
  for (const key of Object.keys(payload)) {
    if (isPersonalDataKey(key) || !employeeColumns.has(key)) continue
    if (BANK_COLUMNS.has(key)) {
      throw new BadRequestException('الحساب البنكي مش بيتغير من «تحديث بيانات شخصية» — قدّم طلب «تغيير الحساب البنكي»')
    }
    throw new BadRequestException(`الطلب فيه بيانات مش بتتعدل من «تحديث بيانات شخصية» (${key}) — البيانات الوظيفية والراتب والأكواد والتواريخ بتتعدل من الموارد البشرية`)
  }
}

// نفس قفل تفرد الهوية في EmployeesService (hr:employees:identity): اعتماد الطلب وتعديل الموارد البشرية والإضافة بيستنوا بعض،
// فالتاني بيشوف الرقم اللي الأول حفظه
async function lockEmployeeIdentities(em: EntityManager) {
  if (em.connection.options.type !== 'mssql') return
  const rows = await em.query(`DECLARE @result int;
    EXEC @result = sys.sp_getapplock @Resource = 'hr:employees:identity', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 15000;
    SELECT @result AS lockResult;`)
  if (!rows.length || Number(rows[0].lockResult) < 0) {
    throw new ConflictException('بيانات الموظفين بتتحفظ دلوقتي من حد تاني؛ جرّب تاني بعد شوية')
  }
}

const sameIdentity = (value: string) => Raw(alias => `${identityKeySql(alias)} = :identity`, { identity: value })

// تفرد رقم الهوية والجواز المتغيرين على الشركة كلها بعد التطبيع — من غير اسم صاحب الرقم ولا فرعه (الموظف ماينفعش يعرف مين،
// والمعتمد بيرجّع الطلب للتصحيح)
async function assertIdentityUnique(em: EntityManager, employeeId: number, changes: ReadonlyArray<PersonalDataChange>) {
  const employees = em.getRepository(Employee)
  const nationalId = changes.find(change => change.key === 'nationalId')?.newValue
  if (nationalId && await employees.findOne({ select: { id: true }, where: { nationalId: sameIdentity(nationalId), id: Not(employeeId) } })) {
    throw new BadRequestException(`رقم الهوية / الإقامة ${nationalId} مسجل لموظف آخر — راجع الرقم`)
  }
  const passportNo = changes.find(change => change.key === 'passportNo')?.newValue
  if (passportNo && await employees.findOne({ select: { id: true }, where: { passportNo: sameIdentity(passportNo), id: Not(employeeId) } })) {
    throw new BadRequestException(`رقم الجواز ${passportNo} مسجل لموظف آخر — راجع الرقم`)
  }
}

function assertChangesValid(employee: Employee, changes: ReadonlyArray<PersonalDataChange>) {
  const issue = personalDataIssue(changes, employee, localDateOf(new Date()))
  if (issue) throw new BadRequestException(issue)
  // نفس مدقق بريد تعديل الموارد البشرية (IsEmail في UpdateEmployeeDto)
  const email = changes.find(change => change.key === 'personalEmail')?.newValue
  if (email && !isEmail(email)) throw new BadRequestException(PERSONAL_EMAIL_MESSAGE)
}

/**
 * التقديم وإعادة التقديم: فحوص الشكل والإلزام بدري — ولا حاجة بتتكتب في ملف الموظف قبل الاعتماد النهائي.
 * التفرد مابيتفحصش هنا: الموظف العادي مايعرفش إن رقم هوية أو جواز مسجل لحد تاني في الشركة (ولا في فرع تاني)؛
 * بيتفحص وقت الاعتماد النهائي تحت القفل، والمعتمد بيرفض أو يرجّع الطلب للتصحيح.
 */
export async function validatePersonalDataRequest(em: EntityManager, req: Pick<Request, 'requesterId' | 'payload'>) {
  const employee = await em.getRepository(Employee).findOne({ where: { id: req.requesterId } })
  if (!employee) throw new BadRequestException('الموظف المطلوب تحديث بياناته غير موجود')
  const changes = personalDataChanges(employee, parsePayload(req.payload))
  if (!changes.length) throw new BadRequestException(`${PERSONAL_DATA_NO_CHANGE} — عدّل خانة واحدة على الأقل عن البيانات الحالية`)
  assertChangesValid(employee, changes)
}

/**
 * الاعتماد النهائي (جوه معاملته): قفل تفرد الهوية قبل صف الموظف لو الطلب فيه هوية أو جواز (نفس ترتيب تعديل الموارد البشرية)، ثم نفس
 * الفحوص على الملف المحفوظ دلوقتي — أي مشكلة = BadRequest والمعاملة كلها بترجع (القرار والحالة والملف). التطبيق للأعمدة المتغيرة بس،
 * وسطر في سجل تغييرات الموظف لكل حقل. بيرجّع رقم آخر سطر سجل (مرجع الوجهة).
 */
export async function applyPersonalDataRequest(em: EntityManager, req: Pick<Request, 'id' | 'requesterId'>, payload: Record<string, unknown>): Promise<number> {
  if (['nationalId', 'passportNo'].some(key => personalDataRequestedValue(key as 'nationalId' | 'passportNo', payload[key]) !== undefined)) {
    await lockEmployeeIdentities(em)
  }
  // Different requests may update this employee concurrently. Read the committed value under the same lock used through data/audit writes.
  const employee = await em.getRepository(Employee).findOne({ where: { id: req.requesterId }, lock: { mode: 'pessimistic_write' } })
  if (!employee) throw new BadRequestException('الموظف المطلوب تحديث بياناته غير موجود')
  const changes = personalDataChanges(employee, payload)
  if (!changes.length) throw new BadRequestException(PERSONAL_DATA_NO_CHANGE)
  assertChangesValid(employee, changes)
  await assertIdentityUnique(em, employee.id, changes)
  // الأعمدة المتغيرة بس — مابنعيدش حفظ باقي الملف (مبالغ الأجر مثلًا)
  await em.getRepository(Employee).update({ id: employee.id }, Object.fromEntries(changes.map(change => [change.key, change.newValue])))
  let historyId = 0
  for (const change of changes) {
    historyId = (await recordEmployeeChange(em, { employeeId: employee.id, fieldName: change.key, oldValue: change.oldValue,
      newValue: change.newValue, reason: 'تحديث بيانات معتمد', requestId: req.id })).id
  }
  return historyId
}
