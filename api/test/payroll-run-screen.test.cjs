// B5 — الخطوات 22 و7 و23: ترتيب تحصيل المالك في نواة حماية الصافي، وانتقالات الحالة برموز PAYRUN-STATE وفصل المهام ورخصة الشركة الصغيرة،
// وقيد الصرف، وفترة التكافؤ التشغيلية، والتقريب الواحد المشترك بين المسير ونهاية الخدمة والتصفية. منطق نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.resolve(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const { protectPayrollObligations, isPayrollCollectionOrder, PAYROLL_DEFAULT_COLLECTION_ORDER } = require('../src/payroll/payroll-obligation-protection')
const { payrollCollectionClassOrder } = require('../src/payroll/payroll-collection-order')
const approval = require('../src/payroll/payroll-run-approval')
const { summarizePayrollParityOperations, PAYROLL_PARITY_OPERATIONAL_PLAN } = require('../src/payroll/payroll-parity-operations')
const { roundPayrollMoney } = require('../src/payroll/payroll-money')
const { computeEos, buildEosPolicy, EOS_DEFAULTS } = require('../src/offboarding/eos')
const decisions = require('../src/payroll/payroll-decision-settings')
const { configSeed } = require('../src/seed/requests-seed.data')

const entry = (id, amount, extra = {}) => ({ id, amount, category: 'custody', deductionRequestId: null, effectiveDate: '2026-08-01', ...extra })
// أجر 6000 وسقف خصم 20% = 1200: حضور 350 (تأخير 100، نقص 50، غياب 200)، استرداد 300، إداري بأولوية ترحيل 9 (400)، تأديبي بأولوية 2 (500)
const input = (overrides = {}) => ({ earnedFixedGross: 6000, overtime: 0, unpaidLeave: 0, attendance: { lateness: 100, shortfall: 50, absence: 200 }, credits: [],
  debits: [entry(1, 300), entry(2, 400, { deductionRequestId: 10, typedCategory: 'ADMINISTRATIVE', carryPriority: 9, effectiveDate: '2026-07-01' }),
    entry(3, 500, { deductionRequestId: 11, typedCategory: 'DISCIPLINARY', carryPriority: 2 })],
  settings: { minNetGuarantee: null, netFloorPct: null, maxDeductionPctOfGross: 20 }, ...overrides })
const collected = result => result.lines.filter(line => line.type === 'DEBIT').map(line => [line.id, line.collected, line.carried])

test('Default collection order (no owner order) keeps the V2 kernel: attendance, recoveries, typed by carry priority, loan slot = net before loans', () => {
  const result = protectPayrollObligations(input())
  assert.deepEqual(result.attendance, { lateness: 100, shortfall: 50, absence: 200 })
  // الافتراضي: المصنفة والإدارية مجموعة واحدة بأولوية الترحيل (الإداري بأولوية 9 قبل التأديبي بأولوية 2)
  assert.deepEqual(collected(result), [[1, 300, 0], [2, 400, 0], [3, 150, 350]])
  assert.equal(result.otherDeductions, 850)
  assert.deepEqual(result.loanSlot, { netBeforeLoans: 4800, capConsumed: 1200 })
  assert.equal('collectionOrder' in result.trace, false, 'the default order adds no trace field (V2 breakdown unchanged)')
  assert.deepEqual([result.trace.attendanceCapacity, result.trace.debitCapacity, result.trace.debitCapacityRemaining], ['1200.00', '850.00', '0.00'])
  assert.deepEqual(protectPayrollObligations({ ...input(), collectionOrder: null }), result)
})

test('Owner order separates typed from administrative deductions as two classes in the chosen order', () => {
  const typedFirst = protectPayrollObligations(input({ collectionOrder: ['ATTENDANCE', 'RECOVERY', 'TYPED', 'ADMINISTRATIVE', 'LOAN'] }))
  assert.deepEqual(collected(typedFirst), [[1, 300, 0], [3, 500, 0], [2, 50, 350]])
  assert.deepEqual(typedFirst.trace.collectionOrder, ['ATTENDANCE', 'RECOVERY', 'TYPED', 'ADMINISTRATIVE', 'LOAN'])
  const adminFirst = protectPayrollObligations(input({ collectionOrder: ['ATTENDANCE', 'RECOVERY', 'ADMINISTRATIVE', 'TYPED', 'LOAN'] }))
  assert.deepEqual(collected(adminFirst), [[1, 300, 0], [2, 400, 0], [3, 150, 350]])
})

