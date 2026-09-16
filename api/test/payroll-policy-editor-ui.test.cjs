// الخطوة 15: شاشة مجموعة السياسة — منطق الواجهة وReact SSR فقط؛ لا SQL ولا خدمة ولا تعديل بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const ui = require('../../src/lib/payroll-policies-api')
const { PayrollPolicyChargeRulesPanel, PayrollPolicyCreateForm, PayrollPolicyVersionPanel, PolicySettingsFields } = require('../../src/components/PayrollPolicySetEditor')
// نص الصفحة بلا وسوم ولا فواصل React بين العقد النصية
const plain = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

const settings = { ...ui.DEFAULT_POLICY_SETTINGS }
const version = (extra = {}) => ({ id: 5, versionNo: 1, revision: 2, status: 'DRAFT', effectiveFrom: '2026-09-23', effectiveTo: null,
  frozenAt: null, publishedAt: null, publishedBy: null, settingsStatus: 'COMPLETE', settingsIssues: [], ...settings, ...extra })
const summary = (capabilities, extra = {}) => ({ policy: { id: 3, code: 'CAIRO', name: 'مجموعة القاهرة', branchId: 1, isActive: true },
  versions: [version(extra)], capabilities })
const panel = (capabilities, extra = {}) => renderToStaticMarkup(React.createElement(PayrollPolicyVersionPanel, {
  summary: summary(capabilities, extra), version: version(extra), locked: false, onChanged() {} }))

test('cycle helpers mirror the server rule: the suggested start is the start of the period that contains today (a set made today serves this month) and 23 reads as 23 → 22', () => {
  assert.equal(ui.describePolicyCycle(settings), 'من يوم 23 إلى يوم 22 من الشهر التالي')
  assert.equal(ui.suggestPolicyEffectiveFrom(settings, '2026-09-14'), '2026-08-23')
  assert.equal(ui.suggestPolicyEffectiveFrom(settings, '2026-09-23'), '2026-09-23')
  assert.equal(ui.suggestPolicyEffectiveFrom(settings, '2026-12-24'), '2026-12-23')
  const day31 = { ...settings, cycleStartDay: 31 }
  assert.equal(ui.suggestPolicyEffectiveFrom(day31, '2026-02-10'), '2026-01-31')
  assert.equal(ui.suggestPolicyEffectiveFrom(day31, '2026-03-02'), '2026-03-01')
  assert.equal(ui.suggestPolicyEffectiveFrom({ ...settings, defaultPeriodType: 'CALENDAR_MONTH', cycleStartDay: 1 }, '2026-09-14'), '2026-09-01')
  assert.deepEqual(ui.storedPolicySettings(version({ monthlyDays: '30.00', dailyHours: '8.00' })), { ...settings, monthlyDays: 30, dailyHours: 8 })
  assert.equal(ui.storedPolicySettings(version({ cycleStartDay: null })), null)
})

test('create form offers the name, the start date and the cycle editor with the 23 → 22 default; no code or description', () => {
  const html = plain(renderToStaticMarkup(React.createElement(PayrollPolicyCreateForm, { onCreated() {}, onCancel() {} })))
  for (const text of ['معادلات رواتب جديدة', 'الاسم', 'تُطبّق من', 'يوم بداية الدورة', 'من يوم 23 إلى يوم 22 من الشهر التالي', 'ساعات العمل اليومية', 'حماية الصافي', 'حفظ']) {
    assert.ok(html.includes(text), text)
  }
  assert.match(renderToStaticMarkup(React.createElement(PayrollPolicyCreateForm, { onCreated() {}, onCancel() {} })), /placeholder="مثل: معادلات رواتب فرع المعادي"/)
  // الكود يولّده الخادم، والوصف غير مطلوب
  assert.doesNotMatch(html, /الكود|الوصف|PS-/)
})

