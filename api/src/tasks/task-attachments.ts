import { BadRequestException, Logger, NotFoundException } from '@nestjs/common'
import { In, IsNull, type EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { User } from '../auth/user.entity'
import { Employee } from '../employees/employee.entity'
import { StoredFile } from '../files/stored-file.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { ApproverResolver } from '../requests/approver-resolver.service'
import { TaskAttachment } from './task-attachment.entity'
import { taskExtrasOf } from './task-extras'
import { taskAttachmentsVisibleTo, taskIdChunks, tasksTableReady, TASK_FILE_NOT_FOUND, type TaskStructure } from './task-rules'
import { Task } from './task.entity'

// B-ADD.19 (كلمة المالك 12 أكتوبر 2026: «وأنا برفع مهمة لحد من الناس اللي عندي أقدر أرفق شيت إكسل أو فايل، أيًّا كان الفايل، عشان نستغني
// شوية عن الإيميلات»): مرفقات المهمة على تخزين الملفات القايم (stored_files وواجهة التخزين وإعدادي الحجم والأنواع) — من غير تخزين جديد.
//  الملف بيترفع من POST /files/upload بتصنيف task_attachment (من غير رقم كيان ولا موظف)، وبيفضل لرافعه بس لحد ما يتربط بمهمة: مع إنشاء
//  المهمة (ومع المهمة الجماعية بيتربط بكل مهامها)، أو بعدها من اللي بيديرها أو من مسؤولها. الربط مرة واحدة (stored_files.entityId بيتختم
//  بأول مهمة)، وصف لكل مهمة في جدول task_attachments (ترحيل 194).
//  القراءة والتحميل بحكم المهمة: اللي يشوف المهمة، واللي فوق مسؤولها في الهيكل (taskAttachmentsVisibleTo) — برّه كده «غير موجود».
//  الشيل: اللي رفع المرفق أو اللي بيدير المهمة؛ الصف بيتختم (مين وإمتى) والملف بيفضل على التخزين.
//  الكود بيشتغل قبل الترحيل: المهام زي ما هي، والمرفقات مقفولة برسالتها.

export const TASK_ATTACHMENTS_MIGRATION_MISSING = 'مرفقات المهام محتاجة ترحيل 20261012_194 على قاعدة البيانات'
/** تصنيف الملف في stored_files */
export const TASK_ATTACHMENT_FILE_TYPE = 'task_attachment'
/** شيل مرفق مش على المهمة (للي يشوف المهمة — التحميل نفسه بيرد برد الملف الغايب) */
export const TASK_ATTACHMENT_NOT_FOUND = 'المرفق غير موجود'
export const TASK_ATTACHMENT_INVALID = 'مرفق غير صالح — ارفعه من خانة مرفقات المهمة نفسها'
/** أقصى مرفقات سارية على المهمة الواحدة (عدد، مش حجم: الحجم والأنواع من إعدادات الملفات) */
export const TASK_ATTACHMENTS_MAX = 20

const logger = new Logger('Tasks')
let ready: boolean | null = null, warned = false

/** جدول ترحيل 194 موجود؟ الموجود بيتحفظ (المخطط مابيتشالش). الناقص مابيتحفظش: بيتفحص مع كل نداء (قاعدة CRP2N) */
export async function taskAttachmentsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.task_attachments', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  if (!ready && !warned) { warned = true; logger.warn(TASK_ATTACHMENTS_MIGRATION_MISSING + ' — المهام شغالة زي ما هي من غير مرفقات لحد ما يتطبق') }
  return ready
}

/** للاختبارات: نسيان حالة الجدول */
export function resetTaskAttachmentsCache() { ready = null; warned = false }

/**
 * اسم المرفق زي ما اللي رفعه سمّاه: multer بيقرا الأسماء العربي latin1، فالاسم بيترجع UTF-8 لو كان كده (نفس معالجة التعديل الجماعي للموظفين
 * والتوظيف والبريد) — «خطة الشهر.xlsx» بتتعرض باسمها مش برموز.
 */
export function taskAttachmentName(name: unknown): string {
  const raw = String(name ?? '').slice(0, 300)
  if (/[À-ÿ]/.test(raw)) {
    const decoded = Buffer.from(raw, 'latin1').toString('utf8')
    if (!decoded.includes('�')) return decoded
  }
  return raw || 'مرفق'
}

