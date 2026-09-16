// اختبارات منطق الواجهة وReact SSR وطبقة HTTP فقط؛ لا SQL أو تشغيل خدمة أو تعديل بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const ui = require('../../src/lib/payroll-policies-api')
const { ApiError } = require('../../src/lib/api')
const { PayrollCollectionEditor } = require('../../src/components/PayrollCollectionEditor')
const { pageTitleFor } = require('../../src/components/layout/pageTitles')
const copy = value => JSON.parse(JSON.stringify(value))
const component = (code, extra = {}) => ({ code, nameAr: `بند ${code}`, componentType: 'DEDUCTION', stage: 4, sequence: 1,
  valueSource: 'FIXED', ledgerDirection: null, carryOverEligible: false, isActive: true, ...extra })
const components = [component('TAX'), component('LATE'), component('RECOVERY'), component('LOAN', { stage: 5, valueSource: 'LEDGER', ledgerDirection: 'DEBIT', carryOverEligible: true }),
  component('INACTIVE', { isActive: false }), component('SALARY', { componentType: 'EARNING' }), component('NET', { componentType: 'INFO' })]
const collection = { schemaVersion: ui.COLLECTION_SCHEMA_VERSION, classifications: [
  { componentCode: 'TAX', kind: 'STATUTORY' }, { componentCode: 'LATE', kind: 'ATTENDANCE' }, { componentCode: 'RECOVERY', kind: 'RECOVERY' },
  { componentCode: 'LOAN', kind: 'LOAN' }, { componentCode: 'INACTIVE', kind: 'OTHER' },
], collectionOrder: ['RECOVERY', 'INACTIVE', 'LOAN', 'LATE'] }
const fixture = (extra = {}) => ({ policyId: 7, versionId: 11, revision: 3, contractVersion: 'SRS_V1', settingsStatus: 'COMPLETE', settingsIssues: [],
  definitionStatus: 'COMPLETE', definitionIssues: [], definition: { components: copy(components), parameters: [], tierSets: [] },
  collectionState: 'COMPLETE', collectionIssues: [], collection: copy(collection), capabilities: { canEdit: true }, ...extra })
const version = { id: 11, versionNo: 2, revision: 3, status: 'DRAFT', effectiveFrom: '2026-09-01', effectiveTo: null, frozenAt: null }
function render(view = fixture(), extra = {}) {
  return renderToStaticMarkup(React.createElement(PayrollCollectionEditor, { view, version, canCalculate: true,
    onSaved() {}, onReload: async () => {}, onDirtyChange() {}, onBusyChange() {}, ...extra }))
}

test('missing collection leaves explicit choices blank except locked ledger loans; inactive deductions remain', () => {
  const view = fixture({ collectionState: 'MISSING', collection: null }), before = copy(view)
  const draft = ui.createCollectionDraft(view)
  assert.deepEqual(draft.classifications.map(item => item.kind), ['', '', '', 'LOAN', ''])
  assert.deepEqual(draft.collectionOrder, ['LOAN'])
  assert.ok(draft.classifications.some(item => item.componentCode === 'INACTIVE'))
  assert.ok(!draft.classifications.some(item => ['SALARY', 'NET'].includes(item.componentCode)))
  assert.equal(ui.collectionDraftIssues(draft, components).length, 4)
  assert.deepEqual(view, before)
})

test('saved order survives initialization exactly; payload contains only closed collection fields', () => {
  const view = fixture(), draft = ui.createCollectionDraft(view)
  assert.deepEqual(draft.collectionOrder, collection.collectionOrder)
  assert.deepEqual(ui.collectionPayload(draft, components), collection)
  assert.deepEqual(Object.keys(ui.collectionPayload(draft, components)).sort(), ['classifications', 'collectionOrder', 'schemaVersion'])
})

test('protected classification leaves order; explicit return appends without reordering other items', () => {
  const before = ui.createCollectionDraft(fixture())
  const protectedDraft = ui.changeCollectionKind(before, components, 'RECOVERY', 'COURT_ORDER')
  assert.deepEqual(protectedDraft.collectionOrder, ['INACTIVE', 'LOAN', 'LATE'])
  const returned = ui.changeCollectionKind(protectedDraft, components, 'RECOVERY', 'RECOVERY')
  assert.deepEqual(returned.collectionOrder, ['INACTIVE', 'LOAN', 'LATE', 'RECOVERY'])
  assert.deepEqual(before.collectionOrder, collection.collectionOrder)
})

test('loan kind cannot be changed and nonledger kind cannot become loan', () => {
  const draft = ui.createCollectionDraft(fixture())
  assert.equal(ui.changeCollectionKind(draft, components, 'LOAN', 'OTHER'), draft)
  assert.equal(ui.changeCollectionKind(draft, components, 'LATE', 'LOAN'), draft)
  assert.equal(ui.changeCollectionKind(draft, components, 'SALARY', 'OTHER'), draft)
  assert.equal(ui.changeCollectionKind(draft, components, 'UNKNOWN', 'OTHER'), draft)
})

