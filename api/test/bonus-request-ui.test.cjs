// شاشة «الطلبات» بعد قرار المالك: «ليه أكتب أنا بإيدي يعني السيستم مش هيفهم كل اللي أنا مدخله؟»
//  1) كل حقل في النموذج العام يُرسم بودجة نوعه (تاريخ/شهر مسير/وقت/رقم) من خريطة واحدة جنب تسميات
//     المعتمد في src/lib/request-payload.ts — والمُرسَل للخادم يفضل نفس النص بالحرف.
//  2) «دوام يوم عطلة»: مدى «من/إلى» والنظام يطلّع أيام العطلة الحقيقية جواه شرائح تُعلَّم، بدل خانة نص.
//  3) كارت «مكافأة» بقى نموذج طلب حقيقي داخل الشاشة زي «خصم» — بلا انتقال لشاشة تانية.
// منطق الواجهة ونصوصها فقط؛ لا SQL ولا خدمة. (الملفات على القرص CRLF — تُطبّع قبل الفحص)
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const ui = require('../../src/lib/bonuses-api')
const payload = require('../../src/lib/request-payload')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

// ===== 1) خريطة نوع الحقل جنب خريطة التسميات =====

test('one field-kind map next to the approver labels: dates, payroll months, times and numbers each get their own control', () => {
  for (const key of ['date', 'fromDate', 'toDate', 'effectiveDate', 'contractStart', 'contractEnd', 'lastWorkingDate']) {
    assert.equal(payload.payloadFieldKind(key), 'date', key)
  }
  for (const key of ['effectivePayrollPeriod', 'firstInstallmentPeriod', 'toPeriod']) {
    assert.equal(payload.payloadFieldKind(key), 'month', key)
  }
  for (const key of ['from', 'to', 'time']) assert.equal(payload.payloadFieldKind(key), 'time', key)
  for (const key of ['days', 'hours', 'amount', 'months', 'newSalary', 'increase_pct']) {
    assert.equal(payload.payloadFieldKind(key), 'number', key)
  }
  for (const key of ['reason', 'description', 'note']) assert.equal(payload.payloadFieldKind(key), 'textarea', key)
  // نص حر يفضل نص، وأيام «دوام يوم عطلة» نص كمان لأن نموذجها يبنيه من مدى لا من كتابة
  for (const key of ['iban', 'name', 'courseName', 'destination', 'dates']) assert.equal(payload.payloadFieldKind(key), 'text', key)
  // مفتاح غير معروف: نفس الاستنتاج القديم بالحرف (تاريخ ثم رقم ثم نص) — لا انقلاب في سلوك نوع قائم
  assert.equal(payload.payloadFieldKind('someNewDate'), 'date')
  assert.equal(payload.payloadFieldKind('extraHours'), 'number')
  assert.equal(payload.payloadFieldKind('withEmployeeId'), 'number')
  assert.equal(payload.payloadFieldKind('whatever'), 'text')
})

test('the numeric fields carry a sensible step and minimum instead of a free text box', () => {
  assert.deepEqual(payload.payloadNumberProps('days'), { step: '0.5', min: '0' })
  assert.deepEqual(payload.payloadNumberProps('hours'), { step: '0.25', min: '0' })
  assert.deepEqual(payload.payloadNumberProps('months'), { step: '1', min: '1' })
  assert.deepEqual(payload.payloadNumberProps('amount'), { step: '0.01', min: '0' })
  assert.deepEqual(payload.payloadNumberProps('newSalary'), { step: '0.01', min: '0' })
  assert.deepEqual(payload.payloadNumberProps('increase_pct'), { step: '0.01', min: '0' })
  assert.deepEqual(payload.payloadNumberProps('loanId'), { step: '1', min: '1' })
  assert.deepEqual(payload.payloadNumberProps('whatever'), { step: 'any', min: '0' })
})

