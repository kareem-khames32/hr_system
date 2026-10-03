// B1.1: إجمالي لكل عملة في الواجهة والخادم — دوال التقسيم والعرض، وبناة التصدير، ومكوّنات الصرف بـReact SSR، وفحص نصي للربط في الشاشات.
// القاعدة: عملة واحدة = نفس العرض القديم بالحرف؛ عملتين = سطر لكل عملة، ومفيش رقم بيجمع جنيه على ريال ولا تحويل.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const server = require('../src/org/currency-totals')
const ui = require('../../src/lib/currency-totals')
const reportsApi = require('../../src/lib/payroll-reports-api')
const disbursementApi = require('../../src/lib/payroll-disbursement-api')
const { filterSocialInsuranceReport } = require('../../src/lib/social-insurance-api')
const { PayrollDisbursementTotalsCards, PayrollDisbursementSummaryTable } = require('../../src/components/payroll/PayrollDisbursementBoard')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props))
const cents = value => Math.round(Number(value) * 100)

test('التقسيم بالعملة: ترتيب ثابت ومن غير مجموعات فاضية، وإجمالي كل عملة بنفس دالة الإجمالي، ومجموعهم = الإجمالي العام', () => {
  const rows = [{ c: 'SAR', net: 100.1 }, { c: 'EGP', net: 50 }, { c: 'SAR', net: 0.2 }]
  assert.deepEqual(server.splitByCurrency(rows, row => row.c).map(group => [group.currency, group.rows.length]), [['EGP', 1], ['SAR', 2]])
  const total = list => list.reduce((sum, row) => sum + cents(row.net), 0)
  const split = server.totalsByCurrency(rows, row => row.c, total)
  assert.deepEqual(split, [{ currency: 'EGP', totals: 5000 }, { currency: 'SAR', totals: 10030 }])
  assert.equal(split.reduce((sum, group) => sum + group.totals, 0), total(rows))
  assert.deepEqual(server.totalsByCurrency([], row => row.c, total), [])
  assert.deepEqual([server.singleCurrency(['SAR', 'SAR']), server.singleCurrency(['SAR', 'EGP']), server.singleCurrency([])], ['SAR', null, null])
  // الواجهة بتستخدم نفس الملف بالحرف
  assert.equal(ui.splitByCurrency, server.splitByCurrency)
})

test('عرض الإجمالي: عملة واحدة = المبلغ بعلامته، عملتين = لكل عملة سطرها؛ وسطور الإجمالي لكل عملة فاضية لعملة واحدة', () => {
  const format = value => Number(value).toFixed(2)
  const one = [{ currency: 'EGP', totals: { net: '100.00' } }]
  const two = [{ currency: 'EGP', totals: { net: '100.00' } }, { currency: 'SAR', totals: { net: '7.50' } }]
  assert.equal(ui.moneyByCurrency(one, t => t.net, '100.00', 'ر.س', format), '100.00 ج.م')
  assert.equal(ui.moneyByCurrency(two, t => t.net, '107.50', 'ر.س', format), '100.00 ج.م — 7.50 ر.س')
  assert.equal(ui.moneyByCurrency(undefined, t => t.net, '9.00', 'ر.س', format), '9.00 ر.س', 'رد قديم من غير تفصيل = العرض القديم')
  assert.deepEqual([ui.multiCurrency(one), ui.multiCurrency(two), ui.multiCurrency(null)], [false, true, false])
  assert.deepEqual(ui.currencyTotalRows(one), [])
  assert.deepEqual(ui.currencyTotalRows(two).map(row => [row.currency, row.label]), [['EGP', 'ج.م'], ['SAR', 'ر.س']])
})

