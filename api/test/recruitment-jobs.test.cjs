'use strict'
// B3.2 (أ): الاحتياج والوظيفة الشاغرة — فحص من غير قاعدة (الدورة الفعلية في recruitment-jobs.integration.cjs):
//  RU-01) القواعد: العدد، ونطاق الراتب، وتاريخ البدء، والنصوص، وانتقالات الحالة، وشرط النشر.
//  RU-02) الربط: وجهة الطلب في نقطها السبعة، والتنفيذ بمدير المعاملة بس وتحت قفل صف القسم المتثبّت، والخدمة بنطاق الفروع وبالخانات.
// Run (من api/): node --test test/recruitment-jobs.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/recruitment/recruitment-rules')
const requisition = require('../src/recruitment/requisition-requests')
const { MODULES } = require('../src/modules-registry/registry')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const refuses = (work, label) => assert.throws(work, error => error?.getStatus?.() === 400, label)

test('RU-01: openings, the salary range, the start date, texts, status transitions and what publishing needs', () => {
  assert.deepEqual([rules.cleanOpenings(1), rules.cleanOpenings('25'), rules.cleanOpenings(' 7 '), rules.cleanOpenings(1000)], [1, 25, 7, 1000])
  for (const bad of [0, -1, 1001, 1.5, '1.5', 'كتير', '', null, undefined, true]) refuses(() => rules.cleanOpenings(bad), `openings ${String(bad)}`)
  // نطاق الراتب: اختياري، نصين بخانتين، و«إلى» مش أقل من «من»
  assert.deepEqual(rules.cleanSalaryRange(undefined, null), { salaryFrom: null, salaryTo: null })
  assert.deepEqual(rules.cleanSalaryRange(7000, '9000.5'), { salaryFrom: '7000.00', salaryTo: '9000.50' })
  assert.deepEqual(rules.cleanSalaryRange('', 8000), { salaryFrom: null, salaryTo: '8000.00' })
  assert.deepEqual(rules.cleanSalaryRange(5000, 5000), { salaryFrom: '5000.00', salaryTo: '5000.00' })
  for (const [from, to] of [[9000, 7000], [-1, 5], ['12.345', null], ['abc', null], [null, '1e5'], [1e12, null], [NaN, null], [{}, null]]) {
    refuses(() => rules.cleanSalaryRange(from, to), `salary ${String(from)}..${String(to)}`)
  }
  assert.deepEqual([rules.cleanStartDate('2026-12-01'), rules.cleanStartDate(''), rules.cleanStartDate(null), rules.cleanStartDate(undefined)], ['2026-12-01', null, null, null])
  for (const bad of ['2026-02-31', '2026-13-01', '01-12-2026', 'بكرة', 20261201]) refuses(() => rules.cleanStartDate(bad), `date ${String(bad)}`)
  assert.equal(rules.cleanJobText('  سطر أول\r\n\r\nسطر تاني  ', 4000, 'وصف الوظيفة'), 'سطر أول\n\nسطر تاني')
  assert.deepEqual([rules.cleanJobText('   ', 10, 'x'), rules.cleanJobText(null, 10, 'x'), rules.cleanJobText(undefined, 10, 'x')], [null, null, null])
  refuses(() => rules.cleanJobText('و'.repeat(11), 10, 'وصف الوظيفة'), 'طويل')
  refuses(() => rules.cleanJobText(7, 10, 'وصف الوظيفة'), 'مش نص')
  assert.deepEqual([rules.jobCode(7), rules.jobCode(12345), rules.normalJobTitle('  مندوب   مبيعات '), rules.normalJobTitle(5)], ['J-0007', 'J-12345', 'مندوب مبيعات', ''])
  // الانتقالات: مسودة ← منشورة/مقفولة، منشورة ↔ موقوفة، والمقفولة نهائية
  const allowed = []
  for (const from of ['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED']) for (const to of ['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED']) if (rules.jobStatusAllowed(from, to)) allowed.push(`${from}>${to}`)
  assert.deepEqual(allowed, ['DRAFT>PUBLISHED', 'DRAFT>CLOSED', 'PUBLISHED>PAUSED', 'PUBLISHED>CLOSED', 'PAUSED>PUBLISHED', 'PAUSED>CLOSED'])
  assert.equal(rules.jobStatusRefusal('CLOSED', 'PUBLISHED'), rules.RECRUITMENT_JOB_CLOSED)
  assert.equal(rules.jobStatusRefusal('DRAFT', 'PAUSED'), 'الوظيفة مسودة: ماتتحوّلش لـ«موقوفة»')
  assert.deepEqual([rules.publishable({ description: 'وصف وظيفة كافي', internal: true, external: false }), rules.publishable({ description: 'قصير', internal: true }),
    rules.publishable({ description: 'وصف وظيفة كافي', internal: false, external: false }), rules.publishable({ description: null, external: true }),
    rules.publishable({ description: 'وصف وظيفة كافي', internal: false, external: true })], [true, false, false, false, true])
  // حقول نموذج الطلب: حقول الوجهة أولًا، وحقول الباني بتتزوّد عليها، ومفاتيح الخادم مش حقول
  const fields = requisition.requisitionFields(['محاسب'], { requiredFields: JSON.stringify(['neededBy', 'vacancyDepartmentId']),
    customFields: JSON.stringify([{ key: 'neededBy', label: 'مطلوب قبل', type: 'date' }, { key: 'vacancyTitle', label: 'مزوّر' }, { key: 'vacancyDepartment', label: 'مزوّر' }]) })
  assert.deepEqual(JSON.parse(fields.requiredFields), ['vacancyTitle', 'openings', 'reason', 'neededBy'])
  assert.deepEqual(JSON.parse(fields.customFields).map(field => field.key), ['vacancyTitle', 'openings', 'reason', 'salaryFrom', 'salaryTo', 'startDate', 'neededBy'])
  assert.deepEqual(JSON.parse(fields.customFields)[0], { key: 'vacancyTitle', label: 'المسمى الوظيفي المطلوب', type: 'select', required: true, options: ['محاسب'] })
  assert.deepEqual([requisition.REQUISITION_HANDLER, requisition.REQUISITION_TYPE, [...requisition.REQUISITION_STAGED_KEYS]],
    ['recruitment_requisition', 'RECRUITMENT_REQUISITION', ['vacancyDepartmentId', 'vacancyDepartment']])
})