test('the requests screen derives every generic control from that one map — it does not guess on its own', () => {
  const page = read('src/app/requests/page.tsx')
  assert.ok(page.includes("import { payloadFieldKind, payloadFieldLabel, payloadNumberProps, payloadSummary, payloadValueLabel } from '@/lib/request-payload'"))
  assert.ok(page.includes("const isDateField = (f: string) => payloadFieldKind(f) === 'date'"))
  assert.ok(page.includes("const isNumberField = (f: string) => payloadFieldKind(f) === 'number'"))
  // نوع الحقل المخصّص من الخادم يسبق الخريطة؛ و«text» العام تحسمه الخريطة
  assert.ok(page.includes("const fieldKindOf = (key: string, configured?: CustomFieldDef['type']): string =>\n  configured && configured !== 'text' ? configured : payloadFieldKind(key)"))
  // الفرعان (الحقول المخصّصة والاستنتاج القديم) يرسمان رقمًا بخطوته وحده الأدنى وشهرًا بحقل شهر
  assert.ok(page.includes("step={fieldKindOf(f.key, f.type) === 'number' ? payloadNumberProps(f.key).step : undefined}"))
  assert.ok(page.includes("min={fieldKindOf(f.key, f.type) === 'number' ? payloadNumberProps(f.key).min : undefined}"))
  assert.ok(page.includes("step={isNumberField(f) ? payloadNumberProps(f).step : undefined}"))
  assert.ok(page.includes("min={isNumberField(f) ? payloadNumberProps(f).min : undefined}"))
  assert.ok(page.includes("fieldKindOf(f.key, f.type) === 'month'"), 'payroll-month keys get a month control in the custom-field branch')
  assert.ok(page.includes("payloadFieldKind(f) === 'month' ? 'month'"), 'and in the inferred branch')
  assert.ok(page.includes("fieldKindOf(f.key, f.type) === 'textarea' ? (") && page.includes("payloadFieldKind(f) === 'textarea' ? ("), 'free text stays a textarea')
  // الوقت يظل على المكوّن المشترك — الشاشة لا تبني حقل وقت لنفسها
  assert.ok(page.includes("(key === 'from' || key === 'to') &&\n      (isPermission || fieldKindOf(key, customFields.find((f) => f.key === key)?.type) === 'time')"))
  assert.doesNotMatch(page.slice(0, page.indexOf('holiday-work-from')), /<input[^>]*type="time"/)
  // ما اتغيرش المُرسَل: تحويل الرقم عند الإرسال لسه نفس الدالة الواحدة
  assert.ok(page.includes("payload[f] = isNumberField(f) && raw !== '' ? Number(raw) : raw"))
})

// ===== 2) «دوام يوم عطلة»: مدى «من/إلى» بدل كتابة الأيام =====

test('holiday work: a from/to range resolves the real holiday days from the same server answer the request is judged by', () => {
  const page = read('src/app/requests/page.tsx')
  assert.ok(page.includes("const isHolidayWork = formFieldKeys.includes('dates')"))
  // الأيام الحقيقية من attendance/working-days: skipped = الأيام غير العمل لهذا الموظف (ويك إند + عطلة رسمية)
  assert.ok(page.includes("fetchWorkingDays(from, to, employeeId ? { employeeId } : { self: true })"))
  assert.ok(page.includes('const holidays = res.skipped.filter((day) => day <= today).sort()'))
  // نيابةً عن موظف: عطلات جدوله هو
  assert.ok(page.includes('const employeeId = onBehalf && onBehalfEmployeeId ? Number(onBehalfEmployeeId) : undefined'))
  // شرائح تُعلَّم، كلها مختارة افتراضيًا، والمدى وحده هو المُدخَل
  assert.ok(page.includes('pickHolidayDays(prior.length ? prior : holidays)'), 'every holiday in range starts selected')
  assert.ok(page.includes('aria-pressed={picked}'), 'each day is a toggle')
  assert.ok(page.includes('id="holiday-work-from"') && page.includes('id="holiday-work-to"'))
  assert.ok(page.includes('اختر الكل') && page.includes('امسح الكل'))
  // صيغة الإرسال بالحرف زي ما كانت: YYYY-MM-DD مفصولة بفاصلة عربية في نفس مفتاح dates
  assert.ok(page.includes("const HOLIDAY_DATES_SEPARATOR = '، '"))
  assert.ok(page.includes('const holidayDatesText = (days: string[]) => days.join(HOLIDAY_DATES_SEPARATOR)'))
  assert.ok(page.includes('payload.dates = holidayDatesText(holidayPicked)'))
  assert.ok(page.includes("setFieldValue('dates', holidayDatesText(sorted))"))
  // حد الخادم نفسه (62 يومًا) معروض قبل الإرسال لا بعد الرفض
  assert.ok(page.includes('const HOLIDAY_WORK_MAX_DAYS = 62'))
  const server = read('api/src/attendance/holiday-work.ts')
  assert.ok(server.includes('export const HOLIDAY_WORK_MAX_DATES = 62'), 'the screen mirrors the server limit')
  // رفض الخادم «يوم عمل عادي ليك» يظهر مقروءًا جنب الشرائح
  assert.ok(page.includes('/يوم عمل عادي|أيام عمل عادية/.test(submitError)'))
  assert.ok(read('api/src/requests/requests.service.ts').includes('ليك — الطلب لأيام العطلة اللي اشتغلتها بس'))
  // خانة النص القديمة اختفت من النموذج العام، والتسمية ما بقتش تشرح صيغة يكتبها المستخدم
  assert.ok(page.includes("customFields.filter(f => f.key !== 'dates' || !isHolidayWork)"))
  assert.ok(page.includes("requiredFields.filter(f => f !== 'dates' || !isHolidayWork)"))
  assert.equal(payload.payloadFieldLabel('dates'), 'أيام العطلة')
  // لا حساب عطلات في الواجهة: الفرد يوم بيوم مجرد احتياطي لما الخادم يعجز
  assert.ok(page.includes('const manual = past.length <= HOLIDAY_WORK_MAX_DAYS'))
  assert.ok(page.includes('تعذّر تمييز العطلات آلياً'))
})

