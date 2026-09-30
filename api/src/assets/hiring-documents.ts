import { EntityManager, In } from 'typeorm'
import { OnboardingTask, OnboardingTaskStatus } from '../onboarding/onboarding.entities'
import { DocType, EmployeeDocument } from './assets.entities'
import { HiringDocumentReminder } from './hiring-document-reminder.entity'

// «مسوغات التعيين» (طلب المالك 30 سبتمبر — ترحيل 075): أنواع المستندات المعلَّمة «مطلوب للتعيين» في «أنواع المستندات»
// لازم كل موظف يكون عنده منها مستند بملف مرفوع. النوع المعطَّل مابيتحسبش، والانتهاء مش شرط هنا (له تنبيه الانتهاء بتاعه).
// الحساب ده مصدر واحد لتقرير النواقص والتذكير وإشعار الموظف و«مستنداتي» ومهمة النظام في التهيئة.

export interface HiringDocType {
  code: string
  nameAr: string
}

export interface HiringDocsStatus {
  required: HiringDocType[]
  present: HiringDocType[]
  missing: HiringDocType[]
}

// مهمة النظام في قائمة تهيئة كل موظف جديد (جهة الموارد البشرية) — حالتها من المستندات نفسها
export const HIRING_DOCS_TASK_KEY = 'HIRING_DOCS'
export const HIRING_DOCS_TASK_LABEL = 'استلام مسوغات التعيين'

// عمود missingDocTypes في hiring_document_reminders
export const REMINDER_CODES_MAX = 400

// دفعات تحت حد معاملات SQL Server (2100) — الأكواد المطلوبة قليلة وبتتضاف لكل دفعة
const CHUNK = 1000
const chunks = <T>(list: T[]): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += CHUNK) out.push(list.slice(i, i + CHUNK))
  return out
}
// نفس مقارنة القاعدة (بلا فرق حروف كبيرة/صغيرة ولا مسافات على الأطراف): مستند قديم نوعه 'Contract' = 'contract'
const codeKey = (code: string) => String(code).trim().toLowerCase()
const cleanIds = (ids: number[]) => [...new Set(ids)].filter(id => Number.isSafeInteger(id) && id > 0)

/** الأنواع المطلوبة للتعيين والمفعّلة، بترتيب الكتالوج. */
export async function requiredHiringDocTypes(manager: EntityManager): Promise<HiringDocType[]> {
  const rows = await manager.find(DocType, { where: { requiredForHiring: true, isActive: true }, order: { id: 'ASC' } })
  return rows.map(row => ({ code: row.code, nameAr: row.nameAr }))
}

/**
 * حالة مسوغات التعيين لكل موظف: الموجود = عنده مستند من النوع بملف مرفوع (fileRef مش فاضي)، والناقص الباقي.
 * required اختياري لو المنادي قراه قبل كده (نفس القراءة لكل الموظفين).
 */
export async function hiringDocumentsStatus(manager: EntityManager, employeeIds: number[],
  required?: HiringDocType[]): Promise<Map<number, HiringDocsStatus>> {
  const wanted = required ?? await requiredHiringDocTypes(manager)
  const ids = cleanIds(employeeIds)
  const have = new Map<number, Set<string>>()
  if (wanted.length && ids.length) {
    const codes = [...new Set(wanted.map(type => type.code))]
    for (const part of chunks(ids)) {
      const rows: Array<{ employeeId: number; docType: string }> = await manager.createQueryBuilder(EmployeeDocument, 'd')
        .select('d.employeeId', 'employeeId').addSelect('d.docType', 'docType').distinct(true)
        .where('d.employeeId IN (:...ids)', { ids: part })
        .andWhere('d.docType IN (:...codes)', { codes })
        .andWhere("d.fileRef IS NOT NULL AND LTRIM(RTRIM(d.fileRef)) <> ''")
        .getRawMany()
      for (const row of rows) {
        const employeeId = Number(row.employeeId)
        const set = have.get(employeeId) ?? new Set<string>()
        set.add(codeKey(row.docType))
        have.set(employeeId, set)
      }
    }
  }
  const out = new Map<number, HiringDocsStatus>()
  for (const id of ids) {
    const mine = have.get(id) ?? new Set<string>()
    out.set(id, {
      required: wanted,
      present: wanted.filter(type => mine.has(codeKey(type.code))),
      missing: wanted.filter(type => !mine.has(codeKey(type.code))),
    })
  }
  return out
}

/** «عقد عمل، فيش وتشبيه» */
export const hiringDocNames = (types: HiringDocType[]) => types.map(type => type.nameAr).join('، ')

