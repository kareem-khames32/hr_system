// UI helpers + React SSR + HTTP wrapper contract with a fetch double. No server, SQL or financial writes.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const { ApiError } = require('../../src/lib/api')
const ui = require('../../src/lib/payroll-live-sources-api')
const { PayrollLiveSourceDetails, PayrollLiveSourcesResult, PayrollLiveSourcesPanel } = require('../../src/components/PayrollLiveSourcesPanel')
const copy = value => JSON.parse(JSON.stringify(value))
const section = (data, extra = {}) => ({ state: 'AVAILABLE', data, issues: [], sourceRefs: [], ...extra })
const result = (extra = {}) => ({ readOnly: true, sourceValidation: 'SERVER_READ_PARTIAL', capturedAt: '2026-09-13T16:00:00Z', capturedBy: 4, contentHash: 'a'.repeat(64), executionReady: false, approvalEligible: false, persisted: false,
  snapshot: { employee: { id: 9, fullName: 'موظف اختبار', employeeCode: 'TEST-9' }, period: { startDate: '2026-09-01', endDate: '2026-09-30' }, policy: { versionId: 11, revision: 3 }, sections: { overtime: section({ rows: [] }) }, blockers: [] }, ...extra })
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props))
const detail = (name, data, extra = {}) => render(PayrollLiveSourceDetails, { name, section: section(data, extra) })
const request = (...args) => ui.readPayrollLiveSources(7, 11, 3, 9, '2026-09-01', '2026-09-30', ...args)

test('period helper validates real dates, leap days and inclusive 32-day boundary', () => {
  for (const dates of [['2026-09-01', '2026-09-30'], ['2026-08-05', '2026-09-05'], ['2028-02-29', '2028-02-29']]) assert.equal(ui.liveSourcePeriodError(...dates), null)
  for (const dates of [['2026-02-29', '2026-03-01'], ['0000-01-01', '0000-01-01'], ['2026-09-30', '2026-09-01'], ['2026-08-04', '2026-09-05'], ['', '2026-09-01']]) assert.ok(ui.liveSourcePeriodError(...dates))
})

test('money strings display exactly; numbers, objects and nondecimal raw values never masquerade as money', () => {
  for (const amount of ['0.00', '0.29', '9999999999999999.99']) assert.equal(ui.liveSourceAmount(amount), amount)
  for (const invalid of [null, undefined, 9000.25, {}, [], 'UNKNOWN', '{"amount":8}', '1e3', 'NaN', '-1.00']) assert.equal(ui.liveSourceAmount(invalid), 'غير مثبت')
  assert.equal(ui.liveSourceMinutes(0), '0'); assert.equal(ui.liveSourceMinutes(70), '70')
  assert.equal(ui.liveSourceMinutes({ raw: 10 }), 'غير مثبت'); assert.equal(ui.liveSourceMinutes(-1), 'غير مثبت')
})

test('date helper only says immediate for a nullable obligation date, not a missing attendance date', () => {
  assert.equal(ui.liveSourceDate(null, true), 'فوري')
  for (const date of [null, undefined, 'UNKNOWN', '2026-02-30', {}]) assert.equal(ui.liveSourceDate(date), 'غير مثبت')
  assert.equal(ui.liveSourceDate('2026-09-01'), '2026-09-01')
})

test('unknown source states and technical reason codes have Arabic fallback without leaking raw codes', () => {
  assert.equal(ui.liveSourceStateLabel('AVAILABLE'), 'القراءة متاحة')
  assert.equal(ui.liveSourceStateLabel('UNKNOWN'), 'حالة تحتاج مراجعة')
  assert.equal(ui.liveSourceStateLabel('constructor'), 'حالة تحتاج مراجعة')
  assert.equal(ui.liveSourceRowStatus({ status: 'UNKNOWN' }), 'حالة غير مثبتة')
  assert.deepEqual(ui.liveSourceRowReasons({ reasons: ['PRIVATE_INTERNAL_ERROR', { raw: true }] }), ['سبب يحتاج مراجعة'])
  assert.equal(ui.liveSourceMessage('SQL_RAW_SOURCE_UNKNOWN'), 'تحتاج بيانات هذا المصدر إلى مراجعة قبل استخدامها.')
  assert.equal(ui.liveSourceMessage('مبلغ الاعتماد غير مثبت'), 'مبلغ الاعتماد غير مثبت')
})

