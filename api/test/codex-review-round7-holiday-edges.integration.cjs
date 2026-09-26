'use strict'
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
let f, a, b, oldDept, newDept, moved, foreign, branchUser, policy
const date = '2026-09-15', marker = 'CR7_PRIVATE_BRANCH_B_HOLIDAY'
const note = value => console.log('CR7_EVIDENCE ' + JSON.stringify(value))
async function change() {
  const c = await f.ok('GET', '/attendance/calendar-context?scope=GLOBAL&sourceId=0')
  return { effectiveFrom: '2026-08-01', reason: 'Independent round 7 fixture', expectedRevision: c.revision, expectedCurrentSourceHash: c.currentSourceHash }
}
before(async () => {
  f = await require('./codex-review-round7-fixture.cjs')('r7holiday')
  await f.setting('attendance.weekend_days', 'FRI,SAT'); await f.setting('system.country', 'EG')
  a = await f.repo('Branch').save({ name: 'CR7 A', code: 'R7A', country: 'EG', weekendDays: 'FRI,SAT' })
  b = await f.repo('Branch').save({ name: 'CR7 B', code: 'R7B', country: 'EG', weekendDays: 'FRI,SAT' })
  oldDept = await f.repo('Department').save({ name: 'Old department', code: 'R7OLD', branchId: a.id })
  newDept = await f.repo('Department').save({ name: 'New department', code: 'R7NEW', branchId: a.id })
  const employee = (code, branchId, departmentId) => f.repo('Employee').save({ employeeCode: code, fullName: code, branchId, departmentId,
    joinDate: '2024-01-01', status: 'active', isActive: true, basicSalary: 6000, housingAllowance: 0, transportAllowance: 0,
    phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, workPressureAllowance: 0, currency: 'EGP', payMethod: 'cash' })
  moved = await employee('R7MOVE', a.id, oldDept.id); foreign = await employee('R7FOREIGN', b.id, null)
  await f.ok('POST', '/catalogs/holidays', { name: 'CR7 dated department holiday', date, country: 'EG',
    audience: { level: 'departments', branchId: a.id, departmentIds: [oldDept.id] }, calendarChange: await change() })
  await f.ok('POST', '/catalogs/holidays', { name: marker, date, country: 'EG',
    audience: { level: 'employees', branchId: b.id, employeeIds: [foreign.id] }, calendarChange: await change() })
  branchUser = await f.repo('User').save({ email: 'r7branch@codex.invalid', displayName: 'CR7 branch A', passwordHash: 'not-a-password',
    role: 'hr_manager', branchId: a.id, permissions: JSON.stringify(['payroll.view', 'payroll.calculate', 'settings.view', 'attendance.manage']) })
  policy = await f.ok('POST', '/payroll/policies', { name: 'CR7 source policy', effectiveFrom: '2026-01-01' })
})
after(async () => { if (f) await f.close() })
test('CR7 historical department holiday survives actual employee move and allows its holiday-work order', async () => {
  const { AttendanceService } = require('../src/attendance/attendance.service')
  const attendance = f.app.get(AttendanceService)
  assert.equal((await attendance.calendarDay(moved.id, date)).dayKind, 'HOLIDAY')
  await f.ok('PATCH', `/employees/${moved.id}`, { departmentId: newDept.id })
  const row = await f.repo('Employee').findOneByOrFail({ id: moved.id })
  assert.equal(row.departmentId, newDept.id)
  const historical = await attendance.calendarDay(moved.id, date)
  assert.equal(historical.dayKind, 'HOLIDAY', 'dated membership must remain in the old department')
  const order = await f.request('POST', '/attendance/holiday-work', { name: 'CR7 work on historical holiday', targetLevel: 'employees',
    branchId: a.id, employeeIds: [moved.id], dates: [date], multiplier: 1.5 })
  note({ case: 'dated-department-holiday-work', calendar: historical.dayKind, status: order.status, body: order.body })
  assert.equal(order.status, 201, 'A real past holiday for the selected employee must permit holiday-work recording')
})
test('CR7 branch A live payroll sources do not disclose the holiday targeted to branch B', async () => {
  const list = await f.ok('GET', '/catalogs/holidays', null, branchUser)
  const context = await f.ok('GET', '/attendance/calendar-context?scope=GLOBAL&sourceId=0', null, branchUser)
  assert.ok(!JSON.stringify(list).includes(marker)); assert.ok(!JSON.stringify(context).includes(marker))
  const version = policy.versions[0]
  const source = await f.request('POST', `/payroll/policies/${policy.policy.id}/versions/${version.id}/sources/read`,
    { expectedRevision: version.revision, employeeId: moved.id, periodStart: date, periodEnd: date }, branchUser)
  assert.equal(source.status, 200, JSON.stringify(source.body).slice(0, 600))
  const leaked = JSON.stringify(source.body).includes(marker)
  const matches=[]
  const walk=(value,path='$')=>{if(!value||typeof value!=='object')return; if(value.name===marker)matches.push({path,value});
    for(const [key,child] of Object.entries(value))if(child&&typeof child==='object')walk(child,`${path}.${key}`)}
  walk(source.body)
  note({ case: 'branch-live-source-isolation', sourceStatus: source.status, leaked, matches })
  assert.equal(leaked, false, 'Sources for an authorized employee must not reveal a foreign targeted holiday')
})
