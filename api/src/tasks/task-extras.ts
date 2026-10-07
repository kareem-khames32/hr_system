import { Logger } from '@nestjs/common'
import { In, type EntityManager } from 'typeorm'
import { User } from '../auth/user.entity'
import { Comment } from '../comments/comment.entity'
import { commentsTableReady, storedCommentMentions } from '../comments/comment-rules'
import { Employee } from '../employees/employee.entity'
import { recordOutboxEvent } from '../queue/outbox'
import { TaskExtra } from './task-extra.entity'
import { TaskLogEntry } from './task-log.entity'
import type { Task } from './task.entity'

// B2.5 (إضافة المالك 6 أكتوبر، ترحيل 096): قواعد إسناد المهام وتقييمها — حالة المهمة الإضافية (جدول task_extras)، وسجل المهمة (جدول
// task_log).
//  الحالة في جدول لوحده مفتاحه رقم المهمة، ومن غير صف = مهمة عادية. الكود بيشتغل قبل الترحيل: القراءة بترجّع القيم الفاضية، والكتابة
//  مابتتناداش غير بعد التأكد من وجود الجدولين. كل كتابة والمنادي ماسك صف المهمة (فمفيش كتابتين لنفس المهمة في نفس اللحظة).
//  سجل المهمة: سطر لكل تغيير، بيتكتب في نفس معاملة التغيير وبيتضاف عليه بس، وبيتقري للي يشوف المهمة. مش جزء من حوار التعليقات (B2.8):
//  الحوار وجدوله زي ما هم. والتغييرات الأربعة اللي ليها مستلم (طلب التمديد، قراره، الرجوع للتعديل، إنجاز مهمة معلّمة) بيتكتب معاها
//  تعليق عادي في حوار المهمة باسم اللي عمل التغيير وبإشارة للمستلم: إشعار الإشارة القايم بيوصّله، والمستلم وحقه بيتحسبوا وقت التوزيع
//  ووقت الإرسال زي أي إشارة. مهمة تنفيذ طلب ومهمة إقرار مستند مالهمش سجل هنا: سجلهم تبع طلبهم أو مستندهم.

export const TASK_RULES_MIGRATION_MISSING = 'قواعد إسناد المهام وتقييمها محتاجة ترحيل 20261007_096 على قاعدة البيانات'
export const TASK_RATING_FEATURE = 'tasks.rating'
export const TASK_RATING_CLOSED = 'تقييم المهام مقفول — بيتفتح من إعدادات الموديولات'
/** نص المالك بالحرف: حد برّه شجرتك مايتكلّفش مباشرة */
export const TASK_OUTSIDE_TEAM = 'الموظف ده مش في فريقك. اعمل طلب، ولما يتعتمد هيتحوّل مهمة'
export const TASK_ASSIGNEE_CANNOT_MANAGE = 'تعديل المهمة وتحويلها للي كلّف بيها أو لصاحب صلاحية «إدارة المهام». لو مش بتاعتك اكتب تعليق «مش بتاعتي»، ولو محتاج وقت اطلب تمديد الميعاد'
export const TASK_NOT_MINE_LABEL = 'مش بتاعتي'
/** أقصى سطور بترجع من سجل المهمة (الأحدث)، وأقصى طول لنص السطر */
export const TASK_LOG_MAX = 200
export const TASK_LOG_BODY_MAX = 1000

const logger = new Logger('Tasks')
let ready: boolean | null = null, warned = false

/** جدولي ترحيل 096 (task_extras وtask_log) موجودين؟ الموجود بيتحفظ (المخطط مابيتشالش). الناقص مابيتحفظش: بيتفحص مع كل نداء (قاعدة CRP2N) */
export async function taskExtrasReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.task_extras', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.task_log', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  if (!ready && !warned) { warned = true; logger.warn(TASK_RULES_MIGRATION_MISSING + ' — المهام شغالة زي ما هي من غير المهمة الشخصية والتمديد والتقييم وسجل المهمة لحد ما يتطبق') }
  return ready
}

/** للاختبارات: نسيان حالة الجدولين */
export function resetTaskExtrasCache() { ready = null; warned = false }

