// مراجعة مستقلة للربط النقي؛ لا استيراد fixtures من ملفات تسجل اختبارات أخرى.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { executePayrollPolicy: execute } = require('../src/payroll/payroll-policy-execution')
const { executePayrollComponentsWithSources: preCaps } = require('../src/payroll/payroll-component-execution')
function component(code, extra = {}) {
  return { code, nameAr: code, componentType: 'EARNING', stage: 1, sequence: 1, valueSource: 'FIXED', conditionFormula: null,
    unit: 'CURRENCY', prorationMode: 'NONE', amount: '1000.00', fieldPath: null, missingFieldBehavior: null, varCode: null, multiplier: null,
    percent: null, baseCode: null, tierSetCode: null, formula: null, ledgerCategory: null, ledgerDirection: null, ledgerPartialPayment: null,
    minAmount: null, maxAmount: null, capPctOfBase: null, capBaseCode: null, roundingMode: null, roundingScale: null, deductionPriority: null,
    carryOverEligible: false, rollupTo: null, exemptible: true, showOnPayslip: true, isActive: true, ...extra }
}
function fixture() {
  return {
    settings: { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null,
      baseDaysBasis: 'FIXED_30', monthlyDays: 30, dailyHours: 9, rateBase: 'GROSS', roundingMode: 'HALF_UP', roundingScale: 2,
      divisionByZeroMode: 'ZERO_WITH_WARNING', maxDeductionPctOfGross: 50, minNetGuarantee: null, netFloorPct: null,
      carryOverExcess: false, skipAttendance: false, lateDeductionEnabled: true, currency: 'SAR' },
    definition: { parameters: [], tierSets: [], components: [component('PAY'),
      component('LOAN', { componentType: 'DEDUCTION', stage: 5, valueSource: 'LEDGER', amount: null, ledgerCategory: 'loan', ledgerDirection: 'DEBIT',
        ledgerPartialPayment: 'ALLOW_PARTIAL', deductionPriority: 1, carryOverEligible: true }),
      component('NET', { componentType: 'INFO', stage: 6, valueSource: 'SYS_NET', amount: null, exemptible: false })] },
    input: {
      components: { variables: {}, employeeFields: Object.fromEntries(['basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance'].map(code => [code, null])),
        externalValues: {}, sourceMetadata: { variables: {}, employeeFields: {}, externalValues: {} },
        proration: { calendar30: { value: '1', sourceRef: 'coverage:30' }, working: { value: null, sourceRef: 'schedule:none' } }, exemptions: [] },
      sources: { tiers: {}, ledger: { period: '2026-09', nextPeriod: '2026-10', installments: [
        { componentCode: 'LOAN', category: 'loan', installmentRef: 'i:1', loanRef: 'l:1', sourceRef: 'schedule:1', sourceRevision: 1,
          sequence: 1, originalDuePeriod: '2026-09', duePeriod: '2026-09', remainingAmount: '600.00', priority: 1, extensionPeriod: null }], obligations: [], manualDeferrals: [] } },
      net: { earnedFixedGross: '1000', sourceRef: 'earned:source', collectionOrderSourceRef: 'owner:collection-order', collectionOrder: ['LOAN'],
        classifications: [{ componentCode: 'LOAN', kind: 'LOAN', sourceRef: 'classification:loan', carryOverEligible: true }] },
    },
  }
}
const run = f => execute(f.definition, f.settings, f.input)
const before = f => preCaps(f.definition, f.settings, f.input.components, f.input.sources)
const errorCode = (fn, code) => assert.throws(fn, error => { assert.equal(error.code, code); return true })
function addTier(f, formula) {
  f.definition.tierSets.push({ code: 'LATE_SET', nameAr: 'تأخير', description: null, inputVar: 'LATE_MINUTES', inputFormula: null, inputUnit: 'MINUTES',
    applicationBasis: 'PER_DAY', tierApplicationMode: 'WHOLE', graceMode: 'NONE', graceMinutes: 0, graceMaxUsesPerPeriod: null,
    allowGraceOnFlexibleShift: false, allowShiftGraceOverride: false, noMatchBehavior: 'NO_DEDUCTION', maxDailyDeductionDayFraction: null,
    maxPeriodDeductionDayFraction: null, secondsRoundingMode: 'FLOOR', minutesRoundingMode: 'FLOOR', roundingUnitMinutes: 1,
    roundingMode: null, roundingScale: null, isActive: true,
    tiers: [{ sequence: 1, fromValue: '0', toValue: null, method: 'FORMULA', multiplier: null, dayFraction: null, fixedAmount: null, formula, label: null, isActive: true }] })
  f.definition.components.splice(-1, 0, component('TIER', { componentType: 'DEDUCTION', stage: 5, sequence: 3,
    valueSource: 'TIERED', tierSetCode: 'LATE_SET', amount: null, deductionPriority: 2 }))
  f.input.sources.tiers.TIER = { expectedRevision: 1, periodStart: '2026-09-01', periodEnd: '2026-09-30', basicSalary: '16200', grossSalary: '16200', sourceRef: 'snapshot:tier',
    days: [{ date: '2026-09-01', sourceRef: 'attendance:1', rawLateSeconds: '3600', excusedLateSeconds: '0', flexibleStartEnabled: false, attendanceExempt: false, shiftGraceMinutes: null }] }
}
function aggregateOnly(f, varCode, indirect) {
  f.definition.components = f.definition.components.filter(row => row.code !== 'LOAN')
  f.input.sources.ledger = null
  f.input.components.variables[varCode] = '600'
  f.input.components.sourceMetadata.variables[varCode] = { sourceRef: 'debt:aggregate', alreadyProrated: true }
  if (indirect) f.definition.components.splice(-1, 0, component('INFO_DEBT', { componentType: 'INFO', stage: 4, valueSource: 'SYSTEM_VAR', amount: null, varCode }))
  f.definition.components.splice(-1, 0, component('AGG_DEBT', { componentType: 'DEDUCTION', stage: 5, deductionPriority: 1, amount: null,
    ...(indirect ? { valueSource: 'FORMULA', formula: 'COMP[INFO_DEBT]' } : { valueSource: 'SYSTEM_VAR', varCode }) }))
  f.input.net.classifications = [{ componentCode: 'AGG_DEBT', kind: 'OTHER', sourceRef: 'classification:aggregate', carryOverEligible: false }]
  f.input.net.collectionOrder = ['AGG_DEBT']
}

