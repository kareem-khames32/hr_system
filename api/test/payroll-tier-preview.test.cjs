// معاينة نقية من قيم لقطة صريحة؛ لا قاعدة بيانات ولا خدمات ولا مدخلات حضور حية.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { evaluatePayrollTierPreview: evaluate, PayrollTierPreviewError } = require('../src/payroll/payroll-tier-preview')

const settings = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null,
  baseDaysBasis: 'FIXED_30', monthlyDays: 30, dailyHours: 9, rateBase: 'GROSS', roundingMode: 'HALF_UP', roundingScale: 2,
  divisionByZeroMode: 'ZERO_WITH_WARNING', maxDeductionPctOfGross: null, minNetGuarantee: null, netFloorPct: null,
  carryOverExcess: false, skipAttendance: false, lateDeductionEnabled: true, currency: 'SAR' }
function component(code, extra = {}) {
  return { code, nameAr: `بند ${code}`, componentType: 'EARNING', stage: 1, sequence: 1, valueSource: 'FIXED', conditionFormula: null,
    unit: 'CURRENCY', prorationMode: 'NONE', amount: '100', fieldPath: null, missingFieldBehavior: null, varCode: null, multiplier: null,
    percent: null, baseCode: null, tierSetCode: null, formula: null, ledgerCategory: null, ledgerDirection: null, ledgerPartialPayment: null,
    minAmount: null, maxAmount: null, capPctOfBase: null, capBaseCode: null, roundingMode: null, roundingScale: null, deductionPriority: null,
    carryOverEligible: false, rollupTo: null, exemptible: true, showOnPayslip: true, isActive: true, ...extra }
}
function tier(sequence, fromValue, toValue, extra = {}) {
  return { sequence, fromValue, toValue, method: 'RATE_1_1', multiplier: null, dayFraction: null,
    fixedAmount: null, formula: null, label: null, isActive: true, ...extra }
}
function tierSet(extra = {}) {
  return { code: 'LATE_SET', nameAr: 'طقم معاينة التأخير', description: null, inputVar: 'LATE_MINUTES', inputFormula: null, inputUnit: 'MINUTES',
    applicationBasis: 'PER_DAY', tierApplicationMode: 'WHOLE', graceMode: 'NONE', graceMinutes: 0, graceMaxUsesPerPeriod: null,
    allowGraceOnFlexibleShift: false, allowShiftGraceOverride: false, noMatchBehavior: 'NO_DEDUCTION', maxDailyDeductionDayFraction: null,
    maxPeriodDeductionDayFraction: null, secondsRoundingMode: 'FLOOR', minutesRoundingMode: 'FLOOR', roundingUnitMinutes: 1,
    roundingMode: null, roundingScale: null, isActive: true, tiers: [tier(1, '0', null)], ...extra }
}
function definition(set = tierSet(), extra = {}) {
  return { parameters: [], tierSets: [set], components: [component('BASE_PAY'),
    component('LATE_DED', { componentType: 'DEDUCTION', stage: 3, valueSource: 'TIERED', amount: null, tierSetCode: set.code, deductionPriority: 1 }),
    component('NET', { componentType: 'INFO', stage: 6, valueSource: 'SYS_NET', amount: null, exemptible: false })], ...extra }
}
function day(date, rawMinutes, extra = {}) {
  return { date, sourceRef: `attendance:${date}`, rawLateSeconds: String(rawMinutes * 60), excusedLateSeconds: '0',
    flexibleStartEnabled: false, attendanceExempt: false, shiftGraceMinutes: null, ...extra }
}
function dto(days = [day('2026-09-01', 90)], extra = {}) {
  return { tierSetCode: 'LATE_SET', expectedRevision: 1, periodStart: '2026-09-01', periodEnd: '2026-09-30',
    basicSalary: '8100', grossSalary: '16200', days, inputs: { variables: {}, components: {} }, ...extra }
}
const copy = value => JSON.parse(JSON.stringify(value))
function result(set = {}, request = dto(), policy = settings) { return evaluate(definition(tierSet(set)), policy, request) }
function reject(request, source = definition(), policy = settings) {
  assert.throws(() => evaluate(source, policy, request), error => {
    assert.ok(error instanceof PayrollTierPreviewError, `${error?.constructor?.name}: ${error?.message}`)
    assert.equal(typeof error.code, 'string'); assert.ok(error.code.length)
    assert.equal(typeof error.message, 'string'); assert.ok(error.message.length)
    return true
  })
}
const cents = value => {
  assert.match(value, /^\d+\.\d{2}$/)
  const [whole, fraction] = value.split('.')
  return BigInt(whole) * 100n + BigInt(fraction)
}

