'use strict'
// B-ADD.18 (كلمة المالك 12 أكتوبر 2026): نطاق المهام والتقييمات — «اللي تحتي»، ومين يقيّم مين، ومحدش بيقيّم نفسه. من غير قاعدة بيانات
// (المسارات نفسها في task-scope.integration.cjs):
//  TSU-01) «اللي تحتي»: قائد الفريق فوق كل أعضاء فريقه حتى اللي ملفه فيه مدير تاني؛ و«كل اللي تحته» = «تحته؟» على كل زوج؛ ومحدش تحت نفسه.
//  TSU-02) المقيِّم (directSuperiorOf): المدير المسجّل ← قائد الفريق ← مدير القسم ثم الإدارة اللي فوقه ← مدير الفرع، ومحدش رئيس نفسه؛
//          وdirectManagerOf (اعتماد الطلبات) زي ما هو.
//  TSU-03) وحدات وفرق «اللي تحتي» (unitsUnder): اللي بيديرها هو أو حد تحته وكل اللي تحتها، وفرقها.
//  TSU-04) جمهور المهمة الجماعية جوه شجرة المدير (assertAudienceInsideTree): أي رقم برّاها — موجود أو لأ — بنفس الرفض، والنص التالف مرفوض.
//  TSU-05) مصدر الكود: التقييم الذاتي إعداد مقفول افتراضيًا وبيتقري على اتصال المعاملة قبل أي كتابة، والمقيِّم بيتحل قبل المعاملة، وتقييم
//          المهمة مش للي هي عليه، والمهمة الجماعية للمدير متحكوم عليها بعد قفل الصفوف.
//  TSU-06) الشاشات: «تقييم فريقي» وزرار التكليف من حكم الخادم، ومنتقي «على مين؟» من شجرة المدير، ومن غير أصناف اتجاه فيزيائي.
// Run (من api/): node --test test/task-scope.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/tasks/task-rules')
const reviewRules = require('../src/performance/review-rules')
const { ApproverResolver } = require('../src/requests/approver-resolver.service')
const { configSeed } = require('../src/seed/requests-seed.data')
const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
const web = rel => fs.readFileSync(path.join(apiRoot, '..', 'src', rel), 'utf8').replace(/\r\n/g, '\n')

function resolverOf({ employees, teams = [], departments = [], branches = [] }) {
  const repo = rows => ({ findOne: async ({ where }) => { const row = rows.find(item => item.id === where.id); return row ? { ...row } : null }, find: async () => rows.map(row => ({ ...row })) })
  return new ApproverResolver(repo(employees), repo(teams), repo(departments), repo(branches))
}

// الفرع 1 (مديره 9): إدارة 10 (مديرها 1) ← قسم 11 (مديره 2) ← فريق 20 (قائده 3) فيه 4 و5 (5 ملفه مسجّل فيه مدير تاني: 7)؛ و6 في القسم
// برّه الفريق. قسم تاني 12 (مديره 7) من غير إدارة، فيه 8. وقسم 13 من غير مدير تحت الإدارة 10، فيه 12. و11 مالوش قسم ولا مدير.
const STRUCTURE = {
  employees: [
    { id: 1, departmentId: 10, branchId: 1 }, { id: 2, departmentId: 11, branchId: 1 }, { id: 3, departmentId: 11, teamId: 20, branchId: 1 },
    { id: 4, departmentId: 11, teamId: 20, branchId: 1 }, { id: 5, departmentId: 11, teamId: 20, managerEmployeeId: 7, branchId: 1 }, { id: 6, departmentId: 11, branchId: 1 },
    { id: 7, departmentId: 12, branchId: 1 }, { id: 8, departmentId: 12, branchId: 1 }, { id: 9, branchId: 1 }, { id: 11, branchId: 1 }, { id: 12, departmentId: 13, branchId: 1 },
  ],
  teams: [{ id: 20, leaderEmployeeId: 3, departmentId: 11 }, { id: 21, leaderEmployeeId: null, departmentId: 12 }],
  departments: [{ id: 10, managerEmployeeId: 1, parentId: null }, { id: 11, managerEmployeeId: 2, parentId: 10 }, { id: 12, managerEmployeeId: 7, parentId: null }, { id: 13, managerEmployeeId: null, parentId: 10 }],
  branches: [{ id: 1, managerEmployeeId: 9 }],
}

