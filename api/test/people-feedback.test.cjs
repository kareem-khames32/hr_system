// B5.10 — الأداء: 360 والـ1:1 والتقدير: قواعد الترشيح والرد وملخص النتيجة بحد أدنى، قواعد الاجتماع ومهمته وكلمة الشكر، ومصدر الكود (السرية في شكل الرد، الحكم بعد القفل) والواجهة.
// حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/performance/people-feedback')
const registry = require('../src/modules-registry/registry')
const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
const web = rel => fs.readFileSync(path.join(apiRoot, '..', 'src', rel), 'utf8').replace(/\r\n/g, '\n')
const TODAY = '2026-10-10'

test('PFU-01: 360 — الترشيح والرد، وملخص النتيجة: أقل من الحد مخفي كله (ولا العدد)، وغير كده عدد ومتوسط وتعليقات أبجديًا', () => {
  assert.deepEqual(rules.nominationFields({ cycleId: 2, reviewerEmployeeIds: [5, 6] }).fields, { cycleId: 2, reviewerEmployeeIds: [5, 6] })
  assert.deepEqual([rules.nominationFields(null).error, rules.nominationFields({ cycleId: 2 }).error, rules.nominationFields({ cycleId: 2, reviewerEmployeeIds: Array.from({ length: 9 }, (_, index) => index + 1) }).error,
    rules.nominationFields({ cycleId: 2, reviewerEmployeeIds: [0] }).error], ['اختار دورة التقييم', 'رشّح من زميل لحد 8 زملاء من غير تكرار', 'رشّح من زميل لحد 8 زملاء من غير تكرار', 'رشّح من زميل لحد 8 زملاء من غير تكرار'])
  assert.deepEqual(rules.feedbackFields({ rating: 5, strengths: ' ممتاز ', improvements: '' }).fields, { rating: 5, strengths: 'ممتاز', improvements: null })
  assert.deepEqual([rules.feedbackFields({ rating: 0 }).error, rules.feedbackFields({ rating: '4' }).error, rules.feedbackFields({ rating: 4, improvements: 7 }).error], ['الدرجة رقم صحيح من 1 لـ5', 'الدرجة رقم صحيح من 1 لـ5', 'التعليق 1000 حرف بالكتير'])
  const row = (rating, strengths = null, improvements = null) => ({ rating, strengths, improvements })
  assert.deepEqual(rules.feedbackSummary('PEER', [row(5, 'سر'), row(1, 'سر تاني')]), { relation: 'PEER', label: 'زملاء', hidden: true, count: null, average: null, strengths: [], improvements: [] })
  assert.deepEqual(rules.feedbackSummary('UPWARD', []), { relation: 'UPWARD', label: 'مرؤوسين', hidden: true, count: null, average: null, strengths: [], improvements: [] })
  // ترتيب التعليقات أبجدي مش بترتيب الإدخال، وكل قايمة لوحدها
  assert.deepEqual(rules.feedbackSummary('PEER', [row(5, 'ي', 'ت'), row(4, 'أ', 'ب'), row(2, 'ج', 'ا')]), { relation: 'PEER', label: 'زملاء', hidden: false, count: 3, average: 3.67, strengths: ['أ', 'ج', 'ي'], improvements: ['ا', 'ب', 'ت'] })
  // P5A-N01: قايمة تعليقات فيها أقل من الحد مابتتعرضش حتى لو الردود وصلت الحد
  assert.deepEqual((({ hidden, count, strengths, improvements }) => [hidden, count, strengths, improvements])(rules.feedbackSummary('PEER', [row(5, 'ي'), row(4, 'أ', 'ب'), row(2, null, 'ا')])), [false, 3, [], []])
  assert.deepEqual([rules.FEEDBACK_MIN_GROUP, rules.PEERS_MAX, rules.RECOGNITIONS_PER_DAY], [3, 8, 5])
})