test('snapshot salary basis derives exact rates and all published deduction totals remain decimal strings', () => {
  const gross = result(), basic = result({}, dto(), { ...settings, rateBase: 'BASIC' })
  assert.equal(gross.total, '90.00'); assert.equal(basic.total, '45.00')
  assert.equal(gross.lines[0].amount, '90.00'); assert.equal(gross.lines[0].rawAmount, '90.000000')
  assert.equal(gross.lines[0].inputValue, '90')
  assert.ok(gross.rates && gross.rounding)
  assert.equal(cents(gross.total), gross.lines.reduce((sum, line) => sum + cents(line.amount), 0n))
})

test('excused raw seconds are subtracted before second normalization, grace, and minute-unit rounding', () => {
  const seconds = result({}, dto([day('2026-09-01', 0, { rawLateSeconds: '60', excusedLateSeconds: '1' })]))
  assert.equal(seconds.days[0].unexcusedMinutes, '0')
  assert.equal(seconds.total, '0.00')
  const ordered = result({ graceMode: 'SUBTRACT', graceMinutes: 1, minutesRoundingMode: 'CEIL', roundingUnitMinutes: 15 },
    dto([day('2026-09-01', 71, { excusedLateSeconds: '600' })]))
  assert.equal(ordered.days[0].unexcusedMinutes, '61')
  assert.equal(ordered.days[0].effectiveMinutes, '60')
  assert.equal(ordered.days[0].roundedMinutes, '60')
  assert.equal(ordered.total, '60.00')
})

test('seconds normalization honors FLOOR, CEIL and NEAREST including the half-minute boundary', () => {
  for (const [mode, seconds, minutes] of [['FLOOR', '90', 1], ['CEIL', '61', 2], ['NEAREST', '90', 2], ['NEAREST', '89', 1]]) {
    const output = result({ secondsRoundingMode: mode }, dto([day('2026-09-01', 0, { rawLateSeconds: seconds })]))
    assert.equal(output.days[0].unexcusedMinutes, String(minutes), `${mode}:${seconds}`)
    assert.equal(output.total, `${minutes}.00`)
  }
})

test('fractional snapshot seconds retain exact excuse credit and excess credit clamps at zero', () => {
  const output = result({}, dto([
    day('2026-09-01', 0, { rawLateSeconds: '75.5', excusedLateSeconds: '15.5' }),
    day('2026-09-02', 1, { excusedLateSeconds: '120' }),
  ]))
  assert.deepEqual(output.days.map(row => row.unexcusedMinutes), ['1', '0'])
  assert.equal(output.total, '1.00'); assert.equal(output.graceUses, 0)
})

test('minute units are rounded after grace with deterministic FLOOR, CEIL and NEAREST boundaries', () => {
  for (const [mode, minutes, rounded] of [['FLOOR', 61, 60], ['CEIL', 61, 75], ['NEAREST', 67, 60], ['NEAREST', 68, 75]]) {
    const output = result({ minutesRoundingMode: mode, roundingUnitMinutes: 15 }, dto([day('2026-09-01', minutes)]))
    assert.equal(output.days[0].roundedMinutes, String(rounded))
    assert.equal(output.total, `${rounded}.00`)
  }
})

