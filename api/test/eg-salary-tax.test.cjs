// B4.4 (أ) — ضريبة كسب العمل المصرية: حساب نقي بلا قاعدة بيانات.
// أمثلة بطاقة C-EG-01 (راتب 15,000 ← 1,482.50 في الشهر بالطريقتين)، والشرائح وحدودها، والطريقة التراكمية (زيادة، مكافأة، تعيين في نص الشهر)،
// وإلغاء الشرائح الدنيا للدخول العالية، وصافي الدخل الخاضع من سطور القسيمة بعلامات بنود الراتب.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const tax = require('../src/payroll/eg-salary-tax')
const { STATUTORY_SEED } = require('../src/statutory/statutory-data')
const { SALARY_ITEM_SEED } = require('../src/payroll/salary-items')

const entries = STATUTORY_SEED.map(seed => ({ ...seed, verified: false }))
const table = tax.egTaxTableAt(entries, '2026-10-31')
const flags = new Map(SALARY_ITEM_SEED.map(seed => [seed.code, seed.taxable]))

test('ET-01: الجدول من حزمة الدولة بتاريخ الفترة — الشرائح والإعفاء والسنة 360 يوم، وقبل سريانه أو ناقص = مفيش حساب', () => {
  assert.deepEqual([table.exemption, table.yearDays, table.topPct, table.effectiveFrom, table.verified], [20000, 360, 27.5, '2024-03-01', false])
  assert.deepEqual(table.bands, [{ to: 40000, pct: 0 }, { to: 55000, pct: 10 }, { to: 70000, pct: 15 }, { to: 200000, pct: 20 }, { to: 400000, pct: 22.5 }, { to: 1200000, pct: 25 }])
  assert.deepEqual(table.tiers.map(tier => [tier.from, tier.firstTo, tier.firstPct]), [[600001, 55000, 10], [700001, 70000, 15], [800001, 200000, 20], [900001, 400000, 22.5], [1200001, 1200000, 25]])
  assert.equal(tax.egTaxTableAt(entries, '2024-02-29'), null, 'قبل تاريخ السريان')
  assert.equal(tax.egTaxTableAt([], '2026-10-31'), null)
  const broken = entries.map(entry => entry.key === tax.EG_TAX_BRACKETS_KEY ? { ...entry, values: { ...entry.values, personal_exemption: '' } } : entry)
  assert.equal(tax.egTaxTableAt(broken, '2026-10-31'), null, 'صف ناقص')
  const unordered = entries.map(entry => entry.key === tax.EG_TAX_BRACKETS_KEY ? { ...entry, values: { ...entry.values, band_3_to: '50000' } } : entry)
  assert.equal(tax.egTaxTableAt(unordered, '2026-10-31'), null, 'شرائح مش مترتبة')
  // من غير جدول الدخول العالية: الشرائح العادية بس؛ و«اتأكد» بتاع الاتنين مع بعض
  const plain = tax.egTaxTableAt(entries.filter(entry => entry.key !== tax.EG_TAX_HIGH_INCOME_KEY), '2026-10-31')
  assert.deepEqual([plain.tiers, plain.verified], [[], false])
  assert.equal(tax.egTaxTableAt(entries.map(entry => ({ ...entry, verified: entry.key === tax.EG_TAX_BRACKETS_KEY })), '2026-10-31').verified, false)
  assert.equal(tax.egTaxTableAt(entries.map(entry => ({ ...entry, verified: true })), '2026-10-31').verified, true)
})

test('ET-02: الضريبة السنوية بالشرائح وعلى حدودها', () => {
  const annual = value => tax.egAnnualTax(value, table)
  assert.deepEqual([0, -5, 40000, 40001, 55000, 70000, 140200, 200000, 400000, 600000].map(annual),
    [0, 0, 0, 0.1, 1500, 3750, 17790, 29750, 74750, 124750])
  // مثال البطاقة: 40,000 × 0% + 15,000 × 10% + 15,000 × 15% + 70,200 × 20% = 17,790
  assert.equal(annual(140200), 0 + 1500 + 2250 + 14040)
})

