'use strict'
// «الإدارة التنفيذية فوق كل الفروع» (طلب المالك 27 سبتمبر) — اختبارات وحدة بلا قاعدة ولا خادم:
//  - الخادم: أبو القسم في الحسابات من نفس فرعه بس (org/department-tree) — توسعة الأقسام الفرعية (المسير) ومسار القسم (العطلات)
//    ماتعدّيش من قسم فرع لرئيسه «الإدارة التنفيذية» في فرع تاني.
//  - الواجهة: نفس التوسعة في شاشة المسير، وشجرة الأقسام (حساب الفرع: أقسامه اللي تحت الإدارة التنفيذية جذور مش مختفية؛ حساب
//    الشركة: تحتها وجنبها فرعها)، واختيارات «القسم الأب» (الإدارة التنفيذية لأي فرع وباقي الأقسام من فرع القسم)، وتغيير الفرع
//    مايسيبش أب غلط مستخبي، والهيكل التنظيمي.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
require('../node_modules/reflect-metadata')
const root = path.resolve(__dirname, '../..')
const load = Module._load
Module._load = function (request, parent, isMain) {
  return load.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, isMain)
}
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const serverTree = require('../src/org/department-tree')
const audiences = require('../src/attendance/holiday-audience')
const def = require('../src/payroll/payroll-run-definition')
const uiTree = require('../../src/lib/department-tree')
const runs = require('../../src/lib/payroll-runs-api')
const model = require('../../src/components/org-chart/orgChartModel')
const { OrgChartView } = require('../../src/components/org-chart/OrgChartView')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

// الفرع 1 (الرئيسي): الإدارة التنفيذية (1) ← مكتب الرئيس (2). الفرع 2 (النصر): مبيعات النصر (3، أبوها الإدارة التنفيذية)
// ← تجزئة النصر (4)، ومخازن النصر (5) قسم رئيسي
const departments = [
  { id: 1, name: 'الإدارة التنفيذية', branchId: 1, isExecutive: true, managerEmployeeId: 1, isActive: true },
  { id: 2, name: 'مكتب الرئيس', branchId: 1, parentId: 1, isActive: true },
  { id: 3, name: 'مبيعات النصر', branchId: 2, parentId: 1, managerEmployeeId: 3, isActive: true },
  { id: 4, name: 'تجزئة النصر', branchId: 2, parentId: 3, isActive: true },
  { id: 5, name: 'مخازن النصر', branchId: 2, isActive: true },
]
const nasrOnly = departments.filter(d => d.branchId === 2)
const ids = set => [...set].sort((a, b) => a - b)

test('XB-01: الخادم — أبو القسم في الحسابات من نفس فرعه، فالتوسعة والمسار مايعدّوش للإدارة التنفيذية في فرع تاني', () => {
  const parentOf = serverTree.branchLocalParentOfRows(departments)
  assert.deepEqual([1, 2, 3, 4, 5].map(parentOf), [null, 1, null, 3, null])
  assert.deepEqual(ids(serverTree.branchLocalSubtree([1], departments.map(d => d.id), parentOf)), [1, 2])
  assert.deepEqual(ids(serverTree.branchLocalSubtree([3], departments.map(d => d.id), parentOf)), [3, 4])
  // مرجع ناقص (أب مش معروف أو من غير فرع) مايتحسبش أب
  assert.equal(serverTree.branchLocalParentOf(id => ({ 7: 8 })[id], id => ({ 7: 1 })[id])(7), null)
  // مسار العطلات: موظف تجزئة النصر [4، 3] من غير الإدارة التنفيذية، وموظف مكتب الرئيس [2، 1]
  assert.deepEqual(audiences.departmentPathOf(4, parentOf), [4, 3])
  assert.deepEqual(audiences.departmentPathOf(2, parentOf), [2, 1])
  const executiveHoliday = { level: 'departments', branchId: 1, departmentIds: [1] }
  const member = (branchId, departmentId) => ({ employeeId: 9, branchId, teamId: null, departmentPath: audiences.departmentPathOf(departmentId, parentOf) })
  assert.equal(audiences.holidayAudienceMatches(executiveHoliday, member(1, 2)), true)
  assert.equal(audiences.holidayAudienceMatches(executiveHoliday, member(2, 3)), false)
  assert.equal(audiences.holidayAudienceMatches(executiveHoliday, member(2, 4)), false)
  assert.equal(audiences.holidayAudienceMatches({ level: 'departments', branchId: 2, departmentIds: [3] }, member(2, 4)), true)
  // المسير: نفس الشجرة من سجل التنظيم (departmentParent/departmentBranch)
  const history = { departmentParent: new Map(departments.map(d => [d.id, d.parentId ?? null])), departmentBranch: new Map(departments.map(d => [d.id, d.branchId])) }
  assert.equal(def.payrollDepartmentParentOf(history)(3), null)
  assert.deepEqual(ids(def.payrollDepartmentSet(history, [1], true)), [1, 2])
  assert.deepEqual(ids(def.payrollDepartmentSet(history, [3], true)), [3, 4])
  assert.deepEqual(ids(def.payrollDepartmentSet(history, [1], false)), [1])
})

