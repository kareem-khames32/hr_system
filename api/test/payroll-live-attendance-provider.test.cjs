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
    return f.evidence[tables[calls.length - 1]]
  } }
  assert.equal((await read(em, 3, date, date, f.schedule, f.employment)).state, 'AVAILABLE'); assert.equal(calls.length, 6)
  await assert.rejects(read({ queryRunner: { isTransactionActive: false } }, 3, date, date, f.schedule, f.employment), /معاملة/)
  const absentSchema = await read({ queryRunner: { isTransactionActive: true }, query: async () => { throw { driverError: { number: 208 } } } }, 3, date, date, f.schedule, f.employment)
  assert.equal(absentSchema.state, 'MISSING'); assert.ok(code(absentSchema, 'ATTENDANCE_EVIDENCE_SCHEMA_MISSING'))
  const lost = new Error('connection lost')
  await assert.rejects(read({ queryRunner: { isTransactionActive: true }, query: async () => { throw lost } }, 3, date, date, f.schedule, f.employment), e => e === lost)
})
