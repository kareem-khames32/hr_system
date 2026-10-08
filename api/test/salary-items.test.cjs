// B4.3 — بنود الراتب: حساب نقي بلا قاعدة بيانات.
// المطابقة: 500 بند مسير مولّدين بكل الحالات — ناتج القارئ بترتيب جدول البنود = ناتج الكود قبل الجدول بالحرف (بصمة اتحسبت بالكود القديم)،
// ومجموع السطور = الأعمدة المحفوظة بالقرش. والبذرة بتغطي كل سطر القارئ بيطلّعه، وتغيير الترتيب بيرتّب من غير ما يغيّر مبلغ.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const lines = require('../src/payroll/payroll-item-lines')
const items = require('../src/payroll/salary-items')
const { generate, digest } = require('./fixtures/salary-items-parity.cjs')

// بصمة ناتج projectPayrollItemLines + payrollLineColumns على generate() بالكود قبل B4.3 (الرتب الثابتة في lineRank)
const GOLDEN = '55f3cb5f93b9b80ce941f6bbfbcdb0ac6bd63aff7ea24159e0dcd1047f357be0'
// الرتب الثابتة قبل الجدول (lineRank) — البذرة لازم تساويها بالحرف
const LEGACY_RANKS = { BASIC: 0, HOUSING: 11, TRANSPORT: 12, PHONE: 13, WORK_NATURE: 14, OTHER: 15, WORK_PRESSURE: 16, SALARY_ALLOWANCES: 19, OVERTIME: 20, HOLIDAY_WORK: 30,
  ALLOWANCE: 40, BONUS: 50, CREDIT: 60, OTHER_ADDITIONS: 90, LATENESS: 100, DEDUCT_PERMISSION: 101, EARLY_LEAVE: 102, SHORTFALL: 103, ABSENCE: 104, UNPAID_LEAVE: 105,
  SUSPENSION: 106, SICK_LEAVE: 107, TYPED_DEDUCTION: 110, DEBIT: 120, OTHER_DEDUCTIONS: 130, LOAN: 140, SOCIAL_INSURANCE: 150 }
const cents = value => Math.round(Number(value || 0) * 100)
const data = generate()
const seedOrder = new Map(items.SALARY_ITEM_SEED.map(seed => [seed.code, seed.sortOrder]))

test('SU-01: البذرة — أكواد فريدة، وترتيبها = الرتب الثابتة قبل الجدول، ومكونات الراتب بتتناسب بأيام الخدمة، والبنود القانونية الجديدة مابتتحسبش', () => {
  const seed = items.SALARY_ITEM_SEED
  assert.equal(new Set(seed.map(row => row.code)).size, seed.length)
  for (const row of seed) {
    assert.ok(['EARNING', 'DEDUCTION'].includes(row.kind) && ['SERVICE_DAYS', 'NONE'].includes(row.proration), row.code)
    assert.ok(row.nameAr.trim() && row.nameEn.trim() && Number.isInteger(row.sortOrder), row.code)
    for (const flag of ['insurable', 'taxable', 'statutory', 'computed']) assert.equal(typeof row[flag], 'boolean', `${row.code}.${flag}`)
  }
  assert.deepEqual(Object.fromEntries(seed.filter(row => row.computed).map(row => [row.code, row.sortOrder])), LEGACY_RANKS)
  assert.deepEqual(seed.filter(row => row.proration === 'SERVICE_DAYS').map(row => row.code), ['BASIC', 'HOUSING', 'TRANSPORT', 'PHONE', 'WORK_NATURE', 'OTHER', 'WORK_PRESSURE', 'SALARY_ALLOWANCES'])
  // مكان البنود القانونية: بعد التأمينات، ومابتتحسبش لسه
  assert.deepEqual(seed.filter(row => row.statutory).map(row => [row.code, row.kind, row.computed, row.sortOrder]),
    [['SOCIAL_INSURANCE', 'DEDUCTION', true, 150], ['INCOME_TAX', 'DEDUCTION', false, 151], ['MARTYRS_FUND', 'DEDUCTION', false, 152], ['HEALTH_INSURANCE', 'DEDUCTION', false, 153]])
  // خانات الموظف مصدر الحقيقة: أسماء مكونات الراتب من compensation.ts نفسها
  const { PAID_SALARY_COMPONENTS } = require('../src/employees/compensation')
  for (const component of PAID_SALARY_COMPONENTS) assert.equal(seed.find(row => row.code === component.code).nameAr, component.nameAr)
})

