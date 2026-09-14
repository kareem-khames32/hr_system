'use strict'
// اختبارات نقية لدليل طلب الأجر وقواعد السلسلة؛ لا اتصال بقاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/reflect-metadata')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const lib = require('../src/requests/salary-change-requests')
const salaryWriter = require('../src/payroll/payroll-salary-change')
const { RequestsService } = require('../src/requests/requests.service')
const { salaryCurrentSourceHash } = require('../src/payroll/payroll-salary-history')
const employeeId = 7, requestId = 11, branchId = 2, actorId = 20, today = '2026-09-13'
const type = { code: 'SALARY_INCREASE', destinationHandler: 'salary_update_history', nameAr: 'زيادة راتب', category: 'financial', requiredFields: '["newSalary","increase_pct"]', customFields: null }
const salary = extra => ({ basicSalary: '6000.00', housingAllowance: '500.00', transportAllowance: '100.00', phoneAllowance: '50.00', workNatureAllowance: '20.00', otherAllowance: '0.00', currency: 'SAR', ...extra })
// قاعدة المالك: الزيادة تسري من راتب شهر كامل؛ today=2026-09-13 يقع في شهر مسير 2026-09 بدورة 23 (23/8 → 22/9).
const payload = extra => ({ newSalary: '6600.00', effectivePayrollPeriod: '2026-09', reason: 'قرار زيادة اختبار', ...extra })
const req = extra => ({ id: requestId, requesterId: employeeId, branchId, status: 'APPROVED', typeCode: type.code, ...extra })
function manager(extra = {}) {
  const data = { salary: salary(), identity: { id: employeeId, branchId, status: 'active', isActive: true }, history: [], decision: { id: 99, approverId: actorId }, cycle: '23', ...extra }
  const calls = []
  return { calls, data, queryRunner: { isTransactionActive: true, data: {} }, async query(sql, args) {
    calls.push({ sql, args }); assert.match(sql, /^SELECT\b/); assert.doesNotMatch(sql, /\b(?:UPDATE|INSERT|DELETE|MERGE|CREATE|DROP)\b/i)
    if (sql.includes('FROM dbo.requests_config')) return [{ value: data.cycle }]
    if (sql.includes('[status], [isActive]')) return data.identity ? [structuredClone(data.identity)] : []
    if (sql.includes('FROM dbo.employees')) return [{ id: employeeId, employeeCode: 'E007', fullName: 'موظف اختبار', branchId: data.identity?.branchId ?? branchId, ...data.salary }]
    if (sql.includes('FROM dbo.employee_salary_history_versions')) return data.history
    throw Error('unexpected read: ' + sql)
  }, getRepository(entity) { assert.equal(entity.name, 'RequestApproval'); return { findOne: async ({ where }) => where.action === 'RETURNED_FOR_INFO' ? data.returned ?? null : data.decision } } }
}
async function staged(patch, input = payload()) { return lib.stageSalaryChangeRequest(manager(patch), req(), input, 21) }
const code = expected => error => error.getResponse?.().code === expected

test('client salary values stay exact strings and required payroll month/reason are strict; incomplete drafts remain possible', () => {
  assert.deepEqual(lib.assertSalaryChangeClientPayload({}), {})
  const value = lib.assertSalaryChangeClientPayload(payload({ newSalary: '0006600.1', reason: '  قرار  ' }), true)
  assert.equal(value.newSalary, '6600.10'); assert.equal(value.reason, 'قرار'); assert.equal(value.effectivePayrollPeriod, '2026-09')
  for (const patch of [{ newSalary: 6600 }, { newSalary: '6600.001' }, { newSalary: '-1' }, { effectivePayrollPeriod: '2026-13' }, { effectivePayrollPeriod: '2026-09-01' }, { effectivePayrollPeriod: '' }, { reason: ' ' }]) assert.throws(() => lib.assertSalaryChangeClientPayload(payload(patch), true))
  // التاريخ اليومي لم يعد مقبولًا حتى لو صحيحًا: الشهر كامل هو القرار.
  assert.throws(() => lib.assertSalaryChangeClientPayload(payload({ effectiveDate: '2026-09-01' }), true), code('SALARY_REQUEST_PAYROLL_PERIOD_REQUIRED'))
  assert.equal(lib.SALARY_CHANGE_BASIS_VERSION, 'SALARY_REQUEST_BASIS_V2_20260914')
})

