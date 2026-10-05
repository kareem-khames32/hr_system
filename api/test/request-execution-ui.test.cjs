// B2.6 (أ): واجهة «مهمة تنفيذ بعد الاعتماد» — إعداد النوع في بانِي أنواع الطلبات، وكارت مهمة التنفيذ،
// وتقرير «معتمد ومااتنفذش» جوه لوحة الطلبات، وإجراء «اتنفّذ» في سجل الطلب. اختبارات نقية بلا قاعدة بيانات.
// Run (من api/): node --test test/request-execution-ui.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const root = path.join(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

test('RXU-01: إعداد النوع — نفس أدوار وتسميات محرك المهام، ونفس حد المهلة، وبيتبعت لما يتغيّر بس', () => {
  const page = read('src/app/settings/request-types/page.tsx')
  const rules = require('../src/tasks/task-rules')
  const { FUNCTIONAL_APPROVER_ROLES } = require('../src/requests/approver-resolver.service')
  const execution = require('../src/requests/execution-tasks')
  // الأدوار وتسمياتها من الخادم: أي دور يتضاف هناك لازم يظهر هنا بنفس اسمه
  const block = page.match(/const EXECUTION_ROLES: Array<\{ key: string; label: string \}> = \[([\s\S]*?)\n\]/)
  assert.ok(block, 'EXECUTION_ROLES')
  const roles = [...block[1].matchAll(/\{ key: '([^']+)', label: '([^']+)' \}/g)].map(match => [match[1], match[2]])
  assert.deepEqual(roles, FUNCTIONAL_APPROVER_ROLES.map(role => [role, rules.TASK_ROLE_LABELS[role]]))
  // صفحة Next ماينفعش تصدّر غير المكوّن
  assert.doesNotMatch(page, /export const EXECUTION_ROLES/)
  // حد المهلة هو حد الخادم، في الخانة وفي الفحص قبل الإرسال
  assert.equal(execution.EXECUTION_DAYS_MAX, 365)
  assert.match(page, /<input id="execution-days" type="number" min=\{1\} max=\{365\}/)
  assert.match(page, /if \(execution\.executionDays !== null && \(!Number\.isInteger\(execution\.executionDays\) \|\| execution\.executionDays < 1 \|\| execution\.executionDays > 365\)\) \{\s+setModalError\('مهلة مهمة التنفيذ من يوم لـ365 يوم'\)\s+return\s+\}/)
  // من غير دور = من غير مهمة: المهلة والإثبات بيتشالوا معاه (الخادم بيرفض مهلة أو إثبات من غير دور)
  assert.match(page, /executionRole: form\.executionRole \|\| null,\s+executionDays: form\.executionRole && form\.executionDays \? Number\(form\.executionDays\) : null,\s+executionProof: !!form\.executionRole && form\.executionProof,/)
  assert.match(page, /onChange=\{\(e\) => setForm\(\{ \.\.\.form, executionRole: e\.target\.value, \.\.\.\(e\.target\.value \? \{\} : \{ executionDays: '', executionProof: false \}\) \}\)\}/)
  // الإعداد بيتبعت في التعديل لما يتغيّر بس، وفي الإضافة لما يتحط دور — النوع اللي ماتلمسش بيتحفظ زي ما هو
  assert.match(page, /const executionChanged = !editing\s+\? execution\.executionRole !== null\s+: execution\.executionRole !== \(editing\.executionRole \?\? null\) \|\| execution\.executionDays !== \(editing\.executionDays \?\? null\)\s+\|\| execution\.executionProof !== \(editing\.executionProof === true\)/)
  assert.equal((page.match(/\.\.\.\(executionChanged \? execution : \{\}\),/g) ?? []).length, 2)
  // النموذج بيتملى من النوع المحفوظ
  assert.match(page, /executionRole: rt\.executionRole \?\? '',\s+executionDays: rt\.executionDays != null \? String\(rt\.executionDays\) : '',\s+executionProof: rt\.executionProof === true,/)
  // قبل ترحيل 089: الاختيار مقفول ومكتوب ليه (الخادم بيرفض الحفظ برسالته)
  assert.match(page, /const executionAvailable = !requestTypes\.some\(\(rt\) => rt\.executionAvailable === false\)/)
  assert.ok(page.includes("'الإعداد ده هيشتغل بعد تطبيق ترحيل 089 على السيرفر.'"))
  for (const marker of ['data-execution-task', 'data-type-execution']) assert.ok(page.includes(marker), marker)
  // مهمة التنفيذ لأنواع «سجل فقط» بس (الخادم بيرفض غيرها): الاختيار مقفول لوجهة بتنفّذ آليًا، وتغيير الوجهة ليها بيشيل الإعداد من النموذج
  assert.match(page, /const recordOnlyDestination = \(handler: string\) => handler === 'none'\s+\|\| \(!!editing && handler === \(editing\.destinationHandler \|\| 'none'\) && editing\.executionMode === 'RECORD_ONLY'\)/)
  assert.match(page, /disabled=\{!executionAvailable \|\| !recordOnlyDestination\(form\.destinationHandler\)\} value=\{form\.executionRole\}/)
  assert.match(page, /setForm\(\{ \.\.\.form, destinationHandler: e\.target\.value,\s+\.\.\.\(recordOnlyDestination\(e\.target\.value\) \? \{\} : \{ executionRole: '', executionDays: '', executionProof: false \}\) \}\)/)
  assert.ok(page.includes("'مهمة التنفيذ لأنواع «سجل فقط» بس — الوجهة دي بتنفّذ آليًا بعد الاعتماد.'"))
  assert.match(require('../src/requests/execution-tasks').EXECUTION_RECORD_ONLY_REQUIRED, /«تسجيل فقط» بس/)
  // كارت النوع بيعرض الدور والمهلة والإثبات
  assert.match(page, /\{rt\.executionRole && \(\s+<div className="flex items-center gap-3 text-sm" data-type-execution>/)
  // العميل والخادم على نفس الحقول
  const api = read('src/lib/api.ts')
  assert.match(api, /executionRole\?: string \| null\s+executionDays\?: number \| null\s+executionProof\?: boolean\s+executionAvailable\?: boolean/)
  assert.match(api, /executionRole\?: string \| null; executionDays\?: number \| null; executionProof\?: boolean\s+\}\) => post<ApiRequestType>\('\/settings\/request-types', d\)/)
  const controller = read('api/src/settings/settings.controller.ts')
  assert.match(controller, /executionAvailable: available \}\)\)/)
  assert.equal((controller.match(/await resolveExecutionSetting\(/g) ?? []).length, 2)
  assert.equal((controller.match(/await writeExecutionSetting\(/g) ?? []).length, 2)
})

