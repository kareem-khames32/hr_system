// C2 / الخطوة 25: قواعد الخصومات المصنفة النقية (DD-01/02/03/06/10) وحماية الصافي (DD-11) بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const repoRoot = path.resolve(__dirname, '..', '..')
const readSource = file => fs.readFileSync(path.join(repoRoot, file), 'utf8')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/payroll/typed-deductions')
const { protectPayrollObligations } = require('../src/payroll/payroll-obligation-protection')

const salary = (gross, basic = gross, extra = {}) => ({ basic: String(basic), gross: String(gross), monthlyDays: '30', dailyHours: '8', source: 'test', ...extra })
function code(fn) {
  try { fn() } catch (error) { return error.getResponse ? error.getResponse().code : error.message }
  return null
}
function body(fn) {
  try { fn() } catch (error) { return error.getResponse ? error.getResponse() : { message: error.message } }
  return null
}
const type = (overrides = {}) => rules.normalizeDeductionTypeRules({ code: 'COMMITMENT', nameAr: 'خصم التزام', category: 'DISCIPLINARY', calcMethod: 'DAYS_OF_SALARY',
  creatorScopes: ['DIRECT_MANAGER', 'TEAM_LEADER', 'DEPARTMENT_MANAGER', 'HR'], ...overrides })

test('DD-01: catalog defaults, HR last in the chain, court orders never exemptable, code immutable', () => {
  const commitment = type({ approvalSteps: ['HR', 'DEPARTMENT_MANAGER'] })
  assert.deepEqual(commitment.approvalSteps, ['DEPARTMENT_MANAGER', 'HR'])
  assert.equal(commitment.valueStep, '0.25')
  assert.equal(commitment.minAmount, '1')
  assert.equal(commitment.maxPctOfGross, '25')
  assert.equal(commitment.escalationDays, '1')
  assert.equal(commitment.escalationStep, 'DEPARTMENT_MANAGER')
  assert.equal(commitment.maxInstallments, 1, 'installments are off unless allowed')
  assert.equal(code(() => type({ code: 'COURT', category: 'COURT_ORDER', isExemptable: true })), 'DEDUCTION_TYPE_NOT_EXEMPTABLE')
  assert.equal(type({ code: 'STAT', category: 'STATUTORY' }).isExemptable, false)
  const court = type({ code: 'COURT', category: 'COURT_ORDER' })
  assert.equal(code(() => rules.normalizeDeductionTypeRules({ isExemptable: true }, court)), 'DEDUCTION_TYPE_NOT_EXEMPTABLE', 'editing is_exemptable of a court order is rejected')
  assert.equal(code(() => rules.normalizeDeductionTypeRules({ code: 'OTHER' }, commitment)), 'DEDUCTION_TYPE_CODE_IMMUTABLE')
  assert.equal(code(() => type({ code: 'bad code' })), 'DEDUCTION_TYPE_INVALID')
  const renamed = rules.normalizeDeductionTypeRules({ nameAr: 'خصم التزام بالدوام' }, commitment)
  assert.equal(rules.deductionTypeFinancialChanged(commitment, renamed), false, 'a label change keeps the version')
  const capped = rules.normalizeDeductionTypeRules({ maxPctOfGross: '10' }, commitment)
  assert.equal(rules.deductionTypeFinancialChanged(commitment, capped), true, 'a cap change bumps the version')
  const fromRow = rules.deductionTypeRulesFromRow({ ...rules.deductionTypeColumns(commitment), minAmount: 1, maxPctOfGross: 25, valueStep: 0.25, escalationDays: 1, defaultValue: null, maxAmount: null })
  assert.deepEqual(fromRow, commitment, 'decimal columns read back as numbers normalize to the same rules')
})

