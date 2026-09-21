// منتقي الاستهداف الموحّد (شركة ← فرع ← أقسام ← فرق ← موظفين) + ربطه بشاشة الجدول الأسبوعي وفترات الإضافي. بلا خادم.
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
const teams = [
  { id: 100, name: 'فريق التوظيف', departmentId: 10 },
  { id: 110, name: 'فريق المبيعات الميدانية', departmentId: 11 },
  { id: 111, name: 'فريق قديم', departmentId: 11, isActive: false },
  { id: 200, name: 'فريق الجرد', departmentId: 20 },
]
const employees = [
  { id: 1, fullName: 'أحمد', branchId: 1, departmentId: 10, teamId: 100, status: 'active' },
  { id: 2, fullName: 'منى', branchId: 1, departmentId: 11, teamId: 110, status: 'probation' },
  { id: 3, fullName: 'سيد', branchId: 1, departmentId: 11, teamId: 110, status: 'terminated' },
  { id: 4, fullName: 'خالد', branchId: 2, departmentId: 20, teamId: 200, status: 'active' },
  { id: 5, fullName: 'هالة', branchId: 1, departmentId: 10, status: 'archived' },
]
const target = (level, extra = {}) => ({ level, branchId: null, departmentIds: [], teamIds: [], employeeIds: [], ...extra })

test('الاستهداف بالترتيب: الشركة ← الفرع ← أقسامه ← موظفينه، ومن ساب الشغل مايتستهدفش', () => {
  assert.deepEqual(picker.resolveOrgTarget(target('company'), employees), [1, 2, 4])
  assert.deepEqual(picker.resolveOrgTarget(target('branch', { branchId: 1 }), employees), [1, 2])
  assert.deepEqual(picker.resolveOrgTarget(target('branch'), employees), [])
  assert.deepEqual(picker.resolveOrgTarget(target('departments', { branchId: 1, departmentIds: [11] }), employees), [2])
  // قسم من فرع تاني مايدخلش حتى لو اتبعت بالغلط
  assert.deepEqual(picker.resolveOrgTarget(target('departments', { branchId: 1, departmentIds: [20] }), employees), [])
  assert.deepEqual(picker.resolveOrgTarget(target('employees', { branchId: 1, employeeIds: [1, 4] }), employees), [1])
  // الفرق: أعضاء الفرق المختارة جوه الفرع بس، ومن ساب الشغل برا
  assert.deepEqual(picker.resolveOrgTarget(target('teams', { branchId: 1, teamIds: [110] }), employees), [2])
  assert.deepEqual(picker.resolveOrgTarget(target('teams', { branchId: 1, teamIds: [100, 200] }), employees), [1])
  // قيمة قديمة من غير teamIds مابتكسرش
  const legacy = { level: 'teams', branchId: 1, departmentIds: [], employeeIds: [] }
  assert.deepEqual(picker.resolveOrgTarget(legacy, employees), [])
  // فرق الفرع (فرع الفريق = فرع قسمه)، والمتفلترة بالأقسام، والموقوفة برا
  assert.deepEqual(picker.teamsOfBranch(teams, departments, 1).map(t => t.id), [100, 110])
  assert.deepEqual(picker.teamsOfBranch(teams, departments, 1, [11]).map(t => t.id), [110])
  assert.deepEqual(picker.teamsOfBranch(teams, departments, 2).map(t => t.id), [200])
  assert.deepEqual(picker.teamsOfBranch(teams, departments, null), [])
  assert.deepEqual(picker.ORG_TARGET_LEVELS, ['company', 'branch', 'departments', 'teams', 'employees'])
})

test('قيمة البداية والوصف: مستخدم الفرع يبدأ من فرعه، والوصف بالعربي', () => {
  assert.deepEqual(picker.initialOrgTarget(null), target('company'))
  assert.deepEqual(picker.initialOrgTarget(2), target('branch', { branchId: 2 }))
  assert.deepEqual(picker.initialOrgTarget(null, ['branch']), target('branch'))
  assert.equal(picker.describeOrgTarget(target('company'), branches, departments), 'الشركة كلها')
  assert.equal(picker.describeOrgTarget(target('branch', { branchId: 1 }), branches, departments), 'القاهرة كله')
  assert.equal(picker.describeOrgTarget(target('departments', { branchId: 1, departmentIds: [10, 11] }), branches, departments), 'القاهرة — الموارد البشرية، المبيعات')
  assert.equal(picker.describeOrgTarget(target('employees', { branchId: 2, employeeIds: [4] }), branches, departments), 'الرياض — 1 موظف مختار')
  assert.equal(picker.describeOrgTarget(target('teams', { branchId: 1, teamIds: [100, 110] }), branches, departments, teams), 'القاهرة — فرق: فريق التوظيف، فريق المبيعات الميدانية')
  assert.equal(picker.describeOrgTarget(target('teams', { branchId: 1 }), branches, departments, teams), 'القاهرة — لسه ما اخترتش فرق')
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
  // من غير فرق (الشاشات القديمة): مستوى الفرق مابيظهرش
  assert.doesNotMatch(deps, /فرق من الفرع/)
})