test('Owner order with recoveries before attendance: the recovery takes the capacity and the attendance excess drops (shortfall, lateness, then absence)', () => {
  const result = protectPayrollObligations(input({ settings: { minNetGuarantee: null, netFloorPct: null, maxDeductionPctOfGross: 400 / 60 },
    collectionOrder: ['RECOVERY', 'ATTENDANCE', 'TYPED', 'ADMINISTRATIVE', 'LOAN'] }))
  assert.deepEqual(collected(result), [[1, 300, 0], [3, 0, 500], [2, 0, 400]])
  assert.deepEqual(result.attendance, { lateness: 0, shortfall: 0, absence: 100 })
  assert.deepEqual(result.trace.attendanceDropped, { shortfall: '50.00', lateness: '100.00', absence: '100.00' })
})

test('Owner order with loans first: the loan slot is the balance before every other class, and the collected installments shrink the classes after them', () => {
  const order = ['LOAN', 'ATTENDANCE', 'RECOVERY', 'TYPED', 'ADMINISTRATIVE']
  const first = protectPayrollObligations(input({ collectionOrder: order }))
  assert.deepEqual(first.loanSlot, { netBeforeLoans: 6000, capConsumed: 0 })
  const second = protectPayrollObligations(input({ collectionOrder: order, loanCollected: 1000 }))
  assert.deepEqual(second.loanSlot, first.loanSlot, 'the slot is computed before the loan position, so the installment plan context is stable')
  assert.deepEqual(second.attendance, { lateness: 0, shortfall: 0, absence: 200 })
  assert.deepEqual(collected(second), [[1, 0, 300], [3, 0, 500], [2, 0, 400]])
  assert.equal(second.trace.loanCollected, '1000.00')
})

test('Collection order validation: all five classes exactly once; the kernel refuses anything else', () => {
  assert.equal(isPayrollCollectionOrder([...PAYROLL_DEFAULT_COLLECTION_ORDER]), true)
  for (const bad of [['ATTENDANCE'], ['ATTENDANCE', 'ATTENDANCE', 'RECOVERY', 'TYPED', 'LOAN'], ['ATTENDANCE', 'RECOVERY', 'TYPED', 'ADMINISTRATIVE', 'OTHER'], 'LOAN']) {
    assert.equal(isPayrollCollectionOrder(bad), false, JSON.stringify(bad))
  }
  assert.throws(() => protectPayrollObligations(input({ collectionOrder: ['LOAN'] })), /ترتيب التحصيل/)
  assert.throws(() => protectPayrollObligations(input({ loanCollected: -1 })), /غير سالبة/)
})

test('Owner component order maps to run classes; a class without a component keeps its default place after its default predecessor; OTHER is ignored', () => {
  const classifications = [{ componentCode: 'ATT_DED', kind: 'ATTENDANCE' }, { componentCode: 'REC_DED', kind: 'RECOVERY' }, { componentCode: 'LOAN_DED', kind: 'LOAN' },
    { componentCode: 'UNPAID', kind: 'UNPAID_NON_ENTITLEMENT' }, { componentCode: 'OTHER_DED', kind: 'OTHER' }]
  assert.deepEqual(payrollCollectionClassOrder({ classifications, collectionOrder: ['LOAN_DED', 'REC_DED', 'ATT_DED', 'OTHER_DED'] }),
    ['LOAN', 'RECOVERY', 'TYPED', 'ADMINISTRATIVE', 'ATTENDANCE'])
  assert.deepEqual(payrollCollectionClassOrder({ classifications: [{ componentCode: 'ATT_DED', kind: 'ATTENDANCE' }], collectionOrder: ['ATT_DED'] }),
    [...PAYROLL_DEFAULT_COLLECTION_ORDER])
  assert.deepEqual(payrollCollectionClassOrder({ classifications, collectionOrder: ['ATT_DED', 'LOAN_DED', 'REC_DED'] }),
    ['ATTENDANCE', 'LOAN', 'RECOVERY', 'TYPED', 'ADMINISTRATIVE'])
})

test('PAYRUN-STATE-001 names the action, the current state and the allowed states (SRS PR-11)', () => {
  const issue = approval.payrollRunStateIssue('صرف المسير', 'CALCULATED', ['APPROVED'])
  assert.equal(issue.code, 'PAYRUN-STATE-001')
  assert.deepEqual([issue.currentStatus, issue.allowedStatuses], ['CALCULATED', ['APPROVED']])
  assert.equal(issue.message, 'لا يمكن تنفيذ «صرف المسير» والمسير في حالة «محسوب». الإجراء متاح في الحالات: معتمد.')
  assert.match(approval.payrollRunStateIssue('اعتماد المسير', 'PAID', ['CALCULATED']).message, /«مصروف».*محسوب/)
})

