// B-ADD.1: الاستهداف الموحد — دالة العضوية الواحدة (isMember)، وإضافات شكل «مين + فين» (إدارات/أقسام بأقسامها الفرعية، فرع الاختيار،
// «الكل ماعدا…»)، والقديم بنصه المحفوظ بالحرف، ونطاق حساب الفروع، والمنتقي في الواجهة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const { isMember, departmentPathFrom, audienceExcludeIds, audienceWhereBranchId, audienceBranchIds, audienceNeedsOrgPlaces, orgPlaceOf } = require('../src/org/org-audience')
const { requestAudienceAllows, audienceWhereOf, AUDIENCE_WHERE_MODES, AUDIENCE_ORG_WHERE_MODES } = require('../src/requests/request-audience')
const { announcementAudienceJson, announcementAudienceIntact, announcementAudienceInScope } = require('../src/announcements/announcement-rules')
const { holidayAudienceMatches } = require('../src/attendance/holiday-audience')
const web = file => fs.readFileSync(path.join(apiRoot, '..', file), 'utf8').replace(/\r\n/g, '\n')

// فرع 1: إدارة 10 فوق قسم 11 (فوق قسم 12)؛ فرع 2: قسم 20
// فرع القسم والفريق الحالي = فرع الموظف (الوضع الطبيعي)؛ الحالات اللي المرجع فيها اتنقل في OAU-07
const member = (employeeId, branchId, departmentPath, teamId = null) => ({ employeeId, branchId, departmentPath, teamId, unitBranchId: branchId, teamBranchId: branchId })
const target = (level, branchIds, ids, excludeEmployeeIds) => ({ level, branchIds, ids, ...(excludeEmployeeIds ? { excludeEmployeeIds } : {}) })

test('OAU-01: isMember — one function for company, branch, administration, department, team, named employees and the exclusion', () => {
  const inDeep = member(1, 1, [12, 11, 10], 5), inTop = member(2, 1, [10]), other = member(3, 2, [20], 6), loose = member(4, 1, [])
  assert.deepEqual([isMember(null, inDeep), isMember(undefined, null), isMember(target('company', [], []), other), isMember(target('company', [], []), null)], [true, true, true, false])
  assert.deepEqual([inDeep, other, loose].map(row => isMember(target('branch', [1], []), row)), [true, false, true])
  assert.equal(isMember(target('branch', [], []), inDeep), false, 'مستوى الفرع من غير فروع = مش لحد')
  // إدارة أو قسم: بيشمل اللي تحته (المسار)، ومابيشملش اللي فوقه ولا اللي برّه
  assert.deepEqual([inDeep, inTop, other, loose].map(row => isMember(target('administrations', [1], [10]), row)), [true, true, false, false])
  assert.deepEqual([inDeep, inTop].map(row => isMember(target('departments', [1], [11]), row)), [true, false])
  // فرع الاختيار قيد: نفس الوحدة مع موظف اتنقل لفرع تاني = برّه
  assert.equal(isMember(target('departments', [1], [12]), member(1, 2, [12, 11, 10])), false)
  assert.equal(isMember(target('departments', [], [12]), member(1, 2, [12])), true, 'من غير فرع اختيار = من غير قيد فرع')
  assert.deepEqual([inDeep, other, loose].map(row => isMember(target('teams', [1], [5, 6]), row)), [true, false, false])
  assert.deepEqual([inDeep, inTop, other].map(row => isMember(target('employees', [], [1, 3]), row)), [true, false, true])
  // «الكل ماعدا…» قبل أي مستوى
  assert.deepEqual([inDeep, inTop].map(row => isMember(target('company', [], [], [1]), row)), [false, true])
  assert.equal(isMember(target('administrations', [1], [10], [2]), inTop), false)
  assert.equal(isMember(target('nope', [1], [10]), inDeep), false, 'مستوى مش معروف = مش لحد')
  // فرع كامل (من غير موظف) مابيطابقش قوايم
  assert.deepEqual(['departments', 'teams', 'employees'].map(level => isMember(target(level, [], [10, 5, 1]), member(null, 1, [], null))), [false, false, false])
  assert.deepEqual(departmentPathFrom(12, id => ({ 12: 11, 11: 10, 10: null })[id]), [12, 11, 10])
  assert.deepEqual(departmentPathFrom(1, id => ({ 1: 2, 2: 1 })[id]), [1, 2], 'دايرة في الشجرة مابتلفّش')
})