test('TSU-01: «اللي تحتي» — قائد الفريق فوق كل أعضاء فريقه حتى اللي ملفه فيه مدير تاني، و«كل اللي تحته» = «تحته؟»، ومحدش تحت نفسه', async () => {
  const resolver = resolverOf(STRUCTURE)
  const ids = STRUCTURE.employees.map(row => row.id)
  const below = {}
  for (const manager of ids) below[manager] = (await resolver.subordinatesOf(manager)).sort((a, b) => a - b)
  for (const manager of ids) {
    assert.equal(below[manager].includes(manager), false, 'المدير مش تحت نفسه')
    for (const person of ids) assert.equal(await resolver.isUnder(person, manager), below[manager].includes(person), `${person} تحت ${manager}`)
  }
  // قائد الفريق: كل أعضاء فريقه — ومنهم 5 اللي مديره المسجّل حد تاني (كان برّه قبل B-ADD.18)؛ مش زميله في القسم ولا رئيسه
  assert.deepEqual(below[3], [4, 5])
  // مدير القسم: كل قسمه بفريقه؛ ومدير الإدارة: كل اللي تحتها (ومنهم قسم من غير مدير)
  assert.deepEqual(below[2], [3, 4, 5, 6])
  assert.deepEqual(below[1], [2, 3, 4, 5, 6, 12])
  // المدير المسجّل في ملف 5 (مدير قسم تاني) لسه فوقه كمان، مع قسمه هو
  assert.deepEqual(below[7], [5, 8])
  // اللي مالوش حد تحته
  assert.deepEqual([below[4], below[5], below[6], below[8], below[11], below[12]], [[], [], [], [], [], []])
  // مدير الفرع فوق اللي مالوش مدير تاني في فرعه (رؤساء الوحدات اللي مافوقهمش حد، واللي من غير قسم) — وكل اللي تحتهم
  assert.deepEqual(below[9], [1, 2, 3, 4, 5, 6, 7, 8, 11, 12])
})

test('TSU-02: المقيِّم — المدير المسجّل ← قائد الفريق ← مدير القسم ثم الإدارة اللي فوقه ← مدير الفرع، ومحدش رئيس نفسه', async () => {
  const resolver = resolverOf(STRUCTURE)
  const superior = async id => resolver.directSuperiorOf(id)
  // عضو الفريق ← قائده؛ واللي ملفه فيه مدير مسجّل ← المسجّل (بيتقدّم على القائد زي المدير المباشر)
  assert.deepEqual([await superior(4), await superior(5)], [3, 7])
  // قائد الفريق ← مدير قسمه؛ واللي برّه الفريق ← مدير قسمه
  assert.deepEqual([await superior(3), await superior(6)], [2, 2])
  // مدير القسم ← مدير الإدارة اللي فوقه — مش مدير الفرع (ده الفرق عن directManagerOf)
  assert.deepEqual([await superior(2), await resolver.directManagerOf(2)], [1, 9])
  // قسم من غير مدير: أول وحدة فوقه ليها مدير
  assert.deepEqual([await superior(12), await resolver.directManagerOf(12)], [1, 9])
  // مدير إدارة أو قسم مافوقوش وحدة ← مدير الفرع؛ ومدير الفرع نفسه ومالوش حد فوقه ← محدش
  assert.deepEqual([await superior(1), await superior(7), await superior(11), await superior(9), await superior(999)], [9, 9, 9, null, null])
  // محدش رئيس نفسه في أي درجة: مسجّل مدير نفسه، وقائد فريقه، ومدير قسمه، ومدير فرعه
  const loop = resolverOf({ employees: [{ id: 1, managerEmployeeId: 1, teamId: 5, departmentId: 6, branchId: 7 }], teams: [{ id: 5, leaderEmployeeId: 1, departmentId: 6 }],
    departments: [{ id: 6, managerEmployeeId: 1, parentId: null }], branches: [{ id: 7, managerEmployeeId: 1 }] })
  assert.equal(await loop.directSuperiorOf(1), null)
  // والباقي زي directManagerOf بالحرف
  for (const id of [3, 4, 5, 6, 7, 8, 11]) assert.equal(await superior(id), await resolver.directManagerOf(id), `موظف ${id}`)
})

test('TSU-03: وحدات وفرق «اللي تحتي» — اللي بيديرها هو أو حد تحته وكل اللي تحتها، وفرقها', async () => {
  const resolver = resolverOf(STRUCTURE)
  const units = async id => { const found = await resolver.unitsUnder(id, await resolver.subordinatesOf(id)); return [found.unitIds.sort((a, b) => a - b), found.teamIds.sort((a, b) => a - b)] }
  // مدير الإدارة: إدارته وكل الوحدات اللي تحتها (ومنها قسم من غير مدير)، وفرقها
  assert.deepEqual(await units(1), [[10, 11, 13], [20]])
  // مدير القسم: قسمه وفريقه؛ وقائد الفريق: فريقه بس (مابيديرش قسم)
  assert.deepEqual(await units(2), [[11], [20]])
  assert.deepEqual(await units(3), [[], [20]])
  // قسم تاني وفريقه اللي من غير قائد؛ ومدير الفرع: كل وحدات اللي تحته
  assert.deepEqual(await units(7), [[12], [21]])
  assert.deepEqual(await units(9), [[10, 11, 12, 13], [20, 21]])
  // اللي مالوش حد ولا وحدة
  assert.deepEqual([await units(4), await units(11), await resolver.unitsUnder(0, [])], [[[], []], [[], []], { unitIds: [], teamIds: [] }])
})

