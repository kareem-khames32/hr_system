// «إيه اللي رايح للبنك وإيه اللي بيتصرف نقدي» (تدقيق 21 سبتمبر): تنبيهات كشف البنوك،
// ومصدر واحد لطريقة الصرف بين الكشف وتقرير طرق الصرف. دوال صافية + فحص نصي للملفات؛ لا SQL ولا خدمة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const { bankSheetPayMethodSummary, bankSheetRowIssue, bankSheetSources, buildBankSheet, NO_BANK_LABEL } = require('../src/payroll/bank-sheet')
const { payrollPaySplit } = require('../src/payroll/pay-split')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')

const IBAN = 'SA0380000000608010167519'
const EG_IBAN = 'EG380019000500000000263180002'

test('تنبيه الصف: طريقة مجهولة، «نقدي + بنك» بلا مبلغ، بنك أو آيبان ناقص، وآيبان مش بالشكل الصحيح', () => {
  const clean = { payMethod: 'transfer', bankName: 'الراجحي', iban: IBAN, bankAmount: 1000 }
  assert.equal(bankSheetRowIssue(clean), null)
  assert.equal(bankSheetRowIssue({ ...clean, iban: EG_IBAN }), null)
  // الآيبان بمسافات وشُرط وحروف صغيرة سليم — الناس بتكتبه كده
  assert.equal(bankSheetRowIssue({ ...clean, iban: 'sa03 8000 0000 6080-1016 7519' }), null)
  assert.equal(bankSheetRowIssue({ payMethod: 'cash', bankName: null, iban: null, bankAmount: 0 }), null)
  assert.equal(bankSheetRowIssue({ payMethod: 'mixed', bankTransferAmount: 500, bankName: 'الراجحي', iban: IBAN, bankAmount: 500 }), null)

  // طريقة صرف مش من قائمة النظام (قيمة قديمة زي 'BANK' في قاعدة الشركة) — أعلى أولوية
  assert.match(bankSheetRowIssue({ ...clean, payMethod: 'BANK' }), /طريقة صرف غير معروفة «BANK»/)
  assert.match(bankSheetRowIssue({ payMethod: 'BANK', bankName: null, iban: null, bankAmount: 200 }), /طريقة صرف غير معروفة/)
  // «نقدي + بنك» بلا مبلغ ⇒ الصافي كله نقدي صامت؛ بيتقال حتى لو مبلغ البنك صفر
  for (const amount of [undefined, null, 0, '0', '']) {
    assert.match(bankSheetRowIssue({ payMethod: 'mixed', bankTransferAmount: amount, bankName: 'الراجحي', iban: IBAN, bankAmount: 0 }),
      /«نقدي \+ بنك» بدون مبلغ تحويل بنكي/, String(amount))
  }
  assert.match(bankSheetRowIssue({ ...clean, bankName: null }), /بدون اسم بنك/)
  assert.match(bankSheetRowIssue({ ...clean, bankName: '   ' }), /بدون اسم بنك/)
  assert.match(bankSheetRowIssue({ ...clean, iban: null }), /بدون آيبان/)
  assert.match(bankSheetRowIssue({ ...clean, iban: 'SA12345678901234' }), /الآيبان مش بالشكل الصحيح/)
  assert.match(bankSheetRowIssue({ ...clean, iban: 'SA038000000060801016751X' }), /الآيبان مش بالشكل الصحيح/)
  // مفيش مبلغ بنكي ⇒ نقص البنك أو الآيبان مش تنبيه الشهر ده (مفيش فلوس بتتحرك)
  assert.equal(bankSheetRowIssue({ payMethod: 'transfer', bankName: null, iban: null, bankAmount: 0 }), null)
})

