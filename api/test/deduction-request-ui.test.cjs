// كارت «خصم» في شاشة «الطلبات»: نموذج طلب حقيقي داخل الشاشة، مربوط بكتالوج «أنواع الخصومات» —
// النوع يحدد وحدة القيمة وخطوتها (ربع يوم)، والمرفق الإجباري، والتقسيط، وسلسلة الاعتماد حتى الموارد البشرية،
// والإرسال يمر بنقطة الإنشاء الفردي نفسها (POST /deductions) لا بمحرك الطلبات العام.
// منطق الواجهة ونصوصها فقط؛ لا SQL ولا خدمة. (الملفات على القرص CRLF — تُطبّع قبل الفحص)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const ui = require('../../src/lib/deductions-api')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

const typeOf = (calcMethod, valueStep = null) => ({ calcMethod, valueStep })
const quarterDay = typeOf('DAYS_OF_SALARY', '0.2500')

test('the value field speaks the type language: fixed amount, a fraction of a day, hours, or a percentage', () => {
  assert.equal(ui.deductionValueHint(quarterDay), 'أيام من الراتب — ربع يوم (مضاعفات 0.25)')
  assert.equal(ui.deductionValueHint(typeOf('DAYS_OF_SALARY', '0.5')), 'أيام من الراتب — نصف يوم (مضاعفات 0.5)')
  assert.equal(ui.deductionValueHint(typeOf('DAYS_OF_SALARY', '1')), 'أيام من الراتب — يوم كامل (مضاعفات 1)')
  assert.equal(ui.deductionValueHint(typeOf('DAYS_OF_SALARY', null)), 'أيام من الراتب')
  assert.equal(ui.deductionValueHint(typeOf('HOURS_OF_SALARY', '0.25')), 'ساعات من الراتب — ربع ساعة (مضاعفات 0.25)')
  assert.equal(ui.deductionValueHint(typeOf('HOURS_OF_SALARY', '1')), 'ساعات من الراتب — ساعة كاملة (مضاعفات 1)')
  assert.equal(ui.deductionValueHint(typeOf('FIXED_AMOUNT')), 'مبلغ ثابت — بمنزلتين عشريتين على الأكثر')
  assert.equal(ui.deductionValueHint(typeOf('PERCENT_OF_BASE')), 'نسبة من الأساسي — النسبة من 0 إلى 100')
  assert.equal(ui.deductionValueHint(typeOf('PERCENT_OF_GROSS')), 'نسبة من إجمالي الراتب — النسبة من 0 إلى 100')
  assert.equal(ui.deductionValueHint(null), '')
  // خطوة حقل الإدخال نفسها من النوع لا من الشاشة
  assert.equal(ui.deductionValueStep(quarterDay), '0.25')
  assert.equal(ui.deductionValueStep(typeOf('FIXED_AMOUNT')), '0.01')
  assert.equal(ui.deductionValueStep(typeOf('PERCENT_OF_GROSS')), 'any')
})

test('the quarter-day step is checked before sending, exactly as the server checks it (DEDUCTION_STEP_INVALID)', () => {
  for (const value of ['0.25', '0.5', '0.75', '1', '2.25', '10']) assert.equal(ui.deductionStepError(quarterDay, value), null, value)
  for (const value of ['0.3', '1.1', '0.2']) assert.ok(ui.deductionStepError(quarterDay, value), value)
  assert.match(ui.deductionStepError(quarterDay, '0.3'), /ليست من مضاعفات 0\.25/)
  // بلا خطوة أو طريقة غير زمنية: لا فحص خطوة في الواجهة
  assert.equal(ui.deductionStepError(typeOf('DAYS_OF_SALARY', null), '0.3'), null)
  assert.equal(ui.deductionStepError(typeOf('FIXED_AMOUNT'), '10.33'), null)
  assert.equal(ui.deductionStepError(typeOf('PERCENT_OF_GROSS'), '7.5'), null)
  assert.equal(ui.deductionStepError(null, '0.3'), null)
})

test('the same input check as the payroll screen: type, positive value, reason length, target payroll month, required attachment', () => {
  const valid = { deductionTypeId: 3, inputValue: '0.25', incidentDate: '2026-09-21', reason: 'تأخير متكرر عن بداية الوردية خلال الأسبوع', targetPeriod: '2026-09' }
  assert.equal(ui.deductionInputError(valid, 20, quarterDay), null)
  assert.equal(ui.deductionInputError({ ...valid, deductionTypeId: 0 }, 20, quarterDay), 'اختر نوع الخصم من الكتالوج.')
  assert.equal(ui.deductionInputError({ ...valid, inputValue: '0' }, 20, quarterDay), 'اكتب قيمة موجبة للخصم.')
  assert.equal(ui.deductionInputError({ ...valid, reason: 'قصير' }, 20, quarterDay), 'اكتب سبب الخصم (20 حرفًا على الأقل).')
  assert.equal(ui.deductionInputError({ ...valid, targetPeriod: '2026-13' }, 20, quarterDay), 'حدد شهر المسير المستهدف.')
  assert.equal(ui.deductionInputError(valid, 20, { ...quarterDay, requiresAttachment: true }), 'هذا النوع يتطلب مرجع مستند أو مرفق.')
})

