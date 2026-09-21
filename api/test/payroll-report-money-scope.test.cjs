// تدقيق ما قبل الإطلاق (تقارير): قاعدة «مال الشهر» واحدة في تقارير الرواتب والفروق والتقارير المالية،
// و«موقوف بلا أجر» مشتق من فترات الإيقاف لا من عمود حالة محفوظ. قواعد نقية بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })

const reports = require('../src/payroll/payroll-reports')
const rules = require('../src/employees/employee-suspension-rules')
const unassigned = require('../src/payroll/payroll-unassigned-report')

// ملفات المستودع بنهايات CRLF — القراءة تتوحّد قبل أي مطابقة
const source = file => fs.readFileSync(path.join(apiRoot, 'src', file), 'utf8').replace(/\r\n/g, '\n')

const STATUSES = ['DRAFT', 'CALCULATED', 'IN_REVIEW', 'APPROVED', 'PAID', 'CANCELLED']

test('month totals count approved and paid runs only, and includeDraft adds the calculated-but-unapproved ones', () => {
  assert.deepEqual(STATUSES.filter(status => reports.payrollReportRunInTotals(status)), ['APPROVED', 'PAID'],
    'الافتراضي: المعتمد والمصروف وحدهما مال فعلي')
  assert.deepEqual(STATUSES.filter(status => reports.payrollReportRunInTotals(status, true)),
    ['CALCULATED', 'IN_REVIEW', 'APPROVED', 'PAID'], 'includeDraft يضيف المحسوب وقيد المراجعة — لا المسودة ولا الملغى')
  // العلم منطقي صريح: أي قيمة غير true تبقى «المعتمد وحده»
  for (const loose of [false, undefined, null, 0, '', 'true', 1]) {
    assert.equal(reports.payrollReportRunInTotals('CALCULATED', loose), false, String(loose))
  }
})

test('the SQL status predicate matches the financial service rule for both aliases and both flag values', () => {
  assert.equal(reports.payrollReportRunStatusSql('r.'), `r.[status] IN ('APPROVED', 'PAID')`)
  assert.equal(reports.payrollReportRunStatusSql('r.', true), `r.[status] NOT IN ('CANCELLED', 'DRAFT')`)
  assert.equal(reports.payrollReportRunStatusSql(''), `[status] IN ('APPROVED', 'PAID')`)
  // نفس مجموعة الحالات اللي بيستبعدها استعلام FinancialReportService.loadMonth
  const financial = source('reports/financial-report.service.ts')
  assert.ok(financial.includes(`r.[status] NOT IN ('CANCELLED', 'DRAFT')`), 'الخدمة المالية لسه بتستبعد الملغى والمسودة في SQL')
  assert.ok(financial.includes(`const APPROVED_STATUSES = ['APPROVED', 'PAID']`), 'وبتحسب المعتمد والمصروف وحدهما بلا includeDraft')
})

test('neither the variance report nor the month aggregates count every non-cancelled run any more', () => {
  const text = source('payroll/payroll-reports.ts')
  // كانت الفروق ومجاميع الشهر بتقرا كل مسير غير ملغى، فيدخل المحسوب غير المعتمد في مال الشهر
  assert.equal(text.includes(`r.[status] <> 'CANCELLED' AND r.[period] IN`), false, 'استعلام الفروق اتربط بقاعدة الحالة الموحدة')
  assert.equal(text.includes(`SELECT TOP (1) [period] FROM [payroll_runs] WHERE [status] <> 'CANCELLED'`), false,
    'وشهر الفروق الافتراضي كذلك')
  assert.equal(text.includes(`if (run.status !== 'CANCELLED') for (const item of visibleItems)`), false,
    'ومجاميع طرق الصرف والخصومات كذلك')
  for (const call of ['payrollReportRunInTotals(run.status, includeDraft)', `payrollReportRunStatusSql('r.', includeDraft)`]) {
    assert.ok(text.includes(call), call)
  }
})

