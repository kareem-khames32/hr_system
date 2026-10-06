import { ConflictException } from '@nestjs/common'
import type { Response } from 'express'
import { pipeline } from 'node:stream'
import { In, type EntityManager } from 'typeorm'
import { fileStorage } from '../files/storage'
import { sha256OfStream, sha256VerifiedStream, STORED_FILE_CHANGED, type StreamDigest } from '../files/stored-file-hash'
import { recordOutboxEvent } from '../queue/outbox'
import { Task, TASK_OPEN_STATUSES } from '../tasks/task.entity'

// B2.7-ب (ترحيل 092): طلب إقرار الموظف بمستند صادر.
//  «مطلوب إقرار الموظف» وقت إصدار المستند بيسجّل الطلب على المستند نفسه (وقته، وموعده، وبصمة ملفه) وبيفتح مهمة «إقرار مستند» على
//  الموظف في محرك المهام (B2.5) في نفس معاملة الإصدار: «مهامي» والتذكير والتصعيد والبريد من المحرك، من غير حاجة موازية.
//  الإقرار سطر في hr_document_acknowledgements (إضافة بس) وبيقفل المهمة. والمهمة مابتتقفلش ولا بتتعدّل ولا بتتلغي من شاشة المهام.
//  أعمدة الطلب برّه الكيان للقراءة والكتابة (الكود بيشتغل قبل الترحيل)، فكل القراءة والكتابة هنا بـSQL صريح بعد التأكد من وجودها.
//  ترتيب القفل في الإقرار والإلغاء: صف المستند أولًا، وبعده الموظف (قفل مشاركة، في الإلغاء)، وبعده صف المهمة. وخطافات محرك المهام
//  مابتقفلش صف مهمة الإقرار خالص (مرفوضة من غير تغيير)، فمابتتعارضش معاهم.

export const DOCUMENT_ACK_MIGRATION_MISSING = 'إقرار المستندات محتاج ترحيل 20261006_092 على قاعدة البيانات'
/** عنوان المهمة عام من غير اسم القالب: المهمة بيشوفها مدير الموظف وأصحاب «عرض كل المهام»، واسم المستند مش ليهم */
export const DOCUMENT_ACK_TASK_TITLE = 'إقرار مستند'
export const DOCUMENT_ACK_TASK_BLOCKED = 'دي مهمة إقرار مستند: بتتقفل لوحدها لما الموظف يقرّ بيه من «مستنداتي»، ومابتتعدلش ولا بتتلغي من هنا'
export const DOCUMENT_ACK_CANCELLED_NOTE = 'طلب الإقرار اتلغى'
export const DOCUMENT_ACK_OWN_CANCEL = 'طلب الإقرار ده عليك إنت — يلغيه حساب تاني من الموارد البشرية'
export const DOCUMENT_FILE_MISMATCH = 'ملف المستند على التخزين مش مطابق للملف اللي اتصدر — بلّغ مسؤول النظام'

let ready: boolean | null = null

/** أعمدة طلب الإقرار وجدول الدليل موجودين (ترحيل 092) وجدول المهام موجود (088)؟ الموجود بيتحفظ (المخطط مابيتشالش). الناقص مابيتحفظش: بيتفحص مع
 * كل نداء، فعملية شغالة من قبل الترحيل بتشوفه أول ما يتطبق وماتكمّلش بحكم «قبل الترحيل» على حاجة اتعملت بعده (Codex CRP2N-B01). */
