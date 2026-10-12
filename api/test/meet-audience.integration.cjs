'use strict'
// B-ADD.22: دعوة الاجتماع بالفلاتر المعتادة (الاستهداف الموحد «على مين؟») على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر
// (hr_meet_audience_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور. خادم الاجتماعات (LiveKit) خادم HTTP وهمي على 127.0.0.1.
//  MA-01) الموديول مقفول = المسار مقفول (بجمهور أو من غيره).
//  MA-02) الجمهور ← حسابات موظفينه الحاليين جوه نطاق صاحب الاجتماع بالظبط: هو نفسه برّه، واللي من غير حساب نشط بيتعدّ ومابيتدعاش، والعدد هو عدد
//         المعاينة؛ الدعوات صفوف عادية وبترن زي الدعوة بالاسم، والكارت بيقول كام مدعو؛ والتحويل مرة واحدة (اللي انضم بعدين مش مدعو).
//  MA-03) «الكل ماعدا…»، وفرع كامل، والشركة كلها بنطاق الحساب، وموظفين بالاسم، ومع مدعوين بالاسم من غير تكرار.
//  MA-04) الرفض: جمهور تالف أو بشكل تاني، ووحدة مش تبع فرعها، وفرع برّه النطاق زي فرع مالوش وجود، وجمهور فاضي أو من غير حسابات، ومن غير
//         الصلاحية، وفي التعديل — ومن غير أي اجتماع يتعمل.
//  MA-05) الحد: 500 مدعو بيعدّوا و501 بيترفضوا برسالة واضحة.
// Run (من api/): node --test test/meet-audience.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http'), crypto = require('node:crypto')
const { disposableApp } = require('./helpers/disposable-app.cjs')
const { moduleTools } = require('./helpers/modules.cjs')
const rules = require('../src/meet/meet-rules')
const extra = {}
const t = disposableApp('meet_audience', extra)
const B = {}, D = {}, T = {}, E = {}, U = {}
let fake, modules, number = 0
const calls = []
const R = '/meet/rooms'
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
const answer = response => [response.status, messageOf(response)]
const employee = async (key, branch, overrides = {}) => { const n = ++number
  E[key] = await t.repo('Employee').save({ employeeCode: `MA${String(n).padStart(4, '0')}`, fullName: `موظف الدعوة ${key}`, branchId: branch.id, jobTitle: 'موظف',
    joinDate: '2022-01-01', basicSalary: 5000, status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
  return E[key] }
const account = async (key, overrides = {}) => { U[key] = await t.user({ displayName: `حساب ${key}`, role: 'employee', permissions: '[]', branchId: E[key]?.branchId ?? null, employeeId: E[key]?.id ?? null, isActive: true, ...overrides }); return U[key] }
const units = (branch, ...list) => ({ mode: 'all', ids: [], where: { mode: 'units', ids: list.map(unit => unit.id), branchId: branch.id } })
const branches = (...list) => ({ mode: 'all', ids: [], where: { mode: 'branches', ids: list.map(branch => branch.id) } })
const invitedOf = async code => { const meeting = await t.repo('Meeting').findOneByOrFail({ code })
  return (await t.repo('MeetingInvite').find({ where: { meetingId: meeting.id }, order: { userId: 'ASC' } })).map(row => row.userId) }
const ids = (...keys) => keys.map(key => U[key].id).sort((a, b) => a - b)
const create = (user, body) => t.request(user, 'POST', R, { title: 'اجتماع بالفلاتر', ...body })
const drop = async code => { const meeting = await t.repo('Meeting').findOneByOrFail({ code })
  await t.repo('MeetingInvite').delete({ meetingId: meeting.id }); await t.repo('Meeting').delete({ id: meeting.id }) }

before(async () => {
  // خادم LiveKit الوهمي: إنشاء الاجتماع والدعوة مابيندهوش عليه خالص
  fake = http.createServer((req, res) => { calls.push(req.url); req.resume(); req.on('end', () => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"rooms":[]}') }) })
  await new Promise(resolve => fake.listen(0, '127.0.0.1', resolve))
  Object.assign(extra, { LIVEKIT_URL: `ws://127.0.0.1:${fake.address().port}`, LIVEKIT_HTTP_URL: '', LIVEKIT_API_KEY: `APItest${crypto.randomBytes(6).toString('hex')}`, LIVEKIT_API_SECRET: crypto.randomBytes(32).toString('hex') })
  await t.start()
  modules = moduleTools(t.app)
  B.a = await t.repo('Branch').save({ code: 'MA_A', name: 'فرع الدعوة أ', country: 'SA' })
  B.b = await t.repo('Branch').save({ code: 'MA_B', name: 'فرع الدعوة ب', country: 'SA' })
  B.big = await t.repo('Branch').save({ code: 'MA_C', name: 'فرع كبير', country: 'SA' })
  D.sales = await t.repo('Department').save({ branchId: B.a.id, name: 'قسم المبيعات', unitType: 'DEPARTMENT' })
  D.finance = await t.repo('Department').save({ branchId: B.a.id, name: 'قسم المالية', unitType: 'DEPARTMENT' })
  D.other = await t.repo('Department').save({ branchId: B.b.id, name: 'قسم فرع ب', unitType: 'DEPARTMENT' })
  T.lonely = await t.repo('Team').save({ name: 'فريق من غير حسابات', departmentId: D.finance.id })
  // قسم المبيعات: صاحب الاجتماع، واتنين بحسابات، وواحد من غير حساب، وواحد حسابه موقوف، وواحد خدمته انتهت (مش من الحاليين)
  await employee('host', B.a, { departmentId: D.sales.id }); await account('host', { permissions: JSON.stringify(['employees.view']) })
  await employee('one', B.a, { departmentId: D.sales.id }); await account('one')
  await employee('two', B.a, { departmentId: D.sales.id }); await account('two')
  await employee('noAccount', B.a, { departmentId: D.sales.id })
  await employee('stopped', B.a, { departmentId: D.sales.id }); await account('stopped', { isActive: false })
  await employee('left', B.a, { departmentId: D.sales.id, status: 'terminated', isActive: false }); await account('left')
  // قسم المالية (نفس الفرع)، وفريق من غير حسابات، وفرع تاني
  await employee('fin', B.a, { departmentId: D.finance.id }); await account('fin')
  await employee('teamOnly', B.a, { departmentId: D.finance.id, teamId: T.lonely.id })
  await employee('far', B.b, { departmentId: D.other.id }); await account('far')
  U.admin = await t.user({ displayName: 'مدير النظام', scopeAllBranches: true, isActive: true })
}, { timeout: 180000 })
after(async context => {
  try { if (fake) await new Promise(resolve => { fake.closeAllConnections?.(); fake.close(resolve) }) } finally { await t.stop(context) }
})

test('MA-01: الموديول مقفول = مسار إنشاء الاجتماع مقفول، بجمهور أو من غيره', async () => {
  for (const body of [{}, { audience: units(B.a, D.sales) }]) for (const user of [U.admin, U.host]) assert.equal((await create(user, body)).status, 404)
  assert.equal(await t.repo('Meeting').count(), 0)
  await modules.enable('meet')
})

test('MA-02: الجمهور ← حسابات موظفينه الحاليين جوه نطاق صاحب الاجتماع بالظبط — هو برّه، واللي من غير حساب بيتعدّ ومابيتدعاش؛ دعوات عادية بترن؛ والتحويل مرة واحدة', async () => {
  const audience = units(B.a, D.sales)
  // المعاينة اللي صاحب الاجتماع شافها: موظفين القسم الحاليين (هو منهم)
  const preview = t.expectStatus(await t.request(U.host, 'POST', '/org/audience-preview', { audience }), 200)
  assert.deepEqual(preview.employees.map(row => row.id).sort((a, b) => a - b), [E.host.id, E.one.id, E.two.id, E.noAccount.id, E.stopped.id].sort((a, b) => a - b))
  const made = t.expectStatus(await create(U.host, { audience }), 201)
  assert.deepEqual([Object.keys(made).sort(), made.invited, made.audience], [['audience', 'id', 'invited'], 2, { employees: preview.count - 1, withoutAccount: 2 }])
  assert.deepEqual(await invitedOf(made.id), ids('one', 'two'), 'الحسابات النشطة لموظفين القسم الحاليين، من غير صاحب الاجتماع ولا الموقوف ولا اللي خدمته انتهت')
  // الاجتماع نفسه مابيحفظش الجمهور: صف اجتماع عادي
  const row = await t.repo('Meeting').findOneByOrFail({ code: made.id })
  assert.deepEqual(Object.keys(row).sort(), ['cancelledAt', 'code', 'createdAt', 'endedAt', 'hostUserId', 'id', 'lobby', 'startsAt', 'title'])
  assert.deepEqual([row.hostUserId, row.startsAt, row.lobby], [U.host.id, null, true])
  // بترن عند المدعوين زي الدعوة بالاسم — مش عند زميل القسم التاني ولا الفرع التاني ولا صاحبه
  for (const [key, ringing] of [['one', true], ['two', true], ['fin', false], ['far', false], ['host', false]]) {
    assert.deepEqual(t.expectStatus(await t.request(U[key], 'GET', '/meet/inbox'), 200).invites.map(invite => invite.id), ringing ? [made.id] : [], key)
  }
  // الكارت بيقول كام مدعو، والمدعو يدخل بتذكرته من غير طلب دخول
  const mine = t.expectStatus(await t.request(U.host, 'GET', R), 200).meetings
  assert.deepEqual(mine.map(meeting => [meeting.id, meeting.inviteCount, meeting.isHost]), [[made.id, 2, true]])
  assert.deepEqual([t.expectStatus(await t.request(U.one, 'GET', `${R}/${made.id}`), 200).access, (await t.request(U.one, 'POST', `${R}/${made.id}/token`)).status,
    (await t.request(U.fin, 'POST', `${R}/${made.id}/token`)).status], ['invited', 200, 403])
  // التحويل مرة واحدة وقت الإنشاء: اللي انضم للقسم بعدها مش مدعو
  await employee('joiner', B.a, { departmentId: D.sales.id }); await account('joiner')
  assert.deepEqual([await invitedOf(made.id), t.expectStatus(await t.request(U.joiner, 'GET', '/meet/inbox'), 200).invites, t.expectStatus(await t.request(U.joiner, 'GET', R), 200).meetings],
    [ids('one', 'two'), [], []])
  // بميعاد: نفس التحويل، ومابيرنش قبل ميعاده
  const later = t.expectStatus(await create(U.host, { audience, startsAt: new Date(Date.now() + 3 * 3600000).toISOString() }), 201)
  assert.deepEqual([later.invited, await invitedOf(later.id), t.expectStatus(await t.request(U.joiner, 'GET', '/meet/inbox'), 200).invites], [3, ids('one', 'two', 'joiner'), []])
  assert.equal(calls.filter(url => !url.endsWith('/ListRooms')).length, 0, 'الإنشاء والدعوة من غير أي أمر على خادم الاجتماعات')
})

test('MA-03: «الكل ماعدا…»، وفرع كامل، والشركة كلها بنطاق الحساب، وموظفين بالاسم، ومع مدعوين بالاسم من غير تكرار', async () => {
  // المستثنى بالاسم برّه
  const except = t.expectStatus(await create(U.host, { audience: { ...units(B.a, D.sales), exclude: [E.one.id, E.noAccount.id] } }), 201)
  assert.deepEqual([await invitedOf(except.id), except.invited, except.audience], [ids('two', 'joiner'), 2, { employees: 3, withoutAccount: 1 }])
  // فرع كامل
  const branch = t.expectStatus(await create(U.host, { audience: branches(B.a) }), 201)
  assert.deepEqual([await invitedOf(branch.id), branch.audience], [ids('one', 'two', 'fin', 'joiner'), { employees: 7, withoutAccount: 3 }])
  // «الشركة كلها»: لحساب فرع = فرعه بس (نطاقه)، ولحساب على مستوى الشركة = الكل
  const scoped = t.expectStatus(await create(U.host, { audience: { mode: 'all' } }), 201)
  assert.deepEqual(await invitedOf(scoped.id), ids('one', 'two', 'fin', 'joiner'), 'موظف الفرع التاني برّه نطاق صاحب الاجتماع')
  const everyone = t.expectStatus(await create(U.admin, { audience: {} }), 201)
  assert.deepEqual([await invitedOf(everyone.id), everyone.audience], [ids('host', 'one', 'two', 'fin', 'far', 'joiner'), { employees: 9, withoutAccount: 3 }])
  // فرعين بعلامات صح: اللي برّه النطاق مابيتدعاش
  assert.deepEqual(await invitedOf(t.expectStatus(await create(U.host, { audience: branches(B.a, B.b) }), 201).id), ids('one', 'two', 'fin', 'joiner'))
  // موظفين بالاسم من المنتقي: اللي في النطاق بس
  const named = t.expectStatus(await create(U.host, { audience: { mode: 'employees', ids: [E.one.id, E.far.id, E.host.id] } }), 201)
  assert.deepEqual([await invitedOf(named.id), named.audience], [ids('one'), { employees: 1, withoutAccount: 0 }])
  // مع مدعوين بالاسم (دليل الاجتماعات على كل الشركة): الاتنين مع بعض من غير تكرار
  const both = t.expectStatus(await create(U.host, { audience: units(B.a, D.finance), inviteUserIds: [U.far.id, U.fin.id, U.host.id, U.stopped.id] }), 201)
  assert.deepEqual([await invitedOf(both.id), both.invited, both.audience], [ids('fin', 'far'), 2, { employees: 2, withoutAccount: 1 }])
  // من غير جمهور: الرد زي الأول بالحرف
  assert.deepEqual(Object.keys(t.expectStatus(await create(U.host, { inviteUserIds: [U.one.id] }), 201)), ['id'])
  assert.deepEqual(Object.keys(t.expectStatus(await create(U.host, { audience: null, inviteUserIds: [U.one.id] }), 201)), ['id'], 'الخانة الفاضية = من غير فلاتر (مش الشركة كلها)')
})

test('MA-04: الرفض — جمهور تالف أو بشكل تاني، ووحدة مش تبع فرعها، وفرع برّه النطاق زي فرع مالوش وجود، وجمهور فاضي أو من غير حسابات، ومن غير الصلاحية، وفي التعديل', async () => {
  const before = await t.repo('Meeting').count(), invites = await t.repo('MeetingInvite').count()
  const label = rules.MEET_AUDIENCE_LABEL
  for (const [audience, message] of [
    ['x', `${label} بصيغة غير صحيحة`], [[1, 2], `${label} بصيغة غير صحيحة`], [5, `${label} بصيغة غير صحيحة`],
    [{ mode: 'roles', ids: ['hr'] }, `اختيار «مين» في ${label} غير معروف`], [{ mode: 'positions', ids: ['department_manager'] }, `اختيار «مين» في ${label} غير معروف`],
    [{ mode: 'all', conditions: { all: [] } }, `${label} «على مين؟» بس — من غير شروط صفات`],
    [{ mode: 'employees', ids: [] }, `اختار الموظفين في ${label}`], [{ mode: 'employees', ids: ['x'] }, `اختار الموظفين في ${label}`],
    [{ mode: 'all', where: { mode: 'departments', ids: [D.sales.id] } }, `اختيار «فين» في ${label} غير معروف`],
    [{ mode: 'all', where: { mode: 'units', ids: [D.sales.id] } }, `اختار الفرع اللي الإدارات أو الأقسام تبعه في ${label}`],
    [{ mode: 'all', where: { mode: 'units', ids: [], branchId: B.a.id } }, `اختار الفروع أو الإدارات أو الأقسام أو الفرق في ${label}`],
    [{ mode: 'all', where: { mode: 'units', ids: [D.sales.id], branchId: 'x' } }, `فرع ${label} غير صالح`],
    [{ ...units(B.a, D.sales), exclude: 'x' }, `قايمة المستثنين في ${label} غير صالحة (500 بالكتير)`],
    // موجود بس مكانه غلط: قسم الفرع التاني تحت فرع صاحب الاجتماع، ومستثنى مالوش وجود
    [units(B.a, D.other), `في إدارة أو قسم مختار في ${label} مش موجود أو مش تبع الفرع ده`],
    [{ ...units(B.a, D.sales), exclude: [987654] }, `في موظف مستثنى في ${label} مش موجود`],
    // جمهور مفيهوش حد جوه النطاق، أو مفيهوش حساب نشط
    [branches(B.b), rules.MEET_AUDIENCE_NOBODY], [{ mode: 'employees', ids: [E.far.id] }, rules.MEET_AUDIENCE_NOBODY], [{ mode: 'employees', ids: [E.host.id] }, rules.MEET_AUDIENCE_NOBODY],
    [{ mode: 'all', ids: [], where: { mode: 'teams', ids: [T.lonely.id], branchId: B.a.id } }, rules.MEET_AUDIENCE_NO_ACCOUNTS],
    [{ mode: 'employees', ids: [E.noAccount.id, E.stopped.id] }, rules.MEET_AUDIENCE_NO_ACCOUNTS],
  ]) assert.deepEqual(answer(await create(U.host, { audience })), [400, message], JSON.stringify(audience))
  // فرع برّه نطاق الحساب = فرع مالوش وجود: نفس الرد بالحرف (قسمه الصحيح مايفرقش)
  const foreign = answer(await create(U.host, { audience: units(B.b, D.other) })), missing = answer(await create(U.host, { audience: units({ id: 987654 }, D.other) }))
  assert.deepEqual([foreign, missing], [[400, `الفرع المختار في ${label} مش موجود`], [400, `الفرع المختار في ${label} مش موجود`]])
  // نفس الجمهور لحساب على مستوى الشركة بيعدّي
  await drop(t.expectStatus(await create(U.admin, { audience: units(B.b, D.other) }), 201).id)
  // من غير صلاحية شاشة من شاشات تحديد الجمهور: الدعوة بالاسم بس — زي ما مسار المعاينة مقفول عليه
  const plain = await create(U.one, { audience: units(B.a, D.sales) })
  assert.deepEqual([plain.status, plain.body.code, messageOf(plain), (await t.request(U.one, 'POST', '/org/audience-preview', { audience: units(B.a, D.sales) })).status],
    [403, 'MEET_AUDIENCE_PERM', rules.MEET_AUDIENCE_PERM, 403])
  await drop(t.expectStatus(await create(U.one, { inviteUserIds: [U.two.id] }), 201).id)
  // التعديل بالاسم بس
  const made = t.expectStatus(await create(U.host, { inviteUserIds: [U.one.id] }), 201)
  assert.deepEqual(answer(await t.request(U.host, 'PATCH', `${R}/${made.id}`, { audience: units(B.a, D.sales) })), [400, rules.MEET_AUDIENCE_ON_CREATE])
  assert.deepEqual(await invitedOf(made.id), ids('one'))
  await drop(made.id)
  assert.deepEqual([await t.repo('Meeting').count(), await t.repo('MeetingInvite').count()], [before, invites], 'ولا اجتماع ولا دعوة من طلب مرفوض')
})

test('MA-05: الحد — 500 مدعو بيعدّوا و501 بيترفضوا برسالة واضحة', async () => {
  assert.equal(rules.MEET_MAX_INVITES, 500)
  D.big = await t.repo('Department').save({ branchId: B.big.id, name: 'قسم كبير', unitType: 'DEPARTMENT' })
  const staff = await t.repo('Employee').save(Array.from({ length: 501 }, (_, index) => ({ employeeCode: `MB${String(index).padStart(4, '0')}`, fullName: `موظف كبير ${index}`, branchId: B.big.id, departmentId: D.big.id,
    jobTitle: 'موظف', joinDate: '2022-01-01', basicSalary: 5000, status: 'active', isActive: true, payMethod: 'transfer' })), { chunk: 100 })
  await t.repo('User').save(staff.map((row, index) => ({ email: `big${index}@meet-audience.invalid`, displayName: `حساب كبير ${index}`, passwordHash: 'test-only', role: 'employee', permissions: '[]',
    branchId: B.big.id, employeeId: row.id, isActive: true })), { chunk: 100 })
  const before = await t.repo('Meeting').count()
  const refused = await create(U.admin, { audience: branches(B.big) })
  assert.deepEqual([refused.status, refused.body.code, messageOf(refused)], [400, 'MEET_TOO_MANY_INVITES', 'الاجتماع لـ500 مدعو بالكتير — الاختيار ده 501. صغّر الجمهور'])
  // والحد على المدعوين كلهم: 500 من الجمهور + واحد بالاسم
  const over = await create(U.admin, { audience: { ...branches(B.big), exclude: [staff[0].id] }, inviteUserIds: [U.one.id] })
  assert.deepEqual([over.status, over.body.code, messageOf(over)], [400, 'MEET_TOO_MANY_INVITES', rules.meetTooManyInvites(501)])
  assert.equal(await t.repo('Meeting').count(), before)
  const made = t.expectStatus(await create(U.admin, { audience: { ...branches(B.big), exclude: [staff[0].id] } }), 201)
  assert.deepEqual([made.invited, made.audience, (await invitedOf(made.id)).length], [500, { employees: 500, withoutAccount: 0 }, 500])
  assert.equal(t.expectStatus(await t.request(U.admin, 'GET', R), 200).meetings.find(meeting => meeting.id === made.id).inviteCount, 500)
})
