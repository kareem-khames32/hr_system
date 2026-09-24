'use strict'
// «اللي اتصرف فعلًا» (تدقيق 24 سبتمبر — N02): بند اتسجل صرفه نقدي يفضل نقدي في كشف البنوك والتقرير المالي وشاشة الصرف
// حتى لو طريقة الصرف في ملف الموظف اتغيرت لتحويل بنكي بعد كده؛ والبند اللي لسه ماتصرفش يفضل على ملف الموظف الحالي.
// ومعاه (N01): تقرير الحضور الشهري وأيام العمل ومعاينة الإضافي — الموظف غير الموجود وخارج النطاق نفس الرد بالحرف.
// دوال المنتج وكنترولراته الحقيقية بمستودعات اصطناعية؛ لا SQL ولا شبكة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const { recordedDisbursement, disbursementMarksByItem } = require('../src/payroll/payroll-disbursement-split')
const { bankSheetSources, buildBankSheet } = require('../src/payroll/bank-sheet')
const { buildPayrollDisbursementRows, summarizePayrollDisbursement } = require('../src/payroll/payroll-disbursement')
const { PayrollBankSheetController } = require('../src/payroll/bank-sheet.controller')
const { PayrollItemDisbursement } = require('../src/payroll/payroll-disbursement.entities')
const { payrollItemSettlementPayout } = require('../src/payroll/payroll-settlement-salary')
const { computeFinancialRow, buildPayrollRegister } = require('../src/reports/financial-report')
const { AttendanceService } = require('../src/attendance/attendance.service')
const { AttendanceController } = require('../src/attendance/attendance.controller')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/\r\n/g, '\n')

const IBAN = 'SA0380000000608010167519'
// صرف نقدي مسجل للبند 11، وبعده ملف الموظف بقى «تحويل بنكي»
const item = { id: 11, employeeId: 1, netPay: '1000.00', payMethod: 'cash', breakdown: '{}' }
const liveTransfer = { id: 1, employeeCode: 'SYN-001', fullName: 'موظف اختبار', branchId: 1, payMethod: 'transfer',
  bankTransferAmount: null, bankName: 'بنك الاختبار', iban: IBAN }
const member = { employeeId: 1, snapshot: { employeeCode: 'SYN-001', fullName: 'موظف اختبار', branchId: 1 } }
const paidCashMark = { runId: 1, itemId: 11, employeeId: 1, status: 'PAID', amount: '1000.00', bankAmount: '0.00', cashAmount: '1000.00',
  payMethod: 'cash', note: null, markedByUserId: 2, markedAt: new Date('2026-09-01T09:00:00Z') }
const C = value => Math.round(Number(value) * 100)

function bankSheetOf({ runStatus, marks }) {
  return buildBankSheet(bankSheetSources({ items: [item], employees: [liveTransfer], members: [member], branchScope: null,
    settlementOf: payrollItemSettlementPayout, runStatus, marks }))
}
function registerOf({ runStatus, mark }) {
  const row = computeFinancialRow({ runId: 1, runName: 'سبتمبر', runStatus, employeeId: 1, employeeCode: 'SYN-001', fullName: 'موظف اختبار',
    branchId: 1, branchName: 'الفرع', departmentId: null, departmentName: null, costCenterId: null, costCenterName: null,
    itemPayMethod: item.payMethod, employeePayMethod: liveTransfer.payMethod, bankTransferAmount: null,
    basicSalary: '1000.00', allowances: '0.00', overtimeAmount: '0.00', otherAdditions: '0.00', latenessDeduction: '0.00',
    shortfallDeduction: '0.00', absenceDeduction: '0.00', unpaidLeaveDeduction: '0.00', loanInstallments: '0.00', otherDeductions: '0.00',
    netPay: item.netPay, disbursementStatus: mark?.status ?? null, disbursedPayMethod: mark?.payMethod ?? null,
    disbursedBankAmount: mark?.bankAmount ?? null, disbursedCashAmount: mark?.cashAmount ?? null }, new Map())
  return { row, register: buildPayrollRegister([row], false) }
}
// كنترولر كشف البنوك الحقيقي: detail من خدمة اصطناعية، والموظفون والعلامات من مستودعات اصطناعية بالكيان
function bankSheetController({ status, marks }) {
  const repositories = new Map([[PayrollItemDisbursement, marks]])
  return new PayrollBankSheetController(
    { async detail() { return { id: 1, name: 'سبتمبر', period: '2026-09', status, startDate: '2026-08-23', endDate: '2026-09-22', items: [item], members: [member] } } },
    { getRepository(entity) { const rows = repositories.get(entity) ?? [liveTransfer]; return { async find() { return rows } } } })
}