test('fixed end day mirrors the server rule: only start − 1 (or 31 for start 1) is accepted and the editor explains why before sending', () => {
  const fixed = (start, end) => ({ ...settings, cycleStartDay: start, cycleEndMode: 'FIXED_DAY', cycleEndDay: end })
  for (const [start, end] of [[23, 22], [30, 29], [31, 30], [1, 31]]) assert.equal(ui.policyCycleIssue(fixed(start, end)), null, `${start}→${end}`)
  for (const [start, end] of [[23, 23], [23, 25], [1, 15], [30, 31]]) assert.match(ui.policyCycleIssue(fixed(start, end)), /يوم النهاية يجب أن يكون/, `${start}→${end}`)
  assert.equal(ui.expectedPolicyCycleEndDay(23), 22); assert.equal(ui.expectedPolicyCycleEndDay(1), 31)
  assert.equal(ui.describePolicyCycle(fixed(1, 31)), 'شهر تقويمي: من أول الشهر إلى آخره')
  assert.equal(ui.suggestPolicyEffectiveFrom(fixed(31, 30), '2026-02-10'), ui.suggestPolicyEffectiveFrom({ ...settings, cycleStartDay: 31 }, '2026-02-10'))
  assert.equal(ui.suggestPolicyEffectiveFrom(fixed(30, 29), '2026-02-10'), '2026-01-30')
  const broken = renderToStaticMarkup(React.createElement(PolicySettingsFields, { value: fixed(23, 25), onChange() {} }))
  assert.match(broken, /role="alert"/); assert.match(broken, /يوم النهاية يجب أن يكون 22/); assert.match(broken, /aria-invalid="true"/)
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(PolicySettingsFields, { value: fixed(23, 22), onChange() {} })), /role="alert"/)
})

test('an active set shows its dates without a content seal; an open one has no end date', () => {
  const published = { status: 'ACTIVE', revision: 2, frozenAt: '2026-09-14T14:22:37.829Z', publishedAt: '2026-09-14T14:22:37.829Z', publishedBy: 12 }
  const html = plain(panel({ canEdit: true, canPublish: true }, { ...published, effectiveUntil: '2026-10-22', supersededByVersionId: 9,
    contentHash: '83c1dadec34ce5c5d4c646fc2ac7cafba0e6d1b3dc5ff15a8bfeed7be4dde09f' }))
  assert.ok(html.includes('مفعّلة')); assert.ok(html.includes('تُطبّق من 2026-09-23 إلى 2026-10-22'))
  assert.ok(!html.includes('ختم المحتوى') && !html.includes('83c1dadec34c'), 'no content seal on screen')
  const open = plain(panel({ canEdit: true, canPublish: true }, { ...published, effectiveUntil: null, supersededByVersionId: null }))
  assert.ok(open.includes('تُطبّق من 2026-09-23')); assert.ok(!open.includes('إلى 2026-10-22'))
})

test('«حفظ وتفعيل» shows only with payroll.policy.manage capabilities; calculate-only sees a read-only panel', () => {
  const manager = plain(panel({ canEdit: true, canPublish: true }))
  assert.ok(manager.includes('غير مفعّلة بعد')); assert.ok(manager.includes('حفظ وتفعيل'))
  for (const removed of ['مراجعة ونشر', 'مسودة جديدة منها', 'ختم المحتوى', 'الكود']) assert.ok(!manager.includes(removed), removed)
  const officer = plain(panel({ canEdit: false, canPublish: false }))
  assert.ok(!officer.includes('حفظ وتفعيل'))
  assert.ok(officer.includes('تعديل المعادلات يتطلب صلاحية إدارة معادلات الرواتب'))
})

test('an active set is edited in place: one «حفظ وتفعيل» applies the change from a payroll period start, with no clone, freeze banner or publish review', () => {
  const html = plain(panel({ canEdit: true, canPublish: true }, { status: 'ACTIVE', revision: 3, frozenAt: '2026-09-14T10:00:00.000Z', publishedAt: '2026-09-14T10:00:00.000Z', publishedBy: 12 }))
  assert.ok(html.includes('مفعّلة')); assert.ok(html.includes('التعديل يُطبّق من')); assert.ok(html.includes('حفظ وتفعيل'))
  for (const removed of ['مراجعة ونشر', 'مسودة جديدة منها', 'مجمدة']) assert.ok(!html.includes(removed), removed)
})

test('«طريقة الخصم»: every charge rule of the set offers «زي الإعدادات العامة» (empty = the general value), with the absence factor', () => {
  const html = plain(renderToStaticMarkup(React.createElement(PayrollPolicyChargeRulesPanel, { summary: summary({ canEdit: true, canPublish: true }), version: version(), onSaved() {} })))
  for (const text of ['طريقة الخصم', 'خصم التأخير', 'شرائح خصم التأخير', 'خصم الخروج المبكر (الوردية الثابتة)', 'خصم نقص ساعات العمل', 'طريقة خصم النقص',
    'معامل الغياب بلا إذن (أيام)', 'زي الإعدادات العامة', 'حفظ طريقة الخصم',
    // أ1: معادلة بلا مجموعة شرائح تقول ذلك صراحةً بدل أن يتحول خصم التأخير إلى الدقيقة صامتًا
    'لا توجد شرائح الآن: كل دقيقة تأخير تُخصم بسعر الدقيقة.']) assert.ok(html.includes(text), text)
})