test('كشف البنوك: التنبيهات مجمَّعة بمبلغها، والصف يفضل في الكشف بمبلغه، والتصفية برّه التنبيهات', () => {
  const sheet = buildBankSheet([
    { employeeId: 1, employeeCode: 'EMP-0001', fullName: 'سليم', payMethod: 'transfer', bankTransferAmount: null, bankName: 'الراجحي', iban: IBAN, netPay: 1000 },
    { employeeId: 2, employeeCode: 'EMP-0002', fullName: 'بلا آيبان', payMethod: 'transfer', bankTransferAmount: null, bankName: 'الرياض', iban: null, netPay: 700 },
    { employeeId: 3, employeeCode: 'EMP-0003', fullName: 'مختلط بلا مبلغ', payMethod: 'mixed', bankTransferAmount: null, bankName: 'الراجحي', iban: IBAN, netPay: 800 },
    { employeeId: 4, employeeCode: 'EMP-0004', fullName: 'طريقة مجهولة', payMethod: 'BANK', bankTransferAmount: null, bankName: 'الراجحي', iban: IBAN, netPay: 200 },
    { employeeId: 5, employeeCode: 'EMP-0005', fullName: 'تصفية بلا آيبان', payMethod: 'transfer', bankTransferAmount: null, bankName: null, iban: null, netPay: 500,
      settlementPayout: { caseId: 9, lastWorkingDay: '2026-09-22', label: 'تصفية — مصروف مع التصفية' } },
  ])
  const issueOf = id => sheet.rows.find(row => row.employeeId === id).issue
  assert.equal(issueOf(1), null)
  assert.match(issueOf(2), /بدون آيبان/)
  assert.match(issueOf(3), /بدون مبلغ تحويل بنكي/)
  assert.match(issueOf(4), /طريقة صرف غير معروفة/)
  // الصفوف المنبَّهة لسه في الكشف بمبلغها — مفيش مبلغ بيتشال صامت
  assert.deepEqual(sheet.totals, { employees: 4, bank: 1900, cash: 800, net: 2700 })
  assert.deepEqual([sheet.issues.employees, sheet.issues.bank, sheet.issues.cash], [3, 900, 800])
  assert.deepEqual(sheet.issues.rows.map(row => row.employeeId).sort((a, b) => a - b), [2, 3, 4])
  // صف التصفية برّه الكشف والتنبيهات تمامًا
  assert.equal(sheet.rows.some(row => row.employeeId === 5), false)
  assert.equal(sheet.issues.rows.some(row => row.employeeId === 5), false)
  assert.deepEqual([sheet.settlement.employees, sheet.settlement.total], [1, 500])
})

test('مصادر الكشف: الهوية من لقطة العضوية، وبيانات الصرف من ملف الموظف الحالي، وفلترة الفرع، والتصفية', () => {
  const items = [
    { employeeId: 10, netPay: '900.00', payMethod: 'cash', breakdown: '{}' },
    { employeeId: 11, netPay: 500, payMethod: 'transfer', breakdown: '{"settlementPayout":{"caseId":7,"lastWorkingDay":"2026-09-22"}}' },
    { employeeId: 12, netPay: 100, payMethod: 'cash', breakdown: null },
    { employeeId: 13, netPay: 300, payMethod: 'mixed', breakdown: '{}' },
  ]
  const employees = [
    // ملف الموظف اتغير بعد الحساب: البند محفوظ 'cash' والملف بقى 'transfer' ⇒ الكشف بياخد الملف
    { id: 10, employeeCode: 'NEW-10', fullName: 'الاسم الحالي', branchId: 3, payMethod: 'transfer', bankTransferAmount: null, bankName: 'الراجحي', iban: IBAN },
    { id: 11, employeeCode: 'NEW-11', fullName: 'مغادر', branchId: 3, payMethod: 'transfer', bankTransferAmount: null, bankName: 'الراجحي', iban: IBAN },
    { id: 12, employeeCode: 'NEW-12', fullName: 'فرع تاني', branchId: 4, payMethod: 'cash', bankTransferAmount: null, bankName: null, iban: null },
  ]
  const members = [
    { employeeId: 10, snapshot: { employeeCode: 'OLD-10', fullName: 'الاسم وقت المسير', branchId: 3 } },
    { employeeId: 11, snapshot: { employeeCode: 'OLD-11', fullName: 'مغادر', branchId: 3 } },
    { employeeId: 12, snapshot: { employeeCode: 'OLD-12', fullName: 'فرع تاني', branchId: 4 } },
  ]
  const settlementOf = breakdown => {
    const payout = JSON.parse(breakdown || '{}').settlementPayout
    return payout ? { caseId: payout.caseId, lastWorkingDay: payout.lastWorkingDay, label: 'تصفية — مصروف مع التصفية' } : null
  }

  const all = bankSheetSources({ items, employees, members, branchScope: null, settlementOf })
  assert.deepEqual(all.map(source => source.employeeId), [10, 11, 12, 13])
  // الهوية تاريخية من اللقطة، وطريقة الصرف والآيبان من الملف الحالي
  assert.deepEqual([all[0].employeeCode, all[0].fullName, all[0].payMethod, all[0].iban], ['OLD-10', 'الاسم وقت المسير', 'transfer', IBAN])
  assert.equal(all[1].settlementPayout.caseId, 7)
  assert.equal(all[0].settlementPayout, null)
  // موظف بلا صف في الجدول (محذوف/مخفي): الطريقة ترجع للقطة البند بلا انهيار
  assert.deepEqual([all[3].employeeCode, all[3].payMethod, all[3].bankName], ['', 'mixed', null])

  const scoped = bankSheetSources({ items, employees, members, branchScope: [3], settlementOf })
  assert.deepEqual(scoped.map(source => source.employeeId), [10, 11])
  // نطاق فروع متعددة (طلب المالك 26 سبتمبر): كل فروعه، والنطاق الفاضي ولا صف
  assert.deepEqual(bankSheetSources({ items, employees, members, branchScope: [3, 999], settlementOf }).map(source => source.employeeId), [10, 11])
  assert.deepEqual(bankSheetSources({ items, employees, members, branchScope: [], settlementOf }), [])
})

