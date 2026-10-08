'use strict'
// B3.3-أ: المرشح على وظيفة شاغرة — فحص من غير قاعدة (الدورة الفعلية في candidate-applications.integration.cjs):
//  CU-01) القواعد: تطبيع الموبايل والبريد والهوية، ورقم الهوية والمصدر المكتوبين.
//  CU-02) الربط: الإضافة والتقديم تحت قفل صف الوظيفة والحكم بعده، والتقديم الداخلي بقفل صف الموظف وفرعه الحالي، والمسارات محروسة.
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
