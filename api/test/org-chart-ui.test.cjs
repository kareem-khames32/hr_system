// الهيكل التنظيمي الاحترافي: «الإدارة التنفيذية» فوق (الرئيس التنفيذي والسكرتير التنفيذي جنبه بس)، وتحته الإدارات بأبوّة الأقسام
// وأقسامها الفرعية وفرقها بمسؤوليها وعدد موظفيها، فتح/قفل، بحث بيفتح الطريق، فلتر فرع، طباعة، وإعداد الإدارة التنفيذية. بلا خادم.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const root = path.resolve(__dirname, '../..')
const load = Module._load
Module._load = function (request, parent, isMain) {
  return load.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, isMain)
}
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const model = require('../../src/components/org-chart/orgChartModel')
const { OrgChartView, ORG_CHART_CSS } = require('../../src/components/org-chart/OrgChartView')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const branches = [{ id: 1, name: 'القاهرة', isActive: true }, { id: 2, name: 'الرياض', isActive: true }]
const departments = [
  { id: 1, name: 'الإدارة التنفيذية', branchId: 1, managerEmployeeId: 1, isExecutive: true, executiveSecretaryEmployeeId: 2, isActive: true },
  { id: 2, name: 'الموارد البشرية', branchId: 1, managerEmployeeId: 3, isActive: true },
  { id: 3, name: 'التوظيف', branchId: 1, parentId: 2, managerEmployeeId: 4, isActive: true },
  { id: 4, name: 'المالية', branchId: 1, managerEmployeeId: 5, isActive: true },
  { id: 5, name: 'المبيعات', branchId: 2, managerEmployeeId: 6, isActive: true },
  { id: 6, name: 'مبيعات التجزئة', branchId: 2, parentId: 5, isActive: true },
  { id: 7, name: 'مكتب الرئيس', branchId: 1, parentId: 1, isActive: true },
  { id: 8, name: 'قسم متوقف', branchId: 1, isActive: false },
]
const teams = [
  { id: 1, name: 'فريق الرواتب', departmentId: 4, leaderEmployeeId: 7, isActive: true },
  { id: 2, name: 'فريق الجملة', departmentId: 5, leaderEmployeeId: 8, isActive: true },
  { id: 3, name: 'فريق الفروع', departmentId: 6, isActive: true },
]
const e = (id, fullName, jobTitle, branchId, departmentId, teamId, status = 'active') => ({ id, fullName, jobTitle, branchId, departmentId, teamId, status })
const employees = [
  e(1, 'كريم خميس', 'الرئيس التنفيذي', 1, 1), e(2, 'سارة محمود', 'سكرتيرة', 1, 1), e(3, 'أحمد علي', 'مدير الموارد البشرية', 1, 2),
  e(4, 'منى حسن', 'أخصائي توظيف', 1, 3), e(5, 'خالد عمر', 'المدير المالي', 1, 4), e(6, 'هالة سيد', 'مدير المبيعات', 2, 5),
  e(7, 'ياسر فؤاد', 'محاسب أول', 1, 4, 1), e(8, 'نور الدين', 'مشرف مبيعات', 2, 5, 2), e(9, 'ريم عادل', 'محاسب', 1, 4, 1),
  e(10, 'عمرو سامي', 'مندوب', 2, 5, 2), e(11, 'ليلى فهد', 'مندوب', 2, 6, 3), e(12, 'سيد بلا قسم', 'سائق', 2, null),
  e(13, 'مستقيل قديم', 'محاسب', 1, 4, 1, 'terminated'),
]
const find = (unit, key) => unit.key === key ? unit : unit.children.map(c => find(c, key)).find(Boolean)

