'use strict'
// B3.3-أ: المرشح على وظيفة شاغرة — فحص من غير قاعدة (الدورة الفعلية في candidate-applications.integration.cjs):
//  CU-01) القواعد: تطبيع الموبايل والبريد والهوية، ورقم الهوية والمصدر المكتوبين.
//  CU-02) الربط: الإضافة والتقديم تحت قفل صف الوظيفة والحكم بعده، والتقديم الداخلي بقفل صف الموظف وفرعه الحالي، والمسارات محروسة.
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
