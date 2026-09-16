// تقرير مراكز التكلفة (تجميع البنود) + تحقق ملف الشركة (آيبان/بريد/رقم موحد...) + مفاتيح ترحيل 051.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { aggregateCostCenterReport, costCenterCents, costCenterMoney, NO_COST_CENTER_NAME } = require('../src/reports/cost-center-report')
const { companyProfileConfigError, COMPANY_PROFILE_NEW_KEYS } = require('../src/settings/company-profile')

const root = path.join(__dirname, '..')
const row = (over) => ({
  runId: 1, runName: 'سبتمبر', runStatus: 'APPROVED', employeeId: 1, employeeCode: 'E1', fullName: 'أحمد', branchId: 1, branchName: 'الرياض',
  costCenterId: 10, costCenterCode: 'CC10', costCenterName: 'المشاريع',
  basicSalary: '5000.00', allowances: '1000.00', overtimeAmount: '0.00', otherAdditions: '0.00',
  latenessDeduction: '0.00', shortfallDeduction: '0.00', absenceDeduction: '0.00', unpaidLeaveDeduction: '0.00', loanInstallments: '0.00', otherDeductions: '0.00',
  socialInsuranceDeduction: '0.00', netPay: '6000.00', employerInsurance: null, ...over,
})

test('money: cents cut (no rounding) and text with 2 decimals', () => {
  assert.equal(costCenterCents('1234.567'), 123456n)
  assert.equal(costCenterCents('-1.239'), -123n)
  assert.equal(costCenterCents(0.1 + 0.2), 30n)
  assert.equal(costCenterCents(null), 0n)
  assert.equal(costCenterMoney(123456n), '1234.56')
  assert.equal(costCenterMoney(-5n), '-0.05')
})

test('groups by cost center: headcount distinct, gross/deductions/net summed, no-center last', () => {
  const report = aggregateCostCenterReport([
    row({ employeeId: 1, fullName: 'بسمة', latenessDeduction: '100.10', socialInsuranceDeduction: '585.00', netPay: '5314.90', employerInsurance: '705' }),
    // نفس الموظف في مسير تكميلي: يتحسب مرة واحدة في العدد ومبالغه تتجمع
    row({ runId: 2, runName: null, runStatus: 'PAID', employeeId: 1, fullName: 'بسمة', basicSalary: '0.00', allowances: '0.00', otherAdditions: '250.55', netPay: '250.55' }),
    row({ employeeId: 2, fullName: 'أحمد', overtimeAmount: '99.99', loanInstallments: '500', netPay: '5599.99', employerInsurance: '705.5' }),
    row({ employeeId: 3, fullName: 'كريم', costCenterId: null, costCenterCode: null, costCenterName: null, otherDeductions: '10.01', netPay: '5989.99' }),
    row({ employeeId: 4, fullName: 'زياد', costCenterId: 7, costCenterCode: 'A', costCenterName: 'الإدارة', netPay: '6000.00' }),
  ], true)
  assert.deepEqual(report.centers.map(c => c.name), ['الإدارة', 'المشاريع', NO_COST_CENTER_NAME])
  const projects = report.centers[1]
  assert.equal(projects.headcount, 2)
  assert.equal(projects.gross, '12350.54') // 6000 + 250.55 + 6099.99
  assert.equal(projects.deductions, '1185.10') // 100.10 + 585 + 500
  assert.equal(projects.net, '11165.44')
  assert.equal(projects.employerInsurance, '1410.50')
  assert.equal(projects.employees.length, 3)
  assert.deepEqual(projects.employees.map(e => [e.fullName, e.runId]), [['أحمد', 1], ['بسمة', 1], ['بسمة', 2]])
  assert.equal(projects.employees[1].deductions, '685.10')
  const none = report.centers[2]
  assert.equal(none.costCenterId, null)
  assert.equal(none.code, null)
  assert.equal(none.deductions, '10.01')
  assert.equal(report.totals.headcount, 4)
  assert.equal(report.totals.net, '23155.43')
  assert.equal(report.totals.employerInsurance, '1410.50')
})

