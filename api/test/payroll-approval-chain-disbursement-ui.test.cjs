// قرار المالك (22 سبتمبر) في الواجهة: شريط سلسلة الاعتماد على شاشة المسير، ومحرر السلسلة، و«مسيرات بانتظار اعتمادي»، وشاشة «صرف الرواتب».
// منطق الواجهة وReact SSR وفحص نصي للربط؛ لا SQL ولا خدمة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const chainApi = require('../../src/lib/payroll-approval-chain-api')
const disbursementApi = require('../../src/lib/payroll-disbursement-api')
const { PayrollApprovalChainStrip } = require('../../src/components/payroll/PayrollApprovalChainStrip')
const { PayrollChainEditor, movePayrollChainStep, payrollChainEditorChanged } = require('../../src/components/payroll/PayrollChainEditor')
const { PayrollDisbursementTotalsCards, PayrollDisbursementTable, PayrollDisbursementSummaryTable } = require('../../src/components/payroll/PayrollDisbursementBoard')
const { PayrollApprovalReviewTotals, PayrollApprovalReviewTable } = require('../../src/components/payroll/PayrollApprovalReviewTable')
const { pageTitleFor } = require('../../src/components/layout/pageTitles')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props))
const noop = () => undefined

const step = (order, label, status, approverName, approvedBy = null) => ({ order, label, kind: 'USER', status, approverName, approvedBy,
  approvedAt: approvedBy ? '2026-09-22T09:30:00.000Z' : null })
const chain = extra => ({ runId: 7, runName: 'مسير فرع المعادي', period: '2026-09', runStatus: 'CALCULATED', snapshotVersion: 2, governed: true, state: 'WAITING', source: 'RUN_SERIES',
  seriesName: 'مسير فرع المعادي', calculatedBy: { id: 3, name: 'منى — مسؤولة الرواتب' }, selfApprovalAllowed: false,
  steps: [step(1, 'مراجع', 'APPROVED', 'هشام', { id: 11, name: 'هشام' }), step(2, 'مراجع تاني', 'CURRENT', 'دينا'), step(3, 'المدير التنفيذي', 'PENDING', 'المدير التنفيذي')],
  currentStep: { order: 2, label: 'مراجع تاني', isFinal: false }, canAct: false, mine: false, blocked: null, stuckMessage: null, rejection: null, lastRejection: null, ...extra })

test('CHAIN-UI-01: الشريط يقول مين اعتمد ومين عليه الدور، ومسير بلا سلسلة مايعرضش حاجة', () => {
  assert.equal(render(PayrollApprovalChainStrip, { chain: chain({ governed: false, state: 'NONE', steps: [] }), busy: false, onApprove: noop, onReject: noop }), '')
  const html = render(PayrollApprovalChainStrip, { chain: chain(), busy: false, onApprove: noop, onReject: noop })
  for (const text of ['سلسلة اعتماد المسير', 'سلسلة خاصة بالمسير ده', 'الحساب — مسؤول الرواتب', 'منى — مسؤولة الرواتب', '1. مراجع', 'هشام', 'اعتمد ', '2. مراجع تاني', 'دينا', 'عليه الدور',
    '3. المدير التنفيذي — الاعتماد النهائي', 'بانتظار دينا — مراجع تاني (2 من 3)']) assert.ok(html.includes(text), text)
  assert.deepEqual([...html.matchAll(/data-chain-step="(\w+)"/g)].map(match => match[1]), ['APPROVED', 'CURRENT', 'PENDING'])
  assert.ok(!html.includes('data-chain-my-step'), 'أزرار القرار لصاحب الخطوة بس')
})

