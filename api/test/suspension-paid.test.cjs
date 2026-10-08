// B4.5 (د) — الإيقاف الاحتياطي بأجر: حساب نقي بلا قاعدة بيانات.
// يوم الإيقاف بأجر موقوف (مش غياب) بس مش مخصوم؛ من غير علامة «بأجر» الحساب زي الأول بالحرف؛ وحد المدة من الحزمة لما صفها «اتأكد» بس.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/employees/employee-suspension-rules')
const { paidSuspensionMaxDays } = require('../src/employees/employee-suspension-paid')
const { STATUTORY_SEED } = require('../src/statutory/statutory-data')
const P = (id, fromDate, toDate, extra = {}) => ({ id, fromDate, toDate, status: 'ACTIVE', ...extra })

test('SPU-01: أيام الإيقاف بأجر موقوفة ومش مخصومة؛ ومن غير علامة «بأجر» الحساب زي الأول بالحرف', () => {
  const plain = [P(1, '2026-05-03', '2026-05-07'), P(2, '2026-05-17', '2026-05-18')]
  const before = rules.suspensionPayrollDays(plain, '2026-05-01', '2026-05-31')
  assert.deepEqual([before.days, before.dates.length, before.ids], [7, 7, [1, 2]])
  // isPaid فاضي أو false = نفس النتيجة
  for (const flag of [undefined, null, false]) assert.deepEqual(rules.suspensionPayrollDays(plain.map(row => ({ ...row, isPaid: flag })), '2026-05-01', '2026-05-31'), before)
  const mixed = [P(1, '2026-05-03', '2026-05-07', { isPaid: true }), P(2, '2026-05-17', '2026-05-18')]
  const after = rules.suspensionPayrollDays(mixed, '2026-05-01', '2026-05-31')
  assert.deepEqual([after.days, after.dates, after.ids], [2, before.dates, [1, 2]])
  // كله بأجر: صفر خصم والأيام كلها موقوفة؛ والملغى برّه الحساب
  assert.deepEqual(rules.suspensionPayrollDays([P(1, '2026-05-01', '2026-05-31', { isPaid: true })], '2026-05-01', '2026-05-31').days, 0)
  assert.deepEqual(rules.suspensionPayrollDays([P(1, '2026-05-03', '2026-05-07', { isPaid: true, status: 'CANCELLED' }), P(2, '2026-05-17', '2026-05-18')], '2026-05-01', '2026-05-31').days, 2)
  // يوم إيقاف عادي عليه إجازة بدون راتب مايتخصمش مرتين (زي الأول)، ويوم بأجر عليه إجازة مايتخصمش كإيقاف
  const leaves = [{ fromDate: '2026-05-18', toDate: '2026-05-18' }, { fromDate: '2026-05-07', toDate: '2026-05-07' }]
  assert.equal(rules.suspensionPayrollDays(mixed, '2026-05-01', '2026-05-31', leaves).days, 1)
})

test('SPU-02: «موقوف بلا أجر» في التقرير للإيقاف من غير أجر بس', () => {
  const paid = [P(1, '2026-06-01', '2026-06-30', { isPaid: true })], unpaid = [P(1, '2026-06-01', '2026-06-30')]
  assert.deepEqual([rules.suspendedWholeRange(rules.unpaidSuspensions(paid), '2026-06-01', '2026-06-30'), rules.suspendedWholeRange(rules.unpaidSuspensions(unpaid), '2026-06-01', '2026-06-30')], [false, true])
  assert.deepEqual(rules.unpaidSuspensions([...paid, P(2, '2026-07-01', '2026-07-02', { isPaid: null })]).map(row => row.id), [2])
  // الحالة «موقوف» والأيام الموقوفة ماتتأثرش بـ«بأجر»
  assert.equal(rules.displayEmployeeStatus('active', paid, '2026-06-10'), 'suspended')
  assert.equal(rules.suspendedDatesInRange(paid, '2026-06-01', '2026-06-30').length, 30)
})

