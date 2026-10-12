'use strict'
// B-ADD.8: «رقم التحويلة / رقم العمل» على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_work_extension_test_<16 hex>)، عبر HTTP
// بتوكنات موقّعة محليًا ومن غير كلمات مرور.
//  WX-01) الحفظ والقراءة: أرقام بس (العربي بيتحوّل، والحروف مرفوضة)، الصفر في الأول محفوظ، والمسح بـnull، وسجل التغييرات.
//  WX-02) مابيتكررش: نفس الرقم لموظف تاني مرفوض (واسم صاحبه لحساب في نطاقه بس)، والفهرس الفريد حارس أخير، والفاضي بيتكرر عادي.
//  WX-03) قبل ترحيل 188: القراءة فاضية وباقي الملف بيتحفظ، وحفظ رقم بيقول إن الترحيل ناقص.
// Run (من api/): node --test test/work-extension.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { disposableApp } = require('./helpers/disposable-app.cjs')
const t = disposableApp('work_extension')
const org = {}, users = {}, emps = {}
let number = 0
const employee = (branch, overrides = {}) => { const n = ++number
  return t.repo('Employee').save({ employeeCode: `WX${String(n).padStart(3, '0')}`, fullName: `موظف التحويلة ${n}`, nationality: 'سعودي', branchId: branch.id,
    joinDate: '2022-01-01', basicSalary: 5000, status: 'active', isActive: true, payMethod: 'transfer', ...overrides }) }
const stored = async id => (await t.query('SELECT [workExtension] AS [value] FROM dbo.employees WHERE [id] = @0', [id]))[0].value

before(async () => {
  await t.start()
  org.riyadh = await t.repo('Branch').save({ code: 'WX_R', name: 'فرع الرياض' })
  org.jeddah = await t.repo('Branch').save({ code: 'WX_J', name: 'فرع جدة' })
  users.admin = await t.user()
  users.jeddahHr = await t.user({ role: 'hr_manager', branchId: org.jeddah.id, permissions: JSON.stringify(['employees.view', 'employees.edit']) })
  emps.a = await employee(org.riyadh); emps.b = await employee(org.riyadh); emps.c = await employee(org.jeddah)
}, { timeout: 90000 })
after(context => t.stop(context))

test('WX-01: الحفظ والقراءة — أرقام بس، العربي بيتحوّل، الصفر في الأول محفوظ، المسح بـnull، وسجل التغييرات', async () => {
  const save = (emp, workExtension, user = users.admin) => t.request(user, 'PATCH', `/employees/${emp.id}`, { workExtension })
  t.expectStatus(await save(emps.a, '0105'), 200)
  assert.equal(await stored(emps.a.id), '0105')
  assert.equal(t.expectStatus(await t.request(users.admin, 'GET', `/employees/${emps.a.id}`), 200).workExtension, '0105')
  t.expectStatus(await save(emps.a, '٢٠٧'), 200)
  assert.equal(await stored(emps.a.id), '207')
  for (const bad of ['12a', '12-3', '+123', '1 2', '12345678901']) {
    const response = await save(emps.a, bad)
    assert.equal(response.status, 400, `${bad}: ${JSON.stringify(response.body)}`)
    assert.match(JSON.stringify(response.body), /رقم التحويلة/)
  }
  assert.equal(await stored(emps.a.id), '207')
  // تعديل من غير الخانة مابيلمسهاش، والمسح صريح
  t.expectStatus(await t.request(users.admin, 'PATCH', `/employees/${emps.a.id}`, { jobTitle: 'محاسب' }), 200)
  assert.equal(await stored(emps.a.id), '207')
  t.expectStatus(await save(emps.a, null), 200)
  assert.equal(await stored(emps.a.id), null)
  assert.equal(t.expectStatus(await t.request(users.admin, 'GET', `/employees/${emps.a.id}`), 200).workExtension, null)
  const changes = await t.repo('EmployeeStatusHistory').find({ where: { employeeId: emps.a.id, fieldName: 'workExtension' }, order: { id: 'ASC' } })
  assert.deepEqual(changes.map(row => [row.oldValue ?? null, row.newValue ?? null]), [[null, '0105'], ['0105', '207'], ['207', null]])
})

