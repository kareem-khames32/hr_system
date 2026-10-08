'use strict'
// B4.2: حزمة الدولة — فحص من غير قاعدة (الدورة الفعلية في statutory-pack.integration.cjs):
//  SP-01) البيانات: كل صف في البذرة لمفتاح في الكتالوج بخاناته بالظبط وبحدود الأعمدة، والمفاتيح الجديدة مرجعية بس (ولا حاسبة بتقراها)،
//         وأرقام بطاقات C اللي ليها مثال محسوب بتطلّع نفس الناتج.
//  SP-02) القواعد والربط: منظّفات القيم والمصدر، والتعديل لمدير النظام بس وتحت قفل صف التعريف وبسطر تدقيق، والمسارات والشاشة.
// Run (من api/): node --test test/statutory-pack.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { STATUTORY_SEED, STATUTORY_UNDATED, SA_GOSI_NEW_TRACK, EG_INSURANCE_WAGE_LIMITS } = require('../src/statutory/statutory-data')
const { STATUTORY_CATALOG, statutoryKeyInfo } = require('../src/statutory/statutory-catalog')
const { statutoryAt, statutoryNumber } = require('../src/statutory/statutory')
const pack = require('../src/statutory/statutory-pack.service')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const refuses = (work, label) => assert.throws(work, error => error?.getStatus?.() === 400, label)
const entries = STATUTORY_SEED.map(seed => ({ ...seed, verified: false }))
const READ_BY_CALCULATORS = [SA_GOSI_NEW_TRACK, EG_INSURANCE_WAGE_LIMITS]
// B4.4: مفاتيح بتقراها حاسبة ورا إعداد مقفول افتراضيًا (كل مفتاح مذكور في ملف واحد): الضريبة (ومعاينتها)، وصندوق الشهداء
const READ_BY_PREVIEW = { 'eg.salary_tax.brackets': 'payroll/eg-salary-tax.ts', 'eg.salary_tax.high_income': 'payroll/eg-salary-tax.ts', 'eg.martyrs_fund': 'payroll/payroll-statutory-run.ts',
  // B4.4 (د): التأمين الصحي الشامل (ورا إعداده)، وتقرير صندوق التدريب (قراءة بس)
  'eg.health_insurance': 'payroll/payroll-statutory-run.ts', 'eg.training_fund': 'payroll/eg-training-fund.ts' }

