'use strict'
// العملة تبع الفرع (قرار المالك 30 سبتمبر) — منطق الواجهة وReact SSR بس؛ لا SQL ولا خدمة ولا تعديل بيانات:
// src/lib/currency.ts بقى يقرا سياق العملة لأي مستخدم داخل (مفيش بوابة settings.manage ولا «ر.س» افتراضي)، وعملة الشاشة حسب الفرع،
// ونموذج الموظف ومعادلات الرواتب من غير اختيار عملة، وشاشة الفروع بدولة الفرع وعملتها وتأمينات دولتها بس.
const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const root = path.resolve(__dirname, '../..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

// جلسة متصفح مصغرة: التوكن والمستخدم في localStorage، وكاش السياق في sessionStorage
function storage() {
  const values = new Map()
  return { getItem: key => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key), clear: () => values.clear() }
}
global.window = { location: { pathname: '/', href: '/' } }
global.localStorage = storage()
global.sessionStorage = storage()
const signIn = user => { localStorage.setItem('hr_access_token', `token-${user.id}`); localStorage.setItem('hr_current_user', JSON.stringify(user)) }
const employee = { id: 11, email: 'e@x.test', displayName: 'موظف', role: 'employee', branchId: 1, employeeId: 21, permissions: [] }
const branchHr = { id: 12, email: 'h@x.test', displayName: 'hr', role: 'hr', branchId: 2, employeeId: 22, permissions: ['employees.view'], branchIds: [2] }
const admin = { id: 13, email: 'a@x.test', displayName: 'admin', role: 'super_admin', branchId: null, employeeId: null, permissions: ['*'] }

const currency = require('../../src/lib/currency')
const context = (extra = {}) => ({ defaultCurrency: 'SAR', ownCurrency: 'EGP', branches: [{ id: 1, currency: 'EGP' }, { id: 2, currency: 'SAR' }], ...extra })

async function fetched(response, fn) {
  const original = global.fetch, calls = []
  global.fetch = async (url, options) => { calls.push({ url: String(url), options }); return { ok: true, status: 200, text: async () => JSON.stringify(response) } }
  try { return await fn(calls) } finally { global.fetch = original }
}
afterEach(() => { currency.invalidateCurrency(); localStorage.clear(); sessionStorage.clear() })

test('currency.ts: مفيش بوابة settings.manage ولا قراءة إعدادات ولا «ر.س» افتراضي — السياق من /settings/currency-context', () => {
  const source = read('src/lib/currency.ts')
  assert.doesNotMatch(source, /settings\.manage/)
  assert.doesNotMatch(source, /fetchConfig|\/settings\/config/)
  assert.ok(source.includes("apiFetch<CurrencyContext>('/settings/currency-context')"))
  assert.equal(currency.currencyLabel('EGP'), 'ج.م'); assert.equal(currency.currencyLabel('SAR'), 'ر.س')
  assert.equal(currency.currencyLabel(null), '', 'العملة الغايبة فاضية — مش ريال')
  assert.equal(currency.currencyName('EGP'), 'جنيه مصري'); assert.equal(currency.currencyName('SAR'), 'ريال سعودي')
})

test('القاعدة المشتركة مع الخادم: مصر جنيه، السعودية ريال، ومن غير دولة (أو رمز قديم) عملة النظام', () => {
  const rule = require('../src/org/branch-currency')
  assert.equal(currency.branchCurrency, rule.branchCurrency, 'الواجهة بتستورد نفس دالة الخادم')
  assert.equal(rule.branchCurrency('EG', 'SAR'), 'EGP'); assert.equal(rule.branchCurrency(' sa ', 'EGP'), 'SAR')
  assert.equal(rule.branchCurrency(null, 'EGP'), 'EGP'); assert.equal(rule.branchCurrency('', 'SAR'), 'SAR'); assert.equal(rule.branchCurrency('AE', 'EGP'), 'EGP')
  assert.equal(rule.branchCurrency(null, undefined), 'SAR', 'عملة النظام الغايبة = افتراض البذرة')
  assert.deepEqual(rule.branchInsuranceOptions('EG'), ['NONE', 'EGYPTIAN']); assert.deepEqual(rule.branchInsuranceOptions('SA'), ['NONE', 'SAUDI'])
  assert.deepEqual(rule.branchInsuranceOptions(null), ['NONE', 'SAUDI', 'EGYPTIAN'])
  assert.equal(rule.branchInsuranceIssue('EG', 'EGYPTIAN'), null); assert.equal(rule.branchInsuranceIssue('SA', 'NONE'), null); assert.equal(rule.branchInsuranceIssue(null, 'SAUDI'), null)
  assert.match(rule.branchInsuranceIssue('EG', 'SAUDI'), /فرع مصر تأميناته «بدون تأمينات» أو «التأمينات المصرية» بس/)
  assert.match(rule.branchInsuranceIssue('SA', 'EGYPTIAN'), /فرع السعودية/)
})

