'use strict'
// مستوى «الإدارة» فوق القسم ومعتمد «مدير الإدارة» (قرار المالك 27 سبتمبر: «الإدارة ← القسم ← الفريق») — الواجهة بلا قاعدة ولا خادم:
//  UI-01) محرر السلاسل: «مدير الإدارة» بعد «مدير القسم» بوصفه، ومش في قايمة التصعيد، وتسميته في الصناديق التلاتة.
//  UI-02) اختيارات الأب بنفس قواعد الخادم (الإدارة رئيسية أو تحت الإدارة التنفيذية، والقسم تحت إدارة/قسم من فرعه أو التنفيذية)،
//         وتغيير النوع أو الفرع بيشيل أب مابقاش يصلح.
//  UI-03) مكان الوحدة «الإدارة ← القسم» (أقرب إدارة صعودًا، والإدارة التنفيذية المستخبية باسمها العام) واختيارات القسم المجمّعة بالإدارة
//         في نموذج الموظف وفلتر القائمة (الإدارة نفسها اختيار مباشر)، وتوسعة فلتر الإدارة جوه فرعها.
//  UI-04) الهيكل التنظيمي: شارة «إدارة» من نوع الوحدة (والبيانات القديمة من غير نوع زي الأول)، وبطاقة صاحب الطلب بـ«الإدارة».
//  UI-05) الشاشات متوصلة بالمنطق ده: «الإدارات والأقسام» ونموذج الوحدة وقايمة الموظفين وملف الموظف وملفي.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const root = path.resolve(__dirname, '../..')
const load = Module._load
Module._load = function (request, parent, isMain) {
  return load.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, isMain)
}
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const tree = require('../../src/lib/department-tree')
const chainModel = require('../../src/components/approvals/chainEditorModel')
const orgModel = require('../../src/components/org-chart/orgChartModel')
const { OrgChartView } = require('../../src/components/org-chart/OrgChartView')
const RequestEmployeeCard = require('../../src/components/requests/RequestEmployeeCard').default
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

// الفرع 1 (الرئيسي): الإدارة التنفيذية (1) ← مكتب الرئيس (2)؛ إدارة العمليات (6) ← التشغيل (7).
// الفرع 2 (النصر): إدارة المبيعات (3، تحت الإدارة التنفيذية) ← التجزئة (4) ← فروع التجزئة (5)؛ خدمة العملاء (8، تحت الإدارة التنفيذية)؛
// مخازن النصر (9) قسم رئيسي من غير إدارة
const A = 'ADMINISTRATION', DEP = 'DEPARTMENT'
const departments = [
  { id: 1, name: 'الإدارة التنفيذية للمجموعة', branchId: 1, isExecutive: true, unitType: A, managerEmployeeId: 1, isActive: true },
  { id: 2, name: 'مكتب الرئيس', branchId: 1, parentId: 1, unitType: DEP, isActive: true },
  { id: 3, name: 'إدارة المبيعات', branchId: 2, parentId: 1, unitType: A, managerEmployeeId: 3, isActive: true },
  { id: 4, name: 'التجزئة', branchId: 2, parentId: 3, unitType: DEP, isActive: true },
  { id: 5, name: 'فروع التجزئة', branchId: 2, parentId: 4, unitType: DEP, isActive: true },
  { id: 6, name: 'إدارة العمليات', branchId: 1, unitType: A, managerEmployeeId: 6, isActive: true },
  { id: 7, name: 'التشغيل', branchId: 1, parentId: 6, unitType: DEP, isActive: true },
  { id: 8, name: 'خدمة العملاء', branchId: 2, parentId: 1, unitType: DEP, isActive: true },
  { id: 9, name: 'مخازن النصر', branchId: 2, unitType: DEP, isActive: true },
]
const nasrOnly = departments.filter(d => d.branchId === 2)
const ids = set => [...set].sort((a, b) => a - b)

test('UI-01: «مدير الإدارة» في محرر السلاسل بعد «مدير القسم» بوصفه، ومش جهة تصعيد، وبتسميته في الصناديق التلاتة', () => {
  const roles = Object.keys(chainModel.roleLabels)
  assert.equal(chainModel.roleLabels.administration_manager_of_requester, 'مدير الإدارة')
  assert.equal(chainModel.roleDescriptions.administration_manager_of_requester, 'مدير الإدارة اللي تبعها قسم مقدم الطلب')
  assert.equal(roles.indexOf('administration_manager_of_requester'), roles.indexOf('department_manager_of_requester') + 1)
  assert.equal(roles.indexOf('manager_of_direct_manager'), roles.indexOf('direct_manager_of_requester') + 1, '«مدير المدير المباشر» زي ما هو')
  assert.ok(!chainModel.escalationRoles.some(([id]) => id === 'administration_manager_of_requester'))
  assert.ok(chainModel.escalationRoles.some(([id]) => id === 'department_manager_of_requester'), '«مدير القسم» لسه جهة تصعيد')
  assert.equal(chainModel.chainStepsText([{ approverRole: 'department_manager_of_requester' }, { approverRole: 'administration_manager_of_requester' }]),
    'مدير القسم ← مدير الإدارة')
  for (const file of ['src/app/approvals-inbox/page.tsx', 'src/app/requests/page.tsx', 'src/app/requests-console/page.tsx']) {
    assert.ok(read(file).includes("administration_manager_of_requester: 'مدير الإدارة',"), file)
  }
})