test('ledger closure and claim reasons are rendered as Arabic business states', () => {
  assert.deepEqual(ui.liveSourceRowReasons({ reasons: ['OT_PAYMENT_LINK_INVALID'] }), ['رابط الصرف لا يطابق حالة الإضافي'])
  assert.equal(ui.liveSourceRowStatus({ financialStatus: 'PARTIAL' }), 'سداد جزئي والباقي مرحّل')
  assert.deepEqual(ui.liveSourceRowReasons({ exclusionReasons: ['POSITION_DEFERRED', 'NO_OPEN_BALANCE', 'CLAIM_ALLOCATION_HELD', 'FUTURE_DUE'] }),
    ['مؤجل إلى قسط لاحق', 'لا يوجد رصيد قائم', 'محجوز أو محصل في مسير', 'موعد القسط لاحق للفترة'])
})

test('all source detail renderers tolerate null and unknown data without crashing or serializing it', () => {
  for (const name of Object.keys(ui.LIVE_SOURCE_LABELS)) for (const data of [null, undefined, 'RAW_SECRET', [], 1]) {
    const html = detail(name, data)
    assert.match(html, /لا توجد تفاصيل مقروءة/)
    assert.doesNotMatch(html, /RAW_SECRET|undefined|\[object Object\]/)
  }
})

test('current compensation labels are complete and do not claim historical salary validity', () => {
  const html = detail('compensation', { current: { basicSalary: '9999999999999999.99', housingAllowance: '0.29', transportAllowance: 900, phoneAllowance: { hidden: 'PRIVATE_PAYLOAD' } } })
  assert.match(html, /سريانها على الفترة المختارة لم يُثبت بعد/)
  for (const text of ['الأساسي', 'السكن', 'الانتقال', 'الهاتف', 'طبيعة العمل', 'أخرى', '9999999999999999.99', '0.29']) assert.ok(html.includes(text))
  assert.doesNotMatch(html, /PRIVATE_PAYLOAD|\[object Object\]/)
})

test('monthly compensation requires one salary, reference month and unchanged source beyond the AVAILABLE label', () => {
  const salary = { basicSalary: '6000.00', housingAllowance: '100.29', transportAllowance: '0.00', phoneAllowance: '0.00', workNatureAllowance: '0.00', otherAllowance: '0.00' }
  const data = { basis: 'SINGLE_PAYROLL_PERIOD_SALARY', referencePeriod: '2026-06', current: salary, currentSourceUnchanged: true, datedSegments: [{ from: '2026-06-01', to: '2026-06-15', currency: 'SAR', salary }] }
  assert.match(detail('compensation', data), /راتب شهر 2026-06 موثق بقيمة واحدة/)
  assert.match(detail('compensation', data), /2026-06-15/)
  for (const patch of [{ datedSegments: [] }, { currentSourceUnchanged: false }, { datedSegments: [{ ...data.datedSegments[0], from: '2026-02-30' }] }]) {
    assert.match(detail('compensation', { ...data, ...patch }), /سريانها على الفترة المختارة لم يُثبت بعد/)
  }
})

test('dated schedule display keeps timing separate from unproved calendar workdays', () => {
  const html = detail('schedule', { days: [{ date: '2026-06-15', timingState: 'AVAILABLE', timing: { startTime: '09:00', endTime: '18:00', requiredWorkMinutes: 540, flexEnabled: true, flexWindowMinutes: 60 } }], scheduledWorkDates: null })
  for (const text of ['09:00', '18:00', '540', '60 دقيقة', 'تقويمًا مؤرخًا']) assert.ok(html.includes(text))
  assert.doesNotMatch(html, /undefined|\[object Object\]/)
})

