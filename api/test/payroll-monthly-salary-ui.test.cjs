'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path'), fs = require('node:fs')
const root = path.resolve(__dirname, '../..')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react'), { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const ui = require('../../src/lib/payroll-salary-history-api')
const { PayrollSalaryHistoryEditor: Editor } = require('../../src/components/PayrollSalaryHistoryEditor')
const { PayrollLiveSourceDetails: Details } = require('../../src/components/PayrollLiveSourcesPanel')
const keys = Object.keys(ui.SALARY_HISTORY_FIELDS)
const row = (extra = {}) => ({ ...Object.fromEntries(keys.map(key => [key, key === 'basicSalary' ? '10000.00' : '0.00'])), currency: 'EGP', effectiveFrom: '2026-08-23', effectiveTo: null, effectivePayrollPeriod: '2026-09', effectiveToPayrollPeriod: null, ...extra })
const view = (extra = {}) => ({ employee: { id: 8, employeeCode: 'UI-8', fullName: 'موظف اختبار شهري', branchId: 3 }, current: { ...Object.fromEntries(keys.map(key => [key, key === 'basicSalary' ? '12000.00' : '0.00'])), currency: 'EGP' }, currentSourceHash: 'a'.repeat(64), revision: 2,
  version: { id: 12, revision: 2, reason: 'تأكيد شهور الزيادة', evidenceReference: 'قرار اختبار', createdAt: '2026-09-14T00:00:00Z', createdBy: 3, contentHash: 'b'.repeat(64), currentSourceHash: 'a'.repeat(64), contractVersion: ui.MONTHLY_SALARY_HISTORY_VERSION, cycleStartDay: 23 }, segments: [row()], capabilities: { canEdit: true }, ...extra })
const copy = object => JSON.parse(JSON.stringify(object))
const response = value => ({ ok: true, text: async () => JSON.stringify(value) })
async function withFetch(fetch, run) { const previous = global.fetch; global.fetch = fetch; try { return await run() } finally { global.fetch = previous } }
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props))
function editorFixture(source, props = {}) {
  const states = [source, source.segments, 'تأكيد زيادة سبتمبر كاملة', 'قرار اختبار شهري', false, false, true, '', '']
  const previous = React.useState; let index = 0
  React.useState = initial => index < states.length ? [states[index++], () => {}] : previous(initial)
  try { return render(Editor, { employeeId: 8, canEdit: true, disabled: false, onDirtyChange() {}, onSaved() {}, ...props }) } finally { React.useState = previous }
}