test('REC-01: قاعدة الصرف المسجل — علامة «تم الصرف» ثم «لم يتم» ثم مسير مصروف بلا علامات ثم مسير لسه ما اتصرفش', () => {
  assert.deepEqual(recordedDisbursement({ runStatus: 'APPROVED', itemPayMethod: 'cash', mark: paidCashMark }),
    { payMethod: 'cash', amounts: { bank: 0, cash: 1000 } }, 'المسجل يغلب حتى قبل إقفال المسير')
  assert.deepEqual(recordedDisbursement({ runStatus: 'PAID', itemPayMethod: 'cash', mark: { ...paidCashMark, status: 'UNPAID', bankAmount: 0, cashAmount: 0 } }),
    null, '«لم يتم» = لسه ماتصرفلوش ⇒ ملف الموظف الحالي')
  assert.deepEqual(recordedDisbursement({ runStatus: 'PAID', itemPayMethod: 'cash', mark: null }), { payMethod: 'cash', amounts: null },
    'مسير مصروف بلا علامات ⇒ طريقة الصرف المحفوظة على البند')
  assert.equal(recordedDisbursement({ runStatus: 'APPROVED', itemPayMethod: 'cash', mark: null }), null)
  assert.equal(recordedDisbursement({ runStatus: 'PAID', itemPayMethod: null, mark: null }), null)
  // القص لا التقريب على المبلغ المسجل، وصف بلا رقم بند بيتجاهل
  assert.deepEqual(recordedDisbursement({ mark: { status: 'PAID', payMethod: 'mixed', bankAmount: '300.019', cashAmount: '700.115' } }).amounts,
    { bank: 300.01, cash: 700.11 })
  assert.deepEqual([...disbursementMarksByItem([{ itemId: 11 }, { itemId: null }, { itemId: 'x' }, {}]).keys()], [11])
})

test('REC-02: كشف البنوك بعد تغيير طريقة الصرف — البند المصروف نقدي يفضل نقدي، واللي بلا علامة يتبع ملف الموظف', async () => {
  // المسير معتمد والعلامة مسجلة نقدي: الكشف بيقول نقدي مع إن الملف بقى تحويل
  const paid = await bankSheetController({ status: 'APPROVED', marks: [paidCashMark] }).bankSheet({ role: 'super_admin', sub: 1 }, 1)
  assert.deepEqual([paid.totals.bank, paid.totals.cash, paid.totals.net], [0, 1000, 1000])
  assert.deepEqual([paid.rows[0].payMethod, paid.rows[0].payMethodLabel, paid.rows[0].issue], ['cash', 'نقدي', null])
  assert.deepEqual(paid.banks, [], 'مفيش مبلغ رايح للبنك فمفيش مجموعة بنك')
  // مسير مصروف كله مرة واحدة بلا علامات: لقطة البند (نقدي) هي المسجلة
  const runLevel = await bankSheetController({ status: 'PAID', marks: [] }).bankSheet({ role: 'super_admin', sub: 1 }, 1)
  assert.deepEqual([runLevel.totals.bank, runLevel.totals.cash], [0, 1000])
  // مسير لسه ما اتصرفش ولا علامة: ملف الموظف الحالي زي ما هو (السلوك القديم بالحرف)
  const open = await bankSheetController({ status: 'APPROVED', marks: [] }).bankSheet({ role: 'super_admin', sub: 1 }, 1)
  assert.deepEqual([open.totals.bank, open.totals.cash, open.rows[0].payMethod], [1000, 0, 'transfer'])
  assert.deepEqual(open.banks, [{ bankName: 'بنك الاختبار', employees: 1, total: 1000 }])
  // علامة «لم يتم» (اتقفل الصرف بسبب مكتوب): البند لسه مستحق بطريقة الملف الحالية
  const unpaid = await bankSheetController({ status: 'PAID', marks: [{ ...paidCashMark, status: 'UNPAID', bankAmount: '0.00', cashAmount: '0.00', payMethod: null }] })
    .bankSheet({ role: 'super_admin', sub: 1 }, 1)
  assert.deepEqual([unpaid.totals.bank, unpaid.totals.cash], [1000, 0])
})