test('grace usage counts only reductions of unexcused minutes, preserving the allowance on zero and non-waived days', () => {
  const output = result({ graceMode: 'WAIVE_ALL_OR_NOTHING', graceMinutes: 15, graceMaxUsesPerPeriod: 1 }, dto([
    day('2026-09-01', 0), day('2026-09-02', 80, { excusedLateSeconds: '4800' }),
    day('2026-09-03', 70), day('2026-09-04', 12), day('2026-09-05', 12),
  ]))
  assert.deepEqual(output.days.map(row => row.grace.consumed), [false, false, false, true, false])
  assert.deepEqual(output.days.map(row => row.effectiveMinutes), ['0', '0', '70', '0', '12'])
  assert.equal(output.graceUses, 1); assert.equal(output.days[4].grace.remaining, 0)
  assert.equal(output.total, '82.00')
  assert.ok(output.days[4].grace.reason)
})

test('SUBTRACT consumes a genuine minute reduction even below the first monetary bracket', () => {
  const output = result({ graceMode: 'SUBTRACT', graceMinutes: 15, graceMaxUsesPerPeriod: 1,
    tiers: [tier(1, '60', null, { method: 'MULTIPLIER', multiplier: '1.5' })] },
  dto([day('2026-09-01', 50), day('2026-09-02', 70)]))
  assert.deepEqual(output.days.map(row => row.grace.consumed), [true, false])
  assert.deepEqual(output.days.map(row => row.effectiveMinutes), ['35', '70'])
  assert.equal(output.total, '105.00')
})

test('exhausted grace still preserves approved excuse credit and both grace modes include their exact bound', () => {
  for (const graceMode of ['SUBTRACT', 'WAIVE_ALL_OR_NOTHING']) {
    const output = result({ graceMode, graceMinutes: 15, graceMaxUsesPerPeriod: 1 }, dto([
      day('2026-09-01', 15), day('2026-09-02', 80, { excusedLateSeconds: '3600' }),
    ]))
    assert.equal(output.days[0].effectiveMinutes, '0')
    assert.equal(output.days[1].effectiveMinutes, '20')
    assert.equal(output.total, '20.00')
  }
})

test('flexible-shift grace is explicitly opted in and denied attempts never consume its usage counter', () => {
  const set = { graceMode: 'SUBTRACT', graceMinutes: 15, graceMaxUsesPerPeriod: 1 }
  const request = dto([day('2026-09-01', 12, { flexibleStartEnabled: true }), day('2026-09-02', 12)])
  const denied = result(set, request), allowed = result({ ...set, allowGraceOnFlexibleShift: true }, request)
  assert.deepEqual(denied.days.map(row => row.grace.consumed), [false, true])
  assert.deepEqual(denied.days.map(row => row.effectiveMinutes), ['12', '0'])
  assert.deepEqual(allowed.days.map(row => row.grace.consumed), [true, false])
  assert.deepEqual(allowed.days.map(row => row.effectiveMinutes), ['0', '12'])
  assert.ok(denied.days[0].grace.reason)
})

test('shift grace overrides apply only when enabled and an explicit zero override disables that day benefit', () => {
  const set = { graceMode: 'SUBTRACT', graceMinutes: 15 }
  const request = dto([day('2026-09-01', 20, { shiftGraceMinutes: 30 }), day('2026-09-02', 20, { shiftGraceMinutes: 0 })])
  const disabled = result(set, request), enabled = result({ ...set, allowShiftGraceOverride: true }, request)
  assert.deepEqual(disabled.days.map(row => row.effectiveMinutes), ['5', '5'])
  assert.deepEqual(enabled.days.map(row => row.effectiveMinutes), ['0', '20'])
  assert.deepEqual(enabled.days.map(row => row.grace.consumed), [true, false])
  assert.notEqual(disabled.days[0].grace.source, enabled.days[0].grace.source)
})

