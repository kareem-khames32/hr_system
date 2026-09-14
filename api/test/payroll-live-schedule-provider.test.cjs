'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
// اختبار ربط المصدر فقط؛ اختبارات التقويم المستقلة تغطي اختيار نسخته الفعلية.
const calendarResolver = require('../src/attendance/attendance-calendar-resolver')
calendarResolver.resolveEmployeeCalendarDay = async (em, employeeId, date, options) => {
  assert.equal(options.strict, true); assert.ok(options.cache); assert.equal(employeeId, id)
  return em.data.calendar?.(date) ?? { state: 'MISSING', date, working: null, dayKind: null, branchId: null,
    country: null, weekendDays: null, versionRefs: [], legacyFallback: false,
    issues: [{ code: 'CALENDAR_VERSION_MISSING', message: 'التقويم المؤرخ غير موجود' }] }
}
const { readPayrollLiveSchedule: read } = require('../src/payroll/payroll-live-schedule-provider')
const { payrollLiveSourceContent } = require('../src/payroll/payroll-live-source-contract')
const id = 42, from = '2026-06-01', to = '2026-06-07'
const employee = extra => ({ id, branchId: 1, workScheduleId: 8, branchSourceId: 1, country: 'EG', weekendDays: 'FRI,SAT', ...extra })
const source = extra => ({ name: 'الدوام', startTime: '09:00', endTime: '18:00', requiredWorkMinutes: 540, flexEnabled: true, flexWindowMinutes: 60, isActive: true, weekendDays: 'FRI,SAT', isDefault: false, ...extra })
const version = (type, sourceId, seq = 1, date = '2026-01-01', patch = {}) => ({ id: type === 'EMPLOYEE' ? 100 + seq : type === 'SHIFT' ? 200 + seq : 300 + seq,
  sourceType: type, sourceId, version: seq, effectiveFrom: date, legacyBaseline: false,
  snapshotRaw: JSON.stringify(type === 'EMPLOYEE' ? { workScheduleId: 8, flexOverrideMode: 'INHERIT' } : source()), ...patch })
const weekly = extra => ({ id: 7, employeeId: id, weekStart: '2026-05-31', shiftId: 9, shiftName: 'الوردية', startTime: '07:00', endTime: '16:00', ...extra })
const override = extra => ({ id: 9, employeeId: id, date: '2026-06-03', shiftId: 10, shiftName: 'وردية اليوم', startTime: '10:00', endTime: '19:00', ...extra })
const holiday = extra => ({ id: 50, name: 'عطلة', date: '2026-06-02', endDate: null, country: 'EG', ...extra })
const exception = extra => ({ id: 60, name: 'استثناء', weekday: 'SAT', occurrence: 'LAST', effect: 'WORK', branchId: null, isActive: true, ...extra })
function manager(patch = {}) {
  const data = { employee: [employee()], weekly: [], overrides: [], versions: [version('EMPLOYEE', id), version('WORK_SCHEDULE', 8)], config: [{ key: 'attendance.weekend_days', value: 'FRI,SAT' }], holidays: [], exceptions: [], ...patch }
  const calls = [], before = JSON.stringify(data)
  return { calls, data, before, queryRunner: { isTransactionActive: true }, async query(sql, params) {
    assert.match(sql, /^SELECT\b/); assert.doesNotMatch(sql, /\b(?:UPDATE|INSERT|DELETE|MERGE|EXEC|CREATE|ALTER|DROP|NOLOCK|READUNCOMMITTED)\b/i)
    assert.equal(params[0], id); assert.deepEqual(params.slice(1), [from, to, '2026-05-31']); calls.push({ sql, params })
    const key = sql.startsWith('SELECT e.[id]') ? 'employee' : sql.includes('FROM [weekly_schedule_entries] WHERE') ? 'weekly' : sql.includes('FROM [schedule_day_overrides] WHERE') ? 'overrides' :
      sql.includes('FROM [attendance_rule_versions]') ? 'versions' : sql.includes('FROM [requests_config]') ? 'config' : sql.includes('FROM [public_holidays]') ? 'holidays' : sql.includes('FROM [schedule_exception_rules]') ? 'exceptions' : null
    assert.ok(key, sql); if (data[key] instanceof Error) throw data[key]; return structuredClone(data[key])
  }, find() { throw Error('fallback resolver forbidden') }, getRepository() { throw Error('entity hydration forbidden') } }
}
const run = (patch = {}) => read(manager(patch), id, from, to)
const has = (result, code) => assert.ok(result.issues.some(row => row.code === code), `${code}: ${JSON.stringify(result.issues)}`)
const dayHas = (day, code) => assert.ok(day.issues.some(row => row.code === code), `${code}: ${JSON.stringify(day.issues)}`)