test('quick proposals are stable and leave protected deductions outside owner order', () => {
  const draft = ui.createCollectionDraft(fixture())
  const loanFirst = ui.proposeCollectionOrder(draft, 'LOAN_FIRST')
  assert.deepEqual(loanFirst.collectionOrder, ['LOAN', 'RECOVERY', 'INACTIVE', 'LATE'])
  const attendanceFirst = ui.proposeCollectionOrder(loanFirst, 'ATTENDANCE_RECOVERY_FIRST')
  assert.deepEqual(attendanceFirst.collectionOrder, ['RECOVERY', 'LATE', 'LOAN', 'INACTIVE'])
  assert.ok(!attendanceFirst.collectionOrder.includes('TAX'))
  assert.deepEqual(draft.collectionOrder, collection.collectionOrder)
})

test('up/down is bounded, immutable and moves one priority at a time', () => {
  const draft = ui.createCollectionDraft(fixture())
  assert.deepEqual(ui.moveCollectionItem(draft, 'LOAN', -1).collectionOrder, ['RECOVERY', 'LOAN', 'INACTIVE', 'LATE'])
  assert.deepEqual(ui.moveCollectionItem(draft, 'LOAN', 1).collectionOrder, ['RECOVERY', 'INACTIVE', 'LATE', 'LOAN'])
  assert.equal(ui.moveCollectionItem(draft, 'RECOVERY', -1), draft)
  assert.equal(ui.moveCollectionItem(draft, 'LATE', 1), draft)
  assert.equal(ui.moveCollectionItem(draft, 'TAX', 1), draft)
  assert.deepEqual(draft.collectionOrder, collection.collectionOrder)
})

test('carry contradictions are visible and cannot become save payload', () => {
  for (const code of ['TAX', 'LATE', 'LOAN']) {
    const changed = components.map(item => item.code === code ? { ...item, carryOverEligible: code !== 'LOAN' } : item)
    const draft = ui.createCollectionDraft(fixture())
    assert.ok(ui.collectionDraftIssues(draft, changed).length > 0)
    assert.throws(() => ui.collectionPayload(draft, changed))
  }
})

test('missing/duplicate kinds and incomplete/protected orders are rejected before save', () => {
  const base = ui.createCollectionDraft(fixture())
  const bads = [
    { ...base, classifications: base.classifications.slice(1) },
    { ...base, classifications: [...base.classifications.slice(1), base.classifications[1]] },
    { ...base, collectionOrder: [...base.collectionOrder, 'TAX'] },
    { ...base, collectionOrder: ['LOAN', 'LOAN', 'LATE', 'INACTIVE'] },
    { ...base, classifications: base.classifications.map(item => item.componentCode === 'LATE' ? { ...item, kind: 'NOT_A_KIND' } : item) },
  ]
  for (const draft of bads) assert.throws(() => ui.collectionPayload(draft, components))
})

test('SSR includes inactive rows and a locked loan select; protected tax has no reorder controls', () => {
  const html = render()
  assert.match(html, /غير مفعل/)
  assert.match(html, /id="collection-kind-LOAN"[^>]*disabled=""/)
  assert.match(html, /تصنيف السلف ثابت/)
  assert.match(html, /aria-label="الخصومات المحمية"/)
  assert.doesNotMatch(html, /data-collection-code="TAX"/)
  assert.match(html, /data-collection-code="INACTIVE"/)
  assert.match(html, /aria-label="تقديم بند LOAN"/)
  assert.match(html, /سبب التعديل/)
})

test('SSR editing follows the server capability (payroll.policy.manage + branch scope), not payroll.calculate', () => {
  const readOnly = render(fixture({ capabilities: { canEdit: false } }))
  assert.match(readOnly, /متاحة للقراءة فقط/)
  assert.match(readOnly, /إدارة سياسات الرواتب ونشرها/)
  assert.match(readOnly, /id="collection-kind-LATE"[^>]*disabled=""/)
  assert.match(readOnly, /id="collection-save-reason"[^>]*disabled=""/)
  assert.equal((readOnly.match(/<button\b[^>]*>/g) ?? []).filter(tag => !/\sdisabled=""/.test(tag)).length, 1, 'only the read reload action remains available')
  // مدير سياسات بلا payroll.calculate: الخادم يسمح بحفظ الترتيب، فالواجهة لا تحجبه (كان هذا يُقفل سابقًا).
  const manager = render(fixture({ capabilities: { canEdit: true } }), { canCalculate: false })
  assert.doesNotMatch(manager, /متاحة للقراءة فقط/)
  assert.doesNotMatch(manager, /id="collection-kind-LATE"[^>]*disabled=""/)
  assert.doesNotMatch(manager, /id="collection-save-reason"[^>]*disabled=""/)
})