test('Segregation of duties: the calculator cannot approve (PAYRUN-STATE-003) unless the documented small-company licence is enabled', () => {
  assert.equal(approval.payrollSelfApprovalIssue({ calculatedBy: 5, approverId: 5, selfApprovalAllowed: false }).code, 'PAYRUN-STATE-003')
  assert.match(approval.payrollSelfApprovalIssue({ calculatedBy: 5, approverId: 5, selfApprovalAllowed: false }).message, /لا يجوز أن يكون المعتمِد هو من نفّذ الاحتساب/)
  assert.equal(approval.payrollSelfApprovalIssue({ calculatedBy: 5, approverId: 5, selfApprovalAllowed: true }), null)
  assert.equal(approval.payrollSelfApprovalIssue({ calculatedBy: 5, approverId: 6, selfApprovalAllowed: false }), null)
  assert.equal(approval.payrollSelfApprovalIssue({ calculatedBy: null, approverId: 6, selfApprovalAllowed: false }), null)
  assert.deepEqual(['true', 'TRUE', 'false', undefined, null].map(approval.payrollSelfApprovalAllowed), [true, false, false, false, false])
  // الإعداد مبذور مقفلًا ومتحقق منه في PATCH /settings/config
  assert.equal(approval.PAYROLL_SELF_APPROVAL_KEY, 'payroll.approval_self_approval_allowed')
  assert.equal(new Map(configSeed.map(row => [row.key, row.value])).get(approval.PAYROLL_SELF_APPROVAL_KEY), 'false')
  assert.equal(decisions.payrollDecisionConfigError(approval.PAYROLL_SELF_APPROVAL_KEY, 'true'), undefined)
  assert.match(decisions.payrollDecisionConfigError(approval.PAYROLL_SELF_APPROVAL_KEY, 'yes'), /true، false/)
})

test('Pay record: a channel from the list and a written reference are required; the reference is trimmed', () => {
  assert.equal(approval.payrollPayRecordIssue({}).code, 'PAYRUN-PAY-CHANNEL')
  assert.equal(approval.payrollPayRecordIssue({ channel: 'WIRE', reference: 'TRX-1' }).code, 'PAYRUN-PAY-CHANNEL')
  assert.equal(approval.payrollPayRecordIssue({ channel: 'BANK_TRANSFER', reference: ' 12 ' }).code, 'PAYRUN-PAY-REFERENCE')
  assert.equal(approval.payrollPayRecordIssue({ channel: 'BANK_TRANSFER', reference: 'x'.repeat(101) }).code, 'PAYRUN-PAY-REFERENCE')
  assert.equal(approval.payrollPayRecordIssue({ channel: 'CASH', reference: 'محضر 7' }), null)
  assert.deepEqual(approval.payrollPayRecordOf({ channel: 'CHEQUE', reference: '  CHQ-0042 ' }), { channel: 'CHEQUE', reference: 'CHQ-0042' })
})

test('Operational parity period (step 23): only paid SHADOW runs with a signed parity report count, one per payroll month, 3 then 2 more then the owner decision', () => {
  const hash = 'a'.repeat(64)
  const run = (runId, period, status, engineMode, withHash = true) => ({ runId, name: `مسير ${runId}`, period, status, engineMode, approvedAt: null, approvedBy: 1,
    approvedByName: 'مدير النظام', paidAt: null, approvedEvent: withHash ? { parityReportHash: hash, parityTotals: { employees: 2 }, parityExplained: { differences: 0, unavailable: 4 } } : {} })
  const early = summarizePayrollParityOperations([run(1, '2026-10', 'PAID', 'SHADOW'), run(2, '2026-10', 'PAID', 'SHADOW'), run(3, '2026-11', 'APPROVED', 'SHADOW'),
    run(4, '2026-12', 'PAID', 'LEGACY'), run(5, '2027-01', 'PAID', 'SHADOW', false)])
  assert.deepEqual([early.months, early.stage, early.countedPeriods], [1, 'BASELINE', ['2026-10']])
  assert.deepEqual(early.runs.map(row => row.counted), [true, true, false, false, false])
  assert.deepEqual(early.runs.slice(2).map(row => row.notCountedReason), ['معتمد ولم يُصرف بعد', 'وضع المحرك LEGACY — فترة التكافؤ تُحتسب بمسيرات SHADOW فقط', 'حدث الاعتماد بلا بصمة تقرير تكافؤ'])
  const periods = ['2026-10', '2026-11', '2026-12', '2027-01', '2027-02']
  assert.equal(summarizePayrollParityOperations(periods.slice(0, 3).map((period, index) => run(index + 1, period, 'PAID', 'SHADOW'))).stage, 'EXTENSION')
  const done = summarizePayrollParityOperations(periods.map((period, index) => run(index + 1, period, 'PAID', 'SHADOW')))
  assert.deepEqual([done.months, done.stage], [5, 'DECISION_DUE'])
  assert.match(done.message, /قرار التحويل إلى POLICY للمالك أو مفوضه المكتوب/)
  assert.deepEqual([PAYROLL_PARITY_OPERATIONAL_PLAN.baselineMonths, PAYROLL_PARITY_OPERATIONAL_PLAN.extensionMonths, PAYROLL_PARITY_OPERATIONAL_PLAN.totalMonths], [3, 2, 5])
})

