// B4 / الخطوتان 19 و20 — محرك السياسة خلف engine_mode: السياسة الافتراضية تقلّد حساب المسير القديم لكل بند،
// وتقرير التكافؤ يعطي كل فرق سببًا ومفتاحًا، وشروط التحويل إلى POLICY؛ ولقطة السياسة: البصمة والفروق. بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const engine = require('../src/payroll/payroll-policy-engine-run')
const snapshots = require('../src/payroll/payroll-policy-snapshot')
const { protectPayrollObligations } = require('../src/payroll/payroll-obligation-protection')
const { roundPayrollMoney: round2 } = require('../src/payroll/payroll-money')

/** نسخة من خطوات calculateDefined القديمة (التناسب بالقروش وتوزيع الباقي على أكبر مكوّن، الإجازة بلا أجر، حماية الصافي). */
function legacy(facts, requested) {
  const monthlyCents = facts.monthlyComponents.map(amount => Math.round(amount * 100)), grossCents = monthlyCents.reduce((a, b) => a + b, 0)
  const prorate = cents => facts.fullCoverage ? cents : Math.min(cents, Math.trunc(cents * facts.coverDays / 30))
  const grossEarnedCents = prorate(grossCents), earnedCents = monthlyCents.map(prorate)
  earnedCents[facts.monthlyComponents.indexOf(Math.max(...facts.monthlyComponents))] += grossEarnedCents - earnedCents.reduce((a, b) => a + b, 0)
  const earned = earnedCents.map(cents => cents / 100), grossEarned = grossEarnedCents / 100, dayRate = grossCents / 100 / 30
  const unpaid = round2(facts.unpaidLeaveDays * dayRate)
  const protection = protectPayrollObligations({ earnedFixedGross: grossEarned, overtime: facts.overtimeAmount, unpaidLeave: unpaid, attendance: requested,
    credits: facts.credits, debits: facts.debits, settings: facts.protectionSettings })
  const netBeforeLoans = round2(grossEarned + facts.overtimeAmount + protection.otherAdditions - protection.attendance.lateness - protection.attendance.shortfall - protection.attendance.absence - unpaid - protection.otherDeductions)
  return { basicSalary: earned[0], allowances: round2(earned.slice(1).reduce((a, b) => a + b, 0)), overtimeAmount: facts.overtimeAmount, otherAdditions: protection.otherAdditions,
    latenessDeduction: protection.attendance.lateness, shortfallDeduction: protection.attendance.shortfall, absenceDeduction: protection.attendance.absence,
    unpaidLeaveDeduction: unpaid, otherDeductions: protection.otherDeductions, loanInstallments: 0, netPay: netBeforeLoans }
}
const base = (extra = {}) => ({ employeeId: 7, period: '2026-10', periodStart: '2026-09-23', periodEnd: '2026-10-22', monthlyComponents: [6500, 1000, 300, 0, 0, 0],
  coverDays: 30, periodDays: 30, fullCoverage: true, dailyHours: 8, monthlyDays: 30, lateDeductionEnabled: true, currency: 'SAR', overtimeAmount: 125.5, unpaidLeaveDays: 1.5,
  credits: [{ id: 1, amount: 200, category: 'BONUS', deductionRequestId: null, effectiveDate: null }],
  debits: [{ id: 2, amount: 50, category: 'CUSTODY', deductionRequestId: null, effectiveDate: null }],
  protectionSettings: { minNetGuarantee: null, netFloorPct: null, maxDeductionPctOfGross: null },
  attendance: { status: 'MATCHED', totals: { lateness: '381.25', shortfall: '12.50', absence: '260.00' }, message: 'ok' }, ...extra })
function parity(facts, legacyOverride = {}) {
  const requested = { lateness: Number(facts.attendance.totals?.lateness ?? 0), shortfall: Number(facts.attendance.totals?.shortfall ?? 0), absence: Number(facts.attendance.totals?.absence ?? 0) }
  const preNet = engine.computePayrollPolicyEnginePreNet(facts)
  const old = { ...legacy(facts, requested), ...legacyOverride }
  const policy = { ...preNet.amounts, loanInstallments: preNet.netBeforeLoans === null ? null : 0, netPay: preNet.netBeforeLoans }
  return { preNet, row: engine.payrollParityEmployeeRow({ employeeId: facts.employeeId, legacy: old, legacyAttendanceRequested: requested, policy, preNet, attendanceShadowStatus: facts.attendance.status }) }
}

