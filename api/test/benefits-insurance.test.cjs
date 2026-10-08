// B5.2 (أ) — التأمين الطبي: حالة الوثيقة، وقواعد الوثيقة والفئة، وأهلية الفئة بالدرجة، ومصدر الكود. حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/benefits/insurance')
const registry = require('../src/modules-registry/registry')
const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')

test('BIU-01: حالة الوثيقة — لسه مابدأتش، سارية، هتنتهي في 60 يوم، انتهت، متعطّلة', () => {
  const policy = { startDate: '2026-01-01', endDate: '2026-12-31', isActive: true }
  assert.deepEqual(['2025-12-31', '2026-01-01', '2026-11-01', '2026-11-02', '2026-12-31', '2027-01-01'].map(today => rules.policyState(policy, today)),
    [{ state: 'UPCOMING', daysLeft: null }, { state: 'ACTIVE', daysLeft: 364 }, { state: 'EXPIRING', daysLeft: 60 }, { state: 'EXPIRING', daysLeft: 59 }, { state: 'EXPIRING', daysLeft: 0 }, { state: 'EXPIRED', daysLeft: -1 }])
  assert.deepEqual([rules.policyState({ ...policy, isActive: false }, '2026-06-01'), rules.policyState({ ...policy, isActive: 1 }, '2026-06-01').state], [{ state: 'DISABLED', daysLeft: null }, 'ACTIVE'])
  assert.deepEqual(['2025-12-31', '2026-06-01', '2026-12-31', '2027-01-01'].map(today => rules.policyCovers(policy, today)), [false, true, true, false])
  assert.deepEqual(Object.keys(rules.POLICY_STATE_LABELS), ['UPCOMING', 'ACTIVE', 'EXPIRING', 'EXPIRED', 'DISABLED'])
})

test('BIU-02: بيانات الوثيقة والفئة — المطلوب والحدود، والدولة مصر أو السعودية أو فاضية، والحصة من غير تقريب صامت', () => {
  const good = { name: ' وثيقة 2026 ', insurerName: ' بوبا ', policyNumber: ' P-1 ', country: 'SA', startDate: '2026-01-01', endDate: '2026-12-31', note: '' }
  assert.deepEqual(rules.policyFields(good), { fields: { name: 'وثيقة 2026', insurerName: 'بوبا', policyNumber: 'P-1', country: 'SA', startDate: '2026-01-01', endDate: '2026-12-31', note: null }, error: null })
  assert.equal(rules.policyFields({ ...good, country: '' }).fields.country, null)
  assert.deepEqual([{ ...good, name: '' }, { ...good, insurerName: null }, { ...good, country: 'AE' }, { ...good, startDate: '2026-02-30' }, { ...good, endDate: '2025-12-31' }, { ...good, policyNumber: 'x'.repeat(61) },
    { ...good, name: 5 }, null].map(body => rules.policyFields(body).fields), [null, null, null, null, null, null, null, null])
  assert.deepEqual(rules.classFields({ name: ' أ ', employeeShareMonthly: 150.5, isDefault: true, gradeIds: [3, 1, 3] }), { fields: { name: 'أ', employeeShareMonthly: 150.5, isDefault: true, gradeIds: [1, 3] }, error: null })
  assert.deepEqual(rules.classFields({ name: 'ب' }).fields, { name: 'ب', employeeShareMonthly: 0, isDefault: false, gradeIds: [] })
  assert.deepEqual([{ name: '' }, { name: 'ب', employeeShareMonthly: -1 }, { name: 'ب', employeeShareMonthly: 10.555 }, { name: 'ب', employeeShareMonthly: '10' }, { name: 'ب', isDefault: 'yes' }, { name: 'ب', gradeIds: [0] },
    { name: 'ب', gradeIds: 'all' }].map(body => rules.classFields(body).fields), [null, null, null, null, null, null, null])
})

