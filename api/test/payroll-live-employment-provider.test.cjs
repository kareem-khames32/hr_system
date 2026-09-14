// قراءة المصدر باستبدال EntityManager.query فقط؛ لا قاعدة بيانات أو إعادة حساب حضور.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { readPayrollLiveEmployment: read } = require('../src/payroll/payroll-live-employment-provider')
const { payrollLiveSourceContent } = require('../src/payroll/payroll-live-source-contract')
const period = ['2026-06-01', '2026-06-30']
const employee = extra => ({ id: 42, joinDate: '2020-01-01', actualStartDate: null, status: 'active', isActive: true, archivedAt: null,
  currency: 'SAR', basicSalary: '9000.00', housingAllowance: '1000.00', transportAllowance: '200.00', phoneAllowance: '50.00', workNatureAllowance: '100.00', otherAllowance: '0.00', ...extra })
const offboarding = (id = 1, extra = {}) => ({ id, employeeId: 42, lastWorkingDay: '2026-06-20', status: 'CLOSED', resignationRequestId: 10, ...extra })
const history = extra => ({ id: 2, employeeId: 42, changeType: 'STATUS', fieldName: 'status', oldStatus: 'probation', newStatus: 'active', oldValueRaw: '"probation"', newValueRaw: '"active"', changedAt: '2026-01-01T09:00:00.000', requestId: null, ...extra })
const attendance = (day = '2026-06-01', extra = {}) => ({ id: 3, employeeId: 42, branchId: 1, date: day, checkIn: '09:30', checkOut: '18:30', shiftName: 'وردية', shiftStart: '09:00', shiftEnd: '18:00', shiftId: 2, scheduleSource: 'week', unscheduled: false, status: 'present',
  lateMinutes: 0, earlyLeaveMinutes: 0, excusedMinutes: 0, deductibleMinutes: 0, workMinutes: 540, rawLateMinutes: 30, unexcusedLateMinutes: 30, shortfallMinutes: 0, countedWorkMinutes: 540, earlyArrivalMinutes: 0, graceUsed: 0,
  flexOutcome: 'WITHIN_WINDOW', attendanceReviewRequired: false, attendanceReviewReason: null, leaveConflict: false, punchAnomalies: null,
  attendanceRuleSnapshotRaw: JSON.stringify({ schemaVersion: 1, date: day, flexEnabled: true, flexWindowMinutes: 60, rawLateMinutes: 30, unexcusedLateMinutes: 30 }), computedAt: '2026-06-02T01:00:00.000', ...extra })
function manager({ employeeRows = [employee()], cases = [], histories = [], days = [] } = {}) {
  const calls = [], input = { employeeRows, cases, histories, days }, original = JSON.stringify(input)
  return { calls, input, original, query: async (sql, params) => {
    assert.match(sql, /^SELECT\b/); assert.doesNotMatch(sql, /\b(?:UPDATE|INSERT|DELETE|MERGE|EXEC|CREATE|ALTER|DROP)\b/i)
    assert.ok(Array.isArray(params)); assert.equal(params[0], 42); assert.doesNotMatch(sql, /\b42\b/)
    calls.push({ sql, params })
    if (sql.includes('FROM [employees]')) return employeeRows
    if (sql.includes('FROM [offboarding_cases]')) return cases
    if (sql.includes('FROM [employee_status_history]')) return histories
    if (sql.includes('FROM [attendance_days]')) return days
    throw Error('unrecognized read')
  } }
}
const code = (section, expected) => section.issues.some(issue => issue.code === expected)

test('active employee has full documented employment coverage; salary and attendance remain explicitly unsupported', async () => {
  const em = manager(), result = await read(em, 42, ...period)
  assert.equal(result.employment.state, 'AVAILABLE'); assert.deepEqual(result.employment.data.coverage, { from: period[0], to: period[1], days: 30 })
  assert.equal(result.employment.data.hireDate, '2020-01-01'); assert.equal(result.employment.data.hireDateSource, 'JOIN_DATE')
  assert.equal(result.compensation.state, 'UNSUPPORTED'); assert.equal(result.compensation.data.current.basicSalary, '9000.00'); assert.equal(result.compensation.data.datedSegments, null)
  assert.equal(result.attendance.state, 'UNSUPPORTED'); assert.equal(result.attendance.data.missingDates.length, 30)
  assert.equal(em.calls.length, 4); assert.deepEqual(em.calls[3].params, [42, ...period])
})

