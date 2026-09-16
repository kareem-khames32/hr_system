// الخطوات 16–18 (B3): شاشة المسير — «مسير جديد» منفصل عن الحساب، الفلاتر المترابطة، معاينة العضوية، ولوحة «بلا مسير».
// منطق الواجهة وReact SSR فقط؛ لا SQL ولا خدمة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const ui = require('../../src/lib/payroll-runs-api')
const { PayrollMembershipPreviewView } = require('../../src/components/payroll/PayrollMembershipPreviewView')
const { PayrollRunDefinitionPanel } = require('../../src/components/payroll/PayrollRunDefinitionPanel')
const root = path.resolve(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
// معاينة الاختبار الثالث تُعاد في اختبارات الاستبعاد (تُسند هناك).
let previewFixture

const branches = [{ id: 1, name: 'القاهرة', code: 'C', isActive: true, isHeadquarters: true }, { id: 2, name: 'الجيزة', code: 'G', isActive: true, isHeadquarters: false }]
const departments = [{ id: 10, name: 'المبيعات', branchId: 1, isActive: true }, { id: 11, name: 'مبيعات التجزئة', branchId: 1, parentId: 10, isActive: true },
  { id: 20, name: 'التشغيل', branchId: 2, isActive: true }]
const teams = [{ id: 100, name: 'فريق أ', departmentId: 10, isActive: true }, { id: 110, name: 'فريق التجزئة', departmentId: 11, isActive: true },
  { id: 200, name: 'فريق الجيزة', departmentId: 20, isActive: true }]

test('linked filters: departments follow chosen branches, teams follow chosen departments (with sub-departments), and pruning drops broken links', () => {
  const none = ui.linkedFilterOptions(branches, departments, teams, ui.emptyRunFilters())
  assert.equal(none.departments.length, 3); assert.equal(none.teams.length, 3)
  const cairo = ui.linkedFilterOptions(branches, departments, teams, { ...ui.emptyRunFilters(), branchIds: [1] })
  assert.deepEqual(cairo.departments.map(row => row.id), [10, 11]); assert.deepEqual(cairo.teams.map(row => row.id), [100, 110])
  const sales = ui.linkedFilterOptions(branches, departments, teams, { ...ui.emptyRunFilters(), branchIds: [1], departmentIds: [10] })
  assert.deepEqual(sales.teams.map(row => row.id), [100, 110])
  const pruned = ui.pruneLinkedFilters(branches, departments, teams, { branchIds: [2], departmentIds: [10, 20], teamIds: [100, 200], employeeIds: [] })
  assert.deepEqual([pruned.departmentIds, pruned.teamIds], [[20], [200]])
})

test('only published policy versions are offered for a run, labelled by the set name (dates only when one set has two)', () => {
  const policies = [{ policy: { id: 1, code: 'CAIRO', name: 'مجموعة القاهرة', branchId: null, isActive: true }, capabilities: { canEdit: false },
    versions: [{ id: 5, versionNo: 2, revision: 1, status: 'DRAFT', effectiveFrom: '2026-10-23', effectiveTo: null },
      { id: 4, versionNo: 1, revision: 2, status: 'ACTIVE', effectiveFrom: '2026-09-23', effectiveTo: null, effectiveUntil: '2026-10-22', cycleStartDay: 23 }] },
  { policy: { id: 2, code: 'OLD', name: 'مؤرشفة', branchId: null, isActive: false }, capabilities: { canEdit: false },
    versions: [{ id: 9, versionNo: 1, revision: 1, status: 'ACTIVE', effectiveFrom: '2026-01-23', effectiveTo: null }] }]
  const options = ui.publishedPolicyVersions(policies)
  assert.deepEqual(options.map(row => [row.versionId, row.effectiveUntil, row.cycleStartDay]), [[4, '2026-10-22', 23]])
  assert.equal(options[0].label, 'مجموعة القاهرة')
  const two = ui.publishedPolicyVersions([{ ...policies[0], versions: [...policies[0].versions, { id: 6, versionNo: 3, revision: 1, status: 'ACTIVE', effectiveFrom: '2026-10-23', effectiveTo: null }] }])
  assert.deepEqual(two.map(row => row.label), ['مجموعة القاهرة (من 2026-09-23 إلى 2026-10-22)', 'مجموعة القاهرة (من 2026-10-23)'])
  assert.ok(options.every(row => !/نسخة|CAIRO/.test(row.label)), 'no version number or code in the label')
})

test('membership preview view shows the read-only notice, coverage, the formula set name and plain Arabic exclusion reasons, without codes, day basis, factor or the other run number', () => {
  const preview = { readOnly: true, previewHash: 'a'.repeat(64), basis: { monthlyDays: 30, dayBasis: 'FIXED_30' },
    run: { id: null, name: 'مسير القاهرة', period: '2026-08', startDate: '2026-07-23', endDate: '2026-08-22',
      policy: { policyId: 1, code: 'CAIRO', name: 'مجموعة القاهرة', versionId: 4, versionNo: 1, status: 'ACTIVE', cycleStartDay: 23, defaultPeriodType: 'CUSTOM_DAY_RANGE' } },
    selection: { mode: 'FILTERS', source: 'DEFINITION', filters: { ...ui.emptyRunFilters(), branchIds: [1], costCenterIds: [], includeSubDepartments: true, allEmployees: false }, exclusions: [], emptyScope: null },
    emptyScopeRequiresConfirmation: false,
    totals: { candidates: 3, included: 1, excluded: 2, partial: 1, dataProblems: 0, alreadyInRun: 1, transferredOut: 1, manualExclusions: 0, draftConflictEmployees: 0, monthlyGross: 6000, earnedGross: 3000 },
    included: [{ employeeId: 7, employeeCode: 'E-104', fullName: 'ليلى', jobTitle: null, branchId: 1, branchName: 'القاهرة', departmentId: 10, departmentName: 'المبيعات',
      teamId: 100, teamName: 'فريق أ', orgDate: '2026-08-22', orgIssues: [], inclusionSource: 'SCOPE', hireDate: '2026-08-08', leaveDate: null,
      coverFrom: '2026-08-08', coverTo: '2026-08-22', coverDays: 15, partial: true, prorataFactor: 0.5, monthlyDays: 30, dayBasis: 'FIXED_30',
      monthlyGross: 6000, earnedGross: 3000, salarySource: { kind: 'MONTHLY_HISTORY', referencePeriod: '2026-08', effectivePayrollPeriod: '2026-08', currency: 'SAR', warning: null }, draftConflicts: [] }],
    excluded: [
      { employeeId: 8, employeeCode: 'E-106', fullName: 'فهد', jobTitle: null, branchId: 1, branchName: 'القاهرة', departmentId: null, departmentName: null, teamId: null, teamName: null,
        orgDate: '2026-08-22', orgIssues: [], inclusionSource: 'SCOPE', code: 'EXC_ALREADY_IN_RUN', label: null, message: null, manualReason: null, dataProblem: null, coverDays: null,
        otherRun: { otherRunId: 42, name: 'مسير الإدارة العليا', status: 'APPROVED', startDate: '2026-07-23', endDate: '2026-08-22', overlapDays: 31, kind: 'EXACT', blocking: true }, transferredOut: null },
      { employeeId: 9, employeeCode: 'E-107', fullName: 'منى', jobTitle: null, branchId: 1, branchName: 'القاهرة', departmentId: null, departmentName: null, teamId: null, teamName: null,
        orgDate: '2026-08-09', orgIssues: [], inclusionSource: 'SCOPE', code: 'TRANSFERRED_OUT', label: null, message: null, manualReason: null, dataProblem: null, coverDays: null, otherRun: null,
        transferredOut: { lastInScopeDate: '2026-08-09', branchName: 'الجيزة', departmentName: null, teamName: null } },
    ], unusedExclusions: [] }
  const html = renderToStaticMarkup(React.createElement(PayrollMembershipPreviewView, { preview, currency: 'SAR' }))
  const text = html.replace(/<!-- -->/g, '')
  for (const value of ['معاينة للقراءة فقط', 'معادلات الرواتب «مجموعة القاهرة»', '2026-08-08 → 2026-08-22', '3,000.00', 'مدرج في مسير آخر معتمد أو مصروف لنفس الفترة',
    'مسير الإدارة العليا (معتمد)', 'انتقل خارج نطاق المسير قبل نهاية الفترة', 'آخر يوم داخل النطاق 2026-08-09', 'الجيزة', 'في مسير معتمد آخر: 1']) {
    assert.ok(text.includes(value), value)
  }
  for (const value of ['FIXED_30', 'أساس الأيام', '0.500000', 'EXC_ALREADY_IN_RUN', 'TRANSFERRED_OUT', 'المسير #42', 'href="/payroll?run=42"', 'CAIRO']) assert.ok(!text.includes(value), value)
  assert.ok(!html.includes('استبعاد بسبب مكتوب'), 'without onExclude the preview offers no action')
  previewFixture = preview
})

// معاينة فيها موظف بمشكلة بيانات (يمنع الحساب) وآخر مستبعد يدويًا.
const withDataProblem = () => ({ ...previewFixture,
  totals: { ...previewFixture.totals, excluded: 4, dataProblems: 1, manualExclusions: 1 },
  excluded: [...previewFixture.excluded,
    { employeeId: 32, employeeCode: 'OF2768W', fullName: 'موظف مغادر', jobTitle: null, branchId: 1, branchName: 'القاهرة', departmentId: null, departmentName: null, teamId: null, teamName: null,
      orgDate: '2026-08-22', orgIssues: [], inclusionSource: 'SCOPE', code: 'EXC_EMPLOYMENT_DATA_INVALID', label: null, message: 'الموظف OF2768W: الموظف نشط بعد ملف إنهاء خدمة مغلق',
      manualReason: null, dataProblem: { code: 'EXC_EMPLOYMENT_DATA_INVALID', message: 'الموظف OF2768W: الموظف نشط بعد ملف إنهاء خدمة مغلق' }, coverDays: null, otherRun: null, transferredOut: null },
    { employeeId: 33, employeeCode: 'E-200', fullName: 'مستبعد يدويًا', jobTitle: null, branchId: 1, branchName: 'القاهرة', departmentId: null, departmentName: null, teamId: null, teamName: null,
      orgDate: '2026-08-22', orgIssues: [], inclusionSource: 'SCOPE', code: 'EXC_MANUAL_EXCLUSION', label: null, message: 'مسير آخر', manualReason: 'مسير آخر', dataProblem: null,
      coverDays: null, otherRun: null, transferredOut: null }] })

test('exclusion candidates: employees the preview already excludes (data problems first) can get a written exclusion; transferred-out and manual exclusions cannot', () => {
  const preview = withDataProblem()
  const rows = ui.payrollExclusionCandidates(preview)
  assert.deepEqual(rows.map(row => row.employeeId), [32, 8, 7], 'data problem first, then the other in-scope exclusion, then the included')
  assert.equal(rows[0].dataProblem, true); assert.match(rows[0].label, /بيانات الخدمة غير مكتملة/)
  assert.ok(!rows.some(row => [9, 33].includes(row.employeeId)), 'TRANSFERRED_OUT and EXC_MANUAL_EXCLUSION are not offered')
  assert.deepEqual(ui.payrollExclusionCandidates(preview, [32]).map(row => row.employeeId), [8, 7], 'an employee already in the exclusion list is not offered again')

  const chosen = []
  const html = renderToStaticMarkup(React.createElement(PayrollMembershipPreviewView, { preview, currency: 'SAR', onExclude: row => chosen.push(row) }))
  for (const id of [7, 8, 32]) assert.ok(html.includes(`data-exclude-employee="${id}"`), `exclude action for ${id}`)
  for (const id of [9, 33]) assert.ok(!html.includes(`data-exclude-employee="${id}"`), `no exclude action for ${id}`)
  // تبسيط الرواتب: بيانات الخدمة الناقصة لا توقف الحساب؛ السبب يظهر بالعربي
  const text = html.replace(/<!-- -->/g, '')
  assert.ok(text.includes('بيانات الخدمة غير مكتملة — صحّحها ثم أعد الحساب')); assert.ok(text.includes('بيانات خدمة غير مكتملة: 1'))
  assert.ok(!text.includes('يمنع «احتساب المسودة»'))
})

test('stored draft: the membership card says an employee with incomplete employment data is left out of the calculation, and offers the written exclusion on those rows', () => {
  const { PayrollDraftMembership } = require('../../src/components/payroll/PayrollDraftMembership')
  const draft = { id: 51, name: 'مسير فرع القاهرة — ديسمبر', status: 'DRAFT', period: '2026-12',
    selection: { mode: 'FILTERS', source: 'DEFINITION', filters: { ...ui.emptyRunFilters(), branchIds: [1], costCenterIds: [], includeSubDepartments: true, allEmployees: false },
      exclusions: [{ employeeId: 33, reason: 'مسير آخر', byUserId: 1, at: '2026-09-14T00:00:00.000Z' }], emptyScope: null } }
  const html = renderToStaticMarkup(React.createElement(PayrollDraftMembership, { draft, preview: withDataProblem(), currency: 'SAR', canEdit: true, onUpdated() {} }))
  assert.ok(html.replace(/<!-- -->/g, '').includes('1 موظف بيانات خدمته غير مكتملة — سيُستبعد من الحساب حتى تُصحح بياناته ثم يُعاد الحساب.'))
  assert.ok(html.includes('data-exclude-employee="32"'))
  const readOnly = renderToStaticMarkup(React.createElement(PayrollDraftMembership, { draft, preview: withDataProblem(), currency: 'SAR', canEdit: false, onUpdated() {} }))
  assert.ok(!readOnly.includes('data-exclude-employee'), 'without payroll.calculate there is no exclude action')
  const source = read('src/components/payroll/PayrollDraftMembership.tsx')
  for (const text of ['updatePayrollRunDraft(draft.id, { exclusions:', 'حفظ الاستبعاد', '<PayrollMembershipPreviewView']) assert.ok(source.includes(text), text)
  const panel = read('src/components/payroll/PayrollRunDefinitionPanel.tsx')
  for (const text of ['payrollExclusionCandidates(result)', 'onExclude={chooseExclusion}', 'موظف بيانات خدمته غير مكتملة: سيُستبعد من الحساب حتى تُصحح بياناته.']) assert.ok(panel.includes(text), text)
})

test('definition panel: name, formula set, month, linked filters or list, exclusions with a reason, preview and save as draft', () => {
  const html = renderToStaticMarkup(React.createElement(PayrollRunDefinitionPanel, { branches, departments, teams, employees: [], currency: 'SAR', onSaved() {}, onCancel() {} })).replace(/<!-- -->/g, '')
  for (const text of ['مسير جديد', 'اسم المسير (فريد داخل الشهر)', 'معادلات الرواتب', 'شهر الراتب', 'فلاتر: فرع ← قسم ← فريق', 'قائمة موظفين محددة',
    'الاستبعادات (0) — السبب إجباري', 'معاينة العضوية', 'حفظ كمسودة']) {
    assert.ok(html.includes(text), text)
  }
  for (const text of ['SHADOW', 'نسخة السياسة المنشورة']) assert.ok(!html.includes(text), text)
  // اختيار موظفين متتاليين لا يفقد السابق: التبديل يقرأ الحالة السابقة لا نسخة الإغلاق (كان يحفظ الأخير وحده)
  const panel = read('src/components/payroll/PayrollRunDefinitionPanel.tsx')
  assert.ok(panel.includes('onClick={() => setFilters(previous => ({ ...previous, employeeIds: previous.employeeIds.includes(emp.id)'), 'functional state update')
  assert.ok(!panel.includes('setFilters({ ...filters, employeeIds:'), 'no stale-closure toggle left')
})

test('payroll page: «مسير جديد» is separate from «احتساب المسودة» / «إعادة حساب المسير», and approval no longer waits for an unassigned acknowledgement', () => {
  const page = read('src/app/payroll/page.tsx')
  assert.doesNotMatch(page, /calculatePayroll\b/, 'the page must not merge new-run and recalculation in one button')
  // معاينة المسودة المحفوظة تُعرض عبر PayrollDraftMembership (يغلف PayrollMembershipPreviewView ويضيف الاستبعاد بسبب).
  for (const text of ['مسير جديد', 'احتساب المسودة', 'إعادة حساب المسير', '<PayrollRunDefinitionPanel', '<PayrollDraftMembership',
    'recalculatePayrollRunWithCurrentFormula', 'calculatePayrollRunDraft']) {
    assert.ok(page.includes(text), text)
  }
  // تبسيط الرواتب: لوحة «موظفون بلا مسير» لا تُعرض والاعتماد لا يشترط إقرارها (المكون والـAPI باقيان)
  assert.doesNotMatch(page, /<PayrollUnassignedPanel|unassignedAckCurrent/)
  // نقطتا الحساب القديمتان لا يستدعيهما أي عميل في الواجهة.
  for (const file of ['src/lib/api.ts', 'src/lib/payroll-runs-api.ts', 'src/app/payroll/page.tsx']) {
    assert.doesNotMatch(read(file), /\/payroll\/runs\/calculate(-defined)?['"`]/, `${file} must not call the legacy calculate endpoints`)
  }
  assert.ok(fs.existsSync(path.join(root, 'src/components/payroll/PayrollUnassignedPanel.tsx')), 'the hidden panel file stays')
  const lib = read('src/lib/payroll-runs-api.ts')
  assert.doesNotMatch(lib, /fetch\(/, 'API calls go through apiFetch only')
})
