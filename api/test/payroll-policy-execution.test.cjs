const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { executePayrollPolicy: execute } = require('../src/payroll/payroll-policy-execution')
const { executePayrollComponentsWithSources: preCaps } = require('../src/payroll/payroll-component-execution')
const copy = value => JSON.parse(JSON.stringify(value))
const settings = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null,
  baseDaysBasis: 'FIXED_30', monthlyDays: 30, dailyHours: 9, rateBase: 'GROSS', roundingMode: 'HALF_UP', roundingScale: 2,
  divisionByZeroMode: 'ZERO_WITH_WARNING', maxDeductionPctOfGross: 50, minNetGuarantee: null, netFloorPct: null,
  carryOverExcess: false, skipAttendance: false, lateDeductionEnabled: true, currency: 'SAR' }
function component(code, extra = {}) {
  return { code, nameAr: `بند ${code}`, componentType: 'EARNING', stage: 1, sequence: 1, valueSource: 'FIXED',
    conditionFormula: null, unit: 'CURRENCY', prorationMode: 'NONE', amount: '1000.00', fieldPath: null,
    missingFieldBehavior: null, varCode: null, multiplier: null, percent: null, baseCode: null, tierSetCode: null,
    formula: null, ledgerCategory: null, ledgerDirection: null, ledgerPartialPayment: null, minAmount: null,
    maxAmount: null, capPctOfBase: null, capBaseCode: null, roundingMode: null, roundingScale: null,
    deductionPriority: null, carryOverEligible: false, rollupTo: null, exemptible: true, showOnPayslip: true, isActive: true, ...extra }
}
const net = () => component('NET', { componentType: 'INFO', stage: 6, valueSource: 'SYS_NET', amount: null, exemptible: false })
const late = () => component('LATE', { componentType: 'DEDUCTION', stage: 3, amount: '300', deductionPriority: 1 })
const loan = (extra = {}) => component('LOAN', { componentType: 'DEDUCTION', stage: 5, valueSource: 'LEDGER', amount: null,
  ledgerCategory: 'loan', ledgerDirection: 'DEBIT', ledgerPartialPayment: 'ALLOW_PARTIAL', deductionPriority: 2, carryOverEligible: true, ...extra })
function values() {
  return { variables: {}, employeeFields: Object.fromEntries(['basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance'].map(key => [key, null])),
    externalValues: {}, sourceMetadata: { variables: {}, employeeFields: {}, externalValues: {} },
    proration: { calendar30: { value: '1', sourceRef: 'coverage:30' }, working: { value: null, sourceRef: 'schedule:unavailable' } }, exemptions: [] }
}
function installment(extra = {}) {
  return { componentCode: 'LOAN', category: 'loan', installmentRef: 'installment:1', loanRef: 'loan:1', sourceRef: 'schedule:1', sourceRevision: 1,
    sequence: 1, originalDuePeriod: '2026-09', duePeriod: '2026-09', remainingAmount: '500.00', priority: 1, extensionPeriod: null, ...extra }
}
function fixture() {
  return { definition: { components: [component('PAY'), late(), loan(), net()], parameters: [], tierSets: [] }, settings: copy(settings),
    input: { components: values(), sources: { tiers: {}, ledger: { period: '2026-09', nextPeriod: '2026-10', installments: [installment()], obligations: [], manualDeferrals: [] } },
      net: { earnedFixedGross: '1000', sourceRef: 'earned-fixed:coverage', classifications: [
        { componentCode: 'LATE', kind: 'ATTENDANCE', sourceRef: 'classification:late', carryOverEligible: false },
        { componentCode: 'LOAN', kind: 'LOAN', sourceRef: 'classification:loan', carryOverEligible: true }],
      collectionOrder: ['LATE', 'LOAN'], collectionOrderSourceRef: 'owner:order:revision1' } } }
}
const run = f => execute(f.definition, f.settings, f.input)
const allocation = (r, code) => r.finalization.allocations.find(row => row.componentCode === code)
const line = (r, code) => r.components.find(row => row.code === code)
const rejects = (fn, code) => assert.throws(fn, error => (!code || error.code === code) || (assert.equal(error.code, code, error.message), false))

