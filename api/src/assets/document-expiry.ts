import { BadRequestException } from '@nestjs/common'
import { In, type DataSource, type EntityManager } from 'typeorm'
import { recordOutboxEvent } from '../queue/outbox'
import { isCurrentEmployee } from '../reports/metrics'
import { FUNCTIONAL_APPROVER_ROLES } from '../requests/approver-resolver.service'
import { recordTaskLog } from '../tasks/task-extras'
import { Task, TASK_OPEN_STATUSES } from '../tasks/task.entity'
import { tasksTableReady } from '../tasks/task-rules'

// B2.15: صلاحية المستندات — إعدادات نوع المستند (له انتهاء، أيام التنبيه، الدور المسؤول)، والتنبيه (حدث وإشعار للموظف ومهمة
// تجديد على المسؤول)، وقفل مهمة التجديد لما المستند يتجدد. الأعمدة الجديدة (ترحيل 099) برّه قراءة وكتابة الكيانات: بتتقري
// وتتكتب من هنا بـSQL بعد فحص وجودها، فالكود شغال قبل الترحيل (من غير إعدادات: التنبيه على 30 يوم ومن غير مهمة).

export const DOCUMENT_EXPIRY_MIGRATION_MISSING = 'إعدادات انتهاء المستندات محتاجة ترحيل 20261007_099 على قاعدة البيانات'
export const DOCUMENT_EXPIRY_REQUIRED = 'نوع المستند ده له تاريخ انتهاء: اكتب تاريخ الانتهاء'
/** أيام التنبيه لنوع من غير إعداد — نافذة حدث «مستند هينتهي» القايمة (B2.3) */
export const DOCUMENT_ALERT_DEFAULT_DAYS: readonly number[] = [30]
export const DOCUMENT_ALERT_DAYS_MAX = 5
export const DOCUMENT_ALERT_DAY_LIMIT = 365
export const DOCUMENT_RENEWED_NOTE = 'اتجدد المستند'

export interface DocTypeExpiry { hasExpiry: boolean; alertDays: number[]; ownerRole: string | null }
export interface DocTypeExpiryRow extends DocTypeExpiry { id: number; code: string; nameAr: string; isActive: boolean }

let ready: boolean | null = null
/** أعمدة ترحيل 099 موجودة؟ الموجود بيتحفظ (المخطط مابيتشالش). الناقص مابيتحفظش: بيتفحص مع كل نداء لحد ما الترحيل يتطبق. */
export async function documentExpiryReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN COL_LENGTH(N'dbo.doc_types', N'hasExpiry') IS NOT NULL AND COL_LENGTH(N'dbo.doc_types', N'alertDays') IS NOT NULL
    AND COL_LENGTH(N'dbo.doc_types', N'ownerRole') IS NOT NULL AND COL_LENGTH(N'dbo.employee_documents', N'renewalTaskId') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الأعمدة */
export function resetDocumentExpiryCache() { ready = null }

const validDay = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= DOCUMENT_ALERT_DAY_LIMIT

/** أيام التنبيه من نصها المحفوظ («60,30,7»): أرقام صالحة فريدة من الأكبر للأصغر؛ الفاضي أو الغلط كله = الافتراضي (30). */
export function parseAlertDays(text: unknown): number[] {
  const days = [...new Set(String(text ?? '').split(',').map(part => Number(part.trim())).filter(validDay))].sort((a, b) => b - a).slice(0, DOCUMENT_ALERT_DAYS_MAX)
  return days.length ? days : [...DOCUMENT_ALERT_DEFAULT_DAYS]
}

/** مدخل الشاشة (قايمة أرقام أو نص بفواصل) للنص المحفوظ؛ الفاضي = null (الافتراضي). قيمة غلط = 400. */
export function alertDaysInput(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '' || (Array.isArray(raw) && raw.length === 0)) return null
  const parts = Array.isArray(raw) ? raw : String(raw).split(',').map(part => part.trim()).filter(part => part !== '')
  const days = parts.map(part => (typeof part === 'number' ? part : /^\d{1,3}$/.test(String(part)) ? Number(part) : NaN))
  if (!days.length || days.some(day => !validDay(day))) throw new BadRequestException(`أيام التنبيه أرقام من 1 لـ${DOCUMENT_ALERT_DAY_LIMIT}`)
  const unique = [...new Set(days as number[])].sort((a, b) => b - a)
  if (unique.length > DOCUMENT_ALERT_DAYS_MAX) throw new BadRequestException(`أيام التنبيه ${DOCUMENT_ALERT_DAYS_MAX} بالكتير`)
  return unique.join(',')
}

/**
 * يوم التنبيه اللي المستند وصله: أصغر يوم في القايمة أكبر من أو يساوي الباقي (باقي 25 والقايمة 60 و30 و7 = تنبيه الـ30).
 * null = لسه بدري (الباقي أكبر من كل الأيام) أو المستند انتهى (مفيش تنبيه جديد بعد الانتهاء).
 */
