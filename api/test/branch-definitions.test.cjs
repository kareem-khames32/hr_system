// تعريفات الفرع + جمهور الطلب «مين + فين» (قرار المالك 16 سبتمبر) — اختبارات نقية بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const audience = require('../src/requests/request-audience')
const branches = require('../src/common/definition-branch')

const root = path.join(__dirname, '..', '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const json = (value) => JSON.stringify(value)
const allows = (visibleTo, subject, purpose = 'submit') => audience.requestAudienceAllows(visibleTo, subject, purpose)
const employee = (over = {}) => ({ role: 'employee', permissions: [], employeeId: 7, departmentId: 3, branchId: 1, positions: {}, ...over })

test('old audience shapes keep working exactly as before (all / departments / roles / employees / positions / broken JSON)', () => {
  assert.equal(allows(null, employee()), true)
  assert.equal(allows('not json', employee()), true)
  assert.equal(allows(json({ mode: 'all', ids: [] }), employee()), true)
  assert.equal(allows(json({ mode: 'departments', ids: [3] }), employee()), true)
  assert.equal(allows(json({ mode: 'departments', ids: [4] }), employee()), false)
  assert.equal(allows(json({ mode: 'roles', ids: ['hr_manager'] }), employee()), false)
  assert.equal(allows(json({ mode: 'roles', ids: ['employee'] }), employee()), true)
  assert.equal(allows(json({ mode: 'employees', ids: [7] }), employee()), true)
  assert.equal(allows(json({ mode: 'employees', ids: [8] }), employee()), false)
  const managers = json({ mode: 'positions', ids: ['DEPARTMENT_MANAGERS', 'hr_manager'] })
  assert.equal(allows(managers, employee()), false)
  assert.equal(allows(managers, employee({ positions: { departmentManager: true } })), true)
  assert.equal(allows(managers, employee({ role: 'hr_manager' })), true)
})

test('who + where: «department managers in branch 2 only» needs both the position and the branch', () => {
  const visibleTo = json({ mode: 'positions', ids: ['DEPARTMENT_MANAGERS'], where: { mode: 'branches', ids: [2] } })
  assert.equal(allows(visibleTo, employee({ branchId: 2, positions: { departmentManager: true } })), true)
  assert.equal(allows(visibleTo, employee({ branchId: 1, positions: { departmentManager: true } })), false, 'right position, wrong branch')
  assert.equal(allows(visibleTo, employee({ branchId: 2 })), false, 'right branch, not a manager')
  assert.equal(allows(visibleTo, employee({ branchId: null, positions: { departmentManager: true } })), false, 'no branch known = not inside')
  // الكل في أقسام محددة = الوضع القديم «أقسام»
  const inDepartments = json({ mode: 'all', ids: [], where: { mode: 'departments', ids: [3, 5] } })
  assert.equal(allows(inDepartments, employee({ departmentId: 5 })), true)
  assert.equal(allows(inDepartments, employee({ departmentId: 9 })), false)
  // موظفون بعينهم في فرع: الاتنين
  const people = json({ mode: 'employees', ids: [7], where: { mode: 'branches', ids: [1] } })
  assert.equal(allows(people, employee()), true)
  assert.equal(allows(people, employee({ branchId: 2 })), false)
  // «فين» تالف أو فاضي = كل الشركة (الباب لا يُقفل صامتًا)
  assert.equal(allows(json({ mode: 'all', ids: [], where: { mode: 'branches', ids: [] } }), employee()), true)
  assert.equal(allows(json({ mode: 'all', ids: [], where: { mode: 'planet', ids: [1] } }), employee()), true)
  assert.deepEqual(audience.audienceWhereOf({ where: { mode: 'branches', ids: ['2', 'x', 0] } }), { mode: 'branches', ids: [2] })
})

test('owner bypass at both doors; the type builder sees every type in the catalog but submits under the audience', () => {
  const visibleTo = json({ mode: 'roles', ids: ['hr_manager'], where: { mode: 'branches', ids: [9] } })
  assert.equal(allows(visibleTo, employee({ role: 'super_admin' })), true)
  assert.equal(allows(visibleTo, employee({ permissions: ['*'] })), true)
  const builder = employee({ role: 'hr_manager', permissions: ['request_types.manage'] })
  assert.equal(allows(visibleTo, builder, 'catalog'), true)
  assert.equal(allows(visibleTo, builder, 'submit'), false)
})

test('the subject carries branch and department: the employee record first, then the account branch', () => {
  const user = { sub: 12, role: 'hr_manager', permissions: [], employeeId: 21, branchId: 1 }
  assert.deepEqual(audience.audienceSubjectOf(user, { departmentId: 4, branchId: 11 }),
    { role: 'hr_manager', permissions: [], employeeId: 21, departmentId: 4, branchId: 11 })
  assert.equal(audience.audienceSubjectOf(user, null).branchId, 1)
  assert.equal(audience.audienceNeedsEmployee(json({ mode: 'all', ids: [] })), false)
  assert.equal(audience.audienceNeedsEmployee(json({ mode: 'departments', ids: [1] })), true)
  assert.equal(audience.audienceNeedsEmployee(json({ mode: 'positions', ids: ['TEAM_LEADERS'], where: { mode: 'branches', ids: [1] } })), true)
})

test('branch definitions: company-wide rows are available everywhere, branch rows only inside their branch', () => {
  assert.equal(branches.definitionInBranch(null, 1), true)
  assert.equal(branches.definitionInBranch(undefined, null), true)
  assert.equal(branches.definitionInBranch(2, 2), true)
  assert.equal(branches.definitionInBranch(2, '2'), true)
  assert.equal(branches.definitionInBranch(2, 1), false)
  assert.equal(branches.definitionInBranch(2, null), false)
  assert.equal(audience.requestTypeInBranch({ branchId: 2 }, 1), false)
  assert.equal(audience.requestTypeInBranch({ branchId: 2 }, 1, true), true, 'a company-wide viewer sees it in the catalog')
  assert.equal(branches.definitionBranchQuery('3'), 3)
  assert.equal(branches.definitionBranchQuery('0'), null)
  assert.equal(branches.definitionBranchQuery('abc'), null)
})

const admin = { sub: 1, role: 'super_admin', permissions: ['*'], employeeId: 1, branchId: null }
const branchHr = { sub: 12, role: 'hr_manager', permissions: ['settings.manage'], employeeId: 21, branchId: 1 }
const unassigned = { sub: 99, role: 'hr_manager', permissions: ['settings.manage'], employeeId: null, branchId: null }
const statusOf = (fn) => { try { fn(); return 200 } catch (error) { return error.getStatus?.() ?? 500 } }
const statusOfAsync = async (fn) => { try { await fn(); return 200 } catch (error) { return error.getStatus?.() ?? 500 } }

test('lists: a branch account sees company-wide + its branch; the company account sees all, or company + one branch', () => {
  assert.deepEqual(branches.definitionBranchWhere(admin, { isActive: true }), { isActive: true })
  const forBranch = branches.definitionBranchWhere(admin, { isActive: true }, 5)
  assert.equal(forBranch.length, 2)
  assert.equal(forBranch[1].branchId, 5)
  assert.equal(forBranch[0].isActive, true)
  const scoped = branches.definitionBranchWhere(branchHr, {}, 5)
  assert.equal(scoped[1].branchId, 1, 'a branch account cannot ask for another branch')
  assert.equal(branches.definitionBranchWhere(unassigned)[1].branchId, -1, 'an account with no branch sees company-wide only')
})

test('create: branch account = its branch automatically; company account chooses company or an existing active branch', async () => {
  const em = { getRepository: () => ({ existsBy: async ({ id, isActive }) => isActive === true && [1, 2].includes(id) }) }
  assert.equal(await branches.definitionBranchForCreate(em, branchHr, undefined), 1)
  assert.equal(await branches.definitionBranchForCreate(em, branchHr, 1), 1)
  assert.equal(await statusOfAsync(() => branches.definitionBranchForCreate(em, branchHr, 2)), 403)
  assert.equal(await statusOfAsync(() => branches.definitionBranchForCreate(em, unassigned, null)), 403)
  assert.equal(await branches.definitionBranchForCreate(em, admin, null), null)
  assert.equal(await branches.definitionBranchForCreate(em, admin, ''), null)
  assert.equal(await branches.definitionBranchForCreate(em, admin, 2), 2)
  assert.equal(await statusOfAsync(() => branches.definitionBranchForCreate(em, admin, 7)), 400)
  assert.equal(await statusOfAsync(() => branches.definitionBranchForCreate(em, admin, -3)), 400)
})

test('edit: branch account edits its own branch rows only; company rows need a company account; branch is fixed after creation', () => {
  assert.equal(statusOf(() => branches.assertDefinitionWritable(admin, { branchId: null })), 200)
  assert.equal(statusOf(() => branches.assertDefinitionWritable(admin, { branchId: 4 })), 200)
  assert.equal(statusOf(() => branches.assertDefinitionWritable(branchHr, { branchId: 1 })), 200)
  assert.equal(statusOf(() => branches.assertDefinitionWritable(branchHr, { branchId: null })), 403)
  assert.equal(statusOf(() => branches.assertDefinitionWritable(branchHr, { branchId: 2 })), 404, 'another branch row looks missing')
  assert.equal(statusOf(() => branches.assertDefinitionBranchUnchanged({ branchId: 2 }, undefined)), 200)
  assert.equal(statusOf(() => branches.assertDefinitionBranchUnchanged({ branchId: 2 }, 2)), 200)
  assert.equal(statusOf(() => branches.assertDefinitionBranchUnchanged({ branchId: null }, null)), 200)
  assert.equal(statusOf(() => branches.assertDefinitionBranchUnchanged({ branchId: 2 }, null)), 400)
  assert.equal(statusOf(() => branches.assertDefinitionBranchUnchanged({ branchId: null }, 3)), 400)
})

test('wiring: every door asks the same helpers (settings, request catalog + submit, leave submit, money screens, shifts/schedules, assignment)', () => {
  const settings = read('api/src/settings/settings.controller.ts')
  for (const text of ['definitionBranchWhere<LeaveType>(user)', 'definitionBranchWhere<RequestType>(user)',
    'await definitionBranchForCreate(this.leaveTypes.manager, user, dto.branchId)', 'await definitionBranchForCreate(this.requestTypes.manager, user, dto.branchId)',
    'const AUDIENCE_MODES: readonly string[] = AUDIENCE_WHO_MODES', 'await this.validateAudience(dto.visibleTo, branchId)',
    "const { balanceSource, sickPayTiers, branchId: _branchId, ...rest } = dto"]) {
    assert.ok(settings.includes(text), text)
  }
  assert.equal(settings.split('assertDefinitionWritable(user, ').length - 1, 2, 'leave types + request types edits are guarded')
  const engine = read('api/src/requests/requests.service.ts')
  assert.ok(engine.includes('requestTypeInBranch(t, subjectBranch, companyWide)'), 'catalog hides other-branch types')
  assert.ok(engine.includes('if (!requestTypeInBranch(type, requester.branchId)) {'), 'submission (even on behalf) is limited to the type branch')
  assert.ok(engine.includes('definitionInBranch(leaveTypeDef.branchId, owner?.branchId)'), 'leave type of another branch is rejected at submission')
  assert.ok(read('api/src/requests/requests.controller.ts').includes("definitionBranchWhere<LeaveType>(user, { isActive: true }, definitionBranchQuery(branchIdRaw))"))
  const money = read('api/src/payroll/typed-deductions.service.ts')
  assert.ok(money.includes('audienceNeedsEmployee(type.visibleTo) || type.branchId != null'))
  assert.ok(money.includes('requestTypeInBranch(type, self?.branchId ?? user.branchId, owner)'))
  const catalogs = read('api/src/assets/catalogs.controller.ts')
  for (const text of ['definitionBranchWhere<ObjectLiteral>(user, {}, definitionBranchQuery(branchIdRaw))', 'assertDefinitionWritable(user, row)',
    'await definitionBranchForCreate(em, user, body.branchId)', "repo.create({ ...this.pick(kind, snapshot), branchId })",
    "throw new BadRequestException('الجدول الافتراضي لازم يكون لكل الشركة، مش لفرع واحد')", 'assertDefinitionWritable(user, ws)',
    'definitionInBranch(schedule.branchId, scope ?? schedule.branchId)']) {
    assert.ok(catalogs.includes(text), text)
  }
  assert.ok(!catalogs.includes('تعريف الدوام مشترك بين الفروع؛ تعديله يحتاج نطاق إدارة عام'), 'branch accounts are no longer locked out of their own definitions')
  const ruleHistory = read('api/src/attendance/attendance-rule-history.ts')
  assert.ok(ruleHistory.includes('const issue = scheduleBranchIssue(row, employee.branchId)'), 'employee schedule assignment')
  assert.ok(ruleHistory.includes('if (!schedule || schedule.branchId == null || Number(schedule.branchId) === Number(branchId)) return null'), 'employee schedule assignment rule')
  assert.ok(read('api/src/attendance/attendance.service.ts').includes('if (shift.branchId != null && Number.isInteger(assignee) && assignee > 0) {'), 'shift assignment')
  for (const [file, entity] of [['api/src/requests/entities/leave.entities.ts', 'LeaveType'], ['api/src/requests/entities/request-type.entity.ts', 'RequestType'],
    ['api/src/assets/assets.entities.ts', 'Shift'], ['api/src/assets/assets.entities.ts', 'WorkSchedule']]) {
    const source = read(file)
    const body = source.slice(source.indexOf(`export class ${entity} {`))
    assert.match(body.slice(0, body.indexOf('\n}')), /@Column\(\{ type: 'int', nullable: true \}\)\s+branchId: number \| null/, `${entity}.branchId`)
  }
})

test('migration 043: additive, re-runnable, nullable branch column on the four definition tables', () => {
  const migration = read('docs/migrations/payroll/20260916_043_branch_definitions.sql')
  const statements = migration.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n')
  assert.ok(!/\b(DROP|DELETE|TRUNCATE|UPDATE)\b/i.test(statements), 'additive only')
  for (const table of ['leave_types', 'request_types', 'shifts', 'work_schedules']) {
    assert.ok(statements.includes(`IF COL_LENGTH('dbo.${table}', 'branchId') IS NULL\n  ALTER TABLE dbo.${table} ADD branchId int NULL;`), table)
  }
})

test('screens: «يظهر لـ…» on every request type card, a clear who/where section, and «متاح في» on the four definition screens', () => {
  const builder = read('src/app/settings/request-types/page.tsx')
  for (const text of ['يظهر لـ: {typeAudienceText(rt)}', 'مين يشوف الطلب ده ويقدّمه؟', '>مين؟<', '>فين؟<', "['branches', 'فروع محددة']", 'النتيجة: ',
    'audienceOfForm(form, audienceIds())', '<DefinitionBranchField']) {
    assert.ok(builder.includes(text), text)
  }
  assert.ok(!builder.includes("['departments', 'أقسام محددة'],\n                        ['roles'"), 'departments moved from «مين» to «فين»')
  assert.ok(read('src/app/leaves/types/page.tsx').includes('<DefinitionBranchField value={form.branchId}'))
  assert.ok(read('src/app/attendance/shifts/page.tsx').includes('<DefinitionBranchField'))
  assert.ok(read('src/components/PayrollPolicySetEditor.tsx').includes('<DefinitionBranchField value={branchId} onChange={setBranchId}'))
  assert.ok(read('src/app/payroll/policies/page.tsx').includes('branchInfo.label(item.policy.branchId)'))
  const field = read('src/components/DefinitionBranchField.tsx')
  assert.ok(field.includes('<option value="">كل الشركة</option>'))
  assert.ok(!/branchId|scope|JSON/.test(field.split('\n').filter((line) => /[؀-ۿ]/.test(line) && !line.trim().startsWith('//')).map((line) => (line.match(/[؀-ۿ][^<>{}'"`]*/g) || []).join(' ')).join(' ')),
    'no technical words in the screen text')
})
