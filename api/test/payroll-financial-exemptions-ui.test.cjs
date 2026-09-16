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
  // القرار ب5: تأكيد واحد داخل النافذة نفسها (اسم الخصم ومبلغه) وخانة سبب اختيارية تُرسل بدل النص الجاهز
  assert.ok(panel.includes('data-testid="payroll-remove-deduction-confirm"'), 'سطر تأكيد داخل النافذة')
  assert.ok(panel.includes('تأكيد الإلغاء'))
  assert.ok(panel.includes("const removalReason = (note: string) => note.trim().length >= 3 ? note.trim() : REMOVE_DEDUCTION_REASON"))
  assert.ok(panel.includes('reason: removalReason(reason)'), 'السبب المكتوب يُرسل بدل النص الجاهز')
  // فصل المهام يُقال على الصف قبل الضغط بدل رفض 403 بعد التأكيد: من أنزل الخصم لا يلغيه
  assert.ok(panel.includes("` — ${row.protectedReason ?? 'لا يمكن إلغاؤه'}`"), 'سبب المنع مكتوب على صف الخصم')
  assert.ok(read('api/src/payroll/financial-exemptions.service.ts').includes("ownCreator(row) ? 'أنت من أنزل هذا الخصم؛ يلغيه مستخدم آخر' : null"))
  assert.ok(panel.includes('سبب الإلغاء (اختياري)'))
  // الصف يبقى موسومًا «أُلغي» لا يختفي
  assert.ok(panel.includes("option.removed ? 'أُلغي' : 'إلغاء هذا الخصم'"))
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
  // القرار ب5 + القرار د: لغة «الإعفاء» لم تعد تظهر في القسيمة إطلاقًا — لا «الأصل قبل الإعفاء» ولا «مُعفى».
  // ملاحظة سطر الخصم نفسه أعاد خط «العناوين والكلام التقني» صياغتها عربيًا («الأصل قبل الإلغاء … أُلغي منه …»)
  // بدل حذفها؛ تُقبل هنا لأنها تقول للموظف إن الخصم أُلغي بلغة عادية، والسطر المختصر أسفل القسيمة باقٍ كما هو.
  assert.ok(!payslip.includes('الأصل قبل الإعفاء'), 'لا لغة إعفاء في سطر الخصم')
  assert.ok(!/مُعفى/.test(payslip), 'لا كلمة «مُعفى» في القسيمة')
})

// لا قرار في هذه الموجة يطلب اشتراط مرفق جديدًا: حد المبلغ المُعفى بلا مرفق يعود إلى ما كان عليه
// قبل الموجة (366 يوم راتب = لا مرفق عمليًا)، فيبقى «إلغاء خصم» ضغطة واحدة بلا مدخل إضافي.
test('حد مرفق الإعفاء المالي يرجع كما كان — الموجة لا تضيف اشتراطًا', () => {
  const migration = read('docs/migrations/payroll/20260916_039_money_request_audience_and_exemption_threshold.sql')
  assert.ok(migration.includes("SET [value] = N'366'"), 'الترحيل يرجّع القيمة القديمة')
  assert.ok(migration.includes("[value] = N'90'"), 'مشروط بالقيمة التي كتبتها الموجة بالضبط')
  const statements = migration.split('\n').filter(line => !line.trim().startsWith('--')).join('\n')
  assert.ok(!/\b(DROP|DELETE|TRUNCATE)\b/.test(statements), 'إضافي فقط')
  // الترحيل السابق (036) هو من خفّضها؛ الشرط عليه بالضبط فلا يُلمس ضبط المالك لو غيّرها بنفسه
  const previous = read('docs/migrations/payroll/20260916_036_money_requests_and_loan_window.sql')
  assert.ok(previous.includes("SET [value] = N'90'"), 'القيمة المخفّضة جاءت من ترحيل هذه الموجة')
})

test('صفحتا «الإعفاءات المالية» و«إعفاءاتي» تتحولان بلا مداخل جانبية، والـAPI باقٍ', () => {
  assert.ok(read(files.exemptionsPage).includes("router.replace('/payroll')"))
  assert.ok(read(files.myPage).includes("router.replace('/my/payslips')"))
  const sidebar = read(files.sidebar)
  assert.ok(!sidebar.includes("href: '/payroll/exemptions'") && !sidebar.includes("href: '/my/exemptions'"))
  const api = read(files.api)
  assert.ok(api.includes('fetchMyExemptions') && api.includes('fetchGrantableExemptionRuns'))
})
