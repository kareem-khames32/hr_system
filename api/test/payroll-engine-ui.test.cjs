// B4 — الخطوات 19 و20 و21 في الواجهة: أثر شريحة التأخير في القسيمة، ولوحة محرك الحساب، ولقطة السياسة، ومحرر المجموعات المؤرخة.
// منطق الواجهة وReact SSR وفحص نصي للربط؛ لا SQL ولا خدمة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const ui = require('../../src/lib/payroll-engine-api')
const { PayrollLatenessTierBreakdown } = require('../../src/components/payroll/PayrollLatenessTierBreakdown')
const { PayrollRunEnginePanel } = require('../../src/components/payroll/PayrollRunEnginePanel')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const trace = { minutes: 61, matched: true, sequence: 2, fromMinutes: 61, toMinutes: 120, mode: 'MULTIPLIER', value: '1.500', label: 'ساعة ونصف',
  dayRate: 300, minuteRate: 0.625, amount: 57.1875, formula: '61 دقيقة × 1.5 × سعر الدقيقة 0.625000' }
const breakdown = JSON.stringify({ attendanceDeductions: { latenessTierSet: { setId: 7, effectivePeriod: '2026-08', contentHash: 'a'.repeat(64) },
  days: [{ date: '2026-08-22', latenessAmount: 57.1875, latenessTier: trace }, { date: '2026-08-23', latenessAmount: 0, latenessTier: null }] } })

