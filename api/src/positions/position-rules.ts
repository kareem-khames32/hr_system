import type { EntityManager } from 'typeorm'
import type { EmployeeStatus } from '../common/domain-status'
import { POSITION_STATUSES, type PositionStatus } from './position.entities'

// B2.11: قواعد الوظائف المعتمدة: مين بيشغل مقعد، وأرقام الوظيفة، وحكم التعيين على وظيفة، وتنضيف المدخلات — وجاهزية جدولي الترحيل.

export const POSITIONS_MIGRATION_MISSING = 'الوظائف المعتمدة محتاجة ترحيل 20261007_097 على قاعدة البيانات'

let ready: boolean | null = null
/** جدولي ترحيل 097 (positions وposition_holders) موجودين؟ الموجود بيتحفظ (المخطط مابيتشالش). الناقص مابيتحفظش: بيتفحص مع كل نداء (قاعدة CRP2N) */
export async function positionsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.positions', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.position_holders', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الجدولين */
export function resetPositionsCache() { ready = null }

/**
 * قفل إنشاء الوظائف (على مستوى الشركة، لآخر المعاملة): التوليد من الموجود وتنفيذ طلب «وظيفة جديدة / زيادة عدد» واحد ورا التاني — عشان
 * اتنين مايعملوش وظيفة لنفس المسمى على نفس الوحدة. false = القفل مااتاخدش في مهلته.
 */
export async function lockPositionCreation(em: EntityManager): Promise<boolean> {
  const rows = await em.query(`DECLARE @result int;
    EXEC @result = sys.sp_getapplock @Resource = N'hr:positions:generate', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 15000;
    SELECT @result AS [lockResult];`)
  return rows.length > 0 && Number(rows[0].lockResult) >= 0
}
/** الميزة الفرعية: التعيين لازم على وظيفة معتمدة فيها شاغر (مقفولة افتراضيًا) */
export const POSITIONS_ENFORCE_FEATURE = 'positions.enforce_on_hiring'
export const POSITION_STATUS_LABELS: Record<PositionStatus, string> = { ACTIVE: 'نشطة', FROZEN: 'مجمّدة', CANCELLED: 'ملغية' }
export const POSITION_HEADCOUNT_MAX = 10000
export const POSITION_BUDGET_MAX = 999_999_999_999.99

export const POSITION_NOT_IN_BRANCH = 'الوظيفة المعتمدة غير موجودة في فرع الموظف'
export const POSITION_OTHER_UNIT = 'الوظيفة دي تبع قسم أو فريق غير اللي الموظف فيه'
/** وظيفة قسمها مابقاش تبع فرعها أو فريقها مابقاش تبع قسمها (تعديل في الهيكل): مفيش إسناد جديد عليها — من غير أسماء ولا أرقام */
export const POSITION_UNIT_MOVED = 'وحدة الوظيفة دي اتغيّرت في الهيكل ومابقتش تبع فرعها: مفيش تعيين ولا ربط عليها. الغِ الوظيفة واعمل واحدة على الوحدة الصح'
export const POSITION_REQUIRED = 'اختار الوظيفة المعتمدة: التعيين من غير وظيفة معتمدة مقفول (من إعدادات الموديولات)'
export const positionClosedMessage = (status: PositionStatus) => `الوظيفة دي ${POSITION_STATUS_LABELS[status] ?? 'مش نشطة'}: مفيش تعيين عليها`
export const positionFullMessage = (headcount: number, occupied: number) => `الوظيفة دي مليانة: معتمد لها ${headcount} ومشغول ${occupied}`

/** كود الوظيفة للعرض: من رقمها (مش متخزّن، فمفيش تكرار ولا مولّد) */
export const positionCode = (id: number) => `P-${String(id).padStart(4, '0')}`

/** الموظف بيشغل مقعده طول ما خدمته ماانتهتش (الموقوف والمنذَر لسه شاغلينه). حالة مش معروفة = شاغل (الأشد) */
export const SEAT_FREEING_STATUSES: readonly EmployeeStatus[] = ['terminated', 'archived']
export const occupiesSeat = (status: string | null | undefined): boolean => !SEAT_FREEING_STATUSES.includes(status as EmployeeStatus)

export interface PositionUnit { branchId: number; departmentId: number | null; teamId: number | null }
export interface EmployeeUnit { branchId?: number | null; departmentId?: number | null; teamId?: number | null }

/** الموظف في وحدة الوظيفة؟ نفس الفرع، ونفس القسم والفريق لو الوظيفة محددة بيهم */
export const inPositionUnit = (position: PositionUnit, employee: EmployeeUnit): boolean =>
  employee.branchId != null && Number(employee.branchId) === position.branchId
  && (position.departmentId == null || (employee.departmentId != null && Number(employee.departmentId) === position.departmentId))
  && (position.teamId == null || (employee.teamId != null && Number(employee.teamId) === position.teamId))

export interface SeatCounts { approved: number; occupied: number; vacant: number; over: number }

