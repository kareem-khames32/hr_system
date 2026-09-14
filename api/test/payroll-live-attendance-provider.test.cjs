const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { verifyPayrollAttendanceEvidence: verify, readPayrollLiveAttendance: read } = require('../src/payroll/payroll-live-attendance-provider')
const { calculateAttendanceFlex } = require('../src/attendance/attendance-flex-calculator')
const date = '2026-06-01', now = new Date('2026-06-05T12:00:00')
const clone = value => structuredClone(value)
const policy = { countEarlyWorkTowardRequired: false, prorateWindowOnPartialLeave: false, windowSupersedesGrace: true,
  unpaidBreakMinutes: 0, shortfallGraceMinutes: 10, maxSessionMinutes: 900, missingCheckoutPolicy: 'MANUAL_ONLY' }
function fixture({ incoming = '09:01:30', outgoing = '18:00:00', flex = false, absent = false } = {}) {
  const first = absent ? null : new Date(`${date}T${incoming}`), last = absent ? null : new Date(`${date}T${outgoing}`)
  const precise = value => value.getHours() * 60 + value.getMinutes() + value.getSeconds() / 60 + value.getMilliseconds() / 60000
  const timing = { startTime: '09:00', endTime: '18:00', requiredWorkMinutes: 540, flexEnabled: flex, flexWindowMinutes: 60 }
  const values = calculateAttendanceFlex({ startMinute: 540, endMinute: 1080, checkInMinute: first ? precise(first) : null,
    checkOutMinute: last ? precise(last) : null, flexEnabled: flex, flexWindowMinutes: 60, requiredWorkMinutes: 540, graceMinutes: 5,
    ...policy, prorateFlexWindowOnPartialLeave: false, shortfallToleranceMinutes: 10, actualWorkMinutes: first && last ? (last - first) / 60000 : null })
  const snapshot = { schemaVersion: 1, date, ...values, sourceType: 'WORK_SCHEDULE', sourceId: 4, sourceVersionId: 11, sourceVersion: 1,
    sourceEffectiveFrom: '2026-01-01', employeeVersionId: 12, employeeVersion: 1, employeeOverrideMode: 'INHERIT',
    flexEnabled: flex, flexWindowMinutes: 60, countEarlyWorkTowardRequired: false, prorateFlexWindowOnPartialLeave: false,
    windowSupersedesGrace: true, unpaidBreakMinutes: 0, maxSessionMinutes: 900, shortfallToleranceMinutes: 10,
    graceMinutes: 5, graceSource: 'SHIFT_OVERRIDE', attendanceExempt: false }
  const early = !flex && last ? Math.max(0, 1080 - (last.getHours() * 60 + last.getMinutes())) : 0
  const earlyLeaveMinutes = early > 5 ? early : 0
  const row = { id: 51, employeeId: 3, branchId: 2, date, status: absent ? 'absent' : values.lateMinutes > 0 ? 'late' : earlyLeaveMinutes > 0 ? 'early_leave' : 'present',
    checkIn: first ? incoming.slice(0, 5) : null, checkOut: last ? outgoing.slice(0, 5) : null, shiftStart: '09:00', shiftEnd: '18:00', shiftId: null,
    scheduleSource: 'employee', unscheduled: false, lateMinutes: values.lateMinutes, earlyLeaveMinutes, excusedMinutes: values.excusedMinutes,
    deductibleMinutes: values.paidPermissionDeductibleMinutes, workMinutes: values.rawWorkMinutes ?? 0, rawLateMinutes: values.rawLateMinutes,
    unexcusedLateMinutes: values.unexcusedLateMinutes, shortfallMinutes: values.shortfallMinutes, countedWorkMinutes: values.countedWorkMinutes,
    earlyArrivalMinutes: values.earlyArrivalMinutes, flexOutcome: values.flexOutcome, attendanceReviewRequired: false, attendanceReviewReason: null,
    leaveConflict: false, punchAnomalies: null, graceUsed: 5, attendanceRuleSnapshotRaw: JSON.stringify(snapshot), computedAt: new Date('2026-06-02T00:30:00') }
  const source = { sourceRef: 'attendance_rule_versions:11', sourceType: 'WORK_SCHEDULE', sourceId: 4, versionId: 11, version: 1,
    effectiveFrom: '2026-01-01', legacyBaseline: false, state: 'AVAILABLE', snapshot: { state: 'AVAILABLE', value: { ...timing, graceMinutes: 5, flexPolicy: policy } } }
  const employee = { sourceRef: 'attendance_rule_versions:12', sourceType: 'EMPLOYEE', sourceId: 3, versionId: 12, version: 1,
    effectiveFrom: '2026-01-01', legacyBaseline: false, state: 'AVAILABLE', snapshot: { state: 'AVAILABLE', value: { workScheduleId: 4, flexOverrideMode: 'INHERIT' } } }
  const schedule = { state: 'AVAILABLE', issues: [], sourceRefs: [], data: { periodStart: date, periodEnd: date, historicalCalendarComplete: true,
    days: [{ date, timingState: 'AVAILABLE', calendarState: 'AVAILABLE', scheduled: true, dayKind: 'WORKING', branchId: 2,
      sourceRefs: ['attendance_rule_versions:11', 'attendance_rule_versions:12', 'attendance_rule_versions:13'], sourceRule: source, employeeRule: employee,
      timing, assignment: { kind: 'EMPLOYEE' } }], ruleEvidence: [source, employee] } }
  const employment = { state: 'AVAILABLE', issues: [], sourceRefs: ['employees:3'], data: { coverage: { from: date, to: date, days: 1 } } }
  const punches = absent ? [] : [first, last].map((punchTime, i) => ({ id: 71 + i, employeeId: 3, punchTime, receivedAt: new Date(punchTime.getTime() + 1000), source: 'DEVICE', createdByUserId: null, reason: null }))
  return { schedule, employment, evidence: { days: [row], punches, leaves: [], corrections: [], requests: [], exemptions: [] } }
}
const run = f => verify(3, date, date, f.schedule, f.employment, f.evidence, now)
const code = (r, value) => r.issues.some(i => i.code === value)
const blocked = r => { assert.notEqual(r.state, 'AVAILABLE'); assert.equal(r.data.tierDays, null); assert.equal(r.data.totals, null) }