test('SU-02: المطابقة على 500 بند مولّدين بكل الحالات — نفس الناتج بالحرف بالترتيب الثابت وبترتيب الجدول، والمجاميع = الأعمدة المحفوظة', () => {
  assert.equal(data.items.length, 500)
  assert.equal(digest(lines.projectPayrollItemLines, lines.payrollLineColumns, data), GOLDEN, 'من غير ترتيب مبعوت (قبل الترحيل)')
  assert.equal(digest((item, facts) => lines.projectPayrollItemLines(item, facts, seedOrder), rows => lines.payrollLineColumns(rows, seedOrder), data), GOLDEN, 'بترتيب الجدول (بذرته)')
  // البيانات بتغطي كل عائلة سطور، وكل سطر له بند من نوع قايمته
  const kinds = new Map(items.SALARY_ITEM_SEED.map(seed => [seed.code, seed.kind]))
  const seen = new Set()
  for (const item of data.items) {
    const row = lines.projectPayrollItemLines(item, data.facts, seedOrder)
    for (const [list, kind] of [[row.earnings, 'EARNING'], [row.deductions, 'DEDUCTION']]) {
      for (const line of list) {
        const code = items.salaryItemCodeOf(line.key)
        assert.equal(kinds.get(code), kind, line.key)
        seen.add(code)
      }
    }
    // المجاميع = الأعمدة المحفوظة بالقرش، ومجموع السطور = المجاميع
    assert.equal(cents(row.totals.earnings), cents(item.basicSalary) + cents(item.allowances) + cents(item.overtimeAmount) + cents(item.otherAdditions))
    assert.equal(cents(row.totals.deductions), cents(item.latenessDeduction) + cents(item.shortfallDeduction) + cents(item.absenceDeduction) + cents(item.unpaidLeaveDeduction) +
      cents(item.loanInstallments) + cents(item.otherDeductions) + cents(item.socialInsuranceDeduction))
    assert.equal(row.earnings.reduce((sum, line) => sum + cents(line.amount), 0), cents(row.totals.earnings), `earnings ${item.employeeId}`)
    assert.equal(row.deductions.reduce((sum, line) => sum + cents(line.amount), 0), cents(row.totals.deductions), `deductions ${item.employeeId}`)
    assert.equal(cents(row.totals.net), cents(item.netPay))
  }
  assert.deepEqual([...seen].sort(), Object.keys(LEGACY_RANKS).sort(), 'كل البنود اللي بتتحسب ظهرت في البيانات')
})

