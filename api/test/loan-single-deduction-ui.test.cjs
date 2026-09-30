// قرار المالك 30 سبتمبر — واجهة البندين:
// (2) السلفة العادية بتتخصم مرة واحدة: خانة عدد الأشهر اختفت من «سلفي» و«السلف والقروض» ونموذج «طلب سلفة» في «طلباتي»،
//     والطلب بيتبعت بشهر واحد؛ زرار «سلفة استثنائية» (loans.exceptional) بيفتح نافذتها بمنتقي الموظف الموحّد؛
//     نوع السلفة ظاهر في القوائم والتفاصيل؛ و«سلفي» بتشتغل على عرض الموبايل (~390px).
// (3) تنبيه «أيام العمل»: قاعدة «إجازة/راحة» على يوم هو أصلًا راحة (والعكس) — تنبيه بس ومابيمنعش الحفظ.
// منطق الواجهة الصافي وفحص نصي للربط؛ لا SQL ولا خدمة. (الملفات على القرص CRLF — تُطبّع قبل الفحص)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
require('../node_modules/reflect-metadata')
const loansUi = require('../../src/lib/loans-api')
const warning = require('../../src/lib/work-day-rule-warning')
const { LOAN_REQUEST_CLIENT_FIELDS, REGULAR_LOAN_SINGLE_DEDUCTION } = require('../src/loans/loan-request-caps')
const { LOAN_EXCEPTIONAL_CATEGORIES } = require('../src/loans/loan-caps')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

test('loan kind labels: «سلفة استثنائية — N قسط», «سلفة (مرة واحدة)», and an old regular loan keeps its installment count', () => {
  assert.equal(loansUi.REGULAR_LOAN_SINGLE_DEDUCTION_NOTE, 'بتتخصم مرة واحدة من مسير الشهر اللي بعد الاعتماد')
  assert.equal(loansUi.loanKindLabel(true, 4), 'سلفة استثنائية — 4 قسط')
  assert.equal(loansUi.loanKindLabel(true, '12'), 'سلفة استثنائية — 12 قسط')
  assert.equal(loansUi.loanKindLabel(true, null), 'سلفة استثنائية — 1 قسط')
  assert.equal(loansUi.loanKindLabel(false, 1), 'سلفة (مرة واحدة)')
  assert.equal(loansUi.loanKindLabel(null, undefined), 'سلفة (مرة واحدة)')
  assert.equal(loansUi.loanKindLabel(false, 0), 'سلفة (مرة واحدة)', 'no installments recorded yet = one deduction')
  assert.equal(loansUi.loanKindLabel(false, 3), 'سلفة — 3 قسط', 'a regular loan from before the decision keeps its schedule')
  assert.equal(loansUi.loanRequestKindLabel(JSON.stringify({ amount: '500.00', months: 1 })), 'سلفة (مرة واحدة)')
  assert.equal(loansUi.loanRequestKindLabel(JSON.stringify({ amount: '500.00' })), 'سلفة (مرة واحدة)', 'a missing month is one deduction, like the server')
  assert.equal(loansUi.loanRequestKindLabel(JSON.stringify({ amount: '1200.00', months: 4, exceptional: true })), 'سلفة استثنائية — 4 قسط')
  assert.equal(loansUi.loanRequestKindLabel('{bad'), null)
  assert.equal(loansUi.loanRequestKindLabel('[]'), null)
  // نفس رسالة الخادم بالحرف
  assert.equal(REGULAR_LOAN_SINGLE_DEDUCTION, 'السلفة العادية بتتخصم مرة واحدة؛ التقسيط للسلفة الاستثنائية بس')
})

