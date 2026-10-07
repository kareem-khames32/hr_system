import { Logger, NotFoundException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { Employee, type EmployeeStatus } from '../employees/employee.entity'
import type { StoredFile } from '../files/stored-file.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { ApproverResolver, FUNCTIONAL_APPROVER_ROLES, holdsFunctionalStep } from '../requests/approver-resolver.service'
import { taskExtrasOfOne } from './task-extras'
import { Task } from './task.entity'

// B2.5: قواعد المهمة العامة — جاهزية الجدول، ومين يشتغل عليها ومين يديرها ومين يشوفها. قاعدة واحدة للخدمة ولتحميل ملف الإثبات.
//  المسؤول: الموظف نفسه، أو حامل الدور الوظيفي اللي فرع المهمة في نطاقه (holdsFunctionalStep: من غير مخرج مدير النظام، فمهام
//  الأدوار مابتتراكمش في «مهامي» بتاعته).
//  الإدارة: «إدارة المهام» في فرع المهمة، أو اللي كلّف بيها بحقه دلوقتي (مسؤولها لسه تحته في الشجرة، أو لسه معاه «تكليف أي موظف»
//  وفرعها في نطاقه) — مش بإنه كلّف بيها زمان.
//  الاطلاع: دول + المدير المباشر للموظف المسؤول + «عرض كل المهام» في فرع المهمة. برّه كده المهمة «غير موجودة».
//  المهمة الشخصية (الموظف كلّف نفسه — إضافة المالك 6 أكتوبر): صاحبها بيديرها، ومديره المباشر بيشوفها، ومحدش غيرهم.

export const TASKS_MIGRATION_MISSING = 'المهام العامة محتاجة ترحيل 20261005_088 على قاعدة البيانات'
export const TASK_NOT_FOUND = 'المهمة غير موجودة'
/** المهمة ربطها (بطلب تنفيذ أو بمستند إقرار) اتثبّت والنداء واقف على صفها: المحاولة الجاية بتقراه من الأول */
export const TASK_STILL_OPENING = 'المهمة لسه بتتسجّل — حاول تاني بعد لحظة'
/** B2.8: مهمة تنفيذ طلب أو إقرار مستند مالهاش حوار تعليقات — تفاصيلها تبع الطلب أو المستند */
export const TASK_COMMENTS_LINKED = 'المهمة دي تبع طلب أو مستند — مفيش تعليقات عليها من هنا'
export const TASK_FILE_NOT_FOUND = 'الملف غير موجود'
export const TASKS_REMINDER_DAYS_KEY = 'tasks.reminder_days_before'
export const TASKS_REMINDER_DAYS_DEFAULT = 1
export const TASKS_ESCALATION_DAYS_KEY = 'tasks.escalation_days_after'
export const TASKS_ESCALATION_DAYS_DEFAULT = 3
export const TASKS_DAYS_MAX = 60
/** موظف مش على رأس العمل: مابيتكلّفش بمهمة، ومابيتطلبش منه إقرار مستند (B2.7-ب) */
export const TASK_OFF_DUTY_STATUSES: EmployeeStatus[] = ['terminated', 'archived']

export const TASK_ROLE_LABELS: Record<(typeof FUNCTIONAL_APPROVER_ROLES)[number], string> = {
  hr: 'الموارد البشرية', finance: 'المالية', it: 'تقنية المعلومات', custody_officer: 'مسؤول العهد', payroll_officer: 'مسؤول الرواتب', executive: 'الإدارة التنفيذية',
}

const logger = new Logger('Tasks')
let ready: boolean | null = null, warned = false

/** جدول المهام موجود (ترحيل 088)؟ الموجود بيتحفظ (المخطط مابيتشالش). الناقص مابيتحفظش: بيتفحص مع
 * كل نداء، فعملية شغالة من قبل الترحيل بتشوفه أول ما يتطبق وماتكمّلش بحكم «قبل الترحيل» على حاجة اتعملت بعده (Codex CRP2N-B01). */
export async function tasksTableReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.tasks', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  if (!ready && !warned) { warned = true; logger.warn(TASKS_MIGRATION_MISSING + ' — «مهامي» بتعرض مهام التهيئة وبنود الإخلاء بس لحد ما يتطبق') }
  return ready
}

/** للاختبارات: نسيان حالة الجدول */
export function resetTasksTableCache() { ready = null; warned = false }

