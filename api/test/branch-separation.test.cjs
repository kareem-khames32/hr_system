// فصل الفروع (قرار المالك 16 سبتمبر): مستخدم مقيد بفرع لا يرى ولا يعدّل بيانات فرع آخر.
// يغطي الثغرات التي أُغلقت في تدقيق النطاق: المرشحون، شاشة إعفاءات المسير ومرشحيها، ترحيل أرصدة الإجازات،
// وكشف حالة مسير فرع آخر قبل فحص النطاق في احتساب المسودة/إعادة الحساب. بلا قاعدة بيانات (مستودعات وهمية).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.resolve(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const { BadRequestException, ForbiddenException, NotFoundException } = require('@nestjs/common')
const { CandidatesController } = require('../src/assets/candidates.controller')
const { FinancialExemptionsService } = require('../src/payroll/financial-exemptions.service')
const { PayrollFinancialExemption } = require('../src/payroll/financial-exemptions.entities')
const { PayrollItem, PayrollRunMember } = require('../src/payroll/payroll.entities')
const { Employee } = require('../src/employees/employee.entity')
const { LeaveBalancesService } = require('../src/requests/leave-balances.service')

const hrBranch1 = { sub: 12, role: 'hr_manager', branchId: 1, employeeId: 21, permissions: ['candidates.manage', 'financial_exemption.view', 'financial_exemption.grant'] }
const admin = { sub: 1, role: 'super_admin', branchId: null, employeeId: 1, permissions: ['*'] }
const idsOf = where => { const value = where?.id?.value ?? where?.id?._value; return Array.isArray(value) ? value : [] }

test('candidates: a branch user lists only his branch (and unassigned), creates into his branch, and cannot edit another branch', async () => {
  const rows = [{ id: 1, branchId: 1, stage: 'applied' }, { id: 2, branchId: 4, stage: 'applied' }, { id: 3, branchId: null, stage: 'applied' }]
  const seen = []
  const repo = {
    find: async options => { seen.push(options.where); return rows },
    findOne: async ({ where }) => rows.find(row => row.id === where.id) ?? null,
    create: dto => ({ ...dto }),
    save: async row => row,
  }
  const controller = new CandidatesController(repo, {})
  const opOf = value => ({ type: value?.type ?? value?._type, value: value?.value ?? value?._value })
  await controller.list(hrBranch1)
  assert.equal(seen[0].length, 2)
  assert.deepEqual(opOf(seen[0][0].branchId), { type: 'in', value: [1] })
  assert.equal(seen[0][1].branchId?.type ?? seen[0][1].branchId?._type, 'isNull')
  await controller.list(admin)
  assert.deepEqual(seen[1], {})
  // نطاق أكتر من فرع: القائمة من الفروع دي كلها (مش فرعه الأساسي بس)
  const hrBranches14 = { ...hrBranch1, branchIds: [1, 4] }
  await controller.list(hrBranches14)
  assert.deepEqual(opOf(seen[2][0].branchId), { type: 'in', value: [1, 4] })
  // حساب غير مسند (نطاق فاضي) ما يشوفش غير اللي مالوش فرع — مش «الكل»
  await controller.list({ ...hrBranch1, branchId: null })
  assert.deepEqual(opOf(seen[3][0].branchId), { type: 'in', value: [-1] })

  assert.equal((await controller.create({ fullName: 'مرشح', positionTitle: 'محاسب', branchId: 4 }, hrBranch1)).branchId, 1)
  assert.equal((await controller.create({ fullName: 'مرشح', positionTitle: 'محاسب', branchId: 4 }, admin)).branchId, 4)
  // أكتر من فرع: يختار فرع من نطاقه، ومن غير اختيار يترفض (مفيش اختيار صامت)، وبرّه نطاقه ممنوع
  assert.equal((await controller.create({ fullName: 'مرشح', positionTitle: 'محاسب', branchId: 4 }, hrBranches14)).branchId, 4)
  await assert.rejects(async () => controller.create({ fullName: 'مرشح', positionTitle: 'محاسب' }, hrBranches14), BadRequestException)
  await assert.rejects(async () => controller.create({ fullName: 'مرشح', positionTitle: 'محاسب', branchId: 5 }, hrBranches14), ForbiddenException)
  await assert.rejects(async () => controller.create({ fullName: 'مرشح', positionTitle: 'محاسب', branchId: 1 }, { ...hrBranch1, branchId: null }), ForbiddenException)

  await assert.rejects(controller.update(2, { notes: 'x' }, hrBranch1), NotFoundException)
  assert.equal((await controller.update(1, { notes: 'x' }, hrBranch1)).notes, 'x')
  assert.equal((await controller.update(2, { notes: 'y' }, admin)).notes, 'y')
  assert.equal((await controller.update(2, { notes: 'z' }, hrBranches14)).notes, 'z')
})