test('«سلفي»: no months input, the request is one month, the note is shown, and the list works at phone width (cards under md, the table from md)', () => {
  const page = read('src/app/my/loans/page.tsx')
  for (const gone of ['my-loan-months', 'عدد أشهر السداد', 'setMonths', 'monthsValid']) assert.ok(!page.includes(gone), gone)
  for (const text of ["createRequest('LOAN', { amount: amount.trim(), months: 1 })", 'fetchLoanCapPreview({ amount: loanMoneyInputValid(amount) ? amount.trim() : undefined })',
    '{REGULAR_LOAN_SINGLE_DEDUCTION_NOTE}', 'disabled={submitting || !loanMoneyInputValid(amount) || (preview !== null && !preview.allowed) || preview?.requestWindow?.open === false}',
    // الموبايل: العنوان والزرار بيلفّوا، وكارت لكل سلفة بدل الجدول العريض، والجدول من md
    '<div className="flex flex-wrap items-center justify-between gap-3">', '<ul className="md:hidden divide-y divide-gray-100" data-testid="my-loans-cards">',
    '<div className="hidden md:block overflow-x-auto">', '<dl className="grid grid-cols-3 gap-2 text-center">', 'aria-expanded={expanded === loan.id}',
    'max-w-lg p-4 sm:p-6', '{loanKind(loan)}']) {
    assert.ok(page.includes(text), text)
  }
  assert.equal((page.match(/\{loanKind\(loan\)\}/g) || []).length, 2, 'the loan kind shows on the card and in the table')
  assert.ok(page.includes('const loanKind = (loan: LoanLedger) => loanKindLabel(loan.isExceptional, loan.installmentMonths ?? loan.installments.filter(row => row.parentInstallmentId === null).length)'))
})

test('«السلف والقروض»: the new-loan form has no months and sends one month; «سلفة استثنائية» is behind loans.exceptional, opens its modal and refreshes the list', () => {
  const page = read('src/app/payroll/loans/page.tsx')
  for (const gone of ['عدد أشهر السداد', 'loanMonths', 'setLoanMonths', 'يحدد الموظف المبلغ وعدد الأشهر']) assert.ok(!page.includes(gone), gone)
  for (const text of ["import { LoanExceptionalModal } from '@/components/payroll/LoanExceptionalModal'", "setCanExceptional(can('loans.exceptional'))",
    '{canExceptional && (', 'onClick={() => setShowExceptionalModal(true)}', 'سلفة استثنائية\n',
    '{showExceptionalModal && canExceptional && (\n        <LoanExceptionalModal currency={currency} onClose={() => setShowExceptionalModal(false)} onDone={loadLoans} />',
    '        amount: loanAmount,\n        months: 1,\n', '{REGULAR_LOAN_SINGLE_DEDUCTION_NOTE}',
    'fetchLoanCapPreview({ employeeId: targetEmployeeId, amount: loanMoneyInputValid(loanAmount) ? loanAmount.trim() : undefined })',
    'disabled={submitting || !loanAmount || !targetEmployeeId || newLoanCap?.requestWindow?.open === false || (newLoanCap !== null && !newLoanCap.allowed)}',
    '{loanKind(loan)}', 'isExceptional?: boolean | null', 'installmentMonths?: number | null']) {
    assert.ok(page.includes(text), text)
  }
  // الخادم بيرجّع نوع السلفة وعدد أقساطها في القائمة
  const api = read('api/src/assets/employee-extras.controller.ts')
  assert.ok(api.includes(".addSelect('loan.isExceptional', 'isExceptional').addSelect('loan.installmentMonths', 'installmentMonths')"))
  assert.ok(api.includes('isExceptional: loan.isExceptional === true || loan.isExceptional === 1,'))
})

test('the exceptional loan modal: the shared employee picker (not a select), no self-loan, and a payload the server accepts', () => {
  const modal = read('src/components/payroll/LoanExceptionalModal.tsx')
  assert.ok(modal.includes("import { EmployeePicker } from '@/components/EmployeePicker'"))
  assert.ok(modal.includes('<EmployeePicker id="exc-employee" employees={employees} value={employeeId} onChange={(id) => setEmployeeId(id)}'))
  assert.ok(modal.includes('filter={(row) => row.id !== selfEmployeeId} disabled={busy || !!success} required />'))
  assert.ok(!modal.includes('<select id="exc-employee"') && !modal.includes('<option value="">اختر الموظف</option>'))
  assert.ok(modal.includes('<label className="label" htmlFor="exc-employee">الموظف *</label>'), 'the label still points at the picker input')
  // نفس مفاتيح الخادم (LOAN_REQUEST_CLIENT_FIELDS + السبب) ونفس تصنيفاته
  const call = modal.slice(modal.indexOf("createRequest('LOAN', {"), modal.indexOf('true, Number(employeeId))'))
  const keys = [...call.matchAll(/(\w+):/g)].map(match => match[1])
  assert.deepEqual([...new Set(keys)].sort(), [...LOAN_REQUEST_CLIENT_FIELDS, 'reason'].sort())
  assert.ok(call.includes('exceptional: true'))
  assert.deepEqual(Object.keys(loansUi.LOAN_EXCEPTIONAL_CATEGORY_LABELS).sort(), [...LOAN_EXCEPTIONAL_CATEGORIES].sort())
  assert.ok(modal.includes("request.status === 'COMPLETED'"), 'an instant HR approval says the loan is already recorded')
})