test('Operational parity period (review fix): a month counts only when every live run of that month is a paid SHADOW run with a signed report; test runs marked with a reason neither count nor block', () => {
  const hash = 'b'.repeat(64)
  const run = (runId, period, status, engineMode, extra = {}) => ({ runId, name: `مسير ${runId}`, period, status, engineMode, approvedAt: null, approvedBy: 1,
    approvedByName: 'مدير النظام', paidAt: null, approvedEvent: ['APPROVED', 'PAID'].includes(status) ? { parityReportHash: hash } : null, ...extra })
  // 2026-10: فرع مصروف SHADOW وفرع LEGACY ← لا يُحتسب؛ 2026-11: مسير محسوب لم يُعتمد ← لا يُحتسب؛ 2026-12: المسودة التجريبية المعلّمة لا تحجب؛ الملغى خارج العد
  const mixed = summarizePayrollParityOperations([run(1, '2026-10', 'PAID', 'SHADOW'), run(2, '2026-10', 'PAID', 'LEGACY'), run(3, '2026-11', 'PAID', 'SHADOW'),
    run(4, '2026-11', 'CALCULATED', 'SHADOW'), run(5, '2026-12', 'PAID', 'SHADOW'),
    run(6, '2026-12', 'DRAFT', 'SHADOW', { parityExcludedReason: 'تشغيل تجريبي', parityExcludedBy: 12, parityExcludedByName: 'هالة' }), run(7, '2027-01', 'CANCELLED', 'LEGACY')])
  assert.deepEqual([mixed.months, mixed.countedPeriods, mixed.excludedRuns, mixed.scope], [1, ['2026-12'], 1, 'COMPANY'])
  assert.deepEqual(mixed.periods.map(period => [period.period, period.counted, period.blockers.map(blocker => blocker.runId)]),
    [['2026-10', false, [2]], ['2026-11', false, [4]], ['2026-12', true, []]])
  assert.deepEqual(mixed.runs.map(row => row.runId), [1, 2, 3, 4, 5, 6], 'a cancelled run is neither listed nor blocking')
  assert.deepEqual(mixed.runs.map(row => row.counted), [false, false, false, false, true, false])
  assert.equal(mixed.runs[0].notCountedReason, 'الشهر 2026-10 غير مكتمل: المسير #2 وضع المحرك LEGACY — فترة التكافؤ تُحتسب بمسيرات SHADOW فقط')
  assert.equal(mixed.runs[3].notCountedReason, 'محسوب ولم يُعتمد بعد')
  assert.deepEqual([mixed.runs[5].notCountedReason, mixed.runs[5].excluded.byName, mixed.runs[5].excluded.by], ['مسير تجريبي لا يُحتسب: تشغيل تجريبي', 'هالة', 12])
  // كل مسيرات hr_system الحالية معلّمة تجريبية (ترحيل 030) ← صفر أشهر ولا شهر محجوز
  const allTest = summarizePayrollParityOperations([run(32, '2026-12', 'PAID', 'SHADOW', { parityExcludedReason: 'بيانات اختبار' }), run(33, '2026-12', 'PAID', 'SHADOW', { parityExcludedReason: 'بيانات اختبار' })])
  assert.deepEqual([allTest.months, allTest.periods, allTest.excludedRuns, allTest.stage], [0, [], 2, 'BASELINE'])
  // نطاق الفرع مكتوب في الرسالة، وصاحب القرار مسمى ولا مفوض
  assert.match(summarizePayrollParityOperations([], { scope: 'BRANCH' }).message, /داخل نطاق فرعك/)
  assert.deepEqual([PAYROLL_PARITY_OPERATIONAL_PLAN.decisionOwner, PAYROLL_PARITY_OPERATIONAL_PLAN.delegate], ['المالك (كريم)', null])
  const done = summarizePayrollParityOperations(['2026-10', '2026-11', '2026-12', '2027-01', '2027-02'].map((period, index) => run(index + 1, period, 'PAID', 'SHADOW')))
  assert.deepEqual([done.months, done.stage], [5, 'DECISION_DUE'])
  assert.match(done.message, /لا مفوض مسمى في ملف التسليم، فالقرار لـالمالك \(كريم\)/)
})

