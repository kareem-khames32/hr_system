import { BadRequestException, ConflictException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { Request } from '../requests/entities/request.entity'
import { ReviewAssignment, ReviewCycle, ReviewResponse } from './review.entities'
import {
  REVIEWS_MIGRATION_MISSING, REVIEW_OBJECTION_DAYS, REVIEW_OBJECTION_EARLY, REVIEW_OBJECTION_EXISTS, REVIEW_OBJECTION_LATE, REVIEW_OBJECTION_TARGET, REVIEW_OBJECTION_TYPE, reviewsReady,
} from './review-rules'

// B3.8-أ: الاعتراض على تقييم الأداء — نوع الطلب الموجود «اعتراض على تقييم أداء» (تسجيل بس، بسلسلته) بيتربط بتقييم معلن لمقدّمه لما الطلب
//  يتقدّم من شاشة التقييم (مفتاح reviewId في الحمولة). من غيره الطلب سجل عادي زي الأول. الربط في الحمولة نفسها — من غير جدول ولا ترحيل.
//  الحكم كله تحت قفل صف التكليف (بعد قفل صف الطلب اللي التقديم ماسكه): تقييم مقدّم الطلب، معلن، في المهلة، ومفيش اعتراض تاني عليه.
//  نتيجة الاعتراض هي نتيجة الطلب في سلسلته، وأي تغيير في الدرجة بعده معايرة بسببها (ReviewsService.calibrate). كله بـem بس.

/** من العميل: رقم التقييم. ومن الخادم عند كل تقديم: اسم الدورة (للمعتمد) */
export const REVIEW_OBJECTION_CLIENT_KEYS = ['reviewId'] as const
export const REVIEW_OBJECTION_STAGED_KEYS = ['reviewCycle'] as const
/** حالات الطلب اللي مابتحجزش التقييم: مسودة لسه ماتقدّمتش، أو اتلغى */
const NOT_FILED = ['DRAFT', 'CANCELLED']
/** الاعتراض اتقبل (النوع «تسجيل بس»: الاعتماد النهائي هو النتيجة) */
export const OBJECTION_ACCEPTED = ['APPROVED', 'IN_EXECUTION', 'COMPLETED']
export const OBJECTION_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'اتقدّم', UNDER_REVIEW: 'تحت المراجعة', RETURNED_FOR_INFO: 'راجع لاستكمال', APPROVED: 'اتقبل', IN_EXECUTION: 'اتقبل', COMPLETED: 'اتقبل', REJECTED: 'اترفض',
}

const payloadOf = (raw: string | null | undefined): Record<string, unknown> => {
  try { const value: unknown = JSON.parse(raw || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {} } catch { return {} }
}
const reviewIdOf = (raw: string | null | undefined): number | null => {
  const id = payloadOf(raw).reviewId
  return typeof id === 'number' && Number.isSafeInteger(id) && id > 0 ? id : null
}

/** اعتراضات موظفين على تقييماتهم (آخر واحد لكل تقييم) — مفتاحها رقم التكليف */
export async function objectionsOf(em: EntityManager, employeeIds: number[], exceptRequestId?: number): Promise<Map<number, { requestId: number; status: string }>> {
  const found = new Map<number, { requestId: number; status: string }>()
  if (!employeeIds.length) return found
  const rows = await em.getRepository(Request).createQueryBuilder('request').select(['request.id', 'request.status', 'request.payload', 'request.requesterId'])
    .where('request.typeCode = :type AND request.requesterId IN (:...ids)', { type: REVIEW_OBJECTION_TYPE, ids: employeeIds }).orderBy('request.id', 'ASC').getMany()
  for (const row of rows) {
    const reviewId = reviewIdOf(row.payload)
    if (reviewId === null || row.id === exceptRequestId || NOT_FILED.includes(row.status)) continue
    found.set(reviewId, { requestId: row.id, status: row.status })
  }
  return found
}

/** اعتراض تقييم واحد (لصاحبه) */
export async function objectionOf(em: EntityManager, assignment: Pick<ReviewAssignment, 'id' | 'employeeId'>, exceptRequestId?: number) {
  return (await objectionsOf(em, [assignment.employeeId], exceptRequestId)).get(assignment.id) ?? null
}

/** آخر يوم للاعتراض: المهلة من لحظة الإعلان. تقييم اتعلن من غير صف إعلان (قبل B3.8) مالوش آخر */
export async function objectionDeadline(em: EntityManager, assignmentId: number): Promise<Date | null> {
  const announced = await em.getRepository(ReviewResponse).findOne({ where: { assignmentId, relation: 'PUB' }, order: { id: 'DESC' } })
  return announced ? new Date(new Date(announced.submittedAt).getTime() + REVIEW_OBJECTION_DAYS * 86400000) : null
}

/**
 * التقديم (وكل إعادة تقديم): من غير reviewId الطلب سجل عادي. بيه: التكليف تحت قفل صفه — بتاع مقدّم الطلب وإلا «غير موجود»، ونتيجته معلنة،
 * وفي المهلة (عند أول تقديم بس: الطلب المرجّع للاستكمال بيكمّل)، ومفيش اعتراض تاني اتقدّم عليه. بترجع الحمولة اللي هتتخزّن.
 */
export async function stageReviewObjection(em: EntityManager, req: Pick<Request, 'id' | 'payload' | 'requesterId' | 'status'>): Promise<Record<string, unknown>> {
  const payload = payloadOf(req.payload)
  for (const key of REVIEW_OBJECTION_STAGED_KEYS) delete payload[key]
  const raw = payload.reviewId
  if (raw === undefined || raw === null || raw === '') { delete payload.reviewId; return payload }
  const id = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d{1,9}$/.test(raw) ? Number(raw) : NaN
  if (!Number.isSafeInteger(id) || id < 1) throw new BadRequestException(REVIEW_OBJECTION_TARGET)
  if (!(await reviewsReady(em))) throw new BadRequestException(REVIEWS_MIGRATION_MISSING)
  const assignment = await em.getRepository(ReviewAssignment).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
  // تقييم حد تاني زي اللي مش موجود
  if (!assignment || assignment.employeeId !== req.requesterId) throw new BadRequestException(REVIEW_OBJECTION_TARGET)
  if (assignment.status !== 'ANNOUNCED' && assignment.status !== 'ACKNOWLEDGED') throw new BadRequestException(REVIEW_OBJECTION_EARLY)
  if (req.status === 'DRAFT') {
    const until = await objectionDeadline(em, assignment.id)
    if (until && Date.now() > until.getTime()) throw new BadRequestException(REVIEW_OBJECTION_LATE)
  }
  if (await objectionOf(em, assignment, req.id)) throw new ConflictException(REVIEW_OBJECTION_EXISTS)
  const cycle = await em.getRepository(ReviewCycle).findOne({ where: { id: assignment.cycleId } })
  return { ...payload, reviewId: id, reviewCycle: cycle?.name ?? null }
}
