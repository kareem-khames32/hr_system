// B4.5 (ج) — شرائح الإجازة السنوية بمدة الخدمة والسن، واقتراحات حزمة الدولة: حساب نقي بلا قاعدة بيانات.
// من غير شرائح = أيام النوع بالحرف؛ بالشرائح الموظف بياخد أعلى شريحة منطبقة (دولة فرعه، خدمته، سنّه)؛ وأرقام الاقتراح من الحزمة مش ثوابت.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const tiers = require('../src/requests/leave-entitlement-tiers')
const periods = require('../src/requests/leave-balance-periods')
const { STATUTORY_SEED } = require('../src/statutory/statutory-data')
const entries = STATUTORY_SEED.map(seed => ({ ...seed, verified: false }))
const T = (country, minServiceYears, minAge, days) => ({ country, minServiceYears, minAge, days })
const EG = [T('EG', null, null, 15), T('EG', 1, null, 21), T('EG', 10, null, 30), T('EG', null, 50, 30)]
const SA = [T('SA', null, null, 21), T('SA', 5, null, 30)]
const days = (base, rows, country, joinDate, birthDate, onDate = '2026-10-08') => tiers.tieredAnnualDays(base, rows, { country, joinDate, birthDate }, onDate)

test('LTU-01: التحقق من الشرائح — الدولة والخدمة والسن والأيام، وشريحة من غير شرط أو مكررة مرفوضة', () => {
  const check = rows => tiers.checkEntitlementTiers(rows)
  assert.deepEqual(check([]), { tiers: [], error: null })
  assert.deepEqual(check([{ country: 'eg', minServiceYears: '10', minAge: '', days: '30' }, { country: null, minAge: 50, days: 30.5 }]),
    { tiers: [T('EG', 10, null, 30), T(null, null, 50, 30.5)], error: null })
  for (const [rows, message] of [['x', /قايمة صفوف/], [[{ days: 21 }], /لازم دولة أو سنين خدمة أو سن/], [[{ country: 'AE', days: 21 }], /الدولة مصر أو السعودية أو الكل/],
    [[{ country: 'EG', minServiceYears: 1.5, days: 21 }], /سنين الخدمة رقم صحيح/], [[{ country: 'EG', minServiceYears: -1, days: 21 }], /سنين الخدمة رقم صحيح/],
    [[{ minAge: 10, days: 21 }], /السن رقم صحيح من 15/], [[{ country: 'EG' }], /الأيام رقم من 0 لـ 365/], [[{ country: 'EG', days: 400 }], /الأيام رقم من 0 لـ 365/],
    [[{ country: 'EG', days: 21.555 }], /الأيام رقم/], [[{ country: 'EG', minServiceYears: 5, days: 21 }, { country: 'EG', minServiceYears: 5, days: 30 }], /الشريحة 2: مكررة/],
    [Array.from({ length: 21 }, (_, index) => ({ minServiceYears: index, days: 21 })), /20 صف بحد أقصى/]]) {
    const result = check(rows)
    assert.equal(result.tiers, null)
    assert.match(result.error, message)
  }
  // المحفوظ التالف أو الفاضي = من غير شرائح
  assert.deepEqual([tiers.parseEntitlementTiers(null), tiers.parseEntitlementTiers(''), tiers.parseEntitlementTiers('{'), tiers.parseEntitlementTiers('[{"days":21}]')], [[], [], [], []])
  assert.deepEqual(tiers.parseEntitlementTiers(JSON.stringify(SA)), SA)
})

