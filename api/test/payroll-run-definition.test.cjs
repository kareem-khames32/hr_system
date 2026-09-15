// الخطوات 16–18 (B3): منطق التعريف الصافي — مكان الموظف بتاريخ، والفلاتر المترابطة (OR داخل النوع وAND بينها)،
// والانتقال خارج النطاق، وترجمة نطاق المسير القديم، وثبات بصمة تقرير «بلا مسير». لا SQL.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const def = require('../src/payroll/payroll-run-definition')
const { payrollUnassignedReportHash } = require('../src/payroll/payroll-unassigned-report')

function history(overrides = {}) {
  return {
    today: '2026-09-14',
    versions: new Map(), transfers: new Map(),
    // فرع 1: قسم 10 (وقسمه الفرعي 11)، فريق 100 وفريق 110؛ فرع 2: قسم 20، فريق 200
    teamDepartment: new Map([[100, 10], [110, 11], [200, 20]]),
    departmentBranch: new Map([[10, 1], [11, 1], [20, 2]]),
    departmentParent: new Map([[10, null], [11, 10], [20, null]]),
    ...overrides,
  }
}
const filters = extra => ({ ...def.emptyPayrollRunFilters(), ...extra })

test('org at date: dated EMPLOYEE_ORG version wins, the legacy baseline covers earlier days, the file covers employees without history', () => {
  const h = history({
    versions: new Map([[7, [
      { version: 0, effectiveFrom: null, legacyBaseline: true, branchId: 1, valid: true },
      { version: 1, effectiveFrom: '2026-08-10', legacyBaseline: false, branchId: 2, valid: true },
    ]]]),
    transfers: new Map([[7, [{ id: 1, employeeId: 7, fromTeamId: 100, toTeamId: 200, effectiveDate: '2026-08-10', status: 'EXECUTED' }]]]),
  })
  const employee = { id: 7, branchId: 2, departmentId: 20, teamId: 200, costCenterId: null }
  assert.deepEqual(def.payrollOrgAt(h, employee, '2026-08-09'), { date: '2026-08-09', branchId: 1, departmentId: 10, teamId: 100, costCenterId: null, issues: [] })
  assert.deepEqual(def.payrollOrgAt(h, employee, '2026-08-10'), { date: '2026-08-10', branchId: 2, departmentId: 20, teamId: 200, costCenterId: null, issues: [] })
  assert.equal(def.payrollOrgAt(h, { id: 8, branchId: 1, departmentId: 10, teamId: 100 }, '2020-01-01').branchId, 1)
  assert.deepEqual(def.payrollOrgChangeDates(h, 7, '2026-07-23', '2026-08-22'), ['2026-08-10'])
})

test('org at date: a future scheduled transfer applies at period end; a past-due unexecuted one is flagged and ignored', () => {
  const h = history({ transfers: new Map([[9, [
    { id: 3, employeeId: 9, fromTeamId: 100, toTeamId: 200, effectiveDate: '2026-10-05', status: 'SCHEDULED' },
  ]], [10, [
    { id: 4, employeeId: 10, fromTeamId: 100, toTeamId: 200, effectiveDate: '2026-09-01', status: 'SCHEDULED' },
  ]]]) })
  const future = def.payrollOrgAt(h, { id: 9, branchId: 1, departmentId: 10, teamId: 100 }, '2026-10-22')
  assert.deepEqual([future.branchId, future.departmentId, future.teamId], [2, 20, 200])
  const pending = def.payrollOrgAt(h, { id: 10, branchId: 1, departmentId: 10, teamId: 100 }, '2026-10-22')
  assert.deepEqual([pending.branchId, pending.teamId], [1, 100])
  assert.equal(pending.issues[0].code, 'ORG_TRANSFER_PENDING')
})

