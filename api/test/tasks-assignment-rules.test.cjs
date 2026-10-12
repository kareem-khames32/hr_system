'use strict'
// B2.5 (إضافة المالك 6 أكتوبر): قواعد إسناد المهام النقية، من غير قاعدة بيانات —
//  TQ-01) مين يدير المهمة (taskManagedBy): الشخصية لصاحبها بس؛ «إدارة المهام» في فرعها؛ واللي كلّف بيها بحقه دلوقتي.
//  TQ-02) مين يشوفها (taskAccess): الشخصية لصاحبها ومديره المباشر بس؛ والعادية للمسؤول واللي بيديرها و«عرض كل المهام» في فرعها والمدير المباشر.
//  TQ-03) «تحته في الشجرة» على هيكل في الذاكرة: المدير المباشر ومديري الوحدات اللي فوق القسم بأي عمق، والدواير بتقف؛ و«كل اللي تحته» بنفس
//         حكم «تحته؟» على كل زوج.
//  TQ-04) حالة المهمة (task_extras): قبل الترحيل القراءة فاضية من غير ما تلمس الجدول؛ والصف بيتعمل أول مرة المهمة تاخد قيمة غير الفاضية.
//  TQ-05) الالتزام بالميعاد ومسمّاه.
//  TQ-06) سجل المهمة: سطر مع كل تغيير، وتعليق بإشارة للتغيير اللي له مستلم، والقراءة بالأقدم الأول باسم اللي عمل التغيير.
// Run (من api/): node --test test/tasks-assignment-rules.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/tasks/task-rules')
const extras = require('../src/tasks/task-extras')
const { ApproverResolver } = require('../src/requests/approver-resolver.service')

const user = (extra = {}) => ({ sub: 10, email: 'u@example.invalid', role: 'employee', employeeId: 100, branchId: 1, permissions: [], ...extra })
const task = (extra = {}) => ({ createdByUserId: 10, branchId: 1, assigneeEmployeeId: 200, assigneeRole: null, isPersonal: false, ...extra })

test('TQ-01: مين يدير المهمة — الشخصية لصاحبها بس، و«إدارة المهام» في فرعها، واللي كلّف بيها بحقه دلوقتي', () => {
  const managed = (account, row, under = false) => rules.taskManagedBy(account, row, under)
  // الشخصية: صاحبها بس — لا الصلاحيات ولا مدير النظام ولا الحساب اللي سجّلها لو اتربط بموظف تاني
  const personal = task({ isPersonal: true, assigneeEmployeeId: 100 })
  assert.equal(managed(user(), personal), true)
  assert.equal(managed(user({ sub: 11 }), personal), true, 'حساب تاني لنفس الموظف')
  assert.equal(managed(user({ employeeId: 101 }), personal, true), false, 'اللي سجّلها واتربط بموظف تاني')
  assert.equal(managed(user({ sub: 11, employeeId: 101, permissions: ['tasks.manage', 'tasks.view_all', 'tasks.assign_any'] }), personal, true), false)
  assert.equal(managed(user({ sub: 11, employeeId: null, role: 'super_admin', permissions: ['*'] }), personal, true), false)
  assert.equal(managed(user({ employeeId: null }), task({ isPersonal: true, assigneeEmployeeId: null })), false, 'حساب من غير موظف مالوش مهمة شخصية')
  // «إدارة المهام» في فرع المهمة (مش لازم يكون اللي كلّف)
  const hr = user({ sub: 11, employeeId: 300, permissions: ['tasks.manage'] })
  assert.deepEqual([managed(hr, task()), managed(hr, task({ branchId: 2 })), managed({ ...hr, branchIds: [2, 3] }, task({ branchId: 2 })), managed({ ...hr, scopeAllBranches: true }, task({ branchId: 9 }))],
    [true, false, true, true])
  // اللي كلّف بيها: ومسؤولها لسه تحته، أو لسه معاه «تكليف أي موظف» وفرعها في نطاقه
  assert.deepEqual([managed(user(), task(), true), managed(user(), task(), false)], [true, false])
  const pm = user({ permissions: ['tasks.assign_any'] })
  assert.deepEqual([managed(pm, task()), managed(pm, task({ branchId: 2 })), managed({ ...pm, sub: 11 }, task()), managed({ ...pm, sub: 11 }, task(), true)], [true, false, false, false])
  // «عرض كل المهام» لوحدها مش إدارة
  assert.equal(managed(user({ sub: 11, permissions: ['tasks.view_all'] }), task()), false)
})