test('DD-02: SRS example — 1.5 days = 562.50 at a 375.00 day rate, 5% of base = 450.00, and the 25% cap rejects with its limit', () => {
  const days = rules.computeDeductionAmount(type(), '1.5', salary('11250.00', '9000.00'))
  assert.equal(days.amount, '562.50')
  assert.equal(days.dayRate, '375.000000')
  assert.equal(days.formula, '1.5 يوم × 375.00 = 562.50')
  const admin = rules.computeDeductionAmount(type({ code: 'ADMIN', calcMethod: 'PERCENT_OF_BASE' }), '5', salary('11250.00', '9000.00'))
  assert.equal(admin.amount, '450.00')
  const over = body(() => rules.computeDeductionAmount(type({ code: 'FIX', calcMethod: 'FIXED_AMOUNT' }), '3000', salary('11750.00', '9000.00')))
  assert.equal(over.code, 'DEDUCTION_ABOVE_PCT_OF_GROSS')
  assert.equal(over.limit, '2937.50')
  assert.match(over.message, /2937\.50/)
  assert.equal(rules.computeDeductionAmount(type({ code: 'FIX', calcMethod: 'FIXED_AMOUNT' }), '2937.50', salary('11750.00', '9000.00')).amount, '2937.50')
})

test('DD-02: the 0.25 step rejects 0.3 and accepts 0.75; zero, below-minimum and missing salary are rejected', () => {
  assert.equal(code(() => rules.computeDeductionAmount(type(), '0.3', salary('9000.00'))), 'DEDUCTION_STEP_INVALID')
  assert.equal(rules.computeDeductionAmount(type(), '0.75', salary('9000.00')).amount, '225.00')
  assert.equal(code(() => rules.computeDeductionAmount(type(), '0', salary('9000.00'))), 'DEDUCTION_VALUE_INVALID')
  assert.equal(code(() => rules.computeDeductionAmount(type({ calcMethod: 'FIXED_AMOUNT', minAmount: '50' }), '10', salary('9000.00'))), 'DEDUCTION_BELOW_MIN')
  assert.equal(code(() => rules.computeDeductionAmount(type({ calcMethod: 'FIXED_AMOUNT', maxAmount: '100', maxPctOfGross: null }), '150', salary('9000.00'))), 'DEDUCTION_ABOVE_MAX')
  assert.equal(code(() => rules.computeDeductionAmount(type(), '1', salary('0.00'))), 'DEDUCTION_NO_SALARY')
  assert.equal(rules.computeDeductionAmount(type({ calcMethod: 'HOURS_OF_SALARY' }), '2', salary('9600.00')).amount, '80.00', '9600/30/8 = 40 per hour')
  assert.equal(rules.computeDeductionAmount(type({ calcMethod: 'PERCENT_OF_GROSS' }), '2.5', salary('10000.00')).amount, '250.00')
})

test('DD-03: a deduction above one day of salary escalates; exactly one day does not', () => {
  const one = rules.computeDeductionAmount(type(), '1', salary('9000.00'))
  assert.equal(one.escalationThreshold, '300.00')
  assert.equal(one.escalated, false)
  assert.equal(rules.computeDeductionAmount(type(), '2', salary('9000.00')).escalated, true)
  assert.equal(rules.computeDeductionAmount(type({ escalationDays: null }), '2', salary('9000.00')).escalated, false)
})

test('DD-06: chain snapshot — escalation step before HR, creator and target skipped with a recorded reason, HR always pending', () => {
  const approvers = { DIRECT_MANAGER: 50, TEAM_LEADER: 50, DEPARTMENT_MANAGER: 60, BRANCH_MANAGER: 70 }
  const plain = rules.buildDeductionChain({ approvalSteps: ['HR'], escalated: false, escalationStep: 'DEPARTMENT_MANAGER', creatorEmployeeId: 50, employeeId: 10, approvers })
  assert.deepEqual(plain.map(step => [step.role, step.status]), [['HR', 'PENDING']])
  const escalated = rules.buildDeductionChain({ approvalSteps: ['HR'], escalated: true, escalationStep: 'DEPARTMENT_MANAGER', creatorEmployeeId: 50, employeeId: 10, approvers })
  assert.deepEqual(escalated.map(step => [step.role, step.status, step.escalation]), [['DEPARTMENT_MANAGER', 'PENDING', true], ['HR', 'PENDING', false]])
  assert.equal(escalated[0].approverEmployeeId, 60)
  const byDepartmentManager = rules.buildDeductionChain({ approvalSteps: ['DEPARTMENT_MANAGER', 'HR'], escalated: true, escalationStep: 'DEPARTMENT_MANAGER', creatorEmployeeId: 60, employeeId: 10, approvers })
  assert.deepEqual(byDepartmentManager.map(step => [step.role, step.status]), [['DEPARTMENT_MANAGER', 'SKIPPED'], ['HR', 'PENDING']])
  assert.equal(byDepartmentManager[0].note, 'تُخطّي: المعتمِد هو المُنزِّل')
  const noManager = rules.buildDeductionChain({ approvalSteps: ['DIRECT_MANAGER', 'TEAM_LEADER', 'HR'], escalated: false, escalationStep: null, creatorEmployeeId: 1, employeeId: 10, approvers: { DIRECT_MANAGER: 50, TEAM_LEADER: 50 } })
  assert.deepEqual(noManager.map(step => step.status), ['PENDING', 'SKIPPED', 'PENDING'], 'the same person does not approve twice')
  assert.equal(rules.currentDeductionStep(noManager).role, 'DIRECT_MANAGER')
  assert.deepEqual(rules.parseDeductionSteps(JSON.stringify(noManager)), noManager)
  assert.equal(code(() => rules.parseDeductionSteps('[]')), 'DEDUCTION_CHAIN_INVALID')
})

