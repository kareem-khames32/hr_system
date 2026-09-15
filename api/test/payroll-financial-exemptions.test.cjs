// الخطوة 26 (C3): قواعد الإعفاء المالي النقية — مثال SRS EX-01 (كل الخصومات = 2,472.22 والنظامي باقٍ)، ونوع التأخير، ويوم غياب واحد،
// والتداخل (المحتوى والأشمل والنوع مقابل قسطه)، والسبب المكرر، ومصير الحضور والأقساط، والظل، وحد المرفق، وقروش التقريب.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.resolve(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/payroll/financial-exemptions')

const code = fn => { try { fn() } catch (error) { return error.getResponse?.().code ?? error.message } return null }
const rule = (id, target, disposition = 'DROP') => ({ id, revision: 1, ...rules.normalizeExemptionTarget(target), disposition })
// مثال مسير يونيو في SRS EX-01: تأخير 159.72 · غياب يومان × 375 = 750 · جودة 562.50 · قسط سلفة 1,000 · استقطاع نظامي 1,057.50
const juneInput = extra => ({
  attendance: { days: [{ date: '2026-06-03', lateness: 159.72, shortfall: 0 }], absentDates: ['2026-06-12', '2026-06-13'], absenceDayAmount: 375,
    requested: { lateness: 159.72, shortfall: 0, absence: 750 } },
  debits: [
    { id: 1, amount: 562.5, deductionRequestId: 10, deductionTypeId: 3, typedCategory: 'PERFORMANCE', isExemptable: true, typeName: 'خصم جودة' },
    { id: 2, amount: 1057.5, deductionRequestId: 11, deductionTypeId: 4, typedCategory: 'STATUTORY', isExemptable: false, typeName: 'استقطاع نظامي' },
  ],
  unpaidLeave: 0, ...extra,
})

test('EX-01: كل الخصومات تُصفّر التأخير والغياب والجودة وتؤجل القسط، والنظامي يبقى، والمُسقط 2,472.22', () => {
  const all = rule(7, { scopeKind: 'ALL_DEDUCTIONS' })
  const result = rules.applyFinancialExemptions({ rules: [all], ...juneInput() })
  assert.deepEqual(result.attendance, { lateness: 0, shortfall: 0, absence: 0 })
  assert.deepEqual(result.debits.map(row => row.id), [2])
  assert.deepEqual(result.lines.map(line => [line.component, line.originalAmount, line.exemptedAmount, line.afterAmount]),
    [['LATENESS', '159.72', '159.72', '0.00'], ['ABSENCE', '750.00', '750.00', '0.00'], ['TYPED', '562.50', '562.50', '0.00']])
  assert.equal(result.protectedItems.length, 1)
  assert.match(result.protectedItems[0].reason, /نظامي/)
  assert.deepEqual(result.loanScope, { allExemptionId: 7, entries: [] })
  const loanLines = rules.exemptionLoanLines([{ installmentId: 9, loanId: 5, exemptionId: 7, dueDate: '2026-06-01', remainingAmount: '1000.00', financialRevision: 1 }])
  assert.equal(loanLines[0].disposition, 'DEFER_ONE_PERIOD')
  const summary = rules.summarizeFinancialExemptions({ rules: [all], lines: [...result.lines, ...loanLines], exemptedObligations: result.exemptedObligations,
    protectedItems: result.protectedItems, deferredInstallments: [], requested: juneInput().attendance.requested })
  assert.equal(summary.totals.exempted, '2472.22')
  assert.deepEqual(summary.totals.byExemption, [{ exemptionId: 7, amount: '2472.22', lines: 4 }])
  assert.deepEqual(summary.applied, [{ id: 7, revision: 1 }])
})

test('EX-02: نوع التأخير يُصفّر 159.72 ويُبقي الغياب والجودة؛ يوم غياب واحد يُصفّر 375 ويبقي اليوم الآخر', () => {
  const lateness = rules.applyFinancialExemptions({ rules: [rule(1, { scopeKind: 'DEDUCTION_TYPE', targetKind: 'LATENESS' })], ...juneInput() })
  assert.deepEqual(lateness.attendance, { lateness: 0, shortfall: 0, absence: 750 })
  assert.deepEqual(lateness.debits.map(row => row.id), [1, 2])
  assert.equal(lateness.protectedItems.length, 0)
  const day = rules.applyFinancialExemptions({ rules: [rule(2, { scopeKind: 'SINGLE_ENTRY', targetKind: 'ABSENCE_DAY', targetRef: '2026-06-12' })], ...juneInput() })
  assert.equal(day.attendance.absence, 375)
  assert.deepEqual(day.lines.map(line => [line.ref, line.exemptedAmount]), [['2026-06-12', '375.00']])
  const typed = rules.applyFinancialExemptions({ rules: [rule(3, { scopeKind: 'DEDUCTION_TYPE', targetKind: 'TYPED', deductionTypeId: 3 }, 'DEFER_ONE_PERIOD')], ...juneInput() })
  assert.deepEqual(typed.exemptedObligations, [{ obligationId: 1, exemptionId: 3, disposition: 'DEFER_ONE_PERIOD', amount: '562.50', deductionRequestId: 10 }])
  assert.deepEqual(typed.debits.map(row => row.id), [2])
})

