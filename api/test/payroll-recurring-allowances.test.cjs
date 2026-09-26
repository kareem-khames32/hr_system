// «البدل الثابت الشهري» (بدل ضغط عمل — طلب المالك 26 سبتمبر) — قواعد نقية بلا قاعدة بيانات:
// شهور الإسناد والتقاطع، تناسب المنضم/المغادر بنفس معادلة الراتب، المرجع الثابت (مفتاح الـidempotency) وقرار قيد الشهر،
// القيد المُدار لشهر تاني ما يدخلش المسير، الإيقاف، وحماية الصافي: البدل برّه مساحة الخصم والسقف والأقساط.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const r = require('../src/payroll/recurring-allowances')
const { protectPayrollObligations } = require('../src/payroll/payroll-obligation-protection')

const window = (fromPeriod, untilPeriod = null, stoppedFromPeriod = null) => ({ fromPeriod, untilPeriod, stoppedFromPeriod })

test('شهور الرواتب: الإزاحة عبر السنين والتحقق من الصيغة', () => {
  assert.equal(r.shiftPayrollMonth('2026-12', 1), '2027-01')
  assert.equal(r.shiftPayrollMonth('2027-01', -1), '2026-12')
  assert.equal(r.shiftPayrollMonth('2026-09', 15), '2027-12')
  assert.equal(r.shiftPayrollMonth('2026-09', 0), '2026-09')
  for (const bad of ['2026-13', '2026-1', '26-09', '', null, 202609]) assert.equal(r.isPayrollMonth(bad), false, String(bad))
  assert.throws(() => r.shiftPayrollMonth('2026-13', 1))
})

test('تغطية الإسناد: من شهر البداية لحد شهر النهاية (شامل)، والإيقاف أول شهر ما يتصرفش، والمفتوح ملوش نهاية', () => {
  const open = window('2026-10')
  assert.equal(r.recurringAllowanceCovers(open, '2026-09'), false)
  assert.equal(r.recurringAllowanceCovers(open, '2026-10'), true)
  assert.equal(r.recurringAllowanceCovers(open, '2030-01'), true)
  assert.equal(r.recurringAllowanceEndExclusive(open), null)
  assert.equal(r.recurringAllowanceLastMonth(open), null)

  const bounded = window('2026-10', '2026-12')
  assert.deepEqual(['2026-09', '2026-10', '2026-12', '2027-01'].map(p => r.recurringAllowanceCovers(bounded, p)), [false, true, true, false])
  assert.equal(r.recurringAllowanceEndExclusive(bounded), '2027-01')
  assert.equal(r.recurringAllowanceLastMonth(bounded), '2026-12')

  // الإيقاف قبل شهر النهاية بيقصّرها، وبعدها ما يطوّلهاش
  assert.equal(r.recurringAllowanceLastMonth(window('2026-10', '2026-12', '2026-11')), '2026-10')
  assert.equal(r.recurringAllowanceLastMonth(window('2026-10', '2026-12', '2027-05')), '2026-12')
  assert.deepEqual(['2026-10', '2026-11'].map(p => r.recurringAllowanceCovers(window('2026-10', null, '2026-11'), p)), [true, false])
  // اتوقف من شهر البداية = ما غطاش ولا شهر
  const never = window('2026-10', null, '2026-10')
  assert.equal(r.recurringAllowanceCovers(never, '2026-10'), false)
  assert.equal(r.recurringAllowanceCoversAnyMonth(never), false)
  assert.equal(r.recurringAllowanceCoversAnyMonth(open), true)
})

test('نفس البدل لنفس الموظف ما يتصرفش مرتين في نفس الشهر: التقاطع بالشهور الفعلية بعد الإيقاف', () => {
  assert.equal(r.recurringAllowancesOverlap(window('2026-10'), window('2027-05')), true, 'المفتوح بيقاطع أي حاجة بعده')
  assert.equal(r.recurringAllowancesOverlap(window('2026-10', '2026-12'), window('2027-01')), false, 'بعد النهاية مباشرة مسموح')
  assert.equal(r.recurringAllowancesOverlap(window('2026-10', '2026-12'), window('2026-12', '2027-02')), true)
  assert.equal(r.recurringAllowancesOverlap(window('2026-10', null, '2026-12'), window('2026-12')), false, 'الموقوف من ديسمبر ما يقاطعش إسناد يبدأ ديسمبر')
  assert.equal(r.recurringAllowancesOverlap(window('2026-10', null, '2026-10'), window('2026-10')), false, 'اللي ما غطاش ولا شهر ما يقاطعش')
  assert.equal(r.recurringAllowancesOverlap(window('2027-03'), window('2026-10', '2027-02')), false)
})

