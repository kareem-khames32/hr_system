// الخطوة 15: شاشة مجموعة السياسة — منطق الواجهة وReact SSR فقط؛ لا SQL ولا خدمة ولا تعديل بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const ui = require('../../src/lib/payroll-policies-api')
const { PayrollPolicyCreateForm, PayrollPolicyVersionPanel, PolicySettingsFields } = require('../../src/components/PayrollPolicySetEditor')

const settings = { ...ui.DEFAULT_POLICY_SETTINGS }
const version = (extra = {}) => ({ id: 5, versionNo: 1, revision: 2, status: 'DRAFT', effectiveFrom: '2026-09-23', effectiveTo: null,
  frozenAt: null, publishedAt: null, publishedBy: null, settingsStatus: 'COMPLETE', settingsIssues: [], ...settings, ...extra })
const summary = (capabilities, extra = {}) => ({ policy: { id: 3, code: 'CAIRO', name: 'مجموعة القاهرة', branchId: 1, isActive: true },
  versions: [version(extra)], capabilities })
const panel = (capabilities, extra = {}) => renderToStaticMarkup(React.createElement(PayrollPolicyVersionPanel, {
  summary: summary(capabilities, extra), version: version(extra), locked: false, onChanged() {} }))

test('cycle helpers mirror the server rule: suggested start is the next cycle start and 23 reads as 23 → 22', () => {
  assert.equal(ui.describePolicyCycle(settings), 'من يوم 23 إلى يوم 22 من الشهر التالي')
  assert.equal(ui.suggestPolicyEffectiveFrom(settings, '2026-09-14'), '2026-09-23')
  assert.equal(ui.suggestPolicyEffectiveFrom(settings, '2026-09-23'), '2026-09-23')
  assert.equal(ui.suggestPolicyEffectiveFrom(settings, '2026-12-24'), '2027-01-23')
  const day31 = { ...settings, cycleStartDay: 31 }
  assert.equal(ui.suggestPolicyEffectiveFrom(day31, '2026-02-10'), '2026-03-01')
  assert.equal(ui.suggestPolicyEffectiveFrom(day31, '2026-03-02'), '2026-03-31')
  assert.equal(ui.suggestPolicyEffectiveFrom({ ...settings, defaultPeriodType: 'CALENDAR_MONTH', cycleStartDay: 1 }, '2026-09-14'), '2026-10-01')
  assert.deepEqual(ui.storedPolicySettings(version({ monthlyDays: '30.00', dailyHours: '8.00' })), { ...settings, monthlyDays: 30, dailyHours: 8 })
  assert.equal(ui.storedPolicySettings(version({ cycleStartDay: null })), null)
})