test('القمة «الإدارة التنفيذية»: الرئيس التنفيذي مديرها، والسكرتير جنبه بس ومش أب لحد', () => {
  const chart = model.buildOrgChart({ branches, departments, teams, employees })
  assert.equal(chart.root.kind, 'executive')
  assert.equal(chart.root.head.name, 'كريم خميس')
  assert.equal(chart.root.headLabel, 'الرئيس التنفيذي')
  assert.equal(chart.secretary.name, 'سارة محمود')
  assert.equal(chart.executiveConfigured, true)
  // السكرتير مش وحدة في الشجرة ومالوش تابعين، ومش ضمن أعضاء الإدارة التنفيذية
  assert.equal(model.allUnitKeys(chart.root).some(k => k.includes('secretary')), false)
  assert.deepEqual(chart.root.members.map(m => m.id), [])
  // تحت الرئيس: الإدارات الرئيسية (بما فيها الأقسام التابعة للإدارة التنفيذية) و«بدون قسم»، والقسم المتوقف مش ظاهر
  assert.deepEqual(chart.root.children.map(c => c.key), ['d7', 'd4', 'd5', 'd2', 'u2'])
  assert.equal(chart.root.headcount, 12, 'المنتهية خدمته خارج الهيكل')
  assert.deepEqual(chart.stats, { employees: 12, departments: 7, teams: 3, managers: 7 })
})

test('الإدارات بأبوّة الأقسام: مدير وعدد موظفين شامل الفروع، والفريق بقائده وأعضائه', () => {
  const chart = model.buildOrgChart({ branches, departments, teams, employees })
  const hr = find(chart.root, 'd2')
  assert.equal(hr.kind, 'administration')
  assert.equal(hr.head.name, 'أحمد علي')
  assert.deepEqual(hr.children.map(c => [c.key, c.kind]), [['d3', 'department']])
  assert.equal(hr.headcount, 2)
  const finance = find(chart.root, 'd4')
  assert.equal(finance.headcount, 3)
  const payroll = find(chart.root, 't1')
  assert.equal(payroll.kind, 'team')
  assert.equal(payroll.head.name, 'ياسر فؤاد')
  assert.equal(payroll.headLabel, 'قائد الفريق')
  assert.equal(payroll.headcount, 2)
  assert.deepEqual(payroll.members.map(m => m.name), ['ريم عادل'], 'القائد مش مكرر في الأعضاء')
  const sales = find(chart.root, 'd5')
  assert.deepEqual(sales.children.map(c => c.key), ['d6', 't2'], 'الأقسام الفرعية الأول ثم الفرق')
  assert.equal(sales.headcount, 4)
  assert.equal(find(chart.root, 'd6').head, null)
  assert.equal(find(chart.root, 'u2').members[0].name, 'سيد بلا قسم')
})

test('فلتر الفرع وحساب الفرع: الفرع بيشوف جزءه بس، ولو مفيش رئيس تنفيذي ظاهر الفرع هو القمة', () => {
  const riyadh = model.buildOrgChart({ branches, departments, teams, employees, branchId: 2 })
  assert.equal(riyadh.root.kind, 'executive', 'حساب الشركة بفلتر فرع لسه شايف الرئيس التنفيذي فوق')
  assert.deepEqual(riyadh.root.children.map(c => c.key), ['d5', 'u2'])
  assert.equal(riyadh.root.headcount, 5)
  // حساب فرع الرياض: الخادم بيرجعله فرعه بس (مفيش الإدارة التنفيذية ولا موظفين القاهرة)
  const scoped = model.buildOrgChart({
    branches: branches.filter(b => b.id === 2),
    departments: departments.filter(d => d.branchId === 2),
    teams: teams.filter(t => [5, 6].includes(t.departmentId)),
    employees: employees.filter(x => x.branchId === 2),
  })
  assert.equal(scoped.root.kind, 'branch')
  assert.equal(scoped.root.name, 'الرياض')
  assert.equal(scoped.secretary, null)
  const text = JSON.stringify(scoped)
  for (const hidden of ['كريم خميس', 'سارة محمود', 'القاهرة', 'المالية']) assert.equal(text.includes(hidden), false, hidden)
})

test('من غير إعداد: الرئيس التنفيذي والسكرتير يتستنتجوا من المسمى الوظيفي', () => {
  const chart = model.buildOrgChart({
    branches,
    departments: departments.map(d => ({ ...d, isExecutive: false, executiveSecretaryEmployeeId: null })),
    teams,
    employees: employees.map(x => (x.id === 2 ? { ...x, jobTitle: 'السكرتير التنفيذي' } : x)),
  })
  assert.equal(chart.executiveConfigured, false)
  assert.equal(chart.root.head.name, 'كريم خميس')
  assert.equal(chart.secretary.name, 'سارة محمود')
  assert.ok(chart.root.children.some(c => c.key === 'd1'), 'القسم رجع إدارة عادية')
})