/** أرقام الوظيفة: الملغية معتمدها صفر (فكل شاغليها زيادة)، والشاغر للنشطة بس (المجمّدة متوقف التعيين عليها) */
export function seatCounts(position: { headcount: number; status: PositionStatus }, occupied: number): SeatCounts {
  const approved = position.status === 'CANCELLED' ? 0 : position.headcount
  return { approved, occupied, vacant: position.status === 'ACTIVE' ? Math.max(0, position.headcount - occupied) : 0, over: Math.max(0, occupied - approved) }
}

export interface SeatVerdict { status: 400 | 409; message: string }

/**
 * حكم شغل مقعد (عند التعيين، وعند ربط موظف قايم من الشاشة). null = مسموح.
 *  - الوظيفة لازم موجودة وفي فرع الموظف (غير كده نفس رد «غير موجودة»: مفيش كاشف لوظائف فرع تاني)، وفي قسمه وفريقه لو محددة بيهم، ونشطة.
 *  - والإنفاذ مفعّل: لازم فيها شاغر (occupied = الشاغلين دلوقتي من غير الموظف ده).
 */
export function seatVerdict(position: (PositionUnit & { headcount: number; status: PositionStatus }) | null, employee: EmployeeUnit, occupied: number, enforce: boolean): SeatVerdict | null {
  if (!position || employee.branchId == null || Number(employee.branchId) !== position.branchId) return { status: 400, message: POSITION_NOT_IN_BRANCH }
  if (!inPositionUnit(position, employee)) return { status: 400, message: POSITION_OTHER_UNIT }
  if (position.status !== 'ACTIVE') return { status: 400, message: positionClosedMessage(position.status) }
  if (enforce && occupied >= position.headcount) return { status: 409, message: positionFullMessage(position.headcount, occupied) }
  return null
}

const idOf = (value: unknown): number | null => Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : null

export interface PositionInput {
  jobTitleId?: unknown; gradeId?: unknown; branchId?: unknown; departmentId?: unknown; teamId?: unknown; costCenterId?: unknown
  headcount?: unknown; status?: unknown; budget?: unknown
}
export interface CleanPosition {
  jobTitleId: number; gradeId: number | null; branchId: number; departmentId: number | null; teamId: number | null; costCenterId: number | null
  headcount: number; status: PositionStatus; budget: string | null
}

/** الميزانية: فاضية، أو رقم مش سالب بخانتين عشريتين بالكتير */
export function cleanBudget(value: unknown): { ok: true; value: string | null } | { ok: false } {
  if (value === null || value === undefined || value === '') return { ok: true, value: null }
  const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : ''
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(text)) return { ok: false }
  const amount = Number(text)
  if (!Number.isFinite(amount) || amount > POSITION_BUDGET_MAX) return { ok: false }
  return { ok: true, value: amount.toFixed(2) }
}

export const cleanHeadcount = (value: unknown): number | null =>
  Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) <= POSITION_HEADCOUNT_MAX ? Number(value) : null

export const isPositionStatus = (value: unknown): value is PositionStatus => (POSITION_STATUSES as readonly unknown[]).includes(value)

/** مدخلات وظيفة جديدة: نص الخطأ، أو القيم النضيفة. الروابط (المسمى، الفرع، القسم…) بتتفحص في الخدمة على القاعدة */
export function cleanNewPosition(input: PositionInput): { error: string } | { value: CleanPosition } {
  const jobTitleId = idOf(input.jobTitleId), branchId = idOf(input.branchId)
  if (!jobTitleId) return { error: 'اختار المسمى الوظيفي من الكتالوج' }
  if (!branchId) return { error: 'اختار فرع الوظيفة' }
  const departmentId = input.departmentId == null ? null : idOf(input.departmentId)
  const teamId = input.teamId == null ? null : idOf(input.teamId)
  const gradeId = input.gradeId == null ? null : idOf(input.gradeId)
  const costCenterId = input.costCenterId == null ? null : idOf(input.costCenterId)
  if ((input.departmentId != null && !departmentId) || (input.teamId != null && !teamId) || (input.gradeId != null && !gradeId) || (input.costCenterId != null && !costCenterId)) {
    return { error: 'رقم القسم أو الفريق أو الدرجة أو مركز التكلفة مش صحيح' }
  }
  if (teamId && !departmentId) return { error: 'الفريق محتاج قسمه: اختار القسم الأول' }
  const headcount = cleanHeadcount(input.headcount)
  if (!headcount) return { error: `العدد المعتمد رقم صحيح من 1 لـ${POSITION_HEADCOUNT_MAX}` }
  const status = input.status === undefined ? 'ACTIVE' : input.status
  if (!isPositionStatus(status)) return { error: 'حالة الوظيفة: نشطة أو مجمّدة أو ملغية' }
  const budget = cleanBudget(input.budget)
  if (!budget.ok) return { error: 'الميزانية رقم مش سالب بخانتين عشريتين بالكتير' }
  return { value: { jobTitleId, gradeId, branchId, departmentId, teamId, costCenterId, headcount, status, budget: budget.value } }
}

/** مفتاح توليد وظيفة من الموجود: (المسمى × القسم × الفرع) */
export const generationKey = (branchId: number, departmentId: number | null, title: string) => `${branchId}:${departmentId ?? 0}:${title}`
/** المسمى الحر على ملف الموظف بيتطابق مع الكتالوج بالنص بعد شيل المسافات الزيادة */
export const normalTitle = (value: unknown): string => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