test('client cannot forge financial basis or approval even as null; legacy increase_pct is discarded', () => {
  for (const key of ['salaryChangeBasis', 'salaryChangeApproval']) for (const value of [null, {}, 'x']) assert.throws(() => lib.assertSalaryChangeClientPayload(payload({ [key]: value })))
  assert.equal('increase_pct' in lib.assertSalaryChangeClientPayload(payload({ increase_pct: '-10000' })), false)
})

test('submission captures all six exact amounts, branch, actor and revision under caller transaction without writes', async () => {
  const em = manager(), result = await lib.stageSalaryChangeRequest(em, req(), payload({ increase_pct: '0' }), 21)
  assert.equal(result.increase_pct, '10.000000'); assert.equal(result.salaryChangeBasis.currentSourceHash, salaryCurrentSourceHash(salary()))
  assert.deepEqual(result.salaryChangeBasis.salary, salary()); assert.equal(result.salaryChangeBasis.historyRevision, 0)
  assert.equal(result.salaryChangeBasis.branchId, branchId); assert.equal(result.salaryChangeBasis.stagedByUserId, 21); assert.equal(em.calls.length, 3)
  assert.equal(lib.readStoredSalaryChangePayload(result).newSalary, '6600.00')
})

test('very large cents and tiny positive increases retain exact threshold meaning despite rounded display percentage', async () => {
  const result = await staged({ salary: salary({ basicSalary: '9999999999999999.98' }) }, payload({ newSalary: '9999999999999999.99' }))
  assert.equal(result.increase_pct, '0.000000'); assert.equal(lib.salaryIncreaseThresholdMet(result, 'increase_pct', '>', '0'), true)
  assert.equal(lib.salaryIncreaseThresholdMet(result, 'newSalary', '>', '9999999999999999.98'), true)
})

test('zero base and unchanged or lower basic salary do not invent a usable increase percentage', async () => {
  await assert.rejects(staged({ salary: salary({ basicSalary: '0.00' }) }), code('SALARY_INCREASE_BASE_INVALID'))
  for (const newSalary of ['6000.00', '5999.99']) await assert.rejects(staged({}, payload({ newSalary })), code('SALARY_INCREASE_NOT_HIGHER'))
})

test('missing component/currency and missing/inactive/moved employee stop submission before any financial write', async () => {
  for (const patch of [{ salary: salary({ phoneAllowance: null }) }, { salary: salary({ currency: 'USD' }) }, { identity: null },
    { identity: { id: employeeId, branchId, isActive: false, status: 'active' } }, { identity: { id: employeeId, branchId: 3, isActive: true, status: 'active' } }]) await assert.rejects(staged(patch))
  const em = manager(); em.queryRunner.isTransactionActive = false; await assert.rejects(lib.stageSalaryChangeRequest(em, req(), payload(), 21), /معاملة نشطة/)
})

test('stored basis binds request, payroll month, reason and exact salary; payload edits cannot reuse an approval basis', async () => {
  const original = await staged()
  for (const patch of [{ newSalary: '6700.00' }, { effectivePayrollPeriod: '2026-10' }, { reason: 'تغيير غير معتمد' }]) assert.throws(() => lib.readStoredSalaryChangePayload({ ...original, ...patch }), code('SALARY_REQUEST_BASIS_INVALID'))
  const changed = structuredClone(original); changed.salaryChangeBasis.salary.phoneAllowance = '51.00'
  assert.throws(() => lib.readStoredSalaryChangePayload(changed), code('SALARY_REQUEST_BASIS_INVALID'))
  const forgedDisplay = { ...original, increase_pct: '-1000' }; assert.equal(lib.readStoredSalaryChangePayload(forgedDisplay).increase_pct, '10.000000')
})

test('old undated, daily-dated and unstaged pending requests fail409 without inferring a payroll month', () => {
  assert.throws(() => lib.readStoredSalaryChangePayload({ newSalary: 7000, reason: 'قديم' }), code('SALARY_REQUEST_PAYROLL_PERIOD_REQUIRED'))
  assert.throws(() => lib.readStoredSalaryChangePayload({ newSalary: '7000.00', effectiveDate: '2026-09-01', reason: 'قديم بتاريخ يومي' }), code('SALARY_REQUEST_PAYROLL_PERIOD_REQUIRED'))
  assert.throws(() => lib.readStoredSalaryChangePayload(payload()), code('SALARY_REQUEST_BASIS_REQUIRED'))
})