test('owner controls attendance versus loans; total cap stays fixed and all loan principal survives', () => {
  const f = fixture(), first = run(f)
  assert.equal(first.finalization.netPay.amount, '500.00')
  assert.equal(allocation(first, 'LATE').collectedAmount, '300.00')
  assert.equal(allocation(first, 'LOAN').collectedAmount, '200.00')
  assert.equal(allocation(first, 'LOAN').carriedAmount, '300.00')
  f.input.net.collectionOrder.reverse(); f.input.net.collectionOrderSourceRef = 'owner:order:revision2'
  const second = run(f)
  assert.equal(second.finalization.netPay.amount, '500.00')
  assert.equal(allocation(second, 'LOAN').collectedAmount, '500.00')
  assert.equal(allocation(second, 'LATE').droppedAmount, '300.00')
  assert.deepEqual(first.snapshot.input.net.collectionOrder, ['LATE', 'LOAN'])
  assert.equal(first.snapshot.input.net.collectionOrderSourceRef, 'owner:order:revision1')
  assert.equal(first.sourceValidation, 'CALLER_UNVERIFIED'); assert.equal(first.preCapsOnly, false)
  assert.ok(Object.isFrozen(first.snapshot.input.net.collectionOrder)); assert.doesNotThrow(() => JSON.stringify(first))
})

test('DD11 worked example reconciles statutory, attendance, recovery, typed, administrative and actual installment rows', () => {
  const f = fixture()
  f.definition.components = [component('PAY', { amount: '11750' }),
    component('STAT', { componentType: 'DEDUCTION', stage: 3, deductionPriority: 1, amount: '1057.50' }),
    component('LATE', { componentType: 'DEDUCTION', stage: 3, sequence: 2, deductionPriority: 2, amount: '750' }),
    component('RECOVERY', { componentType: 'DEDUCTION', stage: 4, deductionPriority: 3, amount: '500' }),
    component('QUALITY', { componentType: 'DEDUCTION', stage: 4, sequence: 2, deductionPriority: 4, amount: '562.50' }),
    component('ADMIN', { componentType: 'DEDUCTION', stage: 4, sequence: 3, deductionPriority: 5, amount: '450' }), loan(), net()]
  f.input.net.earnedFixedGross = '11750'; f.input.sources.ledger.installments[0].remainingAmount = '3000'
  f.input.net.classifications = [['STAT', 'STATUTORY'], ['LATE', 'ATTENDANCE'], ['RECOVERY', 'RECOVERY'], ['QUALITY', 'TYPED'], ['ADMIN', 'ADMINISTRATIVE'], ['LOAN', 'LOAN']]
    .map(([componentCode, kind]) => ({ componentCode, kind, sourceRef: `class:${componentCode}`, carryOverEligible: kind === 'LOAN' }))
  f.input.net.collectionOrder = ['LATE', 'RECOVERY', 'QUALITY', 'ADMIN', 'LOAN']
  const r = run(f)
  assert.equal(r.finalization.netPay.amount, '5875.00')
  assert.equal(allocation(r, 'LOAN').collectedAmount, '2555.00'); assert.equal(allocation(r, 'LOAN').carriedAmount, '445.00')
  assert.equal(r.finalization.totals.collectedDeductions.amount, '5875.00')
  f.input.components.exemptions.push({ code: 'QUALITY', sourceRef: 'approved:quality:exemption' })
  const exempted = run(f)
  assert.equal(allocation(exempted, 'LOAN').collectedAmount, '3000.00'); assert.equal(exempted.finalization.netPay.amount, '5992.50')
  assert.equal(line(exempted, 'QUALITY').steps.find(step => step.stage === 'FULL_EXEMPTION').details.original.numerator, '1125')
})

