import { BadRequestException } from '@nestjs/common'
import { In, type EntityManager } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { Employee } from '../employees/employee.entity'
import type { Request } from '../requests/entities/request.entity'
import type { RequestType } from '../requests/entities/request-type.entity'
import { TrainingCourse, TrainingEnrollment, TrainingSession } from './training.entities'
import { TRAINING_FULL, TRAINING_SEAT_STATUSES, trainingReady } from './training-rules'

// B3.9-ب: وجهة «طلب تدريب» — نوع الطلب الموجود بسلسلته بيتربط بجلسة مجدولة، والاعتماد النهائي بيسجّل صاحب الطلب فيها (تحت قفل صف الجلسة
// والسعة). النوع بياخد الوجهة دي من «أنواع الطلبات» (زي «تجديد مستند» في B2.15-ب)؛ من غيرها بيفضل «تسجيل فقط». كله بـem بس.

export const TRAINING_REQUEST_HANDLER = 'training_enrollment'
export const TRAINING_REQUEST_SESSION = 'اختار جلسة تدريب مجدولة من المتاح لفرعك'
export const TRAINING_REQUEST_TAKEN = 'إنت مسجّل في الجلسة دي قبل كده'
// (محرك الطلبات بيكمّل الرسالة: «الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات»)
export const TRAINING_REQUEST_GONE = 'جلسة التدريب مابقتش متاحة (اتلغت أو اتعملت)'
/** مفاتيح بيكتبها الخادم وقت التقديم — مش من العميل: رقم الجلسة، واسم الدورة (المفتاح الإلزامي القديم للنوع) */
export const TRAINING_REQUEST_STAGED_KEYS = ['trainingSessionId', 'courseName'] as const
export const TRAINING_REQUEST_CLIENT_KEYS = ['trainingSession'] as const

const listOf = (value: unknown): unknown[] => { try { const parsed = typeof value === 'string' ? JSON.parse(value) : value; return Array.isArray(parsed) ? parsed : [] } catch { return [] } }
const day = (value: unknown): string => String(value).slice(0, 10)
const optionOf = (session: TrainingSession, courseName: string): string => `${courseName} — ${day(session.startDate)} (#${session.id})`

/** الجلسات المتاحة لموظف: مجدولة، لسه مابدأتش، ولفرعه الحالي أو لكل الشركة */
async function openSessions(em: EntityManager, employeeId: number | null | undefined): Promise<Array<{ session: TrainingSession; option: string }>> {
  if (!employeeId || !(await trainingReady(em))) return []
  const employee = await em.getRepository(Employee).findOne({ where: { id: employeeId } })
  if (!employee) return []
  const today = localDateOf(new Date())
  const rows = (await em.getRepository(TrainingSession).find({ where: { status: 'PLANNED' }, order: { startDate: 'ASC', id: 'ASC' } }))
    .filter((row) => day(row.startDate) >= today && (row.branchId == null || row.branchId === employee.branchId))
  if (!rows.length) return []
  const courses = new Map((await em.getRepository(TrainingCourse).find({ where: { id: In([...new Set(rows.map((row) => row.courseId))]) } })).map((row) => [row.id, row.name]))
  return rows.map((session) => ({ session, option: optionOf(session, courses.get(session.courseId) ?? '—') }))
}

/** اختيارات خانة «الجلسة» في نموذج الطلب لصاحب الحساب */
export async function trainingRequestOptions(em: EntityManager, employeeId: number | null | undefined): Promise<string[]> {
  return (await openSessions(em, employeeId)).map((row) => row.option)
}

/** حقول نموذج الطلب: حقل الجلسة، وبعده حقول الباني الخاصة (مفاتيح الوجهة والخادم محجوزة) */
export function trainingRequestFields(options: string[], type: Pick<RequestType, 'requiredFields' | 'customFields'>): { requiredFields: string; customFields: string } {
  const own = [{ key: 'trainingSession', label: 'جلسة التدريب', type: 'select', required: true, options }]
  const reserved: string[] = [...own.map((field) => field.key), ...TRAINING_REQUEST_STAGED_KEYS]
  const extra = listOf(type.customFields).filter((field): field is { key: string } => !!field && typeof field === 'object' && typeof (field as { key?: unknown }).key === 'string'
    && !reserved.includes((field as { key: string }).key))
  const required = [...new Set(['trainingSession', ...listOf(type.requiredFields).filter((key): key is string => typeof key === 'string' && !(TRAINING_REQUEST_STAGED_KEYS as readonly string[]).includes(key))])]
  const fields: Array<{ key: string }> = [...own, ...extra]
  for (const key of required) if (!fields.some((field) => field.key === key)) fields.push({ key, label: key, type: 'text', required: true } as { key: string })
  return { requiredFields: JSON.stringify(required), customFields: JSON.stringify(fields) }
}