export function alertThreshold(days: readonly number[], daysLeft: number): number | null {
  if (daysLeft < 0) return null
  const reached = days.filter(day => day >= daysLeft)
  return reached.length ? Math.min(...reached) : null
}

export const daysUntil = (today: string, date: string): number => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000)

/** مستند أحدث من نفس النوع لنفس الموظف بتاريخ انتهاء أبعد = المستند ده متبدّل (مابيتنبّهش عليه ومابيظهرش منتهي). d = alias المستند */
export const supersededSql = (d: string): string =>
  `EXISTS (SELECT 1 FROM [employee_documents] newer WHERE newer.[employeeId] = ${d}.[employeeId] AND newer.[docType] = ${d}.[docType] AND newer.[expiryDate] > ${d}.[expiryDate])`

/** أنواع المستندات بإعدادات انتهائها (بالكود). قبل الترحيل: الافتراضي لكل نوع. */
export async function docTypeExpirySettings(em: EntityManager): Promise<Map<string, DocTypeExpiryRow>> {
  const columns = await documentExpiryReady(em)
  const rows: Array<Record<string, any>> = await em.query(`SELECT [id], [code], [nameAr], [isActive]${columns ? ', [hasExpiry], [alertDays], [ownerRole]' : ''} FROM [doc_types]`)
  return new Map(rows.map(row => [String(row.code), {
    id: Number(row.id), code: String(row.code), nameAr: String(row.nameAr), isActive: row.isActive === true || row.isActive === 1,
    hasExpiry: row.hasExpiry === true || row.hasExpiry === 1, alertDays: parseAlertDays(row.alertDays),
    ownerRole: row.ownerRole && (FUNCTIONAL_APPROVER_ROLES as readonly string[]).includes(String(row.ownerRole)) ? String(row.ownerRole) : null,
  }]))
}

/** حفظ إعدادات انتهاء نوع (الحقول المبعوتة بس). */
export async function writeDocTypeExpiry(em: EntityManager, id: number, input: { hasExpiry?: unknown; alertDays?: unknown; ownerRole?: unknown }): Promise<void> {
  if (!(await documentExpiryReady(em))) throw new BadRequestException(DOCUMENT_EXPIRY_MIGRATION_MISSING)
  const sets: string[] = [], params: unknown[] = [id]
  const set = (column: string, value: unknown) => { params.push(value); sets.push(`[${column}] = @${params.length - 1}`) }
  if (input.hasExpiry !== undefined) {
    if (typeof input.hasExpiry !== 'boolean') throw new BadRequestException('«له تاريخ انتهاء» يقبل true أو false بس')
    set('hasExpiry', input.hasExpiry ? 1 : 0)
  }
  if (input.alertDays !== undefined) set('alertDays', alertDaysInput(input.alertDays))
  if (input.ownerRole !== undefined) {
    const role = input.ownerRole === null || input.ownerRole === '' ? null : input.ownerRole
    if (role !== null && !(FUNCTIONAL_APPROVER_ROLES as readonly string[]).includes(String(role))) throw new BadRequestException('الدور المسؤول غير معروف')
    set('ownerRole', role)
  }
  if (sets.length) await em.query(`UPDATE [doc_types] SET ${sets.join(', ')} WHERE [id] = @0`, params)
}

/**
 * تنبيهات انتهاء المستندات (شغل مهمة documents.expiry-events): لكل مستند وصل ليوم تنبيه لسه ماطلعش — حدث «مستند هينتهي» مرة واحدة
 * لليوم ده (محرك الإشعارات بيبلّغ صاحبه)، ومهمة «تجديد مستند» على حاملي الدور المسؤول في فرع الموظف لو مفيش واحدة مفتوحة.
 * كل مستند في معاملته وتحت قفل صفه: التاريخ والربط بيتقروا بعد القفل، فتعديل متزامن للمستند مايطلّعش تنبيه بتاريخ قديم.
 */
