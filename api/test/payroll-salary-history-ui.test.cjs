'use strict'
// واجهة الأجر: helpers وعقد HTTP مع fetch معزول وSSR حقيقي. لا API أو SQL أو بيانات شركة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '../..')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const { ApiError } = require('../../src/lib/api')
const ui = require('../../src/lib/payroll-salary-history-api')
const { PayrollSalaryHistoryEditor: Editor, PayrollSalaryHistorySummary: Summary } = require('../../src/components/PayrollSalaryHistoryEditor')
const { PayrollLiveSourceDetails: Details, PayrollLiveSourcesPanel: Sources } = require('../../src/components/PayrollLiveSourcesPanel')
const copy = value => JSON.parse(JSON.stringify(value))
const segment = (extra = {}) => ({ effectiveFrom: '2026-01-01', effectiveTo: null, currency: 'EGP', basicSalary: '9000.01', housingAllowance: '100.02', transportAllowance: '200.03', phoneAllowance: '300.04', workNatureAllowance: '400.05', otherAllowance: '500.06', workPressureAllowance: '0.00', ...extra })
const view = (extra = {}) => ({ employee: { id: 9, employeeCode: 'TEST-9', fullName: 'موظف اختبار', branchId: 7 },
  current: { currency: 'EGP', basicSalary: '12000.01', housingAllowance: '100.02', transportAllowance: '200.03', phoneAllowance: null, workNatureAllowance: null, otherAllowance: '500.06', workPressureAllowance: '0.00' },
  currentSourceHash: 'a'.repeat(64), revision: 1, version: { id: 11, revision: 1, reason: 'إثبات من العقد', evidenceReference: 'عقد اختبار 123', createdAt: '2026-09-13T10:00:00Z', createdBy: 4, contentHash: 'b'.repeat(64), currentSourceHash: 'a'.repeat(64) },
  segments: [segment()], capabilities: { canEdit: true }, ...extra })
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props))
const props = { employeeId: 9, canEdit: true, disabled: false, onDirtyChange() {}, onSaved() {} }
const respond = result => ({ ok: true, text: async () => JSON.stringify(result) })
async function withFetch(fetch, body) { const before = global.fetch; global.fetch = fetch; try { return await body() } finally { global.fetch = before } }
function editorFixture(value, extra = {}, options = {}) {
  // حقن حالة العرض الأولية فقط لتغطية JSX للمحرر المحمل؛ لا يدعي اختبار React mounted أو طلبًا حيًا.
  const states = [value, options.rows ?? value.segments, options.reason ?? '', options.evidence ?? value.version?.evidenceReference ?? '',
    options.loading ?? false, options.saving ?? false, options.dirty ?? false, options.error ?? '', options.notice ?? '']
  const original = React.useState; let index = 0
  React.useState = initial => index < states.length ? [states[index++], () => {}] : original(initial)
  try { return render(Editor, { ...props, ...extra }) } finally { React.useState = original }
}

test('seven explicit salary amounts (six + work pressure) have no inferred zero or date in a new segment', () => {
  const row = ui.emptySalaryHistorySegment()
  assert.equal(row.effectiveFrom, ''); assert.equal(row.effectiveTo, null)
  assert.deepEqual(Object.keys(ui.SALARY_HISTORY_FIELDS), ['basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance', 'workPressureAllowance'])
  for (const field of Object.keys(ui.SALARY_HISTORY_FIELDS)) assert.equal(row[field], '')
  assert.ok(ui.salaryHistoryFormError([row], 'إثبات عقد', 'مستند123'))
})

test('salary decimals remain strings at maximum cents; blank, negative, exponential and rounded values are rejected', () => {
  for (const value of ['0', '0.00', '0.29', '9999999999999999.99']) assert.equal(ui.salaryHistoryFormError([segment({ basicSalary: value })], 'سبب', 'مرجع'), null)
  for (const value of ['', null, undefined, 0, 0.29, '-0.01', '1e3', 'NaN', '0.001', '.29', '10000000000000000.00', ' 10.00 ']) {
    for (const field of Object.keys(ui.SALARY_HISTORY_FIELDS)) assert.ok(ui.salaryHistoryFormError([segment({ [field]: value })], 'سبب', 'مرجع'), field + ':' + value)
  }
})