test('ثواني التأخير من البصمة نفسها لا من الدقائق المقربة', () => {
  const f = fixture(), r = run(f)
  assert.equal(r.state, 'AVAILABLE'); assert.equal(r.data.tierDays[0].rawLateSeconds, '90')
  assert.equal(f.evidence.days[0].rawLateMinutes, 1); assert.equal(r.data.tierDays[0].excusedLateSeconds, '0')
  assert.equal(r.data.totals.workedDays, 1); assert.deepEqual(r.data.days[0].proof.punchIds, [71, 72])
  assert.ok(Object.isFrozen(r.data.tierDays)); assert.equal(r.data.readOnly, true)
})
test('ثواني البصمة بعد نافذة المرونة تبدأ من بداية الدوام', () => {
  const r = run(fixture({ incoming: '10:00:59', outgoing: '19:00:59', flex: true }))
  assert.equal(r.state, 'AVAILABLE'); assert.equal(r.data.tierDays[0].rawLateSeconds, '3659'); assert.equal(r.data.tierDays[0].flexibleStartEnabled, true)
})
test('النافذة المرنة المكتملة تعطي صفر تأخير حتى لو بدأ الدوام متأخرًا', () => {
  const r = run(fixture({ incoming: '09:30:00', outgoing: '18:30:00', flex: true }))
  assert.equal(r.state, 'AVAILABLE'); assert.equal(r.data.tierDays[0].rawLateSeconds, '0'); assert.equal(r.data.totals.shortfallMinutes, 0)
})
test('تدقيق صف الحضور لا يغير المدخلات أو يعيد حفظها', () => {
  const f = fixture(), before = clone(f)
  run(f); assert.deepEqual(f, before)
})
test('الغياب المثبت يحتاج صفًا صريحًا محسوبًا بعد نهاية اليوم بلا بصمة', () => {
  const f = fixture({ absent: true }), r = run(f)
  assert.equal(r.state, 'AVAILABLE'); assert.equal(r.data.totals.absentDays, 1); assert.equal(r.data.days[0].proof.basis, 'EXPLICIT_STORED_ABSENCE_VERIFIED')
  f.evidence.days[0].computedAt = new Date(`${date}T12:00:00`)
  const unclosed = run(f); blocked(unclosed); assert.ok(code(unclosed, 'ATTENDANCE_DAY_NOT_CLOSED'))
})
test('اليوم المفقود لا ينشئ غيابًا افتراضيًا', () => {
  const f = fixture(); f.evidence.days = []; f.evidence.punches = []
  const r = run(f); blocked(r); assert.ok(code(r, 'ATTENDANCE_STORED_DAY_MISSING'))
})
test('حساب الدخول والانصراف في نفس يومهما يثبت بعد نهاية اليوم', () => {
  const f = fixture(); f.evidence.days[0].computedAt = new Date(`${date}T18:02:00`)
  assert.equal(run(f).state, 'AVAILABLE')
})
test('تغير أي نتيجة محفوظة أو نسخة الدوام يمنع تفسيرها ماليًا', () => {
  for (const property of ['rawLateMinutes', 'workMinutes', 'countedWorkMinutes', 'lateMinutes', 'earlyLeaveMinutes']) {
    const f = fixture(); f.evidence.days[0][property]++
    const r = run(f); blocked(r); assert.ok(code(r, 'ATTENDANCE_STORED_COLUMNS_MISMATCH'), property)
  }
  const f = fixture(), s = JSON.parse(f.evidence.days[0].attendanceRuleSnapshotRaw); s.sourceVersionId++
  f.evidence.days[0].attendanceRuleSnapshotRaw = JSON.stringify(s)
  const r = run(f); blocked(r); assert.ok(code(r, 'ATTENDANCE_RULE_SNAPSHOT_UNPROVEN'))
})
test('صف قديم بلا snapshot أو قواعد سماح مؤرخة لا يصبح موثقًا', () => {
  for (const missing of ['day', 'policy']) {
    const f = fixture()
    if (missing === 'day') f.evidence.days[0].attendanceRuleSnapshotRaw = null
    else delete f.schedule.data.ruleEvidence[0].snapshot.value.flexPolicy
    blocked(run(f))
  }
})
test('تعدد البصمات أو وصول بصمة بعد الحساب لا يختار زوجًا تخمينيًا', () => {
  const extra = fixture(); extra.evidence.punches.push({ ...extra.evidence.punches[0], id: 79, punchTime: new Date(`${date}T12:00:00`) })
  const r = run(extra); blocked(r); assert.ok(code(r, 'ATTENDANCE_UNIQUE_PUNCH_PROOF_MISSING'))
  const newer = fixture(); newer.evidence.punches[0].receivedAt = new Date('2026-06-03T09:00:00')
  const late = run(newer); blocked(late); assert.ok(code(late, 'ATTENDANCE_NEWER_PUNCH_EVIDENCE'))
})
test('بصمة بلا مصدر أو بصمة يدوية بلا مدخل مسؤول تبقى غير صالحة', () => {
  for (const source of [null, 'MANUAL']) {
    const f = fixture(); f.evidence.punches[0].source = source
    const r = run(f); blocked(r); assert.ok(code(r, 'ATTENDANCE_PUNCH_EVIDENCE_INVALID'))
  }
})
test('صفوف أو بصمات موظف آخر لا تظهر في الأدلة المعادة', () => {
  for (const group of ['days', 'punches']) {
    const f = fixture(); f.evidence[group][0].employeeId = 777; f.evidence[group][0].reason = 'سر خاص'
    const r = run(f); blocked(r); assert.ok(code(r, 'ATTENDANCE_EVIDENCE_SCOPE_INVALID')); assert.ok(!JSON.stringify(r).includes('سر خاص'))
  }
})
test('فرع اليوم يطابق الفرع المؤرخ لا الفرع الحالي', () => {
  const f = fixture(); f.schedule.data.days[0].branchId = 9
  const r = run(f); blocked(r); assert.ok(code(r, 'ATTENDANCE_BRANCH_HISTORY_MISMATCH'))
})
test('وجود إذن أو مأمورية معتمدة يبقى سببًا صريحًا دون قراءة كتالوج حي', () => {
  for (const typeCode of ['PERMISSION', 'BUSINESS_TRIP', 'REMOTE_WORK']) {
    const f = fixture(); f.evidence.requests.push({ id: 81, requesterId: 3, typeCode, status: 'COMPLETED', payloadRaw: JSON.stringify({ date, from: '09:00', to: '10:00' }) })
    const r = run(f); blocked(r); assert.ok(r.sourceRefs.includes('requests:81'))
  }
})
test('تصحيح بلا طلب مكتمل لا يعد تصحيحًا معتمدًا', () => {
  const f = fixture(); f.evidence.corrections.push({ id: 88, employeeId: 3, date, requestId: null, correctedPunch: '{"in":"09:00"}', requestPayloadRaw: null })
  const r = run(f); blocked(r); assert.ok(code(r, 'ATTENDANCE_CORRECTION_APPROVAL_UNPROVEN'))
})
test('الإجازات الكاملة والجزئية لا تتحول إلى أيام مدفوعة مفترضة', () => {
  for (const period of ['FULL', 'MORNING', 'EVENING']) {
    const f = fixture(); f.evidence.leaves.push({ id: 90, employeeId: 3, fromDate: date, toDate: date, period, isUnpaid: true, status: 'APPROVED' })
    blocked(run(f))
  }
})
test('الاستثناء يحتفظ بقرار الإجازة غير المدفوعة منفصلًا عن البصمة', () => {
  const f = fixture(); f.evidence.exemptions.push({ id: 91, employeeId: 3, effectiveFrom: date, effectiveTo: null, terminatedFrom: null, status: 'APPROVED',
    approvedByUserId: 4, approvedAt: new Date('2026-05-31T12:00:00'), unpaidLeaveDeductibleOverride: true, overtimeEligibleOverride: false })
  const r = run(f); blocked(r); assert.equal(r.data.exemptionEvidence[0].unpaidLeaveDeductibleOverride, true)
  assert.ok(code(r, 'ATTENDANCE_EXEMPTION_PROOF_UNSUPPORTED'))
})
test('تقويم ناقص أو فترة مقلوبة لا ينتجان مجموعة حضور فارغة متاحة', () => {
  const f = fixture(); f.schedule.data.days = []
  const r = run(f); blocked(r); assert.ok(code(r, 'ATTENDANCE_CALENDAR_RANGE_INVALID'))
  for (const coverage of [{ from: '2026-06-02', to: date, days: 0 }, { from: date, to: date, days: 2 }, { from: '2026-05-31', to: date, days: 2 }]) {
    const g = fixture(); g.employment.data.coverage = coverage; blocked(run(g))
  }
})
test('تقويم مؤرخ غير عامل يثبت عدم طلب الحضور ولا يولد صف غياب', () => {
  const f = fixture(); Object.assign(f.schedule.data.days[0], { scheduled: false, dayKind: 'WEEKEND' }); f.evidence.days = []; f.evidence.punches = []
  const r = run(f); assert.equal(r.state, 'AVAILABLE'); assert.deepEqual(r.data.tierDays, []); assert.equal(r.data.totals.absentDays, 0)
})
test('التغطية الجزئية لا تضيف أيام ما قبل التعيين إلى الغياب أو مدخلات الشرائح', () => {
  const f = fixture(), outside = '2026-05-31'
  f.schedule.data.periodStart = outside
  f.schedule.data.days.unshift({ date: outside, calendarState: 'MISSING', timingState: 'MISSING', scheduled: null, sourceRefs: [] })
  f.evidence.days.unshift({ ...f.evidence.days[0], id: 50, date: outside, status: 'absent', attendanceRuleSnapshotRaw: null })
  const r = verify(3, outside, date, f.schedule, f.employment, f.evidence, now)
  assert.equal(r.state, 'AVAILABLE'); assert.equal(r.data.totals.absentDays, 0); assert.equal(r.data.tierDays.length, 1)
  assert.equal(r.data.days[0].proof.basis, 'OUTSIDE_EMPLOYMENT_COVERAGE'); assert.equal(r.data.days[0].proof.excluded, true)
})
test('لقطة التقويم الناقصة داخل الخدمة تمنع المصدر رغم تطابق البصمة', () => {
  const f = fixture(); f.schedule.data.days[0].calendarState = 'MISSING'
  const r = run(f); blocked(r); assert.ok(code(r, 'ATTENDANCE_CALENDAR_UNPROVEN'))
})
test('بصمة في يوم غير عامل تحتاج تسوية مستقلة ولا تختفي من العدادات', () => {
  const f = fixture(); Object.assign(f.schedule.data.days[0], { scheduled: false, dayKind: 'HOLIDAY' })
  const r = run(f); blocked(r); assert.ok(code(r, 'ATTENDANCE_NON_WORKING_EVIDENCE_REVIEW'))
})
test('حدود الصفوف وحجم JSON تمنع اعتبار القراءة المقطوعة مكتملة', () => {
  const f = fixture(); f.evidence.days = Array.from({ length: 5001 }, () => f.evidence.days[0])
  const r = run(f); blocked(r); assert.ok(code(r, 'ATTENDANCE_SOURCE_LIMIT'))
  const g = fixture(); g.evidence.days[0].attendanceRuleSnapshotRaw = ' '.repeat(500001)
  const big = run(g); blocked(big); assert.ok(code(big, 'ATTENDANCE_EVIDENCE_JSON_LIMIT'))
})
test('القارئ لا يصدر أي كتابة ويلزم معاملة ويبلغ نقص المخطط فقط', async () => {
  const f = fixture(), calls = [], tables = ['days', 'punches', 'leaves', 'corrections', 'requests', 'exemptions']
  const em = { queryRunner: { isTransactionActive: true }, query: async (sql, params) => {
    assert.match(sql, /^SELECT /); assert.doesNotMatch(sql, /NOLOCK|READUNCOMMITTED/i); assert.equal(params[0], 3); calls.push(sql)
    // بعد أدلة الحضور الست: جدول مؤرخ ليوم الجار (حد ليلة الأمس) — لا موظف في الوهمي فيعود MISSING بلا افتراض وردية
    return calls.length <= tables.length ? f.evidence[tables[calls.length - 1]] : []
  } }
  assert.equal((await read(em, 3, date, date, f.schedule, f.employment)).state, 'AVAILABLE')
  assert.equal(calls.length, 7, 'ست قراءات أدلة ثم قراءة جدول يوم الجار لوجود بصمة في أول يوم من الفترة')
  assert.match(calls[6], /FROM \[employees\]/)
  await assert.rejects(read({ queryRunner: { isTransactionActive: false } }, 3, date, date, f.schedule, f.employment), /معاملة/)
  const absentSchema = await read({ queryRunner: { isTransactionActive: true }, query: async () => { throw { driverError: { number: 208 } } } }, 3, date, date, f.schedule, f.employment)
  assert.equal(absentSchema.state, 'MISSING'); assert.ok(code(absentSchema, 'ATTENDANCE_EVIDENCE_SCHEMA_MISSING'))
  const lost = new Error('connection lost')
  await assert.rejects(read({ queryRunner: { isTransactionActive: true }, query: async () => { throw lost } }, 3, date, date, f.schedule, f.employment), e => e === lost)
})

