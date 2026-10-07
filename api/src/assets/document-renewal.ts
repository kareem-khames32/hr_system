import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import type { Request } from '../requests/entities/request.entity'
import type { RequestType } from '../requests/entities/request-type.entity'
import { closeRenewalTask } from './document-expiry'

// B2.15-ب: وجهة طلب «تجديد مستند» — الاعتماد بيحدّث تاريخ انتهاء مستند صاحب الطلب (أو بيسجّل المستند لو مش موجود) وبيقفل مهمة تجديده
// المفتوحة. نوع الطلب بياخد الوجهة دي من «أنواع الطلبات»؛ النوع المزروع «رفع/تجديد وثائق» بيفضل «تسجيل فقط» لحد ما تتحدد له.

export const DOCUMENT_RENEWAL_HANDLER = 'document_renewal'
export const DOCUMENT_RENEWAL_TYPE_MISSING = 'اختار نوع المستند من أنواع المستندات المفعّلة'
export const DOCUMENT_RENEWAL_EXPIRY = 'تاريخ الانتهاء الجديد لازم يكون تاريخ صحيح بعد النهارده'
export const DOCUMENT_RENEWAL_ISSUE = 'تاريخ الإصدار لازم يكون تاريخ صحيح مش بعد تاريخ الانتهاء'
export const DOCUMENT_RENEWAL_NUMBER = 'رقم المستند 100 حرف بالكتير'
/** مفاتيح بيكتبها الخادم وقت التقديم — مش من العميل */
export const DOCUMENT_RENEWAL_STAGED_KEYS = ['documentTypeCode'] as const

const listOf = (value: unknown): unknown[] => { try { const parsed = typeof value === 'string' ? JSON.parse(value) : value; return Array.isArray(parsed) ? parsed : [] } catch { return [] } }
const validDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const time = Date.parse(`${value}T12:00:00Z`)
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
}

/** أسماء أنواع المستندات المفعّلة — اختيارات حقل «نوع المستند» في النموذج */
export async function documentRenewalTypeNames(em: EntityManager): Promise<string[]> {
  const rows: Array<{ nameAr: string }> = await em.query('SELECT [nameAr] FROM [doc_types] WHERE [isActive] = 1 ORDER BY [nameAr]')
  return rows.map(row => String(row.nameAr))
}

/** حقول نموذج الطلب: حقول الوجهة الأول، وبعدها حقول الباني الخاصة (مفاتيح الوجهة والخادم محجوزة) */
export function documentRenewalFields(typeNames: string[], type: Pick<RequestType, 'requiredFields' | 'customFields'>): { requiredFields: string; customFields: string } {
  const own = [
    { key: 'documentType', label: 'نوع المستند', type: 'select', required: true, options: typeNames },
    { key: 'expiryDate', label: 'تاريخ الانتهاء الجديد', type: 'date', required: true },
    { key: 'documentNumber', label: 'رقم المستند الجديد (لو اتغيّر)', type: 'text', required: false },
    { key: 'issueDate', label: 'تاريخ الإصدار', type: 'date', required: false },
  ]
  const reserved: string[] = [...own.map(field => field.key), ...DOCUMENT_RENEWAL_STAGED_KEYS]
  const extra = listOf(type.customFields).filter((field): field is { key: string } => !!field && typeof field === 'object' && typeof (field as { key?: unknown }).key === 'string'
    && !reserved.includes((field as { key: string }).key))
  const required = [...new Set(['documentType', 'expiryDate', ...listOf(type.requiredFields).filter((key): key is string => typeof key === 'string'
    && !(DOCUMENT_RENEWAL_STAGED_KEYS as readonly string[]).includes(key))])]
  const fields: Array<{ key: string }> = [...own, ...extra]
  for (const key of required) if (!fields.some(field => field.key === key)) fields.push({ key, label: key, type: 'text', required: true } as { key: string })
  return { requiredFields: JSON.stringify(required), customFields: JSON.stringify(fields) }
}

