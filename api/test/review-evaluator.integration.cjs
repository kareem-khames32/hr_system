'use strict'
// B-ADD.10: تغيير مقيِّم تكليف في دورة تقييم، على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_review_evaluator_test_<16 hex>)، عبر HTTP
// بتوكنات موقّعة محليًا ومن غير كلمات مرور.
//  RE-01) الموظف من غير مدير بياخد مقيِّم: التكليف بيظهر عند المقيِّم الجديد في «تقييم فريقي» وبيسلّم؛ والمقيِّم القديم بيخرج (404).
//  RE-02) القواعد: بصلاحية إدارة الأداء وفي نطاقها (تكليف أو مقيِّم برّه النطاق = مش موجود)، مش نفسه، على رأس العمل، مش بعد تسليم
//         تقييم المدير، والدورة شغالة؛ وسطر تدقيق لكل تغيير فعلي بس.
// Run (من api/): node --test test/review-evaluator.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { disposableApp } = require('./helpers/disposable-app.cjs')
const { moduleTools } = require('./helpers/modules.cjs')
const t = disposableApp('review_evaluator')
const org = {}, emps = {}, users = {}, state = {}
const R = '/performance/reviews'
let number = 0
const employee = (extra = {}) => t.repo('Employee').save({ employeeCode: `RE${String(++number).padStart(3, '0')}`, fullName: `موظف ${number}`, branchId: org.a.id, joinDate: '2020-01-01',
  basicSalary: 6000, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (permissions, extra = {}) => t.user({ role: 'employee', branchId: org.a.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const setEvaluator = (user, assignmentId, evaluatorEmployeeId) => t.request(user, 'POST', `${R}/${assignmentId}/evaluator`, { evaluatorEmployeeId })
const answer = response => [response.status, response.body?.message]
const rows = async () => t.expectStatus(await t.request(users.hr, 'GET', `${R}/cycles/${state.cycle}/assignments`), 200).assignments
const rowOf = async person => (await rows()).find(row => row.employeeId === person.id)
const audits = () => t.repo('AuditLog').countBy({ action: 'REVIEW_EVALUATOR_CHANGED' })

before(async () => {
  await t.start()
  await moduleTools(t.app).enable('performance')
  org.a = await t.repo('Branch').save({ code: 'RE_A', name: 'فرع أ', country: 'SA' })
  org.b = await t.repo('Branch').save({ code: 'RE_B', name: 'فرع ب', country: 'SA' })
  org.sales = await t.repo('Department').save({ name: 'المبيعات', code: 'RE_S', branchId: org.a.id })
  emps.boss = await employee({ fullName: 'مدير المبيعات', departmentId: org.sales.id })
  emps.rep = await employee({ fullName: 'مندوب', departmentId: org.sales.id, managerEmployeeId: emps.boss.id })
  emps.senior = await employee({ fullName: 'مشرف قديم', departmentId: org.sales.id, managerEmployeeId: emps.boss.id })
  emps.gone = await employee({ fullName: 'موظف منتهي', status: 'terminated', isActive: false })
  emps.other = await employee({ fullName: 'موظف فرع ب', branchId: org.b.id })
  users.admin = await t.user({ scopeAllBranches: true })
  users.hr = await account(['performance.manage'])
  users.hrB = await account(['performance.manage'], { branchId: org.b.id })
  users.boss = await account([], { employeeId: emps.boss.id })
  users.rep = await account([], { employeeId: emps.rep.id })
  users.senior = await account([], { employeeId: emps.senior.id })
  const template = t.expectStatus(await t.request(users.hr, 'POST', `${R}/templates`, { name: 'نموذج قصير', ratingMax: 5,
    sections: [{ title: 'الجدارات', kind: 'COMPETENCIES', weight: 100, items: [{ label: 'التعاون', type: 'rating' }] }] }), 201)
  const cycle = t.expectStatus(await t.request(users.hr, 'POST', `${R}/cycles`, { name: 'تقييم الربع', kind: 'ANNUAL', templateId: template.id, periodStart: '2026-10-01', periodEnd: '2026-12-31',
    selfDueDate: '2027-01-10', managerDueDate: '2027-01-20', audienceMode: 'DEPARTMENTS', audienceIds: [org.sales.id] }), 201)
  state.cycle = cycle.id; state.template = template.id
  state.itemKey = template.sections[0].items[0].key; state.sectionKey = template.sections[0].key
  t.expectStatus(await t.request(users.hr, 'POST', `${R}/cycles/${cycle.id}/launch`), 200)
}, { timeout: 120000 })
after(context => t.stop(context))

test('RE-01: الموظف من غير مدير بياخد مقيِّم — التكليف بيظهر عند الجديد وبيسلّم، والقديم بيخرج', async () => {
  const answers = { sections: { [state.sectionKey]: { [state.itemKey]: { rating: 4 } } } }
  const boss = await rowOf(emps.boss), rep = await rowOf(emps.rep)
  assert.deepEqual([boss.hasManager, boss.canChangeEvaluator, rep.hasManager, rep.managerName, rep.canChangeEvaluator], [false, true, true, 'مدير المبيعات', true])
  // المدير من غير مقيِّم: المشرف بيقيّمه
  const set = t.expectStatus(await setEvaluator(users.hr, boss.id, emps.senior.id), 200)
  assert.deepEqual(set, { changed: true, evaluatorName: 'مشرف قديم' })
  assert.deepEqual([(await rowOf(emps.boss)).hasManager, (await rowOf(emps.boss)).managerName], [true, 'مشرف قديم'])
  const team = t.expectStatus(await t.request(users.senior, 'GET', `${R}/team`), 200).reviews
  assert.deepEqual(team.map(row => row.id), [boss.id])
  t.expectStatus(await t.request(users.senior, 'POST', `${R}/${boss.id}/submit`, { answers }), 200)
  assert.deepEqual([(await rowOf(emps.boss)).managerSubmitted, (await rowOf(emps.boss)).canChangeEvaluator], [true, false])
  // تغيير مقيِّم المندوب من مديره للمشرف: المدير القديم مابقاش له حق
  assert.equal((await t.request(users.boss, 'GET', `${R}/${rep.id}`)).status, 200)
  t.expectStatus(await setEvaluator(users.hr, rep.id, emps.senior.id), 200)
  assert.equal((await t.request(users.boss, 'GET', `${R}/${rep.id}`)).status, 404)
  assert.equal((await t.request(users.boss, 'POST', `${R}/${rep.id}/submit`, { answers })).status, 404)
  assert.equal((await t.request(users.senior, 'GET', `${R}/${rep.id}`)).status, 200)
  assert.equal(t.expectStatus(await t.request(users.hr, 'GET', `${R}/cycles`), 200).cycles.find(row => row.id === state.cycle).counts.noManager, 0)
})

test('RE-02: القواعد — الصلاحية والنطاق، مش نفسه، على رأس العمل، مش بعد التسليم، والدورة شغالة، وسطر تدقيق للتغيير الفعلي بس', async () => {
  const boss = await rowOf(emps.boss), rep = await rowOf(emps.rep), senior = await rowOf(emps.senior)
  const count = await audits()
  assert.equal(count, 2)
  assert.equal((await setEvaluator(users.boss, senior.id, emps.boss.id)).status, 403)
  assert.deepEqual(answer(await setEvaluator(users.hrB, senior.id, emps.other.id)), [404, 'التقييم غير موجود'])
  assert.deepEqual(answer(await setEvaluator(users.hr, 999999, emps.boss.id)), [404, 'التقييم غير موجود'])
  assert.deepEqual(answer(await setEvaluator(users.hr, senior.id, emps.other.id)), [404, 'الموظف غير موجود'])
  assert.deepEqual(answer(await setEvaluator(users.hr, senior.id, 999999)), [404, 'الموظف غير موجود'])
  assert.deepEqual(answer(await setEvaluator(users.hr, senior.id, emps.senior.id)), [400, 'الموظف مايقيّمش نفسه'])
  assert.deepEqual(answer(await setEvaluator(users.hr, senior.id, emps.gone.id)), [400, 'المقيِّم لازم يكون موظف على رأس العمل'])
  for (const bad of [null, '5', 0, -1, 1.5, undefined]) assert.deepEqual(answer(await setEvaluator(users.hr, senior.id, bad)), [400, 'اختار المقيِّم'], String(bad))
  assert.deepEqual(answer(await setEvaluator(users.hr, boss.id, emps.rep.id)), [409, 'تقييم المدير اتسلّم — المقيِّم مابيتغيرش'])
  assert.equal(await audits(), count, 'الرفض من غير تدقيق')
  // نفس المقيِّم = من غير تغيير ولا تدقيق؛ وحساب كل الفروع يقدر يحط مقيِّم من فرع تاني
  assert.deepEqual(t.expectStatus(await setEvaluator(users.hr, rep.id, emps.senior.id), 200), { changed: false, evaluatorName: 'مشرف قديم' })
  assert.equal(await audits(), count)
  assert.deepEqual(t.expectStatus(await setEvaluator(users.admin, senior.id, emps.other.id), 200), { changed: true, evaluatorName: 'موظف فرع ب' })
  assert.equal(await audits(), count + 1)
  // اسم مقيِّم من فرع برّه نطاق حساب الفرع مابيظهرش له
  assert.deepEqual([(await rowOf(emps.senior)).hasManager, (await rowOf(emps.senior)).managerName], [true, null])
  t.expectStatus(await t.request(users.hr, 'POST', `${R}/cycles/${state.cycle}/close`), 200)
  assert.deepEqual(answer(await setEvaluator(users.hr, rep.id, emps.boss.id)), [400, 'الدورة مش شغالة — المقيِّم مابيتغيرش'])
  assert.equal((await rowOf(emps.rep)).canChangeEvaluator, false)
})

test('RE-03 (P8A-B02): موظف اتنقل لفرع برّه نطاق الحساب والطلب في الطريق — الحكم بفرعه بعد القفل، فالمقيِّم مابيتغيرش', async () => {
  const department = await t.repo('Department').save({ name: 'التسويق', code: 'RE_M', branchId: org.a.id })
  const moved = await t.repo('Department').save({ name: 'تسويق فرع ب', code: 'RE_MB', branchId: org.b.id })
  const chief = await employee({ fullName: 'مدير التسويق', departmentId: department.id })
  const mover = await employee({ fullName: 'موظف هيتنقل', departmentId: department.id, managerEmployeeId: chief.id })
  const spare = await employee({ fullName: 'مقيِّم بديل', departmentId: department.id, managerEmployeeId: chief.id })
  const cycle = t.expectStatus(await t.request(users.hr, 'POST', `${R}/cycles`, { name: 'تقييم التسويق', kind: 'ANNUAL', templateId: state.template, periodStart: '2026-10-01', periodEnd: '2026-12-31',
    selfDueDate: '2027-01-10', managerDueDate: '2027-01-20', audienceMode: 'DEPARTMENTS', audienceIds: [department.id] }), 201)
  t.expectStatus(await t.request(users.hr, 'POST', `${R}/cycles/${cycle.id}/launch`), 200)
  const assignment = await t.repo('ReviewAssignment').findOneByOrFail({ cycleId: cycle.id, employeeId: mover.id })
  assert.equal(assignment.managerEmployeeId, chief.id)
  const calendar = t.expectStatus(await t.request(users.admin, 'GET', `/attendance/calendar-context?scope=EMPLOYEE&sourceId=${mover.id}`), 200)
  const calendarChange = { effectiveFrom: '2026-10-01', reason: 'نقل لفرع ب', expectedRevision: calendar.revision, expectedCurrentSourceHash: calendar.currentSourceHash }
  const count = await audits()
  // النقل بيكتمل بعد ما الطلب دخل وقبل ما ياخد أي قفل على صفوف الموظفين (أول قراءة مقفولة لموظف هي نقطة الوقوف)
  const { Repository } = require('../node_modules/typeorm'), original = Repository.prototype.findOne
  let hit = false
  Repository.prototype.findOne = async function (options) {
    if (!hit && this.metadata.name === 'Employee' && options?.lock?.mode === 'pessimistic_write' && [mover.id, spare.id].includes(options?.where?.id)) {
      hit = true
      t.expectStatus(await t.request(users.admin, 'PATCH', `/employees/${mover.id}`, { branchId: org.b.id, departmentId: moved.id, calendarChange }), 200)
    }
    return original.call(this, options)
  }
  let result
  try { result = await setEvaluator(users.hr, assignment.id, spare.id) } finally { Repository.prototype.findOne = original }
  assert.equal(hit, true)
  assert.equal((await t.repo('Employee').findOneBy({ id: mover.id })).branchId, org.b.id)
  // الطلب اللي كان في الطريق بيترد عليه زي أي طلب جديد من حساب الفرع القديم: مش موجود، ومن غير كتابة ولا تدقيق
  assert.deepEqual(answer(result), [404, 'التقييم غير موجود'])
  assert.deepEqual([(await t.repo('ReviewAssignment').findOneBy({ id: assignment.id })).managerEmployeeId, await audits()], [chief.id, count])
  assert.deepEqual(answer(await setEvaluator(users.hr, assignment.id, spare.id)), [404, 'التقييم غير موجود'])
  // وحساب كل الفروع يغيّره عادي
  assert.deepEqual(t.expectStatus(await setEvaluator(users.admin, assignment.id, spare.id), 200), { changed: true, evaluatorName: 'مقيِّم بديل' })
  // المصدر: صفوف الموظفين بتتقفل بترتيب الرقم قبل حكم الفرع
  const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'src/performance/reviews.service.ts'), 'utf8')
  assert.ok(source.includes('[...new Set([assignment.employeeId, evaluatorId])].sort((a, b) => a - b)') && source.includes('const employee = assignment ? people.get(assignment.employeeId) ?? null : null'))
})