// ===== S28: الوردية الليلية 20:00 ← 01:00 تُنسب كلها ليوم بدايتها (قاعدة المالك) =====
const D12 = '2026-06-12', D13 = '2026-06-13'
const nightTiming = { startTime: '20:00', endTime: '01:00', requiredWorkMinutes: 300, flexEnabled: false, flexWindowMinutes: 60 }
const nightSource = { sourceRef: 'attendance_rule_versions:21', sourceType: 'SHIFT', sourceId: 9, versionId: 21, version: 1,
  effectiveFrom: '2026-01-01', legacyBaseline: false, state: 'AVAILABLE', snapshot: { state: 'AVAILABLE', value: { ...nightTiming, graceMinutes: 5, flexPolicy: policy } } }
const nightEmployee = { sourceRef: 'attendance_rule_versions:12', sourceType: 'EMPLOYEE', sourceId: 3, versionId: 12, version: 1,
  effectiveFrom: '2026-01-01', legacyBaseline: false, state: 'AVAILABLE', snapshot: { state: 'AVAILABLE', value: { workScheduleId: null, flexOverrideMode: 'INHERIT' } } }
const nightPlan = (day, timing = nightTiming) => ({ date: day, timingState: 'AVAILABLE', calendarState: 'AVAILABLE', scheduled: true, dayKind: 'WORKING', branchId: 2,
  sourceRefs: ['attendance_rule_versions:21', 'attendance_rule_versions:12'], sourceRule: nightSource, employeeRule: nightEmployee, timing, assignment: { kind: 'OVERRIDE' } })
