// تدقيق الأدوار (ROLES_AUDIT.md): D9 كتالوج أنواع الخصم والمكافأة مفتوح لأي حساب، D11 تقارير الخصومات بلا صلاحية،
// D6 الرد بيفرّق بين سجل موجود خارج النطاق (403) وسجل غايب (404) في الخصومات والمكافآت والخطابات.
// بوابات المسارات من الميتاداتا الفعلية، وسياسة الخطابات بتشغيلها على مدير كيانات وهمي؛ لا SQL ولا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const { TypedDeductionsController } = require('../src/payroll/typed-deductions.controller')
const { BonusesController } = require('../src/payroll/bonuses.controller')
const { PERMS_KEY } = require('../src/auth/guards')
const { assertLetterAccess, assertLetterFileAccess, LETTER_NOT_FOUND, LETTER_FILE_NOT_FOUND } = require('../src/letters/letter-access')
const { Employee } = require('../src/employees/employee.entity')
const { LetterRequest } = require('../src/requests/entities/letter.entities')

const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
const permsOf = (controller, method) => Reflect.getMetadata(PERMS_KEY, controller.prototype[method]) ?? null

test('D9: الكتالوج الكامل لأنواع الخصم والمكافأة لحامل «إدارة الأنواع» بس، وقائمة نموذج الطلب مفتوحة بنطاق صاحبها', () => {
  assert.deepEqual(permsOf(TypedDeductionsController, 'types'), ['deductions.manage'])
  assert.deepEqual(permsOf(BonusesController, 'types'), ['bonuses.manage'])
  // نموذج طلب الخصم/المكافأة (DeductionRequestForm / BonusRequestForm) بياخد أنواعه وموظفيه من هنا — لازم يفضل متاح لمدير عادي بلا صلاحيات
  for (const controller of [TypedDeductionsController, BonusesController]) {
    for (const method of ['creatable', 'candidates', 'mine', 'create', 'preview', 'bulk']) {
      assert.equal(permsOf(controller, method), null, `${controller.name}.${method} يفضل بلا @Perm — الفحص بنطاق صاحبه جوه الخدمة`)
    }
    assert.equal(Reflect.getMetadata(PERMS_KEY, controller), undefined, `${controller.name} بلا @Perm على مستوى الكلاس`)
  }
  // النموذجان فعلًا مابينادوش الكتالوج الكامل
  for (const form of ['src/components/requests/DeductionRequestForm.tsx', 'src/components/requests/BonusRequestForm.tsx']) {
    const source = read(form)
    assert.doesNotMatch(source, /fetch(?:Deduction|Bonus)Types\b/, `${form} مايقراش الكتالوج الكامل`)
    assert.match(source, /fetch(?:Deduction|Bonus)Creatable\(\)/)
    assert.match(source, /fetch(?:Deduction|Bonus)Candidates\(typeId\)/)
  }
  // والمستهلك الوحيد للكتالوج الكامل هو تبويب «الأنواع» اللي بيظهر لحامل الإدارة أصلًا
  assert.match(read('src/components/payroll/TypedDeductionsWorkspace.tsx'), /tab === 'types' && canManage && <DeductionTypesPanel/)
  assert.match(read('src/components/payroll/BonusesWorkspace.tsx'), /tab === 'types' && canManage && <BonusTypesPanel/)
})