test('payslip: the lateness tier effect row shows minutes, range, multiplier and formula from the saved breakdown', () => {
  const effects = ui.latenessTierEffects(breakdown)
  assert.equal(effects.rows.length, 1); assert.equal(effects.set.setId, 7)
  const html = renderToStaticMarkup(React.createElement(PayrollLatenessTierBreakdown, { item: { breakdown }, currency: 'SAR' }))
  // تبسيط الرواتب: بلا رقم مجموعة الشرائح ولا شهر سريانها ولا «لقطة سياسة المسير»
  assert.match(html, /أثر شرائح التأخير/); assert.match(html, /شرائح التأخير المطبّقة على شهر المسير/); assert.doesNotMatch(html, /#7|السارية من شهر|لقطة سياسة المسير/)
  assert.match(html, /61–120 \(ساعة ونصف\)/); assert.match(html, /× 1\.5/); assert.match(html, /61 دقيقة × 1\.5 × سعر الدقيقة 0\.625000/)
  assert.equal(renderToStaticMarkup(React.createElement(PayrollLatenessTierBreakdown, { item: { breakdown: '{}' }, currency: 'SAR' })), '')
  assert.equal(ui.latenessTierEffects('{bad'), null)
})

test('أ1: اختيار الشرائح بالشهر أُلغي من الواجهة — لا دالة «المجموعة السارية لشهر»', () => {
  assert.equal(ui.applicableTierSet, undefined, 'الشرائح صارت داخل معادلة الرواتب، فلا اختيار شهري في الواجهة')
})

function engineRun(extra = {}) {
  const components = [{ code: 'BASIC', label: 'الراتب الأساسي المستحق', legacy: '33.34', policy: '33.33', difference: '-0.01', differenceKey: 'k-basic', reasonCode: 'SALARY_ROUNDING_DISTRIBUTION', reason: 'توزيع القروش' },
    { code: 'NET', label: 'الصافي', legacy: '100.00', policy: '99.99', difference: '-0.01', differenceKey: 'k-net', reasonCode: 'FOLLOWS_UPSTREAM_DIFFERENCE', reason: 'يتبع ما قبله' },
    { code: 'OVERTIME', label: 'الإضافي المعتمد', legacy: '0.00', policy: '0.00', difference: null, differenceKey: null, reasonCode: null, reason: null }]
  return { id: 9, status: 'CALCULATED', engine: { mode: 'SHADOW', modeLabel: 'ظل: المصروف القديم ومحرك السياسة بجانبه', recalcRequired: false, policySnapshotHash: 'h',
    report: { version: 'v', engineMode: 'SHADOW', paidResult: 'LEGACY', snapshotVersion: 2, policySnapshotHash: 'h', generatedAt: '', reportHash: 'b'.repeat(64), message: 'فرقان',
      totals: { employees: 1, matched: 0, different: 1, unavailable: 0, error: 0, differences: 2 }, rows: [{ employeeId: 5, status: 'DIFFERENT', attendanceShadowStatus: 'MATCHED', components, unavailable: [], error: null }] },
    explanations: [{ id: 1, runId: 9, snapshotVersion: 2, employeeId: 5, component: 'BASIC', legacyAmount: '33.34', policyAmount: '33.33', differenceKey: 'k-basic', reason: 'قرش توزيع مقبول', explainedBy: 1, explainedAt: '' }],
    switchIssues: [{ employeeId: 5, component: 'NET', label: 'الصافي', legacy: '100.00', policy: '99.99', differenceKey: 'k-net', issue: 'UNEXPLAINED', reason: 'فرق بلا سبب مكتوب' }], ...extra } }
}

test('engine panel: SHADOW badge, parity totals, each difference with legacy/policy/system reason and the written reason when present', () => {
  const run = engineRun()
  const differences = ui.parityDifferences(ui.engineOf(run))
  assert.deepEqual(differences.map(row => [row.code, row.explanation?.reason ?? null]), [['BASIC', 'قرش توزيع مقبول'], ['NET', null]])
  const html = renderToStaticMarkup(React.createElement(PayrollRunEnginePanel, { run, employeeName: id => `موظف ${id}`, onChanged: () => {} }))
  assert.match(html, /محرك الحساب/); assert.match(html, />SHADOW</); assert.match(html, /ظل: المصروف القديم ومحرك السياسة بجانبه/)
  assert.match(html, /33\.34/); assert.match(html, /33\.33/); assert.match(html, /توزيع القروش/); assert.match(html, /قرش توزيع مقبول/)
  assert.match(html, /موظف 5/)
  const recalc = renderToStaticMarkup(React.createElement(PayrollRunEnginePanel, { run: engineRun({ mode: 'POLICY', recalcRequired: true }), employeeName: String, onChanged: () => {} }))
  assert.match(recalc, /أعد حساب المسير قبل الاعتماد/)
  assert.equal(renderToStaticMarkup(React.createElement(PayrollRunEnginePanel, { run: { id: 1 }, employeeName: String, onChanged: () => {} })), '')
})

test('engine panel: approval readiness from the server check, the source plan with a remedy per code, and unavailable values shown as needing a written reason (not "cannot be explained")', () => {
  const base = engineRun()
  const unavailableRow = { employeeId: 6, status: 'UNAVAILABLE', attendanceShadowStatus: 'UNAVAILABLE', unavailable: [], error: null, sourceIssueCodes: ['SCHEDULE_TIMING_FIELDS_MISSING'],
    components: [{ code: 'LATENESS', label: 'خصم التأخير', legacy: '12.00', policy: null, difference: null, differenceKey: 'k-late', reasonCode: 'ATTENDANCE_SHADOW_UNAVAILABLE', reason: 'مصادر الحضور غير مثبتة لهذه الفترة' }] }
  const report = { ...base.engine.report, rows: [...base.engine.report.rows, unavailableRow],
    sourceReadiness: [{ code: 'SCHEDULE_TIMING_FIELDS_MISSING', employees: 1, employeeIds: [6], remedy: 'أكمل دقائق العمل المطلوبة من جداول العمل' }] }
  const run = { ...base, engine: { ...base.engine, report, approvalIssueCount: 2,
    approvalIssues: [{ employeeId: 5, component: 'NET', label: 'الصافي', legacy: '100.00', policy: '99.99', differenceKey: 'k-net', reasonCode: 'FOLLOWS_UPSTREAM_DIFFERENCE', issue: 'UNEXPLAINED_DIFFERENCE', reason: 'فرق بلا سبب مكتوب من حامل صلاحية اعتماد المسير' }],
    approvalPendingGroups: [{ reasonCode: 'ATTENDANCE_SHADOW_UNAVAILABLE', count: 1, unavailable: 1, employees: 1 }] } }
  assert.equal(ui.parityReasonText(report, 'ATTENDANCE_SHADOW_UNAVAILABLE'), 'مصادر الحضور غير مثبتة لهذه الفترة')
  assert.equal(ui.parityReasonText(report, 'NOPE'), null)
  const html = renderToStaticMarkup(React.createElement(PayrollRunEnginePanel, { run, employeeName: id => `موظف ${id}`, onChanged: () => {} }))
  assert.match(html, /الاعتماد متوقف على تقرير التكافؤ: 2 شرطًا غير مستوفى \(فرق بلا سبب مكتوب/)
  assert.match(html, /خطة المصادر/); assert.match(html, /SCHEDULE_TIMING_FIELDS_MISSING/); assert.match(html, /أكمل دقائق العمل المطلوبة من جداول العمل/)
  assert.doesNotMatch(html, /لا يُفسَّر/, 'an unavailable value can receive a written reason for approval')
  const ready = renderToStaticMarkup(React.createElement(PayrollRunEnginePanel, { run: { ...run, engine: { ...run.engine, approvalIssueCount: 0, approvalIssues: [], approvalPendingGroups: [] } }, employeeName: String, onChanged: () => {} }))
  assert.match(ready, /تقرير التكافؤ مستوفٍ للاعتماد/)
  // عناصر حامل الاعتماد (لا تُرسم في SSR بلا مستخدم): سبب جماعي لكل رمز، سبب للقيمة الغائبة، وتحذير LEGACY
  const panel = read('src/components/payroll/PayrollRunEnginePanel.tsx')
  assert.match(panel, /reasonCode: group\.reasonCode, reason: groupReasons\[group\.reasonCode\]\.trim\(\)/)
  assert.match(panel, /سبب مكتوب للقيمة الغائبة \(للاعتماد فقط\)/)
  assert.match(panel, /LEGACY بلا ظل \(لا يُعتمد\)/)
})

test('screens are wired (payroll simplification): the run page no longer shows the snapshot and engine panels, recalculation always refreshes to the current formula with the shown fingerprint, dated editor on formulas, tier effect on the payslip; legacy tier writes removed', () => {
  const page = read('src/app/payroll/page.tsx')
  assert.doesNotMatch(page, /<PayrollPolicySnapshotPanel |<PayrollRunEnginePanel /)
  assert.match(page, /recalculatePayrollRunWithCurrentFormula\(/)
  assert.match(read('src/lib/payroll-runs-api.ts'), /refreshPolicySnapshot: true, expectedPolicySnapshotHash: snapshot\.currentHash/)
  // أ1: شاشة «القيم العامة للخصومات» أُوقفت واللينك القديم يوديك لـ«معادلات الرواتب»، ومحرر المجموعات المؤرخة حُذف
  const formulas = read('src/app/payroll/formulas/page.tsx')
  assert.match(formulas, /redirect\('\/payroll\/policies'\)/)
  assert.doesNotMatch(formulas, /createLatenessTier|deleteLatenessTier|updateLatenessTier|LatenessTierSetsEditor/)
  assert.equal(fs.existsSync(path.join(root, 'src/components/payroll/LatenessTierSetsEditor.tsx')), false)
  assert.match(read('src/app/payroll/payslip/[id]/page.tsx'), /<PayrollLatenessTierBreakdown item=\{item\}/)
  assert.doesNotMatch(read('src/lib/api.ts'), /export const (createLatenessTier|updateLatenessTier|deleteLatenessTier)/)
  const panel = read('src/components/payroll/PayrollPolicySnapshotPanel.tsx')
  assert.match(panel, /expectedHash: checked && view \? view\.currentHash : null/, 'the refresh sends the fingerprint of the differences shown')
  // الشرائح تُحرَّر داخل المعادلة نفسها، وشهر السريان يُختم داخليًا بلا مدخل للمستخدم، وبلا أي مدخل لسعر الإضافي (أ5)
  const rules = read('src/components/PayrollPolicySetEditor.tsx')
  assert.match(rules, /شرائح خصم التأخير/); assert.match(rules, /stampPeriod\(\)/)
  assert.doesNotMatch(rules, /تسري من شهر الرواتب|type="month"/)
  assert.doesNotMatch(rules, /سعر الإضافي|overtime\.multiplier/)
})