const hhmm = v => `${String(v.getHours()).padStart(2, '0')}:${String(v.getMinutes()).padStart(2, '0')}`
const nightPunch = (id, stamp) => ({ id, employeeId: 3, punchTime: new Date(stamp), receivedAt: new Date(new Date(stamp).getTime() + 1000), source: 'DEVICE', createdByUserId: null, reason: null })
// صف محرك الحضور لليلة: الدقائق على خط اليوم الممتد (00:50 صباح الغد = 1490) كما يخزنها المحرك
function nightRow(id, day, first, last, inMinute, outMinute, computedAt) {
  const values = calculateAttendanceFlex({ startMinute: 1200, endMinute: 1500, checkInMinute: inMinute, checkOutMinute: outMinute,
    flexEnabled: false, flexWindowMinutes: 60, requiredWorkMinutes: 300, graceMinutes: 5, ...policy, prorateFlexWindowOnPartialLeave: false,
    shortfallToleranceMinutes: 10, actualWorkMinutes: first && last ? (last - first) / 60000 : null })
  const snapshot = { schemaVersion: 1, date: day, ...values, sourceType: 'SHIFT', sourceId: 9, sourceVersionId: 21, sourceVersion: 1, sourceEffectiveFrom: '2026-01-01',
    employeeVersionId: 12, employeeVersion: 1, employeeOverrideMode: 'INHERIT', flexEnabled: false, flexWindowMinutes: 60, countEarlyWorkTowardRequired: false,
    prorateFlexWindowOnPartialLeave: false, windowSupersedesGrace: true, unpaidBreakMinutes: 0, maxSessionMinutes: 900, shortfallToleranceMinutes: 10,
    graceMinutes: 5, graceSource: 'SHIFT_OVERRIDE', attendanceExempt: false }
  const early = last ? Math.max(0, 1500 - outMinute) : 0, earlyLeaveMinutes = early > 5 ? early : 0
  return { values, row: { id, employeeId: 3, branchId: 2, date: day, status: !first ? 'absent' : values.lateMinutes > 0 ? 'late' : earlyLeaveMinutes > 0 ? 'early_leave' : 'present',
    checkIn: first ? hhmm(first) : null, checkOut: last ? hhmm(last) : null, shiftStart: '20:00', shiftEnd: '01:00', shiftId: 9, scheduleSource: 'override', unscheduled: false,
    lateMinutes: values.lateMinutes, earlyLeaveMinutes, excusedMinutes: values.excusedMinutes, deductibleMinutes: values.paidPermissionDeductibleMinutes,
    workMinutes: values.rawWorkMinutes ?? 0, rawLateMinutes: values.rawLateMinutes, unexcusedLateMinutes: values.unexcusedLateMinutes, shortfallMinutes: values.shortfallMinutes,
    countedWorkMinutes: values.countedWorkMinutes, earlyArrivalMinutes: values.earlyArrivalMinutes, flexOutcome: values.flexOutcome, attendanceReviewRequired: false,
    attendanceReviewReason: null, leaveConflict: false, punchAnomalies: null, graceUsed: 5, attendanceRuleSnapshotRaw: JSON.stringify(snapshot), computedAt: new Date(computedAt) } }
}
function night({ computed12 = '2026-06-14T12:00:00', absent12 = false } = {}) {
  const punches = [nightPunch(101, `${D12}T20:10:00`), nightPunch(102, `${D13}T00:50:00`), nightPunch(103, `${D13}T20:00:00`), nightPunch(104, '2026-06-14T01:00:00')]
  const n12 = absent12 ? nightRow(61, D12, null, null, null, null, computed12) : nightRow(61, D12, punches[0].punchTime, punches[1].punchTime, 1210, 1490, computed12)
  const n13 = nightRow(62, D13, punches[2].punchTime, punches[3].punchTime, 1200, 1500, '2026-06-14T12:00:00')
  const section = (start, end, dates) => ({ state: 'AVAILABLE', issues: [], sourceRefs: [], data: { periodStart: start, periodEnd: end, historicalCalendarComplete: true,
    days: dates.map(d => nightPlan(d)), ruleEvidence: [nightSource, nightEmployee] } })
  const employment = (from, to, days) => ({ state: 'AVAILABLE', issues: [], sourceRefs: ['employees:3'], data: { coverage: { from, to, days } } })
  return { n12, n13, punches: absent12 ? punches.slice(2) : punches, section, employment }
}
const nightEvidence = (n, days) => ({ days, punches: n.punches, leaves: [], corrections: [], requests: [], exemptions: [] })
const nightNow = new Date('2026-06-15T12:00:00')

