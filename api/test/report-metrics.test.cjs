'use strict'
// B2.13 (أ): قاموس المؤشرات والتصدير من الخادم — فحص من غير قاعدة (الأرقام الفعلية في report-metrics.integration.cjs):
//  MX-01) القاموس: ستة مؤشرات بتعريفها، وقواعد الموظف الحالي والنشط والنِّسب.
//  MX-02) مصدر واحد: اللوحة وتقرير القوى العاملة بيقروا من workforce()، ومفيش شرط «الحاليين» مكتوب باليد في اللوحة، وتقرير
//         الحضور ومؤشر الغياب بنفس شرط «برّه فترة الخدمة».
//  MX-03) جداول التصدير: أعمدة كل تقرير، وعمود المبلغ بصلاحيته، والنص الخطر متهرّب في PDF ونص في Excel.
//  MX-04) نصوص الحالات والفئات في الخادم = نصوص الواجهة.
//  MX-05) الواجهة: التصدير من الخادم (مش CSV المتصفح)، وشريط المؤشرات، وسطر النشطين في اللوحة.
// Run (من api/): node --test test/report-metrics.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const ExcelJS = require('../node_modules/exceljs')
const metrics = require('../src/reports/metrics')
const exporter = require('../src/reports/report-export')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')

test('MX-01: the dictionary holds six metrics with one written definition each, and the rules behind them', () => {
  assert.deepEqual(metrics.METRICS.map(item => item.key), ['headcount', 'active_employees', 'turnover', 'absence', 'overtime', 'employee_cost'])
  for (const item of metrics.METRICS) {
    assert.ok(item.label && item.definition.length > 20, item.key)
    assert.ok(['count', 'percent', 'hours', 'money'].includes(item.unit), item.key)
  }
  assert.deepEqual(metrics.metricOf('employee_cost').modules, ['payroll']); assert.equal(metrics.metricOf('employee_cost').perm, 'payroll.view')
  assert.deepEqual(metrics.metricOf('absence').modules, ['attendance']); assert.deepEqual(metrics.metricOf('overtime').modules, ['overtime'])
  // الموظف الحالي: ملف مفعّل وحالته مش منتهي ولا مؤرشف
  const row = (status, isActive = true) => ({ status, isActive })
  for (const status of ['active', 'probation', 'notice_period', 'suspended']) assert.equal(metrics.isCurrentEmployee(row(status)), true, status)
  for (const status of ['archived', 'terminated']) assert.equal(metrics.isCurrentEmployee(row(status)), false, status)
  assert.equal(metrics.isCurrentEmployee(row('suspended', false)), false, 'ملف مقفول برّه العدد')
  assert.equal(metrics.isCurrentEmployee(row('active', 1)), true); assert.equal(metrics.isCurrentEmployee(row('active', 0)), false)
  // النشط بالحالة المعروضة: الموقوف بفترة (محفوظ «نشط» ومعروض «موقوف») مش نشط
  assert.equal(metrics.isActiveEmployee(row('active'), 'active'), true)
  assert.equal(metrics.isActiveEmployee(row('active'), 'suspended'), false)
  assert.equal(metrics.isActiveEmployee(row('probation'), 'probation'), false)
  assert.equal(metrics.isActiveEmployee(row('active', false), 'active'), false)
  assert.equal(metrics.currentEmployeeSql('e.'), "e.isActive = 1 AND e.status NOT IN ('archived', 'terminated')")
  assert.equal(metrics.currentEmployeeSql(), "isActive = 1 AND status NOT IN ('archived', 'terminated')")
  // النِّسب: خانتين، ومقام صفر = مفيش رقم
  assert.equal(metrics.percent(1, 3), 33.33); assert.equal(metrics.percent(2, 3), 66.67); assert.equal(metrics.percent(0, 5), 0)
  assert.equal(metrics.percent(1, 0), null)
  assert.equal(metrics.turnoverRate(1, 9, 9), 11.11); assert.equal(metrics.turnoverRate(3, 10, 20), 20); assert.equal(metrics.turnoverRate(0, 0, 0), null)
  assert.equal(metrics.absenceRate(3, 9), 33.33); assert.equal(metrics.absenceRate(0, 0), null)
})

