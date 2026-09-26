'use strict'
// «تسري على» للعطلة الرسمية (طلب المالك 26 سبتمبر: «اقدر اخصص الاجازات الرسمية علي ناس معينه» — ترحيل 070).
// اختبارات وحدة بلا قاعدة بيانات: الشكل القانوني والتحقق، المطابقة (فرع/أقسام بفروعها/فرق/موظفين)، حكم اليوم
// (evaluateCalendarDay)، لقطة التقويم وبصمتها (العطلة اللي للكل بصمتها زي ما هي بالحرف)، والحسم على مستوى الموظف والفرع
// والتقويم العام — والقسم في يوم قديم من سجل التنظيم مش من الملف الحالي.
const { test, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const crypto = require('node:crypto')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const audiences = require('../src/attendance/holiday-audience')
const store = require('../src/attendance/attendance-calendar-history')
const lib = require('../src/attendance/attendance-calendar-resolver')
const { loadPayrollOrgHistory } = require('../src/payroll/payroll-run-definition')

const fail = message => { throw new Error(message) }
const day = '2026-09-03' // خميس — يوم شغل عادي في فرع راحته الجمعة والسبت
const holiday = (id, extra = {}) => ({ id, name: `عطلة ${id}`, date: day, endDate: null, country: 'EG', ...extra })
const employee = (employeeId, extra = {}) => ({ employeeId, branchId: 2, departmentPath: [], teamId: null, ...extra })
const wholeBranch = branchId => ({ employeeId: null, branchId, departmentPath: [], teamId: null })

test('HA-01: canonical audience — null means everyone, ids are sorted, and every malformed shape is rejected (never read as everyone)', () => {
  const { normalizeHolidayAudience: normalize } = audiences
  assert.equal(normalize(null, fail), null)
  assert.equal(normalize(undefined, fail), null)
  assert.deepEqual(normalize({ level: 'branch', branchId: 3 }, fail), { level: 'branch', branchId: 3 })
  assert.deepEqual(normalize({ employeeIds: [12, 5, 9], branchId: 3, level: 'employees' }, fail), { level: 'employees', branchId: 3, employeeIds: [5, 9, 12] })
  // ترتيب المفاتيح ثابت في العمود مهما كان ترتيب الدخول
  assert.equal(audiences.holidayAudienceColumn(normalize({ departmentIds: [7, 6], level: 'departments', branchId: 1 }, fail)), '{"level":"departments","branchId":1,"departmentIds":[6,7]}')
  for (const bad of [
    { level: 'company', branchId: 1 }, { level: 'branches', branchId: 1 }, { level: 'branch' }, { level: 'branch', branchId: 0 },
    { level: 'branch', branchId: '3' }, { level: 'branch', branchId: 3, employeeIds: [1] }, { level: 'departments', branchId: 1 },
    { level: 'departments', branchId: 1, departmentIds: [] }, { level: 'teams', branchId: 1, teamIds: [1, 1] }, { level: 'teams', branchId: 1, teamIds: [1.5] },
    { level: 'employees', branchId: 1, employeeIds: [-2] }, { level: 'employees', branchId: 1, employeeIds: ['4'] }, { level: 'employees', branchId: 1, employeeIds: 4 },
    { level: 'employees', branchId: 1, employeeIds: Array.from({ length: 5001 }, (_, i) => i + 1) }, [], 'branch', 7,
  ]) assert.throws(() => normalize(bad, fail), undefined, JSON.stringify(bad).slice(0, 80))
})

test('HA-02: stored column — round trip, NULL = everyone, corrupt text fails closed', () => {
  const value = { level: 'teams', branchId: 4, teamIds: [3, 8] }
  assert.deepEqual(audiences.parseHolidayAudienceColumn(audiences.holidayAudienceColumn(value), fail), value)
  assert.equal(audiences.holidayAudienceColumn(null), null)
  assert.equal(audiences.parseHolidayAudienceColumn(null, fail), null)
  for (const raw of ['', 'null', '{', '[1,2]', '{"level":"company"}', 42]) assert.throws(() => audiences.parseHolidayAudienceColumn(raw, fail), undefined, String(raw))
  assert.equal(audiences.sameHolidayAudience(value, { level: 'teams', branchId: 4, teamIds: [3, 8] }), true)
  assert.equal(audiences.sameHolidayAudience(value, null), false)
})

test('HA-03: screen input — company/null = everyone, the picker lists are deduped and only the chosen level is kept', () => {
  const input = audiences.holidayAudienceFromInput
  assert.equal(input(null), null)
  assert.equal(input(undefined), null)
  assert.equal(input({ level: 'company', branchId: null, departmentIds: [], teamIds: [], employeeIds: [] }), null)
  assert.deepEqual(input({ level: 'branch', branchId: 2, departmentIds: [9], teamIds: [], employeeIds: [4] }), { level: 'branch', branchId: 2 })
  assert.deepEqual(input({ level: 'employees', branchId: 2, departmentIds: [9], employeeIds: [8, 3, 8] }), { level: 'employees', branchId: 2, employeeIds: [3, 8] })
  assert.deepEqual(input({ level: 'teams', branchId: 2, departmentIds: [9], teamIds: [5] }), { level: 'teams', branchId: 2, teamIds: [5] })
  for (const bad of [{ level: 'branch' }, { level: 'branch', branchId: 'x' }, { level: 'departments', branchId: 2, departmentIds: [] },
    { level: 'departments', branchId: 2 }, { level: 'employees', branchId: 2, employeeIds: [0] }, { level: 'everyone' }, [1], 'all']) {
    assert.throws(() => input(bad), error => error.getStatus?.() === 400, JSON.stringify(bad))
  }
})

test('HA-04: matching — branch audience covers the branch and its people; departments include sub-departments; teams and names cover people only', () => {
  const match = audiences.holidayAudienceMatches
  const branch = { level: 'branch', branchId: 2 }
  const deps = { level: 'departments', branchId: 2, departmentIds: [20] }
  const teams = { level: 'teams', branchId: 2, teamIds: [7] }
  const names = { level: 'employees', branchId: 2, employeeIds: [11] }
  // بلا تخصيص = للكل، حتى من غير عضو (التقويم العام)
  for (const member of [null, wholeBranch(2), employee(11)]) assert.equal(match(null, member), true)
  // التقويم العام (بلا عضو) مابياخدش أي عطلة مخصصة
  for (const audience of [branch, deps, teams, names]) assert.equal(match(audience, null), false)
  assert.equal(match(branch, wholeBranch(2)), true)
  assert.equal(match(branch, wholeBranch(3)), false)
  assert.equal(match(branch, employee(99)), true)
  assert.equal(match(branch, employee(99, { branchId: 3 })), false)
  // الأقسام والفرق والأسماء مابتخليش الفرع كله إجازة
  for (const audience of [deps, teams, names]) assert.equal(match(audience, wholeBranch(2)), false)
  assert.equal(match(deps, employee(5, { departmentPath: [20] })), true)
  assert.equal(match(deps, employee(5, { departmentPath: [22, 20] })), true, 'القسم الفرعي تبع أبوه')
  assert.equal(match(deps, employee(5, { departmentPath: [21] })), false)
  assert.equal(match(teams, employee(5, { teamId: 7 })), true)
  assert.equal(match(teams, employee(5, { teamId: 8 })), false)
  assert.equal(match(names, employee(11, { branchId: 9 })), true, 'الموظف بالاسم مهما اتنقل')
  assert.equal(match(names, employee(12)), false)
  assert.deepEqual(audiences.departmentPathOf(22, id => ({ 22: 20, 20: 10, 10: null })[id]), [22, 20, 10])
  assert.deepEqual(audiences.departmentPathOf(1, id => ({ 1: 2, 2: 1 })[id]), [1, 2], 'دايرة في الشجرة مابتلفش')
  assert.deepEqual(audiences.departmentPathOf(null, () => 1), [])
})

test('HA-05: day kind — a targeted holiday wins only for the people it covers; for everyone else the day keeps its normal rules', () => {
  const evaluate = (holidays, member, weekend = ['FRI', 'SAT'], date = day) => lib.evaluateCalendarDay(date, 'EG', weekend, holidays, [], [], [], member)
  const forX = [holiday(1, { audience: { level: 'employees', branchId: 2, employeeIds: [11] } })]
  assert.equal(evaluate(forX, employee(11)), 'HOLIDAY')
  assert.equal(evaluate(forX, employee(12)), 'WORKING')
  assert.equal(evaluate(forX, wholeBranch(2)), 'WORKING')
  assert.equal(evaluate(forX, null), 'WORKING')
  // على يوم راحة: غير المشمول يفضل «راحة أسبوعية» مش «عطلة رسمية» (مُضاعِف الإضافي)
  assert.equal(evaluate([holiday(1, { date: '2026-09-04', audience: forX[0].audience })], employee(12), ['FRI', 'SAT'], '2026-09-04'), 'WEEKEND')
  assert.equal(evaluate([holiday(1, { date: '2026-09-04', audience: forX[0].audience })], employee(11), ['FRI', 'SAT'], '2026-09-04'), 'HOLIDAY')
  // الدولة لسه شرط: عطلة مخصصة لدولة تانية ماتسريش حتى على المشمول
  assert.equal(lib.evaluateCalendarDay(day, 'SA', [], [holiday(1, { audience: forX[0].audience })], [], [], [], employee(11)), 'WORKING')
  // العطلة اللي للكل زي ما كانت بالحرف — بعضو أو من غيره (الاستدعاء القديم بدون عضو)
  assert.equal(evaluate([holiday(2)], employee(12)), 'HOLIDAY')
  assert.equal(lib.evaluateCalendarDay(day, 'EG', [], [holiday(2)], [], []), 'HOLIDAY')
  assert.equal(evaluate([holiday(3, { audience: { level: 'branch', branchId: 2 } })], wholeBranch(2)), 'HOLIDAY')
})

// ===== لقطة التقويم العام وبصمتها =====
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
const sha = value => crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')

test('HA-06: an everyone-holiday snapshot keeps the exact five keys and the pre-feature fingerprint; audience enters the snapshot only when set', () => {
  const old = { weekendDays: 'FRI,SAT', holidays: [holiday(2), holiday(1, { endDate: '2026-09-05' })], exceptions: [] }
  const normalized = store.normalizeCalendarSnapshot('GLOBAL', 0, old)
  for (const row of normalized.holidays) assert.deepEqual(Object.keys(row), ['id', 'name', 'date', 'endDate', 'country'])
  // نفس المعادلة المستقلة اللي اتحسبت بيها بصمات النسخ الموجودة (sha256 للـJSON بمفاتيح مرتبة) — مفيش انحراف بعد الترحيل
  const expectedData = { weekendDays: 'FRI,SAT', holidays: [holiday(1, { endDate: '2026-09-05' }), holiday(2)], exceptions: [] }
  assert.equal(store.calendarSourceHash('GLOBAL', 0, old), sha({ scope: 'GLOBAL', sourceId: 0, data: expectedData }))
  const envelope = store.calendarVersionEnvelope('GLOBAL', 0, 1, '2026-06-01', old)
  assert.equal(envelope.contentHash, sha({ schemaVersion: 1, sourceType: 'CALENDAR_GLOBAL', sourceId: 0, version: 1, effectiveFrom: '2026-06-01', data: expectedData }))
  // audience: null صريح بيتشال (نفس البصمة)
  assert.equal(store.calendarSourceHash('GLOBAL', 0, { ...old, holidays: [holiday(2, { audience: null }), holiday(1, { endDate: '2026-09-05' })] }), store.calendarSourceHash('GLOBAL', 0, old))
  // المخصصة: المفتاح بشكله القانوني، وبيغيّر البصمة (فتعديل «تسري على» تغيير تقويم مؤرخ زي أي تعديل عطلة)
  const targeted = store.normalizeCalendarSnapshot('GLOBAL', 0, { ...old, holidays: [holiday(2, { audience: { employeeIds: [9, 3], branchId: 2, level: 'employees' } })] })
  assert.deepEqual(targeted.holidays[0].audience, { level: 'employees', branchId: 2, employeeIds: [3, 9] })
  assert.notEqual(store.calendarSourceHash('GLOBAL', 0, targeted), store.calendarSourceHash('GLOBAL', 0, { ...old, holidays: [holiday(2)] }))
  // لقطة قديمة بمفتاح غريب أو تخصيص غلط بتترفض زي أي لقطة تالفة
  for (const row of [holiday(2, { audience: { level: 'company' } }), holiday(2, { audience: 'employees' }), holiday(2, { scope: 'x' })]) {
    assert.throws(() => store.normalizeCalendarSnapshot('GLOBAL', 0, { ...old, holidays: [row] }), error => error.getResponse?.().code === 'CALENDAR_SNAPSHOT_INVALID')
  }
  // نسخة مخزنة بتخصيص: التحقق من بصمتها وقت القراءة شغال
  const stored = store.calendarVersionEnvelope('GLOBAL', 0, 2, '2026-07-01', targeted)
  assert.deepEqual(store.calendarVersionSnapshot('GLOBAL', 0, { sourceType: 'CALENDAR_GLOBAL', sourceId: 0, version: 2, effectiveFrom: '2026-07-01', legacyBaseline: false, snapshot: stored }), targeted)
})

// ===== الحسم من القاعدة (قراءات معزولة) =====
const originalRead = store.readCalendarSource
store.readCalendarSource = async (em, scope, id) => {
  const key = `${scope}:${id}`; em.reads.push(key)
  const value = em.sources[key]
  assert.ok(value, `unexpected calendar source ${key}`)
  return structuredClone(value)
}
after(() => { store.readCalendarSource = originalRead })
const version = (id, snapshot, effectiveFrom = '2026-01-01', number = 1) => ({ id, version: number, snapshot, effectiveFrom, legacyBaseline: effectiveFrom === null })
const read = (current, versions = [version(1, current)]) => ({ current, currentSourceHash: 'a'.repeat(64), revision: versions.at(-1)?.version ?? 0, currentMatchesHistory: true, versions })
const global = holidays => ({ weekendDays: 'FRI,SAT', holidays, exceptions: [] })
const branch = (id, country = 'EG') => ({ id, country, weekendDays: null, exceptions: [] })
function fixture(holidays, org = {}) {
  const employees = { 7: { id: 7, branchId: 2, departmentId: 21, teamId: 70, workScheduleId: null }, 8: { id: 8, branchId: 2, departmentId: 30, teamId: null, workScheduleId: null } }
  return {
    reads: [], queries: [], orgQueries: [], employees,
    sources: { 'GLOBAL:0': read(global(holidays)), 'BRANCH:2': read(branch(2)), 'BRANCH:3': read(branch(3)), 'EMPLOYEE:7': read({ branchId: 2 }), 'EMPLOYEE:8': read({ branchId: 2 }) },
    async findOneBy(entity, { id }) {
      if (entity.name === 'Employee') return this.employees[id] ?? null
      throw Error(`unexpected entity ${entity.name}`)
    },
    async query(sql, args = []) {
      if (/^SELECT TOP \(5001\)/.test(sql)) {
        this.queries.push({ sql, args })
        return [{ id: 100 + args[1], sourceType: 'EMPLOYEE', sourceId: args[1], version: 1, effectiveFrom: '2026-01-01', legacyBaseline: false, snapshotRaw: '{"workScheduleId":null}' }]
      }
      // قراءة سجل التنظيم لموظف واحد (loadPayrollOrgHistory) — بفلتر الموظف دايمًا
      this.orgQueries.push({ sql, args })
      if (sql.includes("[sourceType] = 'EMPLOYEE_ORG'")) { assert.match(sql, /AND \[sourceId\] = @0/); return [] }
      if (sql.includes('FROM [transfers]')) { assert.match(sql, /AND \[employeeId\] = @0/); return (org.transfers ?? []).filter(row => row.employeeId === args[0]) }
      if (sql.includes('FROM [teams]')) return org.teams ?? [{ id: 70, departmentId: 21 }, { id: 71, departmentId: 20 }]
      if (sql.includes('FROM [departments]')) return org.departments ?? [{ id: 20, branchId: 2, parentId: null }, { id: 21, branchId: 2, parentId: 20 }, { id: 30, branchId: 2, parentId: null }]
      if (sql.includes('FROM [employee_status_history]')) { assert.match(sql, /AND \[employeeId\] = @0/); return (org.changes ?? []).filter(row => row.employeeId === args[0]) }
      throw Error(`unexpected query ${sql.slice(0, 80)}`)
    },
  }
}
const resolve = (em, employeeId, date = day, options = { strict: true }) => lib.resolveEmployeeCalendarDay(em, employeeId, date, options)

test('HA-07: employee level — a holiday for X only is X\'s holiday; Y in the same branch works; the branch and the global calendars stay working', async () => {
  const em = fixture([holiday(1, { audience: { level: 'employees', branchId: 2, employeeIds: [7] } })])
  const x = await resolve(em, 7), y = await resolve(em, 8)
  assert.equal(x.state, 'AVAILABLE'); assert.equal(x.dayKind, 'HOLIDAY'); assert.equal(x.working, false)
  assert.equal(y.state, 'AVAILABLE'); assert.equal(y.dayKind, 'WORKING'); assert.equal(y.working, true)
  assert.equal((await lib.resolveBranchCalendarDay(em, 2, day, { strict: true })).dayKind, 'WORKING')
  assert.equal((await lib.resolveGlobalCalendarDay(em, day, { strict: true })).dayKind, 'WORKING')
  assert.deepEqual(em.orgQueries, [], 'عطلة بالاسم مابتحتاجش سجل التنظيم')
})

test('HA-08: branch level — «the whole branch» counts for the branch calendar and every employee dated in that branch, not for other branches', async () => {
  const em = fixture([holiday(1, { audience: { level: 'branch', branchId: 2 } })])
  assert.equal((await lib.resolveBranchCalendarDay(em, 2, day, { strict: true })).dayKind, 'HOLIDAY')
  assert.equal((await lib.resolveBranchCalendarDay(em, 3, day, { strict: true })).dayKind, 'WORKING')
  assert.equal((await lib.resolveGlobalCalendarDay(em, day, { strict: true })).dayKind, 'WORKING')
  assert.equal((await resolve(em, 7)).dayKind, 'HOLIDAY'); assert.equal((await resolve(em, 8)).dayKind, 'HOLIDAY')
  // موظف اتنقل للفرع 3 من 5 سبتمبر: يوم 3 سبتمبر فرعه المؤرخ 2 فبياخد عطلته، والفرع الحالي مالوش دعوة
  em.employees[7].branchId = 3
  em.sources['EMPLOYEE:7'] = read({ branchId: 3 }, [version(1, { branchId: 2 }), version(2, { branchId: 3 }, '2026-09-05', 2)])
  em.sources['GLOBAL:0'] = read(global([holiday(1, { audience: { level: 'branch', branchId: 2 } }), holiday(2, { date: '2026-09-07', audience: { level: 'branch', branchId: 2 } })]))
  assert.equal((await resolve(em, 7)).dayKind, 'HOLIDAY')
  const after = await resolve(em, 7, '2026-09-07')
  assert.equal(after.branchId, 3); assert.equal(after.dayKind, 'WORKING')
})

test('HA-09: department level — sub-departments included; the department on a past day comes from the organization history, not today\'s file', async () => {
  const deps = { level: 'departments', branchId: 2, departmentIds: [20] }
  // الموظف 7 في القسم 21 (فرعي من 20) → مشمول؛ الموظف 8 في القسم 30 → لأ
  const em = fixture([holiday(1, { audience: deps })])
  assert.equal((await resolve(em, 7)).dayKind, 'HOLIDAY')
  assert.equal((await resolve(em, 8)).dayKind, 'WORKING')
  assert.equal((await lib.resolveBranchCalendarDay(em, 2, day, { strict: true })).dayKind, 'WORKING', 'أقسام من الفرع مش الفرع كله')
  // الموظف 8 اتنقل من القسم 20 للقسم 30 يوم 10 سبتمبر (سجل تغييرات الملف): عطلة 3 سبتمبر لقسمه القديم لسه بتاعته،
  // وعطلة نفس القسم يوم 15 سبتمبر (بعد النقل) مش بتاعته
  const moved = fixture([holiday(1, { audience: deps }), holiday(2, { date: '2026-09-15', audience: deps })], {
    changes: [{ id: 1, employeeId: 8, fieldName: 'departmentId', requestId: null, oldValue: '20', newValue: '30', changedAtUtc: '2026-09-10T08:00:00' }] })
  assert.equal((await resolve(moved, 8)).dayKind, 'HOLIDAY')
  assert.equal((await resolve(moved, 8, '2026-09-15')).dayKind, 'WORKING')
  assert.ok(moved.orgQueries.length > 0 && moved.orgQueries.every(call => !/EMPLOYEE_ORG|transfers|employee_status_history/.test(call.sql) || call.args[0] === 8))
})

test('HA-10: team level — the team on the day; the org history is read once per employee inside one cache and only when a team/department holiday falls on the day', async () => {
  const teams = { level: 'teams', branchId: 2, teamIds: [70] }
  const em = fixture([holiday(1, { audience: teams })]), cache = lib.createCalendarResolverCache(em)
  assert.equal((await resolve(em, 7, day, { strict: true, cache })).dayKind, 'HOLIDAY')
  assert.equal((await resolve(em, 8, day, { strict: true, cache })).dayKind, 'WORKING')
  const reads = em.orgQueries.length
  assert.equal((await resolve(em, 7, day, { strict: true, cache })).dayKind, 'HOLIDAY')
  assert.equal(em.orgQueries.length, reads, 'نفس الموظف في نفس الذاكرة: سجل التنظيم مايتقراش تاني')
  // يوم مالوش عطلة فرق: مفيش ولا قراءة للسجل
  const quiet = fixture([holiday(1, { audience: teams })])
  assert.equal((await resolve(quiet, 7, '2026-09-02')).dayKind, 'WORKING')
  assert.deepEqual(quiet.orgQueries, [])
})

test('HA-11: organization history for one employee filters by that employee with a parameter; the payroll-wide read is unchanged', async () => {
  const calls = []
  const em = { async query(sql, params) { calls.push({ sql, params }); return [] } }
  await loadPayrollOrgHistory(em, '2026-09-26')
  assert.ok(calls.every(call => call.params === undefined && !/@0/.test(call.sql)), 'قراءة المسير كله زي ما كانت بالحرف')
  calls.length = 0
  await loadPayrollOrgHistory(em, '2026-09-26', 7)
  const filtered = calls.filter(call => /EMPLOYEE_ORG|FROM \[transfers\]|employee_status_history/.test(call.sql))
  assert.equal(filtered.length, 3)
  for (const call of filtered) { assert.match(call.sql, /= @0$/); assert.deepEqual(call.params, [7]) }
  await assert.rejects(loadPayrollOrgHistory(em, '2026-09-26', 0))
  await assert.rejects(loadPayrollOrgHistory(em, '2026-09-26', 1.5))
})

test('HA-12: write validation — new ids must exist in the chosen branch; kept ids stay valid; branch-scoped accounts never set company-wide or foreign audiences', async () => {
  const calls = []
  const em = { async query(sql, params) {
    calls.push({ sql, params })
    if (sql.includes('FROM [branches]')) return params[0] === 2 || params[0] === 3 ? [{ id: params[0] }] : []
    const known = sql.includes('FROM [departments]') ? [20, 21] : sql.includes('FROM [teams]') ? [70] : [7, 8]
    return params.slice(1).filter(id => params[0] === 2 && known.includes(id)).map(id => ({ id }))
  } }
  const check = (audience, scope = null, previous = null) => audiences.assertHolidayAudienceTargets(em, audience, scope, previous)
  await check(null)
  await check({ level: 'branch', branchId: 2 })
  await check({ level: 'departments', branchId: 2, departmentIds: [20, 21] })
  await check({ level: 'teams', branchId: 2, teamIds: [70] })
  await check({ level: 'employees', branchId: 2, employeeIds: [7, 8] })
  const status = error => error.getStatus?.()
  await assert.rejects(check({ level: 'branch', branchId: 9 }), error => status(error) === 400)
  await assert.rejects(check({ level: 'departments', branchId: 2, departmentIds: [20, 99] }), error => status(error) === 400)
  await assert.rejects(check({ level: 'employees', branchId: 3, employeeIds: [7] }), error => status(error) === 400, 'موظف مش تبع فرع الاختيار')
  // موظف كان محفوظ قبل كده (واتنقل بعدين) مايوقفش التعديل — الجديد بس اللي بيتحقق
  calls.length = 0
  await check({ level: 'employees', branchId: 2, employeeIds: [7, 55] }, null, { level: 'employees', branchId: 2, employeeIds: [55] })
  assert.deepEqual(calls.at(-1).params, [2, 7])
  await assert.rejects(check({ level: 'employees', branchId: 3, employeeIds: [55] }, null, { level: 'employees', branchId: 2, employeeIds: [55] }), error => status(error) === 400,
    'تغيير الفرع = كل الأرقام جديدة')
  // النطاق: حساب فروع مايحطش «للكل» ولا فرع برّه نطاقه
  await assert.rejects(check(null, [2]), error => status(error) === 403)
  await assert.rejects(check({ level: 'branch', branchId: 3 }, [2]), error => status(error) === 403)
  await check({ level: 'branch', branchId: 2 }, [2, 5])
})

test('HA-13: short Arabic description for lists and calendars', () => {
  const names = { branches: new Map([[2, 'المعادي'], [3, 'فرع الرياض']]), departments: new Map([[20, 'المبيعات'], [21, 'قسم المخازن']]),
    teams: new Map([[70, 'الجرد'], [71, 'فريق التعبئة']]) }
  const describe = audiences.describeHolidayAudience
  assert.equal(describe(null, names), 'للكل')
  assert.equal(describe({ level: 'branch', branchId: 2 }, names), 'فرع المعادي')
  assert.equal(describe({ level: 'branch', branchId: 3 }, names), 'فرع الرياض', 'من غير «فرع فرع»')
  assert.equal(describe({ level: 'branch', branchId: 9 }, names), 'فرع #9')
  assert.equal(describe({ level: 'departments', branchId: 2, departmentIds: [20] }, names), 'فرع المعادي — قسم المبيعات')
  assert.equal(describe({ level: 'departments', branchId: 2, departmentIds: [21] }, names), 'فرع المعادي — قسم المخازن')
  assert.equal(describe({ level: 'departments', branchId: 2, departmentIds: [20, 21] }, names), 'فرع المعادي — أقسام: المبيعات، قسم المخازن')
  assert.equal(describe({ level: 'departments', branchId: 2, departmentIds: [20, 21, 22, 23] }, names), 'فرع المعادي — أقسام: المبيعات، قسم المخازن، #22 و1 غيرهم')
  assert.equal(describe({ level: 'teams', branchId: 2, teamIds: [70] }, names), 'فرع المعادي — فريق الجرد')
  assert.equal(describe({ level: 'teams', branchId: 2, teamIds: [71] }, names), 'فرع المعادي — فريق التعبئة')
  assert.equal(describe({ level: 'employees', branchId: 2, employeeIds: [1] }), 'موظف واحد')
  assert.equal(describe({ level: 'employees', branchId: 2, employeeIds: [1, 2] }), 'موظفين اتنين')
  assert.equal(describe({ level: 'employees', branchId: 2, employeeIds: [1, 2, 3] }), '3 موظفين')
  assert.equal(describe({ level: 'employees', branchId: 2, employeeIds: Array.from({ length: 12 }, (_, i) => i + 1) }), '12 موظف')
})