test('XB-02: شاشة المسير — «القسم وأقسامه الفرعية» جوه فرعه زي الخادم بالحرف', () => {
  assert.deepEqual(ids(uiTree.branchLocalSubtree(departments, [1])), [1, 2])
  assert.deepEqual(ids(runs.expandDepartmentIds(departments, [1])), [1, 2])
  assert.deepEqual(ids(runs.expandDepartmentIds(departments, [3])), [3, 4])
  assert.deepEqual(ids(runs.expandDepartmentIds(departments, [1], false)), [1])
  const executiveRun = { ...runs.emptyRunFilters(), departmentIds: [1] }
  assert.equal(runs.payrollScopeCoversEmployee(departments, executiveRun, { id: 7, branchId: 1, departmentId: 2 }), true)
  assert.equal(runs.payrollScopeCoversEmployee(departments, executiveRun, { id: 8, branchId: 2, departmentId: 3 }), false)
  assert.equal(runs.payrollScopeCoversEmployee(departments, executiveRun, { id: 9, branchId: 2, departmentId: 4 }), false)
  // الفرق المتاحة مع الإدارة التنفيذية: فرق أقسامها في فرعها بس
  const teams = [{ id: 20, name: 'فريق المكتب', departmentId: 2, isActive: true }, { id: 30, name: 'فريق مبيعات النصر', departmentId: 3, isActive: true }]
  const branches = [{ id: 1, name: 'الرئيسي', code: 'M', isActive: true }, { id: 2, name: 'النصر', code: 'N', isActive: true }]
  assert.deepEqual(runs.linkedFilterOptions(branches, departments, teams, executiveRun).teams.map(t => t.id), [20])
})

test('XB-03: شجرة الأقسام — حساب الفرع: أقسامه اللي تحت الإدارة التنفيذية جذور مش مختفية؛ حساب الشركة: تحتها وفرعها ظاهر', () => {
  assert.deepEqual(uiTree.departmentTreeRoots(nasrOnly).map(d => d.id), [3, 5])
  assert.equal(uiTree.hasHiddenParent(nasrOnly[0], nasrOnly), true)
  assert.equal(uiTree.hasHiddenParent(departments[2], departments), false)
  assert.deepEqual(uiTree.departmentTreeRoots(departments).map(d => d.id), [1, 5])
  assert.deepEqual(departments.filter(d => uiTree.isCrossBranchChild(d, departments)).map(d => d.id), [3])
  assert.deepEqual(uiTree.foreignChildrenOf(departments[0], departments).map(d => d.id), [3])
  assert.deepEqual(uiTree.foreignChildrenOf(departments[2], departments).map(d => d.id), [])
})

test('XB-04: «القسم الأب» — الإدارة التنفيذية لأي فرع، والباقي من فرع القسم؛ وتغيير الفرع مايسيبش أب غلط مستخبي', () => {
  const options = opts => uiTree.parentOptionsFor(departments, opts).map(o => [o.id, o.label, o.executive])
  assert.deepEqual(options({ branchId: 2 }), [[1, 'الإدارة التنفيذية — فوق كل الفروع', true], [3, 'مبيعات النصر', false], [4, 'تجزئة النصر', false], [5, 'مخازن النصر', false]])
  assert.deepEqual(options({ branchId: 1 }), [[1, 'الإدارة التنفيذية — فوق كل الفروع', true], [2, 'مكتب الرئيس', false]])
  // تعديل مبيعات النصر: هي نفسها وأقسامها التابعة مش اختيارات (دايرة)
  assert.deepEqual(options({ branchId: 2, editingId: 3, blocked: new Set([4]) }).map(o => o[0]), [1, 5])
  // الوحدة اللي هتتعلّم إدارة تنفيذية بتبقى «إدارة» فوق كل الوحدات (قرار المالك 27 سبتمبر: «الإدارة ← القسم ← الفريق») — من غير أب
  assert.deepEqual(options({ branchId: 2, makingExecutive: true }), [])
  assert.deepEqual(options({ branchId: 1, makingExecutive: true }), [])
  assert.equal(uiTree.executiveParentLabel({ name: 'مكتب مجلس الإدارة' }), 'مكتب مجلس الإدارة (الإدارة التنفيذية) — فوق كل الفروع')
  const after = (parentId, branchId, makingExecutive) => uiTree.parentAfterBranchChange(departments, parentId, branchId, makingExecutive)
  assert.deepEqual(after('1', '2'), { parentId: '1', dropped: null }, 'الإدارة التنفيذية تفضل أب لأي فرع')
  assert.deepEqual(after('2', '2'), { parentId: '', dropped: 'مكتب الرئيس' }, 'أب من فرع تاني يتشال بتنبيه')
  assert.deepEqual(after('3', '2'), { parentId: '3', dropped: null })
  assert.deepEqual(after('1', '2', true), { parentId: '', dropped: 'الإدارة التنفيذية' }, 'الإدارة التنفيذية الجديدة أبوها من فرعها بس')
  // وحتى من فرعها: الإدارة التنفيذية «إدارة» فوق كل الوحدات من غير أب (قرار المالك 27 سبتمبر)
  assert.deepEqual(after('1', '1', true), { parentId: '', dropped: 'الإدارة التنفيذية' })
  assert.deepEqual(after('', '2'), { parentId: '', dropped: null })
  assert.deepEqual(uiTree.parentAfterBranchChange(nasrOnly, '1', '2'), { parentId: '1', dropped: null }, 'أب مش ظاهر للحساب (الإدارة التنفيذية) بيفضل')
})

