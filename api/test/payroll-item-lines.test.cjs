// بنود الاستحقاقات والاستقطاعات لكل موظف (طلب المالك 19 سبتمبر) — تقسيم بند المسير المحفوظ بلا قاعدة بيانات:
// كل بند باسمه (مكونات الراتب، الإضافي، بدل العطلات، كل بدل ونوع خصم باسمه، الانصراف المبكر من الوردية الثابتة، الإجازة/الإيقاف/المرضية)،
// ومجموع كل مجموعة = أعمدة البند المحفوظة بالقرش مهما كانت البيانات قديمة أو ناقصة، والصافي = netPay.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const L = require('../src/payroll/payroll-item-lines')

const cents = value => Math.round(Number(value ?? 0) * 100)
const sumCents = lines => lines.reduce((sum, line) => sum + cents(line.amount), 0)
const EARNING_COLUMNS = ['basicSalary', 'allowances', 'overtimeAmount', 'otherAdditions']
const DEDUCTION_COLUMNS = ['latenessDeduction', 'shortfallDeduction', 'absenceDeduction', 'unpaidLeaveDeduction', 'loanInstallments', 'otherDeductions', 'socialInsuranceDeduction']
function assertTotals(item, lines) {
  const earnings = EARNING_COLUMNS.reduce((sum, key) => sum + cents(item[key]), 0)
  const deductions = DEDUCTION_COLUMNS.reduce((sum, key) => sum + cents(item[key]), 0)
  assert.equal(sumCents(lines.earnings), earnings, 'بنود الاستحقاق = أعمدة الاستحقاق المحفوظة')
  assert.equal(sumCents(lines.deductions), deductions, 'بنود الاستقطاع = أعمدة الخصم المحفوظة')
  assert.equal(cents(lines.totals.earnings), earnings)
  assert.equal(cents(lines.totals.deductions), deductions)
  assert.equal(cents(lines.totals.net), cents(item.netPay))
}
const fact = (id, overrides) => ({ id, type: 'CREDIT', category: 'allowance', label: null, sourceRef: null, amount: null, deductionRequestId: null, bonusRequestId: null, typeName: null, ...overrides })
const byKey = (lines) => Object.fromEntries(lines.map(line => [line.key, line.amount]))

