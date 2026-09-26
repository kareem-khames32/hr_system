const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { normalizeSalaryHistorySegments: normalize, salaryHistoryDate: date, salaryHistoryMoney: money,
  salaryHistoryText: text, salaryCurrentSourceHash: currentHash, salaryHistoryContentHash: historyHash,
  readSalaryHistory: read, readSalaryHistoryCurrent: readCurrent, salaryHistorySchemaMissing: schemaMissing,
  SALARY_HISTORY_MONEY_KEYS: keys } = require('../src/payroll/payroll-salary-history')
const amounts = Object.fromEntries(keys.map((key, index) => [key, `${index ? index * 100 : 6000}.00`]))
const segment = (patch = {}) => ({ effectiveFrom: '2026-01-01', effectiveTo: null, currency: 'EGP', ...amounts, ...patch })
const current = () => ({ ...amounts, currency: 'EGP' })
const bad = code => error => error.getStatus() === 400 && (!code || error.getResponse().code === code)
const corrupted = error => error.getStatus() === 409 && error.getResponse().code === 'SALARY_HISTORY_INVALID'
function fixture(patch = {}) {
  const segments = normalize([segment()]), header = { id: 7, employeeId: 3, revision: 1, reason: 'إثبات العقد الأصلي', evidenceReference: 'عقد رقم 3', currentSourceHash: currentHash(current()), createdBy: 4, createdAt: new Date('2026-09-13T12:00:00.000Z') }
  header.contentHash = historyHash({ employeeId: 3, revision: 1, reason: header.reason, evidenceReference: header.evidenceReference, currentSourceHash: header.currentSourceHash, segments })
  return { header: { ...header, ...patch }, stored: segments.map((row, index) => ({ sequence: index + 1, ...row })) }
}
function manager(header, stored) {
  const calls = []
  return { calls, queryRunner: { isTransactionActive: true }, query: async (sql, parameters) => {
    calls.push({ sql, parameters })
    assert.match(sql, /^SELECT /)
    return sql.includes('employee_salary_history_versions') ? (header ? [header] : []) : stored
  } }
}