test('PFU-02: 1:1 والتقدير — الاجتماع وتعديله (الأجندة للطرفين والباقي للمدير) ومهمة المتابعة وكلمة الشكر', () => {
  assert.deepEqual(rules.meetingFields({ employeeId: 4, meetingDate: TODAY, meetingTime: '09:05', agenda: '  نقطة ' }, TODAY).fields, { employeeId: 4, meetingDate: TODAY, meetingTime: '09:05', agenda: 'نقطة' })
  assert.deepEqual(rules.meetingFields({ employeeId: 4, meetingDate: TODAY, meetingTime: '' }, TODAY).fields, { employeeId: 4, meetingDate: TODAY, meetingTime: null, agenda: null })
  assert.deepEqual([rules.meetingFields({ employeeId: 4, meetingDate: '2026-10-09' }, TODAY).error, rules.meetingFields({ employeeId: 4, meetingDate: TODAY, meetingTime: '9:5' }, TODAY).error, rules.meetingFields({ meetingDate: TODAY }, TODAY).error],
    ['تاريخ الاجتماع من النهارده', 'وقت الاجتماع بصيغة 14:30', 'اختار الموظف'])
  assert.deepEqual([rules.meetingPatch({ agenda: ' أ ' }), rules.meetingPatch({ agenda: '', notes: ' ملاحظة ', status: 'DONE' }), rules.meetingPatch({ meetingTime: null })],
    [{ patch: { agenda: 'أ' }, managerOnly: false, error: null }, { patch: { agenda: null, notes: 'ملاحظة', status: 'DONE' }, managerOnly: true, error: null }, { patch: { meetingTime: null }, managerOnly: true, error: null }])
  assert.deepEqual([rules.meetingPatch({}).error, rules.meetingPatch({ status: 'done' }).error, rules.meetingPatch({ meetingDate: '2026-02-30' }).error, rules.meetingPatch({ agenda: 5 }).error],
    ['مفيش تعديل', 'حالة الاجتماع مش صحيحة', 'تاريخ الاجتماع مش صحيح', 'الأجندة 1000 حرف بالكتير'])
  assert.deepEqual(rules.meetingActionFields({ title: ' متابعة ', assignee: 'MANAGER', dueDate: TODAY }, TODAY).fields, { title: 'متابعة', assignee: 'MANAGER', dueDate: TODAY })
  assert.deepEqual([rules.meetingActionFields({ title: 'x'.repeat(151), assignee: 'MANAGER', dueDate: TODAY }, TODAY).error, rules.meetingActionFields({ title: 'متابعة', assignee: 'manager', dueDate: TODAY }, TODAY).error],
    ['اكتب المهمة (من 3 حروف لحد 150)', 'المهمة على الموظف أو المدير'])
  assert.deepEqual(rules.recognitionFields({ toEmployeeId: 3, message: '  شكرًا   جدًا ' }).fields, { toEmployeeId: 3, message: 'شكرًا جدًا' })
  assert.deepEqual([rules.recognitionFields({ toEmployeeId: '3', message: 'شكرًا جدًا' }).error, rules.recognitionFields({ toEmployeeId: 3 }).error], ['اختار الزميل', 'اكتب كلمة الشكر (من 5 حروف لحد 500)'])
})

test('PFU-03: سجل الموديولات — التلات ميزات مقفولة افتراضيًا جوه موديول الأداء، وكل واحدة بمسار شاشتها', () => {
  for (const [feature, route] of [[rules.FEEDBACK360_FEATURE, '/my/feedback360'], [rules.ONE_ON_ONE_FEATURE, '/my/one-on-ones'], [rules.RECOGNITION_FEATURE, '/my/recognition']]) {
    const def = registry.MODULE_FEATURES[feature]
    assert.deepEqual([def.module, def.default, def.routes, registry.routeOwner(route).feature], ['performance', false, [route], feature], feature)
  }
})

