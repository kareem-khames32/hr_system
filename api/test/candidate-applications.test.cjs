'use strict'
// B3.3-أ: المرشح على وظيفة شاغرة — فحص من غير قاعدة (الدورة الفعلية في candidate-applications.integration.cjs):
//  CU-01) القواعد: تطبيع الموبايل والبريد والهوية، ورقم الهوية والمصدر المكتوبين.
//  CU-02) الربط: الإضافة والتقديم تحت قفل صف الوظيفة والحكم بعده، والتقديم الداخلي بقفل صف الموظف وفرعه الحالي، والمسارات محروسة.
//  CU-08) (B3.5-ج) أرقام التوظيف: حساب الأيام والمتوسط، والمسار بصلاحية التوظيف وبنطاق الفروع.
//  CU-07) (B3.5-ب) التعيين من العرض: قفل الوظيفة تحت قفل صفها لما العدد يكمل، ومسار التعيين بينادي عليه بعد السجل.
//  CU-06) (B3.5-أ) عروض العمل: قيم العرض، وبصمة الرمز، وحق كل إجراء، والانتقالات تحت قفل صف العرض، ولينك الرد من غير دخول بميزته.
//  CU-05) (B3.4-ب) المقابلات: قيم المقابلة والبطاقة، وملف الدعوة (.ics)، وترتيب الحكم في التحديد والتسليم، والمسارات.
//  CU-04) (B3.4-أ) نقل المراحل: القيم، والنقل تحت قفل الصف بترتيب الأرقام وبخانة المرحلة بس، والتعديل القايم بيعدّي عليه.
//  CU-03) (ب) اللينك العام: قيم المتقدّم والموافقة، وحد المحاولات، والمسارات بميزة مقفولة ومن غير حارس جلسة عن قصد، والتقديم تحت قفل الوظيفة.
// Run (من api/): node --test test/candidate-applications.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/recruitment/candidate-applications')
const { MODULES } = require('../src/modules-registry/registry')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const refuses = (work, label) => assert.throws(work, error => error?.getStatus?.() === 400, label)

test('CU-01: phone, e-mail and id normalisation, and the typed id and source', () => {
  // الموبايل: الأرقام بس، وآخر 9 لو أطول — مفتاح الدولة والصفر البادئ والأرقام العربية مابيفرّقوش
  const same = ['0501234567', '+966 50 123 4567', '00966501234567', '٠٥٠١٢٣٤٥٦٧', '(050) 123-4567', '501234567'].map(rules.normalPhone)
  assert.deepEqual([...new Set(same)], ['501234567'])
  assert.deepEqual([rules.normalPhone('01001234567'), rules.normalPhone('+20 100 123 4567')], ['001234567', '001234567'])
  assert.deepEqual([rules.normalPhone('12345'), rules.normalPhone(''), rules.normalPhone(null), rules.normalPhone(501234567), rules.normalPhone('1234567')], ['', '', '', '', '1234567'])
  assert.notEqual(rules.normalPhone('0501234567'), rules.normalPhone('0501234568'))
  assert.deepEqual([rules.normalEmail('  First@Mail.Invalid '), rules.normalEmail(null), rules.normalEmail(7)], ['first@mail.invalid', '', ''])
  assert.deepEqual([rules.normalNationalId(' a12-345 6 '), rules.normalNationalId(undefined)], ['A123456', ''])
  assert.deepEqual([rules.cleanNationalId('a12-345 6'), rules.cleanNationalId(''), rules.cleanNationalId(null), rules.cleanNationalId(undefined), rules.cleanNationalId('1234567890')],
    ['A123456', null, null, null, '1234567890'])
  for (const bad of ['12', 'هوية عربي', 'A'.repeat(41), 1234567, {}, 'A12*456']) refuses(() => rules.cleanNationalId(bad), `id ${String(bad)}`)
  assert.deepEqual([rules.cleanSource(undefined, 'يدوي'), rules.cleanSource(null, 'يدوي'), rules.cleanSource('   ', 'يدوي'), rules.cleanSource(' لينكد   إن ', 'يدوي')], ['يدوي', 'يدوي', 'يدوي', 'لينكد إن'])
  refuses(() => rules.cleanSource('م'.repeat(61), 'يدوي'), 'طويل'); refuses(() => rules.cleanSource(5, 'يدوي'), 'مش نص')
  assert.deepEqual([rules.SOURCE_INTERNAL, rules.SOURCE_MANUAL], ['داخلي', 'يدوي'])
})