test('the requests screen opens the deduction form inline — no navigation, and the generic engine fields stay out of its way', () => {
  const page = read('src/app/requests/page.tsx')
  assert.ok(page.includes("import DeductionRequestForm from '@/components/requests/DeductionRequestForm'"))
  assert.ok(page.includes("const isPayrollDeduction = selectedTypeDef?.code === 'PAYROLL_DEDUCTION'"))
  assert.ok(page.includes('{selectedType && isPayrollDeduction && <DeductionRequestForm onSubmitted={load} />}'), 'the card opens the form in place')
  // لا انتقال: كارت الخصم لم يعد يوجّه لشاشة الخصومات ولا لخصوماتي
  assert.ok(!page.includes("if (code === 'PAYROLL_DEDUCTION')"), 'no route for the deduction card')
  assert.ok(!page.includes("'/my/deductions?tab=create'"), 'the deduction card no longer navigates away')
  // حقول المحرك العام وزر إرساله العام لا يظهران مع الخصم ولا مع المكافأة (لكل منهما زره داخل نموذجه)
  assert.ok(page.includes('const isPayrollBonus = selectedTypeDef?.code === \'PAYROLL_BONUS\''))
  assert.ok(page.includes('const isMoneyRequest = isPayrollDeduction || isPayrollBonus'))
  assert.ok(page.includes('{selectedType && hasCustomFields && !isCustodyRequest && !isLeaveCancel && !isMoneyRequest && ('))
  assert.ok(page.includes('{selectedType && !isMoneyRequest && (\n                  <div>\n                    <label className="block text-sm font-medium text-gray-700 mb-2">\n                      تفاصيل الطلب'))
  assert.ok(page.includes('{!isMoneyRequest && (\n                <button\n                  onClick={handleSubmit}'))
  // كارت «مكافأة» بقى زيه: نموذج داخل الشاشة لا انتقال (bonus-request-ui.test.cjs)
  assert.ok(page.includes('{selectedType && isPayrollBonus && <BonusRequestForm onSubmitted={load} />}'))
  assert.ok(!page.includes("if (code === 'PAYROLL_BONUS')"), 'no route for the bonus card either')
})

test('the form is bound to the deduction catalog: allowed types, the type value unit, target month, reason counter, attachment, instalments, and a live amount preview', () => {
  const form = read('src/components/requests/DeductionRequestForm.tsx')
  for (const text of [
    // الأنواع المسموح للمستخدم بإنشائها والموظفون في نطاقه — من الخادم لا من الشاشة
    'fetchDeductionCreatable()', 'fetchDeductionCandidates(typeId)',
    'نوع الخصم', 'DEDUCTION_METHOD_UNIT[type.calcMethod]', 'deductionValueHint(type)', 'step={deductionValueStep(type)}',
    // شهر المسير المستهدف بنفس دلالة شاشة الخصومات وتلميح دورة المسير
    'شهر المسير المستهدف', 'الشهر الحالي للمسير: {creatable.currentPeriod} (الدورة تبدأ يوم {creatable.cycleStartDay})',
    // السبب بحد الخادم وعدّاد ظاهر
    '({creatable.reasonMinLength} حرفًا على الأقل — {form.reason.trim().length})',
    // المرفق حيث يشترطه النوع، والأقساط حيث يسمح بها
    '{type.requiresAttachment && (', '{type.installmentAllowed && (', 'type.maxInstallments',
    // المعاينة الحيّة من نقطة معاينة الخصومات نفسها — موظف واحد كمجموعة من واحد
    "previewDeductions(input, { mode: 'EMPLOYEES', ids: [Number(employeeId)], excludeEmployeeIds: [] })",
    'المبلغ المحسوب', 'formatDeductionMoney(row.amount)',
    // الإرسال بنقطة الإنشاء الفردي: سلسلة النوع ثم الموارد البشرية ثم الخصم في شهر المسير
    'createDeduction({ ...input, employeeId: Number(employeeId) })', 'أُرسل طلب الخصم #${created.id}',
    // التكرار يُؤكَّد بدل الفشل الصامت، ورسالة الخادم العربية تظهر كما هي
    "errorKind === 'DEDUCTION_DUPLICATE'", 'confirmNotDuplicate', "role=\"alert\"", 'setError(errorText(err',
    // الرابط الثانوي للخصم الجماعي باقٍ بضغطة لمن يملك الصلاحية
    "can('deductions.manage')", 'خصم لمجموعة موظفين ← شاشة الخصومات', '/payroll/deductions?tab=create',
  ]) {
    assert.ok(form.includes(text), text)
  }
  // الشاشة لا تقرر شيئًا ماليًا: لا تنسيق أرقام محلي ولا حساب مبلغ
  assert.doesNotMatch(form, /toLocaleString\(/)
  assert.doesNotMatch(form, /Number\([^)]*\)\s*\*/, 'no amount arithmetic in the screen')
  // ولا محرك طلبات عام: الخصم لا يُرفع كطلب عام (الخادم يرفضه أصلًا)
  assert.doesNotMatch(form, /createRequest|resubmitRequest/)
})

test('the bulk path on the payroll deductions screen is untouched: one screen still applies a deduction to a whole group', () => {
  const page = read('src/app/payroll/deductions/page.tsx')
  assert.ok(page.includes('TypedDeductionsWorkspace'), 'the payroll screen still hosts the deductions workspace')
  const workspace = read('src/components/payroll/TypedDeductionsWorkspace.tsx')
  for (const text of ["EMPLOYEES: 'موظف أو مجموعة مختارة'", "TEAM: 'فريق'", "DEPARTMENT: 'قسم (مع أقسامه الفرعية)'", "BRANCH: 'فرع'",
    'submitDeductionBatch(input, selection, fresh.previewHash)', "urlParam('tab') === 'create' && value.types.length > 0"]) {
    assert.ok(workspace.includes(text), text)
  }
})
