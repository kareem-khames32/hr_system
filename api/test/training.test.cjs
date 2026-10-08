'use strict'
// B3.9: التدريب — فحص من غير قاعدة (الدورة الفعلية في training.integration.cjs):
//  TU-01) القواعد: الاسم، النوع، الرابط، المدة، صلاحية الشهادة، التواريخ، السعة، التكلفة، حالة التسجيل، التقييم، وتاريخ انتهاء الشهادة.
//  TU-02) الربط: موديول جديد مقفول بصلاحيته في السجلين، والتسجيل تحت قفل صف الجلسة والحالة تحت قفل صف التسجيل، والشهادة مستند موظف، والمسارات.
// Run (من api/): node --test test/training.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/training/training-rules')
const { MODULES } = require('../src/modules-registry/registry')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const refuses = (work, label) => assert.throws(work, error => error?.getStatus?.() === 400, label)

test('TU-01: course and session values, the enrollment marks, the rating and the certificate expiry', () => {
  assert.deepEqual([rules.cleanTrainingName('  السلامة   المهنية '), rules.cleanTrainingKind('ONLINE'), rules.cleanTrainingUrl(' https://x.invalid/a ', 'ONLINE'), rules.cleanTrainingUrl(undefined, 'INTERNAL'), rules.cleanTrainingUrl('', 'EXTERNAL')],
    ['السلامة المهنية', 'ONLINE', 'https://x.invalid/a', null, null])
  for (const bad of ['اب', '', null, 5, 'س'.repeat(201)]) refuses(() => rules.cleanTrainingName(bad), 'name')
  for (const bad of ['online', 'LIVE', null]) refuses(() => rules.cleanTrainingKind(bad), 'kind')
  for (const [url, kind] of [['', 'ONLINE'], [undefined, 'ONLINE'], ['ftp://x', 'INTERNAL'], ['javascript:alert(1)', 'INTERNAL'], ['https://x y', 'INTERNAL'], [5, 'INTERNAL'], ['https://' + 'a'.repeat(500), 'INTERNAL']]) {
    refuses(() => rules.cleanTrainingUrl(url, kind), 'url ' + String(url).slice(0, 20))
  }
  assert.deepEqual([rules.cleanTrainingDuration(8), rules.cleanTrainingDuration('1.5'), rules.cleanTrainingDuration(''), rules.cleanTrainingDuration(null), rules.cleanTrainingCost('350.5'), rules.cleanTrainingCost(0), rules.cleanTrainingCost(undefined)],
    ['8.00', '1.50', null, null, '350.50', '0.00', null])
  for (const bad of [0.1, 10000, '8.555', 'x', {}]) refuses(() => rules.cleanTrainingDuration(bad), 'duration ' + String(bad))
  for (const bad of [-1, '5.555', 'x', 1e13]) refuses(() => rules.cleanTrainingCost(bad), 'cost ' + String(bad))
  assert.deepEqual([rules.cleanValidMonths(12, true), rules.cleanValidMonths(null, true), rules.cleanValidMonths(undefined, false), rules.cleanTrainingCapacity(20), rules.cleanTrainingCapacity('')], [12, null, null, 20, null])
  for (const bad of [0, 121, 1.5, '12']) refuses(() => rules.cleanValidMonths(bad, true), 'months ' + String(bad))
  refuses(() => rules.cleanValidMonths(12, false), 'months without a certificate')
  for (const bad of [0, 10001, 2.5, '5']) refuses(() => rules.cleanTrainingCapacity(bad), 'capacity ' + String(bad))
  assert.deepEqual(rules.cleanTrainingDates('2026-11-01', '2026-11-01'), { startDate: '2026-11-01', endDate: '2026-11-01' })
  for (const [start, end] of [['2026-11-02', '2026-11-01'], ['2026-02-31', '2026-03-01'], ['01-11-2026', '2026-11-02'], [null, '2026-11-02']]) refuses(() => rules.cleanTrainingDates(start, end), 'dates')
  assert.deepEqual(['ATTENDED', 'COMPLETED', 'ABSENT', 'CANCELLED'].map(status => rules.cleanEnrollmentMark(status)), ['ATTENDED', 'COMPLETED', 'ABSENT', 'CANCELLED'])
  for (const bad of ['ENROLLED', 'DONE', null, 5]) refuses(() => rules.cleanEnrollmentMark(bad), 'mark ' + String(bad))
  assert.deepEqual(['ENROLLED', 'ATTENDED', 'ABSENT', 'COMPLETED', 'CANCELLED'].map(status => rules.enrollmentOpen(status)), [true, true, true, false, false])
  assert.deepEqual([rules.cleanTrainingRating(1), rules.cleanTrainingRating(5)], [1, 5])
  for (const bad of [0, 6, 4.5, '5', null]) refuses(() => rules.cleanTrainingRating(bad), 'rating ' + String(bad))
  // انتهاء الشهادة: نفس اليوم بعد الشهور، وآخر يوم في الشهر لو اليوم مش موجود، ومن غير صلاحية = من غير انتهاء
  assert.deepEqual([rules.certificateExpiry('2026-11-02', 12), rules.certificateExpiry('2026-08-31', 6), rules.certificateExpiry('2024-02-29', 12), rules.certificateExpiry('2026-01-31', 1), rules.certificateExpiry('2026-11-02', null)],
    ['2027-11-02', '2027-02-28', '2025-02-28', '2026-02-28', null])
  assert.deepEqual(rules.TRAINING_SEAT_STATUSES, ['ENROLLED', 'ATTENDED', 'COMPLETED'])
})