test('explicit employee and source versions supply timings without inventing missing historical calendar', async () => {
  const em = manager(), result = await read(em, id, from, to)
  assert.equal(result.state, 'MISSING'); assert.equal(result.data.basis, 'DATED_PLAN_AND_EXPLICIT_CALENDAR')
  assert.equal(result.data.scheduledWorkDates, null); assert.equal(result.data.historicalCalendarComplete, false); has(result, 'CALENDAR_VERSION_MISSING')
  assert.equal(result.data.days.length, 7); const day = result.data.days[0]
  assert.equal(day.timingState, 'AVAILABLE'); assert.equal(day.calendarState, 'MISSING'); assert.equal(day.scheduled, null)
  assert.deepEqual(day.timing, { startTime: '09:00', endTime: '18:00', requiredWorkMinutes: 540, flexEnabled: true, flexWindowMinutes: 60 })
  assert.equal(day.assignment.kind, 'EMPLOYEE'); assert.equal(day.sourceRule.versionId, 301); assert.equal(day.employeeRule.effectiveFrom, '2026-01-01')
  assert.equal(em.calls.length, 7); assert.equal(JSON.stringify(em.data), em.before); assert.ok(Object.isFrozen(result.data.days[0]))
  assert.doesNotMatch(JSON.stringify(result.data), /rawLateSeconds|lateMinutes|salarySegments/)
  payrollLiveSourceContent(result)
})

test('employee schedule changes take effect on the inclusive date and ignore the current employee pointer', async () => {
  const result = await run({ employee: [employee({ workScheduleId: 999 })], versions: [version('EMPLOYEE', id), version('EMPLOYEE', id, 2, '2026-06-04', { snapshotRaw: JSON.stringify({ workScheduleId: 12, flexOverrideMode: 'DISABLED' }) }),
    version('WORK_SCHEDULE', 8), version('WORK_SCHEDULE', 12, 1, '2026-01-01', { id: 401, snapshotRaw: JSON.stringify(source({ startTime: '11:00', endTime: '20:00' })) })] })
  assert.equal(result.data.days[2].timing.startTime, '09:00'); assert.equal(result.data.days[3].timing.startTime, '11:00'); assert.equal(result.data.days[3].timing.flexEnabled, false)
  assert.equal(result.data.days[3].employeeRule.version, 2); assert.equal(result.data.days[3].sourceRule.sourceId, 12)
})

test('same-effective-date amendments use the highest explicit version; future amendments do not leak backward', async () => {
  const result = await run({ versions: [version('EMPLOYEE', id), version('WORK_SCHEDULE', 8), version('WORK_SCHEDULE', 8, 2, '2026-01-01', { snapshotRaw: JSON.stringify(source({ startTime: '08:00', endTime: '17:00' })) }),
    version('WORK_SCHEDULE', 8, 3, '2026-06-04', { snapshotRaw: JSON.stringify(source({ startTime: '10:00', endTime: '19:00' })) })] })
  assert.equal(result.data.days[0].timing.startTime, '08:00'); assert.equal(result.data.days[2].sourceRule.version, 2); assert.equal(result.data.days[3].sourceRule.version, 3)
})

test('legacy baseline remains explicitly undated and never becomes an authoritative historical source', async () => {
  const result = await run({ versions: [version('EMPLOYEE', id), version('WORK_SCHEDULE', 8, 0, null, { legacyBaseline: true })] })
  const day = result.data.days[0]; assert.equal(day.timingState, 'UNSUPPORTED'); assert.equal(day.sourceRule.legacyBaseline, true); assert.equal(day.sourceRule.effectiveFrom, null); assert.equal(day.timing, null)
  assert.equal(result.data.ruleEvidence[1].snapshot.value.startTime, '09:00')
})

