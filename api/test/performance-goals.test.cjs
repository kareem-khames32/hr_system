'use strict'
// B3.6: أهداف الأداء — فحص من غير قاعدة (الدورة الفعلية في performance-goals.integration.cjs):
//  PU-01) القواعد: العنوان، النوع، الوزن، القيم، الفترة، السبب، وبصمة ملف الموظف.
//  PU-02) الربط: الموديول الجديد مقفول وصلاحيته في السجلين، والإجراء بيتحكم قبل المعاملة وجوّاها قفل صف الهدف والموظف، والمسارات.
// Run (من api/): node --test test/performance-goals.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/performance/goal-rules')
const { MODULES } = require('../src/modules-registry/registry')
const root = path.resolve(__dirname, '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const refuses = (work, label) => assert.throws(work, error => error?.getStatus?.() === 400, label)

test('PU-01: title, kind, weight, values, period, reason and the employee stamp', () => {
  assert.deepEqual([rules.cleanGoalTitle('  زيادة   المبيعات '), rules.cleanGoalKind('KPI'), rules.cleanGoalOwner('COMPANY'), rules.cleanGoalWeight(0), rules.cleanGoalWeight(100)],
    ['زيادة المبيعات', 'KPI', 'COMPANY', 0, 100])
  for (const bad of ['ab', '', null, 5, 'ه'.repeat(201)]) refuses(() => rules.cleanGoalTitle(bad), 'title')
  for (const bad of ['OKR', 'kpi', null]) refuses(() => rules.cleanGoalKind(bad), 'kind')
  for (const bad of [-1, 101, 2.5, '40', null]) refuses(() => rules.cleanGoalWeight(bad), 'weight ' + String(bad))
  assert.deepEqual([rules.cleanGoalValue(100), rules.cleanGoalValue(' -3.5 '), rules.cleanGoalValue(''), rules.cleanGoalValue(null), rules.cleanGoalValue(undefined), rules.cleanGoalValue('0')],
    ['100.00', '-3.50', null, null, null, '0.00'])
  for (const bad of ['1.234', 'x', 1e13, NaN, {}]) refuses(() => rules.cleanGoalValue(bad), 'value ' + String(bad))
  assert.deepEqual(rules.cleanGoalPeriod('2026-10-01', '2026-10-01'), { periodStart: '2026-10-01', periodEnd: '2026-10-01' })
  for (const [start, end] of [['2026-10-02', '2026-10-01'], ['2026-02-31', '2026-03-01'], ['01-10-2026', '2026-12-31'], [null, '2026-12-31']]) refuses(() => rules.cleanGoalPeriod(start, end), 'period')
  assert.deepEqual([rules.cleanGoalReason('  سبب واضح '), rules.cleanGoalText('   ', 10, 'x'), rules.cleanGoalText(undefined, 10, 'x')], ['سبب واضح', null, null])
  for (const bad of ['', 'ab', null, undefined, 'س'.repeat(301)]) refuses(() => rules.cleanGoalReason(bad), 'reason')
  const base = { status: 'active', isActive: true, branchId: 1, managerEmployeeId: 7, departmentId: 2, teamId: null }
  assert.equal(rules.goalEmployeeStamp(base), rules.goalEmployeeStamp({ ...base, isActive: 1, fullName: 'اسم اتغيّر' }))
  for (const change of [{ branchId: 2 }, { managerEmployeeId: 8 }, { departmentId: 3 }, { teamId: 4 }, { status: 'terminated' }, { isActive: false }]) {
    assert.notEqual(rules.goalEmployeeStamp(base), rules.goalEmployeeStamp({ ...base, ...change }), JSON.stringify(change))
  }
  assert.equal(rules.goalEmployeeStamp(null), 'none')
})

test('PU-02: a new closed module with its permission, the judgment before the transaction and the locks inside it, and the routes', () => {
  const module = MODULES.performance
  assert.deepEqual([module.defaultEnabled, module.permissions, module.routes, module.dependsOn], [false, ['performance.manage'], ['/performance/goals'], ['org', 'employees']])
  const { PERMISSIONS, PERMISSION_MODULES, ROLE_PRESETS } = require('../src/auth/permissions')
  assert.deepEqual(['performance.manage' in PERMISSIONS, PERMISSION_MODULES.find(unit => unit.key === 'performance').permissions,
    ROLE_PRESETS.find(role => role.code === 'hr_manager').permissions.includes('performance.manage'), ROLE_PRESETS.find(role => role.code === 'employee').permissions.includes('performance.manage')],
    [true, ['performance.manage'], true, false])
  const service = read('api/src/performance/goals.service.ts')
  const mutate = service.slice(service.indexOf('private async mutate('), service.indexOf('/** اعتماد أو رفض هدف مقترح'))
  const order = ['await this.roleOn(user, seen)', 'if (!seen || !judged.role) throw new NotFoundException(GOAL_NOT_FOUND)', 'if (!allowed(judged.role, seen)) throw new ForbiddenException(GOAL_FORBIDDEN)',
    'this.ds.transaction(', "lock: { mode: 'pessimistic_write' }", 'goal.status !== seen.status', 'await this.holdEmployee(em, judged.employee)', 'await work(em, goal)'].map(part => mutate.indexOf(part))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), JSON.stringify(order))
  const inside = mutate.slice(mutate.indexOf('this.ds.transaction('))
  assert.doesNotMatch(inside, /this\.resolver\.|this\.roleOn\(/, 'مفيش نداء خدمة تانية جوه المعاملة')
  assert.match(service, /if \(goalEmployeeStamp\(fresh\) !== goalEmployeeStamp\(judged\)\) throw new ConflictException\(GOAL_CHANGED\)/)
  assert.doesNotMatch(service, /\.save\(goal\)|Object\.assign\(goal/, 'الكتابة بالخانات بس')
  assert.equal(service.split('this.mutate(user, id,').length - 1, 5, 'القرار والتقدّم والتعديل والقفل والدليل كلهم من نفس المكان')
  const controller = read('api/src/performance/goals.controller.ts')
  assert.match(controller, /@RequireModule\('performance'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)\n@Controller\('performance\/goals'\)/)
  assert.match(controller, /@Perm\('performance\.manage'\)\n\s+@Get\('all'\)/)
  assert.ok(controller.indexOf("@Get('all')") < controller.indexOf("@Get(':id')") && controller.indexOf("@Get('team')") < controller.indexOf("@Get(':id')"), 'المسارات الثابتة قبل ‎:id')
  const entity = read('api/src/performance/goal.entities.ts')
  assert.doesNotMatch(entity, /default:|CreateDateColumn/, 'من غير افتراضي (زي الترحيل)')
})