test('XB-05: الهيكل التنظيمي — حساب الشركة: قسم النصر تحت الإدارة التنفيذية وفرعه ظاهر؛ حساب النصر: قسمه جذر من غير ما يختفي', () => {
  const branches = [{ id: 1, name: 'الفرع الرئيسي', isActive: true }, { id: 2, name: 'فرع النصر', isActive: true }]
  const e = (id, fullName, branchId, departmentId) => ({ id, fullName, jobTitle: 'موظف', branchId, departmentId, teamId: null, status: 'active' })
  const employees = [e(1, 'الرئيس التنفيذي', 1, 1), e(2, 'موظف المكتب', 1, 2), e(3, 'مدير مبيعات النصر', 2, 3), e(4, 'موظف التجزئة', 2, 4), e(5, 'أمين المخزن', 2, 5)]
  const find = (unit, key) => (unit.key === key ? unit : unit.children.map(c => find(c, key)).find(Boolean))
  const company = model.buildOrgChart({ branches, departments, teams: [], employees })
  assert.equal(company.root.kind, 'executive')
  assert.ok(company.root.children.some(c => c.key === 'd3'), 'قسم النصر تحت الرئيس التنفيذي')
  assert.equal(find(company.root, 'd3').branchName, 'فرع النصر')
  assert.deepEqual(find(company.root, 'd3').children.map(c => c.key), ['d4'])
  const html = renderToStaticMarkup(React.createElement(OrgChartView, { chart: company, state: {
    expanded: new Set(model.allUnitKeys(company.root)), membersOpen: new Set(), highlightUnits: new Set(), highlightPeople: new Set(),
    showBranch: true, onToggle() {}, onToggleMembers() {} } }))
  assert.ok(html.includes('فرع النصر') && html.includes('مبيعات النصر'))
  // حساب فرع النصر: الخادم بيرجعله فرعه بس — الإدارة التنفيذية مش ظاهرة وقسمها فاضل جذر
  const scoped = model.buildOrgChart({ branches: branches.filter(b => b.id === 2), departments: nasrOnly, teams: [], employees: employees.filter(x => x.branchId === 2) })
  assert.equal(scoped.root.kind, 'branch')
  assert.deepEqual(scoped.root.children.map(c => c.key).sort(), ['d3', 'd5'])
  assert.deepEqual(find(scoped.root, 'd3').children.map(c => c.key), ['d4'])
  assert.equal(scoped.root.headcount, 3)
  assert.equal(JSON.stringify(scoped).includes('الإدارة التنفيذية'), false)
})

test('XB-06: شاشة الأقسام — الجذور والشارات واختيارات الأب والتنبيهات متوصلة بالمنطق ده', () => {
  const page = read('src/app/settings/departments/page.tsx')
  for (const text of [
    "from '@/lib/department-tree'",
    'setExpandedDepts(departmentTreeRoots(deps).map((d) => d.id))',
    'const rootDepartments = departmentTreeRoots(departments)',
    'isCrossBranchChild(dept, departments) &&',
    'level === 0 && hasHiddenParent(dept, departments) &&',
    'تحت الإدارة التنفيذية',
    'const parentOptions = parentOptionsFor(departments, {',
    '{hiddenParent && <option value={formData.parentId}>{EXECUTIVE_PARENT_LABEL}</option>}',
    // تلميحات «التابع لـ» بقواعد «الإدارة ← القسم ← الفريق» (قرار المالك 27 سبتمبر)
    'القسم تحت إدارة من فرعه، أو «الإدارة التنفيذية» من أي فرع، أو قسم من فرعه فيبقى قسم فرعي — عدا الأقسام التابعة لهذا القسم',
    'الإدارة بتبقى رئيسية أو تحت «الإدارة التنفيذية» بس (من أي فرع) — مابتتحطش تحت قسم ولا تحت إدارة تانية',
    'const next = parentAfterBranchChange(departments, formData.parentId, e.target.value, formData.isExecutive, formData.unitType)',
    '? parentAfterBranchChange(departments, formData.parentId, formData.branchId, true)',
    "departments.find((d) => d.id === dept.parentId)?.name ?? EXECUTIVE_PARENT_LABEL",
    'انقلها الأول قبل شيل «الإدارة التنفيذية»',
  ]) assert.ok(page.includes(text), text)
  // مفيش فلتر «الفرع المختار بس» قديم بيخفي الإدارة التنفيذية
  assert.equal(page.includes('تظهر أقسام الفرع المختار فقط'), false)
})
