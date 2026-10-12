// B5.7 — السلامة وإصابات العمل: قواعد البلاغ والمراجعة والإجراء وخطوات الحالة، ومصدر الكود (قفل صف الحادث والحكم بعده، المهام من محرك المهام، الحجب بفرع الموظف) والواجهة.
// حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/safety/safety')
const registry = require('../src/modules-registry/registry')
const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
const web = rel => fs.readFileSync(path.join(apiRoot, '..', 'src', rel), 'utf8').replace(/\r\n/g, '\n')
const TODAY = '2026-10-10'

test('SFU-01: البلاغ — النوع والتاريخ (مش في المستقبل ولا أقدم من 30 يوم ويوم حقيقي) والمكان والوصف، والمصاب الافتراضي حسب النوع', () => {
  const good = { kind: 'INJURY', occurredOn: TODAY, location: ' مخزن   2 ', description: 'وقع صندوق على رجل العامل' }
  const issue = body => rules.reportFields(body, TODAY).error
  assert.deepEqual(rules.reportFields(good, TODAY).fields, { kind: 'INJURY', occurredOn: TODAY, location: 'مخزن 2', description: 'وقع صندوق على رجل العامل', injured: 'SELF', injuredNote: null })
  assert.deepEqual(rules.reportFields({ ...good, kind: 'HAZARD' }, TODAY).fields.injured, 'NONE')
  assert.deepEqual(rules.reportFields({ ...good, injured: 'OTHER', injuredNote: ' عامل  مقاول ' }, TODAY).fields.injuredNote, 'عامل مقاول')
  // الاسم المكتوب بيتشال لو المصاب مش «حد تاني»
  assert.equal(rules.reportFields({ ...good, injured: 'SELF', injuredNote: 'اسم' }, TODAY).fields.injuredNote, null)
  assert.deepEqual([issue(null), issue({ ...good, kind: 'injury' }), issue({ ...good, occurredOn: '2026-13-01' }), issue({ ...good, occurredOn: '2026-02-30' }), issue({ ...good, occurredOn: '2026-10-11' }),
    issue({ ...good, occurredOn: '2026-09-09' }), issue({ ...good, occurredOn: '2026-09-10' }), issue({ ...good, location: 5 }), issue({ ...good, location: 'x'.repeat(201) }), issue({ ...good, description: 'x'.repeat(1001) }),
    issue({ ...good, injured: 'NONE' }), issue({ ...good, injured: 'OTHER', injuredNote: 'x'.repeat(121) })],
  ['اختار نوع الحادث', 'اختار نوع الحادث', 'تاريخ الحادث مطلوب', 'تاريخ الحادث مطلوب', 'تاريخ الحادث في المستقبل', 'البلاغ لحادث في آخر 30 يوم', null, 'اكتب مكان الحادث (لحد 200 حرف)', 'اكتب مكان الحادث (لحد 200 حرف)',
    'اكتب وصف الحادث (من 10 حروف لحد 1000)', 'بلاغ الإصابة محتاج مصاب', 'اسم المصاب 120 حرف بالكتير'])
  assert.deepEqual([rules.REPORT_DAYS_BACK, rules.REPORTS_PER_DAY, rules.ACTIONS_MAX, rules.incidentCode(7), rules.incidentCode(123456)], [30, 5, 20, 'SAF-00007', 'SAF-123456'])
})

test('SFU-02: المراجعة والإجراء والموعد وخطوات الحالة', () => {
  assert.deepEqual(rules.reviewFields({}).fields, { severity: null, injuredEmployeeId: null, lostDays: null, rootCause: null })
  assert.deepEqual(rules.reviewFields({ severity: 'SERIOUS', injuredEmployeeId: 4, lostDays: 0, rootCause: '  سبب   واضح ' }).fields, { severity: 'SERIOUS', injuredEmployeeId: 4, lostDays: 0, rootCause: 'سبب واضح' })
  assert.deepEqual([rules.reviewFields({ severity: 'serious' }).error, rules.reviewFields({ injuredEmployeeId: 0 }).error, rules.reviewFields({ injuredEmployeeId: '4' }).error, rules.reviewFields({ lostDays: '3' }).error,
    rules.reviewFields({ lostDays: 3651 }).error, rules.reviewFields({ rootCause: 'x'.repeat(1001) }).error, rules.reviewFields({ rootCause: 7 }).error],
  ['الشدة: بسيطة، متوسطة، أو جسيمة', 'المصاب مش صحيح', 'المصاب مش صحيح', 'الأيام المفقودة رقم صحيح من صفر', 'الأيام المفقودة رقم صحيح من صفر', 'السبب 1000 حرف بالكتير', 'السبب 1000 حرف بالكتير'])
  const action = { title: ' تركيب  حاجز ', assigneeEmployeeId: 9, dueDate: TODAY }
  assert.deepEqual(rules.actionFields(action, TODAY).fields, { title: 'تركيب حاجز', assigneeEmployeeId: 9, dueDate: TODAY })
  assert.deepEqual([rules.actionFields({ ...action, title: 'x'.repeat(151) }, TODAY).error, rules.actionFields({ ...action, assigneeEmployeeId: '9' }, TODAY).error, rules.actionFields({ ...action, dueDate: '2026-10-09' }, TODAY).error],
    ['اكتب الإجراء (من 3 حروف لحد 150)', 'اختار المسؤول عن الإجراء', 'موعد الإجراء تاريخ من النهارده'])
  assert.deepEqual([rules.dueDateOf({ dueDate: TODAY }, TODAY), rules.dueDateOf({ dueDate: '2026-10-09' }, TODAY), rules.dueDateOf({ dueDate: '2026-13-01' }, TODAY), rules.dueDateOf(null, TODAY)], [TODAY, null, null, null])
  assert.deepEqual(rules.NEXT_STATUS, { REPORTED: ['INVESTIGATING'], INVESTIGATING: ['CLOSED'], CLOSED: ['INVESTIGATING'] })
  assert.deepEqual([Object.keys(rules.INCIDENT_KIND_LABELS), Object.keys(rules.INCIDENT_SEVERITY_LABELS), Object.keys(rules.INCIDENT_STATUS_LABELS)], [[...rules.INCIDENT_KINDS], [...rules.INCIDENT_SEVERITIES], [...rules.INCIDENT_STATUSES]])
})