test('CHAIN-UI-02: صاحب الخطوة يشوف «اعتمد خطوتي» و«ارفض بسبب»؛ الممنوع بفصل المهام يشوف السبب والأزرار مقفولة', () => {
  const mine = render(PayrollApprovalChainStrip, { chain: chain({ mine: true, canAct: true }), busy: false, onApprove: noop, onReject: noop })
  for (const text of ['data-chain-my-step', 'الدور عليك: «مراجع تاني»', 'اعتمد خطوتي', 'ارفض بسبب']) assert.ok(mine.includes(text), text)
  assert.doesNotMatch(mine, /data-chain-approve=""[^>]*disabled|disabled=""[^>]*data-chain-approve/)
  const final = render(PayrollApprovalChainStrip, { chain: chain({ mine: true, canAct: true, currentStep: { order: 3, label: 'المدير التنفيذي', isFinal: true } }), busy: false, onApprove: noop, onReject: noop })
  assert.ok(final.includes('اعتمادك هو الاعتماد النهائي، وبعده القسائم تظهر للموظفين'))
  const blocked = render(PayrollApprovalChainStrip, { chain: chain({ mine: true, canAct: false, blocked: { code: 'PAYRUN-STATE-003', message: 'أنت من احتسب نسخة المسير دي' },
    stuckMessage: 'الخطوة الحالية باسم من احتسب المسير' }), busy: false, onApprove: noop, onReject: noop })
  for (const text of ['أنت من احتسب نسخة المسير دي', 'الخطوة الحالية باسم من احتسب المسير']) assert.ok(blocked.includes(text), text)
  assert.match(blocked, /<button[^>]*disabled=""[^>]*data-chain-approve/)
  const busy = render(PayrollApprovalChainStrip, { chain: chain({ mine: true, canAct: true }), busy: true, onApprove: noop, onReject: noop })
  assert.match(busy, /<button[^>]*disabled=""[^>]*data-chain-approve/)
})

test('CHAIN-UI-03: سبب الرفض ظاهر لمسؤول الرواتب، وبعد إعادة الحساب يفضل آخر رفض ظاهر كتاريخ', () => {
  const rejection = { stepOrder: 2, stepLabel: 'مراجع تاني', reason: 'غياب وليد محسوب غلط', by: { id: 12, name: 'دينا' }, at: '2026-09-22T10:00:00.000Z' }
  const returned = render(PayrollApprovalChainStrip, { chain: chain({ state: 'RETURNED', currentStep: null, rejection, lastRejection: { ...rejection, snapshotVersion: 2, current: true },
    steps: [step(1, 'مراجع', 'PENDING', 'هشام'), step(2, 'مراجع تاني', 'PENDING', 'دينا')] }), busy: false, onApprove: noop, onReject: noop })
  for (const text of ['data-chain-rejection', 'اترفض في خطوة «مراجع تاني» — دينا', 'السبب: غياب وليد محسوب غلط', 'إعادة حساب المسير', 'مرتجع لمسؤول الرواتب — رفضه دينا']) assert.ok(returned.includes(text), text)
  assert.ok(!returned.includes('data-chain-previous-rejection'))
  const after = render(PayrollApprovalChainStrip, { chain: chain({ lastRejection: { ...rejection, snapshotVersion: 1, current: false } }), busy: false, onApprove: noop, onReject: noop })
  for (const text of ['data-chain-previous-rejection', 'آخر رفض قبل إعادة الحساب (نسخة الحساب 1) — دينا: غياب وليد محسوب غلط']) assert.ok(after.includes(text), text)
  assert.ok(!after.includes('data-chain-rejection=""'))
  assert.equal(chainApi.payrollChainStateText(chain({ state: 'COMPLETED', currentStep: null })), 'اكتملت سلسلة الاعتماد (3 خطوات)')
  assert.equal(chainApi.payrollChainStateText(chain({ state: 'INACTIVE', currentStep: null })), 'السلسلة تبدأ بعد حساب المسير')
  assert.deepEqual([chainApi.payrollChainRejectReasonReady('لا'), chainApi.payrollChainRejectReasonReady('  راجعوا الحضور '), chainApi.payrollChainRejectReasonReady('ط'.repeat(501))], [false, true, false])
})