test('the default legacy-equivalent policy passes the real component executor and matches the legacy calculation item by item (full month)', () => {
  const { preNet, row } = parity(base())
  assert.equal(preNet.status, 'COMPUTED', JSON.stringify(preNet.error))
  assert.equal(preNet.execution.definition, 'LEGACY_EQUIVALENT_DEFAULT')
  assert.deepEqual(preNet.execution.lines.map(line => line.code), ['SAL_BASIC', 'SAL_HOUSING', 'SAL_TRANSPORT', 'SAL_PHONE', 'SAL_WORK_NATURE', 'SAL_OTHER', 'OT_PAY', 'LEDGER_CREDITS', 'LATENESS_DED', 'SHORTFALL_DED', 'ABSENCE_DED', 'UNPAID_LEAVE_DED', 'NET'])
  assert.equal(preNet.amounts.unpaidLeaveDeduction, 390) // 1.5 × 7800 / 30
  assert.equal(row.status, 'MATCHED', JSON.stringify(row.components.filter(item => item.difference !== null)))
  assert.ok(row.components.every(item => item.differenceKey === null))
  // 7800 + 125.50 إضافي + 200 دفتر − 381.25 تأخير − 12.50 نقص − 260 غياب − 390 إجازة بلا أجر − 50 خصم دفتر
  assert.equal(row.components.find(item => item.code === 'NET').legacy, '7031.75')
})

test('partial coverage with odd cents: per-component rounding differs by a cent from the legacy residual distribution — recorded with a reason, never silent', () => {
  const facts = base({ monthlyComponents: [1000.01, 1000.01, 1000.01, 0, 0, 0], coverDays: 7, fullCoverage: false, overtimeAmount: 0, unpaidLeaveDays: 0, credits: [], debits: [],
    attendance: { status: 'MATCHED', totals: { lateness: '0.00', shortfall: '0.00', absence: '0.00' }, message: 'ok' } })
  const { row } = parity(facts)
  assert.equal(row.status, 'DIFFERENT')
  const basic = row.components.find(item => item.code === 'BASIC'), net = row.components.find(item => item.code === 'NET')
  // قص نحو الصفر (قرار المالك): القديم يوزّع قرش الباقي على الأساسي، والمحرك يقص كل مكوّن
  assert.deepEqual([basic.legacy, basic.policy, basic.difference, basic.reasonCode], ['233.34', '233.33', '-0.01', 'SALARY_ROUNDING_DISTRIBUTION'])
  assert.deepEqual([net.legacy, net.policy, net.reasonCode], ['700.00', '699.99', 'FOLLOWS_UPSTREAM_DIFFERENCE'])
  assert.equal(basic.differenceKey, engine.payrollParityDifferenceKey(7, 'BASIC', '233.34', '233.33'))
})

test('unproven attendance source: the dependent items have no policy value (UNAVAILABLE with the shadow reason), the salary items still compute', () => {
  const { preNet, row } = parity(base({ attendance: { status: 'PARTIAL', totals: null, message: 'بعض أيام الفترة غير مثبتة المصدر' } }))
  assert.equal(preNet.status, 'PARTIAL')
  assert.equal(row.status, 'UNAVAILABLE')
  const lateness = row.components.find(item => item.code === 'LATENESS')
  assert.deepEqual([lateness.policy, lateness.reasonCode, lateness.reason], [null, 'ATTENDANCE_SHADOW_PARTIAL', 'بعض أيام الفترة غير مثبتة المصدر'])
  assert.equal(row.components.find(item => item.code === 'BASIC').policy, '6500.00')
  assert.equal(row.components.find(item => item.code === 'NET').policy, null)
})