test('suspendedWholeRange is true only when every day of the range is a suspension day', () => {
  const period = ['2026-07-23', '2026-08-22']
  const active = (fromDate, toDate, status = 'ACTIVE') => ({ fromDate, toDate, status })
  assert.equal(rules.suspendedWholeRange([active(...period)], ...period), true, 'الفترة كلها إيقاف')
  assert.equal(rules.suspendedWholeRange([active('2026-07-01', '2026-09-30')], ...period), true, 'إيقاف أوسع من الفترة')
  assert.equal(rules.suspendedWholeRange([active('2026-07-23', '2026-08-21')], ...period), false, 'يوم مستحق واحد يكفي')
  assert.equal(rules.suspendedWholeRange([active('2026-07-24', '2026-08-22')], ...period), false, 'وأول يوم كذلك')
  assert.equal(rules.suspendedWholeRange([active('2026-07-23', '2026-08-05'), active('2026-08-06', '2026-08-22')], ...period), true,
    'فترتان متلاصقتان تغطيان الشهر')
  assert.equal(rules.suspendedWholeRange([active('2026-07-23', '2026-08-04'), active('2026-08-06', '2026-08-22')], ...period), false,
    'يوم مفتوح بينهما يمنع')
  assert.equal(rules.suspendedWholeRange([active(...period, 'CANCELLED')], ...period), false, 'الإيقاف الملغى لا يُحتسب')
  assert.equal(rules.suspendedWholeRange([active('2026-07-23', '2026-08-22', 'ENDED_EARLY')], ...period), true,
    'المنتهي بدري يُحتسب بأيامه الفعلية')
  assert.equal(rules.suspendedWholeRange([], ...period), false, 'بلا إيقاف = مستحق')
  // مدى غير صالح لا يرجع true بالخطأ
  for (const bad of [['2026-08-22', '2026-07-23'], ['x', '2026-08-22'], ['2026-07-23', '2026-13-01']]) {
    assert.equal(rules.suspendedWholeRange([active('2026-01-01', '2026-12-31')], ...bad), false, bad.join('→'))
  }
})