test('CHAIN-UI-04: محرر السلسلة — الخطوات بالترتيب باسم الشخص، بحث بالاسم أو الكود، ودور كبديل؛ والحفظ بيبعت الشخص أو الدور فقط', () => {
  const steps = [{ order: 1, kind: 'USER', userId: 11, roleCode: null, label: 'مراجع', approverName: 'هشام' },
    { order: 2, kind: 'ROLE', userId: null, roleCode: 'finance_manager', label: 'اعتماد المالية', approverName: 'المدير المالي' },
    { order: 3, kind: 'USER', userId: 1, roleCode: null, label: 'الاعتماد النهائي', approverName: 'المدير التنفيذي' }]
  const html = render(PayrollChainEditor, { steps, roles: [{ code: 'finance_manager', nameAr: 'المدير المالي' }], busy: false, emptyHint: 'الاعتماد بخطوة واحدة', clearLabel: 'الغِ السلسلة', onSave: noop })
  for (const text of ['مسؤول الرواتب يحسب المسير ← مراجع ← اعتماد المالية ← الاعتماد النهائي', 'هشام', 'شخص بعينه', 'المدير المالي', 'أي حد بيحمل الدور ده (في نطاق فرعه)',
    'دوّر بالاسم أو كود الموظف...', 'ضيف خطوة:', 'حفظ السلسلة', 'الغِ السلسلة', 'آخر خطوة هي الاعتماد النهائي']) assert.ok(html.includes(text), text)
  const empty = render(PayrollChainEditor, { steps: [], roles: [], busy: false, emptyHint: 'ماشي بسلسلة الشركة (2 خطوات)', clearLabel: 'شيل', onSave: noop })
  assert.ok(empty.includes('مسؤول الرواتب يحسب المسير ← ماشي بسلسلة الشركة (2 خطوات)')); assert.ok(!empty.includes('data-chain-clear'))
  const readOnly = render(PayrollChainEditor, { steps, roles: [], disabled: true, busy: false, emptyHint: '', clearLabel: '', onSave: noop })
  assert.ok(!readOnly.includes('data-chain-save') && !readOnly.includes('data-chain-editor-add'), 'حساب الفرع يقرأ سلسلة الشركة بس')
  assert.deepEqual(movePayrollChainStep(['a', 'b', 'c'], 0, 1), ['b', 'a', 'c']); assert.deepEqual(movePayrollChainStep(['a', 'b', 'c'], 2, -1), ['a', 'c', 'b'])
  assert.deepEqual(movePayrollChainStep(['a', 'b'], 0, -1), ['a', 'b']); assert.deepEqual(movePayrollChainStep(['a', 'b'], 1, 1), ['a', 'b'])
  assert.equal(payrollChainEditorChanged(steps, steps), false)
  assert.equal(payrollChainEditorChanged(steps, [steps[1], steps[0], steps[2]]), true)
  assert.equal(payrollChainEditorChanged(steps, steps.map(row => row.order === 1 ? { ...row, label: 'مراجعة أولى' } : row)), true)
  assert.deepEqual(chainApi.payrollChainStepsInput([...steps, { kind: 'USER', userId: 9, roleCode: null, label: '  ' }]),
    [{ kind: 'USER', userId: 11, label: 'مراجع' }, { kind: 'ROLE', roleCode: 'finance_manager', label: 'اعتماد المالية' }, { kind: 'USER', userId: 1, label: 'الاعتماد النهائي' }, { kind: 'USER', userId: 9 }])
})

