// B5 — الخطوتان 22 و7 في الواجهة، والخطوة 23: منسّق واحد ونظام أرقام واحد، ومجاميع الخصومات، والبدلات، والتنبيهات الدقيقة (FE-02)،
// ولوحة أحداث المسير، والتعارضات بإجراءات حل، وقيد الصرف، وفترة التكافؤ التشغيلية. منطق الواجهة وReact SSR وفحص نصي للربط؛ لا SQL ولا خدمة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const money = require('../../src/lib/money')
const totals = require('../../src/lib/payroll-item-totals')
const runsApi = require('../../src/lib/payroll-runs-api')
const { roundPayrollMoney } = require('../src/payroll/payroll-money')
const { PayrollRunEventsList } = require('../../src/components/payroll/PayrollRunEventsPanel')
const { PayrollConflictResolution } = require('../../src/components/payroll/PayrollConflictResolution')
const { defaultPayRecord, PayrollPayRecordForm, PayrollPayRecordSummary, payRecordReady } = require('../../src/components/payroll/PayrollPayRecordForm')
const { PayrollParityOperationsSummary, PARITY_OPERATIONS_PLAN_TEXT } = require('../../src/components/payroll/PayrollParityOperationsNote')
const { PayrollInstallmentBreakdown } = require('../../src/components/PayrollInstallmentBreakdown')
const { PayrollOvertimeBreakdown } = require('../../src/components/PayrollOvertimeBreakdown')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props))

test('one money formatter (FE-06): Latin digits, thousands separators and two decimals cut without rounding, identical to the server kernel', () => {
  assert.equal(money.formatMoney(1234.567), '1,234.56')
  assert.equal(money.formatMoney('1234.567'), '1,234.56')
  assert.equal(money.formatMoney(1500.5), '1,500.50')
  assert.equal(money.formatMoney('1500.50'), '1,500.50')
  assert.equal(money.formatMoney(-0.004), '0.00')
  assert.equal(money.formatMoney(-2500), '-2,500.00')
  assert.equal(money.formatMoneyOrDash(0), '-'); assert.equal(money.formatMoneyOrDash('12.3'), '12.30')
  assert.equal(money.formatRate(0.451389), '0.451389')
  assert.equal(money.sumMoney([0.1, 0.2]), 0.3)
  for (let thousandths = 0; thousandths <= 20000; thousandths++) {
    const value = thousandths / 1000
    assert.equal(money.roundMoney(value), roundPayrollMoney(value), `cut of ${value}`)
    assert.equal(money.roundMoney(-value), roundPayrollMoney(-value), `cut of ${-value}`)
  }
  assert.equal(money.roundMoney(1.005), 1)
  assert.equal(money.roundMoney(0.1 + 0.2), 0.3)
})