test('ET-03: مثال C-EG-01 — راتب 15,000 كله خاضع للتأمين: 1,482.50 في يناير وفي فبراير (تراكمي)، وبالطريقة المباشرة', () => {
  const net = 15000 - 15000 * 0.11
  assert.equal(net, 13350)
  const january = tax.egPeriodTax({ netIncome: net, days: 30 }, table)
  assert.deepEqual([january.annualized, january.taxable, january.annualTax, january.cumulativeTax, january.tax], [160200, 140200, 17790, 1482.5, 1482.5])
  const february = tax.egPeriodTax({ netIncome: net, days: 30, ytdNetIncome: net, ytdDays: 30, ytdTax: january.tax }, table)
  assert.deepEqual([february.cumulativeNetIncome, february.cumulativeDays, february.annualized, february.cumulativeTax, february.tax], [26700, 60, 160200, 2965, 1482.5])
  // سنة كاملة: 12 شهر × 1,482.50 = الضريبة السنوية بالطريقة المباشرة (180,000 − 19,800 − 20,000 = 140,200 ← 17,790)
  let ytd = { net: 0, days: 0, tax: 0 }
  for (let month = 0; month < 12; month++) {
    const step = tax.egPeriodTax({ netIncome: net, days: 30, ytdNetIncome: ytd.net, ytdDays: ytd.days, ytdTax: ytd.tax }, table)
    assert.equal(step.tax, 1482.5, `شهر ${month + 1}`)
    ytd = { net: ytd.net + net, days: ytd.days + 30, tax: ytd.tax + step.tax }
  }
  assert.deepEqual([ytd.tax, tax.egAnnualTax(180000 - 19800 - 20000, table)], [17790, 17790])
})

test('ET-04: التراكمي — زيادة في نص السنة ومكافأة شهر وتعيين في نص الشهر، ودخل تحت الإعفاء، وفترة من غير أيام', () => {
  const run = months => months.reduce((ytd, month) => {
    const step = tax.egPeriodTax({ netIncome: month.net, days: month.days ?? 30, ytdNetIncome: ytd.net, ytdDays: ytd.days, ytdTax: ytd.tax }, table)
    return { net: ytd.net + month.net, days: ytd.days + step.days, tax: Math.round((ytd.tax + step.tax) * 100) / 100, steps: [...ytd.steps, step.tax] }
  }, { net: 0, days: 0, tax: 0, steps: [] })
  // زيادة من الشهر السابع: مجموع السنة = ضريبة الدخل السنوي الفعلي
  const raised = run([...Array(6).fill({ net: 13350 }), ...Array(6).fill({ net: 20000 })])
  assert.equal(raised.tax, tax.egAnnualTax(13350 * 6 + 20000 * 6 - 20000, table))
  assert.ok(raised.steps[6] > raised.steps[5] && raised.steps[11] > raised.steps[0])
  // مكافأة في مارس: ضريبة الشهر بتعلى، وبعدها بتتسوّى — ومجموع السنة = ضريبة الدخل الفعلي
  const bonus = run(Array.from({ length: 12 }, (_, month) => ({ net: month === 2 ? 43350 : 13350 })))
  assert.equal(bonus.tax, tax.egAnnualTax(13350 * 12 + 30000 - 20000, table))
  assert.ok(bonus.steps[2] > bonus.steps[1] && bonus.steps.every(value => value >= 0))
  // تعيين في نص الشهر: 15 يوم بنص الراتب = نفس الوعاء السنوي بتاع الشهر الكامل، ونص ضريبته
  const half = tax.egPeriodTax({ netIncome: 6675, days: 15 }, table)
  assert.deepEqual([half.annualized, half.annualTax, half.tax], [160200, 17790, 741.25])
  // دخل تحت الإعفاء والشريحة الصفرية: صفر
  assert.equal(tax.egPeriodTax({ netIncome: 5000, days: 30 }, table).tax, 0)
  assert.equal(tax.egPeriodTax({ netIncome: 5000, days: 30 }, table).taxable, 40000)
  // شهر بدخل سالب أو صفر، وفترة من غير أيام: صفر، ومفيش ضريبة بالسالب (اللي اتخصم زيادة بيتسوّى في الشهور الجاية)
  assert.deepEqual([tax.egPeriodTax({ netIncome: -200, days: 30 }, table).tax, tax.egPeriodTax({ netIncome: 0, days: 30 }, table).tax, tax.egPeriodTax({ netIncome: 9000, days: 0 }, table).tax], [0, 0, 0])
  assert.equal(tax.egPeriodTax({ netIncome: 1000, days: 30, ytdNetIncome: 13350, ytdDays: 30, ytdTax: 1482.5 }, table).tax, 0)
  // الأيام بتتقص على 30
  assert.equal(tax.egPeriodTax({ netIncome: 13350, days: 31 }, table).days, 30)
})