test('attendance-exempt days and version attendance switches skip money and do not consume grace', () => {
  const set = { graceMode: 'SUBTRACT', graceMinutes: 15, graceMaxUsesPerPeriod: 1 }
  const request = dto([day('2026-09-01', 12, { attendanceExempt: true }), day('2026-09-02', 12)])
  const exempt = result(set, request)
  assert.equal(exempt.days[0].grace.consumed, false); assert.equal(exempt.days[1].grace.consumed, true)
  assert.ok(exempt.days[0].skippedReason); assert.equal(exempt.total, '0.00')
  for (const patch of [{ skipAttendance: true }, { lateDeductionEnabled: false }]) {
    const skipped = result(set, dto([day('2026-09-01', 90)]), { ...settings, ...patch })
    assert.equal(skipped.total, '0.00'); assert.equal(skipped.graceUses, 0)
    assert.equal(skipped.days[0].effectiveMinutes, '0'); assert.ok(skipped.days[0].skippedReason)
  }
})

test('no effective lateness cannot activate fixed or day-fraction brackets that begin at zero', () => {
  for (const pattern of [{ method: 'FIXED_AMOUNT', fixedAmount: '100' }, { method: 'DAY_FRACTION', dayFraction: '0.25' }]) {
    const set = { tiers: [tier(1, '0', null, pattern)] }
    assert.equal(result(set, dto([day('2026-09-01', 0)])).total, '0.00')
    assert.equal(result(set, dto([])).total, '0.00')
    assert.equal(result(set, dto([day('2026-09-01', 1)])).total, pattern.fixedAmount ? '100.00' : '135.00')
  }
})

test('daily caps apply before period budgets and the oldest day retains priority with every reduction exposed', () => {
  const output = result({ tiers: [tier(1, '0', null, { method: 'MULTIPLIER', multiplier: '2' })],
    maxDailyDeductionDayFraction: '1', maxPeriodDeductionDayFraction: '1.5' },
  dto([day('2026-09-02', 400), day('2026-09-01', 400)]))
  assert.deepEqual(output.lines.map(line => line.date), ['2026-09-01', '2026-09-02'])
  assert.deepEqual(output.lines.map(line => line.rawAmount), ['800.000000', '800.000000'])
  assert.deepEqual(output.lines.map(line => line.afterDailyCap), ['540.00', '540.00'])
  assert.deepEqual(output.lines.map(line => line.dailyCapReduction), ['260.000000', '260.000000'])
  assert.deepEqual(output.lines.map(line => line.periodCapReduction), ['0.00', '270.00'])
  assert.deepEqual(output.lines.map(line => line.amount), ['540.00', '270.00'])
  assert.equal(output.totalBeforePeriodCap, '1080.00'); assert.equal(output.periodCap, '810.00')
  assert.equal(output.periodCapReduction, '270.00'); assert.equal(output.total, '810.00')
  assert.equal(cents(output.total), output.lines.reduce((sum, line) => sum + cents(line.amount), 0n))
})

test('PER_DAY rounds each final line once and sums those lines instead of rounding their raw sum', () => {
  const request = dto([day('2026-09-01', 1), day('2026-09-02', 1)], { basicSalary: '81', grossSalary: '81' })
  const output = result({}, request)
  assert.deepEqual(output.lines.map(line => line.rawAmount), ['0.005000', '0.005000'])
  assert.deepEqual(output.lines.map(line => line.amount), ['0.01', '0.01'])
  assert.equal(output.totalBeforePeriodCap, '0.02'); assert.equal(output.total, '0.02')
})

test('a fractional period cap uses the declared monetary precision without mismatched line totals', () => {
  const output = result({ maxPeriodDeductionDayFraction: '0.005' },
    dto([day('2026-09-01', 1), day('2026-09-02', 1)], { basicSalary: '81', grossSalary: '81' }))
  assert.equal(output.periodCap, '0.01'); assert.equal(output.totalBeforePeriodCap, '0.02')
  assert.deepEqual(output.lines.map(line => line.amount), ['0.01', '0.00'])
  assert.equal(output.periodCapReduction, '0.01'); assert.equal(output.total, '0.01')
})