test('UI-02: اختيارات الأب بقواعد الخادم، وتغيير النوع أو الفرع بيشيل الأب اللي مابقاش يصلح', () => {
  assert.equal(tree.unitTypeOf({ isExecutive: true }), A, 'بيانات قبل ترحيل 072: الإدارة التنفيذية إدارة')
  assert.equal(tree.unitTypeOf({}), DEP)
  assert.equal(tree.unitTypeOf({ unitType: A }), A)
  const options = opts => tree.parentOptionsFor(departments, opts).map(o => [o.id, o.label, o.executive, o.administration])
  // الإدارة: رئيسية أو تحت الإدارة التنفيذية بس (من أي فرع)
  assert.deepEqual(options({ branchId: 2, unitType: A }), [[1, 'الإدارة التنفيذية للمجموعة (الإدارة التنفيذية) — فوق كل الفروع', true, true]])
  assert.deepEqual(options({ branchId: 1, unitType: A, editingId: 6 }).map(o => o[0]), [1])
  // القسم: الإدارة التنفيذية لأي فرع + إدارات وأقسام فرعه، عدا الوحدة وتوابعها
  assert.deepEqual(options({ branchId: 2, unitType: DEP }), [[1, 'الإدارة التنفيذية للمجموعة (الإدارة التنفيذية) — فوق كل الفروع', true, true],
    [3, 'إدارة المبيعات', false, true], [4, 'التجزئة', false, false], [5, 'فروع التجزئة', false, false], [8, 'خدمة العملاء', false, false],
    [9, 'مخازن النصر', false, false]])
  assert.deepEqual(options({ branchId: 2, unitType: DEP, editingId: 4, blocked: new Set([5]) }).map(o => o[0]), [1, 3, 8, 9])
  // الوحدة اللي هتبقى الإدارة التنفيذية: من غير أب
  assert.deepEqual(options({ branchId: 1, unitType: A, makingExecutive: true }), [])
  const after = (parentId, branchId, makingExecutive, unitType) => tree.parentAfterBranchChange(departments, parentId, branchId, makingExecutive, unitType)
  assert.deepEqual(after('4', '2', false, A), { parentId: '', dropped: 'التجزئة' }, 'قسم مايبقاش أب لإدارة')
  assert.deepEqual(after('3', '2', false, A), { parentId: '', dropped: 'إدارة المبيعات' }, 'إدارة عادية مابتبقاش أب لإدارة')
  assert.deepEqual(after('1', '2', false, A), { parentId: '1', dropped: null }, 'الإدارة التنفيذية أب لإدارة من أي فرع')
  assert.deepEqual(after('3', '2', false, DEP), { parentId: '3', dropped: null }, 'القسم تحت إدارة فرعه')
  assert.deepEqual(after('6', '2', false, DEP), { parentId: '', dropped: 'إدارة العمليات' }, 'إدارة فرع تاني مش أب لقسم')
  assert.deepEqual(tree.parentAfterBranchChange(nasrOnly, '1', '2', false, A), { parentId: '1', dropped: null }, 'أب مش ظاهر (الإدارة التنفيذية) بيفضل')
  assert.deepEqual(tree.childAdministrationsOf(departments[0], departments).map(d => d.id), [3])
  assert.deepEqual(tree.childAdministrationsOf(departments[2], departments), [])
})

