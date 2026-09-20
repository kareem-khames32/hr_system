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
  // قرار المالك (20 سبتمبر): الموقوف عضو في المسير بتغطية كاملة؛ أيام الإيقاف تُخصم بمنطق employee_suspensions.
  assert.equal(coverage({ ...active, status: 'suspended', isActive: false }, [], ...period).coverDays, 30)
  assert.throws(() => coverage(active, [{ lastWorkingDay: '2026-06-01', status: 'CLOSED' }], ...period), /إعادة التعيين/)
  assert.throws(() => coverage(active, [{ lastWorkingDay: '2026-07-10', status: 'CLOSED' }], ...period), /إعادة التعيين/)
  assert.throws(() => coverage({ ...active, status: 'probation' }, [{ lastWorkingDay: '2026-07-10', status: 'CLOSED' }], ...period), /إعادة التعيين/)
  assert.equal(coverage({ ...active, actualStartDate: '2026-07-01' }, [{ lastWorkingDay: '2026-06-01', status: 'CLOSED' }], ...period).coverDays, 22)
})

// ===== قرار المالك (20 سبتمبر): الموقوف والمؤرشف داخل المسير =====
const { coverageExclusion } = require('../src/payroll/payroll-run-membership')
const { payrollSuspensionNote } = require('../src/employees/employee-suspension-rules')

test('OWNER-1 الموقوف عضو في المسير مهما كانت isActive وما بقاش له كود استبعاد SUSPENDED', () => {
  const suspended = { ...active, status: 'suspended', isActive: false }
  assert.equal(coverage(suspended, [], ...period).coverDays, 30)
  // أرشفة قديمة على ملف موقوف لا تنهي خدمته
  assert.equal(coverage({ ...suspended, archivedAt: new Date('2026-07-01') }, [], ...period).coverDays, 30)
  // التحاق داخل الفترة يقلّل التغطية فقط، ولا يستبعده
  assert.equal(coverage({ ...suspended, actualStartDate: '2026-07-01' }, [], ...period).coverDays, 22)
})

test('OWNER-2 المؤرشف بتاريخ آخر يوم عمل يأخذ أجر أيامه، وبلا تاريخ يُستبعد بسبب واضح، وبعد شهره يختفي', () => {
  const archived = { ...active, status: 'archived', isActive: false }
  // (أ) ملف إنهاء خدمة داخل الفترة: أجر الأيام حتى آخر يوم عمل
  const withCase = coverage(archived, [{ lastWorkingDay: '2026-07-10', status: 'CLOSED' }], ...period)
  assert.deepEqual([withCase.coverFrom, withCase.coverTo, withCase.coverDays, withCase.endDateSource], ['2026-06-23', '2026-07-10', 18, 'OFFBOARDING'])
  // (ب) تاريخ الأرشفة وحده يكفي كآخر يوم عمل موثق
  const byArchive = coverage({ ...archived, archivedAt: new Date('2026-07-10T10:00:00Z') }, [], ...period)
  assert.equal(byArchive.coverDays, 18); assert.equal(byArchive.endDateSource, 'ARCHIVE')
  // (ج) بلا أي تاريخ موثق: مستبعد بسبب مفهوم بدل رمي خطأ بيانات
  assert.equal(coverage(archived, [], ...period), null)
  assert.equal(coverageExclusion(archived, [], ...period), 'EXC_ARCHIVED_NO_LAST_DAY')
  // (د) بعد شهر آخر يوم عمل لا يظهر إطلاقًا
  assert.equal(coverage(archived, [{ lastWorkingDay: '2026-06-01', status: 'CLOSED' }], ...period), null)
  assert.equal(coverageExclusion(archived, [{ lastWorkingDay: '2026-06-01', status: 'CLOSED' }], ...period), 'EXC_TERMINATED_BEFORE_PERIOD')
  assert.equal(coverageExclusion({ ...archived, archivedAt: new Date('2026-05-30T09:00:00Z') }, [], ...period), 'EXC_TERMINATED_BEFORE_PERIOD')
})

test('OWNER-1 سطر حالة الإيقاف على صف الموظف: «موقوف من … إلى …» و«رجع نشط من …»', () => {
  const periods = [{ id: 1, employeeId: 7, fromDate: '2026-07-01', toDate: '2026-07-05', status: 'ACTIVE' }]
  assert.equal(payrollSuspensionNote(periods, ...period), 'موقوف من 2026-07-01 إلى 2026-07-05 — رجع نشط من 2026-07-06')
  assert.equal(payrollSuspensionNote([{ ...periods[0], toDate: '2026-07-22' }], ...period), 'موقوف من 2026-07-01 إلى 2026-07-22')
  assert.equal(payrollSuspensionNote([{ ...periods[0], status: 'CANCELLED' }], ...period), null)
  assert.equal(payrollSuspensionNote([{ ...periods[0], fromDate: '2026-08-01', toDate: '2026-08-05' }], ...period), null)
})
