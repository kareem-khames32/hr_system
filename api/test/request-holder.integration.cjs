'use strict'
// B-ADD.17 (طلب المالك 12 أكتوبر): «الطلب وقف عند مين؟» — على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_request_holder_test_<16 hex>)،
// عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور.
//  RH-01) خطوة «المدير المباشر»: اسم المدير ومسمّاه ومن إمتى، في «طلباتي» وتفاصيل الطلب ولوحة الطلبات — والطلب في صندوقه هو بس؛ الرد
//         اسم ومسمى من غير أرقام.
//  RH-02) خطوة «مدير المدير المباشر» بعد اعتماد الأولى: «من إمتى» بيتحرك لوقت الاعتماد؛ والاسم لصاحب الطلب دايمًا، ولغيره لو فرع الشخص
//         الحالي جوه نطاقه بس (المسمى كذلك) — بالفرع الحالي.
//  RH-03) خطوة دور وظيفي بكذا حامل: أسماء أول خمسة و«+N»؛ حامل برّه نطاق فرع الطلب ومدير النظام مش منهم؛ وصاحب الطلب اللي بيحمل الدور
//         مش مستني على نفسه.
//  RH-04) خطوة عند بديل بتفويض ساري: «البديل بالنيابة عن المفوِّض»؛ خطوة «مش مسموح تتفوّض» وطلب البديل نفسه بيفضلوا عند المعتمد؛ وبعد
//         الإلغاء بترجع.
//  RH-05) النوع السري: المحجوب في لوحة الطلبات وتفاصيله مابيتزوّدش عليه حاجة؛ وصاحبه والمعتمد بيشوفوا.
//  RH-06) برّه السلسلة والنطاق: مفيش حاجة جديدة (404 زي الرقم اللي مش موجود، و403 زي الأول)؛ والطلب اللي مش قيد المراجعة من غير «واقف عند».
//  RH-07) مجموعة متوازية (اسم لكل خطوة، والاعتماد الجزئي مابيحركش «من إمتى»)، والتصعيد (المعتمد الجديد ووقت التصعيد).
//  في كل حالة: الاسم المكتوب هو اللي الطلب في صندوقه فعلًا (GET /requests/inbox لكل حساب).
// Run (من api/): node --test test/request-holder.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { disposableApp } = require('./helpers/disposable-app.cjs')
const t = disposableApp('request_holder')
const org = {}, users = {}, emps = {}, types = {}
let number = 0, requests

const employee = (fullName, extra = {}) => t.repo('Employee').save({ employeeCode: `RH${String(++number).padStart(3, '0')}`, fullName, branchId: org.branchA.id, joinDate: '2020-01-01',
  basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...extra })
