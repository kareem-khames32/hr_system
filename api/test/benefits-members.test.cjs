// B5.2 (ب) — اشتراكات التأمين وطلبات شركة التأمين: قواعد الطلب ورد الشركة، ومصدر الكود. حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/benefits/insurance-members')
const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')

test('BMU-01: خطوات الطلب — «اتبعت» من المستني بس، و«تم» و«إلغاء» للمفتوح، والمقفول مالوش خطوة', () => {
  const table = ['PENDING', 'SENT', 'DONE', 'CANCELLED'].map(status => ['send', 'done', 'cancel'].map(step => rules.requestStepAllowed(step, status)))
  assert.deepEqual(table, [[true, true, true], [false, true, true], [false, false, false], [false, false, false]])
  assert.deepEqual([rules.OPEN_REQUEST_STATUSES, Object.keys(rules.MEMBER_REQUEST_STATUS_LABELS), Object.keys(rules.MEMBER_REQUEST_ORIGIN_LABELS)],
    [['PENDING', 'SENT'], ['PENDING', 'SENT', 'DONE', 'CANCELLED'], ['MANUAL', 'OFFBOARDING', 'DEPENDENT']])
})

test('BMU-02: رد شركة التأمين — تاريخ السريان مطلوب، ورقم البطاقة مطلوب للإضافة بس؛ والسبب بحده', () => {
  assert.deepEqual(rules.requestOutcome('ADD', { effectiveDate: '2026-10-01', cardNumber: ' C-9 ' }), { effectiveDate: '2026-10-01', cardNumber: 'C-9', error: null })
  assert.deepEqual(rules.requestOutcome('REMOVE', { effectiveDate: '2026-10-31' }), { effectiveDate: '2026-10-31', cardNumber: null, error: null })
  assert.deepEqual([rules.requestOutcome('ADD', { effectiveDate: '2026-10-01' }).error, rules.requestOutcome('ADD', { cardNumber: 'C' }).error, rules.requestOutcome('REMOVE', { effectiveDate: '2026-02-30' }).error,
    rules.requestOutcome('ADD', { effectiveDate: '2026-10-01', cardNumber: 5 }).error, rules.requestOutcome('ADD', { effectiveDate: '2026-10-01', cardNumber: 'x'.repeat(61) }).error, rules.requestOutcome('REMOVE', null).error].map(Boolean),
  [true, true, true, true, true, true])
  assert.deepEqual([rules.requestReason(' طلاق ', true), rules.requestReason('', false), rules.requestReason('', true).error, rules.requestReason(5, false).error, rules.requestReason('ن'.repeat(301), false).error],
    [{ reason: 'طلاق', error: null }, { reason: null, error: null }, 'اكتب السبب', 'السبب نص', 'السبب 300 حرف بالكتير'])
})

