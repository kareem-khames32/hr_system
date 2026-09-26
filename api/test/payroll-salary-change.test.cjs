const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
// قاعدة المالك (14 سبتمبر): تغيير الراتب يسري من راتب شهر كامل؛ هذه الحالات هي حالات السريان اليومي نفسها بصيغة الشهر.
const { planEmployeeSalaryChange: plan, applyEmployeeSalaryChange: apply, assertSalaryChangePeriodOpen: periodOpen,
  assertMonthlySalaryHistoryKeepsClosedPeriods: keepsClosed } = require('../src/payroll/payroll-salary-change')
const { SALARY_HISTORY_MONEY_KEYS: keys, salaryCurrentSourceHash: currentHash, salaryHistoryContentHash: historyHash, monthlySalaryHistoryContentHash: monthlyHash,
  normalizeSalaryHistorySegments: normalizeDaily, appendSalaryHistoryRevision: append } = require('../src/payroll/payroll-salary-history')
const { normalizeMonthlySalaryPeriods: normalizeMonthly, PAYROLL_MONTHLY_SALARY_HISTORY_VERSION: MONTHLY } = require('../src/payroll/payroll-period-salary')
const { employeeChangeType, FINANCIAL_CHANGE_FIELDS } = require('../src/employees/employee-change-log')
const money = { currency: 'EGP', ...Object.fromEntries(keys.map((key, index) => [key, index ? '0.00' : '6000.00'])) }
const row = (extra = {}) => ({ effectivePayrollPeriod: '2026-01', effectiveToPayrollPeriod: null, ...money, ...extra })
const monthlyHistory = (periods, cycle = 23) => ({ revision: 1, version: { id: 1, revision: 1, contractVersion: MONTHLY, cycleStartDay: cycle }, segments: normalizeMonthly(periods, cycle) })
const planning = (extra = {}) => ({ history: { version: null, segments: [] }, current: { ...money }, salary: { ...money, basicSalary: '9000.00' },
  effectivePayrollPeriod: '2026-09', currentPayrollPeriod: '2026-09', cycleStartDay: 23, ...extra })
const code = wanted => error => error.getResponse?.()?.code === wanted
const spans = result => result.periods.map(value => [value.effectivePayrollPeriod, value.effectiveToPayrollPeriod, value.basicSalary])

