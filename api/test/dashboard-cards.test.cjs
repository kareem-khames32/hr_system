'use strict'
// B-ADD.3: كروت لوحة الإدارة — فحص من غير قاعدة (الدورة الفعلية في dashboard-cards.integration.cjs):
//  DB-01) سجل الكروت: كل كارت بصلاحية موجودة في كتالوج الصلاحيات وموديول مسجّل، وكارت الفلوس بصلاحية الرواتب بس.
//  DB-02) خانات حضور اليوم: كل حالة من حالات محرك الحضور في خانة واحدة، بقاعدة «حضر فعلًا» بتاعة كروت اللوحة القديمة.
//  DB-03) «إدارة ← قسم ← فريق»: صفوف كل مستوى، وعضوية كل مجموعة، ونقطة بداية الكارت من فلتر اللوحة.
//  DB-04) الخادم: كل المسارات ورا صلاحية اللوحة وكل مسار بيفحص كارته، والمبلغ والتليفون حقول بتتضاف بالصلاحية بس، والأرقام من القاموس.
//  DB-05) الواجهة: بنود الإخلاء مش في اللوحة (وموجودة في «مهامي» وصندوق الموافقات)، وفلتر واحد بالأداة الموحدة واليوم، وكل كارت بلينك
//         «شوف الكل»، و«اتصل/راسل» لينك من المتصفح، وقواعد الموبايل.
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
  assert.equal(handlers.length, 11)
  const guarded = handlers.filter(text => /this\.open\('(attendance|absentLate|leaves|workforce|requests|tasks|overtime|payroll|trends)', user, request, query\)/.test(text))
  assert.equal(guarded.length, 10)
  has(handlers.find(text => !guarded.includes(text)), /^\)\n  access\(/)
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
  assert.ok(app.includes('DashboardCardsController,') && app.includes('DashboardCardsService]'))
})