test('Small-company licence (review fix): changing it needs a dedicated permission that only the super admin grants; settings.manage with calculate and approve is refused', () => {
  const { PERMISSIONS, SUPER_ADMIN_ONLY_GRANTS, ROLE_PRESETS, adminGrantViolation, hasPerm } = require('../src/auth/permissions')
  assert.equal(approval.PAYROLL_SELF_APPROVAL_LICENCE_PERMISSION, 'payroll.self_approval_licence')
  assert.ok(PERMISSIONS['payroll.self_approval_licence'])
  assert.ok(SUPER_ADMIN_ONLY_GRANTS.includes('payroll.self_approval_licence'))
  const hr = ROLE_PRESETS.find(role => role.code === 'hr_manager').permissions
  assert.ok(['settings.manage', 'payroll.calculate', 'payroll.approve'].every(permission => hr.includes(permission)), 'the reviewed bypass profile')
  assert.equal(hr.includes('payroll.self_approval_licence'), false)
  assert.match(adminGrantViolation([...hr, 'payroll.self_approval_licence'], hr), /مدير النظام فقط/)
  const refused = approval.payrollSelfApprovalLicenceIssue({ key: approval.PAYROLL_SELF_APPROVAL_KEY, canManageLicence: hasPerm(hr, 'payroll.self_approval_licence') })
  assert.equal(refused.code, 'PAYRUN-SOD-LICENCE-PERMISSION')
  assert.equal(approval.payrollSelfApprovalLicenceIssue({ key: approval.PAYROLL_SELF_APPROVAL_KEY, canManageLicence: hasPerm(['*'], 'payroll.self_approval_licence') }), null)
  assert.equal(approval.payrollSelfApprovalLicenceIssue({ key: 'payroll.daily_hours', canManageLicence: false }), null)
  const controller = fs.readFileSync(path.resolve(__dirname, '..', 'src/settings/settings.controller.ts'), 'utf8')
  const guard = controller.indexOf('payrollSelfApprovalLicenceIssue({ key: dto.key')
  assert.ok(guard > 0 && guard < controller.indexOf('row.value = dto.value'), 'the licence guard runs before any config value is saved')
})

test('One shared money rule (owner decision 16 Sept): two decimals cut toward zero, no rounding, in the run kernel, the end-of-service award and the settlement', () => {
  assert.equal(roundPayrollMoney(1234.567), 1234.56)
  assert.equal(roundPayrollMoney(1.005), 1)
  assert.equal(roundPayrollMoney(0.999), 0.99)
  assert.equal(roundPayrollMoney(-1.239), -1.23)
  assert.equal(roundPayrollMoney(-0.004), 0)
  // ضجيج التمثيل الثنائي لا يُسقط قرشًا حقيقيًا
  assert.equal(roundPayrollMoney(0.1 + 0.2), 0.3)
  assert.equal(roundPayrollMoney(1.15), 1.15)
  assert.equal(roundPayrollMoney(0.3 - 0.1), 0.2)
  assert.equal(roundPayrollMoney(103.33333333333333 * 3), 310)
  const policy = buildEosPolicy(EOS_DEFAULTS)
  // سنة خدمة بنصف شهر: 2.01 × 0.5 = 1.005 ← 1.00
  const eos = computeEos(2.01, 1, 'termination', policy)
  assert.deepEqual([eos.fullMonths, eos.full, eos.amount], [0.5, 1, 1])
  assert.equal(computeEos(2.03, 1, 'termination', policy).full, 1.01)
  const root = path.resolve(__dirname, '..')
  for (const file of ['src/offboarding/eos.ts', 'src/offboarding/offboarding.service.ts']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8')
    assert.match(source, /import \{ roundPayrollMoney as round2 \} from '\.\.\/payroll\/payroll-money'/, file)
    assert.doesNotMatch(source, /const round2 = /, `${file} must not keep a private rounding`)
  }
})