test('employment coverage requires typed dates and day count before it is presented as coverage', () => {
  assert.match(detail('employment', { coverage: { from: '2026-09-01', to: '2026-09-30', days: 30 } }), /30 يومًا تقويميًا/)
  for (const coverage of [{}, { from: 'UNKNOWN', to: '2026-09-30', days: 1 }, { from: '2026-09-01', to: '2026-09-30', days: {} }]) {
    assert.match(detail('employment', { coverage }), /لا توجد تغطية وظيفية مثبتة/)
  }
})

test('paid overtime shows exclusion and claim reason, while raw evidence remains absent from markup', () => {
  const html = detail('overtime', { rows: [{ id: 12, date: '2026-09-01', approvedAmount: '75.00', status: 'PAID', eligible: false,
    reasons: ['ALREADY_PAID', 'CLAIMED_BY_PAYROLL'], rawCalculationSnapshot: 'PRIVATE_RAW_JSON', sourceRef: 'SQL_SOURCE_REF', approvalSnapshot: { amount: 75 } }] })
  for (const text of ['75.00', 'مصروف', 'مستبعد من المصادر المتاحة', 'مرتبط بمسير معتمد أو مصروف']) assert.ok(html.includes(text))
  assert.doesNotMatch(html, /PRIVATE_RAW_JSON|SQL_SOURCE_REF|ALREADY_PAID|CLAIMED_BY_PAYROLL|PAID/)
})

test('unknown row payloads never stringify; missing dates do not become immediate money', () => {
  const html = detail('attendance', { rows: [null, 'UNKNOWN', { id: { secret: true }, date: 'RAW_DATE', unexcusedLateMinutes: { value: 10 }, status: 'RAW_STATUS' }] })
  assert.match(html, /1 سجلًا مقروءًا/); assert.match(html, /غير مثبت/)
  assert.doesNotMatch(html, /RAW_DATE|RAW_STATUS|\[object Object\]|فوري/)
  assert.match(detail('credits', { entries: [{ id: 1, effectiveDate: null, amount: '100.00', status: 'PENDING' }] }), /فوري/)
})