/** أرقام الملفات المبعوتة: قايمة أرقام صحيحة موجبة من غير تكرار، لحد أقصى المرفقات (من غير خانة = فاضية) */
export function cleanAttachmentIds(raw: unknown): number[] {
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw) || raw.some(id => !Number.isSafeInteger(id) || id < 1 || id > 2147483647)) throw new BadRequestException('أرقام المرفقات غير صالحة')
  const ids = [...new Set(raw as number[])].sort((a, b) => a - b)
  if (ids.length > TASK_ATTACHMENTS_MAX) throw new BadRequestException(`${TASK_ATTACHMENTS_MAX} مرفق بالكتير على المهمة`)
  return ids
}

/**
 * ربط ملفات مرفوعة بمهام (المنادي جوه معاملته وماسك صفوف المهام دي، ومتأكد إن الترحيل موجود). الملف لازم يكون رفعه الحساب نفسه بتصنيف
 * task_attachment ولسه مش مربوط: الختم على stored_files.entityId بيتم بشرطه في جملة واحدة، فربطين لنفس الملف في نفس اللحظة واحد بس بياخده
 * ورقم ملف مخمَّن (بتاع حد تاني أو من تصنيف تاني) مايتربطش. وبعد الختم صف لكل مهمة. بترجّع أسماء الملفات (لسطر سجل المهمة).
 */
export async function bindTaskAttachments(em: EntityManager, user: Pick<JwtPayload, 'sub'>, taskIds: readonly number[], fileIds: readonly number[]): Promise<string[]> {
  if (!fileIds.length || !taskIds.length) return []
  const names: string[] = [], now = new Date()
  for (const fileId of fileIds) {
    const bound: Array<{ originalName: string }> = await em.query(`UPDATE [stored_files] SET [entityId] = @0 OUTPUT INSERTED.[originalName] AS [originalName]
      WHERE [id] = @1 AND [entityType] = N'${TASK_ATTACHMENT_FILE_TYPE}' AND [entityId] IS NULL AND [uploadedBy] = @2`, [taskIds[0], fileId, user.sub])
    if (!bound.length) throw new BadRequestException(TASK_ATTACHMENT_INVALID)
    names.push(bound[0].originalName)
    // بدفعات: المهمة الجماعية ممكن تبقى لمئات
    for (const part of taskIdChunks(taskIds, 300)) {
      await em.getRepository(TaskAttachment).insert(part.map(taskId => ({ taskId, fileId, uploadedByUserId: user.sub, createdAt: now, removedAt: null, removedByUserId: null })))
    }
  }
  return names
}

export interface TaskAttachmentRow { fileId: number; name: string; size: number; uploadedByUserId: number; uploadedByName: string | null; uploadedAt: Date }

/** المرفقات السارية لمهام بأرقامها (الأقدم الأول). قبل الترحيل: فاضية من غير ما تلمس الجدول. المنادي هو اللي حكم إن الحساب يشوفها */
export async function taskAttachmentsOf(em: EntityManager, taskIds: readonly number[]): Promise<Map<number, TaskAttachmentRow[]>> {
  const out = new Map<number, TaskAttachmentRow[]>()
  const wanted = [...new Set(taskIds.filter(id => Number.isSafeInteger(id) && id > 0))]
  if (!wanted.length || !(await taskAttachmentsReady(em))) return out
  const links: TaskAttachment[] = []
  for (const part of taskIdChunks(wanted)) links.push(...await em.getRepository(TaskAttachment).find({ where: { taskId: In(part), removedAt: IsNull() }, order: { id: 'ASC' } }))
  if (!links.length) return out
  const files = new Map<number, Pick<StoredFile, 'id' | 'originalName' | 'size'>>()
  for (const part of taskIdChunks([...new Set(links.map(row => row.fileId))])) {
    for (const file of await em.getRepository(StoredFile).find({ where: { id: In(part), entityType: TASK_ATTACHMENT_FILE_TYPE }, select: { id: true, originalName: true, size: true } })) files.set(file.id, file)
  }
  const accounts = new Map<number, string | null>()
  for (const part of taskIdChunks([...new Set(links.map(row => row.uploadedByUserId))])) {
    for (const account of await em.getRepository(User).find({ where: { id: In(part) }, select: { id: true, displayName: true } })) accounts.set(account.id, account.displayName ?? null)
  }
  for (const link of links) {
    const file = files.get(link.fileId)
    if (!file) continue
    const row = { fileId: link.fileId, name: file.originalName, size: file.size, uploadedByUserId: link.uploadedByUserId, uploadedByName: accounts.get(link.uploadedByUserId) ?? null, uploadedAt: link.createdAt }
    out.set(link.taskId, [...(out.get(link.taskId) ?? []), row])
  }
  return out
}