// ===== 3) «مكافأة» طلب مستقل زي «خصم» =====

test('the value field speaks the bonus type language, and the day step is checked before sending exactly as the server checks it', () => {
  assert.equal(ui.bonusValueHint({ calcMethod: 'FIXED_AMOUNT', valueStep: null }), 'مبلغ ثابت — بمنزلتين عشريتين على الأكثر')
  assert.equal(ui.bonusValueHint({ calcMethod: 'PERCENT_OF_BASE', valueStep: null }), 'نسبة من الأساسي — النسبة من 0 إلى 100')
  assert.equal(ui.bonusValueHint({ calcMethod: 'DAYS_OF_SALARY', valueStep: '0.2500' }), 'أيام من الراتب — ربع يوم (مضاعفات 0.25)')
  assert.equal(ui.bonusValueHint({ calcMethod: 'DAYS_OF_SALARY', valueStep: '1' }), 'أيام من الراتب — يوم كامل (مضاعفات 1)')
  assert.equal(ui.bonusValueHint({ calcMethod: 'DAYS_OF_SALARY', valueStep: null }), 'أيام من الراتب')
  assert.equal(ui.bonusValueHint(null), '')
  // خطوة حقل الإدخال نفسها من النوع لا من الشاشة
  assert.equal(ui.bonusValueStep({ calcMethod: 'DAYS_OF_SALARY', valueStep: '0.2500' }), '0.25')
  assert.equal(ui.bonusValueStep({ calcMethod: 'FIXED_AMOUNT', valueStep: null }), '0.01')
  assert.equal(ui.bonusValueStep({ calcMethod: 'PERCENT_OF_BASE', valueStep: null }), 'any')
  // BONUS_STEP_INVALID: نفس فحص الخادم قبل ما يرفض
  const quarterDay = { calcMethod: 'DAYS_OF_SALARY', valueStep: '0.2500' }
  for (const value of ['0.25', '0.5', '1', '2.75']) assert.equal(ui.bonusStepError(quarterDay, value), null, value)
  assert.match(ui.bonusStepError(quarterDay, '0.3'), /ليست من مضاعفات 0\.25/)
  assert.equal(ui.bonusStepError({ calcMethod: 'FIXED_AMOUNT', valueStep: null }, '10.33'), null)
  assert.equal(ui.bonusStepError(null, '0.3'), null)
})

test('the requests screen opens the bonus form inline — no navigation, like the deduction card', () => {
  const page = read('src/app/requests/page.tsx')
  assert.ok(page.includes("import BonusRequestForm from '@/components/requests/BonusRequestForm'"))
  assert.ok(page.includes("const isPayrollBonus = selectedTypeDef?.code === 'PAYROLL_BONUS'"))
  assert.ok(page.includes('{selectedType && isPayrollBonus && <BonusRequestForm onSubmitted={load} />}'), 'the card opens the form in place')
  // لا انتقال ولا دالة توجيه باقية
  assert.ok(!page.includes("if (code === 'PAYROLL_BONUS')"), 'no route for the bonus card')
  assert.ok(!page.includes('moneyWorkspaceRoute'), 'the money routing helper is gone')
  assert.ok(!page.includes("'/my/bonuses?tab=create'"), 'the bonus card no longer navigates away')
  assert.ok(!page.includes('window.location.assign'), 'no card leaves the screen')
  // حقول المحرك العام وزر إرساله ومنتقي النيابة لا تظهر مع المكافأة (لها منتقي موظفها ونطاقه)
  assert.ok(page.includes('const isMoneyRequest = isPayrollDeduction || isPayrollBonus'))
  assert.ok(page.includes('{canOnBehalf && !editingRequest && !isMoneyRequest && ('))
  assert.ok(page.includes('{!isMoneyRequest && (\n                <button\n                  onClick={handleSubmit}'))
})

