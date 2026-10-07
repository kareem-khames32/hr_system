import { BadRequestException, ConflictException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { JobTitle } from '../assets/assets.entities'
import { recordAudit } from '../audit/audit'
import { Employee } from '../employees/employee.entity'
import { Department } from '../org/entities/department.entity'
import type { Request } from '../requests/entities/request.entity'
import type { RequestType } from '../requests/entities/request-type.entity'
import { ApprovedPosition } from './position.entities'
import { lockPositionCreation, normalTitle, positionCode, positionsReady, POSITION_HEADCOUNT_MAX, POSITIONS_MIGRATION_MISSING } from './position-rules'

// B2.11 (ب): طلب «وظيفة جديدة / زيادة عدد» — نوع طلب عادي ببانِي الطلبات وسلسلته، ووجهة تنفيذه هنا.
//  مقدّم الطلب بيطلب لقسمه (والموارد البشرية «بالنيابة» عن مدير القسم): المسمى من كتالوج المسميات، والعدد المطلوب، والسبب.
//  القسم بيتثبّت على الطلب وقت التقديم (قسم مقدّم الطلب ساعتها، في فرع الطلب): المعتمدين بيشوفوه، والتنفيذ بيمشي عليه هو — نقل مقدّم
//  الطلب بعد التقديم مابيغيّرش الوحدة اللي اتراجعت.
//  عند الاعتماد النهائي: لو فيه وظيفة معتمدة (مش ملغية) بنفس المسمى على نفس القسم في فرع الطلب عددها بيزيد، وإلا بتتعمل وظيفة نشطة جديدة.

export const POSITION_REQUEST_HANDLER = 'positions_headcount'
export const POSITION_REQUEST_TYPE = 'POSITION_REQUEST'
export const POSITION_REQUEST_MAX = 1000
export const POSITION_REQUEST_TITLE_MISSING = 'المسمى الوظيفي ده مش في كتالوج المسميات — اطلب من الموارد البشرية تضيفه الأول'
export const POSITION_REQUEST_COUNT = `العدد المطلوب رقم صحيح من 1 لـ${POSITION_REQUEST_MAX}`
export const POSITION_REQUEST_REASON = 'اكتب سبب طلب الوظيفة'
export const POSITION_REQUEST_BRANCH_MOVED = 'مقدّم الطلب اتنقل من فرع الطلب — الوظيفة ماتتطلبش على فرع غير فرعه. اعمل طلب جديد من الفرع الصح'
export const POSITION_REQUEST_UNIT_GONE = 'القسم اللي الطلب اتقدّم عليه مابقاش موجود في فرع الطلب — ارفض الطلب، أو رجّعه لمقدّمه يقدّمه تاني'
export const POSITION_REQUEST_BRANCH_LEVEL = 'على مستوى الفرع'
/** الزيادة اللي هتعدّي حد العدد المعتمد بتاع شاشة الوظائف — من غير كود الوظيفة ولا عددها: المعتمد ممكن يكون برّه فرعها */
export const POSITION_REQUEST_OVER = `الزيادة المطلوبة هتعدّي حد العدد المعتمد للوظيفة (${POSITION_HEADCOUNT_MAX})`
/**
 * مفتاحين بيكتبهم الخادم عند كل تقديم وإعادة تقديم: القسم اللي الوظيفة هتتعمل عليه (رقمه، واسمه للمعتمد). أي قيمة جاية من العميل
 * بتتكتب فوقها — فهُم في قايمة المفاتيح المسموحة عشان الحمولة المتخزّنة تعدّي عند إعادة التقديم، مش عشان العميل يحددهم.
 */
export const POSITION_REQUEST_STAGED_KEYS = ['positionDepartmentId', 'positionDepartment'] as const

/** مسميات الكتالوج النشطة (اختيارات خانة المسمى في نموذج الطلب) */
export async function positionRequestTitles(em: EntityManager): Promise<string[]> {
  const rows = await em.getRepository(JobTitle).find({ where: { isActive: true }, order: { title: 'ASC' } })
  return [...new Set(rows.map(row => normalTitle(row.title)).filter(Boolean))]
}

const listOf = (raw: string | null | undefined): unknown[] => {
  try { const parsed: unknown = JSON.parse(raw || '[]'); return Array.isArray(parsed) ? parsed : [] } catch { return [] }
}

/**
 * حقول نموذج الطلب: المسمى (من الكتالوج)، والعدد المطلوب، والسبب — وبعدهم أي حقول زوّدها مسؤول النظام على النوع من بانِي الطلبات
 * (زي باقي الوجهات: حقول الوجهة بتتزوّد على المتسجّل، مابتمسحوش).
 */
export function positionRequestFields(titles: string[], type: Pick<RequestType, 'requiredFields' | 'customFields'>): { requiredFields: string; customFields: string } {
  const own = [
    { key: 'positionTitle', label: 'المسمى الوظيفي المطلوب', type: 'select', required: true, options: titles },
    { key: 'headcount', label: 'العدد المطلوب', type: 'number', required: true },
    { key: 'reason', label: 'سبب الطلب', type: 'text', required: true },
  ]
  // مفاتيح الوجهة ومفاتيح الخادم مش حقول يحددها الباني
  const reserved: string[] = [...own.map(field => field.key), ...POSITION_REQUEST_STAGED_KEYS]
  const extra = listOf(type.customFields).filter((field): field is { key: string } => !!field && typeof field === 'object' && typeof (field as { key?: unknown }).key === 'string'
    && !reserved.includes((field as { key: string }).key))
  const required = [...new Set([...own.map(field => field.key), ...listOf(type.requiredFields).filter((key): key is string => typeof key === 'string' && !(POSITION_REQUEST_STAGED_KEYS as readonly string[]).includes(key))])]
  const fields: Array<{ key: string }> = [...own, ...extra]
  // النموذج بيرسم الحقول المخصّصة بس: أي مفتاح إلزامي متسجّل من غير حقل بياخد خانة نص (زي باقي الوجهات)
  for (const key of required) if (!fields.some(field => field.key === key)) fields.push({ key, label: key, type: 'text', required: true } as { key: string })
  return { requiredFields: JSON.stringify(required), customFields: JSON.stringify(fields) }
}

/** قيم الطلب: المسمى في الكتالوج (نشط)، والعدد من 1 للحد. بترجع المسمى والعدد النضاف أو بترمي رسالة الخطأ */
async function positionRequestValues(em: EntityManager, payload: Record<string, unknown>): Promise<{ jobTitleId: number; title: string; headcount: number }> {
  const title = normalTitle(payload.positionTitle)
  const catalog = title ? (await em.getRepository(JobTitle).find({ where: { isActive: true }, order: { id: 'ASC' } })).find(row => normalTitle(row.title) === title) : undefined
  if (!catalog) throw new BadRequestException(POSITION_REQUEST_TITLE_MISSING)
  const headcount = typeof payload.headcount === 'string' && /^\d{1,4}$/.test(payload.headcount.trim()) ? Number(payload.headcount.trim()) : payload.headcount
  if (!Number.isSafeInteger(headcount) || Number(headcount) < 1 || Number(headcount) > POSITION_REQUEST_MAX) throw new BadRequestException(POSITION_REQUEST_COUNT)
  if (typeof payload.reason !== 'string' || !payload.reason.trim()) throw new BadRequestException(POSITION_REQUEST_REASON)
  return { jobTitleId: catalog.id, title: catalog.title, headcount: Number(headcount) }
}

/**
 * التقديم (وكل إعادة تقديم): نفس فحوص الاعتماد النهائي بدري، وتثبيت قسم الوظيفة على الطلب — قسم مقدّم الطلب دلوقتي لو تبع فرع الطلب،
 * وإلا مستوى الفرع (من غير قسم، أو قسمه من فرع تاني زي الإدارة التنفيذية فوق الفروع). بترجع الحمولة اللي هتتخزّن.
 */
export async function stagePositionRequest(em: EntityManager, req: Pick<Request, 'payload' | 'requesterId' | 'branchId'>): Promise<Record<string, unknown>> {
  if (!(await positionsReady(em))) throw new BadRequestException(POSITIONS_MIGRATION_MISSING)
  const payload: Record<string, unknown> = JSON.parse(req.payload || '{}')
  await positionRequestValues(em, payload)
  // فرع الطلب متسجّل من أول ما اتعمل؛ مقدّم الطلب لازم يكون لسه فيه عشان قسمه هو اللي بيتثبّت
  const requester = await em.getRepository(Employee).findOne({ where: { id: req.requesterId }, select: { id: true, branchId: true, departmentId: true } })
  if (!requester || Number(requester.branchId) !== Number(req.branchId)) throw new BadRequestException(POSITION_REQUEST_BRANCH_MOVED)
  const department = requester.departmentId ? await em.getRepository(Department).findOne({ where: { id: requester.departmentId } }) : null
  const own = department && department.branchId === req.branchId ? department : null
  return { ...payload, positionDepartmentId: own ? own.id : null, positionDepartment: own ? own.name : POSITION_REQUEST_BRANCH_LEVEL }
}

/**
 * القسم المتثبّت على الطلب وقت التقديم: null = مستوى الفرع، ورقم = قسم لازم لسه موجود وتبع فرع الطلب. طلب من غير تثبيت (حمولة مش من
 * مسار التقديم، فالمفتاح مش موجود) = مرفوض.
 * بيتنادى **بعد** قفل إنشاء الوظائف، وصف القسم بيتقفل لآخر المعاملة (Codex CRP3A-B02): قسم اتنقل لفرع تاني والاعتماد مستني القفل
 * بيتشاف هنا ويترفض؛ ونقل بيبدأ بعد الفحص بيستنى لحد ما الوظيفة تتحفظ.
 */
async function stagedDepartment(em: EntityManager, req: Pick<Request, 'branchId'>, payload: Record<string, unknown>): Promise<number | null> {
  const staged = payload.positionDepartmentId
  if (staged === null) return null
  const department = Number.isSafeInteger(staged) && Number(staged) > 0
    ? await em.getRepository(Department).findOne({ where: { id: Number(staged) }, lock: { mode: 'pessimistic_write' } }) : null
  if (!department || department.branchId !== req.branchId) throw new BadRequestException(POSITION_REQUEST_UNIT_GONE)
  return department.id
}

/** التنفيذ عند الاعتماد النهائي، جوه معاملة الاعتماد: على فرع الطلب والقسم المتثبّت عليه وقت التقديم */
export async function executePositionRequest(em: EntityManager, req: Request, _type: RequestType, payload: Record<string, unknown>): Promise<{ ref: string; completed: boolean }> {
  if (!(await positionsReady(em))) throw new BadRequestException(POSITIONS_MIGRATION_MISSING)
  const positions = em.getRepository(ApprovedPosition)
  // طلبين معتمدين في نفس اللحظة لنفس المسمى على نفس الوحدة: واحد ورا التاني، فالتاني يلاقي وظيفة الأول ويزوّد عددها بدل ما يعمل وظيفة تانية
  if (!(await lockPositionCreation(em))) throw new ConflictException('إنشاء الوظائف المعتمدة شغال دلوقتي من حد تاني؛ جرّب تاني بعد شوية')
  // الحكم كله بعد القفل: اللي اتغيّر والاعتماد مستني (المسمى اتقفل، القسم اتنقل) بيتشاف دلوقتي مش بقيمة قديمة
  const values = await positionRequestValues(em, payload)
  const departmentId = await stagedDepartment(em, req, payload)
  // وظيفة قايمة (مش ملغية) بنفس المسمى على نفس الوحدة: صفها بيتقفل وعددها بيزيد
  const existing = await positions.createQueryBuilder('p').setLock('pessimistic_write')
    .where('p.jobTitleId = :jobTitleId', { jobTitleId: values.jobTitleId }).andWhere('p.branchId = :branchId', { branchId: req.branchId })
    .andWhere(departmentId == null ? 'p.departmentId IS NULL' : 'p.departmentId = :departmentId', { departmentId })
    .andWhere('p.teamId IS NULL').andWhere(`p.status <> 'CANCELLED'`).orderBy('p.id', 'ASC').getOne()
  if (existing) {
    const before = existing.headcount
    // نفس حد العدد المعتمد بتاع شاشة الوظائف: زيادة تعدّيه مرفوضة برسالتها (والطلب في صندوق المعتمد)
    if (before + values.headcount > POSITION_HEADCOUNT_MAX) throw new BadRequestException(POSITION_REQUEST_OVER)
    await positions.update({ id: existing.id }, { headcount: before + values.headcount })
    await recordAudit(em, { category: 'SETTINGS', action: 'POSITION_REQUEST_EXECUTED', entityType: 'position', entityId: existing.id, branchId: existing.branchId,
      summary: `زيادة عدد الوظيفة المعتمدة ${positionCode(existing.id)} من ${before} لـ${before + values.headcount} بطلب معتمد رقم ${req.id}`,
      before: { headcount: before }, after: { headcount: before + values.headcount, requestId: req.id } })
    return { ref: `POS-${existing.id}`, completed: true }
  }
  const created = await positions.save(positions.create({ jobTitleId: values.jobTitleId, gradeId: null, branchId: req.branchId, departmentId, teamId: null, costCenterId: null,
    headcount: values.headcount, status: 'ACTIVE', budget: null, createdAt: new Date() }))
  await recordAudit(em, { category: 'SETTINGS', action: 'POSITION_REQUEST_EXECUTED', entityType: 'position', entityId: created.id, branchId: created.branchId,
    summary: `وظيفة معتمدة جديدة ${positionCode(created.id)} بعدد ${created.headcount} بطلب معتمد رقم ${req.id}`,
    after: { jobTitleId: created.jobTitleId, branchId: created.branchId, departmentId: created.departmentId, headcount: created.headcount, requestId: req.id } })
  return { ref: `POS-${created.id}`, completed: true }
}
