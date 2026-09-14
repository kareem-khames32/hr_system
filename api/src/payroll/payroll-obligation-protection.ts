import { PayrollDecimal } from './payroll-decimal'

// DD-11 على المسير الحالي (المصروف): حماية الصافي لكل الخصومات لا للأقساط وحدها.
// الترتيب: عدم الاستحقاق (إجازة بلا أجر) محمي ولا يستهلك السقف ← الاستقطاع النظامي والحكم القضائي المصنف أولًا
// (فوق الأرضية، خارج السقف ويُخصم من سعته) ← خصومات الحضور وفائضها يسقط ولا يتحول دينًا ← قيود الدفتر المدينة
// بترتيب الخصم: الاستردادات ← باقي الأنواع المصنفة ← الإدارية (الأقرب للترحيل) وفائضها يُرحّل كقيد جديد عند الصرف
// ← أقساط السلف بعدها من الرصيد الباقي (payroll-installment-budget). الأرضية والسقف من إعدادات السياسة؛ null = صفر وبلا سقف.
export const PAYROLL_OBLIGATION_PROTECTION_VERSION = 'DD11_LEGACY_NET_PROTECTION_V2_20260914' as const

export interface PayrollObligationProtectionSettings {
  minNetGuarantee: string | number | null
  netFloorPct: string | number | null
  maxDeductionPctOfGross: string | number | null
}
export interface PayrollObligationProtectionEntry {
  id: number
  amount: number
  category: string
  deductionRequestId: number | null
  effectiveDate: string | null
  // فئة نوع الخصم المصنف وأولوية ترحيله من لقطة الطلب (readTypedObligationFacts)؛ غير المصنف بلا قيمة
  typedCategory?: string | null
  carryPriority?: number | null
}
export interface PayrollObligationProtectionInput {
  earnedFixedGross: number
  overtime: number
  unpaidLeave: number
  attendance: { lateness: number; shortfall: number; absence: number }
  credits: PayrollObligationProtectionEntry[]
  debits: PayrollObligationProtectionEntry[]
  settings: PayrollObligationProtectionSettings
}
export interface PayrollObligationLine {
  id: number
  type: 'CREDIT' | 'DEBIT'
  amount: number
  collected: number
  carried: number
  typed: boolean
}

const STATUTORY_CATEGORIES = ['STATUTORY', 'COURT_ORDER']
const DEFAULT_CARRY_PRIORITY = 3
const decimal = (value: string | number) => PayrollDecimal.from(typeof value === 'number' ? value.toFixed(2) : String(value))
const optional = (value: string | number | null | undefined) => value === null || value === undefined || value === '' ? null : PayrollDecimal.from(String(value))
const amount = (value: PayrollDecimal) => Number(value.format(2, 'HALF_UP'))
const max = (a: PayrollDecimal, b: PayrollDecimal) => a.compare(b) >= 0 ? a : b
const min = (a: PayrollDecimal, b: PayrollDecimal) => a.compare(b) <= 0 ? a : b
const statutory = (row: PayrollObligationProtectionEntry) => row.deductionRequestId != null && STATUTORY_CATEGORIES.includes(row.typedCategory ?? '')
const byAge = (a: PayrollObligationProtectionEntry, b: PayrollObligationProtectionEntry) => (a.effectiveDate ?? '').localeCompare(b.effectiveDate ?? '') || a.id - b.id