test('S28: ليلة 12 تحمل التأخير والنقص من بصمة 00:50 صباح 13، ويوم 13 يأخذ ليلته فقط', () => {
  const n = night()
  assert.equal(n.n12.values.lateMinutes, 10); assert.equal(n.n12.values.shortfallMinutes, 20); assert.equal(n.n12.values.countedWorkMinutes, 280)
  const r = verify(3, D12, D13, n.section(D12, D13, [D12, D13]), n.employment(D12, D13, 2), nightEvidence(n, [n.n12.row, n.n13.row]), nightNow)
  assert.equal(r.state, 'AVAILABLE', JSON.stringify(r.issues))
  assert.ok(!code(r, 'ATTENDANCE_OVERNIGHT_PROOF_UNSUPPORTED'))
  assert.deepEqual(r.data.tierDays.map(d => [d.date, d.rawLateSeconds]), [[D12, '600'], [D13, '0']])
  assert.deepEqual(r.data.totals, { absentDays: 0, workedDays: 2, shortfallMinutes: 20, paidPermissionDeductibleMinutes: 0 })
  assert.deepEqual(r.data.days[0].proof.punchIds, [101, 102]); assert.deepEqual(r.data.days[1].proof.punchIds, [103, 104])
  assert.equal(r.data.days[0].proof.workdayWindow.overnight, true)
  assert.equal(new Date(r.data.days[0].proof.workdayWindow.to).getTime(), new Date(`${D13}T10:29:59`).getTime(), 'حد ليلتين متتاليتين = منتصف الفجوة 01:00…20:00')
  assert.ok(!r.data.days[1].sourceRefs.includes('attendance_punches:102'))
})