test('UI-03: «الإدارة ← القسم» واختيارات القسم المجمّعة بالإدارة، وفلتر الإدارة بأقسامها جوه فرعها', () => {
  const place = (id, list = departments) => {
    const p = tree.orgPlacement(id, list)
    return [p.administration?.id ?? null, p.administrationName, p.departments.map(d => d.id)]
  }
  assert.deepEqual(place(5), [3, 'إدارة المبيعات', [4, 5]], 'قسم فرعي على مستويين')
  assert.deepEqual(place(3), [3, 'إدارة المبيعات', []], 'الإدارة نفسها')
  assert.deepEqual(place(8), [1, 'الإدارة التنفيذية للمجموعة', [8]], 'قسم فرع تحت الإدارة التنفيذية')
  assert.deepEqual(place(9), [null, null, [9]], 'قسم من غير إدارة')
  assert.deepEqual(place(null), [null, null, []])
  // حساب فرع النصر مايشوفش الإدارة التنفيذية: باسمها العام بس
  assert.deepEqual(place(8, nasrOnly), [null, 'الإدارة التنفيذية', [8]])
  assert.deepEqual(place(5, nasrOnly), [3, 'إدارة المبيعات', [4, 5]])
  assert.equal(tree.unitPathLabel(5, departments), 'إدارة المبيعات ← التجزئة ← فروع التجزئة')
  assert.equal(tree.unitPathLabel(9, departments), 'مخازن النصر')
  // نموذج الموظف: وحدات فرع النصر مجمّعة بالإدارة، والإدارة نفسها اختيار مباشر، وفي الآخر «أقسام من غير إدارة»
  const groups = tree.departmentChoiceGroups(departments, { branchId: 2 })
  const byKey = new Map(groups.map(group => [group.key, group]))
  assert.deepEqual(byKey.get('a3').options.map(o => [o.id, o.label, o.administration]), [[3, 'إدارة المبيعات (الإدارة نفسها)', true],
    [4, 'إدارة المبيعات ← التجزئة', false], [5, 'إدارة المبيعات ← التجزئة ← فروع التجزئة', false]])
  assert.equal(byKey.get('a3').label, 'إدارة المبيعات')
  assert.deepEqual(byKey.get('a1').options.map(o => [o.id, o.label]), [[8, 'الإدارة التنفيذية للمجموعة ← خدمة العملاء']],
    'الإدارة التنفيذية في فرع تاني: اسم مجموعة بس')
  assert.equal(groups.at(-1).key, 'none'); assert.equal(groups.at(-1).label, 'أقسام من غير إدارة')
  assert.deepEqual(groups.at(-1).options.map(o => o.id), [9])
  assert.equal(groups.flatMap(group => group.options).every(o => departments.find(d => d.id === o.id).branchId === 2), true)
  // حساب الفرع: الإدارة التنفيذية المستخبية باسمها العام
  const scoped = tree.departmentChoiceGroups(nasrOnly, { branchId: 2 })
  assert.deepEqual(scoped.find(group => group.key === 'x').options.map(o => o.label), ['الإدارة التنفيذية ← خدمة العملاء'])
  // فلتر القائمة: الإدارة «كلها»، وتوسعتها جوه فرعها (الإدارة التنفيذية مابتسحبش أقسام النصر)
  assert.equal(tree.departmentChoiceGroups(departments, { administrationSuffix: 'الإدارة كلها' }).find(group => group.key === 'a6').options[0].label,
    'إدارة العمليات (الإدارة كلها)')
  assert.deepEqual(ids(tree.branchLocalSubtree(departments, [3])), [3, 4, 5])
  assert.deepEqual(ids(tree.branchLocalSubtree(departments, [1])), [1, 2])
})

test('UI-04: الهيكل التنظيمي بشارة «إدارة» من نوع الوحدة (والقديم زي الأول)، وبطاقة صاحب الطلب بـ«الإدارة» ومحجوبة مع orgHidden', () => {
  const branches = [{ id: 1, name: 'الفرع الرئيسي', isActive: true }, { id: 2, name: 'فرع النصر', isActive: true }]
  const e = (id, fullName, branchId, departmentId) => ({ id, fullName, jobTitle: 'موظف', branchId, departmentId, teamId: null, status: 'active' })
  const employees = [e(1, 'الرئيس التنفيذي', 1, 1), e(3, 'مدير المبيعات', 2, 3), e(4, 'موظف التجزئة', 2, 4), e(6, 'مدير العمليات', 1, 6), e(9, 'أمين المخزن', 2, 9)]
  const find = (unit, key) => (unit.key === key ? unit : unit.children.map(c => find(c, key)).find(Boolean))
  const chart = orgModel.buildOrgChart({ branches, departments, teams: [], employees })
  assert.deepEqual(['d3', 'd6'].map(key => [find(chart.root, key).kind, find(chart.root, key).headLabel]), [['administration', 'مدير الإدارة'], ['administration', 'مدير الإدارة']])
  assert.deepEqual(['d4', 'd9', 'd8'].map(key => find(chart.root, key).kind), ['department', 'department', 'department'], 'قسم رئيسي من غير إدارة شارته «قسم»')
  assert.equal(find(chart.root, 'd9').headLabel, 'مدير القسم')
  const html = renderToStaticMarkup(React.createElement(OrgChartView, { chart, state: { expanded: new Set(orgModel.allUnitKeys(chart.root)),
    membersOpen: new Set(), highlightUnits: new Set(), highlightPeople: new Set(), showBranch: true, onToggle() {}, onToggleMembers() {} } }))
  assert.ok(html.includes(`>${orgModel.UNIT_KIND_LABELS.administration}</span>`), 'شارة «إدارة»')
  assert.ok(html.includes('إدارة المبيعات') && html.includes('مخازن النصر'))
  // بيانات من غير نوع (قبل ترحيل 072): القسم الرئيسي بيتعرض إدارة زي الأول
  const legacy = orgModel.buildOrgChart({ branches, departments: departments.map(({ unitType, ...rest }) => rest), teams: [], employees })
  assert.equal(find(legacy.root, 'd9').kind, 'administration')

  const requester = { employeeId: 4, fullName: 'موظف التجزئة', employeeCode: 'AL004', jobTitle: 'بائع', administrationName: 'إدارة المبيعات',
    departmentName: 'التجزئة', branchName: 'فرع النصر', teamName: null, directManagerName: 'رئيس فريق التجزئة' }
  const card = renderToStaticMarkup(React.createElement(RequestEmployeeCard, { requester, submittedBy: null }))
  assert.ok(card.includes('<dt class="text-xs text-gray-500">الإدارة</dt><dd class="text-sm text-gray-800 break-words">إدارة المبيعات</dd>'), card)
  assert.ok(card.indexOf('>الإدارة<') < card.indexOf('>القسم<'), '«الإدارة» قبل «القسم»')
  const hidden = renderToStaticMarkup(React.createElement(RequestEmployeeCard, { requester: { ...requester, administrationName: null, departmentName: null,
    branchName: null, jobTitle: null, directManagerName: null, orgHidden: true }, submittedBy: null }))
  assert.equal(hidden.includes('إدارة المبيعات'), false)
  assert.equal(hidden.includes('>الإدارة<'), false)
})