test('SFU-03: سجل الموديولات — موديول safety مقفول افتراضيًا في الباقة الكاملة بصلاحيته ومساريه', () => {
  const def = registry.MODULES.safety
  assert.deepEqual([def.defaultEnabled, def.preset, def.group, def.dependsOn, def.permissions, def.routes], [false, 'full', 'people', ['employees'], ['safety.manage'], ['/safety', '/my/safety']])
  assert.deepEqual([registry.routeOwner('/safety').module, registry.routeOwner('/my/safety').module], ['safety', 'safety'])
})

test('SFU-04: مصدر الكود — كل كتابة تحت قفل صف الحادث والحكم على النطاق بعده، المهام من محرك المهام بحدث التكليف، والحجب بفرع الموظف الحالي', () => {
  const service = read('safety/safety.service.ts'), controller = read('safety/safety.controller.ts')
  // قفل صف الحادث ثم النطاق: «مش موجود» للاتنين
  assert.match(service, /findOne\(\{ where: \{ id \}, lock: \{ mode: 'pessimistic_write' \} \}\)\n\s+if \(!row \|\| !inBranchScope\(branchScopeOf\(user\), row\.branchId\)\) throw new NotFoundException\(INCIDENT_NOT_FOUND\)/)
  for (const method of ['review', 'setStatus', 'addAction', 'openAuthorityTask', 'linkLeave']) {
    const body = service.slice(service.indexOf(`async ${method}(`))
    assert.match(body.slice(0, body.indexOf('\n  }\n')), /this\.ds\.transaction\(async em => \{\n\s+const row = await this\.lockIncident\(em, user, id\)/, method)
  }
  // البلاغ: الفرع والحالة من صف الموظف المقفول، مش من العميل
  assert.match(service, /FROM dbo\.employees WITH \(UPDLOCK, ROWLOCK\) WHERE \[id\] = @0', \[me\]\)/)
  assert.match(service, /branchId: Number\(person\.branchId\), reporterEmployeeId: me/)
  // المهام: كيان محرك المهام نفسه وحدث التكليف بتاعه — من غير نداء خدمة تانية جوه المعاملة
  assert.match(service, /em\.getRepository\(Task\)/)
  assert.match(service, /recordOutboxEvent\(em, \{ type: 'TASK_ASSIGNED', entityType: 'task'/)
  assert.doesNotMatch(service, /TasksService|private readonly tasks/)
  // القفل: صفوف المهام بتتقفل بعد صف الحادث وبترتيب ثابت
  assert.match(service, /FROM dbo\.tasks WITH \(UPDLOCK, ROWLOCK\) WHERE \[id\] IN \(\$\{marks\(taskIds\)\}\) AND \[status\] IN \(N'OPEN', N'IN_PROGRESS', N'WAITING'\) ORDER BY \[id\]/)
  // الحجب بفرع الموظف الحالي: من غير اسم ولا رقم
  assert.match(service, /if \(!person \|\| !inBranchScope\(scope, person\.branchId\)\) return \{ id: null, fullName: HIDDEN_PERSON, employeeCode: null \}/)
  // بلاغات الموظف: من غير الشدة والسبب والأيام
  const mine = service.slice(service.indexOf('async mine('), service.indexOf('async report('))
  assert.doesNotMatch(mine, /severity|rootCause|lostDays|injured/)
  // المتحكم: مسارين للموظف من غير صلاحية، والباقي بصلاحية السلامة، وكله ورا الموديول
  assert.match(controller, /@RequireModule\('safety'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Controller\('safety'\)/)
  assert.equal((controller.match(/@Perm\('safety\.manage'\)/g) || []).length, 7)
  assert.equal((controller.match(/@(Get|Post|Patch|Put)\(/g) || []).length, 9)
})

test('SFU-05: الواجهة — الشاشتين بعنوانهم في القايمة، والبلاغ مابيبعتش فرع ولا حالة', () => {
  const mine = web('app/my/safety/page.tsx'), log = web('app/safety/page.tsx'), sidebar = web('components/layout/Sidebar.tsx'), titles = web('components/layout/pageTitles.ts')
  assert.match(sidebar, /\{ label: 'السلامة وإصابات العمل', href: '\/safety', perm: 'safety\.manage' \},/)
  assert.match(sidebar, /\{ label: 'بلاغات السلامة', href: '\/my\/safety' \},/)
  assert.match(titles, /\['\/safety', 'السلامة وإصابات العمل'\]/); assert.match(titles, /\['\/my\/safety', 'بلاغات السلامة'\]/)
  assert.match(mine, />\s*بلاغات السلامة\s*<\/h1>/); assert.match(log, />\s*السلامة وإصابات العمل\s*<\/h1>/)
  assert.doesNotMatch(mine, /branchId|severity|rootCause/)
  assert.match(log, /apiFetch<SafetyList>\(B\)/)
})
