'use strict'
// B2.14: لوحة «فريقي» ومفتاح عرض الرواتب — فحص من غير قاعدة (الدورة الفعلية في team-dashboard.integration.cjs):
//  TM-01) قاعدة عرض الرواتب: المفتاح الجديد بيزوّد على القاعدة القايمة، وكل دور جاهز بيشوف نفس الأعمدة المالية قبل الدفعة وبعدها.
//  TM-02) السجل: موديول «لوحة فريقي» (مقفول افتراضيًا) والمفتاح في كتالوج الصلاحيات وفي موديول الموظفين.
//  TM-03) الخدمة قراءة بس، بتعريف الفريق القايم، والراتب مابيتقريش ولا بيتبعت إلا بالحق ولموظف جوه نطاق الحساب، ومن غير نوع إجازة
//         ولا رقم مستند.
//  TM-04) الواجهة: بند القايمة للمدير بس وبسؤال واحد للجلسة، والشاشة بحالة «مفيش فريق»، وعمود الراتب بحقه.
// Run (من api/): node --test test/team-dashboard.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { canSeeEmployeesFinance, canReadEmployeeFinance } = require('../src/employees/employee-projection')
const permissions = require('../src/auth/permissions')
const { MODULES, routeOwner } = require('../src/modules-registry/registry')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const KEY = 'employees.view_compensation'
const user = (list, extra = {}) => ({ sub: 1, email: 'x@test.invalid', role: 'employee', branchId: 1, employeeId: 7, permissions: list, ...extra })

test('TM-01: the compensation key adds to the standing rule; every shipped role sees the same money columns before and after', () => {
  const before = list => list.includes('*') || list.includes('payroll.view') || list.includes('employees.edit')
  assert.ok(permissions.ROLE_PRESETS.length >= 8)
  for (const role of permissions.ROLE_PRESETS) {
    assert.equal(canSeeEmployeesFinance(user(role.permissions, { role: role.code })), role.code === 'super_admin' || before(role.permissions), role.code)
    // المفتاح مش مبذور في أي حزمة: القاعدة القايمة هي اللي بتدّي الحق للأدوار الجاهزة
    assert.equal(role.permissions.includes(KEY), false, role.code)
  }
  assert.equal(canSeeEmployeesFinance(user([])), false)
  assert.equal(canSeeEmployeesFinance(user(['employees.view', 'reports.view', 'dashboard.view_all'])), false)
  assert.equal(canSeeEmployeesFinance(user([KEY])), true)
  assert.equal(canSeeEmployeesFinance(user(['payroll.view'])), true)
  assert.equal(canSeeEmployeesFinance(user(['employees.edit'])), true)
  assert.equal(canSeeEmployeesFinance(user([], { role: 'super_admin' })), true)
  // ملفه هو دايمًا
  assert.equal(canReadEmployeeFinance(user([]), 7), true); assert.equal(canReadEmployeeFinance(user([]), 8), false)
  assert.equal(canReadEmployeeFinance(user([KEY]), 8), true)
})

test('TM-02: the module and the key are registered', () => {
  const module = MODULES.manager
  assert.deepEqual({ core: module.core, dependsOn: module.dependsOn, softUses: module.softUses, defaultEnabled: module.defaultEnabled, preset: module.preset,
    routes: module.routes, permissions: module.permissions, jobs: module.jobs },
  { core: false, dependsOn: ['employees'], softUses: ['attendance', 'leave', 'tasks'], defaultEnabled: false, preset: 'basic', routes: ['/my/team'], permissions: [], jobs: [] })
  assert.equal(routeOwner('/my/team').module, 'manager')
  assert.equal(routeOwner('/my/tasks').module, 'tasks')
  assert.ok(MODULES.employees.permissions.includes(KEY))
  const source = read('api/src/auth/permissions.ts')
  assert.match(source, /'employees\.view_compensation': 'عرض رواتب الموظفين وبياناتهم البنكية',/)
  assert.match(source, /key: 'employees', labelAr: 'الموظفون', permissions: \[[^\]]*'employees\.view_compensation'/)
  assert.equal(source.split(`'${KEY}':`).length - 1, 2, 'اسم ووصف')
  assert.ok(permissions.ALL_PERMISSIONS.includes(KEY))
})