test('the bonus form is bound to the bonus catalog: allowed types, server-scoped employees, the type value unit, target month, reason counter, document reference, and a live amount preview', () => {
  const form = read('src/components/requests/BonusRequestForm.tsx')
  for (const text of [
    // الأنواع المسموح للمستخدم بإنشائها والموظفون في نطاقه — من الخادم لا من الشاشة
    'fetchBonusCreatable()', 'fetchBonusCandidates(typeId)',
    'نوع المكافأة', 'BONUS_METHOD_UNIT[type.calcMethod]', 'bonusValueHint(type)', 'step={bonusValueStep(type)}',
    'BONUS_ROLE_LABELS[role]',
    // شهر المسير المستهدف بنفس دلالة شاشة المكافآت وتلميح دورة المسير
    'شهر المسير المستهدف', 'الشهر الحالي للمسير: {creatable.currentPeriod} (الدورة تبدأ يوم {creatable.cycleStartDay})',
    // السبب بحد الخادم وعدّاد ظاهر، ومرجع المستند اختياري
    '({creatable.reasonMinLength} حرفًا على الأقل — {form.reason.trim().length})', 'مرجع المستند أو المرفق (اختياري)',
    // المعاينة الحيّة من نقطة معاينة المكافآت نفسها — موظف واحد كمجموعة من واحد
    "previewBonuses(input, { mode: 'EMPLOYEES', ids: [Number(employeeId)], excludeEmployeeIds: [] })",
    'المبلغ المحسوب', 'formatBonusMoney(row.amount)', 'row.capExceeded', 'row.escalated',
    // الإرسال بنقطة الإنشاء الفردي: رقم الطلب وسلسلته وشهر الصرف في سطر النجاح
    'createBonus({ ...input, employeeId: Number(employeeId) })', 'أُرسل طلب المكافأة #${created.id}',
    'سلسلة الاعتماد: ${chain}', 'تُصرف مع مسير ${created.targetPeriod}',
    // التكرار يُؤكَّد بدل الفشل الصامت، ورسالة الخادم العربية تظهر كما هي
    "errorKind === 'BONUS_DUPLICATE'", 'confirmNotDuplicate', 'role="alert"', 'setError(errorText(err',
    // الرابط الثانوي للمكافأة الجماعية باقٍ بضغطة لمن يملك الصلاحية
    "can('bonuses.manage')", 'مكافأة لمجموعة موظفين ← شاشة المكافآت', '/payroll/bonuses?tab=create',
  ]) {
    assert.ok(form.includes(text), text)
  }
  // الشاشة لا تقرر شيئًا ماليًا: لا تنسيق أرقام محلي ولا حساب مبلغ
  assert.doesNotMatch(form, /toLocaleString\(/)
  assert.doesNotMatch(form, /Number\([^)]*\)\s*\*/, 'no amount arithmetic in the screen')
  // ولا محرك طلبات عام: المكافأة لا تُرفع كطلب عام (الخادم يرفضه أصلًا)
  assert.doesNotMatch(form, /createRequest|resubmitRequest/)
})

test("the bonus employee picker is the server's managerial scope only, and the form fails closed when that scope is empty", () => {
  const form = read('src/components/requests/BonusRequestForm.tsx')
  // لا قائمة موظفين من الشاشة: مصدر واحد هو candidates بالنوع
  assert.doesNotMatch(form, /fetchEmployeeDirectory|fetchEmployees\b/, 'no employee list of our own')
  assert.ok(form.includes('const noScope = candidatesLoaded && candidates.length === 0'))
  assert.ok(form.includes('disabled={busy || noScope || !candidatesLoaded}'), 'submitting is closed until a real scope arrives')
  assert.ok(form.includes('if (noScope || !candidatesLoaded) { setError(candidateError || '), 'and closed again at submit time')
  assert.ok(form.includes('— لا يوجد موظفون في نطاقك لهذا النوع —'))
  assert.ok(form.includes('لا تُنزل مكافأة لنفسك ولا لمن يعلوك — الخادم يرفضها.'))
  // فشل تحميل النطاق لا يفتح الباب: القائمة تُفرَّغ والإرسال يفضل مقفول
  assert.ok(form.includes('setCandidates([])\n        setCandidatesLoaded(false)'))
  // والخادم هو من يستبعد النفس والأعلى وغير الفرع
  const service = read('api/src/payroll/bonuses.service.ts')
  assert.ok(service.includes('employees.filter(row => row.id !== facts.employeeId && !facts.superiors.has(row.id) && this.inBranchScope(user, row))'))
})

test('the bulk path on the payroll bonuses screen is untouched: one screen still proposes a bonus for a whole group', () => {
  const page = read('src/app/payroll/bonuses/page.tsx')
  assert.ok(page.includes('BonusesWorkspace'), 'the payroll screen still hosts the bonuses workspace')
  const workspace = read('src/components/payroll/BonusesWorkspace.tsx')
  for (const text of ['submitBonusBatch(', "(initialTab === 'create' || urlParam('tab') === 'create') && value.types.length > 0"]) {
    assert.ok(workspace.includes(text), text)
  }
})
