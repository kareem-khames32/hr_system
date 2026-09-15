// C8 / الخطوة 31: منطق نقي لمسار العكس والمسير التكميلي — نوع المسير، سبب التصحيح، لقطة البند وبصمتها، تقرير التسويات،
// شرط SQL للبند المعكوس، وقراءة رصيد الأقساط مع ابن الترحيل المُلغى (REVERSED). بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const corrections = require('../src/payroll/payroll-corrections.ts')
const { payrollLineNotReversedSql } = require('../src/payroll/payroll-reversal-sql.ts')
const { readLoanInstallmentPositions } = require('../src/payroll/payroll-installment-balances.ts')
const { payrollReversalPlanWarnings, payrollExemptionCarriesToSupplementary, payrollLoanRestoreStatus } = require('../src/payroll/payroll-reversal-ledger.ts')

test('تنبيهات الإعفاء عند العكس: إعفاء الحضور يُنقل للتكميلي، و«كل الخصومات» لا يُنقل، والإسقاط أو التأجيل المنفذ يبقى؛ بلا إعفاء لا تنبيه', () => {
  assert.deepEqual(payrollReversalPlanWarnings({ employeeId: 7, exemptions: [] }), [])
  const row = (id, scopeKind, targetKind) => ({ id, scopeKind, targetKind, carriesToSupplementary: payrollExemptionCarriesToSupplementary({ scopeKind, targetKind }) })
  const warnings = payrollReversalPlanWarnings({ employeeId: 7, exemptions: [row(12, 'DEDUCTION_TYPE', 'LATENESS'), row(13, 'SINGLE_ENTRY', 'ABSENCE_DAY'),
    row(15, 'ALL_DEDUCTIONS', null), row(16, 'SINGLE_ENTRY', 'OBLIGATION'), row(17, 'DEDUCTION_TYPE', 'ADVANCE_INSTALLMENT')] })
  assert.deepEqual(warnings.map(warning => [warning.code, warning.employeeId, warning.exemptionIds]), [
    ['PAYRUN-REVERSAL-EXEMPTION-CARRIED', 7, [12, 13]], ['PAYRUN-REVERSAL-EXEMPTION-NOT-CARRIED', 7, [15]], ['PAYRUN-REVERSAL-EXEMPTION-PRESERVED', 7, [16, 17]]])
  assert.match(warnings[0].message, /#12، #13/)
  assert.match(warnings[0].message, /يُنقل تلقائيًا بقراره الأصلي إلى المسير التكميلي/)
  assert.match(warnings[0].message, /لا يُحتسب قرارًا جديدًا في حدود الإعفاء/)
  assert.match(warnings[1].message, /لا يُنقل تلقائيًا/)
  assert.match(warnings[1].message, /لا يُحتسب في حد الموظف/)
  assert.match(warnings[2].message, /يبقى نافذًا/)
})

test('نقل الإعفاء للتكميلي: خصومات الحضور (التأخير والنقص والغياب نوعًا أو يومًا) فقط', () => {
  for (const [scopeKind, targetKind] of [['DEDUCTION_TYPE', 'LATENESS'], ['DEDUCTION_TYPE', 'SHORTFALL'], ['DEDUCTION_TYPE', 'ABSENCE'],
    ['SINGLE_ENTRY', 'LATENESS_DAY'], ['SINGLE_ENTRY', 'SHORTFALL_DAY'], ['SINGLE_ENTRY', 'ABSENCE_DAY']]) {
    assert.equal(payrollExemptionCarriesToSupplementary({ scopeKind, targetKind }), true, `${scopeKind}/${targetKind}`)
  }
  for (const [scopeKind, targetKind] of [['ALL_DEDUCTIONS', null], ['DEDUCTION_TYPE', 'TYPED'], ['DEDUCTION_TYPE', 'ADVANCE_INSTALLMENT'],
    ['SINGLE_ENTRY', 'OBLIGATION'], ['SINGLE_ENTRY', 'LOAN_INSTALLMENT']]) {
    assert.equal(payrollExemptionCarriesToSupplementary({ scopeKind, targetKind }), false, `${scopeKind}/${targetKind}`)
  }
})

test('حالة السلفة عند إعادة فتحها بالعكس: المسجلة في حركة الصرف أولًا، وللحركات القديمة من تاريخ الصرف، والتعارض مانع', () => {
  assert.deepEqual(payrollLoanRestoreStatus(['APPROVED', 'APPROVED'], true), { status: 'APPROVED', source: 'POSTED_EVENT' }, 'المسجل يغلب تاريخ الصرف')
  assert.deepEqual(payrollLoanRestoreStatus([null, 'DISBURSED'], false), { status: 'DISBURSED', source: 'POSTED_EVENT' })
  assert.deepEqual(payrollLoanRestoreStatus([null], false), { status: 'APPROVED', source: 'DISBURSED_AT' }, 'سلفة بلا تاريخ صرف كانت معتمدة')
  assert.deepEqual(payrollLoanRestoreStatus([undefined, null], true), { status: 'DISBURSED', source: 'DISBURSED_AT' })
  assert.equal(payrollLoanRestoreStatus(['APPROVED', 'DISBURSED'], true), null)
  assert.equal(payrollLoanRestoreStatus(['SETTLED'], false), null)
})

test('نوع المسير: null وأي قيمة أخرى = أصلي؛ العكس والتكميلي بأسمائهما العربية', () => {
  assert.equal(corrections.payrollRunTypeOf({ runType: null }), 'REGULAR')
  assert.equal(corrections.payrollRunTypeOf({}), 'REGULAR')
  assert.equal(corrections.payrollRunTypeOf({ runType: 'OFF_CYCLE' }), 'REGULAR')
  assert.equal(corrections.payrollRunTypeOf({ runType: 'REVERSAL' }), 'REVERSAL')
  assert.equal(corrections.payrollRunTypeOf({ runType: 'SUPPLEMENTARY' }), 'SUPPLEMENTARY')
  assert.equal(corrections.PAYROLL_RUN_TYPE_LABELS.REVERSAL, 'مسير عكس صرف')
})

test('سبب التصحيح: 20 حرفًا على الأقل وثلاث كلمات مختلفة، والرفض برمز PAYRUN-CORRECTION-REASON', () => {
  assert.equal(corrections.payrollCorrectionReasonIssue(undefined).code, 'PAYRUN-CORRECTION-REASON')
  assert.equal(corrections.payrollCorrectionReasonIssue('خطأ في الراتب').code, 'PAYRUN-CORRECTION-REASON')
  assert.equal(corrections.payrollCorrectionReasonIssue('تصحيح تصحيح تصحيح تصحيح تصحيح').code, 'PAYRUN-CORRECTION-REASON')
  assert.match(corrections.payrollCorrectionReasonIssue('تصحيح تصحيح تصحيح تصحيح تصحيح').message, /ثلاث كلمات/)
  assert.equal(corrections.payrollCorrectionReasonIssue('x'.repeat(1001)).code, 'PAYRUN-CORRECTION-REASON')
  assert.equal(corrections.payrollCorrectionReasonIssue('صُرف راتب سبتمبر مرتين بالخطأ حسب كشف البنك رقم 441'), null)
})

test('لقطة البند المعكوس: مبالغ بخانتين، والبصمة ثابتة وتتغير بأي مبلغ أو تفصيل', () => {
  const item = { id: 7, runId: 3, employeeId: 11, payMethod: 'transfer', basicSalary: 6000, allowances: '500.5', netPay: 6100.456, breakdown: '{"a":1}' }
  const first = corrections.payrollReversalItemSnapshot(item)
  assert.equal(first.snapshot.amounts.basicSalary, '6000.00')
  assert.equal(first.snapshot.amounts.allowances, '500.50')
  assert.equal(first.snapshot.amounts.netPay, '6100.46')
  assert.equal(first.snapshot.amounts.overtimeAmount, '0.00')
  assert.match(first.hash, /^[a-f0-9]{64}$/)
  assert.equal(corrections.payrollReversalItemSnapshot({ ...item }).hash, first.hash)
  assert.notEqual(corrections.payrollReversalItemSnapshot({ ...item, netPay: 6100.47 }).hash, first.hash)
  assert.notEqual(corrections.payrollReversalItemSnapshot({ ...item, breakdown: '{"a":2}' }).hash, first.hash)
  assert.throws(() => corrections.payrollReversalItemSnapshot({ ...item, netPay: 'abc' }))
})

test('تقرير التسويات: المصروف − المعكوس المنفذ = الصافي الفعلي، وفرق التسوية = التكميلي المصروف − المعكوس المنفذ', () => {
  const runs = [
    { id: 1, name: 'مسير سبتمبر', period: '2026-09', status: 'PAID', runType: null, parentRunId: null, totalNet: 1500 },
    { id: 2, name: 'عكس صرف مسير سبتمبر', period: '2026-09', status: 'PAID', runType: 'REVERSAL', parentRunId: 1, totalNet: -1000 },
    { id: 3, name: 'تكميلي مسير سبتمبر', period: '2026-09', status: 'PAID', runType: 'SUPPLEMENTARY', parentRunId: 1, totalNet: 1200 },
    { id: 4, name: 'عكس ملغى', period: '2026-09', status: 'CANCELLED', runType: 'REVERSAL', parentRunId: 1, totalNet: -500 },
    { id: 5, name: 'تكميلي جارٍ', period: '2026-09', status: 'CALCULATED', runType: 'SUPPLEMENTARY', parentRunId: 3, totalNet: 90 },
    { id: 9, name: 'مسير آخر', period: '2026-09', status: 'PAID', runType: null, parentRunId: null, totalNet: 999 },
  ]
  const items = [
    { id: 10, runId: 1, employeeId: 100, netPay: '1000.00' }, { id: 11, runId: 1, employeeId: 200, netPay: '500.00' },
    { id: 30, runId: 3, employeeId: 100, netPay: '1200.00' }, { id: 50, runId: 5, employeeId: 200, netPay: '90.00' }, { id: 90, runId: 9, employeeId: 100, netPay: '999.00' },
  ]
  const lines = [
    { id: 1, reversalRunId: 2, originalRunId: 1, originalItemId: 10, employeeId: 100, status: 'POSTED', netPay: '1000.00' },
    { id: 2, reversalRunId: 4, originalRunId: 1, originalItemId: 11, employeeId: 200, status: 'CANCELLED', netPay: '500.00' },
  ]
  assert.deepEqual(corrections.payrollCorrectionChain(1, runs).map(run => run.id), [1, 2, 3, 4, 5])
  const summary = corrections.summarizePayrollCorrections(1, runs, items, lines)
  const e100 = summary.employees.find(row => row.employeeId === 100)
  assert.deepEqual([e100.originalNet, e100.reversedNet, e100.supplementaryPaidNet, e100.effectiveNet, e100.settlementDifference], ['1000.00', '1000.00', '1200.00', '1200.00', '200.00'])
  assert.deepEqual(e100.entries.map(entry => [entry.runId, entry.runType, entry.netPay]), [[1, 'REGULAR', '1000.00'], [2, 'REVERSAL', '-1000.00'], [3, 'SUPPLEMENTARY', '1200.00']])
  const e200 = summary.employees.find(row => row.employeeId === 200)
  assert.deepEqual([e200.effectiveNet, e200.reversedNet, e200.supplementaryOpenNet, e200.settlementDifference], ['500.00', '0.00', '90.00', '0.00'])
  assert.equal(summary.totals.effectiveNet, '1700.00')
  assert.equal(summary.totals.settlementDifference, '200.00')
  assert.ok(!summary.runs.some(run => run.id === 9), 'مسير خارج السلسلة لا يدخل التقرير')

  // عكس معلق (لم يُنفّذ) لا يغيّر الصافي الفعلي
  const pending = corrections.summarizePayrollCorrections(1, runs.map(run => run.id === 2 ? { ...run, status: 'APPROVED' } : run), items,
    lines.map(line => line.id === 1 ? { ...line, status: 'PENDING' } : line))
  const p100 = pending.employees.find(row => row.employeeId === 100)
  assert.deepEqual([p100.reversedNet, p100.pendingReversalNet, p100.effectiveNet], ['0.00', '1000.00', '2200.00'])
})

test('شرط SQL للبند المعكوس: سطر منفذ للمسير والموظف، ويرفض أي تعبير غير عمود أو معامل', () => {
  const sql = payrollLineNotReversedSql('r.[id]', 'i.[employeeId]')
  assert.equal(sql, "NOT EXISTS (SELECT 1 FROM dbo.[payroll_run_reversal_lines] rvl WHERE rvl.[originalRunId]=r.[id] AND rvl.[employeeId]=i.[employeeId] AND rvl.[status]='POSTED')")
  assert.match(payrollLineNotReversedSql('r.id', '@2', 'rv2'), /rv2\.\[employeeId\]=@2/)
  for (const bad of ["1; DROP TABLE x", "r.id OR 1=1", "'x'", 'r.[id]]']) assert.throws(() => payrollLineNotReversedSql(bad, 'i.employeeId'), undefined, bad)
  assert.throws(() => payrollLineNotReversedSql('r.id', 'i.employeeId', 'x; --'))
})

// قارئ مزيف بصفوف القاعدة كما يعيدها الاستعلام
const fakeEm = rows => ({ query: async () => rows })
const row = (values) => ({ loanId: 1, employeeId: 5, dueDate: '2026-09-10', originalDueDate: '2026-09-10', amount: '1000.00', paidAmount: '0.00',
  paid: false, financialStatus: 'DUE', financialRevision: 1, parentInstallmentId: null, paidAt: null, ...values })

test('رصيد الأقساط: الأصل المستحق بعد العكس مع ابن ترحيل مُلغى (REVERSED) صالح بلا رصيد للابن', async () => {
  const positions = await readLoanInstallmentPositions(fakeEm([
    row({ id: 1, financialRevision: 3 }),
    row({ id: 2, dueDate: '2026-10-01', amount: '400.00', financialStatus: 'REVERSED', financialRevision: 2, parentInstallmentId: 1 }),
  ]), 5)
  assert.deepEqual(positions.map(p => [p.id, p.financialStatus, p.remainingAmount]), [[1, 'DUE', '1000.00'], [2, 'REVERSED', '0.00']])
})

test('رصيد الأقساط: ترحيل جديد بعد العكس يعيد تفعيل الابن نفسه؛ الابن المُلغى لا يُحتسب ابنًا حيًا، ويُرفض المُلغى بلا أصل أو المدفوع', async () => {
  // الأصل جزئي مجددًا وابنه الحي الوحيد مستحق بالباقي
  const again = await readLoanInstallmentPositions(fakeEm([
    row({ id: 1, financialStatus: 'PARTIAL', paidAmount: '600.00', financialRevision: 4 }),
    row({ id: 2, dueDate: '2026-10-01', amount: '400.00', financialStatus: 'DUE', financialRevision: 3, parentInstallmentId: 1 }),
  ]), 5)
  assert.equal(again[1].remainingAmount, '400.00')
  await assert.rejects(readLoanInstallmentPositions(fakeEm([row({ id: 3, financialStatus: 'REVERSED' })]), 5), /غير متسق/)
  await assert.rejects(readLoanInstallmentPositions(fakeEm([row({ id: 1 }), row({ id: 2, dueDate: '2026-10-01', financialStatus: 'REVERSED', paid: true, paidAmount: '1000.00', parentInstallmentId: 1 })]), 5), /غير متسق/)
  // الأصل الجزئي الذي ابنه الوحيد مُلغى غير متسق (دين بلا حامل)
  await assert.rejects(readLoanInstallmentPositions(fakeEm([
    row({ id: 1, financialStatus: 'PARTIAL', paidAmount: '600.00', financialRevision: 2 }),
    row({ id: 2, dueDate: '2026-10-01', amount: '400.00', financialStatus: 'REVERSED', financialRevision: 2, parentInstallmentId: 1 }),
  ]), 5), /غير متسق/)
})