test('stored tier rounding overrides version rounding with identical precision in lines and the cap budget', () => {
  const request = dto([day('2026-09-01', 1), day('2026-09-02', 1)], { basicSalary: '81', grossSalary: '81' })
  const even = result({ roundingMode: 'HALF_EVEN', roundingScale: 2 }, request)
  assert.equal(even.total, '0.00'); assert.deepEqual(even.lines.map(line => line.amount), ['0.00', '0.00'])
  const precise = result({ roundingMode: 'HALF_UP', roundingScale: 3, maxPeriodDeductionDayFraction: '0.001' }, request)
  assert.equal(precise.periodCap, '0.003'); assert.equal(precise.total, '0.003')
  assert.deepEqual(precise.lines.map(line => line.amount), ['0.003', '0.000'])
})

test('PERIOD_ACCUMULATED sums snapshot minutes, uses only a period cap, and rounds a single period line', () => {
  const output = result({ applicationBasis: 'PERIOD_ACCUMULATED', maxPeriodDeductionDayFraction: '0.2' },
    dto([day('2026-09-01', 90), day('2026-09-02', 90)]))
  assert.equal(output.lines.length, 1); assert.equal(output.lines[0].inputValue, '180')
  assert.equal(output.lines[0].rawAmount, '180.000000'); assert.equal(output.total, '108.00')
  const tiny = result({ applicationBasis: 'PERIOD_ACCUMULATED' },
    dto([day('2026-09-01', 1), day('2026-09-02', 1)], { basicSalary: '81', grossSalary: '81' }))
  assert.equal(tiny.lines.length, 1); assert.equal(tiny.total, '0.01')
})

test('OCCURRENCE_COUNT counts positive days after approved excuses and attendance exemptions', () => {
  const output = result({ inputVar: 'LATE_INCIDENTS', inputUnit: 'COUNT', applicationBasis: 'OCCURRENCE_COUNT',
    tiers: [tier(1, '0', '2', { method: 'NONE' }), tier(2, '2', null, { method: 'FIXED_AMOUNT', fixedAmount: '50' })] },
  dto([day('2026-09-01', 10, { excusedLateSeconds: '600' }), day('2026-09-02', 20), day('2026-09-03', 30), day('2026-09-04', 90, { attendanceExempt: true })]))
  assert.equal(output.lines.length, 1); assert.equal(output.lines[0].inputValue, '2'); assert.equal(output.total, '50.00')
})

test('stored-definition constraints reject a daily cap on accumulation and minute grace on COUNT instead of applying hidden rules', () => {
  reject(dto(), definition(tierSet({ applicationBasis: 'PERIOD_ACCUMULATED', maxDailyDeductionDayFraction: '0.1' })))
  reject(dto(), definition(tierSet({ inputVar: 'LATE_INCIDENTS', inputUnit: 'COUNT', applicationBasis: 'OCCURRENCE_COUNT',
    graceMode: 'SUBTRACT', graceMinutes: 15, tiers: [tier(1, '0', null, { method: 'FIXED_AMOUNT', fixedAmount: '50' })] })))
})

test('large snapshot salary cents survive rate derivation and separate daily rounding without a Number intermediary', () => {
  const output = result({}, dto([day('2026-09-01', 540), day('2026-09-02', 540)], { grossSalary: '9999999999999999.99' }))
  assert.deepEqual(output.lines.map(line => line.amount), ['333333333333333.33', '333333333333333.33'])
  assert.equal(output.total, '666666666666666.66')
  assert.equal(cents(output.total), output.lines.reduce((sum, line) => sum + cents(line.amount), 0n))
  assert.equal(output.rates.deductionBase, '9999999999999999.99')
})