test('SP-01: every seed row belongs to a catalog key with exactly its codes, the new keys are reference data no calculator reads, and the worked examples of the C cards hold', () => {
  assert.equal(STATUTORY_SEED.length, 27)
  assert.equal(STATUTORY_CATALOG.length, 22)
  const dated = new Set()
  for (const seed of STATUTORY_SEED) {
    const info = statutoryKeyInfo(seed.country, seed.key)
    assert.ok(info, `${seed.country}/${seed.key} في الكتالوج`)
    assert.deepEqual(Object.keys(seed.values).sort(), Object.keys(info.codes).sort(), `${seed.key}: خانات الصف = خانات المفتاح`)
    for (const [code, value] of Object.entries(seed.values)) assert.match(value, /^\d{1,14}(\.\d{1,4})?$/, `${seed.key}.${code}`)
    assert.ok(seed.key.length <= 80 && seed.source.length <= 300 && Object.keys(seed.values).every(code => code.length <= 60), `${seed.key}: حدود الأعمدة`)
    assert.ok(seed.key.startsWith(seed.country.toLowerCase() + '.'), seed.key)
    assert.match(seed.effectiveFrom, /^\d{4}-\d{2}-\d{2}$/)
    // مصدر من بطاقة C، والبطاقة اللي ماذكرتش تاريخ بتقول كده
    assert.match(seed.source, /^C-(EG|SA)-0\d: /, seed.key)
    if (seed.effectiveFrom === STATUTORY_UNDATED) assert.match(seed.source, /من غير تاريخ سريان في البطاقة/, seed.key)
    const id = `${seed.country}|${seed.key}|${seed.effectiveFrom}`
    assert.equal(dated.has(id), false, id); dated.add(id)
  }
  for (const info of STATUTORY_CATALOG) {
    assert.ok(STATUTORY_SEED.some(seed => seed.country === info.country && seed.key === info.key), `${info.key}: له صف في البذرة`)
    assert.equal(info.usedBy !== null, READ_BY_CALCULATORS.includes(info.key) || info.key in READ_BY_PREVIEW, `${info.key}: مين بيقراه`)
    if (info.key in READ_BY_PREVIEW) assert.match(info.usedBy, /مقفول افتراضيًا|للعرض بس/, info.key)
    assert.ok(info.label.length > 2 && /^C-(EG|SA)-0\d$/.test(info.card) && Object.values(info.codes).every(label => label.length > 1))
  }
  assert.equal(new Set(STATUTORY_CATALOG.map(info => `${info.country}|${info.key}`)).size, STATUTORY_CATALOG.length)

  // ولا ملف برّه مجلد الحزمة بيذكر مفتاح من الجداد: تحميلهم مابيغيّرش أي حساب
  const fresh = STATUTORY_CATALOG.map(info => info.key).filter(key => !READ_BY_CALCULATORS.includes(key))
  assert.equal(fresh.length, 20)
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : entry.name.endsWith('.ts') ? [path.join(dir, entry.name)] : [])
  const source = path.join(root, 'api', 'src')
  for (const file of walk(source).filter(file => !file.startsWith(path.join(source, 'statutory') + path.sep))) {
    const text = fs.readFileSync(file, 'utf8')
    const relative = path.relative(source, file).split(path.sep).join('/')
    for (const key of fresh) assert.equal(text.includes(`'${key}'`), READ_BY_PREVIEW[key] === relative, `${path.relative(root, file)} بيقرا ${key}`)
  }

  // أمثلة بطاقات C بالأرقام المحمّلة (مش حاسبة منتج — إثبات إن البيانات اتنقلت صح)
  const tax = statutoryAt(entries, 'EG', 'eg.salary_tax.brackets', '2026-10-31'), n = code => statutoryNumber(tax, code)
  const annualTax = base => { let total = 0, from = 0; for (let band = 1; band <= 6; band += 1) { const to = n(`band_${band}_to`); total += Math.max(0, Math.min(base, to) - from) * n(`band_${band}_pct`) / 100; from = to } return total + Math.max(0, base - from) * n('band_top_pct') / 100 }
  const insurance = statutoryAt(entries, 'EG', 'eg.insurance.rates', '2026-10-31')
  const monthlyNet = 15000 - 15000 * statutoryNumber(insurance, 'employee_pct') / 100
  assert.deepEqual([monthlyNet, monthlyNet * 12 - n('personal_exemption'), annualTax(monthlyNet * 12 - n('personal_exemption')), annualTax(140200) / 12], [13350, 140200, 17790, 1482.5], 'C-EG-01: راتب 15,000 ← ضريبة 1,482.50 في الشهر')
  assert.equal(15000 * statutoryNumber(statutoryAt(entries, 'EG', 'eg.martyrs_fund', '2026-10-31'), 'employee_pct') / 100, 7.5, 'C-EG-04: 7.50')
  const eos = statutoryAt(entries, 'SA', 'sa.end_of_service', '2026-10-31'), e = code => statutoryNumber(eos, code)
  assert.equal((e('first_tier_years') * e('first_tier_months') + (7 - e('first_tier_years')) * e('later_months')) * 10000, 45000, 'C-SA-07: 7 سنين × 10,000 = 45,000')
  const old = statutoryAt(entries, 'SA', 'sa.gosi.old_track', '2026-10-31')
  assert.deepEqual([10000 * statutoryNumber(old, 'saudi_employee_pct') / 100, 10000 * statutoryNumber(old, 'saudi_employer_pct') / 100, 10000 * statutoryNumber(old, 'non_saudi_employer_pct') / 100], [975, 1175, 200], 'C-SA-01')
  // «خلص لما»: حد 2027 بتاريخ 1 يناير 2027 — ديسمبر بالقديم ويناير بالجديد
  const cap = date => statutoryNumber(statutoryAt(entries, 'EG', EG_INSURANCE_WAGE_LIMITS, date), 'max_salary')
  assert.deepEqual([cap('2026-12-22'), cap('2026-12-31'), cap('2027-01-01'), cap('2027-01-22')], [16700, 16700, 19300, 19300])
  assert.equal(statutoryAt(entries, 'EG', 'eg.leave.annual', '2025-08-31'), null, 'قبل تاريخ السريان مفيش قيمة')
})

