// B5.1 (ب) — دورة الزيادات: قواعد المبلغ والخطوات والميزانية، ومصدر الكود. حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/compensation/compensation-cycles')
const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')

test('CCU-01: مبلغ الزيادة — رقم من صفر بمنزلتين بالكتير ومن غير تقريب صامت؛ والملاحظة بحدها وسبب التعديل مطلوب', () => {
  assert.deepEqual([0, 500, 500.5, 500.55, 0.01, 9999999.99].map(rules.raiseAmount), [0, 500, 500.5, 500.55, 0.01, 9999999.99])
  assert.deepEqual([-1, 500.555, 10000000, '500', NaN, Infinity, null, undefined, true].map(rules.raiseAmount), [null, null, null, null, null, null, null, null, null])
  assert.deepEqual([rules.raiseNote(' أداء ممتاز ', false), rules.raiseNote('', false), rules.raiseNote(undefined, false), rules.raiseNote(null, false)],
    [{ note: 'أداء ممتاز', error: null }, { note: null, error: null }, { note: null, error: null }, { note: null, error: null }])
  assert.deepEqual([rules.raiseNote('  ', true).error, rules.raiseNote(undefined, true).error, rules.raiseNote(5, false).error, rules.raiseNote('ن'.repeat(501), false).error],
    ['اكتب سبب التعديل', 'اكتب سبب التعديل', 'الملاحظة نص', 'الملاحظة 500 حرف بالكتير'])
})

test('CCU-02: الدورة — الاسم والشهر، وخطواتها من حالة لحالة، والمدير بيقترح والدورة مفتوحة بس', () => {
  assert.deepEqual(rules.cycleFields({ name: ' زيادات 2027 ', effectivePayrollPeriod: '2027-01', note: ' سنوية ' }), { fields: { name: 'زيادات 2027', effectivePayrollPeriod: '2027-01', note: 'سنوية' }, error: null })
  assert.deepEqual([{ effectivePayrollPeriod: '2027-01' }, { name: 'س'.repeat(121), effectivePayrollPeriod: '2027-01' }, { name: 'دورة', effectivePayrollPeriod: '2027-13' }, { name: 'دورة', effectivePayrollPeriod: '0000-01' },
    { name: 'دورة', effectivePayrollPeriod: '2027-1' }, { name: 'دورة' }, null].map(body => rules.cycleFields(body).fields), [null, null, null, null, null, null, null])
  assert.deepEqual(Object.entries(rules.CYCLE_STEPS).map(([step, rule]) => [step, rule.from, rule.to]),
    [['open', ['DRAFT'], 'OPEN'], ['review', ['OPEN'], 'REVIEW'], ['reopen', ['REVIEW'], 'OPEN'], ['cancel', ['DRAFT', 'OPEN', 'REVIEW'], 'CANCELLED']])
  assert.deepEqual(['open', 'cancel', 'approve', 'toString', '', 5].map(rules.cycleStepOf), ['open', 'cancel', null, null, null, null])
  assert.deepEqual([rules.PROPOSE_STATUSES, rules.ADJUST_STATUSES, rules.BUDGET_STATUSES], [['OPEN'], ['OPEN', 'REVIEW'], ['DRAFT', 'OPEN', 'REVIEW']])
  assert.deepEqual(Object.keys(rules.CYCLE_STATUS_LABELS), ['DRAFT', 'OPEN', 'REVIEW', 'APPROVED', 'APPLIED', 'CANCELLED'])
})

test('CCU-03: الميزانية — الباقي و«عدّت» (تحذير)، وميزانية الوحدة بتغطي اللي تحتها', () => {
  assert.deepEqual([rules.budgetUsage(1000, 400), rules.budgetUsage(1000, 1000), rules.budgetUsage(1000, 1000.01), rules.budgetUsage(0, 0)],
    [{ budget: 1000, used: 400, remaining: 600, over: false }, { budget: 1000, used: 1000, remaining: 0, over: false }, { budget: 1000, used: 1000.01, remaining: -0.01, over: true },
      { budget: 0, used: 0, remaining: 0, over: false }])
  const parentOf = new Map([[1, null], [2, 1], [3, 2], [7, 8], [8, 7]])
  assert.deepEqual([rules.coveringUnits(3, parentOf), rules.coveringUnits(1, parentOf), rules.coveringUnits(null, parentOf), rules.coveringUnits(99, parentOf), rules.coveringUnits(7, parentOf)],
    [[3, 2, 1], [1], [], [99], [7, 8]])
})