const account = (label, permissions = [], extra = {}) => t.repo('User').save({ email: `${label}@request-holder.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role: 'employee', branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const get = async (user, route) => t.expectStatus(await t.request(user, 'GET', route), 200)
const submit = async (user, type) => t.expectStatus(await t.request(user, 'POST', '/requests', { typeCode: type.code, payload: { reason: 'طلب للاختبار' }, submit: true }), 201)
const act = (user, id, action = 'APPROVE', comment) => t.request(user, 'POST', `/requests/${id}/act`, { action, comment })
const mineRow = async (user, id) => (await get(user, '/requests/mine')).find(row => row.id === id)
const allRow = async (user, id) => (await get(user, '/requests/all')).find(row => row.id === id)
const detail = (user, id) => get(user, `/requests/${id}`)
const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const day = offset => { const date = new Date(); date.setDate(date.getDate() + offset); return localDate(date) }
const person = (emp, role, extra = {}) => ({ name: emp.fullName, jobTitle: emp.jobTitle ?? null, role, ...extra })
// كل اختبار بيبدأ من غير طلب قيد المراجعة ولا تفويض من اختبار قبله
async function fresh() {
  await t.query(`UPDATE [requests] SET [status] = N'CANCELLED' WHERE [status] = N'UNDER_REVIEW'`)
  await t.query('DELETE FROM [approval_delegations]')
}
// الطلب في صندوق الحسابات دي بالظبط — من كل حسابات الاختبار غير مدير النظام (بيتصرف في أي خطوة، ومش هو اللي «مستني عليه»)
async function assertInInboxOf(id, holders) {
  for (const [key, user] of Object.entries(users)) {
    if (key === 'admin') continue
    const has = (await get(user, '/requests/inbox')).some(row => row.id === id)
    assert.equal(has, holders.includes(key), `صندوق ${key}`)
  }
}

before(async () => {
  await t.start()
  requests = t.app.get(require('../src/requests/requests.service').RequestsService)
  org.branchA = await t.repo('Branch').save({ code: 'RH_A', name: 'فرع الطلبات أ' })
  org.branchB = await t.repo('Branch').save({ code: 'RH_B', name: 'فرع الطلبات ب' })
  emps.ceo = await employee('طارق الرئيس', { branchId: org.branchB.id, jobTitle: 'الرئيس التنفيذي' })
  emps.head = await employee('هالة مديرة الإدارة', { managerEmployeeId: emps.ceo.id, jobTitle: 'مديرة الإدارة' })
  org.department = await t.repo('Department').save({ name: 'قسم المبيعات', branchId: org.branchA.id, managerEmployeeId: emps.head.id })
  emps.manager = await employee('منصور مدير المبيعات', { managerEmployeeId: emps.head.id, jobTitle: 'مدير المبيعات' })
  emps.worker = await employee('وليد الموظف', { managerEmployeeId: emps.manager.id, departmentId: org.department.id })
  emps.worker2 = await employee('وفاء الموظفة', { managerEmployeeId: emps.head.id })
  emps.deputy = await employee('نادر النائب', { managerEmployeeId: emps.manager.id, jobTitle: 'نائب مدير المبيعات' })
  emps.outsider = await employee('غريب عن الطلب')
  emps.finance = await employee('فريد المحاسب', { jobTitle: 'محاسب' })
  emps.hrB = await employee('حامل الفرع التاني', { branchId: org.branchB.id, jobTitle: 'أخصائي موارد بشرية' })
  users.admin = await t.user({ branchId: null, scopeAllBranches: true })
  // رأس الشركة: موظف في الفرع ب وحسابه على كل الفروع
  users.ceo = await account('ceo', [], { employeeId: emps.ceo.id, branchId: org.branchB.id, scopeAllBranches: true })
  for (const key of ['head', 'manager', 'worker', 'worker2', 'deputy', 'outsider']) users[key] = await account(key, [], { employeeId: emps[key].id })
  users.finance = await account('finance', ['approve.finance'], { employeeId: emps.finance.id })
  // حاملي دور الموارد البشرية في فرع الطلب: ستة موظفين وحساب من غير موظف
  for (let index = 1; index <= 6; index++) {
    emps[`hr${index}`] = await employee(`حامل ${index}`, { jobTitle: `أخصائي موارد بشرية ${index}` })
    users[`hr${index}`] = await account(`hr${index}`, ['approve.hr'], { employeeId: emps[`hr${index}`].id })
  }
  users.hrDesk = await account('hr-desk', ['approve.hr'], { displayName: 'مكتب الموارد البشرية' })
  users.hrB = await account('hr-b', ['approve.hr'], { employeeId: emps.hrB.id, branchId: org.branchB.id })
  users.consoleA = await account('console-a', ['requests.view_all'])
  users.consoleB = await account('console-b', ['requests.view_all'], { branchId: org.branchB.id })

  const type = async (code, nameAr, steps, extra = {}) => {
    const chain = await t.repo('ApprovalChain').save({ code, nameAr: `سلسلة ${code}`, isActive: true, autoApprove: false })
    for (const [index, step] of steps.entries()) await t.repo('ApprovalStep').save({ chainId: chain.id, stepOrder: index + 1, ...step })
    return t.repo('RequestType').save({ code, nameAr, category: 'personal_data', destinationHandler: 'none', approvalChainId: chain.id, isActive: true, ...extra })
  }
  types.direct = await type('RH_DIRECT', 'طلب للمدير المباشر', [{ approverRole: 'direct_manager_of_requester' }])
  types.skip = await type('RH_SKIP', 'طلب للمدير ومديره', [{ approverRole: 'direct_manager_of_requester' }, { approverRole: 'manager_of_direct_manager' }])
  types.hr = await type('RH_HR', 'طلب للموارد البشرية', [{ approverRole: 'hr' }])
  types.locked = await type('RH_LOCKED', 'طلب خطوته مابتتفوّضش', [{ approverRole: 'direct_manager_of_requester', canDelegate: false }])
  types.secret = await type('RH_SECRET', 'بلاغ سري', [{ approverRole: 'hr' }], { isConfidential: true })
  types.parallel = await type('RH_PARALLEL', 'طلب بخطوتين مع بعض', [{ approverRole: 'direct_manager_of_requester', stepOrder: 1 }, { approverRole: 'finance', stepOrder: 1 }])
  types.escalating = await type('RH_ESCALATE', 'طلب بيتصعّد', [{ approverRole: 'direct_manager_of_requester', slaDays: 1, escalateTo: 'department_manager_of_requester' }])
}, { timeout: 180000 })
after(context => t.stop(context))

test('RH-01: خطوة «المدير المباشر» — اسم المدير ومسمّاه ومن إمتى، في طلباتي والتفاصيل ولوحة الطلبات؛ والطلب في صندوقه هو', async () => {
  await fresh()
  const req = await submit(users.worker, types.direct)
  const mine = await mineRow(users.worker, req.id)
  assert.deepEqual(mine.waitingAt, { stepOrder: 1, roles: ['direct_manager_of_requester'], since: mine.submittedAt,
    people: [person(emps.manager, 'direct_manager_of_requester')], more: 0 })
  assert.equal(mine.waitingAt.people[0].jobTitle, 'مدير المبيعات')
  // اسم ومسمى ودور بس: من غير رقم موظف ولا حساب
  assert.deepEqual(Object.keys(mine.waitingAt.people[0]).sort(), ['jobTitle', 'name', 'role'])
  // نفس الرد في تفاصيل الطلب لصاحبه، وللمعتمد، وفي لوحة الطلبات (قايمة وتفاصيل) لحساب الفرع
  for (const view of [await detail(users.worker, req.id), await detail(users.manager, req.id), await allRow(users.consoleA, req.id), await detail(users.consoleA, req.id), await detail(users.admin, req.id)]) {
    assert.deepEqual(view.waitingAt, mine.waitingAt)
  }
  await assertInInboxOf(req.id, ['manager'])
})

test('RH-02: «مدير المدير المباشر» بعد اعتماد الأولى — «من إمتى» وقت الاعتماد؛ الاسم لصاحب الطلب دايمًا ولغيره بفرع الشخص الحالي', async () => {
  await fresh()
  const req = await submit(users.worker2, types.skip)
  const first = (await mineRow(users.worker2, req.id)).waitingAt
  assert.deepEqual([first.stepOrder, first.people], [1, [person(emps.head, 'direct_manager_of_requester')]])
  await assertInInboxOf(req.id, ['head'])
  t.expectStatus(await act(users.head, req.id), 201)
  // صاحب الطلب: اسم مدير المدير (ده الغرض)، ومسمّاه لأ — فرعه برّه نطاقه، فاسم الدور هو اللي بيتكتب
  const own = await detail(users.worker2, req.id)
  assert.deepEqual(own.waitingAt.people, [{ name: emps.ceo.fullName, jobTitle: null, role: 'manager_of_direct_manager' }])
  assert.deepEqual([own.waitingAt.stepOrder, own.waitingAt.roles, own.waitingAt.more], [2, ['manager_of_direct_manager'], 0])
  // «من إمتى» = وقت اعتماد الخطوة اللي قبلها (المحفوظ على الخطوة نفسها)
  assert.equal(own.waitingAt.since, JSON.parse(own.resolvedSteps)[0].actedAt)
  assert.ok(Date.parse(own.waitingAt.since) >= Date.parse(first.since))
  assert.deepEqual((await mineRow(users.worker2, req.id)).waitingAt, own.waitingAt)
  // حساب كل الفروع والشخص نفسه: الاسم والمسمى
  for (const user of [users.admin, users.ceo]) assert.deepEqual((await detail(user, req.id)).waitingAt.people, [person(emps.ceo, 'manager_of_direct_manager')])
  // لوحة الطلبات بحساب الفرع أ، والمعتمد اللي قبله: الشخص في فرع برّه نطاقهم — معدود من غير اسم، واسمه مش في الرد كله
  for (const view of [await allRow(users.consoleA, req.id), await detail(users.consoleA, req.id), await detail(users.head, req.id)]) {
    assert.deepEqual([view.waitingAt.people, view.waitingAt.more, view.waitingAt.roles], [[], 1, ['manager_of_direct_manager']])
    assert.ok(!JSON.stringify(view).includes(emps.ceo.fullName))
  }
  await assertInInboxOf(req.id, ['ceo'])
  // بالفرع الحالي: الشخص اتنقل لفرع جوه نطاق القارئ ← اسمه ومسمّاه بيظهروا
  await t.query('UPDATE [employees] SET [branchId] = @0 WHERE [id] = @1', [org.branchA.id, emps.ceo.id])
  try {
    assert.deepEqual((await detail(users.consoleA, req.id)).waitingAt.people, [person(emps.ceo, 'manager_of_direct_manager')])
    assert.deepEqual((await detail(users.worker2, req.id)).waitingAt.people, [person(emps.ceo, 'manager_of_direct_manager')])
  } finally { await t.query('UPDATE [employees] SET [branchId] = @0 WHERE [id] = @1', [org.branchB.id, emps.ceo.id]) }
})

test('RH-03: خطوة دور وظيفي بكذا حامل — أول خمسة و«+N»؛ برّه نطاق فرع الطلب ومدير النظام مش منهم؛ وصاحب الطلب مش مستني على نفسه', async () => {
  await fresh()
  const req = await submit(users.worker, types.hr)
  const holders = ['hr1', 'hr2', 'hr3', 'hr4', 'hr5', 'hr6', 'hrDesk']
  // سبعة حاملين: أول خمسة بالاسم (ستة موظفين وحساب المكتب مرتّبين)، والباقي عدد
  const firstFive = [1, 2, 3, 4, 5].map(index => person(emps[`hr${index}`], 'hr'))
  for (const view of [await mineRow(users.worker, req.id), await detail(users.worker, req.id), await allRow(users.consoleA, req.id), await detail(users.admin, req.id), await detail(users.hr3, req.id)]) {
    assert.deepEqual([view.waitingAt.stepOrder, view.waitingAt.roles, view.waitingAt.people, view.waitingAt.more], [1, ['hr'], firstFive, 2])
    assert.ok(!JSON.stringify(view.waitingAt).includes(emps.hrB.fullName))
  }
  await assertInInboxOf(req.id, holders)
  // بعد ما خمسة حسابات تتقفل: الباقي حامل واحد وحساب المكتب (من غير موظف: باسم الحساب ومن غير مسمى)
  await t.query(`UPDATE [users] SET [isActive] = 0 WHERE [id] IN (${[1, 2, 3, 4, 5].map(index => users[`hr${index}`].id).join(', ')})`)
  try {
    assert.deepEqual((await detail(users.worker, req.id)).waitingAt.people, [person(emps.hr6, 'hr'), { name: 'مكتب الموارد البشرية', jobTitle: null, role: 'hr' }])
    // حساب المكتب مالوش موظف: فرعه فرع الحساب (أ) — ظاهر لحساب الفرع أ
    assert.deepEqual((await detail(users.consoleA, req.id)).waitingAt.people.map(row => row.name), [emps.hr6.fullName, 'مكتب الموارد البشرية'])
  } finally { await t.query('UPDATE [users] SET [isActive] = 1') }
  // حامل الدور قدّم طلب لنفسه: مش مستني على نفسه (ولا في صندوقه)
  const own = await submit(users.hr1, types.hr)
  const ownView = (await mineRow(users.hr1, own.id)).waitingAt
  assert.deepEqual([ownView.people, ownView.more], [[2, 3, 4, 5, 6].map(index => person(emps[`hr${index}`], 'hr')), 1])
  await assertInInboxOf(own.id, holders.filter(key => key !== 'hr1'))
  // مفيش حامل خالص (كل حسابات الدور في الفرع اتقفلت): مفيش اسم ومفيش عدد — والدور مكتوب
  await t.query(`UPDATE [users] SET [isActive] = 0 WHERE [id] IN (${holders.map(key => users[key].id).join(', ')})`)
  try {
    const nobody = (await detail(users.worker, req.id)).waitingAt
    assert.deepEqual([nobody.people, nobody.more, nobody.roles], [[], 0, ['hr']])
  } finally { await t.query('UPDATE [users] SET [isActive] = 1') }
})

test('RH-04: خطوة عند بديل بتفويض ساري — «البديل بالنيابة عن المفوِّض»؛ والمقفولة وطلب البديل نفسه عند المعتمد؛ وبعد الإلغاء بترجع', async () => {
  await fresh()
  const req = await submit(users.worker, types.direct)
  const locked = await submit(users.worker, types.locked)
  const delegation = t.expectStatus(await t.request(users.manager, 'POST', '/requests/delegations', { delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(3) }), 201)
  const delegated = [person(emps.deputy, 'direct_manager_of_requester', { onBehalfOfName: emps.manager.fullName })]
  for (const view of [await mineRow(users.worker, req.id), await detail(users.worker, req.id), await allRow(users.consoleA, req.id), await detail(users.deputy, req.id), await detail(users.manager, req.id)]) {
    assert.deepEqual([view.waitingAt.people, view.waitingAt.more], [delegated, 0])
  }
  // الطلب عند الاتنين فعلًا، وعند البديل بنفس الاسم اللي الصندوق بيكتبه في شارة «بالنيابة عن»
  await assertInInboxOf(req.id, ['manager', 'deputy'])
  const deputyInbox = await get(users.deputy, '/requests/inbox')
  assert.deepEqual(deputyInbox.map(row => [row.id, row.onBehalfOfName]), [[req.id, emps.manager.fullName]])
  // خطوة «مش مسموح تتفوّض»: عند المعتمد نفسه
  assert.deepEqual((await mineRow(users.worker, locked.id)).waitingAt.people, [person(emps.manager, 'direct_manager_of_requester')])
  await assertInInboxOf(locked.id, ['manager'])
  // طلب البديل نفسه: مابيعتمدوش بالنيابة، فواقف عند المدير
  const own = await submit(users.deputy, types.direct)
  assert.deepEqual((await mineRow(users.deputy, own.id)).waitingAt.people, [person(emps.manager, 'direct_manager_of_requester')])
  await assertInInboxOf(own.id, ['manager'])
  // بعد إلغاء التفويض: رجعت للمعتمد
  t.expectStatus(await t.request(users.manager, 'POST', `/requests/delegations/${delegation.id}/revoke`), 201)
  assert.deepEqual((await mineRow(users.worker, req.id)).waitingAt.people, [person(emps.manager, 'direct_manager_of_requester')])
  await assertInInboxOf(req.id, ['manager'])
})

test('RH-05: النوع السري — المحجوب في لوحة الطلبات وتفاصيله من غير «واقف عند»؛ وصاحبه والمعتمد بيشوفوا', async () => {
  await fresh()
  const req = await submit(users.worker, types.secret)
  // صاحب «كل الطلبات» مش طرف في السري: الصف والتفاصيل محجوبين زي الأول، ومن غير أي اسم معتمد
  for (const view of [await allRow(users.consoleA, req.id), await detail(users.consoleA, req.id)]) {
    assert.deepEqual([view.confidentialMasked, view.requesterId, view.payload, 'waitingAt' in view], [true, null, null, false])
    for (let index = 1; index <= 6; index++) assert.ok(!JSON.stringify(view).includes(emps[`hr${index}`].fullName))
  }
  // صاحب الطلب (طرف): بيشوف طلبه واقف عند مين؛ والمعتمد اللي الخطوة عليه كذلك
  for (const view of [await mineRow(users.worker, req.id), await detail(users.worker, req.id), await detail(users.hr2, req.id)]) {
    assert.deepEqual([view.confidentialMasked ?? false, view.waitingAt.roles, view.waitingAt.people.length, view.waitingAt.more], [false, ['hr'], 5, 2])
  }
})

test('RH-06: برّه السلسلة والنطاق مفيش حاجة جديدة؛ والطلب اللي مش قيد المراجعة من غير «واقف عند»', async () => {
  await fresh()
  const req = await submit(users.worker, types.direct)
  // حساب فرع تاني: نفس رد الرقم اللي مش موجود، والطلب مش في قايمته
  const [outside, missing] = [await t.request(users.consoleB, 'GET', `/requests/${req.id}`), await t.request(users.consoleB, 'GET', '/requests/999999')]
  assert.deepEqual([outside.status, outside.body], [404, missing.body])
  assert.equal(await allRow(users.consoleB, req.id), undefined)
  // موظف في نفس الفرع برّه السلسلة ومن غير صلاحية: مرفوض زي الأول، ومن غير اسم المعتمد
  const refused = await t.request(users.outsider, 'GET', `/requests/${req.id}`)
  assert.equal(refused.status, 403)
  assert.ok(!JSON.stringify(refused.body).includes(emps.manager.fullName))
  assert.deepEqual(await get(users.outsider, '/requests/mine'), [])
  assert.equal(t.expectStatus(await t.request(users.outsider, 'GET', '/requests/all'), 403).waitingAt, undefined)
  // مُرجَع للاستكمال: مش واقف عند معتمد — وبعد إعادة التقديم بيرجع، و«من إمتى» من التقديم الجديد
  t.expectStatus(await act(users.manager, req.id, 'RETURN', 'كمّل البيانات'), 201)
  const returned = await mineRow(users.worker, req.id)
  assert.deepEqual([returned.status, 'waitingAt' in returned, 'waitingAt' in await detail(users.worker, req.id)], ['RETURNED_FOR_INFO', false, false])
  t.expectStatus(await t.request(users.worker, 'POST', `/requests/${req.id}/resubmit`, {}), 201)
  const again = await mineRow(users.worker, req.id)
  assert.deepEqual([again.status, again.waitingAt.people, again.waitingAt.since], ['UNDER_REVIEW', [person(emps.manager, 'direct_manager_of_requester')], again.submittedAt])
  // بعد الاعتماد النهائي، والمسودة: من غير «واقف عند»
  t.expectStatus(await act(users.manager, req.id), 201)
  const done = await mineRow(users.worker, req.id)
  assert.ok(['APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(done.status), done.status)
  assert.deepEqual(['waitingAt' in done, 'waitingAt' in await detail(users.worker, req.id), 'waitingAt' in await allRow(users.consoleA, req.id)], [false, false, false])
  const draft = t.expectStatus(await t.request(users.worker, 'POST', '/requests', { typeCode: types.direct.code, payload: { reason: 'مسودة' } }), 201)
  assert.deepEqual([draft.status, 'waitingAt' in await mineRow(users.worker, draft.id)], ['DRAFT', false])
})

test('RH-07: مجموعة متوازية (اسم لكل خطوة، والاعتماد الجزئي مابيحركش «من إمتى»)، والتصعيد (المعتمد الجديد ووقت التصعيد)', async () => {
  await fresh()
  const req = await submit(users.worker, types.parallel)
  const both = (await mineRow(users.worker, req.id)).waitingAt
  assert.deepEqual([both.roles, both.people, both.more], [['direct_manager_of_requester', 'finance'],
    [person(emps.manager, 'direct_manager_of_requester'), person(emps.finance, 'finance')], 0])
  await assertInInboxOf(req.id, ['manager', 'finance'])
  t.expectStatus(await act(users.manager, req.id), 201)
  const rest = (await mineRow(users.worker, req.id)).waitingAt
  assert.deepEqual([rest.roles, rest.people, rest.since], [['finance'], [person(emps.finance, 'finance')], both.since])
  await assertInInboxOf(req.id, ['finance'])

  // التصعيد: الخطوة اتنقلت لمدير القسم — اسمه هو، و«من إمتى» وقت التصعيد
  const late = await submit(users.worker, types.escalating)
  const beforeEscalation = (await mineRow(users.worker, late.id)).waitingAt
  assert.deepEqual(beforeEscalation.people, [person(emps.manager, 'direct_manager_of_requester')])
  // الطلب اتقدّم من يومين والمهلة عدّت
  const [row] = await t.query('SELECT [resolvedSteps] FROM [requests] WHERE [id] = @0', [late.id])
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000)
  await t.query('UPDATE [requests] SET [resolvedSteps] = @0, [submittedAt] = @1 WHERE [id] = @2',
    [JSON.stringify(JSON.parse(row.resolvedSteps).map(step => ({ ...step, dueAt: new Date(twoDaysAgo.getTime() + 86400000).toISOString() }))), twoDaysAgo, late.id])
  const waited = (await mineRow(users.worker, late.id)).waitingAt
  assert.ok(Math.abs(Date.parse(waited.since) - twoDaysAgo.getTime()) < 5000, waited.since)
  const startedAt = Date.now()
  assert.deepEqual(await requests.runEscalations(), { escalated: 1 })
  const escalated = await detail(users.worker, late.id)
  assert.deepEqual([escalated.waitingAt.roles, escalated.waitingAt.people], [['department_manager_of_requester'], [person(emps.head, 'department_manager_of_requester')]])
  assert.deepEqual(escalated.approvals.map(entry => entry.action), ['ESCALATED'])
  assert.ok(Date.parse(escalated.waitingAt.since) >= startedAt - 1000 && Date.parse(escalated.waitingAt.since) <= Date.now() + 1000, escalated.waitingAt.since)
  await assertInInboxOf(late.id, ['head'])
})
