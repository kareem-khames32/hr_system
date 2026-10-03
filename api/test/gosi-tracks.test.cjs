// B1.5 — التأمينات السعودية بمسارين وحدود الأجر المصري المؤرخة: حساب نقي بلا قاعدة بيانات.
// المسار من تاريخ أول تسجيل، والقيمة السارية في آخر يوم في الفترة، و«القرار الأحدث» بين الجدول والشاشة في حدود مصر،
// والأساسي + السكن ورا الإعداد، والخانة الفاضية = نفس حساب النهارده بالحرف.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const si = require('../src/payroll/social-insurance')
const { STATUTORY_SEED } = require('../src/statutory/statutory-data')
const { statutoryAt, statutoryNumber } = require('../src/statutory/statutory')
const { normalizeGosiFirstRegistered } = require('../src/employees/employee-gosi-registration')

const settings = si.SOCIAL_INSURANCE_DEFAULTS
const entries = STATUTORY_SEED.map(seed => ({ ...seed, verified: false }))
const ratesAt = (date, since = null, housing = false) => si.socialInsuranceRatesAt(entries, date, since, housing)
const saudi = (input, rates) => si.computeSocialInsurance({ system: 'SAUDI', registered: true, declaredSalary: 10000, fallbackSalary: 8000, nationality: 'سعودي', ...input }, settings, rates)

test('المسار: أول تسجيل من 3 يوليو 2024 = الجديد، وقبله أو فاضي = القديم', () => {
  for (const value of [null, undefined, '', 'abc', '2024-07-02', '1999-01-01']) assert.equal(si.saudiTrackOf(value), 'OLD', String(value))
  for (const value of ['2024-07-03', '2025-01-15', '2026-07-03T00:00:00.000Z', new Date('2024-07-03T00:00:00Z')]) assert.equal(si.saudiTrackOf(value), 'NEW', String(value))
})

test('الجدول المؤرخ: القيمة السارية في آخر يوم في الفترة، والبيانات الأولية 5 نسب للمسار الجديد وحدّين لمصر', () => {
  assert.deepEqual(STATUTORY_SEED.map(seed => [seed.country, seed.effectiveFrom]), [['SA', '2024-07-03'], ['SA', '2025-07-03'], ['SA', '2026-07-03'],
    ['SA', '2027-07-03'], ['SA', '2028-07-03'], ['EG', '2026-01-01'], ['EG', '2027-01-01']])
  const pct = date => statutoryNumber(statutoryAt(entries, 'SA', 'sa.gosi.new_track', date), 'employee_pct')
  assert.deepEqual(['2024-07-02', '2024-07-31', '2025-06-30', '2025-07-31', '2026-06-30', '2026-07-31', '2027-07-31', '2030-01-31'].map(pct),
    [null, 9.75, 9.75, 10.25, 10.25, 10.75, 11.25, 11.75])
  assert.equal(statutoryAt(entries, 'EG', 'eg.insurance.wage_limits', '2025-12-31'), null)
  assert.equal(statutoryNumber(statutoryAt(entries, 'EG', 'eg.insurance.wage_limits', '2027-01-31'), 'max_salary'), 19300)
  // صف 2026 المصري = الافتراضي الحالي بالظبط
  const eg2026 = statutoryAt(entries, 'EG', 'eg.insurance.wage_limits', '2026-12-31')
  assert.deepEqual([statutoryNumber(eg2026, 'min_salary'), statutoryNumber(eg2026, 'max_salary')], [settings.egyptianMinSalary, settings.egyptianMaxSalary])
})

test('معيار الخطة: المسار الجديد على 10,000 في يوليو 2026 = 1,075.00 و1,275.00، والقديم 975.00 و1,175.00', () => {
  const july = ratesAt('2026-07-31')
  const fresh = saudi({ firstRegisteredAt: '2024-07-03' }, july)
  assert.deepEqual([fresh.track, fresh.employeePct, fresh.employerPct, fresh.employeeShare, fresh.employerShare], ['NEW', 10.75, 12.75, 1075, 1275])
  assert.deepEqual([fresh.ratesEffectiveFrom, fresh.ratesVerified], ['2026-07-03', false])
  const old = saudi({ firstRegisteredAt: null }, july)
  assert.deepEqual([old.track, old.employeeShare, old.employerShare, old.ratesEffectiveFrom], ['OLD', 975, 1175, null])
  // يونيو 2026: آخر يوم قبل 3 يوليو = نسب يوليو 2025
  const june = saudi({ firstRegisteredAt: '2024-07-03' }, ratesAt('2026-06-30'))
  assert.deepEqual([june.employeeShare, june.employerShare, june.ratesEffectiveFrom], [1025, 1225, '2025-07-03'])
  // الحدود الأدنى والأقصى للمسار الجديد من صفه
  assert.equal(saudi({ firstRegisteredAt: '2025-01-01', declaredSalary: 60000 }, july).insuredSalary, 45000)
  assert.equal(saudi({ firstRegisteredAt: '2025-01-01', declaredSalary: 1000 }, july).employeeShare, 161.25)
})