test('DD-10 and periods: 1000 over 3 installments sums exactly; payroll month of a date follows cycle day 23', () => {
  assert.deepEqual(rules.splitDeductionInstallments('1000', 3), ['333.33', '333.33', '333.34'])
  assert.deepEqual(rules.splitDeductionInstallments('562.50', 1), ['562.50'])
  assert.equal(code(() => rules.splitDeductionInstallments('0.02', 3)), 'DEDUCTION_INSTALLMENT_TOO_SMALL')
  assert.equal(rules.payrollPeriodForDate('2026-09-22', 23), '2026-09')
  assert.equal(rules.payrollPeriodForDate('2026-09-23', 23), '2026-10')
  assert.equal(rules.payrollPeriodForDate('2026-09-30', 1), '2026-09')
  assert.equal(rules.addPayrollMonths('2026-12', 1), '2027-01')
  assert.equal(rules.addPayrollMonths('2026-10', 14), '2027-12')
  assert.equal(code(() => rules.deductionPeriod('2026-13')), 'DEDUCTION_PERIOD_INVALID')
  assert.equal(rules.deductionPreviewHash({ b: 1, a: [{ y: 2, x: 1 }] }), rules.deductionPreviewHash({ a: [{ x: 1, y: 2 }], b: 1 }))
})

const noLimits = { minNetGuarantee: null, netFloorPct: null, maxDeductionPctOfGross: null }
const debit = (id, amount, extra = {}) => ({ id, amount, category: 'typed_deduction', deductionRequestId: id, effectiveDate: '2026-08-23', ...extra })

test('DD-11: with no floor or cap, deductions stop at zero net; the excess typed deduction is carried, attendance excess is dropped', () => {
  const result = protectPayrollObligations({ earnedFixedGross: 3000, overtime: 0, unpaidLeave: 0, attendance: { lateness: 200, shortfall: 50, absence: 300 },
    credits: [], debits: [debit(7, 2000), debit(3, 800, { category: 'custody_shortfall', deductionRequestId: null, effectiveDate: null })], settings: noLimits })
  assert.deepEqual(result.attendance, { lateness: 200, shortfall: 50, absence: 300 })
  assert.equal(result.otherDeductions, 2450)
  assert.deepEqual(result.lines.map(line => [line.id, line.collected, line.carried]), [[3, 800, 0], [7, 1650, 350]], 'recoveries are collected before typed deductions')
  assert.deepEqual(result.consumedObligationIds, [3, 7])
  const dropped = protectPayrollObligations({ earnedFixedGross: 1000, overtime: 0, unpaidLeave: 600, attendance: { lateness: 100, shortfall: 100, absence: 400 },
    credits: [], debits: [debit(9, 100)], settings: noLimits })
  assert.deepEqual(dropped.attendance, { lateness: 0, shortfall: 0, absence: 400 }, 'shortfall then lateness drop first')
  assert.equal(dropped.otherDeductions, 0)
  assert.deepEqual(dropped.consumedObligationIds, [], 'an uncollected deduction is not consumed')
  assert.equal(dropped.lines[0].carried, 100)
  assert.ok(dropped.trace.warnings.some(item => item.code === 'ATTENDANCE_EXCESS_DROPPED'))
})