// تاريخ محلي YYYY-MM-DD — ممنوع toISOString على «الآن» (قاعدة التوقيت المحلي)
export const taskLocalDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** تاريخ صالح بصيغة YYYY-MM-DD (يوم حقيقي في التقويم)؟ */
export function isTaskDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

/** أيام بين تاريخين محليين (to − from) */
export const taskDaysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)

/** تاريخ بعد (أو قبل) أيام — حساب على اليوم نفسه كتاريخ UTC، مش على «الآن» */
export const taskAddDays = (date: string, days: number): string => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)

/**
 * حدث «موعدها قرّب» أو «متأخرة» لسه بتاع ختم المهمة الحالي؟ الحدث بيشيل رقم الختم اللي اتسجّل معاه (remindedAt أو escalatedAt زي ما
 * القاعدة بترجّعه). تغيير الموعد أو التحويل أو إعادة الفتح بيشيل الختم، وختم جديد = جيل جديد بحدثه: رسالة الجيل القديم مابتطلعش بموعد أو
 * مسؤول فات. حدث قديم من غير ختم (قبل CRP2G) صالح طول ما المهمة عليها ختم.
 */
export const taskStampCurrent = (payload: { stamp?: unknown } | null | undefined, current: Date | null | undefined): boolean =>
  !!current && (payload?.stamp == null || current.getTime() === Number(payload.stamp))

/** أرقام بدفعات تحت حد معاملات SQL Server (2100) — مدير فرع كبير ممكن يبقى «المدير المباشر» لآلاف */
export function taskIdChunks(ids: readonly number[], size = 1000): number[][] {
  const parts: number[][] = []
  for (let offset = 0; offset < ids.length; offset += size) parts.push(ids.slice(offset, offset + size))
  return parts
}

export const isTaskRole = (value: unknown): value is (typeof FUNCTIONAL_APPROVER_ROLES)[number] => (FUNCTIONAL_APPROVER_ROLES as readonly unknown[]).includes(value)

/** الأدوار الوظيفية اللي الحساب بيحملها بصلاحياته */
export const taskRolesHeldBy = (user: Pick<JwtPayload, 'role' | 'permissions'>): string[] => FUNCTIONAL_APPROVER_ROLES.filter(role => holdsFunctionalStep(user, role))

/** الالتزام بالميعاد لمهمة خلصت وليها موعد: في الميعاد، أو متأخرة كام يوم (بتاريخ الإقفال المحلي). غير كده null */
export function taskCompliance(task: Pick<Task, 'status' | 'dueDate' | 'closedAt'>): { onTime: boolean; lateDays: number } | null {
  if (task.status !== 'DONE' || !task.dueDate || !task.closedAt) return null
  const lateDays = Math.max(0, taskDaysBetween(String(task.dueDate).slice(0, 10), taskLocalDate(new Date(task.closedAt))))
  return { onTime: lateDays === 0, lateDays }
}
export const taskComplianceLabel = (compliance: { onTime: boolean; lateDays: number } | null): string | null =>
  !compliance ? null : compliance.onTime ? 'في الميعاد' : compliance.lateDays === 1 ? 'متأخر يوم' : compliance.lateDays === 2 ? 'متأخر يومين' : `متأخر ${compliance.lateDays} يوم`

// isPersonal من جدول ترحيل 096 (task_extras): المنادي بيقراه (taskExtrasOf) ويبعته صريح — من غيره الحكم مايتاخدش
type TaskAssignment = Pick<Task, 'assigneeEmployeeId' | 'assigneeRole' | 'branchId' | 'createdByUserId'> & { isPersonal: boolean }

/** الهيكل اللي الحكم محتاجه: المدير المباشر، و«تحته في الشجرة» (ApproverResolver بيأديهم) */
export interface TaskStructure {
  directManagerOf(employeeId: number): Promise<number | null>
  isUnder(employeeId: number, managerEmployeeId: number): Promise<boolean>
}

/** المهمة على الحساب ده؟ موظفها، أو حامل دورها اللي فرعها في نطاقه */
export const taskAwaitsAccount = (user: JwtPayload, task: Pick<TaskAssignment, 'assigneeEmployeeId' | 'assigneeRole' | 'branchId'>): boolean =>
  task.assigneeEmployeeId != null
    ? !!user.employeeId && user.employeeId === task.assigneeEmployeeId
    : !!task.assigneeRole && holdsFunctionalStep(user, task.assigneeRole) && inBranchScope(branchScopeOf(user), task.branchId)

