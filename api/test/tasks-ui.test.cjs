// B2.5: شاشات محرك المهام — «مهامي» (عليّ / فريقي، والتهيئة والإخلاء)، وقايمة المهام، ونموذج التكليف وكارت المهمة، والقايمة الجانبية
// والإعدادين في «سياسات النظام». اختبارات نقية بلا قاعدة بيانات.
// Run (من api/): node --test test/tasks-ui.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const root = path.join(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

test('TU-01: عميل الـAPI على مسارات الخادم نفسها، والقيم بنفس قيم الخادم', () => {
  const ui = require('../../src/lib/tasks-api')
  const server = require('../src/tasks/task.entity')
  assert.deepEqual(Object.keys(ui.TASK_STATUS_LABELS), [...server.TASK_STATUSES])
  assert.deepEqual(Object.keys(ui.TASK_PRIORITY_LABELS), [...server.TASK_PRIORITIES])
  assert.deepEqual(ui.TASK_OPEN_STATUSES, [...server.TASK_OPEN_STATUSES])
  const api = read('src/lib/tasks-api.ts')
  for (const call of ["apiFetch<ApiMyTasks>('/tasks/mine')", "apiFetch<ApiTaskCounts>('/tasks/mine/count')", "('/tasks/team')", "apiFetch<ApiTaskAssignees>('/tasks/assignees')",
    'apiFetch<ApiTask>(`/tasks/${id}`)', "apiFetch<ApiTask>('/tasks', json('POST', input))", "apiFetch<ApiTask>(`/tasks/${id}`, json('PATCH', input))",
    "apiFetch<ApiTask>(`/tasks/${id}/status`, json('POST', input))", "(`/tasks${query ? `?${query}` : ''}`)"]) assert.ok(api.includes(call), call)
  const controller = read('api/src/tasks/tasks.controller.ts')
  assert.match(controller, /@RequireModule\('tasks'\)\s+@UseGuards\(JwtAuthGuard, RolesGuard\)\s+@Controller\('tasks'\)/)
  // المسارات الثابتة قبل :id (وإلا «mine» و«team» يتقروا رقم مهمة)
  const order = ["@Get('mine')", "@Get('mine/count')", "@Get('team')", "@Get('assignees')", '@Get()', '@Post()', "@Get(':id')", "@Patch(':id')", "@Post(':id/status')"].map(route => controller.indexOf(route))
  assert.ok(order.every(at => at > 0) && order.every((at, index) => index === 0 || at > order[index - 1]), JSON.stringify(order))
  // قايمة كل المهام بس اللي بصلاحية؛ الباقي حقه في الخدمة
  assert.deepEqual([...controller.matchAll(/@Perm\('([^']+)'\)/g)].map(match => match[1]), ['tasks.view_all'])
  assert.match(controller, /@Get\(\)\s+@Perm\('tasks\.view_all'\)\s+list\(/)
})

test('TU-02: «مهامي» — المهام العامة، والتهيئة والإخلاء بلينك شاشتهم، وتبويب «فريقي»، وفتح مهمة من لينك البريد', () => {
  const page = read('src/app/my/tasks/page.tsx')
  for (const marker of ['data-my-tasks', 'data-tasks-unavailable', 'data-general-tasks', 'data-onboarding-tasks', 'data-clearance-items', 'data-team-tasks', 'data-linked-task', 'data-new-task']) {
    assert.ok(page.includes(marker), marker)
  }
  assert.match(page, /Promise\.all\(\[fetchMyTasks\(\), fetchTeamTasks\(\), fetchTaskAssignees\(\)\]\)/)
  // التهيئة والإخلاء بيتقفلوا من شاشتهم
  assert.match(page, /<Link href="\/employees\/onboarding"/)
  assert.match(page, /<Link href=\{`\/offboarding\/\$\{item\.caseId\}`\}/)
  // «فريقي» للمدير بس، و«مهمة جديدة» للي يقدر يكلّف والجدول موجود
  assert.match(page, /\{team\?\.manager && \(/)
  assert.match(page, /\{assignees\?\.canAssign && assignees\.available && \(/)
  // لينك البريد: ‎/my/tasks?task=<id>
  assert.match(page, /new URLSearchParams\(window\.location\.search\)\.get\('task'\)/)
  assert.match(read('api/src/notifications/notifications.service.ts'), /link: `\/my\/tasks\?task=\$\{task\.id\}`/)
  // لينك تبليغ التأخير لمهمة على حد من الفريق: الصفحة بتفتح على «فريقي» (مرة واحدة)، مش على «عليّ» والمهمة مش فيه
  assert.match(page, /if \(wanted && !inbox\.tasks\.some\(row => row\.id === wanted\) && mineTeam\.tasks\.some\(row => row\.id === wanted\)\) setTab\('team'\)\s+linkedTab\.current = null/)
  assert.match(page, /linkedTab\.current = id\s+setLinkedId\(id\)/)
  // قبل الترحيل: التنبيه ظاهر والتهيئة والإخلاء لسه معروضين
  assert.match(page, /\{mine && !mine\.available && \(/)
})

test('TU-03: كارت المهمة ونموذج التكليف — الأزرار من حكم الخادم، والإثبات والأسباب مطلوبة قبل الإرسال', () => {
  const card = read('src/components/tasks/TaskCard.tsx')
  // شغل المسؤول، وإدارة المنشئ أو صاحب الصلاحية — من canWork وcanManage اللي الخادم بيرجّعهم
  assert.match(card, /\{task\.canWork && task\.status !== 'IN_PROGRESS' &&/)
  assert.match(card, /\{task\.canWork && task\.status !== 'WAITING' &&/)
  assert.match(card, /\{open && \(task\.canWork \|\| task\.canManage\) &&/)
  assert.match(card, /\{open && task\.canManage && onEdit &&/)
  assert.match(card, /\{!open && task\.canManage &&/)
  assert.match(card, /if \(task\.requiresProof && !text && !file\) \{ setError\('المهمة دي مطلوب لها إثبات: اكتب اللي اتعمل أو ارفع ملف'\); return \}/)
  assert.match(card, /uploadFile\(file, \{ entityType: 'task' \}\)/)
  assert.match(card, /if \(panel === 'waiting'\) \{ if \(!text\)/)
  assert.match(card, /if \(panel === 'cancel'\) \{ if \(!text\)/)
  // إعادة الفتح بسبب (الخادم بيرفضها من غيره): الزرار بيفتح خانة السبب، مش بيبعت على طول
  assert.match(card, /if \(panel === 'reopen'\) \{ if \(!text\) \{ setError\('اكتب سبب إعادة فتح المهمة'\); return \} return change\('OPEN', \{ note: text \}\) \}/)
  assert.match(card, /\{!open && task\.canManage && <button type="button" className="btn-secondary" disabled=\{busy\} onClick=\{\(\) => setPanel\('reopen'\)\}>/)
  assert.doesNotMatch(card, /change\('OPEN'\)/)
  // الملف اللي اترفع مايترفعش تاني لو الإقفال اترفض واتعادت المحاولة بنفس الملف
  assert.match(card, /if \(uploaded\.current\?\.file !== file\) uploaded\.current = \{ file, id: \(await uploadFile\(file, \{ entityType: 'task' \}\)\)\.id \}\s+proofFileId = uploaded\.current\.id/)
  // نوع ملف الإثبات مقبول في الرفع، وتحميله بحكم المهمة
  const files = read('api/src/files/files.controller.ts')
  assert.match(files, /'leave_attachment', 'task'\]\.includes\(entityType\)/)
  assert.match(files, /else if \(f\.entityType === 'task'\) \{[\s\S]{0,260}await assertTaskFileAccess\(this\.ds\.manager, user, f\)/)
  const form = read('src/components/tasks/TaskFormModal.tsx')
  // مهمة الدور لصاحب «إدارة المهام» بس، والمسؤول بيتبعت في التعديل لما يتغيّر
  assert.match(form, /\{assignees\.canManage && \(\s*<div className="flex gap-4 text-sm" role="radiogroup"/)
  assert.match(form, /if \(!task \|\| !\(sameEmployee \|\| sameRole\)\) \{/)
  assert.match(form, /<EmployeePicker id="task-assignee" employees=\{assignees\.employees\}/)
})

test('TU-04: قايمة المهام والقايمة الجانبية والعناوين والإعدادين', () => {
  const page = read('src/app/tasks/page.tsx')
  for (const marker of ['data-tasks-admin', 'data-task-filters', 'data-task-list', 'data-export-tasks', 'data-tasks-unavailable']) assert.ok(page.includes(marker), marker)
  assert.match(page, /fetchTasks\(\{ status: overdue \? 'open' : status, overdue, assigneeEmployeeId: assignee \? Number\(assignee\) : undefined \}\)/)
  assert.match(page, /downloadCsv\(`tasks-\$\{overdue \? 'overdue-' : ''\}\$\{csvDateStamp\(\)\}\.csv`/)
  // فلتر «المسؤول» فيه مسؤولي المهام اللي اتحمّلت كمان: صاحب «عرض كل المهام» من غير «إدارة المهام» قايمة التكليف عنده فاضية
  assert.match(page, /<EmployeePicker id="tasks-assignee" employees=\{filterEmployees\}/)
  assert.match(page, /new Map<number, AssigneeOption>\(Object\.values\(seen\)\.map\(row => \[row\.id, row\]\)\)\s+for \(const row of assignees\?\.employees \?\? \[\]\) byId\.set\(row\.id, row\)/)
  // والقايمة بتقول لما توصل حدّها (التصدير بيطلّع المعروض)
  assert.match(page, /\{tasks\.length >= 500 \? ' \(أول 500\)' : ''\}/)
  const sidebar = read('src/components/layout/Sidebar.tsx')
  assert.match(sidebar, /\{ id: 'my-tasks', label: 'مهامي', icon: <ListChecks size=\{20\} \/>, href: '\/my\/tasks', badge: tasksCount \}/)
  assert.match(sidebar, /id: 'tasks',\s+label: 'المهام',\s+icon: <ListChecks size=\{20\} \/>,\s+href: '\/tasks',\s+perm: 'tasks\.view_all',/)
  assert.match(sidebar, /fetchMyTasksCount\(\)\s+\.then\(\(result\) => setTasksCount\(result\.open\)\)\s+\.catch\(\(\) => setTasksCount\(0\)\)\s+\}, \[pathname, tasksRevision\]\)/)
  // وبيتحدّث بعد أي تغيير في المهام من غير انتقال: الشاشتين بيعلنوا، والقايمة بتسمع
  assert.match(sidebar, /window\.addEventListener\(TASKS_CHANGED_EVENT, bump\)/)
  assert.match(read('src/app/my/tasks/page.tsx'), /notifyTasksChanged\(\)\s+void load\(\)/)
  assert.equal((read('src/app/tasks/page.tsx').match(/notifyTasksChanged\(\); void load\(\)/g) ?? []).length, 2)
  // العدّاد داخل في اعتماديات القايمة (من غيره الرقم بيتحمّل ومابيظهرش)
  // (B2.6-ب زوّد delegationEntry على نفس السطر: بند «بانتظار موافقتي» للمعتمد الهيكلي)
  assert.match(sidebar, /\}, \[currentUser, inboxCount, inboxError, delegationEntry, payrollApprovals, tasksCount, enabledModules\]\)/)
  assert.match(read('src/components/layout/MainLayout.tsx'), /\['\/tasks', 'tasks\.view_all'\],/)
  const { pageTitleFor } = require('../../src/components/layout/pageTitles')
  assert.deepEqual([pageTitleFor('/my/tasks'), pageTitleFor('/tasks')], ['مهامي', 'المهام'])
  // الموديول وصلاحيتيه ومهمته المجدولة في السجل، والصلاحيتين في كتالوج الصلاحيات
  const registry = require('../src/modules-registry/registry')
  const def = registry.MODULES.tasks
  assert.deepEqual([def.core, def.dependsOn, def.softUses, def.permissions, def.routes, def.jobs],
    [true, ['employees'], ['onboarding', 'offboarding'], ['tasks.manage', 'tasks.view_all'], ['/tasks', '/my/tasks'], ['tasks.reminders']])
  const permissions = require('../src/auth/permissions')
  for (const key of ['tasks.manage', 'tasks.view_all']) assert.ok(permissions.PERMISSIONS[key] && permissions.PERMISSION_DESCRIPTIONS[key], key)
  assert.deepEqual(permissions.PERMISSION_MODULES.find(group => group.key === 'tasks').permissions, ['tasks.manage', 'tasks.view_all'])
  const jobs = require('../src/scheduler/scheduled-jobs')
  assert.deepEqual([jobs.SCHEDULED_JOBS['tasks.reminders'].cron, jobs.SCHEDULED_JOBS['tasks.reminders'].module], ['30 7 * * *', 'tasks.reminders'])
  // الإعدادين: نفس المفاتيح والحدود في البذرة والخادم والشاشة
  const rules = require('../src/tasks/task-rules')
  assert.deepEqual([rules.TASKS_REMINDER_DAYS_KEY, rules.TASKS_REMINDER_DAYS_DEFAULT, rules.TASKS_ESCALATION_DAYS_KEY, rules.TASKS_ESCALATION_DAYS_DEFAULT, rules.TASKS_DAYS_MAX],
    ['tasks.reminder_days_before', 1, 'tasks.escalation_days_after', 3, 60])
  const seed = read('api/src/seed/requests-seed.data.ts')
  assert.match(seed, /\{ key: 'tasks\.reminder_days_before', value: '1' \},\s+\{ key: 'tasks\.escalation_days_after', value: '3' \},/)
  const policies = read('src/app/settings/policies/page.tsx')
  assert.match(policies, /\{ key: 'tasks\.reminder_days_before', label: 'تذكير المسؤول قبل الموعد', type: 'number', unit: 'يوم', min: 0, max: 60, integer: true,/)
  assert.match(policies, /\{ key: 'tasks\.escalation_days_after', label: 'تبليغ المدير بعد التأخير', type: 'number', unit: 'يوم', min: 0, max: 60, integer: true,/)
})