export async function raiseDocumentAlerts(ds: DataSource, today: string): Promise<{ events: number; tasks: number }> {
  const result = { events: 0, tasks: 0 }
  const settings = await docTypeExpirySettings(ds.manager)
  const widest = Math.max(...DOCUMENT_ALERT_DEFAULT_DAYS, ...[...settings.values()].flatMap(type => type.alertDays))
  const candidates: Array<{ id: number }> = await ds.query(`SELECT d.[id] FROM [employee_documents] d
    WHERE d.[expiryDate] IS NOT NULL AND d.[expiryDate] >= CONVERT(date, @0, 23) AND d.[expiryDate] <= DATEADD(day, @1, CONVERT(date, @0, 23)) AND NOT ${supersededSql('d')}
    ORDER BY d.[expiryDate], d.[id]`, [today, widest])
  for (const { id } of candidates) {
    await ds.transaction(async em => {
      const linked = await documentExpiryReady(em)
      const [doc]: Array<Record<string, any>> = await em.query(`SELECT d.[id], d.[employeeId], d.[docType], CONVERT(nvarchar(10), d.[expiryDate], 23) AS [expiryDate]${
        linked ? ', d.[renewalTaskId]' : ''} FROM [employee_documents] d WITH (UPDLOCK, ROWLOCK) WHERE d.[id] = @0`, [id])
      if (!doc?.expiryDate) return
      const [employee]: Array<Record<string, any>> = await em.query('SELECT [id], [fullName], [branchId], [status], [isActive] FROM [employees] WHERE [id] = @0', [doc.employeeId])
      // موظف خرج (مؤرشف أو منتهية خدمته أو ملفه مقفول): مستنداته مابتتنبّهش
      if (!employee || !isCurrentEmployee(employee as { status: string; isActive: unknown })) return
      const type = settings.get(String(doc.docType))
      const threshold = alertThreshold(type?.alertDays ?? DOCUMENT_ALERT_DEFAULT_DAYS, daysUntil(today, doc.expiryDate))
      if (threshold === null) return
      const branchId = employee.branchId == null ? null : Number(employee.branchId)
      // مفتاح الحدث بالمستند وتاريخه ويوم التنبيه: مرة واحدة لكل يوم تنبيه، وتاريخ جديد = تنبيهات جديدة
      const fresh = await recordOutboxEvent(em, { type: 'DOCUMENT_EXPIRING', entityType: 'employee_document', entityId: Number(doc.id),
        key: `document-expiring:${doc.id}:${doc.expiryDate}:${threshold}`,
        payload: { documentId: Number(doc.id), employeeId: Number(doc.employeeId), expiryDate: doc.expiryDate, branchId, threshold } })
      if (!fresh) return
      result.events += 1
      if (!linked || !type?.ownerRole || branchId === null || !(await tasksTableReady(em))) return
      const tasks = em.getRepository(Task)
      if (doc.renewalTaskId && await tasks.findOne({ where: { id: Number(doc.renewalTaskId), status: In([...TASK_OPEN_STATUSES]) }, select: { id: true } })) return
      const now = new Date()
      const task = await tasks.save(tasks.create({
        title: `تجديد مستند: ${type.nameAr} — ${employee.fullName}`.slice(0, 200), description: null, assigneeEmployeeId: null, assigneeRole: type.ownerRole,
        branchId, createdByUserId: 0, dueDate: doc.expiryDate, priority: 'NORMAL', status: 'OPEN', requiresProof: false, proofNote: null, proofFileId: null,
        statusNote: null, closedByUserId: null, closedAt: null, remindedAt: null, escalatedAt: null, createdAt: now, updatedAt: now,
      }))
      await em.query('UPDATE [employee_documents] SET [renewalTaskId] = @1 WHERE [id] = @0', [doc.id, task.id])
      // نفس حدث التكليف بتاع محرك المهام (مراجع بس): بريد «مهمة جديدة عليك» لحاملي الدور
      await recordOutboxEvent(em, { type: 'TASK_ASSIGNED', entityType: 'task', entityId: task.id, payload: { taskId: task.id, branchId: task.branchId } })
      result.tasks += 1
    })
  }
  return result
}

/**
 * المستند اتجدد (تاريخ انتهائه اتأخّر): مهمة تجديده المفتوحة بتتقفل «خلصت» وربطها بيتفك، فانتهاء جاي يفتح مهمة جديدة.
 * جوه معاملة تعديل المستند، وبقفل صف المستند ثم صف المهمة. بترجّع true لو مهمة اتقفلت.
 */
export async function closeRenewalTask(em: EntityManager, documentId: number, actor: { sub: number; employeeId?: number | null }): Promise<boolean> {
  if (!(await documentExpiryReady(em)) || !(await tasksTableReady(em))) return false
  const [doc]: Array<{ renewalTaskId: number | null }> = await em.query('SELECT [renewalTaskId] FROM [employee_documents] WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [documentId])
  if (!doc?.renewalTaskId) return false
  const tasks = em.getRepository(Task)
  const task = await tasks.findOne({ where: { id: Number(doc.renewalTaskId) }, lock: { mode: 'pessimistic_write' } })
  await em.query('UPDATE [employee_documents] SET [renewalTaskId] = NULL WHERE [id] = @0', [documentId])
  if (!task || !(TASK_OPEN_STATUSES as readonly string[]).includes(task.status)) return false
  const now = new Date()
  await tasks.update({ id: task.id }, { status: 'DONE', statusNote: DOCUMENT_RENEWED_NOTE, closedByUserId: actor.sub, closedAt: now, updatedAt: now })
  await recordTaskLog(em, actor, task, 'DONE', 'اتقفلت لوحدها: تاريخ انتهاء المستند اتجدد')
  return true
}