test('REC-03: التلات شاشات بنفس الرقم — شاشة الصرف وكشف البنوك والتقرير المالي، والتسوية بنك + نقدي + تصفية = الصافي', () => {
  const screen = summarizePayrollDisbursement(buildPayrollDisbursementRows({ runStatus: 'PAID', items: [item], employees: [liveTransfer],
    members: [member], marks: [paidCashMark], branchScope: null }).rows)
  const sheet = bankSheetOf({ runStatus: 'PAID', marks: [paidCashMark] })
  const { row, register } = registerOf({ runStatus: 'PAID', mark: paidCashMark })
  assert.deepEqual([screen.paid.bank, screen.paid.cash], [0, 1000])
  assert.deepEqual([sheet.totals.bank, sheet.totals.cash], [screen.paid.bank, screen.paid.cash], 'كشف البنوك = شاشة الصرف')
  assert.deepEqual([C(register.totals.bank), C(register.totals.cash)], [C(screen.paid.bank), C(screen.paid.cash)], 'التقرير المالي = شاشة الصرف')
  assert.equal(register.rows[0].payMethod, 'cash', 'عمود طريقة الصرف في الكشف بالمسجل')
  assert.equal(Number(row.bank) + Number(row.cash) + Number(row.settlement), Number(row.net))
  assert.equal(C(register.totals.bank) + C(register.totals.cash) + C(register.totals.settlement), C(register.totals.net))
  // ولا صف اتغير قبل الصرف: التلاتة على ملف الموظف الحالي
  const before = summarizePayrollDisbursement(buildPayrollDisbursementRows({ runStatus: 'APPROVED', items: [item], employees: [liveTransfer],
    members: [member], marks: [], branchScope: null }).rows)
  const openSheet = bankSheetOf({ runStatus: 'APPROVED', marks: [] })
  const openRegister = registerOf({ runStatus: 'APPROVED', mark: null }).register
  assert.deepEqual([before.unpaid.bank, before.unpaid.cash], [1000, 0])
  assert.deepEqual([openSheet.totals.bank, openSheet.totals.cash], [1000, 0])
  assert.deepEqual([openRegister.totals.bank, openRegister.totals.cash], ['1000.00', '0.00'])
})

test('REC-04: استعلام التقرير المالي بيقرأ علامة الصرف نفسها (مصدر واحد للتلات شاشات)', () => {
  const service = read('src/reports/financial-report.service.ts')
  assert.ok(service.includes('LEFT JOIN [payroll_item_disbursements] pd ON pd.[itemId] = i.[id]'))
  assert.ok(service.includes('pd.[status] AS [disbursementStatus]'))
  assert.ok(service.includes('CONVERT(varchar(40), pd.[cashAmount]) AS [disbursedCashAmount]'))
  const report = read('src/reports/financial-report.ts')
  assert.ok(report.includes("import { recordedDisbursement } from '../payroll/payroll-disbursement-split'"))
  const sheetFile = read('src/payroll/bank-sheet.ts')
  assert.ok(sheetFile.includes('const split = source.recorded?.amounts ?? payrollPaySplit(source.netPay, payMethod, source.bankTransferAmount)'))
  assert.ok(read('src/payroll/bank-sheet.controller.ts').includes('runStatus: detail.status, marks'))
  assert.ok(read('src/payroll/payroll-disbursement.ts').includes('runStatus: input.runStatus, marks: input.marks'))
  // تقرير طرق الصرف من نفس المصدر كمان
  assert.ok(read('src/payroll/payroll.service.ts').includes('settlementOf: payrollItemSettlementPayout, runStatus: detail.status, marks'))
})

