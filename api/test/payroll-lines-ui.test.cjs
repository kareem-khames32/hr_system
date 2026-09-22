// طلب المالك 19 سبتمبر في الواجهة: جدول المسير بمجموعتين «الاستحقاقات» و«الاستقطاعات» وكل بند عمود باسمه من الخادم (والتصدير بنفس الأعمدة)،
// والقسيمة بنفس البنود، وتابتي «البدلات» و«الاستقطاعات» بكل بنود الشهر، وزر «إنشاء مسيرات الشهر الجديد» بمعاينة ثم إنشاء. فحص نصي ومنطق الواجهة؛ لا SQL.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const lines = require('../../src/lib/payroll-lines-api')

test('جدول المسير: الأعمدة من بنود الخادم بمجموعتين، والصف والإجمالي من البند نفسه، والتصدير بنفس الأعمدة', () => {
  const page = read('src/app/payroll/page.tsx')
  for (const text of ['fetchPayrollRunLines(id)', '{PAYROLL_LINE_GROUP_LABELS.earnings}', '{PAYROLL_LINE_GROUP_LABELS.deductions}',
    'earningColumns.map(column =>', 'deductionColumns.map(column =>', 'payrollLineAmount(lines?.earnings, column.key)', 'payrollLineAmount(lines?.deductions, column.key)',
    'formatMoney(earningColumnTotals[column.key])', 'formatMoney(deductionColumnTotals[column.key])', 'onClick={exportRunCsv}',
    "...earningColumns.map(column => column.name), PAYROLL_LINE_TOTAL_LABELS.earnings", 'payrollItemEarnings(item)', 'payrollItemDeductions(item)']) {
    assert.ok(page.includes(text), text)
  }
  // مفيش عمود «البدلات» و«إضافات أخرى» و«خصومات أخرى» ثابت في الجدول ولا في التصدير
  assert.doesNotMatch(page, /<th[^>]*>(البدلات|إضافات أخرى|خصومات أخرى)<\/th>/)
  assert.doesNotMatch(page, /'البدلات', 'الإضافي', 'إضافات أخرى'/)
})

test('إنشاء مسيرات الشهر الجديد: معاينة من الخادم ثم إنشاء بنفس شهر المصدر، والنتيجة (اتعمل / اتخطى وسببه)', () => {
  const page = read('src/app/payroll/page.tsx')
  for (const text of ['إنشاء مسيرات الشهر الجديد', 'createNextPeriodPayrollRuns({ dryRun: true', 'createNextPeriodPayrollRuns({ sourcePeriod: nextPeriodPlan.sourcePeriod })',
    'data-next-period-panel', 'nextPeriodPlan.skipped.map', 'nextPeriodResult.created.map', 'row.reason']) assert.ok(page.includes(text), text)
  const api = read('src/lib/payroll-runs-api.ts')
  assert.ok(api.includes("send<PayrollNextPeriodResult>('/payroll/runs/create-next-period', 'POST', input)"))
  // «مسير الشهر التالي» لمسير واحد باقٍ
  assert.ok(page.includes('مسير الشهر التالي'))
})