test('الخانة الفاضية والقيم الناقصة = نفس حساب النهارده بالحرف', () => {
  for (const salary of [10000, 3333.33, 1000, 60000, null]) {
    const before = saudi({ declaredSalary: salary })
    for (const rates of [undefined, null, ratesAt('2026-07-31'), ratesAt('2026-07-31', '2026-09-20')]) {
      assert.deepEqual(saudi({ declaredSalary: salary, firstRegisteredAt: '' }, rates), { ...before, track: 'OLD', ratesEffectiveFrom: null, ratesVerified: null })
    }
  }
  // غير السعودي بتاريخ تسجيل: 0% و2% زي ما هو
  const resident = saudi({ nationality: 'هندي', firstRegisteredAt: '2024-08-01' }, ratesAt('2026-07-31'))
  assert.deepEqual([resident.category, resident.track, resident.employeeShare, resident.employerShare], ['NON_SAUDI', null, 0, 200])
  // مفيش قيم مؤرخة (قبل ترحيل 080): المسار الجديد بيرجع للقديم
  assert.equal(saudi({ firstRegisteredAt: '2024-07-03' }, si.socialInsuranceRatesAt([], '2026-07-31', null, false)).employeeShare, 975)
})

test('حدود الأجر المصري: القرار الأحدث الساري يوم آخر الفترة — الجدول، أو الشاشة لو اتغيرت قبله ومن بداية الصف', () => {
  const egypt = (date, since, salary = 25000) => si.computeSocialInsurance({ system: 'EGYPTIAN', registered: true, declaredSalary: salary, nationality: 'مصري' },
    { ...settings, egyptianMaxSalary: 18000 }, ratesAt(date, since))
  // الشاشة عمرها ما اتغيرت: الجدول
  assert.deepEqual([egypt('2026-12-31', null).insuredSalary, egypt('2027-01-31', null).insuredSalary], [16700, 19300])
  assert.deepEqual([egypt('2027-01-31', null).employeeShare, egypt('2027-01-31', null).employerShare, egypt('2027-01-31', null).ratesEffectiveFrom], [2123, 3618.75, '2027-01-01'])
  assert.equal(egypt('2027-01-31', null, 2000).insuredSalary, 3200)
  // اتغيرت 20 سبتمبر 2026: الشاشة من يومها لحد صف يناير 2027، وقبلها الجدول
  assert.deepEqual(['2026-08-31', '2026-09-30', '2026-12-31', '2027-01-31'].map(date => egypt(date, '2026-09-20').insuredSalary), [16700, 18000, 18000, 19300])
  // اتغيرت 5 يناير 2027 (بعد صف يناير): ديسمبر 2026 لسه بالجدول، ويناير بالشاشة
  assert.deepEqual(['2026-12-31', '2027-01-31'].map(date => egypt(date, '2027-01-05').insuredSalary), [16700, 18000])
  // نفس يوم الصف: الشاشة
  assert.equal(egypt('2027-01-31', '2027-01-01').insuredSalary, 18000)
  // قبل 2026 (مفيش صف): الشاشة زي ما كانت
  assert.equal(egypt('2025-12-31', null).insuredSalary, 18000)
  // النسب المصرية من الشاشة دايمًا
  assert.equal(egypt('2027-01-31', null).employeePct, settings.egyptianEmployeePct)
})

test('الأساسي + السكن: ورا الإعداد، لفروع السعودية من غير أجر تأمين مسجل بس', () => {
  const on = ratesAt('2026-07-31', null, true), off = ratesAt('2026-07-31', null, false)
  const housed = rates => saudi({ declaredSalary: null, fallbackSalary: 8000, housingSalary: 2000 }, rates)
  assert.deepEqual([housed(off).salarySource, housed(off).insuredSalary, housed(off).employeeShare], ['BASIC', 8000, 780])
  assert.deepEqual([housed(on).salarySource, housed(on).insuredSalary, housed(on).employeeShare], ['BASIC_HOUSING', 10000, 975])
  // أجر تأمين مسجل: هو بس
  assert.equal(saudi({ declaredSalary: 9000, housingSalary: 2000 }, on).insuredSalary, 9000)
  // المصري: الإعداد مالوش دعوة
  const egypt = si.computeSocialInsurance({ system: 'EGYPTIAN', registered: true, declaredSalary: null, fallbackSalary: 8000, housingSalary: 2000, nationality: 'مصري' }, settings, on)
  assert.deepEqual([egypt.salarySource, egypt.insuredSalary], ['BASIC', 8000])
})

test('الشاشة بتعرض حدود مصر السارية النهارده', () => {
  assert.equal(si.socialInsuranceSettingsShown(settings, ratesAt('2027-02-01', null)).egyptianMaxSalary, 19300)
  assert.equal(si.socialInsuranceSettingsShown({ ...settings, egyptianMaxSalary: 18000 }, ratesAt('2026-10-03', '2026-09-20')).egyptianMaxSalary, 18000)
  assert.equal(si.socialInsuranceSettingsShown(settings, ratesAt('2026-10-03', null)).saudiEmployeePct, settings.saudiEmployeePct)
})

test('خانة الملف: فاضي = مسح، والتاريخ صحيح ومش في المستقبل', () => {
  assert.equal(normalizeGosiFirstRegistered(undefined, '2026-10-03'), undefined)
  for (const empty of [null, '', '  ']) assert.equal(normalizeGosiFirstRegistered(empty, '2026-10-03'), null)
  assert.equal(normalizeGosiFirstRegistered('2024-07-03', '2026-10-03'), '2024-07-03')
  assert.equal(normalizeGosiFirstRegistered('2026-10-03', '2026-10-03'), '2026-10-03')
  for (const bad of ['2024-02-30', '2024-13-01', '03/07/2024', '2024-7-3', 'abc']) {
    assert.throws(() => normalizeGosiFirstRegistered(bad, '2026-10-03'), /YYYY-MM-DD/, bad)
  }
  assert.throws(() => normalizeGosiFirstRegistered('2026-10-04', '2026-10-03'), /المستقبل/)
  assert.throws(() => normalizeGosiFirstRegistered('1969-12-31', '2026-10-03'), /قديم/)
})