test('attendance engine difference is named as such (not blamed on upstream)', () => {
  const facts = base()
  const requested = { lateness: 381.25, shortfall: 12.5, absence: 260 }
  const preNet = engine.computePayrollPolicyEnginePreNet({ ...facts, attendance: { status: 'DIFFERENT', totals: { lateness: '400.00', shortfall: '12.50', absence: '260.00' }, message: 'x' } })
  const row = engine.payrollParityEmployeeRow({ employeeId: 7, legacy: legacy(facts, requested), legacyAttendanceRequested: requested,
    policy: { ...preNet.amounts, loanInstallments: 0, netPay: preNet.netBeforeLoans }, preNet, attendanceShadowStatus: 'DIFFERENT' })
  assert.equal(row.components.find(item => item.code === 'LATENESS').reasonCode, 'ATTENDANCE_ENGINE_DIFFERENCE')
  assert.equal(row.components.find(item => item.code === 'NET').reasonCode, 'FOLLOWS_UPSTREAM_DIFFERENCE')
})

test('POLICY switch conditions: a SHADOW report for the current calculation version, no missing policy value, and a written reason for every difference', () => {
  const different = parity(base({ monthlyComponents: [1000.01, 1000.01, 1000.01, 0, 0, 0], coverDays: 7, fullCoverage: false, overtimeAmount: 0, unpaidLeaveDays: 0, credits: [], debits: [],
    attendance: { status: 'MATCHED', totals: { lateness: '0.00', shortfall: '0.00', absence: '0.00' }, message: 'ok' } })).row
  const matched = parity(base({ employeeId: 8 })).row
  const report = engine.summarizePayrollEngineParity({ engineMode: 'SHADOW', snapshotVersion: 3, policySnapshotHash: 'a'.repeat(64), rows: [matched, different] })
  assert.deepEqual(report.totals, { employees: 2, matched: 1, different: 1, unavailable: 0, error: 0, differences: 2 })
  assert.match(report.reportHash, /^[a-f0-9]{64}$/)
  const run = { snapshotVersion: 3, policySnapshotHash: 'a'.repeat(64) }
  const issues = engine.payrollPolicySwitchIssues(report, run, new Set())
  assert.deepEqual(issues.map(issue => [issue.employeeId, issue.component, issue.issue]), [[7, 'BASIC', 'UNEXPLAINED'], [7, 'NET', 'UNEXPLAINED']])
  assert.deepEqual(engine.payrollPolicySwitchIssues(report, run, new Set(issues.map(issue => issue.differenceKey))), [])
  assert.equal(engine.payrollPolicySwitchIssues(report, { ...run, snapshotVersion: 4 }, new Set())[0].issue, 'STALE_REPORT')
  assert.equal(engine.payrollPolicySwitchIssues(null, run, new Set())[0].issue, 'NO_SHADOW_REPORT')
  const legacyOnly = engine.summarizePayrollEngineParity({ engineMode: 'LEGACY', snapshotVersion: 3, policySnapshotHash: run.policySnapshotHash, rows: [] })
  assert.equal(engine.payrollPolicySwitchIssues(legacyOnly, run, new Set())[0].issue, 'NO_SHADOW_REPORT')
  const unavailable = parity(base({ employeeId: 9, attendance: { status: 'UNAVAILABLE', totals: null, message: 'مصادر الحضور غير مثبتة' } })).row
  const blocked = engine.payrollPolicySwitchIssues(engine.summarizePayrollEngineParity({ engineMode: 'SHADOW', snapshotVersion: 3, policySnapshotHash: run.policySnapshotHash, rows: [unavailable] }), run, new Set([unavailable.components[4].differenceKey]))
  assert.ok(blocked.length > 0 && blocked.every(issue => issue.issue === 'UNAVAILABLE'), 'a missing policy value cannot be explained away')
  assert.equal(engine.parsePayrollEngineParityReport(JSON.stringify(report)).reportHash, report.reportHash)
  assert.equal(engine.parsePayrollEngineParityReport('{bad'), null)
})