export interface TaskExtras {
  /** الموظف كلّف نفسه: بيشوفها صاحبها ومديره المباشر بس */
  isPersonal: boolean
  returnCount: number
  needsRating: boolean
  rating: number | null
  ratingNote: string | null
  /** طلب تمديد معلّق: الموعد المطلوب وسببه */
  extensionDueDate: string | null
  extensionReason: string | null
}
export const NO_TASK_EXTRAS: Readonly<TaskExtras> = Object.freeze({ isPersonal: false, returnCount: 0, needsRating: false, rating: null, ratingNote: null, extensionDueDate: null, extensionReason: null })
const COLUMNS = Object.keys(NO_TASK_EXTRAS) as Array<keyof TaskExtras>

const extrasOf = (row: TaskExtra): TaskExtras => ({
  isPersonal: row.isPersonal === true, returnCount: Number(row.returnCount) > 0 ? Number(row.returnCount) : 0, needsRating: row.needsRating === true,
  rating: row.rating == null ? null : Number(row.rating), ratingNote: row.ratingNote ?? null,
  extensionDueDate: row.extensionDueDate == null ? null : String(row.extensionDueDate).slice(0, 10), extensionReason: row.extensionReason ?? null,
})

/** حالة قواعد الإسناد لمهام بأرقامها. المهمة اللي من غير صف (وقبل الترحيل: الكل) مش في الخريطة = القيم الفاضية */
export async function taskExtrasOf(em: EntityManager, ids: readonly number[]): Promise<Map<number, TaskExtras>> {
  const out = new Map<number, TaskExtras>()
  const wanted = [...new Set(ids.filter(id => Number.isSafeInteger(id) && id > 0))]
  if (!wanted.length || !(await taskExtrasReady(em))) return out
  // بدفعات تحت حد معاملات SQL Server
  for (let offset = 0; offset < wanted.length; offset += 1000) {
    for (const row of await em.getRepository(TaskExtra).find({ where: { taskId: In(wanted.slice(offset, offset + 1000)) } })) out.set(row.taskId, extrasOf(row))
  }
  return out
}

/** حالة مهمة واحدة (على اتصال المعاملة اللي ماسكة صفها) */
export async function taskExtrasOfOne(em: EntityManager, id: number): Promise<TaskExtras> {
  return (await taskExtrasOf(em, [id])).get(id) ?? { ...NO_TASK_EXTRAS }
}

/**
 * كتابة خانات من حالة المهمة (المنادي ماسك صف المهمة ومتأكد إن الترحيل موجود). الصف بيتعمل أول مرة المهمة تاخد قيمة غير الفاضية؛ تغيير
 * مابيخرجش عن القيم الفاضية لمهمة من غير صف مابيعملش صف.
 */
export async function writeTaskExtras(em: EntityManager, taskId: number, patch: Partial<TaskExtras>): Promise<void> {
  // الخانات المعروفة بس، وقيمة فاضية لخانة مابتقبلش فاضي = قيمتها الفاضية
  const changes: Partial<TaskExtras> = {}
  for (const column of COLUMNS) if (Object.prototype.hasOwnProperty.call(patch, column)) Object.assign(changes, { [column]: patch[column] ?? NO_TASK_EXTRAS[column] })
  const changed = Object.keys(changes) as Array<keyof TaskExtras>
  if (!changed.length) return
  const repo = em.getRepository(TaskExtra)
  if (await repo.findOne({ where: { taskId }, select: { taskId: true } })) { await repo.update({ taskId }, changes); return }
  if (changed.every(column => changes[column] === NO_TASK_EXTRAS[column])) return
  await repo.insert({ taskId, ...NO_TASK_EXTRAS, ...changes })
}

/** شرط SQL لقايمة المهمة الشخصية برّاها (alias = اسم جدول المهام في الاستعلام). المنادي متأكد إن الجدول موجود */
export const notPersonalTask = (alias: string): string =>
  `NOT EXISTS (SELECT 1 FROM [task_extras] [personal_extra] WHERE [personal_extra].[taskId] = ${alias}.id AND [personal_extra].[isPersonal] = 1)`

// ===== سجل المهمة =====
/** أنواع سطور السجل ومسمّياتها */
export const TASK_LOG_EVENTS = {
  ASSIGNED: 'تكليف', REASSIGNED: 'تحويل', DUE_CHANGED: 'تغيير الموعد', EDITED: 'تعديل', STARTED: 'بدأت', WAITING: 'مستنية', DONE: 'خلصت', CANCELLED: 'إلغاء', REOPENED: 'إعادة فتح',
  RETURNED: 'رجوع للتعديل', EXTENSION_REQUESTED: 'طلب تمديد', EXTENSION_APPROVED: 'موافقة على التمديد', EXTENSION_REJECTED: 'رفض التمديد', RATED: 'تقييم',
} as const
export type TaskLogEvent = keyof typeof TASK_LOG_EVENTS
export const isTaskLogEvent = (value: unknown): value is TaskLogEvent => typeof value === 'string' && Object.prototype.hasOwnProperty.call(TASK_LOG_EVENTS, value)