test('org at date: a department/team edit from the employee file (no transfer) applies from the day it was recorded; earlier days keep the old values', () => {
  const change = (id, field, oldValue, newValue, date, extra = {}) => ({ id, employeeId: 11, field, oldValue, newValue, date, requestId: null, transferId: null, valid: true, ...extra })
  const h = history({ fieldChanges: new Map([[11, [change(1, 'departmentId', 10, 20, '2026-09-14'), change(2, 'teamId', 100, 200, '2026-09-14')]]]) })
  const employee = { id: 11, branchId: 1, departmentId: 20, teamId: 200 }
  assert.deepEqual(def.payrollOrgAt(h, employee, '2026-08-22'), { date: '2026-08-22', branchId: 1, departmentId: 10, teamId: 100, costCenterId: null, issues: [] })
  assert.deepEqual([def.payrollOrgAt(h, employee, '2026-09-13').departmentId, def.payrollOrgAt(h, employee, '2026-09-13').teamId], [10, 100])
  assert.deepEqual([def.payrollOrgAt(h, employee, '2026-09-14').departmentId, def.payrollOrgAt(h, employee, '2026-09-14').teamId], [20, 200])
  assert.deepEqual(def.payrollOrgChangeDates(h, 11, '2026-08-22', '2026-09-22'), ['2026-09-14'])
  // عضوية فلتر القسم لشهر أغسطس تتبع القسم القديم، لا الملف الحالي.
  const august = def.payrollOrgAt(h, employee, '2026-08-22')
  assert.equal(def.payrollRunFilterMatches(filters({ departmentIds: [10] }), 11, august, new Set([10])), true)
  assert.equal(def.payrollRunFilterMatches(filters({ departmentIds: [20] }), 11, august, new Set([20])), false)
  // تعديلان متتاليان: الرجوع من الأحدث للأقدم.
  const twice = history({ fieldChanges: new Map([[11, [change(3, 'teamId', 100, 110, '2026-08-01'), change(4, 'teamId', 110, 200, '2026-09-01')]]]) })
  assert.deepEqual(['2026-07-31', '2026-08-15', '2026-09-02'].map(date => def.payrollOrgAt(twice, { ...employee, departmentId: 10 }, date).teamId), [100, 110, 200])
  // صف تالف لا يُطبق ويظهر كمشكلة.
  const broken = history({ fieldChanges: new Map([[11, [change(5, 'teamId', null, null, '2026-09-01', { valid: false })]]]) })
  const withIssue = def.payrollOrgAt(broken, employee, '2026-08-22')
  assert.deepEqual([withIssue.teamId, withIssue.issues.map(issue => issue.code)], [200, ['ORG_CHANGE_LOG_INVALID']])
})

test('org at date: change-log rows written by a transfer execution follow the transfer effective date, not the day they were recorded', () => {
  const h = history({
    transfers: new Map([[12, [{ id: 7, employeeId: 12, fromTeamId: null, toTeamId: 200, effectiveDate: '2026-08-10', status: 'EXECUTED', requestId: 55, executedDate: '2026-09-10' }]]]),
    fieldChanges: new Map([[12, [
      { id: 8, employeeId: 12, field: 'teamId', oldValue: 110, newValue: 200, date: '2026-09-10', requestId: 55, transferId: null, valid: true },
      { id: 9, employeeId: 12, field: 'departmentId', oldValue: 11, newValue: 20, date: '2026-09-10', requestId: 55, transferId: null, valid: true },
    ]]]),
  })
  def.attachTransferChanges(h)
  assert.deepEqual(h.fieldChanges.get(12).map(row => row.transferId), [7, 7])
  const employee = { id: 12, branchId: 2, departmentId: 20, teamId: 200 }
  const before = def.payrollOrgAt(h, employee, '2026-08-09')
  assert.deepEqual([before.departmentId, before.teamId, before.issues], [11, 110, []], 'the transfer revert uses the recorded old values')
  const after = def.payrollOrgAt(h, employee, '2026-08-15')
  assert.deepEqual([after.departmentId, after.teamId], [20, 200], 'rows of a back-dated transfer do not revert at their recording day')
  assert.deepEqual(def.payrollOrgChangeDates(h, 12, '2026-07-23', '2026-09-22'), ['2026-08-10'])
  // نقل بلا طلب: يُربط بيوم التنفيذ والوجهة.
  const noRequest = history({
    transfers: new Map([[13, [{ id: 9, employeeId: 13, fromTeamId: 100, toTeamId: 200, effectiveDate: '2026-08-10', status: 'EXECUTED', requestId: null, executedDate: '2026-08-12' }]]]),
    fieldChanges: new Map([[13, [{ id: 10, employeeId: 13, field: 'teamId', oldValue: 100, newValue: 200, date: '2026-08-12', requestId: null, transferId: null, valid: true },
      { id: 11, employeeId: 13, field: 'teamId', oldValue: 200, newValue: 110, date: '2026-08-12', requestId: null, transferId: null, valid: true }]]]),
  })
  def.attachTransferChanges(noRequest)
  assert.deepEqual(noRequest.fieldChanges.get(13).map(row => row.transferId), [9, null])
})

test('legacy calculate endpoints are allowed only on disposable test databases, never on the company database', () => {
  assert.equal(def.payrollLegacyCalculateAllowed('hr_system'), false)
  assert.equal(def.payrollLegacyCalculateAllowed('hr_review_pre_payroll_20260911162404_52ee65ac'), false)
  assert.equal(def.payrollLegacyCalculateAllowed(undefined), false)
  assert.equal(def.payrollLegacyCalculateAllowed('hr_run_definition_test_0123456789abcdef'), true)
})

