'use strict'
// B-ADD.18 (كلمة المالك 12 أكتوبر 2026): نطاق المهام والتقييمات، على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_task_scope_test_<16 hex>)،
// عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور.
//  TS-01) التكليف الفردي: قائد الفريق مايكلّفش حد برّه فريقه ولا زميله ولا مديره، وبيكلّف كل أعضاء فريقه (ومنهم اللي ملفه فيه مدير تاني)؛
//         ومدير القسم بيكلّف أي حد في قسمه بفريقه؛ واللي مالوش حد تحته مالوش غير مهمته الشخصية والخادم بيرفضه.
//  TS-02) المهمة الجماعية للمدير: شجرته بس في المنتقي والمعاينة، والجمهور بيتفك جوه شجرته، وأي اختيار برّاها (موجود أو لأ) بنفس الرفض؛
//         واللي مالوش حد مرفوض؛ وصاحب الصلاحية القايمة زي ما هو في نطاقه.
//  TS-03) تقييم المهمة: اللي المهمة عليه مابيقيّمهاش حتى لو حسابه هو اللي كلّف بيها وبيديرها.
//  TS-04) المقيِّم في الدورة = الرئيس المباشر في الهيكل (قائد الفريق، وإلا مدير القسم، وإلا مدير الإدارة اللي فوقه)، و«تقييم فريقي» للي تحته
//         حد بس وفيها اللي بيقيّمهم بس.
//  TS-05) التقييم الذاتي مقفول (الافتراضي): لا مطلوب ولا بيتسلّم، والدورة بتكمل بتقييم المدير بس لحد الإقرار؛ ومحدش بيقيّم نفسه حتى لو صف
//         التكليف اتسجّل فيه مقيِّم نفسه.
//  TS-06) التقييم الذاتي مفتوح = سلوك النهارده بالحرف؛ وقفله تاني بيخبّي الذاتي اللي لسه ماتسلّمش ومابيمسحش اللي اتسلّم.
//  TS-07) 360: دعوة للموظف على نفسه مابتتعرضش ومابيتردّش عليها.
// Run (من api/): node --test test/task-scope.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { disposableApp } = require('./helpers/disposable-app.cjs')
const { moduleTools } = require('./helpers/modules.cjs')
const t = disposableApp('task_scope')
const org = {}, emps = {}, users = {}, state = {}
const R = '/performance/reviews'
const OUTSIDE_TEAM = 'الموظف ده مش في فريقك. اعمل طلب، ولما يتعتمد هيتحوّل مهمة'
const OUTSIDE_TREE = 'الاختيار فيه موظف أو وحدة مش تحتك في الهيكل — المهمة الجماعية للي تحتك بس. حد مش في فريقك؟ اعمل طلب، ولما يتعتمد هيتحوّل مهمة'
const GROUP_RULE = 'المهمة الجماعية للي تحته موظفين في الهيكل (على اللي تحته بس)، أو لصاحب صلاحية «إدارة المهام» أو «تكليف أي موظف» في نطاق فروعه'
const SELF_CLOSED = 'التقييم الذاتي مقفول — اللي بيقيّمك رئيسك المباشر'
let number = 0, modules
const employee = (fullName, extra = {}) => t.repo('Employee').save({ employeeCode: `TS${String(++number).padStart(3, '0')}`, fullName, branchId: org.a.id, joinDate: '2020-01-01',
  basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (permissions, extra = {}) => t.user({ role: 'employee', branchId: org.a.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const login = person => account([], { employeeId: person.id, branchId: person.branchId })
const answer = response => [response.status, [].concat(response.body?.message ?? []).join('، ')]
const ids = rows => rows.map(row => row.id).sort((a, b) => a - b)
const idsOf = (...keys) => keys.map(key => emps[key].id).sort((a, b) => a - b)
const assign = (who, to, extra = {}) => t.request(users[who], 'POST', '/tasks', { title: `${who} ← ${to}`, assigneeEmployeeId: emps[to].id, ...extra })
const group = (who, audience, extra = {}) => t.request(users[who], 'POST', '/tasks/group', { title: `مهمة جماعية من ${who}`, audience, ...extra })
const assigneesOfTasks = async taskIds => ids((await t.repo('Task').findByIds(taskIds)).map(row => ({ id: row.assigneeEmployeeId })))
const setConfig = (key, value) => t.request(users.admin, 'PATCH', '/settings/config', { key, value })
const answers = () => ({ sections: { [state.sectionKey]: { [state.itemKey]: { rating: 4 } } } })
const cycleRows = async cycleId => t.expectStatus(await t.request(users.perf, 'GET', `${R}/cycles/${cycleId}/assignments`), 200).assignments
const rowOf = async (cycleId, key) => (await cycleRows(cycleId)).find(row => row.employeeId === emps[key].id)
const responses = (assignmentId, relation) => t.repo('ReviewResponse').countBy({ assignmentId, relation })

before(async () => {
  await t.start()
  modules = moduleTools(t.app)
  for (const key of ['tasks', 'performance']) await modules.enable(key)
  org.a = await t.repo('Branch').save({ code: 'TS_A', name: 'فرع أ', country: 'SA' })
  org.b = await t.repo('Branch').save({ code: 'TS_B', name: 'فرع ب', country: 'SA' })
  // الفرع أ (مديره bm): إدارة التشغيل (head) ← قسم الصيانة (subHead) ← فريق الورشة (lead) فيه worker وworker2 (ملفه مسجّل فيه مدير تاني:
  // otherHead) وgone (منتهي)؛ وpeer في القسم برّه الفريق. قسم المبيعات (otherHead) فيه outsider. وsolo من غير قسم. وremote في فرع ب.
  for (const key of ['bm', 'head', 'subHead', 'lead', 'otherHead']) emps[key] = await employee({ bm: 'مدير الفرع', head: 'مدير الإدارة', subHead: 'مدير القسم', lead: 'قائد الفريق', otherHead: 'مدير المبيعات' }[key])
  await t.repo('Branch').update({ id: org.a.id }, { managerEmployeeId: emps.bm.id })
  org.adm = await t.repo('Department').save({ name: 'إدارة التشغيل', code: 'TS_ADM', branchId: org.a.id, unitType: 'ADMINISTRATION', managerEmployeeId: emps.head.id })
  org.dep = await t.repo('Department').save({ name: 'قسم الصيانة', code: 'TS_DEP', branchId: org.a.id, parentId: org.adm.id, managerEmployeeId: emps.subHead.id })
  org.sales = await t.repo('Department').save({ name: 'قسم المبيعات', code: 'TS_SAL', branchId: org.a.id, managerEmployeeId: emps.otherHead.id })
  org.team = await t.repo('Team').save({ name: 'فريق الورشة', code: 'TS_T', departmentId: org.dep.id, leaderEmployeeId: emps.lead.id })
  await t.repo('Employee').update({ id: emps.head.id }, { departmentId: org.adm.id })
  await t.repo('Employee').update({ id: emps.subHead.id }, { departmentId: org.dep.id })
  await t.repo('Employee').update({ id: emps.lead.id }, { departmentId: org.dep.id, teamId: org.team.id })
  await t.repo('Employee').update({ id: emps.otherHead.id }, { departmentId: org.sales.id })
  emps.worker = await employee('فني أول', { departmentId: org.dep.id, teamId: org.team.id })
  emps.worker2 = await employee('فني تاني', { departmentId: org.dep.id, teamId: org.team.id, managerEmployeeId: emps.otherHead.id })
  emps.gone = await employee('فني منتهي', { departmentId: org.dep.id, teamId: org.team.id, status: 'terminated', isActive: false })
  emps.peer = await employee('منسّق القسم', { departmentId: org.dep.id })
  emps.outsider = await employee('مندوب مبيعات', { departmentId: org.sales.id })
  emps.solo = await employee('موظف من غير قسم')
  emps.remote = await employee('موظف فرع ب', { branchId: org.b.id })
  for (const key of Object.keys(emps)) users[key] = await login(emps[key])
  users.admin = await t.user({ scopeAllBranches: true })
  users.hr = await account(['tasks.manage', 'tasks.view_all'])
  users.pm = await account(['tasks.assign_any'])
  users.perf = await account(['performance.manage'])
}, { timeout: 120000 })
after(context => t.stop(context))

test('TS-01: التكليف الفردي — للي تحتي في الهيكل بس: قائد الفريق لفريقه، ومدير القسم لقسمه كله، واللي مالوش حد مهمته الشخصية بس', async () => {
  // قائد الفريق: مش برّه فريقه، ولا لزميله في القسم، ولا لمديره، ولا لمدير مديره
  for (const to of ['outsider', 'peer', 'subHead', 'head', 'solo', 'remote']) assert.deepEqual(answer(await assign('lead', to)), [403, OUTSIDE_TEAM], `lead ← ${to}`)
  // ولكل أعضاء فريقه — ومنهم اللي ملفه مسجّل فيه مدير تاني
  for (const to of ['worker', 'worker2']) assert.equal((await assign('lead', to)).status, 201, `lead ← ${to}`)
  assert.deepEqual(answer(await assign('lead', 'gone')), [400, 'الموظف مش على رأس العمل'])
  // مدير القسم: أي حد في قسمه — أعضاء الفريق وقائده واللي برّه الفريق؛ ومش لقسم تاني ولا لمديره
  for (const to of ['worker', 'worker2', 'lead', 'peer']) assert.equal((await assign('subHead', to)).status, 201, `subHead ← ${to}`)
  for (const to of ['outsider', 'otherHead', 'head', 'bm']) assert.deepEqual(answer(await assign('subHead', to)), [403, OUTSIDE_TEAM], `subHead ← ${to}`)
  // مدير الإدارة: كل اللي تحتها؛ والمدير المسجّل في ملف worker2 لسه فوقه
  for (const to of ['subHead', 'lead', 'worker', 'peer']) assert.equal((await assign('head', to)).status, 201, `head ← ${to}`)
  assert.equal((await assign('otherHead', 'worker2')).status, 201)
  assert.deepEqual(answer(await assign('otherHead', 'worker')), [403, OUTSIDE_TEAM])
  // اللي مالوش حد تحته: الخادم بيرفضه، وقايمته نفسه بس (مهمة شخصية)، ومن غير تكليف لغيره ولا مهمة جماعية
  for (const who of ['worker', 'peer', 'solo']) {
    for (const to of ['lead', 'outsider', 'peer', 'worker'].filter(key => key !== who)) assert.deepEqual(answer(await assign(who, to)), [403, OUTSIDE_TEAM], `${who} ← ${to}`)
    const options = t.expectStatus(await t.request(users[who], 'GET', '/tasks/assignees'), 200)
    assert.deepEqual([options.canAssign, options.canAssignOthers, options.canAssignGroup, options.canManage, options.employees.map(row => [row.id, row.self])],
      [true, false, false, false, [[emps[who].id, true]]], who)
    assert.equal(t.expectStatus(await t.request(users[who], 'GET', '/tasks/team'), 200).manager, false, who)
  }
  // والمهمة الشخصية لسه شغالة له
  assert.equal(t.expectStatus(await assign('worker', 'worker'), 201).personal, true)
  // اللي تحته حد: القايمة فيها اللي تحته (الحاليين) ونفسه، والتكليف لغيره متاح، والمهمة الجماعية جوه شجرته
  const lead = t.expectStatus(await t.request(users.lead, 'GET', '/tasks/assignees'), 200)
  assert.deepEqual([ids(lead.employees), lead.canAssignOthers, lead.canAssignGroup, lead.groupWithin], [idsOf('lead', 'worker', 'worker2'), true, true, 'tree'])
  const subHead = t.expectStatus(await t.request(users.subHead, 'GET', '/tasks/assignees'), 200)
  assert.deepEqual(ids(subHead.employees), idsOf('subHead', 'lead', 'worker', 'worker2', 'peer'))
  // الصلاحيتين القايمتين هما الاستثناء الوحيد: أي موظف في نطاق الحساب، وبرّه النطاق «غير موجود»
  for (const who of ['hr', 'pm']) {
    const options = t.expectStatus(await t.request(users[who], 'GET', '/tasks/assignees'), 200)
    assert.deepEqual([options.canAssignOthers, options.canAssignGroup, options.groupWithin], [true, true, 'scope'], who)
    assert.equal((await assign(who, 'outsider')).status, 201, who)
    assert.deepEqual(answer(await assign(who, 'remote')), [404, 'الموظف غير موجود'], who)
  }
  await t.query('DELETE FROM [tasks]')
})

test('TS-02: المهمة الجماعية للمدير — شجرته بس في المنتقي والمعاينة والحفظ، وأي اختيار برّاها بنفس الرفض، واللي مالوش حد مرفوض', async () => {
  const context = async who => t.expectStatus(await t.request(users[who], 'GET', '/tasks/group-context'), 200)
  const preview = (who, audience) => t.request(users[who], 'POST', '/tasks/group-preview', { audience })
  const team = { mode: 'all', where: { mode: 'teams', ids: [org.team.id], branchId: org.a.id } }
  const unit = id => ({ mode: 'all', where: { mode: 'units', ids: [id], branchId: org.a.id } })
  const named = (...keys) => ({ mode: 'employees', ids: keys.map(key => emps[key]?.id ?? key) })
  // قائد الفريق: فريقه (وقسم الفريق معروض من غير ما يبقى اختيار)، وأعضاؤه الحاليين من غيره هو ومن غير المنتهي
  const lead = await context('lead')
  assert.deepEqual([lead.branches, lead.units.map(row => [row.id, row.listed, row.parentId]), lead.teams.map(row => row.id), ids(lead.employees)],
    [[{ id: org.a.id, name: 'فرع أ' }], [[org.dep.id, false, null]], [org.team.id], idsOf('worker', 'worker2')])
  // مدير القسم: قسمه (من غير رقم الإدارة اللي فوقه) وفريقه وكل اللي في القسم؛ ومدير الإدارة: الإدارة والقسم اللي تحتها
  const subHead = await context('subHead')
  assert.deepEqual([subHead.units.map(row => [row.id, row.listed, row.parentId]), subHead.teams.map(row => row.id), ids(subHead.employees)],
    [[[org.dep.id, true, null]], [org.team.id], idsOf('lead', 'worker', 'worker2', 'peer')])
  const head = await context('head')
  assert.deepEqual([head.units.map(row => [row.id, row.listed, row.parentId]), ids(head.employees)],
    [[[org.adm.id, true, null], [org.dep.id, true, org.adm.id]], idsOf('subHead', 'lead', 'worker', 'worker2', 'peer')])
  // المعاينة بنفس حكم الحفظ: كل اللي تحتي، فرعهم، فريقي، وموظفين بالاسم
  for (const audience of [null, { mode: 'all', where: { mode: 'branches', ids: [org.a.id] } }, team]) {
    const seen = t.expectStatus(await preview('lead', audience), 200)
    assert.deepEqual([seen.count, ids(seen.employees), seen.truncated], [2, idsOf('worker', 'worker2'), false], JSON.stringify(audience))
  }
  assert.deepEqual(ids(t.expectStatus(await preview('subHead', unit(org.dep.id)), 200).employees), idsOf('lead', 'worker', 'worker2', 'peer'))
  assert.deepEqual(ids(t.expectStatus(await preview('lead', { ...team, exclude: [emps.worker2.id] }), 200).employees), idsOf('worker'))
  // الحفظ: كل واحد تحتي في الاختيار بياخد مهمته، وأنا لأ
  const made = t.expectStatus(await group('lead', team), 201)
  assert.deepEqual([made.created, made.skipped, await assigneesOfTasks(made.taskIds)], [2, [], idsOf('worker', 'worker2')])
  assert.deepEqual(await assigneesOfTasks(t.expectStatus(await group('lead', { mode: 'all', where: { mode: 'branches', ids: [org.a.id] } }), 201).taskIds), idsOf('worker', 'worker2'))
  assert.deepEqual(await assigneesOfTasks(t.expectStatus(await group('subHead', unit(org.dep.id)), 201).taskIds), idsOf('lead', 'worker', 'worker2', 'peer'))
  assert.deepEqual(await assigneesOfTasks(t.expectStatus(await group('head', unit(org.adm.id)), 201).taskIds), idsOf('subHead', 'lead', 'worker', 'worker2', 'peer'))
  assert.deepEqual(await assigneesOfTasks(t.expectStatus(await group('subHead', named('peer', 'worker')), 201).taskIds), idsOf('peer', 'worker'))
  // برّه شجرتي — وحدة مش بديرها (قسم فريقي نفسه، قسم تاني، رقم مش موجود)، فرع تاني، فريق مش موجود، موظف بالاسم (زميل، مدير، منتهي، مش
  // موجود)، ومستثنى برّاها: كله بنفس الرفض في المعاينة والحفظ، ومن غير ولا مهمة
  const count = await t.repo('Task').count()
  for (const audience of [unit(org.dep.id), unit(org.sales.id), unit(999999), { mode: 'all', where: { mode: 'branches', ids: [org.b.id] } },
    { mode: 'all', where: { mode: 'branches', ids: [org.a.id, org.b.id] } }, { mode: 'all', where: { mode: 'teams', ids: [999999], branchId: org.a.id } },
    named('peer'), named('worker', 'subHead'), named('gone'), named('remote'), named(999999), named('lead'), { ...team, exclude: [emps.outsider.id] }, { ...team, exclude: [999999] }]) {
    assert.deepEqual(answer(await preview('lead', audience)), [400, OUTSIDE_TREE], `معاينة ${JSON.stringify(audience)}`)
    assert.deepEqual(answer(await group('lead', audience)), [400, OUTSIDE_TREE], `حفظ ${JSON.stringify(audience)}`)
  }
  // اختيار جوه الشجرة ومفيهوش حد يتكلّف
  assert.deepEqual(answer(await group('lead', { ...team, exclude: idsOf('worker', 'worker2') })), [400, 'مفيش حد من اللي تحتك في الاختيار ده'])
  assert.equal(await t.repo('Task').count(), count)
  // اللي مالوش حد تحته: لا شجرة ولا معاينة ولا مهمة جماعية
  for (const who of ['worker', 'peer', 'solo']) {
    assert.deepEqual(answer(await t.request(users[who], 'GET', '/tasks/group-context')), [403, GROUP_RULE], who)
    assert.deepEqual(answer(await preview(who, null)), [403, GROUP_RULE], who)
    assert.deepEqual(answer(await group(who, null)), [403, GROUP_RULE], who)
    assert.deepEqual(answer(await group(who, named(who === 'peer' ? 'worker' : 'peer'))), [403, GROUP_RULE], who)
  }
  assert.equal(await t.repo('Task').count(), count)
  // صاحب الصلاحية القايمة: نطاق فروعه زي الأول (قسم مش بيديره، وموظف مش تحته)
  assert.deepEqual(await assigneesOfTasks(t.expectStatus(await group('hr', unit(org.sales.id)), 201).taskIds), idsOf('otherHead', 'outsider'))
  assert.deepEqual(await assigneesOfTasks(t.expectStatus(await group('pm', named('solo', 'bm')), 201).taskIds), idsOf('solo', 'bm'))
  await t.query('DELETE FROM [tasks]')
})

test('TS-03: تقييم المهمة — اللي المهمة عليه مابيقيّمهاش حتى لو حسابه هو اللي كلّف بيها وبيديرها', async () => {
  await modules.feature('tasks.rating', true)
  // حساب «إدارة المهام» كلّف الفني بمهمة معلّمة «تحتاج تقييم»، والفني قفلها
  const made = t.expectStatus(await assign('hr', 'worker', { needsRating: true }), 201)
  t.expectStatus(await t.request(users.worker, 'POST', `/tasks/${made.id}/status`, { status: 'DONE' }), 201)
  assert.equal(t.expectStatus(await t.request(users.hr, 'GET', `/tasks/${made.id}`), 200).canRate, true)
  // الحساب اتربط بملف الفني نفسه: بقى هو اللي المهمة عليه — لا زرار ولا تقييم، ومفيش تقييم اتكتب
  await t.repo('User').update({ id: users.hr.id }, { employeeId: emps.worker.id })
  const same = { ...users.hr, employeeId: emps.worker.id }
  assert.equal(t.expectStatus(await t.request(same, 'GET', `/tasks/${made.id}`), 200).canRate, false)
  assert.deepEqual(answer(await t.request(same, 'POST', `/tasks/${made.id}/rating`, { rating: 5 })), [403, 'محدش بيقيّم نفسه — تقييم المهمة للي كلّف بيها، مش للي هي عليه'])
  assert.equal((await t.repo('TaskExtra').findOneBy({ taskId: made.id })).rating, null)
  // ورجع حساب من غير موظف: بيقيّم عادي
  await t.repo('User').update({ id: users.hr.id }, { employeeId: null })
  assert.equal(t.expectStatus(await t.request(users.hr, 'POST', `/tasks/${made.id}/rating`, { rating: 4 }), 201).rating, 4)
  await modules.feature('tasks.rating', false)
  await t.query('DELETE FROM [tasks]')
})

test('TS-04: المقيِّم = الرئيس المباشر في الهيكل، و«تقييم فريقي» للي تحته حد بس وفيها اللي بيقيّمهم بس', async () => {
  const template = t.expectStatus(await t.request(users.perf, 'POST', `${R}/templates`, { name: 'نموذج قصير', ratingMax: 5,
    sections: [{ title: 'الجدارات', kind: 'COMPETENCIES', weight: 100, items: [{ label: 'التعاون', type: 'rating' }] }] }), 201)
  state.templateId = template.id; state.sectionKey = template.sections[0].key; state.itemKey = template.sections[0].items[0].key
  // التقييم الذاتي مقفول (الافتراضي): الدورة بتتعمل من غير ميعاد للذاتي
  const listed = t.expectStatus(await t.request(users.perf, 'GET', `${R}/cycles`), 200)
  assert.equal(listed.selfReview, false)
  const cycle = t.expectStatus(await t.request(users.perf, 'POST', `${R}/cycles`, { name: 'تقييم الربع', kind: 'ANNUAL', templateId: template.id, periodStart: '2026-10-01', periodEnd: '2026-12-31',
    managerDueDate: '2027-01-20', audienceMode: 'BRANCHES', audienceIds: [org.a.id] }), 201)
  assert.deepEqual([cycle.selfDueDate, cycle.managerDueDate], ['2027-01-20', '2027-01-20'])
  state.cycle = cycle.id
  assert.equal(t.expectStatus(await t.request(users.perf, 'POST', `${R}/cycles/${cycle.id}/launch`), 200).counts.total, 10)
  const rows = await cycleRows(cycle.id)
  const nameOf = new Map(Object.values(emps).map(row => [row.id, row.fullName]))
  const evaluatorOf = Object.fromEntries(rows.map(row => [nameOf.get(row.employeeId), row.managerName]))
  assert.deepEqual(evaluatorOf, {
    // عضو الفريق ← قائده؛ واللي ملفه فيه مدير مسجّل ← المسجّل؛ وقائد الفريق واللي برّه الفريق ← مدير القسم
    'فني أول': 'قائد الفريق', 'فني تاني': 'مدير المبيعات', 'قائد الفريق': 'مدير القسم', 'منسّق القسم': 'مدير القسم',
    // مدير القسم ← مدير الإدارة اللي فوقه (مش مدير الفرع)؛ ومدير الإدارة ومدير قسم من غير إدارة واللي من غير قسم ← مدير الفرع
    'مدير القسم': 'مدير الإدارة', 'مدير الإدارة': 'مدير الفرع', 'مندوب مبيعات': 'مدير المبيعات', 'مدير المبيعات': 'مدير الفرع', 'موظف من غير قسم': 'مدير الفرع',
    // ومدير الفرع مافوقوش حد: من غير مقيِّم (إدارة الأداء تحدّد له)
    'مدير الفرع': null,
  })
  assert.equal(rows.find(row => row.employeeId === emps.bm.id).hasManager, false)
  // «تقييم فريقي»: للي تحته حد بس، وفيها اللي بيقيّمهم بس — ومحدش في قايمة نفسه
  const team = async who => { const body = t.expectStatus(await t.request(users[who], 'GET', `${R}/team`), 200); return [body.manager, body.reviews.map(row => row.employeeId).sort((a, b) => a - b)] }
  assert.deepEqual(await team('lead'), [true, idsOf('worker')])
  assert.deepEqual(await team('subHead'), [true, idsOf('lead', 'peer')])
  assert.deepEqual(await team('head'), [true, idsOf('subHead')])
  assert.deepEqual(await team('otherHead'), [true, idsOf('worker2', 'outsider')])
  assert.deepEqual(await team('bm'), [true, idsOf('head', 'otherHead', 'solo')])
  for (const who of ['worker', 'worker2', 'peer', 'outsider', 'solo']) assert.deepEqual(await team(who), [false, []], who)
  // اللي مش مقيِّم التكليف مايفتحوش ولا يسلّمه: مدير القسم مش مقيِّم الفني (قائده هو المقيِّم)، ولا الزميل
  const worker = await rowOf(cycle.id, 'worker')
  for (const who of ['subHead', 'peer', 'outsider', 'otherHead']) {
    assert.equal((await t.request(users[who], 'GET', `${R}/${worker.id}`)).status, 404, who)
    assert.equal((await t.request(users[who], 'POST', `${R}/${worker.id}/submit`, { answers: answers() })).status, 404, who)
  }
})

test('TS-05: التقييم الذاتي مقفول (الافتراضي) — لا مطلوب ولا بيتسلّم، والدورة بتكمل بتقييم المدير بس؛ ومحدش بيقيّم نفسه', async () => {
  const worker = await rowOf(state.cycle, 'worker')
  const mine = t.expectStatus(await t.request(users.worker, 'GET', `${R}/mine`), 200)
  assert.deepEqual([mine.selfReview, mine.reviews.map(row => row.id)], [false, [worker.id]])
  const form = t.expectStatus(await t.request(users.worker, 'GET', `${R}/${worker.id}`), 200)
  assert.deepEqual([form.relation, form.selfReview, form.canSubmit, form.self, form.manager], ['self', false, false, null, null])
  assert.deepEqual(answer(await t.request(users.worker, 'POST', `${R}/${worker.id}/submit`, { answers: answers() })), [400, SELF_CLOSED])
  assert.equal(await responses(worker.id, 'SELF'), 0)
  // تقييم المدير مش مستني الذاتي: بيتسلّم وبيبقى هو النتيجة
  const lead = t.expectStatus(await t.request(users.lead, 'GET', `${R}/${worker.id}`), 200)
  assert.deepEqual([lead.relation, lead.canSubmit], ['manager', true])
  const done = t.expectStatus(await t.request(users.lead, 'POST', `${R}/${worker.id}/submit`, { answers: answers() }), 200)
  assert.deepEqual([done.status, done.finalScore, done.selfSubmitted, done.managerSubmitted], ['COMPLETED', 80, false, true])
  // والدورة بتكمل لآخرها من غير ذاتي: اعتماد، إعلان، وإقرار الموظف
  assert.equal(t.expectStatus(await t.request(users.perf, 'POST', `${R}/cycles/${state.cycle}/advance`, { to: 'APPROVED' }), 200).moved, 1)
  assert.equal(t.expectStatus(await t.request(users.perf, 'POST', `${R}/cycles/${state.cycle}/advance`, { to: 'ANNOUNCED' }), 200).moved, 1)
  const announced = t.expectStatus(await t.request(users.worker, 'GET', `${R}/${worker.id}`), 200)
  assert.deepEqual([announced.status, announced.finalScore, announced.canAcknowledge, announced.canSubmit, announced.manager?.score], ['ANNOUNCED', 80, true, false, 80])
  assert.equal(t.expectStatus(await t.request(users.worker, 'POST', `${R}/${worker.id}/acknowledge`, {}), 200).status, 'ACKNOWLEDGED')
  assert.deepEqual([await responses(worker.id, 'SELF'), await responses(worker.id, 'MANAGER')], [0, 1])
  const counts = t.expectStatus(await t.request(users.perf, 'GET', `${R}/cycles`), 200).cycles.find(row => row.id === state.cycle).counts
  assert.deepEqual([counts.self, counts.manager], [0, 1])

  // محدش بيقيّم نفسه: صف تكليف اتسجّل فيه الموظف مقيِّم نفسه (بيانات تالفة) — لا بيظهر في «تقييم فريقي» بتاعه، ولا بيسلّم، ولا بيقرا بعلاقة المدير
  const peer = await rowOf(state.cycle, 'peer')
  await t.repo('ReviewAssignment').update({ id: peer.id }, { managerEmployeeId: emps.peer.id })
  assert.deepEqual(t.expectStatus(await t.request(users.peer, 'GET', `${R}/team`), 200).reviews, [])
  assert.deepEqual(answer(await t.request(users.peer, 'POST', `${R}/${peer.id}/submit`, { answers: answers() })), [400, 'محدش بيقيّم نفسه'])
  assert.deepEqual([await responses(peer.id, 'SELF'), await responses(peer.id, 'MANAGER')], [0, 0])
  const own = t.expectStatus(await t.request(users.peer, 'GET', `${R}/${peer.id}`), 200)
  assert.deepEqual([own.relation, own.canSubmit], ['self', false])
  // وإدارة الأداء ماتحطّوش مقيِّم نفسه
  assert.deepEqual(answer(await t.request(users.perf, 'POST', `${R}/${peer.id}/evaluator`, { evaluatorEmployeeId: emps.peer.id })), [400, 'الموظف مايقيّمش نفسه'])
  t.expectStatus(await t.request(users.perf, 'POST', `${R}/${peer.id}/evaluator`, { evaluatorEmployeeId: emps.subHead.id }), 200)
})

test('TS-06: التقييم الذاتي مفتوح = سلوك النهارده بالحرف؛ وقفله تاني بيخبّي اللي لسه ماتسلّمش ومابيمسحش اللي اتسلّم', async () => {
  // المفتاح معروف لـPATCH /settings/config وبقيمتين بس
  assert.equal((await setConfig('performance.self_review', 'yes')).status, 400)
  t.expectStatus(await setConfig('performance.self_review', 'true'), 200)
  assert.equal(t.expectStatus(await t.request(users.perf, 'GET', `${R}/cycles`), 200).selfReview, true)
  // الدورة الجديدة لازم لها ميعاد للذاتي زي الأول
  const body = { name: 'دورة بذاتي', kind: 'ANNUAL', templateId: state.templateId, periodStart: '2026-10-01', periodEnd: '2026-12-31', managerDueDate: '2027-01-20', audienceMode: 'DEPARTMENTS', audienceIds: [org.sales.id] }
  assert.equal((await t.request(users.perf, 'POST', `${R}/cycles`, body)).status, 400)
  assert.equal(t.expectStatus(await t.request(users.perf, 'POST', `${R}/cycles`, { ...body, selfDueDate: '2027-01-10' }), 201).selfDueDate, '2027-01-10')
  // الذاتي بيتسلّم، ومابيقفلش التكليف، والمدير بيشوفه وبعدين يسلّم تقييمه هو
  const outsider = await rowOf(state.cycle, 'outsider')
  const mine = t.expectStatus(await t.request(users.outsider, 'GET', `${R}/mine`), 200)
  assert.deepEqual([mine.selfReview, mine.reviews[0].selfSubmitted], [true, false])
  assert.equal(t.expectStatus(await t.request(users.outsider, 'GET', `${R}/${outsider.id}`), 200).canSubmit, true)
  const self = t.expectStatus(await t.request(users.outsider, 'POST', `${R}/${outsider.id}/submit`, { answers: answers() }), 200)
  assert.deepEqual([self.status, self.selfSubmitted, self.selfScore, self.managerSubmitted, self.finalScore, self.canSubmit], ['OPEN', true, 80, false, null, false])
  assert.deepEqual(answer(await t.request(users.outsider, 'POST', `${R}/${outsider.id}/submit`, { answers: answers() })), [409, 'التقييم اتسلّم قبل كده — مابيتعدّلش'])
  const manager = t.expectStatus(await t.request(users.otherHead, 'GET', `${R}/${outsider.id}`), 200)
  assert.deepEqual([manager.relation, manager.canSubmit, manager.self?.score], ['manager', true, 80])
  const done = t.expectStatus(await t.request(users.otherHead, 'POST', `${R}/${outsider.id}/submit`, { answers: answers() }), 200)
  assert.deepEqual([done.status, done.selfScore, done.finalScore], ['COMPLETED', 80, 80])
  const solo = await rowOf(state.cycle, 'solo')
  assert.equal(t.expectStatus(await t.request(users.solo, 'GET', `${R}/${solo.id}`), 200).canSubmit, true)

  // اتقفل تاني والدورة شغالة: الذاتي اللي لسه ماتسلّمش مابقاش مطلوب ولا بيتسلّم؛ واللي اتسلّم محفوظ وظاهر لصاحبه ومقيِّمه
  t.expectStatus(await setConfig('performance.self_review', 'false'), 200)
  assert.equal(t.expectStatus(await t.request(users.solo, 'GET', `${R}/${solo.id}`), 200).canSubmit, false)
  assert.deepEqual(answer(await t.request(users.solo, 'POST', `${R}/${solo.id}/submit`, { answers: answers() })), [400, SELF_CLOSED])
  assert.equal(t.expectStatus(await t.request(users.otherHead, 'GET', `${R}/${outsider.id}`), 200).self?.score, 80)
  assert.equal(t.expectStatus(await t.request(users.outsider, 'GET', `${R}/${outsider.id}`), 200).self?.score, 80)
  assert.equal(await responses(outsider.id, 'SELF'), 1)
  // وتقييم المدير ماشي زي ما هو والخطوة مقفولة
  assert.equal(t.expectStatus(await t.request(users.bm, 'POST', `${R}/${solo.id}/submit`, { answers: answers() }), 200).status, 'COMPLETED')
  // واتفتح تاني: الذاتي اللي ماتسلّمش رجع مطلوب
  t.expectStatus(await setConfig('performance.self_review', 'true'), 200)
  const head = await rowOf(state.cycle, 'head')
  assert.equal(t.expectStatus(await t.request(users.head, 'GET', `${R}/${head.id}`), 200).canSubmit, true)
  t.expectStatus(await setConfig('performance.self_review', 'false'), 200)
})

test('TS-07: 360 — دعوة للموظف على نفسه مابتتعرضش ومابيتردّش عليها', async () => {
  await modules.feature('performance.feedback360', true)
  const invites = t.repo('Feedback360Invite')
  const base = { cycleId: state.cycle, relation: 'PEER', status: 'APPROVED', responded: false, createdByUserId: users.perf.id, decidedByUserId: users.perf.id, createdAt: new Date() }
  const own = await invites.save({ ...base, subjectEmployeeId: emps.lead.id, reviewerEmployeeId: emps.lead.id })
  const fair = await invites.save({ ...base, subjectEmployeeId: emps.peer.id, reviewerEmployeeId: emps.lead.id })
  const mine = t.expectStatus(await t.request(users.lead, 'GET', '/performance/feedback360/my'), 200)
  assert.deepEqual(mine.toGive.map(row => row.id), [fair.id])
  assert.deepEqual(answer(await t.request(users.lead, 'POST', `/performance/feedback360/invites/${own.id}/respond`, { rating: 5 })), [400, 'محدش بيقيّم نفسه'])
  assert.equal(await t.repo('Feedback360Response').countBy({ subjectEmployeeId: emps.lead.id }), 0)
  assert.equal((await t.request(users.lead, 'POST', `/performance/feedback360/invites/${fair.id}/respond`, { rating: 5 })).status, 201)
  await modules.feature('performance.feedback360', false)
})