test('OAU-02: the who-and-where evaluator understands units (with the sub-tree), the choice branch and the exclusion; the old shapes judge as before', () => {
  const subject = extra => ({ role: null, permissions: [], employeeId: 7, branchId: 1, departmentId: 12, teamId: 5, departmentPath: [12, 11, 10], departmentBranchId: 1, teamBranchId: 1, ...extra })
  const allows = (audience, extra) => requestAudienceAllows(JSON.stringify(audience), subject(extra), 'submit')
  const unitsOf = (ids, branchId = 1) => ({ mode: 'all', ids: [], where: { mode: 'units', ids, branchId } })
  assert.deepEqual([allows(unitsOf([10])), allows(unitsOf([11])), allows(unitsOf([12])), allows(unitsOf([20])), allows(unitsOf([10], 2))], [true, true, true, false, false])
  // من غير مسار: بقسمه بس
  assert.deepEqual([allows(unitsOf([10]), { departmentPath: null }), allows(unitsOf([12]), { departmentPath: null })], [false, true])
  // القديم «أقسام محددة»: برقم القسم بالحرف حتى لو المسار موجود
  const oldDepartments = ids => ({ mode: 'all', ids: [], where: { mode: 'departments', ids } })
  assert.deepEqual([allows(oldDepartments([10])), allows(oldDepartments([12]))], [false, true])
  // الفرق: الشكل القديم من غير فرع، والجديد بفرع الاختيار
  assert.deepEqual([allows({ mode: 'all', ids: [], where: { mode: 'teams', ids: [5] } }), allows({ mode: 'all', ids: [], where: { mode: 'teams', ids: [5], branchId: 1 } }),
    allows({ mode: 'all', ids: [], where: { mode: 'teams', ids: [5], branchId: 2 } })], [true, true, false])
  assert.deepEqual([allows({ mode: 'all', ids: [], where: { mode: 'branches', ids: [1] } }), allows({ mode: 'all', ids: [], where: { mode: 'branches', ids: [2] } })], [true, false])
  // «الكل ماعدا…»: المستثنى برّه مهما كان الباقي؛ والاستثناء التالف مايفتحش
  assert.deepEqual([allows({ mode: 'all', ids: [], where: null, exclude: [7] }), allows({ mode: 'all', ids: [], where: null, exclude: [8] }), allows({ ...unitsOf([10]), exclude: [7] }),
    allows({ mode: 'all', ids: [], where: null, exclude: 'x' }), allows({ mode: 'all', ids: [], where: null, exclude: [0] })], [false, true, false, false, false])
  // «مين» بالدور مع «فين» وحدات
  assert.deepEqual([allows({ mode: 'roles', ids: ['hr'], where: { mode: 'units', ids: [10], branchId: 1 } }, { role: 'hr' }),
    allows({ mode: 'roles', ids: ['hr'], where: { mode: 'units', ids: [10], branchId: 1 } }, { role: 'employee' })], [true, false])
  // مدير النظام لسه برّه القيد في مقيّم الطلبات (المنادي بتاع الإعلانات والسياسات بيشيل الدور قبل ما يسأل)
  assert.equal(requestAudienceAllows(JSON.stringify({ mode: 'all', ids: [], where: null, exclude: [7] }), { role: 'super_admin', employeeId: 7 }, 'submit'), true)
  assert.deepEqual(audienceWhereOf({ where: { mode: 'units', ids: [3], branchId: 9 } }), { mode: 'units', ids: [3], branchId: 9 })
  assert.deepEqual(audienceWhereOf({ where: { mode: 'branches', ids: [3], branchId: 9 } }), { mode: 'branches', ids: [3] })
  assert.deepEqual(audienceWhereOf({ where: { mode: 'teams', ids: [3] } }), { mode: 'teams', ids: [3] }, 'الشكل القديم بنفس الرد')
  assert.deepEqual(audienceWhereOf({ where: { mode: 'nope', ids: [3] } }), { mode: 'company', ids: [] })
  // أنواع الطلبات (القديم) مابتقبلش الوضع الجديد عند الحفظ
  assert.deepEqual([AUDIENCE_WHERE_MODES.includes('units'), AUDIENCE_ORG_WHERE_MODES.includes('units')], [false, true])
})