test('BMU-03: مصدر الكود — كل كتابة تحت قفل صف الموظف ثم الطلب، وبنطاق الحساب، وطلبات الحذف التلقائية بقفل مدى ومن غير مبلغ', () => {
  const service = read('benefits/benefits-members.service.ts')
  for (const method of ['requestAdd', 'requestRemove', 'step']) {
    const body = service.slice(service.indexOf(`  async ${method}(`))
    assert.ok(body.indexOf('await this.lockEmployee(em, user, ') > 0, `${method}: تحت قفل صف الموظف`)
  }
  assert.match(service, /if \(!row \|\| !inBranchScope\(branchScopeOf\(user\), idOf\(row\.branchId\)\)\) throw new NotFoundException\(EMPLOYEE_NOT_FOUND\)/)
  assert.match(service, /FROM \[employees\] e WITH \(UPDLOCK, ROWLOCK\) LEFT JOIN \[branches\] b/)
  const step = service.slice(service.indexOf('  async step('))
  assert.ok(step.indexOf('this.lockEmployee(em, user, found.employeeId)') < step.indexOf("lock: { mode: 'pessimistic_write' }"), 'الموظف ثم صف الطلب')
  assert.equal((service.match(/WITH \(UPDLOCK, HOLDLOCK\)/g) ?? []).length, 2, 'الاشتراك الساري والطلب المفتوح بقفل مدى')
  assert.doesNotMatch(service, /employee_obligations|deduction|basicSalary|\.delete\(/i, 'مفيش مبلغ ولا مسح')
  assert.match(service, /nationalId: masking && !canSeeFullIdentity\(user, employeeId\) \? maskIdentityPartial\(nationalId\) : nationalId \?\? null/)
  const members = read('benefits/insurance-members.ts')
  assert.match(members, /FROM \[insurance_enrollments\] e WITH \(UPDLOCK, HOLDLOCK\)/)
  assert.match(members, /if \(!\(await insuranceMembersReady\(em\)\)\) return 0/)
  assert.match(read('offboarding/offboarding-open.ts'), /const insuranceRemovals = await raiseOffboardingRemovals\(em, input\.employeeId, input\.openedBy \?\? 0\)\n  if \(insuranceRemovals > 0\) items\.push\(/)
  assert.match(read('dependents/dependent-rules.ts'), /await raiseDependentRemoval\(em, row\.employeeId, row\.id, actor\.userId \|\| 0\)/)
  const controller = read('benefits/benefits.controller.ts')
  assert.deepEqual([(controller.match(/@Perm\('benefits\.manage'\)/g) ?? []).length, (controller.match(/@(Get|Post|Put|Patch|Delete)\(/g) ?? []).length, /@Delete\(/.test(controller)], [16, 16, false])
  assert.ok(require('../src/assets/doc-types').DOC_TYPES_SEED.some(row => row.code === 'medical_insurance_card'))
})

test('BMU-04 (ج): تذاكر السفر ميزة فرعية مقفولة، والاستحقاق عدد صحيح من صفر لـ12؛ وتقرير الحصص قراءة بس', () => {
  const tickets = require('../src/benefits/ticket-entitlements')
  const { MODULES } = require('../src/modules-registry/registry')
  assert.deepEqual([tickets.TICKETS_FEATURE, MODULES.benefits.features['benefits.tickets'].default], ['benefits.tickets', false])
  assert.deepEqual(tickets.ticketFields({ ticketsPerYear: 2, includesDependents: true, note: ' درجة أولى ' }), { fields: { ticketsPerYear: 2, includesDependents: true, note: 'درجة أولى' }, error: null })
  assert.deepEqual(tickets.ticketFields({ ticketsPerYear: 0 }).fields, { ticketsPerYear: 0, includesDependents: false, note: null })
  assert.deepEqual([{ ticketsPerYear: 13 }, { ticketsPerYear: -1 }, { ticketsPerYear: 1.5 }, { ticketsPerYear: '2' }, {}, { ticketsPerYear: 1, includesDependents: 1 }, { ticketsPerYear: 1, note: 'ن'.repeat(301) }, null].map(body => tickets.ticketFields(body).fields),
    [null, null, null, null, null, null, null, null])
  const controller = read('benefits/benefits.controller.ts')
  assert.equal((controller.match(/@RequireFeature\('benefits\.tickets'\)\n  @Perm\('benefits\.manage'\)/g) ?? []).length, 2, 'مساري التذاكر ورا الميزة الفرعية')
  const members = read('benefits/benefits-members.service.ts')
  const shares = members.slice(members.indexOf('  async shares('), members.indexOf('  // ===== الكتابة ====='))
  assert.doesNotMatch(shares, /\.insert\(|\.update\(|\.save\(|INSERT |UPDATE |transaction\(/, 'تقرير الحصص قراءة بس')
  assert.match(shares, /visible = rows\.filter\(row => inBranchScope\(scope, idOf\(row\.branchId\)\)\)/)
  const service = read('benefits/benefits.service.ts')
  assert.match(service, /FROM \[ticket_entitlements\] WITH \(UPDLOCK, HOLDLOCK\) WHERE \[gradeId\] = @0/)
  assert.equal((service.match(/assertCompanyWideWrite\(user\)/g) ?? []).length, 5, 'الوثيقة والفئة (4) واستحقاق التذاكر لحساب بكل الفروع')
})