test('the owner-approved marginal fixed boundary includes every reached tier without replacing earlier charges', () => {
  const output = result({ tierApplicationMode: 'MARGINAL', tiers: [
    tier(1, '60', '120', { method: 'DAY_FRACTION', dayFraction: '0.25' }),
    tier(2, '120', null, { method: 'DAY_FRACTION', dayFraction: '0.5' }),
  ] }, dto([day('2026-09-01', 120)]))
  assert.equal(output.total, '405.00'); assert.ok(output.lines[0].portions.length >= 2)
})

test('formula context uses stored parameters and explicit named snapshot inputs only', () => {
  const source = definition(tierSet({ tiers: [tier(1, '0', null, { method: 'FORMULA', formula: 'PARAM[FACTOR]*COMP[BASE_PAY]+OT_AMOUNT' })] }),
    { parameters: [{ code: 'FACTOR', nameAr: 'معامل', value: '2', unit: 'SCALAR', isActive: true }] })
  const request = dto([day('2026-09-01', 1)], { inputs: { variables: { OT_AMOUNT: '3' }, components: { BASE_PAY: '10' } } })
  assert.equal(evaluate(source, settings, request).total, '23.00')
  reject({ ...request, inputs: { ...request.inputs, parameters: { FACTOR: '999' } } }, source)
})

test('derived rates, attendance quantities and salary metadata cannot be forged through input maps', () => {
  for (const key of ['DAY_RATE', 'HOUR_RATE', 'MINUTE_RATE', 'LATE_MINUTES', 'LATE_INCIDENTS', 'IS_ATTENDANCE_EXEMPT',
    'BASE_SALARY', 'GROSS_SALARY', 'BASE_DAYS_BASIS', 'BASE_DAYS', 'STANDARD_DAY_HOURS', 'PERIOD_DAYS']) {
    reject(dto(undefined, { inputs: { variables: { [key]: '999' }, components: {} } }))
  }
  for (const inputs of [{ variables: { UNKNOWN_INPUT: '1' }, components: {} }, { variables: {}, components: { UNKNOWN_COMP: '1' } },
    { variables: { OT_AMOUNT: 3 }, components: {} }, { variables: {}, components: { BASE_PAY: 10 } }]) reject(dto(undefined, { inputs }))
  const source = definition(); source.components[0].isActive = false
  reject(dto(undefined, { inputs: { variables: {}, components: { BASE_PAY: '1' } } }), source)
})

test('duplicate, outside-period, impossible and reversed calendar dates are rejected without timezone guesses', () => {
  for (const request of [dto([day('2026-09-01', 1), day('2026-09-01', 2)]), dto([day('2026-08-31', 1)]),
    dto([day('2026-10-01', 1)]), dto([day('2026-09-31', 1)]), dto([], { periodStart: '2026-09-30', periodEnd: '2026-09-01' }),
    dto([], { periodStart: '2026-02-29' }), dto([], { periodStart: '2026-9-01' }), dto([], { periodEnd: '2026-09-30T00:00:00Z' })]) reject(request)
  assert.equal(result({}, dto([day('2024-02-29', 1)], { periodStart: '2024-02-01', periodEnd: '2024-02-29' })).total, '1.00')
})

test('366 explicit days are supported and a 367th day is a bounded-input rejection', () => {
  const days = Array.from({ length: 366 }, (_, index) => day(new Date(Date.UTC(2024, 0, index + 1)).toISOString().slice(0, 10), 0))
  assert.equal(result({}, dto(days, { periodStart: '2024-01-01', periodEnd: '2024-12-31' })).total, '0.00')
  reject(dto([...days, day('2025-01-01', 0)], { periodStart: '2024-01-01', periodEnd: '2025-01-01' }))
})