test('تقرير المسيرات: صافي المسيرات لكل عملة، والتصدير عمود عملة لعملة واحدة وعمود صافي لكل عملة لعملتين', () => {
  const run = (id, netByCurrency) => ({ id, name: `مسير ${id}`, period: '2026-08', status: 'APPROVED', scopeType: 'COMPANY', scopeLabel: 'كل الشركة', branchId: null, branchName: null,
    startDate: '2026-07-23', endDate: '2026-08-22', employees: 2, excluded: 0, partial: false, storedTotalNet: null,
    totalNet: reportsApi.sumReportMoney(netByCurrency.map(part => part.totalNet)), netByCurrency })
  const mixed = run(1, [{ currency: 'EGP', totalNet: '6199.75' }, { currency: 'SAR', totalNet: '11900.50' }])
  const riyadh = run(2, [{ currency: 'SAR', totalNet: '100.00' }])
  assert.deepEqual(reportsApi.runsNetByCurrency([mixed, riyadh]), [{ currency: 'EGP', totalNet: '6199.75' }, { currency: 'SAR', totalNet: '12000.50' }])
  assert.deepEqual(reportsApi.runsNetByCurrency([riyadh, run(3, [])]), [{ currency: 'SAR', totalNet: '100.00' }], 'مسير فاضي مابيعملش عملة فاضية')
  const multi = reportsApi.runsReportCsv({ runs: [mixed, riyadh], byMethod: [], deductions: [] })
  assert.deepEqual(multi.header.slice(-2), ['صافي الإجمالي ج.م', 'صافي الإجمالي ر.س'])
  assert.deepEqual(multi.rows.map(row => row.slice(-2)), [['6199.75', '11900.50'], ['0.00', '100.00']])
  const single = reportsApi.runsReportCsv({ runs: [riyadh], byMethod: [], deductions: [] })
  assert.deepEqual([single.header.slice(-2), single.rows[0].slice(-2)], [['العملة', 'صافي الإجمالي'], ['ر.س', '100.00']])
  for (const table of [multi, single]) for (const row of table.rows) assert.equal(row.length, table.header.length)
})

test('الصرف: كروت لكل عملة، وملخص الشهر سطر لكل مسير في كل عملة وإجمالي لكل عملة، والتصدير سطرين لكل عملة؛ عملة واحدة = نفس الشكل القديم بالحرف', () => {
  const bucket = (count, total, bank, cash) => ({ count, total, bank, cash })
  const totalsOf = (paid, unpaid) => ({ paid, unpaid, payable: bucket(paid.count + unpaid.count, paid.total + unpaid.total, paid.bank + unpaid.bank, paid.cash + unpaid.cash),
    settlement: { count: 0, total: 0 }, noAmount: 0, issues: 0 })
  const egp = totalsOf(bucket(1, 6199.75, 6199.75, 0), bucket(0, 0, 0, 0))
  const sar = totalsOf(bucket(1, 5950.5, 5950.5, 0), bucket(1, 5950, 0, 5950))
  const all = totalsOf(bucket(2, 12150.25, 12150.25, 0), bucket(1, 5950, 0, 5950))
  const byCurrency = [{ currency: 'EGP', totals: egp }, { currency: 'SAR', totals: sar }]
  const cards = render(PayrollDisbursementTotalsCards, { totals: all, byCurrency })
  assert.deepEqual([...cards.matchAll(/data-currency-total="(\w+)"/g)].map(match => match[1]), ['EGP', 'SAR'])
  for (const text of ['جنيه مصري (ج.م)', 'ريال سعودي (ر.س)', '6,199.75', '5,950.50', '5,950.00']) assert.ok(cards.includes(text), text)
  assert.ok(!cards.includes('12,150.25'), 'مفيش كارت بيجمع الجنيه على الريال')
  assert.equal(render(PayrollDisbursementTotalsCards, { totals: egp, byCurrency: [byCurrency[0]] }), render(PayrollDisbursementTotalsCards, { totals: egp }),
    'عملة واحدة = نفس الكروت القديمة بالحرف')

  const run = { id: 7, name: 'مسير الفرعين', period: '2026-08', startDate: '2026-07-23', endDate: '2026-08-22', status: 'APPROVED', runType: 'REGULAR', mode: 'PER_EMPLOYEE',
    marking: 'OPEN', closed: null, unpaidReason: null, ...all, byCurrency }
  const summary = render(PayrollDisbursementSummaryTable, { summary: { period: '2026-08', runId: null, runs: [run], totals: all, byCurrency } })
  for (const text of ['مسير الفرعين<span class="text-xs text-gray-500 mr-1">(ج.م)</span>', '(ر.س)', 'إجمالي الشهر ج.م', 'إجمالي الشهر ر.س']) assert.ok(summary.includes(text), text)
  assert.ok(!summary.includes('12,150.25'))
  const oneRun = { ...run, ...egp, byCurrency: [byCurrency[0]] }
  const plain = render(PayrollDisbursementSummaryTable, { summary: { period: '2026-08', runId: null, runs: [oneRun], totals: egp, byCurrency: [byCurrency[0]] } })
  assert.ok(plain.includes('>إجمالي الشهر<') && !plain.includes('(ج.م)'), 'عملة واحدة: سطر «إجمالي الشهر» زي الأول')

  const csv = disbursementApi.disbursementCsvTotals(all, byCurrency)
  assert.deepEqual(csv.map(line => [line[0], line[8], line[11]]), [['إجمالي «تم الصرف» ج.م', '6199.75', 'ج.م'], ['إجمالي «لم يتم» ج.م', '0.00', 'ج.م'],
    ['إجمالي «تم الصرف» ر.س', '5950.50', 'ر.س'], ['إجمالي «لم يتم» ر.س', '5950.00', 'ر.س']])
  assert.deepEqual(disbursementApi.disbursementCsvTotals(egp, [byCurrency[0]]).map(line => [line[0], line[11]]), [['إجمالي «تم الصرف»', 'ج.م'], ['إجمالي «لم يتم»', 'ج.م']])
  for (const line of csv) assert.equal(line.length, disbursementApi.DISBURSEMENT_CSV_HEADER.length)
})