test('«طلباتي»: the regular loan form hides the months field, shows the note and always sends one month; a returned exceptional loan keeps its months', () => {
  const page = read('src/app/requests/page.tsx')
  for (const text of ["import { loanRequestKindLabel, REGULAR_LOAN_SINGLE_DEDUCTION_NOTE } from '@/lib/loans-api'",
    "const isLoanCapType = (type?: { code: string; destinationHandler?: string | null } | null) =>\n  !!type && type.destinationHandler === 'loans_installments' && type.code !== 'EARLY_LOAN_SETTLEMENT'",
    'const isRegularLoanForm = isLoanCapType(selectedTypeDef) && parseJson<Record<string, unknown>>(editingRequest?.payload, {}).exceptional !== true',
    ".filter(f => !isRegularLoanForm || f.key !== 'months').map((f) => (", ".filter(f => !isRegularLoanForm || f !== 'months').map((f) => (",
    'if (isRegularLoanForm) payload.months = 1', '{selectedType && isRegularLoanForm && (', '<span>{REGULAR_LOAN_SINGLE_DEDUCTION_NOTE}</span>',
    '{loanRequestKindLabel(requestDetail.payload)}']) {
    assert.ok(page.includes(text), text)
  }
  // الشهر الواحد بيتكتب بعد بناء الحمولة من الحقول (فخانة شهور مخفية أو قيمة قديمة مُرجَعة مابتعدّيش)
  assert.ok(page.indexOf('if (isRegularLoanForm) payload.months = 1') > page.indexOf("payload[f] = isNumberField(f) && raw !== '' ? Number(raw) : raw"))
  // الخادم: عدد الأشهر مش إلزامي لنوع السلفة (الغايب = 1) والأكتر من شهر للاستثنائية بس
  const service = read('api/src/requests/requests.service.ts')
  assert.ok(service.includes("if (isLoanCapRequestType(type)) return required.filter(key => key !== 'months')"))
  const caps = read('api/src/loans/loan-request-caps.ts')
  assert.ok(caps.includes("if (!exceptional && schedule.months !== 1) throw new BadRequestException({ code: 'LOAN_REGULAR_SINGLE_DEDUCTION', message: REGULAR_LOAN_SINGLE_DEDUCTION })"))
})

test('approvals and request details show the loan kind; the caps panel no longer asks for the max installment months but keeps the saved value', () => {
  const inbox = read('src/app/approvals-inbox/page.tsx')
  assert.ok(inbox.includes('{loanKindLabel(loanReview.exceptional, loanReview.months)}'))
  assert.ok(!inbox.includes('على {loanReview.months} شهر'))
  assert.equal((inbox.match(/\{loanRequestKindLabel\(detail\.payload\)\}/g) || []).length, 2, 'details window and the reject/return window')
  const panel = read('src/components/payroll/LoanCapPoliciesPanel.tsx')
  assert.ok(!panel.includes('>أقصى أشهر للتقسيط</label>') && !panel.includes('id="cap-max-months"') && !panel.includes('set({ maxInstallmentMonths'))
  assert.ok(panel.includes("maxInstallmentMonths: base.maxInstallmentMonths ?? ''"), 'a new version keeps the stored value')
  assert.ok(panel.includes('maxInstallmentMonths: blankToNull(form.maxInstallmentMonths) as string | null'))
})

