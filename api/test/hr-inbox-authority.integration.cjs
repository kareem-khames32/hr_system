'use strict'
// B-ADD.25 (كلمة المالك 13 أكتوبر 2026): صاحب سلطة الموارد البشرية (صلاحية «اعتماد خطوات الموارد البشرية») بيقرر في أي طلب قيد المراجعة في
// نطاقه من صندوق الموافقات — على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_hr_inbox_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا ومن
// غير كلمات مرور.
//  HI-01) الصندوق العادي زي ما هو: طلب واقف عند مدير موجود مش في صندوق الموارد البشرية. وبالاختيار (?scope=hr) بيظهر بشارة «بالسلطة»،
//         لصاحب السلطة بس وفي نطاق فروعه بس، ومن غير طلبه هو ومن غير النوع السرّي.
//  HI-02) القرار من القايمة دي بيعدّي الخطوة الحالية بس وباسمه، والطلب بيروح للخطوة اللي بعدها؛ والرفض بسببه.
// Run (من api/): node --test test/hr-inbox-authority.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { disposableApp } = require('./helpers/disposable-app.cjs')
const t = disposableApp('hr_inbox')
const org = {}, users = {}, emps = {}, types = {}
let number = 0

const employee = (fullName, extra = {}) => t.repo('Employee').save({ employeeCode: `HI${String(++number).padStart(3, '0')}`, fullName, branchId: org.a.id, joinDate: '2020-01-01',
  basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...extra })