function exemptionsEm({ members = [], items = [], employees = [], grantedBy = [] }) {
  const repos = new Map([
    [PayrollRunMember, { find: async ({ where }) => members.filter(row => row.runId === where.runId) }],
    [PayrollItem, { find: async ({ where }) => items.filter(row => row.runId === where.runId) }],
    [Employee, { find: async ({ where }) => employees.filter(row => idsOf(where).includes(row.id)) }],
    [PayrollFinancialExemption, { count: async ({ where }) => grantedBy.filter(row => row.runId === where.runId && row.grantedByUserId === where.grantedByUserId).length }],
  ])
  return { getRepository: entity => { const repo = repos.get(entity); if (!repo) throw new Error(`unexpected repo ${entity?.name}`); return repo } }
}
const noDepartments = { departments: new Set() }

test('financial exemptions run screen: a run with no member in the user branch is out of scope (snapshot or legacy branch)', async () => {
  const service = new FinancialExemptionsService({ manager: null }, {})
  const otherBranchRun = exemptionsEm({ members: [{ runId: 10, employeeId: 166, snapshot: { branchId: 4, departmentId: null } }], items: [{ runId: 10, employeeId: 166 }] })
  const orgs = await service.runOrgs(otherBranchRun, 10)
  assert.deepEqual([...orgs.entries()], [[166, { branchId: 4, departmentId: null }]])
  await assert.rejects(service.assertRunInScope(otherBranchRun, hrBranch1, noDepartments, 10, orgs), error => error instanceof ForbiddenException && error.getResponse().code === 'EXEMPTION_RUN_OUT_OF_SCOPE')
  await service.assertRunInScope(otherBranchRun, admin, noDepartments, 10, orgs)

  // عضو قديم بلا لقطة: الفرع من ملفه الحالي
  const legacy = exemptionsEm({ items: [{ runId: 11, employeeId: 5 }, { runId: 11, employeeId: 167 }], employees: [{ id: 5, branchId: 1, departmentId: 2 }, { id: 167, branchId: 5, departmentId: null }] })
  const legacyOrgs = await service.runOrgs(legacy, 11)
  assert.equal(legacyOrgs.get(5).branchId, 1)
  await service.assertRunInScope(legacy, hrBranch1, noDepartments, 11, legacyOrgs)

  // قسم يديره المستخدم، أو إعفاء منحه بنفسه، يبقي المسير مرئيًا له
  const managed = exemptionsEm({ members: [{ runId: 12, employeeId: 168, snapshot: { branchId: 6, departmentId: 9 } }] })
  await service.assertRunInScope(managed, hrBranch1, { departments: new Set([9]) }, 12, await service.runOrgs(managed, 12))
  const granted = exemptionsEm({ members: [{ runId: 13, employeeId: 169, snapshot: { branchId: 7, departmentId: null } }], grantedBy: [{ runId: 13, grantedByUserId: 12 }] })
  await service.assertRunInScope(granted, hrBranch1, noDepartments, 13, await service.runOrgs(granted, 13))

  // الحساب غير المسند لفرع (نطاق فارغ) لا يرى مسيرًا
  const unassigned = { ...hrBranch1, branchId: null }
  await assert.rejects(service.assertRunInScope(legacy, unassigned, noDepartments, 11, legacyOrgs), ForbiddenException)
})

test('financial exemptions service wires the run scope gate into runView and candidates, and filters recalc ids by branch', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/payroll/financial-exemptions.service.ts'), 'utf8')
  const body = name => source.slice(source.indexOf(`  async ${name}(`), source.indexOf('\n  }\n', source.indexOf(`  async ${name}(`)))
  const runView = body('runView'), candidates = body('candidates')
  assert.match(runView, /assertRunInScope\(em, user, facts, runId, orgs\)/)
  assert.ok(runView.indexOf('assertRunInScope') < runView.indexOf('return {'), 'gate before any run data is returned')
  assert.match(runView, /this\.privileged\(user\) && this\.inBranch\(user, orgs\.get\(id\)\?\.branchId\)/)
  assert.match(candidates, /assertRunInScope\(em, user, facts, runId, await this\.runOrgs\(em, runId\)\)/)
  assert.ok(candidates.indexOf('assertRunInScope') < candidates.indexOf('return { run:'), 'gate before the candidate list')
})

