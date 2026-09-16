// C4 / الخطوة 27: قواعد المكافآت النقية (EX-05) بلا قاعدة بيانات — الكتالوج، طرق الحساب، السقف، التصعيد، الإعدادات، حالة الصرف.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/payroll/bonuses')
const { buildDeductionChain } = require('../src/payroll/typed-deductions')

const salary = (gross, basic = gross) => ({ basic: String(basic), gross: String(gross), monthlyDays: '30', dailyHours: '8', source: 'test' })
function body(fn) {
  try { fn() } catch (error) { return error.getResponse ? error.getResponse() : { message: error.message } }
  return null
}
const type = (overrides = {}) => rules.normalizeBonusTypeRules({ code: 'PERFORMANCE', nameAr: 'مكافأة أداء', calcMethod: 'DAYS_OF_SALARY', ...overrides })

test('EX-05 catalog: defaults (100% of base cap, one-day escalation to the department manager, HR last), code immutable, version bump only on financial fields', () => {
  const performance = type({ approvalSteps: ['HR', 'BRANCH_MANAGER'] })
  assert.deepEqual(performance.approvalSteps, ['BRANCH_MANAGER', 'HR'])
  assert.deepEqual([performance.valueStep, performance.minAmount, performance.maxPctOfBase, performance.escalationDays, performance.escalationStep],
    ['0.25', '1', '100', '1', 'DEPARTMENT_MANAGER'])
  assert.deepEqual(performance.creatorScopes, ['DIRECT_MANAGER', 'TEAM_LEADER', 'DEPARTMENT_MANAGER', 'BRANCH_MANAGER', 'HR'])
  assert.deepEqual([performance.isTaxable, performance.isInsurable], [true, false])
  assert.equal(body(() => rules.normalizeBonusTypeRules({ code: 'OTHER' }, performance)).code, 'BONUS_TYPE_CODE_IMMUTABLE')
  assert.equal(body(() => type({ calcMethod: 'HOURS_OF_SALARY' })).code, 'BONUS_TYPE_INVALID')
  assert.equal(body(() => type({ creatorScopes: ['FUNCTION_OWNER'] })).code, 'BONUS_TYPE_INVALID')
  assert.equal(body(() => type({ escalationStep: 'HR' })).code, 'BONUS_TYPE_INVALID')
  const renamed = rules.normalizeBonusTypeRules({ nameAr: 'مكافأة الأداء المتميز' }, performance)
  assert.equal(rules.bonusTypeFinancialChanged(performance, renamed), false)
  assert.equal(rules.bonusTypeFinancialChanged(performance, rules.normalizeBonusTypeRules({ maxPctOfBase: '50' }, performance)), true)
  const fromRow = rules.bonusTypeRulesFromRow({ ...rules.bonusTypeColumns(performance), minAmount: 1, maxPctOfBase: 100, valueStep: 0.25, escalationDays: 1, defaultValue: null, maxAmount: null })
  assert.deepEqual(fromRow, performance, 'decimal columns read back as numbers normalize to the same rules')
})

test('EX-05 SRS example: 2 days at a 375.00 day rate = 750.00 and escalates above one day; a fixed 1,500.00 on base 9,000 stays under the cap', () => {
  const days = rules.computeBonusAmount(type(), '2', salary('11250.00', '9000.00'))
  assert.deepEqual([days.amount, days.dayRate, days.formula, days.escalationThreshold, days.escalated, days.capLimit, days.capExceeded],
    ['750.00', '375.000000', '2 يوم × 375.00 = 750.00', '375.00', true, '9000.00', false])
  const fixed = rules.computeBonusAmount(type({ code: 'SPOT', calcMethod: 'FIXED_AMOUNT', escalationDays: '5' }), '1500', salary('11250.00', '9000.00'))
  assert.deepEqual([fixed.amount, fixed.escalated, fixed.capExceeded], ['1500.00', false, false])
  const pct = rules.computeBonusAmount(type({ code: 'PCT', calcMethod: 'PERCENT_OF_BASE' }), '12.5', salary('11250.00', '9000.00'))
  assert.equal(pct.amount, '1125.00')
})

test('EX-05 rule 2: 9,500 on base 9,000 exceeds the 100% cap — rejected without bonuses.exceed_cap, accepted with it', () => {
  const trace = rules.computeBonusAmount(type({ code: 'SPOT', calcMethod: 'FIXED_AMOUNT' }), '9500', salary('9000.00'))
  assert.deepEqual([trace.capExceeded, trace.capLimit], [true, '9000.00'])
  const rejected = body(() => rules.assertBonusCap(trace, false))
  assert.equal(rejected.code, 'BONUS_ABOVE_CAP')
  assert.equal(rejected.limit, '9000.00')
  assert.match(rejected.message, /9500\.00/)
  assert.equal(body(() => rules.assertBonusCap(trace, true)), null)
  assert.equal(rules.computeBonusAmount(type({ code: 'SPOT', calcMethod: 'FIXED_AMOUNT' }), '9000', salary('9000.00')).capExceeded, false, 'exactly the cap is allowed')
})