test('عملة الشاشة: الفرع المحدد بعملته؛ من غير فرع — الموظف بعملة فرعه، والإداري بفرعه الوحيد أو العملة المشتركة وإلا عملة النظام', () => {
  const pick = currency.currencyCodeFor
  assert.equal(pick(null, 1, admin), '', 'قبل ما السياق يتقري: فاضي مش ريال')
  assert.equal(pick(context(), 2, employee), 'SAR', 'فرع محدد = عملته حتى للموظف')
  assert.equal(pick(context(), undefined, employee), 'EGP', 'الموظف من غير صلاحيات = عملة فرعه هو')
  assert.equal(pick(context({ ownCurrency: null, defaultCurrency: 'EGP' }), undefined, employee), 'EGP', 'موظف من غير فرع = عملة النظام')
  assert.equal(pick(context(), 99, employee), 'EGP', 'فرع برّه النطاق = القاعدة العامة (من غير تسريب)')
  assert.equal(pick(context({ branches: [{ id: 2, currency: 'SAR' }] }), undefined, branchHr), 'SAR', 'نطاق فرع واحد = عملته')
  assert.equal(pick(context({ branches: [{ id: 1, currency: 'EGP' }, { id: 3, currency: 'EGP' }] }), undefined, admin), 'EGP', 'كل الفروع بعملة واحدة = هي')
  assert.equal(pick(context(), undefined, admin), 'SAR', 'فروع بعملات مختلفة = عملة النظام')
  assert.equal(pick(context({ defaultCurrency: 'EGP' }), undefined, admin), 'EGP')
})

test('السياق بيتقري لموظف من غير أي صلاحية، ويتخزن للجلسة بحسابه، ويتمسح بـ invalidateCurrency', async () => {
  signIn(employee)
  await fetched(context(), async calls => {
    assert.equal(await currency.loadCurrency(), 'ج.م', 'الموظف بيشوف عملة فرعه (كانت «ر.س» لأي حد من غير settings.manage)')
    assert.equal(calls.length, 1)
    assert.equal(new URL(calls[0].url).pathname, '/api/settings/currency-context')
    assert.equal(calls[0].options.headers.Authorization, `Bearer token-${employee.id}`)
    assert.equal(await currency.loadCurrency(2), 'ر.س')
    assert.equal(calls.length, 1, 'من كاش الجلسة')
    assert.equal(JSON.parse(sessionStorage.getItem('hr_currency_context')).userId, employee.id)
    currency.invalidateCurrency()
    assert.equal(sessionStorage.getItem('hr_currency_context'), null)
    await currency.loadCurrencyContext()
    assert.equal(calls.length, 2, 'بعد المسح يتقري تاني')
  })
  // حساب تاني في نفس التبويب مايورثش سياق اللي قبله
  signIn(branchHr)
  await fetched(context({ ownCurrency: 'SAR', branches: [{ id: 2, currency: 'SAR' }] }), async calls => {
    assert.equal(await currency.loadCurrency(), 'ر.س'); assert.equal(calls.length, 1)
  })
  // رد تالف أو فشل الخادم = من غير رمز عملة (مش ريال)
  currency.invalidateCurrency()
  await fetched({ nonsense: true }, async () => assert.equal(await currency.loadCurrency(), ''))
})