function snapshot(extra = {}) {
  const content = { schemaVersion: 1, capturedAt: '2026-09-14T10:00:00.000Z', capturedBy: 1, period: '2026-10', dayBasis: 'FIXED_30',
    policy: { policyId: 1, code: 'CAIRO', name: 'مجموعة القاهرة', branchId: 1, versionId: 1, versionNo: 1, revision: 2, status: 'ACTIVE', effectiveFrom: '2026-09-23',
      publishedAt: '2026-09-14T14:22:37.829Z', sealHash: 'b'.repeat(64), settingsStatus: 'COMPLETE', settings: { dailyHours: 8 } },
    values: { monthlyDays: 30, dailyHours: 8, lateDeductionEnabled: true, shortfallEnabled: true, shortfallMode: 'MINUTES', shortfallValue: 1, overlapPolicy: 'NET_OF_LATENESS',
      dailyCapDays: 1, earlyLeaveDeductionEnabled: true, absencePenaltyDays: 1.5, exemptOvertimeEligible: false, exemptUnpaidLeaveDeductible: true, currency: 'SAR',
      minNetGuarantee: null, netFloorPct: null, maxDeductionPctOfGross: null },
    sources: Object.fromEntries(['monthlyDays', 'dailyHours', 'lateDeductionEnabled', 'shortfallEnabled', 'shortfallMode', 'shortfallValue', 'overlapPolicy', 'dailyCapDays',
      'earlyLeaveDeductionEnabled', 'absencePenaltyDays', 'exemptOvertimeEligible', 'exemptUnpaidLeaveDeductible', 'currency', 'minNetGuarantee', 'netFloorPct', 'maxDeductionPctOfGross']
      .map(key => [key, { kind: 'CONFIG', key }])),
    latenessTiers: { setId: 1, effectivePeriod: '2000-01', contentHash: 'c'.repeat(64), source: 'LEGACY_CONVERSION', tiers: [{ sequence: 1, fromMinutes: 1, toMinutes: 60, mode: 'FRACTION', value: '0.250', label: null }] },
    ...extra }
  return { ...content, fingerprint: snapshots.payrollRunPolicySnapshotFingerprint(content) }
}

test('step 19 (pure): the fingerprint ignores capture time/actor but covers values and tiers; a changed absence_penalty_days is listed as a labelled difference', () => {
  const stored = snapshot(), later = snapshot({ capturedAt: '2026-09-20T09:00:00.000Z', capturedBy: 12 })
  assert.equal(later.fingerprint, stored.fingerprint)
  assert.deepEqual(snapshots.diffPayrollRunPolicySnapshots(stored, later), [])
  const changed = snapshot({ values: { ...stored.values, absencePenaltyDays: 2 } })
  assert.notEqual(changed.fingerprint, stored.fingerprint)
  const differences = snapshots.diffPayrollRunPolicySnapshots(stored, changed)
  assert.deepEqual(differences.map(row => [row.key, row.label]), [['values.absencePenaltyDays', 'معامل عقوبة الغياب بلا إذن (أيام)']])
  assert.match(differences[0].stored, /^1\.5/); assert.match(differences[0].current, /^2/)
  const tiersChanged = snapshot({ latenessTiers: { ...stored.latenessTiers, setId: 2, contentHash: 'd'.repeat(64) } })
  assert.equal(snapshots.diffPayrollRunPolicySnapshots(stored, tiersChanged)[0].key, 'latenessTiers')
  // اللقطة المحفوظة تُتحقق ببصمتها؛ أي تعديل يدوي يرفض إعادة الحساب منها
  assert.equal(snapshots.parsePayrollRunPolicySnapshot({ id: 5, policySnapshot: JSON.stringify(stored), policySnapshotHash: stored.fingerprint }).fingerprint, stored.fingerprint)
  const tampered = JSON.stringify({ ...stored, values: { ...stored.values, absencePenaltyDays: 1 } })
  assert.throws(() => snapshots.parsePayrollRunPolicySnapshot({ id: 5, policySnapshot: tampered, policySnapshotHash: stored.fingerprint }), error => error.getResponse().code === 'PAYRUN-POLICY-SNAPSHOT-INVALID')
  assert.equal(snapshots.parsePayrollRunPolicySnapshot({ id: 5, policySnapshot: null, policySnapshotHash: null }), null)
  assert.ok(snapshots.diffPayrollRunPolicySnapshots(null, stored).length >= 3, 'a run without a stored snapshot shows every current value')
})

