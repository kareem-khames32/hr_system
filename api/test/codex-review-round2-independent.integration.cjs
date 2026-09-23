'use strict'
const { test, before, after } = require('node:test'), assert = require('node:assert/strict')
let f, branch, version, serial = 0
before(async () => { f = await require('./codex-review-round2-fixture.cjs')('independent'); branch = await f.repo('Branch').save({ code: 'CR2', name: 'Independent branch' }); version = await f.policy() }, {timeout:180000})
after(async () => { if(f) await f.close() })
async function employee(method, amount) {
  const emp = await f.repo('Employee').save({ employeeCode: `CR2-${++serial}`, fullName: 'Synthetic review employee', branchId: branch.id,
    joinDate: '2020-01-01', status: 'active', isActive: true, basicSalary: 1000, payMethod: method, bankTransferAmount: amount ?? null,
    bankName: 'Synthetic Bank', iban: 'SA0380000000608010167519' })
  await f.repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2026-12-31', reasonCode: 'field_role',
    reason: 'Independent fixture', status: 'APPROVED', createdByUserId: f.admin.id, approvedByUserId: f.admin.id, approvedAt: new Date(), requiresCheckinForPresence: false })
  return emp
}
async function calculated(emp) {
  const run = await f.ok('POST', '/payroll/runs', { name: `Independent ${emp.id}`, policyVersionId: version, period: '2026-08', filters: { employeeIds: [emp.id] } })
  await f.ok('POST', `/payroll/runs/${run.id}/calculate`, {})
  const detail = await f.ok('GET', `/payroll/runs/${run.id}`)
  assert.equal(detail.items.length, 1); assert.equal(Number(detail.items[0].netPay), 1000)
  await f.approve(run.id)
  return run
}
async function views(run) {
  const sheet = await f.ok('GET', `/payroll/runs/${run.id}/bank-sheet`)
  const screen = await f.ok('GET', `/payroll/disbursement/runs/${run.id}`)
  const financial = await f.ok('GET', '/reports/financial/payroll-register?period=2026-08')
  const fin = financial.rows.find(r => r.runId === run.id)
  return { bank: [sheet.rows[0].bankAmount, sheet.rows[0].cashAmount], screen: [screen.rows[0].bankAmount, screen.rows[0].cashAmount],
    financial: fin ? [Number(fin.bank), Number(fin.cash)] : null, state: screen.rows[0].state }
}
test('CR2-N02A bulk pay must preserve the payment method used immediately before payment', async t => {
  const e = await employee('cash'), run = await calculated(e)
  await f.repo('Employee').update(e.id, { payMethod: 'transfer' })
  const beforePay = await views(run)
  assert.deepEqual(beforePay.bank, [1000, 0])
  await f.ok('POST', `/payroll/runs/${run.id}/pay`, {channel:'BANK_TRANSFER',reference:'CR2 bank payment'})
  const afterPay = await views(run)
  const marks = await f.repo('PayrollItemDisbursement').count({where:{runId:run.id}})
  t.diagnostic(JSON.stringify({scenario:'bulk method changed before payment',beforePay,afterPay,marks}))
  assert.deepEqual(afterPay.bank, [1000, 0], 'Payment flips the bank sheet back to calculation-time cash')
}, {timeout:180000})
test('CR2-N02B bulk mixed payment must freeze its bank/cash amounts after payment', async t => {
  const e = await employee('mixed', 300), run = await calculated(e)
  await f.ok('POST', `/payroll/runs/${run.id}/pay`, {channel:'MIXED',reference:'CR2 mixed payment'})
  const beforeChange = await views(run)
  assert.deepEqual(beforeChange.bank, [300,700])
  await f.repo('Employee').update(e.id,{bankTransferAmount:800})
  const afterChange = await views(run)
  t.diagnostic(JSON.stringify({scenario:'mixed amount changed after payment',beforeChange,afterChange}))
  assert.deepEqual(afterChange.bank,[300,700], 'Paid mixed split is still derived from the live employee bank amount')
}, {timeout:180000})
test('CR2-N01 self and branch users cannot enumerate foreign/missing monthly or working-day records', async t => {
  const e = await employee('cash')
  const other = await f.repo('Branch').save({code:'CR2OTHER',name:'Other'})
  const self = await f.repo('User').save({email:'self@codex.invalid',displayName:'Self',passwordHash:'test',role:'employee',branchId:other.id,employeeId:e.id+999,permissions:'[]'})
  const scoped = await f.repo('User').save({email:'scope@codex.invalid',displayName:'Scope',passwordHash:'test',role:'hr_manager',branchId:other.id,permissions:'["attendance.view_all"]'})
  const statuses=[]
  for(const actor of [self,scoped]) for(const make of [id=>`/attendance/monthly?employeeId=${id}&month=2026-08`,id=>`/attendance/working-days?employeeId=${id}&from=2026-08-01&to=2026-08-02`]) {
    const foreign=await f.request('GET',make(e.id),null,actor), missing=await f.request('GET',make(999999),null,actor)
    assert.deepEqual(foreign,missing); assert.ok(foreign.status>=400); statuses.push(foreign.status)
  }
  t.diagnostic(JSON.stringify({scenario:'no employee enumeration',statuses}))
})