test('نموذج الموظف: من غير اختيار عملة — سطر قراءة «العملة: … (حسب الفرع)» والعملة مابتتبعتش في الإضافة', () => {
  const form = read('src/components/EmployeeForm.tsx')
  assert.doesNotMatch(form, /setField\('currency'/, 'مفيش خانة بتغيّر العملة')
  assert.doesNotMatch(form, /<option value="(SAR|EGP|AED)"/)
  assert.ok(form.includes("`العملة: ${currencyName(branchCurrencyCode)} (حسب الفرع)`"))
  assert.doesNotMatch(form, /payload\.currency\s*=/, 'الإضافة مابتبعتش عملة — الخادم بيحط عملة الفرع')
  assert.ok(form.includes('{currencyLabel(branchCurrencyCode)}'), 'إجمالي الراتب بعملة الفرع')
})

test('معادلات الرواتب: من غير اختيار عملة — الخادم بيحطها عند الحفظ', () => {
  const React = require('../../node_modules/react')
  const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
  const { PolicySettingsFields } = require('../../src/components/PayrollPolicySetEditor')
  const { DEFAULT_POLICY_SETTINGS } = require('../../src/lib/payroll-policies-api')
  const html = renderToStaticMarkup(React.createElement(PolicySettingsFields, { value: { ...DEFAULT_POLICY_SETTINGS }, onChange() {} }))
  assert.doesNotMatch(html, /<option value="(SAR|EGP)"/)
  assert.match(html, /العملة بتتحدد لوحدها: معادلات الفرع بعملة الفرع \(من دولته\)، ومعادلات كل الشركة بعملة النظام/)
  assert.match(html, /ساعات العمل اليومية/)
})

test('شاشة الفروع: «دولة الفرع» مصر/السعودية بعملتها، وتأمينات دولتها بس، وتنبيه للفرع المختلف، ومسح كاش العملة بعد الحفظ', () => {
  const page = read('src/app/settings/branches/page.tsx')
  for (const text of ['دولة الفرع', 'BRANCH_COUNTRIES.map((code) =>', 'العملة: {currencyText(formData.country, defaultCurrency)}',
    'branchInsuranceOptions(formData.country).includes(value)', 'branchInsuranceIssue(branch.country, branch.insuranceSystem)',
    "اختار دولة الفرع (مصر أو السعودية) — منها عملة الفرع ونظام تأميناته"]) {
    assert.ok(page.includes(text), text)
  }
  assert.ok((page.match(/invalidateCurrency\(\)/g) ?? []).length >= 2, 'بعد حفظ الفرع وتغيير حالته')
  assert.doesNotMatch(page, /placeholder="مثال: SA"/, 'مفيش خانة نص حر للدولة')
})

test('الشاشات الخاصة بموظف بتاخد عملة فرعه (مش العمود المحفوظ في ملفه)', () => {
  for (const [file, text] of [
    ['src/app/employees/[id]/terminate/page.tsx', 'useCurrency(employee?.branchId)'],
    ['src/app/employees/[id]/settlement/page.tsx', 'useCurrency(det?.employee?.branchId)'],
    ['src/app/offboarding/[id]/page.tsx', 'useCurrency(det?.employee?.branchId)'],
    ['src/app/payroll/payslip/[id]/page.tsx', 'useCurrency(employee?.branchId)'],
    ['src/app/employees/[id]/page.tsx', 'currencyCodeFor(currencyContext, e.branchId)'],
    ['src/app/profile/page.tsx', 'useOwnCurrency()'],
    ['src/components/payroll/BonusesWorkspace.tsx', 'currencyOf(row.employee.branchId)'],
    ['src/components/payroll/TypedDeductionsWorkspace.tsx', 'currencyOf(row.employee.branchId)'],
  ]) {
    const source = read(file)
    assert.ok(source.includes(text), `${file}: ${text}`)
    assert.doesNotMatch(source, /currencyLabel\((employee|e)\.currency\)/, file)
  }
})
