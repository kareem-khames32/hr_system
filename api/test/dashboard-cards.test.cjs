'use strict'
// B-ADD.3: كروت لوحة الإدارة — فحص من غير قاعدة (الدورة الفعلية في dashboard-cards.integration.cjs):
//  DB-01) سجل الكروت: كل كارت بصلاحية موجودة في كتالوج الصلاحيات وموديول مسجّل، وكارت الفلوس بصلاحية الرواتب بس.
//  DB-02) خانات حضور اليوم: كل حالة من حالات محرك الحضور في خانة واحدة، بقاعدة «حضر فعلًا» بتاعة كروت اللوحة القديمة.
//  DB-03) «إدارة ← قسم ← فريق»: صفوف كل مستوى، وعضوية كل مجموعة، ونقطة بداية الكارت من فلتر اللوحة.
//  DB-04) الخادم: كل المسارات ورا صلاحية اللوحة وكل مسار بيفحص كارته، والمبلغ والتليفون حقول بتتضاف بالصلاحية بس، والأرقام من القاموس.
//  DB-05) الواجهة (B-ADD.20): اللوحة إحصائيات بس — مفيش جدول في الصفحة ولا في أي مكوّن من مكوّناتها، وبنود الإخلاء مش فيها، وفلتر واحد
//         (المكان واليوم والفترة)، وكل قسم ببوابة كارته ولينك شاشته، وقواعد الموبايل.
//  DB-06) هيكل اللوحة بيترسم (مسار المستويات، القسم، الرسمة). DB-07) اللوحة كلها من ردود الخادم. DB-08) كل قسم ببوابة كارته.
//  DB-09) قواعد «محتاج انتباهك» والمقارنات. DB-10) الرسوم وكروت الأشخاص. DB-11) المسارين الجداد وباراميتراتهم في الخادم.
// Run (من api/): node --test test/dashboard-cards.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
const Module = require('node:module')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const root = path.resolve(__dirname, '..', '..')
const load = Module._load
Module._load = function (request, parent, isMain) {
  return load.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, isMain)
}
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
// مطابقة برسالة قصيرة (من غير طباعة الملف كله عند الفشل)
const has = (text, pattern, label) => assert.ok(pattern.test(text), label ?? `مش موجود: ${pattern}`)
const hasNot = (text, pattern, label) => assert.ok(!pattern.test(text), label ?? `موجود ومش المفروض: ${pattern}`)
const cards = require('../src/dashboard/dashboard-cards')
const permissions = require('../src/auth/permissions')
const registry = require('../src/modules-registry/registry')
const api = require('../../src/lib/dashboard-api')

test('DB-01: every card has an existing permission and a registered module; the money card needs the payroll permission', () => {
  assert.deepEqual(cards.DASHBOARD_CARDS.map(card => card.key), ['attendance', 'absentLate', 'leaves', 'workforce', 'requests', 'tasks', 'overtime', 'payroll', 'trends'])
  for (const card of cards.DASHBOARD_CARDS) {
    assert.ok(card.perms.length > 0, `${card.key}: من غير صلاحية`)
    for (const perm of card.perms) assert.ok(permissions.ALL_PERMISSIONS.includes(perm), `${card.key}: ${perm} مش في الكتالوج`)
    for (const module of card.modules) assert.ok(registry.isModuleKey(module), `${card.key}: ${module} مش موديول`)
    has(card.href, /^\/[a-z-/]+$/)
    assert.notEqual(card.perms[0], 'dashboard.view_all', 'صلاحية اللوحة لوحدها مابتفتحش كارت')
  }
  assert.deepEqual(cards.dashboardCardOf('payroll').perms, ['payroll.view']); assert.deepEqual(cards.dashboardCardOf('payroll').modules, ['payroll'])
  assert.equal(cards.DASHBOARD_MONEY_PERM, 'payroll.view'); assert.equal(cards.DASHBOARD_CONTACT_PERM, 'employees.view')
  // مفيش صلاحية جديدة: الكروت بصلاحيات شاشاتها القايمة
  assert.deepEqual([...new Set(cards.DASHBOARD_CARDS.flatMap(card => card.perms))].sort(),
    ['attendance.view_all', 'employees.view', 'leaves.view_all', 'overtime.confirm', 'payroll.view', 'requests.view_all', 'tasks.view_all'])
})

test('DB-02: every attendance status lands in exactly one bucket, with the old dashboard "attended" rule', () => {
  const bucket = (status, extra = {}) => cards.attendanceBucketOfDay({ status, ...extra })
  assert.deepEqual(cards.ATTENDANCE_BUCKETS.map(item => item.key), ['present', 'late', 'absent', 'leave', 'mission', 'pending', 'rest', 'other'])
  assert.deepEqual(cards.ATTENDANCE_BUCKETS.slice(0, 3).map(item => item.tone), ['green', 'yellow', 'red'])
  assert.deepEqual(['present', 'early_leave', 'missing_punch'].map(status => bucket(status)), ['present', 'present', 'present'])
  assert.deepEqual(['late', 'absent', 'leave', 'mission', 'remote'].map(status => bucket(status)), ['late', 'absent', 'leave', 'mission', 'mission'])
  // عطلة ببصمة = اشتغل يوم العطلة، ومن غير بصمة = راحة. نص يوم إجازة ببصمة = حضر، ومن غيرها = إجازة
  assert.deepEqual([bucket('holiday'), bucket('holiday', { checkIn: '09:00' }), bucket('holiday', { checkOut: '17:00' })], ['rest', 'present', 'present'])
  assert.deepEqual([bucket('partial_leave'), bucket('partial_leave', { checkIn: '12:00' })], ['leave', 'present'])
  assert.deepEqual([bucket('exempt'), bucket('exempt', { checkIn: '08:00' }), bucket('something_new')], ['other', 'present', 'other'])
  const counts = cards.emptyBucketCounts()
  assert.deepEqual(Object.keys(counts), cards.ATTENDANCE_BUCKETS.map(item => item.key))
  assert.equal(cards.isAttendanceBucket('absent'), true); assert.equal(cards.isAttendanceBucket('all'), false); assert.equal(cards.isAttendanceBucket(['absent']), false)
  // الألوان والأعمار والتواريخ
  assert.deepEqual([cards.toneOfRate(null, 5, 10), cards.toneOfRate(2, 5, 10), cards.toneOfRate(5, 5, 10), cards.toneOfRate(10, 5, 10)], ['gray', 'green', 'yellow', 'red'])
  assert.deepEqual([0, 1, 3, 4, 7, 8, 400].map(days => cards.ageBandOf(days).key), ['today', 'd1_3', 'd1_3', 'd4_7', 'd4_7', 'older', 'older'])
  assert.deepEqual([cards.ageInDays('2026-10-01', '2026-10-11'), cards.ageInDays('2026-10-11', '2026-10-11'), cards.ageInDays('2026-10-12', '2026-10-11'), cards.ageInDays(null, '2026-10-11')], [10, 0, 0, 0])
  assert.deepEqual([cards.dayAfter('2026-10-31', 1), cards.dayAfter('2026-03-01', -1), cards.dayAfter('2026-10-11', 7)], ['2026-11-01', '2026-02-28', '2026-10-18'])
  assert.deepEqual([cards.isDay('2026-10-11'), cards.isDay('2026-02-31'), cards.isDay('2026-1-1'), cards.isDay(20261011)], [true, false, false, false])
})

test('DB-03: administration → department → team rows, group membership, and the start group taken from the dashboard filter', () => {
  const A = 'ADMINISTRATION', D = 'DEPARTMENT'
  // فرع 1: إدارة المبيعات (1) ← التجزئة (2) [فريق 10 وفريق 11] والجملة (3)؛ إدارة التشغيل (4). القسم 9 أبوه (99) مش ظاهر للحساب = جذر
  const tree = cards.cardTree([
    { id: 1, name: 'إدارة المبيعات', branchId: 1, parentId: null, unitType: A }, { id: 2, name: 'التجزئة', branchId: 1, parentId: 1, unitType: D },
    { id: 3, name: 'الجملة', branchId: 1, parentId: 1, unitType: D }, { id: 4, name: 'إدارة التشغيل', branchId: 1, parentId: null, unitType: A },
    { id: 9, name: 'قسم تحت إدارة برّه النطاق', branchId: 1, parentId: 99, unitType: D },
  ], [{ id: 10, name: 'المعرض', departmentId: 2 }, { id: 11, name: 'الأونلاين', departmentId: 2 }])
  assert.deepEqual(cards.cardGroupChildren(tree, null).map(row => [row.group, row.level, row.expandable]),
    [['unit:1', 'إدارة', true], ['unit:4', 'إدارة', false], ['unit:9', 'قسم', false], ['none', '', false]])
  assert.deepEqual(cards.cardGroupChildren(tree, { kind: 'unit', id: 1 }).map(row => [row.group, row.level, row.expandable]),
    [['unit:2', 'قسم', true], ['unit:3', 'قسم', false], ['direct:1', '', false]])
  assert.deepEqual(cards.cardGroupChildren(tree, { kind: 'unit', id: 2 }).map(row => row.group), ['team:10', 'team:11', 'direct:2'])
  // وحدة من غير أقسام ولا فرق، والفريق، و«من غير»: آخر مستوى (أسماء بس)
  for (const group of [{ kind: 'unit', id: 3 }, { kind: 'team', id: 10 }, { kind: 'direct', id: 2 }, { kind: 'none' }, { kind: 'unit', id: 77 }]) {
    assert.deepEqual(cards.cardGroupChildren(tree, group), [], JSON.stringify(group))
  }
  assert.deepEqual([...tree.subtreeOf(1)].sort(), [1, 2, 3])
  const person = (departmentId, teamId = null) => ({ branchId: 1, departmentId, teamId })
  const member = (group, row) => cards.inCardGroup(tree, group, row)
  assert.deepEqual([member({ kind: 'unit', id: 1 }, person(2, 10)), member({ kind: 'unit', id: 1 }, person(3)), member({ kind: 'unit', id: 1 }, person(4)), member({ kind: 'unit', id: 1 }, person(null))],
    [true, true, false, false])
  assert.deepEqual([member({ kind: 'team', id: 10 }, person(2, 10)), member({ kind: 'team', id: 10 }, person(2, 11)), member({ kind: 'direct', id: 2 }, person(2)), member({ kind: 'direct', id: 2 }, person(2, 10))],
    [true, false, true, false])
  // قسم أو فريق مش ظاهر للحساب (مقفول أو من فرع تاني) = من غير قسم، وفريق من قسم تاني مابيتحسبش
  assert.deepEqual([member({ kind: 'none' }, person(null)), member({ kind: 'none' }, person(55)), member({ kind: 'none' }, person(2))], [true, true, false])
  assert.deepEqual(cards.visiblePlacement(tree, person(3, 10)), { unitId: 3, teamId: null })
  // كل موظف في صف واحد بالظبط في كل مستوى
  const people = [person(1), person(2), person(2, 10), person(2, 11), person(3), person(4), person(9), person(null), person(55)]
  for (const group of [null, { kind: 'unit', id: 1 }, { kind: 'unit', id: 2 }]) {
    const inside = people.filter(row => group === null || member(group, row))
    const rows = cards.cardGroupChildren(tree, group).map(row => cards.parseCardGroup(row.group))
    for (const row of inside) assert.equal(rows.filter(child => member(child, row)).length, 1, JSON.stringify([group, row]))
  }
  // قراءة group من الاستعلام
  assert.deepEqual([cards.parseCardGroup('unit:12'), cards.parseCardGroup('team:5'), cards.parseCardGroup('direct:3'), cards.parseCardGroup('none')],
    [{ kind: 'unit', id: 12 }, { kind: 'team', id: 5 }, { kind: 'direct', id: 3 }, { kind: 'none' }])
  for (const bad of ['unit:0', 'unit:-1', 'unit:1.5', 'unit:abc', 'branch:1', 'unit:1; DROP', '', null, undefined, 12, ['unit:1'], 'unit:99999999999']) {
    assert.equal(cards.parseCardGroup(bad), null, String(bad))
  }
  // فلتر اللوحة: الإدارة المختارة (بأقسامها الفرعية) = الكارت يفتح عليها، والفريق المختار = الفريق، وأكتر من جذر أو فلتر فاضي = من فوق
  assert.deepEqual(cards.startGroupOf(tree, { departmentIds: [1, 2, 3], teamId: null }), { kind: 'unit', id: 1 })
  assert.deepEqual(cards.startGroupOf(tree, { departmentIds: [2], teamId: null }), { kind: 'unit', id: 2 })
  assert.deepEqual(cards.startGroupOf(tree, { departmentIds: [2], teamId: 11 }), { kind: 'team', id: 11 })
  assert.equal(cards.startGroupOf(tree, { departmentIds: [2, 4], teamId: null }), null)
  assert.equal(cards.startGroupOf(tree, { departmentIds: null, teamId: null }), null)
  assert.equal(cards.startGroupOf(tree, { departmentIds: [500], teamId: null }), null, 'قسم برّه النطاق مالوش مجموعة')
  assert.equal(cards.startGroupOf(tree, { departmentIds: null, teamId: 500 }), null)
})