test('aggregate debt cannot bypass the detailed ledger and be dropped as OTHER at NET', () => {
  for (const varCode of ['ADVANCE_DUE_THIS_PERIOD', 'DEBT_DUE_THIS_PERIOD']) {
    const f = fixture(); aggregateOnly(f, varCode, false)
    errorCode(() => run(f), 'POLICY_LEDGER_SOURCE_REQUIRED')
  }
})

test('aggregate debt forwarded through INFO cannot be reclassified as a disposable deduction', () => {
  const f = fixture(); aggregateOnly(f, 'ADVANCE_DUE_THIS_PERIOD', true)
  errorCode(() => run(f), 'POLICY_LEDGER_SOURCE_REQUIRED')
})

test('tier formula cannot financially consume ledger COMP, directly or after an INFO forwarding step', () => {
  for (const indirect of [false, true]) {
    const f = fixture()
    if (indirect) f.definition.components.splice(-1, 0, component('INFO_DEBT', { componentType: 'INFO', stage: 5, sequence: 2,
      valueSource: 'FORMULA', amount: null, formula: 'COMP[LOAN]' }))
    addTier(f, indirect ? 'COMP[INFO_DEBT]' : 'COMP[LOAN]')
    errorCode(() => before(f), 'COMPONENT_LEDGER_DOUBLE_CONSUMPTION')
  }
})

test('tier IF condition may inspect a loan while only its selected independent amount contributes', () => {
  const f = fixture(); addTier(f, 'IF(COMP[LOAN] > 0, 1, 0)')
  const output = before(f), line = output.components.find(row => row.code === 'TIER')
  assert.equal(line.amount, '1.00')
  const trace = line.steps.find(step => step.stage === 'TIER_SOURCE').details
  assert.deepEqual(trace.references, ['COMP[LOAN]']); assert.deepEqual(trace.valueReferences, [])
})

test('selected IF amount inheriting ledger principal is rejected even after a prior condition lookup', () => {
  const f = fixture(); addTier(f, 'IF(COMP[LOAN] > 0, COMP[LOAN], 0)')
  errorCode(() => before(f), 'COMPONENT_LEDGER_DOUBLE_CONSUMPTION')
})

test('zero source results retain ledger provenance if a later numeric expression revives them', () => {
  const f = fixture(); f.input.sources.ledger.installments[0].remainingAmount = '0'
  f.definition.components.splice(-1, 0, component('REVIVED', { componentType: 'DEDUCTION', stage: 5, sequence: 2, deductionPriority: 2,
    valueSource: 'FORMULA', amount: null, formula: 'COMP[LOAN] + 1' }))
  errorCode(() => before(f), 'COMPONENT_LEDGER_DOUBLE_CONSUMPTION')
})

test('aggregate debt used only in an IF condition does not become a second principal collection', () => {
  const f = fixture(); f.input.components.variables.DEBT_DUE_THIS_PERIOD = '600'
  f.input.components.sourceMetadata.variables.DEBT_DUE_THIS_PERIOD = { sourceRef: 'aggregate:read-only', alreadyProrated: true }
  f.definition.components.splice(-1, 0, component('INFO_CONDITION', { componentType: 'INFO', stage: 5, sequence: 2,
    valueSource: 'FORMULA', amount: null, formula: 'IF(DEBT_DUE_THIS_PERIOD > 0, 1, 0)' }))
  assert.equal(run(f).components.find(row => row.code === 'INFO_CONDITION').amount, '1.00')
})