/** أكواد الناقص للتذكير كـJSON في حدود العمود (400 حرف): الأكواد اللي تكفّي بالترتيب — الإشعار نفسه بالناقص الحالي مش باللقطة دي. */
export function reminderCodesJson(codes: string[], max = REMINDER_CODES_MAX): string {
  const kept: string[] = []
  for (const code of codes) {
    if (JSON.stringify([...kept, code]).length > max) break
    kept.push(code)
  }
  return JSON.stringify(kept)
}

/** رسالة رفض قفل مهمة «استلام مسوغات التعيين» والناقص موجود — بتقول الناقص وتعمل إيه. */
export const hiringDocsTaskBlockedMessage = (missing: HiringDocType[]) =>
  `مهمة «${HIRING_DOCS_TASK_LABEL}» مش هتتقفل غير لما كل المستندات المطلوبة تترفع — ناقص: ${hiringDocNames(missing)}. ` +
  'ارفعها من «مستندات الموظفين» والمهمة هتكتمل لوحدها'

/**
 * إشعار الموظف (مشتق وقت القراءة): فيه تذكير من الموارد البشرية ولسه فيه ناقص → «ناقصك من مسوغات التعيين: …» بالناقص الحالي.
 * مفتاحه رقم آخر تذكير: الشطب بيفضل لحد تذكير جديد، والإشعار بيختفي لوحده لما مايبقاش فيه ناقص.
 */
export async function hiringDocumentsNotification(manager: EntityManager, employeeId: number | null | undefined) {
  if (!employeeId) return null
  const [latest] = await manager.find(HiringDocumentReminder, { where: { employeeId }, order: { id: 'DESC' }, take: 1 })
  if (!latest) return null
  const missing = (await hiringDocumentsStatus(manager, [employeeId])).get(employeeId)?.missing ?? []
  if (!missing.length) return null
  return {
    id: `hiring-docs-reminder-${latest.id}`,
    category: 'document' as const,
    kind: 'warning',
    title: `ناقصك من مسوغات التعيين: ${hiringDocNames(missing)}`.slice(0, 300),
    body: 'سلّم المستندات دي للموارد البشرية عشان تترفع على ملفك — والمطلوب منك كله في «مستنداتي»',
    at: latest.sentAt,
    link: '/my/documents',
  }
}

/** صف مهمة النظام لموظف في قائمة التهيئة — موعدها يوم المباشرة (أو النهارده لو مفيش تاريخ التحاق). */
export const hiringDocsTaskRow = (employee: { id: number; joinDate?: string | null }, today: string) => ({
  employeeId: employee.id,
  templateItemId: null,
  label: HIRING_DOCS_TASK_LABEL,
  party: 'hr' as const,
  dueDate: employee.joinDate ? String(employee.joinDate).slice(0, 10) : today,
  sortOrder: 0,
  status: 'PENDING' as OnboardingTaskStatus,
  systemKey: HIRING_DOCS_TASK_KEY,
})

/**
 * إعادة حساب مهمة «استلام مسوغات التعيين» للموظفين دول: مفيش ناقص → DONE (تلقائي، من غير اسم)، فيه ناقص → PENDING.
 * المكتملة من قبل بتفضل بمين قفلها وإمتى. التحديث مشروط بالحالة اللي اتقرت (مايكتبش فوق تغيير متزامن)، والمنادي
 * بيقرا المهام من جديد بعدها. بترجّع حالة المستندات للموظفين اللي عندهم المهمة.
 */
export async function syncHiringDocsTasks(manager: EntityManager, employeeIds: number[],
  required?: HiringDocType[]): Promise<Map<number, HiringDocsStatus>> {
  const ids = cleanIds(employeeIds)
  const tasks: OnboardingTask[] = []
  for (const part of chunks(ids)) {
    tasks.push(...await manager.find(OnboardingTask, { where: { employeeId: In(part), systemKey: HIRING_DOCS_TASK_KEY } }))
  }
  if (!tasks.length) return new Map()
  const status = await hiringDocumentsStatus(manager, tasks.map(task => task.employeeId), required)
  for (const task of tasks) {
    const complete = (status.get(task.employeeId)?.missing.length ?? 0) === 0
    const wanted: OnboardingTaskStatus = complete ? 'DONE' : 'PENDING'
    if (task.status === wanted && (complete || (task.doneBy == null && task.doneAt == null))) continue
    await manager.update(OnboardingTask, { id: task.id, status: task.status },
      { status: wanted, doneBy: null, doneAt: complete ? new Date() : null })
  }
  return status
}