test('شهر البداية إجباري والنهاية اختيارية ومش قبل البداية', () => {
  assert.deepEqual(r.recurringAllowanceWindowInput({ fromPeriod: '2026-10' }), { fromPeriod: '2026-10', untilPeriod: null })
  assert.deepEqual(r.recurringAllowanceWindowInput({ fromPeriod: '2026-10', untilPeriod: '' }), { fromPeriod: '2026-10', untilPeriod: null })
  assert.deepEqual(r.recurringAllowanceWindowInput({ fromPeriod: '2026-10', untilPeriod: '2026-10' }), { fromPeriod: '2026-10', untilPeriod: '2026-10' })
  assert.throws(() => r.recurringAllowanceWindowInput({ fromPeriod: '2026-10', untilPeriod: '2026-09' }), /قبل شهر البداية/)
  assert.throws(() => r.recurringAllowanceWindowInput({ fromPeriod: '2026/10' }), /شهر البداية/)
  assert.throws(() => r.recurringAllowanceWindowInput({ fromPeriod: '2026-10', untilPeriod: '2026-1' }), /شهر النهاية/)
})

test('مبلغ الشهر: الدورة كاملة = المبلغ كامل، والمنضم/المغادر بأيام خدمته ÷ 30 مقصوص لقرش — نفس معادلة الراتب بالحرف', () => {
  const full = { fullCoverage: true, coverDays: 31, monthlyDays: 30 }
  assert.equal(r.recurringAllowanceMonthCents(100000, full), 100000, 'دورة 31 يوم كاملة = الشهر كامل')
  assert.equal(r.recurringAllowanceMonthCents(100000, { fullCoverage: true, coverDays: 28, monthlyDays: 30 }), 100000, 'فبراير كامل = الشهر كامل')
  assert.equal(r.recurringAllowanceMonthCents(100000, { fullCoverage: false, coverDays: 10, monthlyDays: 30 }), 33333, '1000 × 10/30 = 333.33 (مقصوص مش مقرّب)')
  assert.equal(r.recurringAllowanceMonthCents(100000, { fullCoverage: false, coverDays: 20, monthlyDays: 30 }), 66666, '666.666… ← 666.66')
  assert.equal(r.recurringAllowanceMonthCents(100000, { fullCoverage: false, coverDays: 31, monthlyDays: 30 }), 100000, 'بسقف المبلغ كامل')
  assert.equal(r.recurringAllowanceMonthCents(100000, { fullCoverage: false, coverDays: 0, monthlyDays: 30 }), 0, 'مش في الخدمة = صفر')
  // نفس prorateCents في payroll.service (الراتب) لكل مبلغ وكل عدد أيام
  const salaryProration = (cents, coverDays) => Math.min(cents, Math.trunc(cents * coverDays / 30))
  for (const cents of [1, 29, 100, 3015, 99999, 100000, 123457, 555555, 100000000]) {
    for (let days = 1; days <= 31; days++) {
      assert.equal(r.recurringAllowanceMonthCents(cents, { fullCoverage: false, coverDays: days, monthlyDays: 30 }), salaryProration(cents, days), `${cents} × ${days}`)
    }
  }
  assert.throws(() => r.recurringAllowanceMonthCents(10.5, full))
  assert.throws(() => r.recurringAllowanceMonthCents(-1, full))
})