test('leave balance rollover: a branch-scoped call touches only that branch employees; null keeps the company-wide job', async () => {
  const balances = [{ id: 1, employeeId: 10, period: '2025', balanceType: 'annual' }, { id: 2, employeeId: 166, period: '2025', balanceType: 'annual' }]
  const touched = []
  const ensured = []
  const make = () => {
    const service = new LeaveBalancesService(
      { find: async ({ where }) => { if (where.employeeId !== undefined) { touched.push(where.employeeId); return [] } return balances.filter(row => row.balanceType === where.balanceType) } },
      { find: async ({ where }) => [{ id: 10, branchId: 1 }, { id: 166, branchId: 4 }].filter(row => row.branchId === where.branchId) },
      {})
    const typeSettings = { carryOverEnabled: true, carryOverMaxDays: null, renewalBasis: 'YEAR_START' }
    service.accrualSettings = async () => ({ expiryMonths: 3, types: { annual: typeSettings, sick: { ...typeSettings, carryOverEnabled: false } } })
    service.accrualContext = async () => ({ joinDate: '2020-01-01', settings: { annual: typeSettings, sick: typeSettings }, policy: { annual: 21, sick: 0 } })
    service.ensureYearRows = async (_period, branchId) => { ensured.push(branchId); return 0 }
    return service
  }
  await make().rollover('2025', 1)
  assert.deepEqual(touched, [10])
  assert.deepEqual(ensured, [1])
  touched.length = 0; ensured.length = 0
  await make().rollover('2025')
  assert.deepEqual(touched, [10, 166])
  assert.deepEqual(ensured, [null])

  const controller = fs.readFileSync(path.join(__dirname, '../src/requests/requests.controller.ts'), 'utf8')
  assert.match(controller, /rollover\(@CurrentUser\(\) user: JwtPayload, @Param\('fromPeriod'\) fromPeriod: string\)[\s\S]{0,160}this\.balances\.rollover\(fromPeriod, branchScopeOf\(user\)\)/)
  const service = fs.readFileSync(path.join(__dirname, '../src/requests/leave-balances.service.ts'), 'utf8')
  assert.match(service, /async ensureYearRows\(period: string, branchId: BranchScope \| number = null\)[\s\S]{0,200}\.\.\.branchScopeWhere\(branchId\)/)
  // نطاق فاضي (حساب غير مسند) = ولا موظف، مش الشركة كلها
  assert.match(service, /return list === null \? \{\} : \{ branchId: list\.length === 1 \? list\[0\] : branchIdIn\(list\) \}/)
})

test('leave balance rollover: a multi-branch scope touches exactly those branches', async () => {
  const balances = [{ id: 1, employeeId: 10, period: '2025', balanceType: 'annual' }, { id: 2, employeeId: 166, period: '2025', balanceType: 'annual' }, { id: 3, employeeId: 170, period: '2025', balanceType: 'annual' }]
  const touched = []
  const employees = [{ id: 10, branchId: 1 }, { id: 166, branchId: 4 }, { id: 170, branchId: 5 }]
  const matches = (where, row) => {
    const b = where.branchId
    if (b === undefined) return true
    if (typeof b === 'number') return row.branchId === b
    const list = b?.value ?? b?._value
    return Array.isArray(list) && list.includes(row.branchId)
  }
  const service = new LeaveBalancesService(
    { find: async ({ where }) => { if (where.employeeId !== undefined) { touched.push(where.employeeId); return [] } return balances.filter(row => row.balanceType === where.balanceType) } },
    { find: async ({ where }) => employees.filter(row => matches(where, row)) },
    {})
  const typeSettings = { carryOverEnabled: true, carryOverMaxDays: null, renewalBasis: 'YEAR_START' }
  service.accrualSettings = async () => ({ expiryMonths: 3, types: { annual: typeSettings, sick: { ...typeSettings, carryOverEnabled: false } } })
  service.accrualContext = async () => ({ joinDate: '2020-01-01', settings: { annual: typeSettings, sick: typeSettings }, policy: { annual: 21, sick: 0 } })
  service.ensureYearRows = async () => 0
  await service.rollover('2025', [1, 4])
  assert.deepEqual(touched, [10, 166])
  touched.length = 0
  await service.rollover('2025', [])
  assert.deepEqual(touched, [])
})

test('payroll draft calculate / recalculate check the run branch scope before revealing its status', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/payroll/payroll.service.ts'), 'utf8')
  for (const name of ['calculateRunDraft', 'recalculateRun']) {
    const start = source.indexOf(`  async ${name}(`)
    const body = source.slice(start, source.indexOf('\n  }\n', start))
    assert.ok(body.includes('await this.assertRunAccess(user, run)'), `${name} checks run access`)
    assert.ok(body.indexOf('assertRunAccess') < body.indexOf('stateError'), `${name} checks access before the status error`)
  }
})