test('DB-05: the admin dashboard screen — no clearance items, one unified filter with a date, per-card links, contact links and mobile rules', () => {
  const page = read('src/app/page.tsx'), admin = read('src/components/dashboard/AdminDashboard.tsx'), shared = read('src/components/dashboard/cards/shared.tsx')
  const attendance = read('src/components/dashboard/cards/AttendanceCards.tsx'), people = read('src/components/dashboard/cards/PeopleCards.tsx')
  const work = read('src/components/dashboard/cards/WorkCards.tsx'), lib = read('src/lib/dashboard-api.ts')
  // بنود الإخلاء مش في اللوحة (لا لوحة الإدارة ولا غلافها)، وموجودة في «مهامي» وصندوق الموافقات وملف إنهاء الخدمة
  hasNot(page, /MyClearanceItems|fetchMyClearanceItems|my-items/)
  for (const file of [admin, shared, attendance, people, work, lib]) hasNot(file, /MyClearanceItems|fetchMyClearanceItems|my-items|clearance/i)
  assert.ok(fs.existsSync(path.join(root, 'src/components/dashboard/MyClearanceItems.tsx')), 'المكوّن لسه موجود لصندوق الموافقات')
  has(read('src/app/approvals-inbox/page.tsx'), /<MyClearanceItems \/>/)
  has(read('src/app/my/tasks/page.tsx'), /data-clearance-items/)
  has(read('api/src/tasks/tasks.service.ts'), /await this\.offboarding\.myItems\(user\)/)
  // مبدّل اللوحتين زي ما هو: لوحة الإدارة بصلاحيتها، وغيرها لوحة الموظف
  has(page, /const allowed = can\('dashboard\.view_all'\)\n    setCanAdmin\(allowed\)\n    setView\(allowed \? 'admin' : 'employee'\)/)
  has(page, /\{view === 'employee' \? \(\n          <EmployeeHome \/>\n        \) : \(\n          <>\n[^\n]*\n            <AdminDashboard \/>/)
  // أرقام اللوحة القديمة اللي من غير صلاحية كارت ولا فلتر مابقتش مرسومة
  hasNot(page, /StatsCards|AttendanceChart|DepartmentStats/)
  // فلتر واحد بالأداة الموحدة + اليوم (النهارده افتراضي، والمستقبل مش متاح)
  has(admin, /const org = useOrgFilter\(\)/); assert.equal(admin.split('useOrgFilter(').length - 1, 1)
  has(admin, /\{org\.element\}/)
  has(admin, /setAccess\(value\); setDate\(value\.today\)/)
  has(admin, /type="date"[\s\S]{0,200}max=\{access\.today\}/)
  has(admin, /if \(next && next <= access\.today\) setDate\(next\)/)
  for (const file of [attendance, people, work]) hasNot(file, /useOrgFilter/, 'الكروت بتاخد فلتر اللوحة، مش فلتر لكل كارت')
  // الكروت اللي بتترسم = اللي الخادم بعتها بس، والتسعة ليهم مكوّنات
  has(admin, /CARD_COMPONENTS\.filter\(\(\[key\]\) => hrefOf\.has\(key\)\)/)
  for (const key of ['attendance', 'absentLate', 'leaves', 'workforce', 'requests', 'tasks', 'overtime', 'payroll', 'trends']) assert.ok(admin.includes(`['${key}', `), key)
  // كل كارت: «شوف الكل» للشاشة الكاملة، وتحميله وخطؤه لوحده
  has(shared, /<ModuleLink href=\{href\}[^\n]*fallback=\{null\}>\n            شوف الكل/)
  assert.equal([attendance, people, work].join('\n').split('<CardShell cardKey="').length - 1, 9)
  assert.equal([attendance, people, work].join('\n').split(' href={').filter(part => part.startsWith('href}') || part.startsWith('`${href}?date=${filter.date}`}')).length, 9)
  has(people, /href=\{`\$\{href\}\?date=\$\{filter\.date\}`\}/, 'شاشة الإجازات بتفتح على نفس اليوم')
  // الضغط على رقم بيفتح الأسماء: اسم، فريق، وردية، أول بصمة، الحالة
  has(attendance, /fetchAttendanceEmployees\(filter, bucket, group\)/)
  for (const head of ['الاسم', 'الفريق', 'الوردية', 'أول بصمة', 'الحالة']) assert.ok(attendance.includes(`<th className="px-3 py-2 text-start">${head}</th>`), head)
  has(attendance, /drill\.open\(\{ group: row\.group, name: row\.name \}\)/)
  // «اتصل/راسل»: لينك من المتصفح برقم الملف، وبيتعرض لو الخادم قال إن الحساب له التليفون
  has(attendance, /\{data\?\.contact && <ContactButtons person=\{row\} \/>\}/)
  assert.deepEqual([api.telLink('+966 50 123 4567'), api.telLink('0501234567'), api.telLink(''), api.telLink('12'), api.telLink(null)], ['tel:+966501234567', 'tel:0501234567', null, null, null])
  assert.deepEqual([api.whatsappLink('+966 50 123 4567'), api.whatsappLink('00201001234567'), api.whatsappLink('0501234567'), api.whatsappLink(undefined)],
    ['https://wa.me/966501234567', 'https://wa.me/201001234567', null, null])
  // المبلغ: بيتعرض لو الحقل راجع من الخادم بس — ومفيش شرط صلاحية في الواجهة يقوم مقامه
  has(work, /\{data\.amounts && \(/)
  hasNot([admin, attendance, people, work].join('\n'), /can\('payroll\.view'\)/)
  // الرسم: SVG بسيط من غير مكتبة
  has(attendance, /<svg viewBox=/); hasNot([attendance, people, work, shared].join('\n'), /recharts|chart\.js|from 'd3/)
  // الموبايل: مفيش اتجاه فيزيائي، وكل جدول جوه تمرير أفقي، والنافذة جوه الشاشة بتمرير داخلي، وكل شبكة 3 أعمدة أو أكتر ليها بديل
  for (const [name, source] of Object.entries({ admin, shared, attendance, people, work })) {
    hasNot(source, /(^|["'`\s])(ml|mr|pl|pr)-\d|(^|["'`\s])text-(left|right)(?=["'`\s])|(^|["'`\s])(left|right)-\d/m, `${name}: اتجاه فيزيائي`)
    for (const match of source.matchAll(/<table\b/g)) assert.ok(source.slice(Math.max(0, match.index - 160), match.index).includes('overflow-x-auto'), `${name}: جدول من غير تمرير أفقي`)
    for (const cls of [...source.matchAll(/className="([^"]*)"/g)].map(m => m[1])) {
      const tokens = cls.split(/\s+/)
      if (tokens.some(token => /^grid-cols-(\d+)$/.test(token) && Number(token.slice(10)) >= 3)) {
        assert.ok(tokens.some(token => /^(sm|md|lg|xl):grid-cols-\d+$/.test(token)), `${name}: «${cls}» مالهاش بديل للشاشة الصغيرة`)
      }
      hasNot(cls, /(^|\s)col-span-([2-9]|1[0-2])(\s|$)/, `${name}: col-span من غير بادئة`)
    }
  }
  has(shared, /<div className="fixed inset-0 z-50 bg-black\/50 flex items-center justify-center p-4" onClick=\{onClose\}>\n      <div className="bg-white rounded-2xl w-full max-w-3xl p-5 shadow-xl max-h-\[90vh\] overflow-y-auto" role="dialog" aria-modal="true"/)
  has(admin, /<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">/)
  // نداءات اللوحة في ملفها (lib/api.ts مالوش علاقة بالفلتر الموحد)
  has(lib, /import \{ orgFilterQuery, type OrgFilterParams \} from '\.\/org-filter'/)
  hasNot(read('src/lib/api.ts'), /dashboard\/cards/)
})

test('DB-06: the shared card pieces render — a coloured number with its label, the level path, and the dashboard shell before the cards load', () => {
  const React = require('../../node_modules/react')
  const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
  const shared = require('../../src/components/dashboard/cards/shared')
  const render = (component, props, ...children) => renderToStaticMarkup(React.createElement(component, props, ...children))
  // الحالة بلون ومعاها رقم: الرقم بلونه، والتسمية جنب نقطة اللون، والزرار لما بيفتح تفاصيل بس
  const absent = render(shared.Stat, { label: 'غايب', value: '3', tone: 'red', onClick: () => {} })
  assert.ok(absent.startsWith('<button type="button"') && absent.includes('text-danger-600">3<') && absent.includes('bg-danger-500') && absent.includes('غايب'))
  assert.ok(render(shared.Stat, { label: 'حاضر', value: '9', tone: 'green' }).startsWith('<div class="flex flex-col'))
  assert.equal(render(shared.Count, { value: 0, tone: 'red', label: 'غايب', onClick: () => {} }), '<span class="text-gray-300">0</span>')
  assert.ok(render(shared.Count, { value: 2, tone: 'yellow', label: 'متأخر في فريق المعرض', onClick: () => {} }).includes('aria-label="متأخر في فريق المعرض: 2"'))
  assert.deepEqual([shared.rate(null), shared.rate(36.36), shared.num(1234)], ['—', '36.36%', '1,234'])
  // مسار المستوى المفتوح: «الكل» بيرجّع لأول مستوى، وآخر مستوى نص مش زرار
  const pathHtml = render(shared.DrillPath, { path: [{ group: 'unit:1', name: 'إدارة المبيعات' }, { group: 'unit:2', name: 'قسم التجزئة' }], start: null, onBack: () => {} })
  assert.ok(pathHtml.includes('>الكل</button>') && pathHtml.includes('>إدارة المبيعات</button>') && pathHtml.includes('<span class="font-medium text-gray-700">قسم التجزئة</span>'))
  assert.equal(render(shared.DrillPath, { path: [], start: null, onBack: () => {} }), '')
  assert.ok(render(shared.DrillPath, { path: [], start: { group: 'unit:1', name: 'إدارة المبيعات', level: 'إدارة' }, onBack: () => {} }).includes('إدارة المبيعات'))
  // النافذة: جوه الشاشة وبتمرير داخلي
  const modal = render(shared.ListModal, { title: 'غايب — فريق المعرض', onClose: () => {} }, 'الأسماء')
  assert.ok(modal.includes('role="dialog"') && modal.includes('aria-label="غايب — فريق المعرض"') && modal.includes('max-h-[90vh] overflow-y-auto') && modal.includes('الأسماء'))
  // الكارت: خطؤه وإعادة محاولته لوحده، ومن غير لينك لما مفيش شاشة كاملة
  const failed = render(shared.CardShell, { title: 'الطلبات', loading: false, error: 'تعذر تحميل الكارت', onRetry: () => {}, cardKey: 'requests' }, null)
  assert.ok(failed.includes('data-dashboard-card="requests"') && failed.includes('role="alert"') && failed.includes('إعادة المحاولة') && !failed.includes('شوف الكل'))
  assert.ok(render(shared.CardShell, { title: 'الطلبات', loading: true, error: '', onRetry: () => {}, cardKey: 'requests' }, null).includes('aria-busy="true"'))
  // اللوحة قبل ما الكروت المتاحة تتعرف: مفيش نداء كارت ولا كارت مرسوم
  const AdminDashboard = require('../../src/components/dashboard/AdminDashboard').default
  const shell = render(AdminDashboard, {})
  assert.ok(shell.includes('aria-busy="true"') && !shell.includes('data-dashboard-card'))
})

test('DB-07: each of the nine cards renders its numbers from the server answer — and shows money or phones only when the answer carries them', () => {
  const React = require('../../node_modules/react')
  const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
  const shared = require('../../src/components/dashboard/cards/shared')
  const attendance = require('../../src/components/dashboard/cards/AttendanceCards')
  const people = require('../../src/components/dashboard/cards/PeopleCards')
  const work = require('../../src/components/dashboard/cards/WorkCards')
  // الرسم من غير متصفح: نداء الكارت متبدّل برد جاهز (شكل رد الخادم في dashboard-cards.integration.cjs)
  const original = shared.useCard
  const show = (component, data, extra = {}) => {
    shared.useCard = () => ({ data, loading: false, error: '', reload: () => {} })
    try {
      return renderToStaticMarkup(React.createElement(component, { filter: { org: {}, date: '2026-10-11' }, filterKey: 'k', href: '/attendance',
        access: { today: '2026-10-11', cards: [], money: false, contact: false, documents: false, buckets: cards.ATTENDANCE_BUCKETS }, ...extra }))
    } finally { shared.useCard = original }
  }
  const counts = { present: 3, late: 1, absent: 3, leave: 1, mission: 2, pending: 1, rest: 0, other: 0 }
  const row = (group, name, level, expandable, total) => ({ group, kind: group.split(':')[0], id: 1, name, level, branchName: null, expandable, total })
  const today = show(attendance.AttendanceTodayCard, { date: '2026-10-11', today: '2026-10-11', isToday: true, group: null, total: 11, counts,
    rows: [{ ...row('unit:1', 'إدارة المبيعات', 'إدارة', true, 10), counts }, { ...row('none', 'من غير قسم', '', false, 1), counts: { ...counts, absent: 0 } }] })
  assert.ok(today.includes('حضور النهارده') && today.includes('data-attendance-levels'))
  for (const label of ['حاضر', 'متأخر', 'غايب', 'إجازة', 'مأمورية أو عن بعد', 'لسه مابصمش', 'راحة']) assert.ok(today.includes(label), label)
  assert.equal(today.includes('>أخرى<'), false, 'خانة «أخرى» بتظهر لما فيها حد بس')
  assert.ok(today.includes('aria-label="غايب في إدارة المبيعات: 3"') && today.includes('قبل ميعاد الوردية'))
  assert.ok(today.includes('<button type="button" class="font-medium text-primary-600 hover:underline text-start">إدارة المبيعات</button>'), 'الإدارة بتتفتح')
  assert.ok(today.includes('<span class="font-medium text-gray-800">من غير قسم</span>'), 'آخر مستوى مش زرار')
  assert.ok(show(attendance.AttendanceTodayCard, { date: '2026-10-09', today: '2026-10-11', isToday: false, group: null, total: 0, counts: cards.emptyBucketCounts(), rows: [] },
    { filter: { org: {}, date: '2026-10-09' } }).includes('حضور يوم'))

  const person = (id, name, extra = {}) => ({ id, name, code: null, jobTitle: null, unit: 'قسم التجزئة', team: 'فريق المعرض', shift: 'وردية الصبح (08:00–16:00)', firstPunch: null,
    bucket: 'absent', status: 'غايب', detail: null, lateMinutes: 0, ...extra })
  const team = { name: 'فريق المعرض', unit: 'قسم التجزئة', absent: [person(3, 'سارة', { phone: '+966501234567' }), person(4, 'علي', { phone: '0501234567' }), person(5, 'منى', { phone: null })],
    late: [person(2, 'عمر', { bucket: 'late', status: 'متأخر', firstPunch: '08:25', lateMinutes: 25, phone: '+201001234567' })] }
  const withPhones = show(attendance.AbsentLateCard, { date: '2026-10-11', isToday: true, absent: 3, late: 1, contact: true, truncated: false, teams: [team] })
  assert.ok(withPhones.includes('data-absent-team') && withPhones.includes('سارة') && withPhones.includes('متأخر 25 د'))
  assert.ok(withPhones.includes('href="tel:+966501234567"') && withPhones.includes('href="https://wa.me/966501234567"'))
  assert.ok(withPhones.includes('href="tel:0501234567"') && withPhones.includes('href="sms:0501234567"'), 'رقم محلي: اتصال ورسالة نصية')
  assert.ok(withPhones.includes('مفيش رقم في الملف'))
  // من غير صلاحية التليفون: الخادم مابيبعتوش، ومفيش أزرار
  const strip = list => list.map(item => { const copy = { ...item }; delete copy.phone; return copy })
  const noPhones = show(attendance.AbsentLateCard, { date: '2026-10-11', isToday: true, absent: 3, late: 1, contact: false, truncated: false,
    teams: [{ ...team, absent: strip(team.absent), late: strip(team.late) }] })
  assert.ok(noPhones.includes('سارة') && !noPhones.includes('data-contact') && !noPhones.includes('tel:') && !noPhones.includes('wa.me'))

  const rates = (required, attendanceRate, late, absence) => ({ required, attendance: attendanceRate, late, absence })
  const trends = show(attendance.TrendsCard, { from: '2026-09-12', to: '2026-10-11', group: null, summary: { ...rates(11, 63.64, 18.18, 36.36), tone: 'red' },
    days: [{ date: '2026-10-09', ...rates(1, 100, 0, 0) }, { date: '2026-10-10', ...rates(0, null, null, null) }, { date: '2026-10-11', ...rates(7, 57.14, 14.29, 42.86) }],
    units: [{ group: 'unit:1', name: 'إدارة المبيعات', level: 'إدارة', expandable: true, tone: 'red', ...rates(9, 55.56, 22.22, 44.44) }] })
  assert.ok(trends.includes('data-trend-chart') && trends.includes('63.64%') && trends.includes('36.36%') && trends.includes('44.44%') && trends.includes('<circle'))

  const leaves = show(people.LeavesCard, { date: '2026-10-11', isToday: true, weekEnd: '2026-10-18', today: { onLeave: 1, halfDay: 0 },
    nextWeek: { employees: 2, list: [] }, topUnits: [{ id: 2, name: 'قسم التجزئة', days: 5, employees: 2 }] }, { href: '/leaves' })
  assert.ok(leaves.includes('في إجازة النهارده') && leaves.includes('الأسبوع الجاي') && leaves.includes('قسم التجزئة') && leaves.includes('5 يوم — 2 موظف'))

  const dated = (id, name, date, daysLeft) => ({ id, name, unit: 'قسم الجملة', team: null, date, daysLeft })
  const workforceBody = { date: '2026-10-11', group: null, headcount: 12, active: 11, onProbation: 1, total: 12, rows: [row('unit:1', 'إدارة المبيعات', 'إدارة', true, 10)],
    period: { period: '2026-10', from: '2026-10-01', to: '2026-10-31' }, joiners: { count: 1, list: [dated(11, 'هدى', '2026-10-11', 0)] }, leavers: 1, windowDays: 30,
    probationEnding: { count: 1, list: [dated(10, 'كريم', '2026-10-16', 5)] }, contractsEnding: { count: 1, expired: 1, list: [dated(9, 'نور', '2026-10-31', 20)] },
    passportsEnding: { count: 0, list: [] } }
  const workforce = show(people.WorkforceCard, workforceBody)
  assert.ok(workforce.includes('منهم 11 نشط') && workforce.includes('جداد الشهر ده') && workforce.includes('عقود هتنتهي (30 يوم)') && workforce.includes('و1 عقد منتهي'))
  assert.ok(workforce.includes('جوازات هتنتهي (30 يوم)') && !workforce.includes('إقامات ومستندات'), 'من غير صلاحية المستندات: مفيش خانة مستندات')
  assert.ok(show(people.WorkforceCard, { ...workforceBody, documentsEnding: { expired: 0, count: 2, byType: [{ type: 'إقامة', count: 2 }], list: [] } }).includes('إقامات ومستندات (30 يوم)'))

  const requests = show(work.RequestsCard, { pending: 3, overdue: 1, approvedNotExecuted: 2, oldestDays: 10, byType: [{ code: 'T', name: 'طلب إجازة', count: 3, overdue: 1 }],
    byAge: [{ key: 'today', label: 'النهارده', tone: 'green', count: 1 }, { key: 'older', label: 'أكتر من أسبوع', tone: 'red', count: 1 }] })
  assert.ok(requests.includes('متأخر عن المهلة') && requests.includes('معتمد ومااتنفذش') && requests.includes('أقدم طلب معلّق من 10 يوم') && requests.includes('1 متأخر'))

  const tasks = show(work.TasksCard, { available: true, open: 3, overdue: 2, people: 2, assignees: [{ employeeId: 1, role: null, name: 'سارة', open: 2, overdue: 1 },
    { employeeId: null, role: 'hr', name: 'الموارد البشرية', open: 1, overdue: 1 }] })
  assert.ok(tasks.includes('data-task-assignees') && tasks.includes('سارة') && tasks.includes('الموارد البشرية') && tasks.includes('>دور<'))

  // الإضافي: المبلغ بيترسم لو الخادم بعته بس
  const overtimeBody = { period: '2026-10', from: '2026-10-01', to: '2026-10-31', hours: 4, entries: 2, pendingEntries: 1, byUnit: [{ id: 2, name: 'قسم التجزئة', hours: 4, entries: 2 }] }
  const hoursOnly = show(work.OvertimeCard, overtimeBody)
  assert.ok(hoursOnly.includes('ساعات الشهر') && hoursOnly.includes('قسم التجزئة') && !hoursOnly.includes('data-overtime-amount') && !hoursOnly.includes('قيمة المعتمد'))
  const withMoney = show(work.OvertimeCard, { ...overtimeBody, amounts: [{ currency: 'EGP', amount: 160 }], byUnit: [{ ...overtimeBody.byUnit[0], amounts: [{ currency: 'EGP', amount: 160 }] }] })
  assert.ok(withMoney.includes('data-overtime-amount') && withMoney.includes('160.00'))

  const payroll = show(work.PayrollCard, { period: '2026-10', from: '2026-10-01', to: '2026-10-31', upTo: '2026-10-10', note: 'تقديري', runsFiltered: false,
    runs: [{ id: 7, name: 'مسير أكتوبر', status: 'CALCULATED', runType: 'REGULAR', totalNet: 125000 }],
    accrued: { available: true, employees: 12, incomplete: 2, byCurrency: [{ currency: 'EGP', employees: 12, earned: 40000, overtime: 160, deductions: 500, estimatedNet: 39660 }] },
    alerts: [{ tone: 'red', text: 'موظفين صافيهم صفر أو بالسالب في مسير مستني اعتماد', count: 1 }] })
  assert.ok(payroll.includes('href="/payroll?run=7"') && payroll.includes('محسوب — مستني اعتماد') && payroll.includes('125,000.00'))
  assert.ok(payroll.includes('data-payroll-accrued') && payroll.includes('39,660.00') && payroll.includes('المستحق لحد امبارح') && payroll.includes('data-payroll-alerts'))
})