test('بند كامل: كل استحقاق واستقطاع سطر باسمه بالترتيب، والمجاميع = الأعمدة والصافي المحفوظ', () => {
  const facts = new Map([
    [11, fact(11, { sourceRef: 'holiday_work:4:2026-09-05', label: 'بدل دوام أيام العطلات — 2026-09-05: 8 ساعة × 1.5 (أمر «اليوم الوطني»)' })],
    [12, fact(12, { sourceRef: 'holiday_work:4:2026-09-06', label: 'بدل دوام أيام العطلات — 2026-09-06: 4 ساعة × 1.5 (أمر «اليوم الوطني»)' })],
    [13, fact(13, { sourceRef: 'allowance-grant:7', label: 'بدل انتقالات إضافي' })],
    [14, fact(14, { sourceRef: 'allowance-grant:9', label: 'بدل وجبات' })],
    [15, fact(15, { category: 'bonus', bonusRequestId: 3, typeName: 'مكافأة تميز' })],
    [16, fact(16, { category: 'expense', label: 'مصروفات: تاكسي' })],
    [21, fact(21, { type: 'DEBIT', category: 'typed_deduction', deductionRequestId: 5, typeName: 'الجودة' })],
    [22, fact(22, { type: 'DEBIT', category: 'typed_deduction', deductionRequestId: 6, typeName: 'الالتزام' })],
    [23, fact(23, { type: 'DEBIT', category: 'typed_deduction', deductionRequestId: 8, typeName: 'الجودة' })],
    [24, fact(24, { type: 'DEBIT', category: 'custody_shortfall', label: 'عجز عهدة لابتوب' })],
  ])
  const item = {
    basicSalary: '6000.00', allowances: '1700.00', overtimeAmount: '312.50', otherAdditions: '1025.25',
    latenessDeduction: '45.10', shortfallDeduction: '90.00', absenceDeduction: '256.66', unpaidLeaveDeduction: '400.00',
    loanInstallments: '500.00', otherDeductions: '330.00', socialInsuranceDeduction: '585.00', netPay: '6830.99',
    breakdown: JSON.stringify({
      salaryComponents: [
        { code: 'BASIC', nameAr: 'الراتب الأساسي', earnedAmount: 6000 }, { code: 'HOUSING', nameAr: 'بدل السكن', earnedAmount: 1000 },
        { code: 'TRANSPORT', nameAr: 'بدل الانتقال', earnedAmount: 500 }, { code: 'PHONE', nameAr: 'بدل الهاتف', earnedAmount: 0 },
        { code: 'WORK_NATURE', nameAr: 'بدل طبيعة العمل', earnedAmount: 200 }, { code: 'OTHER', nameAr: 'بدلات أخرى', earnedAmount: 0 },
      ],
      attendanceRules: [
        { date: '2026-09-01', snapshot: { flexEnabled: false } }, { date: '2026-09-02', snapshot: JSON.stringify({ flexEnabled: false }) },
        { date: '2026-09-03', snapshot: { flexEnabled: true } },
      ],
      attendanceDeductions: { days: [
        { date: '2026-09-01', shortfallAmount: 25.004 }, { date: '2026-09-02', shortfallAmount: 19.998 }, { date: '2026-09-03', shortfallAmount: 45 },
      ] },
      leaveDeductionLines: [
        { code: 'UNPAID_LEAVE', label: 'إجازة بدون راتب', days: 1, amount: 256.67 }, { code: 'SUSPENSION', label: 'أيام إيقاف عن العمل', days: 0.5, amount: 43.33 },
        { code: 'SICK_LEAVE_75', label: 'خصم إجازة مرضية (75%)', days: 2, amount: 60 }, { code: 'SICK_LEAVE_0', label: 'خصم إجازة مرضية (0%)', days: 0.2, amount: 40 },
      ],
      obligationLines: [
        { id: 11, type: 'CREDIT', amount: 300, collected: 300 }, { id: 12, type: 'CREDIT', amount: 150.25, collected: 150.25 },
        { id: 13, type: 'CREDIT', amount: 250, collected: 250 }, { id: 14, type: 'CREDIT', amount: 100, collected: 100 },
        { id: 15, type: 'CREDIT', amount: 200, collected: 200 }, { id: 16, type: 'CREDIT', amount: 25, collected: 25 },
        { id: 21, type: 'DEBIT', amount: 100, collected: 100 }, { id: 22, type: 'DEBIT', amount: 80, collected: 80 },
        { id: 23, type: 'DEBIT', amount: 50, collected: 50 }, { id: 24, type: 'DEBIT', amount: 300, collected: 100, carried: 200 },
      ],
    }),
  }
  const lines = L.projectPayrollItemLines(item, facts)
  assertTotals(item, lines)
  assert.deepEqual(lines.earnings.map(line => [line.name, line.amount]), [
    ['الأساسي', 6000], ['بدل السكن', 1000], ['بدل الانتقال', 500], ['بدل طبيعة العمل', 200], ['الإضافي', 312.5],
    ['بدل دوام أيام العطلات', 450.25], ['بدل انتقالات إضافي', 250], ['بدل وجبات', 100], ['مكافأة تميز', 200], ['مصروف مسترد', 25],
  ])
  assert.deepEqual(lines.deductions.map(line => [line.name, line.amount]), [
    ['التأخير', 45.1], ['الانصراف المبكر', 45], ['نقص الساعات', 45], ['الغياب', 256.66], ['إجازة بدون راتب', 256.67], ['الإيقاف', 43.33],
    ['خصم المرضية', 100], ['الالتزام', 80], ['الجودة', 150], ['عجز عهدة', 100], ['السلف', 500], ['التأمينات (حصة الموظف)', 585],
  ])
  assert.deepEqual(lines.totals, { earnings: 9037.75, deductions: 2206.76, net: 6830.99 })
  // المفاتيح ثابتة للأعمدة: البدل ونوع الخصم بأسمائهم
  assert.ok(lines.earnings.some(line => line.key === 'ALLOWANCE:بدل وجبات'))
  assert.ok(lines.deductions.some(line => line.key === 'TYPED:الجودة'))
  assert.ok(lines.earnings.some(line => line.key === 'SALARY:HOUSING'))
})

test('بند قديم بلا تفصيل: الأعمدة نفسها سطور عامة («البدلات الثابتة» و«إضافات أخرى» و«خصومات أخرى»)، والأساسي دايمًا', () => {
  const item = { basicSalary: 3000, allowances: 500, overtimeAmount: 0, otherAdditions: 120.5, latenessDeduction: 10, shortfallDeduction: 20.25,
    absenceDeduction: 0, unpaidLeaveDeduction: 100, loanInstallments: 0, otherDeductions: 40, netPay: 3450.25, breakdown: null }
  const lines = L.projectPayrollItemLines(item)
  assertTotals(item, lines)
  assert.deepEqual(lines.earnings.map(line => line.key), ['BASIC', 'SALARY_ALLOWANCES', 'OTHER_ADDITIONS'])
  assert.deepEqual(lines.deductions.map(line => line.key), ['LATENESS', 'SHORTFALL', 'UNPAID_LEAVE', 'OTHER_DEDUCTIONS'])
  // الأساسي صفر (موظف بدل فقط) يفضل أول سطر
  const zero = L.projectPayrollItemLines({ basicSalary: 0, allowances: 0, netPay: 0, breakdown: '{bad json' })
  assert.deepEqual(zero.earnings, [{ key: 'BASIC', name: 'الأساسي', amount: 0 }])
  assert.deepEqual(zero.deductions, [])
})

