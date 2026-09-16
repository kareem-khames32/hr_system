'use strict'
// الخطوة 13: أجر التعيين «يسري من راتب شهر» عند إنشاء الموظف — حدود الخادم الصرفة، ومساعد الواجهة، وخطوة البيانات المالية في نموذج الإضافة.
// اختبارات صرفة وfetch معزول؛ لا SQL ولا خدمة. التكامل على SQL في payroll-run-salary-period.integration.cjs.
const { test } = require('node:test'), assert = require('node:assert/strict'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const { employeeSalaryStartContext: start } = require('../src/payroll/payroll-salary-change')
const ui = require('../../src/lib/employee-salary-change-api')
const root = path.resolve(__dirname, '../..')
const code = wanted => error => error.getResponse?.()?.code === wanted
const salary = (extra = {}) => ({ basicSalary: '6000', housingAllowance: '', transportAllowance: '', phoneAllowance: '', workNatureAllowance: '', otherAllowance: '', currency: 'SAR', ...extra })
const context = (extra = {}) => ({ cycleStartDay: 23, currentPayrollPeriod: '2026-09', hireDate: '2026-08-20', hirePayrollPeriod: '2026-08', minPayrollPeriod: '2026-08',
  maxPayrollPeriod: '2026-09', defaultPayrollPeriod: '2026-09', defaultPayrollPeriodBounds: { startDate: '2026-08-23', endDate: '2026-09-22' }, ...extra })
async function fetched(response, fn) {
  const original = global.fetch, calls = []
  global.fetch = async (url, options) => { calls.push({ url, options }); return { ok: true, text: async () => JSON.stringify(response) } }
  try { return await fn(calls) } finally { global.fetch = original }
}

test('حدود أجر التعيين بدورة 23: شهر التعيين الجاري أو اللاحق هو الافتراض، والتعيين القديم يُوثَّق افتراضيًا من الشهر الجاري ويقبل شهر التعيين صراحة', () => {
  const today = '2026-09-14'
  assert.deepEqual(start({ cycleStartDay: 23, today, hireDate: '2026-09-01' }), { cycleStartDay: 23, currentPayrollPeriod: '2026-09', hireDate: '2026-09-01',
    hirePayrollPeriod: '2026-09', minPayrollPeriod: '2026-09', maxPayrollPeriod: '2026-09', defaultPayrollPeriod: '2026-09',
    defaultPayrollPeriodBounds: { startDate: '2026-08-23', endDate: '2026-09-22' } })
  // 23 أغسطس بداية «راتب سبتمبر» (قاعدة المالك)؛ 22 أغسطس آخر يوم في «راتب أغسطس».
  assert.equal(start({ cycleStartDay: 23, today, hireDate: '2026-08-23' }).hirePayrollPeriod, '2026-09')
  // تعيين الشهر السابق مباشرة: الافتراض شهر التعيين نفسه، فيدخل الموظف الجديد مسير شهر تعيينه
  const late = start({ cycleStartDay: 23, today, hireDate: '2026-08-22' })
  assert.deepEqual([late.minPayrollPeriod, late.defaultPayrollPeriod, late.maxPayrollPeriod], ['2026-08', '2026-08', '2026-09'])
  assert.deepEqual(late.defaultPayrollPeriodBounds, { startDate: '2026-07-23', endDate: '2026-08-22' })
  const future = start({ cycleStartDay: 23, today, hireDate: '2026-09-25' })
  assert.deepEqual([future.minPayrollPeriod, future.defaultPayrollPeriod, future.maxPayrollPeriod], ['2026-10', '2026-10', '2026-10'])
  assert.deepEqual(future.defaultPayrollPeriodBounds, { startDate: '2026-09-23', endDate: '2026-10-22' })
  const legacy = start({ cycleStartDay: 23, today, hireDate: '2020-01-01' })
  assert.deepEqual([legacy.minPayrollPeriod, legacy.defaultPayrollPeriod], ['2020-01', '2026-09'], 'لا يُنسب أجر الملف افتراضيًا لشهور سبقت إنشاءه')
  const none = start({ cycleStartDay: 23, today, hireDate: null })
  assert.deepEqual([none.hirePayrollPeriod, none.minPayrollPeriod, none.defaultPayrollPeriod], [null, null, '2026-09'])
  assert.equal(start({ cycleStartDay: 1, today, hireDate: '2026-09-14' }).defaultPayrollPeriod, '2026-09')
  // دورة 31 بعد الخطوة 14: 31 مارس يقع في «راتب أبريل».
  assert.equal(start({ cycleStartDay: 31, today: '2026-03-31', hireDate: '2026-03-31' }).defaultPayrollPeriod, '2026-04')
  for (const hireDate of ['2026-02-30', '2026-13-01', 'bad']) assert.throws(() => start({ cycleStartDay: 23, today, hireDate }), code('EMPLOYEE_SALARY_START_DATE_INVALID'))
  assert.throws(() => start({ cycleStartDay: 0, today, hireDate: null }), code('EMPLOYEE_SALARY_START_DATE_INVALID'))
})

test('مساعد الواجهة: الشهر يُرسل مع أجر فعلي فقط، ضمن الحدود وبعملة المسير، وبدون الحدود يترك افتراض الخادم', () => {
  assert.equal(ui.employeeCreateSalaryPeriod(context(), '', salary({ basicSalary: '', currency: 'AED' })), undefined, 'بلا أجر لا شهر ولا فحص عملة')
  assert.equal(ui.employeeCreateSalaryPeriod(context(), '2026-08', salary({ basicSalary: '0.00' })), undefined)
  assert.equal(ui.employeeCreateSalaryPeriod(context(), '', salary()), '2026-09')
  assert.equal(ui.employeeCreateSalaryPeriod(context(), '2026-08', salary({ basicSalary: '', housingAllowance: '1500.5', currency: 'EGP' })), '2026-08')
  assert.equal(ui.employeeCreateSalaryPeriod(null, '', salary()), undefined, 'تعذر الحدود: الخادم يطبق الافتراض')
  for (const currency of ['', 'AED', 'USD']) assert.throws(() => ui.employeeCreateSalaryPeriod(context(), '', salary({ currency })), /عملة الأجر/)
  assert.throws(() => ui.employeeCreateSalaryPeriod(context(), '2026-07', salary()), /لا يسري قبل راتب شهر التعيين 2026-08/)
  assert.throws(() => ui.employeeCreateSalaryPeriod(context(), '2026-10', salary()), /على الأكثر؛ الزيادة من شهر لاحق/)
  assert.throws(() => ui.employeeCreateSalaryPeriod(context(), '2026-9', salary()), /بصيغة شهر صحيحة/)
  assert.equal(ui.employeeCreateSalaryPeriod(context({ minPayrollPeriod: null }), '2019-01', salary()), '2019-01')
})

test('جلب الحدود يرسل تاريخ التعيين وحده ويرفض ردًا لا يطابقه أو ناقصًا', async () => {
  await fetched(context(), async calls => {
    assert.deepEqual(await ui.fetchEmployeeSalaryStartContext('2026-08-20'), context())
    const url = new URL(calls[0].url)
    assert.equal(url.pathname, '/api/employees/salary-start-context'); assert.equal(url.search, '?hireDate=2026-08-20')
  })
  await fetched(context({ hireDate: null, hirePayrollPeriod: null, minPayrollPeriod: null }), async calls => {
    await ui.fetchEmployeeSalaryStartContext('')
    assert.equal(new URL(calls[0].url).search, '')
  })
  await fetched(context(), async calls => { await assert.rejects(ui.fetchEmployeeSalaryStartContext('2026-02-30'), /غير صالح/); assert.equal(calls.length, 0) })
  for (const mutate of [r => r.hireDate = '2026-08-21', r => r.defaultPayrollPeriod = '2026-9', r => r.cycleStartDay = 32, r => r.minPayrollPeriod = 'x', r => delete r.maxPayrollPeriod]) {
    const response = context(); mutate(response)
    await fetched(response, async () => assert.rejects(ui.fetchEmployeeSalaryStartContext('2026-08-20'), /تعذر تحديد شهر سريان أجر التعيين/))
  }
})

test('خطوة البيانات المالية في نموذج الإضافة تعرض «يسري من راتب شهر» لأجر التعيين، وعملات المسير SAR وEGP فقط', () => {
  const React = require('../../node_modules/react'), Module = require('node:module')
  const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
  const load = Module._load, useState = React.useState
  let first = true
  Module._load = function (request, parent, isMain) {
    if (request === '@/components/layout') return { MainLayout: ({ children }) => React.createElement('main', null, children) }
    if (request === 'next/link') return ({ children, ...props }) => React.createElement('a', props, children)
    return load.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, isMain)
  }
  React.useState = initial => { if (first) { first = false; return useState(3) } return useState(initial) }
  let html
  try {
    const Form = require('../../src/components/EmployeeForm').default
    html = renderToStaticMarkup(React.createElement(Form, { mode: 'add', onSubmit: async () => {}, submitting: false, error: '' }))
  } finally { Module._load = load; React.useState = useState }
  assert.match(html, /توثيق أجر التعيين/)
  assert.match(html, /يسري من راتب شهر/)
  assert.equal((html.match(/<input[^>]*type="month"[^>]*>/g) ?? []).length, 1)
  assert.match(html, /أيام الفترة قبل تاريخ التعيين لا تُحسب غيابًا ولا خصمًا/)
  assert.match(html, /<option value="SAR"[ >]/); assert.match(html, /<option value="EGP"[ >]/)
  assert.doesNotMatch(html, /<option value="AED"/)
})