test('BLOCK skips and extends the full loan after its future tail, leaving capacity for the next deduction', () => {
  const f = fixture(); f.definition.components[2].ledgerPartialPayment = 'BLOCK'; f.input.net.collectionOrder = ['LOAN', 'LATE']
  f.input.sources.ledger.installments[0].remainingAmount = '600'
  f.input.sources.ledger.installments[0].extensionPeriod = '2026-12'
  f.input.sources.ledger.installments.push(installment({ installmentRef: 'installment:2', sourceRef: 'schedule:2', sequence: 2,
    originalDuePeriod: '2026-11', duePeriod: '2026-11', extensionPeriod: '2026-12' }))
  const r = run(f), debt = allocation(r, 'LOAN')
  assert.equal(debt.collectedAmount, '0.00'); assert.equal(debt.carriedAmount, '600.00')
  assert.equal(debt.loanDetails.lines.find(row => row.installmentRef === 'installment:1').outcome, 'SKIPPED_AND_EXTENDED')
  assert.equal(allocation(r, 'LATE').collectedAmount, '300.00'); assert.equal(r.finalization.netPay.amount, '700.00')
})

test('manual deferral wins even with enough salary and later components can use the released capacity', () => {
  const f = fixture(); f.settings.maxDeductionPctOfGross = null
  f.input.net.collectionOrder = ['LOAN', 'LATE']
  f.input.sources.ledger.manualDeferrals.push({ installmentRef: 'installment:1', toPeriod: '2026-10', sourceRef: 'request:approved:123', reason: 'تأجيل هذا الشهر' })
  const r = run(f)
  assert.equal(allocation(r, 'LOAN').collectedAmount, '0.00'); assert.equal(allocation(r, 'LOAN').carriedAmount, '500.00')
  assert.equal(allocation(r, 'LOAN').loanDetails.lines[0].outcome, 'DEFERRED_MANUAL')
  assert.equal(r.finalization.netPay.amount, '700.00')
})

test('rounded COMP remains its calculated pre-cap amount after the loan is partially collected', () => {
  const f = fixture(); f.definition.components.splice(3, 0, component('DEBT_INFO', { stage: 5, sequence: 2, componentType: 'INFO',
    valueSource: 'FORMULA', amount: null, formula: 'COMP[LOAN] + 1' }))
  const r = run(f)
  assert.equal(line(r, 'LOAN').calculatedAmount, '500.00'); assert.equal(line(r, 'LOAN').payableAmount, '200.00')
  assert.equal(line(r, 'DEBT_INFO').calculatedAmount, '501.00')
  assert.equal(line(r, 'NET').payableAmount, '500.00'); assert.equal(line(r, 'NET').status, 'CALCULATED')
})

test('loan cannot be financially duplicated through COMP, INFO forwarding, or an aggregate debt variable', () => {
  for (const indirect of [false, true]) {
    const f = fixture()
    if (indirect) f.definition.components.splice(3, 0, component('FORWARD', { componentType: 'INFO', stage: 5, sequence: 2, amount: null, valueSource: 'FORMULA', formula: 'COMP[LOAN]' }))
    f.definition.components.splice(f.definition.components.length - 1, 0, component('DUP', { componentType: 'DEDUCTION', stage: 5, sequence: 3,
      deductionPriority: 3, valueSource: 'FORMULA', amount: null, formula: indirect ? 'COMP[FORWARD]' : 'COMP[LOAN]' }))
    rejects(() => preCaps(f.definition, f.settings, f.input.components, f.input.sources), 'COMPONENT_LEDGER_DOUBLE_CONSUMPTION')
  }
  for (const stage of [4, 5]) {
    const f = fixture(); f.input.components.variables.ADVANCE_DUE_THIS_PERIOD = '500'
    f.input.components.sourceMetadata.variables.ADVANCE_DUE_THIS_PERIOD = { sourceRef: 'loan:aggregate', alreadyProrated: true }
    f.definition.components.splice(stage === 4 ? 2 : 3, 0, component('DUP', { componentType: 'DEDUCTION', stage, sequence: 2, deductionPriority: 3,
      valueSource: 'SYSTEM_VAR', varCode: 'ADVANCE_DUE_THIS_PERIOD', amount: null }))
    rejects(() => preCaps(f.definition, f.settings, f.input.components, f.input.sources), 'COMPONENT_LEDGER_DOUBLE_CONSUMPTION')
  }
})

