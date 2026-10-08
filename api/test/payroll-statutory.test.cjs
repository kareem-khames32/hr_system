// B4.4 (ب) — الخصومات القانونية في بند المسير: حساب نقي بلا قاعدة بيانات.
// قرّاء breakdown.statutory (الغايب = صفر، والتالف = null)، وسطور القسيمة ومجاميعها، وتفسير الصافي السالب وتنبيه تغيّر الصافي، ووعاء
// الضريبة من غير السطور القانونية، ودخل من غير أيام جديدة، وتثبيت إن الحساب ورا إعداده وإن مفيش مسار في المنتج بيفتحه في الدفعة دي.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const statutory = require('../src/payroll/payroll-statutory')
const lines = require('../src/payroll/payroll-item-lines')
const tax = require('../src/payroll/eg-salary-tax')
const { explainPayrollNegativeNet } = require('../src/payroll/payroll-negative-net')
const { payrollNetChange } = require('../src/payroll/payroll-run-changes')
const { STATUTORY_SEED } = require('../src/statutory/statutory-data')
const { SALARY_ITEM_SEED } = require('../src/payroll/salary-items')
const read = file => fs.readFileSync(path.join(apiRoot, 'src', 'payroll', file), 'utf8').replace(/\r\n/g, '\n')
const snapshot = { total: 1490, lines: [{ code: 'INCOME_TAX', amount: 1482.5 }, { code: 'MARTYRS_FUND', amount: 7.5 }] }

test('PSU-01: قرّاء breakdown.statutory — الغايب صفر، والتالف null (مش صفر)، واللقطة بالقرش', () => {
  for (const absent of [{}, { statutory: null }, { statutory: undefined }, null, undefined, 'نص']) {
    assert.deepEqual([statutory.payrollItemStatutoryLines(absent), statutory.payrollItemStatutoryCents(absent)], [[], 0], JSON.stringify(absent))
  }
  assert.deepEqual(statutory.payrollItemStatutoryLines({ statutory: snapshot }), [{ code: 'INCOME_TAX', cents: 148250 }, { code: 'MARTYRS_FUND', cents: 750 }])
  assert.equal(statutory.payrollItemStatutoryCents({ statutory: snapshot }), 149000)
  assert.equal(statutory.payrollItemStatutoryCents({ statutory: { total: 0, lines: [] } }), 0)
  for (const broken of [{ total: 1490, lines: [{ code: 'INCOME_TAX', amount: 1482.5 }] }, { total: 10, lines: [{ code: 'FINE', amount: 10 }] }, { total: -5, lines: [] }, { total: '1490', lines: [] },
    { total: 10, lines: [{ code: 'INCOME_TAX', amount: 5 }, { code: 'INCOME_TAX', amount: 5 }] }, { total: 10, lines: 'x' }, { total: 10 }, [], 'نص', 5, { total: 10, lines: [{ code: 'INCOME_TAX', amount: -10 }] },
    { total: NaN, lines: [] }, { total: 10, lines: [null] }]) {
    assert.deepEqual([statutory.payrollItemStatutoryLines({ statutory: broken }), statutory.payrollItemStatutoryCents({ statutory: broken })], [null, null], JSON.stringify(broken))
  }
  // من النص المحفوظ (التقارير والفروق): التالف صفر للعرض
  assert.deepEqual([JSON.stringify({ statutory: snapshot }), '{bad', null, '', JSON.stringify({ statutory: { total: 5, lines: [] } })].map(statutory.payrollItemStatutoryCentsOfText), [149000, 0, 0, 0, 0])
  // بناء اللقطة: السطور اللي ليها مبلغ بس، والمجموع مجموعها
  assert.deepEqual(statutory.payrollStatutorySnapshot({ INCOME_TAX: 1482.5, MARTYRS_FUND: 7.5 }, { egTax: { tax: 1482.5 } }), { ...snapshot, egTax: { tax: 1482.5 } })
  assert.deepEqual(statutory.payrollStatutorySnapshot({ INCOME_TAX: 0, MARTYRS_FUND: 7.5 }, {}), { total: 7.5, lines: [{ code: 'MARTYRS_FUND', amount: 7.5 }] })
  assert.deepEqual(statutory.payrollStatutorySnapshot({}, { egTax: { tax: 0 } }), { total: 0, lines: [], egTax: { tax: 0 } })
  assert.throws(() => statutory.payrollStatutorySnapshot({ INCOME_TAX: -1 }, {}))
  assert.match(statutory.payrollStatutorySql('i'), /^CASE WHEN ISJSON\(i\.\[breakdown\]\) = 1 THEN ISNULL\(TRY_CAST\(JSON_VALUE\(i\.\[breakdown\], '\$\.statutory\.total'\) AS decimal\(18,2\)\), 0\) ELSE CAST\(0 AS decimal\(18,2\)\) END$/)
})