test('SPU-03: حد مدة الإيقاف بأجر من الحزمة — مصر بس، ولما الصف «اتأكد» بس، وبتاريخ بداية الإيقاف', () => {
  const entries = verified => STATUTORY_SEED.map(seed => ({ ...seed, verified }))
  assert.deepEqual([paidSuspensionMaxDays(entries(true), 'EG', '2026-10-08'), paidSuspensionMaxDays(entries(true), ' eg ', '2026-10-08')], [60, 60])
  assert.deepEqual([paidSuspensionMaxDays(entries(false), 'EG', '2026-10-08'), paidSuspensionMaxDays(entries(true), 'SA', '2026-10-08'), paidSuspensionMaxDays(entries(true), null, '2026-10-08'),
    paidSuspensionMaxDays(entries(true), 'EG', '2025-08-31'), paidSuspensionMaxDays([], 'EG', '2026-10-08')], [null, null, null, null, null])
  // الرقم من الحزمة مش من الكود
  const changed = entries(true).map(entry => entry.key === 'eg.termination' ? { ...entry, values: { ...entry.values, paid_suspension_max_days: '45' } } : entry)
  assert.equal(paidSuspensionMaxDays(changed, 'EG', '2026-10-08'), 45)
  assert.match(rules.suspensionPaidTooLong(60), /بحد أقصى 60 يوم/)
})

test('SPU-04: مصدر الكود — الإعداد مقفول مبذور، والعمود برّه الكيان، وكل قارئ إيقافات بيحط علامة «بأجر»، والحكم تحت قفل صف الموظف', () => {
  const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
  const { configSeed } = require('../src/seed/requests-seed.data')
  assert.deepEqual(configSeed.filter(row => row.key === rules.SUSPENSION_PAID_KEY), [{ key: 'suspension.paid_precautionary.enabled', value: 'false' }])
  assert.match(read('employees/employee-suspension.entity.ts'), /type: 'bit', nullable: true, select: false, insert: false, update: false \}\)\n  isPaid\?:/)
  const readers = read('employees/employee-suspensions.ts')
  assert.equal((readers.match(/attachSuspensionPaid\(em, rows\.map\(normalize\)\)/g) ?? []).length, 2, 'القارئين بيعدّوا من attachSuspensionPaid')
  assert.match(readers, /paid: row\.isPaid === true/)
  assert.doesNotMatch(read('employees/employee-suspension-paid.ts'), /EntityManager|getRepository|\.query\(/)
  const service = read('employees/employees.service.ts')
  const create = service.slice(service.indexOf('  async createSuspension('), service.indexOf('  // إنهاء بدري'))
  assert.ok(create.indexOf('this.scopedEmployee(em, id, branchScope, true)') < create.indexOf('const paid = dto.paid === true'), 'حكم «بأجر» بعد قفل صف الموظف')
  assert.match(create, /if \(paid && !\(await markSuspensionPaid\(em, row\.id\)\)\) throw new BadRequestException\(SUSPENSION_PAID_MIGRATION\)/)
  assert.match(read('payroll/payroll-daily-accrual.service.ts'), /suspensionAmount: round2\(input\.suspended && !input\.suspendedPaid \? input\.dayRate : 0\)/)
  // CR4-SELF: «موقوف بلا أجر» في تقرير الرواتب وتقرير غير المدرجين للإيقاف من غير أجر بس — الموقوف بأجر مستحق وبيبان لو مش في مسير
  for (const file of ['payroll/payroll-reports.ts', 'payroll/payroll-unassigned-report.ts']) {
    assert.match(read(file), /suspendedWholeRange\(unpaidSuspensions\(/, file)
    assert.doesNotMatch(read(file), /suspendedWholeRange\((?!unpaidSuspensions\()/, file)
  }
  assert.match(read('payroll/payroll-daily-accrual.service.ts'), /suspended, exempt, \.\.\.\(suspendedPaid \? \{ suspendedPaid \} : \{\}\),/, 'بصمة اليوم من غير «بأجر» زي الأول بالحرف')
})