test('TQ-02: مين يشوف المهمة — الشخصية لصاحبها ومديره المباشر بس، والعادية للمسؤول واللي بيديرها و«عرض كل المهام» في فرعها والمدير المباشر', async () => {
  // موظف 200 مديره المباشر 100، و100 تحت 50 (50 فوق الاتنين ومش المباشر لـ200)
  const structure = { directManagerOf: async id => ({ 200: 100, 100: 50 })[id] ?? null, isUnder: async (employeeId, managerId) => ({ 100: [200], 50: [100, 200] })[managerId]?.includes(employeeId) ?? false }
  const access = (account, row) => rules.taskAccess(account, row, structure)
  const personal = task({ isPersonal: true, assigneeEmployeeId: 200, createdByUserId: 20 })
  const owner = user({ sub: 20, employeeId: 200 }), direct = user({ sub: 10, employeeId: 100 }), above = user({ sub: 5, employeeId: 50 })
  assert.deepEqual(await access(owner, personal), { visible: true, work: true, manage: true })
  assert.deepEqual(await access(direct, personal), { visible: true, work: false, manage: false })
  for (const account of [above, user({ sub: 30, employeeId: 300, permissions: ['tasks.manage', 'tasks.view_all', 'tasks.assign_any'] }), user({ sub: 31, employeeId: null, role: 'super_admin', permissions: ['*'] }),
    user({ sub: 20, employeeId: 201 })]) {
    assert.deepEqual(await access(account, personal), { visible: false, work: false, manage: false }, String(account.sub))
  }
  // العادية: المسؤول بيشتغل ومايديرش
  const plain = task({ assigneeEmployeeId: 200, createdByUserId: 5 })
  assert.deepEqual(await access(owner, plain), { visible: true, work: true, manage: false })
  // اللي كلّف بيها (50) ومسؤولها تحته: بيديرها؛ والمدير المباشر (100) بيشوف بس؛ وحد تاني لأ
  assert.deepEqual(await access(above, plain), { visible: true, work: false, manage: true })
  assert.deepEqual(await access(direct, plain), { visible: true, work: false, manage: false })
  assert.deepEqual(await access(user({ sub: 40, employeeId: 400 }), plain), { visible: false, work: false, manage: false })
  // اللي كلّف بيها ومسؤولها مابقاش تحته: زيه زي أي حساب
  assert.deepEqual(await access(user({ sub: 5, employeeId: 60 }), plain), { visible: false, work: false, manage: false })
  // «عرض كل المهام» في فرعها بيشوف بس، وبرّه فرعها لأ؛ و«إدارة المهام» في فرعها بتدير
  assert.deepEqual(await access(user({ sub: 41, employeeId: null, permissions: ['tasks.view_all'] }), plain), { visible: true, work: false, manage: false })
  assert.deepEqual(await access(user({ sub: 41, employeeId: null, permissions: ['tasks.view_all'], branchId: 2 }), plain), { visible: false, work: false, manage: false })
  assert.deepEqual(await access(user({ sub: 42, employeeId: null, permissions: ['tasks.manage'] }), plain), { visible: true, work: false, manage: true })
  // مهمة الدور: حامل الدور في فرعها بيشتغل، ومفيش «مدير مباشر» ليها
  const byRole = task({ assigneeEmployeeId: null, assigneeRole: 'it', createdByUserId: 42 })
  assert.deepEqual(await access(user({ sub: 43, employeeId: 500, permissions: ['approve.it'] }), byRole), { visible: true, work: true, manage: false })
  assert.deepEqual(await access(direct, byRole), { visible: false, work: false, manage: false })
})

// محلّل الهيكل على جداول في الذاكرة
function resolverOf({ employees, teams = [], departments = [], branches = [] }) {
  const repo = rows => ({ findOne: async ({ where }) => { const row = rows.find(item => item.id === where.id); return row ? { ...row } : null }, find: async () => rows.map(row => ({ ...row })) })
  return new ApproverResolver(repo(employees), repo(teams), repo(departments), repo(branches))
}