test('LTU-02: من غير شرائح = أيام النوع بالحرف؛ بالشرائح أعلى شريحة منطبقة بدولة الفرع والخدمة والسن', () => {
  assert.deepEqual([days(21, [], 'EG', '2010-01-01', '1960-01-01'), days(25.5, [], null, null, null)], [21, 25.5])
  const all = [...EG, ...SA]
  // مصر: أول سنة 15، من السنة التانية 21، 10 سنين 30، وسن 50 بيدّي 30 حتى بخدمة سنتين
  assert.deepEqual([days(25, all, 'EG', '2026-04-01', '1995-01-01'), days(25, all, 'EG', '2023-10-01', '1995-01-01'), days(25, all, 'EG', '2016-10-08', '1995-01-01'),
    days(25, all, 'EG', '2024-10-01', '1976-10-08'), days(25, all, 'EG', '2024-10-01', '1976-10-09')], [15, 21, 30, 30, 21])
  // السعودية: 21 و30 بعد 5 سنين كاملة (قبل اليوم بيوم لسه 21)، والسن مالوش شريحة
  assert.deepEqual([days(25, all, 'SA', '2023-10-01', '1960-01-01'), days(25, all, 'SA', '2021-10-08', '1990-01-01'), days(25, all, 'SA', '2021-10-09', '1990-01-01')], [21, 30, 21])
  // فرع من غير دولة أو بدولة تانية: مفيش شريحة منطبقة = أيام النوع؛ وحروف الدولة مش فارقة
  assert.deepEqual([days(25, all, null, '2010-01-01', '1960-01-01'), days(25, all, 'AE', '2010-01-01', '1960-01-01'), days(25, all, ' eg ', '2010-01-01', '1990-01-01')], [25, 25, 30])
  // شريحة لكل الدول، وشريحة بالشرطين مع بعض (خدمة وسن)
  assert.deepEqual([days(21, [T(null, 5, null, 30)], null, '2020-01-01', null), days(21, [T(null, 5, 45, 35)], 'SA', '2020-01-01', '1985-01-01'), days(21, [T(null, 5, 45, 35)], 'SA', '2020-01-01', '1975-01-01')], [30, 21, 35])
  // من غير تاريخ تعيين أو ميلاد: شرط الخدمة والسن مايتحققوش، وشريحة الدولة بس بتنطبق
  assert.deepEqual([days(25, all, 'EG', null, null), days(25, [T('EG', 1, null, 21)], 'EG', null, null), days(25, all, 'EG', '2030-01-01', null)], [15, 25, 15])
  assert.deepEqual([tiers.fullYearsBetween('2020-02-29', '2021-02-28'), tiers.fullYearsBetween('2020-02-29', '2021-03-01'), tiers.fullYearsBetween('2026-10-08', '2026-10-08'), tiers.fullYearsBetween('bad', '2026-10-08')], [0, 1, 0, null])
})

test('LTU-03: اقتراح الشرائح من حزمة الدولة — مصر 4 والسعودية 2، والأرقام من الحزمة مش من الكود', () => {
  assert.deepEqual(tiers.statutoryAnnualTiers(entries, '2026-10-08'), { tiers: [...EG, ...SA], unverified: true })
  assert.equal(tiers.statutoryAnnualTiers(entries.map(entry => ({ ...entry, verified: true })), '2026-10-08').unverified, false)
  // قبل سريان صف مصر: السعودية بس؛ وقبل الاتنين: فاضي
  assert.deepEqual([tiers.statutoryAnnualTiers(entries, '2025-08-31').tiers, tiers.statutoryAnnualTiers(entries, '2025-02-18').tiers], [SA, []])
  const changed = entries.map(entry => entry.key === 'sa.leave.annual' ? { ...entry, values: { ...entry.values, senior_days: '35', senior_service_years: '7' } } : entry)
  assert.deepEqual(tiers.statutoryAnnualTiers(changed, '2026-10-08').tiers.slice(-2), [T('SA', null, null, 21), T('SA', 7, null, 35)])
  // الاقتراح نفسه شرائح صالحة للحفظ، وبتدّي أرقام البطاقتين
  assert.equal(tiers.checkEntitlementTiers(tiers.statutoryAnnualTiers(entries, '2026-10-08').tiers).error, null)
})