test('ملخص طرق الصرف = نفس صفوف كشف البنوك: بنك + نقدي لكل طريقة، ومجموعهما = الصافي المستحق', () => {
  const sheet = buildBankSheet([
    { employeeId: 1, employeeCode: 'EMP-0001', fullName: 'أ', payMethod: 'transfer', bankTransferAmount: null, bankName: 'الراجحي', iban: IBAN, netPay: 1000 },
    { employeeId: 2, employeeCode: 'EMP-0002', fullName: 'ب', payMethod: 'cash', bankTransferAmount: null, bankName: null, iban: null, netPay: '500.55' },
    { employeeId: 3, employeeCode: 'EMP-0003', fullName: 'ج', payMethod: 'mixed', bankTransferAmount: 300, bankName: 'الأهلي', iban: IBAN, netPay: 800 },
    { employeeId: 4, employeeCode: 'EMP-0004', fullName: 'د', payMethod: 'mixed', bankTransferAmount: 5000, bankName: 'الأهلي', iban: IBAN, netPay: 300 },
    { employeeId: 5, employeeCode: 'EMP-0005', fullName: 'هـ', payMethod: 'mixed', bankTransferAmount: 500, bankName: 'الأهلي', iban: IBAN, netPay: 0 },
    { employeeId: 6, employeeCode: 'EMP-0006', fullName: 'و', payMethod: 'transfer', bankTransferAmount: null, bankName: 'الراجحي', iban: IBAN, netPay: 200,
      settlementPayout: { caseId: 3, lastWorkingDay: '2026-09-22', label: 'تصفية — مصروف مع التصفية' } },
  ])
  const summary = bankSheetPayMethodSummary(sheet.rows)
  assert.deepEqual(summary, {
    transfer: { label: 'تحويل بنكي', count: 1, total: 1000, bank: 1000, cash: 0 },
    cash: { label: 'نقدي', count: 1, total: 500.55, bank: 0, cash: 500.55 },
    mixed: { label: 'نقدي + بنك', count: 3, total: 1100, bank: 600, cash: 500 },
  })
  // التسوية: مجموع البنك والنقدي لكل طريقة = مجاميع الكشف = الصافي المستحق (التصفية برّه)
  const cents = value => Math.round(value * 100)
  const sum = key => Object.values(summary).reduce((total, row) => total + cents(row[key]), 0)
  assert.deepEqual([sum('bank'), sum('cash'), sum('total')], [cents(sheet.totals.bank), cents(sheet.totals.cash), cents(sheet.totals.net)])
  assert.equal(sum('bank') + sum('cash'), sum('total'))
  for (const row of Object.values(summary)) assert.equal(cents(row.bank) + cents(row.cash), cents(row.total))
})

test('الصافي السالب: الصافي زي ما هو في التقرير (يطابق إجمالي المسير) والمصروف صفر — الحالة الوحيدة اللي التسوية فيها بتختلف', () => {
  const sheet = buildBankSheet([
    { employeeId: 1, employeeCode: 'EMP-0001', fullName: 'أ', payMethod: 'mixed', bankTransferAmount: 500, bankName: 'الراجحي', iban: IBAN, netPay: -400 },
    { employeeId: 2, employeeCode: 'EMP-0002', fullName: 'ب', payMethod: 'transfer', bankTransferAmount: null, bankName: 'الراجحي', iban: IBAN, netPay: 1000 },
  ])
  const negative = sheet.rows.find(row => row.employeeId === 1)
  assert.deepEqual([negative.netPay, negative.bankAmount, negative.cashAmount], [-400, 0, 0])
  assert.deepEqual(sheet.totals, { employees: 2, bank: 1000, cash: 0, net: 1000 })
  const summary = bankSheetPayMethodSummary(sheet.rows)
  assert.deepEqual(summary.mixed, { label: 'نقدي + بنك', count: 1, total: -400, bank: 0, cash: 0 })
  assert.deepEqual(summary.transfer, { label: 'تحويل بنكي', count: 1, total: 1000, bank: 1000, cash: 0 })
})

