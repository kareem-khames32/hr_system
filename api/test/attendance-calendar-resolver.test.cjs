'use strict'
// اختبارات الحسم المؤرخ والتوافق القديم بقراءات منعزلة؛ لا اتصال بقاعدة بيانات.
const { test, after } = require('node:test')
const assert = require('node:assert/strict'), path = require('node:path')
require('../node_modules/reflect-metadata')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const store = require('../src/attendance/attendance-calendar-history')
const lib = require('../src/attendance/attendance-calendar-resolver')
const { AttendanceService } = require('../src/attendance/attendance.service')
const originalRead = store.readCalendarSource
store.readCalendarSource = async (em, scope, id) => {
  const key = `${scope}:${id}`; em.reads.push(key)
  const value = em.sources[key]
  if (value instanceof Error) throw value
  assert.ok(value, `unexpected calendar source ${key}`)
  return structuredClone(value)
}
after(() => { store.readCalendarSource = originalRead })
const day = '2026-09-04'
const global = extra => ({ weekendDays: 'FRI,SAT', holidays: [], exceptions: [], ...extra })
const branch = (id, extra) => ({ id, country: 'EG', weekendDays: null, exceptions: [], ...extra })
const version = (id, snapshot, effectiveFrom = '2026-01-01', number = 1) => ({ id, version: number, snapshot, effectiveFrom, legacyBaseline: effectiveFrom === null })
const read = (current, versions = [version(1, current)], extra = {}) => ({ current, currentSourceHash: 'a'.repeat(64), revision: versions.at(-1)?.version ?? 0, currentMatchesHistory: true, versions, ...extra })
const rule = (id, effect, extra = {}) => ({ id, name: `قاعدة${id}`, weekday: 'FRI', occurrence: 'ALL', effect, isActive: true, ...extra })
const holiday = (date, country = 'EG', extra = {}) => ({ id: 1, name: 'عطلة اختبار', date, endDate: null, country, ...extra })
function fixture() {
  return {
    reads: [], queries: [], employee: { id: 7, branchId: 2, workScheduleId: null }, schedules: {},
    sources: { 'GLOBAL:0': read(global()), 'BRANCH:2': read(branch(2)), 'BRANCH:3': read(branch(3, { country: 'SA' })), 'EMPLOYEE:7': read({ branchId: 2 }) },
    rules: { 'EMPLOYEE:7': [version(10, { workScheduleId: null, flexOverrideMode: 'INHERIT' })] }, rawRules: {},
    async findOneBy(entity, { id }) {
      if (entity.name === 'Employee') return this.employee?.id === id ? this.employee : null
      if (entity.name === 'WorkSchedule') return this.schedules[id] ?? null
      throw Error(`unexpected entity ${entity.name}`)
    },
    async query(sql, args) {
      this.queries.push({ sql, args }); assert.match(sql, /^SELECT TOP \(5001\)/); assert.doesNotMatch(sql, /\b(?:UPDATE|INSERT|DELETE|MERGE)\b/)
      const key = args.join(':')
      return this.rawRules[key] ?? (this.rules[key] ?? []).map(row => ({ ...row, sourceType: args[0], sourceId: args[1], snapshotRaw: JSON.stringify(row.snapshot) }))
    },
  }
}

test('public holiday takes precedence over working exceptions and preserves country/global matching', () => {
  assert.equal(lib.evaluateCalendarDay(day, 'EG', ['FRI'], [holiday(day)], [rule(1, 'WORK')], [rule(2, 'WORK')]), 'HOLIDAY')
  assert.equal(lib.evaluateCalendarDay(day, 'SA', [], [holiday(day)], [], []), 'WORKING')
  assert.equal(lib.evaluateCalendarDay(day, null, [], [holiday(day)], [], []), 'HOLIDAY')
  assert.equal(lib.evaluateCalendarDay(day, 'SA', [], [holiday(day, null)], [], []), 'HOLIDAY')
  assert.equal(lib.evaluateCalendarDay('2026-09-06', 'EG', [], [holiday(day, 'EG', { endDate: '2026-09-06' })], [], []), 'HOLIDAY')
})