test('DB-04: the server guards every card, adds money and phone only by permission, and counts with the dictionary rules', () => {
  const controller = read('api/src/dashboard/dashboard-cards.controller.ts'), service = read('api/src/dashboard/dashboard-cards.service.ts')
  has(controller, /@RequireModule\('platform'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Perm\('dashboard\.view_all'\)\n@Controller\('dashboard\/cards'\)/)
  // كل مسار كارت بيعدّي على فحص كارته (صلاحية وموديول) قبل أي حساب؛ المسار الوحيد من غيره هو قايمة الكروت المتاحة
  const handlers = controller.split(/\n  @Get\(/).slice(1)
  // B-ADD.7: + السلسلة الشهرية (بفحص كارت القوى العاملة) + شريط الموديولات (كل بند بيفحص موديوله وصلاحيته في خدمته)
  // B-ADD.20: + الفروع (بفحص كارت الحضور) + أرقام القوى العاملة (بفحص كارتها)
  assert.equal(handlers.length, 15)
  const guarded = handlers.filter(text => /this\.open\('(attendance|absentLate|leaves|workforce|requests|tasks|overtime|payroll|trends)', user, request, query\)/.test(text))
  assert.equal(guarded.length, 13)
  assert.deepEqual(handlers.filter(text => !guarded.includes(text)).map(text => text.match(/^[^\n]*\n  (?:async )?(\w+)\(/)?.[1]), ['access', 'modules'])
  has(controller, /await this\.cards\.requireCard\(key, user, request\.originalUrl \?\? request\.url \?\? ''\)/)
  has(service, /if \(!allowed\.module\) throw new NotFoundException\(`Cannot GET \$\{url\}`\)\n    if \(!allowed\.perm\) throw new ForbiddenException/)
  // الفلوس: حقل بيتضاف بالصلاحية والموديول، والتليفون بصلاحية عرض الموظفين، والمستندات بصلاحيتها
  has(service, /return userHasPerm\(user, DASHBOARD_MONEY_PERM\) && \(await this\.moduleOn\('payroll', user\)\)/)
  assert.equal(service.split('...(money ? { amounts').length - 1, 2)
  has(service, /\.\.\.\(contact \? \{ phone: person\.phone \} : \{\}\)/)
  has(service, /employees: listed\.map\(person => this\.personRow\(ctx, person, states\.get\(person\.id\), false\)\)/, 'قايمة أسماء الكارت من غير تليفون')
  has(service, /const documents = userHasPerm\(ctx\.user, 'documents\.manage'\) \? await this\.expiringDocuments\(ctx, today\) : null/)
  // عمود مبلغ الإضافي مابيتقريش إلا في سطر مشروط بالصلاحية (غير التعليقات)
  const amountLines = service.split('\n').filter(line => line.includes('amountSnapshot') && !/^\s*(\*|\/\/|\/\*)/.test(line))
  assert.equal(amountLines.length, 1); assert.ok(amountLines[0].trim().startsWith('money ? `'), 'عمود مبلغ الإضافي مشروط بالصلاحية')
  // النطاق: من التوكن، وفرع برّه النطاق مرفوض، والمجموعة لازم تكون في شجرة النطاق
  has(service, /const scope = branchScopeOf\(user\)\n    const filter = parseOrgFilter\(raw\)\n    if \(filter\.branchId !== null && !inBranchScope\(scope, filter\.branchId\)\) \{\n      throw new ForbiddenException/)
  has(service, /if \(!known\) throw new NotFoundException\(group\.kind === 'team' \? 'الفريق غير موجود' : 'القسم غير موجود'\)/)
  has(service, /filterContext\(scope\)/)
  // القاموس: العدد بدالته، وشرط الموظف الحالي والإضافي والغياب بقواعده، وغياب اليوم اللحظي من محرك الحضور
  has(service, /this\.metrics\.workforce\(ctx\.scope, ctx\.filter\)/)
  for (const rule of ['currentEmployeeSql(', 'OVERTIME_COUNTED_STATUSES', 'absenceOutsideServiceSql(', 'serviceEndSql(', 'percent(']) assert.ok(service.includes(rule), rule)
  hasNot(service, /NOT IN \('archived', 'terminated'\)/, 'شرط «الحاليين» من القاموس مش مكتوب باليد')
  has(service, /await this\.attendance\.liveAbsences\(date, scope\)/)
  has(service, /reader\.calendarDay\(person\.id, date\)/)
  // استعلامات مجمّعة: مفيش استعلام SQL جوه حلقة على الموظفين (القراءة لكل موظف في محرك الحضور بس، بدفعته)
  hasNot(service, /for \(const (person|employee|row) of [^\n]*\) \{?\n?[^\n]*await this\.ds\.query/)
  // الخادم مابيبعتش رسايل ولا بيتصل: اللينك بيتبني في المتصفح
  hasNot(service + controller, /wa\.me|tel:|MailService|sendWhatsapp|notifications/i)
  // الكنترولر والخدمة متسجّلين، ولوحة الأرقام القديمة زي ما هي
  const app = read('api/src/app.module.ts')
  assert.ok(app.includes('DashboardCardsController,') && app.includes('DashboardCardsService, DashboardModulesService]'))
})

// B-ADD.20: ملفات لوحة الإدارة (الصفحة ومكوّناتها) — كل الفحوص اللي تحت بتلف عليهم
const DASHBOARD_FILES = {
  admin: 'src/components/dashboard/AdminDashboard.tsx', stats: 'src/components/dashboard/StatsDashboard.tsx', charts: 'src/components/dashboard/charts.tsx',
  frame: 'src/components/dashboard/frame.tsx', shared: 'src/components/dashboard/shared.tsx', panel: 'src/components/dashboard/PeoplePanel.tsx',
  attendanceSection: 'src/components/dashboard/sections/AttendanceSection.tsx', peopleSections: 'src/components/dashboard/sections/PeopleSections.tsx',
  workSections: 'src/components/dashboard/sections/WorkSections.tsx',
}
const dashboardSources = () => Object.fromEntries(Object.entries(DASHBOARD_FILES).map(([name, file]) => [name, read(file)]))

test('DB-05: the admin dashboard screen — statistics only (no table anywhere), no clearance items, one filter bar with place, day and period, and the mobile rules', () => {
  const page = read('src/app/page.tsx'), lib = read('src/lib/dashboard-api.ts'), insights = read('src/lib/dashboard-insights.ts')
  const sources = dashboardSources(), { admin, stats, panel } = sources
  const all = Object.values(sources).join('\n')
  // B-ADD.20 (طلب المالك 12 أكتوبر): مفيش جدول في اللوحة — لا في الصفحة ولا في أي مكوّن من مكوّناتها، والكروت التفصيلية القديمة (الجداول) اتشالت
  for (const [name, source] of Object.entries(sources)) hasNot(source, /<(table|thead|tbody|tr|td|th)\b/, `${name}: جدول في اللوحة`)
  assert.equal(fs.existsSync(path.join(root, 'src/components/dashboard/cards')), false, 'كروت الجداول التفصيلية اتشالت')
  hasNot(all, /cards\/(AttendanceCards|PeopleCards|WorkCards|shared)|ListModal|CARD_COMPONENTS|setShowTables|Table2/)
  hasNot(admin, /<button[^>]*>[^<]*الجداول التفصيلية/, 'مفيش زرار للجداول التفصيلية')
  // الأسماء كروت أشخاص في لوحة جانبية بحد أقصى، ومعاها لينك للشاشة التفصيلية
  has(panel, /const shown = people\.slice\(0, PEOPLE_PANEL_LIMIT\)/); has(panel, /data-person-card/)
  has(panel, /fetchAttendanceEmployees\(filter, bucket, group, PEOPLE_PANEL_LIMIT\)/)
  has(panel, /<aside className="absolute inset-y-0 end-0 w-full sm:max-w-md bg-gray-50 shadow-xl flex flex-col" role="dialog" aria-modal="true"/)
  assert.equal(require('../../src/lib/dashboard-insights').PEOPLE_PANEL_LIMIT, 50)
  // بنود الإخلاء مش في اللوحة (لا لوحة الإدارة ولا غلافها)، وموجودة في «مهامي» وصندوق الموافقات وملف إنهاء الخدمة
  hasNot(page, /MyClearanceItems|fetchMyClearanceItems|my-items/)
  for (const file of [all, lib, insights]) hasNot(file, /MyClearanceItems|fetchMyClearanceItems|my-items|clearance/i)
  assert.ok(fs.existsSync(path.join(root, 'src/components/dashboard/MyClearanceItems.tsx')), 'المكوّن لسه موجود لصندوق الموافقات')
  has(read('src/app/approvals-inbox/page.tsx'), /<MyClearanceItems \/>/)
  has(read('src/app/my/tasks/page.tsx'), /data-clearance-items/)
  has(read('api/src/tasks/tasks.service.ts'), /await this\.offboarding\.myItems\(user\)/)
  // مبدّل اللوحتين زي ما هو: لوحة الإدارة بصلاحيتها، وغيرها لوحة الموظف — وكارتي «خلال 30 يومًا» و«آخر التنبيهات» فضلوا
  has(page, /const allowed = can\('dashboard\.view_all'\)\n    setCanAdmin\(allowed\)\n    setView\(allowed \? 'admin' : 'employee'\)/)
  has(page, /\{view === 'employee' \? \(\n          <EmployeeHome \/>\n        \) : \(\n          <>\n[^\n]*\n            <AdminDashboard \/>/)
  has(page, /<UpcomingEvents \/>\n              <RecentActivities \/>/)
  has(read('src/components/dashboard/UpcomingEvents.tsx'), /خلال 30 يومًا/); has(read('src/components/dashboard/RecentActivities.tsx'), /آخر التنبيهات/)
  // أرقام اللوحة القديمة اللي من غير صلاحية كارت ولا فلتر مابقتش مرسومة
  hasNot(page, /StatsCards|AttendanceChart|DepartmentStats/)
  // فلتر واحد بيحرّك اللوحة كلها: الأداة الموحدة + اليوم (النهارده افتراضي، والمستقبل مش متاح) + الفترة (7 أو 30 أو 90، و30 افتراضي)
  has(admin, /const org = useOrgFilter\(\)/); assert.equal(all.split('useOrgFilter(').length - 1, 1, 'فلتر واحد للوحة كلها')
  has(admin, /\{org\.element\}/)
  has(admin, /setAccess\(value\); setDate\(value\.today\)/)
  has(admin, /type="date"[\s\S]{0,200}max=\{access\.today\}/)
  has(admin, /if \(next && next <= access\.today\) setDate\(next\)/)
  has(admin, /const \[period, setPeriod\] = useState<TrendWindow>\(30\)/)
  has(admin, /<select aria-label="الفترة"[^\n]*data-dashboard-period>\n            \{TREND_WINDOWS\.map\(/)
  assert.deepEqual([...api.TREND_WINDOWS], [7, 30, 90]); assert.deepEqual([...api.TREND_WINDOWS], [...cards.TREND_WINDOWS])
  has(admin, /<StatsDashboard filter=\{filter\} filterKey=\{filterKey\} period=\{period\} access=\{access\} \/>/)
  // الأقسام اللي بتترسم = اللي الخادم بعت كروتها بس — كل قسم بنفس بوابة B-ADD.3 (من غير شرط صلاحية في الواجهة يقوم مقام الخادم)
  has(stats, /const allowed = new Set\(access\.cards\.map\(\(card\) => card\.key\)\)/)
  has(read('src/components/dashboard/frame.tsx'), /export const gate = <T,>\(on: boolean, load: \(\) => Promise<T>\) => \(\): Promise<T \| null> => \(on \? load\(\) : Promise\.resolve\(null\)\)/)
  for (const key of ['attendance', 'trends', 'leaves', 'workforce', 'requests', 'tasks', 'overtime', 'payroll']) has(stats, new RegExp(`useCard\\(gate\\(has\\('${key}'\\)`), key)
  // النداءات الجديدة بنفس بوابة كارتها: الفروع بكارت الحضور، وأرقام القوى العاملة بكارتها، والفترة اللي قبلها بكارت الاتجاهات
  has(stats, /const branches = useCard\(gate\(has\('attendance'\) && companyWide, \(\) => fetchBranchesCard\(filter\)\)/)
  has(stats, /const insights = useCard\(gate\(has\('workforce'\), \(\) => fetchWorkforceInsights\(org\)\)/)
  has(stats, /const previous = useCard\(gate\(has\('trends'\), \(\) => fetchTrendsCard\(\{ org: filter\.org, date: shiftDay\(filter\.date, -period\) \}, undefined, period\)\)/)
  for (const [section, cond] of [['WorkforceSection', "has\\('workforce'\\)"], ['LeavesSection', "has\\('leaves'\\)"], ['RequestsSection', "has\\('requests'\\)"], ['OvertimeSection', "has\\('overtime'\\)"],
    ['PayrollSection', "has\\('payroll'\\)"], ['AttendanceSection', "\\(has\\('attendance'\\) \\|\\| has\\('trends'\\)\\)"], ['TasksSection', '\\(tasksOn \\|\\| performance\\)']]) {
    has(stats, new RegExp(`\\{${cond} && (\\(\\n\\s+)?<${section} `), `${section} ببوابة كارته`)
  }
  has(stats, /const tasksOn = has\('tasks'\) && tasks\.data\?\.available !== false/)
  has(read(DASHBOARD_FILES.attendanceSection), /useCard\(gate\(showToday && drill\.active, \(\) => fetchAttendanceCard\(drilled, drill\.group\)\)/)
  has(read(DASHBOARD_FILES.attendanceSection), /useCard\(gate\(showTrends && drill\.active, \(\) => fetchTrendsCard\(drilled, drill\.group, period\)\)/)
  hasNot(all, /\bcan\('/, 'مفيش شرط صلاحية في الواجهة')
  // كل قسم بلينك لشاشته التفصيلية (من غير لينك لو موديولها مقفول)
  has(read(DASHBOARD_FILES.frame), /<ModuleLink href=\{href\} fallback=\{null\} className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline shrink-0">/)
  for (const [key, label] of [['attendance', 'شاشة الحضور'], ['workforce', 'شاشة الموظفين'], ['leaves', 'شاشة الإجازات'], ['requests', 'كونسول الطلبات'], ['tasks', 'شاشة المهام'],
    ['overtime', 'شاشة الإضافي'], ['payroll', 'شاشة الرواتب']]) {
    has(all, new RegExp(`<Section sectionKey="${key}" [^\\n]*linkLabel="${label}"`), key)
    has(stats, new RegExp(`href=\\{hrefs\\.${key}\\}`), `${key}: اللينك من رد الخادم`)
  }
  has(read(DASHBOARD_FILES.peopleSections), /href=\{href \? `\$\{href\}\?date=\$\{date\}` : undefined\} linkLabel="شاشة الإجازات"/, 'شاشة الإجازات بتفتح على نفس اليوم')
  // النزول جوه الرسمة: فرع ← إدارة ← قسم ← فريق، والضغط على رقم حالة بيفتح أصحابه
  has(read(DASHBOARD_FILES.attendanceSection), /drill\.open\(\{ name: row\.name, branchId: row\.branchId! \}\)/)
  has(read(DASHBOARD_FILES.attendanceSection), /drill\.open\(\{ group: row\.group, name: row\.name \}\)/)
  has(read(DASHBOARD_FILES.shared), /orgOf: \(org: OrgFilterParams\): OrgFilterParams => \(branchId === undefined \? org : \{ \.\.\.org, branchId \}\)/)
  // «اتصل/راسل»: لينك من المتصفح برقم الملف، وبيتعرض لو الخادم بعت الرقم (كارت الغايبين والمتأخرين لصاحب صلاحيته)
  has(panel, /const withPhones = contactCard && !group && \(bucket === 'absent' \|\| bucket === 'late'\)/)
  has(stats, /contactCard=\{has\('absentLate'\)\}/)
  assert.deepEqual([api.telLink('+966 50 123 4567'), api.telLink('0501234567'), api.telLink(''), api.telLink('12'), api.telLink(null)], ['tel:+966501234567', 'tel:0501234567', null, null, null])
  assert.deepEqual([api.whatsappLink('+966 50 123 4567'), api.whatsappLink('00201001234567'), api.whatsappLink('0501234567'), api.whatsappLink(undefined)],
    ['https://wa.me/966501234567', 'https://wa.me/201001234567', null, null])
  // المبلغ: بيتعرض لو الحقل راجع من الخادم بس
  has(read(DASHBOARD_FILES.workSections), /\{card\.amounts\?\.map\(\(item\) => \(/); has(read(DASHBOARD_FILES.workSections), /unit\.amounts\?\.length \? /)
  // الرسم: SVG وعناصر بسيطة من غير مكتبة — لا في الكود ولا في الباكدج
  hasNot(all, /recharts|chart\.js|from 'd3|victory|nivo|echarts|apexcharts|highcharts/)
  const pkg = JSON.parse(read('package.json'))
  for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) hasNot(name, /recharts|chart\.js|^d3|victory|nivo|echarts|apexcharts|highcharts|visx/, `مكتبة رسم: ${name}`)
  // الموبايل: مفيش اتجاه فيزيائي، وكل شبكة 3 أعمدة أو أكتر ليها بديل للشاشة الصغيرة، ومفيش col-span من غير بادئة، والمؤشرات اتنين في الصف
  for (const [name, source] of Object.entries(sources)) {
    hasNot(source, /(^|["'`\s])(ml|mr|pl|pr)-\d|(^|["'`\s])text-(left|right)(?=["'`\s])|(^|["'`\s])(left|right)-\d/m, `${name}: اتجاه فيزيائي`)
    for (const cls of [...source.matchAll(/(?:className=|= )(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g)].map(m => m[1] ?? m[2] ?? m[3])) {
      const tokens = cls.split(/\s+/)
      if (tokens.some(token => /^grid-cols-(\d+)$/.test(token) && Number(token.slice(10)) >= 3)) {
        assert.ok(tokens.some(token => /^(sm|md|lg|xl):grid-cols-\d+$/.test(token)), `${name}: «${cls}» مالهاش بديل للشاشة الصغيرة`)
      }
      hasNot(cls, /(^|\s)col-span-([2-9]|1[0-2])(\s|$)/, `${name}: col-span من غير بادئة`)
    }
  }
  has(stats, /<div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-kpi-row>/)
  has(read(DASHBOARD_FILES.workSections), /const GRID = 'grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6'/)
  // نداءات اللوحة في ملفها (lib/api.ts مالوش علاقة بالفلتر الموحد)
  has(lib, /import \{ orgFilterQuery, type OrgFilterParams \} from '\.\/org-filter'/)
  hasNot(read('src/lib/api.ts'), /dashboard\/cards/)
  has(lib, /fetchBranchesCard = [^\n]*withFilter\('\/branches', filter\)/); has(lib, /fetchWorkforceInsights = [^\n]*withFilter\('\/workforce\/insights', filter\)/)
  has(lib, /fetchModulesStrip = [^\n]*withFilter\('\/modules', filter\)/)
})

test('DB-06: the frame pieces render — the level path with a branch step, a section with its takeaway and link, a chart panel with its own error, and the shell before the sections load', () => {
  const React = require('../../node_modules/react')
  const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
  const shared = require('../../src/components/dashboard/shared')
  const frame = require('../../src/components/dashboard/frame')
  const render = (component, props, ...children) => renderToStaticMarkup(React.createElement(component, props, ...children))
  assert.deepEqual([shared.rate(null), shared.rate(36.36), shared.num(1234)], ['—', '36.36%', '1,234'])
  // مسار المستوى المفتوح: «الكل» بيرجّع لأول مستوى، والفرع خطوة زي الوحدة، وآخر مستوى نص مش زرار
  const pathHtml = render(shared.DrillPath, { path: [{ branchId: 3, name: 'فرع جدة' }, { group: 'unit:1', name: 'إدارة المبيعات' }, { group: 'unit:2', name: 'قسم التجزئة' }], start: null, onBack: () => {} })
  assert.ok(pathHtml.includes('>الكل</button>') && pathHtml.includes('>فرع جدة</button>') && pathHtml.includes('>إدارة المبيعات</button>')
    && pathHtml.includes('<span class="font-medium text-gray-700">قسم التجزئة</span>'))
  assert.equal(render(shared.DrillPath, { path: [], start: null, onBack: () => {} }), '')
  assert.ok(render(shared.DrillPath, { path: [], start: { group: 'unit:1', name: 'إدارة المبيعات', level: 'إدارة' }, onBack: () => {} }).includes('إدارة المبيعات'))
  assert.deepEqual([shared.drillStepKey({ name: 'فرع', branchId: 3 }), shared.drillStepKey({ name: 'قسم', group: 'unit:2' })], ['3|', '|unit:2'])
  // القسم: عنوان وسطر خلاصة ولينك شاشته — ومن غير لينك لما مفيش شاشة
  const section = render(frame.Section, { sectionKey: 'requests', title: 'الطلبات والاعتمادات', takeaway: '3 طلب معلّق', icon: null, href: '/requests-console', linkLabel: 'كونسول الطلبات' }, 'رسوم')
  assert.ok(section.includes('id="dashboard-section-requests"') && section.includes('data-dashboard-section="requests"') && section.includes('data-section-takeaway') && section.includes('3 طلب معلّق'))
  assert.ok(section.includes('href="/requests-console"') && section.includes('كونسول الطلبات') && section.includes('رسوم'))
  assert.equal(render(frame.Section, { sectionKey: 'modules', title: 'باقي أقسام النظام', icon: null }, 'x').includes('<a '), false)
  // الرسمة: خطؤها وإعادة محاولتها لوحدها، وهيكل تحميل بدل الدايرة
  const failed = render(frame.Panel, { title: 'عمر الطلبات', loading: false, error: 'تعذر تحميل الأرقام', onRetry: () => {}, panelKey: 'requests-age' }, null)
  assert.ok(failed.includes('data-dashboard-panel="requests-age"') && failed.includes('role="alert"') && failed.includes('إعادة المحاولة'))
  const loading = render(frame.Panel, { title: 'عمر الطلبات', loading: true, error: '', onRetry: () => {}, panelKey: 'requests-age' }, null)
  assert.ok(loading.includes('data-chart-skeleton') && loading.includes('animate-pulse') && loading.includes('aria-busy="true"'))
  assert.ok(render(frame.Panel, { title: 'الاتجاه', loading: false, error: '', onRetry: () => {}, panelKey: 'trend', wide: true, href: '/reports', linkLabel: 'التقارير' }, 'رسمة').includes('lg:col-span-2'))
  assert.ok(render(frame.Panel, { title: 'التوزيع', loading: false, error: '', onRetry: () => {}, panelKey: 'd', wide: 'full' }, 'رسمة').includes('lg:col-span-3'))
  // اللوحة قبل ما الأقسام المتاحة تتعرف: هيكل تحميل، ومفيش نداء قسم ولا قسم مرسوم
  const AdminDashboard = require('../../src/components/dashboard/AdminDashboard').default
  const shell = render(AdminDashboard, {})
  assert.ok(shell.includes('aria-busy="true"') && shell.includes('data-dashboard-loading') && !shell.includes('data-dashboard-section') && !shell.includes('data-kpi'))
})

// ===== ردود جاهزة بشكل رد الخادم (dashboard-cards.integration.cjs) — لرسم اللوحة كلها من غير متصفح =====
function dashboardAnswers() {
  const counts = { present: 6, late: 1, absent: 3, leave: 1, mission: 2, pending: 1, rest: 0, other: 0 }
  const row = (group, name, level, expandable, total) => ({ group, kind: group.split(':')[0], id: 1, name, level, branchName: null, expandable, total })
  const rates = (required, attendanceRate, late, absence) => ({ required, attendance: attendanceRate, late, absence })
  const dated = (id, name, date, daysLeft) => ({ id, name, unit: 'قسم الجملة', team: null, date, daysLeft })
  const days = [{ date: '2026-10-09', ...rates(10, 100, 0, 0) }, { date: '2026-10-10', ...rates(0, null, null, null) }, { date: '2026-10-11', ...rates(10, 70, 10, 30) }]
  return {
    attendance: { date: '2026-10-11', today: '2026-10-11', isToday: true, group: null, total: 14, counts,
      rows: [{ ...row('unit:1', 'إدارة المبيعات', 'إدارة', true, 10), counts: { ...counts, present: 4, absent: 3, late: 1 } },
        { ...row('none', 'من غير قسم', '', false, 4), counts: { ...cards.emptyBucketCounts(), present: 2, mission: 2 } }] },
    branches: { date: '2026-10-11', isToday: true, total: 14, counts, rows: [{ branchId: 3, name: 'فرع جدة', total: 11, counts }, { branchId: 4, name: 'فرع الرياض', total: 3, counts: { ...cards.emptyBucketCounts(), present: 3 } }] },
    trends: { from: '2026-09-12', to: '2026-10-11', window: 30, group: null, summary: { ...rates(20, 85, 5, 15), tone: 'red' }, days,
      units: [{ group: 'unit:1', name: 'إدارة المبيعات', level: 'إدارة', expandable: true, tone: 'red', ...rates(9, 88.9, 11.1, 11.1) }] },
    previous: { from: '2026-08-13', to: '2026-09-11', window: 30, group: null, summary: { ...rates(20, 90, 5, 10), tone: 'yellow' }, days: [], units: [] },
    leaves: { date: '2026-10-11', isToday: true, weekEnd: '2026-10-18', today: { onLeave: 1, halfDay: 0 },
      nextWeek: { employees: 2, list: [{ id: 6, name: 'منى', unit: 'قسم التجزئة', team: null, type: 'سنوية', from: '2026-10-12', to: '2026-10-13', halfDay: false }] },
      topUnits: [{ id: 2, name: 'قسم التجزئة', days: 5, employees: 2 }], byType: [{ code: 'ANNUAL', name: 'سنوية', days: 5, employees: 2 }] },
    workforce: { date: '2026-10-11', group: null, headcount: 14, active: 13, onProbation: 1, total: 14, rows: [row('unit:1', 'إدارة المبيعات', 'إدارة', true, 10)],
      period: { period: '2026-10', from: '2026-10-01', to: '2026-10-31' }, joiners: { count: 1, list: [dated(11, 'هدى', '2026-10-11', 0)] }, leavers: 1, windowDays: 30,
      probationEnding: { count: 1, list: [dated(10, 'كريم', '2026-10-16', 5)] }, contractsEnding: { count: 1, expired: 1, list: [dated(9, 'نور', '2026-10-31', 20)] },
      passportsEnding: { count: 0, list: [] } },
    insights: { from: '2026-09', to: '2026-10', months: [{ month: '2026-09', joiners: 2, leavers: 0, headcount: 12 }, { month: '2026-10', joiners: 3, leavers: 1, headcount: 14 }],
      turnover: { leavers: 1, atStart: 10, atEnd: 14, rate: 8.33 }, tenure: { averageMonths: 20, unknown: 0, bands: cards.TENURE_BANDS.map((band, index) => ({ key: band.key, label: band.label, count: index + 1 })) },
      byBranch: [{ branchId: 3, name: 'فرع جدة', total: 11 }, { branchId: 4, name: 'فرع الرياض', total: 3 }] },
    requests: { pending: 3, overdue: 1, approvedNotExecuted: 2, oldestDays: 10, byType: [{ code: 'T', name: 'طلب إجازة', count: 3, overdue: 1 }],
      byAge: [{ key: 'today', label: 'النهارده', tone: 'green', count: 1 }, { key: 'd1_3', label: '1–3 أيام', tone: 'green', count: 1 }, { key: 'd4_7', label: '4–7 أيام', tone: 'yellow', count: 0 },
        { key: 'older', label: 'أكتر من أسبوع', tone: 'red', count: 1 }] },
    tasks: { available: true, open: 3, overdue: 2, people: 2, assignees: [{ employeeId: 1, role: null, name: 'سارة', open: 2, overdue: 1 }, { employeeId: null, role: 'hr', name: 'الموارد البشرية', open: 1, overdue: 1 }] },
    overtime: { period: '2026-10', from: '2026-10-01', to: '2026-10-31', hours: 4, entries: 2, pendingEntries: 1, byUnit: [{ id: 2, name: 'قسم التجزئة', hours: 4, entries: 2 }] },
    payroll: { period: '2026-10', from: '2026-10-01', to: '2026-10-31', upTo: '2026-10-10', note: 'تقديري', runsFiltered: false,
      runs: [{ id: 7, name: 'مسير أكتوبر', status: 'CALCULATED', runType: 'REGULAR', totalNet: 125000 }],
      accrued: { available: true, employees: 12, incomplete: 2, byCurrency: [{ currency: 'EGP', employees: 12, earned: 40000, overtime: 160, deductions: 500, estimatedNet: 39660 }] },
      alerts: [{ tone: 'red', text: 'موظفين صافيهم صفر أو بالسالب في مسير مستني اعتماد', count: 1 }] },
    modules: { modules: [{ key: 'recruitment', title: 'التوظيف', href: '/recruitment/jobs', stats: [{ label: 'وظايف مفتوحة', value: 2, tone: 'blue' }] },
      { key: 'performance', title: 'تقييم الأداء', href: '/performance/cycles', stats: [{ label: 'دورات مفتوحة', value: 1, tone: 'blue' }, { label: 'اتقيّموا من 8', value: 50, tone: 'yellow', suffix: '%' }] },
      { key: 'documents', title: 'إقرارات المستندات', href: '/employees/documents', stats: [{ label: 'مستنية إقرار', value: 4, tone: 'blue' }, { label: 'فات ميعادها', value: 2, tone: 'red' }] }] },
  }
}
// مفتاح نداء كل قسم في StatsDashboard (آخر جزء في مفتاح useCard) ← رده
const ANSWER_OF = { a: 'attendance', b: 'branches', t: 'trends', l: 'leaves', w: 'workforce', i: 'insights', r: 'requests', k: 'tasks', o: 'overtime', x: 'modules' }

function renderDashboard(cardKeys, answers, period = 30) {
  const React = require('../../node_modules/react')
  const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
  const shared = require('../../src/components/dashboard/shared')
  const StatsDashboard = require('../../src/components/dashboard/StatsDashboard').default
  const original = shared.useCard
  // نداء كل قسم متبدّل برد جاهز بمفتاحه — والقسم بيترسم لو كارته في قايمة الحساب بس (ده اللي بيتفحص)
  shared.useCard = (load, key) => {
    const parts = String(key).split('|'), last = parts[parts.length - 1]
    // «p» مفتاحين: الفترة اللي قبلها (مفتاحها فيه طول الفترة قبل الحرف) وكارت الرواتب
    const name = last === 'p' ? (parts[parts.length - 2] === String(period) ? 'previous' : 'payroll') : ANSWER_OF[last]
    return { data: name ? answers[name] ?? null : null, loading: false, error: '', reload: () => {} }
  }
  try {
    return renderToStaticMarkup(React.createElement(StatsDashboard, { filter: { org: {}, date: '2026-10-11' }, filterKey: '{}|2026-10-11', period,
      access: { today: '2026-10-11', money: false, contact: false, documents: false, buckets: cards.ATTENDANCE_BUCKETS,
        cards: cards.DASHBOARD_CARDS.filter(card => cardKeys.includes(card.key)).map(card => ({ key: card.key, title: card.title, href: card.href })) } }))
  } finally { shared.useCard = original }
}
const sectionsOf = html => [...html.matchAll(/data-dashboard-section="([a-z]+)"/g)].map(match => match[1])

test('DB-07: the whole dashboard renders from the server answers as statistics — every section in order, no table, the numbers as text, and money only when the answer carries it', () => {
  const answers = dashboardAnswers()
  const html = renderDashboard(cards.DASHBOARD_CARDS.map(card => card.key), answers)
  // الأقسام بالترتيب: النبض، محتاج انتباهك، الحضور، القوى العاملة، الإجازات، الطلبات، المهام والأداء، الإضافي، الرواتب، باقي الموديولات
  assert.deepEqual(sectionsOf(html), ['pulse', 'attention', 'attendance', 'workforce', 'leaves', 'requests', 'tasks', 'overtime', 'payroll', 'modules'])
  // مفيش جدول ولا صف جدول في أي حتة من اللوحة المرسومة
  hasNot(html, /<(table|thead|tbody|tr|td|th)[\s>]/, 'جدول مرسوم في اللوحة')
  // النبض: 8 مؤشرات، والرقم مكتوب، والفرق عن الفترة بسهم ونص، وخط صغير
  assert.equal(html.split('data-kpi-row')[1].split('data-dashboard-section="attention"')[0].split('data-kpi').length - 1, 8)
  for (const text of ['الموظفين', 'حضور النهارده', 'غياب النهارده', 'تأخير النهارده', 'في إجازة', 'طلبات معلّقة', 'مهام مفتوحة', 'ساعات الإضافي']) assert.ok(html.includes(text), text)
  // نسبة حضور اليوم 7 من 10 = 70% مقابل متوسط 85% = قل 15 نقطة (مش كويس)؛ والعدد 14 مقابل 12 آخر الشهر اللي فات = زاد 2 موظف
  assert.ok(html.includes('>70%<') && html.includes('7 من 10 مطلوب منهم الحضور') && html.includes('قل 15 نقطة') && html.includes('عن متوسط 30 يوم'))
  assert.ok(html.includes('زاد 2 موظف') && html.includes('عن آخر الشهر اللي فات'))
  assert.ok(html.split('data-chart="spark"').length - 1 >= 4, 'خط صغير في المؤشرات')
  // كل قسم بعنوانه وسطر خلاصته ولينك شاشته
  assert.equal(html.split('data-section-takeaway').length - 1, 9)
  for (const text of ['نبض النهارده', '7 حضروا من 10 مطلوب منهم الحضور — 3 غايب و1 متأخر، و1 لسه مابصمش.', 'الحضور والالتزام', 'نسبة الحضور في آخر 30 يوم 85% والغياب 15% — أقل من الفترة اللي قبلها بـ5 نقطة.', 'القوى العاملة',
    '14 موظف، منهم 1 تحت التجربة — في آخر 2 شهر 5 تعيين و1 خروج، والدوران 8.3%.', '1 في إجازة النهارده و2 في الأسبوع اللي بعده — أكتر قسم: قسم التجزئة.',
    '3 طلب معلّق، منهم 1 عدّى مهلته — أقدمهم من 10 يوم.', '3 مهمة مفتوحة، منهم 2 فات ميعادها.', '4 ساعة إضافي معتمدة في شهر الرواتب، و1 حركة مستنية اعتماد.',
    '1 مسير في شهر الرواتب الجاري، و1 تنبيه قبل الاعتماد.']) assert.ok(html.includes(text), text)
  for (const href of ['/attendance', '/employees', '/leaves?date=2026-10-11', '/requests-console', '/tasks', '/attendance/overtime', '/payroll', '/reports', '/performance/cycles', '/recruitment/jobs']) {
    assert.ok(html.includes(`href="${href}"`), href)
  }
  // الحضور: الدايرة بكل حالة باسمها ورقمها، والفروع أول مستوى في «حسب المكان» (أكتر من فرع)، ورقم الحالة زرار بيفتح أصحابه
  for (const label of ['حاضر', 'متأخر', 'غايب', 'إجازة', 'مأمورية أو عن بعد', 'لسه مابصمش']) assert.ok(html.includes(label), label)
  assert.ok(html.includes('data-stacked-row="branch:3"') && html.includes('data-stacked-row="branch:4"') && html.includes('aria-label="غايب في فرع جدة: 3"'))
  assert.ok(html.includes('data-time-axis="rtl"') && html.includes('الغياب والتأخير حسب يوم الأسبوع') && html.includes('متوسط الحضور — 30 يوم'))
  // القوى العاملة: العدد شهر بشهر، تعيينات مقابل خروج، الدوران، مدة الخدمة، التوزيع بالفروع، والمواعيد القريبة — ومن غير خانة مستندات من غير صلاحيتها
  for (const text of ['عدد الموظفين شهر بشهر', 'تعيينات مقابل خروج', 'دوران العمالة', 'aria-label="دوران العمالة: 8.33%"', 'مدة الخدمة — المتوسط', 'أكتر من 5 سنين', 'توزيع الموظفين حسب المكان', 'فرع الرياض',
    'تجربة هتنتهي', 'عقود هتنتهي', 'و1 عقد منتهي', 'جوازات هتنتهي']) assert.ok(html.includes(text), text)
  assert.equal(html.includes('مستندات هتنتهي'), false, 'من غير صلاحية المستندات: مفيش خانة مستندات')
  // الطلبات والمهام والأداء والإضافي والرواتب
  for (const text of ['عدّى مهلة خطوته', 'معتمد ومااتنفذش', 'عمر الطلبات المعلّقة', 'أكتر من أسبوع', 'طلب إجازة', 'جوه ميعادها', 'فات ميعادها', 'سارة', 'الموارد البشرية',
    'مديرهم خلّص تقييمهم', 'ساعات معتمدة', 'قسم التجزئة', 'الصافي التقديري', '39,660', 'محسوب — مستني اعتماد', 'تنبيهات قبل الاعتماد']) assert.ok(html.includes(text), text)
  // تقييم الأداء في قسمه، فمش متكرر في «باقي الموديولات»
  const strip = html.split('data-modules-strip')[1]
  assert.ok(strip.includes('data-module-tile="recruitment"') && strip.includes('data-module-tile="documents"') && !strip.includes('data-module-tile="performance"'))
  // المبلغ: من غير حقله مفيش «قيمة المعتمد»، وبيه بيترسم
  assert.equal(html.includes('قيمة المعتمد'), false)
  const paid = renderDashboard(cards.DASHBOARD_CARDS.map(card => card.key), { ...answers, overtime: { ...answers.overtime, amounts: [{ currency: 'EGP', amount: 160 }],
    byUnit: [{ ...answers.overtime.byUnit[0], amounts: [{ currency: 'EGP', amount: 160 }] }] } })
  assert.ok(paid.includes('قيمة المعتمد') && paid.includes('>160<'))
  // صلاحية المستندات: الخانة بتترسم لما الحقل يرجع
  assert.ok(renderDashboard(['workforce'], { ...answers, workforce: { ...answers.workforce, documentsEnding: { expired: 1, count: 2, byType: [], list: [] } } }).includes('مستندات هتنتهي'))
  // الفترة المختارة ماشية في العناوين والمقارنة
  const week = renderDashboard(['attendance', 'trends'], { ...answers, trends: { ...answers.trends, window: 7 } }, 7)
  assert.ok(week.includes('متوسط الحضور — 7 يوم') && week.includes('عن الـ7 يوم اللي قبلهم') && week.includes('عن متوسط 7 يوم'))
})

test('DB-08: every section is gated exactly as its card — an account without a card sees neither its section nor its numbers, and the attention strip speaks only from what the account may see', () => {
  const answers = dashboardAnswers()
  // قارئ حضور بس (من غير عرض الموظفين ولا الطلبات ولا الرواتب): النبض والانتباه والحضور بس — حتى لو الردود التانية «موجودة»
  const attendanceOnly = renderDashboard(['attendance', 'absentLate', 'trends', 'overtime'], { ...answers, modules: { modules: [] } })
  assert.deepEqual(sectionsOf(attendanceOnly), ['pulse', 'attention', 'attendance', 'overtime'])
  for (const hidden of ['الصافي التقديري', 'عدد الموظفين شهر بشهر', 'طلبات معلّقة', 'مهام مفتوحة', 'في إجازة', 'عقود هتنتهي', 'طلب عدّى مهلة', 'مهمة فات ميعادها', 'عقده انتهى', 'مسير مستني اعتماد']) {
    assert.equal(attendanceOnly.includes(hidden), false, hidden)
  }
  assert.equal(attendanceOnly.split('data-kpi-row')[1].split('data-dashboard-section="attention"')[0].split('data-kpi').length - 1, 4, 'نسبة الحضور، غياب، تأخير، ساعات الإضافي')
  // موارد بشرية من غير رواتب: كل الأقسام غير الرواتب، ومفيش تنبيه رواتب في «محتاج انتباهك»
  const hr = renderDashboard(['attendance', 'absentLate', 'leaves', 'workforce', 'requests', 'tasks', 'trends'], answers)
  assert.deepEqual(sectionsOf(hr), ['pulse', 'attention', 'attendance', 'workforce', 'leaves', 'requests', 'tasks', 'modules'])
  assert.equal(hr.includes('الصافي التقديري') || hr.includes('مسير مستني اعتماد') || hr.includes('ساعات الإضافي'), false)
  // حساب الرواتب بس: قسم الرواتب وتنبيهه
  const pay = renderDashboard(['payroll'], { ...answers, modules: { modules: [] } })
  assert.deepEqual(sectionsOf(pay), ['pulse', 'attention', 'payroll'])
  assert.ok(pay.includes('الصافي التقديري') && pay.includes('موظفين صافيهم صفر أو بالسالب في مسير مستني اعتماد (1)') && pay.includes('data-attention="red"'))
  assert.equal(pay.includes('data-kpi"') || pay.includes('غياب'), false)
  // كارت المهام وجدوله مش موجود (available=false): لا مؤشر ولا قسم — وبلاطة الأداء لوحدها بترسم قسم «المهام والأداء» من غير رسوم المهام
  const noTasks = renderDashboard(['tasks'], { ...answers, tasks: { available: false, open: 0, overdue: 0, assignees: [] }, modules: { modules: [] } })
  assert.deepEqual(sectionsOf(noTasks), ['pulse', 'attention'])
  const performanceOnly = renderDashboard(['workforce'], answers)
  assert.ok(sectionsOf(performanceOnly).includes('tasks') && performanceOnly.includes('مديرهم خلّص تقييمهم') && !performanceOnly.includes('المهام حسب المسؤول') && !performanceOnly.includes('href="/tasks"'))
  // «محتاج انتباهك» من غير أي حاجة: سطر واحد هادي
  const calm = renderDashboard(['requests'], { requests: { pending: 0, overdue: 0, approvedNotExecuted: 0, oldestDays: 0, byType: [], byAge: answers.requests.byAge.map(band => ({ ...band, count: 0 })) }, modules: { modules: [] } })
  assert.ok(calm.includes('مفيش حاجة محتاجة انتباهك دلوقتي.') && !calm.includes('data-attention-items') && calm.includes('مفيش طلبات معلّقة.'))
})

test('DB-09: the attention rules and the comparisons are fixed arithmetic on the numbers the account already has — thresholds, order, links, and nothing from a section it cannot see', () => {
  const insights = require('../../src/lib/dashboard-insights')
  const answers = dashboardAnswers()
  const hrefs = Object.fromEntries(cards.DASHBOARD_CARDS.map(card => [card.key, card.href]))
  const all = insights.attentionItems({ hrefs, ...answers })
  // الأحمر الأول ثم الأصفر، وكل جملة بلينك الشاشة اللي بتتعالج فيها
  assert.deepEqual(all.map(item => [item.key, item.tone, item.href]), [
    ['absence:unit:1', 'red', '/attendance'], ['requests:overdue', 'red', '/requests-console'], ['tasks:overdue', 'red', '/tasks'], ['contracts:expired', 'red', '/employees'],
    ['payroll:0', 'red', '/payroll'], ['module:documents:فات ميعادها', 'red', '/employees/documents'],
    ['requests:old', 'yellow', '/requests-console'], ['requests:execution', 'yellow', '/requests-console'], ['overtime:pending', 'yellow', '/attendance/overtime'],
    ['contracts:ending', 'yellow', '/employees'], ['probation:ending', 'yellow', '/employees'], ['absence:period', 'yellow', '/reports'],
  ])
  assert.equal(all[0].text, 'إدارة المبيعات: غياب النهارده 37.5% (3 موظف) — متوسطه في الفترة 11.1%')
  assert.equal(all.find(item => item.key === 'absence:period').text, 'نسبة الغياب في آخر 30 يوم 15% — أعلى من الفترة اللي قبلها (10%)')
  // قسم الحساب مايشوفوش مش مبعوت = مفيش جملة منه
  assert.deepEqual(insights.attentionItems({ hrefs: { requests: '/requests-console' }, requests: answers.requests }).map(item => item.key), ['requests:overdue', 'requests:old', 'requests:execution'])
  assert.deepEqual(insights.attentionItems({ hrefs: {} }), [])
  // قاعدة غياب الوحدة: لازم مطلوب منهم 3 على الأقل، وغايبين 2 على الأقل، وضعف متوسطها، وزيادة 10 نقط — وكل حد لوحده بيوقفها
  const unit = (counts, usual) => insights.attentionItems({ hrefs,
    attendance: { ...answers.attendance, rows: [{ ...answers.attendance.rows[0], counts: { ...cards.emptyBucketCounts(), ...counts } }] },
    trends: { ...answers.trends, summary: { ...answers.trends.summary, absence: null }, units: [{ ...answers.trends.units[0], absence: usual }] } }).map(item => item.key)
  assert.deepEqual(unit({ present: 6, absent: 4 }, 10), ['absence:unit:1'], '40% مقابل 10%')
  assert.deepEqual(unit({ present: 1, absent: 1 }, 10), [], 'مطلوب منهم 2 بس')
  assert.deepEqual(unit({ present: 9, absent: 1 }, 2), [], 'غايب واحد')
  assert.deepEqual(unit({ present: 6, absent: 4 }, 25), [], '40% مش ضعف 25%')
  assert.deepEqual(unit({ present: 46, absent: 4 }, 3), [], '8% مقابل 3%: ضعف، بس الزيادة أقل من 10 نقط')
  assert.deepEqual(unit({ present: 6, absent: 4 }, null), [], 'وحدة من غير متوسط في الفترة')
  assert.deepEqual([insights.ATTENTION.unitMinRequired, insights.ATTENTION.unitMinAbsent, insights.ATTENTION.unitSpikeFactor, insights.ATTENTION.unitSpikePoints, insights.ATTENTION.periodRisePoints, insights.ATTENTION.maxItems],
    [3, 2, 2, 10, 3, 8])
  // غياب الفترة: 3 نقط فأكتر عن اللي قبلها
  const period = (now, before) => insights.attentionItems({ hrefs, trends: { ...answers.trends, units: [], summary: { ...answers.trends.summary, absence: now } },
    previous: { ...answers.previous, summary: { ...answers.previous.summary, absence: before } } }).length
  assert.deepEqual([period(13, 10), period(12.9, 10), period(8, 10), period(13, null)], [1, 0, 0, 0])
  // المقارنة: فرق أقل من نص = زي ما هو، والحكم بحسب «الأعلى أحسن»
  assert.deepEqual(insights.deltaOf(92, 90, true), { diff: 2, direction: 'up', good: true })
  assert.deepEqual(insights.deltaOf(15, 10, false), { diff: 5, direction: 'up', good: false })
  assert.deepEqual(insights.deltaOf(8, 10, false), { diff: -2, direction: 'down', good: true })
  assert.deepEqual(insights.deltaOf(90.2, 90, true), { diff: 0.2, direction: 'flat', good: null })
  assert.deepEqual(insights.deltaOf(14, 12, null), { diff: 2, direction: 'up', good: null })
  assert.deepEqual([insights.deltaOf(null, 10, true), insights.deltaOf(10, undefined, true)], [null, null])
  // نسبة يوم من خاناته، والأيام، ونمط أيام الأسبوع (موزون بالمطلوب منهم، والسبت أول)
  assert.deepEqual([insights.attendanceRateOf(answers.attendance.counts), insights.absenceRateOf(answers.attendance.counts), insights.attendanceRateOf(cards.emptyBucketCounts()), insights.attendanceRateOf(null)], [70, 30, null, null])
  assert.deepEqual([insights.shiftDay('2026-10-11', -30), insights.shiftDay('2026-03-01', -1), insights.shiftDay('2026-10-31', 1)], ['2026-09-11', '2026-02-28', '2026-11-01'])
  const week = insights.weekdayPattern([{ date: '2026-10-04', required: 10, attendance: 80, late: 10, absence: 20 }, { date: '2026-10-11', required: 30, attendance: 100, late: 0, absence: 0 },
    { date: '2026-10-10', required: 0, attendance: null, late: null, absence: null }])
  assert.deepEqual(week.map(day => day.label), ['السبت', 'الأحد', 'الاتنين', 'التلات', 'الأربع', 'الخميس', 'الجمعة'])
  assert.deepEqual(week[1], { weekday: 0, label: 'الأحد', required: 40, absence: 5, late: 2.5 })
  assert.deepEqual([week[0].required, week[0].absence], [0, null])
  // سطور الخلاصة للحالات الفاضية
  assert.equal(insights.attendanceTakeaway(null, null), 'مفيش أيام حضور محسوبة في الفترة دي.')
  assert.equal(insights.attendanceTakeaway({ ...answers.trends, summary: { ...answers.trends.summary, attendance: 90.2, absence: 9.8 } }, answers.previous), 'نسبة الحضور في آخر 30 يوم 90.2% والغياب 9.8% — زي الفترة اللي قبلها تقريبًا.')
  assert.deepEqual([insights.tasksTakeaway({ available: false, open: 0, overdue: 0, assignees: [] }), insights.tasksTakeaway({ available: true, open: 0, overdue: 0, assignees: [] }), insights.payrollTakeaway(null)],
    ['', 'مفيش مهام مفتوحة.', ''])
  // مفيش ذكاء اصطناعي ولا نداء: الملف صافي
  hasNot(read('src/lib/dashboard-insights.ts'), /apiFetch|fetch\(|openai|anthropic|import \{[^}]*\} from '\.\/api'/i)
})

test('DB-10: the charts — hand-drawn without a library, a fixed colour for every attendance state, every value also as text, a right-to-left time axis, and person cards instead of rows', () => {
  const React = require('../../node_modules/react')
  const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
  const charts = require('../../src/components/dashboard/charts')
  const render = (component, props) => renderToStaticMarkup(React.createElement(component, props))
  // معنى ثابت لكل لون: حاضر أخضر، متأخر أصفر، غايب أحمر، إجازة أزرق — وكل خانة بلونها هي (مفيش خانتين بنفس اللون)
  assert.deepEqual(charts.BUCKET_TONE, { present: 'green', late: 'yellow', absent: 'red', leave: 'blue', mission: 'cyan', pending: 'gray', rest: 'light', other: 'slate' })
  assert.deepEqual(Object.keys(charts.BUCKET_TONE), cards.ATTENDANCE_BUCKETS.map(bucket => bucket.key))
  assert.equal(new Set(Object.values(charts.BUCKET_TONE).map(tone => charts.TONE_FILL[tone])).size, 8)
  assert.deepEqual([charts.TONE_FILL.green, charts.TONE_FILL.yellow, charts.TONE_FILL.red, charts.TONE_FILL.blue], ['bg-success-500', 'bg-warning-500', 'bg-danger-500', 'bg-primary-500'])
  for (const bucket of cards.ATTENDANCE_BUCKETS.slice(0, 4)) assert.equal(charts.BUCKET_TONE[bucket.key], bucket.tone, 'نفس لون الخادم للحالات الأساسية')
  // الدايرة: كل شريحة باسمها ورقمها ونسبتها، والإجمالي في النص، والصفر مش زرار
  const donut = render(charts.Donut, { centerLabel: 'موظف', centerValue: '10', onPick: () => {}, segments: [
    { key: 'present', label: 'حاضر', value: 7, tone: 'green' }, { key: 'late', label: 'متأخر', value: 2, tone: 'yellow' }, { key: 'absent', label: 'غايب', value: 1, tone: 'red' },
    { key: 'leave', label: 'إجازة', value: 0, tone: 'blue' }] })
  assert.ok(donut.includes('role="img"') && donut.includes('aria-label="موظف: حاضر 7، متأخر 2، غايب 1"'))
  assert.deepEqual([...donut.matchAll(/w-9 text-end">(\d+)%/g)].map(match => Number(match[1])), [70, 20, 10, 0])
  assert.equal(donut.split('<button type="button"').length - 1, 3, 'الشريحة الصفر مش زرار')
  assert.equal(donut.split('<circle').length - 1, 4, 'حلقة الخلفية وتلات شرايح')
  // خط الاتجاه: خط لكل سلسلة، واليوم من غير قيمة فجوة (M جديدة)، والمتقطّع متقطّع — والزمن من اليمين للشمال (الأقدم يمين)
  const line = render(charts.LineChart, { label: 'اتجاه', labels: ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'], series: [
    { key: 'a', label: 'حضور', tone: 'green', values: [90, null, 80, 100] }, { key: 'l', label: 'تأخير', tone: 'yellow', dashed: true, values: [5, 6, 7, 8] }] })
  const paths = [...line.matchAll(/<path d="([^"]+)"[^>]*>/g)]
  assert.equal(paths.length, 2)
  assert.equal(paths[0][1].split('M').length - 1, 2, 'فجوة = جزئين')
  assert.equal(paths[1][1].split('M').length - 1, 1)
  assert.ok(paths[1][0].includes('stroke-dasharray="6 4"') && !paths[0][0].includes('stroke-dasharray'))
  assert.ok(line.includes('aria-label="اتجاه"') && line.includes('>100%<') && line.includes('>0%<') && line.includes('dir="ltr"') && line.includes('data-time-axis="rtl"'))
  const xs = [...paths[1][1].matchAll(/[ML]([\d.]+) /g)].map(match => Number(match[1]))
  assert.deepEqual([xs.length, xs[0] > xs[1], xs[1] > xs[2], xs[2] > xs[3]], [4, true, true, true], 'أول يوم على اليمين')
  assert.ok(line.includes('الأقدم يمين والأحدث شمال'))
  // سلسلة أعداد (مش نسب): حدود المحور حوالين القيم، والعلامات أعداد
  assert.deepEqual([charts.niceDomain([150, 160, null]), charts.niceDomain([5, 5]), charts.niceDomain([0, 2]), charts.niceDomain([])], [[148, 162], [4, 6], [0, 3], [0, 1]])
  const headcount = render(charts.LineChart, { label: 'العدد', suffix: '', domain: [148, 162], tick: label => label.slice(5), labels: ['2026-09', '2026-10'], series: [{ key: 'h', label: 'العدد', tone: 'blue', values: [150, 160] }] })
  assert.ok(headcount.includes('>148<') && headcount.includes('>162<') && headcount.includes('>09<') && headcount.includes('>10<'))
  // الخط الصغير: من غير محاور، والأقدم يمين، ونقطة على آخر قيمة — ومن غير نقطتين مفيش رسمة
  const spark = render(charts.Sparkline, { values: [1, null, 3, 5], tone: 'green' })
  assert.ok(spark.includes('data-chart="spark"') && spark.includes('aria-hidden="true"') && spark.includes('<circle') && spark.includes('text-success-500'))
  const sparkXs = [...spark.matchAll(/[ML]([\d.]+) /g)].map(match => Number(match[1]))
  assert.ok(sparkXs[0] > sparkXs[sparkXs.length - 1])
  assert.equal(render(charts.Sparkline, { values: [null, 4], tone: 'green' }), '')
  // الفرق عن الفترة: سهم + رقم + وصف، واللون بحكم الحركة مش باتجاهها
  const worse = render(charts.DeltaBadge, { delta: { diff: 5, direction: 'up', good: false }, unit: 'نقطة', caption: 'عن الفترة اللي قبلها' })
  assert.ok(worse.includes('data-delta="up"') && worse.includes('text-danger-600') && worse.includes('زاد 5 نقطة') && worse.includes('عن الفترة اللي قبلها') && worse.includes('<svg'))
  assert.ok(render(charts.DeltaBadge, { delta: { diff: -2.5, direction: 'down', good: true }, unit: 'نقطة', caption: 'x' }).includes('text-success-600'))
  assert.ok(render(charts.DeltaBadge, { delta: { diff: 0.2, direction: 'flat', good: null }, caption: 'x' }).includes('زي ما هو'))
  // الأعمدة الأفقية: الطول بنسبة القيمة لأكبر قيمة (أو للحد المبعوت)، والصف زرار لما بينزل لمستوى تحته بس
  const bars = render(charts.HBars, { empty: 'فاضي', rows: [{ key: 'a', label: 'المبيعات', value: 50, tone: 'blue', onClick: () => {} }, { key: 'b', label: 'المالية', value: 25, tone: 'red', hint: 'متأخر 2' }] })
  assert.deepEqual([...bars.matchAll(/style="width:(\d+)%"/g)].map(match => Number(match[1])), [100, 50])
  assert.ok(bars.split('<button type="button"').length - 1 === 1 && bars.includes('متأخر 2') && bars.includes('bg-danger-500'))
  assert.ok(render(charts.HBars, { empty: 'مفيش بيانات', rows: [] }).includes('مفيش بيانات'))
  assert.deepEqual([...render(charts.HBars, { empty: '', max: 100, rows: [{ key: 'a', label: 'أ', value: 40, tone: 'green' }] }).matchAll(/style="width:(\d+)%"/g)].map(match => Number(match[1])), [40])
  // الصفوف المقسّمة: اسم المكان زرار لو تحته مستوى، وكل حالة باسمها ورقمها زرار بيفتح أصحابها، والصفر مش مرسوم، والصف اللي مايتفلترش من غير أزرار
  const stackedRows = render(charts.StackedRows, { empty: 'فاضي', onPick: () => {}, rows: [
    { key: 'unit:1', label: 'إدارة المبيعات', onOpen: () => {}, segments: [{ key: 'present', label: 'حاضر', value: 6, tone: 'green' }, { key: 'absent', label: 'غايب', value: 2, tone: 'red' }, { key: 'late', label: 'متأخر', value: 0, tone: 'yellow' }] },
    { key: 'team:5', label: 'فريق المعرض', segments: [{ key: 'present', label: 'حاضر', value: 3, tone: 'green' }] },
    { key: 'branch:none', label: 'من غير فرع', pickable: false, segments: [{ key: 'present', label: 'حاضر', value: 1, tone: 'green' }] }] })
  assert.ok(stackedRows.includes('aria-label="غايب في إدارة المبيعات: 2"') && stackedRows.includes('aria-label="حاضر في فريق المعرض: 3"') && !stackedRows.includes('متأخر'))
  assert.ok(stackedRows.includes('<span class="font-medium text-gray-800 truncate">فريق المعرض</span>') && stackedRows.includes('hover:underline text-start truncate">إدارة المبيعات</button>'))
  assert.equal(stackedRows.split('<button type="button"').length - 1, 4, 'اسم إدارة + 3 أرقام حالة')
  assert.ok(stackedRows.includes('width:75%') && stackedRows.includes('width:25%'))
  assert.ok(render(charts.StackedRows, { empty: 'مفيش موظفين', rows: [] }).includes('مفيش موظفين'))
  // الأعمدة المزدوجة والشريط المقسّم والحلقة وبلاطة الرقم والمؤشر
  const pairs = render(charts.PairedColumns, { label: 'تعيينات مقابل خروج', first: { label: 'تعيين', tone: 'green' }, second: { label: 'خروج', tone: 'red' },
    groups: [{ key: '2026-09', label: 'سبتمبر', first: 4, second: 2 }, { key: '2026-10', label: 'أكتوبر', first: 0, second: 1 }] })
  assert.ok(pairs.includes('aria-label="تعيينات مقابل خروج: سبتمبر تعيين 4 خروج 2، أكتوبر تعيين 0 خروج 1"') && pairs.includes('height:100%') && pairs.includes('height:50%') && pairs.includes('height:0%'))
  assert.ok(render(charts.PairedColumns, { label: 'x', suffix: '%', first: { label: 'غياب', tone: 'red' }, second: { label: 'تأخير', tone: 'yellow' }, groups: [{ key: '0', label: 'الأحد', first: 12.5, second: 0 }] }).includes('>12.5%<'))
  const stacked = render(charts.StackedBar, { label: 'عمر الطلبات', segments: [{ key: 'new', label: 'أقل من 3 أيام', value: 3, tone: 'green' }, { key: 'old', label: 'أكتر من أسبوع', value: 1, tone: 'red' }] })
  assert.ok(stacked.includes('width:75%') && stacked.includes('width:25%') && stacked.includes('أكتر من أسبوع'))
  const ring = render(charts.Ring, { value: 8.33, label: 'دوران العمالة', tone: 'blue', caption: '1 خروج' })
  assert.ok(ring.includes('aria-label="دوران العمالة: 8.33%"') && ring.includes('>8.3%<') && ring.includes('1 خروج') && ring.split('<circle').length - 1 === 2)
  assert.ok(render(charts.Ring, { value: null, label: 'دوران العمالة', tone: 'blue' }).includes('>—<'))
  const tile = render(charts.StatTile, { label: 'عقود هتنتهي', value: 3, tone: 'yellow', onClick: () => {} })
  assert.ok(tile.startsWith('<button type="button"') && tile.includes('text-warning-600">3<') && tile.includes('عقود هتنتهي'))
  const zero = render(charts.StatTile, { label: 'عقود هتنتهي', value: 0, tone: 'yellow', onClick: () => {} })
  assert.ok(zero.startsWith('<div') && zero.includes('text-gray-600">0<'), 'الصفر رمادي ومش زرار')
  const kpi = render(charts.Kpi, { label: 'غياب', value: '5', hint: '2 لسه مابصمش', tone: 'red', icon: null, onClick: () => {}, spark: [1, 2, 3],
    delta: { value: { diff: 5, direction: 'up', good: false }, unit: 'نقطة', caption: 'عن متوسط 30 يوم' } })
  assert.ok(kpi.includes('flex flex-wrap items-end justify-between'), 'الخط الصغير بينزل تحت الرقم في الكارت الضيق')
  assert.ok(kpi.startsWith('<button type="button"') && kpi.includes('data-kpi') && kpi.includes('>5<') && kpi.includes('2 لسه مابصمش') && kpi.includes('data-chart="spark"') && kpi.includes('زاد 5 نقطة'))
  assert.ok(render(charts.Kpi, { label: 'الموظفين', value: '10', tone: 'blue', icon: null }).startsWith('<div class="block w-full'))
  assert.ok(render(charts.Kpi, { label: 'الموظفين', value: '—', tone: 'blue', icon: null, loading: true }).includes('animate-pulse'), 'هيكل تحميل بدل الرقم')
  // اللوحة الجانبية: كروت أشخاص (الاسم، المسمى، حالته) مش صفوف — أقصاها 50، والعدّ مكتوب، ولينك الشاشة التفصيلية، والتليفون لو مبعوت بس
  const panel = require('../../src/components/dashboard/PeoplePanel')
  const people = Array.from({ length: 60 }, (_, index) => ({ id: index + 1, name: `موظف ${index + 1}`, line: 'مندوب مبيعات', state: { label: 'غايب', tone: 'red' }, note: 'وردية الصبح',
    ...(index === 0 ? { phone: '+966 50 123 4567' } : index === 1 ? { phone: '0501234567' } : {}) }))
  const drawer = render(panel.PeoplePanel, { title: 'غايب — فريق المعرض', people, total: 120, href: '/attendance', hrefLabel: 'الكل في شاشة الحضور', onClose: () => {} })
  assert.equal(drawer.split('data-person-card').length - 1, 50)
  assert.ok(drawer.includes('role="dialog"') && drawer.includes('aria-label="غايب — فريق المعرض"') && drawer.includes('ظاهر 50 من 120') && drawer.includes('href="/attendance"') && drawer.includes('الكل في شاشة الحضور'))
  assert.ok(drawer.includes('مندوب مبيعات') && drawer.includes('غايب') && drawer.includes('bg-danger-500'))
  hasNot(drawer, /<(table|tr|td|th|li)[\s>]/, 'كروت مش صفوف')
  assert.equal(drawer.split('data-contact').length - 1, 2, 'أزرار الاتصال لصاحب الرقم بس')
  assert.ok(drawer.includes('href="tel:+966501234567"') && drawer.includes('href="https://wa.me/966501234567"') && drawer.includes('href="tel:0501234567"') && drawer.includes('href="sms:0501234567"'))
  assert.ok(render(panel.PeoplePanel, { title: 'x', people: [], total: 0, onClose: () => {} }).includes('مفيش أسماء هنا.'))
  assert.ok(render(panel.PeoplePanel, { title: 'x', people: [], total: 0, loading: true, onClose: () => {} }).includes('aria-busy="true"'))
  const sources = dashboardSources()
  hasNot(Object.values(sources).join('\n'), /recharts|chart\.js|from 'd3/)
})

test('DB-11: the server side of the statistics dashboard — the two new routes sit behind their card, return counts only, and the new parameters accept only their fixed values', () => {
  const controller = read('api/src/dashboard/dashboard-cards.controller.ts'), service = read('api/src/dashboard/dashboard-cards.service.ts')
  // المسارين الجداد بفحص كارتهم (صلاحية + موديول) وسياق النطاق والفلتر بتاع باقي الكروت
  has(controller, /@Get\('branches'\)\n  async branches\([^\n]*\n    const date = this\.cards\.dayOf\(query\.date\)\n    return this\.cards\.branchesCard\(await this\.open\('attendance', user, request, query\), date\)/)
  has(controller, /@Get\('workforce\/insights'\)\n  async workforceInsights\([^\n]*\n    return this\.cards\.workforceInsights\(await this\.open\('workforce', user, request, query\)\)/)
  has(controller, /this\.cards\.attendanceEmployees\(await this\.open\('attendance', user, request, query\), date, query\.group, query\.bucket, query\.limit\)/)
  has(controller, /this\.cards\.trendsCard\(await this\.open\('trends', user, request, query\), date, query\.group, query\.days\)/)
  // أعداد بس: مفيش اسم موظف ولا رقمه ولا تليفونه ولا مبلغ في الدالتين — واسم الفرع من شجرة نطاق القارئ بس
  const body = name => { const start = service.indexOf(`  async ${name}(`); assert.ok(start > 0, name); return service.slice(start, service.indexOf('\n  }\n', start)) }
  for (const name of ['branchesCard', 'workforceInsights']) {
    hasNot(body(name), /fullName|employeeCode|jobTitle|phone|amount|personRow|person\.id\b/, `${name}: أعداد بس`)
    has(body(name), /ctx\.branchName\(/, `${name}: اسم الفرع من نطاق القارئ`)
    has(body(name), /for \(const person of ctx\.people\)/, `${name}: موظفين نطاق الحساب وفلتره بس`)
  }
  has(body('branchesCard'), /const states = await this\.daySnapshot\(date, ctx\.scope\)/)
  has(body('workforceInsights'), /const cte = await this\.spansCte\(ctx, params\)/, 'نفس فترات الخدمة بنطاقها وفلترها')
  has(body('workforceInsights'), /rate: turnoverRate\(leavers, atStart, atEnd\)/, 'الدوران بدالة قاموس المؤشرات')
  has(service, /const leaveTypes = \[\.\.\.byType\.entries\(\)\]\.map\(\(\[code, cell\]\) => \(\{ code, name: typeName\.get\(code\) \?\? code, days: round2\(cell\.days\), employees: cell\.people\.size \}\)\)/)
  // الفترة: 7 أو 30 أو 90 بس (من غيرها 30 زي الأول) — وأي قيمة تانية مرفوضة
  assert.deepEqual([undefined, '', '7', '30', '90'].map(cards.trendDaysOf), [30, 30, 7, 30, 90])
  for (const bad of ['0', '31', '365', '-7', '7.0', '7 ', 'abc', 7, ['7'], '9999']) assert.equal(cards.trendDaysOf(bad), null, String(bad))
  has(service, /const window = trendDaysOf\(rawDays\)\n    if \(window === null\) throw new BadRequestException\('الفترة المتاحة: 7 أو 30 أو 90 يوم'\)/)
  // حد الأسماء: من 1 للحد الأقصى (من غيره الحد كله زي الأول)
  assert.deepEqual([undefined, '', '1', '50', '500'].map(raw => cards.listLimitOf(raw, 500)), [500, 500, 1, 50, 500])
  for (const bad of ['0', '501', '-1', '1.5', 'x', 50, '00050', '99999']) assert.equal(cards.listLimitOf(bad, 500), null, String(bad))
  has(service, /const limit = listLimitOf\(rawLimit, LIST_LIMIT\)\n    if \(limit === null\) throw new BadRequestException/)
  // مدة الخدمة وشهور السلسلة
  assert.deepEqual([0, 2, 3, 11, 12, 35, 36, 59, 60, 400].map(months => cards.tenureBandOf(months).key), ['lt3m', 'lt3m', 'm3_12', 'm3_12', 'y1_3', 'y1_3', 'y3_5', 'y3_5', 'y5', 'y5'])
  assert.deepEqual([cards.monthsBetween('2024-01-01', '2026-10-12'), cards.monthsBetween('2026-07-13', '2026-10-12'), cards.monthsBetween('2026-07-12', '2026-10-12'), cards.monthsBetween('2026-10-12', '2026-10-12'),
    cards.monthsBetween('2026-12-01', '2026-10-12')], [33, 2, 3, 0, 0])
  assert.deepEqual(cards.lastMonths('2026-02-10', 4), ['2025-11', '2025-12', '2026-01', '2026-02'])
  assert.equal(cards.lastMonths('2026-10-12', 12).length, 12)
  assert.deepEqual([cards.monthEndOf('2026-02', '2026-10-12'), cards.monthEndOf('2024-02', '2026-10-12'), cards.monthEndOf('2026-09', '2026-10-12'), cards.monthEndOf('2026-10', '2026-10-12')],
    ['2026-02-28', '2024-02-29', '2026-09-30', '2026-10-12'])
})