test('TQ-03: «تحته في الشجرة» — المدير المباشر ومديري الوحدات اللي فوق القسم بأي عمق، والدواير بتقف؛ و«كل اللي تحته» بنفس حكم «تحته؟»', async () => {
  // الفرع 1: إدارة (10، مديرها 1) ← قسم (11، مديره 2) ← فريق (20، قائده 3) فيه 4؛ و5 في القسم برّه الفريق؛ وقسم تاني (12، مديره 6) فيه 7.
  // 8 في فرع 2 ومديره المسجّل 3. 9 و10 دايرة (كل واحد مدير التاني). 11 مسجّل مدير نفسه جوه القسم 11. 12 في قسم أبوه مش موجود (13 ← 99).
  // الفرع 2 مديره 13، و14 فيه من غير قسم. قسمين في دايرة (14 ← 15 ← 14) مديرهم 15 و16، و17 في القسم 14.
  const employees = [
    { id: 1, departmentId: 10, branchId: 1 }, { id: 2, departmentId: 11, branchId: 1 }, { id: 3, departmentId: 11, teamId: 20, branchId: 1 }, { id: 4, departmentId: 11, teamId: 20, branchId: 1 },
    { id: 5, departmentId: 11, branchId: 1 }, { id: 6, departmentId: 12, branchId: 1 }, { id: 7, departmentId: 12, branchId: 1 }, { id: 8, managerEmployeeId: 3, branchId: 2 },
    { id: 9, managerEmployeeId: 10, branchId: 3 }, { id: 10, managerEmployeeId: 9, branchId: 3 }, { id: 11, managerEmployeeId: 11, departmentId: 11, branchId: 1 }, { id: 12, departmentId: 13, branchId: 1 },
    { id: 13, branchId: 2 }, { id: 14, branchId: 2 }, { id: 15, branchId: 3 }, { id: 16, branchId: 3 }, { id: 17, departmentId: 14, branchId: 3 },
  ]
  const resolver = resolverOf({
    employees,
    teams: [{ id: 20, leaderEmployeeId: 3 }],
    departments: [{ id: 10, managerEmployeeId: 1, parentId: null }, { id: 11, managerEmployeeId: 2, parentId: 10 }, { id: 12, managerEmployeeId: 6, parentId: null }, { id: 13, managerEmployeeId: null, parentId: 99 },
      { id: 14, managerEmployeeId: 15, parentId: 15 }, { id: 15, managerEmployeeId: 16, parentId: 14 }],
    branches: [{ id: 1, managerEmployeeId: null }, { id: 2, managerEmployeeId: 13 }, { id: 3, managerEmployeeId: null }],
  })
  const ids = employees.map(row => row.id)
  const below = {}
  for (const manager of [...ids, 999]) below[manager] = (await resolver.subordinatesOf(manager)).sort((a, b) => a - b)
  // «كل اللي تحته» = «تحته؟» على كل زوج (ومنهم رقم مش موجود)
  for (const manager of [...ids, 999]) {
    for (const person of [...ids, 999]) assert.equal(await resolver.isUnder(person, manager), below[manager].includes(person), `${person} تحت ${manager}`)
    assert.equal(below[manager].includes(manager), false, 'المدير مش تحت نفسه')
  }
  // مدير الإدارة فوق كل اللي في قسمها بأي عمق — ومنهم مرؤوس مسجّل في فرع تاني، واللي مسجّل مدير نفسه (رئيس قسمه فوقه برضه)
  assert.deepEqual(below[1], [2, 3, 4, 5, 8, 11])
  // رئيس القسم: كل اللي في قسمه، واللي تحت قائد الفريق
  assert.deepEqual(below[2], [3, 4, 5, 8, 11])
  // قائد الفريق: عضو فريقه ومرؤوسه المسجّل بس — مش زميله في القسم ولا رئيسه
  assert.deepEqual(below[3], [4, 8])
  assert.deepEqual([below[4], below[5], below[7], below[8], below[11], below[12], below[14], below[999]], [[], [], [], [], [], [], [], []])
  // قسم تاني مالوش علاقة، ومدير الفرع فوق اللي من غير مدير تاني في فرعه بس (8 في فرعه ومديره المسجّل حد تاني)
  assert.deepEqual([below[6], below[13]], [[7], [14]])
  // الدواير: كل واحد تحت التاني (ومش تحت نفسه)، وأقسام في دايرة بتقف ومديريها فوق اللي في القسم
  assert.deepEqual([below[9], below[10], below[15], below[16]], [[10], [9], [17], [17]])
  // ورقم فاضي أو صفر مش مدير حد
  assert.deepEqual([await resolver.subordinatesOf(0), await resolver.isUnder(4, 0), await resolver.isUnder(0, 1), await resolver.isUnder(4, 4)], [[], false, false, false])
})

