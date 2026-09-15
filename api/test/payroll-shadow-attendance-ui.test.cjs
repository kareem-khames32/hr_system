// S28 / D13 — عرض نتيجة SHADOW المحفوظة في تفصيل بند المسير: الليلة 20:00 ← 01:00 تظهر ليوم البداية. بلا خادم.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const { PayrollShadowAttendanceBreakdown, payrollShadowAttendance, shadowWindowLabel } = require('../../src/components/payroll/PayrollShadowAttendanceBreakdown')

const money = (lateness, shortfall, absence, total) => ({ lateness, shortfall, absence, total })
const nightDay = { date: '2026-08-22', sourceRef: 'attendance_days:9', basis: 'UNIQUE_RAW_PUNCH_PAIR_VERIFIED', overnight: true,
  workdayWindow: { from: new Date('2026-08-22T00:00:00').toISOString(), to: new Date('2026-08-23T10:29:59').toISOString(), overnight: true },
  punchIds: [11, 12], firstIn: new Date('2026-08-22T20:10:00').toISOString(), lastOut: new Date('2026-08-23T00:50:00').toISOString(),
  inputs: { absent: false, rawLateSeconds: '600', unexcusedLateMinutes: 10, lateMinutes: 10, graceMinutes: 0, shortfallMinutes: 20, shortfallToleranceMinutes: 0 },
  policy: money('6.250000', '6.250000', '0.000000', '12.500000'), legacy: money('6.250000', '6.250000', '0.000000', '12.500000'), matches: true }
const shadow = (extra = {}) => ({ version: 'SHADOW_ATTENDANCE_V1_20260914', engineMode: 'SHADOW', paidResult: 'LEGACY', status: 'MATCHED', switchEligible: true,
  message: 'محرك السياسة طابق الحساب القديم لكل يوم ولمجموع الفترة', totals: { policy: money('6.25', '6.25', '0.00', '12.50'), legacy: money('6.25', '6.25', '0.00', '12.50') },
  provenWorkDays: 1, unprovenDays: [], days: [nightDay], differences: [], ...extra })
const item = value => ({ breakdown: JSON.stringify({ policyShadow: value }) })
const render = props => renderToStaticMarkup(React.createElement(PayrollShadowAttendanceBreakdown, { currency: 'SAR', ...props }))

test('الليلة تظهر ليوم البداية مع انصراف صباح الغد ومبالغ السياسة والقديم', () => {
  const html = render({ item: item(shadow()) })
  assert.match(html, /المصروف هو الحساب القديم/)
  assert.match(html, /2026-08-22/); assert.match(html, /20:10 ← 00:50/); assert.match(html, /الانصراف صباح اليوم التالي/)
  assert.match(html, /ليلية: البصمات حتى 10:29 صباح 2026-08-23 تُحتسب ليوم 2026-08-22/)
  assert.match(html, /6\.250000 \/ 6\.250000 \/ 0\.000000/); assert.match(html, /مطابق/)
  assert.equal(shadowWindowLabel({ ...nightDay, workdayWindow: { ...nightDay.workdayWindow, overnight: false } }), 'دوام نهاري')
})

test('الفروق والأيام غير المثبتة تظهر بالعربية دون أكواد خام في النص، والتفصيل التالف أو غير SHADOW لا يُعرض', () => {
  const html = render({ item: item(shadow({ status: 'PARTIAL', switchEligible: false, message: 'بعض أيام الفترة غير مثبتة المصدر',
    unprovenDays: [{ code: 'ATTENDANCE_DAY_NOT_CLOSED', dates: ['2026-09-20', '2026-09-21'] }],
    differences: [{ date: '2026-09-20', component: 'absence', legacy: '300.000000', policy: null, reasonCode: 'SOURCE_DAY_UNPROVEN', reason: 'اليوم محسوب في المسير القديم لكن مصدره غير مثبت لمحرك السياسة' }] })), compact: true })
  assert.match(html, /تكافؤ جزئي/); assert.match(html, /أيام غير مثبتة المصدر لمحرك السياسة: 2/)
  assert.match(html, /الغياب: القديم 300\.000000 والسياسة غير محسوب/)
  assert.doesNotMatch(html.replace(/title="[^"]*"/g, ''), /ATTENDANCE_DAY_NOT_CLOSED|SOURCE_DAY_UNPROVEN/)
  for (const breakdown of ['{bad', JSON.stringify({}), JSON.stringify({ policyShadow: { ...shadow(), paidResult: 'POLICY' } }), JSON.stringify({ policyShadow: { ...shadow(), status: 'constructor' } })]) {
    assert.equal(payrollShadowAttendance({ breakdown }), null); assert.equal(render({ item: { breakdown } }), '')
  }
  const source = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'app', 'payroll', 'page.tsx'), 'utf8')
  // تبسيط الرواتب: تفصيل «ظل السياسة» لا يُعرض في خانة التأخير بجدول المسير (المكون باقٍ)
  assert.doesNotMatch(source, /<PayrollShadowAttendanceBreakdown /)
})