test('EX-02 قاعدة 5/6: المحتوى في «الكل» يُرفض، و«الكل» يحل محل الأضيق، والنوع المصنف يتداخل مع قسطه', () => {
  const all = { id: 5, ...rules.normalizeExemptionTarget({ scopeKind: 'ALL_DEDUCTIONS' }) }
  const quality = rules.normalizeExemptionTarget({ scopeKind: 'DEDUCTION_TYPE', targetKind: 'TYPED', deductionTypeId: 3 })
  assert.deepEqual(rules.exemptionOverlap(quality, [all], () => null), { containedBy: 5, overlapsWith: null, supersedes: [] })
  const lateness = { id: 6, ...rules.normalizeExemptionTarget({ scopeKind: 'DEDUCTION_TYPE', targetKind: 'LATENESS' }) }
  assert.deepEqual(rules.exemptionOverlap(rules.normalizeExemptionTarget({ scopeKind: 'ALL_DEDUCTIONS' }), [lateness], () => null).supersedes, [6])
  const obligation = rules.normalizeExemptionTarget({ scopeKind: 'SINGLE_ENTRY', targetKind: 'OBLIGATION', targetRef: '1' })
  assert.equal(rules.exemptionOverlap(obligation, [{ id: 8, ...quality }], id => (id === 1 ? 3 : null)).overlapsWith, 8)
  assert.equal(rules.exemptionOverlap(rules.normalizeExemptionTarget({ scopeKind: 'SINGLE_ENTRY', targetKind: 'ABSENCE_DAY', targetRef: '2026-06-12' }), [lateness], () => null).overlapsWith, null)
  assert.equal(rules.exemptionOverlap(rules.normalizeExemptionTarget({ scopeKind: 'SINGLE_ENTRY', targetKind: 'LATENESS_DAY', targetRef: '2026-06-03' }), [lateness], () => null).overlapsWith, 6)
})

test('EX-03/08: السبب المكرر يُرفض، والحضور لا يُؤجل، والأقساط تُؤجل دائمًا، والهدف غير المتسق يُرفض', () => {
  assert.equal(rules.exemptionReasonIssue('موافقة موافقة موافقة موافقة', 20).code, 'EXEMPTION_REASON_REPETITIVE')
  assert.equal(rules.exemptionReasonIssue('قصير', 20).code, 'EXEMPTION_REASON_TOO_SHORT')
  assert.equal(rules.exemptionReasonIssue('عطل حافلة الشركة أيام 5 إلى 7 بمحضر رسمي', 20), null)
  const absence = rules.normalizeExemptionTarget({ scopeKind: 'DEDUCTION_TYPE', targetKind: 'ABSENCE' })
  assert.equal(code(() => rules.normalizeExemptionDisposition(absence, 'DEFER_ONE_PERIOD')), 'EXEMPTION_ATTENDANCE_NO_DEFER')
  assert.deepEqual(rules.normalizeExemptionDisposition(rules.normalizeExemptionTarget({ scopeKind: 'SINGLE_ENTRY', targetKind: 'LOAN_INSTALLMENT', targetRef: '9' }), 'DROP'),
    { disposition: 'DEFER_ONE_PERIOD', forcedLoanDeferral: true })
  assert.equal(rules.normalizeExemptionDisposition(rules.normalizeExemptionTarget({ scopeKind: 'DEDUCTION_TYPE', targetKind: 'TYPED', deductionTypeId: 3 }), undefined).disposition, 'DROP')
  assert.equal(code(() => rules.normalizeExemptionTarget({ scopeKind: 'ALL_DEDUCTIONS', targetKind: 'LATENESS' })), 'EXEMPTION_TARGET_INVALID')
  assert.equal(code(() => rules.normalizeExemptionTarget({ scopeKind: 'SINGLE_ENTRY', targetKind: 'ABSENCE_DAY', targetRef: '2026-02-30' })), 'EXEMPTION_TARGET_INVALID')
  assert.equal(code(() => rules.normalizeExemptionTarget({ scopeKind: 'DEDUCTION_TYPE', targetKind: 'TYPED' })), 'EXEMPTION_TARGET_INVALID')
  assert.equal(rules.exemptionTargetLabel(rules.normalizeExemptionTarget({ scopeKind: 'SINGLE_ENTRY', targetKind: 'ABSENCE_DAY', targetRef: '2026-06-12' })), 'غياب يوم 2026-06-12')
})