test('WX-02: مابيتكررش — الرقم المستخدم مرفوض، واسم صاحبه لحساب في نطاقه بس، والفهرس حارس أخير، والفاضي بيتكرر', async () => {
  t.expectStatus(await t.request(users.admin, 'PATCH', `/employees/${emps.a.id}`, { workExtension: '1001' }), 200)
  const taken = await t.request(users.admin, 'PATCH', `/employees/${emps.b.id}`, { workExtension: '1001' })
  assert.equal(taken.status, 409, JSON.stringify(taken.body))
  assert.match(taken.body.message, /رقم التحويلة 1001 مستخدم بالفعل/); assert.ok(taken.body.message.includes(emps.a.fullName))
  // حساب فرع جدة: الرفض من غير اسم موظف الرياض
  const outside = await t.request(users.jeddahHr, 'PATCH', `/employees/${emps.c.id}`, { workExtension: '1001' })
  assert.equal(outside.status, 409, JSON.stringify(outside.body))
  assert.ok(!outside.body.message.includes(emps.a.fullName), outside.body.message)
  assert.equal(await stored(emps.b.id), null); assert.equal(await stored(emps.c.id), null)
  // نفس الرقم على صاحبه = من غير تغيير، ورقم تاني للتاني عادي
  t.expectStatus(await t.request(users.admin, 'PATCH', `/employees/${emps.a.id}`, { workExtension: '1001' }), 200)
  t.expectStatus(await t.request(users.admin, 'PATCH', `/employees/${emps.b.id}`, { workExtension: '1002' }), 200)
  // الفهرس الفريد: كتابة مباشرة بنفس الرقم بترفضها القاعدة نفسها، والفاضي عند أكتر من موظف مسموح
  await assert.rejects(t.query('UPDATE dbo.employees SET [workExtension] = @0 WHERE [id] = @1', ['1001', emps.c.id]), /UX_employees_workExtension|duplicate/i)
  const index = await t.query(`SELECT [is_unique] AS [isUnique], [filter_definition] AS [filter] FROM sys.indexes WHERE [name] = 'UX_employees_workExtension' AND [object_id] = OBJECT_ID('dbo.employees')`)
  assert.deepEqual([index.length, Boolean(index[0].isUnique), /workExtension\] IS NOT NULL/.test(index[0].filter)], [1, true, true])
  assert.equal((await t.query('SELECT COUNT(*) AS [n] FROM dbo.employees WHERE [workExtension] IS NULL'))[0].n >= 1, true)
  // بعد ما صاحبه يمسحه، الرقم بيتاح
  t.expectStatus(await t.request(users.admin, 'PATCH', `/employees/${emps.a.id}`, { workExtension: '' }), 200)
  t.expectStatus(await t.request(users.jeddahHr, 'PATCH', `/employees/${emps.c.id}`, { workExtension: '1001' }), 200)
  assert.equal(await stored(emps.c.id), '1001')
})

test('WX-03: قبل ترحيل 188 — القراءة فاضية وباقي الملف بيتحفظ، وحفظ رقم بيقول إن الترحيل ناقص', async () => {
  await t.query('DROP INDEX [UX_employees_workExtension] ON dbo.employees')
  await t.query('ALTER TABLE dbo.employees DROP COLUMN [workExtension]')
  const read = t.expectStatus(await t.request(users.admin, 'GET', `/employees/${emps.c.id}`), 200)
  assert.equal(read.workExtension, null)
  t.expectStatus(await t.request(users.admin, 'PATCH', `/employees/${emps.c.id}`, { jobTitle: 'مهندس' }), 200)
  t.expectStatus(await t.request(users.admin, 'PATCH', `/employees/${emps.c.id}`, { workExtension: null }), 200)
  const response = await t.request(users.admin, 'PATCH', `/employees/${emps.c.id}`, { workExtension: '3003', jobTitle: 'مدير' })
  assert.equal(response.status, 400, JSON.stringify(response.body)); assert.match(response.body.message, /ترحيل 188/)
  assert.equal((await t.repo('Employee').findOneBy({ id: emps.c.id })).jobTitle, 'مهندس', 'الحفظ كله رجع')
})