test('TM-03: the service only reads, uses the standing team definition, and money leaves only with the right and inside the account scope', () => {
  const service = read('api/src/manager/team.service.ts'), controller = read('api/src/manager/team.controller.ts')
  assert.match(controller, /@RequireModule\('manager'\)\s+@UseGuards\(JwtAuthGuard\)\s+@Controller\('manager'\)/)
  assert.doesNotMatch(controller, /@(Post|Put|Patch|Delete)\(/, 'قراءة بس')
  assert.doesNotMatch(service, /\b(UPDATE|INSERT|DELETE|MERGE)\b|\.save\(|\.update\(|\.delete\(|\.insert\(|transaction\(/, 'الخدمة مابتكتبش')
  // تعريف الفريق: نفس دالتي «مهام فريقي»
  assert.match(service, /resolver\.directReportsOf\(user\.employeeId\), resolver\.subordinatesOf\(user\.employeeId\)/)
  assert.match(service, /if \(!ids\.length\) return \{ manager: false as const \}/, 'من غير فريق: ولا بيان')
  assert.match(service, /raw\.filter\(row => isCurrentEmployee\(/, 'الحاليين بس')
  // الراتب: مابيتقريش من القاعدة إلا بالحق، ومابيتبعتش إلا لموظف جوه نطاق فروع الحساب
  assert.match(service, /\$\{finance \? 'CONVERT\(varchar\(40\), e\.basicSalary\) AS basicSalary,' : ''\}/)
  assert.match(service, /const finance = canSeeEmployeesFinance\(user\), scope = branchScopeOf\(user\)/)
  assert.match(service, /const inScope = inBranchScope\(scope, Number\(row\.branchId\)\)/)
  assert.match(service, /if \(currencyOf && inScope\) Object\.assign\(member, \{ basicSalary:/)
  // وأسماء وحدات المرؤوس اللي برّه نطاق الحساب مابتتبعتش
  assert.match(service, /branchName: inScope \? row\.branchName \?\? null : null,\n\s+departmentName: inScope && unitInScope\(row\.departmentBranchId\) \? row\.departmentName \?\? null : null,\n\s+teamName: inScope && unitInScope\(row\.teamBranchId\) \? row\.teamName \?\? null : null/)
  // CRP3D-B14-01: اسم الوحدة بفرعها الحالي (القسم بفرعه، والفريق بفرع قسمه)
  assert.match(service, /d\.branchId AS departmentBranchId, td\.branchId AS teamBranchId/)
  assert.match(service, /LEFT JOIN departments td ON td\.id = t\.departmentId/)
  assert.match(service, /const unitInScope = \(branchId: unknown\) => inBranchScope\(scope, branchId == null \? null : Number\(branchId\)\)/)
  assert.equal(service.split('basicSalary').length - 1, 5, 'الراتب في مكان واحد (النوع، والقراءة، والإسناد)')
  // من غير نوع الإجازة، ولا رقم المستند، ولا بيانات بنك
  assert.doesNotMatch(service, /leaveTypeCode|d\.number|d\.notes|d\.fileRef|iban|bankName/)
  // الموديولات الاختيارية: مقفول للحساب = الجزء بيرجع null ومن غير استعلام
  assert.match(service, /!attendanceOn \|\| !memberIds\.length \? \[\]/); assert.match(service, /!leaveOn \|\| !memberIds\.length \? \[\]/)
  assert.match(service, /leaves: leaveOn \? leaves : null/)
  // العدّادين من الدوال القايمة
  assert.match(service, /this\.use\(RequestsService\)\.inbox\(user\)/); assert.match(service, /this\.use\(TasksService\)\.team\(user\)/)
  const fixture = require('./fixtures/routes-without-perm.cjs')
  assert.deepEqual([fixture.EXCEPTIONS['TeamController.overview'], fixture.EXCEPTIONS['TeamController.status']], ['SERVICE_CHECK', 'SERVICE_CHECK'])
})

test('TM-04: the sidebar item shows for a manager only, and the screen gates the salary column', () => {
  const sidebar = read('src/components/layout/Sidebar.tsx'), lib = read('src/lib/manager-api.ts'), page = read('src/app/my/team/page.tsx')
  assert.match(sidebar, /\{ label: 'فريقي', href: '\/my\/team', when: 'team' \},/)
  assert.match(sidebar, /\n      team: teamManager,\n/)
  assert.match(sidebar, /if \(!managerOn \|\| !getCurrentUser\(\)\) return setTeamManager\(false\)/)
  assert.match(sidebar, /\}, \[managerOn\]\)/, 'مش مع كل انتقال')
  // سؤال واحد للجلسة بمفتاح التوكن، والنداء الفاشل مايتخزّنش
  assert.match(lib, /if \(!statusCache \|\| statusCache\.token !== token\)/)
  assert.match(lib, /value\.catch\(\(\) => \{ if \(statusCache\?\.value === value\) statusCache = null \}\)/)
  assert.match(page, /data-team-empty>مفيش حد تحتك في الهيكل التنظيمي\./)
  assert.match(page, /\{data\.canSeeCompensation && <th className="py-2 px-2 font-medium" data-team-salary>الراتب الأساسي<\/th>\}/)
  assert.match(page, /member\.basicSalary != null \?/)
  assert.match(page, /<div className="overflow-x-auto">\s+<table/, 'الجدول بتمرير أفقي على الموبايل')
  assert.match(page, /\{data\.leaves && \(/); assert.match(page, /\{data\.attendanceToday && \(/)
  assert.match(read('src/components/layout/pageTitles.ts'), /\['\/my\/team', 'فريقي'\],/)
  assert.match(page, /<h1 className="text-2xl font-bold text-gray-800">فريقي<\/h1>/)
})