test('EX-05 limits: step 0.25, minimum, maximum, zero salary, decimals are exact (cut at 2 decimals, no rounding)', () => {
  assert.equal(body(() => rules.computeBonusAmount(type(), '0.3', salary('9000'))).code, 'BONUS_STEP_INVALID')
  assert.equal(rules.computeBonusAmount(type(), '0.75', salary('9000')).amount, '225.00')
  assert.equal(body(() => rules.computeBonusAmount(type({ code: 'MIN', calcMethod: 'FIXED_AMOUNT', minAmount: '100' }), '99.99', salary('9000'))).code, 'BONUS_BELOW_MIN')
  assert.equal(body(() => rules.computeBonusAmount(type({ code: 'MAX', calcMethod: 'FIXED_AMOUNT', maxAmount: '500' }), '500.01', salary('9000'))).code, 'BONUS_ABOVE_MAX')
  assert.equal(body(() => rules.computeBonusAmount(type(), '1', salary('0'))).code, 'BONUS_NO_SALARY')
  assert.equal(body(() => rules.computeBonusAmount(type({ code: 'FIX', calcMethod: 'FIXED_AMOUNT' }), '10.001', salary('9000'))).code, 'BONUS_VALUE_INVALID')
  // 1/3 يوم على 1000: سعر اليوم 33.333… × 0.25 = 8.3333 → 8.33
  assert.equal(rules.computeBonusAmount(type({ minAmount: null }), '0.25', salary('1000')).amount, '8.33')
  // 0.5 × 20.01 = 10.005 → 10.00 (قص بلا تقريب)
  assert.equal(rules.computeBonusAmount(type({ code: 'PCT', calcMethod: 'PERCENT_OF_BASE', minAmount: null }), '0.5', salary('2001', '2001')).amount, '10.00')
})

test('EX-05 rule 1 chain: an escalated bonus from a direct manager inserts the department manager before HR; a department-manager proposer skips his own step', () => {
  const approvers = { DIRECT_MANAGER: 30, TEAM_LEADER: null, DEPARTMENT_MANAGER: 20, BRANCH_MANAGER: 10 }
  const byManager = buildDeductionChain({ approvalSteps: ['HR'], escalated: true, escalationStep: 'DEPARTMENT_MANAGER', creatorEmployeeId: 30, employeeId: 40, approvers, missingApproverFallback: 'NEXT_LEVEL' })
  assert.deepEqual(byManager.map(step => [step.role, step.status, step.approverEmployeeId]), [['DEPARTMENT_MANAGER', 'PENDING', 20], ['HR', 'PENDING', null]])
  const byDepartment = buildDeductionChain({ approvalSteps: ['HR'], escalated: true, escalationStep: 'DEPARTMENT_MANAGER', creatorEmployeeId: 20, employeeId: 40, approvers, missingApproverFallback: 'NEXT_LEVEL' })
  assert.deepEqual(byDepartment.map(step => [step.role, step.status]), [['DEPARTMENT_MANAGER', 'SKIPPED'], ['HR', 'PENDING']])
})

test('EX-05 settings and payout state: bonuses.* keys validate their ranges; «paid» only after the ledger entry is applied', () => {
  assert.equal(rules.bonusSettingError('bonuses.reason_min_length', '20'), null)
  assert.match(rules.bonusSettingError('bonuses.bulk_max_employees', '5001'), /1 إلى 5000/)
  assert.match(rules.bonusSettingError('bonuses.missing_approver_fallback', 'NOPE'), /NEXT_LEVEL/)
  assert.equal(rules.bonusSettingError('deductions.reason_min_length', 'x'), null, 'other keys are not judged here')
  assert.equal(rules.bonusNumericSetting('bonuses.duplicate_window_hours', '99999'), 8760)
  assert.deepEqual(rules.BONUS_CONFIG_SEED.map(row => row.key).sort(), ['bonuses.bulk_max_employees', 'bonuses.duplicate_window_hours', 'bonuses.manager_creation_enabled',
    'bonuses.missing_approver_fallback', 'bonuses.reason_min_length'])
  assert.equal(rules.bonusPayoutState(null), null)
  assert.equal(rules.bonusPayoutState({ status: 'PENDING', reservedPayrollRunId: null }), 'AWAITING_PAYROLL')
  assert.equal(rules.bonusPayoutState({ status: 'PENDING', reservedPayrollRunId: 7 }), 'RESERVED')
  assert.equal(rules.bonusPayoutState({ status: 'APPLIED', reservedPayrollRunId: 7 }), 'PAID')
  assert.equal(rules.BONUS_LABELS.statuses.APPROVED, 'معتمد — بانتظار الصرف')
})
