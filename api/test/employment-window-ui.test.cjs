// قرار المالك (26 سبتمبر) في الواجهة: الجدول الأسبوعي بيعرض الموظف في أيام خدمته بس (والباقي «خارج الخدمة»)،
// وتنبيه + فلتر «من غير جدول عمل / من غير وردية»، ومحرر «استثناءات أيام الراحة» جوه جدول العمل، ونتيجة الإسناد
// بتقول مين اتعدّى لأن خدمته انتهت بدل ما تعدّه مشكلة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..', '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

test('EWUI-01: the weekly schedule shows each employee only on his service days and warns about missing schedules/shifts', () => {
  const page = read('src/app/attendance/weekly-schedule/page.tsx')
  assert.match(page, /fetchEmploymentWindows\(\)/)
  assert.match(page, /const rows: EmployeeRow\[\] = employees\.filter\(\(e\) => servesWeek\(e\.id\)\)/)
  assert.match(page, /const serving = employees\.filter\(employee => servesWeek\(employee\.id\)\)/, 'أيام العمل بتتحسب لموظفي الأسبوع بس')
  assert.match(page, /if \(!inEmploymentWindow\(empWindow, dayDate\)\) \{/)
  assert.match(page, /خارج الخدمة/)
  assert.match(page, /موظف من غير جدول عمل \(ماشيين على الافتراضي\)/)
  assert.match(page, /موظف من غير وردية في الأسبوع ده/)
  assert.match(page, /<option value="noShift">من غير وردية في الأسبوع ده<\/option>/)
  // اللي خدمته برّه المدة معلومة هادية مش مشكلة
  assert.match(page, /problems\.push\(\.\.\.res\.skipped\.filter\(\(s\) => !s\.outsideEmployment\)/)
})

test('EWUI-02: the work-days page edits weekend exceptions inside the schedule and flags employees without a schedule', () => {
  const page = read('src/app/settings/work-days/page.tsx')
  assert.match(page, /function ScheduleExceptionsEditor\(/)
  assert.match(page, /updateCatalogItem\('work-schedules', selectedSchedule\.id, \{ weekendExceptions: list, \.\.\.change \}\)/)
  assert.match(page, /<option value="PAYROLL">في الشهر المالي<\/option>/)
  assert.match(page, /موظف في الخدمة من غير جدول عمل مسند/)
  assert.match(page, /presetEmployeeIds=\{presetAssign \?\? undefined\}/)
  assert.match(page, /خدمتهم انتهت قبل تاريخ السريان واتعدّوا/)
  // صفحة Next ماتصدّرش غير الافتراضي
  assert.doesNotMatch(page, /export function describeScheduleException/)
})