test('ET-05: إلغاء الشرائح الدنيا للدخول العالية — أول الوعاء بنسبة الدرجة والباقي بشرائحه', () => {
  const annual = value => tax.egAnnualTax(value, table)
  // 600,000 (آخر وعاء بالشرائح العادية) ثم 600,001: شريحة الصفر اتلغت — 10% على أول 55,000
  assert.equal(annual(600000), 124750)
  assert.equal(annual(600001), Math.round((55000 * 0.10 + 15000 * 0.15 + 130000 * 0.20 + 200000 * 0.225 + 200001 * 0.25) * 100) / 100)
  // 700,001: 15% على أول 70,000
  assert.equal(annual(700001), Math.round((70000 * 0.15 + 130000 * 0.20 + 200000 * 0.225 + 300001 * 0.25) * 100) / 100)
  // 800,001: 20% على أول 200,000؛ 900,001: 22.5% على أول 400,000
  assert.equal(annual(800001), Math.round((200000 * 0.20 + 200000 * 0.225 + 400001 * 0.25) * 100) / 100)
  assert.equal(annual(900001), Math.round((400000 * 0.225 + 500001 * 0.25) * 100) / 100)
  // فوق 1,200,000: 25% على أول 1,200,000 و27.5% على الباقي
  assert.equal(annual(1500000), 1200000 * 0.25 + 300000 * 0.275)
  // من غير الجدول (محاسب قال صياغة PwC هي الصح): الشرائح العادية لحد 1,200,000
  const plain = tax.egTaxTableAt(entries.filter(entry => entry.key !== tax.EG_TAX_HIGH_INCOME_KEY), '2026-10-31')
  assert.equal(tax.egAnnualTax(700001, plain), Math.round((1500 + 2250 + 26000 + 45000 + 300001 * 0.25) * 100) / 100)
})

test('ET-06: صافي الدخل الخاضع من سطور القسيمة بعلامات بنود الراتب، وأيام الفترة من تناسب البند', () => {
  const lines = {
    earnings: [{ key: 'BASIC', name: 'الأساسي', amount: 12000 }, { key: 'SALARY:HOUSING', name: 'بدل السكن', amount: 2000 }, { key: 'SALARY:WORK_PRESSURE', name: 'بدل ضغط العمل', amount: 1000 },
      { key: 'OVERTIME', name: 'الإضافي', amount: 500.5 }, { key: 'BONUS:مكافأة أداء', name: 'مكافأة أداء', amount: 300 }, { key: 'UNKNOWN', name: 'سطر من غير بند', amount: 999 }],
    deductions: [{ key: 'LATENESS', name: 'التأخير', amount: 100.25 }, { key: 'ABSENCE', name: 'الغياب', amount: 400 }, { key: 'SOCIAL_INSURANCE', name: 'التأمينات', amount: 1650 },
      { key: 'LOAN', name: 'السلف', amount: 2000 }, { key: 'TYPED:خصم جودة', name: 'خصم جودة', amount: 150 }, { key: 'DEBIT:custody', name: 'عهدة', amount: 75 }],
  }
  // الاستحقاقات كلها خاضعة؛ خصومات الحضور والتأمينات بتقلل الوعاء؛ السلف والخصومات المصنّفة وقيود الدفتر لأ
  assert.equal(tax.egNetIncomeOfLines(lines, flags), 12000 + 2000 + 1000 + 500.5 + 300 - 100.25 - 400 - 1650)
  // بند اتعلّم «مش خاضع» من الشاشة بيخرج من الوعاء
  const custom = new Map(flags); custom.set('HOUSING', false); custom.set('LOAN', true)
  assert.equal(tax.egNetIncomeOfLines(lines, custom), 12000 + 1000 + 500.5 + 300 - 100.25 - 400 - 1650 - 2000)
  assert.equal(tax.egNetIncomeOfLines({ earnings: [], deductions: [] }, flags), 0)
  assert.deepEqual([{ prorataFactor: 1 }, { prorataFactor: 0.5 }, { prorataFactor: 0.033333 }, { prorataFactor: 0 }, {}, null, { prorataFactor: '0.5' }, { prorataFactor: 1.2 }].map(tax.egTaxDaysOf), [30, 15, 1, 0, 30, 30, 30, 30])
})

test('ET-07: مصدر الكود — حساب نقي: مفيش قاعدة بيانات ولا كتابة، والأرقام من حزمة الدولة مش ثوابت', () => {
  const source = fs.readFileSync(path.join(apiRoot, 'src', 'payroll', 'eg-salary-tax.ts'), 'utf8')
  assert.doesNotMatch(source, /EntityManager|getRepository|\.query\(|DataSource/)
  assert.doesNotMatch(source, /\b(20000|40000|55000|70000|200000|400000|1200000|600001)\b/, 'ولا رقم قانوني في الكود')
})