test('TSU-04: جمهور المهمة الجماعية جوه شجرة المدير — أي رقم برّاها (موجود أو لأ) بنفس الرفض، والنص التالف مرفوض', () => {
  const tree = { under: new Set([4, 5, 6]), employeeIds: new Set([4, 5]), unitIds: new Set([11]), teamIds: new Set([20]), branchIds: new Set([1]) }
  const text = value => (value === null ? null : JSON.stringify(value))
  const ok = value => assert.doesNotThrow(() => rules.assertAudienceInsideTree(text(value), tree), JSON.stringify(value))
  const refused = value => assert.throws(() => rules.assertAudienceInsideTree(typeof value === 'string' ? value : text(value), tree),
    error => error.getStatus() === 400 && error.message === rules.TASK_GROUP_OUTSIDE_TREE, JSON.stringify(value))
  // كل اللي تحتي، فرعهم، وحدتي، فريقي، وموظفين بالاسم، واستثناء منهم
  ok(null)
  ok({ mode: 'all', ids: [], where: { mode: 'branches', ids: [1] } })
  ok({ mode: 'all', ids: [], where: { mode: 'units', ids: [11], branchId: 1 }, exclude: [5] })
  ok({ mode: 'all', ids: [], where: { mode: 'teams', ids: [20], branchId: 1 } })
  ok({ mode: 'all', ids: [], where: { mode: 'teams', ids: [20] } })
  ok({ mode: 'employees', ids: ['4', '5'], where: null })
  // برّه الشجرة: موظف بالاسم (تحتي بس مش حالي أو برّه نطاق الحساب = 6، أو مش تحتي = 7، أو مش موجود)، ومستثنى، وفرع، ووحدة، وفريق
  for (const value of [
    { mode: 'employees', ids: ['6'], where: null }, { mode: 'employees', ids: ['4', '7'], where: null }, { mode: 'employees', ids: ['999999'], where: null },
    { mode: 'all', ids: [], where: null, exclude: [7] }, { mode: 'all', ids: [], where: { mode: 'branches', ids: [1, 2] } },
    { mode: 'all', ids: [], where: { mode: 'units', ids: [12], branchId: 1 } }, { mode: 'all', ids: [], where: { mode: 'units', ids: [11], branchId: 2 } },
    { mode: 'all', ids: [], where: { mode: 'teams', ids: [21] } }, { mode: 'all', ids: [], where: { mode: 'teams', ids: [20], branchId: 9 } },
    // شكل «فين» مش معروف، أو أرقام مش قايمة
    { mode: 'all', ids: [], where: { mode: 'company', ids: [] } }, { mode: 'all', ids: [], where: { mode: 'units', ids: 11, branchId: 1 } }, { mode: 'employees', ids: '4', where: null },
  ]) refused(value)
  // نص تالف = مرفوض (مش «الكل»)
  for (const damaged of ['{', '[]', '5', '"x"']) refused(damaged)
  assert.match(rules.TASK_GROUP_OUTSIDE_TREE, /مش تحتك في الهيكل/)
})

