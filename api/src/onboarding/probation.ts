import { BadRequestException } from '@nestjs/common'

// B3.1-ج: فترة التجربة — القرار (تثبيت، تمديد، إنهاء) ومهمة المدير قبل النهاية. من غير جدول جديد: القرار بيتسجّل في سجل تغييرات
// الموظف القايم (recordEmployeeChange)، والحالة وتاريخ نهاية التجربة على ملف الموظف زي ما هم.

/** أيام قبل نهاية التجربة بتتفتح فيها مهمة القرار على المدير (0 = من غير مهمة) */
export const PROBATION_NOTICE_KEY = 'onboarding.probation_notice_days'
export const PROBATION_NOTICE_DEFAULT = 14
/** مدة التجربة الافتراضية بالأيام لملف من غير تاريخ نهاية (0 = من غير مدة افتراضية) */
export const PROBATION_DAYS_KEY = 'onboarding.probation_days'
export const PROBATION_JOB = 'onboarding.probation-tasks'
export const PROBATION_DECISIONS = ['CONFIRM', 'EXTEND', 'TERMINATE'] as const
export type ProbationDecision = (typeof PROBATION_DECISIONS)[number]
export const PROBATION_NOT_ON = 'الموظف مش تحت التجربة'
export const PROBATION_CHANGED = 'بيانات الموظف اتغيّرت — حدّث الصفحة وحاول تاني'
export const PROBATION_REASON_MAX = 300

const YMD = /^\d{4}-\d{2}-\d{2}$/
const ymdOf = (value: unknown): string | null => {
  const text = value instanceof Date
    ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
    : String(value ?? '').slice(0, 10)
  return YMD.test(text) ? text : null
}
const utcOf = (ymd: string): number => Date.parse(`${ymd}T00:00:00Z`)
/** تاريخ تقويمي حقيقي (2026-02-31 مش تاريخ) */
const realDate = (ymd: string): boolean => YMD.test(ymd) && !Number.isNaN(utcOf(ymd)) && new Date(utcOf(ymd)).toISOString().slice(0, 10) === ymd
export const addDaysYmd = (ymd: string, days: number): string => new Date(utcOf(ymd) + days * 86400000).toISOString().slice(0, 10)
export const daysBetween = (from: string, to: string): number => Math.round((utcOf(to) - utcOf(from)) / 86400000)

export interface ProbationFile { probationEndDate?: unknown; joinDate?: unknown; actualStartDate?: unknown }
/**
 * نهاية التجربة الفعلية: التاريخ المكتوب على الملف، وإلا (والمدة الافتراضية مضبوطة) تاريخ المباشرة + المدة. من غير الاتنين = مفيش تاريخ.
 */
export function effectiveProbationEnd(file: ProbationFile, defaultDays: number): { date: string | null; fromDefault: boolean } {
  const stored = ymdOf(file.probationEndDate)
  if (stored) return { date: stored, fromDefault: false }
  const start = ymdOf(file.actualStartDate) ?? ymdOf(file.joinDate)
  return start && Number.isInteger(defaultDays) && defaultDays > 0 ? { date: addDaysYmd(start, defaultDays), fromDefault: true } : { date: null, fromDefault: false }
}

/** سبب القرار: نص من 3 حروف لحد 300 لما يكون مطلوب (التمديد والإنهاء)، واختياري في التثبيت */
export function probationReason(raw: unknown, required: boolean): string | null {
  const text = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : ''
  if (!text) {
    if (required) throw new BadRequestException('اكتب سبب القرار (3 حروف على الأقل)')
    return null
  }
  if (text.length < 3) throw new BadRequestException('سبب القرار 3 حروف على الأقل')
  if (text.length > PROBATION_REASON_MAX) throw new BadRequestException(`سبب القرار لا يتجاوز ${PROBATION_REASON_MAX} حرف`)
  return text
}

/** تاريخ التمديد: تاريخ حقيقي بعد النهارده وبعد النهاية الحالية */
export function extensionDate(raw: unknown, today: string, currentEnd: string | null): string {
  const date = typeof raw === 'string' ? raw : ''
  if (!realDate(date)) throw new BadRequestException('تاريخ نهاية التجربة الجديد غير صالح — الصيغة YYYY-MM-DD')
  if (date <= today) throw new BadRequestException('تاريخ نهاية التجربة الجديد لازم يكون بعد النهارده')
  if (currentEnd && date <= currentEnd) throw new BadRequestException('تاريخ التمديد لازم يكون بعد نهاية التجربة الحالية')
  return date
}

export interface ProbationSubject { fullName: string; employeeCode: string }
/** عنوان مهمة القرار على المدير — بيتقفل بيه لما القرار يتسجّل */
export const probationTaskTitle = (employee: ProbationSubject): string => `قرار فترة التجربة: ${employee.fullName} (${employee.employeeCode})`.slice(0, 200)
/** عنوان مهمة الموارد البشرية بعد قرار «إنهاء» */
export const terminationTaskTitle = (employee: ProbationSubject): string => `فتح ملف إنهاء خدمة: ${employee.fullName} (${employee.employeeCode}) — قرار فترة التجربة`.slice(0, 200)

/** خانات ملف الموظف اللي حق صاحب القرار اتحكم عليها (والحالة والتاريخ): اتغيّرت بين الحكم والقفل = القرار بيترفض */
export const probationStamp = (employee: { status?: unknown; isActive?: unknown; branchId?: unknown; managerEmployeeId?: unknown; departmentId?: unknown; teamId?: unknown
  probationEndDate?: unknown }): string =>
  JSON.stringify([employee.status ?? null, employee.isActive === true || employee.isActive === 1, employee.branchId ?? null, employee.managerEmployeeId ?? null,
    employee.departmentId ?? null, employee.teamId ?? null, ymdOf(employee.probationEndDate)])