/** قيم الطلب بعد الحكم عليها دلوقتي: النوع مفعّل في الكتالوج (بالاسم، أو بالكود المتثبّت)، والتاريخ بعد النهارده */
async function renewalValues(em: EntityManager, payload: Record<string, unknown>) {
  const staged = typeof payload.documentTypeCode === 'string' ? payload.documentTypeCode : null
  const name = typeof payload.documentType === 'string' ? payload.documentType.trim() : ''
  const [type]: Array<{ code: string; nameAr: string }> = staged
    ? await em.query('SELECT [code], [nameAr] FROM [doc_types] WHERE [code] = @0 AND [isActive] = 1', [staged])
    : name ? await em.query('SELECT [code], [nameAr] FROM [doc_types] WHERE [nameAr] = @0 AND [isActive] = 1', [name]) : []
  if (!type) throw new BadRequestException(DOCUMENT_RENEWAL_TYPE_MISSING)
  const today = localDateOf(new Date())
  if (!validDate(payload.expiryDate) || payload.expiryDate <= today) throw new BadRequestException(DOCUMENT_RENEWAL_EXPIRY)
  const issueDate = payload.issueDate === undefined || payload.issueDate === null || payload.issueDate === '' ? null : payload.issueDate
  if (issueDate !== null && (!validDate(issueDate) || issueDate > payload.expiryDate)) throw new BadRequestException(DOCUMENT_RENEWAL_ISSUE)
  const number = payload.documentNumber === undefined || payload.documentNumber === null ? '' : String(payload.documentNumber).trim()
  if (number.length > 100) throw new BadRequestException(DOCUMENT_RENEWAL_NUMBER)
  return { code: String(type.code), nameAr: String(type.nameAr), expiryDate: payload.expiryDate, issueDate: issueDate as string | null, number: number || null }
}

/** وقت التقديم: الحكم على القيم، وتثبيت كود النوع (الاسم ممكن يتغيّر في الكتالوج قبل الاعتماد) — بيكتب فوق أي قيمة من العميل */
export async function stageDocumentRenewal(em: EntityManager, req: Pick<Request, 'payload'>): Promise<Record<string, unknown>> {
  const { documentTypeCode: _client, ...payload }: Record<string, unknown> = JSON.parse(req.payload || '{}')
  const values = await renewalValues(em, payload)
  return { ...payload, documentType: values.nameAr, documentTypeCode: values.code }
}

/**
 * التنفيذ جوه معاملة الاعتماد: القيم بتتحكم تاني (النوع لسه مفعّل، والتاريخ لسه بعد النهارده)، ومستند صاحب الطلب من النوع ده (الأبعد
 * تاريخ) بيتقفل صفه ويتحدّث تاريخه (ورقمه وتاريخ إصداره لو اتبعتوا) — أو مستند جديد لو مالوش واحد — ومهمة تجديده المفتوحة بتتقفل.
 */
export async function executeDocumentRenewal(em: EntityManager, req: Request, _type: RequestType, payload: Record<string, unknown>) {
  if (!req.requesterId) throw new BadRequestException('طلب تجديد المستند لازم يكون له موظف')
  const values = await renewalValues(em, payload)
  const [current]: Array<{ id: number }> = await em.query(
    `SELECT TOP (1) d.[id] FROM [employee_documents] d WITH (UPDLOCK, ROWLOCK) WHERE d.[employeeId] = @0 AND d.[docType] = @1
     ORDER BY CASE WHEN d.[expiryDate] IS NULL THEN 0 ELSE 1 END DESC, d.[expiryDate] DESC, d.[id] DESC`, [req.requesterId, values.code])
  let documentId: number
  if (current) {
    documentId = Number(current.id)
    // الأعمدة المتغيّرة بس — الملف والملاحظات زي ما هم
    const sets = ['[expiryDate] = @1'], params: unknown[] = [documentId, values.expiryDate]
    if (values.issueDate !== null) { params.push(values.issueDate); sets.push(`[issueDate] = @${params.length - 1}`) }
    if (values.number !== null) { params.push(values.number); sets.push(`[number] = @${params.length - 1}`) }
    await em.query(`UPDATE [employee_documents] SET ${sets.join(', ')} WHERE [id] = @0`, params)
  } else {
    const [made]: Array<{ id: number }> = await em.query(
      `INSERT INTO [employee_documents] ([employeeId], [docType], [number], [issueDate], [expiryDate]) OUTPUT INSERTED.[id] VALUES (@0, @1, @2, @3, @4)`,
      [req.requesterId, values.code, values.number, values.issueDate, values.expiryDate])
    documentId = Number(made.id)
  }
  // مهمة التجديد المفتوحة للمستند (لو فيه) بتتقفل باسم النظام: الطلب المعتمد هو اللي جدّده
  await closeRenewalTask(em, documentId, { sub: 0 })
  return { ref: `DOC-${documentId}`, completed: true }
}