test('partial hire and actual start precedence produce inclusive coverage without full-month guessing', async () => {
  const result = await read(manager({ employeeRows: [employee({ actualStartDate: '2026-06-16' })] }), 42, ...period)
  assert.equal(result.employment.state, 'AVAILABLE'); assert.deepEqual(result.employment.data.coverage, { from: '2026-06-16', to: '2026-06-30', days: 15 })
  assert.equal(result.employment.data.hireDateSource, 'ACTUAL_START_DATE')
})

test('documented termination includes the last working day and never uses administrative archive time', async () => {
  const result = await read(manager({ employeeRows: [employee({ status: 'terminated', isActive: false, archivedAt: '2026-08-15T10:00:00' })], cases: [offboarding()] }), 42, ...period)
  assert.equal(result.employment.state, 'AVAILABLE'); assert.deepEqual(result.employment.data.coverage, { from: '2026-06-01', to: '2026-06-20', days: 20 })
  assert.equal(result.employment.data.endDate, '2026-06-20'); assert.deepEqual(result.employment.data.endSourceRefs, ['offboarding_cases:1'])
})

test('notice period uses its actual offboarding document and cancelled cases do not end service', async () => {
  const notice = await read(manager({ employeeRows: [employee({ status: 'notice_period' })], cases: [offboarding(1, { status: 'IN_CLEARANCE' })] }), 42, ...period)
  assert.equal(notice.employment.data.coverage.days, 20)
  const cancelled = await read(manager({ cases: [offboarding(1, { status: 'CANCELLED' })] }), 42, ...period)
  assert.equal(cancelled.employment.state, 'AVAILABLE'); assert.equal(cancelled.employment.data.coverage.days, 30); assert.equal(cancelled.employment.data.endDate, null)
})

test('missing hire never becomes 1900 and an invalid preferred start never falls back to join date', async () => {
  const missing = await read(manager({ employeeRows: [employee({ joinDate: null, actualStartDate: null })] }), 42, ...period)
  assert.equal(missing.employment.state, 'MISSING'); assert.equal(missing.employment.data.hireDate, null); assert.equal(missing.employment.data.coverage, null); assert.ok(code(missing.employment, 'EMPLOYMENT_HIRE_DATE_MISSING'))
  const invalid = await read(manager({ employeeRows: [employee({ actualStartDate: '2026-02-30' })] }), 42, ...period)
  assert.equal(invalid.employment.state, 'INVALID'); assert.equal(invalid.employment.data.coverage, null)
})

test('archived or inactive employee without an end document stays unresolved despite archivedAt', async () => {
  for (const status of ['archived', 'terminated', 'active']) {
    const result = await read(manager({ employeeRows: [employee({ status, isActive: false, archivedAt: '2026-06-10T12:00:00' })] }), 42, ...period)
    assert.equal(result.employment.state, 'MISSING'); assert.equal(result.employment.data.coverage, null); assert.equal(result.employment.data.endDate, null)
    assert.ok(code(result.employment, 'EMPLOYMENT_END_DOCUMENT_MISSING'))
  }
})

test('suspension and ambiguous lifecycle history never fabricate paid service intervals', async () => {
  for (const isActive of [true, false]) {
    const result = await read(manager({ employeeRows: [employee({ status: 'suspended', isActive })] }), 42, ...period)
    assert.equal(result.employment.state, 'UNSUPPORTED'); assert.equal(result.employment.data.coverage, null)
  }
  const suspended = await read(manager({ histories: [history({ oldStatus: 'suspended' })] }), 42, ...period)
  assert.equal(suspended.employment.state, 'UNSUPPORTED'); assert.ok(code(suspended.employment, 'EMPLOYMENT_SUSPENSION_HISTORY_UNSUPPORTED'))
  const rehire = await read(manager({ histories: [history({ oldStatus: 'terminated' })] }), 42, ...period)
  assert.ok(code(rehire.employment, 'EMPLOYMENT_REHIRE_UNSUPPORTED')); assert.equal(rehire.employment.data.coverage, null)
})