test('OAU-03: the announcement audience writer — the old text is kept to the letter, the new keys are judged, and a branch account stays inside its branches', () => {
  const json = audience => announcementAudienceJson(audience)
  // القديم بنصه
  assert.equal(json({ mode: 'all', ids: [], where: { mode: 'branches', ids: [3, 1] } }), '{"mode":"all","ids":[],"where":{"mode":"branches","ids":[1,3]}}')
  assert.equal(json({ mode: 'all', ids: [], where: { mode: 'teams', ids: [4] } }), '{"mode":"all","ids":[],"where":{"mode":"teams","ids":[4]}}')
  assert.equal(json({ mode: 'all', ids: [], where: null }), null)
  assert.equal(json({ mode: 'all', ids: [], where: null, exclude: [] }), null)
  // الجديد
  assert.equal(json({ mode: 'all', ids: [], where: { mode: 'units', ids: [9, 2], branchId: 1 }, exclude: [8, 5, 8] }),
    '{"mode":"all","ids":[],"where":{"mode":"units","ids":[2,9],"branchId":1},"exclude":[5,8]}')
  assert.equal(json({ mode: 'all', ids: [], where: { mode: 'teams', ids: [4], branchId: 2 } }), '{"mode":"all","ids":[],"where":{"mode":"teams","ids":[4],"branchId":2}}')
  assert.equal(json({ mode: 'all', ids: [], where: null, exclude: [3] }), '{"mode":"all","ids":[],"where":null,"exclude":[3]}')
  for (const bad of [{ mode: 'all', where: { mode: 'units', ids: [2] } }, { mode: 'all', where: { mode: 'units', ids: [2], branchId: 0 } }, { mode: 'all', where: { mode: 'branches', ids: [2], branchId: 1 } },
    { mode: 'all', where: null, exclude: 'x' }, { mode: 'all', where: null, exclude: [1.5] }, { mode: 'all', where: null, exclude: Array.from({ length: 501 }, (_, i) => i + 1) }]) {
    assert.throws(() => json(bad), /400|Bad Request|غير صالح|غير صحيحة|اختار الفرع/, JSON.stringify(bad).slice(0, 80))
  }
  // نص اتغيّر برّه الكاتب = مش لحد (زي ما كان)، والمكتوب بالكاتب سليم
  assert.deepEqual([announcementAudienceIntact('{"mode":"all","ids":[],"where":{"mode":"units","ids":[2,9],"branchId":1},"exclude":[5,8]}'),
    announcementAudienceIntact('{"mode":"all","ids":[],"where":{"mode":"units","ids":[9,2],"branchId":1}}'), announcementAudienceIntact('{"mode":"all","ids":[],"where":null,"exclude":"x"}')], [true, false, false])
  // نطاق حساب الفروع من غير قراءة: فروع محددة من فروعه، أو وحدات/فرق فرع اختيارها من فروعه
  const scoped = audience => announcementAudienceInScope(audience === null ? null : JSON.stringify(audience), [1, 2])
  assert.deepEqual([scoped(null), scoped({ mode: 'all', ids: [], where: { mode: 'branches', ids: [1, 2] } }), scoped({ mode: 'all', ids: [], where: { mode: 'branches', ids: [1, 3] } }),
    scoped({ mode: 'all', ids: [], where: { mode: 'units', ids: [5], branchId: 2 } }), scoped({ mode: 'all', ids: [], where: { mode: 'units', ids: [5], branchId: 3 } }),
    scoped({ mode: 'all', ids: [], where: { mode: 'teams', ids: [5], branchId: 1 } }), scoped({ mode: 'all', ids: [], where: { mode: 'teams', ids: [5] } }),
    scoped({ mode: 'all', ids: [], where: { mode: 'departments', ids: [5] } }), scoped({ mode: 'all', ids: [], where: null, exclude: [4] })],
  [false, true, false, true, false, true, false, false, false])
  assert.equal(announcementAudienceInScope(JSON.stringify({ mode: 'all', ids: [], where: { mode: 'units', ids: [5], branchId: 3 } }), null), true)
  assert.deepEqual([audienceBranchIds(null), audienceBranchIds('{"where":{"mode":"units","ids":[1],"branchId":4}}'), audienceNeedsOrgPlaces('{"where":{"mode":"units","ids":[1],"branchId":4}}'),
    audienceNeedsOrgPlaces('{"where":{"mode":"departments","ids":[1]}}')], [null, [4], true, false])
  // فرق فرع اختيارها متحدد محتاجة فرع الفريق الحالي؛ والشكل القديم من غير قراءة
  assert.deepEqual([audienceNeedsOrgPlaces('{"where":{"mode":"teams","ids":[1],"branchId":4}}'), audienceNeedsOrgPlaces('{"where":{"mode":"teams","ids":[1]}}'), audienceNeedsOrgPlaces(null)], [true, false, false])
  assert.deepEqual([audienceExcludeIds(undefined, 'x'), audienceExcludeIds(['3', 2, 3], 'x'), audienceWhereBranchId({}, 'teams', 'x'), audienceWhereBranchId({ branchId: '7' }, 'units', 'x')], [[], [2, 3], null, 7])
})