test('المرجع الثابت لكل إسناد وشهر (مفتاح عدم التكرار): يتبني ويتقري ويرفض الشكل الغلط، وطوله جوه عمود الدفتر', () => {
  assert.equal(r.recurringAllowanceSourceRef(15, '2026-10'), 'recurring-allowance:15:2026-10')
  assert.equal(r.recurringAllowanceSourceRef(15, '2026-10'), r.recurringAllowanceSourceRef(15, '2026-10'), 'نفس الإسناد والشهر = نفس المرجع دايمًا')
  assert.notEqual(r.recurringAllowanceSourceRef(15, '2026-10'), r.recurringAllowanceSourceRef(15, '2026-11'))
  assert.deepEqual(r.parseRecurringAllowanceSourceRef('recurring-allowance:15:2026-10'), { assignmentId: 15, period: '2026-10' })
  for (const bad of ['recurring-allowance:0:2026-10', 'recurring-allowance:15:2026-13', 'recurring-allowance:x:2026-10', 'allowance-grant:15', 'holiday_work:1:2026-10-05', null, 15]) {
    assert.equal(r.parseRecurringAllowanceSourceRef(bad), null, String(bad))
  }
  assert.equal(r.isRecurringAllowanceSourceRef('recurring-allowance:15:2026-10'), true)
  assert.equal(r.isRecurringAllowanceSourceRef('allowance-grant:15'), false)
  assert.ok(r.recurringAllowanceSourceRef(2147483647, '2026-10').length <= 60, 'employee_obligations.sourceRef nvarchar(60)')
})

const credit = (id, overrides = {}) => ({ id, status: 'PENDING', amount: '1000.00', label: 'بدل ضغط عمل', targetPeriod: '2026-10',
  reservedPayrollRunId: null, payrollReversalOfObligationId: null, carriedFromObligationId: null, ...overrides })

test('قرار قيد الشهر: إنشاء أول مرة، إعادة الحساب بتحتفظ بنفس القيد (وتحدّثه لو المبلغ اتغير)، والتكرار يتلغي', () => {
  assert.deepEqual(r.planRecurringAllowanceMonth([], 100000, 'بدل ضغط عمل', '2026-10'), { kind: 'CREATE', cancel: [] })
  assert.deepEqual(r.planRecurringAllowanceMonth([credit(7)], 100000, 'بدل ضغط عمل', '2026-10'), { kind: 'KEEP', id: 7, update: false, cancel: [] })
  assert.deepEqual(r.planRecurringAllowanceMonth([credit(7)], 33333, 'بدل ضغط عمل', '2026-10'), { kind: 'KEEP', id: 7, update: true, cancel: [] }, 'اتغيرت التغطية')
  assert.deepEqual(r.planRecurringAllowanceMonth([credit(7)], 100000, 'بدل جديد', '2026-10'), { kind: 'KEEP', id: 7, update: true, cancel: [] })
  assert.deepEqual(r.planRecurringAllowanceMonth([credit(9), credit(7)], 100000, 'بدل ضغط عمل', '2026-10'), { kind: 'KEEP', id: 7, update: false, cancel: [9] },
    'قيدين مُدارين لنفس الشهر: الأقدم يفضل والتاني يتلغي')
  assert.deepEqual(r.planRecurringAllowanceMonth([credit(7, { status: 'CANCELLED' })], 100000, 'بدل ضغط عمل', '2026-10'), { kind: 'CREATE', cancel: [] }, 'الملغى كأنه مش موجود')
  assert.deepEqual(r.planRecurringAllowanceMonth([credit(7)], 0, 'بدل ضغط عمل', '2026-10'), { kind: 'NONE', cancel: [7] })
})

test('قرار قيد الشهر: الشهر اللي اتسوّى (محجوز لمسير معتمد، اتصرف، إعادة بعد عكس) ما يتعملوش قيد تاني', () => {
  for (const settled of [credit(3, { reservedPayrollRunId: 44 }), credit(3, { status: 'APPLIED' }), credit(3, { payrollReversalOfObligationId: 2 })]) {
    const plan = r.planRecurringAllowanceMonth([settled, credit(8)], 100000, 'بدل ضغط عمل', '2026-10')
    assert.deepEqual(plan, { kind: 'SETTLED', settledId: 3, settledCents: 100000, cancel: [8] }, JSON.stringify(settled))
  }
  assert.equal(r.isManagedRecurringCredit(credit(1)), true)
  assert.equal(r.isManagedRecurringCredit(credit(1, { carriedFromObligationId: 5 })), false)
})