test('PSU-02: سطور القسيمة — سطر لكل خصم قانوني بعد التأمينات وجوه إجمالي الاستقطاعات؛ من غيرها أو بلقطة تالفة = السطور القديمة بالحرف', () => {
  const columns = { basicSalary: 15000, allowances: 0, overtimeAmount: 0, otherAdditions: 0, latenessDeduction: 0, shortfallDeduction: 0, absenceDeduction: 0, unpaidLeaveDeduction: 0, loanInstallments: 200,
    otherDeductions: 0, socialInsuranceDeduction: 1650 }
  const plain = lines.projectPayrollItemLines({ ...columns, netPay: 13150, breakdown: '{}' })
  assert.deepEqual([plain.deductions.map(line => line.key), plain.totals], [['LOAN', 'SOCIAL_INSURANCE'], { earnings: 15000, deductions: 1850, net: 13150 }])
  const taxed = lines.projectPayrollItemLines({ ...columns, netPay: 11660, breakdown: JSON.stringify({ statutory: snapshot }) })
  assert.deepEqual(taxed.deductions.map(line => [line.key, line.name, line.amount]), [['LOAN', 'السلف', 200], ['SOCIAL_INSURANCE', 'التأمينات (حصة الموظف)', 1650], ['INCOME_TAX', 'ضريبة كسب العمل', 1482.5], ['MARTYRS_FUND', 'صندوق الشهداء', 7.5]])
  assert.deepEqual(taxed.totals, { earnings: 15000, deductions: 3340, net: 11660 })
  assert.equal(taxed.totals.earnings - taxed.totals.deductions, taxed.totals.net)
  assert.deepEqual(lines.payrollLineColumns([plain, taxed]).deductions.map(column => column.key), ['LOAN', 'SOCIAL_INSURANCE', 'INCOME_TAX', 'MARTYRS_FUND'])
  const broken = lines.projectPayrollItemLines({ ...columns, netPay: 13150, breakdown: JSON.stringify({ statutory: { total: 9, lines: [] } }) })
  assert.deepEqual([broken.deductions, broken.totals], [plain.deductions, plain.totals])
})

test('PSU-03: وعاء الضريبة من غير السطور القانونية مهما كانت علامتها، ودخل من غير أيام جديدة بيتضاف للتراكمي', () => {
  const flags = new Map(SALARY_ITEM_SEED.map(seed => [seed.code, true]))
  const projected = { earnings: [{ key: 'BASIC', name: 'الأساسي', amount: 15000 }], deductions: [{ key: 'SOCIAL_INSURANCE', name: 'التأمينات', amount: 1650 }, { key: 'INCOME_TAX', name: 'ضريبة', amount: 1482.5 },
    { key: 'MARTYRS_FUND', name: 'صندوق', amount: 7.5 }, { key: 'HEALTH_INSURANCE', name: 'صحي', amount: 150 }] }
  assert.equal(tax.egNetIncomeOfLines(projected, flags), 13350)
  assert.deepEqual(tax.EG_TAX_EXCLUDED_ITEMS, ['INCOME_TAX', 'MARTYRS_FUND', 'HEALTH_INSURANCE'])
  const table = tax.egTaxTableAt(STATUTORY_SEED.map(seed => ({ ...seed, verified: false })), '2026-10-31')
  // مكافأة 6,000 في مسير تكميلي لشهر أيامه اتحسبت: التراكمي 19,350 في 30 يوم ← سنوي 232,200 ← وعاء 212,200 ← ضريبة السنة 32,495
  const supplement = tax.egPeriodTax({ netIncome: 6000, days: 0, ytdNetIncome: 13350, ytdDays: 30, ytdTax: 1482.5 }, table)
  assert.deepEqual([supplement.days, supplement.cumulativeDays, supplement.annualized, supplement.taxable, supplement.annualTax, supplement.tax], [0, 30, 232200, 212200, 32495, Math.round((32495 / 12 - 1482.5) * 100) / 100])
  // نفس الشهر لو اتحسب مرة واحدة بالدخلين: نفس الضريبة الكلية
  assert.equal(tax.egPeriodTax({ netIncome: 19350, days: 30 }, table).tax, Math.round((supplement.tax + 1482.5) * 100) / 100)
  // من غير أي أيام في السنة: صفر
  assert.equal(tax.egPeriodTax({ netIncome: 6000, days: 0 }, table).tax, 0)
})

