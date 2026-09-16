'use strict'
// مراجعة 16 سبتمبر (مجموعة الرواتب): يوم الإيقاف يتخصم مرة واحدة، سقف الإيقاف بيحسب المرضية وبدون راتب،
// والمسير المحسوب قبل قرار القص يفضل يتعتمد ويتصرف. اختبارات صرفة + نقاط الربط في المسير.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('reflect-metadata')
const { payrollSuspensionDaysWithinCap } = require('../src/payroll/payroll.service')
const { overtimeTraceMatchesStoredTotals } = require('../src/payroll/overtime-financial')
const { sickLeaveDaysInCover, sickLeaveDeduction } = require('../src/payroll/sick-leave-pay')
const { suspensionPayrollDays } = require('../src/employees/employee-suspension-rules')
const { PayrollDecimal } = require('../src/payroll/payroll-decimal')

/** نفس خطوات المسير: المرضية (بلا أيام الإيقاف) ← سقف الإيقاف ← عمود الإجازة بلا أجر. */
function leaveColumn({ coverFrom, coverTo, gross, sickLeaves, tiers, suspensions, unpaidDays = 0, paidDays = 30 }) {
  const grossCents = Math.round(gross * 100)
  const suspension = suspensionPayrollDays(suspensions, coverFrom, coverTo, [], () => true)
  const sick = sickLeaveDeduction(sickLeaveDaysInCover({ leaves: sickLeaves, tiersByCode: new Map([['SICK', tiers]]), coverFrom, coverTo,
    deductible: date => !suspension.dates.includes(date) }), grossCents, 30)
  const days = payrollSuspensionDaysWithinCap(suspension.days, paidDays, unpaidDays, sick.equivalentDays)
  const total = unpaidDays + days
  const deduction = Number(PayrollDecimal.from(String(total)).add(PayrollDecimal.from(sick.equivalentDays))
    .multiply(new PayrollDecimal(BigInt(grossCents), 3000n)).format(2, 'DOWN'))
  return { suspensionDays: days, sickEquivalent: sick.equivalentDays, deduction, net: Math.round((gross - deduction) * 100) / 100 }
}

test('سقف الإيقاف بيطرح أيام المرضية المخصومة: 3 أيام مرضية بلا أجر + 28 إيقاف في دورة 31 يوم = صافي صفر مش سالب', () => {
  const result = leaveColumn({ coverFrom: '2026-07-23', coverTo: '2026-08-22', gross: 10000,
    sickLeaves: [{ id: 1, leaveTypeCode: 'SICK', fromDate: '2026-07-23', toDate: '2026-07-25', isUnpaid: false, status: 'APPROVED' }],
    tiers: [{ fromDay: 1, toDay: null, payPercent: 0 }],
    suspensions: [{ id: 5, fromDate: '2026-07-26', toDate: '2026-08-22', status: 'ACTIVE' }] })
  assert.equal(result.sickEquivalent, '3')
  assert.equal(result.suspensionDays, 27, 'السقف 30 − 3 مرضية')
  assert.equal(result.deduction, 10000)
  assert.equal(result.net, 0)
})

test('سقف الإيقاف مع يوم مرضي بنسبة 75%: 30 يوم إيقاف تبقى 29.75 والصافي صفر', () => {
  const result = leaveColumn({ coverFrom: '2026-07-23', coverTo: '2026-08-22', gross: 10000,
    sickLeaves: [{ id: 1, leaveTypeCode: 'SICK', fromDate: '2026-07-23', toDate: '2026-07-23', isUnpaid: false, status: 'APPROVED' }],
    tiers: [{ fromDay: 1, toDay: null, payPercent: 75 }],
    suspensions: [{ id: 5, fromDate: '2026-07-24', toDate: '2026-08-22', status: 'ACTIVE' }] })
  assert.equal(result.sickEquivalent, '0.25')
  assert.equal(result.suspensionDays, 29.75)
  assert.equal(result.deduction, 10000)
  assert.equal(result.net, 0)
})