test('القسيمة وتابتا الشهر: بنود الخادم بأسمائها، والبدلات = كل الاستحقاقات والاستقطاعات = كل الخصومات لكل موظف', () => {
  const payslip = read('src/app/payroll/payslip/[id]/page.tsx')
  assert.ok(payslip.includes('{PAYROLL_LINE_GROUP_LABELS.deductions}') && payslip.includes('{PAYROLL_LINE_TOTAL_LABELS.deductions}'))
  assert.ok(payslip.includes('exemptionNote(deduction.component)'), 'ملاحظة الإلغاء على سطر الخصم باقية')
  assert.ok(read('src/components/payroll/PayrollAllowancesTab.tsx').includes('<PayrollMonthLinesTable side="earnings" period={period} matches={matches} onOpenRun={onOpenRun} version={version} />'))
  assert.ok(read('src/components/payroll/PayrollOverviewTabs.tsx').includes('<PayrollMonthLinesTable side="deductions" period={period} matches={matches} onOpenRun={onOpenRun} version={version} />'))
  const table = read('src/components/payroll/PayrollMonthLinesTable.tsx')
  assert.ok(table.includes('fetchPayrollMonthLines(period)') && table.includes('كل بنود الاستحقاق للشهر') && table.includes('كل بنود الاستقطاع للشهر'))
  const lib = read('src/lib/payroll-lines-api.ts')
  assert.doesNotMatch(lib, /\bfetch\(/, 'كل النداءات من apiFetch')
  for (const route of ['/payroll/runs/${runId}/lines', '/payroll/overview/lines?period=']) assert.ok(lib.includes(route), route)
})

test('«إذن بخصم» في الواجهة: عموده ودقائقه في جدول المسير، وسطره في القسيمة تحت قرار إلغاء التأخير نفسه', () => {
  const page = read('src/app/payroll/page.tsx').replace(/\r\n/g, '\n')
  // عمود «إذن بخصم» بييجي من بنود الخادم زي أي بند؛ اللي تكتبه الشاشة هو دقائقه تحت مبلغه
  assert.ok(page.includes('PAYROLL_LINE_KEYS.deductPermission'), 'سطر دقائق الإذن بخصم في خلية البند')
  assert.ok(page.includes('payrollItemPermissionMinutes(item)'))
  // «دقائق التأخير» بقت عدّاد التأخير وحده (عمود البند نفسه) — بلا جمع الإذن جواها
  assert.match(page, /PAYROLL_LINE_KEYS\.lateness && n\(item\.lateMinutes\) > 0/)
  assert.equal(lines.PAYROLL_LINE_KEYS.deductPermission, 'DEDUCT_PERMISSION')
  assert.equal(lines.payrollItemPermissionMinutes({ breakdown: JSON.stringify({ attendanceDeductions: { totals: { permissionMinutes: 120 } } }) }), 120)
  for (const breakdown of [null, '', '{bad json', JSON.stringify({ attendanceDeductions: { totals: {} } })]) {
    assert.equal(lines.payrollItemPermissionMinutes({ breakdown }), 0, String(breakdown))
  }
  // القسيمة: سطر الإذن بخصم تحت نفس قرار «إلغاء خصم التأخير» (الإلغاء بيشيل الاثنين)
  const payslip = read('src/app/payroll/payslip/[id]/page.tsx').replace(/\r\n/g, '\n')
  assert.ok(payslip.includes("key === 'LATENESS' || key === 'DEDUCT_PERMISSION' ? 'LATENESS'"))
  // «شيل خصم»: المبلغ القابل للإلغاء في بند التأخير = سطر التأخير + سطر الإذن بخصم
  const panel = read('src/components/payroll/PayrollFinancialExemptionsPanel.tsx').replace(/\r\n/g, '\n')
  assert.ok(panel.includes("lineAmountOf(lines, 'DEDUCT_PERMISSION')"))
  assert.ok(panel.includes("sumMoney([lineAmountOf(lines, 'LATENESS'), permissionAmount])"))
})

test('إجماليات الأعمدة بالقرش، والاحتياطي من أعمدة البند بنفس المجاميع', () => {
  const rows = [
    { earnings: [{ key: 'BASIC', name: 'الأساسي', amount: 0.1 }, { key: 'ALLOWANCE:بدل وجبات', name: 'بدل وجبات', amount: 0.2 }], deductions: [{ key: 'TYPED:الجودة', name: 'الجودة', amount: 10.05 }] },
    { earnings: [{ key: 'BASIC', name: 'الأساسي', amount: 1000.1 }], deductions: [{ key: 'TYPED:الجودة', name: 'الجودة', amount: 0.15 }, { key: 'LOAN', name: 'السلف', amount: 5 }] },
  ]
  const columns = [{ key: 'BASIC', name: 'الأساسي' }, { key: 'ALLOWANCE:بدل وجبات', name: 'بدل وجبات' }]
  assert.deepEqual(lines.payrollLineColumnTotals(rows, 'earnings', columns), { BASIC: 1000.2, 'ALLOWANCE:بدل وجبات': 0.2 })
  assert.deepEqual(lines.payrollLineColumnTotals(rows, 'deductions', [{ key: 'TYPED:الجودة', name: 'الجودة' }, { key: 'LOAN', name: 'السلف' }]), { 'TYPED:الجودة': 10.2, LOAN: 5 })
  assert.equal(lines.payrollLineAmount(rows[0].deductions, 'LOAN'), 0)
  const fallback = lines.payrollItemColumnLines({ basicSalary: '5000.00', allowances: '1000.10', otherAdditions: '0.20', latenessDeduction: '12.50', otherDeductions: '0.15', netPay: '5987.65' })
  assert.deepEqual(fallback.earnings.map(line => [line.name, line.amount]), [['الأساسي', 5000], ['البدلات الثابتة', 1000.1], ['إضافات أخرى', 0.2]])
  assert.deepEqual(fallback.deductions.map(line => [line.name, line.amount]), [['التأخير', 12.5], ['خصومات أخرى', 0.15]])
  assert.deepEqual(fallback.totals, { earnings: 6000.3, deductions: 12.65, net: 5987.65 })
})