test('LTU-04: أنواع إجازات الحزمة لكل دولة — مصر (وضع 120 × 3، أبوة 1 × 3، حج 30 مرة) والسعودية (وضع 84، أبوة 3، زواج 5، وفاة 5 و3، حج 15 مرة)', () => {
  const brief = country => tiers.statutoryLeaveTypes(entries, country, '2026-10-08').types.map(type => [type.baseCode, type.maxDays, type.maxTimesInService, type.oncePerService])
  assert.deepEqual(brief('EG'), [['MATERNITY', 120, 3, false], ['PATERNITY', 1, 3, false], ['HAJJ', 30, null, true]])
  assert.deepEqual(brief('SA'), [['MATERNITY', 84, null, false], ['PATERNITY', 3, null, false], ['MARRIAGE', 5, null, false], ['BEREAVEMENT', 5, null, false], ['BEREAVEMENT_SIBLING', 3, null, false], ['HAJJ', 15, null, true]])
  assert.deepEqual([tiers.statutoryLeaveTypes(entries, 'EG', '2026-10-08').unverified, brief(null), brief('AE'), tiers.statutoryLeaveTypes(entries, 'EG', '2025-08-31').types], [true, [], [], []])
  assert.match(tiers.statutoryLeaveTypes(entries, 'EG', '2026-10-08').types[2].note, /5 سنين خدمة/)
  assert.equal(tiers.statutoryLeaveTypeCode('MATERNITY', 'EG', 7), 'MATERNITY_EG_B7')
  const changed = entries.map(entry => entry.key === 'eg.leave.other' ? { ...entry, values: { ...entry.values, maternity_days: '90', maternity_times: '2' } } : entry)
  assert.deepEqual(tiers.statutoryLeaveTypes(changed, 'EG', '2026-10-08').types[0].maxDays, 90)
})

test('LTU-05: مصدر الكود — الشرائح بتدخل في سياق الاستحقاق بس لما النوع ليه شرائح، والعمودين برّه قراءة وكتابة النوع', () => {
  const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
  assert.doesNotMatch(read('requests/leave-entitlement-tiers.ts'), /EntityManager|getRepository|\.query\(/)
  const service = read('requests/leave-balances.service.ts')
  assert.match(service, /const annualDays = s\.annualTiers\n\s+\? tieredAnnualDays\(s\.types\.annual\.annualDays, s\.annualTiers\.tiers, [^\n]+\n\s+: s\.types\.annual\.annualDays/)
  assert.match(service, /annual: emp\?\.annualLeaveEntitled === false \? 0 : annualDays,/)
  assert.match(service, /if \(!tiers\.length\) return undefined/)
  const entity = read('requests/entities/leave.entities.ts')
  for (const column of ['entitlementTiers', 'maxTimesInService']) {
    assert.match(entity, new RegExp(`nullable: true, select: false, insert: false, update: false \\}\\)\\n  ${column}\\?:`), column)
  }
  // النوع اللي بيحكم الرصيد لسه نفس الاختيار (الكود أولًا، والمفعّل، والأقدم)
  const types = [{ id: 3, code: 'X', category: 'ANNUAL', balanceType: 'annual' }, { id: 2, code: 'ANNUAL', isActive: false }, { id: 1, code: 'Y', category: 'ANNUAL' }]
  assert.deepEqual([periods.balanceTypeRow(types, 'annual').id, periods.balanceTypeRow(types.slice(0, 1).concat(types.slice(2)), 'annual').id, periods.balanceTypeRow([], 'sick')], [2, 1, undefined])
  // عدّاد المرات طول الخدمة بيستخدم نفس عدّ مرات السنة
  assert.match(read('requests/requests.service.ts'), /maxTimes !== null && maxTimes > 0 && \(await this\.leaveTimesInYear\(em, req, leaveTypeDef\.code, null\)\) >= maxTimes/)
})