test('CCU-04: مصدر الكود — مفيش راتب بيتكتب، والكتابة تحت قفل الدورة ثم الموظف، وورقة المدير من غير أرقام راتب، والصلاحيات', () => {
  const service = read('compensation/compensation-cycles.service.ts')
  // (ج) الراتب بيتكتب في مكان واحد: applyLine، ومن خدمة تاريخ الراتب القايمة بس — مفيش كتابة مباشرة على جدول الموظفين ولا سجل الراتب
  assert.doesNotMatch(service, /UPDATE \[employees\]|UPDATE dbo\.employees|getRepository\(Employee\)|INSERT INTO|employee_salary_history/i)
  assert.equal((service.match(/applyEmployeeSalaryChange\(/g) ?? []).length, 1)
  const applyLine = service.slice(service.indexOf('  private async applyLine('), service.indexOf('  // ===== ورقة المدير ====='))
  assert.ok(applyLine.includes('await applyEmployeeSalaryChange(em, {'), 'الكتابة الوحيدة في applyLine')
  assert.equal((service.match(/const cycle = await this\.lockCycle\(em, id\)/g) ?? []).length, 7, 'الخطوة والميزانية والتعديل والاقتراح والاعتماد والرجوع وقفل التطبيق تحت قفل صف الدورة')
  assert.match(service, /findOne\(\{ where: \{ id \}, lock: \{ mode: 'pessimistic_write' \} \}\)/)
  assert.match(service, /FROM \[employees\] e WITH \(UPDLOCK, ROWLOCK\) WHERE e\.\[id\] = @0/)
  for (const method of ['adjustLine', 'propose']) {
    const body = service.slice(service.indexOf(`  async ${method}(`)), cycleAt = body.indexOf('this.lockCycle(em, id)'), employeeAt = body.indexOf('this.lockEmployee(em, employeeId)')
    assert.ok(cycleAt > 0 && employeeAt > cycleAt, `${method}: الدورة ثم الموظف`)
  }
  assert.match(service, /if \(!employee \|\| employee\.id === me \|\| employee\.managerEmployeeId !== me \|\| !employee\.active\) throw new NotFoundException\(NOT_IN_TEAM\)/)
  assert.match(service, /if \(!employee \|\| !inBranchScope\(branchScopeOf\(user\), employee\.branchId\)\) throw new NotFoundException\(EMPLOYEE_NOT_FOUND\)/)
  const myTeam = service.slice(service.indexOf('  async myTeam('), service.indexOf('  /** اقتراح المدير'))
  assert.doesNotMatch(myTeam, /basicSalary|currentBasic|finalAmount|newBasic|percent/, 'ورقة المدير: المبلغ اللي كتبه بس')
  assert.match(service, /currentBasic: salaries \? basic : null, newBasic: salaries \? round2\(basic \+ final\) : null/)
  const controller = read('compensation/compensation.controller.ts')
  assert.deepEqual([(controller.match(/@Perm\('compensation\.manage'\)/g) ?? []).length, (controller.match(/@Perm\('payroll\.view'\)/g) ?? []).length,
    (controller.match(/@(Get|Post|Put|Patch|Delete)\(/g) ?? []).length, /@Delete\(/.test(controller)], [6, 1, 12, false])
  assert.equal((controller.match(/@Perm\('payroll\.approve'\)/g) ?? []).length, 3, 'الاعتماد والرجوع والتطبيق بصلاحية اعتماد المسير')
  assert.match(controller, /@RequireModule\('compensation'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)/)
  assert.match(read('modules-registry/registry.ts'), /routes: \['\/compensation', '\/compensation\/\*', '\/my\/raises'\]/)
})

test('CCU-05: الاعتماد من حد ماقترحش، والأساسي الجديد بالقروش، ومرجع الدورة، وترتيب أقفال التطبيق', () => {
  const lines = [{ proposedByUserId: 5, adjustedByUserId: null, finalAmount: '300.00' }, { proposedByUserId: 6, adjustedByUserId: 7, finalAmount: 0 }]
  assert.deepEqual([rules.approverIssue({ reviewByUserId: 9 }, lines, 9), rules.approverIssue({ reviewByUserId: 9 }, lines, 5), rules.approverIssue({ reviewByUserId: 9 }, lines, 7),
    rules.approverIssue({ reviewByUserId: 9 }, lines, 8), rules.approverIssue({ reviewByUserId: null }, lines, 8)],
  [rules.APPROVER_SENT_REVIEW, rules.APPROVER_WROTE_LINE, rules.APPROVER_WROTE_LINE, null, null])
  assert.deepEqual([rules.approverIssue({ reviewByUserId: 9 }, [], 8), rules.approverIssue({ reviewByUserId: 9 }, [{ proposedByUserId: 5, adjustedByUserId: null, finalAmount: 0 }], 8)], [rules.APPROVE_NO_LINES, rules.APPROVE_NO_LINES])
  assert.deepEqual([rules.raisedBasic('5000.00', 300), rules.raisedBasic('5000.10', '0.20'), rules.raisedBasic(1234.56, 0.01), rules.raisedBasic('0.00', 9999999.99)], ['5300.00', '5000.30', '1234.57', '9999999.99'])
  assert.deepEqual([rules.sameBasic('5000.00', 5000), rules.sameBasic('5000.00', '5000.01'), rules.sameBasic(5000.1, '5000.10')], [true, false, true])
  assert.equal(rules.cycleEvidenceReference(42), 'COMP-CYCLE-42')
  const service = read('compensation/compensation-cycles.service.ts')
  const applyLine = service.slice(service.indexOf('  private async applyLine('), service.indexOf('  // ===== ورقة المدير ====='))
  const order = ['this.lockCycle(em, cycleId)', "lock: { mode: 'pessimistic_write' }", 'this.lockEmployee(em, line.employeeId)', 'sameBasic(current.current.basicSalary, line.currentBasic)', 'await applyEmployeeSalaryChange(em, {', 'appliedAt: new Date()']
  assert.deepEqual(order.map(text => applyLine.indexOf(text) > 0), order.map(() => true))
  assert.deepEqual([...order].sort((a, b) => applyLine.indexOf(a) - applyLine.indexOf(b)), order, 'الدورة ثم السطر ثم الموظف ثم الحكم ثم الكتابة ثم علامة التطبيق')
  assert.match(service, /if \(!userHasPerm\(user, 'employees\.edit'\)\) throw new ForbiddenException\(APPLY_NEEDS_EDIT\)/)
  assert.equal((service.match(/assertCompanyWideWrite\(user\)/g) ?? []).length, 5, 'الإنشاء والتحريك والاعتماد والرجوع والتطبيق لحساب بكل الفروع')
})