test('multiple end dates, active-after-closed and earlier service end all require documented rehire history', async () => {
  const conflict = await read(manager({ employeeRows: [employee({ status: 'terminated', isActive: false })], cases: [offboarding(1), offboarding(2, { lastWorkingDay: '2026-06-25' })] }), 42, ...period)
  assert.equal(conflict.employment.state, 'UNSUPPORTED'); assert.ok(code(conflict.employment, 'EMPLOYMENT_END_CONFLICT')); assert.equal(conflict.employment.data.endDate, null)
  const active = await read(manager({ cases: [offboarding()] }), 42, ...period)
  assert.ok(code(active.employment, 'EMPLOYMENT_ACTIVE_AFTER_END')); assert.equal(active.employment.data.coverage, null)
  const prior = await read(manager({ employeeRows: [employee({ actualStartDate: '2026-06-01' })], cases: [offboarding(1, { lastWorkingDay: '2026-05-20' })] }), 42, ...period)
  assert.ok(code(prior.employment, 'EMPLOYMENT_REHIRE_UNSUPPORTED')); assert.equal(prior.employment.state, 'UNSUPPORTED')
})

test('out-of-period employment is AVAILABLE with a documented empty intersection, not a fabricated salary', async () => {
  const future = await read(manager({ employeeRows: [employee({ joinDate: '2026-07-01' })] }), 42, ...period)
  assert.equal(future.employment.state, 'AVAILABLE'); assert.equal(future.employment.data.coverage, null)
  const ended = await read(manager({ employeeRows: [employee({ status: 'terminated', isActive: false })], cases: [offboarding(1, { lastWorkingDay: '2026-05-31' })] }), 42, ...period)
  assert.equal(ended.employment.state, 'AVAILABLE'); assert.equal(ended.employment.data.coverage, null)
})

test('bad end documents, invalid employee state and corrupt lifecycle JSON are detailed rather than used', async () => {
  const badDate = await read(manager({ cases: [offboarding(1, { lastWorkingDay: '2026-02-30' })] }), 42, ...period)
  assert.equal(badDate.employment.state, 'INVALID'); assert.ok(code(badDate.employment, 'EMPLOYMENT_END_DOCUMENT_INVALID'))
  const badState = await read(manager({ employeeRows: [employee({ status: 'unknown' })] }), 42, ...period)
  assert.equal(badState.employment.state, 'INVALID')
  const corrupt = await read(manager({ histories: [history({ oldValueRaw: '{broken' })] }), 42, ...period)
  assert.equal(corrupt.employment.state, 'INVALID'); assert.equal(corrupt.employment.data.lifecycleEvidence[0].oldValue.raw, '{broken')
  assert.ok(code(corrupt.employment, 'EMPLOYMENT_HISTORY_JSON_INVALID'))
})

test('exact current six-field DECIMAL strings retain large cents but cannot become dated salary segments', async () => {
  const em = manager({ employeeRows: [employee({ basicSalary: '9007199254740991.91', phoneAllowance: '0.09' })] }), result = await read(em, 42, ...period)
  assert.equal(result.compensation.data.current.basicSalary, '9007199254740991.91'); assert.equal(result.compensation.data.current.phoneAllowance, '0.09')
  assert.equal(Object.keys(result.compensation.data.current).length, 6); assert.equal(result.compensation.data.datedSegments, null); assert.equal('salarySegments' in result.compensation.data, false)
  assert.ok(code(result.compensation, 'COMPENSATION_EFFECTIVE_HISTORY_UNSUPPORTED'))
  for (const key of ['basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance']) assert.ok(em.calls[0].sql.includes(`CAST([${key}] AS nvarchar(80))`))
})

