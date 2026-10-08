import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { JobTitle } from '../assets/assets.entities'
import { recordAudit } from '../audit/audit'
import { Employee } from '../employees/employee.entity'
import { Department } from '../org/entities/department.entity'
import type { Request } from '../requests/entities/request.entity'
import type { RequestType } from '../requests/entities/request-type.entity'
import { RecruitmentJob } from './recruitment-job.entity'
import {
  RECRUITMENT_JOBS_MIGRATION_MISSING, RECRUITMENT_REASON_MAX, catalogJobTitle, cleanJobText, cleanOpenings, cleanSalaryRange, cleanStartDate, jobCode, normalJobTitle,
  recruitmentJobsReady,
} from './recruitment-rules'

// B3.2-أ: طلب «احتياج توظيف» — نوع طلب عادي ببانِي الطلبات وسلسلته، ووجهة تنفيذه هنا (نفس أسلوب «وظيفة جديدة / زيادة عدد» في B2.11-ب).
//  مقدّم الطلب بيطلب لقسمه (والموارد البشرية «بالنيابة» عن مدير القسم): المسمى من كتالوج المسميات، والعدد، والسبب، ونطاق الراتب وتاريخ
//  البدء اختياريين. القسم بيتثبّت على الطلب وقت التقديم (قسم مقدّم الطلب ساعتها، في فرع الطلب): المعتمدين بيشوفوه، والتنفيذ عليه هو.
//  عند الاعتماد النهائي: وظيفة شاغرة «مسودة» على فرع الطلب والقسم المتثبّت، مربوطة بالطلب — مسؤول التوظيف بيكمّل وصفها وينشرها.
//  كله بـem بس: مفيش نداء لخدمة تانية جوه معاملة.

export const REQUISITION_HANDLER = 'recruitment_requisition'
export const REQUISITION_TYPE = 'RECRUITMENT_REQUISITION'
export const REQUISITION_REASON = 'اكتب سبب الاحتياج'
export const REQUISITION_BRANCH_MOVED = 'مقدّم الطلب اتنقل من فرع الطلب — الاحتياج مايتطلبش على فرع غير فرعه. اعمل طلب جديد من الفرع الصح'
export const REQUISITION_UNIT_GONE = 'القسم اللي الطلب اتقدّم عليه مابقاش موجود في فرع الطلب — ارفض الطلب، أو رجّعه لمقدّمه يقدّمه تاني'
export const REQUISITION_BRANCH_LEVEL = 'على مستوى الفرع'
/**
 * مفتاحين بيكتبهم الخادم عند كل تقديم وإعادة تقديم: قسم الوظيفة (رقمه، واسمه للمعتمد). أي قيمة جاية من العميل بتتكتب فوقها — فهُم في
 * قايمة المفاتيح المسموحة عشان الحمولة المتخزّنة تعدّي عند إعادة التقديم، مش عشان العميل يحددهم.
 */
export const REQUISITION_STAGED_KEYS = ['vacancyDepartmentId', 'vacancyDepartment'] as const
/** مفاتيح الحمولة اللي من العميل (غير «السبب» المشترك) */
export const REQUISITION_CLIENT_KEYS = ['vacancyTitle', 'openings', 'salaryFrom', 'salaryTo', 'startDate'] as const

/** مسميات الكتالوج النشطة (اختيارات خانة المسمى في نموذج الطلب) */
export async function requisitionTitles(em: EntityManager): Promise<string[]> {
  const rows = await em.getRepository(JobTitle).find({ where: { isActive: true }, order: { title: 'ASC' } })
  return [...new Set(rows.map((row) => normalJobTitle(row.title)).filter(Boolean))]
}

const listOf = (raw: string | null | undefined): unknown[] => {
  try { const parsed: unknown = JSON.parse(raw || '[]'); return Array.isArray(parsed) ? parsed : [] } catch { return [] }
}

/** حقول نموذج الطلب، وبعدهم أي حقول زوّدها مسؤول النظام على النوع من بانِي الطلبات (حقول الوجهة بتتزوّد على المتسجّل، مابتمسحوش) */
export function requisitionFields(titles: string[], type: Pick<RequestType, 'requiredFields' | 'customFields'>): { requiredFields: string; customFields: string } {
  const own = [
    { key: 'vacancyTitle', label: 'المسمى الوظيفي المطلوب', type: 'select', required: true, options: titles },
    { key: 'openings', label: 'العدد المطلوب', type: 'number', required: true },
    { key: 'reason', label: 'سبب الاحتياج', type: 'text', required: true },
    { key: 'salaryFrom', label: 'الراتب المقترح من', type: 'number', required: false },
    { key: 'salaryTo', label: 'الراتب المقترح إلى', type: 'number', required: false },
    { key: 'startDate', label: 'تاريخ البدء المطلوب', type: 'date', required: false },
  ]
  const mandatory = own.filter((field) => field.required).map((field) => field.key)
  // مفاتيح الوجهة ومفاتيح الخادم مش حقول يحددها الباني
  const reserved: string[] = [...own.map((field) => field.key), ...REQUISITION_STAGED_KEYS]
  const extra = listOf(type.customFields).filter((field): field is { key: string } => !!field && typeof field === 'object' && typeof (field as { key?: unknown }).key === 'string'
    && !reserved.includes((field as { key: string }).key))
  const required = [...new Set([...mandatory, ...listOf(type.requiredFields).filter((key): key is string => typeof key === 'string' && !(REQUISITION_STAGED_KEYS as readonly string[]).includes(key))])]
  const fields: Array<{ key: string }> = [...own, ...extra]
  // النموذج بيرسم الحقول المخصّصة بس: أي مفتاح إلزامي متسجّل من غير حقل بياخد خانة نص (زي باقي الوجهات)
  for (const key of required) if (!fields.some((field) => field.key === key)) fields.push({ key, label: key, type: 'text', required: true } as { key: string })
  return { requiredFields: JSON.stringify(required), customFields: JSON.stringify(fields) }
}