function database({ prior = null, daily = false, salary = money, blockedRun = false, blockedSettlement = false, closedRuns = [] } = {}) {
  const employee = { id: 3, employeeCode: 'SAL003', fullName: 'اختبار تغيير الأجر', branchId: 1, bankName: 'بنك محفوظ', ...salary }
  const headers = [], children = new Map(), calls = [], audits = []
  const addHeader = segments => {
    const base = { id: headers.length + 1, employeeId: 3, revision: headers.length + 1, reason: 'إثبات سابق', evidenceReference: 'عقد سابق', currentSourceHash: currentHash(salary), createdBy: 8 }
    if (daily) {
      const normalized = normalizeDaily(segments)
      const header = { ...base, createdAt: new Date('2026-09-01T12:00:00Z'), contractVersion: null, cycleStartDay: null }
      header.contentHash = historyHash({ ...base, segments: normalized })
      headers.push(header); children.set(header.id, normalized.map((value, index) => ({ sequence: index + 1, effectivePayrollPeriod: null, effectiveToPayrollPeriod: null, ...value })))
      return header
    }
    const normalized = normalizeMonthly(segments, 23), createdAt = '2026-09-01T12:00:00.000Z'
    const header = { ...base, createdAt: new Date(createdAt), createdAtUtc: createdAt.slice(0, -1), contractVersion: MONTHLY, cycleStartDay: 23 }
    // بصمة V2 تشمل كل حقول مدخلها؛ معرّف الصف ليس منها.
    const { id: _id, ...hashBase } = base
    header.contentHash = monthlyHash({ ...hashBase, cycleStartDay: 23, segments: normalized, createdAt })
    headers.push(header); children.set(header.id, normalized.map((value, index) => ({ sequence: index + 1, ...value })))
    return header
  }
  if (prior) addHeader(prior)
  const em = { queryRunner: { isTransactionActive: true }, getRepository: () => ({ save: async value => { audits.push(value); return { ...value, id: audits.length } } }), query: async (sql, parameters = []) => {
    calls.push({ sql, parameters })
    if (sql.startsWith('DECLARE ')) return [{ lockResult: 0 }]
    if (sql.includes('FROM dbo.requests_config')) return [{ value: '23' }]
    if (sql.startsWith('SELECT ') && sql.includes('FROM dbo.employees')) return [{ id: employee.id, employeeCode: employee.employeeCode, fullName: employee.fullName, branchId: employee.branchId, ...Object.fromEntries([...keys, 'currency'].map(key => [key, employee[key]])) }]
    if (sql.startsWith('SELECT ') && sql.includes('FROM dbo.employee_salary_history_versions')) return headers.length ? [{ ...headers.at(-1) }] : []
    if (sql.startsWith('SELECT ') && sql.includes('FROM dbo.employee_salary_history')) return (children.get(parameters[0]) || []).map(value => ({ ...value }))
    if (sql.startsWith('SELECT r.[id], r.[period], m.[snapshot]')) return closedRuns.map(value => ({ ...value }))
    if (sql.startsWith('SELECT ') && sql.includes('FROM dbo.payroll_runs')) return blockedRun ? [{ id: 15 }] : []
    if (sql.startsWith('SELECT ') && sql.includes('FROM dbo.offboarding_cases')) return blockedSettlement ? [{ id: 25 }] : []
    if (sql.startsWith('UPDATE dbo.employees ')) { for (const [index, key] of keys.entries()) employee[key] = parameters[index + 1]; employee.currency = parameters[keys.length + 1]; return [] }
    if (sql.startsWith('INSERT INTO dbo.employee_salary_history_versions')) {
      const [employeeId, revision, reason, evidenceReference, currentSourceHash, contentHash, createdBy, contractVersion, cycleStartDay, createdAt] = parameters
      const header = { id: headers.length + 1, employeeId, revision, reason, evidenceReference, currentSourceHash, contentHash, createdBy, contractVersion, cycleStartDay,
        createdAt: new Date(createdAt), createdAtUtc: createdAt.slice(0, -1) }
      headers.push(header); children.set(header.id, []); return [{ id: header.id }]
    }
    if (sql.startsWith('INSERT INTO dbo.employee_salary_history ')) {
      for (let offset = 0, width = 7 + keys.length; offset < parameters.length; offset += width) {
        const [versionId, sequence, effectiveFrom, effectiveTo, currency, effectivePayrollPeriod, effectiveToPayrollPeriod, ...values] = parameters.slice(offset, offset + width)
        children.get(versionId).push({ sequence, effectiveFrom, effectiveTo, effectivePayrollPeriod, effectiveToPayrollPeriod, currency, ...Object.fromEntries(keys.map((key, index) => [key, values[index]])) })
      }
      return []
    }
    throw new Error('Unexpected SQL ' + sql)
  } }
  const input = extra => ({ employeeId: 3, actorUserId: 4, effectivePayrollPeriod: '2026-09', reason: 'زيادة موثقة', evidenceReference: 'قرار 33', expectedRevision: headers.length, expectedCurrentSourceHash: currentHash(Object.fromEntries([...keys, 'currency'].map(key => [key, employee[key]]))), salary: { ...money, basicSalary: '9000.00' }, ...extra })
  return { employee, headers, children, calls, audits, em, input }
}
const writes = db => db.calls.filter(call => /^(INSERT|UPDATE|DELETE)\b/.test(call.sql))