test('TQ-04: حالة المهمة — قبل الترحيل القراءة فاضية من غير ما تلمس الجدول، والصف بيتعمل أول مرة المهمة تاخد قيمة غير الفاضية', async () => {
  extras.resetTaskExtrasCache()
  try {
    // قبل الترحيل: خريطة فاضية وقيم فاضية، من غير أي قراءة من الجدول
    const before = { query: async () => [{ ready: 0 }], getRepository: () => { throw new Error('الجدول مايتقريش قبل الترحيل') } }
    assert.deepEqual([...await extras.taskExtrasOf(before, [1, 2])], [])
    assert.deepEqual(await extras.taskExtrasOfOne(before, 1), { isPersonal: false, returnCount: 0, needsRating: false, rating: null, ratingNote: null, extensionDueDate: null, extensionReason: null })
    assert.deepEqual(extras.NO_TASK_EXTRAS, { isPersonal: false, returnCount: 0, needsRating: false, rating: null, ratingNote: null, extensionDueDate: null, extensionReason: null })
    // بعده: الصفوف الموجودة بس في الخريطة، وأرقام مش صالحة مابتتسألش
    const stored = [{ taskId: 2, isPersonal: true, returnCount: 3, needsRating: false, rating: 4, ratingNote: 'تمام', extensionDueDate: '2026-11-01', extensionReason: 'سبب' }]
    const asked = []
    const fake = () => {
      const calls = []
      const repo = {
        find: async ({ where }) => { asked.push(where.taskId.value ?? where.taskId._value); return stored.filter(row => (where.taskId.value ?? where.taskId._value).includes(row.taskId)).map(row => ({ ...row })) },
        findOne: async ({ where }) => stored.find(row => row.taskId === where.taskId) ?? null,
        update: async (where, changes) => { calls.push(['update', where.taskId, changes]) },
        insert: async row => { calls.push(['insert', row]) },
      }
      return { em: { query: async () => [{ ready: 1 }], getRepository: () => repo }, calls }
    }
    const reading = fake()
    const found = await extras.taskExtrasOf(reading.em, [2, 2, 5, 0, -1, 1.5, null])
    assert.deepEqual([...found], [[2, { isPersonal: true, returnCount: 3, needsRating: false, rating: 4, ratingNote: 'تمام', extensionDueDate: '2026-11-01', extensionReason: 'سبب' }]])
    assert.deepEqual(asked, [[2, 5]])
    assert.deepEqual(await extras.taskExtrasOfOne(reading.em, 5), extras.NO_TASK_EXTRAS)
    // الكتابة: مهمة من غير صف — تغيير مابيخرجش عن القيم الفاضية مابيعملش صف
    for (const patch of [{}, { extensionDueDate: null, extensionReason: null }, { isPersonal: false, needsRating: false }, { returnCount: 0 }, { unknown: 5, taskId: 9 }]) {
      const writing = fake()
      await extras.writeTaskExtras(writing.em, 7, patch)
      assert.deepEqual(writing.calls, [], JSON.stringify(patch))
    }
    // وأول قيمة غير الفاضية بتعمل الصف بكل خاناته (الباقي على قيمه الفاضية)
    const first = fake()
    await extras.writeTaskExtras(first.em, 7, { returnCount: 1, unknown: 5 })
    assert.deepEqual(first.calls, [['insert', { taskId: 7, isPersonal: false, returnCount: 1, needsRating: false, rating: null, ratingNote: null, extensionDueDate: null, extensionReason: null }]])
    const flagged = fake()
    await extras.writeTaskExtras(flagged.em, 8, { isPersonal: true, needsRating: false })
    assert.deepEqual(flagged.calls, [['insert', { taskId: 8, isPersonal: true, returnCount: 0, needsRating: false, rating: null, ratingNote: null, extensionDueDate: null, extensionReason: null }]])
    // ومهمة ليها صف: الخانات المبعوتة بس بتتعدّل (وفاضي في خانة مابتقبلش فاضي = قيمتها الفاضية)
    const existing = fake()
    await extras.writeTaskExtras(existing.em, 2, { rating: 5, ratingNote: undefined, returnCount: undefined, taskId: 99 })
    assert.deepEqual(existing.calls, [['update', 2, { returnCount: 0, rating: 5, ratingNote: null }]])
    const cleared = fake()
    await extras.writeTaskExtras(cleared.em, 2, { extensionDueDate: null, extensionReason: null })
    assert.deepEqual(cleared.calls, [['update', 2, { extensionDueDate: null, extensionReason: null }]])
    // شرط «مش شخصية» في القوايم على اسم جدول المهام في الاستعلام
    assert.equal(extras.notPersonalTask('t'), 'NOT EXISTS (SELECT 1 FROM [task_extras] [personal_extra] WHERE [personal_extra].[taskId] = t.id AND [personal_extra].[isPersonal] = 1)')
  } finally { extras.resetTaskExtrasCache() }
})