test('a skipped loan needs no source snapshot and does not fabricate a carry event or erase supplied principal', () => {
  const f = fixture(); f.definition.components[1].conditionFormula = '1 = 0'; f.input.sources.ledger = null
  const output = run(f), allocation = output.finalization.allocations[0]
  assert.equal(allocation.requestedAmount, '0.00'); assert.equal(allocation.carriedAmount, '0.00')
  assert.equal(allocation.loanDetails.outcome, 'COMPONENT_SKIPPED_SOURCE_UNTOUCHED')
  assert.equal(output.snapshot.input.sources.ledger, null)
})

test('NET exposes its final exact amount and source references while blocked debts remain unallocated', () => {
  const f = fixture()
  f.definition.components.splice(1, 0, component('COURT', { componentType: 'DEDUCTION', stage: 3, amount: '1200', deductionPriority: 1 }))
  f.input.net.classifications.unshift({ componentCode: 'COURT', kind: 'COURT_ORDER', sourceRef: 'court:order', carryOverEligible: false })
  const output = run(f), net = output.components.find(row => row.code === 'NET'), loan = output.finalization.allocations.find(row => row.componentCode === 'LOAN')
  assert.equal(net.status, 'BLOCKED'); assert.equal(net.amount, '-200.00'); assert.deepEqual(net.amountExact, { numerator: '-200', denominator: '1' })
  assert.equal(net.calculatedAmount, null); assert.equal(net.payableAmount, '-200.00'); assert.equal(output.approvalEligible, false)
  assert.ok(net.sourceRefs.includes('court:order')); assert.ok(net.steps.some(row => row.stage === 'NET_FINALIZATION'))
  assert.equal(loan.unallocatedAmount, '600.00'); assert.equal(loan.droppedAmount, '0.00'); assert.equal(loan.carriedAmount, '0.00')
})

test('higher policy precision leaves subcent capacity available without turning it into fractional installment principal', () => {
  const f = fixture(); f.settings.roundingScale = 3; f.definition.components[0].amount = '1000.01'; f.input.net.earnedFixedGross = '1000.01'
  const output = run(f), loan = output.finalization.allocations[0]
  assert.equal(loan.collectedAmount, '500.000'); assert.equal(loan.carriedAmount, '100.000')
  assert.equal(loan.loanDetails.currencyScale, 2); assert.equal(output.finalization.limits.remainingAvailable.amount, '0.005')
  assert.equal(output.finalization.netPay.amount, '500.010')
})

function addCredit(f) {
  f.definition.components.splice(1, 0, component('CREDIT', { valueSource: 'LEDGER', stage: 2, amount: null,
    ledgerCategory: 'award', ledgerDirection: 'CREDIT', ledgerPartialPayment: 'ALLOW_PARTIAL' }))
  f.input.sources.ledger.obligations.push({ componentCode: 'CREDIT', entryRef: 'obligation:1', category: 'award', direction: 'CREDIT',
    sourceRef: 'approved:award', sourceRevision: 1, duePeriod: '2026-09', remainingAmount: '100', priority: 1, sequence: 1 })
}

test('a ledger credit cannot become a second financial earning through INFO or PERCENT_OF', () => {
  for (const indirect of [true, false]) {
    const f = fixture(); addCredit(f)
    if (indirect) f.definition.components.splice(2, 0, component('CREDIT_INFO', { componentType: 'INFO', stage: 2, sequence: 2,
      valueSource: 'FORMULA', amount: null, formula: 'COMP[CREDIT]' }))
    f.definition.components.splice(-1, 0, component('DUP_CREDIT', { stage: 2, sequence: 3, amount: null,
      ...(indirect ? { valueSource: 'FORMULA', formula: 'COMP[CREDIT_INFO]' } : { valueSource: 'PERCENT_OF', baseCode: 'COMP[CREDIT]', percent: '100' }) }))
    errorCode(() => before(f), 'COMPONENT_LEDGER_DOUBLE_CONSUMPTION')
  }
})

test('same ledger entry identity rejects duplication even under a different source reference and component', () => {
  const f = fixture(); addCredit(f)
  f.definition.components.splice(2, 0, component('SECOND_CREDIT', { valueSource: 'LEDGER', stage: 2, sequence: 2, amount: null,
    ledgerCategory: '*', ledgerDirection: 'CREDIT', ledgerPartialPayment: 'ALLOW_PARTIAL' }))
  f.input.sources.ledger.obligations.push({ ...f.input.sources.ledger.obligations[0], componentCode: 'SECOND_CREDIT', sourceRef: 'different:claim' })
  errorCode(() => before(f), 'COMPONENT_LEDGER_SOURCE_DUPLICATE')
})

test('a prior credit can select an independent earning branch without being consumed twice', () => {
  const f = fixture(); addCredit(f)
  f.definition.components.splice(2, 0, component('CONDITIONAL_AWARD', { stage: 2, sequence: 2, amount: null, valueSource: 'FORMULA', formula: 'IF(COMP[CREDIT] > 0, 10, 0)' }))
  const output = run(f)
  assert.equal(output.components.find(row => row.code === 'CREDIT').payableAmount, '100.00')
  assert.equal(output.components.find(row => row.code === 'CONDITIONAL_AWARD').payableAmount, '10.00')
  assert.equal(output.finalization.totals.earnings.amount, '1110.00')
})
