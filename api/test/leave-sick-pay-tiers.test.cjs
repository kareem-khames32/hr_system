// أجر الإجازة المرضية المتدرج (قرار المالك 16 سبتمبر) وقواعد مرفق «بعد الرجوع» — حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const sick = require('../src/payroll/sick-leave-pay')
const rules = require('../src/requests/leave-attachment-rules')

const tiers = new Map([['SICK', sick.parseSickPayTiers(null)]])
const leave = (id, fromDate, toDate, extra = {}) => ({ id, leaveTypeCode: 'SICK', fromDate, toDate, period: 'FULL', isUnpaid: false, status: 'APPROVED', ...extra })

test('tiers: default 1-30 = 100%, 31-90 = 75%, 91+ = 0%; invalid JSON falls back to the default; a gap pays in full', () => {
  assert.deepEqual(sick.parseSickPayTiers(''), [{ fromDay: 1, toDay: 30, payPercent: 100 }, { fromDay: 31, toDay: 90, payPercent: 75 }, { fromDay: 91, toDay: null, payPercent: 0 }])
  assert.deepEqual(sick.parseSickPayTiers('not json'), sick.parseSickPayTiers(null))
  assert.deepEqual(sick.parseSickPayTiers('[{"fromDay":5,"toDay":2,"payPercent":50}]'), sick.parseSickPayTiers(null))
  const custom = sick.parseSickPayTiers('[{"fromDay":11,"toDay":null,"payPercent":50},{"fromDay":1,"toDay":5,"payPercent":100}]')
  assert.deepEqual(custom.map(t => t.fromDay), [1, 11], 'sorted by fromDay')
  const defaults = sick.parseSickPayTiers(null)
  assert.deepEqual([1, 30, 31, 90, 91, 400].map(day => sick.sickPayPercentForDay(defaults, day)), [100, 100, 75, 75, 0, 0])
  assert.equal(sick.sickPayPercentForDay(custom, 7), 100, 'a day outside every tier is fully paid')
})

test('cumulative position counts every prior sick day of the same calendar year; only days inside the cover are returned', () => {
  // 30 يومًا في يناير (1-30) ثم يونيو 1-10 = الأيام 31-40 بـ75%، ثم 15-16 يونيو مسجلة بدون راتب = 41-42 لا تُخصم هنا
  const days = sick.sickLeaveDaysInCover({ leaves: [leave(3, '2026-06-15', '2026-06-16', { isUnpaid: true }), leave(2, '2026-06-01', '2026-06-10'), leave(1, '2026-01-05', '2026-02-03')],
    tiersByCode: tiers, coverFrom: '2026-06-01', coverTo: '2026-06-30' })
  assert.equal(days.length, 12)
  assert.deepEqual(days.map(d => d.dayNumber), [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42])
  assert.deepEqual([...new Set(days.slice(0, 10).map(d => d.status))], ['DEDUCTED'])
  assert.deepEqual(days.slice(10).map(d => d.status), ['UNPAID', 'UNPAID'], 'an isUnpaid day is counted in the position but never charged twice')
  const result = sick.sickLeaveDeduction(days, 900000, 30)
  assert.equal(result.equivalentDays, '2.5')
  assert.equal(result.amount, 750, '10 days × 300 × 25%')
  assert.deepEqual(result.lines, [{ payPercent: 75, days: 10, amount: 750, label: 'خصم إجازة مرضية (بنسبة أجر 75%)' }])
})

test('crossing into 91+ splits into one line per pay percent; a new year restarts the count; fully paid days add nothing', () => {
  const days = sick.sickLeaveDaysInCover({ leaves: [leave(1, '2026-01-01', '2026-03-29'), leave(2, '2026-06-01', '2026-06-04')],
    tiersByCode: tiers, coverFrom: '2026-06-01', coverTo: '2026-06-30' })
  assert.deepEqual(days.map(d => [d.dayNumber, d.payPercent]), [[89, 75], [90, 75], [91, 0], [92, 0]])
  const result = sick.sickLeaveDeduction(days, 900000, 30)
  assert.equal(result.amount, 750)
  assert.deepEqual(result.lines.map(l => [l.label, l.days, l.amount]), [['خصم إجازة مرضية (بنسبة أجر 75%)', 2, 150], ['خصم إجازة مرضية (بنسبة أجر 0%)', 2, 600]])
  const nextYear = sick.sickLeaveDaysInCover({ leaves: [leave(1, '2025-06-01', '2025-12-31'), leave(2, '2026-01-01', '2026-01-03')],
    tiersByCode: tiers, coverFrom: '2026-01-01', coverTo: '2026-01-31' })
  assert.deepEqual(nextYear.map(d => [d.dayNumber, d.status]), [[1, 'NONE'], [2, 'NONE'], [3, 'NONE']])
  assert.equal(sick.sickLeaveDeduction(nextYear, 900000, 30).amount, 0)
  assert.deepEqual(sick.sickLeaveDeduction(nextYear, 900000, 30).lines, [])
})