test('BIU-03: الأهلية — وثيقة دولة الفرع السارية (ثم وثيقة كل الشركة)، والفئة بالدرجة ثم الافتراضية ثم من غير فئة', () => {
  const policies = [{ id: 1, name: 'السعودية', country: 'SA', startDate: '2026-01-01', endDate: '2026-12-31', isActive: true }, { id: 2, name: 'عامة', country: null, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true },
    { id: 3, name: 'مصر منتهية', country: 'EG', startDate: '2025-01-01', endDate: '2025-12-31', isActive: true }, { id: 4, name: 'السعودية أحدث', country: 'SA', startDate: '2026-06-01', endDate: '2027-05-31', isActive: true },
    { id: 5, name: 'السعودية متعطّلة', country: 'SA', startDate: '2026-07-01', endDate: '2027-06-30', isActive: false }]
  const classes = [{ id: 10, policyId: 1, name: 'أ', isDefault: false, isActive: true, gradeIds: [7] }, { id: 11, policyId: 1, name: 'ج', isDefault: true, isActive: true, gradeIds: [] },
    { id: 12, policyId: 2, name: 'عامة أ', isDefault: false, isActive: true, gradeIds: [7] }, { id: 13, policyId: 4, name: 'VIP', isDefault: false, isActive: false, gradeIds: [7] }]
  const of = (country, gradeId, today = '2026-03-01') => { const found = rules.eligibleCoverage({ country, gradeId }, policies, classes, today); return found && [found.policy.id, found.insuranceClass?.id ?? null, found.by] }
  // السعودي: وثيقة السعودية؛ بدرجته، أو الافتراضية؛ والمصري: وثيقته انتهت ← العامة (من غير افتراضية = من غير فئة)
  assert.deepEqual([of('SA', 7), of('SA', 9), of('SA', null), of('EG', 7), of('EG', 9), of(null, 7), of('sa', 7)], [[1, 10, 'GRADE'], [1, 11, 'DEFAULT'], [1, 11, 'DEFAULT'], [2, 12, 'GRADE'], [2, null, null], [2, 12, 'GRADE'], [1, 10, 'GRADE']])
  // من يونيو: وثيقة السعودية الأحدث هي السارية، وفئتها متعطّلة = من غير فئة
  assert.deepEqual(of('SA', 7, '2026-07-15'), [4, null, null])
  assert.equal(rules.eligibleCoverage({ country: 'SA', gradeId: 7 }, policies, classes, '2028-01-01'), null, 'مفيش وثيقة سارية')
})

test('BIU-04: مصدر الكود — الموديول مقفول افتراضيًا بصلاحيته، والكتابة لحساب بكل الفروع تحت قفل صف الوثيقة، ومفيش مسح ولا مبلغ', () => {
  const module = registry.MODULES.benefits
  assert.deepEqual([module.defaultEnabled, module.preset, module.group, module.dependsOn, module.softUses, module.permissions, module.routes, module.core],
    [false, 'full', 'people', ['dependents'], ['payroll', 'offboarding'], ['benefits.manage'], ['/benefits'], false])
  assert.deepEqual(Object.keys(module.features), ['benefits.tickets'])
  const controller = read('benefits/benefits.controller.ts')
  assert.match(controller, /@RequireModule\('benefits'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)/)
  assert.deepEqual([(controller.match(/@Perm\('benefits\.manage'\)/g) ?? []).length, (controller.match(/@(Get|Post|Put|Patch|Delete)\(/g) ?? []).length, /@Delete\(/.test(controller)], [16, 16, false]) // (ب): + 7 مسارات للاشتراكات والطلبات؛ (ج): + الحصص والتذاكر
  const service = read('benefits/benefits.service.ts')
  assert.equal((service.match(/assertCompanyWideWrite\(user\)/g) ?? []).length, 5, 'الوثيقة وتعديلها والفئة وتعديلها (واستحقاق التذاكر — ج) لحساب بكل الفروع')
  assert.match(service, /findOne\(\{ where: \{ id \}, lock: \{ mode: 'pessimistic_write' \} \}\)/)
  assert.equal((service.match(/await this\.lockPolicy\(em, /g) ?? []).length, 3, 'تعديل الوثيقة وإضافة الفئة وتعديلها تحت قفل صف الوثيقة')
  assert.doesNotMatch(service, /getRepository\(InsurancePolicy\)\.delete|getRepository\(InsuranceClass\)\.delete|employee_obligations|deduction/i, 'مفيش مسح وثيقة أو فئة، ومفيش خصم')
  assert.match(service, /people\.filter\(row => inBranchScope\(scope, row\.branchId == null \? null : Number\(row\.branchId\)\)\)/)
  assert.doesNotMatch(read('benefits/insurance.ts').replace(/export async function insuranceReady[\s\S]*$/, ''), /getRepository|\.query\(/)
  assert.ok(JSON.stringify(require('../src/auth/permissions')).includes('benefits.manage'))
})
