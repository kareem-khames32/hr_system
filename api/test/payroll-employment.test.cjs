const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.resolve(__dirname, '../tsconfig.json'), transpileOnly: true })
const { payrollEmploymentCoverage: coverage } = require('../src/payroll/payroll-employment')
const period = ['2026-06-23', '2026-07-22']
const active = { joinDate: '2020-01-01', status: 'active', isActive: true }

test('PR-10 coverage includes a terminated employee through the last working day: 18 inclusive days', () => {
  const result = coverage({ ...active, status: 'terminated', isActive: false, archivedAt: new Date('2026-08-01') }, [{ lastWorkingDay: '2026-07-10', status: 'CLOSED' }], ...period)
  assert.deepEqual([result.coverFrom, result.coverTo, result.coverDays, result.endDateSource], ['2026-06-23', '2026-07-10', 18, 'OFFBOARDING'])
})
test('PR-10 actual start controls 22-day coverage; employment outside the period is excluded', () => {
  assert.equal(coverage({ ...active, actualStartDate: '2026-07-01' }, [], ...period).coverDays, 22)
  assert.equal(coverage({ ...active, actualStartDate: '2026-07-23' }, [], ...period), null)
  assert.equal(coverage({ ...active, isActive: false }, [{ lastWorkingDay: '2026-06-22', status: 'CLOSED' }], ...period), null)
})
test('PR-10 inclusive boundaries count one day and a cancelled case does not terminate employment', () => {
  assert.equal(coverage(active, [{ lastWorkingDay: '2026-06-23', status: 'IN_SETTLEMENT' }], ...period).coverDays, 1)
  assert.equal(coverage({ ...active, joinDate: '2026-07-22' }, [], ...period).coverDays, 1)
  assert.equal(coverage(active, [{ lastWorkingDay: '2026-07-01', status: 'CANCELLED' }], ...period).coverDays, 30)
})
test('PR-10 archive fallback is explicit and an old closed case cannot terminate a later hire', () => {
  const result = coverage({ ...active, isActive: false, status: 'terminated', archivedAt: new Date('2026-07-10T10:00:00Z') }, [], ...period)
  assert.equal(result.coverDays, 18); assert.equal(result.endDateSource, 'ARCHIVE')
  assert.equal(coverage({ ...active, actualStartDate: '2026-07-01' }, [{ lastWorkingDay: '2026-06-01', status: 'CLOSED' }], ...period).coverDays, 22)
})
test('PR-10 unknown or ambiguous employment end cannot silently create a full salary', () => {
  assert.throws(() => coverage({ ...active, isActive: false }, [], ...period), /آخر يوم عمل/)
  assert.throws(() => coverage(active, [{ lastWorkingDay: '2026-07-01', status: 'CLOSED' }, { lastWorkingDay: '2026-07-10', status: 'CLOSED' }], ...period), /إعادة التعيين/)
  assert.throws(() => coverage(active, [], '2026-02-30', '2026-03-10'), /غير صالح/)
})

test('PR-10 suspension is not an undocumented termination and an ambiguous rehire cannot silently vanish', () => {
  assert.equal(coverage({ ...active, status: 'suspended', isActive: false }, [], ...period), null)
  assert.throws(() => coverage(active, [{ lastWorkingDay: '2026-06-01', status: 'CLOSED' }], ...period), /إعادة التعيين/)
  assert.throws(() => coverage(active, [{ lastWorkingDay: '2026-07-10', status: 'CLOSED' }], ...period), /إعادة التعيين/)
  assert.throws(() => coverage({ ...active, status: 'probation' }, [{ lastWorkingDay: '2026-07-10', status: 'CLOSED' }], ...period), /إعادة التعيين/)
  assert.equal(coverage({ ...active, actualStartDate: '2026-07-01' }, [{ lastWorkingDay: '2026-06-01', status: 'CLOSED' }], ...period).coverDays, 22)
})