export function protectPayrollObligations(input: PayrollObligationProtectionInput) {
  const zero = decimal('0'), hundred = decimal('100')
  for (const value of [input.earnedFixedGross, input.overtime, input.unpaidLeave, input.attendance.lateness, input.attendance.shortfall, input.attendance.absence,
    ...input.credits.map(row => row.amount), ...input.debits.map(row => row.amount)]) {
    if (!Number.isFinite(value) || value < 0) throw new Error('مدخلات حماية الصافي يجب أن تكون مبالغ غير سالبة')
  }
  const gross = decimal(input.earnedFixedGross)
  const credits = input.credits.reduce((sum, row) => sum.add(decimal(row.amount)), zero)
  const balance = gross.add(decimal(input.overtime)).add(credits).subtract(decimal(input.unpaidLeave))
  const minNet = optional(input.settings.minNetGuarantee), floorPct = optional(input.settings.netFloorPct), capPct = optional(input.settings.maxDeductionPctOfGross)
  const floor = max(zero, max(minNet ?? zero, floorPct === null ? zero : gross.multiply(floorPct).divide(hundred)))
  const cap = capPct === null ? null : gross.multiply(capPct).divide(hundred)
  const room = max(zero, balance.subtract(floor))
  // 1) النظامي/القضائي: فوق الأرضية فقط، لا يقيده السقف لكنه يستهلك سعته
  let statutoryCapacity = room.round(2, 'FLOOR')
  const statutoryLines: PayrollObligationLine[] = input.debits.filter(statutory).sort(byAge).map(row => {
    const due = decimal(row.amount), collected = min(due, statutoryCapacity)
    statutoryCapacity = statutoryCapacity.subtract(collected)
    return { id: row.id, type: 'DEBIT', amount: amount(due), collected: amount(collected), carried: amount(due.subtract(collected)), typed: true }
  })
  const statutoryCollected = statutoryLines.reduce((sum, line) => sum.add(decimal(line.collected)), zero)
  const roomAfterStatutory = max(zero, room.subtract(statutoryCollected))
  const capAfterStatutory = cap === null ? null : max(zero, cap.subtract(statutoryCollected))
  const attendanceCapacity = (capAfterStatutory === null ? roomAfterStatutory : min(roomAfterStatutory, capAfterStatutory)).round(2, 'FLOOR')
  const attendance = { lateness: decimal(input.attendance.lateness), shortfall: decimal(input.attendance.shortfall), absence: decimal(input.attendance.absence) }
  const requestedAttendance = attendance.lateness.add(attendance.shortfall).add(attendance.absence)
  let excess = max(zero, requestedAttendance.subtract(attendanceCapacity))
  const dropped = { shortfall: zero, lateness: zero, absence: zero }
  // النقص أولًا ثم التأخير ثم الغياب: الأخف أثرًا على سجل الموظف يسقط قبل الأشد
  for (const key of ['shortfall', 'lateness', 'absence'] as const) {
    const take = min(excess, attendance[key])
    attendance[key] = attendance[key].subtract(take)
    dropped[key] = take
    excess = excess.subtract(take)
  }
  const attendanceCollected = attendance.lateness.add(attendance.shortfall).add(attendance.absence)
  const debitRoom = max(zero, balance.subtract(statutoryCollected).subtract(attendanceCollected).subtract(floor))
  let capacity = (cap === null ? debitRoom : min(debitRoom, max(zero, cap.subtract(statutoryCollected).subtract(attendanceCollected)))).round(2, 'FLOOR')
  const initialDebitCapacity = capacity
  // 2) ترتيب الخصم (عكس ترتيب الترحيل): الاستردادات غير المصنفة ← المصنفة بأولوية ترحيل أعلى أولًا ← الإدارية آخرًا ← الأقدم
  const ordered = input.debits.filter(row => !statutory(row)).sort((a, b) => Number(a.deductionRequestId != null) - Number(b.deductionRequestId != null) ||
    (b.carryPriority ?? DEFAULT_CARRY_PRIORITY) - (a.carryPriority ?? DEFAULT_CARRY_PRIORITY) ||
    Number(a.typedCategory === 'ADMINISTRATIVE') - Number(b.typedCategory === 'ADMINISTRATIVE') || byAge(a, b))
  const debitLines: PayrollObligationLine[] = [...statutoryLines, ...ordered.map(row => {
    const due = decimal(row.amount), collected = min(due, capacity)
    capacity = capacity.subtract(collected)
    return { id: row.id, type: 'DEBIT' as const, amount: amount(due), collected: amount(collected), carried: amount(due.subtract(collected)), typed: row.deductionRequestId != null }
  })]
  const creditLines: PayrollObligationLine[] = input.credits.map(row => ({ id: row.id, type: 'CREDIT', amount: row.amount, collected: row.amount, carried: 0, typed: false }))
  const otherDeductions = debitLines.reduce((sum, line) => sum.add(decimal(line.collected)), zero)
  const warnings: Array<{ code: string; message: string }> = []
  const droppedTotal = dropped.shortfall.add(dropped.lateness).add(dropped.absence)
  if (!droppedTotal.isZero()) warnings.push({ code: 'ATTENDANCE_EXCESS_DROPPED', message: `سقط ${droppedTotal.format(2, 'HALF_UP')} من خصومات الحضور لحماية الصافي؛ لا يتحول دينًا` })
  const carried = debitLines.reduce((sum, line) => sum + Math.round(line.carried * 100), 0)
  if (carried > 0) warnings.push({ code: 'OBLIGATION_CARRIED', message: `يُرحّل ${(carried / 100).toFixed(2)} من قيود الدفتر إلى المسير التالي عند الصرف` })
  if (statutoryLines.some(line => line.carried > 0)) warnings.push({ code: 'STATUTORY_EXCEEDS_ROOM', message: 'الاستقطاع النظامي أو الحكم القضائي يتجاوز المتاح فوق الأرضية؛ كل القيود الأخرى تُرحّل' })
  if (balance.compare(zero) < 0) warnings.push({ code: 'NET_NEGATIVE_PROTECTED_ONLY', message: 'الإجازة بلا أجر تتجاوز الاستحقاق؛ الصافي السالب يمنع اعتماد المسير' })
  const lines = [...creditLines, ...debitLines]
  return {
    version: PAYROLL_OBLIGATION_PROTECTION_VERSION,
    attendance: { lateness: amount(attendance.lateness), shortfall: amount(attendance.shortfall), absence: amount(attendance.absence) },
    otherDeductions: amount(otherDeductions),
    otherAdditions: amount(credits),
    lines,
    consumedObligationIds: lines.filter(line => line.collected > 0).map(line => line.id).sort((a, b) => a - b),
    trace: {
      version: PAYROLL_OBLIGATION_PROTECTION_VERSION,
      settings: { minNetGuarantee: minNet?.canonical() ?? null, netFloorPct: floorPct?.canonical() ?? null, maxDeductionPctOfGross: capPct?.canonical() ?? null },
      balanceBeforeDeductions: balance.format(2, 'HALF_UP'), floor: floor.format(6, 'HALF_UP'), cap: cap === null ? null : cap.format(6, 'HALF_UP'),
      statutoryCollected: statutoryCollected.format(2, 'HALF_UP'),
      attendanceRequested: requestedAttendance.format(2, 'HALF_UP'), attendanceCapacity: attendanceCapacity.format(2, 'HALF_UP'),
      attendanceDropped: { shortfall: dropped.shortfall.format(2, 'HALF_UP'), lateness: dropped.lateness.format(2, 'HALF_UP'), absence: dropped.absence.format(2, 'HALF_UP') },
      debitCapacity: initialDebitCapacity.format(2, 'HALF_UP'), debitCapacityRemaining: capacity.format(2, 'HALF_UP'),
      warnings,
    },
  }
}