/** قيم الاحتياج النضيفة، أو رسالة الخطأ */
async function requisitionValues(em: EntityManager, payload: Record<string, unknown>) {
  const title = await catalogJobTitle(em, payload.vacancyTitle)
  const openings = cleanOpenings(payload.openings)
  const reason = cleanJobText(payload.reason, RECRUITMENT_REASON_MAX, 'سبب الاحتياج')
  if (!reason) throw new BadRequestException(REQUISITION_REASON)
  return { title, openings, reason, ...cleanSalaryRange(payload.salaryFrom, payload.salaryTo), startDate: cleanStartDate(payload.startDate) }
}

/**
 * التقديم (وكل إعادة تقديم): نفس فحوص الاعتماد النهائي بدري، وتثبيت قسم الوظيفة على الطلب — قسم مقدّم الطلب دلوقتي لو تبع فرع الطلب،
 * وإلا مستوى الفرع. بترجع الحمولة اللي هتتخزّن.
 */
export async function stageRequisition(em: EntityManager, req: Pick<Request, 'payload' | 'requesterId' | 'branchId'>): Promise<Record<string, unknown>> {
  if (!(await recruitmentJobsReady(em))) throw new BadRequestException(RECRUITMENT_JOBS_MIGRATION_MISSING)
  const payload: Record<string, unknown> = JSON.parse(req.payload || '{}')
  await requisitionValues(em, payload)
  // فرع الطلب متسجّل من أول ما اتعمل؛ مقدّم الطلب لازم يكون لسه فيه عشان قسمه هو اللي بيتثبّت
  const requester = await em.getRepository(Employee).findOne({ where: { id: req.requesterId }, select: { id: true, branchId: true, departmentId: true } })
  if (!requester || Number(requester.branchId) !== Number(req.branchId)) throw new BadRequestException(REQUISITION_BRANCH_MOVED)
  const department = requester.departmentId ? await em.getRepository(Department).findOne({ where: { id: requester.departmentId } }) : null
  const own = department && department.branchId === req.branchId ? department : null
  return { ...payload, vacancyDepartmentId: own ? own.id : null, vacancyDepartment: own ? own.name : REQUISITION_BRANCH_LEVEL }
}

/** رقم القسم المتثبّت على الطلب وقت التقديم: null = مستوى الفرع. طلب من غير تثبيت أو برقم مش رقم = مرفوض. */
function stagedDepartmentId(payload: Record<string, unknown>): number | null {
  const staged = payload.vacancyDepartmentId
  if (staged === null) return null
  if (!Number.isSafeInteger(staged) || Number(staged) <= 0) throw new BadRequestException(REQUISITION_UNIT_GONE)
  return Number(staged)
}

/** التنفيذ عند الاعتماد النهائي، جوه معاملة الاعتماد: وظيفة «مسودة» على فرع الطلب والقسم المتثبّت عليه وقت التقديم */
export async function executeRequisition(em: EntityManager, req: Request, _type: RequestType, payload: Record<string, unknown>): Promise<{ ref: string; completed: boolean }> {
  if (!(await recruitmentJobsReady(em))) throw new BadRequestException(RECRUITMENT_JOBS_MIGRATION_MISSING)
  const jobs = em.getRepository(RecruitmentJob)
  // الطلب نفسه مقفول في معاملة الاعتماد: وظيفة اتعملت منه قبل كده (تنفيذ اتعاد) هي اللي بترجع
  const made = await jobs.findOne({ where: { requestId: req.id } })
  if (made) return { ref: `JOB-${made.id}`, completed: true }
  // الحكم كله دلوقتي: اللي اتغيّر والاعتماد مستني (المسمى اتقفل، القسم اتنقل) بيتشاف بقيمته الحالية
  const values = await requisitionValues(em, payload)
  const departmentId = stagedDepartmentId(payload)
  // القسم المتثبّت لازم لسه موجود وتبع فرع الطلب، وصفه بيتقفل لآخر المعاملة: نقله لفرع تاني يا اتثبّت قبلنا فنشوفه ونرفض، يا بيستنى
  if (departmentId != null) {
    const department = await em.getRepository(Department).findOne({ where: { id: departmentId }, lock: { mode: 'pessimistic_write' } })
    if (!department || department.branchId !== req.branchId) throw new BadRequestException(REQUISITION_UNIT_GONE)
  }
  const job = await jobs.save(jobs.create({
    title: values.title, branchId: req.branchId, departmentId, openings: values.openings, reason: values.reason, salaryFrom: values.salaryFrom, salaryTo: values.salaryTo,
    startDate: values.startDate, description: null, requirements: null, status: 'DRAFT', internal: true, external: false, requestId: req.id, createdByUserId: 0,
    publishedAt: null, closedAt: null, createdAt: new Date(),
  }))
  await recordAudit(em, { category: 'SETTINGS', action: 'RECRUITMENT_JOB_CREATED', entityType: 'recruitment_job', entityId: job.id, branchId: job.branchId,
    summary: `وظيفة شاغرة جديدة ${jobCode(job.id)} (${job.title}) بعدد ${job.openings} من طلب احتياج معتمد رقم ${req.id}`,
    after: { title: job.title, branchId: job.branchId, departmentId: job.departmentId, openings: job.openings, requestId: req.id } })
  return { ref: `JOB-${job.id}`, completed: true }
}