test('real dates, leap boundaries, reverse ranges and year zero are checked before saving', () => {
  for (const date of ['0001-01-01', '0099-12-31', '2024-02-29', '2000-02-29', '9999-12-31']) assert.equal(ui.salaryHistoryFormError([segment({ effectiveFrom: date, effectiveTo: date })], 'سبب', 'مرجع'), null)
  for (const date of ['0000-01-01', '1900-02-29', '2025-02-29', '2026-04-31', '2026-13-01', '2026-01-00', '', null]) assert.ok(ui.salaryHistoryFormError([segment({ effectiveFrom: date })], 'سبب', 'مرجع'))
  assert.ok(ui.salaryHistoryFormError([segment({ effectiveFrom: '2026-05-01', effectiveTo: '2026-04-30' })], 'سبب', 'مرجع'))
})

test('period gaps remain explicit; overlap, same-day contact and open intervals before later periods are rejected', () => {
  const old = segment({ effectiveFrom: '2026-01-01', effectiveTo: '2026-01-31' }), next = segment({ effectiveFrom: '2026-03-01' })
  assert.equal(ui.salaryHistoryFormError([old, next], 'سبب', 'مرجع'), null)
  assert.ok(ui.salaryHistoryFormError([next, old], 'سبب', 'مرجع'))
  assert.ok(ui.salaryHistoryFormError([old, segment({ effectiveFrom: '2026-01-31' })], 'سبب', 'مرجع'))
  assert.ok(ui.salaryHistoryFormError([segment(), next], 'سبب', 'مرجع'))
})

test('evidence, reason, currency and 120-segment limit are enforced with no automatic currency conversion', () => {
  for (const [reason, evidence] of [['', 'مرجع'], ['   ', 'مرجع'], ['س'.repeat(501), 'مرجع'], ['سبب', ''], ['سبب', 'م'.repeat(201)]]) assert.ok(ui.salaryHistoryFormError([segment()], reason, evidence))
  assert.equal(ui.salaryHistoryFormError([segment()], 'س'.repeat(500), 'م'.repeat(200)), null)
  for (const currency of ['USD', '', null, 'egp']) assert.ok(ui.salaryHistoryFormError([segment({ currency })], 'سبب', 'مرجع'))
  assert.equal(ui.salaryHistoryFormError([segment({ currency: 'SAR' })], 'سبب', 'مرجع'), null)
  assert.ok(ui.salaryHistoryFormError([], 'سبب', 'مرجع')); assert.ok(ui.salaryHistoryFormError(Array.from({ length: 121 }, () => segment()), 'سبب', 'مرجع'))
})

test('GET validates employee identity, preserves exact/null values and forwards AbortSignal', async () => {
  const response = view(), calls = [], controller = new AbortController()
  response.current.basicSalary = '9999999999999999.99'
  await withFetch(async (url, options) => { calls.push({ url, options }); return respond(response) }, async () => {
    assert.deepEqual(await ui.fetchSalaryHistory(9, controller.signal), response)
  })
  assert.equal(calls.length, 1); assert.equal(new URL(calls[0].url).pathname, '/api/payroll/employees/9/salary-history')
  assert.equal(calls[0].options.signal, controller.signal); assert.equal(calls[0].options.body, undefined)
})

test('current signed values remain readable for diagnosis while historical amounts stay nonnegative', async () => {
  const response = view(); response.current.basicSalary = '-1.00'
  await withFetch(async () => respond(response), async () => assert.deepEqual(await ui.fetchSalaryHistory(9), response))
  assert.ok(ui.salaryHistoryFormError([segment({ basicSalary: '-1.00' })], 'سبب', 'مرجع'))
})

test('empty history is explicit revision zero and does not prefill current salary into dated segments', async () => {
  const response = view({ revision: 0, version: null, segments: [] })
  await withFetch(async () => respond(response), async () => assert.deepEqual(await ui.fetchSalaryHistory(9), response))
  assert.match(render(Summary, { view: response }), /لا يوجد سجل أجر مؤرخ/)
})

test('invalid employee IDs and form inputs never issue a network request', async () => {
  let calls = 0
  await withFetch(async () => { calls++; throw new Error('unexpected request') }, async () => {
    for (const employeeId of [0, -1, 9.5, NaN, Infinity, '9']) await assert.rejects(ui.fetchSalaryHistory(employeeId))
    await assert.rejects(ui.saveSalaryHistory(view(), [segment({ phoneAllowance: '' })], 'سبب', 'مرجع'))
    await assert.rejects(ui.saveSalaryHistory(view(), [segment()], '', 'مرجع'))
    assert.equal(calls, 0)
  })
})