test('OAU-04: every audience writer built in the plan goes through the shared helpers, and the old request-type writer is untouched', () => {
  const api = file => fs.readFileSync(path.join(apiRoot, 'src', file), 'utf8').replace(/\r\n/g, '\n')
  for (const file of ['announcements/announcement-rules.ts', 'policies/policies.service.ts', 'modules-registry/modules.service.ts']) {
    const source = api(file)
    assert.match(source, /AUDIENCE_ORG_WHERE_MODES/, file)
    assert.match(source, /audienceWhereBranchId\(value\.where, whereMode, /, file)
    assert.match(source, /audienceExcludeIds\(value\.exclude, /, file)
  }
  for (const file of ['announcements/announcements.service.ts', 'policies/policies.service.ts', 'helpdesk/knowledge.service.ts', 'surveys/surveys.service.ts', 'modules-registry/modules.service.ts']) {
    const source = api(file)
    assert.match(source, /assertAudienceTargets\(em, /, `${file}: التحقق من أرقام الجمهور وقت الحفظ`)
    assert.match(source, /\.\.\.orgPlaceOf\(/, `${file}: مكان الموظف في الهيكل (مسار قسمه وفرع قسمه وفريقه الحالي) قدام المقيّم`)
  }
  assert.doesNotMatch(api('settings/settings.controller.ts'), /AUDIENCE_ORG_WHERE_MODES|org-audience/, 'جمهور أنواع الطلبات (قبل الخطة) زي ما هو')
  assert.match(api('requests/request-audience.ts'), /return isMember\(\{ level: WHERE_LEVELS\[where\.mode\]/)
  assert.match(api('org/org.controller.ts'), /@Get\('org\/audience-context'\)\n  @Perm\(\.\.\.ORG_AUDIENCE_PERMS\)/)
  assert.match(api('org/org.controller.ts'), /@Post\('org\/audience-preview'\)\n  @HttpCode\(200\)\n  @Perm\(\.\.\.ORG_AUDIENCE_PERMS\)/)
})

test('OAU-05: the unified field is the one used by the plan-built screens, and the old picker screens keep their levels', () => {
  for (const [file, mark] of [['src/app/announcements/page.tsx', 'data-announcement-audience'], ['src/app/surveys/page.tsx', 'data-survey-audience'],
    ['src/app/helpdesk/ArticlesManager.tsx', 'data-article-audience'], ['src/app/policies/page.tsx', 'data-policy-audience'], ['src/app/settings/modules/page.tsx', 'data-module-audience']]) {
    const source = web(file)
    assert.match(source, /<OrgAudienceField /, file)
    assert.ok(source.includes(mark), file)
  }
  const field = web('src/components/OrgAudienceField.tsx')
  assert.match(field, /levels=\{levels\}/)
  assert.match(field, /\btree\b/)
  assert.match(field, /previewOrgAudience\(current\)/)
  assert.match(field, /الكل ماعدا…/)
  const picker = web('src/components/OrgTargetPicker.tsx')
  assert.match(picker, /export const ORG_TARGET_LEVELS: OrgTargetLevel\[\] = \['company', 'branch', 'departments', 'teams', 'employees'\]/, 'الشاشات القديمة بمستوياتها')
  assert.match(picker, /export const ORG_AUDIENCE_LEVELS: OrgTargetLevel\[\] = \['company', 'branch', 'administrations', 'departments', 'teams', 'employees'\]/)
  assert.match(picker, /tree = false,/)
})

test('OAU-06: the holiday audience matcher keeps its answers', () => {
  const m = (employeeId, branchId, departmentPath, teamId = null) => ({ employeeId, branchId, departmentPath, teamId })
  assert.deepEqual([holidayAudienceMatches(null, null), holidayAudienceMatches({ level: 'branch', branchId: 1 }, null), holidayAudienceMatches({ level: 'branch', branchId: 1 }, m(null, 1, [])),
    holidayAudienceMatches({ level: 'departments', branchId: 1, departmentIds: [10] }, m(1, 1, [12, 10])), holidayAudienceMatches({ level: 'departments', branchId: 1, departmentIds: [10] }, m(null, 1, [])),
    holidayAudienceMatches({ level: 'teams', branchId: 1, teamIds: [5] }, m(1, 1, [], 5)), holidayAudienceMatches({ level: 'employees', branchId: 1, employeeIds: [1] }, m(1, 2, []))],
  [true, false, true, true, false, true, true])
})

// ===== Codex P7A (CRP7A) =====
test('OAU-07 (P7A-B01, B02): the unit\'s or the team\'s current branch is part of the judgement when a choice branch is set, and a damaged new shape opens for nobody', () => {
  const base = { employeeId: 1, branchId: 1, departmentPath: [12, 11, 10], teamId: 5 }
  const teamsIn = (branchIds) => target('teams', branchIds, [5]), unitsIn = (branchIds) => target('departments', branchIds, [10])
  // فريق اتنقل لقسم في فرع 2 وموظفه لسه في فرع 1: برّه جمهور فرع 1؛ ومن غير معلومة عن فرع المرجع = مش عضو
  assert.deepEqual([isMember(teamsIn([1]), { ...base, teamBranchId: 1 }), isMember(teamsIn([1]), { ...base, teamBranchId: 2 }), isMember(teamsIn([1]), { ...base, teamBranchId: null }),
    isMember(teamsIn([1]), base)], [true, false, false, false])
  assert.deepEqual([isMember(unitsIn([1]), { ...base, unitBranchId: 1 }), isMember(unitsIn([1]), { ...base, unitBranchId: 2 }), isMember(unitsIn([1]), base),
    isMember(target('administrations', [1], [10]), { ...base, unitBranchId: 2 })], [true, false, false, false])
  // من غير فرع اختيار (العطلات وفترات الإضافي والشكل القديم): الحكم زي ما كان — من غير نظر لفرع المرجع
  assert.deepEqual([isMember(teamsIn([]), base), isMember(unitsIn([]), base), isMember(teamsIn([]), { ...base, teamBranchId: 2 })], [true, true, true])
  // المقيّم: مكان الموظف من orgPlaceOf
  const places = row => ({ departmentPath: [12, 11, 10], departmentBranchId: row.departmentId === 12 ? 1 : null, teamBranchId: row.teamId === 5 ? 2 : null })
  assert.deepEqual(orgPlaceOf(places, { departmentId: 12, teamId: 5 }), { departmentPath: [12, 11, 10], departmentBranchId: 1, teamBranchId: 2 })
  assert.deepEqual([orgPlaceOf(null, { departmentId: 12 }), orgPlaceOf(places, null)], [{}, {}])
  const subject = extra => ({ role: null, permissions: [], employeeId: 7, branchId: 1, departmentId: 12, teamId: 5, ...extra })
  const allows = (where, extra) => requestAudienceAllows(JSON.stringify({ mode: 'all', ids: [], where }), subject(extra), 'submit')
  const moved = orgPlaceOf(places, { departmentId: 12, teamId: 5 })
  assert.deepEqual([allows({ mode: 'teams', ids: [5], branchId: 1 }, moved), allows({ mode: 'teams', ids: [5], branchId: 1 }, { ...moved, teamBranchId: 1 }),
    allows({ mode: 'teams', ids: [5], branchId: 1 }, {}), allows({ mode: 'teams', ids: [5] }, moved), allows({ mode: 'units', ids: [10], branchId: 1 }, moved),
    allows({ mode: 'units', ids: [10], branchId: 1 }, { ...moved, departmentBranchId: 2 })], [false, true, false, true, true, false])
  // B02: الشكل الجديد الناقص أو التالف مايفتحش، والقديم التالف زي ما هو
  assert.deepEqual([allows({ mode: 'units', ids: [], branchId: 1 }, moved), allows({ mode: 'units', ids: [10] }, moved), allows({ mode: 'units', ids: [10], branchId: 0 }, moved),
    allows({ mode: 'teams', ids: [], branchId: 1 }, moved), allows({ mode: 'company', ids: [], branchId: 1 }, moved), allows({ mode: 'departments', ids: [] }, moved),
    allows({ mode: 'nope', ids: [3] }, moved)], [false, false, false, false, false, true, true])
  // مدير النظام بيعدّي زي ما كان
  assert.equal(requestAudienceAllows(JSON.stringify({ mode: 'all', ids: [], where: { mode: 'units', ids: [], branchId: 1 } }), { role: 'super_admin', permissions: ['*'] }, 'submit'), true)
  // السطور المثبّتة في الكتّاب والخدمات
  const api = file => fs.readFileSync(path.join(apiRoot, 'src', file), 'utf8').replace(/\r\n/g, '\n')
  assert.match(api('modules-registry/modules.service.ts'), /if \(!whereIds\.length && \(whereMode === 'units' \|\| value\.where\?\.branchId != null\)\) \{\n      throw new BadRequestException/)
  assert.match(api('tasks/tasks.service.ts'), /FROM \[employees\] WITH \(UPDLOCK, ROWLOCK\) WHERE \[id\] IN[^\n]+\n      const locked = new Set\(lockIds\)\n      const members = \(await audienceMembersNow\(em, audience, branchScopeOf\(user\)\)\)\.filter\(member => locked\.has\(member\.id\)\)/)
  const attendance = api('attendance/attendance.service.ts')
  assert.match(attendance, /private async overtimePeriodAudiences\(periodIds: number\[\], em: EntityManager = this\.overtimePeriods\.manager\)/)
  assert.match(attendance, /const stored = \(await this\.overtimePeriodAudiences\(\[p\.id\], em\)\)\.get\(p\.id\)/)
  assert.match(attendance, /const names = audiences\.size \? await this\.overtimeAudienceNames\(scope\) : \{\}/)
  assert.doesNotMatch(attendance, /holidayAudienceNames/, 'وصف جمهور الفترة مابياخدش أسماء من غير نطاق')
  const dashboard = api('dashboard/dashboard-cards.service.ts')
  assert.deepEqual([...dashboard.matchAll(/this\.share\(`([a-z]+)\|/g)].map(match => match[1]), ['day'], 'الحساب المشترك لخانات اليوم بس — من غير موظفين ولا شجرة')
  assert.match(dashboard, /AND \(\(\$\{CONFIDENTIAL_REQUEST_SQL\} AND \$\{confidential\}\) OR \(NOT \$\{CONFIDENTIAL_REQUEST_SQL\}/)
  // P7B: حكم بريد الحدث لكل رسالة (جوه حلقة المستلمين، بعد فحوص التقادم) من غير ذاكرة للدفعة؛ وموضوع الموديولات للشكل الجديد من غير الذاكرة المؤقتة
  const notifications = api('notifications/notifications.service.ts')
  assert.doesNotMatch(notifications, /eventEmailOn|emailOn = new Map/)
  assert.match(notifications, /else kept\.push\(item\)\n      \}\n[^]*?for \(const code of new Set\(kept\.map\(item => item\.eventCode\)\)\) \{\n        if \(isNotificationEvent\(code\) && !\(await this\.channels\.ruleOf\(code\)\)\.rule\.email\) closed\.add\(code\)/)
  const modules = api('modules-registry/modules.service.ts')
  assert.match(modules, /const fresh = audienceNeedsOrgPlaces\(audience\)\n    const hit = fresh \? undefined : this\.subjects\.get\(user\.sub\)/)
  assert.match(modules, /if \(fresh\) return \{ \.\.\.subject, \.\.\.orgPlaceOf\(await orgPlaces\(this\.ds\.manager\), employee\) \}\n    this\.subjects\.set\(/)
  assert.match(api('notifications/channels/notification-channels.service.ts'), /const employee = await this\.scopedEmployee\(user, employeeId, em, true\)/)
})