test('DD-11: SRS cap example — 50% of 11,750 with 750 attendance leaves 5,125 for ledger debits; credits are consumed in full', () => {
  const result = protectPayrollObligations({ earnedFixedGross: 11750, overtime: 0, unpaidLeave: 0, attendance: { lateness: 750, shortfall: 0, absence: 0 },
    credits: [{ id: 1, amount: 500, category: 'bonus', deductionRequestId: null, effectiveDate: null }],
    debits: [debit(4, 562.5), debit(5, 450), debit(6, 5000)], settings: { minNetGuarantee: null, netFloorPct: null, maxDeductionPctOfGross: '50' } })
  assert.equal(result.trace.cap, '5875.000000')
  assert.equal(result.trace.debitCapacity, '5125.00')
  assert.deepEqual(result.lines.map(line => [line.type, line.id, line.collected, line.carried]), [['CREDIT', 1, 500, 0], ['DEBIT', 4, 562.5, 0], ['DEBIT', 5, 450, 0], ['DEBIT', 6, 4112.5, 887.5]])
  assert.equal(result.otherAdditions, 500)
  const floored = protectPayrollObligations({ earnedFixedGross: 10000, overtime: 0, unpaidLeave: 0, attendance: { lateness: 0, shortfall: 0, absence: 0 },
    credits: [], debits: [debit(2, 9000)], settings: { minNetGuarantee: '2000', netFloorPct: '30', maxDeductionPctOfGross: null } })
  assert.equal(floored.otherDeductions, 7000, 'the 30% floor (3000) beats the 2000 guarantee')
})

test('deduction form (money-requests lane): incident date, document reference, installments, the limits box and the dead reports panel are gone; «إرسال» previews internally', () => {
  const workspace = readSource('src/components/payroll/TypedDeductionsWorkspace.tsx')
  // ومعها كلام الدفتر التقني، ومسار الاعتراض حين لا اعتراض أصلاً (الإعداد objection_blocks_approval = false)
  for (const gone of ['تاريخ الواقعة\n', 'عدد الأقساط (حتى', 'حدود النوع:', 'DeductionReportsPanel', 'ReportSection', 'fetchDeductionReports', 'معاينة الأرقام',
    'قيود الدفتر', 'لا يُنشأ قيد قبل آخر اعتماد', 'مرحّل من قيد', 'لا اعتراض', 'لا يمنع الاعتماد', 'يمنع الاعتماد حتى الرد']) {
    assert.ok(!workspace.includes(gone), gone)
  }
  for (const text of ['fresh = preview && !stale ? preview : await previewDeductions(input, selection)',
    'submitDeductionBatch(input, selection, fresh.previewHash)',
    '{preview && (preview.totals.failed > 0 || preview.totals.excluded > 0) && (',
    'إجمالي المجموعة ({preview.totals.ready} موظف)',
    'مرجع المستند (إلزامي لهذا النوع)',
    "if (view === 'pending_me' || view === 'created' || view === 'all') setFilters(value => ({ ...value, view }))",
    "if (urlParam('tab') === 'create' && value.types.length > 0) setTab('create')",
    'الخصم على الشهور (بعد الاعتماد)',
    'مؤجل من شهر سابق',
    '{detail.objections.length > 0 && (']) {
    assert.ok(workspace.includes(text), text)
  }
  // «بانتظار موافقتي» في صندوق الموافقات يفتح العرض نفسه لا «الكل»
  const inbox = readSource('src/app/approvals-inbox/page.tsx')
  assert.ok(inbox.includes("'/payroll/deductions?view=pending_me' : '/my/deductions?view=pending_me'"))
  assert.ok(inbox.includes("'/payroll/bonuses?view=pending_me' : '/my/bonuses?view=pending_me'"))
})

// ===== إعادة العمل (مراجعة S25) =====
test('DD-01 rule 2: a court order or statutory type cannot be moved to another category (so exemption can never be enabled by two edits)', () => {
  const court = type({ code: 'COURT', category: 'COURT_ORDER', calcMethod: 'FIXED_AMOUNT' })
  assert.equal(code(() => rules.normalizeDeductionTypeRules({ category: 'ADMINISTRATIVE' }, court)), 'DEDUCTION_TYPE_PROTECTED_CATEGORY')
  assert.equal(code(() => rules.normalizeDeductionTypeRules({ category: 'ADMINISTRATIVE', isExemptable: true }, type({ code: 'STAT', category: 'STATUTORY' }))), 'DEDUCTION_TYPE_PROTECTED_CATEGORY')
  const admin = type({ code: 'ADM', category: 'ADMINISTRATIVE' })
  const promoted = rules.normalizeDeductionTypeRules({ category: 'COURT_ORDER' }, admin)
  assert.deepEqual([promoted.category, promoted.isExemptable], ['COURT_ORDER', false], 'moving into a protected category forces exemption off')
})