test('S28: ليلة آخر يوم في الفترة تبقى فيها، وأول يوم في الفترة التالية يستبعد انصرافها بدليل جدول الجار', () => {
  const n = night()
  const last = verify(3, D12, D12, n.section(D12, D12, [D12]), n.employment(D12, D12, 1), nightEvidence(n, [n.n12.row]), nightNow)
  assert.equal(last.state, 'AVAILABLE', JSON.stringify(last.issues))
  assert.deepEqual(last.data.days[0].proof.punchIds, [101, 102]); assert.equal(last.data.totals.shortfallMinutes, 20)
  const withNeighbor = verify(3, D13, D13, n.section(D13, D13, [D13]), n.employment(D13, D13, 1), nightEvidence(n, [n.n13.row]), nightNow, { before: nightPlan(D12) })
  assert.equal(withNeighbor.state, 'AVAILABLE', JSON.stringify(withNeighbor.issues))
  assert.deepEqual(withNeighbor.data.days[0].proof.punchIds, [103, 104]); assert.equal(withNeighbor.data.totals.shortfallMinutes, 0)
  // بلا دليل جدول ليوم الجار لا يُخمَّن الحد: ثلاث بصمات مرشحة فيُحجب اليوم بدل نسب 00:50 له
  const unknown = verify(3, D13, D13, n.section(D13, D13, [D13]), n.employment(D13, D13, 1), nightEvidence(n, [n.n13.row]), nightNow)
  blocked(unknown); assert.ok(code(unknown, 'ATTENDANCE_UNIQUE_PUNCH_PROOF_MISSING'))
})