test('تغيير أول أجر يبدأ بالشهر المختار فقط دون اختراع شهور قبل التغيير', () => {
  const result = plan(planning())
  assert.deepEqual(result.periods.map(value => [value.effectivePayrollPeriod, value.effectiveToPayrollPeriod]), [['2026-09', null]])
  assert.equal(result.segments[0].effectiveFrom, '2026-08-23', 'راتب سبتمبر يغطي 23 أغسطس → 22 سبتمبر كاملًا')
  assert.equal(result.current.basicSalary, '9000.00'); assert.equal(result.timelineChanged, true)
})
test('الشهر السابق الاختياري يثبت القيم الحالية الدقيقة دون إعادة إدخالها', () => {
  const result = plan(planning({ previousEffectivePayrollPeriod: '2026-01', current: { ...money, basicSalary: '90071992547409.93' } }))
  assert.deepEqual(spans(result), [['2026-01', '2026-08', '90071992547409.93'], ['2026-09', null, '9000.00']])
})
test('الشهر السابق لا يقبل شهرًا مساويًا أو لاحقًا أو شهرًا فوق سجل موثق', () => {
  for (const previousEffectivePayrollPeriod of ['2026-09', '2026-10']) assert.throws(() => plan(planning({ previousEffectivePayrollPeriod })), code('SALARY_CHANGE_PREVIOUS_RANGE_INVALID'))
  assert.throws(() => plan(planning({ history: monthlyHistory([row()]), previousEffectivePayrollPeriod: '2025-01' })), code('SALARY_CHANGE_PREVIOUS_ALREADY_DOCUMENTED'))
})
test('الأجر السابق الناقص أو السلبي أو العملة المفقودة لا يتحول إلى رصيد افتتاحي', () => {
  for (const current of [{ ...money, phoneAllowance: null }, { ...money, currency: null }, { ...money, basicSalary: '-1.00' }]) assert.throws(() => plan(planning({ previousEffectivePayrollPeriod: '2026-01', current })), code('SALARY_CHANGE_PREVIOUS_SALARY_INCOMPLETE'))
})
test('التغيير يقسم الشهور السابقة ويحافظ على القرارات التالية حتى المستقبل', () => {
  const history = monthlyHistory([row({ effectiveToPayrollPeriod: '2026-09' }), row({ effectivePayrollPeriod: '2026-10', basicSalary: '12000.00' })])
  const result = plan(planning({ history }))
  assert.deepEqual(spans(result), [['2026-01', '2026-08', '6000.00'], ['2026-09', '2026-09', '9000.00'], ['2026-10', null, '12000.00']])
  assert.equal(result.effectiveToPayrollPeriod, '2026-09'); assert.equal(result.current.basicSalary, '9000.00')
})
test('تغيير شهر قديم يحفظ راتب الشهر الجاري من القرار التالي الموثق', () => {
  const history = monthlyHistory([row({ effectiveToPayrollPeriod: '2026-08' }), row({ effectivePayrollPeriod: '2026-09', basicSalary: '10000.00' })])
  const result = plan(planning({ history, effectivePayrollPeriod: '2026-06', current: { ...money, basicSalary: '10000.00' } }))
  assert.equal(result.periods[1].basicSalary, '9000.00'); assert.equal(result.current.basicSalary, '10000.00'); assert.equal(result.currentChanged, false)
  assert.equal(result.effectiveToPayrollPeriod, '2026-08')
})
test('الكتابة على شهر بداية موجود تستبدل هذا الشهر ولا تحذف ما قبله أو بعده', () => {
  const history = monthlyHistory([row({ effectiveToPayrollPeriod: '2026-08' }), row({ effectivePayrollPeriod: '2026-09', effectiveToPayrollPeriod: '2026-09', basicSalary: '7000.00' }), row({ effectivePayrollPeriod: '2026-10', basicSalary: '11000.00' })])
  const result = plan(planning({ history }))
  assert.equal(result.periods.length, 3); assert.deepEqual(result.periods.map(value => value.basicSalary), ['6000.00', '9000.00', '11000.00'])
})
test('الفجوات السابقة لا تُملأ تلقائياً لكن شهر التغيير ينشئ الشهور المحددة', () => {
  const history = monthlyHistory([row({ effectiveToPayrollPeriod: '2026-01' }), row({ effectivePayrollPeriod: '2026-10', basicSalary: '11000.00' })])
  const result = plan(planning({ history }))
  assert.deepEqual(spans(result), [['2026-01', '2026-01', '6000.00'], ['2026-09', '2026-09', '9000.00'], ['2026-10', null, '11000.00']])
})
test('فجوة الشهر الجاري لا تستبدل براتب مدخل يخص شهرًا سابقًا', () => {
  const history = monthlyHistory([row({ effectiveToPayrollPeriod: '2026-06' }), row({ effectivePayrollPeriod: '2026-07', effectiveToPayrollPeriod: '2026-07' })])
  assert.throws(() => plan(planning({ history, effectivePayrollPeriod: '2026-06' })), code('SALARY_CHANGE_CURRENT_COVERAGE_MISSING'))
})
test('الشهر اللاحق مرفوض في المسار المباشر ولا يطبّق قبل بدايته', () => {
  assert.throws(() => plan(planning({ effectivePayrollPeriod: '2026-10' })), code('SALARY_CHANGE_FUTURE_REQUIRES_REQUEST'))
})
test('السجل اليومي القديم لا يُحوَّل إلى شهر مفترض عند التعديل', () => {
  const daily = { version: { id: 1, revision: 1, contractVersion: null, cycleStartDay: null }, segments: normalizeDaily([{ effectiveFrom: '2026-01-01', effectiveTo: null, ...money }]) }
  assert.throws(() => plan(planning({ history: daily })), code('SALARY_CHANGE_MONTHLY_HISTORY_REQUIRED'))
})
test('العملة وحدها تغيير مالي بينما التكرار المطابق لا يغير الخطة', () => {
  const currency = plan(planning({ salary: { ...money, currency: 'SAR' } }))
  assert.equal(currency.currentChanged, true)
  const same = plan(planning({ history: monthlyHistory([row({ effectivePayrollPeriod: '2026-09' })]), salary: { ...money } }))
  assert.equal(same.timelineChanged, false); assert.equal(same.currentChanged, false)
  assert.equal(employeeChangeType('currency'), 'SALARY'); assert.equal(FINANCIAL_CHANGE_FIELDS.test('currency'), true)
})
test('خطة السريان تتحقق من الشهور وحدود المبالغ ولا تعدل مدخلاتها', () => {
  const original = planning({ history: monthlyHistory([row()]) }), json = JSON.stringify(original)
  plan(original); assert.equal(JSON.stringify(original), json)
  for (const effectivePayrollPeriod of ['2026-13', '2026-9', '2026-09-01']) assert.throws(() => plan(planning({ effectivePayrollPeriod })), code('SALARY_CHANGE_PAYROLL_PERIOD_INVALID'))
  assert.throws(() => plan(planning({ salary: { ...money, basicSalary: '1.001' } })), code('SALARY_HISTORY_AMOUNT_INVALID'))
})
test('دورة 31: حدود فبراير ومارس المشتقة متجاورة بلا يوم مشترك', () => {
  const result = plan(planning({ history: monthlyHistory([row()], 31), effectivePayrollPeriod: '2026-03', currentPayrollPeriod: '2026-03', cycleStartDay: 31 }))
  assert.equal(result.segments[0].effectiveTo, '2026-02-28'); assert.equal(result.segments[1].effectiveFrom, '2026-03-01')
})
test('الحارس يفحص المسير المعتمد أو المصروف بشهور التغيير والعضوية دون أي كتابة', async () => {
  const db = database({ blockedRun: true })
  await assert.rejects(periodOpen(db.em, 3, '2026-09', '2026-09', 23), code('SALARY_CHANGE_CLOSED_PERIOD'))
  const check = db.calls[0]
  assert.deepEqual(check.parameters, ['2026-09', '2026-09', 3])
  assert.match(check.sql, /'APPROVED','PAID'/); assert.match(check.sql, /\[period\]>=@0/); assert.match(check.sql, /payroll_run_members/); assert.match(check.sql, /membershipStatus.*INCLUDED/)
  assert.equal(writes(db).length, 0)
  const open = database()
  await periodOpen(open.em, 3, '2026-09', null, 23)
  assert.deepEqual(open.calls[0].parameters, ['2026-09', null, 3])
})
test('تصفية الخدمة المعتمدة أو المغلقة تمنع التغيير الرجعي من بداية دورة الشهر دون فروقات تلقائية', async () => {
  const db = database({ blockedSettlement: true })
  await assert.rejects(periodOpen(db.em, 3, '2026-09', '2026-09', 23), code('SALARY_CHANGE_CLOSED_PERIOD'))
  assert.equal(db.calls.length, 2); assert.match(db.calls[1].sql, /'SETTLED','CLOSED'/); assert.deepEqual(db.calls[1].parameters, [3, '2026-08-23'])
  assert.equal(writes(db).length, 0)
})
test('الكاتب يحفظ قيمًا دقيقة ومراجعة شهرية جديدة وتدقيقًا واحدًا لكل حقل متغير فقط', async () => {
  const db = database(), input = db.input({ requestId: 55, salary: { ...money, basicSalary: '90071992547409.93', phoneAllowance: '0.29', currency: 'SAR' } })
  const result = await apply(db.em, input)
  assert.equal(result.changed, true); assert.equal(result.applied, true); assert.equal(result.history.revision, 1)
  assert.equal(result.history.version.contractVersion, MONTHLY); assert.equal(result.history.version.cycleStartDay, 23)
  assert.equal(result.history.segments[0].effectivePayrollPeriod, '2026-09'); assert.equal(result.history.segments[0].effectiveFrom, '2026-08-23')
  assert.equal(result.current.basicSalary, '90071992547409.93'); assert.equal(result.current.phoneAllowance, '0.29'); assert.equal(db.employee.bankName, 'بنك محفوظ')
  assert.deepEqual(db.audits.map(value => value.fieldName).sort(), ['basicSalary', 'currency', 'phoneAllowance'])
  assert.equal(db.audits.find(value => value.fieldName === 'basicSalary').newValue, '90071992547409.93')
  for (const audit of db.audits) { assert.equal(audit.requestId, 55); assert.equal(audit.changedByUserId, 4); assert.match(audit.reason, /يسري من راتب شهر 2026-09/) }
  assert.equal(result.history.version.currentSourceHash, currentHash(result.current))
  const update = writes(db).find(value => value.sql.startsWith('UPDATE'))
  assert.match(update.sql, /CAST\(@1 AS decimal\(18,2\)\)/); assert.doesNotMatch(update.sql, /bankName|fullName|branchId/)
  assert.equal(db.calls[0].sql.startsWith('DECLARE '), true)
})
test('المراجعة القديمة وصفوفها تبقى بعد إضافة تغيير الأجر', async () => {
  const db = database({ prior: [row()] }), before = JSON.stringify([db.headers[0], db.children.get(1)])
  const result = await apply(db.em, db.input())
  assert.equal(result.history.revision, 2); assert.equal(JSON.stringify([db.headers[0], db.children.get(1)]), before)
  assert.deepEqual(result.history.segments.map(value => [value.effectivePayrollPeriod, value.effectiveToPayrollPeriod, value.basicSalary]), [['2026-01', '2026-08', '6000.00'], ['2026-09', null, '9000.00']])
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
test('رفض الفترة المغلقة أو الشهر اللاحق أو السجل اليومي يحفظ الموظف والتاريخ والتدقيق دون تغيير', async () => {
  for (const [options, patch, wanted] of [[{ blockedRun: true }, {}, 'SALARY_CHANGE_CLOSED_PERIOD'], [{}, { effectivePayrollPeriod: '9999-01' }, 'SALARY_CHANGE_FUTURE_REQUIRES_REQUEST'],
    [{ prior: [{ effectiveFrom: '2026-01-01', effectiveTo: null, ...money }], daily: true }, {}, 'SALARY_CHANGE_MONTHLY_HISTORY_REQUIRED']]) {
    const db = database(options), before = JSON.stringify(db.employee), headers = db.headers.length
    await assert.rejects(apply(db.em, db.input(patch)), code(wanted))
    assert.equal(JSON.stringify(db.employee), before); assert.equal(db.headers.length, headers); assert.equal(db.audits.length, 0); assert.equal(writes(db).length, 0)
  }
})
test('الكاتب يرفض غياب المعاملة والهوية المالية والشهر غير الصالحين قبل SQL', async () => {
  const db = database()
  await assert.rejects(apply({}, db.input()), /معاملة نشطة/)
  await assert.rejects(append({}, { employeeId: 3 }), /معاملة نشطة/)
  for (const patch of [{ actorUserId: undefined }, { actorUserId: 0 }, { requestId: -1 }, { expectedRevision: '0' }, { expectedCurrentSourceHash: '' },
    { effectivePayrollPeriod: '2026-09-01' }, { effectivePayrollPeriod: undefined }, { previousEffectivePayrollPeriod: '2026-13' }]) await assert.rejects(apply(db.em, db.input(patch)))
  assert.equal(db.calls.length, 0)
})
test('إعادة نفس التغيير المطابق لا تضيف مراجعة أو تدقيقًا أو كتابة', async () => {
  const db = database({ prior: [row({ effectivePayrollPeriod: '2026-09' })] }), result = await apply(db.em, db.input({ salary: { ...money } }))
  assert.equal(result.changed, false); assert.equal(result.history.revision, 1); assert.equal(writes(db).length, 0); assert.equal(db.audits.length, 0)
})
test('سجل الأجر الشهري لا يغير راتب شهر دخل مسيرًا معتمدًا، ويقارن المسير بلا سجل شهري بمصدر لقطته', async () => {
  const previous = monthlyHistory([row({ effectiveToPayrollPeriod: '2026-08' }), row({ effectivePayrollPeriod: '2026-09', basicSalary: '10000.00' })])
  const closed = database({ closedRuns: [{ id: 15, period: '2026-08', snapshot: null }] })
  await keepsClosed(closed.em, 3, previous, normalizeMonthly([row({ effectiveToPayrollPeriod: '2026-08' }), row({ effectivePayrollPeriod: '2026-09', basicSalary: '11000.00' })], 23))
  await assert.rejects(keepsClosed(closed.em, 3, previous, normalizeMonthly([row({ basicSalary: '6500.00', effectiveToPayrollPeriod: '2026-08' }), row({ effectivePayrollPeriod: '2026-09', basicSalary: '10000.00' })], 23)), code('SALARY_HISTORY_CLOSED_PERIOD'))
  const snapshot = JSON.stringify({ salarySource: { kind: 'CURRENT_FILE_UNVERIFIED', amounts: { ...Object.fromEntries(keys.map(key => [key, money[key]])) } } })
  const legacy = database({ closedRuns: [{ id: 16, period: '2026-08', snapshot }, { id: 17, period: '2026-07', snapshot: null }] })
  await keepsClosed(legacy.em, 3, { version: null, segments: [] }, normalizeMonthly([row()], 23))
  await assert.rejects(keepsClosed(legacy.em, 3, { version: null, segments: [] }, normalizeMonthly([row({ basicSalary: '7000.00' })], 23)), code('SALARY_HISTORY_CLOSED_PERIOD'))
  assert.equal(writes(closed).length + writes(legacy).length, 0)
})