/** عدد المرفقات السارية على مهمة (المنادي ماسك صفها) */
export const activeTaskAttachments = (em: EntityManager, taskId: number): Promise<number> => em.getRepository(TaskAttachment).count({ where: { taskId, removedAt: IsNull() } })

/**
 * تحميل مرفق مهمة (/files/:id) بحكم المهمة:
 *  - ملف لسه ماتربطش بمهمة: لرافعه بس (عشان يربطه).
 *  - ملف مربوط: للي يشوف مرفقات مهمة من المهام اللي هو مرفق ساري عليها دلوقتي (taskAttachmentsVisibleTo) — حتى رافعه بنفس الحكم (حسابه
 *    اتغيّر ربطه أو فقد حقه على المهمة = مايحمّلش). مرفق اتشال من كل مهامه مابيتحمّلش.
 * لا كاشف وجود: برّه كده نفس رد الملف الغايب بالحرف (رقم ملف مخمَّن مايتعرفش منه إنه مرفق مهمة). وقبل الترحيل مفيش ربط أصلًا: لرافعه بس.
 */
export async function assertTaskAttachmentFileAccess(em: EntityManager, user: JwtPayload, file: Pick<StoredFile, 'id' | 'uploadedBy' | 'entityId'>): Promise<void> {
  const missing = () => new NotFoundException(TASK_FILE_NOT_FOUND)
  if (file.entityId == null) {
    if (!!user.sub && file.uploadedBy === user.sub) return
    throw missing()
  }
  if (!(await tasksTableReady(em)) || !(await taskAttachmentsReady(em))) throw missing()
  const links = await em.getRepository(TaskAttachment).find({ where: { fileId: file.id, removedAt: IsNull() }, select: { id: true, taskId: true }, order: { id: 'ASC' } })
  if (!links.length) throw missing()
  const resolver = new ApproverResolver(em.getRepository(Employee), em.getRepository(Team), em.getRepository(Department), em.getRepository(Branch))
  // ملف المهمة الجماعية على مهام كتير (لحد 300): «اللي تحتي» بتتحسب مرة واحدة للتحميل كله بدل حل هيكلي لكل مهمة. الحكم نفسه واحد
  // (taskAttachmentsVisibleTo): «تحتي؟» من المجموعة، والمدير المباشر مابيتحلّش غير لحد تحتي (المدير المباشر لموظف = الموظف تحته بالتعريف)
  const under = new Set(user.employeeId ? await resolver.subordinatesOf(user.employeeId) : [])
  const structure: TaskStructure = {
    directManagerOf: async employeeId => (under.has(employeeId) ? resolver.directManagerOf(employeeId) : null),
    isUnder: async (employeeId, managerEmployeeId) => (managerEmployeeId === user.employeeId ? under.has(employeeId) : resolver.isUnder(employeeId, managerEmployeeId)),
  }
  // مهمة الحساب نفسه (مسؤولها) الأول، وبعدها الباقي بدفعات لحد أول مهمة يشوف مرفقاتها
  const taskIds = links.map(row => row.taskId)
  for (const part of taskIdChunks(taskIds, 200)) {
    const tasks = await em.getRepository(Task).find({ where: { id: In(part) } })
    const extras = await taskExtrasOf(em, tasks.map(task => task.id))
    tasks.sort((a, b) => Number(b.assigneeEmployeeId === user.employeeId) - Number(a.assigneeEmployeeId === user.employeeId) || a.id - b.id)
    for (const task of tasks) {
      if ((await taskAttachmentsVisibleTo(user, { ...task, isPersonal: extras.get(task.id)?.isPersonal ?? false }, structure)).visible) return
    }
  }
  throw missing()
}