test('PSU-04: تفسير الصافي السالب وتنبيه تغيّر الصافي بياخدوا الخصم القانوني من التفصيل', () => {
  const item = { employeeId: 7, basicSalary: 1000, allowances: 0, overtimeAmount: 0, otherAdditions: 0, latenessDeduction: 0, shortfallDeduction: 0, absenceDeduction: 0, unpaidLeaveDeduction: 0, otherDeductions: 0,
    socialInsuranceDeduction: 0, loanInstallments: 900, netPay: -50, breakdown: JSON.stringify({ statutory: { total: 150, lines: [{ code: 'INCOME_TAX', amount: 150 }] } }) }
  const explained = explainPayrollNegativeNet(item)
  assert.deepEqual(explained.lines.map(line => [line.code, line.amount]), [['EARNED', 1000], ['LOANS', -900], ['STATUTORY', -150]])
  assert.equal(explained.lines.reduce((sum, line) => sum + line.amount, 0), explained.net)
  assert.equal(explainPayrollNegativeNet({ ...item, netPay: 100, breakdown: '{}' }), null)
  const before = { netPay: 13350, breakdown: '{}' }, after = { netPay: 11860, breakdown: JSON.stringify({ statutory: snapshot }) }
  assert.deepEqual(payrollNetChange(before, after, 5).lines, [{ label: statutory.PAYROLL_STATUTORY_TOTAL_LABEL, previous: 0, current: 1490 }])
  assert.deepEqual(payrollNetChange(before, { netPay: 9000, breakdown: '{}', loanInstallments: 4350 }, 5).lines.map(line => line.label), ['السلف'], 'من غير خصم قانوني مفيش سطر له')
})

test('PSU-05: مصدر الكود — الحساب ورا سياقه (null والإعدادين مقفولين)، والتحقق بيطرح المجموع القانوني، ومفاتيح التفعيل ليها مسار واحد لمدير النظام', () => {
  const service = read('payroll.service.ts'), run = read('payroll-statutory-run.ts')
  assert.match(service, /const statutoryContext = await readPayrollStatutoryContext\(em, \{ period: run\.period, endDate, runType: run\.runType \}\)/)
  assert.match(service, /if \(statutoryContext\) \{\n\s+totalNet = round2\(totalNet - await applyPayrollStatutory\(em, statutoryContext, run, preparedItem, emp\.id, /)
  assert.equal((service.match(/applyPayrollStatutory\(/g) ?? []).length, 1)
  assert.match(service, /if \(statutoryCents === null\) throw new ConflictException\(/)
  assert.match(service, /Number\(item\.netPay\) !== round2\(netBefore - deducted \+ workPressure - statutory\)/)
  assert.match(run, /if \(!taxOn && !martyrsOn\) return null/)
  assert.match(run, /values\.get\(EG_TAX_ENABLED_KEY\) === 'true', martyrsOn = values\.get\(EG_MARTYRS_ENABLED_KEY\) === 'true'/)
  assert.match(run, /r\.\[status\] IN \(N'CALCULATED', N'APPROVED', N'PAID'\)/)
  assert.match(run, /NOT EXISTS \(SELECT 1 FROM \[payroll_run_reversal_lines\] l WHERE l\.\[originalItemId\] = i\.\[id\] AND l\.\[status\] = N'POSTED'\)/)
  // B4.4 (ج): مفاتيح الإعدادين مذكورة في ملف الحساب (قراءة) وخدمة التفعيل (المسار الوحيد اللي بيكتبهم) بس؛ وشاشة الإعدادات العامة بترفضهم
  const calculators = fs.readFileSync(path.join(apiRoot, 'src', 'statutory', 'statutory-calculators.service.ts'), 'utf8').replace(/\r\n/g, '\n')
  assert.match(calculators, /async update\(user: JwtPayload, code: string, input: CalculatorInput\) \{\n\s+if \(user\.role !== 'super_admin'\) throw new ForbiddenException\(CALCULATOR_ADMIN_ONLY\)/)
  assert.match(calculators, /const rows = await this\.rowsOf\(em, calculator, true\)/, 'الحكم على صفوف الحزمة تحت قفلها')
  assert.match(calculators, /if \(after\.enabled\) \{\n\s+const blockers = this\.blockersOf\(calculator, rows\)\n\s+if \(blockers\.length\) throw new BadRequestException\(blockers\[0\]\)/)
  assert.match(fs.readFileSync(path.join(apiRoot, 'src', 'settings', 'settings.controller.ts'), 'utf8'), /if \(STATUTORY_CALCULATOR_CONFIG_KEYS\.includes\(dto\.key\)\) throw new BadRequestException\(STATUTORY_CALCULATOR_CONFIG_REFUSAL\)/)
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : entry.name.endsWith('.ts') ? [path.join(dir, entry.name)] : [])
  const source = path.join(apiRoot, 'src')
  for (const file of walk(source)) {
    const relative = path.relative(source, file).split(path.sep).join('/'), text = fs.readFileSync(file, 'utf8')
    for (const key of ['eg.salary_tax.enabled', 'eg.salary_tax.start_period', 'eg.martyrs_fund.enabled', 'EG_TAX_ENABLED_KEY', 'EG_MARTYRS_ENABLED_KEY', 'EG_TAX_START_PERIOD_KEY']) {
      const allowed = relative === 'payroll/payroll-statutory-run.ts' || (relative === 'statutory/statutory-calculators.service.ts' && /^EG_/.test(key))
      assert.equal(text.includes(key), allowed, `${relative}: ${key}`)
    }
  }
})