test('the suspended flag in both unassigned reports comes from the periods, not from employees.status', () => {
  for (const file of ['payroll/payroll-reports.ts', 'payroll/payroll-unassigned-report.ts']) {
    const text = source(file)
    assert.equal(/\b(emp|employee)\.status === 'suspended'/.test(text), false, `${file}: الشرط الميت على العمود المحفوظ اتشال`)
    assert.ok(text.includes('suspendedWholeRange('), `${file}: القاعدة المشتركة مستعملة`)
    assert.ok(text.includes('readEmployeeSuspensions('), `${file}: فترات الإيقاف بتُقرأ فعلًا`)
    assert.ok(text.includes('displayEmployeeStatus('), `${file}: الحالة المعروضة من نفس دالة شاشة الموظفين`)
  }
  // ولا كتابة على العمود المحفوظ من التقارير
  for (const file of ['payroll/payroll-reports.ts', 'payroll/payroll-unassigned-report.ts']) {
    assert.equal(/UPDATE\s+\[?employees/i.test(source(file)), false, `${file}: التقرير قراءة فقط`)
  }
})

test('the unassigned report hash still moves with the rows, and ignores nothing that changes a reason', () => {
  const row = (employeeId, reasonCode, runs = []) => ({ employeeId, employeeCode: `E${employeeId}`, fullName: `م ${employeeId}`,
    employmentStatus: 'active', branchId: 1, departmentId: 1, teamId: null, hireDate: '2020-01-01', leaveDate: null,
    coverFrom: '2026-07-23', coverTo: '2026-08-22', coverDays: 31, reasonCode, reasonText: reasonCode, runs })
  const base = { period: '2026-08', startDate: '2026-07-23', endDate: '2026-08-22', scopeBranchId: null,
    filters: { branchId: null, departmentId: null, teamId: null }, includeSuspended: false, rows: [row(1, 'OUT_OF_ALL_RUNS'), row(2, 'DATA_PROBLEM')] }
  const hash = report => unassigned.payrollUnassignedReportHash(report)
  const original = hash(base)
  assert.match(original, /^[a-f0-9]{64}$/)
  assert.equal(hash({ ...base }), original, 'نفس المحتوى = نفس البصمة')
  assert.notEqual(hash({ ...base, rows: [row(1, 'SUSPENDED'), row(2, 'DATA_PROBLEM')] }), original, 'تغيّر كود السبب يغيّر البصمة')
  assert.notEqual(hash({ ...base, rows: [row(2, 'DATA_PROBLEM')] }), original, 'اختفاء صف (موقوف بلا أجر مثلًا) يغيّر البصمة')
  assert.notEqual(hash({ ...base, rows: [...base.rows, row(3, 'OUT_OF_ALL_RUNS')] }), original, 'ظهور صف يغيّر البصمة')
  assert.notEqual(hash({ ...base, includeSuspended: true }), original, 'علم إظهار الموقوفين جزء من البصمة')
  assert.notEqual(hash({ ...base, rows: [row(1, 'OUT_OF_ALL_RUNS', [{ runId: 5, exclusionReason: 'EXC_MANUAL' }]), row(2, 'DATA_PROBLEM')] }),
    original, 'مرجع مسير أو سبب استبعاد جديد يغيّر البصمة')
  // نص السبب وحده ليس جزءًا من البصمة (الكود هو المعنى) — فتحسين الصياغة لا يُسقط إقرارًا قائمًا
  assert.equal(hash({ ...base, rows: base.rows.map(item => ({ ...item, reasonText: 'صياغة تانية' })) }), original)
})

test('the documented Arabic reason text for a suspended employee is used by both reports', () => {
  assert.equal(unassigned.PAYROLL_UNASSIGNED_REASON_LABELS.SUSPENDED, 'موقوف بلا أجر')
  assert.equal(reports.UNASSIGNED_REASON_LABELS.SUSPENDED, 'موقوف بلا أجر (غير مستحق في الفترة)')
  const text = source('payroll/payroll-unassigned-report.ts')
  assert.ok(text.includes('PAYROLL_UNASSIGNED_REASON_LABELS.SUSPENDED'), 'النص الموثق هو المستعمل لا نص حرفي تاني')
  assert.equal(text.includes(`reasonText = 'موقوف بلا أجر مسجل في النظام'`), false, 'النص القديم المضلل اتشال')
  // نص فترة الإيقاف نفسه من دالة المسير المشتركة
  assert.equal(rules.payrollSuspensionNote([{ fromDate: '2026-07-23', toDate: '2026-08-22', status: 'ACTIVE' }], '2026-07-23', '2026-08-22'),
    'موقوف من 2026-07-23 إلى 2026-08-22')
})

test('the filters that used to be accepted and ignored are now declared and applied', () => {
  const financialController = source('reports/financial-report.controller.ts')
  assert.ok(/teamId\?: number/.test(financialController), 'DTO التقارير المالية بقى فيه teamId (كان ValidationPipe بيشيله بصمت)')
  assert.ok(financialController.includes('رقم الفريق غير صالح'), 'برسالة عربية زي باقي المرشحات')
  const financialService = source('reports/financial-report.service.ts')
  for (const line of [`filter('teamId', query.teamId)`, `${'$'}{snapped('teamId', 'e.[teamId]')} AS [teamId]`]) {
    assert.ok(financialService.includes(line), line)
  }
  assert.equal(financialService.split(`filter('teamId', query.teamId)`).length - 1, 2, 'على بنود الشهر وعلى السلف')
  const reportsController = source('reports/reports.controller.ts')
  assert.ok(reportsController.includes(`@Query('branchId') branchId?: string`), 'تقرير الحضور بقى بيقرا branchId')
  assert.ok(reportsController.includes('branchFilterOf(user, branchId)'), 'وبيطبّقه بقاعدة نطاق الفرع')
  assert.ok(reportsController.includes('حساب الفرع يشوف تقرير فرعه بس'), 'بنفس رفض التقارير المالية ومراكز التكلفة بالحرف')
  assert.ok(source('reports/cost-center-report.controller.ts').includes('حساب الفرع يشوف تقرير فرعه بس'), 'النص مطابق للمرجع')
})