test('المكوّن بالفرق: فرق الفرع بس، متفلترة بالأقسام المختارة، وفلتر الفريق في الموظفين', () => {
  const render = props => renderToStaticMarkup(React.createElement(picker.OrgTargetPicker, { branches, departments, teams, employees, onChange: () => {}, ...props }))
  const all = render({ value: target('teams', { branchId: 1, teamIds: [110] }) })
  assert.match(all, /فرق من الفرع/)
  assert.match(all, /فريق التوظيف/); assert.match(all, /فريق المبيعات الميدانية/)
  assert.doesNotMatch(all, /فريق الجرد/); assert.doesNotMatch(all, /فريق قديم/)
  assert.match(all, /data-org-target-count="1"/)
  const byDept = render({ value: target('teams', { branchId: 1, departmentIds: [10], teamIds: [] }) })
  assert.match(byDept, /فريق التوظيف/); assert.doesNotMatch(byDept, /فريق المبيعات الميدانية/)
  const emps = render({ value: target('employees', { branchId: 1 }) })
  assert.match(emps, /aria-label="فلترة بالفريق"/); assert.match(emps, /كل فرق الفرع/); assert.doesNotMatch(emps, /فريق الجرد/)
  const noTeams = render({ value: target('employees', { branchId: 1 }), levels: ['company', 'branch', 'departments', 'employees'] })
  assert.doesNotMatch(noTeams, /فرق من الفرع/); assert.doesNotMatch(noTeams, /فلترة بالفريق/)
})

test('الشاشات: الجدول الأسبوعي بيعيّن لمدة بالمنتقي، وفترات الإضافي في شاشة الإضافي، وأيام العمل فيها رابط بس', () => {
  const weekly = src('app/attendance/weekly-schedule/page.tsx')
  assert.match(weekly, /<OrgTargetPicker/)
  assert.match(weekly, /assignScheduleRange\(/)
  assert.match(weekly, /تعيين وردية لمدة/)
  assert.match(weekly, /الشهر ده/); assert.match(weekly, /الشهر الجاي/)
  assert.doesNotMatch(weekly, /BulkAssignModal/)
  // الفرق: المنتقي بياخدها، وفلتر الجدول بالترتيب فرع ← قسم ← فريق، والإسناد بيبعت teamIds
  assert.match(weekly, /teams=\{teams\}/); assert.match(weekly, /teams=\{teamsList\}/)
  assert.match(weekly, /aria-label="الفريق"/)
  assert.match(weekly, /setSelectedDepartment\(e\.target\.value\); setSelectedTeam\('all'\)/)
  assert.match(weekly, /body: \{ teamIds: \[teamId\] \}/)
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
  assert.match(api, /employeeIds\?: number\[\]; teamIds\?: number\[\]; from: string/)
  const service = fs.readFileSync(path.join(__dirname, '..', 'src', 'attendance', 'attendance.service.ts'), 'utf8')
  assert.ok(service.includes("where: { teamId: In(teamIds), ...(scope !== null ? { branchId: scope } : {}) },"), 'team members resolved inside the branch scope')
})

test('المقفول بيقول سبب القفل: خلية الوردية في وضع «عرض»، و«نشط» في الجدول الافتراضي', () => {
  const weekly = src('app/attendance/weekly-schedule/page.tsx').replace(/\r\n/g, '\n')
  assert.ok(weekly.includes("viewMode === 'view' ? 'وضع العرض — اضغط «تعديل» فوق لتغيير الوردية' : ''"), 'the locked cell names the «تعديل» toggle')
  const workDays = src('app/settings/work-days/page.tsx').replace(/\r\n/g, '\n')
  assert.ok(workDays.includes("title={schedule?.isDefault ? 'الجدول الافتراضي لا يمكن تعطيله' : undefined}"), 'the locked «نشط» box says why')
  assert.ok(workDays.includes('(الجدول الافتراضي لا يمكن تعطيله)'), 'and says it on screen, not only on hover')
})
