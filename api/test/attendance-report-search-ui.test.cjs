// بحث تقارير الحضور: جدول الساعات الإضافية يطابق بنفس حقول جدول الحضور (الاسم أو الرقم الوظيفي)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { module: 'commonjs', moduleResolution: 'node' } })
const { filterAttendanceReportRows, matchesEmployeeSearch } = require('../../src/lib/attendance-report-search')
const root = path.resolve(__dirname, '..', '..')

const attendance = [
  { employeeId: 233, fullName: 'عمر تجريبي حسن الشاذلي', employeeCode: 'GUIDE-01', presentDays: 20 },
  { employeeId: 234, fullName: 'منى تجريبي سامي المصري', employeeCode: 'GUIDE-02', presentDays: 18 },
  { employeeId: 236, fullName: 'وليد الموجة', employeeCode: 'WAVE-01', presentDays: 21 },
]
// صفوف /reports/overtime مفيهاش employeeCode، والموظف ممكن يظهر أكتر من مرة (حالة لكل صف)
const overtime = [
  { employeeId: 233, fullName: 'عمر تجريبي حسن الشاذلي', status: 'APPROVED', entries: 2, actualHours: 6, payableHours: 6 },
  { employeeId: 233, fullName: 'عمر تجريبي حسن الشاذلي', status: 'SUBMITTED', entries: 1, actualHours: 2, payableHours: 0 },
  { employeeId: 234, fullName: 'منى تجريبي سامي المصري', status: 'APPROVED', entries: 1, actualHours: 3, payableHours: 3 },
  { employeeId: 999, fullName: 'سامح بلا حضور', status: 'DETECTED', entries: 1, actualHours: 1, payableHours: 0 },
]

test('searching by employee number keeps that employee in the overtime table', () => {
  const byCode = filterAttendanceReportRows(attendance, overtime, 'GUIDE-01')
  assert.deepEqual(byCode.attendance.map(r => r.employeeId), [233])
  assert.deepEqual(byCode.overtime.map(r => `${r.employeeId}-${r.status}`), ['233-APPROVED', '233-SUBMITTED'])
  // الرقم بحروف صغيرة زي جدول الحضور
  assert.deepEqual(filterAttendanceReportRows(attendance, overtime, 'guide-02').overtime.map(r => r.employeeId), [234])
  // جزء من الرقم يطابق الموظفين الاتنين في الجدولين
  const partial = filterAttendanceReportRows(attendance, overtime, 'GUIDE')
  assert.deepEqual(partial.attendance.map(r => r.employeeId), [233, 234])
  assert.deepEqual([...new Set(partial.overtime.map(r => r.employeeId))], [233, 234])
})

test('name search still works on both tables, including overtime without an attendance row', () => {
  const byName = filterAttendanceReportRows(attendance, overtime, 'منى')
  assert.deepEqual(byName.attendance.map(r => r.employeeId), [234])
  assert.deepEqual(byName.overtime.map(r => r.employeeId), [234])
  assert.deepEqual(filterAttendanceReportRows(attendance, overtime, 'سامح').overtime.map(r => r.employeeId), [999])
  assert.deepEqual(filterAttendanceReportRows(attendance, overtime, 'غير موجود'), { attendance: [], overtime: [] })
  // بحث فاضي = كل الصفوف
  const all = filterAttendanceReportRows(attendance, overtime, '')
  assert.equal(all.attendance.length, 3); assert.equal(all.overtime.length, 4)
  // employeeId راجع كنص من الاستعلام لازال يطابق
  assert.equal(filterAttendanceReportRows([{ employeeId: '233', fullName: 'عمر', employeeCode: 'GUIDE-01' }], [{ employeeId: 233, fullName: 'عمر تجريبي' }], 'GUIDE-01').overtime.length, 1)
  assert.equal(matchesEmployeeSearch({ employeeId: 1, fullName: null, employeeCode: null }, 'x'), false)
})

test('reports page uses the shared filter for both tables', () => {
  const page = fs.readFileSync(path.join(root, 'src/app/attendance/reports/page.tsx'), 'utf8')
  assert.match(page, /const \{ attendance: filteredData, overtime: filteredOvertime \} = filterAttendanceReportRows\(attendanceRows, overtimeRows, searchTerm\)/)
  assert.doesNotMatch(page, /overtimeRows\.filter\(/)
  assert.match(page, /filteredOvertime\.map\(/)
})