test('TQ-05: الالتزام بالميعاد — محسوب من الموعد وتاريخ الإقفال المحلي، ومسمّاه', () => {
  const closed = (dueDate, closedAt, status = 'DONE') => rules.taskCompliance({ status, dueDate, closedAt })
  assert.deepEqual([closed('2026-10-10', new Date(2026, 9, 10, 23, 59)), closed('2026-10-10', new Date(2026, 9, 9, 8, 0)), closed('2026-10-10', new Date(2026, 9, 11, 0, 1)), closed('2026-10-10', new Date(2026, 9, 12, 9, 0))],
    [{ onTime: true, lateDays: 0 }, { onTime: true, lateDays: 0 }, { onTime: false, lateDays: 1 }, { onTime: false, lateDays: 2 }])
  // من غير موعد، أو من غير إقفال، أو مش «خلصت»: مفيش حكم
  assert.deepEqual([closed(null, new Date()), closed('2026-10-10', null), closed('2026-10-10', new Date(2026, 9, 12), 'IN_PROGRESS'), closed('2026-10-10', new Date(2026, 9, 12), 'CANCELLED')], [null, null, null, null])
  assert.deepEqual([null, { onTime: true, lateDays: 0 }, { onTime: false, lateDays: 1 }, { onTime: false, lateDays: 2 }, { onTime: false, lateDays: 3 }, { onTime: false, lateDays: 11 }].map(rules.taskComplianceLabel),
    [null, 'في الميعاد', 'متأخر يوم', 'متأخر يومين', 'متأخر 3 يوم', 'متأخر 11 يوم'])
})