test('DD-01/03/04: owner unit, functional scope and the per-role escalation matrix normalize, snapshot and bump the version', () => {
  assert.equal(code(() => type({ creatorScopes: ['FUNCTION_OWNER', 'HR'] })), 'DEDUCTION_TYPE_INVALID', 'a function owner needs an owner unit')
  assert.equal(code(() => type({ functionalScope: { teamIds: [3] } })), 'DEDUCTION_TYPE_INVALID', 'a functional scope needs an owner unit')
  assert.equal(code(() => type({ ownerDepartmentId: 4, functionalScope: { teamIds: [0] } })), 'DEDUCTION_TYPE_INVALID')
  assert.equal(code(() => type({ basisEscalationDays: { NOBODY: '1' } })), 'DEDUCTION_TYPE_INVALID')
  const owned = type({ ownerDepartmentId: 4, creatorScopes: ['DIRECT_MANAGER', 'FUNCTION_OWNER', 'HR'], functionalScope: { teamIds: [9, 3, 3], departmentIds: [], employeeIds: [12] },
    basisEscalationDays: { FUNCTION_OWNER: '2', DIRECT_MANAGER: null, TEAM_LEADER: '5' } })
  assert.deepEqual(owned.functionalScope, { departmentIds: [], teamIds: [3, 9], employeeIds: [12] })
  assert.deepEqual(owned.basisEscalationDays, { DIRECT_MANAGER: null, FUNCTION_OWNER: '2' }, 'roles that cannot create are dropped from the matrix')
  assert.equal(rules.deductionEscalationDaysFor(owned, 'FUNCTION_OWNER'), '2')
  assert.equal(rules.deductionEscalationDaysFor(owned, 'DIRECT_MANAGER'), null, 'null = never escalate for that role')
  assert.equal(rules.deductionEscalationDaysFor(owned, 'HR'), '1', 'a role absent from the matrix uses the type threshold')
  assert.equal(type({ ownerDepartmentId: 4, functionalScope: { teamIds: [], departmentIds: [], employeeIds: [] } }).functionalScope, null)
  const columns = rules.deductionTypeColumns(owned)
  assert.equal(typeof columns.functionalScope, 'string')
  assert.deepEqual(rules.deductionTypeRulesFromRow({ ...columns, minAmount: 1, maxPctOfGross: 25, valueStep: 0.25, escalationDays: 1, defaultValue: null, maxAmount: null }), owned,
    'JSON columns read back from SQL normalize to the same rules')
  assert.deepEqual(rules.deductionTypeRulesFromRow({ ...owned }), owned, 'a request snapshot (objects, not JSON text) reads back too')
  assert.equal(rules.deductionTypeFinancialChanged(owned, rules.normalizeDeductionTypeRules({ functionalScope: { teamIds: [3] } }, owned)), true)
})

