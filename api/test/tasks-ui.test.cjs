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
    "apiFetch<ApiTask>(`/tasks/${id}/status`, json('POST', input))", "(`/tasks${query ? `?${query}` : ''}`)",
    // إضافة المالك 6 أكتوبر: التمديد وقراره، والتقييم، وتقرير الالتزام
    "apiFetch<ApiTask>(`/tasks/${id}/extension`, json('POST', input))", "apiFetch<ApiTask>(`/tasks/${id}/extension/decision`, json('POST', input))",
    "apiFetch<ApiTask>(`/tasks/${id}/rating`, json('POST', input))", "apiFetch<ApiTaskLog>(`/tasks/${id}/log`)", "apiFetch<ApiTaskReport>(`/tasks/report?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)"]) assert.ok(api.includes(call), call)
  const controller = read('api/src/tasks/tasks.controller.ts')
  assert.match(controller, /@RequireModule\('tasks'\)\s+@UseGuards\(JwtAuthGuard, RolesGuard\)\s+@Controller\('tasks'\)/)
  // المسارات الثابتة قبل :id (وإلا «mine» و«team» يتقروا رقم مهمة)
  const order = ["@Get('mine')", "@Get('mine/count')", "@Get('team')", "@Get('assignees')", '@Get()', "@Get('report')", '@Post()', "@Get(':id')", "@Get(':id/log')", "@Patch(':id')", "@Post(':id/status')",
    "@Post(':id/extension')", "@Post(':id/extension/decision')", "@Post(':id/rating')"].map(route => controller.indexOf(route))
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
  // B3.11-ب: + تصنيف مرفق القضية بعد «مهمة»
  assert.match(files, /'leave_attachment', 'task', 'case'\]\.includes\(entityType\)/)
  assert.match(files, /else if \(f\.entityType === 'task'\) \{[\s\S]{0,260}await assertTaskFileAccess\(this\.ds\.manager, user, f\)/)
  const form = read('src/components/tasks/TaskFormModal.tsx')
  // مهمة الدور لصاحب «إدارة المهام» بس، والمسؤول بيتبعت في التعديل لما يتغيّر
  // B-ADD.1: الاختيار بيظهر كمان للي يقدر يعمل مهمة جماعية؛ و«دور» لسه لصاحب «إدارة المهام» بس
  assert.match(form, /\{\(assignees\.canManage \|\| canGroup\) && \(\s*<div className="flex gap-4 flex-wrap text-sm" role="radiogroup"/)
  assert.match(form, /\{assignees\.canManage && <label className="flex items-center gap-2"><input type="radio" name="task-target" checked=\{target === 'role'\}/)
  assert.match(form, /const canGroup = !task && !!assignees\.canAssignGroup/)
  assert.match(form, /if \(!task \|\| !\(sameEmployee \|\| sameRole\)\) \{/)
  assert.match(form, /<EmployeePicker id="task-assignee" employees=\{options\}/)
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
  assert.match(sidebar, /\{ label: 'مهامي', href: '\/my\/tasks', badge: 'tasks' \},/)
  assert.match(sidebar, /const badges: Record<MenuBadge, number> = \{ inbox: inboxCount, payrollApprovals, tasks: tasksCount \}/)
  assert.match(sidebar, /id: 'tasks',\s+label: 'المهام',\s+icon: <ListChecks size=\{20\} \/>,\s+children: \[\s+\{ label: 'مهامي', href: '\/my\/tasks', badge: 'tasks' \},\s+\{ label: 'المهام', href: '\/tasks', perm: 'tasks\.view_all' \},\s+\],/)
  assert.match(sidebar, /fetchMyTasksCount\(\)\s+\.then\(\(result\) => setTasksCount\(result\.open\)\)\s+\.catch\(\(\) => setTasksCount\(0\)\)\s+\}, \[pathname, tasksRevision\]\)/)
  // وبيتحدّث بعد أي تغيير في المهام من غير انتقال: الشاشتين بيعلنوا، والقايمة بتسمع
  assert.match(sidebar, /window\.addEventListener\(TASKS_CHANGED_EVENT, bump\)/)
  assert.match(read('src/app/my/tasks/page.tsx'), /notifyTasksChanged\(\)\s+void load\(\)/)
  // B-ADD.1: ومعاهم بعد المهمة الجماعية
  assert.equal((read('src/app/tasks/page.tsx').match(/notifyTasksChanged\(\); void load\(\)/g) ?? []).length, 3)
  // العدّاد داخل في اعتماديات القايمة (من غيره الرقم بيتحمّل ومابيظهرش)
  // (B2.6-ب زوّد delegationEntry على نفس السطر: بند «بانتظار موافقتي» للمعتمد الهيكلي)
  assert.match(sidebar, /\}, \[currentUser, inboxCount, inboxError, delegationEntry, payrollApprovals, tasksCount, teamManager, raisesOpen, enabledModules\]\)/)
  assert.match(read('src/components/layout/MainLayout.tsx'), /\['\/tasks', 'tasks\.view_all'\],/)
  const { pageTitleFor } = require('../../src/components/layout/pageTitles')
  assert.deepEqual([pageTitleFor('/my/tasks'), pageTitleFor('/tasks')], ['مهامي', 'المهام'])
  // الموديول وصلاحيتيه ومهمته المجدولة في السجل، والصلاحيتين في كتالوج الصلاحيات
  const registry = require('../src/modules-registry/registry')
  const def = registry.MODULES.tasks
  assert.deepEqual([def.core, def.dependsOn, def.softUses, def.permissions, def.routes, def.jobs],
    [true, ['employees'], ['onboarding', 'offboarding'], ['tasks.manage', 'tasks.view_all', 'tasks.assign_any'], ['/tasks', '/my/tasks'], ['tasks.reminders', 'privacy.retention-alerts']])
  // إضافة المالك: ميزة التقييم فرعية ومقفولة لحد ما الشركة تفتحها
  assert.deepEqual(Object.keys(def.features), ['tasks.rating'])
  assert.deepEqual([def.features['tasks.rating'].default, registry.featureEnabled({ modules: {}, features: {} }, 'tasks.rating')], [false, false])
  const permissions = require('../src/auth/permissions')
  for (const key of ['tasks.manage', 'tasks.view_all', 'tasks.assign_any']) assert.ok(permissions.PERMISSIONS[key] && permissions.PERMISSION_DESCRIPTIONS[key], key)
  assert.deepEqual(permissions.PERMISSION_MODULES.find(group => group.key === 'tasks').permissions, ['tasks.manage', 'tasks.view_all', 'tasks.assign_any'])
  // «تكليف أي موظف» مش في أي دور جاهز (بتتدّى لدور زي مدير مشروع)
  for (const [role, preset] of Object.entries(permissions.ROLE_PRESETS)) assert.equal((preset.permissions ?? preset).includes('tasks.assign_any'), false, role)
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

test('TU-05: قواعد المالك في الشاشات — الأزرار من حكم الخادم (تمديد، رد، «مش بتاعتي»، رجوع، تقييم)، والمهمة الشخصية وعلامة التقييم في النموذج، وتقرير الالتزام وسجل المهمة', () => {
  const card = read('src/components/tasks/TaskCard.tsx')
  // كل زرار بعلم الخادم بتاعه
  assert.match(card, /\{task\.canRate && <button type="button" className="btn-primary" disabled=\{busy\} onClick=\{\(\) => setPanel\('rate'\)\} data-task-rate>/)
  assert.match(card, /\{task\.canRequestExtension && <button type="button" className="btn-secondary" disabled=\{busy\} onClick=\{\(\) => setPanel\('extend'\)\} data-task-extend>/)
  assert.match(card, /\{task\.canNotMine && <button type="button" className="btn-secondary" disabled=\{busy\} onClick=\{\(\) => setPanel\('notMine'\)\} data-task-not-mine>/)
  assert.match(card, /\{task\.canDecideExtension && !panel && \(/)
  // الموافقة على التمديد مباشرة، والرفض بخانة سبب اختياري
  assert.match(card, /onClick=\{\(\) => void act\(\(\) => decideTaskExtension\(task\.id, \{ approve: true \}\), 'تعذر الرد على طلب التمديد'\)\}>وافق<\/button>/)
  assert.match(card, /if \(panel === 'decline'\) return act\(\(\) => decideTaskExtension\(task\.id, \{ approve: false, \.\.\.\(text \? \{ note: text \} : \{\}\) \}\), 'تعذر الرد على طلب التمديد'\)/)
  // طلب التمديد بموعد وسبب، و«مش بتاعتي» تعليق بعلامته، والتقييم من 1 لـ5
  assert.match(card, /if \(!extendTo\) \{ setError\('اختار الموعد المطلوب'\); return \}\s+if \(text\.length < 3\) \{ setError\('اكتب سبب طلب التمديد'\); return \}\s+return act\(\(\) => requestTaskExtension\(task\.id, \{ dueDate: extendTo, reason: text \}\), 'تعذر إرسال طلب التمديد'\)/)
  assert.match(card, /if \(!text\) \{ setError\('اكتب ليه المهمة مش بتاعتك'\); return \}\s+return act\(async \(\) => \{ await addComment\('tasks', task\.id, \{ body: text, notMine: true \}\)/)
  assert.match(card, /if \(stars < 1\) \{ setError\('اختار التقييم من 1 لـ5'\); return \}\s+return act\(\(\) => rateTask\(task\.id, \{ rating: stars, \.\.\.\(text \? \{ note: text \} : \{\}\) \}\), 'تعذر حفظ التقييم'\)/)
  // اللي ظاهر على الكارت: شخصية، تحتاج تقييم، الالتزام، مرات الرجوع، التقييم، طلب التمديد
  for (const marker of ['data-task-personal', 'data-task-needs-rating', 'data-task-compliance', 'data-task-returns', 'data-task-rating', 'data-task-extension', 'data-task-stars']) assert.ok(card.includes(marker), marker)
  assert.match(card, /\{task\.personal && <span className="badge bg-gray-100 text-gray-700" data-task-personal>شخصية<\/span>\}/)
  assert.match(card, /\{task\.needsRating && task\.rating == null && <span className="badge bg-primary-50 text-primary-700" data-task-needs-rating>تحتاج تقييم<\/span>\}/)
  assert.match(card, /\{task\.complianceLabel && <span className=\{task\.compliance\?\.onTime \? 'text-success-700' : 'text-red-700 font-medium'\} data-task-compliance>\{task\.complianceLabel\}<\/span>\}/)
  assert.match(card, /\{task\.returnCount > 0 && <span className="text-warning-700" data-task-returns>/)
  assert.match(card, /\{task\.rating != null && \(\s+<div className="[^"]+" data-task-rating>/)
  assert.match(card, /\{task\.extension && \(\s+<div className="[^"]+" data-task-extension>/)
  // الحوار (وسجل المهمة جوّاه) بيتحمّل تاني بعد أي تغيير على المهمة
  assert.match(card, /<Fragment key=\{said\}>\s+\{talk && <div className="mt-2"><CommentsThread kind="tasks" id=\{task\.id\} \/><\/div>\}\s+<\/Fragment>/)
  // سجل المهمة: قسم لوحده برّه الحوار، مش لمهمة تنفيذ طلب ولا إقرار مستند، وبيتحمّل تاني بعد أي تغيير على المهمة
  assert.match(card, /\{!task\.execution && !task\.documentAck && \(\s+<div className="mt-2" data-task-history>/)
  assert.match(card, /\{history && <div className="mt-2"><TaskLog key=\{logKey\} id=\{task\.id\} \/><\/div>\}/)
  assert.match(card, /const logKey = \[task\.status, task\.dueDate, task\.assigneeEmployeeId, task\.assigneeRole, task\.returnCount, task\.rating, task\.extension\?\.dueDate, task\.statusNote\]\.join\('\|'\)/)
  const log = read('src/components/tasks/TaskLog.tsx')
  assert.match(log, /fetchTaskLog\(id\)/)
  assert.match(log, /<li key=\{index\} className="[^"]+" data-task-log-line=\{line\.event\}>\s+<span className="badge bg-gray-100 text-gray-700">\{line\.label\}<\/span>\s+<span className="text-gray-700 break-words">\{line\.body\}<\/span>/)
  assert.match(log, /\{line\.mine \? 'أنت' : line\.by \?\? 'حساب'\} · \{formatDateTime\(line\.at\)\}/)
  // رجوع «خلصت» للتعديل بسببه (غير إعادة فتح الملغية)، والمهمة اللي اتقيّمت مالهاش زرار رجوع
  assert.match(card, /if \(panel === 'reopen' && task\.status === 'DONE' && !text\) \{ setError\('اكتب سبب رجوع المهمة للتعديل'\); return \}/)
  assert.match(card, /\{task\.rating == null && <>\{!open && task\.canManage && <button type="button" className="btn-secondary" disabled=\{busy\} onClick=\{\(\) => setPanel\('reopen'\)\}><RotateCcw size=\{14\} className="inline me-1" \/>\{task\.status === 'DONE' \? 'رجّعها للتعديل' : 'افتحها تاني'\}<\/button>\}<\/>\}/)

  const form = read('src/components/tasks/TaskFormModal.tsx')
  // «نفسي» في القايمة بمسمّاها، وتلميح المهمة الشخصية، وتلميح «اعمل طلب» للي من غير «إدارة المهام»
  assert.match(form, /const options = assignees\.employees\.map\(row => row\.self \? \{ \.\.\.row, fullName: `\$\{row\.fullName\} — نفسي \(مهمة شخصية\)` \} : row\)/)
  assert.match(form, /\{self && <p className="text-xs text-gray-500 mt-1" data-task-personal-hint>مهمة شخصية: بتظهر لك ولمديرك المباشر بس\.<\/p>\}/)
  assert.match(form, /\{!assignees\.canManage && \(\s+<p className="text-xs text-gray-500 mt-1" data-task-outside-hint>\s+تقدر تكلّف نفسك وأي حد تحتك في الهيكل\. حد مش في فريقك؟ <a href="\/requests" className="text-primary-600 underline">اعمل طلب<\/a>، ولما يتعتمد هيتحوّل مهمة\./)
  // علامة «تحتاج تقييم»: الميزة مفتوحة، والمهمة على موظف غير اللي بيكلّف — وبتتبعت لما الميزة مفتوحة بس
  assert.match(form, /const canFlagRating = !!assignees\.ratingEnabled && \(target === 'group' \|\| \(target === 'employee' && !self\)\)/)
  assert.match(form, /\{canFlagRating && \(\s+<label className="flex items-center gap-2 text-sm text-gray-700" data-task-needs-rating>/)
  assert.match(form, /\.\.\.\(assignees\.ratingEnabled \? \{ needsRating: canFlagRating && needsRating \} : \{\}\) \}/)

  // تقرير الالتزام: بيختفي لو مش متاح (قبل الترحيل)، وعمود التقييم مع الميزة بس، وفي الشاشتين
  const report = read('src/components/tasks/TaskComplianceReport.tsx')
  assert.match(report, /if \(report && !report\.available\) return null/)
  assert.match(report, /setReport\(await fetchTaskReport\(from, to\)\)/)
  // وبيتحمّل تاني بعد أي تغيير في المهام من نفس الشاشة (نفس إشارة عدّاد القايمة)
  assert.match(report, /window\.addEventListener\(TASKS_CHANGED_EVENT, again\)\s+return \(\) => window\.removeEventListener\(TASKS_CHANGED_EVENT, again\)/)
  assert.match(report, /\{report\.ratingEnabled && <th className="py-2 px-2 font-medium">متوسط التقييم<\/th>\}/)
  assert.match(report, /\{report\.ratingEnabled && <td className="py-2 px-2">\{row\.ratingAverage != null \? `\$\{row\.ratingAverage\} من 5 \(\$\{row\.rated\}\)` : '—'\}<\/td>\}/)
  for (const marker of ['data-task-report', 'data-task-report-row']) assert.ok(report.includes(marker), marker)
  assert.match(read('src/app/tasks/page.tsx'), /\{available && <TaskComplianceReport \/>\}/)
  assert.match(read('src/app/my/tasks/page.tsx'), /<\/div>\s+<TaskComplianceReport \/>\s+<\/>/)

  // «مش بتاعتي» في الحوار بعلامته جنب اسم كاتبه
  const thread = read('src/components/comments/CommentsThread.tsx')
  assert.match(thread, /\{comment\.eventLabel && <span className="badge bg-gray-100 text-gray-700 ms-2" data-comment-event-label>\{comment\.eventLabel\}<\/span>\}/)
  // والمسمّيات من الخادم نفسه (مفيش نسخة تانية في الواجهة)، ونص المالك بالحرف
  const extras = require('../src/tasks/task-extras')
  assert.deepEqual(Object.keys(extras.TASK_LOG_EVENTS), ['ASSIGNED', 'REASSIGNED', 'DUE_CHANGED', 'EDITED', 'STARTED', 'WAITING', 'DONE', 'CANCELLED', 'REOPENED', 'RETURNED', 'EXTENSION_REQUESTED',
    // B-ADD.19: +2 (مرفقات المهمة)
    'EXTENSION_APPROVED', 'EXTENSION_REJECTED', 'RATED', 'ATTACHED', 'ATTACHMENT_REMOVED'])
  assert.deepEqual([extras.TASK_OUTSIDE_TEAM, extras.TASK_NOT_MINE_LABEL, extras.TASK_RATING_FEATURE], ['الموظف ده مش في فريقك. اعمل طلب، ولما يتعتمد هيتحوّل مهمة', 'مش بتاعتي', 'tasks.rating'])
})