test('SSR blocks missing/invalid settings or definition and explains actual server issues', () => {
  for (const extra of [
    { settingsStatus: 'MISSING', settingsIssues: ['ساعات العمل غير محددة'] },
    { definitionStatus: 'INVALID', definitionIssues: ['تعريف الشرائح يحتاج مراجعة'] },
    { contractVersion: 'LEGACY_V1' },
  ]) {
    const html = render(fixture(extra))
    assert.match(html, /يلزم استكمال إعدادات النسخة وتعريف بنودها/)
    assert.match(html, /id="collection-kind-LATE"[^>]*disabled=""/)
    assert.match(html, /id="collection-save-reason"[^>]*disabled=""/)
    for (const message of [...(extra.settingsIssues ?? []), ...(extra.definitionIssues ?? [])]) assert.ok(html.includes(message))
  }
})

test('SSR distinguishes initializing collection, invalid replacement and copy-on-write', () => {
  const missing = render(fixture({ collection: null, collectionState: 'MISSING' }))
  assert.match(missing, /لم يُحفظ ترتيب لهذه النسخة/)
  assert.match(missing, /اختر تصنيف «بند INACTIVE»/)
  const invalid = render(fixture({ collection: null, collectionState: 'INVALID', collectionIssues: [{ code: 'BAD', path: 'collection', message: 'ترتيب قديم غير متوافق' }] }))
  assert.match(invalid, /ترتيب قديم غير متوافق/)
  assert.match(invalid, /مقترح جديد للمراجعة/)
  for (const change of [{ status: 'ACTIVE' }, { frozenAt: '2026-09-13' }, { publishedBy: 9 }, { status: 'ARCHIVED' }]) {
    assert.match(render(fixture(), { version: { ...version, ...change } }), /سينشئ نسخة مسودة جديدة/)
  }
})

test('empty deductions are a legitimate complete definition, not fake default components', () => {
  const view = fixture({ definition: { components: [component('NET', { componentType: 'INFO' })], parameters: [], tierSets: [] }, collectionState: 'MISSING', collection: null })
  assert.deepEqual(ui.collectionPayload(ui.createCollectionDraft(view), view.definition.components), { schemaVersion: ui.COLLECTION_SCHEMA_VERSION, classifications: [], collectionOrder: [] })
  assert.match(render(view), /لا توجد بنود خصم/)
})

test('API wrapper uses exact routes, review revision and reason without additional fields or autosave', async () => {
  const original = global.fetch, calls = []
  global.fetch = async (url, options) => { calls.push({ url, options }); return { ok: true, text: async () => JSON.stringify({ editKind: 'CLONED', version: { id: 12 } }) } }
  try {
    await ui.fetchPayrollPolicies()
    await ui.fetchPayrollPolicy(7)
    await ui.fetchPayrollPolicyCollection(7, 11)
    const draft = ui.createCollectionDraft(fixture()), before = copy(draft)
    ui.proposeCollectionOrder(draft, 'LOAN_FIRST')
    assert.equal(calls.length, 3)
    const saved = await ui.savePayrollPolicyCollection(7, 11, 3, '  ترتيب معتمد  ', ui.collectionPayload(draft, components))
    assert.equal(saved.editKind, 'CLONED'); assert.equal(saved.version.id, 12)
    assert.deepEqual(calls.map(call => new URL(call.url).pathname), ['/api/payroll/policies', '/api/payroll/policies/7', '/api/payroll/policies/7/versions/11/collection', '/api/payroll/policies/7/versions/11/collection'])
    assert.equal(calls[3].options.method, 'PATCH')
    assert.deepEqual(JSON.parse(calls[3].options.body), { expectedRevision: 3, reason: 'ترتيب معتمد', collection })
    assert.deepEqual(draft, before)
  } finally { global.fetch = original }
})

test('HTTP conflict is surfaced without retry or mutation; 404 tells the user to update service or reload version', async () => {
  const original = global.fetch, draft = ui.createCollectionDraft(fixture()), before = copy(draft)
  let calls = 0
  global.fetch = async () => { calls++; return { ok: false, status: 409, json: async () => ({ code: 'POLICY_REVISION_CONFLICT', message: 'تغيرت النسخة' }) } }
  try {
    await assert.rejects(ui.savePayrollPolicyCollection(7, 11, 3, 'سبب محفوظ', ui.collectionPayload(draft, components)), error => error instanceof ApiError && error.status === 409 && error.details.code === 'POLICY_REVISION_CONFLICT')
    assert.equal(calls, 1); assert.deepEqual(draft, before)
    assert.match(ui.payrollPoliciesError(new ApiError(404, 'Not Found')), /حدّث خدمة النظام/)
  } finally { global.fetch = original }
})

test('payroll policy route has its own Arabic title before generic payroll prefix', () => {
  assert.equal(pageTitleFor('/payroll/policies'), 'معادلات الرواتب')
  assert.equal(pageTitleFor('/payroll/policies/7'), 'معادلات الرواتب')
  assert.equal(pageTitleFor('/payroll'), 'مسير الرواتب')
})