test('POST carries the frozen revision/hash and only allowlisted editable fields, preserving cents and input objects', async () => {
  const source = view(), rows = [segment({ basicSalary: '9999999999999999.99', id: 987, sequence: 2, versionId: 444, approved: true })]
  const snapshot = copy({ source, rows }), calls = [], saved = view({ revision: 2, segments: rows.map(({ id, sequence, versionId, approved, ...row }) => row) })
  saved.version = { ...saved.version, id: 12, revision: 2 }
  await withFetch(async (url, options) => { calls.push({ url, options }); return respond(saved) }, async () => assert.deepEqual(await ui.saveSalaryHistory(source, rows, '  سبب حفظ  ', '  قرار 123  '), saved))
  assert.equal(calls.length, 1); assert.equal(calls[0].options.method, 'POST')
  assert.equal(new URL(calls[0].url).pathname, '/api/payroll/employees/9/salary-history')
  assert.deepEqual(JSON.parse(calls[0].options.body), { expectedRevision: 1, expectedCurrentSourceHash: 'a'.repeat(64), reason: 'سبب حفظ', evidenceReference: 'قرار 123', segments: saved.segments })
  assert.deepEqual({ source, rows }, snapshot)
})

test('different employee, inconsistent revision and malformed saved dates/money cannot render as a current history', async () => {
  for (const mutate of [r => r.employee.id++, r => r.employee.fullName = {}, r => r.currentSourceHash = 'bad', r => r.revision = -1,
    r => r.version.revision++, r => r.version = null, r => r.segments = [], r => r.segments[0].basicSalary = 9000,
    r => r.segments[0].effectiveFrom = '2025-02-29', r => r.capabilities.canEdit = 'true', r => delete r.current.phoneAllowance,
    r => r.revision = 0]) {
    const response = view(); mutate(response)
    await withFetch(async () => respond(response), async () => await assert.rejects(ui.fetchSalaryHistory(9), /رد سجل الأجر/))
  }
})

test('a POST response must advance exactly one revision and never silently accepts a stale save reply', async () => {
  for (const revision of [1, 3]) {
    const response = view({ revision }); response.version.revision = revision
    await withFetch(async () => respond(response), async () => await assert.rejects(ui.saveSalaryHistory(view(), [segment()], 'سبب', 'مرجع'), /رد حفظ غير متوقع/))
  }
})

test('403/409/503 preserve API status and do not automatically resubmit salary evidence', async () => {
  for (const status of [403, 409, 503]) {
    let calls = 0
    await withFetch(async () => { calls++; return { ok: false, status, json: async () => ({ code: 'SALARY_HISTORY_CONFLICT', message: 'أعد تحميل السجل' }) } }, async () => {
      await assert.rejects(ui.saveSalaryHistory(view(), [segment()], 'سبب', 'مرجع'), error => error instanceof ApiError && error.status === status)
      assert.equal(calls, 1)
    })
  }
})

