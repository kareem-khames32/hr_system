import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import type { Request } from '../requests/entities/request.entity'
import type { RequestType } from '../requests/entities/request-type.entity'
import { HrCase, HrCaseParty, type CaseKind } from './case.entities'
import { CASES_MIGRATION_MISSING, casesReady } from './case-rules'

// B3.11: وجهة «فتح ملف قضية» — أنواع الطلبات السرية الموجودة («شكوى»، «تظلم من جزاء»، «إبلاغ عن مخالفة») بتاخد الوجهة دي من «أنواع
// الطلبات»، والاعتماد النهائي بيفتح ملف قضية: مقدّم الطلب شاكي فيها، واللي اعتمدوا الطلب هم أول المطّلعين على الملف (شافوا الطلب السري
// أصلًا). من غير الوجهة النوع بيفضل «تسجيل فقط» زي الأول. كله بـem بس.

export const CASE_REQUEST_HANDLER = 'case_open'
export const CASE_REQUEST_NO_APPROVER = 'نوع الطلب ده بيفتح ملف قضية: لازم سلسلة اعتماده يكون فيها معتمد — هو اللي بيستلم الملف'
const KIND_OF: Record<string, CaseKind> = { GRIEVANCE: 'COMPLAINT', PENALTY_OBJECTION: 'PENALTY_OBJECTION', WHISTLEBLOWING: 'VIOLATION' }

/** التنفيذ جوه معاملة الاعتماد النهائي: ملف قضية واحد للطلب (إعادة التنفيذ بترجّع نفس الملف) */
export async function executeCaseRequest(em: EntityManager, req: Request, type: RequestType, payload: Record<string, unknown>) {
  if (!req.requesterId) throw new BadRequestException('طلب فتح القضية لازم يكون له موظف')
  if (!(await casesReady(em))) throw new BadRequestException(CASES_MIGRATION_MISSING)
  const existing = await em.getRepository(HrCase).findOne({ where: { requestId: req.id } })
  if (existing) return { ref: `CASE-${existing.id}`, completed: true }
  const approvers: Array<{ approverId: number }> = await em.query(
    `SELECT DISTINCT [approverId] FROM [request_approvals] WHERE [requestId] = @0 AND [action] IN (N'APPROVED', N'APPROVE') AND [approverId] > 0`, [req.id])
  if (!approvers.length) throw new BadRequestException(CASE_REQUEST_NO_APPROVER)
  const text = [payload.reason, payload.details, payload.note].filter((value): value is string => typeof value === 'string' && value.trim() !== '').join('\n').slice(0, 10000)
  const now = new Date()
  const made = await em.getRepository(HrCase).insert({ kind: KIND_OF[type.code] ?? 'OTHER', title: String(type.nameAr).slice(0, 200), description: text || null, branchId: req.branchId ?? null, requestId: req.id,
    investigatorUserId: null, status: 'OPEN', outcome: null, outcomeNote: null, openedByUserId: 0, openedAt: now, decidedAt: null, closedAt: null })
  const caseId = made.identifiers[0].id as number
  // Codex P3K-B11: عضوية المطّلع بموظف حسابه وقت الإضافة (الوصول بيتحكم بالهوية الحالية — case-access.ts)
  const accounts: Array<{ id: number; employeeId: number | null }> = await em.query(
    `SELECT [id], [employeeId] FROM [users] WHERE [id] IN (${approvers.map((_, index) => `@${index}`).join(', ')})`, approvers.map((row) => Number(row.approverId)))
  const employeeOf = new Map(accounts.map((row) => [Number(row.id), row.employeeId == null ? null : Number(row.employeeId)]))
  await em.getRepository(HrCaseParty).insert([
    ...approvers.map((row) => ({ caseId, role: 'HANDLER' as const, employeeId: employeeOf.get(Number(row.approverId)) ?? null, userId: Number(row.approverId), addedByUserId: 0, addedAt: now })),
    { caseId, role: 'COMPLAINANT' as const, employeeId: req.requesterId, userId: null, addedByUserId: 0, addedAt: now },
  ])
  return { ref: `CASE-${caseId}`, completed: true }
}