test('RXU-02: كارت مهمة التنفيذ — مكتوب إنها بتكمّل الطلب، ولينك الطلب، ومن غير أزرار الإدارة', () => {
  const card = read('src/components/tasks/TaskCard.tsx')
  assert.match(card, /\{task\.execution && <span>مهمة تنفيذ طلب معتمد — إقفالها بيكمّل الطلب<\/span>\}/)
  // اللينك للي الخادم رجّعله رقم الطلب بس (اللي يقدر يفتحه)، وبيفتح تفاصيله في صندوق الموافقات
  assert.match(card, /\{task\.requestId && <a href=\{`\/approvals-inbox\?request=\$\{task\.requestId\}`\} className="text-primary-600 underline" data-task-request>افتح الطلب<\/a>\}/)
  assert.match(read('src/app/approvals-inbox/page.tsx'), /const requestId = Number\(new URLSearchParams\(window\.location\.search\)\.get\('request'\)\)\s+if \(Number\.isSafeInteger\(requestId\) && requestId > 0\) setDetailId\(requestId\)/)
  // أزرار الإدارة (تعديل، إلغاء، افتحها تاني) كلها من canManage — والخادم بيرجّعه false لمهمة التنفيذ، فمابتظهرش
  assert.match(card, /\{open && task\.canManage && onEdit && <button/)
  assert.match(card, /\{open && task\.canManage && <button type="button" className="btn-secondary" disabled=\{busy\} onClick=\{\(\) => setPanel\('cancel'\)\}>/)
  assert.match(card, /\{!open && task\.canManage && <button type="button" className="btn-secondary" disabled=\{busy\} onClick=\{\(\) => setPanel\('reopen'\)\}>/)
  // والإقفال بإثبات فاضل زي أي مهمة
  assert.match(card, /\{open && \(task\.canWork \|\| task\.canManage\) && <button type="button" className="btn-primary" disabled=\{busy\} onClick=\{\(\) => setPanel\('done'\)\}>خلصت<\/button>\}/)
  const types = read('src/lib/tasks-api.ts')
  assert.match(types, /execution: boolean\s+\/\*\*[^\n]*\*\/\s+requestId: number \| null\s+\}/)
  // واللي بيقفل بيتقاله إن اللي بيكتبه بيتكتب في سجل الطلب وصاحبه بيشوفه
  assert.ok(card.includes("${task.execution ? ' — بيتكتب في سجل الطلب وصاحبه بيشوفه' : ''}"))
  // الخادم: مهمة التنفيذ من غير إدارة، وشغلها للي هي عليه أو مدير النظام (مش صاحب الطلب)، وتفاصيلها للي يقدر يفتح الطلب بس
  const service = read('api/src/tasks/tasks.service.ts')
  assert.match(service, /const works = link \? !executionOwnRequest\(user, link, hrOverride\) && \(mine \|\| unblocks\) : mine/)
  assert.match(service, /const party = !link \|\| \(open \? mine \|\| unblocks : task\.closedByUserId === user\.sub\)/)
  assert.match(service, /canWork: open && works, canManage: canManage && !link,\s+execution: !!link, requestId: link && party \? link\.requestId : null,/)
  const execution = require('../src/requests/execution-tasks')
  for (const name of ['EXECUTION_TASK_CANCEL_BLOCKED', 'EXECUTION_TASK_REOPEN_BLOCKED', 'EXECUTION_TASK_EDIT_BLOCKED', 'EXECUTION_TASK_CLOSE_BLOCKED', 'EXECUTION_TASK_OWN_BLOCKED']) assert.equal(typeof execution[name], 'string', name)
  // نفس قاعدة «محدش يعتمد طلبه»: صاحبه، أو منشئه من غير مخرج الموارد البشرية
  assert.deepEqual([execution.executionOwnRequest({ sub: 5, employeeId: 9 }, { requesterId: 9, createdByUserId: 1 }, false),
    execution.executionOwnRequest({ sub: 5, employeeId: 9 }, { requesterId: 8, createdByUserId: 5 }, false), execution.executionOwnRequest({ sub: 5, employeeId: 9 }, { requesterId: 8, createdByUserId: 5 }, true),
    execution.executionOwnRequest({ sub: 5, employeeId: null }, { requesterId: 8, createdByUserId: 1 }, false), execution.executionOwnRequest({ sub: 5, employeeId: null }, { requesterId: null, createdByUserId: null }, false)],
    [true, true, false, false, false])
})

test('RXU-03: تقرير «معتمد ومااتنفذش» — فلتر من الخادم جوه لوحة الطلبات، بمسؤول التنفيذ وعمر الاعتماد في الجدول والتصدير', () => {
  const page = read('src/app/requests-console/page.tsx')
  const api = read('src/lib/api.ts')
  // الفلتر بيتبعت للخادم (القايمة مش من آخر 500 طلب وخلاص)، وتغييره بيعيد التحميل
  assert.match(api, /export const fetchAllRequests = \(q\?: \{ status\?: string; typeCode\?: string; execution\?: 'pending' \}\) => \{/)
  assert.match(api, /if \(q\?\.execution\) p\.set\('execution', q\.execution\)/)
  assert.match(page, /fetchAllRequests\(pendingExecution \? \{ execution: 'pending' \} : undefined\),/)
  assert.match(page, /load\(\)\s+\}, \[pendingExecution\]\)/)
  assert.match(page, /<label className="flex items-center gap-2 text-sm text-gray-700" data-pending-execution>\s+<input type="checkbox" checked=\{pendingExecution\} onChange=\{\(e\) => \{ setLoading\(true\); setPendingExecution\(e\.target\.checked\) \}\} \/>\s+معتمد ومااتنفذش/)
  const controller = read('api/src/requests/requests.controller.ts')
  assert.match(controller, /@Query\('execution'\) execution\?: string/)
  assert.match(controller, /return this\.service\.listAll\(user, \{ status, typeCode, execution \}\)/)
  const service = read('api/src/requests/requests.service.ts')
  assert.match(service, /if \(filters\.execution === 'pending'\) where\.status = In\(\['APPROVED', 'IN_EXECUTION'\]\)/)
  // «الخطوة الحالية»: مين مسؤول التنفيذ وموعد مهمته ومتأخرة ولا لأ
  assert.match(page, /if \(r\.executionTask\) \{\s+const task = r\.executionTask\s+return `مهمة تنفيذ على \$\{task\.assignee \?\? '—'\}\$\{task\.dueDate \? ` — موعدها \$\{task\.dueDate\}` : ''\}\$\{task\.overdue \? ' \(متأخرة\)' : ''\}`\s+\}/)
  // عمر الاعتماد بالأيام للي لسه مااكتملش بس
  assert.match(page, /approvedDays: \['APPROVED', 'IN_EXECUTION'\]\.includes\(r\.status\) \? approvedDays\(r\.approvedAt\) : null,/)
  assert.match(page, /\{req\.approvedDays !== null && <span className="block text-xs text-gray-400">معتمد من \{req\.approvedDays\} يوم<\/span>\}/)
  assert.match(page, /'مرجع التنفيذ', 'معتمد من \(يوم\)'\],/)
  assert.match(page, /r\.currentStep, r\.destinationRecord, r\.approvedDays \?\? ''\]\)\)\}/)
  assert.match(api, /approvedAt\?: string \| null\s+executionTask\?: \{ id: number; assignee: string \| null; status: string; dueDate: string \| null; overdue: boolean \} \| null/)
  // رفض التنفيذ من لوحة الطلبات (رسالة منع الإلغاء في شاشة المهام بتوجّه لهنا): لمسؤول الإعدادات، لطلب مهمته لسه مفتوحة، بسبب
  assert.match(page, /const canRejectExecution = !!detail && can\('settings\.manage'\) && !detail\.confidentialMasked && detail\.status === 'IN_EXECUTION'\s+&& requests\.some\(row => row\.id === detail\.id && row\.executionTaskOpen\)/)
  assert.match(page, /executionTaskOpen: !!r\.executionTask && \['OPEN', 'IN_PROGRESS', 'WAITING'\]\.includes\(r\.executionTask\.status\),/)
  assert.match(page, /const result = await rejectFailedRequestExecution\(target\.id, reason\)/)
  assert.match(page, /\{canRejectExecution && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3" data-reject-execution>/)
  assert.match(page, /disabled=\{executionCancelling \|\| executionCancelReason\.trim\(\)\.length < 3\} onClick=\{rejectExecution\}/)
  assert.match(api, /export const rejectFailedRequestExecution = \(id: number, comment: string\) =>\s+post<ApiRequest>\(`\/requests\/\$\{id\}\/reject-execution`, \{ comment \}\)/)
  assert.match(require('../src/requests/execution-tasks').EXECUTION_TASK_CANCEL_BLOCKED, /«لوحة الطلبات»/)
})

