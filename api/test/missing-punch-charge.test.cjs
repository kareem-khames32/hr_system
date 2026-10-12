// B-ADD.14 — خصم نسيان البصمة: القواعد النقية (المعامل والمسموح، واليوم الناقص من غير طلب)، ومصدر الكود (اللقطة لما يتفعّل بس، والمبلغ جوه
// عمود التأخير، واعتماد المسير مابيقفش على يوم اتحاسب). حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/payroll/missing-punch-charge')
const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')

test('MPC-01: المعامل من 0 لحد 5 بمنزلتين والمسموح عدد صحيح لحد 31 — أي نص تاني = صفر (مقفول)', () => {
  assert.deepEqual(['0.5', '1', '0.25', '5', ' 2 ', '0', '', null, undefined, '5.01', '-1', '0.123', 'abc', '1e1'].map(rules.missingPunchPenaltyOf), [0.5, 1, 0.25, 5, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  assert.deepEqual(['0', '1', '31', ' 3 ', '32', '1.5', '-1', '', null, 'x'].map(rules.missingPunchFreeOf), [0, 1, 31, 3, 0, 0, 0, 0, 0, 0])
  assert.deepEqual([rules.PAYROLL_MISSING_PUNCH_PENALTY_KEY, rules.PAYROLL_MISSING_PUNCH_FREE_KEY], ['payroll.missing_punch.penalty_days', 'payroll.missing_punch.free_count'])
})

test('MPC-02: اللي بيتخصم — أيام البصمة الناقصة اللي مالهاش طلب، الأوائل لحد المسموح من غير خصم، والباقي كل يوم بأجر اليوم × المعامل', () => {
  const charge = (missing, requests, free) => rules.missingPunchCharge(missing, new Set(requests), free, 300, 0.25)
  // مثال المالك: نسي 4 أيام، قدّم طلب عن واحد، والسماح مرتين ← التالت بس بيتخصم ربع يوم
  assert.deepEqual(charge(['2026-09-03', '2026-09-08', '2026-09-10', '2026-09-15'], ['2026-09-08'], 2),
    { penaltyDays: 0.25, free: 2, missingDays: 4, withRequest: 1, count: 3, charged: 1, days: [{ date: '2026-09-15', amount: 75 }] })
  assert.deepEqual(charge(['2026-09-10', '2026-09-03'], [], 0).days, [{ date: '2026-09-03', amount: 75 }, { date: '2026-09-10', amount: 75 }], 'بترتيب التاريخ')
  assert.deepEqual([charge(['2026-09-03', '2026-09-08'], [], 2).charged, charge(['2026-09-03'], ['2026-09-03'], 0).charged, charge([], ['2026-09-03'], 0).count], [0, 0, 0])
  // طلب عن يوم مش ناقص مابيأثرش، واليوم المكرر بيتعدّ مرة
  assert.deepEqual([charge(['2026-09-03', '2026-09-03'], ['2026-09-20'], 0).count, rules.missingPunchCharge(['2026-09-03'], new Set(), 0, -5, 0.25).days[0].amount], [1, 0])
})

test('MPC-03: يوم مراجعته سببها البصمة الناقصة بس — هو اللي مابيوقّفش اعتماد المسير والخصم مفعّل', () => {
  const day = extra => ({ status: 'missing_punch', reviewRequired: true, reviewReason: rules.MISSING_PUNCH_REVIEW_REASON, ...extra })
  assert.deepEqual([day({}), day({ reviewReason: `${rules.MISSING_PUNCH_REVIEW_REASON}؛ ترتيب بصمتي الحضور والانصراف غير صالح` }), day({ status: 'present' }), day({ reviewRequired: false }),
    day({ reviewReason: null }), {}].map(rules.reviewIsMissingPunchOnly), [true, false, false, false, false, false])
  assert.ok(read('attendance/attendance-flex-calculator.ts').includes(`if (missing) issues.push('${rules.MISSING_PUNCH_REVIEW_REASON}')`), 'نص سبب المراجعة مطابق لمحرك الحضور')
})

test('MPC-04: مصدر الكود — المعامل بيدخل اللقطة لما يكون أكبر من صفر بس؛ والمبلغ جوه عمود التأخير بعد «شيل خصم» وقبل الإعفاء وحماية الصافي؛ وسطر القسيمة', () => {
  const snapshot = read('payroll/payroll-policy-snapshot.ts'), service = read('payroll/payroll.service.ts'), itemLines = read('payroll/payroll-item-lines.ts')
  assert.ok(snapshot.includes('const missingPunchPenalty = missingPunchPenaltyOf(stored.get(PAYROLL_MISSING_PUNCH_PENALTY_KEY))\n  if (missingPunchPenalty > 0) {\n    values.missingPunchPenaltyDays = missingPunchPenalty'))
  assert.ok(snapshot.includes("type OptionalPolicyValueKey = 'periodDeductionGuard' | 'missingPunchPenaltyDays' | 'missingPunchFreeCount'"))
  assert.equal(snapshot.split('Exclude<PayrollRunPolicyValueKey, OptionalPolicyValueKey>').length - 1, 3)
  assert.ok(service.includes("const missingPunch = missingPunchPenalty > 0 && !waived.has('LATENESS')"))
  assert.ok(service.includes("missingPunchCharge(attRows.filter(row => row.status === 'missing_punch').map(row => row.date), await readPunchRequestDates(em, emp.id, coverFrom, coverTo), missingPunchFree, dayRate, missingPunchPenalty)"))
  assert.equal(service.split('day.latenessAmount + day.permissionAmount + missingPunchOf(day.date)').length - 1, 3, 'المطلوب والظل والإعفاء بنفس المبلغ')
  const order = (...parts) => parts.every((part, index) => service.includes(part) && (index === 0 || service.indexOf(parts[index - 1]) < service.indexOf(part)))
  assert.ok(order('const attendanceDeductionDays = attRows.map(row => {', 'const missingPunch = missingPunchPenalty > 0', 'const latenessRequested = round2(', 'const exemption = applyFinancialExemptions(',
    'const missingPunchRequested = round2(', 'let netProtection = protectPayrollObligations(protectionInput)', 'const missingPunchSplit = missingPunch ? splitLatenessPermission(latenessSplit.lateness, missingPunchRequested) : null'))
  assert.ok(service.includes('...(missingPunchSplit ? { missingPunchDeduction: missingPunchSplit.permission } : {}),') && service.includes('...(missingPunch ? { missingPunch } : {}),'), 'التفصيل بيتكتب لما الخصم مفعّل بس')
  assert.ok(service.includes('day.reviewRequired && !(missingPunchSettled && reviewIsMissingPunchOnly(day))'), 'الاعتماد بيقف على أي مراجعة تانية، وعلى البصمة الناقصة والخصم مقفول')
  assert.ok(itemLines.includes("if (missingPunch !== null) deductions.add('MISSING_PUNCH', PAYROLL_LINE_NAMES.MISSING_PUNCH, missingPunch)") && itemLines.includes("MISSING_PUNCH: 'نسيان بصمة'"))
  const settings = read('settings/settings.controller.ts'), seed = read('seed/requests-seed.data.ts'), charge = read('payroll/missing-punch-charge.ts')
  assert.ok(settings.includes("'payroll.missing_punch.penalty_days': 0,") && settings.includes("if (dto.key === 'payroll.missing_punch.free_count') {"))
  assert.ok(seed.includes("{ key: 'payroll.missing_punch.penalty_days', value: '0' },") && seed.includes("{ key: 'payroll.missing_punch.free_count', value: '0' },"), 'الافتراضي مقفول')
  assert.ok(charge.includes("const NOT_A_REQUEST = ['DRAFT', 'REJECTED', 'CANCELLED']") && charge.includes("const CORRECTION_HANDLER = 'attendance_corrections'"))
})