test('loan can be read in a condition without becoming a second financial deduction', () => {
  const f = fixture(); f.definition.components.splice(3, 0, component('CHECK', { componentType: 'DEDUCTION', stage: 5, sequence: 2,
    deductionPriority: 3, conditionFormula: 'COMP[LOAN] > 0', amount: '1' }))
  const r = preCaps(f.definition, f.settings, f.input.components, f.input.sources)
  assert.equal(r.components.find(row => row.code === 'CHECK').amount, '1.00')
})

test('inactive and false-condition loan sources remain untouched; no implicit financial exemption deletes principal', () => {
  for (const inactive of [true, false]) {
    const f = fixture(); if (inactive) f.definition.components[2].isActive = false; else f.definition.components[2].conditionFormula = '1 = 0'
    const r = run(f)
    assert.equal(line(r, 'LOAN').status, 'SKIPPED'); assert.equal(line(r, 'LOAN').payableAmount, '0.00')
    assert.equal(allocation(r, 'LOAN').loanDetails.outcome, 'COMPONENT_SKIPPED_SOURCE_UNTOUCHED')
    assert.equal(r.snapshot.input.sources.ledger.installments[0].remainingAmount, '500.00')
  }
  const f = fixture(); f.input.components.exemptions = [{ code: 'LOAN', sourceRef: 'exemption:123' }]
  rejects(() => run(f), 'COMPONENT_LEDGER_EXEMPTION_UNSUPPORTED')
})

test('classification and carry flags cannot override the stored loan definition', () => {
  const f = fixture(); f.input.net.classifications[1].kind = 'ATTENDANCE'
  rejects(() => run(f), 'POLICY_NET_LOAN_CLASSIFICATION')
  f.input.net.classifications[1].kind = 'LOAN'; f.input.net.classifications[1].carryOverEligible = false
  rejects(() => run(f), 'POLICY_NET_CARRY_CONFLICT')
})

test('ledger CREDIT pays its due entitlement once and does not inflate the supplied fixed-gross cap base', () => {
  const f = fixture(); f.definition.components.splice(1, 0, component('AWARD', { stage: 2, amount: null, valueSource: 'LEDGER', ledgerCategory: 'award',
    ledgerDirection: 'CREDIT', ledgerPartialPayment: 'ALLOW_PARTIAL' }))
  f.input.sources.ledger.obligations.push({ componentCode: 'AWARD', entryRef: 'obligation:1', category: 'award', direction: 'CREDIT', sourceRef: 'award:approved',
    sourceRevision: 1, duePeriod: '2026-09', remainingAmount: '400', priority: 1, sequence: 1 })
  const r = run(f)
  assert.equal(line(r, 'AWARD').payableAmount, '400.00')
  assert.equal(allocation(r, 'LOAN').collectedAmount, '200.00'); assert.equal(r.finalization.netPay.amount, '900.00')
})

function tierFixture() {
  const f = fixture(); f.definition.components[1] = late(); Object.assign(f.definition.components[1], { valueSource: 'TIERED', tierSetCode: 'LATENESS', amount: null })
  f.definition.tierSets = [{ code: 'LATENESS', nameAr: 'التأخير', description: null, inputVar: 'LATE_MINUTES', inputFormula: null, inputUnit: 'MINUTES',
    applicationBasis: 'PER_DAY', tierApplicationMode: 'WHOLE', graceMode: 'NONE', graceMinutes: 0, graceMaxUsesPerPeriod: null, allowGraceOnFlexibleShift: false,
    allowShiftGraceOverride: false, noMatchBehavior: 'NO_DEDUCTION', maxDailyDeductionDayFraction: null, maxPeriodDeductionDayFraction: null,
    secondsRoundingMode: 'FLOOR', minutesRoundingMode: 'FLOOR', roundingUnitMinutes: 1, roundingMode: 'HALF_UP', roundingScale: 2, isActive: true,
    tiers: [{ sequence: 1, fromValue: '0', toValue: null, method: 'RATE_1_1', multiplier: null, dayFraction: null, fixedAmount: null, formula: null, label: null, isActive: true }] }]
  f.input.sources.tiers.LATE = { expectedRevision: 1, periodStart: '2026-09-01', periodEnd: '2026-09-30', basicSalary: '16200', grossSalary: '16200', sourceRef: 'attendance:period',
    days: [{ date: '2026-09-01', sourceRef: 'punch:1', rawLateSeconds: '3600', excusedLateSeconds: '0', flexibleStartEnabled: false, attendanceExempt: false, shiftGraceMinutes: null }] }
  return f
}