test('employer insurance is null everywhere when the insurance source is not available', () => {
  const report = aggregateCostCenterReport([row({ employerInsurance: '999' })], false)
  assert.equal(report.totals.employerInsurance, null)
  assert.equal(report.centers[0].employerInsurance, null)
  assert.equal(report.centers[0].employees[0].employerInsurance, null)
  assert.deepEqual(aggregateCostCenterReport([], true), { centers: [], totals: { headcount: 0, gross: '0.00', deductions: '0.00', net: '0.00', employerInsurance: '0.00' } })
})

test('company profile validation: IBAN SA/EG, email, unified number, dates, digits; empty always allowed', () => {
  const ok = (key, value) => assert.equal(companyProfileConfigError(key, value), null, `${key}=${value}`)
  const bad = (key, value) => assert.ok(companyProfileConfigError(key, value), `${key}=${value} should fail`)
  for (const key of COMPANY_PROFILE_NEW_KEYS) ok(key, '')
  ok('company.payroll_iban', 'SA0380000000608010167519')
  ok('company.payroll_iban', 'EG380019000500000000263180002')
  bad('company.payroll_iban', 'SA03 8000 0000 6080 1016 7519')
  bad('company.payroll_iban', 'AE070331234567890123456')
  bad('company.payroll_iban', 'SA038000000060801016751')
  ok('company.email', 'hr@maharah.sa'); bad('company.email', 'hr@maharah'); bad('company.email', 'hr maharah.sa')
  ok('company.unified_number', '7001234567'); bad('company.unified_number', '6001234567'); bad('company.unified_number', '700123456')
  ok('company.commercial_register_expiry', '2027-02-28'); bad('company.commercial_register_expiry', '2027-02-30'); bad('company.commercial_register_expiry', '28/02/2027')
  ok('company.vat_number', '300000000000003'); bad('company.vat_number', '3000A'); bad('company.vat_number', '1234')
  ok('company.national_address_postal_code', '12345'); bad('company.national_address_postal_code', '1234')
  ok('company.website', 'www.maharah.sa'); ok('company.website', 'https://maharah.sa/about'); bad('company.website', 'not a site')
  ok('company.wps_establishment_id', 'MUDAD-123'); bad('company.wps_establishment_id', 'رقم')
  ok('company.qiwa_establishment_number', '1-2345678')
  // المفاتيح القديمة والحرة بدون تحقق إضافي
  ok('company.phone', 'أي نص'); ok('company.national_address_street', 'طريق الملك فهد')
})

test('PATCH /settings/config runs the company profile check, seed + migration 051 create every new key', () => {
  const controller = fs.readFileSync(path.join(root, 'src/settings/settings.controller.ts'), 'utf8')
  assert.match(controller, /companyProfileConfigError\(dto\.key, dto\.value\)/)
  assert.match(fs.readFileSync(path.join(root, 'src/seed/requests-seed.data.ts'), 'utf8'), /COMPANY_PROFILE_NEW_KEYS\.map/)
  const migration = fs.readFileSync(path.join(root, '..', 'docs/migrations/payroll/20260916_051_company_profile_keys.sql'), 'utf8')
  for (const key of COMPANY_PROFILE_NEW_KEYS) assert.ok(migration.includes(`(N'${key}')`), key)
  assert.match(migration, /<> 17/)
  assert.equal(COMPANY_PROFILE_NEW_KEYS.length, 17)
  assert.doesNotMatch(migration, /\b(DELETE|DROP|UPDATE|TRUNCATE)\b/)
})

test('cost center endpoint: branch scoped, payroll.view required, registered in AppModule', () => {
  const controller = fs.readFileSync(path.join(root, 'src/reports/cost-center-report.controller.ts'), 'utf8')
  assert.match(controller, /userHasPerm\(user, 'payroll\.view'\)/)
  assert.match(controller, /const branchId = scope \?\? query\.branchId \?\? null/)
  const appModule = fs.readFileSync(path.join(root, 'src/app.module.ts'), 'utf8')
  assert.match(appModule, /CostCenterReportController/)
  assert.match(appModule, /providers: \[CostCenterReportService\]/)
})
