'use strict'
// B-ADD.9: «مين يبصم من الموبايل» بالاستهداف الموحد، على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_punch_audience_test_<16 hex>)،
// عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور.
//  MPA-01) من غير جمهور = الكل زي الأول؛ بجمهور: اللي جوه بيبصم، واللي برّه من غير زرار والخادم بيرفضه من غير محاولة ولا بصمة،
//          والمستثنى بالاسم برّه، والحكم بمكان الموظف دلوقتي (اتنقل لقسم تاني = خرج).
//  MPA-02) الكاتب: بصلاحية إدارة الحضور ومن حساب على كل الفروع بس، الشكل الغلط والوحدة اللي مش موجودة مرفوضين، null بيمسح الصف، وسطر تدقيق.
//  MPA-03) نص اتغيّر برّه الكاتب = بصمة الموبايل مقفولة للكل، والشاشة بتقول إنه تالف.
// Run (من api/): node --test test/mobile-punch-audience.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { disposableApp } = require('./helpers/disposable-app.cjs')
const { moduleTools } = require('./helpers/modules.cjs')
const t = disposableApp('punch_audience')
const B = {}, D = {}, E = {}, U = {}
const P = '/attendance/mobile-punch', KEY = 'attendance.mobile_punch.audience'
const INSIDE = { latitude: 24.7137, longitude: 46.6754, accuracy: 12 }
const NOT_ALLOWED = 'بصمة الموبايل مش مفعّلة لك — راجع الموارد البشرية'
let sequence = 0
const employee = (name, branch, department, extra = {}) => t.repo('Employee').save({ employeeCode: 'PA' + ++sequence, fullName: name, branchId: branch.id, departmentId: department?.id ?? null,
  joinDate: '2020-01-01', basicSalary: 5000, status: 'active', isActive: true, payMethod: 'cash', fingerprintCode: String(7000 + sequence), ...extra })
const account = (person, branch, permissions = [], extra = {}) => t.user({ role: 'employee', branchId: branch.id, permissions: JSON.stringify(permissions), employeeId: person?.id ?? null, isActive: true, ...extra })
const punch = user => t.request(user, 'POST', P, INSIDE)
const mine = async user => t.expectStatus(await t.request(user, 'GET', P), 200)
const saveAudience = (user, audience) => t.request(user, 'PUT', `${P}/audience`, { audience })
const attempts = person => t.repo('MobilePunchAttempt').countBy({ employeeId: person.id })
const cool = () => t.query('UPDATE dbo.mobile_punch_attempts SET [createdAt] = DATEADD(MINUTE, -5, [createdAt])')
const storedAudience = async () => (await t.query('SELECT [value] FROM dbo.requests_config WHERE [key] = @0', [KEY]))[0]?.value ?? null

before(async () => {
  await t.start()
  await moduleTools(t.app).feature('attendance.mobile_punch', true)
  B.riyadh = await t.repo('Branch').save({ code: 'PA_1', name: 'فرع الرياض', country: 'SA' })
  B.cairo = await t.repo('Branch').save({ code: 'PA_2', name: 'فرع القاهرة', country: 'EG' })
  D.sales = await t.repo('Department').save({ branchId: B.riyadh.id, name: 'المبيعات' })
  D.ops = await t.repo('Department').save({ branchId: B.riyadh.id, name: 'التشغيل' })
  D.cairo = await t.repo('Department').save({ branchId: B.cairo.id, name: 'مبيعات القاهرة' })
  E.seller = await employee('بايع أول', B.riyadh, D.sales); E.seller2 = await employee('بايع تاني', B.riyadh, D.sales); E.operator = await employee('موظف تشغيل', B.riyadh, D.ops)
  U.admin = await t.user({ scopeAllBranches: true })
  t.expectStatus(await t.request(U.admin, 'POST', `${P}/sites`, { name: 'مقر الرياض', branchId: B.riyadh.id, latitude: 24.7136, longitude: 46.6753, radiusMeters: 150, isActive: true }), 201)
  U.seller = await account(E.seller, B.riyadh); U.seller2 = await account(E.seller2, B.riyadh); U.operator = await account(E.operator, B.riyadh)
  U.branchManager = await account(null, B.riyadh, ['attendance.manage', 'attendance.view_all'])
  U.viewer = await account(null, B.riyadh, ['attendance.view_all'])
}, { timeout: 120000 })
after(context => t.stop(context))

