const { test } = require('node:test')
const assert = require('node:assert/strict'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { readPayrollLiveCompensation: read } = require('../src/payroll/payroll-live-compensation-provider')
const { salaryCurrentSourceHash, salaryHistoryContentHash, monthlySalaryHistoryContentHash, normalizeSalaryHistorySegments, SALARY_HISTORY_MONEY_KEYS: keys } = require('../src/payroll/payroll-salary-history')
const { normalizeMonthlySalaryPeriods, PAYROLL_MONTHLY_SALARY_HISTORY_VERSION } = require('../src/payroll/payroll-period-salary')
const monthly = Object.fromEntries(keys.map((key, i) => [key, i ? '0.00' : '6000.00']))
const period = (extra = {}) => ({ effectivePayrollPeriod: '2026-01', effectiveToPayrollPeriod: null, currency: 'EGP', ...monthly, ...extra })
const employment = (coverage = { from: '2026-06-01', to: '2026-06-30', days: 30 }, state = 'AVAILABLE') => ({ state, data: { coverage }, issues: [], sourceRefs: ['employees:3'] })
const current = (values = { ...monthly, currency: 'EGP' }) => { const { currency, ...amounts } = values; return { state: 'UNSUPPORTED', data: { basis: 'CURRENT_EMPLOYEE_COLUMNS_ONLY', current: amounts, currency, datedSegments: null }, issues: [], sourceRefs: ['employees:3'] } }
function fixture({ periods = [period()], currentValue = { ...monthly, currency: 'EGP' }, revision = 1, noHistory = false, error = null, cycleStartDay = 1, legacy = false } = {}) {
  const segments = legacy ? normalizeSalaryHistorySegments([{ effectiveFrom: '2026-01-01', effectiveTo: null, currency: 'EGP', ...monthly }]) : normalizeMonthlySalaryPeriods(periods, cycleStartDay)
  const header = { id: 7, employeeId: 3, revision, reason: 'إثبات شهر الراتب', evidenceReference: 'قرار اختبار', createdAt: new Date('2026-09-14T00:00:00Z'), createdBy: 4, currentSourceHash: salaryCurrentSourceHash(currentValue), contractVersion: legacy ? null : PAYROLL_MONTHLY_SALARY_HISTORY_VERSION, cycleStartDay: legacy ? null : cycleStartDay }
  const hashInput = { employeeId: 3, revision, reason: header.reason, evidenceReference: header.evidenceReference, currentSourceHash: header.currentSourceHash, segments }
  header.contentHash = legacy ? salaryHistoryContentHash(hashInput) : monthlySalaryHistoryContentHash({ ...hashInput, cycleStartDay, createdBy: header.createdBy, createdAt: header.createdAt.toISOString() })
  const rows = segments.map((row, index) => ({ sequence: index + 1, ...row })), calls = []
  const em = { queryRunner: { isTransactionActive: true }, query: async (sql, parameters) => {
    assert.match(sql, /^SELECT /); assert.doesNotMatch(sql, /NOLOCK|READUNCOMMITTED/i); calls.push({ sql, parameters })
    if (error) throw error
    return sql.includes('employee_salary_history_versions') ? (noHistory ? [] : [header]) : rows
  } }
  return { em, header, rows, calls }
}
const run = (source, service = employment(), salary = current(), currency = 'EGP', from = '2026-06-01', to = '2026-06-30') => read(source.em, 3, from, to, service, salary, currency)
const hasIssue = (result, code) => result.issues.some(issue => issue.code === code)

test('September payroll Aug23-Sep22 selects10000 for whole coverage and never splits at September1', async () => {
  const source = fixture({ cycleStartDay: 23, periods: [period({ effectiveToPayrollPeriod: '2026-08', basicSalary: '9000.00' }), period({ effectivePayrollPeriod: '2026-09', basicSalary: '10000.00' })] })
  const result = await run(source, employment({ from: '2026-08-23', to: '2026-09-22', days: 31 }), current(), 'EGP', '2026-08-23', '2026-09-22')
  assert.equal(result.state, 'AVAILABLE'); assert.equal(result.data.basis, 'SINGLE_PAYROLL_PERIOD_SALARY'); assert.equal(result.data.referencePeriod, '2026-09')
  assert.deepEqual(result.data.datedSegments.map(row => [row.from, row.to, row.salary.basicSalary]), [['2026-08-23', '2026-09-22', '10000.00']])
  assert.equal(result.data.selectedSalary.effectivePayrollPeriod, '2026-09'); assert.match(result.data.selectedSalary.historyContentHash, /^[a-f0-9]{64}$/)
})
test('first calculation of old months after a later raise still uses each named month salary', async () => {
  const currentValue = { ...monthly, basicSalary: '12000.00', currency: 'EGP' }
  const source = fixture({ currentValue, cycleStartDay: 23, periods: [period({ effectiveToPayrollPeriod: '2026-08', basicSalary: '9000.00' }), period({ effectivePayrollPeriod: '2026-09', effectiveToPayrollPeriod: '2026-09', basicSalary: '10000.00' }), period({ effectivePayrollPeriod: '2026-10', basicSalary: '12000.00' })] })
  for (const [from, to, days, expected] of [['2026-07-23', '2026-08-22', 31, '9000.00'], ['2026-08-23', '2026-09-22', 31, '10000.00'], ['2026-09-23', '2026-10-22', 30, '12000.00']]) {
    const result = await run(source, employment({ from, to, days }), current(currentValue), 'EGP', from, to)
    assert.equal(result.state, 'AVAILABLE'); assert.equal(result.data.datedSegments[0].salary.basicSalary, expected)
  }
})
test('partial employment changes coverage only and still emits the full monthly rate', async () => {
  const result = await run(fixture(), employment({ from: '2026-06-10', to: '2026-06-25', days: 16 }))
  assert.equal(result.state, 'AVAILABLE'); assert.deepEqual(result.data.datedSegments.map(row => [row.from, row.to, row.salary.basicSalary]), [['2026-06-10', '2026-06-25', '6000.00']])
})
test('legacy dated history remains evidence for review but cannot invent payroll reference months', async () => {
  const result = await run(fixture({ legacy: true }))
  assert.equal(result.state, 'MISSING'); assert.equal(result.data.datedSegments, null); assert.equal(result.data.historySegments.length, 1)
  assert.ok(hasIssue(result, 'SALARY_PAYROLL_PERIOD_EVIDENCE_REQUIRED')); assert.deepEqual(result.data.missingPayrollPeriods, ['2026-06'])
})
test('large exact SQL money stays decimal text without repricing or rounding', async () => {
  const result = await run(fixture({ periods: [period({ basicSalary: '9999999999999999.99', phoneAllowance: '90071992547409.93' })] }))
  assert.equal(result.state, 'AVAILABLE'); assert.equal(result.data.datedSegments[0].salary.basicSalary, '9999999999999999.99'); assert.equal(result.data.datedSegments[0].salary.phoneAllowance, '90071992547409.93')
})
test('absent salary history never fills old periods from current employee columns', async () => {
  const source = fixture({ noHistory: true }), result = await run(source)
  assert.equal(result.state, 'MISSING'); assert.equal(result.data.datedSegments, null); assert.ok(hasIssue(result, 'COMPENSATION_HISTORY_MISSING')); assert.equal(source.calls.length, 1)
})
test('missing schema is distinguished from connection failures', async () => {
  for (const number of [207, 208]) { const result = await run(fixture({ error: { driverError: { number } } })); assert.equal(result.state, 'MISSING'); assert.ok(hasIssue(result, 'COMPENSATION_HISTORY_SCHEMA_MISSING')) }
  const lost = new Error('connection lost'); await assert.rejects(run(fixture({ error: lost })), error => error === lost)
})
test('changed current salary component blocks publication of monthly financial input', async () => {
  for (const key of keys) {
    const live = current(); live.data.current[key] = '99.25'
    const result = await run(fixture(), employment(), live)
    assert.equal(result.state, 'UNSUPPORTED'); assert.equal(result.data.currentSourceUnchanged, false); assert.equal(result.data.datedSegments, null)
    assert.ok(hasIssue(result, 'COMPENSATION_CURRENT_SOURCE_CHANGED'))
  }
})
test('currency changes and null-to-zero changes are not silently accepted as the same source', async () => {
  const live = current(); live.data.currency = 'SAR'
  assert.ok(hasIssue(await run(fixture(), employment(), live), 'COMPENSATION_CURRENT_SOURCE_CHANGED'))
  const result = await run(fixture({ currentValue: { ...monthly, phoneAllowance: null, currency: 'EGP' } }))
  assert.equal(result.state, 'UNSUPPORTED'); assert.ok(hasIssue(result, 'COMPENSATION_CURRENT_SOURCE_CHANGED'))
})
test('missing current salary fields do not become zero for source matching', async () => {
  const live = current(); delete live.data.current.phoneAllowance
  const result = await run(fixture(), employment(), live)
  assert.equal(result.state, 'INVALID'); assert.equal(result.data.datedSegments, null); assert.ok(hasIssue(result, 'COMPENSATION_CURRENT_SOURCE_INVALID'))
})
test('tampered salary, month, derived dates, contract or hash invalidate stored evidence', async () => {
  for (const change of [f => f.rows[0].basicSalary = '0.01', f => f.rows[0].effectivePayrollPeriod = '2026-02', f => f.rows[0].effectiveFrom = '2026-01-02', f => f.header.contentHash = '0'.repeat(64), f => f.header.contractVersion = null, f => f.rows[0].effectiveToPayrollPeriod = undefined]) {
    const source = fixture(); change(source)
    const result = await run(source)
    assert.equal(result.state, 'INVALID'); assert.equal(result.data.datedSegments, null); assert.ok(hasIssue(result, 'COMPENSATION_HISTORY_INVALID'))
  }
})
test('a missing month in the latest revision never borrows previous or future salary', async () => {
  const result = await run(fixture({ revision: 2, periods: [period({ effectiveToPayrollPeriod: '2026-05' }), period({ effectivePayrollPeriod: '2026-07', basicSalary: '12000.00' })] }))
  assert.equal(result.state, 'MISSING'); assert.deepEqual(result.data.missingPayrollPeriods, ['2026-06']); assert.ok(hasIssue(result, 'SALARY_PAYROLL_PERIOD_GAP')); assert.equal(result.data.historyVersion.revision, 2)
})
test('a future salary alone cannot establish an earlier payroll month', async () => {
  const result = await run(fixture({ periods: [period({ effectivePayrollPeriod: '2026-07' })] }))
  assert.equal(result.state, 'MISSING'); assert.equal(result.data.datedSegments, null)
})
test('policy currency must match selected month but other months may have another currency', async () => {
  for (const currency of [null, 'USD', 'SAR']) { const result = await run(fixture(), employment(), current(), currency); assert.equal(result.state, 'UNSUPPORTED'); assert.ok(hasIssue(result, 'COMPENSATION_POLICY_CURRENCY_MISMATCH')) }
  const result = await run(fixture({ periods: [period({ effectiveToPayrollPeriod: '2026-05', currency: 'SAR' }), period({ effectivePayrollPeriod: '2026-06' })] }))
  assert.equal(result.state, 'AVAILABLE'); assert.equal(result.data.datedSegments[0].currency, 'EGP')
})
test('salary choice stays the same when its saved cycle differs from inspected run dates', async () => {
  const result = await run(fixture({ cycleStartDay: 23, periods: [period({ effectivePayrollPeriod: '2026-06', basicSalary: '10000.00' })] }))
  assert.equal(result.state, 'AVAILABLE'); assert.equal(result.data.datedSegments[0].salary.basicSalary, '10000.00'); assert.equal(result.data.datedSegments[0].from, '2026-06-01')
})
test('missing employment proof never supplies a financial salary coverage', async () => {
  for (const state of ['MISSING', 'UNSUPPORTED', 'INVALID']) { const result = await run(fixture(), employment(undefined, state)); assert.equal(result.state, 'UNSUPPORTED'); assert.equal(result.data.datedSegments, null); assert.ok(hasIssue(result, 'COMPENSATION_EMPLOYMENT_COVERAGE_MISSING')) }
  assert.notEqual((await run(fixture(), employment(null))).state, 'AVAILABLE')
})
test('reversed, impossible or out-of-period employment coverage cannot appear AVAILABLE', async () => {
  for (const coverage of [{ from: '2026-06-20', to: '2026-06-10', days: -9 }, { from: '2026-06-XX', to: '2026-06-30', days: 1 }, { from: '2026-06-01', to: '2026-06-30', days: 29 }, { from: '2026-05-31', to: '2026-06-30', days: 31 }, { from: '2026-06-01', to: '2026-07-01', days: 31 }]) {
    const result = await run(fixture(), employment(coverage)); assert.notEqual(result.state, 'AVAILABLE'); assert.equal(result.data.datedSegments, null)
  }
})
test('invalid requested dates fail before any SQL is read', async () => {
  const source = fixture(); await assert.rejects(read(source.em, 3, '2026-02-30', '2026-03-30', employment(), current(), 'EGP'), error => error.getStatus() === 400); assert.equal(source.calls.length, 0)
})
