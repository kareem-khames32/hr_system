import { PayrollDecimal } from './payroll-decimal'

// DD-11 على المسير الحالي (المصروف): حماية الصافي لكل الخصومات لا للأقساط وحدها.
// الترتيب: عدم الاستحقاق (إجازة بلا أجر) محمي ولا يستهلك السقف ← الاستقطاع النظامي والحكم القضائي المصنف أولًا
// (فوق الأرضية، خارج السقف ويُخصم من سعته) ← خصومات الحضور وفائضها يسقط ولا يتحول دينًا ← قيود الدفتر المدينة
// بترتيب الخصم: الاستردادات ← باقي الأنواع المصنفة ← الإدارية (الأقرب للترحيل) وفائضها يُرحّل كقيد جديد عند الصرف
// ← أقساط السلف بعدها من الرصيد الباقي (payroll-installment-budget). الأرضية والسقف من إعدادات السياسة؛ null = صفر وبلا سقف.
// الإضافة المعلّمة outsideDeductionBase (البدل الثابت الشهري) برّه الرصيد ده خالص: بتتصرف كاملة فوق الصافي المحمي.
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
  // إضافة برّه مساحة الخصم (البدل الثابت الشهري — بدل ضغط عمل مثلًا، طلب المالك 26 سبتمبر): بتتصرف كاملة ومش بتزوّد اللي
  // يتخصم أو يتقسّط من الراتب؛ الأرضية والسقف ومساحة الخصم والأقساط كلها على الراتب من غيرها. غيابها = السلوك القديم بالحرف.
  outsideDeductionBase?: boolean
}
// B5 / الخطوة 22: فئات التحصيل بعد المحمي. ترتيب المالك (من نسخة السياسة) يقدّم فئة على أخرى عند عدم كفاية المتاح؛
// غيابه = الترتيب الافتراضي أعلاه حرفيًا (المصنفة والإدارية مجموعة واحدة بأولوية الترحيل ثم الإدارية آخرًا).
export const PAYROLL_COLLECTION_CLASSES = ['ATTENDANCE', 'RECOVERY', 'TYPED', 'ADMINISTRATIVE', 'LOAN'] as const
export type PayrollCollectionClass = typeof PAYROLL_COLLECTION_CLASSES[number]
export const PAYROLL_DEFAULT_COLLECTION_ORDER: readonly PayrollCollectionClass[] = PAYROLL_COLLECTION_CLASSES
export const isPayrollCollectionOrder = (value: unknown): value is PayrollCollectionClass[] => Array.isArray(value) &&
  value.length === PAYROLL_COLLECTION_CLASSES.length && new Set(value).size === value.length && value.every(item => (PAYROLL_COLLECTION_CLASSES as readonly unknown[]).includes(item))