/**
 * الحساب بيدير المهمة (تعديل، تحويل، إلغاء، رجوع للتعديل، رد على طلب التمديد)؟ بحقه دلوقتي، مش بإنه كلّف بيها زمان:
 *  - المهمة الشخصية: صاحبها بس. الصلاحيات مابتفتحهاش، والحساب اللي كلّف بيها لو اتربط بموظف تاني مالوش حق.
 *  - «إدارة المهام» في فرعها.
 *  - اللي كلّف بيها: ومسؤولها لسه تحته في الشجرة (assigneeUnder)، أو لسه معاه «تكليف أي موظف» وفرعها في نطاقه.
 * اللي كلّف بمهمة وفقد حقه في تكليف مسؤولها زيه زي أي حساب تاني: لا يديرها ولا يشوفها.
 */
export const taskManagedBy = (user: JwtPayload, task: Pick<TaskAssignment, 'createdByUserId' | 'branchId' | 'assigneeEmployeeId' | 'isPersonal'>, assigneeUnder: boolean): boolean => {
  if (task.isPersonal) return !!user.employeeId && user.employeeId === task.assigneeEmployeeId
  const inScope = inBranchScope(branchScopeOf(user), task.branchId)
  if (userHasPerm(user, 'tasks.manage') && inScope) return true
  return task.createdByUserId === user.sub && (assigneeUnder || (userHasPerm(user, 'tasks.assign_any') && inScope))
}

export interface TaskAccess { visible: boolean; work: boolean; manage: boolean }

/** صلاحيات الحساب على المهمة. structure: نفس حل المدير المباشر والشجرة بتاع محرك الطلبات (ApproverResolver) */
export async function taskAccess(user: JwtPayload, task: TaskAssignment, structure: TaskStructure): Promise<TaskAccess> {
  const work = taskAwaitsAccount(user, task)
  const other = task.assigneeEmployeeId != null && !!user.employeeId && user.employeeId !== task.assigneeEmployeeId
  // المدير المباشر للموظف المسؤول (هيكليًا، من غير قيد فرع): بيشوف مهامه — وبيتحل لما الحكم واقف عليه بس
  const directManager = async () => other && (await structure.directManagerOf(task.assigneeEmployeeId!)) === user.employeeId
  if (task.isPersonal) {
    // شخصية: صاحبها ومديره المباشر بس. «إدارة المهام» و«عرض كل المهام» مابيشوفوهاش
    const manage = taskManagedBy(user, task, false)
    return { visible: work || manage || await directManager(), work, manage }
  }
  const byRight = taskManagedBy(user, task, false), viewAll = userHasPerm(user, 'tasks.view_all') && inBranchScope(branchScopeOf(user), task.branchId)
  // اللي كلّف بيها بيديرها طول ما مسؤولها لسه تحته في الشجرة
  const under = !byRight && other && task.createdByUserId === user.sub && await structure.isUnder(task.assigneeEmployeeId!, user.employeeId!)
  const manage = byRight || under
  return { visible: work || manage || viewAll || await directManager(), work, manage }
}

/**
 * تحميل ملف إثبات المهمة (/files/:id) بنفس حكم المهمة: رافعه (قبل الإقفال وبعده)، وكل اللي يشوف المهمة اللي الملف إثباتها.
 * لا كاشف وجود: ملف مهمة برّه نطاق السائل = نفس رد الملف الغايب.
 */
export async function assertTaskFileAccess(em: EntityManager, user: JwtPayload, file: Pick<StoredFile, 'id' | 'uploadedBy'>) {
  if (!!user.sub && file.uploadedBy === user.sub) return
  const task = (await tasksTableReady(em)) ? await em.getRepository(Task).findOne({ where: { proofFileId: file.id } }) : null
  if (!task) throw new NotFoundException(TASK_FILE_NOT_FOUND)
  const resolver = new ApproverResolver(em.getRepository(Employee), em.getRepository(Team), em.getRepository(Department), em.getRepository(Branch))
  const { isPersonal } = await taskExtrasOfOne(em, task.id)
  if (!(await taskAccess(user, { ...task, isPersonal }, resolver)).visible) throw new NotFoundException(TASK_FILE_NOT_FOUND)
}