test('invalid scalars, numeric money, forged day fields and missing required snapshot keys fail closed', () => {
  for (const patch of [{ basicSalary: 8100 }, { grossSalary: 16200 }, { grossSalary: 'NaN' }, { grossSalary: 'Infinity' },
    { grossSalary: '-1' }, { expectedRevision: 0 }, { expectedRevision: 1.5 }, { tierSetCode: 'MISSING' }, { extra: true }]) reject(dto(undefined, patch))
  for (const patch of [{ rawLateSeconds: 60 }, { rawLateSeconds: '-1' }, { rawLateSeconds: 'NaN' }, { excusedLateSeconds: -1 },
    { flexibleStartEnabled: 'false' }, { attendanceExempt: 'true' }, { shiftGraceMinutes: -1 }, { shiftGraceMinutes: 0.5 }, { id: 1 }]) {
    reject(dto([day('2026-09-01', 1, patch)]))
  }
  for (const key of ['basicSalary', 'inputs', 'periodStart', 'expectedRevision']) { const request = dto(); delete request[key]; reject(request) }
  const missing = dto(); delete missing.days[0].shiftGraceMinutes; reject(missing)
  reject(dto(), definition(tierSet({ isActive: false }), { components: [component('NET', { componentType: 'INFO', stage: 6, valueSource: 'SYS_NET', amount: null, exemptible: false })] }))
  reject(dto(), definition(tierSet({ inputVar: 'SHORTFALL_MINUTES' })))
})

test('raw JSON shape rejects prototype tricks and accessors without executing caller code', () => {
  const poisoned = dto(); poisoned.inputs.variables = JSON.parse('{"__proto__":{"DAY_RATE":"999"}}'); reject(poisoned)
  const inherited = dto(); inherited.inputs.variables = Object.create({ OT_AMOUNT: '3' }); reject(inherited)
  let invoked = false
  const accessor = dto(); Object.defineProperty(accessor.days[0], 'rawLateSeconds', { enumerable: true, get() { invoked = true; return '60' } })
  reject(accessor); assert.equal(invoked, false)
  const top = dto(); Object.defineProperty(top, 'grossSalary', { enumerable: true, get() { invoked = true; return '16200' } })
  reject(top); assert.equal(invoked, false)
})

test('reordering incoming days cannot change chronological grace, cap allocation or the complete output, and inputs remain untouched', () => {
  const source = definition(tierSet({ graceMode: 'SUBTRACT', graceMinutes: 15, graceMaxUsesPerPeriod: 1, maxPeriodDeductionDayFraction: '0.2' }))
  const request = dto([day('2026-09-03', 90), day('2026-09-01', 90), day('2026-09-02', 90)])
  const before = copy({ source, settings, request })
  const output = evaluate(source, settings, request)
  assert.deepEqual(evaluate(source, settings, { ...request, days: [...request.days].reverse() }), output)
  assert.deepEqual(evaluate(source, settings, request), output)
  assert.deepEqual({ source, settings, request }, before)
  assert.deepEqual(output.days.map(row => row.date), ['2026-09-01', '2026-09-02', '2026-09-03'])
  assert.deepEqual(output.days.map(row => row.grace.consumed), [true, false, false])
  assert.equal(output.total, '108.00')
})

test('the shared 2m-step budget rejects aggregate work that remains below the separate per-day kernel limit', () => {
  const tiers = Array.from({ length: 1000 }, (_, index) => tier(index + 1, String(index), index === 999 ? null : String(index + 1), { method: 'NONE' }))
  const source = definition(tierSet({ tiers }))
  const days = Array.from({ length: 366 }, (_, index) => day(new Date(Date.UTC(2024, 0, index + 1)).toISOString().slice(0, 10), 1000))
  const input = dto(days, { periodStart: '2024-01-01', periodEnd: '2024-12-31' })
  const before = copy(input)
  assert.throws(() => evaluate(source, settings, input), error => {
    assert.ok(error instanceof PayrollTierPreviewError)
    assert.equal(error.code, 'TIER_PREVIEW_EVALUATION_LIMIT')
    assert.equal(error.path, 'days')
    return true
  })
  assert.deepEqual(input, before)
})