test('missing salary components remain null and invalid/number/currency values do not gain fallback defaults', async () => {
  const result = await read(manager({ employeeRows: [employee({ phoneAllowance: null, workNatureAllowance: -1, otherAllowance: '-20.00', currency: 'USD' })] }), 42, ...period)
  assert.equal(result.compensation.state, 'UNSUPPORTED'); assert.equal(result.compensation.data.current.phoneAllowance, null); assert.equal(result.compensation.data.current.workNatureAllowance, null)
  assert.equal(result.compensation.data.current.otherAllowance, '-20.00'); assert.ok(code(result.compensation, 'COMPENSATION_COMPONENT_MISSING')); assert.ok(code(result.compensation, 'COMPENSATION_COMPONENT_INVALID')); assert.ok(code(result.compensation, 'COMPENSATION_CURRENCY_UNSUPPORTED'))
})

test('stored attendance exposes raw/unexcused integer minutes, snapshot and review evidence without claiming raw seconds', async () => {
  const result = await read(manager({ days: [attendance()] }), 42, ...period), data = result.attendance.data, row = data.rows[0]
  assert.equal(result.attendance.state, 'UNSUPPORTED'); assert.equal(row.rawLateMinutes, 30); assert.equal(row.unexcusedLateMinutes, 30); assert.equal(row.lateMinutes, 0)
  assert.equal(row.ruleSnapshot.value.flexEnabled, true); assert.equal(row.computedAt, '2026-06-02T01:00:00.000'); assert.equal(row.sourceRef, 'attendance_days:3')
  assert.equal(data.rawSecondsAvailable, false); assert.equal(data.historicalScheduleAvailable, false); assert.equal(data.missingDates.length, 29)
  assert.equal('rawLateSeconds' in row, false)
})

test('even complete attendance rows are unsupported and cannot establish the historical work schedule', async () => {
  const days = Array.from({ length: 30 }, (_, i) => attendance(`2026-06-${String(i + 1).padStart(2, '0')}`, { id: i + 1 }))
  const result = await read(manager({ days }), 42, ...period)
  assert.equal(result.attendance.state, 'UNSUPPORTED'); assert.deepEqual(result.attendance.data.missingDates, []); assert.equal(result.attendance.data.historicalScheduleAvailable, false)
  assert.equal(result.attendance.sourceRefs.length, 30)
})

test('missing and duplicate attendance dates are diagnostic; no missing day becomes absent or off', async () => {
  const result = await read(manager({ days: [attendance(), attendance('2026-06-01', { id: 4 })] }), 42, ...period)
  assert.deepEqual(result.attendance.data.duplicateDates, ['2026-06-01']); assert.equal(result.attendance.data.missingDates.length, 29)
  assert.ok(code(result.attendance, 'ATTENDANCE_DAYS_DUPLICATED')); assert.ok(code(result.attendance, 'ATTENDANCE_DAYS_MISSING'))
  assert.equal(result.attendance.data.rows.length, 2)
})

test('attendance corrupt JSON, mismatched snapshot, null legacy metrics and review flags are kept explicit', async () => {
  const result = await read(manager({ days: [attendance('2026-06-01', { attendanceRuleSnapshotRaw: '{broken', rawLateMinutes: null, unexcusedLateMinutes: null, countedWorkMinutes: null, computedAt: null, attendanceReviewRequired: true, attendanceReviewReason: 'missing evidence' }),
    attendance('2026-06-02', { id: 4, attendanceRuleSnapshotRaw: '{"schemaVersion":1,"date":"2026-06-03"}', leaveConflict: true })] }), 42, ...period)
  assert.equal(result.attendance.data.rows[0].ruleSnapshot.raw, '{broken'); assert.equal(result.attendance.data.rows[0].ruleSnapshot.state, 'INVALID')
  for (const expected of ['ATTENDANCE_RULE_SNAPSHOT_INVALID', 'ATTENDANCE_RULE_SNAPSHOT_UNSUPPORTED', 'ATTENDANCE_METRIC_MISSING', 'ATTENDANCE_COMPUTED_AT_MISSING', 'ATTENDANCE_REVIEW_REQUIRED']) assert.ok(code(result.attendance, expected), expected)
  assert.equal(result.attendance.data.rows[0].rawLateMinutes, null)
})

