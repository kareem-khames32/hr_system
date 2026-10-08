// B4.3 — بيانات اختبار المطابقة: بنود مسير مولّدة بكل الحالات (مولّد ثابت البذرة، من غير قاعدة بيانات)،
// وبصمة ناتج القارئ عليها. البصمة المثبتة في الاختبار اتحسبت بالكود قبل جدول البنود.
const crypto = require('node:crypto')

function prng(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6D2B79F5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const COMPONENTS = [
  ['HOUSING', 'بدل السكن'], ['TRANSPORT', 'بدل الانتقال'], ['PHONE', 'بدل الهاتف'], ['WORK_NATURE', 'بدل طبيعة العمل'], ['OTHER', 'بدلات أخرى'], ['WORK_PRESSURE', 'بدل ضغط العمل'],
]
const CREDIT_CATEGORIES = ['allowance', 'bonus', 'overtime_retro', 'bonus_reversal', 'manual', 'refund', null]
const DEBIT_CATEGORIES = ['typed_deduction', 'penalty', 'manual', 'advance', 'custody', null]
const ALLOWANCE_NAMES = ['بدل مواصلات', 'بدل وجبة', 'بدل  سفر', 'بدل دوام أيام العطلات 2026-10-02 (8 ساعات)', '']
const TYPE_NAMES = ['خصم جودة', 'خصم التزام', 'مكافأة أداء', 'مكافأة مبيعات', null, '  ']
const LEAVE_CODES = ['UNPAID', 'SUSPENSION', 'SICK_LEAVE_75', 'SICK_LEAVE_0', 'OTHER_UNPAID']

/** count بند مسير + قيود الدفتر المشار إليها. نفس البذرة = نفس البيانات بالحرف. */
function generate(count = 500, seed = 20261009) {
  const random = prng(seed)
  const pick = list => list[Math.floor(random() * list.length)]
  const chance = p => random() < p
  const amount = (max, negative = 0) => {
    const value = Math.round(random() * max * 100) / 100
    return chance(negative) ? -value : value
  }
  const text = value => chance(0.5) ? value.toFixed(2) : value
  const items = [], facts = new Map()
  let factId = 1
  for (let index = 0; index < count; index++) {
    const breakdown = {}
    const basic = chance(0.04) ? 0 : amount(20000)
    // مكونات الراتب: مطابقة للعمود، أو مش مطابقة (مسير قديم)، أو من غير تفصيل، أو بمكوّن سالب
    let allowances = 0
    const mode = index % 5
    if (mode !== 4) {
      const rows = [{ code: 'BASIC', nameAr: 'الراتب الأساسي', earnedAmount: basic }]
      for (const [code, nameAr] of COMPONENTS) {
        if (!chance(0.6)) continue
        const earned = amount(3000, mode === 3 ? 0.3 : 0)
        rows.push({ code, nameAr: chance(0.1) ? `  ${nameAr}  ` : nameAr, earnedAmount: text(earned) })
        allowances += Math.round(earned * 100)
      }
      if (chance(0.05)) { rows.push({ code: 'LEGACY_X', nameAr: '', earnedAmount: 12.5 }); allowances += 1250 }
      breakdown.salaryComponents = rows
      allowances = allowances / 100
      if (mode === 2) allowances = Math.round((allowances + 7.25) * 100) / 100
    } else allowances = amount(5000)

    // قيود الدفتر: بسطورها (المحصّل)، أو بأرقامها بس (مسير قديم)، أو من غيرها، وقيد اتمسح
    let creditCents = 0, debitCents = 0
    const lines = [], ids = []
    const obligationMode = index % 4
    if (obligationMode !== 3) {
      const many = Math.floor(random() * 6)
      for (let n = 0; n < many; n++) {
        const id = factId++
        const type = chance(0.5) ? 'CREDIT' : 'DEBIT'
        const value = amount(900)
        const category = type === 'CREDIT' ? pick(CREDIT_CATEGORIES) : pick(DEBIT_CATEGORIES)
        const holiday = type === 'CREDIT' && category === 'allowance' && chance(0.3)
        if (!chance(0.08)) {
          facts.set(id, { id, type: chance(0.9) ? type : null, category, label: category === 'allowance' ? pick(ALLOWANCE_NAMES) : chance(0.5) ? 'قيد' : null,
            sourceRef: holiday ? `holiday_work:${id}` : chance(0.3) ? `ref:${id}` : null, amount: value.toFixed(2),
            deductionRequestId: type === 'DEBIT' && chance(0.4) ? id : null, bonusRequestId: type === 'CREDIT' && chance(0.4) ? id : null, typeName: pick(TYPE_NAMES) })
        }
        const collected = chance(0.2) ? Math.round(value * 50) / 100 : value
        if (obligationMode === 1) ids.push(chance(0.05) ? String(id) : id)
        else lines.push({ id, type: chance(0.8) ? type : undefined, ...(chance(0.5) ? { collected } : { amount: collected }) })
        const counted = Math.round((obligationMode === 1 ? value : collected) * 100)
        if (type === 'CREDIT') creditCents += counted; else debitCents += counted
      }
      if (obligationMode === 1) breakdown.obligationIds = ids
      else breakdown.obligationLines = chance(0.05) ? [...lines, null] : lines
    }
    // عمود الإضافات والخصومات: مطابق، أو أكبر (باقي)، أو أصغر (العمود كله سطر واحد)، أو سالب
    const column = (sum, kind) => kind === 0 ? sum / 100 : kind === 1 ? (sum + Math.round(random() * 5000)) / 100 : kind === 2 ? Math.max(0, sum - 1) / 100 : -amount(50)
    const otherAdditions = column(creditCents, index % 7 === 6 ? 3 : index % 3)
    const otherDeductions = column(debitCents, index % 11 === 10 ? 3 : (index + 1) % 3)

    // التأخير وإذن بخصم
    const lateness = chance(0.5) ? amount(400, 0.05) : 0
    if (chance(0.5)) {
      const stored = chance(0.1) ? 'abc' : chance(0.1) ? '' : chance(0.5) ? amount(500).toFixed(2) : amount(500)
      breakdown.attendanceDeductions = { totals: { permissionDeduction: stored } }
    }
    // النقص: أيام وردية ثابتة ومرنة
    const shortfall = chance(0.5) ? amount(600) : 0
    if (chance(0.6)) {
      const rules = [], days = []
      for (let day = 1; day <= 5; day++) {
        const date = `2026-09-${String(day).padStart(2, '0')}`
        if (chance(0.7)) rules.push({ date, snapshot: chance(0.5) ? JSON.stringify({ flexEnabled: chance(0.5) }) : { flexEnabled: chance(0.5) } })
        if (chance(0.7)) days.push({ date, shortfallAmount: chance(0.1) ? -3 : Math.round(random() * 1500000) / 10000 })
      }
      breakdown.attendanceRules = rules
      breakdown.attendanceDeductions = { ...(breakdown.attendanceDeductions ?? {}), days }
    }
    // الإجازة بلا أجر: سطور مطابقة، أو مش مطابقة، أو من غير
    let unpaid = chance(0.4) ? amount(1500) : 0
    if (chance(0.5)) {
      const leaveLines = []
      let sum = 0
      for (let n = Math.floor(random() * 4); n > 0; n--) {
        const value = amount(400)
        leaveLines.push({ code: chance(0.9) ? pick(LEAVE_CODES) : null, amount: value })
        sum += Math.round(value * 100)
      }
      breakdown.leaveDeductionLines = leaveLines
      if (chance(0.7)) unpaid = sum / 100
    }
    items.push({
      employeeId: index + 1, basicSalary: text(basic), allowances: text(allowances), overtimeAmount: chance(0.4) ? text(amount(1200)) : 0,
      otherAdditions, latenessDeduction: lateness, shortfallDeduction: shortfall, absenceDeduction: chance(0.3) ? text(amount(900)) : 0,
      unpaidLeaveDeduction: unpaid, loanInstallments: chance(0.3) ? amount(1000) : null, otherDeductions,
      socialInsuranceDeduction: chance(0.6) ? text(amount(1100)) : undefined, netPay: text(amount(25000, 0.03)),
      breakdown: chance(0.03) ? '{bad json' : chance(0.03) ? null : JSON.stringify(breakdown),
    })
  }
  return { items, facts }
}

/** بصمة ناتج القارئ على كل البنود وأعمدة جدولها. */
function digest(project, columns, data = generate()) {
  const rows = data.items.map(item => project(item, data.facts))
  return crypto.createHash('sha256').update(JSON.stringify({ rows, columns: columns(rows) })).digest('hex')
}

module.exports = { generate, digest }
