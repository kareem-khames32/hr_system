// «البدل الثابت الشهري» جوه «تابة البدلات»: القسم ظاهر في التابة بنفس الشهر والبحث، والإسناد بالمنتقي الموحد من شهر لشهر اختياري
// وسبب، والقاعدة مكتوبة في التابة (مالوش مؤثرات + تناسب المنضم/المغادر)، والقائمة بالشهور اللي اتصرفت، والإيقاف بسبب وشهر.
// فحص نصوص الواجهة بس (السلوك نفسه في payroll-recurring-allowances.integration.cjs).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

test('التابة بتعرض قسم البدل الثابت الشهري بنفس الشهر والبحث وصلاحية الكتابة', () => {
  const tab = read('src/components/payroll/PayrollAllowancesTab.tsx')
  assert.match(tab, /import \{ PayrollRecurringAllowances \} from '@\/components\/payroll\/PayrollRecurringAllowances'/)
  assert.match(tab, /<PayrollRecurringAllowances period=\{period\} types=\{types\} branches=\{branches\} departments=\{departments\} teams=\{teams\} employees=\{employees\}\s*canWrite=\{canWrite\} matches=\{matches\} onOpenRun=\{onOpenRun\} \/>/)
})

test('القسم: القاعدة مكتوبة، والإسناد بالمنتقي الموحد من شهر لشهر اختياري، والقائمة بالشهور اللي اتصرفت، والإيقاف بسبب', () => {
  const section = read('src/components/payroll/PayrollRecurringAllowances.tsx')
  assert.match(section, /data-recurring-allowances/)
  assert.match(section, /البدل الثابت الشهري/)
  // القاعدة في التابة: مالوش مؤثرات، والتعديل الوحيد تناسب المنضم/المغادر بأيام الخدمة، واللي مش في الخدمة ما ياخدوش
  const hint = section.match(/export const RECURRING_ALLOWANCE_RULE_HINT = ([\s\S]*?)\r?\n\r?\n/)[1]
  for (const phrase of ['سعر ساعة الإضافي', 'التأخير', 'الغياب', 'الانصراف المبكر', 'نقص الساعات', 'الإجازة بدون راتب', 'سقف الخصم', 'الأقساط', 'مكافأة نهاية الخدمة',
    'بنسبة أيام خدمته', '÷ 30', 'اللي مش في الخدمة الشهر ده ما ياخدوش']) assert.ok(hint.includes(phrase), phrase)
  assert.match(section, /data-recurring-allowance-rule>\{RECURRING_ALLOWANCE_RULE_HINT\}/)
  // الإسناد: المنتقي الموحد + من مسير + لحد مسير اختياري + السبب
  assert.match(section, /<OrgTargetPicker /)
  assert.match(section, /من مسير<\/span>/)
  assert.match(section, /لحد مسير \(اختياري\)<\/span>/)
  assert.match(section, /untilPeriod: untilPeriod \|\| null/)
  assert.match(section, /createRecurringAllowance\(/)
  // القائمة: الشهور اللي اتصرفت وحالة الشهر المختار، و«إيقاف» بسبب وشهر
  assert.match(section, /data-recurring-paid-months/)
  assert.match(section, /row\.paidMonths\.join/)
  assert.match(section, /stopRecurringAllowance\(row\.id, \{ reason: reason\.trim\(\), fromPeriod: fromPeriod \|\| null \}\)/)
  assert.match(section, /يتوقف من مسير<\/span>/)
  assert.match(section, /NOT_IN_SERVICE/)
  assert.doesNotMatch(section, /toFixed\(/, 'المبالغ بالمنسّق الموحد')
  assert.doesNotMatch(section, /new Date\(\)\.getMonth|thisMonth/, 'الشهر من التابة نفسها')
})

test('نداءات الـAPI كلها من apiFetch على مسارات البدل الثابت', () => {
  const lib = read('src/lib/payroll-allowances-api.ts')
  assert.ok(lib.includes('/payroll/allowances/recurring?period='))
  assert.ok(lib.includes("post<RecurringAllowanceCreated>('/payroll/allowances/recurring', input)"))
  assert.ok(lib.includes('`/payroll/allowances/recurring/${id}/stop`'))
  assert.doesNotMatch(lib, /\bfetch\(/, 'كل النداءات من apiFetch')
  // الباك: نفس صلاحيات التابة (العرض payroll.view والإسناد والإيقاف payroll.calculate)
  const controller = read('api/src/payroll/recurring-allowances.controller.ts')
  assert.match(controller, /@Controller\('payroll\/allowances\/recurring'\)/)
  assert.match(controller, /@Perm\('payroll\.view'\)\s*@Get\(\)/)
  assert.match(controller, /@Perm\('payroll\.calculate'\)\s*@Post\(\)/)
  assert.match(controller, /@Perm\('payroll\.calculate'\)\s*@Post\(':id\/stop'\)/)
})