test('REC-07: القسيمة على نفس القاعدة (قرار المالك 24 سبتمبر) — بلا لقطة هوية جديدة وبلا تقسيم تاني', () => {
  const service = read('src/payroll/payroll.service.ts')
  const payslip = service.slice(service.indexOf('  async payslip('), service.indexOf('  async runLines('))
  // نفس دالة القاعدة المشتركة، على علامة البند نفسها وحالة المسير
  assert.ok(payslip.includes("const mark = await em.getRepository(PayrollItemDisbursement).findOneBy({ itemId: item.id })"))
  assert.ok(payslip.includes('const recorded = recordedDisbursement({ runStatus: run.status, itemPayMethod: item.payMethod, mark,'))
  // الطريقة والتقسيم: المسجل يغلب، وغير المسجل ملف الموظف الحالي بالحرف (نفس تركيب كشف البنوك)
  assert.ok(payslip.includes("const payMethod = recorded?.payMethod ?? payee?.payMethod ?? item.payMethod ?? 'transfer'"))
  assert.ok(payslip.includes('paySplit: recorded?.amounts ?? payrollPaySplit(item.netPay, payMethod, payee?.bankTransferAmount)'))
  assert.ok(service.includes("import { recordedDisbursement } from './payroll-disbursement-split'"))
  // الهوية والبنك والآيبان لسه قراءة حالية بنفس صلاحية القسيمة — التغيير على الطريقة والتقسيم بس
  assert.ok(payslip.includes("select: ['id', 'nationalId', 'bankName', 'iban', 'payMethod', 'bankTransferAmount']"))
  assert.ok(payslip.includes('nationalId: payee?.nationalId ?? null, bankName: payee?.bankName ?? null, iban: payee?.iban ?? null'))
  // والتعليق بيقول القاعدة الجديدة، مش «بيانات صرف حالية»
  assert.ok(payslip.includes('**اللي اتصرف فعلًا** لا ملف الموظف الحالي'))
  assert.ok(!payslip.includes('فهي بيانات صرف حالية يحتاجها من يقرأ القسيمة'))
})

test('REC-05: تقرير الحضور الشهري بلا كاشف وجود — الموظف الموجود خارج النطاق وغير الموجود نفس الرد', async () => {
  const service = Object.create(AttendanceService.prototype)
  service.employees = { async findOne({ where }) { return where.id === 2 ? { id: 2, branchId: 2 } : null } }
  const controller = new AttendanceController(service, {}, {})
  const answer = async (user, id) => {
    try { await controller.monthly(user, id, '2026-08'); return { status: 200 } }
    catch (error) { return { status: error.getStatus(), message: error.message } }
  }
  const selfService = { sub: 1, role: 'employee', employeeId: 1, branchId: 1, permissions: [] }
  assert.deepEqual(await answer(selfService, 2), await answer(selfService, 999))
  assert.deepEqual(await answer(selfService, 2), { status: 400, message: 'لا تملك صلاحية عرض حضور غيرك' })
  // مراقب بصلاحية عرض الحضور محدود بفرعه: نفس الرد للاتنين كمان
  const scoped = { sub: 2, role: 'hr_manager', employeeId: 9, branchId: 1, permissions: ['attendance.view_all'] }
  assert.deepEqual(await answer(scoped, 2), await answer(scoped, 999))
  // من يملك النطاق كله يستحق الحقيقة: «الموظف غير موجود»
  const boss = { sub: 3, role: 'super_admin', employeeId: null, branchId: null, permissions: ['*'], scopeAllBranches: true }
  assert.deepEqual(await answer(boss, 999), { status: 404, message: 'الموظف غير موجود' })
})

test('REC-06: أيام عمل الموظف ومعاينة الإضافي — نفس الرد للموظف خارج النطاق وغير الموجود', async () => {
  const foreign = { id: 2, branchId: 2 }
  const service = Object.create(AttendanceService.prototype)
  service.employees = { async findOneBy({ id }) { return id === 2 ? foreign : null } }
  const workingDays = async (user, id) => {
    try { await service.employeeWorkingDays(user, id, '2026-08-23', '2026-08-24'); return { status: 200 } }
    catch (error) { return { status: error.getStatus(), message: error.message } }
  }
  const selfService = { sub: 1, role: 'employee', employeeId: 1, branchId: 1, permissions: [] }
  assert.deepEqual(await workingDays(selfService, 2), await workingDays(selfService, 999))
  assert.deepEqual(await workingDays(selfService, 2), { status: 403, message: 'لا تملك صلاحية عرض جدول الموظف' })
  const scoped = { sub: 2, role: 'hr_manager', employeeId: 9, branchId: 1, permissions: ['attendance.view_all'] }
  assert.deepEqual(await workingDays(scoped, 2), await workingDays(scoped, 999))
  assert.deepEqual(await workingDays(scoped, 2), { status: 403, message: 'الموظف خارج نطاق فرعك' })

  // معاينة الإضافي نيابة عن موظف: نفس الرد كمان (المستودع جوّه معاملة اصطناعية)
  const overtime = Object.create(AttendanceService.prototype)
  const em = { queryRunner: { isTransactionActive: true }, async query() { return [{ lockResult: 0 }] },
    getRepository() { return { async findOneBy({ id }) { return id === 2 ? foreign : null } } } }
  overtime.days = { manager: { async transaction(run) { return run(em) } } }
  const preview = async (user, id) => {
    try { await overtime.overtimePreview(user, '2026-08-23', id); return { status: 200 } }
    catch (error) { return { status: error.getStatus(), message: error.message } }
  }
  const onBehalf = { sub: 4, role: 'hr_manager', employeeId: 9, branchId: 1, permissions: ['requests.create_on_behalf'] }
  assert.deepEqual(await preview(onBehalf, 2), await preview(onBehalf, 999))
  assert.deepEqual(await preview(onBehalf, 2), { status: 403, message: 'الموظف خارج نطاق فرعك' })
})