test('branch exceptions apply after global exceptions and ID order decides within each scope', () => {
  assert.equal(lib.evaluateCalendarDay(day, 'EG', ['FRI'], [], [rule(50, 'WORK')], [rule(1, 'OFF')]), 'WEEKEND')
  assert.equal(lib.evaluateCalendarDay(day, 'EG', [], [], [rule(3, 'WORK'), rule(2, 'OFF')], []), 'WORKING')
  assert.equal(lib.evaluateCalendarDay(day, 'EG', [], [], [rule(1, 'OFF', { isActive: false })], []), 'WORKING')
})

test('occurrence evaluation covers first through fourth and last including a fifth occurrence', () => {
  for (const [date, occurrence] of [['2026-09-04', '1ST'], ['2026-09-11', '2ND'], ['2026-09-18', '3RD'], ['2026-09-25', '4TH'], ['2026-10-30', 'LAST']]) {
    assert.equal(lib.evaluateCalendarDay(date, 'EG', ['FRI'], [], [rule(1, 'WORK', { occurrence })], []), 'WORKING')
  }
  assert.equal(lib.evaluateCalendarDay('2026-10-23', 'EG', ['FRI'], [], [rule(1, 'WORK', { occurrence: 'LAST' })], []), 'WEEKEND')
})

test('calendar selection uses the effective date and latest same-day version rather than the latest stored data', () => {
  const state = read(global({ weekendDays: 'SUN' }), [version(1, global({ weekendDays: 'FRI' })), version(2, global({ weekendDays: 'SAT' }), '2026-09-05', 2), version(3, global({ weekendDays: 'SUN' }), '2026-09-05', 3)])
  assert.equal(lib.selectCalendarVersion(state, 'CALENDAR_GLOBAL', 0, day, true).value.weekendDays, 'FRI')
  assert.equal(lib.selectCalendarVersion(state, 'CALENDAR_GLOBAL', 0, '2026-09-05', true).value.weekendDays, 'SUN')
})

test('strict reads never promote legacy baselines or current-only configuration into dated evidence', () => {
  const data = global(), legacy = read(data, [version(1, data, null, 0)])
  assert.equal(lib.selectCalendarVersion(legacy, 'CALENDAR_GLOBAL', 0, day, true).missing, true)
  assert.equal(lib.selectCalendarVersion(legacy, 'CALENDAR_GLOBAL', 0, day, false).ref.legacyBaseline, true)
  assert.equal(lib.selectCalendarVersion(read(data, []), 'CALENDAR_GLOBAL', 0, day, true).missing, true)
  assert.equal(lib.selectCalendarVersion(read(data, []), 'CALENDAR_GLOBAL', 0, day, false).missing, false)
  assert.equal(lib.selectCalendarVersion(read(data, [version(1, data, '2026-10-01')]), 'CALENDAR_GLOBAL', 0, day, false).missing, true)
})

test('strict employee day carries all dated scope and assignment references without inferring shift timings', async () => {
  const em = fixture(), result = await lib.resolveEmployeeCalendarDay(em, 7, day, { strict: true })
  assert.equal(result.state, 'AVAILABLE'); assert.equal(result.working, false); assert.equal(result.dayKind, 'WEEKEND')
  assert.equal(result.branchId, 2); assert.equal(result.country, 'EG'); assert.equal(result.legacyFallback, false)
  assert.deepEqual(result.versionRefs.map(row => row.sourceType), ['EMPLOYEE_ORG', 'CALENDAR_GLOBAL', 'CALENDAR_BRANCH', 'EMPLOYEE'])
  assert.equal('startTime' in result, false); assert.equal('requiredWorkMinutes' in result, false)
})

test('employee organization follows its dated branch and country rather than the current profile', async () => {
  const em = fixture(); em.employee.branchId = 3
  em.sources['EMPLOYEE:7'] = read({ branchId: 3 }, [version(1, { branchId: 2 }), version(2, { branchId: 3 }, '2026-09-05', 2)])
  em.sources['GLOBAL:0'] = read(global({ holidays: [holiday(day)] }))
  const before = await lib.resolveEmployeeCalendarDay(em, 7, day, { strict: true })
  assert.equal(before.branchId, 2); assert.equal(before.dayKind, 'HOLIDAY'); assert.equal(em.reads.includes('BRANCH:3'), false)
  const after = await lib.resolveEmployeeCalendarDay(em, 7, '2026-09-05', { strict: true })
  assert.equal(after.branchId, 3); assert.equal(after.country, 'SA')
})