test('CU-02: adding and applying run under the job row lock with the judgment after it, and the routes are guarded', () => {
  assert.ok(MODULES.recruitment.routes.includes('/my/jobs'))
  const service = read('api/src/recruitment/candidate-applications.service.ts')
  // إضافة مسؤول التوظيف: قفل صف الوظيفة ← النطاق ← الحالة ← التكرار ← الحفظ
  const create = service.slice(service.indexOf('async createOnJob('), service.indexOf('async attach<'))
  const createOrder = ["lock: { mode: 'pessimistic_write' }", 'inBranchScope(branchScopeOf(user), job.branchId)', "job.status !== 'PUBLISHED' && job.status !== 'PAUSED'", 'await assertNotDuplicateOnJob(',
    'await candidates.save(', 'getRepository(CandidateApplication).insert('].map(part => create.indexOf(part))
  assert.ok(createOrder.every((at, index) => at > 0 && (index === 0 || at > createOrder[index - 1])), JSON.stringify(createOrder))
  assert.match(create, /positionTitle: job\.title, branchId: job\.branchId,/, 'المسمى والفرع من الوظيفة')
  // التقديم الداخلي: قفل الوظيفة ← قفل صف الموظف وقرايته ← الحكم كله (منشورة، داخلي، فرعه الحالي) ← التكرار ← الحفظ
  const apply = service.slice(service.indexOf('async applyInternal('))
  const applyOrder = ["findOne({ where: { id: jobId }, lock: { mode: 'pessimistic_write' } })", 'await this.applicant(em, user, true)', 'if (!this.open(job, employee))', 'await assertNotDuplicateOnJob(',
    'await candidates.save(', 'applicantEmployeeId: employee.id, cvFileId: null'].map(part => apply.indexOf(part))
  assert.ok(applyOrder.every((at, index) => at > 0 && (index === 0 || at > applyOrder[index - 1])), JSON.stringify(applyOrder))
  assert.match(service, /return !!job && job\.status === 'PUBLISHED' && job\.internal === true && job\.branchId === employee\.branchId/)
  assert.match(service, /employee\.isActive !== false && !ENDED\.includes\(employee\.status\) && employee\.branchId != null \? employee : null/)
  assert.doesNotMatch(service.slice(service.indexOf('async openings('), service.indexOf('async applyInternal(')), /salaryFrom|salaryTo|reason/, 'نطاق الراتب مش في قايمة الموظف')
  assert.doesNotMatch(service.slice(service.indexOf('async attach<'), service.indexOf('async countsByJob(')), /applicantEmployeeId: /, 'رقم الموظف المتقدّم مابيطلعش لمسؤول التوظيف')
  // فحص التكرار: دالة بمدير المعاملة بس
  assert.doesNotMatch(read('api/src/recruitment/candidate-applications.ts'), /Service\b|this\./)
  const openings = read('api/src/recruitment/recruitment-openings.controller.ts')
  assert.match(openings, /@RequireModule\('recruitment'\)\n@UseGuards\(JwtAuthGuard\)\n@Controller\('recruitment\/openings'\)/)
  const candidates = read('api/src/assets/candidates.controller.ts')
  assert.match(candidates, /if \(dto\.jobId != null\) \{\n\s+return this\.applications\.createOnJob\(user, \{/)
  assert.match(candidates, /return this\.applications\.attach\(user, rows\)/)
  const entity = read('api/src/recruitment/candidate-application.entity.ts')
  assert.doesNotMatch(entity, /default:|CreateDateColumn/, 'من غير افتراضي (زي الترحيل)')
})

test('CU-03: public applications — applicant values and consent, the attempt limiter, a closed feature without a session guard on purpose', () => {
  const careers = require('../src/recruitment/careers')
  assert.deepEqual([careers.cleanApplicantName('  أحمد   علي '), careers.cleanApplicantEmail(' A@B.Example '), careers.cleanApplicantPhone(' +966 (55) 000-1111 ')], ['أحمد علي', 'a@b.example', '+966 (55) 000-1111'])
  for (const bad of ['ab', '', null, 7, 'ا'.repeat(201)]) refuses(() => careers.cleanApplicantName(bad), 'name ' + String(bad))
  for (const bad of ['a@b', 'a b@c.example', '@c.example', null, 'a@b.c', 'ا'.repeat(200) + '@x.example']) refuses(() => careers.cleanApplicantEmail(bad), 'email ' + String(bad))
  for (const bad of ['12345', 'call me', '1'.repeat(16), null, 501234567, '0501234567;drop']) refuses(() => careers.cleanApplicantPhone(bad), 'phone ' + String(bad))
  assert.doesNotThrow(() => { careers.assertConsent(true); careers.assertConsent('true') })
  for (const bad of [false, 'false', 'yes', 1, undefined, null, 'TRUE']) refuses(() => careers.assertConsent(bad), 'consent ' + String(bad))
  assert.deepEqual([[...careers.CV_FILE_TYPES], careers.CV_MAX_MB, careers.CV_ENTITY_TYPE, careers.SOURCE_PUBLIC, careers.PUBLIC_CAREERS_FEATURE], [['pdf', 'doc', 'docx'], 5, 'candidate_cv', 'لينك عام', 'recruitment.public_careers'])
  // حد المحاولات: لكل مفتاح وللكل، والنافذة بتتحرك
  let clock = 1000
  const limiter = new careers.AttemptLimiter(2, 3, 100, () => clock)
  assert.deepEqual([limiter.take('a'), limiter.take('a'), limiter.take('a'), limiter.take('b'), limiter.take('c')], [true, true, false, true, false], 'مفتاح أ اتقفل بعد 2، والسقف العام بعد 3')
  clock += 101
  assert.deepEqual([limiter.take('a'), limiter.take('c')], [true, true], 'بعد النافذة')
  limiter.reset(); assert.equal(limiter.take('a'), true)
  // الميزة مقفولة افتراضيًا، والمسارات من غير حارس جلسة عن قصد وبالميزة
  assert.equal(MODULES.recruitment.features['recruitment.public_careers'].default, false)
  const controller = read('api/src/recruitment/careers.controller.ts')
  assert.match(controller, /@RequireModule\('recruitment'\)\n@RequireFeature\(PUBLIC_CAREERS_FEATURE\)\n@Controller\('careers'\)/)
  assert.doesNotMatch(controller, /UseGuards|CurrentUser/)
  assert.match(controller, /limits: \{ fileSize: CV_MAX_MB \* 1024 \* 1024, files: 1, fields: 12, fieldSize: 4096 \}/)
  // التقديم: الحد أولًا ← القيم ← الملف ← قفل الوظيفة ← منشورة خارجيًا ← التكرار (بنفس رد المقبول) ← الحفظ؛ والملف اللي ماتربطش بيتشال
  const service = read('api/src/recruitment/careers.service.ts')
  const apply = service.slice(service.indexOf('async apply('))
  const order = ['this.limiter.take(', 'cleanApplicantName(input.fullName)', 'assertConsent(input.consent)', 'classifyUpload(file.buffer', 'await storage.write(', "lock: { mode: 'pessimistic_write' }",
    "job.status !== 'PUBLISHED' || job.external !== true", 'await assertNotDuplicateOnJob(', 'if (error instanceof ConflictException) return false', 'await candidates.save(', 'consentAt: new Date()'].map(part => apply.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  assert.match(apply, /if \(cv && !kept\) await storage\.remove\(cv\.storedName\)/)
  assert.doesNotMatch(service.slice(service.indexOf('private view('), service.indexOf('async list(')), /salary|reason|department/i, 'من غير راتب ولا قسم ولا سبب')
  assert.match(read('api/src/files/files.controller.ts'), /\} else if \(f\.entityType === 'candidate_cv'\) \{\n[^\n]*\n\s+await assertCandidateCvAccess\(this\.ds\.manager, user, f\)/)
})

test('CU-04: stage moves — values, rows locked in id order, the stage column only, and the standing edit goes through the same place', () => {
  const stages = require('../src/recruitment/candidate-stages.service')
  assert.deepEqual([stages.cleanCandidateIds([5, 2, 5, 9]), stages.cleanStage('offer'), stages.cleanStageReason('  سبب   واضح '), stages.cleanStageReason('   '), stages.cleanStageReason(undefined)],
    [[2, 5, 9], 'offer', 'سبب واضح', null, null])
  for (const bad of [[], 'x', [0], [1.5], ['1'], null, Array.from({ length: 201 }, (_, index) => index + 1)]) refuses(() => stages.cleanCandidateIds(bad), 'ids')
  for (const bad of ['done', '', null, 5, 'Applied']) refuses(() => stages.cleanStage(bad), 'stage ' + String(bad))
  refuses(() => stages.cleanStageReason(5), 'reason type'); refuses(() => stages.cleanStageReason('س'.repeat(301)), 'reason length')
  assert.deepEqual([...stages.CANDIDATE_STAGES], ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'])
  const service = read('api/src/recruitment/candidate-stages.service.ts')
  const move = service.slice(service.indexOf('async move('), service.indexOf('async recordHire('))
  const order = ['cleanCandidateIds(rawIds)', 'this.ds.transaction(', 'for (const id of ids)', "lock: { mode: 'pessimistic_write' }", '!inBranchScope(scope, row.branchId)', "row.stage === 'hired'", 'if (row.stage === stage) continue',
    'await candidates.update({ id: row.id }, { stage })', 'getRepository(CandidateStageLog).insert('].map(part => move.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  assert.match(service, /return \[\.\.\.new Set\(raw as number\[\]\)\]\.sort\(\(a, b\) => a - b\)/, 'القفل بترتيب الأرقام')
  assert.doesNotMatch(move, /\.save\(/, 'مفيش حفظ للكيان كله')
  assert.match(service, /const visible = !!actor && \(actor\.id === user\.sub \|\| inBranchScope\(scope, actor\.branchId\)\)/)
  const candidates = read('api/src/assets/candidates.controller.ts')
  assert.match(candidates, /if \(dto\.stage !== undefined && dto\.stage !== c\.stage\) await this\.stages\.move\(user, \[id\], dto\.stage, dto\.reason\)/)
  const update = candidates.slice(candidates.indexOf("@Patch(':id')"), candidates.indexOf("@Post('stage')"))
  assert.doesNotMatch(update, /Object\.assign\(c, dto\)|\.save\(c\)/, 'التعديل بالخانات المبعوتة بس')
  assert.match(candidates, /await this\.stages\.recordHire\(user, c\.id, previousStage\)/)
})

test('CU-05: interviews — values, the invite file, the judgment order in scheduling and submitting, and the routes', () => {
  const rules = require('../src/recruitment/interview-rules')
  const now = new Date(2026, 9, 8, 14, 0)
  const time = rules.cleanInterviewTime('2026-10-08T09:30', now)
  assert.deepEqual([rules.localStamp(time), rules.localStamp(rules.cleanInterviewTime(' 2026-12-31T23:59 ', now))], ['2026-10-08T09:30', '2026-12-31T23:59'], 'النهارده مسموح حتى لو الساعة عدّت')
  for (const bad of ['2026-10-07T23:59', '2026-02-30T10:00', '2026-10-08 10:00', '2026-10-08T24:00', '2026-10-08T10:60', '2026-10-08', null, 20261008]) refuses(() => rules.cleanInterviewTime(bad, now), 'time ' + String(bad))
  assert.deepEqual([rules.cleanDuration(15), rules.cleanDuration(480), rules.cleanMode('PHONE'), rules.cleanPanel([7, 3]), rules.cleanRating(5), rules.cleanRecommendation('MAYBE')], [15, 480, 'PHONE', [3, 7], 5, 'MAYBE'])
  for (const bad of [14, 481, 30.5, '30', null]) refuses(() => rules.cleanDuration(bad), 'duration ' + String(bad))
  for (const bad of [[], [1, 1], [0], ['2'], 'all', Array.from({ length: 9 }, (_, index) => index + 1)]) refuses(() => rules.cleanPanel(bad), 'panel')
  for (const bad of [0, 6, 2.5, '3', null]) refuses(() => rules.cleanRating(bad), 'rating ' + String(bad))
  for (const bad of ['yes', 'GOOD', '', null]) refuses(() => rules.cleanRecommendation(bad), 'recommendation ' + String(bad))
  assert.deepEqual([rules.cleanOptionalText('  سطر\r\nتاني ', 50, 'x'), rules.cleanOptionalText('   ', 50, 'x'), rules.cleanOptionalText(undefined, 50, 'x')], ['سطر\nتاني', null, null])
  // ملف الدعوة: سطور CRLF، وقت عائم بساعة التطبيق، معرّف ثابت، ونصوص متهرّبة، وسطور مكسورة على 75 بايت
  const ics = rules.interviewIcs({ id: 12, scheduledAt: new Date(2026, 9, 9, 10, 30), durationMinutes: 45, summary: 'مقابلة: أحمد, علي; محاسب', location: 'قاعة 2\nالدور الأول',
    description: 'و'.repeat(80), stampedAt: new Date(Date.UTC(2026, 9, 8, 11, 0, 0)) })
  const lines = ics.split('\r\n')
  assert.deepEqual([lines[0], lines.at(-2), lines.at(-1), lines.includes('UID:interview-12@hr-system'), lines.includes('DTSTAMP:20261008T110000Z'), lines.includes('DTSTART:20261009T103000'),
    lines.includes('DTEND:20261009T111500'), lines.includes('METHOD:PUBLISH'), lines.includes('STATUS:CONFIRMED')], ['BEGIN:VCALENDAR', 'END:VCALENDAR', '', true, true, true, true, true, true])
  assert.ok(lines.includes('SUMMARY:مقابلة: أحمد\\, علي\\; محاسب') && lines.includes('LOCATION:قاعة 2\\nالدور الأول'))
  assert.ok(lines.every(line => Buffer.byteLength(line, 'utf8') <= 75), 'كل سطر 75 بايت بالكتير')
  assert.equal(lines.filter(line => line.startsWith(' ')).join('').replace(/ /g, '').length > 0, true, 'الوصف الطويل اتكسر بسطور تكميلية')
  assert.equal(ics.replace(/\r\n /g, '').includes('DESCRIPTION:' + 'و'.repeat(80)), true, 'وبيتجمّع من غير ما حرف يتقطع')
  const cancelled = rules.interviewIcs({ id: 12, scheduledAt: new Date(2026, 9, 9, 10, 30), durationMinutes: 45, summary: 'x', location: null, description: null, cancelled: true })
  assert.ok(cancelled.includes('METHOD:CANCEL') && cancelled.includes('STATUS:CANCELLED') && cancelled.includes('SEQUENCE:1') && !cancelled.includes('LOCATION'))
  // الترتيب: التحديد تحت قفل صف المرشح والحكم بعده، والدعوة بعد المعاملة؛ والتسليم تحت قفل صف البطاقة
  const service = read('api/src/recruitment/interviews.service.ts')
  const schedule = service.slice(service.indexOf('async schedule('), service.indexOf('async close('))
  const order = ['cleanInterviewTime(input.scheduledAt)', 'this.ds.transaction(', "lock: { mode: 'pessimistic_write' }", 'if (!this.candidateVisible(user, candidate))', 'CLOSED_STAGES.includes(candidate.stage)',
    '!inBranchScope(scope, row.branchId)', 'getRepository(CandidateInterview).save(', 'getRepository(InterviewScorecard).insert(', 'await this.sendInvites('].map(part => schedule.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  const transaction = schedule.slice(schedule.indexOf('this.ds.transaction('), schedule.indexOf('await this.sendInvites('))
  assert.doesNotMatch(transaction, /this\.mail\./, 'مفيش بريد جوه المعاملة')
  const submit = service.slice(service.indexOf('async submit('), service.indexOf('async ics('))
  const submitOrder = ['cleanRating(input.rating)', 'await this.myCard(em, user, interviewId, true)', "interview.status === 'CANCELLED'", 'if (card.submittedAt) throw new ConflictException(SCORECARD_SUBMITTED)',
    'getRepository(InterviewScorecard).update({ id: card.id }'].map(part => submit.indexOf(part))
  assert.ok(submitOrder.every((at, index) => at > 0 && (index === 0 || at > submitOrder[index - 1])), JSON.stringify(submitOrder))
  assert.match(service, /const mayReadOthers = cardsFor === 'manager' \|\| !!own\?\.submittedAt/)
  assert.match(service, /const open = !!card\.submittedAt && \(mine \|\| mayReadOthers\)/)
  const controller = read('api/src/recruitment/interviews.controller.ts')
  assert.match(controller, /@RequireModule\('recruitment'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Perm\('candidates\.manage'\)\n@Controller\('recruitment\/interviews'\)/)
  assert.match(controller, /@RequireModule\('recruitment'\)\n@UseGuards\(JwtAuthGuard\)\n@Controller\('recruitment\/my-interviews'\)/)
  assert.deepEqual([MODULES.recruitment.routes.includes('/recruitment/interviews'), MODULES.recruitment.routes.includes('/my/interviews')], [true, true])
})

test('CU-06: offers — values, the token hash, who may do what, transitions under the offer row lock, and the public answer link', () => {
  const offers = require('../src/recruitment/offers.service')
  assert.deepEqual([offers.cleanOfferSalary(8500), offers.cleanOfferSalary(' 8500.5 '), offers.cleanOfferStart('2026-11-01'), offers.cleanOfferExpiry('2026-10-09', '2026-10-09'), offers.cleanOfferExpiry('', '2026-10-09'),
    offers.cleanOfferExpiry(undefined, '2026-10-09')], ['8500.00', '8500.50', '2026-11-01', '2026-10-09', null, null])
  for (const bad of [0, -1, '1.234', 'x', null, 1e13, NaN]) refuses(() => offers.cleanOfferSalary(bad), 'salary ' + String(bad))
  for (const bad of ['', null, undefined, '2026-02-31', '01-11-2026']) refuses(() => offers.cleanOfferStart(bad), 'start ' + String(bad))
  for (const bad of ['2026-10-08', '2026-13-01', 'بكرة']) refuses(() => offers.cleanOfferExpiry(bad, '2026-10-09'), 'expiry ' + String(bad))
  assert.equal(offers.offerTokenHash('a'.repeat(64)), require('node:crypto').createHash('sha256').update('a'.repeat(64)).digest('hex'))
  assert.equal(offers.OFFER_APPROVE_PERMISSION, 'candidates.approve_offers')
  const { PERMISSIONS, PERMISSION_MODULES, ROLE_PRESETS } = require('../src/auth/permissions')
  assert.deepEqual(['candidates.approve_offers' in PERMISSIONS, PERMISSION_MODULES.find(unit => unit.key === 'recruitment').permissions, MODULES.recruitment.permissions,
    ROLE_PRESETS.find(role => role.code === 'hr_manager').permissions.includes('candidates.approve_offers'), ROLE_PRESETS.find(role => role.code === 'employee').permissions.includes('candidates.approve_offers')],
    [true, ['candidates.manage', 'candidates.approve_offers'], ['candidates.manage', 'candidates.approve_offers'], true, false])
  const service = read('api/src/recruitment/offers.service.ts')
  const act = service.slice(service.indexOf('async act('), service.indexOf('// ===== لينك الرد'))
  const order = ["if (action !== 'approve' && action !== 'return') this.assertManager(user)", 'await this.locked(em, user, id)', 'if (!userHasPerm(user, OFFER_APPROVE_PERMISSION)) throw new ForbiddenException(OFFER_APPROVE_FORBIDDEN)',
    "user.role !== 'super_admin' && offer.createdByUserId === user.sub", "token = randomBytes(32).toString('hex')", 'getRepository(CandidateOffer).update({ id: offer.id }, patch)', 'await recordAudit('].map(part => act.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  assert.match(service, /findOne\(\{ where: \{ id \}, lock: \{ mode: 'pessimistic_write' \} \}\)\n\s+const candidate = offer \? /, 'كل انتقال تحت قفل صف العرض')
  assert.match(service, /status: 'SENT', tokenHash: offerTokenHash\(token\), sentAt: new Date\(\)/, 'المتخزّن بصمة الرمز')
  assert.doesNotMatch(service, /tokenHash: token\b|linkToken: offer/, 'الرمز نفسه مابيتخزنش')
  const answer = service.slice(service.indexOf('async publicAnswer('))
  const answerOrder = ['this.limiter.take(', "body.answer !== 'ACCEPT' && body.answer !== 'DECLINE'", 'await this.byToken(em, rawToken, true)', "tokenHash: null, respondedAt: new Date(), respondedVia: 'LINK'"].map(part => answer.indexOf(part))
  assert.ok(answerOrder.every((at, index) => at > 0 && (index === 0 || at > answerOrder[index - 1])), JSON.stringify(answerOrder))
  assert.match(service, /if \(!offer \|\| offer\.status !== 'SENT' \|\| \(offer\.expiresOn && String\(offer\.expiresOn\)\.slice\(0, 10\) < today\(\)\)\) throw new NotFoundException\(OFFER_LINK_GONE\)/)
  const controller = read('api/src/recruitment/offers.controller.ts')
  assert.match(controller, /@Perm\('candidates\.manage', 'candidates\.approve_offers'\)\n@Controller\('recruitment\/offers'\)/)
  assert.match(controller, /@RequireModule\('recruitment'\)\n@RequireFeature\(PUBLIC_CAREERS_FEATURE\)\n@Controller\('careers\/offers'\)/)
  assert.doesNotMatch(controller.slice(controller.indexOf("@Controller('careers/offers')")), /UseGuards|CurrentUser/)
})

test('CU-07: hiring from an offer — the job closes under its row lock when its openings are filled, after the hire is recorded', () => {
  const service = read('api/src/recruitment/candidate-applications.service.ts')
  const after = service.slice(service.indexOf('async afterHire('), service.indexOf('private async attachApplications'))
  const order = ['findOne({ where: { candidateId } })', "lock: { mode: 'pessimistic_write' }", "if (!job || job.status === 'CLOSED') return { jobClosed: false }", "stage: 'hired'", 'if (hired < job.openings) return { jobClosed: false }',
    "update({ id: job.id }, { status: 'CLOSED', closedAt: new Date() })", 'await recordAudit('].map(part => after.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  assert.match(service, /status: 'ACCEPTED' \}, order: \{ id: 'ASC' \}/, 'العرض المقبول بس')
  const candidates = read('api/src/assets/candidates.controller.ts')
  assert.match(candidates, /await this\.stages\.recordHire\(user, c\.id, previousStage\)\n[^\n]*\n\s+await this\.applications\.afterHire\(user, c\.id\)/)
  assert.match(read('src/lib/candidate-hire.ts'), /initial\.basicSalary = candidate\.acceptedOffer\.salary\n\s+if \(candidate\.acceptedOffer\.startDate\) initial\.joinDate = candidate\.acceptedOffer\.startDate/)
})

test('CU-08: recruitment numbers — day differences and averages, behind the recruitment permission and the branch scope', () => {
  const metrics = require('../src/recruitment/recruitment-metrics.service')
  assert.deepEqual([metrics.daysBetween('2026-10-01T00:00:00Z', '2026-10-04T12:00:00Z'), metrics.daysBetween('2026-10-04T00:00:00Z', '2026-10-01T00:00:00Z'), metrics.daysBetween(new Date(0), new Date(8_640_000))],
    [3.5, 0, 0.1])
  assert.deepEqual([metrics.average([]), metrics.average([2]), metrics.average([1, 2, 2]), metrics.average([0.1, 0.2])], [null, 2, 1.7, 0.2])
  const service = read('api/src/recruitment/recruitment-metrics.service.ts')
  assert.match(service, /filter\(\(row\) => row\.branchId == null \|\| inBranchScope\(scope, row\.branchId\)\)/)
  assert.match(service, /filter\(\(job\) => inBranchScope\(scope, job\.branchId\)\)/)
  assert.doesNotMatch(service, /\.save\(|\.update\(|\.insert\(|\.delete\(/, 'قراءة بس')
  assert.match(read('api/src/recruitment/recruitment-jobs.controller.ts'), /@Get\('metrics'\)\n\s+metrics\(@CurrentUser\(\) user: JwtPayload\) \{\n\s+return this\.numbers\.metrics\(user\)/)
  assert.ok(MODULES.recruitment.routes.includes('/recruitment/metrics'))
})