export async function documentAckSchemaReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN COL_LENGTH(N'dbo.hr_issued_documents', N'ackTaskId') IS NOT NULL
    AND OBJECT_ID(N'dbo.hr_document_acknowledgements', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.tasks', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}

/** للاختبارات: نسيان حالة الأعمدة */
export function resetDocumentAckSchemaCache() { ready = null }

export type DocumentAckState = 'PENDING' | 'OVERDUE' | 'ACKNOWLEDGED'

/** طلب إقرار قايم على مستند (الملغي مش طلب) */
export interface DocumentAckRequest {
  documentId: number
  requestedAt: Date
  dueDate: string | null
  taskId: number | null
  contentHash: string
  acknowledgedAt: Date | null
}

/** أقرّ، أو متأخر (موعده عدّى)، أو مستني */
export const documentAckState = (request: Pick<DocumentAckRequest, 'dueDate' | 'acknowledgedAt'>, today: string): DocumentAckState =>
  request.acknowledgedAt ? 'ACKNOWLEDGED' : request.dueDate && request.dueDate < today ? 'OVERDUE' : 'PENDING'

type RequestRow = { documentId: number; requestedAt: Date; dueDate: string | null; taskId: number | null; contentHash: string; acknowledgedAt: Date | null }
const REQUEST_SQL = `SELECT d.[id] AS [documentId], d.[ackRequestedAt] AS [requestedAt], CONVERT(nvarchar(10), d.[ackDueDate], 23) AS [dueDate], d.[ackTaskId] AS [taskId],
  d.[ackContentHash] AS [contentHash], a.[acknowledgedAt] AS [acknowledgedAt]
  FROM [hr_issued_documents] d LEFT JOIN [hr_document_acknowledgements] a ON a.[documentId] = d.[id] WHERE d.[ackRequestedAt] IS NOT NULL`
const requestOf = (row: RequestRow): DocumentAckRequest => ({ documentId: Number(row.documentId), requestedAt: row.requestedAt, dueDate: row.dueDate ?? null,
  taskId: row.taskId == null ? null : Number(row.taskId), contentHash: String(row.contentHash), acknowledgedAt: row.acknowledgedAt ?? null })

/** طلبات الإقرار القايمة على المستندات دي (رقم المستند ← طلبه) */
export async function documentAckRequests(em: EntityManager, documentIds: readonly number[]): Promise<Map<number, DocumentAckRequest>> {
  const out = new Map<number, DocumentAckRequest>()
  if (!documentIds.length || !(await documentAckSchemaReady(em))) return out
  for (let offset = 0; offset < documentIds.length; offset += 1000) {
    const part = documentIds.slice(offset, offset + 1000)
    const rows: RequestRow[] = await em.query(`${REQUEST_SQL} AND d.[id] IN (${part.map((_, index) => `@${index}`).join(', ')})`, [...part])
    for (const row of rows) out.set(Number(row.documentId), requestOf(row))
  }
  return out
}

/** طلب الإقرار القايم على المستند، بقفل صف المستند لحد آخر المعاملة لو lock */
export async function documentAckRequest(em: EntityManager, documentId: number, lock = false): Promise<DocumentAckRequest | null> {
  if (!(await documentAckSchemaReady(em))) return null
  // القفل على صف المستند قبل قراءة طلبه ودليله: إقرار وإلغاء في نفس اللحظة، التاني بيستنى وبيلاقي اللي حصل
  if (lock) await em.query(`SELECT [id] FROM [hr_issued_documents] WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0`, [documentId])
  const [row]: RequestRow[] = await em.query(`${REQUEST_SQL} AND d.[id] = @0`, [documentId])
  return row ? requestOf(row) : null
}

/** طلبات الإقرار القايمة على مستندات الموظف ده */
export async function documentAckRequestsOfEmployee(em: EntityManager, employeeId: number): Promise<DocumentAckRequest[]> {
  if (!(await documentAckSchemaReady(em))) return []
  const rows: RequestRow[] = await em.query(`${REQUEST_SQL} AND d.[employeeId] = @0 ORDER BY d.[id] DESC`, [employeeId])
  return rows.map(requestOf)
}

/**
 * تسجيل طلب الإقرار وفتح مهمته، جوه معاملة الإصدار نفسها. المهمة على الموظف في فرعه، و«اللي كلّف بيها» هو اللي أصدر المستند. التذكير
 * والتصعيد بقواعد محرك المهام زي أي مهمة: التأخير بيتبلّغ لمدير الموظف المباشر، وموظف من غير مدير متابعته من فلتر «إقرار متأخر» في السجل.
 */
export async function openDocumentAckRequest(em: EntityManager, input: { documentId: number; employeeId: number; branchId: number; issuedByUserId: number; dueDate: string | null; contentHash: string }) {
  const now = new Date()
  const repo = em.getRepository(Task)
  const task = await repo.save(repo.create({
    title: DOCUMENT_ACK_TASK_TITLE, description: null, assigneeEmployeeId: input.employeeId, assigneeRole: null, branchId: input.branchId, createdByUserId: input.issuedByUserId,
    dueDate: input.dueDate, priority: 'NORMAL', status: 'OPEN', requiresProof: false, proofNote: null, proofFileId: null, statusNote: null, closedByUserId: null, closedAt: null,
    remindedAt: null, escalatedAt: null, createdAt: now, updatedAt: now,
  }))
  await em.query(`UPDATE [hr_issued_documents] SET [ackRequestedAt] = @1, [ackDueDate] = @2, [ackTaskId] = @3, [ackContentHash] = @4 WHERE [id] = @0`,
    [input.documentId, now, input.dueDate, task.id, input.contentHash])
  // نفس حدث التكليف بتاع محرك المهام: بريد «مهمة جديدة عليك» للموظف
  await recordOutboxEvent(em, { type: 'TASK_ASSIGNED', entityType: 'task', entityId: task.id, payload: { taskId: task.id, branchId: task.branchId } })
}

/** قفل مهمة الإقرار المفتوحة مع الإقرار (خلصت) أو مع إلغاء الطلب (اتلغت) — مهمة اتقفلت قبل كده بتفضل زي ما هي */
export async function closeDocumentAckTask(em: EntityManager, taskId: number | null, userId: number, cancelled: boolean) {
  if (taskId == null) return
  await em.getRepository(Task).update({ id: taskId, status: In([...TASK_OPEN_STATUSES]) },
    { status: cancelled ? 'CANCELLED' : 'DONE', statusNote: cancelled ? DOCUMENT_ACK_CANCELLED_NOTE : null, closedByUserId: userId, closedAt: new Date(), updatedAt: new Date() })
}

/** إلغاء الطلب: المستند بيرجع من غير طلب قايم. رقم المهمة بيفضل عليه، فالمهمة الملغية بتفضل مهمة إقرار وماتتفتحش من شاشة المهام */
export async function clearDocumentAckRequest(em: EntityManager, documentId: number) {
  await em.query(`UPDATE [hr_issued_documents] SET [ackRequestedAt] = NULL, [ackDueDate] = NULL, [ackContentHash] = NULL WHERE [id] = @0`, [documentId])
}

export interface DocumentAckLink { documentId: number; employeeId: number | null }

/**
 * المهمة دي مربوطة بمستند (مهمة إقراره)؟ قراءة من غير انتظار على صف المستند، لبعد قفل صف المهمة: الربط بيتكتب مرة في معاملة الإصدار
 * (بعد صف المهمة) ومابيتشالش، فاللي قفل صف مهمة متثبّتة بيشوفه.
 */
export async function documentAckTaskLinked(em: EntityManager, taskId: number): Promise<boolean> {
  if (!(await documentAckSchemaReady(em))) return false
  const rows: unknown[] = await em.query(`SELECT TOP (1) [id] FROM [hr_issued_documents] WITH (NOLOCK) WHERE [ackTaskId] = @0`, [taskId])
  return rows.length > 0
}

/** المهمة دي مهمة إقرار مستند؟ (ولو طلبها اتلغى) */
export async function documentOfAckTask(em: EntityManager, taskId: number): Promise<DocumentAckLink | null> {
  return (await documentsOfAckTasks(em, [taskId])).get(taskId) ?? null
}

/** مهام الإقرار من المهام دي (رقم المهمة ← مستندها) */
export async function documentsOfAckTasks(em: EntityManager, taskIds: readonly number[]): Promise<Map<number, DocumentAckLink>> {
  const out = new Map<number, DocumentAckLink>()
  if (!taskIds.length || !(await documentAckSchemaReady(em))) return out
  for (let offset = 0; offset < taskIds.length; offset += 1000) {
    const part = taskIds.slice(offset, offset + 1000)
    const rows: Array<{ taskId: number; documentId: number; employeeId: number | null }> = await em.query(
      `SELECT [ackTaskId] AS [taskId], [id] AS [documentId], [employeeId] FROM [hr_issued_documents] WHERE [ackTaskId] IN (${part.map((_, index) => `@${index}`).join(', ')})`, [...part])
    for (const row of rows) out.set(Number(row.taskId), { documentId: Number(row.documentId), employeeId: row.employeeId == null ? null : Number(row.employeeId) })
  }
  return out
}

/** بصمة ملف المستند على التخزين دلوقتي بعد مطابقتها ببصمة طلب الإقرار: ملف اتبدّل = 409، فمحدش بيشوف ولا بيقرّ بمستند غير اللي اتصدر */
export async function verifiedDocumentFile(storedName: string, contentHash: string): Promise<StreamDigest> {
  const digest = await sha256OfStream(fileStorage().read(storedName))
  if (digest.sha256 !== contentHash) throw new ConflictException(DOCUMENT_FILE_MISMATCH)
  return digest
}

/**
 * إرسال الملف اللي اتحقق منه (مسار المستند ومسار الملفات العام): بالحجم المعلَن، وبتيار بيتطابق تاني وهو ماشي وبيقطع قبل ما يكمل لو الملف
 * اتبدّل بين القراءتين (onChanged). من غير فتح ملف لعميل قفل الاتصال، وبقفل الملف والرد لو الإرسال ماقدرش يبدأ. ترويسات المسار من headers.
 */
export function sendVerifiedFile(res: Response, storedName: string, verified: StreamDigest, headers: () => void, onChanged: () => void) {
  if (res.destroyed) return
  headers()
  res.setHeader('Content-Length', verified.size)
  const source = fileStorage().read(storedName)
  try {
    pipeline(source, sha256VerifiedStream(verified), res, error => { if (error?.message === STORED_FILE_CHANGED) onChanged() })
  } catch {
    source.destroy()
    res.destroy()
  }
}