test('PFU-04: مصدر الكود — الرد من غير مقيّم ولا وقت ولا تدقيق، النتيجة بعد القفل وبملخص الحد الأدنى، والحكم بعد قفل صف الموظف', () => {
  const service = read('performance/feedback360.service.ts'), entities = read('performance/people-feedback.ts')
  // كيان الرد: من غير مقيّم ولا دعوة ولا وقت
  const response = entities.slice(entities.indexOf("@Entity('feedback360_responses')"), entities.indexOf("@Entity('one_on_ones')"))
  assert.doesNotMatch(response, /reviewer|invite|createdAt|submitted|userId|datetime/i)
  const invite = entities.slice(entities.indexOf("@Entity('feedback360_invites')"), entities.indexOf("@Entity('feedback360_responses')"))
  assert.doesNotMatch(invite, /respondedAt|updatedAt|responseId/)
  // الرد: تحت قفل صف الدعوة، والدعوة بتتعلّم «رد» بس — ومن غير سطر تدقيق في الخدمة كلها
  const respond = service.slice(service.indexOf('async respond('), service.indexOf('async results('))
  // P5A-B05: صف الدورة بيتقفل قبل صف الدعوة، والحكم على الحالة بعد القفلين
  assert.ok(respond.indexOf("FROM dbo.review_cycles WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [peek.cycleId])") > 0)
  assert.ok(respond.indexOf('FROM dbo.review_cycles WITH (UPDLOCK, ROWLOCK)') < respond.indexOf("lock: { mode: 'pessimistic_write' }"))
  assert.ok(respond.indexOf("lock: { mode: 'pessimistic_write' }") < respond.indexOf("if (cycle?.status !== 'ACTIVE')"))
  assert.match(respond, /findOne\(\{ where: \{ id: inviteId, cycleId: peek\.cycleId \}, lock: \{ mode: 'pessimistic_write' \} \}\)\n\s+if \(!invite \|\| invite\.reviewerEmployeeId !== me\) throw new NotFoundException\(INVITE_NOT_FOUND\)/)
  assert.match(respond, /responses\.create\(\{ cycleId: invite\.cycleId, subjectEmployeeId: invite\.subjectEmployeeId, relation: invite\.relation, \.\.\.fields \}\)/)
  assert.match(respond, /repo\.update\(\{ id: invite\.id \}, \{ responded: true \}\)/)
  assert.doesNotMatch(service, /recordAudit|respondedAt/)
  // النتيجة: مش للموظف نفسه، وبعد قفل الدورة بس، وبملخص الحد الأدنى
  assert.match(service, /if \(!subject \|\| \(me !== null && me === subject\.id\)\) return null/)
  assert.match(service, /if \(cycle\.status !== 'CLOSED'\) return \{ \.\.\.base, closed: false, summaries: \[\] \}/)
  assert.match(service, /FEEDBACK_RELATIONS\.map\(relation => feedbackSummary\(relation, rows\.filter\(row => row\.relation === relation\)\)\)/)
  // القرار: صف الموظف المتقيَّم ثم صف الدعوة ثم الحكم
  const decide = service.slice(service.indexOf('async decide('), service.indexOf('async openUpward('))
  assert.ok(decide.indexOf('await this.person(em, peek.subjectEmployeeId, true)') < decide.indexOf("lock: { mode: 'pessimistic_write' }"))
  assert.ok(decide.indexOf("lock: { mode: 'pessimistic_write' }") < decide.indexOf('this.rightOver(user, subject)'))
  // 1:1: التحديد للمدير المباشر دلوقتي تحت قفل صف الموظف، والتعديل تحت قفل صف الاجتماع لطرفيه
  const meetings = read('performance/one-on-ones.service.ts')
  assert.match(meetings, /FROM dbo\.employees WITH \(UPDLOCK, ROWLOCK\) WHERE \[id\] = @0 AND \$\{ACTIVE\}`, \[fields\.employeeId\]\)\n\s+if \(!person \|\| Number\(person\.id\) === me \|\| person\.managerEmployeeId == null \|\| Number\(person\.managerEmployeeId\) !== me\) throw new NotFoundException\(EMPLOYEE_NOT_FOUND\)/)
  assert.match(meetings, /if \(!row \|\| \(row\.managerEmployeeId !== me && row\.employeeId !== me\)\) throw new NotFoundException\(MEETING_NOT_FOUND\)/)
  assert.match(meetings, /recordOutboxEvent\(em, \{ type: 'TASK_ASSIGNED', entityType: 'task'/)
  // التقدير: فرع المرسل الحالي من صفه المقفول، والمستلم في نفس الفرع
  const recognitions = read('performance/recognitions.service.ts')
  assert.match(recognitions, /FROM dbo\.employees WITH \(UPDLOCK, ROWLOCK\) WHERE \[id\] = @0 AND \$\{ACTIVE\}`, \[me\]\)/)
  assert.match(recognitions, /WHERE \[id\] = @0 AND \[branchId\] = @1 AND \$\{ACTIVE\}`, \[fields\.toEmployeeId, Number\(self\.branchId\)\]\)/)
  // سطر التقويم: ورا ميزته
  assert.match(read('assets/portal.controller.ts'), /\(await this\.modules\.isFeatureEnabled\(ONE_ON_ONE_FEATURE\)\) \? await oneOnOneCalendar\(this\.holidays\.manager, user, from, to\) : null\n\s+return \{ month: m, from, to, holidays: monthHolidays, leaves, weekendDays, \.\.\.\(meetings \? \{ meetings \} : \{\}\) \}/)
})

test('PFU-05: الواجهة — التلات شاشات بعناوينهم في القايمة، والتقويم بيعرض الاجتماعات', () => {
  const sidebar = web('components/layout/Sidebar.tsx'), titles = web('components/layout/pageTitles.ts')
  for (const [href, label, file] of [['/my/feedback360', 'تقييم 360', 'app/my/feedback360/page.tsx'], ['/my/one-on-ones', 'اجتماعات 1:1', 'app/my/one-on-ones/page.tsx'], ['/my/recognition', 'التقدير', 'app/my/recognition/page.tsx']]) {
    assert.ok(sidebar.includes(`label: '${label}'`) && sidebar.includes(`href: '${href}'`), href)
    assert.ok(titles.includes(`['${href}', '${label}']`), href)
    assert.match(web(file), new RegExp(`>\\s*${label}\\s*</h1>`), file)
  }
  assert.match(web('app/calendar/page.tsx'), /type: "meeting" as const/)
  // شاشة 360 مابتعرضش مين رد
  assert.doesNotMatch(web('app/my/feedback360/page.tsx'), /responded/)
})
