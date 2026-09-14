const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('../node_modules/typescript')
const source = fs.readFileSync(path.join(__dirname, '../../src/lib/upcoming-birthdays.ts'), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const loaded = { exports: {} }
new Function('module', 'exports', code)(loaded, loaded.exports)
const { upcomingBirthdays } = loaded.exports
const employee = (id, birthDate, status = 'active') => ({ id, fullName: `Employee ${id}`, birthDate, status, isActive: true })

test('birthday window includes today and its final date, handles year rollover and excludes dates beyond it', () => {
  const result = upcomingBirthdays([employee(1, '1990-12-15'), employee(2, '1985-01-01'), employee(3, '2000-01-14'), employee(4, '2000-01-15'), employee(5, '1999-12-14')], '2026-12-15', '2027-01-14')
  assert.deepEqual(result.map(row => [row.employeeId, row.date]), [[1, '2026-12-15'], [2, '2027-01-01'], [3, '2027-01-14']])
})
test('February 29 stays in leap years and is explicitly observed on February 28 otherwise, including century rules', () => {
  const person = employee(1, '2000-02-29')
  assert.deepEqual(upcomingBirthdays([person], '2028-02-01', '2028-03-02').map(row => [row.date, row.observedLeapDay]), [['2028-02-29', false]])
  assert.deepEqual(upcomingBirthdays([person], '2027-02-01', '2027-03-03').map(row => [row.date, row.observedLeapDay]), [['2027-02-28', true]])
  assert.deepEqual(upcomingBirthdays([person], '2100-02-01', '2100-03-03').map(row => [row.date, row.observedLeapDay]), [['2100-02-28', true]])
  assert.deepEqual(upcomingBirthdays([person], '2027-03-01', '2027-03-31'), [])
})
test('only current active/probation employees from the supplied authorized list produce events, without birth year or age', () => {
  const result = upcomingBirthdays(['active', 'probation', 'notice_period', 'suspended', 'terminated', 'archived'].map((status, index) => employee(index + 1, '1990-09-20', status)), '2026-09-12', '2026-10-12')
  assert.deepEqual(result.map(row => row.employeeId), [1, 2])
  assert.ok(result.every(row => !('birthDate' in row) && !('age' in row) && !('birthYear' in row)))
  assert.deepEqual(upcomingBirthdays([], '2026-09-12', '2026-10-12'), [])
  assert.deepEqual(upcomingBirthdays([{ ...employee(7, '1990-09-20'), isActive: false }], '2026-09-12', '2026-10-12'), [])
})
test('missing, malformed, impossible and future birth dates are ignored instead of rolling into another day', () => {
  const dates = [undefined, null, '', 'not-a-date', '1990-02-30', '1900-02-29', '1990-13-01', '1990-00-10', '0000-09-20', '2027-09-20']
  assert.deepEqual(upcomingBirthdays(dates.map((date, index) => employee(index + 1, date)), '2026-09-12', '2026-10-12'), [])
  assert.deepEqual(upcomingBirthdays([employee(1, '1990-09-20')], '2026-10-12', '2026-09-12'), [])
  assert.deepEqual(upcomingBirthdays([employee(1, '1990-09-20')], '2026-02-30', '2026-03-30'), [])
})