export interface PayrollObligationProtectionInput {
  earnedFixedGross: number
  overtime: number
  unpaidLeave: number
  attendance: { lateness: number; shortfall: number; absence: number }
  credits: PayrollObligationProtectionEntry[]
  debits: PayrollObligationProtectionEntry[]
  settings: PayrollObligationProtectionSettings
  // ترتيب المالك للفئات الخمس؛ null/غياب = الترتيب الافتراضي
  collectionOrder?: readonly PayrollCollectionClass[] | null
  // الأقساط المحصلة فعلًا في موضع LOAN (من خطة الأقساط المبنية على loanSlot)؛ تستهلك المتاح قبل الفئات التالية لها
  loanCollected?: number
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
const amount = (value: PayrollDecimal) => Number(value.format(2, 'DOWN'))
const max = (a: PayrollDecimal, b: PayrollDecimal) => a.compare(b) >= 0 ? a : b
const min = (a: PayrollDecimal, b: PayrollDecimal) => a.compare(b) <= 0 ? a : b
const statutory = (row: PayrollObligationProtectionEntry) => row.deductionRequestId != null && STATUTORY_CATEGORIES.includes(row.typedCategory ?? '')
const byAge = (a: PayrollObligationProtectionEntry, b: PayrollObligationProtectionEntry) => (a.effectiveDate ?? '').localeCompare(b.effectiveDate ?? '') || a.id - b.id

export function protectPayrollObligations(input: PayrollObligationProtectionInput) {
  const zero = decimal('0'), hundred = decimal('100')
  for (const value of [input.earnedFixedGross, input.overtime, input.unpaidLeave, input.attendance.lateness, input.attendance.shortfall, input.attendance.absence,
    ...input.credits.map(row => row.amount), ...input.debits.map(row => row.amount), input.loanCollected ?? 0]) {
    if (!Number.isFinite(value) || value < 0) throw new Error('مدخلات حماية الصافي يجب أن تكون مبالغ غير سالبة')
  }
  const gross = decimal(input.earnedFixedGross)
  const credits = input.credits.reduce((sum, row) => sum.add(decimal(row.amount)), zero)
  // الإضافات برّه مساحة الخصم بتدخل الصافي («إضافات أخرى») بس مش الرصيد اللي الخصومات والأقساط بتتاخد منه
  const outsideCredits = input.credits.filter(row => row.outsideDeductionBase === true).reduce((sum, row) => sum.add(decimal(row.amount)), zero)
  const balance = gross.add(decimal(input.overtime)).add(credits.subtract(outsideCredits)).subtract(decimal(input.unpaidLeave))
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
  // 2) الفئات بترتيب التحصيل: كل فئة تأخذ من المتاح الباقي فوق الأرضية وتحت السقف بعد ما استهلكته الفئات قبلها.
  const order = input.collectionOrder ?? null
  if (order !== null && !isPayrollCollectionOrder(order)) throw new Error('ترتيب التحصيل يجب أن يشمل الحضور والاستردادات والمصنفة والإدارية والسلف مرة واحدة لكل منها')
  const loanCollected = decimal(input.loanCollected ?? 0)
  let consumed = statutoryCollected
  const capacityNow = () => {
    const roomNow = max(zero, balance.subtract(floor).subtract(consumed))
    return (cap === null ? roomNow : min(roomNow, max(zero, cap.subtract(consumed)))).round(2, 'FLOOR')
  }
  const attendance = { lateness: decimal(input.attendance.lateness), shortfall: decimal(input.attendance.shortfall), absence: decimal(input.attendance.absence) }
  const requestedAttendance = attendance.lateness.add(attendance.shortfall).add(attendance.absence)
  const dropped = { shortfall: zero, lateness: zero, absence: zero }
  let attendanceCapacity = zero
  let initialDebitCapacity: PayrollDecimal | null = null, debitCapacityRemaining: PayrollDecimal | null = null
  let loanSlot = { netBeforeLoans: balance.subtract(consumed), capConsumed: consumed }
  const nonStatutory = input.debits.filter(row => !statutory(row))
  const byPriority = (a: PayrollObligationProtectionEntry, b: PayrollObligationProtectionEntry) => (b.carryPriority ?? DEFAULT_CARRY_PRIORITY) - (a.carryPriority ?? DEFAULT_CARRY_PRIORITY)
  type Group = { kind: 'ATTENDANCE' } | { kind: 'LOAN' } | { kind: 'DEBITS'; rows: PayrollObligationProtectionEntry[] }
  const groups: Group[] = []
  for (const kind of order ?? PAYROLL_DEFAULT_COLLECTION_ORDER) {
    if (kind === 'ATTENDANCE') groups.push({ kind: 'ATTENDANCE' })
    else if (kind === 'LOAN') groups.push({ kind: 'LOAN' })
    // الاستردادات غير المصنفة بالأقدم
    else if (kind === 'RECOVERY') groups.push({ kind: 'DEBITS', rows: nonStatutory.filter(row => row.deductionRequestId == null).sort(byAge) })
    // الافتراضي: المصنفة والإدارية معًا بأولوية ترحيل أعلى أولًا ثم الإدارية آخرًا ثم الأقدم (V2 كما هو)
    else if (order === null) {
      if (kind === 'TYPED') groups.push({ kind: 'DEBITS', rows: nonStatutory.filter(row => row.deductionRequestId != null)
        .sort((a, b) => byPriority(a, b) || Number(a.typedCategory === 'ADMINISTRATIVE') - Number(b.typedCategory === 'ADMINISTRATIVE') || byAge(a, b)) })
    }
    // ترتيب المالك يفصل المصنفة عن الإدارية كفئتين
    else groups.push({ kind: 'DEBITS', rows: nonStatutory.filter(row => row.deductionRequestId != null && (row.typedCategory === 'ADMINISTRATIVE') === (kind === 'ADMINISTRATIVE'))
      .sort((a, b) => byPriority(a, b) || byAge(a, b)) })
  }
  const debitLines: PayrollObligationLine[] = [...statutoryLines]
  for (const group of groups) {
    if (group.kind === 'ATTENDANCE') {
      attendanceCapacity = capacityNow()
      let excess = max(zero, requestedAttendance.subtract(attendanceCapacity))
      // النقص أولًا ثم التأخير ثم الغياب: الأخف أثرًا على سجل الموظف يسقط قبل الأشد
      for (const key of ['shortfall', 'lateness', 'absence'] as const) {
        const take = min(excess, attendance[key])
        attendance[key] = attendance[key].subtract(take)
        dropped[key] = take
        excess = excess.subtract(take)
      }
      consumed = consumed.add(attendance.lateness.add(attendance.shortfall).add(attendance.absence))
    } else if (group.kind === 'LOAN') {
      // رصيد موضع السلف: خطة الأقساط تُبنى عليه (الافتراضي آخر فئة = الصافي قبل الأقساط)
      loanSlot = { netBeforeLoans: balance.subtract(consumed), capConsumed: consumed }
      consumed = consumed.add(loanCollected)
    } else {
      if (initialDebitCapacity === null) initialDebitCapacity = capacityNow()
      for (const row of group.rows) {
        const due = decimal(row.amount), collected = min(due, capacityNow())
        consumed = consumed.add(collected)
        debitLines.push({ id: row.id, type: 'DEBIT', amount: amount(due), collected: amount(collected), carried: amount(due.subtract(collected)), typed: row.deductionRequestId != null })
      }
      debitCapacityRemaining = capacityNow()
    }
  }
  const creditLines: PayrollObligationLine[] = input.credits.map(row => ({ id: row.id, type: 'CREDIT', amount: row.amount, collected: row.amount, carried: 0, typed: false }))
  const otherDeductions = debitLines.reduce((sum, line) => sum.add(decimal(line.collected)), zero)
  const warnings: Array<{ code: string; message: string }> = []
  const droppedTotal = dropped.shortfall.add(dropped.lateness).add(dropped.absence)
  if (!droppedTotal.isZero()) warnings.push({ code: 'ATTENDANCE_EXCESS_DROPPED', message: `سقط ${droppedTotal.format(2, 'DOWN')} من خصومات الحضور لحماية الصافي؛ لا يتحول دينًا` })
  const carried = debitLines.reduce((sum, line) => sum + Math.round(line.carried * 100), 0)
  if (carried > 0) warnings.push({ code: 'OBLIGATION_CARRIED', message: `يُرحّل ${(carried / 100).toFixed(2)} من قيود الدفتر إلى المسير التالي عند الصرف` })
  if (statutoryLines.some(line => line.carried > 0)) warnings.push({ code: 'STATUTORY_EXCEEDS_ROOM', message: 'الاستقطاع النظامي أو الحكم القضائي يتجاوز المتاح فوق الأرضية؛ كل القيود الأخرى تُرحّل' })
  if (balance.add(outsideCredits).compare(zero) < 0) warnings.push({ code: 'NET_NEGATIVE_PROTECTED_ONLY', message: 'الإجازة بلا أجر تتجاوز الاستحقاق؛ الصافي السالب يمنع اعتماد المسير' })
  const lines = [...creditLines, ...debitLines]
  return {
    version: PAYROLL_OBLIGATION_PROTECTION_VERSION,
    attendance: { lateness: amount(attendance.lateness), shortfall: amount(attendance.shortfall), absence: amount(attendance.absence) },
    otherDeductions: amount(otherDeductions),
    otherAdditions: amount(credits),
    lines,
    consumedObligationIds: lines.filter(line => line.collected > 0).map(line => line.id).sort((a, b) => a - b),
    // رصيد موضع السلف في ترتيب التحصيل (مدخل خطة الأقساط)
    loanSlot: { netBeforeLoans: amount(loanSlot.netBeforeLoans), capConsumed: amount(loanSlot.capConsumed) },
    trace: {
      version: PAYROLL_OBLIGATION_PROTECTION_VERSION,
      settings: { minNetGuarantee: minNet?.canonical() ?? null, netFloorPct: floorPct?.canonical() ?? null, maxDeductionPctOfGross: capPct?.canonical() ?? null },
      balanceBeforeDeductions: balance.format(2, 'DOWN'), floor: floor.format(6, 'HALF_UP'), cap: cap === null ? null : cap.format(6, 'HALF_UP'),
      statutoryCollected: statutoryCollected.format(2, 'DOWN'),
      attendanceRequested: requestedAttendance.format(2, 'DOWN'), attendanceCapacity: attendanceCapacity.format(2, 'DOWN'),
      attendanceDropped: { shortfall: dropped.shortfall.format(2, 'DOWN'), lateness: dropped.lateness.format(2, 'DOWN'), absence: dropped.absence.format(2, 'DOWN') },
      debitCapacity: (initialDebitCapacity ?? capacityNow()).format(2, 'DOWN'), debitCapacityRemaining: (debitCapacityRemaining ?? capacityNow()).format(2, 'DOWN'),
      // ترتيب المالك المطبق وأقساط موضع السلف؛ الترتيب الافتراضي لا يضيف حقلًا (التتبع السابق كما هو)
      ...(order === null ? {} : { collectionOrder: [...order], loanCollected: loanCollected.format(2, 'DOWN') }),
      // الإضافات برّه مساحة الخصم (balanceBeforeDeductions من غيرها)؛ الاعتماد بيطرحها من الصافي قبل ما يقارن خطة الأقساط.
      // من غيرها ما بيتضافش حقل (التتبع السابق كما هو)
      ...(outsideCredits.isZero() ? {} : { creditsOutsideBase: outsideCredits.format(2, 'DOWN') }),
      warnings,
    },
  }
}