test('future global and branch weekend edits leave historical working dates unchanged', async () => {
  const em = fixture()
  em.sources['GLOBAL:0'] = read(global({ weekendDays: 'SUN' }), [version(1, global({ weekendDays: 'FRI' })), version(2, global({ weekendDays: 'SUN' }), '2026-09-05', 2)])
  em.sources['BRANCH:2'] = read(branch(2, { weekendDays: 'MON' }), [version(1, branch(2)), version(2, branch(2, { weekendDays: 'MON' }), '2026-09-05', 2)])
  assert.equal((await lib.resolveEmployeeCalendarDay(em, 7, day, { strict: true })).dayKind, 'WEEKEND')
  assert.equal((await lib.resolveEmployeeCalendarDay(em, 7, '2026-09-06', { strict: true })).dayKind, 'WORKING')
  assert.equal((await lib.resolveEmployeeCalendarDay(em, 7, '2026-09-07', { strict: true })).dayKind, 'WEEKEND')
})

test('explicit employee work schedule overrides branch weekend while an unassigned default schedule never does', async () => {
  const em = fixture(); em.schedules[9] = { id: 9, weekendDays: 'MON', isDefault: true }
  assert.equal((await lib.resolveEmployeeCalendarDay(em, 7, day, { strict: true })).dayKind, 'WEEKEND')
  em.employee.workScheduleId = 9; em.rules['EMPLOYEE:7'] = [version(10, { workScheduleId: 9, flexOverrideMode: 'INHERIT' })]
  em.rules['WORK_SCHEDULE:9'] = [version(11, { weekendDays: '', isDefault: false })]
  const result = await lib.resolveEmployeeCalendarDay(em, 7, day, { strict: true })
  assert.equal(result.dayKind, 'WORKING'); assert.deepEqual(result.weekendDays, [])
  assert.equal(result.versionRefs.at(-1).sourceType, 'WORK_SCHEDULE')
})

test('work schedule assignment and its weekend definition each resolve per date', async () => {
  const em = fixture(); em.employee.workScheduleId = 9; em.schedules[9] = { id: 9, weekendDays: 'MON' }
  em.rules['EMPLOYEE:7'].push(version(11, { workScheduleId: 9, flexOverrideMode: 'INHERIT' }, '2026-09-05', 2))
  em.rules['WORK_SCHEDULE:9'] = [version(12, { weekendDays: 'SUN' }), version(13, { weekendDays: 'MON' }, '2026-09-07', 2)]
  assert.equal((await lib.resolveEmployeeCalendarDay(em, 7, day, { strict: true })).dayKind, 'WEEKEND')
  assert.equal((await lib.resolveEmployeeCalendarDay(em, 7, '2026-09-06', { strict: true })).dayKind, 'WEEKEND')
  assert.equal((await lib.resolveEmployeeCalendarDay(em, 7, '2026-09-07', { strict: true })).dayKind, 'WEEKEND')
})

test('unknown historical employee assignment does not assume the current null schedule proves inherited weekend', async () => {
  const em = fixture(); em.rules['EMPLOYEE:7'] = []
  const result = await lib.resolveEmployeeCalendarDay(em, 7, day, { strict: true })
  assert.equal(result.state, 'MISSING'); assert.equal(result.working, null)
  const compatible = await lib.resolveEmployeeCalendarDay(em, 7, day)
  assert.equal(compatible.dayKind, 'WEEKEND'); assert.equal(compatible.legacyFallback, true)
})

test('legacy missing global setting has an explicit compatibility fallback but never a strict financial default', async () => {
  const em = fixture(); em.sources['GLOBAL:0'] = read(global({ weekendDays: null }), [])
  const compatible = await lib.resolveEmployeeCalendarDay(em, 7, day)
  assert.equal(compatible.dayKind, 'WEEKEND'); assert.equal(compatible.legacyFallback, true)
  const strict = await lib.resolveEmployeeCalendarDay(em, 7, day, { strict: true })
  assert.equal(strict.state, 'MISSING'); assert.equal(strict.working, null)
})