// مراجعة مستقلة 24 سبتمبر (تكملة N02 — ترحيل 067): التقسيم المثبت على البند وقت الصرف هو اللي بيتقال للمسير المصروف
// جماعيًا، بدل لقطة وقت الحساب. القاعدة بترتيبها: علامة «تم الصرف» ← علامة «لم يتم» ← المثبت وقت الصرف ← لقطة الحساب
// (بند مصروف قبل الترحيل) ← ملف الموظف الحالي.
test('REC-08: المثبت وقت الصرف يغلب لقطة الحساب، والعلامة تغلبه، والبند القديم بلا تثبيت يفضل على سلوكه', () => {
  const frozenMixed = { payMethod: 'mixed', bankAmount: '300.00', cashAmount: '700.00' }
  assert.deepEqual(recordedDisbursement({ runStatus: 'PAID', itemPayMethod: 'cash', itemPaid: frozenMixed, mark: null }),
    { payMethod: 'mixed', amounts: { bank: 300, cash: 700 } }, 'المسير المصروف جماعيًا بياخد المثبت وقت الصرف لا لقطة الحساب')
  // مصروف نقدي وقت الصرف بعد ما الحساب كان تحويل: الرقم مابينقلبش عند الإقفال
  assert.deepEqual(recordedDisbursement({ runStatus: 'PAID', itemPayMethod: 'cash', itemPaid: { payMethod: 'transfer', bankAmount: '1000.00', cashAmount: '0.00' } }),
    { payMethod: 'transfer', amounts: { bank: 1000, cash: 0 } })
  // علامة «لم يتم» متجاوزة (اتلغت علامته ثم المسير اتصرف كله): التثبيت يغلبها — الصرف الجماعي صرف للكل
  assert.deepEqual(recordedDisbursement({ runStatus: 'PAID', itemPayMethod: 'cash', itemPaid: frozenMixed,
    mark: { status: 'UNPAID', bankAmount: 0, cashAmount: 0 } }), { payMethod: 'mixed', amounts: { bank: 300, cash: 700 } })
  // و«لم يتم» الحقيقية (إقفال موظف بموظف: البند مش مثبت لأنه ما اتصرفلوش) ⇒ ملف الموظف الحالي
  assert.equal(recordedDisbursement({ runStatus: 'PAID', itemPayMethod: 'cash', itemPaid: { payMethod: null },
    mark: { status: 'UNPAID', bankAmount: 0, cashAmount: 0 } }), null)
  // وعلامة «تم الصرف» بمبالغها تغلبه (أحدث دليل على اللي اتصرف)
  assert.deepEqual(recordedDisbursement({ runStatus: 'PAID', itemPayMethod: 'cash', itemPaid: frozenMixed, mark: paidCashMark }),
    { payMethod: 'cash', amounts: { bank: 0, cash: 1000 } })
  // بند مصروف قبل الترحيل (الأعمدة فاضية): السلوك القديم بالحرف — تاريخ ما بيتغيّرش رجعيًا
  assert.deepEqual(recordedDisbursement({ runStatus: 'PAID', itemPayMethod: 'cash', itemPaid: { payMethod: null } }),
    { payMethod: 'cash', amounts: null })
  // ومسير لسه ما اتصرفش: التثبيت مالوش أي أثر (ملف الموظف الحالي هو اللي هيتصرف بيه)
  assert.equal(recordedDisbursement({ runStatus: 'APPROVED', itemPayMethod: 'cash', itemPaid: frozenMixed }), null)
  // القص لا التقريب على المثبت
  assert.deepEqual(recordedDisbursement({ runStatus: 'PAID', itemPaid: { payMethod: 'mixed', bankAmount: '300.019', cashAmount: '700.115' } }).amounts,
    { bank: 300.01, cash: 700.11 })

  // كشف البنوك بياخد المثبت من البند نفسه: الملف «تحويل بنكي» والمثبت نقدي ⇒ الكشف نقدي
  const frozenItem = { ...item, payMethod: 'transfer', paidPayMethod: 'cash', paidBankAmount: '0.00', paidCashAmount: '1000.00' }
  const sheet = buildBankSheet(bankSheetSources({ items: [frozenItem], employees: [liveTransfer], members: [member], branchScope: null,
    settlementOf: payrollItemSettlementPayout, runStatus: 'PAID', marks: [] }))
  assert.deepEqual([sheet.rows[0].payMethod, sheet.totals.bank, sheet.totals.cash], ['cash', 0, 1000])
  assert.equal(sheet.rows[0].issue, null, 'مبلغ اتصرف خلاص: بيانات الملف مش تنبيه دلوقتي')
  // وشاشة الصرف على نفس الصف
  const screen = summarizePayrollDisbursement(buildPayrollDisbursementRows({ runStatus: 'PAID', items: [frozenItem],
    employees: [liveTransfer], members: [member], marks: [], branchScope: null }).rows)
  assert.deepEqual([screen.paid.bank, screen.paid.cash], [0, 1000])

  // والتقرير المالي بيقرا نفس الأعمدة من استعلامه
  const service = read('src/reports/financial-report.service.ts')
  assert.ok(service.includes('i.[paidPayMethod] AS [itemPaidPayMethod]'))
  assert.ok(service.includes('CONVERT(varchar(40), i.[paidBankAmount]) AS [itemPaidBankAmount]'))
  assert.ok(service.includes('CONVERT(varchar(40), i.[paidCashAmount]) AS [itemPaidCashAmount]'))
})