test('work-days warning: an «إجازة/راحة» rule on a day that is already a rest day, and the mirror «دوام» on a working day; unknown weekend = no warning', () => {
  assert.equal(warning.OFF_RULE_ON_REST_DAY_WARNING, 'اليوم ده أصلًا راحة في الجدول ده — القاعدة مش هتفرق. قصدك «دوام»؟')
  const weekend = warning.weekendCodes('FRI,SAT')
  assert.deepEqual(weekend, ['FRI', 'SAT'])
  assert.equal(warning.workDayRuleWarning('OFF', 'SAT', weekend), warning.OFF_RULE_ON_REST_DAY_WARNING)
  assert.equal(warning.workDayRuleWarning('OFF', 'sat', weekend), warning.OFF_RULE_ON_REST_DAY_WARNING, 'weekday case does not matter')
  assert.equal(warning.workDayRuleWarning('OFF', 'MON', weekend), null)
  assert.equal(warning.workDayRuleWarning('WORK', 'SAT', weekend), null)
  assert.equal(warning.workDayRuleWarning('WORK', 'MON', weekend), 'اليوم ده أصلًا دوام في الجدول ده — القاعدة مش هتفرق. قصدك «راحة»؟')
  assert.equal(warning.workDayRuleWarning('WORK', 'MON', weekend, 'إجازة'), 'اليوم ده أصلًا دوام في الجدول ده — القاعدة مش هتفرق. قصدك «إجازة»؟')
  assert.equal(warning.workDayRuleWarning('OFF', 'SAT', null), null)
  // جدول بدوام 7 أيام (نص فاضي) = مفيش راحة؛ الفرع الفاضي بيورث العام
  assert.deepEqual(warning.weekendCodes(''), [])
  assert.equal(warning.workDayRuleWarning('WORK', 'FRI', warning.weekendCodes('')), 'اليوم ده أصلًا دوام في الجدول ده — القاعدة مش هتفرق. قصدك «راحة»؟')
  assert.equal(warning.weekendCodes(null), null)
  assert.equal(warning.branchWeekendCodes(''), null); assert.equal(warning.branchWeekendCodes(null), null)
  assert.deepEqual(warning.branchWeekendCodes('FRI'), ['FRI'])
  assert.deepEqual(warning.effectiveWeekend(null, ['FRI', 'SAT']), ['FRI', 'SAT'], 'an inheriting branch uses the global weekend')
  assert.deepEqual(warning.effectiveWeekend(['SUN'], ['FRI', 'SAT']), ['SUN'], 'the branch weekend wins')
  assert.equal(warning.effectiveWeekend(null, null), null)
})

test('work-days wiring: the schedule exceptions list warns against the weekend on screen, and the rule modal against the branch or global weekend — warning only, saving stays enabled', () => {
  const page = read('src/app/settings/work-days/page.tsx')
  for (const text of ["import { branchWeekendCodes, effectiveWeekend, weekendCodes, workDayRuleWarning } from '@/lib/work-day-rule-warning'",
    'currentOffDays={offDays}', 'const warning = workDayRuleWarning(rule.effect, rule.weekday, currentOffDays)',
    '{warning && <p role="status" className="flex items-start gap-1.5 text-xs text-amber-800 mt-1" data-testid="schedule-exception-warning">',
    'const branchWeekend = branchId ? branchWeekendCodes(branches.find(branch => branch.id === Number(branchId))?.weekendDays) : null',
    "const globalCalendar = useCalendarContext('GLOBAL', 0, !!branchId && !branchWeekend)",
    "const ruleWarning = workDayRuleWarning(effect, weekday, effectiveWeekend(branchWeekend, typeof globalWeekendText === 'string' ? weekendCodes(globalWeekendText) : null), 'إجازة')",
    '{ruleWarning && (']) {
    assert.ok(page.includes(text), text)
  }
  // تنبيه بس: زراري الحفظ مابيقروش التنبيه
  const saveExceptions = page.slice(page.indexOf('{dirty && (\n        <button type="button" disabled={busy || daysDirty} onClick={onSave}'))
  assert.ok(saveExceptions.length > 0 && !saveExceptions.slice(0, 200).includes('warning'))
  assert.ok(page.includes('disabled={saving || !calendar.context || calendar.context.currentMatchesHistory === false}\n            className="flex-1 btn-primary'))
  assert.doesNotMatch(page, /disabled=\{[^}]*ruleWarning/)
})