test('all approval threshold operators compare the exact ratio and reject malformed threshold values', async () => {
  const result = await staged()
  assert.equal(lib.salaryIncreaseThresholdMet(result, 'increase_pct', '>=', '10.00'), true)
  assert.equal(lib.salaryIncreaseThresholdMet(result, 'increase_pct', '>', '10.00'), false)
  assert.equal(lib.salaryIncreaseThresholdMet(result, 'increase_pct', '<=', '10.00'), true)
  assert.equal(lib.salaryIncreaseThresholdMet(result, 'increase_pct', '<', '10.00'), false)
  for (const threshold of [null, 'NaN', 'Infinity']) assert.throws(() => lib.salaryIncreaseThresholdMet(result, 'increase_pct', '>=', threshold), code('SALARY_REQUEST_THRESHOLD_INVALID'))
})

test('future payroll-month approval records trusted actor on request only; no current salary/history writer is called', async () => {
  const value = await staged({}, payload({ effectivePayrollPeriod: '2026-10' })), em = manager(), request = req()
  const originalWriter = salaryWriter.applyEmployeeSalaryChange; let calls = 0
  salaryWriter.applyEmployeeSalaryChange = async () => { calls++; throw Error('unexpected writer') }
  try {
    const result = await lib.executeSalaryChangeRequest(em, request, value, today)
    assert.equal(result.completed, false); assert.equal(result.ref, `SAL-REQUEST-${requestId}`); assert.equal(calls, 0)
    assert.match(result.note, /راتب شهر 2026-10/); assert.match(result.note, /2026-09-23/)
    // يوم بداية دورة أكتوبر (23 سبتمبر) يصبح الطلب مستحق التنفيذ.
    assert.equal(await lib.salaryChangeExecutionDate(manager(), '2026-10'), '2026-09-23')
    assert.equal(await lib.salaryChangeExecutionDate(manager({ cycle: '31' }), '2026-03'), '2026-03-01')
    const stored = JSON.parse(request.payload); assert.equal(stored.salaryChangeApproval.actorUserId, actorId); assert.equal(stored.salaryChangeApproval.basisContentHash, value.salaryChangeBasis.contentHash)
    assert.deepEqual(em.data.salary, salary())
  } finally { salaryWriter.applyEmployeeSalaryChange = originalWriter }
})

test('due execution calls the shared writer with exact proposed amount, request reference and real approving actor', async () => {
  const value = await staged(), em = manager(), request = req(), originalWriter = salaryWriter.applyEmployeeSalaryChange, inputs = []
  salaryWriter.applyEmployeeSalaryChange = async (manager, input) => { assert.equal(manager, em); inputs.push(input); return { changed: true } }
  try {
    const result = await lib.executeSalaryChangeRequest(em, request, value, today)
    assert.equal(result.completed, true); assert.equal(inputs.length, 1); assert.equal(inputs[0].actorUserId, actorId)
    assert.equal(inputs[0].requestId, requestId); assert.equal(inputs[0].evidenceReference, `request:${requestId}`)
    assert.deepEqual(inputs[0].salary, salary({ basicSalary: '6600.00' })); assert.equal(inputs[0].expectedRevision, 0)
    assert.equal(inputs[0].effectivePayrollPeriod, '2026-09'); assert.equal('effectiveDate' in inputs[0], false)
  } finally { salaryWriter.applyEmployeeSalaryChange = originalWriter }
})

test('salary drift or request identity mismatch prevents both future scheduling and current execution', async () => {
  const value = await staged()
  await assert.rejects(lib.executeSalaryChangeRequest(manager({ salary: salary({ phoneAllowance: '51.00' }) }), req(), value, today), code('SALARY_REQUEST_SOURCE_CHANGED'))
  await assert.rejects(lib.executeSalaryChangeRequest(manager(), req({ id: 12 }), value, today), code('SALARY_REQUEST_BASIS_INVALID'))
})