test('future-only employee or rule versions leave prior days missing without catalog or branch defaults', async () => {
  for (const versions of [[version('EMPLOYEE', id, 1, '2026-07-01'), version('WORK_SCHEDULE', 8)], [version('EMPLOYEE', id), version('WORK_SCHEDULE', 8, 1, '2026-07-01')], []]) {
    const result = await run({ versions }); assert.equal(result.data.days[0].timingState, 'MISSING'); assert.equal(result.data.days[0].timing, null)
    assert.equal(result.data.scheduledWorkDates, null)
  }
})

test('day override wins over dated week plan; source version timings win over cached assignment timings', async () => {
  const result = await run({ weekly: [weekly(), weekly({ id: 8, weekStart: '2026-06-07' })], overrides: [override()], versions: [version('EMPLOYEE', id), version('SHIFT', 9),
    version('SHIFT', 10, 1, '2026-01-01', { id: 401, snapshotRaw: JSON.stringify(source({ startTime: '22:00', endTime: '07:00' })) })] })
  assert.equal(result.data.days[0].assignment.kind, 'WEEK'); assert.equal(result.data.days[0].timing.startTime, '09:00')
  const day = result.data.days[2]; assert.equal(day.assignment.kind, 'OVERRIDE'); assert.equal(day.timing.startTime, '22:00'); assert.equal(day.timing.endTime, '07:00'); assert.equal(day.date, '2026-06-03')
  assert.equal(result.data.days[6].assignment.sourceRef, 'weekly_schedule_entries:8')
})

test('inline dated plan remains readable with unknown required minutes and no invented shift identity', async () => {
  const result = await run({ weekly: [weekly({ shiftId: null })] }), day = result.data.days[0]
  assert.equal(day.timing.startTime, '07:00'); assert.equal(day.timing.requiredWorkMinutes, null); assert.equal(day.timing.flexEnabled, null); assert.equal(day.sourceRule, null)
  assert.equal(day.timingState, 'UNSUPPORTED'); dayHas(day, 'SCHEDULE_INLINE_PLAN_UNVERSIONED')
})

test('explicit dated default is resolved only after an explicit employee null assignment', async () => {
  const versions = [version('EMPLOYEE', id, 1, '2026-01-01', { snapshotRaw: JSON.stringify({ workScheduleId: null, flexOverrideMode: 'INHERIT' }) }), version('WORK_SCHEDULE', 8, 1, '2026-01-01', { snapshotRaw: JSON.stringify(source({ isDefault: true })) })]
  const result = await run({ versions }); assert.equal(result.data.days[0].assignment.kind, 'DEFAULT'); assert.equal(result.data.days[0].timingState, 'AVAILABLE')
  const absent = await run({ versions: versions.slice(1) }); assert.equal(absent.data.days[0].assignment, null); assert.equal(absent.data.days[0].timing, null)
})

test('conflicting dated default schedules are invalid rather than selected by arbitrary ID', async () => {
  const result = await run({ versions: [version('EMPLOYEE', id, 1, '2026-01-01', { snapshotRaw: JSON.stringify({ workScheduleId: null, flexOverrideMode: 'INHERIT' }) }),
    version('WORK_SCHEDULE', 8, 1, '2026-01-01', { snapshotRaw: JSON.stringify(source({ isDefault: true })) }), version('WORK_SCHEDULE', 9, 1, '2026-01-01', { id: 401, snapshotRaw: JSON.stringify(source({ isDefault: true })) })] })
  assert.equal(result.state, 'INVALID'); dayHas(result.data.days[0], 'SCHEDULE_DEFAULT_CONFLICT'); assert.equal(result.data.days[0].timing, null)
})

test('inactive dated rule is shown but never silently replaced with current/default settings', async () => {
  const result = await run({ versions: [version('EMPLOYEE', id), version('WORK_SCHEDULE', 8, 1, '2026-01-01', { snapshotRaw: JSON.stringify(source({ isActive: false })) })] })
  assert.equal(result.data.days[0].timingState, 'UNSUPPORTED'); dayHas(result.data.days[0], 'SCHEDULE_TIMING_INACTIVE'); assert.equal(result.data.days[0].sourceRule.sourceId, 8)
})