test('TQ-06: سجل المهمة — سطر مع كل تغيير، والتغيير اللي له مستلم معاه تعليق بإشارة؛ والقراءة بالأقدم الأول باسم اللي عمل التغيير ومن غير أرقام', async () => {
  const commentRules = require('../src/comments/comment-rules'), outbox = require('../src/queue/outbox')
  const { Comment } = require('../src/comments/comment.entity'), { Employee } = require('../src/employees/employee.entity'), { User } = require('../src/auth/user.entity')
  const { TaskLogEntry } = require('../src/tasks/task-log.entity')
  const reset = () => { extras.resetTaskExtrasCache(); commentRules.resetCommentsTableCache(); outbox.resetQueueTablesCache() }
  reset()
  try {
    // مخزن في الذاكرة: جدول السجل، وجدول التعليقات، وأحداث الطابور
    const store = { log: [], comments: [], events: [] }
    const repos = new Map([
      [TaskLogEntry, { insert: async row => { store.log.push({ id: store.log.length + 1, ...row }) },
        find: async options => store.log.filter(row => row.taskId === options.where.taskId).sort((a, b) => b.id - a.id).slice(0, options.take) }],
      [Comment, { create: row => ({ ...row }), save: async row => { const saved = { id: 700 + store.comments.length, ...row }; store.comments.push(saved); return saved } }],
      [Employee, { find: async () => [{ id: 100, fullName: 'مدير' }, { id: 200, fullName: 'مسؤول' }] }], [User, { find: async () => [{ id: 30, displayName: 'حساب الموارد' }] }]])
    const em = { getRepository: entity => repos.get(entity),
      query: async (text, params) => { if (/INSERT INTO \[outbox_events\]/.test(text)) { store.events.push(params.slice(0, 4)); return [{ id: '1' }] } return [{ ready: 1 }] } }
    const task = { id: 55 }
    // سطر من غير مستلم: في السجل بس — لا تعليق ولا حدث
    await extras.recordTaskLog(em, { sub: 10, employeeId: 100 }, task, 'ASSIGNED', 'كلّف بالمهمة')
    assert.deepEqual([store.log.length, store.comments.length, store.events.length], [1, 0, 0])
    // سطر له مستلم: في السجل، ومعاه تعليق عادي في حوار المهمة بنفس النص وبإشارة للمستلم، وحدث إشارة برقم التعليق
    await extras.recordTaskLog(em, { sub: 20, employeeId: 200 }, task, 'EXTENSION_REQUESTED', 'طلب تمديد الميعاد', ['CREATOR'])
    await extras.recordTaskLog(em, { sub: 30 }, task, 'RATED', 'قيّم المهمة')
    assert.deepEqual(store.log.map(row => [row.taskId, row.event, row.actorUserId, row.actorEmployeeId, row.body]), [[55, 'ASSIGNED', 10, 100, 'كلّف بالمهمة'], [55, 'EXTENSION_REQUESTED', 20, 200, 'طلب تمديد الميعاد'],
      [55, 'RATED', 30, null, 'قيّم المهمة']])
    assert.deepEqual(store.comments.map(row => [row.entityType, row.entityId, row.authorUserId, row.authorEmployeeId, row.body, row.internal, row.mentions]),
      [['task', 55, 20, 200, 'طلب تمديد الميعاد', false, '{"targets":["CREATOR"],"replyTo":[]}']])
    assert.deepEqual(store.events, [['COMMENT_MENTION', 'comment', '700', '{"commentId":700}']])
    // النص بحده
    await extras.recordTaskLog(em, { sub: 10, employeeId: 100 }, { id: 56 }, 'EDITED', 'ن'.repeat(1500))
    assert.deepEqual([store.log[3].body.length, extras.TASK_LOG_BODY_MAX, extras.TASK_LOG_MAX], [1000, 1000, 200])
    // القراءة: سطور المهمة دي بس، بالأقدم الأول، باسم الموظف المتسجّل وقت التغيير (وحساب من غير موظف باسم الحساب)، ونوع مش معروف مابيتعرضش
    store.log.push({ id: 9, taskId: 55, event: 'FUTURE_KIND', actorUserId: 20, actorEmployeeId: 200, body: 'نوع من إصدار أحدث', createdAt: new Date() })
    const log = await extras.taskLogOf(em, { sub: 20 }, 55)
    assert.deepEqual([log.available, log.truncated], [true, false])
    assert.deepEqual(log.lines.map(line => [line.event, line.label, line.body, line.by, line.mine]), [['ASSIGNED', 'تكليف', 'كلّف بالمهمة', 'مدير', false], ['EXTENSION_REQUESTED', 'طلب تمديد', 'طلب تمديد الميعاد', 'مسؤول', true],
      ['RATED', 'تقييم', 'قيّم المهمة', 'حساب الموارد', false]])
    assert.deepEqual(Object.keys(log.lines[0]).sort(), ['at', 'body', 'by', 'event', 'label', 'mine'])
    // أكتر من حد العرض: آخر 200 سطر، ومتعلّم إنه مقطوع
    for (let index = 0; index < 205; index++) store.log.push({ id: 100 + index, taskId: 77, event: 'EDITED', actorUserId: 10, actorEmployeeId: 100, body: String(index), createdAt: new Date() })
    const long = await extras.taskLogOf(em, { sub: 10 }, 77)
    assert.deepEqual([long.truncated, long.lines.length, long.lines[0].body, long.lines[199].body], [true, 200, '5', '204'])
    assert.deepEqual(Object.keys(extras.TASK_LOG_EVENTS), ['ASSIGNED', 'REASSIGNED', 'DUE_CHANGED', 'EDITED', 'STARTED', 'WAITING', 'DONE', 'CANCELLED', 'REOPENED', 'RETURNED', 'EXTENSION_REQUESTED',
      // B-ADD.19: +2 (مرفقات المهمة)
      'EXTENSION_APPROVED', 'EXTENSION_REJECTED', 'RATED', 'ATTACHED', 'ATTACHMENT_REMOVED'])
    // قبل ترحيل 096: لا سطر ولا تعليق ولا قراءة
    reset()
    const before = { query: async () => [{ ready: 0 }], getRepository: () => { throw new Error('الجدول مايتلمسش قبل الترحيل') } }
    await extras.recordTaskLog(before, { sub: 20, employeeId: 200 }, task, 'EXTENSION_REQUESTED', 'طلب تمديد الميعاد', ['CREATOR'])
    assert.deepEqual(await extras.taskLogOf(before, { sub: 20 }, 55), { available: false, truncated: false, lines: [] })
  } finally { reset() }
})