test('الاستردادات غير المصنفة والإجازة بلا أجر لا يشملها «الكل»، وبلا إعفاء تمر القيود بترتيبها', () => {
  const debits = [{ id: 30, amount: 100, deductionRequestId: null, label: 'عجز عهدة' }, { id: 4, amount: 50, deductionRequestId: 9, deductionTypeId: 1, typedCategory: 'DISCIPLINARY', isExemptable: true }]
  const none = rules.applyFinancialExemptions({ rules: [], attendance: juneInput().attendance, debits, unpaidLeave: 200 })
  assert.deepEqual(none.debits.map(row => row.id), [30, 4])
  assert.equal(none.lines.length, 0)
  const all = rules.applyFinancialExemptions({ rules: [rule(1, { scopeKind: 'ALL_DEDUCTIONS' })], attendance: juneInput().attendance, debits, unpaidLeave: 200 })
  assert.deepEqual(all.debits.map(row => row.id), [30])
  assert.deepEqual(all.protectedItems.map(row => row.component).sort(), ['RECOVERY', 'UNPAID_LEAVE'])
})

test('قروش التقريب: مجموع الأيام المُعفاة = المطلوب − الباقي، وظل المحرك يُطرح بالتاريخ نفسه، وحد المرفق يوم راتب', () => {
  const attendance = { days: [{ date: '2026-06-01', lateness: 0.335, shortfall: 0 }, { date: '2026-06-02', lateness: 0.335, shortfall: 0 }, { date: '2026-06-03', lateness: 0.335, shortfall: 0 }],
    absentDates: [], absenceDayAmount: 0, requested: { lateness: 1.01, shortfall: 0, absence: 0 } }
  const result = rules.applyFinancialExemptions({ rules: [rule(1, { scopeKind: 'SINGLE_ENTRY', targetKind: 'LATENESS_DAY', targetRef: '2026-06-02' })], attendance, debits: [], unpaidLeave: 0 })
  assert.equal(result.attendance.lateness, 0.67)
  assert.equal(result.lines[0].exemptedAmount, '0.34')
  const shadowDays = attendance.days.map(day => ({ date: day.date, policy: { lateness: '0.335000', shortfall: '0.000000', absence: '0.000000' } }))
  assert.deepEqual(rules.exemptPolicyShadowTotals({ lateness: '1.01', shortfall: '0.00', absence: '0.00' }, shadowDays, [rule(1, { scopeKind: 'SINGLE_ENTRY', targetKind: 'LATENESS_DAY', targetRef: '2026-06-02' })]),
    { lateness: '0.67', shortfall: '0.00', absence: '0.00' })
  assert.deepEqual(rules.exemptPolicyShadowTotals({ lateness: '1.01', shortfall: '2.00', absence: '0.00' }, shadowDays, [rule(2, { scopeKind: 'DEDUCTION_TYPE', targetKind: 'LATENESS' })]),
    { lateness: '0.00', shortfall: '2.00', absence: '0.00' })
  assert.equal(rules.exemptionAttachmentThreshold(375, 1), '375.00')
  assert.equal(rules.exemptionNeedsAttachment('750.00', 375, 1, null), true)
  assert.equal(rules.exemptionNeedsAttachment('750.00', 375, 1, 'محضر HR-2026-77'), false)
  assert.equal(rules.exemptionNeedsAttachment('375.00', 375, 1, null), false)
})

test('إعدادات financial_exemptions.* بحدودها ونفس البذرة', () => {
  assert.equal(rules.exemptionSettingError('financial_exemptions.reason_min_length', '0') !== null, true)
  assert.equal(rules.exemptionSettingError('financial_exemptions.max_pct_per_grantor', '20'), null)
  assert.equal(rules.exemptionSettingError('financial_exemptions.department_manager_enabled', 'maybe') !== null, true)
  assert.equal(rules.exemptionSettingError('deductions.reason_min_length', 'x'), null)
  assert.equal(rules.exemptionNumericSetting('financial_exemptions.cooldown_hours', '9999'), 720)
  assert.deepEqual(rules.EXEMPTION_CONFIG_SEED.find(row => row.key === 'financial_exemptions.max_per_employee_year'), { key: 'financial_exemptions.max_per_employee_year', value: '4' })
})