test('TU-02: a new closed module with its permission, enrolling under the session row lock, marking under the enrollment row lock, the certificate as an employee document, and the routes', () => {
  const module = MODULES.training
  assert.deepEqual([module.defaultEnabled, module.permissions, module.dependsOn], [false, ['training.manage'], ['employees']])
  const { PERMISSIONS, PERMISSION_MODULES, ROLE_PRESETS } = require('../src/auth/permissions')
  assert.deepEqual(['training.manage' in PERMISSIONS, PERMISSION_MODULES.find(unit => unit.key === 'training').permissions, ROLE_PRESETS.find(role => role.code === 'hr_manager').permissions.includes('training.manage'),
    ROLE_PRESETS.find(role => role.code === 'employee').permissions.includes('training.manage')], [true, ['training.manage'], true, false])
  const service = read('api/src/training/training.service.ts')
  const enroll = service.slice(service.indexOf('async enroll('), service.indexOf('/** نوع مستند «شهادة تدريب»'))
  const order = ['this.assertManager(user)', 'this.ds.transaction(', 'await this.lockedSession(em, user, sessionId)', "session.status !== 'PLANNED'", 'inBranchScope(scope, row.branchId)', 'eligible.length !== ids.length',
    'session.capacity != null && seats + fresh.length > session.capacity', 'getRepository(TrainingEnrollment).insert('].map(part => enroll.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  assert.match(service, /private async lockedSession\([^)]*\): Promise<TrainingSession> \{\n\s+await this\.assertReady\(em\)\n\s+const session = await em\.getRepository\(TrainingSession\)\.findOne\(\{ where: \{ id \}, lock: \{ mode: 'pessimistic_write' \} \}\)\n\s+if \(!session \|\| !this\.sessionInScope\(user, session\)\) throw new NotFoundException/)
  const mark = service.slice(service.indexOf('async mark('), service.indexOf('// ===== الموظف ====='))
  const markOrder = ['cleanEnrollmentMark(input.status)', 'this.ds.transaction(', "getRepository(TrainingEnrollment).findOne({ where: { id: enrollmentId }, lock: { mode: 'pessimistic_write' } })",
    '!this.sessionInScope(user, session) || !inBranchScope(branchScopeOf(user), employee.branchId)', '!enrollmentOpen(enrollment.status)', "course?.givesCertificate === true",
    'getRepository(EmployeeDocument).insert(', 'certificateExpiry(issueDate, course.certificateValidMonths)', 'getRepository(TrainingEnrollment).update({ id: enrollment.id }, patch)'].map(part => mark.indexOf(part))
  assert.ok(markOrder.every((at, index) => at > 0 && (index === 0 || at > markOrder[index - 1])), JSON.stringify(markOrder))
  assert.match(service, /FROM \[doc_types\] WITH \(UPDLOCK, HOLDLOCK\) WHERE \[code\] = @0 OR \[nameAr\] = @1/, 'نوع المستند بيتحجز بقفل مدى قبل ما يتعمل')
  assert.doesNotMatch(service, /\.save\(/, 'الكتابة بالخانات بس')
  const rate = service.slice(service.indexOf('async rate('))
  assert.match(rate, /enrollment\.employeeId !== user\.employeeId\) throw new NotFoundException\(TRAINING_ENROLLMENT_NOT_FOUND\)/)
  const controller = read('api/src/training/training.controller.ts')
  assert.match(controller, /@RequireModule\('training'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Controller\('training'\)/)
  assert.equal(controller.split("@Perm('training.manage')").length - 1, 9, 'الكتالوج والجلسات والتسجيل والحالة بالصلاحية')
  assert.doesNotMatch(read('api/src/training/training.entities.ts'), /default:|CreateDateColumn/, 'من غير افتراضي (زي الترحيلات)')
})