test('no direct toLocaleString(\'ar-EG\') in payroll screens; the run table and the payslip format money with formatMoney only (the deductions page and the hidden payslips page show no run amounts)', () => {
  const files = [
    ...fs.readdirSync(path.join(root, 'src/components/payroll')).map(name => `src/components/payroll/${name}`),
    ...fs.readdirSync(path.join(root, 'src/components')).filter(name => /^Payroll.*\.tsx$/.test(name)).map(name => `src/components/${name}`),
  ]
  const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`])
  files.push(...walk('src/app/payroll'))
  for (const file of files.filter(name => /\.tsx?$/.test(name))) assert.doesNotMatch(read(file), /toLocaleString\(\s*['"]ar-EG['"]/, file)
  for (const file of ['src/app/payroll/page.tsx', 'src/app/payroll/payslip/[id]/page.tsx']) {
    const source = read(file)
    assert.doesNotMatch(source, /\.toLocaleString\(/, `${file} must use the shared formatter`)
    assert.match(source, /from '@\/lib\/money'/, file)
  }
  for (const file of ['src/app/payroll/deductions/page.tsx', 'src/app/payroll/payslips/page.tsx']) assert.doesNotMatch(read(file), /\.toLocaleString\(/, file)
  assert.match(read('src/app/payroll/page.tsx'), /\{formatMoney\(item\.netPay\)\}/)
  assert.match(read('src/app/payroll/payslip/[id]/page.tsx'), /\{formatMoney\(netSalary\)\} \{currency\}/)
  // 1500.50 بالشكل نفسه في تفصيل الأقساط والإضافي داخل الجدول والقسيمة
  const plan = { version: 'LOAN_ALLOCATION_V1_20260913', policy: { mode: 'PARTIAL_THEN_CARRY' }, budget: { availableBudget: '1500.50' }, excludedClaimedIds: [],
    allocation: { lines: [{ installmentRef: '7', loanRef: '3', originalDuePeriod: '2026-09', eligible: true, dueAmount: '1500.50', deductedAmount: '1500.50',
      remainingAmount: '0.00', outcome: 'DEDUCTED', continuation: null }] } }
  const installments = render(PayrollInstallmentBreakdown, { item: { breakdown: JSON.stringify({ installmentPlan: plan }), loanInstallments: 1500.5 }, currency: 'ر.س' })
  assert.match(installments, /1,500\.50/); assert.doesNotMatch(installments, /[٠-٩]/)
  const overtime = render(PayrollOvertimeBreakdown, { item: { overtimeAmount: 1500.5, breakdown: JSON.stringify({ overtime: [{ id: 1, date: '2026-09-01', approvedMinutes: 600,
    hours: 10, multiplier: 1.5, hourlyRate: 100.033333, amount: 1500.5, provenance: 'APPROVAL_SNAPSHOT', dayKind: 'WEEKDAY', originalPeriod: '2026-09', retroactive: false }] }) }, currency: 'ر.س' })
  assert.match(overtime, /1,500\.50/); assert.match(overtime, /100\.033333/); assert.doesNotMatch(overtime, /[٠-٩]/)
})

test('one formatter with one rounding on every payroll money screen (review fix): deduction, bonus and loan formatters delegate to formatMoney, and the employee payslips page uses it', () => {
  const deductionsUi = require('../../src/lib/deductions-api')
  const bonusesUi = require('../../src/lib/bonuses-api')
  const loansUi = require('../../src/lib/loans-api')
  for (const [text, expected] of [['100.0050', '100.00'], ['100.0049', '100.00'], ['1500.5', '1,500.50'], ['-0.004', '0.00'], ['-0.005', '0.00'], ['-2.675', '-2.67'],
    ['0.995', '0.99'], ['999999.995', '999,999.99'], ['1234.567', '1,234.56'], ['1234567890123456.785', '1,234,567,890,123,456.78']]) {
    assert.equal(money.formatMoney(text), expected, text)
    assert.equal(deductionsUi.formatDeductionMoney(text), expected, `deductions ${text}`)
    assert.equal(bonusesUi.formatBonusMoney(text), expected, `bonuses ${text}`)
    assert.equal(loansUi.formatLoanMoney(text), expected, `loans ${text}`)
  }
  assert.equal(money.formatMoney(100.005), '100.00')
  // مسار النص ومسار الرقم يتطابقان على كل قيمة من -20.000 إلى 20.000 (وroundMoney = roundPayrollMoney في الاختبار الأول)
  for (let thousandths = -20000; thousandths <= 20000; thousandths++) {
    const value = thousandths / 1000
    assert.equal(money.formatMoney(value.toFixed(3)), money.formatMoney(value), `text and number paths agree on ${value}`)
    assert.equal(loansUi.formatLoanMoney(value), money.formatMoney(value), `loan number path ${value}`)
  }
  assert.deepEqual([deductionsUi.formatDeductionMoney(null), deductionsUi.formatDeductionMoney('abc'), loansUi.formatLoanMoney(null), loansUi.formatLoanMoney('abc')], ['—', '—', '—', 'abc'])
  for (const file of ['src/lib/deductions-api.ts', 'src/lib/loans-api.ts']) assert.doesNotMatch(read(file), /slice\(0, 2\)/, `${file} no longer truncates extra decimals`)
  for (const file of ['src/app/my/payslips/page.tsx', 'src/app/my/loans/page.tsx', 'src/app/my/deductions/page.tsx', 'src/app/my/bonuses/page.tsx', 'src/app/payroll/bonuses/page.tsx', 'src/components/PayrollObligationBreakdown.tsx']) {
    const source = read(file)
    assert.doesNotMatch(source, /\.toLocaleString\(/, `${file} must use the shared formatter`)
    assert.doesNotMatch(source, /toFixed\(2\)\)/, `${file} must not hand binary-rounded text to a formatter`)
  }
  const payslips = read('src/app/my/payslips/page.tsx')
  assert.match(payslips, /from '@\/lib\/money'/)
  for (const text of ['{formatMoney(latest.item.netPay)} {currency}', '{formatMoney(item.basicSalary)}', '+{formatMoney(item.overtimeAmount)}', '-{formatMoney(payrollItemDeductions(item))}', '{formatMoney(item.netPay)} {currency}']) {
    assert.ok(payslips.includes(text), text)
  }
})

test('deductions (ALDD-12): every column including shortfall and other deductions has a summary line, row totals = columns, summary lines = grand total (in cents)', () => {
  const items = [
    { latenessDeduction: 0.1, shortfallDeduction: 0.2, absenceDeduction: 100.05, unpaidLeaveDeduction: 0, loanInstallments: 250, otherDeductions: 33.35 },
    { latenessDeduction: '12.50', shortfallDeduction: '7.10', absenceDeduction: 0, unpaidLeaveDeduction: '200.00', loanInstallments: 0, otherDeductions: '0.15' },
    { latenessDeduction: 0, shortfallDeduction: 0, absenceDeduction: 0, unpaidLeaveDeduction: 0, loanInstallments: 0, otherDeductions: 0 },
  ]
  const summary = totals.payrollDeductionSummary(items)
  assert.deepEqual(summary.lines.map(line => line.field), ['latenessDeduction', 'shortfallDeduction', 'absenceDeduction', 'unpaidLeaveDeduction', 'loanInstallments', 'otherDeductions'])
  assert.equal(summary.lines.find(line => line.field === 'shortfallDeduction').label, 'نقص ساعات العمل')
  assert.equal(money.sumMoney(summary.lines.map(line => line.total)), summary.grandTotal)
  assert.equal(summary.grandTotal, money.sumMoney(items.map(totals.payrollItemDeductions)))
  assert.deepEqual([summary.grandTotal, summary.affected], [603.45, 2])
  for (const item of items) assert.equal(totals.payrollItemDeductions(item), money.sumMoney(totals.PAYROLL_DEDUCTION_FIELDS.map(field => item[field])))
  // تبسيط الرواتب: صفحة «الخصومات» صارت طلبات الخصم وأنواعها فقط؛ خصومات كل موظف تظهر في جدول المسير نفسه
  const page = read('src/app/payroll/deductions/page.tsx')
  assert.match(page, /<TypedDeductionsWorkspace currency=\{currency\} mode="admin"/)
  assert.doesNotMatch(page, /payrollDeductionSummary|totals\.lateness|fetchPayrollRun/, 'no run grid on the deductions page')
  assert.match(read('src/app/payroll/page.tsx'), /payrollItemDeductions\(item\)/)
})

test('run table per employee: gross, deductions and net from the same columns, with coverage, factor and the 30-day basis from the saved breakdown', () => {
  const item = { basicSalary: 5000, allowances: 1000, overtimeAmount: 0.1, otherAdditions: 0.2, latenessDeduction: 12.5, shortfallDeduction: 0, absenceDeduction: 0,
    unpaidLeaveDeduction: 0, loanInstallments: 0, otherDeductions: 0, netPay: 5987.8,
    breakdown: JSON.stringify({ coverFrom: '2026-09-01', coverTo: '2026-09-22', coverDays: 22, prorataFactor: 0.733333, monthlyDays: 30 }) }
  assert.equal(totals.payrollItemEarnings(item), 6000.3)
  assert.equal(totals.payrollRunTotals([item]).net, 5987.8)
  assert.equal(totals.payrollRunTotals([item, { ...item, netPay: -5 }]).negativeNet, 1)
  // القرار أ2 (خط الحساب): سطر التغطية بالأيام والتواريخ فقط — «المعامل» و«أساس 30 يومًا» لم يعودا يُعرضان
  assert.equal(totals.payrollCoverageText(totals.payrollItemCoverage(item)), '22 يوم مغطى من 2026-09-01 إلى 2026-09-22')
  assert.equal(totals.payrollItemCoverage({ breakdown: '{bad' }), null)
  const page = read('src/app/payroll/page.tsx')
  for (const text of ['payrollItemCoverage(item)', 'payrollItemEarnings(item)', 'payrollItemDeductions(item)', 'صافي سالب — يمنع الاعتماد',
    '<PayrollConflictResolution', '<PayrollPayRecordForm', 'payPayrollRun(runDetail.id', '|| approvalBlocked']) assert.ok(page.includes(text), text)
  // تبسيط الرواتب: سجل الأحداث وسطر ترتيب التحصيل لا يُعرضان؛ سطر «احتسبه • اعتمده • صرفه» باقٍ
  assert.doesNotMatch(page, /<PayrollRunEventsPanel|collectionOrderText\(/)
  assert.ok(page.includes('احتسبه: ${actorName(screen.actors.calculated)}'))
  assert.doesNotMatch(page, /بواسطة النظام/, 'no approvals log built from dates')
  assert.doesNotMatch(read('src/lib/api.ts'), /export const payPayroll\b/, 'no client can pay without a channel and reference')
  assert.equal(runsApi.collectionOrderText({ source: 'DEFAULT', versionId: null, order: null, effectiveOrder: ['ATTENDANCE', 'RECOVERY', 'TYPED', 'ADMINISTRATIVE', 'LOAN'],
    loanBeforeOthers: false, componentOrder: null, message: '' }), 'ترتيب التحصيل الافتراضي (النسخة بلا ترتيب محفوظ): خصومات الحضور ← الاستردادات والعهد ← الخصومات المصنفة ← الخصومات الإدارية ← أقساط السلف')
})

test('allowances page (ALDD-11) is hidden and redirects to the run screen, the formula editor no longer shows settings the run does not read, and banners (FE-02) remain only on data the run does not read', () => {
  const allowances = read('src/app/payroll/allowances/page.tsx')
  assert.ok(allowances.includes("router.replace('/payroll')"), 'the old link lands on the run screen')
  assert.doesNotMatch(allowances, /^export function/m, 'a Next page file exports only the page')
  const collection = read('src/components/PayrollCollectionEditor.tsx')
  assert.match(collection, /المسير المرتبط بهذه النسخة يطبقه عند الحساب/); assert.doesNotMatch(collection, /ولا يعيد حساب المسيرات السابقة\./)
  // تبسيط الرواتب: خانات لا يقرؤها الحساب (أساس المعدل، القسمة على صفر، راتب ثابت، ترحيل الخصم الزائد) لا تظهر في المحرر؛ تبقى محفوظة مع النسخة
  const settings = read('src/components/PayrollPolicySetEditor.tsx')
  assert.doesNotMatch(settings, /أساس المعدل|القسمة على صفر|راتب ثابت بلا أثر للحضور|ترحيل الخصم الزائد/)
  const sources = read('src/components/PayrollLiveSourcesPanel.tsx')
  assert.match(sources, /يقرؤها محرك السياسة بجانبه للمقارنة/); assert.doesNotMatch(sources, /حساب المسير بهذه المصادر لم يُفعّل بعد/)
  assert.doesNotMatch(read('src/app/payroll/salary-history/page.tsx'), /لا يستخدم|لا يقرأ/, 'the run reads the monthly salary history; no «unused» banner')
  assert.match(read('src/app/settings/policies/page.tsx'), /key: 'payroll\.approval_self_approval_allowed'/)
})

test('run picker (money-requests lane): only regular, non-cancelled runs are listed and opened by default; «?run=ID» still opens any older run and keeps it visible', () => {
  const page = read('src/app/payroll/page.tsx')
  assert.ok(page.includes("const isListedRun = (run: Pick<ApiPayrollRun, 'status' | 'runType'>) =>\n  (run.runType ?? 'REGULAR') === 'REGULAR' && run.status !== 'CANCELLED'"))
  assert.ok(page.includes('const listedRuns = runs.filter(run => isListedRun(run) || run.id === runDetail?.id)'), 'the open run stays in the picker')
  // الافتتاح على مسير حقيقي: أحدث مسير مدرج شهره لم يتجاوز شهر اليوم (لا مسير ديسمبر محفوظ من تجربة)
  assert.ok(page.includes('const listed = runsData.filter(isListedRun)'))
  assert.ok(page.includes('runsData.find(run => run.id === wanted) ?? listed.find(run => run.period <= currentMonth) ?? listed[0] ?? runsData[0]'))
  assert.ok(page.includes('{listedRuns.map((run) => ('))
  // د: البصمة الناقصة تُقال وقت الحساب على صف الموظف، لا عند رفض الاعتماد
  assert.ok(page.includes('const missingPunch = payrollMissingPunchText(payrollItemMissingPunchDates(item))'))
  assert.ok(page.includes('{missingPunch && <p className="text-xs text-warning-600">{missingPunch}</p>}'))
  assert.ok(read('src/lib/payroll-item-totals.ts').includes('export function payrollItemMissingPunchDates'))
  assert.ok(read('api/src/payroll/payroll.service.ts').includes("missingPunchDates: attRows.filter((r) => r.status === 'missing_punch').map((r) => r.date)"))
  assert.doesNotMatch(page, /بمجموعة سياسة مختلفة/, 'no engine wording on the run screen')
})

test('settings (A4 + B1 + B2): the daily cap and the overlap order are gone, the loan request switch is there, and the advance cap is three inputs on one company version', () => {
  const policies = read('src/app/settings/policies/page.tsx')
  for (const gone of ['payroll.attendance_daily_cap_days', 'payroll.attendance_overlap_policy', 'سقف خصم الحضور اليومي', 'التداخل بين التأخير والنقص']) {
    assert.ok(!policies.includes(gone), gone)
  }
  assert.ok(policies.includes("{ key: 'loan.request_open', label: 'طلب السلفة مفتوح للموظفين', type: 'bool'"))
  for (const text of ['function LoanAdvanceCapBlock(', 'كام مرة في الشهر', 'الحد الأقصى', 'مبلغ ثابت (', 'نسبة من الراتب %',
    "scopeType: 'COMPANY', scopeIds: null", "reason: 'تعديل سقف السلفة من سياسات النظام'", 'createLoanCapPolicyVersion(policy.id, input)',
    "{g.title === 'أقساط السلف وحماية الصافي' && <LoanAdvanceCapBlock onSaveConfig={handleSave} pendingConfigCount={dirtyKeys.length} />}",
    // المعروض هو الحاكم: لا سقف مبلغ مخفي يقضم الحد المكتوب، وزر الكتلة يحفظ معه مفتاح فتح الطلب
    'maxAmountPerMonth: null', 'maxOutstandingBalance: null', 'if (pendingConfigCount > 0) await onSaveConfig()']) {
    assert.ok(policies.includes(text), text)
  }
  // النطاق والنسخ والتواريخ والأولوية وسبب التعديل لا يكتبها المالك
  assert.ok(!policies.includes('نسخة جديدة من'), 'no version wording in the settings block')
  // المفتاح المنطقي مسجّل في المتحكم حتى يقبله PATCH /settings/config
  assert.ok(read('api/src/settings/settings.controller.ts').includes("'loan.request_open': ['true', 'false']"))
  assert.ok(read('api/src/loans/loan-request-caps.ts').includes("const enabled = await boolConfig(em, 'loan.request_open', true)"))
})

test('loans screen (B1/D): no caps tab, a mandatory employee picker behind requests.create_on_behalf, that employee’s cap, and a send button locked on the refusal', () => {
  const page = read('src/app/payroll/loans/page.tsx')
  assert.ok(!page.includes('LoanCapPoliciesPanel'), 'the caps tab moved to system policies')
  assert.ok(!page.includes('سياسات السقوف'))
  for (const text of ["setCanOnBehalf(can('requests.create_on_behalf'))", 'الموظف صاحب السلفة *', 'fetchLoanCapPreview({ employeeId: targetEmployeeId',
    'targetEmployeeId && targetEmployeeId !== selfEmployeeId ? targetEmployeeId : undefined',
    '!targetEmployeeId || newLoanCap?.requestWindow?.open === false || (newLoanCap !== null && !newLoanCap.allowed)']) {
    assert.ok(page.includes(text), text)
  }
  // رسالة النافذة تظهر أيضًا حين يكون الطلب مقفولًا بالمفتاح لا بالأيام
  for (const file of ['src/app/payroll/loans/page.tsx', 'src/app/my/loans/page.tsx']) {
    assert.match(read(file), /!\w+\.requestWindow\.open \|\| \w+\.requestWindow\.fromDay !== 1/, file)
  }
  // السقف سطر واحد: لا جدول قيود ولا رقم نسخة
  const summary = read('src/components/payroll/LoanCapSummary.tsx')
  assert.ok(summary.includes('المتاح لك الآن'))
  for (const gone of ['نسخة {cap.policy.version}', 'المستهلك', 'القيد الحاكم:']) assert.ok(!summary.includes(gone), gone)
  assert.ok(summary.includes('السبب: {cap.governingLabel}'))
})

test('events panel: who did what and when, with the reason, the signed parity report, the small-company licence and the pay record', () => {
  const events = [
    { id: 1, runId: 5, eventType: 'CALCULATED', actorUserId: 12, actorName: 'هالة مصطفى', reason: null, createdAt: '2026-09-15T08:00:00Z',
      payload: { after: { snapshotVersion: 1, totalNet: 1500.5 }, collection: { source: 'DEFAULT', order: ['ATTENDANCE', 'RECOVERY', 'TYPED', 'ADMINISTRATIVE', 'LOAN'] } } },
    { id: 2, runId: 5, eventType: 'APPROVED', actorUserId: 1, actorName: 'مدير النظام', reason: null, createdAt: '2026-09-15T09:00:00Z',
      payload: { snapshotVersion: 1, totalNet: 1500.5, engineMode: 'SHADOW', parityReportHash: 'a'.repeat(64), parityExplained: { differences: 0, unavailable: 6 }, smallCompanyException: true } },
    { id: 3, runId: 5, eventType: 'PAID', actorUserId: 7, actorName: null, reason: null, createdAt: '2026-09-15T10:00:00Z',
      payload: { channel: 'BANK_TRANSFER', reference: 'TRX-2026-0915' } },
    { id: 4, runId: 5, eventType: 'RECALCULATED', actorUserId: 12, actorName: 'هالة مصطفى', reason: 'استبعاد الموظف رقم 9 من المسير: في مسير الجيزة', createdAt: '2026-09-15T07:00:00Z',
      payload: { diff: { addedEmployeeIds: [], removedEmployeeIds: [9], changedEmployeeIds: [] }, exclusionsAdded: [{ employeeId: 9, reason: 'في مسير الجيزة' }] } },
  ]
  const html = render(PayrollRunEventsList, { events })
  for (const text of ['هالة مصطفى — احتسب المسودة', 'صافي المسير 1,500.50', 'ترتيب التحصيل الافتراضي', 'مدير النظام — اعتمد المسير ووقّع تقرير التكافؤ',
    'بصمة تقرير التكافؤ aaaaaaaaaaaa', 'أسباب مكتوبة: فروق 0 • قيم غائبة 6', 'بترخيص الشركة الصغيرة: المعتمِد هو من احتسب', 'مستخدم #7 — صرف المسير',
    'القناة: تحويل بنكي', 'المرجع: TRX-2026-0915', 'السبب: استبعاد الموظف رقم 9 من المسير: في مسير الجيزة', 'حذف 1', 'استبعاد الموظف رقم 9: في مسير الجيزة']) {
    assert.ok(html.includes(text), text)
  }
  assert.ok(html.indexOf('TRX-2026-0915') < html.indexOf('احتسب المسودة'), 'newest first')
  assert.match(render(PayrollRunEventsList, { events: [] }), /لا توجد أحداث مسجلة/)
})

test('conflicts screen (payroll simplification): one line per employee «مدرج في مسير آخر لنفس الأيام» with «استبعاد من هذا المسير»; the other run is neither numbered, dated nor opened', () => {
  const conflicts = [
    { employeeId: 3, otherRunId: 9, name: 'مسير الجيزة', status: 'CALCULATED', startDate: '2026-09-23', endDate: '2026-10-22', overlapDays: 30, blocking: false, kind: 'EXACT' },
    { employeeId: 3, otherRunId: 11, name: 'مسير الجيزة 2', status: 'DRAFT', startDate: '2026-09-23', endDate: '2026-10-22', overlapDays: 30, blocking: false, kind: 'EXACT' },
    { employeeId: 4, otherRunId: null, name: 'مسير خارج نطاق صلاحيتك — راجع مسؤول الرواتب', status: 'APPROVED', startDate: '2026-09-23', endDate: '2026-10-22', overlapDays: 30, blocking: true, kind: 'EXACT' },
  ]
  const props = { title: 'تعارضات المسير الحالي', conflicts, run: { id: 5, status: 'CALCULATED' }, employeeName: id => `موظف ${id}`, canExclude: true, onResolved: () => {} }
  const html = render(PayrollConflictResolution, props)
  assert.equal(html.split('مدرج في مسير آخر لنفس الأيام').length - 1, 2, 'one line per employee')
  assert.equal(html.split('>استبعاد من هذا المسير</button>').length - 1, 2)
  assert.doesNotMatch(html, /فتح المسير الآخر|#9|#11|مسير الجيزة|خارج نطاق صلاحيتك|2026-09-23/)
  assert.doesNotMatch(render(PayrollConflictResolution, { ...props, canExclude: false }), /استبعاد من هذا المسير/)
  assert.match(render(PayrollConflictResolution, { ...props, run: { id: 5, status: 'DRAFT' } }), />استبعاد من هذا المسير</)
  assert.doesNotMatch(render(PayrollConflictResolution, { ...props, run: { id: 5, status: 'APPROVED' } }), /استبعاد من هذا المسير/)
  assert.equal(render(PayrollConflictResolution, { ...props, conflicts: [] }), '')
})

test('pay record form: the channel and the reference come prefilled (mixed channel, «run name + month»); paying still needs both; the summary shows who paid, the channel and the reference', () => {
  assert.deepEqual([{ channel: '', reference: 'TRX-1' }, { channel: 'CASH', reference: 'ab' }, { channel: 'CASH', reference: ' محضر 7 ' }].map(payRecordReady), [false, false, true])
  const prefilled = defaultPayRecord({ name: 'مسير فرع المعادي', period: '2026-08' })
  assert.deepEqual(prefilled, { channel: 'MIXED', reference: 'مسير فرع المعادي 2026-08' }); assert.equal(payRecordReady(prefilled), true)
  const long = defaultPayRecord({ name: 'م'.repeat(120), period: '2026-08' })
  assert.ok(long.reference.length <= 100 && long.reference.endsWith(' 2026-08'), 'the reference fits the 100-character limit and keeps the month')
  assert.match(render(PayrollPayRecordForm, { draft: prefilled, onChange: () => {}, disabled: false, onPay: () => {} }), /<button type="button" class=/, 'the prefilled form can pay')
  const blocked = render(PayrollPayRecordForm, { draft: { channel: 'MIXED', reference: '' }, onChange: () => {}, disabled: false, onPay: () => {} })
  assert.match(blocked, /disabled=""[^>]*title="اكتب مرجع الصرف أولًا"/)
  for (const label of ['تحويل بنكي', 'نقدًا', 'شيك', 'مختلط حسب طريقة صرف كل موظف']) assert.ok(blocked.includes(label), label)
  const summary = render(PayrollPayRecordSummary, { run: { payRecord: { paidBy: { id: 12, name: 'هالة مصطفى', at: null }, channel: 'BANK_TRANSFER', channelLabel: 'تحويل بنكي', reference: 'TRX-9' } } })
  assert.match(summary, /صرفه هالة مصطفى • القناة: تحويل بنكي • المرجع: TRX-9/)
})

test('operational parity period (step 23) is documented on the engine panel with the real month count', () => {
  for (const text of ['أول 3 مسيرات شهرية', 'SHADOW', 'شهران آخران', 'المالك أو مفوض مكتوب اسمه', 'D13', 'يُسجل القرار في سجل المسير']) assert.ok(PARITY_OPERATIONS_PLAN_TEXT.includes(text), text)
  const html = render(PayrollParityOperationsSummary, { operations: { plan: {}, months: 1, countedPeriods: ['2026-10'], stage: 'BASELINE',
    message: 'مرحلة خط الأساس: 1 من 3 أشهر مصروفة بوضع SHADOW بتقرير تكافؤ موقّع',
    runs: [{ runId: 8, period: '2026-11', counted: false, notCountedReason: 'معتمد ولم يُصرف بعد' }] } })
  assert.match(html, /1 من 3 أشهر/); assert.match(html, /2026-10/); assert.match(html, /المسير #8 \(2026-11\) لا يُحتسب: معتمد ولم يُصرف بعد/)
  assert.match(read('src/components/payroll/PayrollRunEnginePanel.tsx'), /<PayrollParityOperationsNote \/>/)
})

test('parity period (review fix): a month with an unpaid run is shown as incomplete, test runs are counted apart, the decision owner is named, and an approver can mark a test run', () => {
  assert.ok(PARITY_OPERATIONS_PLAN_TEXT.includes('الشهر يُحتسب فقط لو كل مسيراته الحية كذلك'))
  const html = render(PayrollParityOperationsSummary, { operations: { plan: { decisionOwner: 'المالك (كريم)', delegate: null }, months: 0, countedPeriods: [], stage: 'BASELINE',
    message: 'مرحلة خط الأساس: 0 من 3 أشهر مصروفة بوضع SHADOW بتقرير تكافؤ موقّع', excludedRuns: 24,
    periods: [{ period: '2026-08', counted: false, runIds: [1, 2], blockers: [{ runId: 2, reason: 'معتمد ولم يُصرف بعد' }] }],
    runs: [{ runId: 1, period: '2026-08', counted: false, notCountedReason: 'الشهر 2026-08 غير مكتمل: المسير #2 معتمد ولم يُصرف بعد', excluded: null },
      { runId: 32, period: '2026-12', counted: false, notCountedReason: 'مسير تجريبي لا يُحتسب: بيانات اختبار', excluded: { reason: 'بيانات اختبار', by: null, byName: null, at: null } }] } })
  assert.match(html, /الشهر <span dir="ltr">2026-08<\/span> غير مكتمل: المسير #2 معتمد ولم يُصرف بعد/)
  assert.match(html, /24 مسيرًا معلّمًا تجريبيًا بسبب مكتوب: لا يُحتسب ولا يحجب شهره/)
  assert.doesNotMatch(html, /المسير #32/, 'test runs are summarised, not listed as blockers')
  assert.match(html, /صاحب قرار التحويل العام: المالك \(كريم\) • لا مفوض مسمى في ملف التسليم/)
  const { PayrollParityCountingControl } = require('../../src/components/payroll/PayrollParityCountingControl')
  const marked = render(PayrollParityCountingControl, { run: { id: 32, status: 'PAID', parityExcludedReason: 'بيانات اختبار' }, onChanged: () => {}, canChange: true })
  assert.match(marked, /معلّم تجريبيًا ولا يُحتسب في فترة التكافؤ: بيانات اختبار/); assert.match(marked, /إعادته للاحتساب في فترة التكافؤ/)
  assert.match(marked, /disabled=""/, 'no change without a written reason')
  const viewer = render(PayrollParityCountingControl, { run: { id: 5, status: 'APPROVED', parityExcludedReason: null }, onChanged: () => {}, canChange: false })
  assert.match(viewer, /يُحتسب في فترة التكافؤ متى كان SHADOW/); assert.doesNotMatch(viewer, /<button/)
  assert.equal(render(PayrollParityCountingControl, { run: { id: 5, status: 'CANCELLED' }, onChanged: () => {}, canChange: true }), '')
  assert.match(read('src/components/payroll/PayrollRunEnginePanel.tsx'), /<PayrollParityCountingControl run=\{run as PayrollParityCountingRun\} onChanged=\{onChanged\} \/>/)
  const event = render(PayrollRunEventsList, { events: [{ id: 9, runId: 5, eventType: 'PARITY_COUNTING_CHANGED', actorUserId: 1, actorName: 'مدير النظام', reason: 'تشغيل تجريبي',
    createdAt: '2026-09-15T10:00:00Z', payload: { counts: false } }] })
  assert.ok(event.includes('مدير النظام — غيّر احتساب المسير في فترة التكافؤ')); assert.ok(event.includes('مسير تجريبي: لا يُحتسب في فترة التكافؤ'))
  // الرخصة مقفلة في الإعدادات لمن لا يحمل صلاحيتها المستقلة
  const policies = read('src/app/settings/policies/page.tsx')
  assert.match(policies, /key: 'payroll\.approval_self_approval_allowed'[^\n]*perm: 'payroll\.self_approval_licence'/)
  assert.match(policies, /const locked = !!f\.perm && !can\(f\.perm\)/)
})