test('RU-02: the destination is wired at its seven points, runs with the transaction manager only, and the service is scoped and writes fields', () => {
  const module = MODULES.recruitment
  assert.deepEqual([module.requestTypes, module.requestHandlers, module.routes.includes('/recruitment/jobs'), module.permissions], [['RECRUITMENT_REQUISITION'], ['recruitment_requisition'], true, ['candidates.manage', 'candidates.approve_offers']])
  const requests = read('api/src/requests/requests.service.ts')
  assert.match(requests, /\[REQUISITION_HANDLER\]: \[\.\.\.REQUISITION_CLIENT_KEYS, \.\.\.REQUISITION_STAGED_KEYS\]/)
  assert.match(requests, /\.\.\.\(t\.destinationHandler === REQUISITION_HANDLER \? requisitionFields\(vacancyTitles, t\) : \{\}\)/)
  assert.match(requests, /if \(type\.destinationHandler === REQUISITION_HANDLER\) req\.payload = JSON\.stringify\(await stageRequisition\(em, req\)\)/)
  assert.match(read('api/src/requests/destinations.service.ts'), /\[REQUISITION_HANDLER\]: executeRequisition,/)
  assert.match(read('api/src/settings/settings.controller.ts'), /\{ key: 'recruitment_requisition', labelAr: 'احتياج توظيف \(وظيفة شاغرة جديدة\)' \}/)
  assert.match(read('api/src/seed/requests-seed.data.ts'), /code: 'RECRUITMENT_REQUISITION', nameAr: 'احتياج توظيف', category: 'employment_status', chain: 'CHAIN_HR_EXEC', handler: 'recruitment_requisition'/)
  assert.match(read('api/src/app.module.ts'), /    RecruitmentModule,\n/)
  // التنفيذ: مفيش خدمة (مدير المعاملة بس)، ووظيفة الطلب مرة واحدة، وصف القسم المتثبّت مقفول قبل الحفظ
  const handler = read('api/src/recruitment/requisition-requests.ts')
  assert.doesNotMatch(handler, /Service\b|this\./, 'دوال بمدير المعاملة بس')
  const execute = handler.slice(handler.indexOf('export async function executeRequisition('))
  const order = ["jobs.findOne({ where: { requestId: req.id } })", 'await requisitionValues(em, payload)', "lock: { mode: 'pessimistic_write' }", 'await jobs.save(jobs.create({'].map(part => execute.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  assert.match(execute, /if \(!department \|\| department\.branchId !== req\.branchId\) throw new BadRequestException\(REQUISITION_UNIT_GONE\)/)
  assert.match(execute, /status: 'DRAFT', internal: true, external: false, requestId: req\.id, createdByUserId: 0/)
  // الخدمة: برّه النطاق = غير موجودة، والتعديل والحالة تحت قفل الصف وبالخانات
  const service = read('api/src/recruitment/recruitment-jobs.service.ts')
  assert.match(service, /if \(!row \|\| !inBranchScope\(branchScopeOf\(user\), row\.branchId\)\) throw new NotFoundException\('الوظيفة غير موجودة'\)/)
  assert.equal(service.split('await this.scoped(em, user, id, true)').length - 1, 2, 'التعديل وتغيير الحالة تحت قفل الصف')
  assert.match(service, /if \(Object\.keys\(patch\)\.length\) await em\.getRepository\(RecruitmentJob\)\.update\(\{ id: row\.id \}, patch\)/)
  assert.doesNotMatch(service, /\.save\(row\)/, 'مفيش حفظ للكيان كله')
  assert.match(service, /const unit = department && department\.branchId === row\.branchId \? department : null/, 'اسم القسم بفرعه الحالي')
  const controller = read('api/src/recruitment/recruitment-jobs.controller.ts')
  assert.match(controller, /@RequireModule\('recruitment'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Perm\('candidates\.manage'\)\n@Controller\('recruitment\/jobs'\)/)
  const entity = read('api/src/recruitment/recruitment-job.entity.ts')
  assert.doesNotMatch(entity, /default:|CreateDateColumn/, 'من غير افتراضي (زي الترحيل)')
})
