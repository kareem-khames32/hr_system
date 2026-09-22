// قواعد نوع الإجازة عند تقديم الطلب (شاشة «أنواع الإجازات» — قرار المالك 16 سبتمبر).
// دوال نقية بلا قاعدة بيانات: التقديم يحسب الأيام وعدد مرات السنة ويمرّرها هنا، فتتختبر لوحدها.
import { BadRequestException } from '@nestjs/common'
import type { LeaveType } from './entities/leave.entities'

export type LeaveTypeRules = Pick<LeaveType,
  | 'nameAr' | 'isPaid' | 'category' | 'maxDays' | 'minDaysPerRequest' | 'noticeDays' | 'backdateAllowed'
  | 'backdateMaxDays' | 'countingMode' | 'halfDayAllowed' | 'fixedDays' | 'maxTimesPerYear'
  | 'attachmentRule' | 'attachmentAboveDays' | 'requiredAttachment' | 'attachmentTiming'>

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export const isHalfDayPeriod = (period: unknown) => ['MORNING', 'EVENING'].includes(String(period))

// ALL_DAYS = كل أيام التقويم · WORKING_DAYS = أيام العمل.
// بدون راتب والمرضية بكل الأيام دائمًا: المسير يخصمهما يومًا بيوم على التقويم، فالطلب والرصيد والمسير رقم واحد.
// نوع لم يُضبط من الشاشة (بلا فئة): السلوك القديم — غير المدفوعة بالتقويم والمدفوعة بأيام العمل.
export function leaveCountsAllDays(lt: Pick<LeaveTypeRules, 'countingMode' | 'isPaid' | 'category'>): boolean {
  if (lt.category === 'UNPAID' || lt.category === 'SICK') return true
  if (!lt.category) return lt.isPaid === false
  return lt.countingMode === 'ALL_DAYS'
}

export function ymdAddDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// حدّ الأثر الرجعي من النوع: 0 = ممنوع، رقم = أقصى أيام، null = النوع ما حددش (يفضل الإعداد العام)
export function leaveTypeBackdateLimit(lt: Pick<LeaveTypeRules, 'backdateAllowed' | 'backdateMaxDays'>): number | null {
  if (lt.backdateAllowed === false) return 0
  const max = num(lt.backdateMaxDays)
  return max !== null && max >= 0 ? Math.floor(max) : null
}

// المرفق مطلوب مع الطلب نفسه؟ (AFTER_RETURN بيتطلب بعد الرجوع، مش وقت التقديم)
export function leaveAttachmentRequiredAtSubmit(
  lt: Pick<LeaveTypeRules, 'attachmentRule' | 'attachmentAboveDays' | 'attachmentTiming'>,
  days: number
): boolean {
  if (lt.attachmentTiming === 'AFTER_RETURN') return false
  if (lt.attachmentRule === 'REQUIRED') return true
  if (lt.attachmentRule === 'REQUIRED_ABOVE_DAYS') return days > (num(lt.attachmentAboveDays) ?? 0)
  return false
}

// نص اليوم + الأثر الرجعي + مدة الإشعار. exemptTiming = الموارد البشرية بتسجّل نيابةً عن موظف
export function assertLeaveTypeDateRules(
  lt: LeaveTypeRules,
  input: { fromDate: string; period?: unknown; today: string; exemptTiming?: boolean }
) {
  const name = lt.nameAr
  if (isHalfDayPeriod(input.period) && lt.halfDayAllowed === false) {
    throw new BadRequestException(`«${name}» مينفعش تتاخد نص يوم — اختار يوم كامل`)
  }
  if (input.exemptTiming) return
  const limit = leaveTypeBackdateLimit(lt)
  if (limit !== null && input.fromDate < input.today) {
    if (limit === 0) {
      throw new BadRequestException(`«${name}» مينفعش تتقدّم بأثر رجعي — تاريخ البداية لازم يكون النهارده أو بعده`)
    }
    const oldest = ymdAddDays(input.today, -limit)
    if (input.fromDate < oldest) {
      throw new BadRequestException(`«${name}» بأثر رجعي لحد ${limit} يوم بس — أقدم تاريخ بداية مسموح ${oldest}`)
    }
  }
  const notice = Math.max(0, Math.floor(num(lt.noticeDays) ?? 0))
  if (notice > 0) {
    const earliest = ymdAddDays(input.today, notice)
    if (input.fromDate < earliest) {
      throw new BadRequestException(`«${name}» لازم تتقدّم قبلها بـ${notice} يوم على الأقل — أقرب تاريخ بداية ${earliest}`)
    }
  }
}

// أقل/أقصى أيام للطلب + أيام المناسبة الثابتة ومرات السنة + المرفق مع الطلب
export function assertLeaveTypeDaysRules(
  lt: LeaveTypeRules,
  input: { days: number; attachmentRef?: unknown; timesThisYear?: number; year?: string }
) {
  const name = lt.nameAr
  const days = Number(input.days)
  const unit = leaveCountsAllDays(lt) ? 'أيام تقويم' : 'أيام عمل'
  const min = num(lt.minDaysPerRequest)
  if (min !== null && min > 0 && days < min) {
    throw new BadRequestException(`«${name}» أقل مدة للطلب ${min} يوم (${unit}) — إنت طالب ${days}`)
  }
  const max = num(lt.maxDays)
  if (max !== null && max > 0 && days > max) {
    throw new BadRequestException(`«${name}» أقصى مدة للطلب الواحد ${max} يوم (${unit}) — إنت طالب ${days}`)
  }
  if (lt.category === 'OCCASION') {
    const fixed = num(lt.fixedDays)
    if (fixed !== null && fixed > 0 && days > fixed) {
      throw new BadRequestException(`«${name}» أيامها ${fixed} يوم بس في المرة — إنت طالب ${days}`)
    }
    const times = num(lt.maxTimesPerYear)
    const used = input.timesThisYear ?? 0
    if (times !== null && times > 0 && used >= times) {
      throw new BadRequestException(
        `«${name}» مسموحة ${times} مرة في السنة، وعندك ${used} في ${input.year ?? 'نفس السنة'} (معتمدة أو تحت الاعتماد)`
      )
    }
  }
  if (leaveAttachmentRequiredAtSubmit(lt, days)) {
    // المرجع لازم يكون ملف مرفوع فعلاً (file:رقم من POST /files/upload) — نص مكتوب بالإيد
    // كان بيعدّي كأنه مرفق ويسيب الاعتماد بلا مستند
    const ref = String(input.attachmentRef ?? '').trim()
    const label = String(lt.requiredAttachment ?? '').trim() || 'مستند داعم'
    if (!ref) throw new BadRequestException(`«${name}» لازم ترفع ${label} مع الطلب`)
    if (!/^file:\d+$/.test(ref)) {
      throw new BadRequestException(`«${name}»: ${label} لازم يكون ملف مرفوع فعلاً مع الطلب — ارفعه من زر المرفق`)
    }
  }
}
