'use strict'
// B2.16 (أ): الإعلانات — فحص من غير قاعدة (الدورة الفعلية في announcements.integration.cjs):
//  AU-01) القواعد: العنوان والنص والتواريخ، وجمهور الإعلان (مين + فين، ومقفول على التالف)، وجمهور حساب الفروع، ومتى الإعلان ساري.
//  AU-02) الربط: الموديول (مقفول افتراضيًا، في الباقة الأساسية) وصلاحيته، وحراسة المسارات، والكتابة تحت قفل الصف وبالحقول، وتسجيل القراءة
//         في معاملة الحكم نفسها، وحدث «إعلان جديد» (وقت التوزيع، ووقت الإرسال، وفي القايمة).
//  AU-03) الواجهة: الصفحة بلوحتها وقسم الإدارة للي معاه الصلاحية، وبند القايمة، وعنوان الشاشة، ونفس نصوص الخادم.
// Run (من api/): node --test test/announcements.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/announcements/announcement-rules')
const { MODULES } = require('../src/modules-registry/registry')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const refuses = (work, label) => assert.throws(work, error => error?.getStatus?.() === 400, label)

test('AU-01: title, body, dates, the audience text and its branch scope, and when an announcement is live', () => {
  assert.equal(rules.announcementTitle('  عطلة   اليوم\nالوطني '), 'عطلة اليوم الوطني')
  for (const bad of ['', ' ', 'x', 'ع'.repeat(201), null, 12, undefined]) refuses(() => rules.announcementTitle(bad), `title ${String(bad).slice(0, 12)}`)
  assert.equal(rules.announcementTitle('ع'.repeat(200)).length, 200)
  assert.equal(rules.announcementBody('  سطر أول\n\nسطر تاني  '), 'سطر أول\n\nسطر تاني', 'النص بسطوره')
  for (const bad of ['', '   ', 'ن'.repeat(4001), null, 5]) refuses(() => rules.announcementBody(bad), `body ${String(bad).slice(0, 12)}`)
  // التواريخ: النشر الافتراضي النهارده، والانتهاء اختياري ومش قبل النشر، وتاريخ حقيقي بالحرف
  const today = '2026-10-07'
  assert.deepEqual(rules.announcementDates(undefined, undefined, today), { publishDate: today, expiryDate: null })
  assert.deepEqual(rules.announcementDates('', null, today), { publishDate: today, expiryDate: null })
  assert.deepEqual(rules.announcementDates('2026-10-10', '2026-10-10', today), { publishDate: '2026-10-10', expiryDate: '2026-10-10' })
  assert.deepEqual(rules.announcementDates('2026-09-01', '2026-09-30', today), { publishDate: '2026-09-01', expiryDate: '2026-09-30' }, 'تاريخ نشر فات مقبول')
  for (const [publish, expiry] of [['2026-13-01', null], ['2026-02-30', null], ['07/10/2026', null], [20261007, null], [today, '2026-10-06'], [today, '2026-02-31'], [today, 'بكرة'],
    ['2026-10-10T00:00:00', null]]) refuses(() => rules.announcementDates(publish, expiry, today), `${publish} → ${expiry}`)

  // الجمهور: «الكل في كل الشركة» = من غير نص؛ والباقي بصيغة جمهور أنواع الطلبات، مرتّب ومن غير تكرار
  const json = rules.announcementAudienceJson
  for (const all of [null, undefined, {}, { mode: 'all' }, { mode: 'all', ids: [], where: null }, { mode: 'all', ids: [3], where: { mode: 'company', ids: [9] } }]) assert.equal(json(all), null)
  assert.equal(json({ mode: 'all', where: { mode: 'branches', ids: [3, '2', 3, 2] } }), '{"mode":"all","ids":[],"where":{"mode":"branches","ids":[2,3]}}')
  assert.equal(json({ mode: 'positions', ids: ['TEAM_LEADERS', 'DEPARTMENT_MANAGERS', 'TEAM_LEADERS'] }), '{"mode":"positions","ids":["DEPARTMENT_MANAGERS","TEAM_LEADERS"],"where":null}')
  assert.equal(json({ mode: 'employees', ids: [12, 5], where: { mode: 'teams', ids: [4] } }), '{"mode":"employees","ids":["12","5"],"where":{"mode":"teams","ids":[4]}}')
  for (const bad of ['all', [1], 7, { mode: 'everyone' }, { mode: 'roles' }, { mode: 'roles', ids: [] }, { mode: 'all', where: { mode: 'branches' } }, { mode: 'all', where: { mode: 'branches', ids: [] } },
    { mode: 'all', where: { mode: 'branches', ids: ['x', 0, -1, 1.5] } }, { mode: 'all', where: { mode: 'floors', ids: [1] } },
    { mode: 'all', conditions: [{ field: 'nationality', values: ['SAUDI'] }] }, { mode: 'all', conditions: [] },
    { mode: 'employees', ids: Array.from({ length: 400 }, (_, index) => 100000 + index) }]) refuses(() => json(bad), JSON.stringify(bad).slice(0, 60))

  // النص المحفوظ لازم يكون بشكل الكاتب بالحرف: التالف = الإعلان مش لحد (مقيّم الجمهور نفسه بيفتح على التالف)
  const intact = rules.announcementAudienceIntact
  for (const good of [null, undefined, json({ mode: 'all', where: { mode: 'branches', ids: [2, 3] } }), json({ mode: 'roles', ids: ['hr'] })]) assert.equal(intact(good), true, String(good))
  for (const broken of ['', 'null', '{bad', '[]', '{}', '{"mode":"all","ids":[]}', '{"mode":"all","ids":[],"where":{"mode":"branches","ids":[]}}', '{"mode":"all","ids":[],"where":{"mode":"branches","ids":[3,2]}}',
    '{"mode":"everyone","ids":["x"],"where":null}', '{"mode":"all","ids":[],"where":{"mode":"branches","ids":[2]},"conditions":[]}',
    '{ "mode":"all","ids":[],"where":{"mode":"branches","ids":[2]}}']) assert.equal(intact(broken), false, broken)

  // حساب الفروع: «فروع محددة» وكلها من فروعه بس — كل الشركة أو أقسام وفرق أو منصب من غير فروع لأ؛ وحساب الشركة: أي جمهور
  const inScope = rules.announcementAudienceInScope
  const forBranches = (...ids) => json({ mode: 'all', where: { mode: 'branches', ids } })
  assert.deepEqual([inScope(forBranches(2), [2, 3]), inScope(forBranches(2, 3), [2, 3]), inScope(forBranches(2, 4), [2, 3]), inScope(forBranches(4), [2, 3]), inScope(forBranches(2), [])],
    [true, true, false, false, false])
  for (const outside of [null, json({ mode: 'all', where: { mode: 'departments', ids: [2] } }), json({ mode: 'all', where: { mode: 'teams', ids: [2] } }), json({ mode: 'positions', ids: ['BRANCH_MANAGERS'] }),
    '{bad', '']) assert.equal(inScope(outside, [2, 3]), false, String(outside))
  assert.equal(inScope(json({ mode: 'positions', ids: ['BRANCH_MANAGERS'], where: { mode: 'branches', ids: [3] } }), [2, 3]), true)
  for (const any of [null, forBranches(9), '{bad']) assert.equal(inScope(any, null), true)

  // ساري: منشور، ووصل يومه، ولسه ماعدّاش يوم انتهائه (اليومين نفسهم جوه)
  const live = (status, publishDate, expiryDate) => rules.announcementLive({ status, publishDate, expiryDate }, today)
  assert.deepEqual([live('PUBLISHED', today, null), live('PUBLISHED', '2026-10-01', today), live('PUBLISHED', '2026-10-01', '2026-10-06'), live('PUBLISHED', '2026-10-08', null),
    live('DRAFT', today, null), live('WITHDRAWN', today, null), live('PUBLISHED', `${today}T00:00:00.000Z`, null)], [true, true, false, false, false, false, true])
  assert.match(rules.ANNOUNCEMENTS_MIGRATION_MISSING, /20261007_100/)
})