test('TSU-05: مصدر الكود — التقييم الذاتي إعداد مقفول افتراضيًا ومقروء على اتصال المعاملة، والمقيِّم قبل المعاملة، ومحدش بيقيّم نفسه', () => {
  // الإعداد: مفتاح في configSeed بقيمة «مقفول»، ومقبول في PATCH /settings/config بقيمتين بس، و'true' بس هي اللي تفتح
  assert.deepEqual(configSeed.filter(row => row.key === reviewRules.REVIEW_SELF_KEY), [{ key: 'performance.self_review', value: 'false' }])
  assert.match(read('settings/settings.controller.ts'), /'performance\.self_review': \['true', 'false'\],/)
  assert.match(read('performance/review-rules.ts'), /return String\(row\?\.value \?\? ''\)\.trim\(\) === 'true'/)
  const service = read('performance/reviews.service.ts')
  // التسليم: الحكم بعد قفل صف التكليف، وعلى اتصال المعاملة (em)، وقبل أي كتابة
  const submit = service.slice(service.indexOf('async submit('))
  const order = ["lock: { mode: 'pessimistic_write' }", "assignment.employeeId === user.employeeId ? 'SELF'", "if (relation === 'SELF' && !(await selfReviewOn(em)))", 'getRepository(ReviewResponse).insert('].map(part => submit.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  // صاحب التكليف «ذاتي» قبل أي علاقة تانية: عمره ما بيكتب تقييم مدير لنفسه، ولا بيقرا بعلاقة المدير
  assert.match(service, /if \(user\.employeeId && user\.employeeId === assignment\.employeeId\) return 'self'\n    if \(user\.employeeId && user\.employeeId === assignment\.managerEmployeeId\) return 'manager'/)
  assert.match(service, /canSubmit: cycle\.status === 'ACTIVE' && \(\(relation === 'self' && selfReview && !assignment\.selfSubmittedAt\)/)
  // الإطلاق: المقيِّم الرئيس المباشر في الهيكل، ومحدش مقيِّم نفسه، ومن غير نداء للمحلّل جوه المعاملة
  const launch = service.slice(service.indexOf('async launch('), service.indexOf('/** قفل الدورة'))
  assert.match(launch, /const manager = await this\.resolver\.directSuperiorOf\(employee\.id\)\n\s+managers\.set\(employee\.id, manager && manager !== employee\.id \? manager : null\)/)
  assert.doesNotMatch(launch.slice(launch.indexOf('this.ds.transaction(')), /this\.resolver\./)
  // «تقييم فريقي»: تكليف الموظف نفسه برّاها، والتبويب للي تحته حد حالي (نفس subordinatesOf بتاع المهام)
  const team = service.slice(service.indexOf('async team('), service.indexOf('/** علاقة الحساب بتكليف'))
  assert.match(team, /\.filter\(\(row\) => row\.employeeId !== user\.employeeId\)/)
  assert.match(team, /const manager = rows\.length > 0 \|\| await this\.hasPeopleUnder\(em, user\.employeeId\)/)
  assert.match(team, /const under = await this\.resolver\.subordinatesOf\(employeeId\)/)
  // وتغيير المقيِّم من إدارة الأداء لسه بيرفض الموظف نفسه
  assert.match(service, /if \(evaluatorId === assignment\.employeeId\) throw new BadRequestException\('الموظف مايقيّمش نفسه'\)/)
  // 360: مفيش نموذج ذاتي، ودعوة على النفس مابيتردّش عليها
  assert.match(read('performance/feedback360.service.ts'), /if \(invite\.subjectEmployeeId === me\) throw new BadRequestException\(REVIEW_NO_SELF_EVALUATION\)/)
  assert.deepEqual([...require('../src/performance/people-feedback').FEEDBACK_RELATIONS], ['PEER', 'UPWARD'])
  // تقييم المهمة: مش للي هي عليه، تحت قفل صفها، وزراره مابيظهرلوش
  const tasks = read('tasks/tasks.service.ts')
  const rate = tasks.slice(tasks.indexOf('async rate('), tasks.indexOf('* تقرير الالتزام'))
  const rateOrder = ['await this.plainLocked(em, user, id)', 'task.assigneeEmployeeId === user.employeeId) throw new ForbiddenException(TASK_SELF_RATING)', 'await writeTaskExtras(em, task.id, { rating'].map(part => rate.indexOf(part))
  assert.ok(rateOrder.every((at, index) => at > 0 && (index === 0 || at > rateOrder[index - 1])), JSON.stringify(rateOrder))
  assert.match(tasks, /canManage\n\s+&& !\(task\.assigneeEmployeeId != null && task\.assigneeEmployeeId === user\.employeeId\),/)
  // المهمة الجماعية للمدير: الشجرة على اتصال المعاملة، والرفض قبل فحص الوجود، والشجرة بتتقري تاني بعد قفل صفوف الموظفين
  const group = tasks.slice(tasks.indexOf('async createForGroup('), tasks.indexOf('// ===== B-ADD.18: شجرة المدير'))
  const groupOrder = ['const tree = await this.groupTree(user, em)', 'assertAudienceInsideTree(audience, tree)', "await assertAudienceTargets(em, audience, 'جمهور المهمة')", 'WITH (UPDLOCK, ROWLOCK)',
    '.filter(await insideTreeNow())\n      if (!members.length)', 'await this.assignment(user, { assigneeEmployeeId: member.id }, em, tree?.under)'].map(part => group.indexOf(part))
  assert.ok(groupOrder.every((at, index) => at > 0 && (index === 0 || at > groupOrder[index - 1])), JSON.stringify(groupOrder))
  assert.doesNotMatch(group.slice(group.indexOf('this.ds.transaction(')), /this\.resolver\.|this\.ds\.manager/, 'جوه المعاملة بـem بس')
  // الصلاحيتين القايمتين هما الاستثناء الوحيد: مفيش صلاحية جديدة
  assert.match(group, /const byScope = userHasPerm\(user, 'tasks\.manage'\) \|\| userHasPerm\(user, 'tasks\.assign_any'\)/)
  assert.doesNotMatch(read('auth/permissions.ts'), /tasks\.assign_team|tasks\.assign_tree|performance\.evaluate/)
  // مسارات المدير الجديدة تبع موديول المهام وبحارس الدخول، وقبل ‎:id
  const controller = read('tasks/tasks.controller.ts')
  assert.match(controller, /@RequireModule\('tasks'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Controller\('tasks'\)/)
  for (const fixed of ["@Get('group-context')", "@Post('group-preview')"]) assert.ok(controller.indexOf(fixed) > 0 && controller.indexOf(fixed) < controller.indexOf("@Get(':id')"), fixed)
})

test('TSU-06: الشاشات — «تقييم فريقي» وزرار التكليف من حكم الخادم، ومنتقي «على مين؟» من شجرة المدير، ومن غير أصناف اتجاه فيزيائي', () => {
  const reviews = web('app/performance/page.tsx')
  assert.match(reviews, /fetchTeamReviews\(\)\.then\(\(data\) => setManager\(data\.manager === true\)\)/)
  assert.match(reviews, /\{manager && <div className="flex items-center gap-2" role="tablist" data-reviews-tabs>/)
  assert.match(reviews, /row\.selfSubmitted \|\| !selfReview \? null : `سلّم تقييمك الذاتي قبل/)
  const form = web('app/performance/[id]/page.tsx')
  assert.match(form, /form\.relation === 'self' && form\.selfReview === false \? 'رئيسك المباشر هو اللي بيقيّمك/)
  const cycles = web('app/performance/cycles/page.tsx')
  assert.match(cycles, /\{selfReview && \(\n\s+<label className="block text-sm text-gray-700">\n\s+آخر يوم للذاتي/)
  assert.match(cycles, /\.\.\.\(selfReview \? \{ selfDueDate \} : \{\}\), managerDueDate/)
  assert.match(cycles, /\{selfReview && <th className="px-3 py-2 text-start font-medium text-gray-600">الذاتي<\/th>\}/)
  assert.match(web('app/settings/policies/page.tsx'), /\{ key: 'performance\.self_review', label: 'التقييم الذاتي في دورات التقييم', type: 'bool'/)
  // المهام: اللي مالوش حد تحته «مهمة شخصية» من غير منتقي موظف، والمدير منتقيه من شجرته
  const page = web('app/my/tasks/page.tsx')
  assert.match(page, /\{assignees\.canAssignOthers === false \? 'مهمة شخصية' : 'مهمة جديدة'\}/)
  const modal = web('components/tasks/TaskFormModal.tsx')
  assert.match(modal, /const selfOnly = !task && assignees\.canAssignOthers === false/)
  assert.match(modal, /\) : selfOnly \? \(\n\s+<p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3" data-task-self-only>/)
  assert.match(modal, /source=\{inTree \? TASK_GROUP_TREE_SOURCE : undefined\}/)
  const api = web('lib/tasks-api.ts')
  assert.match(api, /context: \(\) => apiFetch<OrgAudienceContext>\('\/tasks\/group-context'\)/)
  assert.match(api, /preview: audience => apiFetch<AudiencePreview>\('\/tasks\/group-preview', json\('POST', \{ audience \}\)\)/)
  const field = web('components/OrgAudienceField.tsx')
  assert.match(field, /\(source \? source\.context\(\) : fetchOrgAudienceContext\(\)\)/)
  assert.match(field, /\(source \? source\.preview\(current\) : previewOrgAudience\(current\)\)/)
  // قسم فريق المدير مش من اختياراته: بيتبعت للمنتقي «مش نشط» (فريقه بيفضل ظاهر تحته)
  assert.match(web('lib/org-audience.ts'), /\.\.\.\(u\.listed === false \? \{ isActive: false \} : \{\}\)/)
  for (const [name, text] of Object.entries({ reviews, form, cycles, page, modal, field })) {
    assert.doesNotMatch(text, /(?<![\w-])(?:ml|mr|pl|pr|left|right)-\d|text-left|text-right/, `${name}: أصناف اتجاه فيزيائي`)
  }
})