test('individual flex ENABLED requires a defined valid source window; DISABLED overrides source flex', async () => {
  const invalid = await run({ versions: [version('EMPLOYEE', id, 1, '2026-01-01', { snapshotRaw: JSON.stringify({ workScheduleId: 8, flexOverrideMode: 'ENABLED' }) }), version('WORK_SCHEDULE', 8, 1, '2026-01-01', { snapshotRaw: JSON.stringify(source({ flexEnabled: false, flexWindowMinutes: null })) })] })
  assert.equal(invalid.state, 'INVALID'); dayHas(invalid.data.days[0], 'SCHEDULE_FLEX_OVERRIDE_INVALID')
  const disabled = await run({ versions: [version('EMPLOYEE', id, 1, '2026-01-01', { snapshotRaw: JSON.stringify({ workScheduleId: 8, flexOverrideMode: 'DISABLED' }) }), version('WORK_SCHEDULE', 8)] })
  assert.equal(disabled.data.days[0].timing.flexEnabled, false); assert.equal(disabled.data.days[0].timingState, 'AVAILABLE')
})

test('missing required minutes never derive from shift duration or legacy requiredHours', async () => {
  const result = await run({ versions: [version('EMPLOYEE', id), version('WORK_SCHEDULE', 8, 1, '2026-01-01', { snapshotRaw: JSON.stringify(source({ requiredWorkMinutes: null, requiredHours: 9, flexEnabled: false })) })] })
  assert.equal(result.data.days[0].timing.requiredWorkMinutes, null); assert.equal(result.data.days[0].timingState, 'UNSUPPORTED'); dayHas(result.data.days[0], 'SCHEDULE_TIMING_FIELDS_MISSING')
})

test('calendar current evidence stays separate, including date-specific holidays and inactive recurring rules', async () => {
  const result = await run({ holidays: [holiday()], exceptions: [exception(), exception({ id: 61, isActive: false })] })
  assert.equal(result.data.calendarEvidence.basis, 'EXPLICIT_DATED_CALENDAR'); assert.equal(result.data.calendarEvidence.holidays[0].date, '2026-06-02')
  assert.equal(result.data.calendarEvidence.exceptions[1].isActive, false); assert.equal(result.data.days[1].scheduled, null); assert.equal(result.data.scheduledWorkDates, null)
  assert.equal(result.state, 'MISSING')
})

test('missing global weekend config never supplies FRI/SAT or manufactures a workday', async () => {
  const result = await run({ config: [], employee: [employee({ weekendDays: null })] })
  assert.deepEqual(result.data.calendarEvidence.globalWeekend, []); assert.equal(result.data.calendarEvidence.currentBranch.weekendDays, null); assert.equal(result.data.scheduledWorkDates, null)
})

test('corrupt rule JSON is retained exactly and cannot fall through to an older valid version', async () => {
  const raw = '{broken', result = await run({ versions: [version('EMPLOYEE', id), version('WORK_SCHEDULE', 8), version('WORK_SCHEDULE', 8, 2, '2026-06-04', { snapshotRaw: raw })] })
  assert.equal(result.state, 'INVALID'); has(result, 'SCHEDULE_RULE_JSON_INVALID'); assert.equal(result.data.ruleEvidence[2].snapshot.raw, raw); assert.equal(result.data.ruleEvidence[2].snapshot.value, null)
  assert.equal(result.data.days[0].timing, null); assert.equal(result.data.days[0].timingState, 'INVALID'); payrollLiveSourceContent(result)
})

test('JSON scalars, arrays, unsafe numbers, poison keys and nonfinite parsed numbers fail closed', async () => {
  for (const snapshotRaw of ['null', '[]', '1', '{"a":9007199254740993}', '{"a":1e400}', '{"__proto__":{"x":1}}']) {
    const result = await run({ versions: [version('EMPLOYEE', id), version('WORK_SCHEDULE', 8, 1, '2026-01-01', { snapshotRaw })] })
    assert.equal(result.state, 'INVALID'); has(result, 'SCHEDULE_RULE_JSON_INVALID'); payrollLiveSourceContent(result)
  }
})