test('القاعدة بالقرش لكل حالة: بنك = أقل من (مبلغ البنك، الصافي) ونقدي = الباقي، بلا تقريب لأعلى', () => {
  const cents = value => Math.round(value * 100)
  const cases = [
    [1000, 'transfer', null], [1000, 'cash', null], [1000, 'visa', null], [1000, 'mixed', 300],
    ['4321.559', 'mixed', '1000.109'], [300, 'mixed', 5000], [0, 'mixed', 500], [-400, 'mixed', 500],
    ['0.01', 'mixed', '0.005'], [1000, 'mixed', 0], [1000, 'mixed', null],
  ]
  for (const [net, method, wanted] of cases) {
    const split = payrollPaySplit(net, method, wanted)
    const total = Math.max(0, Math.trunc(Math.round(Number(net) * 1e6) / 1e4))
    const expectedBank = method === 'cash' ? 0
      : method !== 'mixed' ? total
      : Math.min(total, Math.max(0, Math.trunc(Math.round(Number(wanted) * 1e6) / 1e4)))
    assert.deepEqual([cents(split.bank), cents(split.cash)], [expectedBank, total - expectedBank], `${net}/${method}/${wanted}`)
    assert.equal(cents(split.bank) + cents(split.cash), total, `${net}/${method}/${wanted}`)
  }
  // الصافي بالسالب مش صرف بالسالب: بنك صفر ونقدي صفر
  assert.deepEqual(payrollPaySplit(-400, 'mixed', 500), { bank: 0, cash: 0 })
  assert.deepEqual(payrollPaySplit(-400, 'transfer', null), { bank: 0, cash: 0 })
  // مفيش اسم بنك ⇒ مجموعة «بدون بنك محدد» عشان المبلغ ما يختفيش من إجماليات البنوك
  const sheet = buildBankSheet([{ employeeId: 1, employeeCode: 'EMP-0001', fullName: 'أ', payMethod: 'transfer', bankTransferAmount: null, bankName: null, iban: null, netPay: 100 }])
  assert.deepEqual(sheet.banks, [{ bankName: NO_BANK_LABEL, employees: 1, total: 100 }])
})

test('الربط: تقرير طرق الصرف من نفس مصدر الكشف، والشاشة بتعرض التنبيه والتصفية والقالب بيصدّرهم', () => {
  const service = read('api/src/payroll/payroll.service.ts')
  // مصدر واحد: مفيش تجميع على payMethod المحفوظ في البند
  assert.match(service, /bankSheetPayMethodSummary\(buildBankSheet\(sources\)\.rows\)/)
  assert.match(service, /bankSheetSources\(\{ items: detail\.items, employees, members: detail\.members,/)
  assert.doesNotMatch(service, /byMethod\[m\] = byMethod\[m\] \?\? \{ count: 0, total: 0 \}/)
  const controller = read('api/src/payroll/bank-sheet.controller.ts')
  assert.match(controller, /bankSheetSources\(\{ items: detail\.items, employees, members: detail\.members, branchScope: scope,/)

  const page = read('src/app/payroll/bank-sheet/page.tsx')
  assert.ok(page.includes("'تنبيه'"), 'عمود التنبيه في رأس الجدول والتصدير')
  assert.match(page, /sheet\.issues\.employees > 0/)
  assert.match(page, /sheet\.settlement\.employees > 0/)
  assert.ok(page.includes('row.issue ?? \'\''), 'التنبيه بيتصدّر في الملف كمان')
  assert.match(page, /مصروف مع التصفية/)

  const api = read('src/lib/api.ts')
  assert.match(api, /issue: string \| null/)
  assert.match(api, /issues: \{ employees: number; bank: number; cash: number; rows: ApiBankSheetRow\[\] \}/)
  assert.match(api, /export interface ApiPayMethodReportRow \{ label: string; count: number; total: number; bank: number; cash: number \}/)

  const payroll = read('src/app/payroll/page.tsx')
  assert.match(payroll, /payMethodTotals/)
  assert.ok(payroll.includes('نقدي / تحويل بنكي / نقدي + بنك'), 'وصف الملخص بيذكر «نقدي + بنك»')
})