const account = (label, permissions = [], extra = {}) => t.repo('User').save({ email: `${label}@hr-inbox.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role: 'employee', branchId: org.a.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const get = async (user, route) => t.expectStatus(await t.request(user, 'GET', route), 200)
const submit = async (user, type) => t.expectStatus(await t.request(user, 'POST', '/requests', { typeCode: type.code, payload: { reason: 'طلب للاختبار' }, submit: true }), 201)
const act = (user, id, action = 'APPROVE', comment) => t.request(user, 'POST', `/requests/${id}/act`, { action, comment })
const inbox = async (user, all = false) => (await get(user, all ? '/requests/inbox?scope=hr' : '/requests/inbox')).map(row => [row.id, row.byHrAuthority === true])
const ids = rows => rows.map(([id]) => id).sort((a, b) => a - b)

before(async () => {
  await t.start()
  org.a = await t.repo('Branch').save({ code: 'HI_A', name: 'فرع النصر' })
  org.b = await t.repo('Branch').save({ code: 'HI_B', name: 'الفرع الرئيسي' })
  emps.head = await employee('هالة مديرة الإدارة')
  emps.manager = await employee('منصور المدير', { managerEmployeeId: emps.head.id })
  emps.worker = await employee('وليد الموظف', { managerEmployeeId: emps.manager.id })
  emps.hr = await employee('حنان الموارد البشرية', { managerEmployeeId: emps.manager.id })
  emps.managerB = await employee('مدير الفرع التاني', { branchId: org.b.id })
  emps.workerB = await employee('موظف الفرع التاني', { branchId: org.b.id, managerEmployeeId: emps.managerB.id })
  for (const key of ['head', 'manager', 'worker']) users[key] = await account(key, [], { employeeId: emps[key].id })
  users.managerB = await account('manager-b', [], { employeeId: emps.managerB.id, branchId: org.b.id })
  users.workerB = await account('worker-b', [], { employeeId: emps.workerB.id, branchId: org.b.id })
  // صاحب السلطة في فرع النصر (موظف وله مدير)، وحساب كونسول من غير السلطة
  users.hr = await account('hr', ['approve.hr', 'requests.view_all'], { employeeId: emps.hr.id })
  users.console = await account('console', ['requests.view_all'])
  users.finance = await account('finance', ['approve.finance'])
  const type = async (code, nameAr, steps, extra = {}) => {
    const chain = await t.repo('ApprovalChain').save({ code, nameAr: `سلسلة ${code}`, isActive: true, autoApprove: false })
    for (const [index, step] of steps.entries()) await t.repo('ApprovalStep').save({ chainId: chain.id, stepOrder: index + 1, ...step })
    return t.repo('RequestType').save({ code, nameAr, category: 'personal_data', destinationHandler: 'none', approvalChainId: chain.id, isActive: true, ...extra })
  }
  types.two = await type('HI_TWO', 'طلب للمدير ومديره', [{ approverRole: 'direct_manager_of_requester' }, { approverRole: 'manager_of_direct_manager' }])
  types.direct = await type('HI_DIRECT', 'طلب للمدير المباشر', [{ approverRole: 'direct_manager_of_requester' }])
  types.secret = await type('HI_SECRET', 'بلاغ سري', [{ approverRole: 'finance' }], { isConfidential: true })
}, { timeout: 180000 })
after(context => t.stop(context))

test('HI-01: الصندوق العادي زي ما هو، وبالاختيار صاحب السلطة بيشوف الواقف عند غيره في نطاقه — من غير طلبه هو ولا السرّي ولا فرع تاني', async () => {
  const open = await submit(users.worker, types.two), secret = await submit(users.worker, types.secret)
  const own = await submit(users.hr, types.direct), other = await submit(users.workerB, types.direct)
  // من غير الاختيار: الطلب في صندوق المدير بس (والسرّي في صندوق المالية)، ومش في صندوق الموارد البشرية
  assert.deepEqual([ids(await inbox(users.manager)), ids(await inbox(users.finance)), await inbox(users.hr), await inbox(users.console)], [[open.id, own.id].sort((a, b) => a - b), [secret.id], [], []])
  // بالاختيار: الواقف عند المدير في نطاقه بس، بشارة السلطة — من غير طلبه هو، ولا السرّي، ولا طلب الفرع التاني
  assert.deepEqual(await inbox(users.hr, true), [[open.id, true]])
  // الاختيار مالوش أثر على غير صاحب السلطة: المدير بياخد صندوقه العادي (من غير شارة) وحساب الكونسول فاضي
  assert.deepEqual([(await inbox(users.manager, true)).map(([, authority]) => authority), await inbox(users.console, true)], [[false, false], []])
  // والخادم بيرفض اللي برّه القايمة: طلبه هو، وطلب فرع برّه نطاقه
  assert.deepEqual([(await act(users.hr, own.id)).status, (await act(users.hr, other.id)).status, (await act(users.console, open.id)).status], [403, 403, 403])
  assert.equal((await t.repo('Request').findOneByOrFail({ id: other.id })).status, 'UNDER_REVIEW')
})

test('HI-02: القرار بالسلطة بيعدّي الخطوة الحالية بس وباسمه، والطلب بيروح للخطوة اللي بعدها؛ والرفض بسببه', async () => {
  const [[openId]] = await inbox(users.hr, true)
  t.expectStatus(await act(users.hr, openId), 201)
  const moved = await t.repo('Request').findOneByOrFail({ id: openId })
  assert.deepEqual([moved.status, moved.currentStep], ['UNDER_REVIEW', 2])
  const approvals = await t.repo('RequestApproval').find({ where: { requestId: openId }, order: { id: 'ASC' } })
  assert.deepEqual(approvals.map(row => [row.step, row.approverId]), [[1, users.hr.id]])
  // الخطوة التانية (مدير المدير) لسه واقفة عند صاحبها — وظاهرة لصاحب السلطة بالاختيار
  assert.deepEqual([ids(await inbox(users.head)), await inbox(users.hr, true)], [[openId], [[openId, true]]])
  // الرفض محتاج سبب زي أي معتمد
  assert.equal((await act(users.hr, openId, 'REJECT')).status, 400)
  t.expectStatus(await act(users.hr, openId, 'REJECT', 'مرفوض بقرار الموارد البشرية'), 201)
  assert.equal((await t.repo('Request').findOneByOrFail({ id: openId })).status, 'REJECTED')
  assert.deepEqual(await inbox(users.hr, true), [])
})
