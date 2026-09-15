// C8 / الخطوة 31: شاشات العكس والمسير التكميلي — النداءات عبر src/lib/payroll-corrections-api.ts فقط، الإنشاء بمعاينة إلزامية وبصمتها وسبب مكتوب،
// لوحة التصحيح على شاشة المسير المصروف ومسيري العكس والتكميلي، ومسير العكس لا يُطلب له إقرار «بلا مسير» ولا لقطة سياسة ولا تكافؤ،
// والقسيمة المعكوسة تبقى موسومة بعكسها وبقسيمة التكميلي، وسجل المسير يسمي أحداث التصحيح.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const code = text => text.split('\n').filter(line => !line.trim().startsWith('//') && !line.trim().startsWith('{/*')).join('\n')

const files = {
  api: 'src/lib/payroll-corrections-api.ts',
  panel: 'src/components/payroll/PayrollRunCorrectionsPanel.tsx',
  runPage: 'src/app/payroll/page.tsx',
  payslip: 'src/app/payroll/payslip/[id]/page.tsx',
  myPayslips: 'src/app/my/payslips/page.tsx',
  events: 'src/components/payroll/PayrollRunEventsPanel.tsx',
  sharedApi: 'src/lib/api.ts',
}

test('النداءات عبر ملف API واحد بمسارات الخادم، ولا fetch مباشر، والمبالغ بالمنسّق الموحد', () => {
  const api = read(files.api)
  for (const route of ['/payroll/runs/${runId}/corrections', '/payroll/runs/${runId}/reversal-preview', '/payroll/runs/${runId}/reversals', '/payroll/runs/${runId}/supplementary', '/payroll/corrections/report']) {
    assert.ok(api.includes(route), route)
  }
  assert.ok(api.includes("from './api'"), 'apiFetch من src/lib/api.ts')
  const panel = read(files.panel)
  assert.ok(!/\bfetch\(/.test(panel), 'لا fetch مباشر في اللوحة')
  assert.ok(panel.includes("from '@/lib/payroll-corrections-api'"))
  assert.ok(panel.includes("import { formatMoney } from '@/lib/money'"))
  assert.ok(!/toLocaleString\(\s*['"]ar/.test(panel), 'لا أرقام عربية')
})

test('اللوحة: الإنشاء يرسل بصمة المعاينة، ومعطل قبل معاينة حالية غير ممنوعة وسبب مستوفٍ، وموانع الخادم تُعرض', () => {
  const panel = code(read(files.panel))
  assert.ok(panel.includes('previewHash: preview.previewHash'), 'الإنشاء يرسل بصمة المعاينة')
  assert.match(panel, /disabled=\{busy \|\| !previewCurrent \|\| preview\?\.blocked !== false \|\| !reversalCorrectionReasonReady\(reverseReason\)\}/)
  assert.ok(panel.includes('previewKey === selectionKey'), 'تغيير التحديد يُبطل المعاينة')
  assert.ok(panel.includes('payrollReversalBlockers(e)'), 'موانع 409 تُعرض بجوار الموظفين')
  assert.match(panel, /disabled=\{busy \|\| !supplementIds\.length \|\| !reversalCorrectionReasonReady\(supplementReason\)\}/)
  assert.ok(panel.includes('data.permissions.canReverse') && panel.includes('data.permissions.canSupplement'), 'الأزرار ببوابة صلاحيات الخادم')
  for (const text of ['تقرير التسويات للسلسلة', 'فرق التسوية', 'الصافي الفعلي', 'لا أثر مالي قبل اعتماد مسير العكس', 'row.warning']) assert.ok(panel.includes(text), text)
})

test('شاشة المسير (تبسيط الرواتب): لوحات العكس والتكميلي ولقطة السياسة ومحرك الحساب و«بلا مسير» والإعفاء المالي لا تُعرض، وملفاتها وأنواع الـAPI باقية', () => {
  const page = code(read(files.runPage))
  for (const panel of ['PayrollRunCorrectionsPanel', 'PayrollPolicySnapshotPanel', 'PayrollRunEnginePanel', 'PayrollUnassignedPanel', 'PayrollFinancialExemptionsPanel']) {
    assert.doesNotMatch(page, new RegExp(`<${panel}\\b`), `${panel} لا تُعرض`)
    assert.ok(fs.existsSync(path.join(root, 'src/components/payroll', `${panel}.tsx`)), `${panel}.tsx باقٍ`)
  }
  assert.doesNotMatch(page, /unassignedAckCurrent/, 'الاعتماد لا يشترط إقرار «بلا مسير»')
  const shared = read(files.sharedApi)
  assert.ok(shared.includes("runType?: 'REGULAR' | 'REVERSAL' | 'SUPPLEMENTARY' | null") && shared.includes('parentRunId?: number | null'))
})

test('القسيمة وقسائمي (تبسيط الرواتب): بلا شريط عكس الصرف ولا قسيمة التكميلي ولا علامتيهما، وسجل المسير (غير المعروض) يبقى يسمي أحداث التصحيح', () => {
  const payslip = code(read(files.payslip))
  for (const text of ['عُكس صرف هذه القسيمة', 'السبب: {reversal.line.reason}', 'قسيمة المسير التكميلي #', 'قسيمة مسير تكميلي مربوط بالمسير المصروف']) {
    assert.ok(!payslip.includes(text), text)
  }
  const mine = code(read(files.myPayslips))
  assert.ok(!mine.includes('عُكس صرفها') && !mine.includes("run.runType === 'SUPPLEMENTARY'"))
  const events = read(files.events)
  for (const type of ['REVERSAL_CREATED', 'REVERSAL_POSTED', 'REVERSAL_CANCELLED', 'SUPPLEMENTARY_CREATED']) assert.ok(events.includes(`${type}:`), type)
  assert.ok(events.includes('أعاد التنفيذ: إضافي'))
})

test('السلف وتقارير الرواتب: القسط المُلغى بعكس الصرف وحركة REVERSAL بتسميات عربية، وتقرير المسيرات (تبسيط الرواتب) بلا مسيرات العكس والتكميلي وسطورها، والـAPI يبقى يسميها', () => {
  const loansApi = code(read('src/lib/loans-api.ts'))
  assert.ok(loansApi.includes("export type LoanInstallmentStatus = 'DUE' | 'PARTIAL' | 'DEFERRED' | 'PAID' | 'SETTLED' | 'REVERSED'"))
  assert.match(loansApi, /REVERSAL: 'عكس خصم المسير — عاد القسط مستحقًا'/)
  assert.match(loansApi, /REVERSED: 'مُلغى بعكس صرف مسير'/)
  for (const file of ['src/app/my/loans/page.tsx', 'src/app/payroll/loans/page.tsx']) {
    const page = code(read(file))
    assert.match(page, /REVERSED: 'مُلغى بعكس صرف مسير'/, file)
    assert.match(page, /status === 'REVERSED' \? 'bg-gray-100 text-gray-600'/, file)
  }
  const reportsPage = code(read('src/app/payroll/reports/page.tsx'))
  assert.ok(reportsPage.includes("const runs = (report?.runs ?? []).filter((run) => run.runType !== 'REVERSAL' && run.runType !== 'SUPPLEMENTARY')"), 'التقرير يعرض المسيرات العادية فقط')
  for (const text of ["run.runType === 'REVERSAL'", "run.runType === 'SUPPLEMENTARY'", 'run.reversedEmployees']) assert.ok(!reportsPage.includes(text), text)
  const reportsApi = read('src/lib/payroll-reports-api.ts')
  assert.ok(reportsApi.includes("code: 'REVERSED_IN_RUN'") && reportsApi.includes('reversedEmployees?: number'))
  assert.ok(read(files.api).includes('carriedExemptionIds?: number[]'))
})