/**
 * سطر في سجل المهمة، في نفس معاملة التغيير، بالحساب اللي عمله وموظفه المتسجّل دلوقتي. قبل ترحيل 096: من غير سجل.
 * notify = أدوار المهمة اللي التغيير ده لازم يوصلها (المسؤول، اللي كلّف بيها): معاه تعليق عادي في حوار المهمة بنفس النص وبإشارة ليهم، وحدث
 * إشعار الإشارة القايم. المنادي مايناديش لمهمة من غير حوار (تنفيذ طلب، إقرار مستند)، وماسك صف المهمة (زي كتابة أي تعليق عليها).
 */
export async function recordTaskLog(em: EntityManager, actor: { sub: number; employeeId?: number | null }, task: Pick<Task, 'id'>, event: TaskLogEvent, body: string,
  notify: Array<'ASSIGNEE' | 'CREATOR'> = []): Promise<void> {
  if (!(await taskExtrasReady(em))) return
  const text = body.slice(0, TASK_LOG_BODY_MAX), now = new Date()
  await em.getRepository(TaskLogEntry).insert({ taskId: task.id, event, actorUserId: actor.sub, actorEmployeeId: actor.employeeId ?? null, body: text, createdAt: now })
  if (!notify.length || !(await commentsTableReady(em))) return
  const comments = em.getRepository(Comment)
  const notice = await comments.save(comments.create({
    entityType: 'task', entityId: task.id, authorUserId: actor.sub, authorEmployeeId: actor.employeeId ?? null, body: text, internal: false,
    mentions: storedCommentMentions({ targets: notify, replyTo: [] }), createdAt: now,
  }))
  await recordOutboxEvent(em, { type: 'COMMENT_MENTION', entityType: 'comment', entityId: notice.id, payload: { commentId: notice.id } })
}

export interface TaskLogLine { event: TaskLogEvent; label: string; body: string; at: Date; by: string | null; mine: boolean }

/**
 * سطور سجل المهمة (الأقدم الأول، آخر TASK_LOG_MAX سطر). المنادي هو اللي حكم إن الحساب يشوف المهمة؛ واللي يشوفها بيشوف مين عمل إيه فيها
 * (نفس قاعدة أسماء كتّاب حوار المهمة): موظف الحساب المتسجّل وقت التغيير، وحساب من غير موظف باسم الحساب. من غير أرقام.
 */
export async function taskLogOf(em: EntityManager, user: { sub: number }, taskId: number): Promise<{ available: boolean; truncated: boolean; lines: TaskLogLine[] }> {
  if (!(await taskExtrasReady(em))) return { available: false, truncated: false, lines: [] }
  const rows = await em.getRepository(TaskLogEntry).find({ where: { taskId }, order: { id: 'DESC' }, take: TASK_LOG_MAX + 1 })
  const shown = rows.slice(0, TASK_LOG_MAX).reverse()
  const employeeIds = [...new Set(shown.map(row => row.actorEmployeeId).filter((id): id is number => id != null))]
  const accountIds = [...new Set(shown.filter(row => row.actorEmployeeId == null).map(row => row.actorUserId))]
  const employees = employeeIds.length ? await em.getRepository(Employee).find({ where: { id: In(employeeIds) }, select: { id: true, fullName: true } }) : []
  const accounts = accountIds.length ? await em.getRepository(User).find({ where: { id: In(accountIds) }, select: { id: true, displayName: true } }) : []
  const employeeName = new Map(employees.map(row => [row.id, row.fullName])), accountName = new Map(accounts.map(row => [row.id, row.displayName ?? null]))
  const lines: TaskLogLine[] = []
  for (const row of shown) {
    // نوع مش معروف (سطر اتكتب بإصدار أحدث) مابيتعرضش
    if (!isTaskLogEvent(row.event)) continue
    lines.push({ event: row.event, label: TASK_LOG_EVENTS[row.event], body: row.body, at: row.createdAt, mine: row.actorUserId === user.sub,
      by: row.actorEmployeeId != null ? employeeName.get(row.actorEmployeeId) ?? null : accountName.get(row.actorUserId) ?? null })
  }
  return { available: true, truncated: rows.length > TASK_LOG_MAX, lines }
}