/**
 * وقت التقديم (وكل إعادة تقديم): الجلسة من المتاح لمقدّم الطلب دلوقتي (بالاختيار، أو بالرقم المتثبّت عند إعادة التقديم)، ومش مسجّل فيها — وتثبيت
 * رقمها واسم دورتها على الطلب فوق أي قيمة من العميل.
 */
export async function stageTrainingRequest(em: EntityManager, req: Pick<Request, 'payload' | 'requesterId'>): Promise<Record<string, unknown>> {
  const { trainingSessionId: staged, courseName: _name, ...payload }: Record<string, unknown> = JSON.parse(req.payload || '{}')
  const open = await openSessions(em, req.requesterId)
  const chosen = typeof payload.trainingSession === 'string' ? open.find((row) => row.option === payload.trainingSession) : undefined
  // إعادة التقديم: الاختيار المتخزّن ممكن اسمه يتغيّر — الرقم المتثبّت هو المرجع لو لسه متاح
  const found = chosen ?? (typeof staged === 'number' ? open.find((row) => row.session.id === staged) : undefined)
  if (!found) throw new BadRequestException(TRAINING_REQUEST_SESSION)
  const taken = await em.getRepository(TrainingEnrollment).count({ where: { sessionId: found.session.id, employeeId: req.requesterId, status: In(['ENROLLED', 'ATTENDED', 'COMPLETED', 'ABSENT']) } })
  if (taken) throw new BadRequestException(TRAINING_REQUEST_TAKEN)
  return { ...payload, trainingSession: found.option, trainingSessionId: found.session.id, courseName: found.option.split(' — ')[0] }
}

/**
 * التنفيذ جوه معاملة الاعتماد النهائي: الجلسة تحت قفل صفها — لسه مجدولة ولفرع الموظف الحالي (أو لكل الشركة) وفيها مكان؛ وصاحب الطلب بيتسجّل
 * فيها مربوط بالطلب. لو مسجّل قبل كده (إدارة التدريب سجّلته في النص) التسجيل القايم بيتربط بالطلب من غير صف تاني.
 */
export async function executeTrainingRequest(em: EntityManager, req: Request, _type: RequestType, payload: Record<string, unknown>) {
  if (!req.requesterId) throw new BadRequestException('طلب التدريب لازم يكون له موظف')
  const sessionId = typeof payload.trainingSessionId === 'number' ? payload.trainingSessionId : NaN
  if (!Number.isSafeInteger(sessionId) || !(await trainingReady(em))) throw new BadRequestException(TRAINING_REQUEST_GONE)
  const session = await em.getRepository(TrainingSession).findOne({ where: { id: sessionId }, lock: { mode: 'pessimistic_write' } })
  const employee = await em.getRepository(Employee).findOne({ where: { id: req.requesterId } })
  if (!session || session.status !== 'PLANNED' || !employee || (session.branchId != null && session.branchId !== employee.branchId)) throw new BadRequestException(TRAINING_REQUEST_GONE)
  const rows = await em.getRepository(TrainingEnrollment).find({ where: { sessionId: session.id } })
  const mine = rows.find((row) => row.employeeId === employee.id && row.status !== 'CANCELLED')
  if (mine) {
    if (mine.requestId == null) await em.getRepository(TrainingEnrollment).update({ id: mine.id }, { requestId: req.id })
    return { ref: `TRN-${mine.id}`, completed: true }
  }
  const seats = rows.filter((row) => TRAINING_SEAT_STATUSES.includes(row.status)).length
  if (session.capacity != null && seats + 1 > session.capacity) throw new BadRequestException(`${TRAINING_FULL} — زوّد سعة الجلسة الأول`)
  // سجّله النظام باعتماد الطلب (0)
  const made = await em.getRepository(TrainingEnrollment).insert({ sessionId: session.id, employeeId: employee.id, status: 'ENROLLED', result: null, rating: null, ratingComment: null, requestId: req.id,
    documentId: null, enrolledByUserId: 0, createdAt: new Date(), completedAt: null })
  return { ref: `TRN-${made.identifiers[0].id as number}`, completed: true }
}