test('overlarge and overdeep rule JSON is bounded, identified and never parsed into usable timings', async () => {
  const raw = 'x'.repeat(45000), result = await run({ versions: [version('EMPLOYEE', id), version('WORK_SCHEDULE', 8, 1, '2026-01-01', { snapshotRaw: raw })] })
  const evidence = result.data.ruleEvidence[1].snapshot; assert.equal(evidence.raw.length, 40000); assert.equal(evidence.rawLength, 45000); assert.equal(evidence.omitted, true); has(result, 'SCHEDULE_RULE_JSON_INVALID')
  const deep = await run({ versions: [version('EMPLOYEE', id), version('WORK_SCHEDULE', 8, 1, '2026-01-01', { snapshotRaw: '{"a":'.repeat(20) + '0' + '}'.repeat(20) })] }); has(deep, 'SCHEDULE_RULE_JSON_INVALID')
})

test('duplicate source identity/version or inconsistent baseline metadata are invalid', async () => {
  for (const versions of [[version('EMPLOYEE', id), version('WORK_SCHEDULE', 8), version('WORK_SCHEDULE', 8, 1, '2026-06-04', { id: 302 })],
    [version('EMPLOYEE', id), version('WORK_SCHEDULE', 8, 0, null)], [version('EMPLOYEE', id), version('WORK_SCHEDULE', 8, 1, '2026-02-30')]]) {
    const result = await run({ versions }); assert.equal(result.state, 'INVALID'); has(result, 'SCHEDULE_RULE_INVALID')
  }
})

test('foreign employee, foreign shift rule and unknown enum or invalid timing are rejected without coercion', async () => {
  for (const patch of [{ employee: [employee({ id: 99 })] }, { versions: [version('EMPLOYEE', 99), version('WORK_SCHEDULE', 8)] }, { versions: [version('EMPLOYEE', id), version('SHIFT', 99)] },
    { versions: [version('EMPLOYEE', id, 1, '2026-01-01', { snapshotRaw: '{"workScheduleId":8,"flexOverrideMode":"true"}' })] },
    { versions: [version('EMPLOYEE', id), version('WORK_SCHEDULE', 8, 1, '2026-01-01', { snapshotRaw: JSON.stringify(source({ requiredWorkMinutes: '540' })) })] }]) {
    const result = await run(patch); assert.equal(result.state, 'INVALID'); payrollLiveSourceContent(result)
  }
})

test('duplicate or malformed dated plan never becomes the selected usable shift', async () => {
  for (const patch of [{ weekly: [weekly(), weekly({ id: 8 })] }, { weekly: [weekly({ employeeId: 99 })] }, { weekly: [weekly({ weekStart: '2026-06-01' })] },
    { overrides: [override({ date: '2026-02-30' })] }, { overrides: [override({ date: '2026-06-08' })] }, { weekly: [weekly({ shiftId: '9' })] }]) {
    const result = await run(patch); assert.equal(result.state, 'INVALID'); has(result, 'SCHEDULE_ASSIGNMENT_INVALID'); payrollLiveSourceContent(result)
  }
})

test('invalid branch/calendar source rows are not silently dropped or mapped to ordinary weekdays', async () => {
  for (const patch of [{ employee: [employee({ branchSourceId: null })] }, { config: [{ key: 'attendance.weekend_days', value: 'Friday' }] }, { holidays: [holiday({ endDate: '2026-06-01' })] },
    { holidays: [holiday(), holiday()] }, { exceptions: [exception({ effect: 'YES' })] }, { exceptions: [exception(), exception()] }]) {
    const result = await run(patch); assert.notEqual(result.state, 'AVAILABLE'); assert.equal(result.data.scheduledWorkDates, null); payrollLiveSourceContent(result)
  }
})

test('bounded SQL and aggregate evidence cap do not falsely claim an applicable timing is complete', async () => {
  const many = Array.from({ length: 5001 }, (_, i) => exception({ id: 1000 + i })), result = await run({ exceptions: many })
  has(result, 'SCHEDULE_SOURCE_LIMIT'); assert.equal(result.state, 'UNSUPPORTED'); assert.equal(result.data.days[0].timingState, 'UNSUPPORTED')
  assert.ok(result.data.calendarEvidence.exceptions.length < 5000); assert.equal(result.data.scheduledWorkDates, null)
  const em = manager(); await read(em, id, from, to); for (const query of em.calls.slice(1)) assert.match(query.sql, /^SELECT TOP \(5001\)/)
})