test('MX-02: the dashboard and the workforce report read one function, and absence has one condition', () => {
  const dashboard = read('api/src/dashboard/dashboard.controller.ts'), reports = read('api/src/reports/reports.controller.ts')
  const service = read('api/src/reports/metrics.service.ts')
  assert.match(dashboard, /const workforce = await this\.metrics\.workforce\(scope\)/)
  assert.match(dashboard, /employees: \{ total: workforce\.headcount, active: workforce\.active, probation: workforce\.probation \}/)
  assert.doesNotMatch(dashboard, /NOT IN \('archived', 'terminated'\)/, 'شرط «الحاليين» من القاموس مش مكتوب باليد')
  assert.equal(dashboard.split("${currentEmployeeSql('e.')}").length - 1, 2)
  assert.match(reports, /const workforce = await this\.metrics\.workforce\(branchScopeOf\(user\), org\)/)
  assert.match(reports, /summary: \{ headcount: workforce\.headcount, active: workforce\.active \}/)
  assert.doesNotMatch(reports, /displayEmployeeStatus\(|readOpenSuspensions\(/, 'الحالة المعروضة بتتحسب في مكان واحد (MetricsService)')
  assert.match(service, /isCurrentEmployee\(row\), isActive = isActiveEmployee\(row, status\)/)
  // شرط «غياب برّه فترة الخدمة»: التقرير والمؤشر من نفس الدالة
  assert.equal(reports.split("absenceOutsideServiceSql('a', 'e')").length - 1, 1)
  assert.equal(service.split("absenceOutsideServiceSql('a', 'e')").length - 1, 1)
  assert.doesNotMatch(reports, /oc\.lastWorkingDay < a\.date/, 'الشرط مش منسوخ في التقرير')
  // مسار التصدير: موديول التقرير، ثم جدول من دالة التقرير، ثم سطر التدقيق قبل الإرسال
  const exportAt = reports.indexOf("@Get('export')")
  const body = reports.slice(exportAt, reports.indexOf('private async companyName'))
  assert.ok(exportAt > 0)
  assert.ok(body.indexOf('this.modules.allowedFor(') < body.indexOf('this.reportTable(') && body.indexOf('this.reportTable(') < body.indexOf('recordAudit(')
    && body.indexOf('recordAudit(') < body.indexOf('res.send(buffer)'))
  assert.match(body, /category: 'EXPORT', action: 'REPORT_EXPORT'/)
  for (const call of ['this.headcount(user', 'this.attendance(user', 'this.leaves(user', 'this.payroll(user', 'this.overtime(user', 'this.requests(user', 'this.metricValues(user']) {
    assert.ok(reports.slice(reports.indexOf('private async reportTable')).includes(call), call)
  }
  // موديولات التصدير = موديولات مسارات التقارير
  const moduleOf = route => (new RegExp(`@RequireModule\\(([^)]*)\\)\\s*@Get\\('${route}'\\)`).exec(reports) ?? [])[1] ?? ''
  assert.equal(moduleOf('attendance'), "'attendance'"); assert.equal(moduleOf('leaves'), "'leave'")
  assert.equal(moduleOf('payroll'), "'payroll'"); assert.equal(moduleOf('overtime'), "'overtime'")
  assert.deepEqual(exporter.REPORT_MODULES, { headcount: [], attendance: ['attendance'], leaves: ['leave'], payroll: ['payroll'], overtime: ['overtime'], requests: [], metrics: [] })
})

test('MX-03: export tables keep the screen columns, the amount column follows the permission, and dangerous text stays text', async () => {
  const headcount = exporter.headcountTable({ date: '2026-10-07', summary: { headcount: 8, active: 5 },
    byBranch: [{ branchName: 'الرياض', total: 6, active: 3 }], byDepartment: [{ departmentName: 'المبيعات', total: 6 }],
    byStatus: [{ status: 'active', total: 5 }, { status: 'archived', total: 1 }, { status: 'x_new', total: 1 }] })
  assert.deepEqual(headcount.columns.map(column => column.header), ['النوع', 'الاسم/الحالة', 'الإجمالي', 'النشطون'])
  assert.deepEqual(headcount.rows, [['الإجمالي', 'الموظفون الحاليون', 8, 5], ['فرع', 'الرياض', 6, 3], ['قسم', 'المبيعات', 6, null],
    ['حالة', 'نشط', 5, null], ['حالة', 'مؤرشف', 1, null], ['حالة', 'x_new', 1, null]])
  assert.equal(headcount.title, 'تقرير القوى العاملة'); assert.equal(headcount.subtitle, 'حتى 2026-10-07')
  const requests = exporter.requestsTable({ byType: [
    { category: 'leaves', status: 'COMPLETED', total: 2 }, { category: 'leaves', status: 'UNDER_REVIEW', total: 1 }, { category: 'leaves', status: 'CANCELLED', total: 4 },
    { category: 'financial', status: 'REJECTED', total: 3 }] })
  assert.deepEqual(requests.rows, [['الإجازات', 2, 1, 0, 4, 7], ['المالية', 0, 0, 3, 0, 3]])
  const range = { from: '2026-08-01', to: '2026-08-31' }
  const noAmount = exporter.overtimeTable([{ fullName: 'أحمد', status: 'APPROVED', entries: 1, actualHours: 2, payableHours: 3 }], range)
  assert.equal(noAmount.columns.some(column => column.header === 'قيمة المعتمد'), false)
  const withAmount = exporter.overtimeTable([{ fullName: 'أحمد', status: 'PAID', entries: 1, actualHours: 2, payableHours: 3, approvedAmount: '150.50' }], range)
  assert.deepEqual(withAmount.rows[0], ['أحمد', 'مدفوع', 1, 2, 3, 150.5])
  const payroll = exporter.payrollTable({ runs: [
    { id: 1, name: 'أغسطس', period: '2026-08', branchName: null, scopeLabel: 'كل الفروع', status: 'APPROVED', employees: 3, totalNet: '0',
      netByCurrency: [{ currency: 'SAR', totalNet: '9000.00' }, { currency: 'EGP', totalNet: '5000.00' }] }] })
  assert.deepEqual(payroll.columns.map(column => column.header).slice(-2), ['الصافي EGP', 'الصافي SAR'], 'كل عملة في عمود')
  assert.deepEqual(payroll.rows[0], [1, 'أغسطس', '2026-08', 'كل الفروع', 'معتمد', 3, 5000, 9000])
  assert.equal(exporter.metricValueText({ unit: 'percent', value: 11.11 }), '11.11%')
  assert.equal(exporter.metricValueText({ unit: 'percent', value: null }), '—')
  assert.equal(exporter.metricValueText({ unit: 'money', value: null, byCurrency: [{ currency: 'SAR', value: '9500.00', employees: 2 }, { currency: 'EGP', value: '7000.00', employees: 1 }] }),
    '9500.00 SAR + 7000.00 EGP')
  assert.equal(exporter.metricValueText({ unit: 'money', value: null, byCurrency: [] }), '—')
  // PDF: كل نص متهرّب
  const evil = exporter.attendanceTable([{ employeeCode: '0012', fullName: '<script>alert(1)</script>', presentDays: 1 }], range)
  const html = exporter.reportTableHtml(evil, { company: 'شركة <b>', printedAt: '2026-10-07', printedBy: 'a@b.c' }, 'AAAA')
  assert.doesNotMatch(html, /<script>alert|شركة <b>/)
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/); assert.match(html, /dir="rtl"/)
  // Excel: النص نص (كود 0012 بأصفاره، ونص يبدأ بـ= مش معادلة)
  const book = new ExcelJS.Workbook()
  await book.xlsx.load(await exporter.writeReportWorkbook(exporter.attendanceTable([{ employeeCode: '0012', fullName: '=1+1', presentDays: 2 }], range)))
  const sheet = book.worksheets[0]
  assert.equal(sheet.getCell('A2').value, '0012'); assert.equal(sheet.getCell('A2').type, ExcelJS.ValueType.String)
  assert.equal(sheet.getCell('B2').value, '=1+1'); assert.equal(sheet.getCell('B2').type, ExcelJS.ValueType.String)
  assert.equal(sheet.getCell('C2').value, 2)
  assert.equal(sheet.views[0].rightToLeft, true)
})

test('MX-04: status and category labels on the server are the labels of the screens', () => {
  const statuses = read('src/lib/status-labels.ts'), catalog = read('src/data/requestsCatalog.ts')
  const block = (text, name) => text.slice(text.indexOf(name), text.indexOf('\n}', text.indexOf(name)))
  for (const [key, label] of Object.entries(exporter.EMPLOYEE_STATUS_LABELS)) assert.ok(block(statuses, 'export const EMPLOYEE_STATUS').includes(`${key}: { label: '${label}'`), key)
  for (const [key, label] of Object.entries(exporter.OVERTIME_STATUS_LABELS)) assert.ok(block(statuses, 'export const OVERTIME_STATUS').includes(`${key}: { label: '${label}'`), key)
  for (const [key, label] of Object.entries(exporter.REQUEST_CATEGORY_LABELS)) assert.ok(block(catalog, 'export const categoryLabels').includes(`${key}: '${label}'`), key)
  assert.equal(Object.keys(exporter.REQUEST_CATEGORY_LABELS).length, block(catalog, 'export const categoryLabels').split('\n').length - 1)
})

test('MX-05: the reports screen exports from the server, shows the dictionary strip, and the dashboard shows the active number', () => {
  const page = read('src/app/reports/page.tsx'), lib = read('src/lib/reports-org-api.ts'), cards = read('src/components/dashboard/StatsCards.tsx')
  assert.doesNotMatch(page, /downloadCsv|csvDateStamp/, 'التصدير من الخادم مش CSV من المتصفح')
  assert.match(page, /await exportReportFor\(id, format, org\.params, extra\)/)
  assert.match(page, /onClick=\{\(\) => exportReport\(report\.id, 'pdf'\)\}/)
  assert.match(page, /data-report-metrics/); assert.match(page, /title=\{item\.definition\}/)
  assert.match(page, /const totalEmployees = Number\(headcount\?\.summary\.headcount \?\? 0\)/)
  assert.match(page, /const activeEmployees = Number\(headcount\?\.summary\.active \?\? 0\)/)
  assert.match(lib, /withOrg\('\/reports\/export', params, new URLSearchParams\(\{ report, format, \.\.\.extra \}\)\)/)
  assert.match(lib, /withOrg\('\/reports\/metrics', params\)/)
  assert.match(cards, /hint: `منهم \$\{Number\(stats\.employees\.active\)\.toLocaleString\('en-US'\)\} نشط`/)
})