test('filters: OR inside one type, AND between types; sub-departments follow the chosen department; a list alone keeps moved employees', () => {
  const h = history()
  const at = (branchId, departmentId, teamId) => ({ branchId, departmentId, teamId, costCenterId: null })
  const branches = filters({ branchIds: [1, 2] })
  assert.equal(def.payrollRunFilterMatches(branches, 1, at(1, 10, 100), new Set()), true)
  assert.equal(def.payrollRunFilterMatches(branches, 1, at(2, 20, 200), new Set()), true)
  const linked = filters({ branchIds: [1], departmentIds: [10] })
  const departments = def.payrollDepartmentSet(h, [10], true)
  assert.deepEqual([...departments].sort(), [10, 11])
  assert.equal(def.payrollRunFilterMatches(linked, 1, at(1, 11, 110), departments), true)
  assert.equal(def.payrollRunFilterMatches(linked, 1, at(2, 10, 100), departments), false, 'AND between branch and department')
  const list = filters({ employeeIds: [5] })
  assert.equal(def.payrollRunSelectionMode(list), 'LIST')
  assert.equal(def.payrollRunFilterMatches(list, 5, at(2, 20, 200), new Set()), true)
  const filteredList = filters({ branchIds: [1], employeeIds: [5] })
  assert.equal(def.payrollRunSelectionMode(filteredList), 'FILTERED_LIST')
  assert.equal(def.payrollRunFilterMatches(filteredList, 5, at(2, 20, 200), new Set()), false)
  assert.equal(def.payrollRunFilterMatches(filters(), 5, at(1, 10, 100), new Set()), false, 'an empty definition matches nobody')
})

test('transferred out: the last in-scope day inside the period is found from change dates', () => {
  const h = history({ versions: new Map([[7, [
    { version: 0, effectiveFrom: null, legacyBaseline: true, branchId: 1, valid: true },
    { version: 1, effectiveFrom: '2026-08-10', legacyBaseline: false, branchId: 2, valid: true },
  ]]]) })
  const employee = { id: 7, branchId: 2, departmentId: 20, teamId: 200 }
  const last = def.payrollRunLastInScope(h, filters({ branchIds: [1] }), employee, '2026-07-23', '2026-08-22', new Set())
  assert.equal(last.date, '2026-08-09'); assert.equal(last.branchId, 1)
  assert.equal(def.payrollRunLastInScope(h, filters({ branchIds: [3] }), employee, '2026-07-23', '2026-08-22', new Set()), null)
})

test('legacy scopes map to the same filters, and definition columns keep the most specific type for old readers', () => {
  const legacy = def.payrollRunDefinitionOf({ definition: null, scopeType: 'BRANCH', scopeIds: null, employeeIds: null, branchId: 4 })
  assert.deepEqual([legacy.source, legacy.mode, legacy.filters.branchIds, legacy.filters.includeSubDepartments], ['LEGACY_SCOPE', 'FILTERS', [4], false])
  assert.deepEqual(def.payrollRunDefinitionOf({ definition: null, scopeType: 'CUSTOM', scopeIds: null, employeeIds: '[3,1,3]', branchId: null }).filters.employeeIds, [1, 3])
  const stored = { version: 1, source: 'DEFINITION', mode: 'FILTERS', filters: filters({ branchIds: [1], teamIds: [100] }),
    exclusions: [{ employeeId: 5, reason: 'يُصرف في مسير آخر', byUserId: 1, at: '2026-09-14T00:00:00.000Z' }], emptyScope: null }
  const columns = def.payrollRunDefinitionColumns(stored)
  assert.deepEqual([columns.scopeType, columns.scopeIds, columns.employeeIds, columns.branchId], ['TEAM', '[100]', null, null])
  const roundTrip = def.payrollRunDefinitionOf({ ...columns })
  assert.deepEqual([roundTrip.source, roundTrip.filters.teamIds, roundTrip.exclusions[0].reason], ['DEFINITION', [100], 'يُصرف في مسير آخر'])
  assert.throws(() => def.payrollRunDefinitionOf({ definition: '{"version":9}', scopeType: 'BRANCH', scopeIds: null, employeeIds: null, branchId: 1 }), /تعريف المسير المحفوظ غير صالح/)
})

test('unassigned report hash: stable for the same rows, changes with a new row or reason, ignores the referenced run status', () => {
  const base = { period: '2026-08', startDate: '2026-07-23', endDate: '2026-08-22', scopeBranchId: null,
    filters: { branchId: null, departmentId: null, teamId: null }, includeSuspended: false,
    rows: [{ employeeId: 3, reasonCode: 'EXCLUDED_IN_RUN', coverFrom: '2026-07-23', coverTo: '2026-08-22', runs: [{ runId: 9, status: 'CALCULATED', exclusionReason: 'EXC_MANUAL_EXCLUSION' }] }] }
  const hash = payrollUnassignedReportHash(base)
  assert.match(hash, /^[a-f0-9]{64}$/)
  assert.equal(payrollUnassignedReportHash(JSON.parse(JSON.stringify(base))), hash)
  assert.equal(payrollUnassignedReportHash({ ...base, rows: [{ ...base.rows[0], runs: [{ ...base.rows[0].runs[0], status: 'APPROVED' }] }] }), hash)
  assert.notEqual(payrollUnassignedReportHash({ ...base, rows: [...base.rows, { employeeId: 4, reasonCode: 'OUT_OF_ALL_RUNS', coverFrom: null, coverTo: null, runs: [] }] }), hash)
  assert.notEqual(payrollUnassignedReportHash({ ...base, rows: [{ ...base.rows[0], reasonCode: 'CANCELLED_RUN_ONLY' }] }), hash)
  assert.notEqual(payrollUnassignedReportHash({ ...base, scopeBranchId: 1 }), hash)
})