test('القيد المُدار لشهر تاني ما يدخلش المسير (بيتصرف مع راتب شهره بس)، وإعادة الصرف بعد العكس والقيود التانية بتدخل عادي', () => {
  const managedOctober = { sourceRef: 'recurring-allowance:4:2026-10', targetPeriod: '2026-10', payrollReversalOfObligationId: null, carriedFromObligationId: null }
  assert.equal(r.isForeignMonthRecurringCredit(managedOctober, '2026-11'), true)
  assert.equal(r.isForeignMonthRecurringCredit(managedOctober, '2026-10'), false)
  assert.equal(r.isForeignMonthRecurringCredit({ ...managedOctober, payrollReversalOfObligationId: 12 }, '2026-11'), false, 'إعادة بعد عكس الصرف')
  assert.equal(r.isForeignMonthRecurringCredit({ sourceRef: 'allowance-grant:4', targetPeriod: '2026-10' }, '2026-11'), false, 'بدل الشهر الواحد بيترحّل زي ما هو')
  assert.equal(r.isForeignMonthRecurringCredit({ sourceRef: null, targetPeriod: null }, '2026-11'), false)
})

test('الإيقاف: الافتراضي الشهر اللي بعد آخر شهر اتعتمد أو اتصرف، والمطلوب قبله مرفوض، وبعد النهاية ملوش معنى', () => {
  const row = { ...window('2026-10'), status: 'ACTIVE' }
  assert.deepEqual(r.planRecurringAllowanceStop(row, []), { stopFrom: '2026-10', earliest: '2026-10' }, 'محدش اتصرف = من شهر البداية')
  assert.deepEqual(r.planRecurringAllowanceStop(row, ['2026-10', '2026-11']), { stopFrom: '2026-12', earliest: '2026-12' })
  assert.deepEqual(r.planRecurringAllowanceStop(row, ['2026-10'], '2027-03'), { stopFrom: '2027-03', earliest: '2026-11' }, 'إيقاف من شهر جاي')
  assert.deepEqual(r.planRecurringAllowanceStop(row, ['2026-10'], ''), { stopFrom: '2026-11', earliest: '2026-11' })
  assert.throws(() => r.planRecurringAllowanceStop(row, ['2026-10', '2026-11'], '2026-11'), /2026-11 في مسير معتمد أو اتصرف — الإيقاف يبدأ من 2026-12/)
  assert.throws(() => r.planRecurringAllowanceStop(row, [], '2026-09'), /من شهر البداية 2026-10/)
  assert.throws(() => r.planRecurringAllowanceStop(row, [], '2026-1'), /صيغة/)
  assert.throws(() => r.planRecurringAllowanceStop({ ...window('2026-10', '2026-12'), status: 'ACTIVE' }, ['2026-12']), /بينتهي في 2026-12/)
  assert.throws(() => r.planRecurringAllowanceStop({ ...window('2026-10', null, '2026-11'), status: 'STOPPED' }, []), /موقوف من قبل/)
})

// ===== حماية الصافي: البدل الثابت برّه مساحة الخصم =====
const base = (overrides = {}) => ({ earnedFixedGross: 6000, overtime: 0, unpaidLeave: 0, attendance: { lateness: 0, shortfall: 0, absence: 0 },
  credits: [], debits: [], settings: { minNetGuarantee: null, netFloorPct: null, maxDeductionPctOfGross: null }, ...overrides })
const fixed = (id, amount) => ({ id, amount, category: 'allowance', deductionRequestId: null, effectiveDate: '2026-10-01', outsideDeductionBase: true })
const ordinary = (id, amount) => ({ id, amount, category: 'allowance', deductionRequestId: null, effectiveDate: '2026-10-01' })
const recovery = (id, amount) => ({ id, amount, category: 'custody_shortfall', deductionRequestId: null, effectiveDate: '2026-10-01' })

test('حماية الصافي: الخصومات أكبر من الراتب — البدل الثابت بيتصرف كامل ومش بيتاخد منه (والإضافة العادية بتدخل مساحة الخصم زي ما هي)', () => {
  const withFixed = protectPayrollObligations(base({ earnedFixedGross: 1000, credits: [fixed(1, 500)], debits: [recovery(2, 1200)] }))
  assert.equal(withFixed.otherAdditions, 500, 'البدل في الإضافات كامل')
  assert.equal(withFixed.otherDeductions, 1000, 'الخصم من الراتب بس')
  assert.deepEqual(withFixed.lines.find(line => line.id === 2), { id: 2, type: 'DEBIT', amount: 1200, collected: 1000, carried: 200, typed: false })
  assert.equal(withFixed.loanSlot.netBeforeLoans, 0, 'الأقساط ما بتاخدش من البدل')
  assert.equal(withFixed.trace.balanceBeforeDeductions, '1000.00')
  assert.equal(withFixed.trace.creditsOutsideBase, '500.00')
  // نفس الموقف ببدل الشهر الواحد (السلوك القائم): الإضافة جوه مساحة الخصم فبيتخصم منها
  const withOrdinary = protectPayrollObligations(base({ earnedFixedGross: 1000, credits: [ordinary(1, 500)], debits: [recovery(2, 1200)] }))
  assert.equal(withOrdinary.otherDeductions, 1200)
  assert.equal(withOrdinary.trace.creditsOutsideBase, undefined, 'من غير بدل ثابت التتبع زي ما هو')
})