test('step 19 (pure): every fingerprint change is a named difference — version status and settings, value source, tier labels — so a refresh is never required with an empty list', () => {
  const stored = snapshot()
  const keys = (next) => { assert.notEqual(next.fingerprint, stored.fingerprint); return snapshots.diffPayrollRunPolicySnapshots(stored, next).map(row => row.key) }
  assert.deepEqual(keys(snapshot({ policy: { ...stored.policy, status: 'SUPERSEDED' } })), ['policy.status'])
  assert.deepEqual(keys(snapshot({ policy: { ...stored.policy, settingsStatus: 'INCOMPLETE', settings: { dailyHours: 9 } } })), ['policy.settingsStatus', 'policy.settings.dailyHours'])
  const sourceChanged = snapshot({ sources: { ...stored.sources, absencePenaltyDays: { kind: 'DEFAULT', key: 'absencePenaltyDays' } } })
  assert.deepEqual(keys(sourceChanged), ['sources.absencePenaltyDays'])
  assert.equal(snapshots.diffPayrollRunPolicySnapshots(stored, sourceChanged)[0].label, 'مصدر «معامل عقوبة الغياب بلا إذن (أيام)»')
  assert.deepEqual(keys(snapshot({ latenessTiers: { ...stored.latenessTiers, tiers: [{ ...stored.latenessTiers.tiers[0], label: 'ربع يوم' }] } })), ['latenessTiers.detail'])
  // أي محتوى آخر داخل البصمة بلا تسمية مخصصة يظهر فرقًا عامًا بدل قائمة فارغة
  assert.deepEqual(keys(snapshot({ extraRule: 1 })), ['fingerprint'])
  // الإعادة للقراءة: شهر اللقطة يطابق شهر المسير، وبصمة بلا لقطة تالفة
  const invalid = error => error.getResponse().code === 'PAYRUN-POLICY-SNAPSHOT-INVALID'
  assert.throws(() => snapshots.parsePayrollRunPolicySnapshot({ id: 5, period: '2026-11', policySnapshot: JSON.stringify(stored), policySnapshotHash: stored.fingerprint }), invalid)
  assert.equal(snapshots.parsePayrollRunPolicySnapshot({ id: 5, period: '2026-10', policySnapshot: JSON.stringify(stored), policySnapshotHash: stored.fingerprint }).fingerprint, stored.fingerprint)
  assert.throws(() => snapshots.parsePayrollRunPolicySnapshot({ id: 5, policySnapshot: null, policySnapshotHash: stored.fingerprint }), invalid)
})