test('البحث بيعلّم الشخص أو الوحدة ويفتح الطريق ليه (بتطبيع الهمزات)', () => {
  const chart = model.buildOrgChart({ branches, departments, teams, employees })
  const r = model.searchOrgChart(chart, 'ريم عادل')
  assert.ok(r.people.has(9))
  assert.ok(r.membersOpen.has('t1'))
  assert.deepEqual([...r.expand].sort(), ['d4', 'x'])
  assert.equal(r.first, 't1')
  const unit = model.searchOrgChart(chart, 'التجزيه')
  assert.ok(unit.units.has('d6'))
  assert.deepEqual([...unit.expand].sort(), ['d5', 'x'])
  const alef = model.searchOrgChart(chart, 'احمد')
  assert.ok(alef.people.has(3))
  assert.ok(model.searchOrgChart(chart, 'سارة').units.has('secretary'))
  assert.equal(model.searchOrgChart(chart, '').count, 0)
})

test('العرض: كروت بخطوط ربط RTL، السكرتير كارت جانبي، والأعضاء والفتح والقفل', () => {
  const chart = model.buildOrgChart({ branches, departments, teams, employees })
  const search = model.searchOrgChart(chart, 'ريم عادل')
  const html = renderToStaticMarkup(React.createElement(OrgChartView, { chart, state: {
    expanded: new Set(model.allUnitKeys(chart.root)), membersOpen: search.membersOpen, highlightUnits: search.units, highlightPeople: search.people,
    showBranch: true, onToggle() {}, onToggleMembers() {},
  } }))
  for (const text of ['الإدارة التنفيذية', 'الرئيس التنفيذي', 'السكرتير التنفيذي', 'تابع للرئيس التنفيذي', 'مدير الإدارة', 'قائد الفريق', 'فريق الرواتب', 'ريم عادل', 'لم يُحدَّد مدير القسم'])
    assert.ok(html.includes(text), text)
  assert.ok(html.includes('data-org-key="secretary"'))
  assert.ok(html.includes('class="oc-side"'))
  assert.ok(html.includes("content: ''"), 'الـCSS خام مش متهرّب')
  assert.match(ORG_CHART_CSS, /inset-inline-start/)
  assert.match(ORG_CHART_CSS, /@media print/)
  const collapsed = renderToStaticMarkup(React.createElement(OrgChartView, { chart, state: {
    expanded: new Set(['x']), membersOpen: new Set(), highlightUnits: new Set(), highlightPeople: new Set(), showBranch: false, onToggle() {}, onToggleMembers() {},
  } }))
  assert.ok(collapsed.includes('المالية'))
  assert.equal(collapsed.includes('فريق الرواتب'), false, 'المقفول مايعرضش وحداته')
})

test('الشاشة: فتح/قفل الكل، بحث، فلتر فرع، طباعة وتصدير، وإعداد الإدارة التنفيذية لحساب الشركة', () => {
  const page = read('src/app/employees/org-chart/page.tsx')
  for (const text of ['buildOrgChart', 'searchOrgChart', 'فتح الكل', 'قفل الكل', 'كل الفروع', 'window.print()', 'تصدير CSV', 'scrollIntoView', '/settings/departments'])
    assert.ok(page.includes(text), text)
  const settings = read('src/app/settings/departments/page.tsx')
  for (const text of ['useCompanyWideWrite', 'الإدارة التنفيذية', 'السكرتير التنفيذي', 'executiveSecretaryEmployeeId', 'isExecutive'])
    assert.ok(settings.includes(text), text)
  const entity = read('api/src/org/entities/department.entity.ts')
  assert.match(entity, /isExecutive: boolean/)
  assert.match(entity, /executiveSecretaryEmployeeId: number \| null/)
  const migration = read('docs/migrations/payroll/20260916_053_org_chart_executive.sql')
  assert.match(migration, /DF_bdeab06f597bf08bd6cba892c35/)
  assert.match(migration, /COL_LENGTH\(N'dbo\.departments', N'executiveSecretaryEmployeeId'\) IS NULL/)
  assert.doesNotMatch(migration.replace(/^--.*$/gm, ''), /\b(DROP|DELETE|UPDATE)\b/)
})
