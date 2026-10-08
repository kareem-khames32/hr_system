'use strict'
// B3.11: ملفات القضايا — فحص من غير قاعدة (الدورة الفعلية في cases.integration.cjs):
//  CU-11) القواعد: العنوان والنوع والنص وأدوار الأطراف وأنواع الأحداث والنتيجة، ومهلة الاعتراض من إعدادها، وتعارض المصالح.
//  CU-12) الربط: موديول جديد مقفول بصلاحيته ووجهة طلبه، والاطلاع بعضوية القضية تحت قفل صفها، وتعارض المصالح جوه المعاملة، والقرار بشرطه،
//         والاعتراض للمشكو في حقه بس، والمسارات.
// Run (من api/): node --test test/cases.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/cases/case-rules')
const { MODULES } = require('../src/modules-registry/registry')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const refuses = (work, label) => assert.throws(work, error => error?.getStatus?.() === 400, label)

test('CU-11: case values, the objection window from its setting, and the conflict of interest', () => {
  assert.deepEqual([rules.cleanCaseTitle('  شكوى   سوء معاملة '), rules.cleanCaseKind('VIOLATION'), rules.cleanCaseText(' نص\r\nسطر '), rules.cleanCaseText(undefined, false), rules.cleanCaseText('  ', false)],
    ['شكوى سوء معاملة', 'VIOLATION', 'نص\nسطر', null, null])
  for (const bad of ['اب', '', null, 'ع'.repeat(201)]) refuses(() => rules.cleanCaseTitle(bad), 'title')
  for (const bad of ['complaint', 'X', null]) refuses(() => rules.cleanCaseKind(bad), 'kind')
  for (const bad of ['', '   ', null, 5, 'ن'.repeat(10001)]) refuses(() => rules.cleanCaseText(bad), 'text')
  assert.deepEqual(['COMPLAINANT', 'RESPONDENT', 'WITNESS'].map(role => rules.cleanPartyRole(role)), ['COMPLAINANT', 'RESPONDENT', 'WITNESS'])
  for (const bad of ['HANDLER', 'JUDGE', null]) refuses(() => rules.cleanPartyRole(bad), 'role ' + String(bad))
  assert.deepEqual(['NOTE', 'STATEMENT', 'EVIDENCE', 'SESSION', 'NOTICE', 'DEFENSE'].map(kind => rules.cleanEventKind(kind)), ['NOTE', 'STATEMENT', 'EVIDENCE', 'SESSION', 'NOTICE', 'DEFENSE'])
  for (const bad of ['DECISION', 'OBJECTION', 'STATUS', 'x', null]) refuses(() => rules.cleanEventKind(bad), 'event ' + String(bad))
  assert.deepEqual(['DISMISSED', 'WARNING', 'PENALTY', 'TERMINATION'].map(outcome => rules.cleanCaseOutcome(outcome)), ['DISMISSED', 'WARNING', 'PENALTY', 'TERMINATION'])
  refuses(() => rules.cleanCaseOutcome('JAIL'), 'outcome')
  assert.deepEqual([5, '5', 0, -1, 2.5, null].map(raw => rules.cleanCaseId(raw)), [5, null, null, null, null, null])
  assert.deepEqual(['30', '0', '90', '91', '-1', '2.5', 'x', '', null, undefined].map(raw => rules.objectionDays(raw)), [30, 0, 90, 7, 7, 7, 7, 0, 0, 7])
  // تعارض المصالح: المشكو في حقه نفسه، أو مديره المباشر
  const respondents = [{ id: 10, managerEmployeeId: 20 }, { id: 11, managerEmployeeId: null }]
  assert.deepEqual([[10], [20], [11], [30], [null, undefined], [30, 20], []].map(handlers => rules.caseConflict(respondents, handlers)), [true, true, true, false, false, true, false])
  assert.equal(rules.caseConflict([], [10, 20]), false)
})

