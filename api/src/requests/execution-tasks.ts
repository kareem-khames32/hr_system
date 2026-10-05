import { BadRequestException, NotFoundException } from '@nestjs/common'
import { In, type EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { Employee } from '../employees/employee.entity'
import { recordOutboxEvent } from '../queue/outbox'
import { Task, TASK_OPEN_STATUSES } from '../tasks/task.entity'
import { taskAwaitsAccount, taskLocalDate, TASK_FILE_NOT_FOUND, TASK_ROLE_LABELS } from '../tasks/task-rules'
import { definitionCodeOf } from '../common/leave-contract'
import { FUNCTIONAL_APPROVER_ROLES } from './approver-resolver.service'
import { RequestApproval } from './entities/request-approval.entity'
import type { RequestType } from './entities/request-type.entity'
import { Request } from './entities/request.entity'

// B2.6 (ترحيل 089): «مهمة تنفيذ بعد الاعتماد».
//  نوع الطلب «تسجيل فقط» (اللي مالوش تنفيذ آلي) ممكن يتحط عليه دور وظيفي ينفّذه بعد الاعتماد النهائي (ومهلة بالأيام، وإثبات إجباري).
//  ساعتها الطلب بيفضل «قيد التنفيذ» (الحالة الموجودة) ومهمة بتتفتح في محرك المهام (B2.5) على الدور في فرع الطلب، في نفس معاملة
//  الاعتماد. إقفال المهمة = الطلب «مكتمل».
//  الأنواع اللي وجهتها بتنفّذ آليًا برّه: أثرها هو تنفيذها، وقرّاء «قيد التنفيذ» بتوعها (التشغيل المجدول، وتعارض التغييرات الوظيفية،
//  ورصيد الإجازات) بيعتبروه «لسه ماتنفّذش».
//  من غير الإعداد كل حاجة زي ما هي: الطلب بيكتمل لحظة الاعتماد (ومنه الـ16 نوع «تسجيل بس»).
//  الأعمدة برّه الكيانات للقراءة والكتابة (الكود بيشتغل قبل الترحيل)، فكل القراءة والكتابة هنا بـSQL صريح بعد التأكد من وجودها.
//  ترتيب القفل في كل المسارات: صف الطلب أولًا، وبعده صف المهمة.

export const EXECUTION_MIGRATION_MISSING = 'مهمة التنفيذ بعد الاعتماد محتاجة ترحيل 20261005_089 على قاعدة البيانات'
export const EXECUTION_DAYS_MAX = 365
export const EXECUTION_TASK_CANCEL_BLOCKED = 'دي مهمة تنفيذ طلب معتمد: ماتتلغيش من هنا — رفض تنفيذ الطلب من «لوحة الطلبات» بيلغيها'
export const EXECUTION_TASK_REOPEN_BLOCKED = 'طلب المهمة دي اتقفل، فمهمة تنفيذه ماتتفتحش تاني'
export const EXECUTION_TASK_EDIT_BLOCKED = 'دي مهمة تنفيذ طلب معتمد: ماتتعدّلش ولا تتحوّل من هنا — مسؤولها حاملي دور نوع الطلب في فرعه'
export const EXECUTION_TASK_CLOSE_BLOCKED = 'مهمة تنفيذ الطلب بيقفلها المسؤول عنها بس'
export const EXECUTION_TASK_OWN_BLOCKED = 'دي مهمة تنفيذ طلبك: بيشتغل عليها حد تاني من المسؤولين عنها'
export const EXECUTION_RECORD_ONLY_REQUIRED = 'مهمة التنفيذ لأنواع «تسجيل فقط» بس: النوع ده وجهته بتنفّذ آليًا بعد الاعتماد — شيل مهمة التنفيذ أو خلّي وجهته «سجل فقط»'
export const EXECUTION_CONFIDENTIAL_REJECT_BLOCKED = 'رفض تنفيذ طلب سري لأطرافه بس'

let ready: boolean | null = null, checkedAt = 0

/** أعمدة مهمة التنفيذ موجودة (ترحيل 089) وجدول المهام موجود (088)؟ الموجود بيتحفظ، والناقص بيتفحص تاني كل دقيقة */
export async function executionSchemaReady(em: EntityManager): Promise<boolean> {
  if (ready === true || (ready === false && Date.now() - checkedAt < 60_000)) return ready
  const [row] = await em.query(`SELECT CASE WHEN COL_LENGTH(N'dbo.request_types', N'executionRole') IS NOT NULL
    AND COL_LENGTH(N'dbo.requests', N'executionTaskId') IS NOT NULL AND OBJECT_ID(N'dbo.tasks', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  checkedAt = Date.now()
  return ready
}

/** للاختبارات: نسيان حالة الأعمدة */
export function resetExecutionSchemaCache() { ready = null; checkedAt = 0 }

export interface ExecutionSetting { role: string; days: number | null; proof: boolean }
export interface ExecutionSettingInput { executionRole?: string | null; executionDays?: number | null; executionProof?: boolean | null }

const settingOf = (row: { role?: unknown; days?: unknown; proof?: unknown } | undefined): ExecutionSetting | null =>
  row?.role ? { role: String(row.role), days: row.days == null ? null : Number(row.days), proof: row.proof === true || row.proof === 1 } : null

/** إعداد مهمة التنفيذ لنوع الطلب — null لو النوع من غير مهمة تنفيذ (أو الترحيل ناقص) */
export async function executionSettingOf(em: EntityManager, typeId: number): Promise<ExecutionSetting | null> {
  if (!(await executionSchemaReady(em))) return null
  const [row] = await em.query(`SELECT [executionRole] AS [role], [executionDays] AS [days], [executionProof] AS [proof] FROM [request_types] WHERE [id] = @0`, [typeId])
  return settingOf(row)
}

/** إعدادات كل الأنواع اللي عليها مهمة تنفيذ (لشاشة أنواع الطلبات) */
export async function executionSettings(em: EntityManager): Promise<Map<number, ExecutionSetting>> {
  const out = new Map<number, ExecutionSetting>()
  if (!(await executionSchemaReady(em))) return out
  const rows: Array<{ id: number; role: string; days: number | null; proof: unknown }> = await em.query(
    `SELECT [id], [executionRole] AS [role], [executionDays] AS [days], [executionProof] AS [proof] FROM [request_types] WHERE [executionRole] IS NOT NULL`)
  for (const row of rows) { const setting = settingOf(row); if (setting) out.set(Number(row.id), setting) }
  return out
}

/**
 * الإعداد بعد دمج المبعوت مع المتخزن (الخانة اللي مش مبعوتة مابتتغيّرش) — أو null لو الطلب مالمسش الإعداد. الدور فاضي = من غير مهمة،
 * والمهلة والإثبات بيتشالوا معاه. قبل الترحيل: أي قيمة غير «من غير مهمة» مرفوضة برسالته. بيتنادى قبل أي حفظ.
 */
export async function resolveExecutionSetting(em: EntityManager, typeId: number | null, input: ExecutionSettingInput): Promise<{ setting: ExecutionSetting | null } | null> {
  if (input.executionRole === undefined && input.executionDays === undefined && input.executionProof === undefined) return null
  if (!(await executionSchemaReady(em))) {
    if (input.executionRole || input.executionDays != null || input.executionProof === true) throw new BadRequestException(EXECUTION_MIGRATION_MISSING)
    return null
  }
  const current = typeId === null ? null : await executionSettingOf(em, typeId)
  const role = input.executionRole === undefined ? current?.role ?? null : input.executionRole || null
  if (role !== null && !(FUNCTIONAL_APPROVER_ROLES as readonly string[]).includes(role)) throw new BadRequestException('دور مهمة التنفيذ غير معروف')
  const days = input.executionDays === undefined ? current?.days ?? null : input.executionDays
  if (days !== null && (!Number.isInteger(days) || days < 1 || days > EXECUTION_DAYS_MAX)) throw new BadRequestException(`مهلة التنفيذ من يوم لـ${EXECUTION_DAYS_MAX} يوم`)
  const proof = input.executionProof === undefined ? current?.proof ?? false : input.executionProof === true
  if (role === null) {
    // مهلة أو إثبات من غير دور (والدور مش بيتشال في نفس الطلب): مفيش مهمة يتحطوا عليها
    if (input.executionRole === undefined && (days !== null || proof)) throw new BadRequestException('اختار دور مهمة التنفيذ الأول')
    return { setting: null }
  }
  return { setting: { role, days, proof } }
}

/** كتابة الإعداد المحسوم (من resolveExecutionSetting) على النوع */
export async function writeExecutionSetting(em: EntityManager, typeId: number, resolved: { setting: ExecutionSetting | null } | null): Promise<void> {
  if (!resolved) return
  const setting = resolved.setting
  await em.query(`UPDATE [request_types] SET [executionRole] = @1, [executionDays] = @2, [executionProof] = @3 WHERE [id] = @0`,
    [typeId, setting?.role ?? null, setting?.days ?? null, setting ? (setting.proof ? 1 : 0) : null])
}

// تاريخ محلي YYYY-MM-DD (ممنوع toISOString على «الآن»)، وبعده بأيام
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const addDays = (date: Date, days: number) => localDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days))

/**
 * مهمة تنفيذ الطلب المعتمد، جوه معاملة الاعتماد نفسها (صف الطلب مقفول عند المنادي): على دور النوع في فرع الطلب. بترجّع رقم المهمة، أو
 * null لو النوع من غير مهمة تنفيذ. العنوان بنوع الطلب واسم صاحبه؛ والطلب السري عنوانه عام (المهمة بيشوفها أصحاب «عرض كل المهام» في
 * الفرع). «اللي كلّف بيها» = النظام (0): المهمة من إعداد النوع مش من شخص، واسم معتمد الطلب السري مايظهرش على مهمته.
 */
export async function openExecutionTask(em: EntityManager, req: Request, type: RequestType): Promise<number | null> {
  const setting = await executionSettingOf(em, type.id)
  if (!setting) return null
  const requester = await em.getRepository(Employee).findOne({ where: { id: req.requesterId }, select: { id: true, fullName: true, branchId: true } })
  const branchId = req.branchId ?? requester?.branchId
  if (branchId == null) throw new BadRequestException('الطلب مالوش فرع تتفتح عليه مهمة التنفيذ')
  const now = new Date()
  const repo = em.getRepository(Task)
  const task = await repo.save(repo.create({
    title: (type.isConfidential ? 'تنفيذ طلب سري' : `تنفيذ طلب: ${type.nameAr}${requester ? ` — ${requester.fullName}` : ''}`).slice(0, 200),
    description: null, assigneeEmployeeId: null, assigneeRole: setting.role, branchId, createdByUserId: 0,
    dueDate: setting.days != null ? addDays(now, setting.days) : null, priority: 'NORMAL', status: 'OPEN', requiresProof: setting.proof,
    proofNote: null, proofFileId: null, statusNote: null, closedByUserId: null, closedAt: null, remindedAt: null, escalatedAt: null, createdAt: now, updatedAt: now,
  }))
  await em.query(`UPDATE [requests] SET [executionTaskId] = @1 WHERE [id] = @0`, [req.id, task.id])
  // نفس حدث التكليف بتاع محرك المهام (مراجع بس): بريد «مهمة جديدة عليك» لحاملي الدور
  await recordOutboxEvent(em, { type: 'TASK_ASSIGNED', entityType: 'task', entityId: task.id, payload: { taskId: task.id, branchId: task.branchId } })
  return task.id
}

export interface ExecutionLink { requestId: number; status: string; requesterId: number | null; createdByUserId: number | null }
type LinkRow = { id: number; status: string; requesterId: number | null; createdByUserId: number | null }
const LINK_COLUMNS = '[id], [status], [requesterId], [createdByUserId]'
const linkOf = (row: LinkRow): ExecutionLink => ({ requestId: Number(row.id), status: String(row.status),
  requesterId: row.requesterId == null ? null : Number(row.requesterId), createdByUserId: row.createdByUserId == null ? null : Number(row.createdByUserId) })

/** الطلب اللي المهمة دي مهمة تنفيذه — null لو مهمة عادية (أو الترحيل ناقص). lock: بيقفل صف الطلب لآخر المعاملة (قبل صف المهمة) */
export async function executionRequestOfTask(em: EntityManager, taskId: number, lock = false): Promise<ExecutionLink | null> {
  if (!(await executionSchemaReady(em))) return null
  const [row]: LinkRow[] = await em.query(`SELECT ${LINK_COLUMNS} FROM [requests]${lock ? ' WITH (UPDLOCK, ROWLOCK)' : ''} WHERE [executionTaskId] = @0`, [taskId])
  return row ? linkOf(row) : null
}

/** طلبات مجموعة مهام (للقوايم): رقم المهمة ← طلبها (رقمه وصاحبه ومنشئه) */
export async function executionRequestsOfTasks(em: EntityManager, taskIds: number[]): Promise<Map<number, ExecutionLink>> {
  const out = new Map<number, ExecutionLink>()
  if (!taskIds.length || !(await executionSchemaReady(em))) return out
  for (let offset = 0; offset < taskIds.length; offset += 1000) {
    const part = taskIds.slice(offset, offset + 1000)
    const rows: Array<LinkRow & { taskId: number }> = await em.query(
      `SELECT ${LINK_COLUMNS}, [executionTaskId] AS [taskId] FROM [requests] WHERE [executionTaskId] IN (${part.map((_, index) => `@${index}`).join(', ')})`, part)
    for (const row of rows) out.set(Number(row.taskId), linkOf(row))
  }
  return out
}

/**
 * الطلب بتاع الحساب نفسه (صاحبه، أو منشئه نيابةً من غير مخرج الموارد البشرية)؟ نفس قاعدة الاعتماد (isOwnRequestFor): زي ما محدش بيعتمد
 * طلبه، محدش بينفّذه.
 */
export const executionOwnRequest = (user: Pick<JwtPayload, 'sub' | 'employeeId'>, link: Pick<ExecutionLink, 'requesterId' | 'createdByUserId'>, hrOverride: boolean): boolean =>
  (link.requesterId != null && link.requesterId === user.employeeId) || (link.createdByUserId != null && link.createdByUserId === user.sub && !hrOverride)

/**
 * ملف إثبات مهمة تنفيذ طلب تبع الطلب نفسه (ممكن يكون سري): لرافعه (اللي قفل المهمة) بس — لغيره نفس رد الملف الغايب، حتى لو شايف
 * المهمة. ملف مش إثبات مهمة تنفيذ بيعدّي.
 */
export async function assertExecutionProofAccess(em: EntityManager, user: Pick<JwtPayload, 'sub'>, file: { id: number; uploadedBy?: number | null }): Promise<void> {
  if ((!!user.sub && file.uploadedBy === user.sub) || !(await executionSchemaReady(em))) return
  const [row] = await em.query(`SELECT TOP (1) r.[id] FROM [requests] r INNER JOIN [tasks] t ON t.[id] = r.[executionTaskId] WHERE t.[proofFileId] = @0`, [file.id])
  if (row) throw new NotFoundException(TASK_FILE_NOT_FOUND)
}

/** الطلبات اللي عليها مهمة تنفيذ من مجموعة طلبات: وجهتها خلصت، ومستنية مهمتها مش تنفيذ مجدول */
export async function executionRequestsWithTask(em: EntityManager, requestIds: number[]): Promise<Set<number>> {
  const out = new Set<number>()
  if (!requestIds.length || !(await executionSchemaReady(em))) return out
  for (let offset = 0; offset < requestIds.length; offset += 1000) {
    const part = requestIds.slice(offset, offset + 1000)
    const rows: Array<{ id: number }> = await em.query(
      `SELECT [id] FROM [requests] WHERE [executionTaskId] IS NOT NULL AND [id] IN (${part.map((_, index) => `@${index}`).join(', ')})`, part)
    for (const row of rows) out.add(Number(row.id))
  }
  return out
}

/** مهمة تنفيذ الطلب (رقمها وصفها) — null لو الطلب من غير مهمة */
export async function executionTaskOfRequest(em: EntityManager, requestId: number): Promise<Task | null> {
  if (!(await executionSchemaReady(em))) return null
  const [row]: Array<{ taskId: number | null }> = await em.query(`SELECT [executionTaskId] AS [taskId] FROM [requests] WHERE [id] = @0`, [requestId])
  return row?.taskId ? em.getRepository(Task).findOne({ where: { id: Number(row.taskId) } }) : null
}

/** الطلبات (من المجموعة دي) اللي مستنية الحساب ده ينفّذها: مهمة تنفيذها مفتوحة وعلى الحساب بحكم محرك المهام (taskAwaitsAccount) */
export async function executionAwaitedRequestIds(em: EntityManager, user: JwtPayload, requestIds: readonly number[]): Promise<Set<number>> {
  const out = new Set<number>()
  if (!requestIds.length || !(await executionSchemaReady(em))) return out
  for (let offset = 0; offset < requestIds.length; offset += 1000) {
    const part = requestIds.slice(offset, offset + 1000)
    const rows: Array<{ requestId: number; assigneeEmployeeId: number | null; assigneeRole: string | null; branchId: number; status: string }> = await em.query(
      `SELECT r.[id] AS [requestId], t.[assigneeEmployeeId], t.[assigneeRole], t.[branchId], t.[status]
         FROM [requests] r INNER JOIN [tasks] t ON t.[id] = r.[executionTaskId] WHERE r.[id] IN (${part.map((_, index) => `@${index}`).join(', ')})`, [...part])
    for (const row of rows) {
      if ((TASK_OPEN_STATUSES as readonly string[]).includes(row.status) && taskAwaitsAccount(user, row)) out.add(Number(row.requestId))
    }
  }
  return out
}

/** الطلب مستني الحساب ده ينفّذه؟ (طرف فيه زي المعتمد: في تفاصيله، وصفه في لوحة الطلبات، ورفض تنفيذه) */
export async function executionAwaitsAccount(em: EntityManager, user: JwtPayload, requestId: number): Promise<boolean> {
  return (await executionAwaitedRequestIds(em, user, [requestId])).has(requestId)
}

/**
 * مهمة التنفيذ اتقفلت: الطلب «مكتمل»، وسطر «اتنفّذ» في سجله باللي قفلها وإثباته، وحدث «طلبك اتنفّذ». المنادي قافل صف الطلب
 * (executionRequestOfTask بـlock) قبل صف المهمة. طلب مابقاش «قيد التنفيذ» (اترفض تنفيذه في نفس اللحظة) مابيتغيّرش.
 */
export async function completeExecution(em: EntityManager, requestId: number, actorUserId: number, proofNote: string | null): Promise<boolean> {
  const repo = em.getRepository(Request)
  const req = await repo.findOne({ where: { id: requestId } })
  if (!req || req.status !== 'IN_EXECUTION') return false
  const [last]: Array<{ step: number | null }> = await em.query(`SELECT MAX([step]) AS [step] FROM [request_approvals] WHERE [requestId] = @0`, [requestId])
  await em.getRepository(RequestApproval).save({
    requestId, step: Number(last?.step) || 0, approverId: actorUserId, action: 'EXECUTED',
    comment: (proofNote ? `اتنفّذ: ${proofNote}` : 'اتنفّذ').slice(0, 1000),
  })
  req.status = 'COMPLETED'
  req.completedAt = new Date()
  await repo.save(req)
  await recordOutboxEvent(em, { type: 'REQUEST_EXECUTED', entityType: 'request', entityId: req.id,
    payload: { requestId: req.id, typeCode: definitionCodeOf(req), requesterId: req.requesterId ?? null, branchId: req.branchId ?? null } })
  return true
}

/** الطلب اترفض تنفيذه: مهمة تنفيذه المفتوحة بتتلغي بالسبب، في نفس المعاملة (صف الطلب مقفول عند المنادي). بترجّع اتلغت ولا لأ */
export async function cancelExecutionTask(em: EntityManager, requestId: number, actorUserId: number, reason: string): Promise<boolean> {
  const task = await executionTaskOfRequest(em, requestId)
  if (!task || !(TASK_OPEN_STATUSES as readonly string[]).includes(task.status)) return false
  const now = new Date()
  const result = await em.getRepository(Task).update({ id: task.id, status: In([...TASK_OPEN_STATUSES]) },
    { status: 'CANCELLED', statusNote: `اترفض تنفيذ الطلب: ${reason}`.slice(0, 500), closedByUserId: actorUserId, closedAt: now, updatedAt: now })
  return (result.affected ?? 0) > 0
}

/** الطلب «قيد التنفيذ» ومهمة تنفيذه لسه مفتوحة؟ */
export async function executionPending(em: EntityManager, req: Pick<Request, 'id' | 'status'>): Promise<boolean> {
  if (req.status !== 'IN_EXECUTION') return false
  const task = await executionTaskOfRequest(em, req.id)
  return !!task && (TASK_OPEN_STATUSES as readonly string[]).includes(task.status)
}

export interface ExecutionInfo {
  /** وقت آخر اعتماد على الطلب (عمر «معتمد ومااتنفذش» بيتحسب منه) */
  approvedAt: Date | null
  /** مهمة التنفيذ ومسؤولها — null لو الطلب مستني معالجه (تاريخ جاي أو عهدة)، أو تنفيذه متعذّر */
  executionTask: { id: number; assignee: string | null; status: string; dueDate: string | null; overdue: boolean } | null
}

/** تقرير «معتمد ومااتنفذش» (لوحة الطلبات): لكل طلب، إمتى اتعتمد، ومين مسؤول تنفيذه (دور نوعه) وحالة مهمته */
export async function executionInfoOf(em: EntityManager, requestIds: number[]): Promise<Map<number, ExecutionInfo>> {
  const out = new Map<number, ExecutionInfo>()
  const withTasks = await executionSchemaReady(em)
  const today = taskLocalDate(new Date())
  for (let offset = 0; offset < requestIds.length; offset += 1000) {
    const part = requestIds.slice(offset, offset + 1000), marks = part.map((_, index) => `@${index}`).join(', ')
    for (const id of part) out.set(id, { approvedAt: null, executionTask: null })
    const approved: Array<{ requestId: number; at: Date | null }> = await em.query(
      `SELECT [requestId], MAX([actedAt]) AS [at] FROM [request_approvals] WHERE [action] IN (N'APPROVED', N'APPROVE', N'APPPROVE') AND [requestId] IN (${marks}) GROUP BY [requestId]`, part)
    for (const row of approved) out.get(Number(row.requestId))!.approvedAt = row.at ?? null
    if (!withTasks) continue
    // الموعد نص من القاعدة (عمود date من المشغّل بييجي بتوقيت الجهاز ويتزحزح)
    const tasks: Array<{ requestId: number; id: number; role: string | null; status: string; dueDate: string | null }> = await em.query(
      `SELECT r.[id] AS [requestId], t.[id], t.[assigneeRole] AS [role], t.[status], CONVERT(nvarchar(10), t.[dueDate], 23) AS [dueDate]
         FROM [requests] r INNER JOIN [tasks] t ON t.[id] = r.[executionTaskId] WHERE r.[id] IN (${marks})`, part)
    for (const row of tasks) {
      const open = (TASK_OPEN_STATUSES as readonly string[]).includes(row.status)
      out.get(Number(row.requestId))!.executionTask = {
        id: Number(row.id), status: row.status, dueDate: row.dueDate ?? null, overdue: open && !!row.dueDate && row.dueDate < today,
        assignee: row.role ? TASK_ROLE_LABELS[row.role as keyof typeof TASK_ROLE_LABELS] ?? row.role : null,
      }
    }
  }
  return out
}
