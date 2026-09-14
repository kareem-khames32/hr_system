const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { planEmployeeSalaryChange: plan, applyEmployeeSalaryChange: apply, assertSalaryChangePeriodOpen: periodOpen } = require('../src/payroll/payroll-salary-change')
const { SALARY_HISTORY_MONEY_KEYS: keys, salaryCurrentSourceHash: currentHash, salaryHistoryContentHash: historyHash, normalizeSalaryHistorySegments: normalize, appendSalaryHistoryRevision: append } = require('../src/payroll/payroll-salary-history')
const { employeeChangeType, FINANCIAL_CHANGE_FIELDS } = require('../src/employees/employee-change-log')
const money = { currency: 'EGP', ...Object.fromEntries(keys.map((key, index) => [key, index ? '0.00' : '6000.00'])) }
const row = (extra = {}) => ({ effectiveFrom: '2026-01-01', effectiveTo: null, ...money, ...extra })
const planning = (extra = {}) => ({ previous: [], current: { ...money }, salary: { ...money, basicSalary: '9000.00' }, effectiveDate: '2026-09-01', today: '2026-09-13', ...extra })
const code = wanted => error => error.getResponse?.()?.code === wanted

function database({ prior = null, salary = money, blockedRun = false, blockedSettlement = false } = {}) {
  const employee = { id: 3, employeeCode: 'SAL003', fullName: 'اختبار تغيير الأجر', branchId: 1, bankName: 'بنك محفوظ', ...salary }
  const headers = [], children = new Map(), calls = [], audits = []
  const addHeader = (segments, values = {}) => {
    const header = { id: headers.length + 1, employeeId: 3, revision: headers.length + 1, reason: 'إثبات سابق', evidenceReference: 'عقد سابق', currentSourceHash: currentHash(salary), createdBy: 8, createdAt: new Date('2026-09-01T12:00:00Z'), ...values }
    const normalized = normalize(segments)
    header.contentHash = historyHash({ employeeId: header.employeeId, revision: header.revision, reason: header.reason, evidenceReference: header.evidenceReference, currentSourceHash: header.currentSourceHash, segments: normalized })
    headers.push(header); children.set(header.id, normalized.map((value, index) => ({ sequence: index + 1, ...value })))
    return header
  }
  if (prior) addHeader(prior)
  const em = { queryRunner: { isTransactionActive: true }, getRepository: () => ({ save: async value => { audits.push(value); return { ...value, id: audits.length } } }), query: async (sql, parameters = []) => {
    calls.push({ sql, parameters })
    if (sql.startsWith('DECLARE ')) return [{ lockResult: 0 }]
    if (sql.startsWith('SELECT ') && sql.includes('FROM dbo.employees')) return [{ id: employee.id, employeeCode: employee.employeeCode, fullName: employee.fullName, branchId: employee.branchId, ...Object.fromEntries([...keys, 'currency'].map(key => [key, employee[key]])) }]
    if (sql.startsWith('SELECT ') && sql.includes('FROM dbo.employee_salary_history_versions')) return headers.length ? [{ ...headers.at(-1) }] : []
    if (sql.startsWith('SELECT ') && sql.includes('FROM dbo.employee_salary_history')) return (children.get(parameters[0]) || []).map(value => ({ ...value }))
    if (sql.startsWith('SELECT ') && sql.includes('FROM dbo.payroll_runs')) return blockedRun ? [{ id: 15 }] : []
    if (sql.startsWith('SELECT ') && sql.includes('FROM dbo.offboarding_cases')) return blockedSettlement ? [{ id: 25 }] : []
    if (sql.startsWith('UPDATE dbo.employees ')) { for (const [index, key] of keys.entries()) employee[key] = parameters[index + 1]; employee.currency = parameters[7]; return [] }
    if (sql.startsWith('INSERT INTO dbo.employee_salary_history_versions')) {
      const [employeeId, revision, reason, evidenceReference, currentSourceHash, contentHash, createdBy] = parameters
      const header = { id: headers.length + 1, employeeId, revision, reason, evidenceReference, currentSourceHash, contentHash, createdBy, createdAt: new Date('2026-09-13T12:00:00Z') }
      headers.push(header); children.set(header.id, []); return [{ id: header.id }]
    }
    if (sql.startsWith('INSERT INTO dbo.employee_salary_history ')) {
      for (let offset = 0; offset < parameters.length; offset += 11) {
        const [versionId, sequence, effectiveFrom, effectiveTo, currency, ...values] = parameters.slice(offset, offset + 11)
        children.get(versionId).push({ sequence, effectiveFrom, effectiveTo, currency, ...Object.fromEntries(keys.map((key, index) => [key, values[index]])) })
      }
      return []
    }
    throw new Error('Unexpected SQL ' + sql)
  } }
  const input = extra => ({ employeeId: 3, actorUserId: 4, effectiveDate: '2026-09-01', reason: 'زيادة موثقة', evidenceReference: 'قرار 33', expectedRevision: headers.length, expectedCurrentSourceHash: currentHash(Object.fromEntries([...keys, 'currency'].map(key => [key, employee[key]]))), salary: { ...money, basicSalary: '9000.00' }, ...extra })
  return { employee, headers, children, calls, audits, em, input }
}
const writes = db => db.calls.filter(call => /^(INSERT|UPDATE|DELETE)\b/.test(call.sql))