test('strict calendar rejects current source drift; runtime preserves dated data and reports the conflict', async () => {
  const em = fixture(); em.sources['GLOBAL:0'].currentMatchesHistory = false
  const strict = await lib.resolveEmployeeCalendarDay(em, 7, day, { strict: true })
  assert.equal(strict.state, 'INVALID'); assert.equal(strict.dayKind, null)
  const runtime = await lib.resolveEmployeeCalendarDay(em, 7, day)
  assert.equal(runtime.dayKind, 'WEEKEND'); assert.ok(runtime.issues.some(row => row.code === 'CALENDAR_CURRENT_SOURCE_DRIFT'))
})

test('an unrelated legacy assignment cannot manufacture weekend defaults for a dated but incomplete global calendar', async () => {
  const em = fixture(); em.rules['EMPLOYEE:7'] = []
  em.sources['GLOBAL:0'] = read(global({ weekendDays: null }))
  await assert.rejects(lib.resolveEmployeeCalendarDay(em, 7, day), /غير موثقة|غير صالحة/)
})

test('raw attendance assignment corruption, scope mismatch, duplicate versions and overlong JSON fail closed', async () => {
  const valid = { id: 10, sourceType: 'EMPLOYEE', sourceId: 7, version: 1, effectiveFrom: '2026-01-01', legacyBaseline: false, snapshotRaw: '{"workScheduleId":null}' }
  for (const rows of [[{ ...valid, snapshotRaw: '{' }], [{ ...valid, sourceId: 99 }], [{ ...valid, effectiveFrom: '2026-02-30' }], [{ ...valid, snapshotRaw: ' '.repeat(100001) }], [valid, { ...valid, id: 11 }]]) {
    const em = fixture(); em.rawRules['EMPLOYEE:7'] = rows
    assert.equal((await lib.resolveEmployeeCalendarDay(em, 7, day, { strict: true })).state, 'INVALID')
    await assert.rejects(lib.resolveEmployeeCalendarDay(em, 7, day))
  }
})

test('bounded source loading never silently truncates assignment history', async () => {
  const em = fixture(); em.rawRules['EMPLOYEE:7'] = Array(5001).fill({})
  const result = await lib.resolveEmployeeCalendarDay(em, 7, day, { strict: true })
  assert.equal(result.state, 'INVALID'); assert.match(result.issues[0].message, /حد القراءة/)
})

test('per-read cache shares source reads across dates but cannot cross managers or retained transactions', async () => {
  const em = fixture(), cache = lib.createCalendarResolverCache(em)
  for (const date of [day, '2026-09-05', '2026-09-06']) await lib.resolveEmployeeCalendarDay(em, 7, date, { strict: true, cache })
  assert.deepEqual(em.reads, ['EMPLOYEE:7', 'GLOBAL:0', 'BRANCH:2']); assert.equal(em.queries.length, 1)
  await assert.rejects(lib.resolveEmployeeCalendarDay(fixture(), 7, day, { strict: true, cache }), /معاملة أخرى/)
})

test('actual employee working-range method uses each dated calendar instead of one current weekend', async () => {
  const em = fixture(); em.sources['BRANCH:2'] = read(branch(2, { weekendDays: 'SUN' }), [version(1, branch(2, { weekendDays: 'FRI' })), version(2, branch(2, { weekendDays: 'SUN' }), '2026-09-05', 2)])
  const service = Object.create(AttendanceService.prototype)
  service.days = { manager: em }; service.employees = { findOne: async () => em.employee }
  const value = await service.workingDaysForEmployee(7, day, '2026-09-07')
  assert.deepEqual(value, { total: 4, working: 2, skipped: ['2026-09-04', '2026-09-06'] })
  assert.equal(em.reads.length, 3)
  await assert.rejects(service.workingDaysForEmployee(7, '2026-02-30', '2026-03-03'))
})

test('invalid identity/date and missing employee never become a working day', async () => {
  const em = fixture()
  for (const id of [0, -1, 1.5, NaN]) await assert.rejects(lib.resolveEmployeeCalendarDay(em, id, day, { strict: true }))
  await assert.rejects(lib.resolveEmployeeCalendarDay(em, 7, '2026-02-30', { strict: true }))
  em.employee = null
  const result = await lib.resolveEmployeeCalendarDay(em, 7, day, { strict: true })
  assert.equal(result.state, 'MISSING'); assert.equal(result.working, null)
})