test('D11: /deductions/reports بنفس بوابة نظيره /reports/financial/deductions — مركز التقارير + عرض الرواتب', () => {
  assert.deepEqual(permsOf(TypedDeductionsController, 'reports'), ['reports.view'])
  const { FinancialReportController } = require('../src/reports/financial-report.controller')
  assert.deepEqual(Reflect.getMetadata(PERMS_KEY, FinancialReportController), ['reports.view'], 'النظير على reports.view')
  const controller = read('api/src/payroll/typed-deductions.controller.ts')
  assert.match(controller, /reports\(@CurrentUser\(\) user: JwtPayload, @Query\(\) query: DeductionReportQueryDto\) \{\n    if \(!userHasPerm\(user, 'payroll\.view'\)\) throw new ForbiddenException\(/)
  assert.match(read('api/src/reports/financial-report.controller.ts'), /if \(!userHasPerm\(user, 'payroll\.view'\)\) throw new ForbiddenException\(/)
  // البوابة بتتنفذ فعلًا: حامل reports.view بلا payroll.view مرفوض قبل ما الخدمة تتنادى
  let called = false
  const instance = new TypedDeductionsController({ reports: () => { called = true; return 'ok' } })
  assert.throws(() => instance.reports({ sub: 1, role: 'branch_manager', permissions: ['reports.view', 'deductions.view'] }, {}), error => error.getStatus() === 403)
  assert.equal(called, false)
  assert.equal(instance.reports({ sub: 1, role: 'hr_manager', permissions: ['reports.view', 'payroll.view'] }, {}), 'ok')
})

test('D6 الخصومات والمكافآت: اللي مالوش صفة على الطلب بياخد نفس رد الغايب — في العرض وفي كل إجراء على :id', () => {
  for (const [file, code, message] of [
    ['api/src/payroll/typed-deductions.service.ts', 'DEDUCTION', 'طلب الخصم غير موجود'],
    ['api/src/payroll/bonuses.service.ts', 'BONUS', 'طلب المكافأة غير موجود'],
  ]) {
    const source = read(file)
    // رد واحد معرَّف مرة واحدة، والعرض بيرميه للغايب وللخارج عن النطاق
    assert.equal(source.split(`code: '${code}_NOT_FOUND'`).length - 1, code === 'DEDUCTION' ? 2 : 1, `${file}: رد «غير موجود» من مصدر واحد (+ اعتراض الموظف في الخصومات)`)
    assert.ok(source.includes(`private notFound() { return new NotFoundException({ code: '${code}_NOT_FOUND', message: '${message}' }) }`))
    assert.match(source, /async detail\(user: JwtPayload, id: number\) \{\n    const row = await this\.requests\.findOneBy\(\{ id \}\)\n    if \(!row\) throw this\.notFound\(\)\n    const \[view\] = await this\.views\(this\.manager, user, \[row\], 'all'\)\n    if \(!view\) throw this\.notFound\(\)/)
    assert.ok(!source.includes('خارج نطاق صلاحيتك\' })'), `${file}: رد 403 القديم للعرض اتشال`)
    // الإجراءات: فحص الصفة قبل فحص النسخة والحالة (D12 لنفس المسارات)
    const locked = source.slice(source.indexOf('private async lockedRequest('))
    assert.ok(locked.indexOf('throw this.notFound()') < locked.indexOf('_REVISION_CHANGED'), 'الغريب بياخد «غير موجود» قبل 409 النسخة')
    assert.match(locked, /if \(actor && !this\.knows\(actor, row, /)
    const actions = code === 'DEDUCTION' ? ['approve', 'reject', 'withdraw', 'cancel', 'reverse'] : ['approve', 'reject', 'withdraw', 'cancel', 'reverse']
    for (const action of actions) {
      const body = source.slice(source.indexOf(`  async ${action}(user: JwtPayload, id: number`))
      assert.match(body.slice(0, body.indexOf('\n  }\n')), /this\.lockedRequest\(em, id, dto\.expectedRevision, user\)/, `${file}: ${action} بيمرّر صاحب الإجراء`)
    }
  }
  const deductions = read('api/src/payroll/typed-deductions.service.ts')
  assert.match(deductions, /async respondObjection[\s\S]{0,400}this\.lockedRequest\(em, id, undefined, user\)/)
  // قسط موظف فرع تاني = نفس رد القسط الغايب
  assert.match(deductions, /if \(!this\.inBranchScope\(user, employee\)\) throw missing\(\)/)
  assert.ok(!deductions.includes("message: 'الخصم خارج نطاق فرعك'"))
})

// مدير كيانات وهمي على قد اللي سياسة الخطابات بتقراه
const fakeManager = ({ employee, letter = null, revision = null }) => ({
  findOneBy: async (entity, where) => entity === Employee ? (employee && employee.id === where.id ? employee : null)
    : entity === LetterRequest ? letter : revision,
})
const statusAndMessage = async promise => {
  try { await promise; return null } catch (error) { return [error.getStatus(), error.getResponse().message] }
}

test('D6 الخطابات: خطاب موجود خارج النطاق = نفس رد الخطاب الغايب في /letters/:id/download و/files/:id', async () => {
  const employee = { id: 7, branchId: 10 }
  const experience = { id: 3, employeeId: 7, requestId: 50, letterType: 'EXPERIENCE', templateRevisionId: 9, generatedPdfRef: 'file:21' }
  const plain = { content: { body: 'يعمل {{employee.fullName}} لدينا' } }
  const em = fakeManager({ employee, letter: experience, revision: plain })
  const user = (over = {}) => ({ sub: 1, role: 'hr_manager', branchId: 10, employeeId: null, permissions: ['documents.manage'], ...over })

  assert.equal(await statusAndMessage(assertLetterAccess(em, user(), experience)), null, 'مسؤول مستندات فرع الموظف')
  assert.equal(await statusAndMessage(assertLetterAccess(em, user({ role: 'employee', permissions: [], employeeId: 7 }), experience)), null, 'صاحب الخطاب')
  // خارج النطاق بكل أشكاله: فرع تاني، بلا صلاحية، وحساب بلا فرع (نطاق فاضي)
  for (const outsider of [user({ branchId: 11 }), user({ permissions: [] }), user({ permissions: ['payroll.view'] }), user({ branchId: null })]) {
    assert.deepEqual(await statusAndMessage(assertLetterAccess(em, outsider, experience)), [404, LETTER_NOT_FOUND])
    assert.deepEqual(await statusAndMessage(assertLetterFileAccess(em, outsider, { id: 21, entityId: 50, employeeId: 7 })), [404, LETTER_FILE_NOT_FOUND])
  }
  assert.equal(LETTER_NOT_FOUND, 'الخطاب غير موجود')
  assert.equal(LETTER_FILE_NOT_FOUND, 'الملف غير موجود')
  // الرسالتان هما بالحرف رد الغايب في المسارين
  assert.ok(read('api/src/letters/letters.service.ts').includes('if (!letter) throw new NotFoundException(LETTER_NOT_FOUND)'))
  assert.ok(read('api/src/files/files.controller.ts').includes("if (!f) throw new NotFoundException('الملف غير موجود')"))
  // الرفض المالي جوه النطاق يفضل 403 بسببه الصريح (SEC-07) — صاحبه شايف خطابات الموظف أصلًا
  const salary = { ...experience, letterType: 'SALARY' }
  const refused = await statusAndMessage(assertLetterAccess(fakeManager({ employee, letter: salary, revision: plain }), user(), salary))
  assert.equal(refused[0], 403)
  assert.match(refused[1], /بيانات الراتب/)
})