test('half days count as halves; exempt days are not charged; cancelled leaves are ignored', () => {
  const days = sick.sickLeaveDaysInCover({ leaves: [leave(1, '2026-01-01', '2026-01-30'), leave(9, '2026-02-01', '2026-02-20', { status: 'CANCELLED' }),
    leave(2, '2026-06-01', '2026-06-01', { period: 'MORNING' }), leave(3, '2026-06-02', '2026-06-02', { period: 'EVENING' }), leave(4, '2026-06-03', '2026-06-03')],
  tiersByCode: tiers, coverFrom: '2026-06-01', coverTo: '2026-06-30', deductible: date => date !== '2026-06-03' })
  assert.deepEqual(days.map(d => [d.dayNumber, d.fraction, d.status]), [[31, 0.5, 'DEDUCTED'], [31, 0.5, 'DEDUCTED'], [32, 1, 'EXEMPT']])
  const result = sick.sickLeaveDeduction(days, 1000000, 30) // يوم = 333.333…
  assert.equal(result.equivalentDays, '0.25')
  assert.equal(result.amount, 83.33)
  assert.equal(result.exemptDays, 1)
})

test('leave deduction lines always sum to the paid unpaid-leave column', () => {
  const lines = sick.payrollLeaveDeductionLines(1350, 600, 2, [{ payPercent: 75, days: 10, amount: 750, label: 'خصم إجازة مرضية (بنسبة أجر 75%)' }])
  assert.deepEqual(lines.lines, [
    { code: 'UNPAID_LEAVE', label: 'إجازة بدون راتب', days: 2, payPercent: 0, amount: 600 },
    { code: 'SICK_LEAVE_75', label: 'خصم إجازة مرضية (بنسبة أجر 75%)', days: 10, payPercent: 75, amount: 750 },
  ])
  // تقريب المجموع (عمود 100.01) يقع على آخر سطر مرضي
  const rounded = sick.payrollLeaveDeductionLines(100.01, 33.33, 1, [{ payPercent: 75, days: 1, amount: 33.33, label: 'a' }, { payPercent: 50, days: 1, amount: 33.34, label: 'b' }])
  assert.equal(rounded.lines.reduce((sum, line) => sum + Math.round(line.amount * 100), 0), 10001)
  assert.equal(rounded.sickAmount, 66.68)
  assert.deepEqual(sick.payrollLeaveDeductionLines(0, 0, 0, []).lines, [])
})

test('attachment after return: PENDING until toDate + deadline only when the rule requires it; the due day itself is not overdue', () => {
  const afterReturn = { attachmentTiming: 'AFTER_RETURN', attachmentRule: 'REQUIRED', attachmentDeadlineDays: 7 }
  assert.deepEqual(rules.initialLeaveAttachment(afterReturn, { toDate: '2026-06-28', days: 3 }), { attachmentStatus: 'PENDING', attachmentDueDate: '2026-07-05', attachmentRef: null })
  assert.deepEqual(rules.initialLeaveAttachment(afterReturn, { toDate: '2026-06-28', days: 3 }, 'file:12'), { attachmentStatus: 'UPLOADED', attachmentDueDate: '2026-07-05', attachmentRef: 'file:12' })
  assert.equal(rules.initialLeaveAttachment({ ...afterReturn, attachmentTiming: 'WITH_REQUEST' }, { toDate: '2026-06-28', days: 3 }), null)
  assert.equal(rules.initialLeaveAttachment({ ...afterReturn, attachmentRule: 'OPTIONAL' }, { toDate: '2026-06-28', days: 3 }), null)
  const above = { ...afterReturn, attachmentRule: 'REQUIRED_ABOVE_DAYS', attachmentAboveDays: 2 }
  assert.equal(rules.initialLeaveAttachment(above, { toDate: '2026-06-28', days: 2 }), null)
  assert.equal(rules.initialLeaveAttachment(above, { toDate: '2026-12-28', days: 3 }).attachmentDueDate, '2027-01-04')
  assert.equal(rules.initialLeaveAttachment({ ...afterReturn, attachmentDeadlineDays: null }, { toDate: '2026-06-28', days: 1 }).attachmentDueDate, '2026-07-05')
  // مرفق جاء مع الطلب: يُسجَّل على سجل الإجازة في نفس الحقل بلا موعد تسليم (لا مهلة ولا تحويل بدون راتب)
  const withRequest = { ...afterReturn, attachmentTiming: 'WITH_REQUEST' }
  assert.deepEqual(rules.initialLeaveAttachment(withRequest, { toDate: '2026-06-28', days: 3 }, 'file:12'),
    { attachmentStatus: 'UPLOADED', attachmentDueDate: null, attachmentRef: 'file:12' })
  assert.deepEqual(rules.initialLeaveAttachment({ ...withRequest, attachmentRule: 'OPTIONAL' }, { toDate: '2026-06-28', days: 1 }, 'file:13'),
    { attachmentStatus: 'UPLOADED', attachmentDueDate: null, attachmentRef: 'file:13' })
  assert.deepEqual(rules.initialLeaveAttachment({ ...withRequest, attachmentRule: 'NONE' }, { toDate: '2026-06-28', days: 1 }, '  file:14  '),
    { attachmentStatus: 'UPLOADED', attachmentDueDate: null, attachmentRef: 'file:14' })
  assert.equal(rules.initialLeaveAttachment(withRequest, { toDate: '2026-06-28', days: 3 }, '   '), null)
  assert.equal(rules.initialLeaveAttachment(null, { toDate: '2026-06-28', days: 3 }, 'file:15').attachmentRef, 'file:15')
  assert.equal(rules.leaveAttachmentOverdue('2026-07-05', '2026-07-05'), false)
  assert.equal(rules.leaveAttachmentOverdue('2026-07-05', '2026-07-06'), true)
  assert.equal(rules.leaveAttachmentOverdue(null, '2026-07-06'), false)
})
