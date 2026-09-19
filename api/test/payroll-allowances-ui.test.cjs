// «تابة البدلات»: التابة في شاشة المسير بعد «الاستقطاعات» بنفس الشكل (الشهر + البحث)، والاستهداف بالمنتقي الموحد،
// ونداءات الـAPI، والقسيمة بتعرض كل بدل سطر باسمه من غير ما يتغير إجمالي الإضافات. فحص نصوص الواجهة بس.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

test('تابة «البدلات» آخر تابة في شاشة المسير وبتفتح المسير من الجدول', () => {
  const page = read('src/app/payroll/page.tsx')
  assert.match(page, /\['deductions', 'الاستقطاعات'\],\s*\['allowances', 'البدلات'\],\s*\]/)
  assert.match(page, /tab === 'allowances' \? \(\s*<PayrollAllowancesTab [^>]*employees=\{employees\}\s*onOpenRun=/)
})

test('التابة: الشهر والبحث، والمنتقي الموحد، والإجماليات، والإلغاء', () => {
  const tab = read('src/components/payroll/PayrollAllowancesTab.tsx')
  assert.match(tab, /data-payroll-overview-tab="allowances"/)
  assert.match(tab, /type="month"/)
  // الافتراضي شهر الرواتب الجاري بحدوده (نفس باقي تابات المسير)، مش الشهر التقويمي
  assert.match(tab, /usePayrollDayRange\(\)\.context/)
  assert.match(tab, /payrollMonthBounds\(period, payrollMonth\.cycleStartDay\)/)
  assert.match(tab, /> شهر الرواتب<\/span>/)
  assert.match(tab, /data-payroll-period-range>\{dayRangeLabel\(periodRange\)\}/)
  assert.doesNotMatch(tab, /new Date\(\)\.getMonth|thisMonth/)
  assert.match(tab, /<OrgTargetPicker /)
  assert.match(tab, /formatMoney\(data\?\.totals\.amount/)
  assert.match(tab, /cancelAllowanceLine\(row\.id\)/)
  assert.match(tab, /cancelAllowanceGrant\(grant\.id\)/)
  assert.doesNotMatch(tab, /toFixed\(/, 'المبالغ بالمنسّق الموحد')
  const lib = read('src/lib/payroll-allowances-api.ts')
  for (const endpoint of ['/payroll/allowances/types', '/payroll/allowances/grants', '/payroll/allowances/lines/']) assert.ok(lib.includes(endpoint), endpoint)
  assert.doesNotMatch(lib, /\bfetch\(/, 'كل النداءات من apiFetch')
})

test('القسيمة: البدل سطر باسمه والباقي «إضافات أخرى»، والمجموع هو عمود الإضافات', () => {
  // طلب المالك 19 سبتمبر: التقسيم بقى في الخادم (payroll-item-lines) لكل البنود — البدل ALLOWANCE:<اسمه> والباقي OTHER_ADDITIONS، ومجموعها = العمود
  // (مختبر في payroll-item-lines.test.cjs)؛ القسيمة بتعرض بنود الخادم بأسمائها وإجمالياتها.
  const payslip = read('src/app/payroll/payslip/[id]/page.tsx')
  assert.match(payslip, /setLines\(\(data as \{ lines\?: PayrollItemLines \}\)\.lines \?\? null\)/)
  assert.match(payslip, /const totalEarnings = itemLines\?\.totals\.earnings \?\? 0/)
  const lines = read('api/src/payroll/payroll-item-lines.ts')
  assert.match(lines, /if \(fact\.category === 'allowance'\) \{ const name = label \|\| 'بدل'; return \{ key: `ALLOWANCE:\$\{name\}`, name \} \}/)
  assert.match(lines, /mergeWithRemainder\(earnings, credits, otherAdditions, 'OTHER_ADDITIONS', PAYROLL_LINE_NAMES\.OTHER_ADDITIONS\)/)
})