test('nonfinite or unsafe JSON values cannot silently corrupt readable attendance snapshot data', async () => {
  for (const raw of ['{"schemaVersion":1e400}', '{"schemaVersion":1,"id":9007199254740993}', '{"__proto__":{"x":1}}']) {
    const result = await read(manager({ days: [attendance('2026-06-01', { attendanceRuleSnapshotRaw: raw })] }), 42, ...period)
    assert.equal(result.attendance.data.rows[0].ruleSnapshot.state, 'INVALID'); assert.equal(result.attendance.data.rows[0].ruleSnapshot.value, null); assert.equal(result.attendance.data.rows[0].ruleSnapshot.raw, raw)
    assert.doesNotThrow(() => payrollLiveSourceContent(result))
  }
})

test('large row sets are bounded and explicitly unsupported instead of pretending the truncated source is complete', async () => {
  const days = Array.from({ length: 5001 }, (_, i) => attendance('2026-06-01', { id: i + 1, attendanceRuleSnapshotRaw: null })), result = await read(manager({ days }), 42, ...period)
  assert.equal(result.attendance.data.rows.length, 5000); assert.ok(code(result.attendance, 'ATTENDANCE_SOURCE_LIMIT'))
  const cases = Array.from({ length: 5001 }, (_, i) => offboarding(i + 1, { status: 'CANCELLED' }))
  const casesResult = await read(manager({ cases }), 42, ...period)
  assert.equal(casesResult.employment.state, 'UNSUPPORTED'); assert.equal(casesResult.employment.data.offboardingCases.length, 5000); assert.ok(code(casesResult.employment, 'EMPLOYMENT_SOURCE_LIMIT'))
})

test('valid leap/32-day/year-one intervals are supported while invalid or oversized requests make no SQL read', async () => {
  const result = await read(manager({ employeeRows: [employee({ joinDate: '0001-01-01' })] }), 42, '0001-01-01', '0001-02-01')
  assert.equal(result.employment.data.coverage.days, 32); assert.equal(result.attendance.data.missingDates.at(-1), '0001-02-01')
  const leap = await read(manager(), 42, '2024-02-01', '2024-02-29'); assert.equal(leap.employment.data.coverage.days, 29)
  for (const dates of [['2026-02-30', '2026-03-01'], ['2026-06-30', '2026-06-01'], ['2026-06-01', '2026-07-03']]) {
    const em = manager(); await assert.rejects(() => read(em, 42, ...dates)); assert.equal(em.calls.length, 0)
  }
  const em = manager(); await assert.rejects(() => read(em, 0, ...period)); assert.equal(em.calls.length, 0)
})

test('missing employee produces MISSING groups, and query errors propagate instead of masquerading as absent data', async () => {
  const em = manager({ employeeRows: [] }), result = await read(em, 42, ...period)
  for (const section of Object.values(result)) { assert.equal(section.state, 'MISSING'); assert.equal(section.data, null) }
  assert.equal(em.calls.length, 1)
  await assert.rejects(() => read({ query: async () => { throw Error('SQL failure') } }, 42, ...period), /SQL failure/)
})

test('data and references serialize canonically, stay immutable, and never mutate fetched rows', async () => {
  const em = manager({ days: [attendance()], histories: [history()] }), result = await read(em, 42, ...period)
  assert.equal(JSON.stringify(em.input), em.original); assert.equal(Object.isFrozen(em.input.employeeRows[0]), false)
  assert.ok(Object.isFrozen(result)); assert.ok(Object.isFrozen(result.attendance.data.rows[0].ruleSnapshot.value))
  assert.ok(result.employment.sourceRefs.includes('employee_status_history:2')); assert.deepEqual(result.compensation.sourceRefs, ['employees:42']); assert.deepEqual(result.attendance.sourceRefs, ['attendance_days:3'])
  assert.doesNotThrow(() => payrollLiveSourceContent(result)); assert.equal(JSON.stringify(result).includes('undefined'), false)
})