test('CHAIN-UI-05: شاشة المسير — الشريط محمّل مع المسير، وزرار الاعتماد بخطوة واحدة مابيظهرش لمسير تحكمه سلسلة، وباقي الشاشة كما هي', () => {
  const page = read('src/app/payroll/page.tsx')
  for (const text of ['fetchPayrollRunChain(id)', 'const chainGoverned = chain?.governed === true', "runDetail.status === 'CALCULATED' && can('payroll.approve') && !chainGoverned && (",
    '<PayrollApprovalChainStrip', 'onApprove={handleChainApprove} onReject={handleChainReject}', 'approvePayrollChainStep(runDetail!.id)', 'rejectPayrollChainStep(runDetail!.id, reason)',
    "can('payroll.chain_manage') && <Link href=\"/payroll/approval-chain\"", '`/payroll/disbursement?runId=${runDetail.id}`', '|| approvalBlocked', 'await approvePayroll(runDetail.id)']) assert.ok(page.includes(text), text)
  // فشل تحميل السلسلة لا يوقف شاشة المسير
  assert.ok(page.includes('Promise.allSettled([fetchPayMethodReport(id), fetchPayrollRunLines(id), fetchPayrollRunChain(id)])'))
  const approvals = read('src/app/payroll/my-approvals/page.tsx')
  for (const text of ['<h1 className="text-2xl font-bold text-gray-800">مسيرات بانتظار اعتمادي</h1>', 'fetchMyPayrollApprovals()', 'fetchPayrollApprovalReview(runId)', '<PayrollApprovalChainStrip chain={review.chain}',
    'راجع المسير', 'مفيش مسيرات منتظرة اعتمادك دلوقتي.', '<PayrollApprovalReviewTotals totals={review.totals} />', '<PayrollApprovalReviewTable key={run.runId} rows={review.rows} />']) assert.ok(approvals.includes(text), text)
  const editor = read('src/app/payroll/approval-chain/page.tsx')
  for (const text of ['<h1 className="text-2xl font-bold text-gray-800">سلسلة اعتماد المسير</h1>', 'سلسلة الشركة', 'سلسلة خاصة بمسير دائم', 'savePayrollCompanyChain(steps, config.company.revision)',
    'savePayrollSeriesChain(series, steps, override?.revision ?? 0)', 'disabled={!config.canEditCompany}', '«إنشاء مسيرات الشهر الجديد» بينقلها معاه']) assert.ok(editor.includes(text), text)
  for (const file of ['src/app/payroll/my-approvals/page.tsx', 'src/app/payroll/approval-chain/page.tsx', 'src/app/payroll/disbursement/page.tsx', 'src/components/payroll/PayrollApprovalChainStrip.tsx',
    'src/components/payroll/PayrollChainEditor.tsx', 'src/components/payroll/PayrollDisbursementBoard.tsx', 'src/components/payroll/PayrollApprovalReviewTable.tsx']) assert.doesNotMatch(read(file), /\.toLocaleString\(|toFixed\(|Intl\.NumberFormat/, `${file}: المبالغ بـformatMoney فقط`)
})

test('DISB-UI-01: «صرف الرواتب» — الفلاتر والعلامة والتعليم الجماعي والإجماليات من الخادم، والتصدير بنفس الصفوف، وبلا حساب فلوس في المتصفح', () => {
  const page = read('src/app/payroll/disbursement/page.tsx')
  for (const text of ['<h1 className="text-2xl font-bold text-gray-800">صرف الرواتب</h1>', 'fetchDisbursementRuns()', 'fetchDisbursementView(id, next)', "new URLSearchParams(window.location.search).get('runId')",
    '<PayrollDisbursementTotalsCards totals={view.totals} />', '<PayrollDisbursementTable rows={view.rows} canMark={canMark} disabled={busy || loading} onToggle={toggle} />',
    '<PayrollDisbursementSummaryTable summary={summary} />',
    "['branchId', 'الفرع', 'كل الفروع', view.facets.branches]", "['departmentId', 'القسم', 'كل الأقسام', view.facets.departments]", "['teamId', 'الفريق', 'كل الفرق', view.facets.teams]",
    'طريقة الصرف', 'دوّر بالاسم أو الكود...', 'علّم المفلتر تم الصرف ({view.bulk.markPaid})', 'expectedCount', 'تصدير CSV',
    'disbursementCsvRows(view.rows)', "can('payroll.pay')", 'إقفال الصرف', 'closePayrollDisbursement(view.run.id', 'data-disbursement-unpaid-reason', 'ملخص صرف الشهر',
    'fetchDisbursementSummary({ period: summaryPeriod })', "const canMark = can('payroll.disburse')", 'view.counts.shown']) assert.ok(page.includes(text), text)
  // لا جمع ولا طرح على المبالغ في الشاشة: كل رقم معروض جاي من الخادم كما هو
  for (const file of ['src/app/payroll/disbursement/page.tsx', 'src/components/payroll/PayrollDisbursementBoard.tsx', 'src/components/payroll/PayrollApprovalReviewTable.tsx']) {
    assert.doesNotMatch(read(file), /\.reduce\(|sumMoney|netPay\s*[-+*/]|total\s*[-+*/]\s|bank\s*[-+]\s|cash\s*[-+]\s/, `${file}: بلا حساب فلوس في المتصفح`)
  }
  const filter ={ ...disbursementApi.emptyDisbursementFilter(), branchId: 2, payMethod: 'cash', search: '  نادر ' }
  assert.deepEqual(disbursementApi.disbursementFilterBody(filter), { branchId: 2, payMethod: 'cash', search: 'نادر' })
  assert.equal(disbursementApi.disbursementFilterCount(filter), 3); assert.equal(disbursementApi.disbursementFilterCount(disbursementApi.emptyDisbursementFilter()), 0)
  assert.deepEqual(disbursementApi.disbursementFilterBody(disbursementApi.emptyDisbursementFilter()), {})
  const row = { itemId: 1, employeeId: 1, employeeCode: 'E001', fullName: 'سامي', branchId: 1, branchName: 'فرع المعادي', departmentId: 2, departmentName: 'الحسابات', teamId: null, teamName: null,
    payMethod: 'mixed', payMethodLabel: 'نقدي + بنك', bankName: 'بنك أ', iban: 'SA01', netPay: 6000.5, bankAmount: 2000, cashAmount: 4000.5, issue: null, state: 'PAID', stateLabel: 'تم الصرف', tickable: true,
    markedBy: { id: 7, name: 'صلاح' }, markedAt: '2026-09-22T10:05:33.000Z', note: 'تحويل 88', settlement: null }
  assert.deepEqual(disbursementApi.disbursementCsvRows([row]), [['E001', 'سامي', 'فرع المعادي', 'الحسابات', '', 'نقدي + بنك', 'بنك أ', 'SA01', '6000.50', '2000.00', '4000.50', 'تم الصرف', 'صلاح', '2026-09-22 10:05', 'تحويل 88']])
  assert.equal(disbursementApi.DISBURSEMENT_CSV_HEADER.length, disbursementApi.disbursementCsvRows([row])[0].length)
  const bucket = (count, total, bank, cash) => ({ count, total, bank, cash })
  const totals = disbursementApi.disbursementCsvTotals({ paid: bucket(1, 6000.5, 2000, 4000.5), unpaid: bucket(2, 9000, 9000, 0), payable: bucket(3, 15000.5, 11000, 4000.5), settlement: { count: 0, total: 0 }, noAmount: 0, issues: 0 })
  assert.deepEqual(totals.map(line => [line[0], line[1], line[8], line[9], line[10]]), [['إجمالي «تم الصرف»', '1 موظف', '6000.50', '2000.00', '4000.50'], ['إجمالي «لم يتم»', '2 موظف', '9000.00', '9000.00', '0.00']])
  assert.deepEqual([disbursementApi.disbursementUnpaidReasonReady('لا'), disbursementApi.disbursementUnpaidReasonReady('راتبه موقوف')], [false, true])
  // إقفال الصرف = نفس نقطة صرف المسير (آثار الصرف مرة واحدة)، لا نقطة جديدة
  assert.ok(read('src/lib/payroll-disbursement-api.ts').includes('`/payroll/runs/${runId}/pay`'))
})

test('DISB-UI-02: جدول الصرف بالبيانات — خانة «تم الصرف» للصف القابل للتعليم لحامل payroll.disburse فقط، وصف التصفية والمقفول شارة بلا خانة، والإجماليات كما جت من الخادم', () => {
  const base = { branchId: 1, branchName: 'فرع المعادي', departmentId: 2, departmentName: 'الحسابات', teamId: 5, teamName: 'الخزينة', bankName: 'بنك أ', iban: 'SA01', issue: null,
    markedBy: null, markedAt: null, note: null, settlement: null }
  const rows = [
    { ...base, itemId: 1, employeeId: 1, employeeCode: 'E001', fullName: 'سامي التحويل', payMethod: 'transfer', payMethodLabel: 'تحويل بنكي', netPay: 6000, bankAmount: 6000, cashAmount: 0,
      state: 'PAID', stateLabel: 'تم الصرف', tickable: true, markedBy: { id: 7, name: 'صلاح' }, markedAt: '2026-09-22T10:05:00.000Z', note: 'تحويل رقم 88' },
    { ...base, itemId: 2, employeeId: 2, employeeCode: 'E002', fullName: 'نادر النقدي', payMethod: 'cash', payMethodLabel: 'نقدي', bankName: null, iban: null, netPay: 1234.567, bankAmount: 0, cashAmount: 1234.56,
      state: 'UNPAID', stateLabel: 'لم يتم', tickable: true, issue: 'مبلغ بنكي بدون آيبان — اكتب الآيبان في ملف الموظف' },
    { ...base, itemId: 3, employeeId: 3, employeeCode: 'E003', fullName: 'رامي المنتهية خدمته', payMethod: 'settlement', payMethodLabel: 'مصروف مع التصفية', netPay: 2400, bankAmount: 0, cashAmount: 0,
      state: 'SETTLEMENT', stateLabel: 'مصروف مع التصفية', tickable: false, settlement: { caseId: 9, lastWorkingDay: '2026-08-10' } },
  ]
  const html = render(PayrollDisbursementTable, { rows, canMark: true, disabled: false, onToggle: noop })
  assert.deepEqual([...html.matchAll(/data-disbursement-row="(\w+)"/g)].map(match => match[1]), ['PAID', 'UNPAID', 'SETTLEMENT'])
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 2, 'خانتان: المصروف وغير المصروف — صف التصفية بلا خانة')
  assert.equal((html.match(/checked=""/g) ?? []).length, 1)
  for (const text of ['aria-label="تم الصرف — سامي التحويل"', 'صلاح', 'تحويل رقم 88', '6,000.00', '1,234.56', 'الحسابات / الخزينة', 'آخر يوم عمل 2026-08-10 — راتبه مع التصفية',
    'مبلغ بنكي بدون آيبان — اكتب الآيبان في ملف الموظف']) assert.ok(html.includes(text), text)
  // قارئ بلا payroll.disburse: شارات فقط
  assert.equal((render(PayrollDisbursementTable, { rows, canMark: false, disabled: false, onToggle: noop }).match(/type="checkbox"/g) ?? []).length, 0)
  assert.match(render(PayrollDisbursementTable, { rows, canMark: true, disabled: true, onToggle: noop }), /<input[^>]*disabled=""/)
  assert.ok(render(PayrollDisbursementTable, { rows: [], canMark: true, disabled: false, onToggle: noop }).includes('مفيش موظفين بالفلاتر دي'))
  const bucket = (count, total, bank, cash) => ({ count, total, bank, cash })
  const totals = { paid: bucket(1, 6000, 6000, 0), unpaid: bucket(1, 1234.56, 0, 1234.56), payable: bucket(2, 7234.56, 6000, 1234.56), settlement: { count: 1, total: 2400 }, noAmount: 2, issues: 1 }
  const cards = render(PayrollDisbursementTotalsCards, { totals })
  for (const text of ['تم الصرف', 'لم يتم', 'المستحق للصرف', 'مصروف مع التصفية', '6,000.00', '1,234.56', '7,234.56', '2,400.00', '1 موظف — برّه الصرف هنا', '2 بلا مبلغ']) assert.ok(cards.includes(text), text)
  const run = { id: 7, name: 'مسير فرع المعادي', period: '2026-08', startDate: '2026-07-23', endDate: '2026-08-22', status: 'PAID', runType: 'REGULAR', mode: 'PER_EMPLOYEE', marking: 'LATE_ONLY', closed: null,
    unpaidReason: 'في إجازة؛ يتسلم عند الرجوع', ...totals }
  const summary = render(PayrollDisbursementSummaryTable, { summary: { period: '2026-08', runId: null, runs: [run], totals } })
  for (const text of ['مسير فرع المعادي', 'مصروف — الصرف موظف بموظف', 'في إجازة؛ يتسلم عند الرجوع', 'إجمالي الشهر', '6,000.00 / 0.00', '0.00 / 1,234.56']) assert.ok(summary.includes(text), text)
})

test('CHAIN-UI-06: مراجعة المعتمد — إجماليات المسير وموظفوه ببنودهم، والصافي السالب ظاهر قبل الاعتماد النهائي', () => {
  const rows = [
    { itemId: 1, employeeId: 1, employeeCode: 'E001', fullName: 'وليد الإضافي', branchName: 'فرع المعادي', departmentName: 'التشغيل', teamName: null, earnings: 6050, deductions: 500, net: 5550,
      earningLines: [{ key: 'BASIC', name: 'الأساسي', amount: 6000 }, { key: 'OVERTIME', name: 'الإضافي', amount: 50 }], deductionLines: [{ key: 'LOAN', name: 'السلف', amount: 500 }], settlementPayout: false },
    { itemId: 2, employeeId: 2, employeeCode: 'E002', fullName: 'رامي', branchName: 'فرع المعادي', departmentName: null, teamName: null, earnings: 100, deductions: 300, net: -200,
      earningLines: [], deductionLines: [], settlementPayout: true },
  ]
  const closed = render(PayrollApprovalReviewTable, { rows })
  for (const text of ['E001', 'وليد الإضافي', 'فرع المعادي — التشغيل', '6,050.00', '500.00', '5,550.00', 'مصروف مع التصفية', '-200.00', 'البنود']) assert.ok(closed.includes(text), text)
  assert.ok(!closed.includes('الأساسي 6,000.00'), 'البنود مقفولة لحد ما المعتمد يفتحها')
  assert.equal((closed.match(/class="bg-red-50"/g) ?? []).length, 1, 'الصافي السالب مظلل')
  const open = render(PayrollApprovalReviewTable, { rows, initialOpenItemId: 1 })
  for (const text of ['الاستحقاقات: ', 'الأساسي 6,000.00 • الإضافي 50.00', 'الاستقطاعات: ', 'السلف 500.00', 'اقفل البنود']) assert.ok(open.includes(text), text)
  const totals = render(PayrollApprovalReviewTotals, { totals: { employees: 2, earnings: 6150, deductions: 800, net: 5350, negativeNet: 1 } })
  for (const text of ['6,150.00', '800.00', '5,350.00', 'صافي 1 موظف سالب — الاعتماد النهائي هيترفض']) assert.ok(totals.includes(text), text)
  assert.ok(!render(PayrollApprovalReviewTotals, { totals: { employees: 1, earnings: 1, deductions: 0, net: 1, negativeNet: 0 } }).includes('role="alert"'))
})

test('NAV-01: الشاشات التلاتة ليها اسم واحد في القائمة والهيدر والجسم، ومفتوحة لأصحابها حتى بلا payroll.view', () => {
  assert.equal(pageTitleFor('/payroll/approval-chain'), 'سلسلة اعتماد المسير')
  assert.equal(pageTitleFor('/payroll/my-approvals'), 'مسيرات بانتظار اعتمادي')
  assert.equal(pageTitleFor('/payroll/disbursement'), 'صرف الرواتب')
  assert.equal(pageTitleFor('/payroll'), 'مسير الرواتب')
  const sidebar = read('src/components/layout/Sidebar.tsx')
  for (const text of ["{ label: 'سلسلة اعتماد المسير', href: '/payroll/approval-chain', perm: 'payroll.chain_manage' }", "href: '/payroll/disbursement',\n    perm: 'payroll.disburse',",
    "label: 'مسيرات بانتظار اعتمادي',", "href: '/payroll/my-approvals',", 'payrollApprovals > 0', 'fetchMyPayrollApprovalsCount()', "{ label: 'كشف البنوك', href: '/payroll/bank-sheet' }"]) assert.ok(sidebar.includes(text), text)
  const layout = read('src/components/layout/MainLayout.tsx')
  for (const text of ["['/payroll/my-approvals', null],", "['/payroll/disbursement', null],", "['/payroll/approval-chain', 'payroll.chain_manage'],"]) assert.ok(layout.includes(text), text)
  assert.ok(layout.indexOf("['/payroll/my-approvals', null]") < layout.indexOf("['/payroll', 'payroll.view']"), 'الأكثر تحديدًا قبل /payroll')
})