test('missing schema is explicit while connectivity failure propagates instead of becoming empty data', async () => {
  const missing = Object.assign(new Error('missing table'), { number: 208 }), result = await run({ versions: missing }); assert.equal(result.state, 'MISSING'); assert.equal(result.data, null); has(result, 'SCHEDULE_SCHEMA_MISSING')
  await assert.rejects(run({ versions: new Error('connection lost') }), /connection lost/)
  const absent = await run({ employee: [] }); assert.equal(absent.state, 'MISSING'); has(absent, 'SCHEDULE_EMPLOYEE_MISSING')
})

test('invalid request identity/period and missing transaction fail before any source query', async () => {
  for (const employeeId of [0, -1, '42', 2147483648]) { const em = manager(); await assert.rejects(read(em, employeeId, from, to)); assert.equal(em.calls.length, 0) }
  for (const bounds of [['2026-02-30', to], [to, from], ['2026-06-01', '2026-07-05']]) { const em = manager(); await assert.rejects(read(em, id, ...bounds)); assert.equal(em.calls.length, 0) }
  const em = manager(); em.queryRunner.isTransactionActive = false; await assert.rejects(read(em, id, from, to), /active transaction/); assert.equal(em.calls.length, 0)
})

test('same source contents have stable canonical hash; a later read changes evidence without mutating the old snapshot', async () => {
  const first = await run(), again = await run(); assert.equal(payrollLiveSourceContent(first).contentHash, payrollLiveSourceContent(again).contentHash)
  const changed = await run({ overrides: [override({ shiftId: null })] }); assert.notEqual(payrollLiveSourceContent(first).contentHash, payrollLiveSourceContent(changed).contentHash)
  assert.equal(first.data.days[2].assignment.kind, 'EMPLOYEE'); assert.equal(changed.data.days[2].assignment.kind, 'OVERRIDE')
})

test('calendar SQL limits recurring rules to the employee branch and holidays to its current country or global scope', async () => {
  const em = manager({ exceptions: [exception(), exception({ id: 61, branchId: 1 })], holidays: [holiday(), holiday({ id: 51, country: '' })] }), result = await read(em, id, from, to)
  assert.equal(result.state, 'MISSING'); assert.equal(result.data.calendarEvidence.exceptions.length, 2); assert.equal(result.data.calendarEvidence.holidays.length, 2)
  assert.match(em.calls.find(call => call.sql.includes('FROM [schedule_exception_rules]')).sql, /WHERE \[branchId\] IS NULL OR \[branchId\]=\(SELECT \[branchId\] FROM \[employees\] WHERE \[id\]=@0\)/)
  assert.match(em.calls.find(call => call.sql.includes('FROM [public_holidays]')).sql, /WHERE e\.\[id\]=@0/)
  assert.match(em.calls.find(call => call.sql.includes('FROM [public_holidays]')).sql, /UPPER\(LTRIM\(RTRIM\(b\.\[country\]\)\)\)/)
})

test('unexpected foreign-branch rules are invalid and expose neither their name nor source identifier', async () => {
  const result = await run({ exceptions: [exception({ id: 17777, branchId: 2, name: 'PRIVATE_OTHER_BRANCH_RULE' })] })
  assert.equal(result.state, 'INVALID'); has(result, 'SCHEDULE_EXCEPTION_SCOPE_INVALID'); assert.deepEqual(result.data.calendarEvidence.exceptions, [])
  assert.notEqual(result.data.days[0].calendarState, 'AVAILABLE'); assert.doesNotMatch(JSON.stringify(result), /PRIVATE_OTHER_BRANCH_RULE|17777/)
})

test('unexpected foreign-country holidays are invalid and do not expose their metadata', async () => {
  const result = await run({ holidays: [holiday({ id: 18888, country: 'SA', name: 'PRIVATE_OTHER_COUNTRY_HOLIDAY' })] })
  assert.equal(result.state, 'INVALID'); has(result, 'SCHEDULE_HOLIDAY_SCOPE_INVALID'); assert.deepEqual(result.data.calendarEvidence.holidays, [])
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_OTHER_COUNTRY_HOLIDAY|18888/)
})

