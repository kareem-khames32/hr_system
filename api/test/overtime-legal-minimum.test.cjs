// B4.5 (ب) — الحد القانوني لمعامل الإضافي: حساب نقي بلا قاعدة بيانات.
// مصر (مادة 121): الأجر + 35% في نهار العمل، وأجر مضاعف في يوم الراحة؛ السعودية (مادة 107): أجر الساعة + 50% من الأساسي.
// والتسعير بياخد الأعلى من معامل الشركة والحد القانوني، والأرقام من حزمة الدولة مش ثوابت في الكود.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const legal = require('../src/attendance/overtime-legal-minimum')
const { STATUTORY_SEED } = require('../src/statutory/statutory-data')
const entries = STATUTORY_SEED.map(seed => ({ ...seed, verified: false }))
const min = (country, dayKind, basicSalary = 6000, grossSalary = 8000, date = '2026-10-08', rows = entries) => legal.legalOvertimeMinimum({ country, dayKind, basicSalary, grossSalary }, rows, date)

test('OLU-01: مصر — نهار العمل 1.35 ويوم الراحة 2، والعطلة الرسمية من غير حد، وقبل سريان الصف مفيش', () => {
  assert.deepEqual(min('EG', 'WEEKDAY'), { multiplier: 1.35, country: 'EG', key: 'eg.overtime', effectiveFrom: '2025-09-01', verified: false })
  assert.deepEqual([min('EG', 'WEEKEND').multiplier, min('EG', 'HOLIDAY'), min('EG', 'WEEKDAY', 6000, 8000, '2025-08-31')], [2, null, null])
  // مثال البطاقة: إجمالي 12,000 ← الساعة 50؛ النهار بالقانون 67.50 (1.35) والراحة 100 (2)
  assert.deepEqual([50 * min('EG', 'WEEKDAY').multiplier, 50 * min('EG', 'WEEKEND').multiplier], [67.5, 100])
  // الرقم من الحزمة: صف جديد بنسبة تانية بيتقري من غير كود
  const changed = entries.map(entry => entry.key === 'eg.overtime' ? { ...entry, values: { ...entry.values, day_premium_pct: '25' } } : entry)
  assert.equal(min('EG', 'WEEKDAY', 6000, 8000, '2026-10-08', changed).multiplier, 1.25)
})

test('OLU-02: السعودية — 1 + 50% × (الأساسي ÷ الإجمالي) لأي نوع يوم، مقرّب لفوق لمنزلتين', () => {
  // مثال البطاقة: أساسي 6,000 وبدلات 2,000 ← الساعة 33.33 + 12.50 = 45.83 = 1.375 × سعر ساعة الإجمالي ← 1.38
  assert.deepEqual(min('SA', 'WEEKDAY'), { multiplier: 1.38, country: 'SA', key: 'sa.overtime', effectiveFrom: '2025-02-19', verified: false })
  assert.deepEqual(['WEEKEND', 'HOLIDAY'].map(kind => min('SA', kind).multiplier), [1.38, 1.38])
  assert.deepEqual([min('SA', 'WEEKDAY', 8000, 8000).multiplier, min('SA', 'WEEKDAY', 0, 8000).multiplier, min('SA', 'WEEKDAY', 4000, 8000).multiplier, min('SA', 'WEEKDAY', 9000, 8000).multiplier], [1.5, 1, 1.25, 1.5])
  // من غير إجمالي، أو قبل سريان الصف، أو دولة تانية: مفيش حد
  assert.deepEqual([min('SA', 'WEEKDAY', 6000, 0), min('SA', 'WEEKDAY', 6000, 8000, '2025-02-18'), min('AE', 'WEEKDAY'), min(null, 'WEEKDAY'), min(undefined, 'WEEKEND')], [null, null, null, null, null])
})

test('OLU-03: المعامل المطبّق = الأعلى، واللقطة للحد القانوني لما هو اللي اتطبق بس', () => {
  const eg = min('EG', 'WEEKEND')
  assert.deepEqual(legal.overtimeMultiplierWithLegalMinimum(1.5, eg), { multiplier: 2, applied: { ...eg, companyMultiplier: 1.5 } })
  assert.deepEqual([legal.overtimeMultiplierWithLegalMinimum(2, eg), legal.overtimeMultiplierWithLegalMinimum(2.5, eg), legal.overtimeMultiplierWithLegalMinimum(1.5, null)],
    [{ multiplier: 2, applied: null }, { multiplier: 2.5, applied: null }, { multiplier: 1.5, applied: null }])
})

test('OLU-04: مصدر الكود — ورا الإعداد المقفول في أدلة الإضافي، والأرقام من الحزمة، والتفعيل من مسار الحسابات القانونية', () => {
  const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
  const pure = read('attendance/overtime-legal-minimum.ts')
  assert.doesNotMatch(pure, /EntityManager|getRepository|\.query\(/)
  assert.doesNotMatch(pure.replace(/\/\/.*$/gm, ''), /\b(35|70|50)\b/, 'ولا نسبة قانونية في الكود')
  const service = read('attendance/attendance.service.ts')
  assert.match(service, /if \(\(await this\.configValue\(OVERTIME_LEGAL_MINIMUM_KEY, 'false'\)\) !== 'true' \|\| branchId == null\) return policy/)
  assert.match(service, /return applied \? \{ \.\.\.policy, multiplier, legalMinimum: applied \} : policy/)
  assert.equal((service.match(/withLegalOvertimeMinimum\(/g) ?? []).length, 2, 'تعريف ونداء واحد في أدلة الإضافي')
  const calculators = read('statutory/statutory-calculators.service.ts')
  assert.match(calculators, /code: 'OVERTIME_LEGAL_MINIMUM'[\s\S]{0,400}enabledKey: OVERTIME_LEGAL_MINIMUM_KEY/)
  // المفتاح مش مبذور ومش في شاشة السياسات العامة: مساره «حزمة الدولة» بس
  const { configSeed } = require('../src/seed/requests-seed.data')
  assert.equal(configSeed.some(row => row.key === legal.OVERTIME_LEGAL_MINIMUM_KEY), false)
  assert.equal(fs.readFileSync(path.join(apiRoot, '..', 'src', 'app', 'settings', 'policies', 'page.tsx'), 'utf8').includes(legal.OVERTIME_LEGAL_MINIMUM_KEY), false)
})
