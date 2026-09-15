// C3 / الخطوة 26: شاشات الإعفاء المالي — النداءات عبر src/lib/financial-exemptions-api.ts فقط، ومنسّق المبالغ الموحد.
// تبسيط الرواتب (2026-09-15): «إلغاء خصم» زر على صف الموظف في جدول المسير بمعاينة إلزامية وسبب جاهز وإعادة حساب تلقائية،
// والقسيمة تعرض سطرًا واحدًا لكل خصم ملغى، وصفحتا «الإعفاءات المالية» و«إعفاءاتي» تتحولان بلا مداخل جانبية (الـAPI باقٍ).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const files = {
  api: 'src/lib/financial-exemptions-api.ts',
  panel: 'src/components/payroll/PayrollFinancialExemptionsPanel.tsx',
  payslipSection: 'src/components/payroll/PayrollExemptionPayslipSection.tsx',
  payslip: 'src/app/payroll/payslip/[id]/page.tsx',
  runPage: 'src/app/payroll/page.tsx',
  exemptionsPage: 'src/app/payroll/exemptions/page.tsx',
  myPage: 'src/app/my/exemptions/page.tsx',
  sidebar: 'src/components/layout/Sidebar.tsx',
}

test('النداءات عبر ملف API واحد، ولا fetch مباشر ولا أرقام عربية في مكونات الإعفاء', () => {
  const api = read(files.api)
  for (const route of ['/payroll/exemptions/preview', '/payroll/exemptions/runs/', '/approve', '/reject', '/revoke', '/attachment', '/payroll/exemptions/mine', '/payroll/exemptions/report', '/payroll/exemptions/grantable-runs']) {
    assert.ok(api.includes(route), route)
  }
  for (const file of [files.panel, files.payslipSection]) {
    const text = read(file)
    assert.ok(!/\bfetch\(/.test(text), `${file}: fetch مباشر`)
    assert.ok(!/toLocaleString\(\s*['"]ar/.test(text), `${file}: أرقام عربية`)
    assert.ok(text.includes("from '@/lib/money'"), `${file}: منسّق المبالغ الموحد`)
    assert.ok(text.includes('financial-exemptions-api'), `${file}: ملف API`)
  }
})

test('شاشة المسير: «إلغاء خصم» على صف الموظف ببوابة صلاحية المنح، بمعاينة إلزامية وبصمتها وسبب جاهز، ثم إعادة حساب تلقائية بآخر معادلة', () => {
  const page = read(files.runPage)
  assert.ok(page.includes("import { PayrollRemoveDeductionModal, type RemovableAttendanceAmounts } from '@/components/payroll/PayrollFinancialExemptionsPanel'"))
  assert.ok(page.includes("const canRemoveDeduction = runDetail?.status === 'CALCULATED' && can('financial_exemption.grant')"))
  assert.ok(page.includes('onGranted={recalculateAfterRemoval}'))
  assert.ok(page.includes('recalculatePayrollRunWithCurrentFormula(runDetail.id, { allowDraftConflicts: true })'))
  assert.doesNotMatch(page, /<PayrollFinancialExemptionsPanel\b/, 'اللوحة القديمة لا تُعرض')
  const panel = read(files.panel)
  assert.ok(panel.includes('granted = await grantExemption({ ...input, previewHash: preview.previewHash })'), 'المنح يرسل بصمة المعاينة')
  assert.ok(panel.includes("const REMOVE_DEDUCTION_REASON = 'إلغاء خصم من شاشة المسير بقرار الموارد البشرية'"), 'سبب جاهز بلا كتابة')
  assert.ok(panel.includes("disposition: 'DROP' as const"), 'الخصم المصنف يُلغى لا يُؤجَّل')
  assert.ok(!/grantedBy(UserId)?\s*[:=]\s*[a-zA-Z]/.test(panel.split('grantExemption(')[1]?.split(')')[0] ?? ''), 'لا يُرسل المانح من الواجهة')
})

test('القسيمة: كل خصم ملغى سطر واحد «أُلغي خصم <البند> بمبلغ <المبلغ>» بلا رقم الإعفاء ولا المانح، والبند في موضعه بين الخصومات', () => {
  const section = read(files.payslipSection)
  assert.ok(section.includes('أُلغي خصم {itemName(line)} بمبلغ {formatMoney(line.exemptedAmount)} {currency}'))
  assert.ok(section.includes("line.disposition === 'DROP'"), 'الإسقاط فقط لا التأجيل')
  const sectionCode = section.split('\n').filter(line => !line.trim().startsWith('//')).join('\n')
  for (const text of ['إعفاء #', 'المانح:', 'المبلغ الأصلي']) assert.ok(!sectionCode.includes(text), text)
  const payslip = read(files.payslip)
  assert.ok(payslip.includes('<PayrollExemptionPayslipSection item={item} currency={currency} details={financialExemptions} />'))
  assert.ok(payslip.includes('exemptionNote(deduction.component)'), 'ملاحظة الإعفاء في سطر الخصم نفسه')
  assert.ok(payslip.includes('الأصل قبل الإعفاء'))
})

test('صفحتا «الإعفاءات المالية» و«إعفاءاتي» تتحولان بلا مداخل جانبية، والـAPI باقٍ', () => {
  assert.ok(read(files.exemptionsPage).includes("router.replace('/payroll')"))
  assert.ok(read(files.myPage).includes("router.replace('/my/payslips')"))
  const sidebar = read(files.sidebar)
  assert.ok(!sidebar.includes("href: '/payroll/exemptions'") && !sidebar.includes("href: '/my/exemptions'"))
  const api = read(files.api)
  assert.ok(api.includes('fetchMyExemptions') && api.includes('fetchGrantableExemptionRuns'))
})