test('DD-06: a missing approver climbs to the next structural level; an escalation with nobody above goes to the executive; SKIP keeps the recorded skip', () => {
  const noDepartment = { DIRECT_MANAGER: 50, TEAM_LEADER: null, DEPARTMENT_MANAGER: null, BRANCH_MANAGER: 70 }
  const climbed = rules.buildDeductionChain({ approvalSteps: ['HR'], escalated: true, escalationStep: 'DEPARTMENT_MANAGER', creatorEmployeeId: 50, employeeId: 10, approvers: noDepartment, missingApproverFallback: 'NEXT_LEVEL' })
  assert.deepEqual(climbed.map(step => [step.role, step.status, step.approverEmployeeId, step.fallbackFrom ?? null, step.escalation]),
    [['BRANCH_MANAGER', 'PENDING', 70, 'DEPARTMENT_MANAGER', true], ['HR', 'PENDING', null, null, false]])
  assert.match(climbed[0].note, /^بديل: لا يوجد مدير القسم/)
  const nobody = rules.buildDeductionChain({ approvalSteps: ['HR'], escalated: true, escalationStep: 'DEPARTMENT_MANAGER', creatorEmployeeId: 50, employeeId: 10,
    approvers: { DIRECT_MANAGER: 50, TEAM_LEADER: null, DEPARTMENT_MANAGER: null, BRANCH_MANAGER: null }, missingApproverFallback: 'NEXT_LEVEL' })
  assert.deepEqual(nobody.map(step => [step.role, step.status, step.fallbackFrom ?? null]), [['EXECUTIVE', 'PENDING', 'DEPARTMENT_MANAGER'], ['HR', 'PENDING', null]])
  const creatorAbove = rules.buildDeductionChain({ approvalSteps: ['HR'], escalated: true, escalationStep: 'DEPARTMENT_MANAGER', creatorEmployeeId: 70, employeeId: 10, approvers: noDepartment, missingApproverFallback: 'NEXT_LEVEL' })
  assert.deepEqual(creatorAbove.map(step => step.role), ['EXECUTIVE', 'HR'], 'the creator cannot be the fallback approver of his own escalation')
  const plainStep = rules.buildDeductionChain({ approvalSteps: ['TEAM_LEADER', 'HR'], escalated: false, escalationStep: null, creatorEmployeeId: 1, employeeId: 10,
    approvers: { DIRECT_MANAGER: 50, TEAM_LEADER: null, DEPARTMENT_MANAGER: null, BRANCH_MANAGER: null }, missingApproverFallback: 'NEXT_LEVEL' })
  assert.deepEqual(plainStep.map(step => [step.role, step.status]), [['TEAM_LEADER', 'SKIPPED'], ['HR', 'PENDING']], 'a non-escalation step with nobody above keeps its recorded skip')
  const skipped = rules.buildDeductionChain({ approvalSteps: ['HR'], escalated: true, escalationStep: 'DEPARTMENT_MANAGER', creatorEmployeeId: 50, employeeId: 10, approvers: noDepartment })
  assert.deepEqual(skipped.map(step => [step.role, step.status]), [['DEPARTMENT_MANAGER', 'SKIPPED'], ['HR', 'PENDING']])
  assert.deepEqual(rules.parseDeductionSteps(JSON.stringify(climbed)), climbed)
})

test('DD-06 rule 1: the current step waits from the last action or the creation time', () => {
  const steps = rules.buildDeductionChain({ approvalSteps: ['DEPARTMENT_MANAGER', 'HR'], escalated: false, escalationStep: null, creatorEmployeeId: 1, employeeId: 10,
    approvers: { DIRECT_MANAGER: 5, TEAM_LEADER: null, DEPARTMENT_MANAGER: 6, BRANCH_MANAGER: null } })
  assert.equal(rules.deductionStepWaitingSince(steps, new Date('2026-09-01T08:00:00Z')).toISOString(), '2026-09-01T08:00:00.000Z')
  steps[0].status = 'APPROVED'; steps[0].actedAt = '2026-09-03T10:30:00.000Z'
  assert.equal(rules.deductionStepWaitingSince(steps, new Date('2026-09-01T08:00:00Z')).toISOString(), '2026-09-03T10:30:00.000Z')
})

test('DD-10 rule 2: day and hour installments split the units (remainder in the last), never the currency', () => {
  assert.deepEqual(rules.splitDeductionUnits('3', 2), ['1.5', '1.5'])
  assert.deepEqual(rules.splitDeductionUnits('1', 3), ['0.3333', '0.3333', '0.3334'])
  assert.equal(code(() => rules.splitDeductionUnits('0.0002', 3)), 'DEDUCTION_INSTALLMENT_TOO_SMALL')
  assert.equal(rules.deductionSplitsByUnits('DAYS_OF_SALARY'), true)
  assert.equal(rules.deductionSplitsByUnits('PERCENT_OF_BASE'), false)
  // كل قسط بسعر يوم شهره: 1.5 يوم × 300 ثم 1.5 يوم × 400
  const unlimited = type({ minAmount: null, maxPctOfGross: null, escalationDays: null, valueStep: null })
  assert.deepEqual(rules.splitDeductionUnits('3', 2).map((units, index) => rules.computeDeductionAmount(unlimited, units, salary(index ? '12000.00' : '9000.00')).amount), ['450.00', '600.00'])
})