test('AU-02: the module, its permission, guarded routes, writes under the row lock, and the «new announcement» event judged at dispatch, at send and in the list', () => {
  // موديول جديد بعد البذرة: مقفول افتراضيًا، وفي الباقة الأساسية، ومن غير مهمة مجدولة
  const module = MODULES.announcements
  assert.deepEqual([module.nameAr, module.group, module.dependsOn, module.softUses, module.defaultEnabled, module.preset, module.permissions, module.routes, module.jobs ?? []],
    ['الإعلانات', 'people', ['employees'], ['notifications'], false, 'basic', ['announcements.manage'], ['/announcements'], []])
  const { ROLE_PRESETS, PERMISSIONS, PERMISSION_MODULES, PERMISSION_DESCRIPTIONS } = require('../src/auth/permissions')
  assert.equal(PERMISSIONS['announcements.manage'], 'إدارة الإعلانات')
  assert.deepEqual(PERMISSION_MODULES.find(group => group.key === 'announcements'), { key: 'announcements', labelAr: 'الإعلانات', permissions: ['announcements.manage'] })
  assert.match(PERMISSION_DESCRIPTIONS['announcements.manage'], /حساب الفروع لإعلانات فروعه بس/)
  assert.equal(ROLE_PRESETS.find(role => role.code === 'hr_manager').permissions.includes('announcements.manage'), true)
  for (const code of ['hr_officer', 'read_only', 'employee']) assert.equal(ROLE_PRESETS.find(role => role.code === code)?.permissions.includes('announcements.manage') ?? false, false, code)

  const controller = read('api/src/announcements/announcements.controller.ts')
  assert.match(controller, /@RequireModule\('announcements'\)\s+@UseGuards\(JwtAuthGuard, RolesGuard\)\s+@Controller\('announcements'\)/)
  // كل مسار إدارة بصلاحية الإدارة؛ واللوحة وتسجيل القراءة للموظف لنفسه (الحكم في الخدمة)
  for (const route of ['@Get()', '@Post()', "@Patch(':id')", "@Post(':id/publish')", "@Post(':id/withdraw')", "@Get(':id/report')"]) {
    const at = controller.indexOf(route)
    assert.ok(at > 0 && controller.slice(at - 40, at).includes("@Perm('announcements.manage')"), route)
  }
  for (const route of ["@Get('board')", "@Post(':id/read')"]) {
    const at = controller.indexOf(route)
    assert.ok(at > 0 && !controller.slice(at - 40, at).includes('@Perm('), route)
  }
  assert.equal(controller.match(/@Perm\('announcements\.manage'\)/g).length, 6)
  const { EXCEPTIONS } = require('./fixtures/routes-without-perm.cjs')
  assert.deepEqual([EXCEPTIONS['AnnouncementsController.board'], EXCEPTIONS['AnnouncementsController.markRead']], ['SELF', 'SELF'])

  const service = read('api/src/announcements/announcements.service.ts')
  // الإدارة: الصف بيتقفل وبيتحكم (موجود + جمهوره جوه نطاق الحساب) في نفس القراءة، والكتابة بالحقول وبرقم الصف
  assert.match(service, /findOne\(\{ where: \{ id \}, \.\.\.\(lock \? \{ lock: \{ mode: 'pessimistic_write' as const \} \} : \{\}\) \}\) : null\s+if \(!row \|\| !announcementAudienceInScope\(row\.audience, branchScopeOf\(user\)\)\) throw new NotFoundException\(ANNOUNCEMENT_NOT_FOUND\)/)
  for (const writer of ['async update(', 'async publish(', 'async withdraw(']) {
    const body = service.slice(service.indexOf(writer), service.indexOf('\n  }\n', service.indexOf(writer)))
    assert.match(body, /return this\.ds\.transaction\(async em => \{\s+const row = await this\.managed\(user, id, em, true\)/, writer)
    assert.match(body, /em\.getRepository\(Announcement\)\.update\(\{ id: row\.id \}, /, writer)
  }
  assert.doesNotMatch(service, /\.save\(row\)|repo\.save\(\{ \.\.\.row/, 'ولا حفظ للكيان كله فوق صف مقري')
  // تسجيل القراءة: الحكم والكتابة في معاملة واحدة وصف الإعلان مقفول قراءة، والإدخال مشروط بعدم وجود الصف
  const mark = service.slice(service.indexOf('async markRead('), service.indexOf('// ===== الإدارة ====='))
  assert.match(mark, /return this\.ds\.transaction\(async em => \{\s+const seen = await this\.liveFor\(user, id, em, true\)/)
  assert.match(mark, /if \(!seen\) throw new NotFoundException\(ANNOUNCEMENT_NOT_FOUND\)/)
  assert.match(mark, /WHERE NOT EXISTS \(SELECT 1 FROM \[announcement_reads\] WITH \(UPDLOCK, HOLDLOCK\) WHERE \[announcementId\] = @0 AND \[employeeId\] = @1\)/)
  assert.match(service, /lock \? \{ lock: \{ mode: 'pessimistic_read' as const \} \} : \{\}/)
  // الجمهور: مقيّم أنواع الطلبات نفسه، ومقفول على النص التالف، ومدير النظام مش بدوره
  assert.match(service, /return announcementAudienceIntact\(row\.audience\) && requestAudienceAllows\(row\.audience, this\.subject\(employee, role, positions\), 'submit'\)/)
  assert.match(service, /role: role && role !== 'super_admin' \? role : null, permissions: \[\]/)
  // النشر: حدث «إعلان اتنشر» في معاملة النشر نفسها، ولما تاريخ النشر وصل بس
  const publish = service.slice(service.indexOf('async publish('), service.indexOf('async withdraw('))
  assert.match(publish, /if \(String\(day\(row\.publishDate\)\) <= today\) \{\s+await recordOutboxEvent\(em, \{ type: 'ANNOUNCEMENT_PUBLISHED', entityType: 'announcement', entityId: row\.id, key: `announcement-published:\$\{row\.id\}`/)
  assert.doesNotMatch(service, /notifications\.|NotificationsService|mail\./, 'ولا نداء لخدمة تانية (الإشعار بحدث الـoutbox)')

  // الإشعار: الحدث متسجّل، والمحرك مشترك فيه، وبيتحكم وقت التوزيع (جمهور الإعلان الساري) ووقت الإرسال (ساري والحساب في جمهوره)
  const events = require('../src/notifications/notification-events')
  const def = events.notificationEventDef('announcement.published')
  assert.deepEqual([def.category, def.kind, def.storedInApp, events.NOTIFICATION_CATEGORIES.announcement], ['announcement', 'info', true, 'الإعلانات'])
  assert.doesNotMatch(JSON.stringify(def.templates), /announcement\.body/, 'القالب بالعنوان — نص الإعلان على اللوحة بس')
  assert.equal(require('../src/queue/outbox').DOMAIN_EVENTS.ANNOUNCEMENT_PUBLISHED, 'إعلان اتنشر')
  const engine = read('api/src/notifications/notifications.service.ts')
  assert.match(engine, /case 'ANNOUNCEMENT_PUBLISHED': return this\.onAnnouncementPublished\(event\)/)
  assert.match(engine, /const live = await this\.announcements\.liveAudienceAccounts\(id\)\s+if \(!live\) return 0/)
  assert.match(engine, /recipients: await this\.auth\.accountPayloads\(live\.accounts\)/)
  assert.match(engine, /if \(notification\.entityType === 'announcement'\) \{[\s\S]{0,220}return \(await this\.announcements\.liveFor\(account, Number\(notification\.entityId\)\)\) \? null : /)
  assert.match(engine, /export const NOTIFICATION_SOURCE_EVENTS: readonly DomainEventType\[\] = \[[^\]]*'ANNOUNCEMENT_PUBLISHED'[^\]]*\]/)
  // والمخزّن في القايمة: بيظهر طول ما المنادي بيقول إن الإعلان ساري والحساب في جمهوره (ومن غير حكم مابيظهرش)
  const store = read('api/src/notifications/notification-store.ts')
  assert.match(store, /const live = announced\.length && liveAnnouncements \? await liveAnnouncements\(announced\) : new Set<number>\(\)/)
  assert.match(store, /if \(row\.eventCode === 'announcement\.published' && !live\.has\(Number\(row\.entityId\)\)\) continue/)
  assert.match(read('api/src/assets/portal.controller.ts'), /ids => this\.announcements\.liveIdsFor\(user, ids\)\)\)/)
})

test('AU-03: the announcements screen — the board for everyone, management for the permission holder, the sidebar item and the page title', () => {
  const page = read('src/app/announcements/page.tsx'), lib = read('src/lib/announcements-api.ts')
  assert.match(page, /const manages = can\('announcements\.manage'\)/)
  assert.match(page, /\{manager && managed && \(\s+<div className="card space-y-4" data-announcements-manage>/, 'قسم الإدارة للي معاه الصلاحية بس')
  assert.match(page, /data-announcements-board/)
  assert.match(page, /\{item\.requiresRead \? 'أقرّ بالقراءة' : 'قريت'\}/)
  assert.match(page, /\{!managed\.available && <p[^>]*>\{managed\.message\}<\/p>\}/, 'قبل الترحيل: رسالة الخادم')
  assert.match(page, /item\.status === 'DRAFT' && <button type="button" disabled=\{busy\} onClick=\{\(\) => run\(\(\) => publishAnnouncement\(item\.id\)\)\}/)
  assert.match(page, /item\.status === 'PUBLISHED' && <button type="button" disabled=\{busy\} onClick=\{\(\) => run\(\(\) => withdrawAnnouncement\(item\.id\)\)\}/)
  assert.match(page, /maxLength=\{200\}/); assert.match(page, /maxLength=\{4000\}/)
  assert.equal(rules.ANNOUNCEMENT_TITLE_MAX, 200); assert.equal(rules.ANNOUNCEMENT_BODY_MAX, 4000)
  // الجمهور من الشاشة: كل الشركة أو فروع محددة — بنفس الصيغة اللي الخادم بيحفظها
  assert.match(lib, /branchIds\.length \? \{ mode: 'all', ids: \[\], where: \{ mode: 'branches', ids: \[\.\.\.branchIds\]\.sort\(\(a, b\) => a - b\) \} \} : null/)
  for (const [method, route] of [['fetchAnnouncementsBoard', "'/announcements/board'"], ['markAnnouncementRead', '`/announcements/${id}/read`'], ['fetchAnnouncements', "'/announcements'"],
    ['publishAnnouncement', '`/announcements/${id}/publish`'], ['withdrawAnnouncement', '`/announcements/${id}/withdraw`'], ['fetchAnnouncementReport', '`/announcements/${id}/report`']]) {
    assert.ok(lib.includes(`export const ${method} = `) && lib.includes(route), method)
  }
  assert.match(lib, /ANNOUNCEMENT_STATUS_LABELS: Record<AnnouncementStatus, string> = \{ DRAFT: 'مسودة', PUBLISHED: 'منشور', WITHDRAWN: 'مسحوب' \}/)
  const sidebar = read('src/components/layout/Sidebar.tsx')
  assert.match(sidebar, /\{ id: 'announcements', label: 'الإعلانات', icon: <Megaphone size=\{20\} \/>, href: '\/announcements' \}/)
  assert.match(read('src/components/layout/pageTitles.ts'), /\['\/announcements', 'الإعلانات'\]/)
  // فئة «الإعلانات» باسمها في شاشة الإشعارات
  assert.match(read('src/app/notifications/page.tsx'), /announcement: \{ label: 'الإعلانات', icon: Megaphone \}/)
})