test('step 20 approval (pure): no engine mode, LEGACY, a tampered/stale/incomplete report and every unexplained difference or unavailable value block approval; a written reason for an unavailable value satisfies approval but never the POLICY switch', () => {
  const H = 'a'.repeat(64)
  const different = parity(base({ monthlyComponents: [1000.01, 1000.01, 1000.01, 0, 0, 0], coverDays: 7, fullCoverage: false, overtimeAmount: 0, unpaidLeaveDays: 0, credits: [], debits: [],
    attendance: { status: 'MATCHED', totals: { lateness: '0.00', shortfall: '0.00', absence: '0.00' }, message: 'ok' } })).row
  const unavailableFacts = base({ employeeId: 9, attendance: { status: 'UNAVAILABLE', totals: null, message: 'مصادر الحضور غير مثبتة' } })
  const requested = { lateness: 0, shortfall: 0, absence: 0 }
  const preNet = engine.computePayrollPolicyEnginePreNet(unavailableFacts)
  const unavailable = engine.payrollParityEmployeeRow({ employeeId: 9, legacy: legacy(unavailableFacts, requested), legacyAttendanceRequested: requested,
    policy: { ...preNet.amounts, loanInstallments: null, netPay: null }, preNet, attendanceShadowStatus: 'UNAVAILABLE', sourceIssueCodes: ['SCHEDULE_TIMING_FIELDS_MISSING', 'ATTENDANCE_PUNCH_EVIDENCE_INVALID'] })
  const report = engine.summarizePayrollEngineParity({ engineMode: 'SHADOW', snapshotVersion: 3, policySnapshotHash: H, rows: [different, unavailable] })
  const run = { engineMode: 'SHADOW', snapshotVersion: 3, policySnapshotHash: H }
  const general = (...args) => engine.payrollApprovalParityIssues(...args)[0].issue
  assert.equal(general(report, { ...run, engineMode: null }, new Set()), 'NO_ENGINE_MODE')
  assert.equal(general(report, { ...run, engineMode: 'LEGACY' }, new Set()), 'NO_SHADOW_REPORT')
  assert.equal(general(null, run, new Set()), 'NO_SHADOW_REPORT')
  assert.equal(general({ ...report, rows: report.rows.map(row => ({ ...row, status: 'MATCHED' })) }, run, new Set()), 'INVALID_REPORT', 'a report edited outside the calculation no longer matches its hash')
  assert.equal(general(report, { ...run, snapshotVersion: 4 }, new Set()), 'STALE_REPORT')
  assert.equal(general(report, { ...run, engineMode: 'POLICY' }, new Set()), 'STALE_REPORT')
  assert.equal(general(report, run, new Set(), [7]), 'STALE_REPORT', 'a report row without an item in the run')
  assert.deepEqual(engine.payrollApprovalParityIssues(report, run, new Set(), [7, 9, 11]).filter(issue => issue.issue === 'MISSING_EMPLOYEE').map(issue => issue.employeeId), [11])
  const issues = engine.payrollApprovalParityIssues(report, run, new Set(), [7, 9])
  assert.deepEqual(issues.map(issue => [issue.employeeId, issue.component, issue.issue]), [[7, 'BASIC', 'UNEXPLAINED_DIFFERENCE'], [7, 'NET', 'UNEXPLAINED_DIFFERENCE'],
    ...['LATENESS', 'SHORTFALL', 'ABSENCE', 'OTHER_DEDUCTIONS', 'LOANS', 'NET'].map(code => [9, code, 'UNEXPLAINED_UNAVAILABLE'])])
  assert.deepEqual(engine.payrollParityPendingGroups(issues), [{ reasonCode: 'ATTENDANCE_SHADOW_UNAVAILABLE', count: 6, unavailable: 6, employees: 1 },
    { reasonCode: 'FOLLOWS_UPSTREAM_DIFFERENCE', count: 1, unavailable: 0, employees: 1 }, { reasonCode: 'SALARY_ROUNDING_DISTRIBUTION', count: 1, unavailable: 0, employees: 1 }])
  const allKeys = new Set(issues.map(issue => issue.differenceKey))
  assert.deepEqual(engine.payrollApprovalParityIssues(report, run, allKeys, [7, 9]), [], 'every difference and unavailable value has a written reason: approval allowed')
  const switchIssues = engine.payrollPolicySwitchIssues(report, run, allKeys)
  assert.deepEqual(switchIssues.map(issue => issue.issue), Array(6).fill('UNAVAILABLE'), 'written reasons never let POLICY pay a missing value')
  assert.equal(engine.payrollPolicySwitchIssues({ ...report, rows: report.rows.map(row => ({ ...row, status: 'MATCHED' })) }, run, allKeys)[0].issue, 'STALE_REPORT', 'the switch also rejects a report that does not match its hash')
  const empty = engine.summarizePayrollEngineParity({ engineMode: 'SHADOW', snapshotVersion: 3, policySnapshotHash: H, rows: [] })
  assert.equal(engine.payrollPolicySwitchIssues(empty, run, new Set())[0].issue, 'NO_SHADOW_REPORT', 'a report with no employees proves no parity and never allows POLICY')
})

