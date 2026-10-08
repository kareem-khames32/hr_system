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
  assert.doesNotMatch(service, /applyEmployeeSalaryChange|UPDATE \[employees\]|getRepository\(Employee\)|salary_history/i, 'الجزء (ب) مابيغيّرش راتب')
  assert.equal((service.match(/const cycle = await this\.lockCycle\(em, id\)/g) ?? []).length, 4, 'الخطوة والميزانية والتعديل والاقتراح تحت قفل صف الدورة')
  assert.match(service, /findOne\(\{ where: \{ id \}, lock: \{ mode: 'pessimistic_write' \} \}\)/)
  assert.match(service, /FROM \[employees\] e WITH \(UPDLOCK, ROWLOCK\) WHERE e\.\[id\] = @0/)
  for (const method of ['adjustLine', 'propose']) {
    const body = service.slice(service.indexOf(`  async ${method}(`)), cycleAt = body.indexOf('this.lockCycle(em, id)'), employeeAt = body.indexOf('this.lockEmployee(em, employeeId)')
    assert.ok(cycleAt > 0 && employeeAt > cycleAt, `${method}: الدورة ثم الموظف`)
  }
  assert.match(service, /if \(!employee \|\| employee\.id === me \|\| employee\.managerEmployeeId !== me \|\| !employee\.active\) throw new NotFoundException\(NOT_IN_TEAM\)/)
  assert.match(service, /if \(!employee \|\| !inBranchScope\(branchScopeOf\(user\), employee\.branchId\)\) throw new NotFoundException\(EMPLOYEE_NOT_FOUND\)/)
  assert.equal((service.match(/assertCompanyWideWrite\(user\)/g) ?? []).length, 2, 'فتح الدورة وتحريكها لحساب بكل الفروع')
  const myTeam = service.slice(service.indexOf('  async myTeam('), service.indexOf('  /** اقتراح المدير'))
  assert.doesNotMatch(myTeam, /basicSalary|currentBasic|finalAmount|newBasic|percent/, 'ورقة المدير: المبلغ اللي كتبه بس')
  assert.match(service, /currentBasic: salaries \? basic : null, newBasic: salaries \? round2\(basic \+ final\) : null/)
  const controller = read('compensation/compensation.controller.ts')
  assert.deepEqual([(controller.match(/@Perm\('compensation\.manage'\)/g) ?? []).length, (controller.match(/@Perm\('payroll\.view'\)/g) ?? []).length,
    (controller.match(/@(Get|Post|Put|Patch|Delete)\(/g) ?? []).length, /@Delete\(/.test(controller)], [6, 1, 9, false])
  assert.match(controller, /@RequireModule\('compensation'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)/)
  assert.match(read('modules-registry/registry.ts'), /routes: \['\/compensation', '\/compensation\/\*', '\/my\/raises'\]/)
})