test('REC-09: الصرف بيثبّت التقسيم على البند قبل ما المسير يبقى PAID، وإقفال موظف بموظف مايثبّتش اللي ما اتصرفلوش', () => {
  const source = read('src/payroll/payroll.service.ts')
  // التثبيت بعد إقفال الصرف (عشان يعرف نوع الإقفال ومين «لم يتم») وقبل انتقال الحالة — جوّه نفس المعاملة وتحت قفل المسير
  const close = source.indexOf('const disbursement = await closePayrollRunDisbursement(')
  const freeze = source.indexOf('await this.freezePaidSplit(em, run, items, disbursement.mode)')
  const paid = source.indexOf("run.status = 'PAID'", freeze)
  assert.ok(close > 0 && freeze > close, 'التثبيت بعد إقفال الصرف')
  assert.ok(paid > freeze, 'التثبيت قبل ما المسير يبقى PAID')
  // المصدر: العلامة لو موجودة، وإلا ملف الموظف وقتها بنفس دالة تقسيم كشف البنك
  assert.ok(source.includes("if (mode === 'PER_EMPLOYEE' && mark?.status === 'UNPAID') continue"),
    'البند اللي ما اتصرفلوش في إقفال موظف بموظف مايتثبّتش، والصرف الجماعي بيثبّت للكل')
  assert.ok(source.includes('await this.freezePaidSplit(em, run, items, disbursement.mode)'))
  assert.ok(source.includes('payrollPaySplit(item.netPay, payMethod, employee?.bankTransferAmount ?? null)'))
  assert.ok(source.includes('items.filter(item => !payrollItemSettlementPayout(item.breakdown))'), 'صف التصفية برّه التثبيت')
  // والقسيمة بتقرا المثبت زي باقي الشاشات
  assert.ok(source.includes('itemPaid: { payMethod: item.paidPayMethod, bankAmount: item.paidBankAmount, cashAmount: item.paidCashAmount }'))
  // الترحيل إضافي فقط وبلا تعبئة رجعية
  const migration = read('../docs/migrations/payroll/20260924_067_payroll_item_paid_split.sql')
  for (const column of ['paidPayMethod', 'paidBankAmount', 'paidCashAmount']) {
    assert.ok(migration.includes(`IF COL_LENGTH(N'dbo.payroll_items', N'${column}') IS NULL`), column)
  }
  // التعليق العربي نفسه بيذكر إن مفيش DROP، فالفحص على الأوامر الفعلية بعد شيل سطور التعليق
  const statements = migration.split('\n').filter(line => !line.trim().startsWith('--')).join('\n')
  assert.ok(!/\b(DROP|TRUNCATE|DELETE)\b/i.test(statements), 'إضافي فقط')
  assert.ok(!/^\s*UPDATE\s/mi.test(statements), 'بلا تعبئة رجعية — التاريخ زي ما هو')
})