test('source plan (pure): shadow source issue codes per employee, summarised per code with a remedy; matched rows carry none', () => {
  const shadow = { status: 'PARTIAL', sources: { schedule: { issueCodes: ['SCHEDULE_TIMING_FIELDS_MISSING'] }, employment: { issueCodes: [] }, attendance: { issueCodes: ['ATTENDANCE_CALENDAR_UNPROVEN'] } },
    unprovenDays: [{ code: 'ATTENDANCE_CALENDAR_UNPROVEN', dates: ['2026-12-01'] }, { code: 'ATTENDANCE_STORED_DAY_MISSING', dates: ['2026-12-02'] }] }
  assert.deepEqual(engine.payrollShadowSourceIssueCodes(shadow), ['ATTENDANCE_CALENDAR_UNPROVEN', 'ATTENDANCE_STORED_DAY_MISSING', 'SCHEDULE_TIMING_FIELDS_MISSING'])
  assert.deepEqual(engine.payrollShadowSourceIssueCodes(null), ['ATTENDANCE_SHADOW_NOT_COMPUTED'])
  assert.deepEqual(engine.payrollShadowSourceIssueCodes({ status: 'ERROR', error: { code: 'SHADOW_ATTENDANCE_FAILED' } }), ['SHADOW_ATTENDANCE_FAILED'])
  const row = (employeeId, status, codes) => {
    const facts = base({ employeeId, attendance: status === 'MATCHED' ? base().attendance : { status, totals: null, message: 'غير مثبت' } })
    const preNet = engine.computePayrollPolicyEnginePreNet(facts)
    const requested = { lateness: Number(facts.attendance.totals?.lateness ?? 0), shortfall: Number(facts.attendance.totals?.shortfall ?? 0), absence: Number(facts.attendance.totals?.absence ?? 0) }
    return engine.payrollParityEmployeeRow({ employeeId, legacy: legacy(facts, requested), legacyAttendanceRequested: requested,
      policy: { ...preNet.amounts, loanInstallments: preNet.netBeforeLoans === null ? null : 0, netPay: preNet.netBeforeLoans }, preNet, attendanceShadowStatus: status, sourceIssueCodes: codes })
  }
  const rows = [row(1, 'PARTIAL', ['SCHEDULE_TIMING_FIELDS_MISSING', 'ATTENDANCE_CALENDAR_UNPROVEN']), row(2, 'UNAVAILABLE', ['SCHEDULE_TIMING_FIELDS_MISSING', 'NEW_SOURCE_CODE']),
    row(3, 'MATCHED', ['SCHEDULE_TIMING_FIELDS_MISSING'])]
  assert.equal(rows[2].status, 'MATCHED'); assert.deepEqual(rows[2].sourceIssueCodes, [])
  const readiness = engine.summarizePayrollEngineParity({ engineMode: 'SHADOW', snapshotVersion: 1, policySnapshotHash: null, rows }).sourceReadiness
  assert.deepEqual(readiness.map(item => [item.code, item.employees, item.employeeIds]), [['SCHEDULE_TIMING_FIELDS_MISSING', 2, [1, 2]], ['ATTENDANCE_CALENDAR_UNPROVEN', 1, [1]], ['NEW_SOURCE_CODE', 1, [2]]])
  assert.match(readiness[0].remedy, /جداول العمل/); assert.match(readiness[2].remedy, /ظل السياسة/)
})

test('الراتب على 30 يوم: تناسب المحرك لموظف معيّن نص الدورة على 30 مش على طول الفترة، فمفيش فرق زائف في دورة 31 أو 28 يوم', () => {
  for (const periodDays of [31, 28, 30]) {
    const facts = base({ coverDays: 15, periodDays, fullCoverage: false, overtimeAmount: 0, unpaidLeaveDays: 0, credits: [], debits: [],
      attendance: { status: 'MATCHED', totals: { lateness: '0.00', shortfall: '0.00', absence: '0.00' }, message: 'ok' } })
    const { preNet, row } = parity(facts)
    // 6500 و1000 و300 × 15 ÷ 30
    assert.deepEqual(preNet.earnedComponents.slice(0, 3), [3250, 500, 150], `periodDays=${periodDays}`)
    assert.equal(preNet.grossEarned.toFixed(2), '3900.00')
    assert.equal(row.status, 'MATCHED', `periodDays=${periodDays}: ${JSON.stringify(row.components.filter(item => item.difference !== null))}`)
  }
  const capped = engine.computePayrollPolicyEnginePreNet(base({ coverDays: 31, periodDays: 31, fullCoverage: false }))
  assert.equal(capped.grossEarned.toFixed(2), '7800.00', 'بسقف الراتب كاملًا')
})