test('rows are bounded to first 100 with a visible count; unknown section details are not exposed', () => {
  const html = detail('installments', { positions: Array.from({ length: 101 }, (_, index) => ({ id: index + 1, dueDate: '2026-09-01', remainingAmount: '10.00', financialStatus: 'DUE' })) })
  assert.match(html, /معروض أول 100 سجل من 101/)
  assert.match(html, /#100/); assert.doesNotMatch(html, /#101/)
  const unknown = detail('PRIVATE_SOURCE', { rows: [{ id: 1, amount: '123456.00' }], raw: 'PRIVATE_SECRET' })
  assert.match(unknown, /إصدارًا أحدث/); assert.doesNotMatch(unknown, /123456|PRIVATE_SECRET/)
})

test('result explains preview limits and source blockers with Arabic labels only', () => {
  const response = result()
  response.snapshot.sections = { compensation: section(null, { state: 'MISSING', issues: [{ code: 'MISSING_CODE', message: 'الأجر غير مكتمل' }] }), PRIVATE_SOURCE: section({ raw: 'PRIVATE_DATA' }, { state: 'UNKNOWN', issues: [{ code: 'INTERNAL_CODE', message: 'RAW_UNKNOWN' }] }) }
  response.snapshot.blockers = [{ section: 'policy', code: 'POLICY_NOT_PUBLISHED', message: 'النسخة لم تُنشر بعد' }]
  const html = render(PayrollLiveSourcesResult, { result: response })
  // B5 / FE-02: نص التنبيه القديم («لم يُفعّل بعد») كان غير دقيق بعد D13 — محرك السياسة يقرأ هذه المصادر بجانب الحساب القديم في SHADOW
  for (const text of ['موظف اختبار', 'مراجعة السياسة 3', 'يقرؤها محرك السياسة بجانبه للمقارنة في تقرير التكافؤ', 'الأجر غير مكتمل', 'النسخة لم تُنشر بعد', 'حالة تحتاج مراجعة']) assert.ok(html.includes(text), text)
  assert.doesNotMatch(html, /MISSING_CODE|PRIVATE_SOURCE|PRIVATE_DATA|RAW_UNKNOWN|INTERNAL_CODE|POLICY_NOT_PUBLISHED/)
})

test('SSR permission denial has no employee selection or read action; dirty policy blocks reading', () => {
  const view = { policyId: 7, versionId: 11, revision: 3 }
  const denied = render(PayrollLiveSourcesPanel, { view, canCalculate: false, policyDirty: false })
  assert.match(denied, /يتطلب صلاحية احتساب الرواتب/); assert.doesNotMatch(denied, /<select|<button/)
  const dirty = render(PayrollLiveSourcesPanel, { view, canCalculate: true, policyDirty: true })
  assert.match(dirty, /احفظ تعديل ترتيب التحصيل أو تجاهله/)
  assert.match(dirty, /لا تمثل سجل جميع الموظفين التاريخي/)
  assert.match(dirty, /<button[^>]*disabled=""[^>]*>/)
})

test('API sends only fixed read fields on expected route and passes abort signal', async () => {
  const original = global.fetch, calls = [], controller = new AbortController(), response = result()
  global.fetch = async (url, options) => { calls.push({ url, options }); return { ok: true, text: async () => JSON.stringify(response) } }
  try {
    assert.deepEqual(await request(controller.signal), response)
    assert.equal(calls.length, 1); assert.equal(new URL(calls[0].url).pathname, '/api/payroll/policies/7/versions/11/sources/read')
    assert.equal(calls[0].options.method, 'POST'); assert.equal(calls[0].options.signal, controller.signal)
    assert.deepEqual(JSON.parse(calls[0].options.body), { expectedRevision: 3, employeeId: 9, periodStart: '2026-09-01', periodEnd: '2026-09-30' })
  } finally { global.fetch = original }
})

test('bad identifiers or period fail locally without issuing an API request', async () => {
  const original = global.fetch; let calls = 0
  global.fetch = async () => { calls++; throw new Error('unexpected request') }
  try {
    for (const args of [[0, 11, 3, 9, '2026-09-01', '2026-09-30'], [7, 11, 3, 9.5, '2026-09-01', '2026-09-30'], [7, 11, 3, 9, '2026-02-30', '2026-03-01'], [7, 11, 2147483648, 9, '2026-09-01', '2026-09-30']]) await assert.rejects(ui.readPayrollLiveSources(...args))
    assert.equal(calls, 0)
  } finally { global.fetch = original }
})

test('a stale version, different employee/period or non-readonly reply is not rendered as current data', async () => {
  const original = global.fetch
  try {
    for (const mutate of [r => r.snapshot.policy.revision++, r => r.snapshot.policy.versionId++, r => r.snapshot.employee.id++, r => r.snapshot.period.endDate = '2026-09-29', r => r.executionReady = true, r => r.persisted = true, r => r.readOnly = false, r => r.snapshot.sections.overtime = null, r => r.snapshot.employee.fullName = {}, r => r.snapshot.sections.overtime.issues = [null]]) {
      const response = result(); mutate(response)
      global.fetch = async () => ({ ok: true, text: async () => JSON.stringify(response) })
      await assert.rejects(request(), /لا يطابق الموظف والفترة ومراجعة السياسة/)
    }
    const response = result(); response.snapshot.sections.compensation = section(null, { state: 'MISSING' })
    global.fetch = async () => ({ ok: true, text: async () => JSON.stringify(response) })
    assert.deepEqual(await request(), response, 'valid missing/null source is allowed for safe display')
  } finally { global.fetch = original }
})

test('403/409 errors preserve typed API status and never trigger automatic retry', async () => {
  const original = global.fetch
  try {
    for (const status of [403, 409]) {
      let calls = 0
      global.fetch = async () => { calls++; return { ok: false, status, json: async () => ({ code: 'POLICY_SOURCE_CONFLICT', message: 'راجع صلاحياتك أو أحدث نسخة' }) } }
      await assert.rejects(request(), error => error instanceof ApiError && error.status === status)
      assert.equal(calls, 1)
    }
  } finally { global.fetch = original }
})