test('RXU-04: إجراء «اتنفّذ» — في سجل الطلب بالتلات شاشات، وفي إشعار صاحب الطلب', () => {
  // قيمة الإجراء في الخادم، وتسميتها في كل شاشة بتعرض سجل الطلب (من غيرها بيظهر الكود الخام)
  const { normalizeApprovalAction } = require('../src/requests/approval-actions')
  assert.equal(normalizeApprovalAction('EXECUTED'), 'EXECUTED')
  assert.match(read('src/app/requests-console/page.tsx'), /EXECUTION_FAILED: 'تعذّر تنفيذه المجدول',\s+EXECUTED: 'نفّذ الطلب',/)
  assert.match(read('src/app/requests/page.tsx'), /EXECUTION_FAILED: 'تعذّر التنفيذ المجدول', EXECUTED: 'تنفيذ الطلب' \} as Record<string, string>\)/)
  const portal = read('api/src/assets/portal.controller.ts')
  assert.match(portal, /EXECUTED: 'تم تنفيذ',/)
  // وإشعاره في البوابة «نجاح» مش «تحذير»
  assert.match(portal, /kind: \['APPROVE', 'APPROVED', 'EXECUTED'\]\.includes\(a\.action\) \? 'success' :/)
  // الحدث في صندوق الأحداث والإشعار بنفس الاسم
  const { DOMAIN_EVENTS } = require('../src/queue/outbox')
  assert.equal(DOMAIN_EVENTS.REQUEST_EXECUTED, 'الطلب اتنفّذ')
  const notifications = read('api/src/notifications/notifications.service.ts')
  assert.match(notifications, /REQUEST_EXECUTED: \{ text: 'طلبك اتنفّذ', kind: 'success' \},/)
  assert.match(notifications, /case 'REQUEST_EXECUTED':/)
})