test('S28: وردية الغد الصباحية تقدم حد الليلة فتبقى بصمة 06:00 للغد لا لليلة الأمس', () => {
  const n = night(), dayTiming = { startTime: '08:00', endTime: '17:00', requiredWorkMinutes: 540, flexEnabled: false, flexWindowMinutes: 60 }
  n.punches = [n.punches[0], n.punches[1], nightPunch(105, `${D13}T06:00:00`)]
  const input = [3, D12, D12, n.section(D12, D12, [D12]), n.employment(D12, D12, 1), nightEvidence(n, [n.n12.row]), nightNow]
  const fallback = verify(...input)
  blocked(fallback); assert.ok(code(fallback, 'ATTENDANCE_UNIQUE_PUNCH_PROOF_MISSING'), 'بلا وردية معروفة للغد يمتد الحد إلى 10:30 فتدخل 06:00')
  const r = verify(...input, { after: nightPlan(D13, dayTiming) })
  assert.equal(r.state, 'AVAILABLE', JSON.stringify(r.issues)); assert.deepEqual(r.data.days[0].proof.punchIds, [101, 102])
  assert.equal(new Date(r.data.days[0].proof.workdayWindow.to).getTime(), new Date(`${D13}T04:29:59`).getTime())
})

test('S28: الليلة لا تُقفل ولا يثبت غيابها عند منتصف الليل بل عند حد نافذتها صباح الغد', () => {
  const early = night({ computed12: `${D13}T00:52:00` })
  early.punches = early.punches.slice(0, 2)
  const input = [3, D12, D12, early.section(D12, D12, [D12]), early.employment(D12, D12, 1), nightEvidence(early, [early.n12.row])]
  const open = verify(...input, new Date(`${D13}T00:55:00`))
  blocked(open); assert.ok(code(open, 'ATTENDANCE_DAY_NOT_CLOSED'), 'تاريخ 12 انقضى تقويميًا لكن ليلته ما زالت مفتوحة')
  assert.equal(verify(...input, new Date(`${D13}T10:31:00`)).state, 'AVAILABLE')
  // الغياب: حساب قبل نهاية الوردية (00:59) لا يثبت؛ بعد نهايتها يثبت متى أُقفلت النافذة وخلت من البصمات عند القراءة
  for (const [computedAt, readAt, available] of [[`${D13}T00:59:59`, nightNow, false], [`${D13}T02:00:00`, nightNow, true], [`${D13}T11:00:00`, nightNow, true],
    [`${D13}T02:00:00`, new Date(`${D13}T10:29:00`), false]]) {
    const a = night({ absent12: true, computed12: computedAt })
    a.punches = [] // فترة يوم 12 وحده: بصمات ليلة 13 خارج نافذته، وقد تكون بعد لحظة القراءة المبكرة
    const r = verify(3, D12, D12, a.section(D12, D12, [D12]), a.employment(D12, D12, 1), nightEvidence(a, [a.n12.row]), readAt)
    if (available) { assert.equal(r.state, 'AVAILABLE', JSON.stringify(r.issues)); assert.equal(r.data.totals.absentDays, 1) }
    else { blocked(r); assert.ok(code(r, 'ATTENDANCE_DAY_NOT_CLOSED'), `غياب محسوب ${computedAt} ومقروء ${readAt.toISOString()} لا يُثبت`) }
  }
})