test('مبالغ الأجر تحفظ جميع مكونات DECIMAL(18,2) بدقة دون Number', () => {
  const result = normalize([segment({ basicSalary: '9999999999999999.99', housingAllowance: '90071992547409.93', otherAllowance: '000.1' })])[0]
  assert.equal(result.basicSalary, '9999999999999999.99')
  assert.equal(result.housingAllowance, '90071992547409.93')
  assert.equal(result.otherAllowance, '0.10')
  assert.equal(result.phoneAllowance, '300.00')
})
test('المبالغ ترفض النقص والصيغ العددية السالبة والعلمية والتقريب', () => {
  for (const value of [null, undefined, 12, NaN, Infinity, '', ' ', '-1', '1e2', '1.001', '10000000000000000.00', '1,000.00', '+1', '.5', '1.']) assert.throws(() => money(value), bad())
})
test('قراءة المصدر الحالي وحدها تحتفظ بالمبلغ السالب دون إجازته كتاريخ أجر', () => {
  assert.equal(money('-90071992547409.93', true), '-90071992547409.93')
  assert.equal(money('-0.00', true), '0.00')
  assert.throws(() => normalize([segment({ basicSalary: '-1.00' })]), bad('SALARY_HISTORY_AMOUNT_INVALID'))
})
test('التقويم يقبل الحدين والسنة الكبيسة ويرفض التواريخ الوهمية', () => {
  for (const value of ['0001-01-01', '9999-12-31', '2000-02-29', '2028-02-29']) assert.equal(date(value), value)
  for (const value of ['0000-01-01', '1900-02-29', '2026-02-29', '2026-04-31', '2026-13-01', '2026-01-00', '2026-1-01', '10000-01-01', null]) assert.throws(() => date(value), bad('SALARY_HISTORY_DATE_INVALID'))
})
test('الفترات ترتب زمنيًا وتحتفظ بالفجوات والتواريخ الأصلية', () => {
  const result = normalize([segment({ effectiveFrom: '2026-04-01', basicSalary: '9000' }), segment({ effectiveTo: '2026-02-15' })])
  assert.deepEqual(result.map(row => [row.effectiveFrom, row.effectiveTo]), [['2026-01-01', '2026-02-15'], ['2026-04-01', null]])
  assert.equal(result[1].basicSalary, '9000.00')
})
test('التجاور دون تداخل يقبل وحدوده شاملة لليوم', () => {
  assert.equal(normalize([segment({ effectiveTo: '2026-01-15' }), segment({ effectiveFrom: '2026-01-16' })]).length, 2)
  for (const effectiveFrom of ['2026-01-01', '2026-01-14', '2026-01-15']) assert.throws(() => normalize([segment({ effectiveTo: '2026-01-15' }), segment({ effectiveFrom })]), bad('SALARY_HISTORY_OVERLAP'))
})
test('الفترة المفتوحة يجب أن تكون الأخيرة ولا يركب النظام نهاية تلقائية', () => {
  assert.throws(() => normalize([segment(), segment({ effectiveFrom: '2027-01-01' })]), bad('SALARY_HISTORY_OVERLAP'))
  const missing = segment(); delete missing.effectiveTo
  assert.throws(() => normalize([missing]), bad('SALARY_HISTORY_SHAPE_INVALID'))
})
test('كل فترة تحمل ست قيم صريحة وعملة محددة ولا تقبل حقولًا محقونة', () => {
  // المكونات الست إلزامية؛ بدل ضغط العمل (ترحيل 071) اختياري — غيابه = صفر، والمدخل القديم بالست بس يفضل مقبول
  for (const key of keys.filter(key => key !== 'workPressureAllowance')) { const row = segment(); delete row[key]; assert.throws(() => normalize([row]), bad('SALARY_HISTORY_SHAPE_INVALID')) }
  const legacy = segment(); delete legacy.workPressureAllowance
  assert.equal(normalize([legacy])[0].workPressureAllowance, '0.00')
  assert.throws(() => normalize([segment({ workPressureAllowance: '-1.00' })]), bad('SALARY_HISTORY_AMOUNT_INVALID'))
  assert.throws(() => normalize([segment({ currency: 'USD' })]), bad('SALARY_HISTORY_CURRENCY_INVALID'))
  assert.throws(() => normalize([segment({ sourceRef: 'forged' })]), bad('SALARY_HISTORY_SHAPE_INVALID'))
})
test('الحد الأقصى للفترات والحدود المقلوبة يرفضان قبل القراءة', () => {
  for (const rows of [null, [], Array.from({ length: 121 }, () => segment())]) assert.throws(() => normalize(rows), bad('SALARY_HISTORY_SEGMENT_LIMIT'))
  assert.throws(() => normalize([segment({ effectiveTo: '2025-12-31' })]), bad('SALARY_HISTORY_RANGE_INVALID'))
})
test('تطبيع الفترات مستقل عن مراجع المدخلات ولا يمحو الصفر الصريح', () => {
  const input = [segment({ basicSalary: '0' })], output = normalize(input)
  input[0].basicSalary = '9000.00'
  assert.equal(output[0].basicSalary, '0.00')
})
test('سبب الإثبات ومرجع المستند مطلوبان بعد حذف المسافات', () => {
  assert.equal(text(' عقد رقم 3 ', 200, 'المرجع'), 'عقد رقم 3')
  for (const value of ['', '  ', null, 3, 'x'.repeat(201)]) assert.throws(() => text(value, 200, 'المرجع'), bad('SALARY_HISTORY_EVIDENCE_REQUIRED'))
})
test('بصمة المصدر الحالي تتغير عند تغيير أي مكون أو العملة وتميز null عن الصفر', () => {
  const source = current(), original = currentHash(source)
  for (const key of keys) assert.notEqual(currentHash({ ...source, [key]: '0.01' }), original)
  assert.notEqual(currentHash({ ...source, currency: 'SAR' }), original)
  assert.notEqual(currentHash({ ...source, phoneAllowance: null }), currentHash({ ...source, phoneAllowance: '0.00' }))
  assert.equal(currentHash({ ...source, basicSalary: '06000' }), original)
})
test('بصمة المصدر الحالي ترفض الحقول المفقودة دون اختراع أجر أو عملة', () => {
  const source = current(); delete source.phoneAllowance
  assert.throws(() => currentHash(source), bad('SALARY_HISTORY_SHAPE_INVALID'))
  assert.throws(() => currentHash({ ...current(), currency: undefined }), bad('SALARY_HISTORY_CURRENT_INVALID'))
})
test('بصمة المراجعة تثبت الموظف والمراجعة والمرجع والأجر والمصدر', () => {
  const base = { employeeId: 3, revision: 1, reason: 'إثبات', evidenceReference: 'عقد 3', currentSourceHash: currentHash(current()), segments: normalize([segment()]) }, original = historyHash(base)
  for (const patch of [{ employeeId: 4 }, { revision: 2 }, { reason: 'تصحيح' }, { evidenceReference: 'عقد 4' }, { currentSourceHash: '0'.repeat(64) }, { segments: normalize([segment({ basicSalary: '9000.00' })]) }]) assert.notEqual(historyHash({ ...base, ...patch }), original)
})
test('غياب التاريخ يرجع مراجعة صفر دون قراءة أو استنتاج أجزاء قديمة', async () => {
  const em = manager(null, [])
  assert.deepEqual(await read(em, 3), { revision: 0, version: null, segments: [] })
  assert.equal(em.calls.length, 1)
})
test('القارئ يرجع المراجعة الأخيرة بعد إثبات البصمة والمبالغ بالنصوص', async () => {
  const { header, stored } = fixture(), em = manager(header, stored), result = await read(em, 3)
  assert.equal(result.version.id, 7)
  assert.equal(result.version.createdAt, '2026-09-13T12:00:00.000Z')
  assert.equal(result.segments[0].basicSalary, '6000.00')
  assert.match(em.calls[1].sql, /CAST\(\[basicSalary\] AS nvarchar\(80\)\)/)
  assert.deepEqual(em.calls[1].parameters, [7])
})
test('القارئ يرفض تغيير مبالغ أو مرجع المراجعة المخزنة دون بصمتها', async () => {
  for (const change of ['amount', 'reason', 'reference', 'source']) {
    const { header, stored } = fixture()
    if (change === 'amount') stored[0].basicSalary = '6001.00'
    if (change === 'reason') header.reason = 'سبب آخر'
    if (change === 'reference') header.evidenceReference = 'مستند آخر'
    if (change === 'source') header.currentSourceHash = '0'.repeat(64)
    await assert.rejects(read(manager(header, stored), 3), corrupted)
  }
})
test('القارئ يرفض نقص البيانات وتسلسل الصفوف والتاريخ غير الصالح', async () => {
  for (const change of ['empty', 'sequence', 'money', 'createdAt', 'hash', 'actor']) {
    const { header, stored } = fixture()
    if (change === 'empty') stored.length = 0
    if (change === 'sequence') stored[0].sequence = 2
    if (change === 'money') stored[0].basicSalary = null
    if (change === 'createdAt') header.createdAt = 'bad'
    if (change === 'hash') header.contentHash = 'x'.repeat(64)
    if (change === 'actor') header.createdBy = 0
    await assert.rejects(read(manager(header, stored), 3), corrupted)
  }
})
test('القارئ يرفض تجاوز الحد حتى لو كانت المراجعة في قاعدة البيانات', async () => {
  const { header, stored } = fixture()
  const rows = Array.from({ length: 121 }, (_, i) => ({ ...stored[0], sequence: i + 1 }))
  await assert.rejects(read(manager(header, rows), 3), corrupted)
})
test('القراءات المالية ترفض غياب المعاملة أو معرّف موظف غير صالح', async () => {
  await assert.rejects(read({ queryRunner: { isTransactionActive: false } }, 3), /معاملة نشطة/)
  await assert.rejects(readCurrent({}, 3), /معاملة نشطة/)
  for (const value of [0, -1, '3', 2147483648, 1.5]) await assert.rejects(read(manager(null, []), value), bad('SALARY_HISTORY_EMPLOYEE_INVALID'))
})
test('قراءة الأجر الحالي تحتفظ بالقيم الفارغة والفرع غير المسند ولا تملأهما', async () => {
  const source = { id: 3, employeeCode: 'TEST003', fullName: 'موظف اختبار', branchId: null, ...current(), phoneAllowance: null, workNatureAllowance: '-1.00' }
  const em = { queryRunner: { isTransactionActive: true }, query: async (sql, parameters) => { assert.match(sql, /^SELECT /); assert.deepEqual(parameters, [3]); return [source] } }
  const result = await readCurrent(em, 3)
  assert.equal(result.employee.branchId, null)
  assert.equal(result.current.phoneAllowance, null)
  assert.equal(result.current.workNatureAllowance, '-1.00')
  assert.equal(result.currentSourceHash.length, 64)
})
test('قراءة الموظف الغائب ترجع null ولا تنشئ أجرًا افتتاحيًا', async () => {
  assert.equal(await readCurrent({ queryRunner: { isTransactionActive: true }, query: async () => [] }, 3), null)
})
test('تعرف نقص المخطط محدود لأخطاء الأعمدة والجداول المعروفة', () => {
  for (const error of [{ number: 207 }, { driverError: { number: 208 } }, { originalError: { info: { number: 208 } } }, { driverError: { originalError: { info: { number: 207 } } } }]) assert.equal(schemaMissing(error), true)
  for (const error of [new Error('connection lost'), { number: 1205 }, { number: '208' }, null]) assert.equal(schemaMissing(error), false)
})
