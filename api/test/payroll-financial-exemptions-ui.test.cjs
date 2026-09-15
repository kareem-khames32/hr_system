// C3 / الخطوة 26: شاشات الإعفاء المالي — النداءات عبر src/lib/financial-exemptions-api.ts فقط، بوابات can() على شاشة المسير وصفحة الإعفاءات،
// القسيمة تعرض الأصل والمُعفى وبعد الإعفاء والسبب وتذييل الإجمالي بلا خيار إخفاء، ومنسّق المبالغ الموحد، والمداخل في القائمة الجانبية.
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

test('النداءات عبر ملف API واحد، ولا fetch مباشر ولا أرقام عربية في شاشات الإعفاء', () => {
  const api = read(files.api)
  for (const route of ['/payroll/exemptions/preview', '/payroll/exemptions/runs/', '/approve', '/reject', '/revoke', '/attachment', '/payroll/exemptions/mine', '/payroll/exemptions/report', '/payroll/exemptions/grantable-runs']) {
    assert.ok(api.includes(route), route)
  }
  for (const file of [files.panel, files.payslipSection, files.exemptionsPage, files.myPage]) {
    const text = read(file)
    assert.ok(!/\bfetch\(/.test(text), `${file}: fetch مباشر`)
    assert.ok(!/toLocaleString\(\s*['"]ar/.test(text), `${file}: أرقام عربية`)
    assert.ok(text.includes("from '@/lib/money'"), `${file}: منسّق المبالغ الموحد`)
    assert.ok(text.includes('financial-exemptions-api'), `${file}: ملف API`)
  }
})

test('شاشة المسير: اللوحة بعد محرك الحساب ببوابة صلاحيات الإعفاء، والمنح بمعاينة إلزامية وبصمتها، وتنبيه إعادة الحساب وتأجيل القسط', () => {
  const page = read(files.runPage)
  assert.ok(page.includes("import { PayrollFinancialExemptionsPanel } from '@/components/payroll/PayrollFinancialExemptionsPanel'"))
  assert.match(page, /can\('financial_exemption\.view'\) \|\| can\('financial_exemption\.grant'\) \|\| can\('financial_exemption\.approve'\)/)
  const panel = read(files.panel)
  assert.ok(panel.includes('previewHash: preview.previewHash'), 'الحفظ يرسل بصمة المعاينة')
  assert.match(panel, /disabled=\{busy \|\| !preview\}/, 'الحفظ معطل قبل المعاينة')
  assert.ok(panel.includes('أعد حساب المسير ليُطبقها'), 'تنبيه إعادة الحساب')
  assert.ok(panel.includes('سيُؤجَّل القسط لا يُسقط'), 'تنبيه تأجيل القسط')
  assert.ok(panel.includes('المانح وتاريخ المنح يُسجلان من الخادم'), 'المانح والتاريخ ليسا حقلي إدخال')
  assert.ok(!/grantedBy(UserId)?\s*[:=]\s*[a-zA-Z]/.test(panel.split('grantExemption(')[1]?.split(')')[0] ?? ''), 'لا يُرسل المانح من الواجهة')
})

test('القسيمة: الأصل والمُعفى وبعد الإعفاء ورقم القرار والسبب والمانح بالدور وتذييل الإجمالي، والبند في موضعه بين الخصومات', () => {
  const section = read(files.payslipSection)
  for (const text of ['المبلغ الأصلي', 'المُعفى', 'بعد الإعفاء', 'مُعفى (إعفاء #', 'السبب:', 'المانح:', 'إجمالي المبالغ المُعفاة في هذا المسير']) assert.ok(section.includes(text), text)
  // الفحص على الكود لا على التعليقات (التعليق نفسه يوثق أن لا خيار للإخفاء)
  const sectionCode = section.split('\n').filter(line => !line.trim().startsWith('//')).join('\n')
  assert.ok(!/hide|hidden|إخفاء/i.test(sectionCode), 'لا خيار لإخفاء البند المُعفى')
  const payslip = read(files.payslip)
  assert.ok(payslip.includes('<PayrollExemptionPayslipSection item={item} currency={currency} details={financialExemptions} />'))
  assert.ok(payslip.includes('exemptionNote(deduction.component)'), 'ملاحظة الإعفاء في سطر الخصم نفسه')
  assert.ok(payslip.includes('الأصل قبل الإعفاء'))
})

test('صفحة الإعفاءات وتقرير الحوكمة وإعفاءاتي والمداخل الجانبية', () => {
  const page = read(files.exemptionsPage)
  assert.ok(page.includes("can('financial_exemption.view')"))
  for (const text of ['بحسب المانح', 'بحسب الموظف', 'بحسب نوع الخصم', 'بحسب المسير', 'التنبيهات', 'المطابقة مع بنود المسير']) assert.ok(page.includes(text), text)
  const mine = read(files.myPage)
  assert.ok(mine.includes('fetchMyExemptions') && mine.includes('fetchGrantableExemptionRuns'))
  const sidebar = read(files.sidebar)
  assert.ok(sidebar.includes("href: '/payroll/exemptions'") && sidebar.includes("href: '/my/exemptions'"))
})