test('initial editor SSR has explicit load action, no invented dated values and no save action', () => {
  const html = render(Editor, props)
  assert.match(html, /عرض سجل الأجر/); assert.match(html, /لا يغيّر الأجر الحالي/)
  assert.doesNotMatch(html, /type="date"|حفظ مراجعة الأجر|value="9000/)
  assert.match(render(Editor, { ...props, disabled: true }), /<button[^>]*disabled=""/)
})

test('loaded editor SSR exposes seven exact amounts (six + work pressure) and explicit payroll months without inferring months from legacy dates', () => {
  const response = view(); response.segments[0].basicSalary = '9999999999999999.99'
  const html = editorFixture(response)
  assert.match(html, /value="9999999999999999.99"/)
  for (const label of Object.values(ui.SALARY_HISTORY_FIELDS)) assert.ok(html.includes(label))
  assert.equal((html.match(/inputMode="decimal"/g) ?? []).length, 7)
  assert.equal((html.match(/type="month"/g) ?? []).length, 2)
  assert.doesNotMatch(html, /type="date"|value="2026-01"/)
  assert.match(html, /حدد شهر سريان كل قيمة صراحة/)
  assert.doesNotMatch(html, /type="number"|undefined|\[object Object\]/)
  assert.match(html, /نسخ القيم الحالية — بعد التأكد من سريانها/)
})

test('permission or server capability denial makes the loaded editor read-only and removes every mutation action', () => {
  for (const [response, extra] of [[view(), { canEdit: false }], [view({ capabilities: { canEdit: false } }), {}]]) {
    const html = editorFixture(response, extra)
    assert.match(html, /يتطلب صلاحية اعتماد الرواتب/); assert.match(html, /<fieldset[^>]*disabled=""/)
    assert.doesNotMatch(html, /حفظ مراجعة الأجر|إضافة فترة أجر|نسخ القيم الحالية|إزالة الفترة/)
    assert.match(html, /9000.01/)
  }
})

test('summary explains changed current-source evidence and escapes document text instead of executing HTML', () => {
  const response = view(); response.version.currentSourceHash = 'd'.repeat(64)
  response.version.reason = '<script>BAD()</script>'; response.version.evidenceReference = '<img src=x onerror=BAD()>'
  const html = render(Summary, { view: response })
  assert.match(html, /تغير الأجر أو العملة/); assert.match(html, /&lt;script&gt;/); assert.match(html, /&lt;img/)
  assert.doesNotMatch(html, /<script>|<img src=x/)
})

test('saved history integration labels dated periods separately from current employee values', () => {
  const salary = segment()
  const html = render(Details, { name: 'compensation', section: { state: 'AVAILABLE', issues: [], sourceRefs: [], data: {
    basis: 'SINGLE_PAYROLL_PERIOD_SALARY', referencePeriod: '2026-06',
    current: view().current, currentSourceUnchanged: true, datedSegments: [{ from: '2026-06-01', to: '2026-06-30', currency: 'EGP', salary }],
  } } })
  for (const text of ['راتب شهر 2026-06 موثق بقيمة واحدة', 'القيم التالية من الملف الحالي', '2026-06-01', '2026-06-30', '9000.01', '12000.01']) assert.ok(html.includes(text))
  const denied = render(Sources, { view: { policyId: 1, versionId: 2, revision: 1 }, canCalculate: false, policyDirty: false })
  assert.doesNotMatch(denied, /عرض سجل الأجر|<select/)
})

if (process.env.PAYROLL_SALARY_UI_RENDER === '1') test('desktop/mobile isolated SSR fixtures use actual editor markup and project CSS without network', async () => {
  const postcss = require('../../node_modules/postcss'), tailwind = require('../../node_modules/tailwindcss')
  const { chromium } = require('C:/Users/Kareem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
  const config = require('../../tailwind.config.js')
  const response = view(); response.version.currentSourceHash = 'd'.repeat(64)
  response.segments = [segment({ effectiveTo: '2026-06-30' }), segment({ effectiveFrom: '2026-07-01', basicSalary: '12000.01' })]
  const markup = editorFixture(response, {}, { dirty: true, reason: 'توثيق عقد ثم قرار زيادة مؤرخ', evidence: 'عقد / قرار زيادة 123' })
  const css = await postcss([tailwind({ ...config, content: [path.join(root, 'src/components/PayrollSalaryHistoryEditor.tsx'), { raw: 'max-w-5xl mx-auto p-6 space-y-5 text-2xl font-bold text-gray-800 text-sm text-gray-500 mb-6' }] })])
    .process(fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8').replace(/^@import[^\n]+\n/m, ''), { from: undefined })
  const html = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>سجل الأجر المؤرخ — عرض اختبار</title><style>${css.css}</style><body><main class="max-w-5xl mx-auto p-6 space-y-5"><header class="mb-6"><h1 class="text-2xl font-bold text-gray-800">سجل الأجر المؤرخ</h1><p class="text-sm text-gray-500">عرض SSR ببيانات اختبار؛ ليس بيانات الشركة أو فحص الخدمة الحية</p></header>${markup}</main></body></html>`
  fs.writeFileSync(path.join(root, 'output/payroll-salary-history-ui-ssr.html'), html)
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 })
    await page.route('**/*', route => route.abort()); await page.setContent(html, { waitUntil: 'domcontentloaded' })
    for (const [name, width, height] of [['desktop', 1280, 1000], ['mobile', 390, 844]]) {
      await page.setViewportSize({ width, height })
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, name + ' viewport overflow')
      await page.screenshot({ path: path.join(root, `output/payroll-salary-history-ui-${name}.png`), fullPage: true })
    }
    console.log('SSR desktop1280/mobile390 fixtures: actual editor + project CSS; injected initial view state only, no mounted-interaction or live-service claim. Network disabled.')
  } finally { await browser.close() }
}, { timeout: 60000 })