test('السقف: بلا مرضية زي ما كان، ومنزلتين مقصوصتين، وما ينزلش تحت الصفر، وبدون راتب بيتطرح', () => {
  assert.equal(payrollSuspensionDaysWithinCap(31, 30, 0, '0'), 30, 'دورة 31 يوم موقوفة كلها = 30')
  assert.equal(payrollSuspensionDaysWithinCap(10, 30, 0, '0'), 10, 'تحت السقف ما يتغيرش')
  assert.equal(payrollSuspensionDaysWithinCap(30, 30, 2, '0.3333'), 27.66, 'قص مش تقريب فالمجموع ما يعديش 30')
  assert.ok(2 + 27.66 + 0.3333 <= 30)
  assert.equal(payrollSuspensionDaysWithinCap(5, 30, 29.5, '1'), 0, 'اللي اتخصم أصلًا عدّى السقف')
  assert.equal(payrollSuspensionDaysWithinCap(12, 10, 0, '0'), 10, 'تغطية جزئية: السقف أيام التغطية')
  assert.equal(payrollSuspensionDaysWithinCap(4.5, 30, 1.5, ''), 4.5)
})

test('يوم الإيقاف ما يتخصمش تأخير أو نقص أو غياب من صف حضوره، والاعتماد والظل بيستبعدوه بنفس الطريقة', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/payroll/payroll.service.ts'), 'utf8')
  const readAt = source.indexOf('const suspension = await readSuspensionPayrollDays(')
  const attAt = source.indexOf('const attRows = (await em.getRepository(AttendanceDay).find(')
  assert.ok(readAt > 0 && attAt > readAt, 'الإيقاف يتقري قبل صفوف الحضور')
  assert.match(source, /\.filter\(row => !policyOnDate\(row\.date\)\.isExempt && !suspendedDates\.has\(row\.date\)\)/)
  assert.match(source, /const absentRows = attRows\.filter/, 'الغياب والتأخير والنقص كلهم من attRows المفلترة')
  assert.match(source, /suspendedDates: suspension\.dates,/, 'الظل بياخد أيام الإيقاف')
  assert.match(source, /suspended\.has\(day\.date\) \|\| exemptionPolicyOnDate\(exemptions, day\.date/, 'مقارنة الحضور عند الاعتماد بتتخطى يوم الإيقاف')
  const sickAt = source.indexOf('const sick = sickLeaveDeduction(')
  const capAt = source.indexOf('payrollSuspensionDaysWithinCap(suspension.days')
  assert.ok(sickAt > 0 && capAt > sickAt, 'المرضية قبل السقف')
  assert.match(source, /!overtimeTraceMatchesStoredTotals\(breakdown\.overtime, Number\(item\.overtimeAmount\), Number\(item\.overtimeHours\)\)/)
})

test('إجمالي الإضافي المحفوظ: القص الحالي والتقريب القديم مقبولين، والرقم الغلط مرفوض', () => {
  // 100 دقيقة معتمدة: 1.6666… اتحفظت 1.67 بالتقريب القديم وبتتحسب 1.66 بالقص
  const hours = 100 / 60
  // أجر 5500: ساعة × 1.5 = 34.375 اتحفظت 34.38 قديمًا و34.37 بالقص
  const amount = 1 * 1.5 * (5500 / 30 / 8)
  const rows = [{ amount, hours }]
  assert.equal(overtimeTraceMatchesStoredTotals(rows, 34.37, 1.66), true, 'مسير جديد بالقص')
  assert.equal(overtimeTraceMatchesStoredTotals(rows, 34.38, 1.67), true, 'مسير قديم بالتقريب نصف لأعلى')
  assert.equal(overtimeTraceMatchesStoredTotals(rows, 34.36, 1.66), false)
  assert.equal(overtimeTraceMatchesStoredTotals(rows, 34.37, 1.65), false)
  assert.equal(overtimeTraceMatchesStoredTotals([{ amount: 40, hours: 0.5 }, { amount: 35, hours: 1.5 }], 75, 2), true)
  assert.equal(overtimeTraceMatchesStoredTotals([], 0, 0), true)
})