test('SP-02: value and source cleaners, edits for the system administrator only under the definition row lock with an audit line, the routes and the screen', () => {
  const info = statutoryKeyInfo('EG', 'eg.deduction_caps')
  assert.deepEqual(pack.cleanStatutoryValues(info, { loan_installment_pct: 10, garnishment_pct: ' 25.50 ', alimony_pct: '50' }, true), { loan_installment_pct: '10', garnishment_pct: '25.5', alimony_pct: '50' })
  assert.deepEqual([pack.cleanStatutoryValues(info, { alimony_pct: '0' }, false), pack.cleanStatutoryValues(info, {}, false)], [{ alimony_pct: '0' }, {}])
  for (const bad of [null, [], 'x', { loan_installment_pct: 10 }, { loan_installment_pct: 10, garnishment_pct: 25, alimony_pct: 50, extra: 1 }, { loan_installment_pct: -1, garnishment_pct: 25, alimony_pct: 50 },
    { loan_installment_pct: '1.23456', garnishment_pct: 25, alimony_pct: 50 }, { loan_installment_pct: '1e3', garnishment_pct: 25, alimony_pct: 50 }, { loan_installment_pct: '', garnishment_pct: 25, alimony_pct: 50 },
    { loan_installment_pct: null, garnishment_pct: 25, alimony_pct: 50 }, { loan_installment_pct: '9'.repeat(15), garnishment_pct: 25, alimony_pct: 50 }]) refuses(() => pack.cleanStatutoryValues(info, bad, true), JSON.stringify(bad)?.slice(0, 60))
  for (const bad of [{ other: 1 }, { alimony_pct: 'x' }]) refuses(() => pack.cleanStatutoryValues(info, bad, false), JSON.stringify(bad))
  assert.deepEqual([pack.cleanStatutorySource('  قرار   وزاري 5 '), pack.cleanStatutorySource(''), pack.cleanStatutorySource(null), pack.cleanStatutorySource(undefined)], ['قرار وزاري 5', null, null, null])
  for (const bad of [5, 'ت'.repeat(301)]) refuses(() => pack.cleanStatutorySource(bad), 'source')

  const service = read('api/src/statutory/statutory-pack.service.ts')
  assert.match(service, /private assertAdmin\(user: JwtPayload\) \{\n    if \(user\.role !== 'super_admin'\) throw new ForbiddenException\(STATUTORY_ADMIN_ONLY\)/)
  const create = service.slice(service.indexOf('  async create('), service.indexOf('  /** تعديل صف'))
  const update = service.slice(service.indexOf('  async update('))
  assert.ok(create.indexOf('this.assertAdmin(user)') > 0 && create.indexOf('this.assertAdmin(user)') < create.indexOf('this.ds.transaction('), 'الإنشاء لمدير النظام قبل أي حاجة')
  assert.match(create, /statutoryKeyInfo\(input\.country, input\.key\)/, 'مفتاح من الكتالوج بس')
  assert.match(create, /if \(sqlErrorNumber\(error\) === 2601 \|\| sqlErrorNumber\(error\) === 2627\) throw new ConflictException\(STATUTORY_EXISTS\)/)
  const order = ['this.assertAdmin(user)', "lock: { mode: 'pessimistic_write' }", 'await this.valuesOf(em, row.id)', 'throw new BadRequestException(STATUTORY_NOTHING)', 'getRepository(StatutoryValue).update({ definitionId: row.id, code }, { value })',
    'await recordAudit('].map(part => update.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), 'مدير النظام ← قفل الصف ← القيم الحالية ← الكتابة بالخانات ← التدقيق: ' + order.join(','))
  assert.doesNotMatch(service, /\.save\(|effectiveFrom: input/, 'من غير حفظ كيان كامل، وتاريخ السريان مابيتعدّلش')
  assert.equal((service.match(/await recordAudit\(/g) ?? []).length, 2)
  const controller = read('api/src/statutory/statutory-pack.controller.ts')
  // B4.4 (ج): + عرض الحسابات القانونية وتفعيلها (التفعيل لمدير النظام في الخدمة)
  assert.equal((controller.match(/@Perm\('settings\.manage'\)/g) ?? []).length, 5)
  assert.match(controller, /@RequireModule\('platform'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Controller\('settings\/statutory'\)/)
  // البذرة لسه بتضيف الناقص بس والموجود مابيتلمسش (تعديل مدير النظام مابيتكتبش فوقه عند الإقلاع)
  assert.match(read('api/src/statutory/statutory.service.ts'), /if \(exists\) return/)

  assert.match(read('src/app/settings/page.tsx'), /href: '\/settings\/statutory', permission: 'settings\.manage'/)
  assert.match(read('src/components/layout/pageTitles.ts'), /\['\/settings\/statutory', 'حزمة الدولة'\]/)
  const page = read('src/app/settings/statutory/page.tsx')
  assert.match(page, /\{data\.canEdit && \(/)
  assert.match(page, /row\.verified \? 'اتأكد' : 'محتاج تحقق'/)
  assert.match(page, /بيانات مرجعية — مابتدخلش في أي حساب لسه/)
  assert.match(page, /disabled=\{!!row\}/, 'تاريخ السريان مابيتعدّلش من الشاشة')
})