test('CU-12: a new closed module with its permission and request destination, access by case membership under the row lock, the conflict judged inside the transaction, the decision conditions, the objection, and the routes', () => {
  const module = MODULES.cases
  assert.deepEqual([module.defaultEnabled, module.permissions, module.requestHandlers, module.dependsOn], [false, ['cases.investigate', 'cases.penalties'], ['case_open'], ['employees']])
  const { PERMISSIONS, PERMISSION_MODULES, ROLE_PRESETS } = require('../src/auth/permissions')
  assert.deepEqual(['cases.investigate' in PERMISSIONS, PERMISSION_MODULES.find(unit => unit.key === 'cases').permissions, ROLE_PRESETS.find(role => role.code === 'hr_manager').permissions.includes('cases.investigate'),
    ROLE_PRESETS.find(role => role.code === 'employee').permissions.includes('cases.investigate')], [true, ['cases.investigate', 'cases.penalties'], true, false])
  const service = read('api/src/cases/cases.service.ts')
  // العضوية هي الباب الوحيد لملف القضية: مفيش قراءة لقضية من غير handled، ولا استثناء بصلاحية أو بدور
  const handled = service.slice(service.indexOf('private async handled('), service.indexOf('/** موظف في نطاق فروع الحساب'))
  assert.match(handled, /count\(\{ where: \{ caseId: id, role: 'HANDLER', userId: user\.sub \} \}\)\)\) throw new NotFoundException\(CASE_NOT_FOUND\)/)
  assert.doesNotMatch(handled, /userHasPerm|super_admin|role ===/, 'لا صلاحية ولا دور بيفتح ملف القضية')
  const detail = service.slice(service.indexOf('async detail('), service.indexOf('/** إجراء مطّلع على قضية'))
  assert.match(detail, /const row = await this\.handled\(em, user, id\)/)
  assert.match(service, /private async act\([^\n]*\) \{\n\s+await this\.ds\.transaction\(async \(em\) => work\(em, await this\.handled\(em, user, id, true\)\)\)/, 'كل إجراء تحت قفل صف القضية وبعضويتها')
  assert.equal(service.split('this.act(user, id,').length - 1, 5, 'المطّلع والطرف والحدث والقرار والإقفال من نفس المكان')
  assert.equal(service.split('await this.assertNoConflict(em,').length - 1, 3, 'التعارض بيتحكم عند الفتح وإضافة مطّلع وإضافة طرف — جوه المعاملة')
  const decide = service.slice(service.indexOf('decide(user: JwtPayload'), service.indexOf('close(user: JwtPayload'))
  const order = ['cleanCaseOutcome(input.outcome)', "row.status === 'CLOSED'", '!row.investigatorUserId', "outcome !== 'DISMISSED'", "!kinds.has('NOTICE') || !kinds.has('DEFENSE')", "status: 'DECIDED'", "this.event(em, row.id, 'DECISION'"].map(part => decide.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  const object = service.slice(service.indexOf('async object('))
  const objectOrder = ["lock: { mode: 'pessimistic_write' }", "role: 'RESPONDENT', employeeId: user.employeeId", "kind: 'NOTICE'", 'CASE_NOT_DECIDED', 'CASE_OBJECTION_LATE', 'CASE_OBJECTED', "this.event(em, id, 'OBJECTION'"].map(part => object.indexOf(part))
  assert.ok(objectOrder.every((at, index) => at > 0 && (index === 0 || at > objectOrder[index - 1])), JSON.stringify(objectOrder))
  const mine = service.slice(service.indexOf('async mine('), service.indexOf('/** اعتراض المشكو في حقه'))
  assert.match(mine, /if \(!complainant && \(!respondent \|\| !notices\.length\)\) continue/, 'المشكو في حقه من غير إخطار مش شايف القضية')
  assert.match(mine, /title: complainant \? row\.title : null/, 'والعنوان للشاكي بس')
  assert.doesNotMatch(service, /\.save\(|\.delete\(|getRepository\(HrCaseEvent\)\.update/, 'الخط الزمني بيتزوّد بس')
  const controller = read('api/src/cases/cases.controller.ts')
  assert.match(controller, /@RequireModule\('cases'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Controller\('cases'\)/)
  assert.equal(controller.split("@Perm('cases.investigate')").length - 1, 1, 'الصلاحية لفتح قضية يدويًا بس')
  assert.ok(controller.indexOf("@Get('mine')") < controller.indexOf("@Get(':id')"), 'المسار الثابت قبل ‎:id')
  // وجهة الطلب: ملف واحد للطلب، والمعتمدين أول المطّلعين، ومن غير معتمد مفيش ملف يتيم
  const link = read('api/src/cases/case-requests.ts')
  const linkOrder = ['findOne({ where: { requestId: req.id } })', 'FROM [request_approvals] WHERE [requestId] = @0', 'if (!approvers.length) throw new BadRequestException(CASE_REQUEST_NO_APPROVER)', 'getRepository(HrCase).insert(',
    "role: 'HANDLER' as const", "role: 'COMPLAINANT' as const"].map(part => link.indexOf(part))
  assert.ok(linkOrder.every((at, index) => at > 0 && (index === 0 || at > linkOrder[index - 1])), JSON.stringify(linkOrder))
  assert.match(read('api/src/requests/destinations.service.ts'), /\[CASE_REQUEST_HANDLER\]: executeCaseRequest,/)
  assert.match(read('api/src/settings/settings.controller.ts'), /\{ key: 'case_open', labelAr: 'فتح ملف قضية \(شكوى أو تظلم أو بلاغ\)' \}/)
  assert.doesNotMatch(read('api/src/cases/case.entities.ts'), /default:|CreateDateColumn/, 'من غير افتراضي (زي الترحيلات)')
})

test('CU-13: case attachments by membership (upload, one-time conditional attach under the case lock, download by the case rule) and the real screens', () => {
  const service = read('api/src/cases/cases.service.ts')
  const canUpload = service.slice(service.indexOf('async assertCanUpload('), service.indexOf('/** تحميل مرفق قضية'))
  assert.match(canUpload, /this\.modules\.allowedFor\('cases', user\)/)
  assert.match(canUpload, /count\(\{ where: \{ role: 'HANDLER', userId: user\.sub \} \}\)/, 'الرفع للمطّلع على قضية بس')
  const access = service.slice(service.indexOf('async assertFileAccess('), service.indexOf('/** ربط مرفق بقضية'))
  assert.match(access, /if \(!file\.entityId\) \{\n\s+if \(!!user\.sub && file\.uploadedBy === user\.sub\) return\n\s+throw missing/, 'قبل الربط لرافعه بس')
  assert.match(access, /count\(\{ where: \{ caseId: file\.entityId, role: 'HANDLER', userId: user\.sub \} \}\)\)\) throw missing/, 'بعده بعضوية القضية')
  assert.doesNotMatch(access, /userHasPerm|super_admin/, 'لا صلاحية ولا دور بيفتح المرفق')
  assert.match(service, /where\('id = :id AND entityType = :type AND entityId IS NULL AND uploadedBy = :user', \{ id, type: 'case', user: user\.sub \}\)/, 'ربط مشروط: مرة واحدة ولرافعه')
  const files = read('api/src/files/files.controller.ts')
  assert.match(files, /if \(entityType === 'case'\) \{\n\s+if \(entityId !== undefined \|\| employeeId !== undefined\) throw new BadRequestException\('مرفق القضية بيترفع من غير رقم كيان أو موظف'\)\n\s+await this\.cases\.assertCanUpload\(user\)/)
  assert.match(files, /\} else if \(f\.entityType === 'case'\) \{\n[^\n]*\n\s+await this\.cases\.assertFileAccess\(user, f\)/)
  assert.match(files, /entityType === 'policy' \|\| entityType === 'announcement' \|\| entityType === 'case' \? undefined :/, 'مرفق القضية مش تبع موظف')
  assert.deepEqual(MODULES.cases.routes, ['/cases', '/cases/penalties', '/cases/*'])
  assert.ok(read('src/app/cases/page.tsx').includes('fetchHandledCases()') && read('src/app/cases/[id]/page.tsx').includes('fetchCaseFile(id)'))
  assert.doesNotMatch(read('src/app/cases/[id]/page.tsx'), /window\.(prompt|confirm|alert)/)
})

test('CU-14: the penalties catalog steps, the step for a repetition, the counting window, and applying under the employee row lock with the deduction created through the typed-deductions service outside the transaction', () => {
  const penalties = require('../src/cases/penalties.service')
  assert.deepEqual(penalties.cleanPenaltySteps([{ action: 'WARNING' }, { action: 'DEDUCT_DAYS', days: 0.25 }, { action: 'SUSPENSION', days: 3 }, { action: 'TERMINATION', days: null }]),
    [{ action: 'WARNING', days: null }, { action: 'DEDUCT_DAYS', days: 0.25 }, { action: 'SUSPENSION', days: 3 }, { action: 'TERMINATION', days: null }])
  for (const bad of [[], 'x', null, Array(5).fill({ action: 'WARNING' }), [{ action: 'FINE' }], [{ action: 'DEDUCT_DAYS' }], [{ action: 'DEDUCT_DAYS', days: 0.3 }], [{ action: 'DEDUCT_DAYS', days: 31 }], [{ action: 'DEDUCT_DAYS', days: '2' }],
    [{ action: 'SUSPENSION', days: 1.5 }], [{ action: 'WARNING', days: 1 }], [null]]) refuses(() => penalties.cleanPenaltySteps(bad), JSON.stringify(bad).slice(0, 50))
  const steps = [{ action: 'WARNING', days: null }, { action: 'DEDUCT_DAYS', days: 2 }]
  // اللي بعد آخر درجة بياخد آخر درجة
  assert.deepEqual([1, 2, 3, 9, 0].map(occurrence => penalties.penaltyStepFor(steps, occurrence).action), ['WARNING', 'DEDUCT_DAYS', 'DEDUCT_DAYS', 'DEDUCT_DAYS', 'WARNING'])
  assert.equal(penalties.penaltyStepFor([], 1), null)
  assert.deepEqual(['90', '1', '3650', '0', '3651', '2.5', 'x', null, undefined].map(raw => penalties.penaltyWindowDays(raw)), [90, 1, 3650, 180, 180, 180, 180, 180, 180])
  assert.deepEqual([penalties.occurrenceLabel(1), penalties.occurrenceLabel(4), penalties.occurrenceLabel(6), penalties.penaltyLabel(steps[0]), penalties.penaltyLabel(steps[1])],
    ['التكرار الأول', 'التكرار الرابع', 'التكرار رقم 6', 'إنذار كتابي', 'خصم أيام (2 يوم)'])
  assert.deepEqual(penalties.parsePenaltySteps('تالف'), [])
  const service = read('api/src/cases/penalties.service.ts')
  const apply = service.slice(service.indexOf('async apply('), service.indexOf('// ===== السجل ====='))
  const order = ['this.assertManager(user)', 'this.ds.transaction(', 'await this.target(em, user, input)', "getRepository(Employee).findOne({ where: { id: employee.id }, lock: { mode: 'pessimistic_write' } })", 'await this.judge(em, employee.id, violation, incidentDate)',
    'input.expectedOccurrence !== occurrence', 'await this.caseOf(em, user, input.caseId, employee.id)', 'getRepository(EmployeePenalty).insert(', 'await this.deductions.create(user,', "where('id = :id AND deductionRequestId IS NULL'", 'throw error',
    'update({ id: made.id }, { deductionRequestId: deduction.id })', 'getRepository(HrCaseEvent).insert('].map(part => apply.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  const transaction = apply.slice(apply.indexOf('this.ds.transaction('), apply.indexOf("if (made.step.action === 'DEDUCT_DAYS')"))
  assert.doesNotMatch(transaction, /this\.deductions\./, 'خدمة الخصومات برّه المعاملة')
  assert.doesNotMatch(service, /EmployeeObligation|obligation/i, 'مفيش قيد بيتكتب من هنا: الخصم بسلسلته ودفتره')
  const caseOf = service.slice(service.indexOf('private async caseOf('), service.indexOf('/**\n   * توقيع جزاء'))
  assert.match(caseOf, /entry\.role === 'HANDLER' && entry\.userId === user\.sub\) && parties\.some\(\(entry\) => entry\.role === 'RESPONDENT' && entry\.employeeId === employeeId\)/)
  const controller = read('api/src/cases/penalties.controller.ts')
  assert.match(controller, /@RequireModule\('cases'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Controller\('penalties'\)/)
  assert.equal(controller.split("@Perm('cases.penalties')").length - 1, 7, 'اللائحة والسجل والمعاينة والتوقيع والإلغاء بالصلاحية')
  assert.ok(controller.indexOf("@Get('mine')") > 0 && controller.indexOf("@Post('preview')") < controller.indexOf("@Post(':id/cancel')"))
  assert.match(read('api/src/payroll/payroll.module.ts'), /exports: \[BonusesService, TypedDeductionsService\]/)
  assert.ok(read('src/app/cases/penalties/page.tsx').includes('previewPenalty(target())'))
})