test('حماية الصافي: سقف الخصم والأرضية على الراتب من غير البدل الثابت', () => {
  const debits = [recovery(2, 2000)]
  const capped = protectPayrollObligations(base({ credits: [fixed(1, 1000)], debits, settings: { minNetGuarantee: null, netFloorPct: null, maxDeductionPctOfGross: '5' } }))
  assert.equal(capped.trace.cap, '300.000000', '5% من 6000 (مش من 7000)')
  assert.equal(capped.otherDeductions, 300)
  assert.equal(capped.otherAdditions, 1000)
  const floored = protectPayrollObligations(base({ credits: [fixed(1, 1000)], debits, settings: { minNetGuarantee: '5000', netFloorPct: null, maxDeductionPctOfGross: null } }))
  assert.equal(floored.otherDeductions, 1000, 'الأرضية 5000 من راتب 6000 = مساحة 1000 بس — البدل ما بيوسّعهاش')
  assert.equal(floored.loanSlot.netBeforeLoans, 5000)
  const pct = protectPayrollObligations(base({ credits: [fixed(1, 1000)], debits, settings: { minNetGuarantee: null, netFloorPct: '90', maxDeductionPctOfGross: null } }))
  assert.equal(pct.otherDeductions, 600, 'أرضية 90% من 6000 = 5400، والمساحة 600')
})

test('حماية الصافي: من غير بدل ثابت النتيجة والتتبع زي الأول بالحرف، وخصومات الحضور على الراتب بس', () => {
  const input = base({ overtime: 75, unpaidLeave: 200, attendance: { lateness: 25, shortfall: 0, absence: 200 }, credits: [ordinary(1, 400)], debits: [recovery(2, 250)],
    settings: { minNetGuarantee: null, netFloorPct: null, maxDeductionPctOfGross: '10' } })
  const plain = protectPayrollObligations(input)
  const flaggedFalse = protectPayrollObligations({ ...input, credits: [{ ...ordinary(1, 400), outsideDeductionBase: false }] })
  assert.deepEqual(flaggedFalse, plain, 'outsideDeductionBase: false = مفيش حاجة اتغيرت')
  assert.equal(plain.trace.balanceBeforeDeductions, '6275.00')
  // الحضور أكبر من السقف: البدل الثابت ما بيرفعش السقف ولا بيخلّي حاجة ما تسقطش
  const attendance = protectPayrollObligations(base({ attendance: { lateness: 0, shortfall: 0, absence: 900 }, credits: [fixed(1, 1000)],
    settings: { minNetGuarantee: null, netFloorPct: null, maxDeductionPctOfGross: '10' } }))
  assert.deepEqual(attendance.attendance, { lateness: 0, shortfall: 0, absence: 600 })
  assert.equal(attendance.trace.attendanceDropped.absence, '300.00')
  assert.equal(attendance.otherAdditions, 1000)
  // الإجازة بدون راتب أكبر من الراتب: الصافي بعد البدل موجب فمفيش تحذير صافي سالب
  const noWarning = protectPayrollObligations(base({ earnedFixedGross: 100, unpaidLeave: 150, credits: [fixed(1, 500)] }))
  assert.equal(noWarning.trace.warnings.some(w => w.code === 'NET_NEGATIVE_PROTECTED_ONLY'), false)
  const warning = protectPayrollObligations(base({ earnedFixedGross: 100, unpaidLeave: 150, credits: [fixed(1, 20)] }))
  assert.equal(warning.trace.warnings.some(w => w.code === 'NET_NEGATIVE_PROTECTED_ONLY'), true)
})