test('سطور الدفتر والإجازة ومكونات الراتب اللي ما تطابقش أعمدتها ما تغيرش المجموع: الباقي سطر صريح أو العمود كله سطر واحد', () => {
  const facts = new Map([[1, fact(1, { label: 'بدل سكن مؤقت' })], [2, fact(2, { type: 'DEBIT', category: 'fine', label: 'غرامة' })]])
  // قيد ناقص من الدفتر (اتمسح) → الباقي «إضافات أخرى» / «خصومات أخرى»
  const partial = { basicSalary: 1000, otherAdditions: 300, otherDeductions: 90, netPay: 1210,
    breakdown: JSON.stringify({ obligationLines: [{ id: 1, type: 'CREDIT', collected: 200 }, { id: 99, type: 'CREDIT', collected: 100 }, { id: 2, type: 'DEBIT', collected: 60 }] }) }
  let lines = L.projectPayrollItemLines(partial, facts)
  assertTotals(partial, lines)
  assert.deepEqual(byKey(lines.earnings), { BASIC: 1000, 'ALLOWANCE:بدل سكن مؤقت': 200, OTHER_ADDITIONS: 100 })
  assert.deepEqual(byKey(lines.deductions), { 'DEBIT:fine': 60, OTHER_DEDUCTIONS: 30 })
  // السطور أكبر من العمود (تلف) → العمود كله سطر واحد
  const over = { ...partial, otherAdditions: 150, otherDeductions: 10, netPay: 1140 }
  lines = L.projectPayrollItemLines(over, facts)
  assertTotals(over, lines)
  assert.deepEqual(byKey(lines.earnings), { BASIC: 1000, OTHER_ADDITIONS: 150 })
  assert.deepEqual(byKey(lines.deductions), { OTHER_DEDUCTIONS: 10 })
  // مكونات راتب ما تطابقش عمود البدلات، وسطور إجازة ما تطابقش عمودها → سطر واحد لكل عمود
  const mismatch = { basicSalary: 2000, allowances: 300, unpaidLeaveDeduction: 50, netPay: 2250, breakdown: JSON.stringify({
    salaryComponents: [{ code: 'BASIC', earnedAmount: 2000 }, { code: 'HOUSING', nameAr: 'بدل السكن', earnedAmount: 250 }],
    leaveDeductionLines: [{ code: 'UNPAID_LEAVE', amount: 40 }] }) }
  lines = L.projectPayrollItemLines(mismatch)
  assertTotals(mismatch, lines)
  assert.deepEqual(byKey(lines.earnings), { BASIC: 2000, SALARY_ALLOWANCES: 300 })
  assert.deepEqual(byKey(lines.deductions), { UNPAID_LEAVE: 50 })
  // المسير الأقدم من حماية الصافي: معرفات القيود بس = مبلغ القيد
  const legacyFacts = new Map([[7, fact(7, { type: 'DEBIT', category: 'typed_deduction', deductionRequestId: 4, typeName: 'الالتزام', amount: '75.50' })]])
  const legacy = { basicSalary: 1000, otherDeductions: 75.5, netPay: 924.5, breakdown: JSON.stringify({ obligationIds: [7] }) }
  lines = L.projectPayrollItemLines(legacy, legacyFacts)
  assertTotals(legacy, lines)
  assert.deepEqual(byKey(lines.deductions), { 'TYPED:الالتزام': 75.5 })
  assert.deepEqual(L.payrollItemObligationIds(legacy), [7])
  assert.deepEqual(L.payrollItemObligationIds(partial).sort((a, b) => a - b), [1, 2, 99])
})

test('الانصراف المبكر ما يزيدش عن عمود النقص بعد حماية الصافي (النقص بيسقط الأول)', () => {
  const item = { basicSalary: 1000, shortfallDeduction: '12.00', netPay: 988, breakdown: JSON.stringify({
    attendanceRules: [{ date: '2026-09-01', snapshot: { flexEnabled: false } }],
    attendanceDeductions: { days: [{ date: '2026-09-01', shortfallAmount: 30 }, { date: '2026-09-02', shortfallAmount: 30 }] } }) }
  const lines = L.projectPayrollItemLines(item)
  assertTotals(item, lines)
  assert.deepEqual(byKey(lines.deductions), { EARLY_LEAVE: 12 })
})

