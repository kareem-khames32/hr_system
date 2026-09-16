// التأمينات الاجتماعية (السعودية / المصرية) — حساب نقي بلا قاعدة بيانات: الحدود، النسب حسب الجنسية، غير المسجل = صفر، والقص لمنزلتين.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const si = require('../src/payroll/social-insurance')

const settings = si.SOCIAL_INSURANCE_DEFAULTS
const calc = (input, custom = settings) => si.computeSocialInsurance({ system: 'SAUDI', registered: true, declaredSalary: 10000, fallbackSalary: 8000, nationality: 'سعودي', ...input }, custom)

test('السعودي: 9.75% موظف و11.75% صاحب عمل على الأجر التأميني المسجل', () => {
  const result = calc({})
  assert.equal(result.kind, 'SOCIAL_INSURANCE')
  assert.equal(result.label, 'التأمينات الاجتماعية (حصة الموظف)')
  assert.equal(result.applies, true); assert.equal(result.category, 'SAUDI'); assert.equal(result.salarySource, 'DECLARED')
  assert.equal(result.insuredSalary, 10000); assert.equal(result.employeeShare, 975); assert.equal(result.employerShare, 1175)
})

test('غير السعودي في النظام السعودي: 0% موظف و2% صاحب عمل', () => {
  const result = calc({ nationality: 'مصري' })
  assert.equal(result.category, 'NON_SAUDI'); assert.equal(result.employeeShare, 0); assert.equal(result.employerShare, 200)
  assert.equal(calc({ nationality: null }).category, 'NON_SAUDI')
})

test('المصري: 11% و18.75% لكل الجنسيات، بحدود 2700 / 16700', () => {
  const result = calc({ system: 'EGYPTIAN', declaredSalary: 10000, nationality: 'سعودي' })
  assert.equal(result.category, 'EGYPTIAN'); assert.equal(result.employeeShare, 1100); assert.equal(result.employerShare, 1875)
  const low = calc({ system: 'EGYPTIAN', declaredSalary: 1000 })
  assert.equal(low.insuredSalary, 2700); assert.equal(low.employeeShare, 297); assert.equal(low.employerShare, 506.25)
  const high = calc({ system: 'EGYPTIAN', declaredSalary: 50000 })
  assert.equal(high.insuredSalary, 16700); assert.equal(high.employeeShare, 1837); assert.equal(high.employerShare, 3131.25)
})

test('الحد الأدنى والأقصى للأجر التأميني في السعودي', () => {
  assert.equal(calc({ declaredSalary: 1000 }).insuredSalary, 1500)
  assert.equal(calc({ declaredSalary: 1000 }).employeeShare, 146.25)
  assert.equal(calc({ declaredSalary: 60000 }).insuredSalary, 45000)
  assert.equal(calc({ declaredSalary: 60000 }).employeeShare, 4387.5)
})

test('بدون أجر تأميني مسجل: يتحسب على الأساسي', () => {
  const result = calc({ declaredSalary: null })
  assert.equal(result.salarySource, 'BASIC'); assert.equal(result.insuredSalary, 8000); assert.equal(result.employeeShare, 780)
  assert.equal(calc({ declaredSalary: '0' }).salarySource, 'BASIC')
  const none = calc({ declaredSalary: null, fallbackSalary: 0 })
  assert.equal(none.applies, false); assert.equal(none.skipReason, 'NO_SALARY'); assert.equal(none.employeeShare, 0)
})

test('غير مسجل أو فرع بدون نظام = صفر', () => {
  for (const registered of [false, null, undefined]) {
    const result = calc({ registered })
    assert.equal(result.applies, false); assert.equal(result.skipReason, 'NOT_REGISTERED'); assert.equal(result.employeeShare, 0); assert.equal(result.employerShare, 0)
  }
  for (const system of ['NONE', null, 'foo']) {
    const result = calc({ system })
    assert.equal(result.system, 'NONE'); assert.equal(result.skipReason, 'NO_SYSTEM'); assert.equal(result.employeeShare, 0)
  }
})

test('الفلوس بالقص لمنزلتين مش بالتقريب', () => {
  // 3333.33 × 9.75% = 324.999675 ← 324.99 (التقريب كان هيدي 325.00)
  assert.equal(calc({ declaredSalary: 3333.33 }).employeeShare, 324.99)
  assert.equal(calc({ declaredSalary: 1734.56 }).employeeShare, 169.11) // 169.1196
  assert.equal(calc({ declaredSalary: 1734.56, nationality: 'هندي' }).employerShare, 34.69) // 34.6912
  // الأجر نفسه يتقص: 5000.999 ← 5000.99
  assert.equal(calc({ declaredSalary: 5000.999 }).insuredSalary, 5000.99)
})

test('الإعدادات: قراءة القيم والرجوع للافتراضي والتحقق', () => {
  const parsed = si.parseSocialInsuranceSettings(new Map([
    ['social_insurance.saudi.saudi_employee_pct', '10'], ['social_insurance.saudi.min_salary', 'abc'], ['social_insurance.egyptian.max_salary', ''],
  ]))
  assert.equal(parsed.saudiEmployeePct, 10); assert.equal(parsed.saudiMinSalary, 1500); assert.equal(parsed.egyptianMaxSalary, 16700)
  assert.equal(calc({}, parsed).employeeShare, 1000)
  assert.equal(si.socialInsuranceSettingsIssue(settings), null)
  assert.match(si.socialInsuranceSettingsIssue({ ...settings, saudiEmployeePct: 120 }), /من 0 لـ 100/)
  assert.match(si.socialInsuranceSettingsIssue({ ...settings, egyptianMinSalary: 20000 }), /الحد الأدنى للأجر أكبر/)
  assert.match(si.socialInsuranceSettingsIssue({ ...settings, saudiMaxSalary: -1 }), /أرقام موجبة/)
  assert.match(si.socialInsuranceSettingsIssue({ ...settings, saudiEmployerPct: 1.234 }), /رقمين بعد العلامة/)
  assert.equal(si.normalizeInsuranceSystem('egyptian'), 'EGYPTIAN')
})
