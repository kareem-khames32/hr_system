// شاشات التقارير المالية لشهر الرواتب: كل تقرير له شاشة بفلاتر الشهر/الفرع/القسم/مركز التكلفة وتصدير Excel وطباعة،
// ومربوطة من «لوحة التقارير» و«تقرير الرواتب» (ومعاها تقرير مراكز التكلفة الموجود)، ومساراتها مطابقة للخادم. فحص نصي بلا تشغيل.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const { pageTitleFor } = require('../../src/components/layout/pageTitles')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const REPORTS = [
  { route: '/reports/payroll-register', title: 'تقرير الرواتب', fetcher: 'fetchPayrollRegister', endpoint: 'payroll-register' },
  { route: '/reports/payroll-cost', title: 'ملخص تكلفة الرواتب', fetcher: 'fetchPayrollCost', endpoint: 'payroll-cost' },
  { route: '/reports/deductions', title: 'تقرير الخصومات', fetcher: 'fetchDeductionsReport', endpoint: 'deductions' },
  { route: '/reports/loans', title: 'تقرير السلف', fetcher: 'fetchLoansReport', endpoint: 'loans' },
  { route: '/reports/overtime', title: 'تقرير الإضافي', fetcher: 'fetchOvertimePayReport', endpoint: 'overtime' },
]

test('every financial report has its own screen with the shared filters, Excel export and print, titled like its link', () => {
  const api = read('src/app/reports/_financial/api.ts')
  const controller = read('api/src/reports/financial-report.controller.ts')
  const shell = read('src/app/reports/_financial/ReportShell.tsx')
  for (const report of REPORTS) {
    const page = read(`src/app${report.route}/page.tsx`)
    assert.match(page, new RegExp(`useFinancialReport\\(${report.fetcher}\\)`), report.route)
    assert.match(page, new RegExp(`title="${report.title}"`), report.route)
    assert.match(page, /downloadCsv\(/, `${report.route} يصدّر ملف`)
    assert.match(api, new RegExp(`${report.fetcher} = [^\\n]*/reports/financial/${report.endpoint}\\$\\{query\\(filters\\)\\}`), report.route)
    assert.match(controller, new RegExp(`@Get\\('${report.endpoint}'\\)`), report.route)
    assert.equal(pageTitleFor(report.route), report.title)
  }
  // الفلاتر: شهر الرواتب بحدوده، والفرع (مقفول لحساب الفرع)، والقسم، ومركز التكلفة، والمسيرات اللي لسه ما اتعتمدتش
  for (const text of ['شهر الرواتب', 'كل الفروع', 'كل الأقسام', 'كل مراكز التكلفة', 'اعرض كمان المسيرات اللي لسه ما اتعتمدتش', 'header.startDate', 'header.endDate']) {
    assert.ok(shell.includes(text), `الإطار المشترك ناقص «${text}»`)
  }
  assert.match(shell, /window\.print\(\)/)
  assert.match(shell, /@page \{ size: A4 landscape/)
  assert.match(shell, /تصدير Excel/)
})

test('the reports hub and the payroll reports page link all financial reports, and the cost-center report stays linked', () => {
  const links = read('src/app/reports/_financial/links.tsx')
  for (const report of REPORTS) assert.ok(links.includes(`href: '${report.route}'`), report.route)
  assert.ok(links.includes("href: '/reports/cost-centers'"))
  const hub = read('src/app/reports/page.tsx')
  assert.match(hub, /\{canPayroll && <FinancialReportLinks \/>\}/)
  assert.match(hub, /setCanPayroll\(can\('payroll\.view'\)\)/)
  const payrollReports = read('src/app/payroll/reports/page.tsx')
  assert.match(payrollReports, /\{canReports && <FinancialReportLinks title="التقارير المالية للشهر" \/>\}/)
})