test('المجاميع بالقرش لأي بيانات (عشوائي): مجموع البنود = الأعمدة المحفوظة والصافي كما هو', () => {
  let seed = 20260919
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  const amount = (max) => Math.round(random() * max * 100) / 100
  for (let run = 0; run < 300; run++) {
    const facts = new Map()
    const obligationLines = []
    const types = ['الجودة', 'الالتزام', null]
    for (let i = 1; i <= 6; i++) {
      const debit = random() < 0.5
      facts.set(i, fact(i, debit ? { type: 'DEBIT', category: random() < 0.6 ? 'typed_deduction' : 'fine', deductionRequestId: i, typeName: types[i % 3] }
        : { category: random() < 0.5 ? 'allowance' : 'bonus', label: `بدل ${i % 2}`, sourceRef: random() < 0.2 ? `holiday_work:${i}:2026-09-0${i}` : null, bonusRequestId: i }))
      if (random() < 0.8) obligationLines.push({ id: random() < 0.9 ? i : 1000 + i, type: debit ? 'DEBIT' : 'CREDIT', collected: amount(300) })
    }
    const credits = obligationLines.filter(line => line.type === 'CREDIT').reduce((sum, line) => sum + cents(line.collected), 0)
    const debits = obligationLines.filter(line => line.type === 'DEBIT').reduce((sum, line) => sum + cents(line.collected), 0)
    const housing = amount(1500), transport = amount(700)
    const item = {
      basicSalary: amount(9000).toFixed(2), allowances: ((cents(housing) + cents(transport) + (random() < 0.1 ? 1 : 0)) / 100).toFixed(2),
      overtimeAmount: amount(800), otherAdditions: ((credits + (random() < 0.3 ? Math.round(random() * 5000) : 0)) / 100).toFixed(2),
      latenessDeduction: amount(100), shortfallDeduction: amount(100), absenceDeduction: amount(600), unpaidLeaveDeduction: amount(900),
      loanInstallments: amount(1000), otherDeductions: ((debits + (random() < 0.3 ? -Math.min(debits, 500) : 0)) / 100).toFixed(2),
      socialInsuranceDeduction: amount(900), netPay: amount(20000),
      breakdown: JSON.stringify({
        salaryComponents: [{ code: 'BASIC', earnedAmount: 1 }, { code: 'HOUSING', nameAr: 'بدل السكن', earnedAmount: housing }, { code: 'TRANSPORT', nameAr: 'بدل الانتقال', earnedAmount: transport }],
        attendanceRules: [{ date: '2026-09-01', snapshot: { flexEnabled: random() < 0.5 } }],
        attendanceDeductions: { days: [{ date: '2026-09-01', shortfallAmount: random() * 120 }] },
        leaveDeductionLines: [{ code: 'UNPAID_LEAVE', amount: amount(300) }, { code: 'SICK_LEAVE_50', amount: amount(300) }],
        obligationLines,
      }),
    }
    const lines = L.projectPayrollItemLines(item, facts)
    assertTotals(item, lines)
    for (const line of [...lines.earnings, ...lines.deductions]) assert.ok(line.key === 'BASIC' || line.amount !== 0, 'مفيش سطر صفر غير الأساسي')
  }
})

test('أعمدة الجدول: اتحاد البنود اللي ليها مبلغ في أي صف بالترتيب الثابت، والأساسي أول عمود', () => {
  const a = L.projectPayrollItemLines({ basicSalary: 100, overtimeAmount: 5, loanInstallments: 7, socialInsuranceDeduction: 1, netPay: 97 })
  const b = L.projectPayrollItemLines({ basicSalary: 100, latenessDeduction: 3, absenceDeduction: 2, otherAdditions: 4, netPay: 99 })
  const columns = L.payrollLineColumns([a, b])
  assert.deepEqual(columns.earnings.map(column => column.key), ['BASIC', 'OVERTIME', 'OTHER_ADDITIONS'])
  assert.deepEqual(columns.deductions.map(column => column.key), ['LATENESS', 'ABSENCE', 'LOAN', 'SOCIAL_INSURANCE'])
  assert.deepEqual(columns.deductions.map(column => column.name), ['التأخير', 'الغياب', 'السلف', 'التأمينات (حصة الموظف)'])
  assert.deepEqual(L.payrollLineColumns([]), { earnings: [], deductions: [] })
})