test('Settings: deduction keys clamp to one shared range when read and reject out-of-range values when saved', () => {
  assert.equal(rules.deductionNumericSetting('deductions.reason_min_length', '5000'), 1000, 'above the maximum is clamped, not silently reset to 20')
  assert.equal(rules.deductionNumericSetting('deductions.bulk_max_employees', '99999'), 5000)
  assert.equal(rules.deductionNumericSetting('deductions.bulk_max_employees', 'abc'), 500)
  assert.equal(rules.deductionNumericSetting('deductions.step_sla_hours', '0'), 0)
  assert.equal(rules.deductionEnumSetting('deductions.sla_breach_action', 'NOPE'), 'ESCALATE')
  assert.match(rules.deductionSettingError('deductions.reason_min_length', '5000'), /1 إلى 1000/)
  assert.match(rules.deductionSettingError('deductions.bulk_max_employees', '0'), /1 إلى 5000/)
  assert.equal(rules.deductionSettingError('deductions.duplicate_window_hours', '8760'), null)
  assert.match(rules.deductionSettingError('deductions.missing_approver_fallback', 'UP'), /NEXT_LEVEL/)
  assert.equal(rules.deductionSettingError('payroll.daily_hours', 'x'), null, 'other keys are not judged here')
  const seeded = Object.fromEntries(rules.DEDUCTION_CONFIG_SEED.map(row => [row.key, row.value]))
  assert.deepEqual([seeded['deductions.reason_min_length'], seeded['deductions.step_sla_hours'], seeded['deductions.max_carry_forward_count'], seeded['deductions.missing_approver_fallback']], ['20', '48', '3', 'NEXT_LEVEL'])
})

test('DD-11 order: statutory and court-order deductions come first and use cap room; administrative typed deductions are collected after the other typed ones', () => {
  const typedDebit = (id, amount, typedCategory, extra = {}) => debit(id, amount, { typedCategory, ...extra })
  const result = protectPayrollObligations({ earnedFixedGross: 11750, overtime: 0, unpaidLeave: 0, attendance: { lateness: 750, shortfall: 0, absence: 0 },
    credits: [], debits: [typedDebit(8, 450, 'ADMINISTRATIVE'), typedDebit(9, 562.5, 'PERFORMANCE'), debit(3, 500, { category: 'custody_shortfall', deductionRequestId: null }),
      typedDebit(2, 1057.5, 'STATUTORY'), typedDebit(7, 3200, 'DISCIPLINARY')], settings: { minNetGuarantee: null, netFloorPct: null, maxDeductionPctOfGross: '50' } })
  // السقف 5875: نظامي 1057.50 ← حضور 750 ← استرداد 500 ← التزام/جودة ← الإداري آخرًا
  assert.equal(result.trace.statutoryCollected, '1057.50')
  assert.equal(result.trace.attendanceCapacity, '4817.50')
  assert.equal(result.trace.debitCapacity, '4067.50')
  // 7 و9 بنفس تاريخ السريان فالأقدم بالمعرف؛ الإداري 8 آخرًا فيُرحّل كاملًا
  assert.deepEqual(result.lines.map(line => [line.id, line.collected, line.carried]), [[2, 1057.5, 0], [3, 500, 0], [7, 3200, 0], [9, 367.5, 195], [8, 0, 450]])
  const prioritized = protectPayrollObligations({ earnedFixedGross: 1000, overtime: 0, unpaidLeave: 0, attendance: { lateness: 0, shortfall: 0, absence: 0 }, credits: [],
    debits: [typedDebit(1, 800, 'PERFORMANCE', { carryPriority: 3 }), typedDebit(2, 800, 'PERFORMANCE', { carryPriority: 5 })], settings: noLimits })
  assert.deepEqual(prioritized.lines.map(line => [line.id, line.collected]), [[2, 800], [1, 200]], 'a higher carry-forward priority is collected first and carried last')
  const courtOnly = protectPayrollObligations({ earnedFixedGross: 1000, overtime: 0, unpaidLeave: 0, attendance: { lateness: 300, shortfall: 0, absence: 0 }, credits: [],
    debits: [typedDebit(4, 1200, 'COURT_ORDER')], settings: noLimits })
  assert.deepEqual([courtOnly.lines[0].collected, courtOnly.lines[0].carried, courtOnly.attendance.lateness], [1000, 200, 0])
  assert.ok(courtOnly.trace.warnings.some(item => item.code === 'STATUTORY_EXCEEDS_ROOM'))
})