test('MPA-01: من غير جمهور الكل بيبصم؛ وبجمهور: اللي جوه بس، واللي برّه من غير زرار والخادم بيرفضه من غير محاولة، والمستثنى برّه، وبمكان الموظف دلوقتي', async () => {
  assert.equal(await storedAudience(), null)
  assert.deepEqual([(await mine(U.operator)).allowed, (await mine(U.operator)).sites.length], [true, 1])
  t.expectStatus(await punch(U.operator), 201)
  await cool()
  // قسم المبيعات في فرع الرياض بس
  const sales = { mode: 'all', where: { mode: 'units', ids: [D.sales.id], branchId: B.riyadh.id } }
  assert.deepEqual(t.expectStatus(await saveAudience(U.admin, sales), 200).audience.where, { mode: 'units', ids: [D.sales.id], branchId: B.riyadh.id })
  t.expectStatus(await punch(U.seller), 201)
  const before = [await attempts(E.operator), await t.repo('AttendancePunch').countBy({ employeeId: E.operator.id })]
  const view = await mine(U.operator)
  assert.deepEqual([view.ready, view.allowed, view.sites, view.attempts], [true, false, [], []])
  const refused = await punch(U.operator)
  assert.deepEqual([refused.status, refused.body.message], [403, NOT_ALLOWED])
  assert.deepEqual([await attempts(E.operator), await t.repo('AttendancePunch').countBy({ employeeId: E.operator.id })], before, 'لا محاولة ولا بصمة')
  // «الكل ماعدا…»: بايع تاني مستثنى بالاسم
  t.expectStatus(await saveAudience(U.admin, { ...sales, exclude: [E.seller2.id] }), 200)
  assert.equal((await punch(U.seller2)).status, 403)
  await cool()
  t.expectStatus(await punch(U.seller), 201)
  // مكان الموظف دلوقتي: البايع اتنقل للتشغيل = خرج من الجمهور، وموظف التشغيل اتنقل للمبيعات = دخل
  await t.repo('Employee').update({ id: E.seller.id }, { departmentId: D.ops.id })
  await t.repo('Employee').update({ id: E.operator.id }, { departmentId: D.sales.id })
  await cool()
  assert.equal((await punch(U.seller)).status, 403)
  t.expectStatus(await punch(U.operator), 201)
  await t.repo('Employee').update({ id: E.seller.id }, { departmentId: D.sales.id })
  await t.repo('Employee').update({ id: E.operator.id }, { departmentId: D.ops.id })
  // موظفين بالاسم
  t.expectStatus(await saveAudience(U.admin, { mode: 'employees', ids: [E.operator.id] }), 200)
  await cool()
  t.expectStatus(await punch(U.operator), 201)
  assert.equal((await punch(U.seller)).status, 403)
})

test('MPA-02: الكاتب — بصلاحية إدارة الحضور ومن حساب على كل الفروع بس، والغلط مرفوض، وnull بيمسح الصف، وسطر تدقيق', async () => {
  const before = await storedAudience()
  assert.equal((await saveAudience(U.viewer, null)).status, 403)
  const scoped = await saveAudience(U.branchManager, null)
  assert.deepEqual([scoped.status, scoped.body.message], [403, 'جمهور بصمة الموبايل بيتحدد من حساب على كل الفروع'])
  const read = t.expectStatus(await t.request(U.branchManager, 'GET', `${P}/audience`), 200)
  assert.deepEqual([read.canEdit, read.damaged, read.audience.mode], [false, false, 'employees'])
  assert.equal((await t.request(U.viewer, 'GET', `${P}/audience`)).status, 403)
  for (const bad of [{ mode: 'roles', ids: ['hr_manager'] }, { mode: 'all', where: { mode: 'units', ids: [] } }, { mode: 'all', conditions: [{ field: 'nationality' }] }, 'الكل', []]) {
    assert.equal((await saveAudience(U.admin, bad)).status, 400, JSON.stringify(bad))
  }
  // قسم القاهرة مش تبع فرع الرياض، وقسم مش موجود
  assert.equal((await saveAudience(U.admin, { mode: 'all', where: { mode: 'units', ids: [D.cairo.id], branchId: B.riyadh.id } })).status, 400)
  assert.equal((await saveAudience(U.admin, { mode: 'all', where: { mode: 'units', ids: [999999], branchId: B.riyadh.id } })).status, 400)
  assert.equal(await storedAudience(), before, 'الرفض مابيكتبش')
  const audits = () => t.repo('AuditLog').countBy({ action: 'MOBILE_PUNCH_AUDIENCE_CHANGED' })
  const count = await audits()
  assert.equal(t.expectStatus(await saveAudience(U.admin, null), 200).audience, null)
  assert.equal(await storedAudience(), null)
  assert.equal(await audits(), count + 1)
  // نفس القيمة تاني = من غير سطر تدقيق جديد
  t.expectStatus(await saveAudience(U.admin, null), 200)
  assert.equal(await audits(), count + 1)
  assert.equal(t.expectStatus(await t.request(U.admin, 'GET', `${P}/audience`), 200).canEdit, true)
  await cool()
  t.expectStatus(await punch(U.seller), 201)
})

test('MPA-03: نص اتغيّر برّه الكاتب = مقفولة للكل، والشاشة بتقول إنه تالف، والحفظ من جديد بيصلّحه', async () => {
  for (const damaged of ['{"mode":"all","ids":[],"where":{"mode":"units","ids":[]}}', 'مش JSON', '{"mode":"roles","ids":["employee"],"where":null}']) {
    await t.query('DELETE FROM dbo.requests_config WHERE [key] = @0', [KEY])
    await t.query('INSERT INTO dbo.requests_config ([key], [value]) VALUES (@0, @1)', [KEY, damaged])
    await cool()
    assert.equal((await mine(U.seller)).allowed, false, damaged)
    assert.equal((await punch(U.seller)).status, 403, damaged)
    assert.deepEqual([(await t.request(U.admin, 'GET', `${P}/audience`)).body.damaged, (await t.request(U.admin, 'GET', `${P}/audience`)).body.audience], [true, null])
  }
  t.expectStatus(await saveAudience(U.admin, { mode: 'all', where: { mode: 'branches', ids: [B.riyadh.id] } }), 200)
  await cool()
  t.expectStatus(await punch(U.seller), 201)
})
