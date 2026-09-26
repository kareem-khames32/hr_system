import { BadRequestException } from '@nestjs/common'
import { payrollPeriodBounds, payrollPeriodOfDate } from '../payroll/payroll-period'

// استثناءات أيام الراحة جوه جدول العمل نفسه (قرار المالك 26 سبتمبر):
// جدول «الجمعة والسبت راحة ماعدا آخر سبت في الشهر» — آخر سبت يبقى يوم شغل لموظفي الجدول ده بس، مش للشركة كلها
// زي القواعد الاستثنائية العامة (اللي أصغر مستوى ليها الفرع). بتتحفظ JSON في work_schedules.weekendExceptions وبتدخل
// في نسخة الجدول المؤرخة زي أيام الراحة بالظبط، فتعديلها بتاريخ سريان ومايغيّرش الأيام اللي قبله.
// «آخر سبت» على الشهر المالي (من يوم بداية دورة الرواتب لليوم اللي قبله في الشهر اللي بعده — 23 → 22) أو الشهر الميلادي.
// يوم بداية الدورة بيتثبت في القاعدة وقت الحفظ، فتغيير الدورة بعدين مايقلبش الأيام القديمة من غير ما حد يعرف.
export const SCHEDULE_EXCEPTION_WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const
export const SCHEDULE_EXCEPTION_OCCURRENCES = ['ALL', '1ST', '2ND', '3RD', '4TH', 'LAST'] as const
export type ScheduleExceptionWeekday = (typeof SCHEDULE_EXCEPTION_WEEKDAYS)[number]
export type ScheduleExceptionOccurrence = (typeof SCHEDULE_EXCEPTION_OCCURRENCES)[number]

export interface WorkScheduleException {
  weekday: ScheduleExceptionWeekday
  occurrence: ScheduleExceptionOccurrence
  effect: 'WORK' | 'OFF'
  basis: 'PAYROLL' | 'CALENDAR'
  cycleStartDay?: number
}

export const MAX_SCHEDULE_EXCEPTIONS = 8
const OCCURRENCE_INDEX: Record<string, number> = { '1ST': 1, '2ND': 2, '3RD': 3, '4TH': 4 }

function realDate(date: string): Date {
  return new Date(`${date}T12:00:00Z`)
}

function oneRule(value: unknown, fail: (message: string) => never): WorkScheduleException {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('استثناء أيام الراحة لازم يكون عنصر واضح')
  const row = value as Record<string, unknown>
  const weekday = String(row.weekday ?? '').trim().toUpperCase()
  const occurrence = String(row.occurrence ?? '').trim().toUpperCase()
  const effect = String(row.effect ?? '').trim().toUpperCase()
  const basis = String(row.basis ?? 'CALENDAR').trim().toUpperCase()
  if (!(SCHEDULE_EXCEPTION_WEEKDAYS as readonly string[]).includes(weekday)) return fail('يوم الاستثناء غير صالح')
  if (!(SCHEDULE_EXCEPTION_OCCURRENCES as readonly string[]).includes(occurrence)) return fail('تكرار الاستثناء غير صالح (كل أسبوع، الأول … الرابع، الأخير)')
  if (effect !== 'WORK' && effect !== 'OFF') return fail('الاستثناء يا «دوام» يا «راحة»')
  if (basis !== 'PAYROLL' && basis !== 'CALENDAR') return fail('أساس الشهر يا المالي يا الميلادي')
  const rule: WorkScheduleException = {
    weekday: weekday as ScheduleExceptionWeekday,
    occurrence: occurrence as ScheduleExceptionOccurrence,
    effect,
    basis,
  }
  if (basis === 'PAYROLL' && occurrence !== 'ALL') {
    const day = Number(row.cycleStartDay)
    if (!Number.isInteger(day) || day < 1 || day > 31) return fail('يوم بداية الشهر المالي في الاستثناء غير صالح')
    rule.cycleStartDay = day
  }
  return rule
}

/** قراءة القيمة المحفوظة (نص JSON أو مصفوفة) — القيمة التالفة مابتتحولش لـ«مفيش استثناءات» في صمت. */
export function parseWorkScheduleExceptions(value: unknown, fail: (message: string) => never): WorkScheduleException[] {
  if (value == null || value === '') return []
  let list: unknown = value
  if (typeof value === 'string') {
    try { list = JSON.parse(value) } catch { return fail('استثناءات أيام الراحة في الجدول تالفة') }
  }
  if (!Array.isArray(list)) return fail('استثناءات أيام الراحة في الجدول تالفة')
  if (list.length > MAX_SCHEDULE_EXCEPTIONS) return fail(`استثناءات أيام الراحة لا تزيد عن ${MAX_SCHEDULE_EXCEPTIONS}`)
  return list.map(item => oneRule(item, fail))
}