test('create form offers name, code, effective start and the cycle editor with the 23 → 22 default', () => {
  const html = renderToStaticMarkup(React.createElement(PayrollPolicyCreateForm, { onCreated() {}, onCancel() {} }))
  for (const text of ['مجموعة سياسة جديدة', 'اسم المجموعة', 'مثل: مجموعة القاهرة', 'بداية السريان', 'يوم بداية الدورة', 'من يوم 23 إلى يوم 22 من الشهر التالي', 'إنشاء المسودة',
    'الكود (اختياري)', 'اتركه فارغًا ليُولَّد كود فريد تلقائيًا']) {
    assert.ok(html.includes(text), text)
  }
  // لا كود افتراضي بتاريخ اليوم يتصادم عند إنشاء مجموعة ثانية في اليوم نفسه؛ الخادم يولّد الكود.
  assert.doesNotMatch(html, /value="PS-/)
})

test('fixed end day mirrors the server rule: only start − 1 (or 31 for start 1) is accepted and the editor explains why before sending', () => {
  const fixed = (start, end) => ({ ...settings, cycleStartDay: start, cycleEndMode: 'FIXED_DAY', cycleEndDay: end })
  for (const [start, end] of [[23, 22], [30, 29], [31, 30], [1, 31]]) assert.equal(ui.policyCycleIssue(fixed(start, end)), null, `${start}→${end}`)
  for (const [start, end] of [[23, 23], [23, 25], [1, 15], [30, 31]]) assert.match(ui.policyCycleIssue(fixed(start, end)), /يوم النهاية يجب أن يكون/, `${start}→${end}`)
  assert.equal(ui.expectedPolicyCycleEndDay(23), 22); assert.equal(ui.expectedPolicyCycleEndDay(1), 31)
  assert.equal(ui.describePolicyCycle(fixed(1, 31)), 'شهر تقويمي: من أول الشهر إلى آخره')
  assert.equal(ui.suggestPolicyEffectiveFrom(fixed(31, 30), '2026-02-10'), ui.suggestPolicyEffectiveFrom({ ...settings, cycleStartDay: 31 }, '2026-02-10'))
  assert.equal(ui.suggestPolicyEffectiveFrom(fixed(30, 29), '2026-02-10'), '2026-03-01')
  const broken = renderToStaticMarkup(React.createElement(PolicySettingsFields, { value: fixed(23, 25), onChange() {} }))
  assert.match(broken, /role="alert"/); assert.match(broken, /يوم النهاية يجب أن يكون 22/); assert.match(broken, /aria-invalid="true"/)
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(PolicySettingsFields, { value: fixed(23, 22), onChange() {} })), /role="alert"/)
})

test('a published version stopped by a newer one shows its effective end and content seal; an open one reads open', () => {
  const published = { status: 'ACTIVE', revision: 2, frozenAt: '2026-09-14T14:22:37.829Z', publishedAt: '2026-09-14T14:22:37.829Z', publishedBy: 12 }
  const html = panel({ canEdit: true, canPublish: true }, { ...published, effectiveUntil: '2026-10-22', supersededByVersionId: 9,
    contentHash: '83c1dadec34ce5c5d4c646fc2ac7cafba0e6d1b3dc5ff15a8bfeed7be4dde09f' })
  assert.ok(html.includes('السريان من 2026-09-23 إلى 2026-10-22')); assert.ok(html.includes('تتوقف عند بداية نسخة منشورة أحدث'))
  assert.ok(html.includes('ختم المحتوى 83c1dadec34c'))
  const open = panel({ canEdit: true, canPublish: true }, { ...published, effectiveUntil: null, supersededByVersionId: null })
  assert.ok(open.includes('السريان من 2026-09-23 إلى مفتوح')); assert.ok(!open.includes('تتوقف عند بداية نسخة منشورة أحدث'))
})

test('draft panel shows publish and edit only with payroll.policy.manage capabilities; calculate-only sees a read-only panel', () => {
  const manager = panel({ canEdit: true, canPublish: true, canCloneVersion: true })
  assert.ok(manager.includes('مراجعة ونشر')); assert.ok(manager.includes('تعديل الإعدادات والدورة')); assert.ok(manager.includes('مسودة'))
  const officer = panel({ canEdit: false, canPublish: false })
  assert.ok(!officer.includes('مراجعة ونشر')); assert.ok(!officer.includes('تعديل الإعدادات والدورة'))
  assert.ok(officer.includes('إدارة مجموعات سياسات الرواتب ونشر نسخها'))
})

test('published version renders frozen: no publish action and edits are announced as a new draft', () => {
  const html = panel({ canEdit: true, canPublish: true }, { status: 'ACTIVE', revision: 3, frozenAt: '2026-09-14T10:00:00.000Z', publishedAt: '2026-09-14T10:00:00.000Z', publishedBy: 12 })
  assert.ok(html.includes('منشورة')); assert.ok(html.includes('النسخة منشورة ومجمدة منذ 2026-09-14'))
  assert.ok(!html.includes('مراجعة ونشر')); assert.ok(html.includes('مسودة جديدة منها'))
})
