import { BadRequestException } from '@nestjs/common'
import { localDateOf } from '../attendance/attendance.service'

export interface PayrollEmploymentInput {
  /** أ2: بداية استحقاق الراتب — الأيام قبلها لا تُدفع ولا تُخصم. فارغة = تاريخ المباشرة ثم تاريخ التعيين. */
  salaryEntitlementStart?: string | null
  actualStartDate?: string | null
  joinDate?: string | null
  archivedAt?: Date | string | null
  status: string
  isActive: boolean
}
export interface PayrollEmploymentEnd { lastWorkingDay: string; status: string }
export interface PayrollEmploymentCoverage {
  coverFrom: string
  coverTo: string
  coverDays: number
  hireDate: string
  leaveDate: string | null
  endDateSource: 'OFFBOARDING' | 'ARCHIVE' | null
}

function dateOnly(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new BadRequestException('تاريخ تغطية الراتب غير صالح')
  }
  return value
}

// PR-10 / ①: إنهاء الخدمة لا يلغي أجر الأيام السابقة؛ آخر يوم عمل شامل للتغطية.
export function payrollEmploymentCoverage(
  employee: PayrollEmploymentInput,
  cases: PayrollEmploymentEnd[],
  startDate: string,
  endDate: string,
): PayrollEmploymentCoverage | null {
  dateOnly(startDate); dateOnly(endDate)
  if (endDate < startDate) throw new BadRequestException('نهاية فترة الرواتب قبل بدايتها')
  // أ2: أرضية التغطية واحدة للحضور والغياب والنقص والإضافي والتناسب — بداية الاستحقاق إن وُجدت، وإلا المباشرة ثم التعيين.
  const hireDate = dateOnly(employee.salaryEntitlementStart || employee.actualStartDate || employee.joinDate || '1900-01-01')
  // قرار المالك (20 سبتمبر): الإيقاف عن العمل مش إنهاء خدمة — الموقوف عضو في المسير زي أي حد،
  // بياخد أجر الأيام اللي برّه فترة الإيقاف، وأيام الإيقاف بتتخصم بمنطق employee_suspensions في payroll.service.
  const suspendedOnly = employee.status === 'suspended'
  // الملفات الملغاة لا تنهي الخدمة، وملف انتهى قبل التعيين الحالي لا ينهي إعادة التعيين.
  const effectiveEnds = [...new Set(cases.filter(kase => kase.status !== 'CANCELLED')
    .map(kase => dateOnly(kase.lastWorkingDay)).filter(date => date >= hireDate))]
  if (effectiveEnds.length > 1) {
    throw new BadRequestException('للموظف أكثر من فترة إنهاء خدمة؛ يلزم توثيق فترات إعادة التعيين قبل حساب راتبه')
  }
  if (['active', 'probation'].includes(employee.status) && employee.isActive && cases.some(kase =>
    kase.status === 'CLOSED' && kase.lastWorkingDay >= hireDate && kase.lastWorkingDay <= endDate)) {
    throw new BadRequestException('الموظف نشط بعد ملف إنهاء خدمة مغلق؛ يلزم توثيق تاريخ إعادة التعيين قبل حساب راتبه')
  }
  let leaveDate: string | null = effectiveEnds[0] ?? null
  let endDateSource: PayrollEmploymentCoverage['endDateSource'] = leaveDate ? 'OFFBOARDING' : null
  if (!leaveDate && !suspendedOnly && (employee.status === 'terminated' || !employee.isActive) && employee.archivedAt) {
    const archivedAt = new Date(employee.archivedAt)
    if (!Number.isFinite(archivedAt.getTime())) throw new BadRequestException('تاريخ أرشفة الموظف غير صالح لتحديد نهاية الخدمة')
    leaveDate = localDateOf(archivedAt); endDateSource = 'ARCHIVE'
  }
  if (!leaveDate) {
    // قرار المالك: المؤرشف/المنتهي من غير تاريخ آخر يوم عمل موثّق (أغلب المرحّلين من النظام القديم)
    // يفضل مستبعد بسبب واضح (EXC_ARCHIVED_NO_LAST_DAY) بدل ما يترمي بسبب مبهم أو يتحسب بالغلط.
    if (employee.status === 'archived' || employee.status === 'terminated') return null
    if (!employee.isActive && !suspendedOnly) {
      throw new BadRequestException('تاريخ آخر يوم عمل غير مسجل للموظف غير النشط؛ حدده قبل حساب راتبه')
    }
  }
  const coverFrom = hireDate > startDate ? hireDate : startDate
  const coverTo = leaveDate && leaveDate < endDate ? leaveDate : endDate
  if (coverFrom > coverTo) return null
  return { coverFrom, coverTo, hireDate, leaveDate, endDateSource,
    coverDays: Math.round((Date.parse(coverTo) - Date.parse(coverFrom)) / 86400000) + 1 }
}
