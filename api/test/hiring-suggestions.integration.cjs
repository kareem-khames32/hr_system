'use strict'
// B-ADD.12: اقتراح التوظيف من شاغر الوظائف المعتمدة، على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_hiring_suggest_test_<16 hex>)، عبر
// HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور.
//  HS-01) الاقتراح: شاغر الوظيفة النشطة ناقص فتحات وظايف التوظيف اللي لسه ماتقفلتش لنفس الفرع والقسم والمسمى؛ الموظف اللي خرج بيزوّد
//         الشاغر لوحده؛ والمجمّدة والمغطّاة برّه الاقتراح؛ وبنطاق فروع الحساب.
//  HS-02) فتح وظيفة من الشاغر: مسودة في التوظيف بعدد الناقص، مرة واحدة (التاني «مغطّاة»)، بصلاحية إدارة التوظيف وموديوله مفعّل،
//         وطلبين مع بعض مايفتحوش أكتر من الشاغر.
// Run (من api/): node --test test/hiring-suggestions.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { disposableApp } = require('./helpers/disposable-app.cjs')
const { moduleTools } = require('./helpers/modules.cjs')
const t = disposableApp('hiring_suggest')
const B = {}, D = {}, T = {}, P = {}, E = {}, U = {}
let modules, sequence = 0
const employee = (name, branch, department, extra = {}) => t.repo('Employee').save({ employeeCode: 'HS' + ++sequence, fullName: name, branchId: branch.id, departmentId: department?.id ?? null,
  joinDate: '2020-01-01', basicSalary: 5000, status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (branch, permissions) => t.user({ role: 'employee', branchId: branch?.id ?? null, permissions: JSON.stringify(permissions), isActive: true })
const position = async (title, branch, department, headcount, extra = {}) => t.expectStatus(await t.request(U.admin, 'POST', '/positions', { jobTitleId: title.id, branchId: branch.id,
  departmentId: department?.id ?? null, headcount, ...extra }), 201)
const seat = async (pos, person) => t.expectStatus(await t.request(U.admin, 'POST', `/positions/${pos.id}/holders`, { employeeId: person.id }), 201)
const suggestions = async user => t.expectStatus(await t.request(user, 'GET', '/positions/hiring-suggestions'), 200)
const rowsOf = body => body.suggestions.map(row => [row.code, row.vacant, row.openJobs, row.uncovered])
const openJob = (user, pos, openings) => t.request(user, 'POST', `/positions/${pos.id}/open-job`, openings === undefined ? {} : { openings })
const answer = response => [response.status, response.body?.message]
const jobs = () => t.repo('RecruitmentJob').find({ order: { id: 'ASC' } })

before(async () => {
  await t.start()
  modules = moduleTools(t.app)
  await modules.enable('positions'); await modules.enable('recruitment')
  B.riyadh = await t.repo('Branch').save({ code: 'HS_1', name: 'فرع الرياض', country: 'SA' })
  B.jeddah = await t.repo('Branch').save({ code: 'HS_2', name: 'فرع جدة', country: 'SA' })
  D.sales = await t.repo('Department').save({ branchId: B.riyadh.id, name: 'المبيعات' })
  D.ops = await t.repo('Department').save({ branchId: B.riyadh.id, name: 'التشغيل' })
  T.seller = await t.repo('JobTitle').save({ title: 'مندوب مبيعات', isActive: true })
  T.driver = await t.repo('JobTitle').save({ title: 'سائق', isActive: true })
  U.admin = await t.user({ scopeAllBranches: true })
  U.viewer = await account(B.riyadh, ['positions.view'])
  U.recruiter = await account(B.riyadh, ['positions.view', 'candidates.manage'])
  U.jeddah = await account(B.jeddah, ['positions.view', 'candidates.manage'])
  P.sellers = await position(T.seller, B.riyadh, D.sales, 4)
  P.drivers = await position(T.driver, B.riyadh, D.ops, 2)
  P.frozen = await position(T.driver, B.riyadh, D.sales, 3)
  t.expectStatus(await t.request(U.admin, 'PATCH', `/positions/${P.frozen.id}`, { status: 'FROZEN' }), 200)
  P.jeddah = await position(T.seller, B.jeddah, null, 1)
  E.s1 = await employee('بايع 1', B.riyadh, D.sales); E.s2 = await employee('بايع 2', B.riyadh, D.sales)
  E.d1 = await employee('سائق 1', B.riyadh, D.ops); E.d2 = await employee('سائق 2', B.riyadh, D.ops)
  await seat(P.sellers, E.s1); await seat(P.sellers, E.s2); await seat(P.drivers, E.d1); await seat(P.drivers, E.d2)
}, { timeout: 120000 })
after(context => t.stop(context))

test('HS-01: الاقتراح — الشاغر ناقص وظايف التوظيف المفتوحة، واللي خرج بيزوّد الشاغر لوحده، والمجمّدة والمغطّاة برّه، وبنطاق الفروع', async () => {
  const first = await suggestions(U.admin)
  assert.deepEqual([first.available, first.recruitment, first.canOpen], [true, true, true])
  assert.deepEqual(rowsOf(first), [[P.sellers.code, 2, 0, 2], [P.jeddah.code, 1, 0, 1]], 'السواقين كاملين والمجمّدة برّه')
  assert.deepEqual([rowsOf(await suggestions(U.viewer)), (await suggestions(U.viewer)).canOpen, rowsOf(await suggestions(U.jeddah))], [[[P.sellers.code, 2, 0, 2]], false, [[P.jeddah.code, 1, 0, 1]]])
  // سائق خرج: الشاغر بيظهر من غير أي حدث
  await t.repo('Employee').update({ id: E.d2.id }, { status: 'terminated', isActive: false })
  assert.deepEqual(rowsOf(await suggestions(U.viewer)), [[P.sellers.code, 2, 0, 2], [P.drivers.code, 1, 0, 1]])
  // وظيفة مفتوحة في التوظيف لنفس الفرع والقسم والمسمى بتغطي جزء من الشاغر؛ والمقفولة ولقسم تاني مابتغطيش
  const job = extra => t.repo('RecruitmentJob').save({ title: 'مندوب مبيعات', branchId: B.riyadh.id, departmentId: D.sales.id, openings: 1, status: 'PUBLISHED', internal: true, external: false,
    createdByUserId: U.admin.id, createdAt: new Date(), ...extra })
  await job({}); await job({ status: 'CLOSED', openings: 5 }); await job({ departmentId: D.ops.id, openings: 5 }); await job({ title: 'سائق', departmentId: D.sales.id, openings: 5 })
  assert.deepEqual(rowsOf(await suggestions(U.viewer)), [[P.sellers.code, 2, 1, 1], [P.drivers.code, 1, 0, 1]])
  // التوظيف مقفول: الشاغر كله اقتراح ومفيش فتح من هنا
  await modules.disable('recruitment')
  const closed = await suggestions(U.recruiter)
  assert.deepEqual([closed.recruitment, closed.canOpen, rowsOf(closed)], [false, false, [[P.sellers.code, 2, 0, 2], [P.drivers.code, 1, 0, 1]]])
  assert.deepEqual(answer(await openJob(U.recruiter, P.drivers)), [400, 'موديول التوظيف مقفول أو جداوله ناقصة — فعّله الأول'])
  await modules.enable('recruitment')
})

test('HS-02: فتح وظيفة من الشاغر — مسودة بعدد الناقص، مرة واحدة، بصلاحية إدارة التوظيف، وطلبين مع بعض مايفتحوش أكتر من الشاغر', async () => {
  const before = (await jobs()).length
  assert.deepEqual(answer(await openJob(U.viewer, P.drivers)), [403, 'فتح وظيفة شاغرة محتاج صلاحية «إدارة التوظيف»'])
  assert.equal((await openJob(U.jeddah, P.drivers)).status, 404, 'وظيفة فرع برّه النطاق = غير موجودة')
  assert.deepEqual(answer(await openJob(U.recruiter, P.frozen)), [400, 'الوظيفة المعتمدة مش نشطة — مفيش شاغر يتفتح له توظيف'])
  for (const bad of [0, 2, -1, 1.5, '1']) assert.equal((await openJob(U.recruiter, P.drivers, bad)).status, 400, String(bad))
  assert.equal((await jobs()).length, before)
  const made = t.expectStatus(await openJob(U.recruiter, P.drivers), 201)
  assert.equal(made.openings, 1)
  const job = (await jobs()).at(-1)
  assert.deepEqual([job.id, job.title, job.branchId, job.departmentId, job.openings, job.status, job.requestId, job.createdByUserId, job.internal, job.external],
    [made.jobId, 'سائق', B.riyadh.id, D.ops.id, 1, 'DRAFT', null, U.recruiter.id, true, false])
  assert.match(job.reason, new RegExp(`شاغر في الوظيفة المعتمدة ${P.drivers.code} \\(معتمد 2، مشغول 1\\)`))
  // بقت مغطّاة: برّه الاقتراح، والفتح التاني مرفوض
  assert.deepEqual(rowsOf(await suggestions(U.viewer)), [[P.sellers.code, 2, 1, 1]])
  assert.deepEqual(answer(await openJob(U.recruiter, P.drivers)), [409, 'شواغر الوظيفة دي كلها ليها وظايف مفتوحة في التوظيف — مفيش حاجة تتفتح'])
  // طلبين مع بعض على شاغر واحد ناقص: واحد بس بيعدّي
  const race = await Promise.all([openJob(U.recruiter, P.sellers), openJob(U.admin, P.sellers)])
  assert.deepEqual(race.map(response => response.status).sort(), [201, 409])
  assert.equal((await jobs()).length, before + 2)
  assert.deepEqual(rowsOf(await suggestions(U.viewer)), [])
  // المسمى اتعطّل في الكتالوج: مفيش وظيفة تتفتح عليه
  await t.repo('JobTitle').update({ id: T.seller.id }, { isActive: false })
  assert.equal((await openJob(U.jeddah, P.jeddah)).status, 400)
  await t.repo('JobTitle').update({ id: T.seller.id }, { isActive: true })
  assert.equal(t.expectStatus(await openJob(U.jeddah, P.jeddah, 1), 201).openings, 1)
  assert.equal(await t.repo('AuditLog').countBy({ action: 'RECRUITMENT_JOB_CREATED' }), 3)
})