test('SU-03: الترتيب من الجدول — تغييره بيرتّب السطور والأعمدة من غير ما يغيّر مبلغ، والسطر اللي مالوش بند في الآخر', () => {
  assert.deepEqual(['BASIC', 'SALARY:HOUSING', 'SALARY:WORK_PRESSURE', 'SALARY:LEGACY_X', 'SALARY_ALLOWANCES', 'ALLOWANCE:بدل: سفر', 'BONUS:مكافأة', 'CREDIT:manual', 'TYPED:خصم جودة',
    'DEBIT:penalty', 'SOCIAL_INSURANCE', 'UNKNOWN', 'OTHER:x'].map(items.salaryItemCodeOf),
    ['BASIC', 'HOUSING', 'WORK_PRESSURE', 'SALARY_ALLOWANCES', 'SALARY_ALLOWANCES', 'ALLOWANCE', 'BONUS', 'CREDIT', 'TYPED_DEDUCTION', 'DEBIT', 'SOCIAL_INSURANCE', null, null])
  assert.deepEqual(['BASIC', 'SALARY:HOUSING', 'SALARY:LEGACY_X', 'ALLOWANCE:x', 'TYPED:x', 'UNKNOWN'].map(key => items.salaryItemRank(key)), [0, 11, 19, 40, 110, 200])
  // كود ناقص من الترتيب المبعوت (صف اتمسح من الجدول): بيرجع للثابت
  assert.equal(items.salaryItemRank('OVERTIME', new Map([['BASIC', 0]])), 20)

  const custom = new Map(seedOrder)
  custom.set('WORK_PRESSURE', 5); custom.set('OVERTIME', 1); custom.set('SOCIAL_INSURANCE', 99); custom.set('TYPED_DEDUCTION', 98)
  const plain = line => `${line.key}|${line.name}|${line.amount}`
  let moved = 0
  const before = [], after = []
  for (const item of data.items) {
    const a = lines.projectPayrollItemLines(item, data.facts, seedOrder), b = lines.projectPayrollItemLines(item, data.facts, custom)
    before.push(a); after.push(b)
    assert.deepEqual(b.totals, a.totals)
    for (const list of ['earnings', 'deductions']) {
      assert.deepEqual(b[list].map(plain).sort(), a[list].map(plain).sort(), 'نفس السطور ونفس المبالغ')
      if (b[list].map(plain).join() !== a[list].map(plain).join()) moved++
      const ranks = b[list].map(line => items.salaryItemRank(line.key, custom))
      assert.deepEqual(ranks, [...ranks].sort((x, y) => x - y), 'مترتبة بترتيب الجدول')
    }
  }
  assert.ok(moved > 100, `الترتيب اتغيّر فعلًا في ${moved} قايمة`)
  const columns = lines.payrollLineColumns(after, custom), old = lines.payrollLineColumns(before, seedOrder)
  assert.deepEqual(columns.earnings.map(column => column.key).sort(), old.earnings.map(column => column.key).sort())
  assert.deepEqual(columns.earnings.slice(0, 2).map(column => column.key), ['BASIC', 'OVERTIME'])
  assert.ok(columns.deductions.findIndex(column => column.key === 'SOCIAL_INSURANCE') < columns.deductions.findIndex(column => column.key === 'LATENESS'))
})

test('SU-04: مصدر الكود — كل شاشة بتعرض البنود بتقرا الترتيب من الجدول، والتعديل لحساب الشركة تحت قفل الصف وبسطر تدقيق، ومفيش إضافة ولا مسح', () => {
  const read = file => fs.readFileSync(path.join(apiRoot, 'src', 'payroll', file), 'utf8')
  assert.match(read('payroll-item-lines.ts'), /const sorting = order \?\? await readSalaryItemOrder\(em\)/)
  assert.doesNotMatch(read('payroll-item-lines.ts'), /function lineRank/)
  for (const file of ['payroll.service.ts', 'payroll-overview.service.ts']) {
    const text = read(file)
    assert.equal((text.match(/payrollLineColumns\(rows, order\)/g) ?? []).length, 1, file)
    assert.doesNotMatch(text, /payrollLineColumns\(rows\)/, file)
  }
  const service = read('salary-items.service.ts'), controller = read('salary-items.controller.ts')
  assert.match(service, /async update\([^)]*\) \{\s*assertCompanyWideWrite\(user\)/)
  assert.match(service, /lock: \{ mode: 'pessimistic_write' \}/)
  assert.match(service, /action: 'SALARY_ITEM_UPDATED'/)
  assert.doesNotMatch(service, /\.delete\(|\.remove\(|nameAr:\s*input|nameEn:\s*input/)
  assert.equal((controller.match(/@Perm\('settings\.manage'\)/g) ?? []).length, 2)
  assert.doesNotMatch(controller, /@Post\(|@Delete\(/)
  // حساب المسير مابيقراش الجدول: الجدول للعرض والترتيب بس
  assert.doesNotMatch(read('payroll.service.ts').replace(/readSalaryItemOrder/g, ''), /salary_items|SalaryItem\b/)
})