test('تغيير أول أجر يبدأ بالتاريخ المختار فقط دون اختراع تاريخ قبل التغيير', () => {
  const result = plan(planning())
  assert.deepEqual(result.segments.map(value => [value.effectiveFrom, value.effectiveTo]), [['2026-09-01', null]])
  assert.equal(result.current.basicSalary, '9000.00'); assert.equal(result.timelineChanged, true)
})
test('البداية السابقة الاختيارية تثبت القيم الحالية الدقيقة دون إعادة إدخالها', () => {
  const result = plan(planning({ previousEffectiveFrom: '2026-01-01', current: { ...money, basicSalary: '90071992547409.93' } }))
  assert.deepEqual(result.segments.map(value => [value.effectiveFrom, value.effectiveTo, value.basicSalary]), [['2026-01-01', '2026-08-31', '90071992547409.93'], ['2026-09-01', null, '9000.00']])
})
test('البداية السابقة لا تقبل تاريخًا مساوياً أو لاحقًا أو تاريخًا فوق سجل موثق', () => {
  for (const previousEffectiveFrom of ['2026-09-01', '2026-09-02']) assert.throws(() => plan(planning({ previousEffectiveFrom })), code('SALARY_CHANGE_PREVIOUS_RANGE_INVALID'))
  assert.throws(() => plan(planning({ previous: [row()], previousEffectiveFrom: '2025-01-01' })), code('SALARY_CHANGE_PREVIOUS_ALREADY_DOCUMENTED'))
})
test('الأجر السابق الناقص أو السلبي أو العملة المفقودة لا يتحول إلى رصيد افتتاحي', () => {
  for (const current of [{ ...money, phoneAllowance: null }, { ...money, currency: null }, { ...money, basicSalary: '-1.00' }]) assert.throws(() => plan(planning({ previousEffectiveFrom: '2026-01-01', current })), code('SALARY_CHANGE_PREVIOUS_SALARY_INCOMPLETE'))
})
test('التغيير يقسم الفترة السابقة ويحافظ على القرارات التالية حتى المستقبل', () => {
  const previous = [row({ effectiveTo: '2026-09-30' }), row({ effectiveFrom: '2026-10-01', basicSalary: '12000.00' })]
  const result = plan(planning({ previous }))
  assert.deepEqual(result.segments.map(value => [value.effectiveFrom, value.effectiveTo, value.basicSalary]), [['2026-01-01', '2026-08-31', '6000.00'], ['2026-09-01', '2026-09-30', '9000.00'], ['2026-10-01', null, '12000.00']])
  assert.equal(result.effectiveTo, '2026-09-30'); assert.equal(result.current.basicSalary, '9000.00')
})
test('تغيير فترة قديمة يحفظ أجر اليوم من الفترة التالية الموثقة', () => {
  const previous = [row({ effectiveTo: '2026-08-31' }), row({ effectiveFrom: '2026-09-01', basicSalary: '10000.00' })]
  const result = plan(planning({ previous, effectiveDate: '2026-06-01', current: { ...money, basicSalary: '10000.00' } }))
  assert.equal(result.segments[1].basicSalary, '9000.00'); assert.equal(result.current.basicSalary, '10000.00'); assert.equal(result.currentChanged, false)
  assert.equal(result.effectiveTo, '2026-08-31')
})
test('الكتابة بتاريخ بداية موجودة تستبدل هذه الفترة ولا تحذف التي قبلها أو بعدها', () => {
  const previous = [row({ effectiveTo: '2026-08-31' }), row({ effectiveFrom: '2026-09-01', effectiveTo: '2026-09-30', basicSalary: '7000.00' }), row({ effectiveFrom: '2026-10-01', basicSalary: '11000.00' })]
  const result = plan(planning({ previous }))
  assert.equal(result.segments.length, 3); assert.equal(result.segments[0].basicSalary, '6000.00'); assert.equal(result.segments[1].basicSalary, '9000.00'); assert.equal(result.segments[2].basicSalary, '11000.00')
})
test('الفجوات السابقة لا تُملأ تلقائياً لكن تاريخ التغيير ينشئ الفترة المحددة', () => {
  const previous = [row({ effectiveTo: '2026-01-31' }), row({ effectiveFrom: '2026-10-01', basicSalary: '11000.00' })]
  const result = plan(planning({ previous }))
  assert.equal(result.segments[0].effectiveTo, '2026-01-31'); assert.equal(result.segments[1].effectiveFrom, '2026-09-01')
})
test('فجوة أجر اليوم لا تستبدل براتب مدخل يخص فترة سابقة', () => {
  const previous = [row({ effectiveTo: '2026-06-30' }), row({ effectiveFrom: '2026-07-01', effectiveTo: '2026-07-31' })]
  assert.throws(() => plan(planning({ previous, effectiveDate: '2026-06-15' })), code('SALARY_CHANGE_CURRENT_COVERAGE_MISSING'))
})
test('التاريخ المستقبلي مرفوض في المسار المباشر ولا يطبّق قبل يومه', () => {
  assert.throws(() => plan(planning({ effectiveDate: '2026-09-14' })), code('SALARY_CHANGE_FUTURE_REQUIRES_REQUEST'))
})
test('العملة وحدها تغيير مالي بينما التكرار المطابق لا يغير الخطة', () => {
  const currency = plan(planning({ salary: { ...money, currency: 'SAR' } }))
  assert.equal(currency.currentChanged, true)
  const same = plan(planning({ previous: [row({ effectiveFrom: '2026-09-01' })], salary: { ...money } }))
  assert.equal(same.timelineChanged, false); assert.equal(same.currentChanged, false)
  assert.equal(employeeChangeType('currency'), 'SALARY'); assert.equal(FINANCIAL_CHANGE_FIELDS.test('currency'), true)
})
test('خطة السريان تتحقق من التواريخ وحدود المبالغ ولا تعدل مدخلاتها', () => {
  const original = planning({ previous: [row()] }), json = JSON.stringify(original)
  plan(original); assert.equal(JSON.stringify(original), json)
  assert.throws(() => plan(planning({ effectiveDate: '2026-02-30' })), code('SALARY_HISTORY_DATE_INVALID'))
  assert.throws(() => plan(planning({ salary: { ...money, basicSalary: '1.001' } })), code('SALARY_HISTORY_AMOUNT_INVALID'))
})
test('الحارس يفحص المسير المعتمد أو المصروف بأيام التغيير والعضوية دون أي كتابة', async () => {
  const db = database({ blockedRun: true })
  await assert.rejects(periodOpen(db.em, 3, '2026-09-01', '2026-09-30'), code('SALARY_CHANGE_CLOSED_PERIOD'))
  const check = db.calls[0]
  assert.deepEqual(check.parameters, ['2026-09-30', '2026-09-01', 3])
  assert.match(check.sql, /'APPROVED','PAID'/); assert.match(check.sql, /payroll_run_members/); assert.match(check.sql, /membershipStatus.*INCLUDED/)
  assert.equal(writes(db).length, 0)
})
test('تصفية الخدمة المعتمدة أو المغلقة تمنع التغيير الرجعي دون فروقات تلقائية', async () => {
  const db = database({ blockedSettlement: true })
  await assert.rejects(periodOpen(db.em, 3, '2026-09-01', '2026-09-30'), code('SALARY_CHANGE_CLOSED_PERIOD'))
  assert.equal(db.calls.length, 2); assert.match(db.calls[1].sql, /'SETTLED','CLOSED'/); assert.equal(writes(db).length, 0)
})
test('الكاتب يحفظ قيمًا دقيقة ومراجعة جديدة وتدقيقًا واحدًا لكل حقل متغير فقط', async () => {
  const db = database(), input = db.input({ requestId: 55, salary: { ...money, basicSalary: '90071992547409.93', phoneAllowance: '0.29', currency: 'SAR' } })
  const result = await apply(db.em, input)
  assert.equal(result.changed, true); assert.equal(result.applied, true); assert.equal(result.history.revision, 1)
  assert.equal(result.current.basicSalary, '90071992547409.93'); assert.equal(result.current.phoneAllowance, '0.29'); assert.equal(db.employee.bankName, 'بنك محفوظ')
  assert.deepEqual(db.audits.map(value => value.fieldName).sort(), ['basicSalary', 'currency', 'phoneAllowance'])
  assert.equal(db.audits.find(value => value.fieldName === 'basicSalary').newValue, '90071992547409.93')
  for (const audit of db.audits) { assert.equal(audit.requestId, 55); assert.equal(audit.changedByUserId, 4); assert.match(audit.reason, /2026-09-01/) }
  assert.equal(result.history.version.currentSourceHash, currentHash(result.current))
  const update = writes(db).find(value => value.sql.startsWith('UPDATE'))
  assert.match(update.sql, /CAST\(@1 AS decimal\(18,2\)\)/); assert.doesNotMatch(update.sql, /bankName|fullName|branchId/)
  assert.equal(db.calls[0].sql.startsWith('DECLARE '), true)
})
test('المراجعة القديمة وصفوفها تبقى بعد إضافة تغيير الأجر', async () => {
  const db = database({ prior: [row()] }), before = JSON.stringify([db.headers[0], db.children.get(1)])
  const result = await apply(db.em, db.input())
  assert.equal(result.history.revision, 2); assert.equal(JSON.stringify([db.headers[0], db.children.get(1)]), before)
})
test('المراجعة المتقادمة أو تغير الأجر الحالي يرفضان قبل أي حفظ', async () => {
  const staleRevision = database({ prior: [row()] })
  await assert.rejects(apply(staleRevision.em, staleRevision.input({ expectedRevision: 0 })), code('SALARY_HISTORY_REVISION_CONFLICT'))
  const staleCurrent = database()
  await assert.rejects(apply(staleCurrent.em, staleCurrent.input({ expectedCurrentSourceHash: '0'.repeat(64) })), code('SALARY_HISTORY_CURRENT_SOURCE_CHANGED'))
  assert.equal(writes(staleRevision).length, 0); assert.equal(writes(staleCurrent).length, 0)
})
test('تغير الأجر خارج السجل يمنع الإلحاق حتى لو فتح المستخدم النموذج من جديد', async () => {
  const db = database({ prior: [row()] }); db.employee.basicSalary = '6100.00'
  await assert.rejects(apply(db.em, db.input()), code('SALARY_CHANGE_HISTORY_SOURCE_CHANGED'))
  assert.equal(writes(db).length, 0)
})
test('رفض الفترة المغلقة يحفظ الموظف والتاريخ والتدقيق دون تغيير', async () => {
  const db = database({ blockedRun: true }), before = JSON.stringify(db.employee)
  await assert.rejects(apply(db.em, db.input()), code('SALARY_CHANGE_CLOSED_PERIOD'))
  assert.equal(JSON.stringify(db.employee), before); assert.equal(db.headers.length, 0); assert.equal(db.audits.length, 0); assert.equal(writes(db).length, 0)
})
test('الكاتب يرفض غياب المعاملة والهوية المالية غير الصالحة قبل SQL', async () => {
  const db = database()
  await assert.rejects(apply({}, db.input()), /معاملة نشطة/)
  await assert.rejects(append({}, { employeeId: 3 }), /معاملة نشطة/)
  for (const patch of [{ actorUserId: undefined }, { actorUserId: 0 }, { requestId: -1 }, { expectedRevision: '0' }, { expectedCurrentSourceHash: '' }]) await assert.rejects(apply(db.em, db.input(patch)))
  assert.equal(db.calls.length, 0)
})
test('إعادة نفس التغيير المطابق لا تضيف مراجعة أو تدقيقًا أو كتابة', async () => {
  const db = database({ prior: [row({ effectiveFrom: '2026-09-01' })] }), result = await apply(db.em, db.input({ salary: { ...money } }))
  assert.equal(result.changed, false); assert.equal(result.history.revision, 1); assert.equal(writes(db).length, 0); assert.equal(db.audits.length, 0)
})