test('S28: توقيت مهمة الغياب الفعلية (01:00) لليلة 20:00 ← 01:00 يُثبت بعد إقفال النافذة دون انتظار لحاق الليلة التالية', () => {
  require('../node_modules/reflect-metadata')
  const { AttendanceScheduler } = require('../src/attendance/attendance-scheduler.service')
  const cron = Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', AttendanceScheduler.prototype.materializeYesterday)
  assert.equal(cron?.cronTime, '0 1 * * *', 'المهمة اليومية لتجسيد غياب الأمس')
  const [minuteField, hourField] = cron.cronTime.split(' ').map(Number)
  // المهمة تكتب صف غياب ليلة 12 بعد لحظة تشغيلها صباح 13 (هنا +5 ثوانٍ زمن التشغيل)
  const cronRun = new Date(`${D13}T${String(hourField).padStart(2, '0')}:${String(minuteField).padStart(2, '0')}:05`)
  const a = night({ absent12: true, computed12: cronRun.toISOString() })
  a.punches = [] // لا بصمة لليلة 12؛ بصمات ليلة 13 لم تحدث بعد عند القراءة صباح 13
  const read = at => verify(3, D12, D12, a.section(D12, D12, [D12]), a.employment(D12, D12, 1), nightEvidence(a, [a.n12.row]), at)
  const beforeClose = read(new Date(`${D13}T09:00:00`))
  blocked(beforeClose); assert.ok(code(beforeClose, 'ATTENDANCE_DAY_NOT_CLOSED'), 'قبل حد النافذة 10:30 لا تزال الليلة مفتوحة لبصمة متأخرة')
  const afterClose = read(new Date(`${D13}T10:30:00`))
  assert.equal(afterClose.state, 'AVAILABLE', JSON.stringify(afterClose.issues))
  assert.deepEqual(afterClose.data.totals, { absentDays: 1, workedDays: 0, shortfallMinutes: 0, paidPermissionDeductibleMinutes: 0 })
  assert.equal(afterClose.data.days[0].proof.basis, 'EXPLICIT_STORED_ABSENCE_VERIFIED'); assert.equal(afterClose.data.days[0].proof.attendanceInputs.absent, true)
  // بصمة تصل بعد المهمة داخل النافذة تُكشف عند القراءة فلا يبقى الغياب مثبتًا
  a.punches = [nightPunch(109, `${D13}T00:20:00`)]
  const late = read(new Date(`${D13}T10:30:00`)); blocked(late); assert.ok(code(late, 'ATTENDANCE_UNIQUE_PUNCH_PROOF_MISSING'))
})

test('S28: توقيت يوم الجار غير المثبت لا يحرك حد النافذة ويُعامل «بلا وردية» مع توثيق ذلك في الإثبات', () => {
  const n = night(), dayTiming = { startTime: '08:00', endTime: '17:00', requiredWorkMinutes: 540, flexEnabled: false, flexWindowMinutes: 60 }
  n.punches = [n.punches[0], n.punches[1], nightPunch(105, `${D13}T06:00:00`)]
  const inputOf = () => [3, D12, D12, n.section(D12, D12, [D12]), n.employment(D12, D12, 1), nightEvidence(n, [n.n12.row]), nightNow]
  const unproven = { ...nightPlan(D13, dayTiming), timingState: 'UNSUPPORTED', scheduled: null }
  const r = verify(...inputOf(), { after: unproven })
  blocked(r); assert.ok(code(r, 'ATTENDANCE_UNIQUE_PUNCH_PROOF_MISSING'), 'الوردية الصباحية غير المثبتة لا تقدم الحد إلى 04:30')
  // بلا بصمة الغد: اليوم يثبت بحد «بلا وردية» (10:30) ويسجل أن الجار غير مثبت
  n.punches = n.punches.slice(0, 2)
  const input = inputOf()
  const kept = verify(...input, { after: unproven })
  assert.equal(kept.state, 'AVAILABLE', JSON.stringify(kept.issues))
  assert.equal(new Date(kept.data.days[0].proof.workdayWindow.to).getTime(), new Date(`${D13}T10:29:59`).getTime())
  assert.deepEqual(kept.data.days[0].proof.workdayWindow.neighborEvidence, { before: 'NOT_READ', after: 'UNPROVEN_TREATED_AS_NO_SHIFT' })
  const proven = verify(...input, { after: nightPlan(D13, dayTiming) })
  assert.equal(proven.data.days[0].proof.workdayWindow.neighborEvidence.after, 'PROVEN')
  assert.equal(new Date(proven.data.days[0].proof.workdayWindow.to).getTime(), new Date(`${D13}T04:29:59`).getTime())
})