test('tier daily source flows into the ordered financial pipeline, then shares the capacity with loans', () => {
  const f = tierFixture(), r = run(f)
  assert.equal(line(r, 'LATE').calculatedAmount, '60.00'); assert.equal(allocation(r, 'LOAN').collectedAmount, '440.00')
  assert.equal(allocation(r, 'LOAN').carriedAmount, '60.00'); assert.equal(r.finalization.netPay.amount, '500.00')
  assert.ok(line(r, 'LATE').steps.some(step => step.stage === 'TIER_SOURCE'))
  assert.ok(line(r, 'LATE').sourceRefs.includes('punch:1'))
})

test('executed tier and installment sources cannot silently mix different payroll periods', () => {
  const f = tierFixture(); f.input.sources.ledger.period = '2026-10'; f.input.sources.ledger.nextPeriod = '2026-11'
  rejects(() => run(f), 'POLICY_SOURCE_PERIOD_CONFLICT')
  const two = tierFixture(); two.definition.components.splice(2, 0, component('LATE_2', { componentType: 'DEDUCTION', stage: 3, sequence: 2,
    deductionPriority: 3, valueSource: 'TIERED', tierSetCode: 'LATENESS', amount: null }))
  two.input.sources.tiers.LATE_2 = copy(two.input.sources.tiers.LATE); two.input.sources.tiers.LATE_2.expectedRevision = 2
  rejects(() => run(two), 'POLICY_SOURCE_PERIOD_CONFLICT')
})

test('disabled or false tier component needs no source and never revives a positive deduction', () => {
  for (const reason of ['policy', 'condition', 'inactive']) {
    const f = tierFixture(); f.input.sources.tiers = {}
    if (reason === 'policy') f.settings.lateDeductionEnabled = false
    if (reason === 'condition') f.definition.components[1].conditionFormula = '1 = 0'
    if (reason === 'inactive') f.definition.components[1].isActive = false
    const r = run(f); assert.equal(line(r, 'LATE').status, 'SKIPPED'); assert.equal(line(r, 'LOAN').payableAmount, '500.00')
  }
})

test('tier limits reduce the source with a trace; a second rounding that changes it is rejected', () => {
  const f = tierFixture(); f.definition.components[1].maxAmount = '20'
  const r = run(f); assert.equal(line(r, 'LATE').calculatedAmount, '20.00')
  assert.equal(line(r, 'LATE').steps.find(step => step.stage === 'TIER_SOURCE').value.rawValue6, '60.000000')
  f.definition.components[1].maxAmount = '20.01'; f.definition.components[1].roundingMode = 'HALF_UP'; f.definition.components[1].roundingScale = 0
  rejects(() => run(f), 'COMPONENT_SOURCE_ROUNDING_CONFLICT')
})

test('policy snapshot rejects hidden/getter/sparse/unknown inputs before invoking user code', () => {
  const f = fixture(); let called = false
  Object.defineProperty(f.input, 'bad', { enumerable: true, get() { called = true; return 1 } })
  rejects(() => run(f), 'POLICY_EXECUTION_INPUT_SHAPE'); assert.equal(called, false)
  const unknown = fixture(); unknown.input.settingsOverride = {}
  rejects(() => run(unknown), 'POLICY_EXECUTION_INPUT_SHAPE')
})