const badInput = (message: string): never => { throw new BadRequestException(message) }

/**
 * مدخلات شاشة أيام العمل ← نص JSON للحفظ (أو null). بيتحقق إن كل استثناء له معنى مع أيام راحة الجدول:
 * «دوام» على يوم راحة، و«راحة» على يوم شغل؛ وبيثبّت يوم بداية الشهر المالي الحالي في استثناءات الشهر المالي.
 */
export function normalizeWorkScheduleExceptions(value: unknown, weekendDays: string, cycleStartDay: number): string | null {
  const rules = parseWorkScheduleExceptions(
    Array.isArray(value) ? value.map(item => item && typeof item === 'object' ? { ...(item as object), cycleStartDay } : item) : value,
    badInput)
  assertWorkScheduleExceptionsFit(rules, weekendDays)
  const seen = new Set<string>()
  for (const rule of rules) {
    const key = `${rule.weekday}|${rule.occurrence}`
    if (seen.has(key)) badInput('فيه استثناءين لنفس اليوم ونفس التكرار — سيب واحد بس')
    seen.add(key)
  }
  return rules.length ? JSON.stringify(rules.map(rule => ({
    weekday: rule.weekday, occurrence: rule.occurrence, effect: rule.effect, basis: rule.basis,
    ...(rule.cycleStartDay ? { cycleStartDay: rule.cycleStartDay } : {}),
  }))) : null
}

/** استثناء بقى مالوش معنى بعد تعديل أيام الراحة (مثلًا «دوام آخر سبت» والسبت بقى يوم شغل) بيترفض برسالة واضحة. */
export function assertWorkScheduleExceptionsFit(rules: WorkScheduleException[], weekendDays: string) {
  const weekend = String(weekendDays ?? '').split(',').map(day => day.trim().toUpperCase()).filter(Boolean)
  for (const rule of rules) {
    const label = WEEKDAY_LABELS[rule.weekday]
    if (rule.effect === 'WORK' && !weekend.includes(rule.weekday)) {
      badInput(`استثناء «دوام ${label}» مالوش معنى لأن ${label} يوم شغل أصلًا في الجدول — شيله أو عدّل أيام الراحة`)
    }
    if (rule.effect === 'OFF' && weekend.includes(rule.weekday)) {
      badInput(`استثناء «راحة ${label}» مالوش معنى لأن ${label} يوم راحة أصلًا في الجدول — شيله أو عدّل أيام الراحة`)
    }
  }
}

export const WEEKDAY_LABELS: Record<ScheduleExceptionWeekday, string> = {
  SUN: 'الأحد', MON: 'الاثنين', TUE: 'الثلاثاء', WED: 'الأربعاء', THU: 'الخميس', FRI: 'الجمعة', SAT: 'السبت',
}

/** هل الاستثناء بيطابق اليوم ده؟ (اليوم نفسه بعد فحص إنه نفس يوم الأسبوع) */
export function scheduleExceptionMatches(date: string, weekday: string, rule: WorkScheduleException): boolean {
  if (rule.weekday !== weekday) return false
  if (rule.occurrence === 'ALL') return true
  const parsed = realDate(date)
  if (rule.basis === 'PAYROLL' && rule.cycleStartDay) {
    // الشهر المالي اللي فيه اليوم — نفس دالة المسير بالحرف
    const bounds = payrollPeriodBounds(payrollPeriodOfDate(date, rule.cycleStartDay), rule.cycleStartDay)
    const sinceStart = Math.round((parsed.getTime() - realDate(bounds.startDate).getTime()) / 86400000)
    if (rule.occurrence === 'LAST') return date > bounds.endDate ? false : realDateAfter(date, 7) > bounds.endDate
    return Math.floor(sinceStart / 7) + 1 === OCCURRENCE_INDEX[rule.occurrence]
  }
  if (rule.occurrence === 'LAST') {
    const after = new Date(parsed); after.setUTCDate(parsed.getUTCDate() + 7)
    return after.getUTCMonth() !== parsed.getUTCMonth()
  }
  return Math.floor((parsed.getUTCDate() - 1) / 7) + 1 === OCCURRENCE_INDEX[rule.occurrence]
}

function realDateAfter(date: string, days: number): string {
  const next = realDate(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}