test('new monthly salary input starts with no inferred month, amount or effective date', () => {
  const empty = ui.emptyMonthlySalaryPeriod()
  assert.equal(empty.effectivePayrollPeriod, ''); assert.equal(empty.effectiveToPayrollPeriod, null); assert.equal(empty.effectiveFrom, '')
  for (const key of keys) assert.equal(empty[key], '')
  assert.ok(ui.monthlySalaryFormError([empty], 'سبب', 'مرجع'))
})
test('monthly ranges allow gaps but reject overlap, invalid months and missing open-end declaration', () => {
  for (const value of ['', '2026-00', '2026-13', '2026-9', '0000-01', '2026-09-01', null]) assert.ok(ui.monthlySalaryFormError([row({ effectivePayrollPeriod: value })], 'سبب', 'مرجع'))
  for (const end of ['2026-08', undefined, '2026-13']) assert.ok(ui.monthlySalaryFormError([row({ effectiveToPayrollPeriod: end })], 'سبب', 'مرجع'))
  assert.equal(ui.monthlySalaryFormError([row({ effectiveToPayrollPeriod: '2026-09' }), row({ effectivePayrollPeriod: '2026-11' })], 'سبب', 'مرجع'), null)
  assert.ok(ui.monthlySalaryFormError([row(), row({ effectivePayrollPeriod: '2026-10' })], 'سبب', 'مرجع'))
  assert.ok(ui.monthlySalaryFormError([row({ effectiveToPayrollPeriod: '2026-10' }), row({ effectivePayrollPeriod: '2026-10' })], 'سبب', 'مرجع'))
})
test('monthly form preserves exact cents and does not derive any amount or currency', () => {
  assert.equal(ui.monthlySalaryFormError([row({ basicSalary: '9999999999999999.99' })], 'سبب', 'مرجع'), null)
  for (const value of [null, '', 1, '0.001', '-1', '1e4', '10000000000000000.00']) for (const key of keys) assert.ok(ui.monthlySalaryFormError([row({ [key]: value })], 'سبب', 'مرجع'))
  assert.ok(ui.monthlySalaryFormError([row({ currency: 'USD' })], 'سبب', 'مرجع'))
})
test('monthly POST sends period keys and exact amounts only, preserving CAS without derived dates or audit fields', async () => {
  const original = view(), saved = view({ revision: 3 }); saved.version.revision = 3
  const supplied = row({ basicSalary: '9999999999999999.99', effectiveFrom: '1999-01-01', approvedBy: 999, cycleStartDay: 1 })
  let sent
  await withFetch(async (url, options) => { sent = { url, body: JSON.parse(options.body) }; return response(saved) }, async () => {
    const result = await ui.saveMonthlySalaryHistory(original, [supplied], ' سبب ', ' مرجع '); assert.equal(result.revision, 3)
  })
  assert.match(sent.url, /\/payroll\/employees\/8\/salary-history\/monthly$/)
  assert.equal(sent.body.expectedRevision, 2); assert.equal(sent.body.expectedCurrentSourceHash, original.currentSourceHash)
  assert.equal(sent.body.periods[0].basicSalary, '9999999999999999.99'); assert.equal(sent.body.periods[0].effectivePayrollPeriod, '2026-09')
  assert.equal(sent.body.reason, 'سبب'); assert.equal(sent.body.evidenceReference, 'مرجع')
  for (const key of ['effectiveFrom', 'effectiveTo', 'approvedBy', 'cycleStartDay']) assert.equal(Object.hasOwn(sent.body.periods[0], key), false)
  assert.equal(Object.hasOwn(sent.body, 'segments'), false)
})
test('monthly history cannot silently downgrade through legacy save; invalid month never makes a request', async () => {
  let calls = 0
  await withFetch(async () => { calls++; throw new Error('unexpected') }, async () => {
    await assert.rejects(ui.saveSalaryHistory(view(), [row()], 'سبب', 'مرجع'), /مسار شهور الرواتب/)
    await assert.rejects(ui.saveMonthlySalaryHistory(view(), [row({ effectivePayrollPeriod: '' })], 'سبب', 'مرجع'), /شهر/)
  })
  assert.equal(calls, 0)
})
test('monthly responses reject removed metadata, unknown version, invalid cycle and stale revision', async () => {
  for (const mutate of [v => delete v.segments[0].effectivePayrollPeriod, v => delete v.segments[0].effectiveToPayrollPeriod, v => v.version.contractVersion = 'UNKNOWN', v => delete v.version.contractVersion, v => v.version.cycleStartDay = 0]) {
    const saved = view(); mutate(saved)
    await withFetch(async () => response(saved), async () => assert.rejects(ui.fetchSalaryHistory(8)))
  }
  await withFetch(async () => response(view()), async () => assert.rejects(ui.saveMonthlySalaryHistory(view(), [row()], 'سبب', 'مرجع'), /رد حفظ شهور غير متوقع/))
})
test('clamped cycle31 dates do not turn disjoint February and March salary months into an overlap', async () => {
  const saved = view(); saved.version.cycleStartDay = 31
  saved.segments = [row({ effectivePayrollPeriod: '2026-02', effectiveToPayrollPeriod: '2026-02', effectiveFrom: '2026-01-31', effectiveTo: '2026-02-28' }), row({ effectivePayrollPeriod: '2026-03', effectiveFrom: '2026-02-28' })]
  await withFetch(async () => response(saved), async () => assert.deepEqual(await ui.fetchSalaryHistory(8), saved))
  const broken = copy(saved); broken.segments[1].effectiveFrom = '2026-02-30'
  await withFetch(async () => response(broken), async () => assert.rejects(ui.fetchSalaryHistory(8), /غير مكتمل/))
})
test('monthly editor displays reference month and owner cycle example with no date picker', () => {
  const html = editorFixture(view())
  assert.match(html, /يسري من راتب شهر/); assert.match(html, /23 أغسطس إلى 22 سبتمبر/)
  assert.match(html, /type="month"[^>]*value="2026-09"/); assert.doesNotMatch(html, /type="date"|value="2026-08"/)
  assert.equal((html.match(/inputMode="decimal"/g) || []).length, 7) // الست + بدل ضغط العمل
})
test('permission denial retains values but prevents monthly saving and adding', () => {
  const html = editorFixture(view(), { canEdit: false })
  assert.match(html, /<fieldset[^>]*disabled=""/); assert.doesNotMatch(html, /حفظ مراجعة الأجر|إضافة فترة أجر|نسخ القيم الحالية/)
  assert.match(html, /2026-09/)
})
test('source panel labels one monthly rate and never confirms old multi-rate evidence', () => {
  const data = { basis: 'SINGLE_PAYROLL_PERIOD_SALARY', referencePeriod: '2026-09', current: view().current, currentSourceUnchanged: true, datedSegments: [{ from: '2026-08-23', to: '2026-09-22', currency: 'EGP', salary: row() }] }
  const section = { state: 'AVAILABLE', issues: [], sourceRefs: [], data }
  const html = render(Details, { name: 'compensation', section })
  assert.match(html, /راتب شهر 2026-09 موثق بقيمة واحدة/); assert.match(html, /10000.00/); assert.match(html, /12000.00/)
  for (const changed of [{ ...data, basis: 'EXPLICIT_EFFECTIVE_SALARY_HISTORY' }, { ...data, referencePeriod: '2026-13' }, { ...data, datedSegments: [...data.datedSegments, data.datedSegments[0]] }]) {
    const rendered = render(Details, { name: 'compensation', section: { ...section, data: changed } })
    assert.doesNotMatch(rendered, /موثق بقيمة واحدة/)
  }
})