test('country comparison matches attendance trimming and case normalization; unconfigured country keeps documented all-country semantics', async () => {
  const normalized = await run({ employee: [employee({ country: ' eg ' })], holidays: [holiday({ country: 'EG' }), holiday({ id: 51, country: ' eg ' }), holiday({ id: 52, country: '' })] })
  assert.equal(normalized.state, 'MISSING'); assert.equal(normalized.data.calendarEvidence.holidays.length, 3)
  for (const country of ['', null]) {
    const unconfigured = await run({ employee: [employee({ country })], holidays: [holiday({ country: 'SA' })] })
    assert.equal(unconfigured.state, 'MISSING'); assert.equal(unconfigured.data.calendarEvidence.holidays.length, 1)
  }
})

test('disabled flex accepts an explicit null window but zero violates the existing attendance source validator', async () => {
  const { validateAttendanceFlexSource } = require('../src/attendance/attendance-rule-history')
  const disabled = source({ flexEnabled: false, flexWindowMinutes: null })
  assert.doesNotThrow(() => validateAttendanceFlexSource(disabled))
  assert.throws(() => validateAttendanceFlexSource({ ...disabled, flexWindowMinutes: 0 }))
  const valid = await run({ versions: [version('EMPLOYEE', id), version('WORK_SCHEDULE', 8, 1, '2026-01-01', { snapshotRaw: JSON.stringify(disabled) })] })
  assert.equal(valid.data.days[0].timingState, 'AVAILABLE'); assert.equal(valid.data.days[0].timing.flexEnabled, false); assert.equal(valid.data.days[0].timing.flexWindowMinutes, null)
  const invalid = await run({ versions: [version('EMPLOYEE', id), version('WORK_SCHEDULE', 8, 1, '2026-01-01', { snapshotRaw: JSON.stringify({ ...disabled, flexWindowMinutes: 0 }) })] })
  assert.equal(invalid.state, 'INVALID'); has(invalid, 'SCHEDULE_RULE_INVALID')
})

test('التقويم المؤرخ المكتمل يفتح أيام العمل ويحفظ فرع كل تاريخ ومراجع نسخه', async () => {
  const calendar = date => ({ state: 'AVAILABLE', date, working: !['2026-06-05', '2026-06-06'].includes(date),
    dayKind: ['2026-06-05', '2026-06-06'].includes(date) ? 'WEEKEND' : 'WORKING', branchId: date < '2026-06-04' ? 2 : 3,
    country: 'EG', weekendDays: ['FRI', 'SAT'], legacyFallback: false, issues: [],
    versionRefs: [{ sourceType: 'EMPLOYEE_ORG', sourceId: id, versionId: 999, version: 1, effectiveFrom: '2026-01-01', legacyBaseline: false }] })
  const result = await run({ calendar })
  assert.equal(result.state, 'AVAILABLE'); assert.equal(result.data.historicalCalendarComplete, true)
  assert.deepEqual(result.data.scheduledWorkDates, ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-07'])
  assert.equal(result.data.days[0].branchId, 2); assert.equal(result.data.days[3].branchId, 3)
  assert.equal(result.data.days[4].scheduled, false); assert.equal(result.data.days[4].dayKind, 'WEEKEND')
  assert.ok(result.sourceRefs.includes('attendance_rule_versions:999'))
})

test('فجوة واحدة في التقويم تمنع جدولًا كاملًا رغم اكتمال توقيت الوردية', async () => {
  const result = await run({ calendar: date => ({ state: date === '2026-06-04' ? 'MISSING' : 'AVAILABLE', date,
    working: date === '2026-06-04' ? null : true, dayKind: date === '2026-06-04' ? null : 'WORKING', branchId: 1,
    country: 'EG', weekendDays: [], legacyFallback: false, versionRefs: [], issues: date === '2026-06-04' ? [{ code: 'CALENDAR_VERSION_MISSING', message: 'نسخة مفقودة' }] : [] }) })
  assert.equal(result.state, 'MISSING'); assert.equal(result.data.scheduledWorkDates, null); assert.equal(result.data.historicalCalendarComplete, false)
  assert.equal(result.data.days[3].scheduled, null); assert.equal(result.data.days[3].timingState, 'AVAILABLE')
})