test('execution requires trusted approval and allowed status; actor cannot be taken from request creator', async () => {
  const value = await staged()
  await assert.rejects(lib.executeSalaryChangeRequest(manager({ decision: null }), req({ createdByUserId: 999 }), value, today), code('SALARY_REQUEST_APPROVER_MISSING'))
  await assert.rejects(lib.executeSalaryChangeRequest(manager(), req({ status: 'UNDER_REVIEW' }), value, today), code('SALARY_REQUEST_NOT_APPROVED'))
})

test('explicit auto-approval context can schedule future execution and stored actor must match later audited decisions', async () => {
  const value = await staged({}, payload({ effectivePayrollPeriod: '2026-10' })), em = manager({ decision: null }), request = req()
  em.queryRunner.data.salaryRequestAutoActors = new Map([[requestId, 77]])
  await lib.executeSalaryChangeRequest(em, request, value, today)
  assert.equal(JSON.parse(request.payload).salaryChangeApproval.actorUserId, 77)
  const changed = JSON.parse(request.payload)
  await assert.rejects(lib.executeSalaryChangeRequest(manager(), req({ status: 'IN_EXECUTION' }), changed, today), code('SALARY_REQUEST_APPROVAL_INVALID'))
})

test('resubmission auto approval uses current transaction actor and ignores approval retained from an older cycle', async () => {
  const value = await staged({}, payload({ effectivePayrollPeriod: '2026-10' })), data = { decision: { id: 50, approverId: 22 }, returned: { id: 51, approverId: 23 } }
  const em = manager(data), request = req(); em.queryRunner.data.salaryRequestAutoActors = new Map([[requestId, 77]])
  await lib.executeSalaryChangeRequest(em, request, value, today)
  const stored = JSON.parse(request.payload); assert.equal(stored.salaryChangeApproval.actorUserId, 77)
  const waiting = await lib.executeSalaryChangeRequest(manager(data), req({ status: 'IN_EXECUTION' }), stored, today)
  assert.equal(waiting.completed, false)
  await assert.rejects(lib.executeSalaryChangeRequest(manager(data), req(), value, today), code('SALARY_REQUEST_APPROVER_MISSING'))
})

test('actual request runtime fields require payroll month/reason and remove derived/private custom inputs without modifying catalog', () => {
  const service = Object.create(RequestsService.prototype)
  const configured = { ...type, customFields: JSON.stringify([{ key: 'increase_pct', label: 'قديم', type: 'number', required: true }, { key: 'newSalary', label: 'قديم', type: 'number' }]) }
  const before = JSON.stringify(configured), fields = service.executionFormFields(configured)
  assert.deepEqual(JSON.parse(fields.requiredFields), ['newSalary', 'effectivePayrollPeriod', 'reason'])
  assert.equal(JSON.parse(fields.customFields).find(row => row.key === 'newSalary').type, 'text')
  assert.equal(JSON.parse(fields.customFields).some(row => row.key === 'increase_pct'), false); assert.equal(JSON.stringify(configured), before)
  service.assertSubmitValues(configured, JSON.stringify(payload())); assert.throws(() => service.assertSubmitValues(configured, JSON.stringify(payload({ effectivePayrollPeriod: '' }))))
})

test('actual configured chain retains managerial route and server-derived executive threshold at exact ten percent', async () => {
  const value = await staged({}, payload({ increase_pct: '0' })), service = Object.create(RequestsService.prototype)
  const chain = { id: 1, code: 'SALARY', branchId: null, isActive: true }
  const steps = [{ id: 1, stepOrder: 1, approverRole: 'hr' }, { id: 2, stepOrder: 2, approverRole: 'executive', thresholdField: 'increase_pct', thresholdOp: '>=', thresholdValue: 10 }]
  service.resolver = { resolveApproverEmployee: async () => null }
  const em = { getRepository(entity) {
    if (entity.name === 'ApprovalChain') return { findOne: async ({ where }) => where.id ? chain : null }
    if (entity.name === 'ApprovalStep') return { find: async () => steps }
    throw Error('unexpected repository')
  }, query: async (sql, args) => { assert.match(sql, /CAST\(\[thresholdValue\] AS nvarchar\(80\)\)/); assert.deepEqual(args, [1]); return [{ id: 2, value: '10.00' }] } }
  const result = await service.resolveChain({ ...type, approvalChainId: 1 }, req({ payload: JSON.stringify(value) }), em)
  assert.deepEqual(result.steps.map(row => row.role), ['hr', 'executive'])
})
