import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { GOAL_KINDS, GOAL_OWNER_TYPES, type GoalKind, type GoalOwnerType, type GoalStatus } from './goal.entities'

// B3.6: قواعد أهداف الأداء — فحص وجود ترحيلي 110 و111، وقيم الهدف، وبصمة ملف الموظف اللي حق صاحب الإجراء اتحكم عليها.

export const GOALS_MIGRATION_MISSING = 'أهداف الأداء محتاجة ترحيلي 20261009_110 و20261009_111 على قاعدة البيانات'
export const GOAL_NOT_FOUND = 'الهدف غير موجود'
export const GOAL_TITLE = 'عنوان الهدف مطلوب (من 3 لـ200 حرف)'
export const GOAL_KIND = 'نوع الهدف: KPI أو GOAL'
export const GOAL_OWNER = 'صاحب الهدف: موظف أو قسم أو الشركة'
export const GOAL_WEIGHT = 'وزن الهدف رقم صحيح من 0 لـ100'
export const GOAL_VALUE = 'القيمة رقم بخانتين عشريتين بالكتير'
export const GOAL_PERIOD = 'فترة الهدف: تاريخين صالحين (YYYY-MM-DD)، والنهاية مش قبل البداية'
export const GOAL_REASON = 'السبب مطلوب (3 حروف على الأقل)'
export const GOAL_FORBIDDEN = 'الإجراء ده لمدير صاحب الهدف المباشر أو للموارد البشرية'
export const GOAL_CHANGED = 'بيانات الهدف أو صاحبه اتغيّرت — حدّث الصفحة وحاول تاني'
export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = { PROPOSED: 'مقترح', ACTIVE: 'ساري', DONE: 'اتحقق', CANCELLED: 'ملغي', REJECTED: 'مرفوض' }
export const GOAL_KIND_LABELS: Record<GoalKind, string> = { KPI: 'مؤشر', GOAL: 'هدف', PIP: 'خطة تحسين' }
export const GOAL_PIP = 'خطة التحسين بيعملها المدير المباشر أو إدارة الأداء لموظف (مش الموظف لنفسه)، ومن غير وزن'
export const GOAL_VALUE_MAX = 999_999_999_999.99

let ready: boolean | null = null
/** جدولي ترحيلي 110 و111 موجودين؟ الموجود بيتحفظ. الناقص بيتفحص مع كل نداء لحد ما الترحيلين يتطبقوا. */
export async function goalsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(
    `SELECT CASE WHEN OBJECT_ID(N'dbo.performance_goals', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.performance_goal_updates', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetGoalsCache() { ready = null }

export function cleanGoalTitle(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : ''
  if (value.length < 3 || value.length > 200) throw new BadRequestException(GOAL_TITLE)
  return value
}
export function cleanGoalKind(raw: unknown): GoalKind {
  if (typeof raw !== 'string' || !(GOAL_KINDS as readonly string[]).includes(raw)) throw new BadRequestException(GOAL_KIND)
  return raw as GoalKind
}
export function cleanGoalOwner(raw: unknown): GoalOwnerType {
  if (typeof raw !== 'string' || !(GOAL_OWNER_TYPES as readonly string[]).includes(raw)) throw new BadRequestException(GOAL_OWNER)
  return raw as GoalOwnerType
}
export function cleanGoalWeight(raw: unknown): number {
  if (!Number.isSafeInteger(raw) || (raw as number) < 0 || (raw as number) > 100) throw new BadRequestException(GOAL_WEIGHT)
  return raw as number
}
/** قيمة اختيارية (المستهدف، الفعلي): نص بخانتين، سالب مسموح (مؤشر ممكن ينزل) */
export function cleanGoalValue(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === '') return null
  const text = typeof raw === 'number' && Number.isFinite(raw) ? String(raw) : typeof raw === 'string' ? raw.trim() : ''
  if (!/^-?\d{1,12}(\.\d{1,2})?$/.test(text) || Math.abs(Number(text)) > GOAL_VALUE_MAX) throw new BadRequestException(GOAL_VALUE)
  return Number(text).toFixed(2)
}
const dateOf = (raw: unknown): string | null => {
  const text = typeof raw === 'string' ? raw.trim() : ''
  const time = /^\d{4}-\d{2}-\d{2}$/.test(text) ? Date.parse(`${text}T00:00:00Z`) : NaN
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === text ? text : null
}
export function cleanGoalPeriod(rawStart: unknown, rawEnd: unknown): { periodStart: string; periodEnd: string } {
  const periodStart = dateOf(rawStart), periodEnd = dateOf(rawEnd)
  if (!periodStart || !periodEnd || periodEnd < periodStart) throw new BadRequestException(GOAL_PERIOD)
  return { periodStart, periodEnd }
}
/** نص اختياري (الوصف، الوحدة، التعليق) */
export function cleanGoalText(raw: unknown, max: number, label: string): string | null {
  if (raw === undefined || raw === null) return null
  if (typeof raw !== 'string') throw new BadRequestException(`${label} نص`)
  const value = raw.replace(/\r\n?/g, '\n').trim()
  if (value.length > max) throw new BadRequestException(`${label} لا يتجاوز ${max} حرف`)
  return value || null
}
/** سبب إجباري (الرفض، التعديل في نص الفترة) */
export function cleanGoalReason(raw: unknown, max = 300): string {
  const value = cleanGoalText(raw, max, 'السبب')
  if (!value || value.length < 3) throw new BadRequestException(GOAL_REASON)
  return value
}

/** خانات ملف الموظف اللي حق صاحب الإجراء اتحكم عليها: اتغيّرت بين الحكم والقفل = الإجراء بيترفض (409) */
export const goalEmployeeStamp = (employee: { status?: unknown; isActive?: unknown; branchId?: unknown; managerEmployeeId?: unknown; departmentId?: unknown; teamId?: unknown } | null | undefined): string =>
  employee ? JSON.stringify([employee.status ?? null, employee.isActive === true || employee.isActive === 1, employee.branchId ?? null, employee.managerEmployeeId ?? null,
    employee.departmentId ?? null, employee.teamId ?? null]) : 'none'