if (process.env.PAYROLL_MONTHLY_UI_RENDER === '1') test('monthly editor desktop and mobile artifact uses real JSX and project styles', async () => {
  const postcss = require('../../node_modules/postcss'), tailwind = require('../../node_modules/tailwindcss')
  const { chromium } = require('C:/Users/Kareem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
  const source = view(); source.segments = [row({ effectiveFrom: '2026-07-23', effectiveTo: '2026-08-22', effectivePayrollPeriod: '2026-08', effectiveToPayrollPeriod: '2026-08', basicSalary: '9000.00' }), row()]
  const markup = editorFixture(source)
  const css = await postcss([tailwind({ ...require('../../tailwind.config.js'), content: [path.join(root, 'src/components/PayrollSalaryHistoryEditor.tsx'), { raw: 'max-w-5xl mx-auto p-6 space-y-5 text-2xl font-bold text-gray-800 text-sm text-gray-500' }] })]).process(fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8').replace(/^@import[^\n]+\n/m, ''), { from: undefined })
  const html = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css.css}</style><body><main class="max-w-5xl mx-auto p-6 space-y-5"><h1 class="text-2xl font-bold">راتب شهر المسير وسجل الزيادات</h1><p class="text-sm text-gray-500">معاينة ببيانات اختبار للمكون الفعلي؛ ليست بيانات الشركة</p>${markup}</main></body></html>`
  fs.writeFileSync(path.join(root, 'output/payroll-monthly-salary-ui.html'), html)
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  try {
    const page = await browser.newPage(); await page.route('**/*', route => route.abort())
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    for (const [name, width, height] of [['desktop', 1280, 1000], ['mobile', 390, 844]]) {
      await page.setViewportSize({ width, height }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      await page.screenshot({ path: path.join(root, `output/payroll-monthly-salary-${name}.png`), fullPage: true })
    }
  } finally { await browser.close() }
}, { timeout: 60000 })