test('التأمينات: فلتر الفرع ← الإدارة بيعيد الإجمالي لكل عملة من نفس الصفوف المتفلترة', () => {
  const row = (employeeId, currency, employeeShare, employerShare) => ({ employeeId, employeeCode: `E${employeeId}`, fullName: `موظف ${employeeId}`, branchId: 1, branchName: null,
    nationality: null, gosiNumber: null, system: 'SAUDI', category: null, salarySource: 'BASIC', insuredSalary: 1000, employeePct: 9, employerPct: 9, employeeShare, employerShare,
    source: 'ESTIMATE', currency })
  const report = { period: '2026-08', branchId: null, rows: [row(1, 'EGP', 110, 187.5), row(2, 'SAR', 97.5, 117), row(3, 'SAR', 1, 1)], totals: null }
  const filtered = filterSocialInsuranceReport(report, id => id !== 3)
  assert.deepEqual(filtered.byCurrency.map(group => [group.currency, group.totals.total]), [['EGP', '297.50'], ['SAR', '214.50']])
  assert.equal(filtered.totals.total, '512.00')
})

test('الشاشات: كل تقرير بيجمع فروع بيعرض إجمالي لكل عملة، والمحررات بتقول إن الحد بيتقري بعملة فرع الموظف، وشاشات «ملفي» بعملة الحساب نفسه', () => {
  for (const file of ['src/app/reports/payroll-register/page.tsx', 'src/app/reports/payroll-cost/page.tsx', 'src/app/reports/deductions/page.tsx', 'src/app/reports/overtime/page.tsx',
    'src/app/reports/loans/page.tsx', 'src/app/reports/cost-centers/page.tsx']) {
    const source = read(file)
    assert.match(source, /currencyTotalRows\(report\.byCurrency\)/, `${file}: سطور الإجمالي لكل عملة`)
    assert.match(source, /data-currency-total/, `${file}: سطر إجمالي معلّم بعملته`)
    assert.match(source, /moneyByCurrency\(/, `${file}: البطاقات لكل عملة`)
  }
  const runsPage = read('src/app/payroll/reports/page.tsx')
  for (const text of ['runsNetByCurrency(active)', 'run.netByCurrency.map((part)', "key={`${method.payMethod}:${method.currency ?? ''}`}", "key={`${row.period}:${row.currency ?? ''}`}"]) {
    assert.ok(runsPage.includes(text), text)
  }
  const hub = read('src/app/reports/page.tsx')
  for (const text of ['payrollTotals.map((t) =>', 'payrollSeries.map((series, index) =>', 'runNetText(r)']) assert.ok(hub.includes(text), text)
  assert.ok(!/payroll\?\.runs\.reduce\(\(sum, r\) => sum \+ Number\(r\.totalNet\)/.test(hub), 'مفيش إجمالي واحد بيجمع صافي المسيرات كلها')
  const run = read('src/app/payroll/page.tsx')
  for (const text of ['splitByCurrency(filteredItems, itemCurrency)', 'footerRows.map(row => (', 'data-pay-methods-currencies', 'currency={rowCurrency(item)}']) assert.ok(run.includes(text), text)
  assert.ok(read('src/app/payroll/disbursement/page.tsx').includes('<PayrollDisbursementTotalsCards totals={view.totals} byCurrency={view.byCurrency} />'))
  const bank = read('src/app/payroll/bank-sheet/page.tsx')
  for (const text of ["'تنبيه', 'العملة']", 'sheet.byCurrency.map(group =>', 'money(t => t.net, sheet.totals.net)']) assert.ok(bank.includes(text), text)
  assert.ok(read('src/app/payroll/gosi/page.tsx').includes('currencyTotalRows(report.byCurrency)'))
  assert.ok(read('src/components/approvals/ChainEditorModal.tsx').includes("mixedCurrencies && formData.branchId === 'all'"))
  assert.ok(read('src/app/settings/policies/page.tsx').includes('data-loan-cap-currency-note'))
  for (const file of ['src/components/payroll/TypedDeductionsWorkspace.tsx', 'src/components/payroll/BonusesWorkspace.tsx']) assert.ok(read(file).includes('data-type-currency-note'), file)
  for (const file of ['src/app/my/payslips/page.tsx', 'src/app/my/loans/page.tsx', 'src/app/my/deductions/page.tsx', 'src/app/my/bonuses/page.tsx']) {
    const source = read(file)
    assert.ok(source.includes('const currency = useOwnCurrency()') && !source.includes('useCurrency()'), file)
  }
})

test('مراجعة المعتمد: إجماليات لكل عملة بعنوانها، وعملة واحدة = نفس الكروت القديمة، و«بانتظار اعتمادي» بصافي كل عملة', () => {
  const { PayrollApprovalReviewTotals } = require('../../src/components/payroll/PayrollApprovalReviewTable')
  const totals = (employees, net) => ({ employees, earnings: net, deductions: 0, net, negativeNet: 0 })
  const byCurrency = [{ currency: 'EGP', totals: totals(1, 1000.25) }, { currency: 'SAR', totals: totals(1, 1000.5) }]
  const html = render(PayrollApprovalReviewTotals, { totals: totals(2, 2000.75), byCurrency })
  assert.deepEqual([...html.matchAll(/data-currency-total="(\w+)"/g)].map(match => match[1]), ['EGP', 'SAR'])
  assert.ok(html.includes('جنيه مصري (ج.م)') && html.includes('1,000.25') && !html.includes('2,000.75'))
  assert.equal(render(PayrollApprovalReviewTotals, { totals: totals(1, 5), byCurrency: [{ currency: 'SAR', totals: totals(1, 5) }] }),
    render(PayrollApprovalReviewTotals, { totals: totals(1, 5) }))
  const page = read('src/app/payroll/my-approvals/page.tsx')
  assert.ok(page.includes('run.netByCurrency.map(part =>') && page.includes('<PayrollApprovalReviewTotals totals={review.totals} byCurrency={review.byCurrency} />'))
})