test('UI-05: الشاشات متوصلة — «الإدارات والأقسام» والنوع والأب والشجرة، ونموذج الموظف وقايمته وملفه وملفي', () => {
  const page = read('src/app/settings/departments/page.tsx')
  for (const text of [
    '<h1 className="text-2xl font-bold text-gray-800">الإدارات والأقسام</h1>',
    "onClick={() => handleOpenModal(undefined, 'ADMINISTRATION')}",
    'aria-label="نوع الوحدة"',
    'unitType: formData.unitType,',
    'const moved = parentAfterBranchChange(departments, formData.parentId, formData.branchId, false, next)',
    '<optgroup label="الإدارات">',
    '<optgroup label="الأقسام — يبقى قسم فرعي تحته">',
    "'الإدارة التابع لها / القسم الأب'",
    "'الإدارة الأعلى'",
    '{UNIT_TYPE_LABELS.ADMINISTRATION}',
    'أقسام من غير إدارة',
    "unitType: checked ? 'ADMINISTRATION' : formData.unitType",
    'disabled={formData.isExecutive && type === \'DEPARTMENT\'}',
    'childAdministrationsOf(editingDept, departments)',
    'خلّيها إدارات رئيسية الأول قبل شيل «الإدارة التنفيذية»',
  ]) assert.ok(page.includes(text), text)
  assert.match(read('src/components/layout/Sidebar.tsx'), /label: 'الإدارات والأقسام', href: '\/settings\/departments'/)
  assert.match(read('src/components/layout/pageTitles.ts'), /\['\/settings\/departments', 'الإدارات والأقسام'\]/)
  assert.match(read('src/app/settings/page.tsx'), /title: 'الإدارات والأقسام'/)
  const form = read('src/components/EmployeeForm.tsx')
  assert.ok(form.includes('const departmentGroups = departmentChoiceGroups(departments, { branchId: form.branchId ? Number(form.branchId) : null })'))
  assert.ok(form.includes('<optgroup key={group.key} label={group.label}>'))
  assert.ok(form.includes('<label className="label">الإدارة/القسم *</label>'))
  const list = read('src/app/employees/page.tsx')
  assert.ok(list.includes('? branchLocalSubtree(departments, [selectedUnit.id])'))
  assert.ok(list.includes("departmentChoiceGroups(departments, { administrationSuffix: 'الإدارة كلها' })"))
  assert.ok(list.includes('selectedDepartment === \'all\' || (emp.departmentId != null && !!selectedDepartmentIds?.has(emp.departmentId))'))
  const profile = read('src/app/employees/[id]/page.tsx')
  assert.ok(profile.includes('const placement = orgPlacement(e.departmentId, departments)'))
  assert.ok(profile.includes('<span className="text-gray-500">الإدارة</span>\n                      <span className="font-medium text-gray-800">{employee.administration}</span>'))
  assert.ok(profile.includes('<span className="text-gray-500">القسم</span>\n                      <span className="font-medium text-gray-800">{employee.department}</span>'))
  const mine = read('src/app/profile/page.tsx')
  assert.ok(mine.includes('const placement = orgPlacement(employee?.departmentId, departments)'))
  assert.ok(mine.includes('<span className="font-medium text-gray-800">{administrationName}</span>'))
})
