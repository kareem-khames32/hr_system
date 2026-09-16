// منتقي الاستهداف الموحّد (شركة ← فرع ← أقسام ← موظفين) + ربطه بشاشة الجدول الأسبوعي وفترات الإضافي. بلا خادم.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const picker = require('../../src/components/OrgTargetPicker')
const src = file => fs.readFileSync(path.join(__dirname, '..', '..', 'src', file), 'utf8')

const branches = [{ id: 1, name: 'القاهرة' }, { id: 2, name: 'الرياض' }]
const departments = [
  { id: 10, name: 'الموارد البشرية', branchId: 1 },
  { id: 11, name: 'المبيعات', branchId: 1 },
  { id: 20, name: 'المخازن', branchId: 2 },
]
const employees = [
  { id: 1, fullName: 'أحمد', branchId: 1, departmentId: 10, status: 'active' },
  { id: 2, fullName: 'منى', branchId: 1, departmentId: 11, status: 'probation' },
  { id: 3, fullName: 'سيد', branchId: 1, departmentId: 11, status: 'terminated' },
  { id: 4, fullName: 'خالد', branchId: 2, departmentId: 20, status: 'active' },
  { id: 5, fullName: 'هالة', branchId: 1, departmentId: 10, status: 'archived' },
]
const target = (level, extra = {}) => ({ level, branchId: null, departmentIds: [], employeeIds: [], ...extra })

test('الاستهداف بالترتيب: الشركة ← الفرع ← أقسامه ← موظفينه، ومن ساب الشغل مايتستهدفش', () => {
  assert.deepEqual(picker.resolveOrgTarget(target('company'), employees), [1, 2, 4])
  assert.deepEqual(picker.resolveOrgTarget(target('branch', { branchId: 1 }), employees), [1, 2])
  assert.deepEqual(picker.resolveOrgTarget(target('branch'), employees), [])
  assert.deepEqual(picker.resolveOrgTarget(target('departments', { branchId: 1, departmentIds: [11] }), employees), [2])
  // قسم من فرع تاني مايدخلش حتى لو اتبعت بالغلط
  assert.deepEqual(picker.resolveOrgTarget(target('departments', { branchId: 1, departmentIds: [20] }), employees), [])
  assert.deepEqual(picker.resolveOrgTarget(target('employees', { branchId: 1, employeeIds: [1, 4] }), employees), [1])
})

test('قيمة البداية والوصف: مستخدم الفرع يبدأ من فرعه، والوصف بالعربي', () => {
  assert.deepEqual(picker.initialOrgTarget(null), target('company'))
  assert.deepEqual(picker.initialOrgTarget(2), target('branch', { branchId: 2 }))
  assert.deepEqual(picker.initialOrgTarget(null, ['branch']), target('branch'))
  assert.equal(picker.describeOrgTarget(target('company'), branches, departments), 'الشركة كلها')
  assert.equal(picker.describeOrgTarget(target('branch', { branchId: 1 }), branches, departments), 'القاهرة كله')
  assert.equal(picker.describeOrgTarget(target('departments', { branchId: 1, departmentIds: [10, 11] }), branches, departments), 'القاهرة — الموارد البشرية، المبيعات')
  assert.equal(picker.describeOrgTarget(target('employees', { branchId: 2, employeeIds: [4] }), branches, departments), 'الرياض — 1 موظف مختار')
})

test('المكوّن: اختيار الفرع يعرض أقسامه وموظفينه بس، والمستويات والقفل على الفرع شغالين', () => {
  const render = props => renderToStaticMarkup(React.createElement(picker.OrgTargetPicker, { branches, departments, employees, onChange: () => {}, ...props }))
  const deps = render({ value: target('departments', { branchId: 1, departmentIds: [10] }) })
  assert.match(deps, /الشركة كلها/)
  assert.match(deps, /الموارد البشرية/); assert.match(deps, /المبيعات/); assert.doesNotMatch(deps, /المخازن/)
  assert.match(deps, /أقسام من الفرع/); assert.match(deps, /موظفين من الفرع/)
  assert.match(deps, /data-org-target-count="1"/)
  const emps = render({ value: target('employees', { branchId: 1, employeeIds: [] }) })
  assert.match(emps, /أحمد/); assert.match(emps, /منى/); assert.doesNotMatch(emps, /خالد/); assert.doesNotMatch(emps, /سيد/)
  const locked = render({ value: target('branch', { branchId: 2 }), lockedBranchId: 2 })
  assert.doesNotMatch(locked, /الشركة كلها/); assert.doesNotMatch(locked, /القاهرة/); assert.match(locked, /صلاحيتك على فرعك بس/)
  const branchOnly = render({ value: target('branch', { branchId: 1 }), levels: ['company', 'branch'], showCount: false })
  assert.doesNotMatch(branchOnly, /أقسام من الفرع/); assert.doesNotMatch(branchOnly, /ينطبق على/)
})

test('الشاشات: الجدول الأسبوعي بيعيّن لمدة بالمنتقي، وفترات الإضافي في شاشة الإضافي، وأيام العمل فيها رابط بس', () => {
  const weekly = src('app/attendance/weekly-schedule/page.tsx')
  assert.match(weekly, /<OrgTargetPicker/)
  assert.match(weekly, /assignScheduleRange\(/)
  assert.match(weekly, /تعيين وردية لمدة/)
  assert.match(weekly, /الشهر ده/); assert.match(weekly, /الشهر الجاي/)
  assert.doesNotMatch(weekly, /fetchTeams|BulkAssignModal/)
  const overtime = src('app/attendance/overtime/page.tsx')
  assert.match(overtime, /id="overtime-periods"/)
  assert.match(overtime, /فترات فتح وقفل الإضافي/)
  assert.match(overtime, /<b>مفتوحة:<\/b>/); assert.match(overtime, /<b>مقفولة:<\/b>/)
  assert.match(overtime, /levels=\{\['company', 'branch'\]\}/)
  const workDays = src('app/settings/work-days/page.tsx')
  assert.match(workDays, /href="\/attendance\/overtime#overtime-periods"/)
  assert.doesNotMatch(workDays, /createOvertimePeriod|fetchOvertimePeriods|AddOvertimePeriodModal/)
  const api = src('lib/api.ts')
  assert.match(api, /'\/attendance\/schedule\/range'/)
})
