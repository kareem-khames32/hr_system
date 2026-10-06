'use strict'
// B2.10: قواعد فترات الخدمة وإعادة التعيين — دوال صرفة وحكم الإتاحة على قاعدة مصطنعة (من غير SQL).
//  EU-01) اليوم الحقيقي وجمع الأيام؛ ومفتاح الصف المتجمّد مش سنة ولا تاريخ، فخط رصيد الإجازات الزمني مابيشوفوش.
//  EU-02) حدود تاريخ المباشرة: من أول يوم مقبول لحد آخر يوم مسموح، برسائلها.
//  EU-03) حكم الإتاحة: الحالة، وملف الفترة الحالية (مقفول واحد، من غير مفتوح ولا مجهول)، وأول يوم مقبول (آخر يوم عمل، ودورة الرواتب،
//         ونهاية المسير)، والمسير المعلّق، وشهر آخر يوم عمل.
// Run (من api/): node --test test/employment-periods.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/employees/employment-periods')
const periods = require('../src/requests/leave-balance-periods')

test('EU-01: اليوم الحقيقي وجمع الأيام، ومفتاح الصف المتجمّد برّه خط الرصيد الزمني', () => {
  for (const day of ['2026-07-01', '2024-02-29', '1999-12-31']) assert.equal(rules.isoDay(day), day)
  for (const value of ['2026-02-30', '2025-02-29', '2026-13-01', '2026-7-1', '2026/07/01', '2026-07-01T00:00:00Z', ' 2026-07-01', '', null, undefined, 20260701, new Date('2026-07-01'), ['2026-07-01']]) {
    assert.equal(rules.isoDay(value), null, String(value))
  }
  assert.deepEqual([rules.addDaysTo('2026-06-30', 1), rules.addDaysTo('2025-12-31', 1), rules.addDaysTo('2024-02-28', 1), rules.addDaysTo('2026-03-01', -1), rules.addDaysTo('2026-10-06', 366)],
    ['2026-07-01', '2026-01-01', '2024-02-29', '2026-02-28', '2027-10-07'])
  // مفتاح الفترة المقفولة: مش سنة ولا تاريخ — قرّاء الرصيد (الخط الزمني) بيسقّطوه، وصف السنة العادي جنبه بيفضل لوحده
  assert.deepEqual([rules.frozenBalanceKey(1, '2026'), rules.frozenBalanceKey(12, '2025-03-15'), rules.frozenBalanceKey(2, '')], ['P1:2026', 'P12:2025-03-15', 'P2:'])
  for (const key of ['P1:2026', 'P12:2025-03-15']) {
    assert.deepEqual([periods.isYearKey(key), periods.isDateKey(key), periods.nominalWindow(key, '2026-09-01')], [false, false, null], key)
    assert.ok(key.length <= 20, 'جوه طول عمود المفتاح')
  }
  for (const basis of ['YEAR_START', 'HIRE_ANNIVERSARY']) {
    const timeline = periods.balanceTimeline([{ id: 1, period: 'P1:2025' }, { id: 2, period: 'P1:2026' }, { id: 3, period: 'P1:2025-03-15' }, { id: 4, period: '2026' }], '2026-09-01', basis)
    assert.deepEqual(timeline.map(entry => [entry.key, entry.start, entry.end]), [['2026', '2026-01-01', '2026-12-31']], basis)
  }
  assert.ok(rules.REHIRE_REASON_MIN === 5 && rules.REHIRE_REASON_MAX === 500 && rules.REHIRE_START_MAX_DAYS_AHEAD === 366)
})

test('EU-02: حدود تاريخ المباشرة — من أول يوم مقبول لحد آخر يوم مسموح', () => {
  const gate = { minStartDate: '2025-07-01', maxStartDate: '2027-10-07', lastWorkingDay: '2025-06-10' }
  for (const day of ['2025-07-01', '2026-01-01', '2027-10-07']) assert.equal(rules.rehireStartIssue(day, gate), null, day)
  for (const day of ['2025-06-30', '2025-06-10', '2025-06-11', '2019-01-01']) {
    assert.deepEqual(rules.rehireStartIssue(day, gate), { code: 'REHIRE_START_TOO_EARLY',
      message: 'تاريخ المباشرة الجديد من 2025-07-01 أو بعده: آخر يوم عمل في خدمته القديمة 2025-06-10، وراتب شهر الرواتب اللي فيه اليوم ده اتحسب مع التصفية' }, day)
  }
  assert.deepEqual(rules.rehireStartIssue('2027-10-08', gate), { code: 'REHIRE_START_TOO_LATE', message: 'تاريخ المباشرة الجديد بحد أقصى سنة قدام (2027-10-07)' })
  // حد أدنى مش معروف = مرفوض (القيمة المجهولة بتقفل)
  assert.equal(rules.rehireStartIssue('2026-01-01', { ...gate, minStartDate: null }).code, 'REHIRE_START_TOO_EARLY')
})

// قاعدة مصطنعة: كل استعلام بيتعرف بنصه
function fakeManager(state) {
  const seen = []
  return { seen, query: async (text, params) => {
    seen.push(text)
    if (text.includes('FROM dbo.employment_periods')) return [{ next: state.nextPeriod ?? 1 }]
    if (text.includes('FROM dbo.offboarding_cases')) return state.cases ?? []
    if (text.includes('FROM dbo.requests_config')) return state.cycle === undefined ? [] : [{ value: state.cycle }]
    if (text.includes('MAX(r.[endDate])')) return [{ endDate: state.runEnd ?? null }]
    if (text.includes(`IN ('DRAFT', 'CALCULATED')`)) { assert.deepEqual(params, [state.employeeId ?? 7, state.lastWorkingDay ?? '2025-06-30']); return state.pending ?? [] }
    if (text.includes(`IN ('APPROVED', 'PAID')`)) { assert.deepEqual(params, [state.employeeId ?? 7, state.lastWorkingDay ?? '2025-06-30']); return state.settledMonth ?? [] }
    if (text.includes(`r.[status] <> 'CANCELLED' AND r.[startDate] <= @0`)) return state.payrollBefore ?? []
    throw new Error('unexpected query: ' + text.slice(0, 120))
  } }
}
const closed = (lastWorkingDay = '2025-06-30', extra = {}) => ({ id: 3, status: 'CLOSED', terminationReason: 'termination', lastWorkingDay, ...extra })
const ended = (extra = {}) => ({ id: 7, status: 'terminated', joinDate: '2020-01-01', createdAt: new Date('2019-12-01T08:00:00Z'), ...extra })
const judge = (state, employee = ended(), today = '2026-10-06') => rules.rehireGate(fakeManager(state), employee, today)
const codeOf = gate => gate.blocked?.code ?? null

test('EU-03: حكم الإتاحة — الحالة، وملف الفترة الحالية، وأول يوم مقبول، والمسير المعلّق، وشهر آخر يوم عمل', async () => {
  // المتاح: فترة رقمها اللي بعد آخر فترة مقفولة، وبدايتها تاريخ التعيين، ونهايتها آخر يوم عمل بسبب الخروج وملفه، وحدود التاريخ
  assert.deepEqual(await judge({ cases: [closed()], cycle: '1', nextPeriod: 2 }), { blocked: null, periodNo: 2, currentStart: '2020-01-01', lastWorkingDay: '2025-06-30', caseId: 3,
    exitReason: 'termination', minStartDate: '2025-07-01', maxStartDate: '2027-10-07' })
  // سبب الخروج الفاضي في ملف قديم = استقالة (نفس قراءة نهاية الخدمة)
  assert.equal((await judge({ cases: [closed('2025-06-30', { terminationReason: null })], cycle: '1' })).exitReason, 'resignation')
  // الحالة: منتهي أو مؤرشف بس
  for (const status of ['active', 'probation', 'notice_period', 'suspended', '', 'TERMINATED']) assert.equal(codeOf(await judge({ cases: [closed()], cycle: '1' }, ended({ status }))), 'REHIRE_NOT_ENDED', status)
  assert.equal(codeOf(await judge({ cases: [closed()], cycle: '1' }, ended({ status: 'archived' }))), null)
  // بداية الفترة الحالية: تاريخ التعيين، وإلا تاريخ إنشاء الملف؛ ومن غير الاتنين أو بتاريخ مش صالح = مرفوض
  assert.equal((await judge({ cases: [closed()], cycle: '1' }, ended({ joinDate: null }))).currentStart, '2019-12-01')
  for (const extra of [{ joinDate: null, createdAt: null }, { joinDate: '2020-02-30' }, { joinDate: 'غلط' }]) assert.equal(codeOf(await judge({ cases: [closed()], cycle: '1' }, ended(extra))), 'REHIRE_START_UNKNOWN', JSON.stringify(extra))
  // الملفات: من غير ملف، أو ملف قبل بداية الفترة الحالية (بتاع فترة أقدم) = مفيش ملف للفترة دي؛ وملف في نفس يوم البداية بتاعها
  assert.equal(codeOf(await judge({ cases: [], cycle: '1' })), 'REHIRE_NO_CLOSED_CASE')
  assert.equal(codeOf(await judge({ cases: [closed('2019-12-31')], cycle: '1' })), 'REHIRE_NO_CLOSED_CASE')
  assert.equal(codeOf(await judge({ cases: [closed('2020-01-01')], cycle: '1', lastWorkingDay: '2020-01-01' })), null)
  // ملف فترة أقدم مع ملف الفترة الحالية: الأقدم مابيتحسبش
  assert.deepEqual([codeOf(await judge({ cases: [closed('2018-05-31', { id: 1 }), closed()], cycle: '1' })), (await judge({ cases: [closed('2018-05-31', { id: 1 }), closed()], cycle: '1' })).caseId], [null, 3])
  // مفتوح (حتى لو قبل البداية الحالية) أو حالته مش معروفة أو آخر يوم عمل فيه مش صالح: مرفوض قبل أي حساب
  for (const status of ['IN_CLEARANCE', 'IN_SETTLEMENT', 'SETTLED']) {
    assert.equal(codeOf(await judge({ cases: [closed(), closed('2025-06-30', { id: 4, status })], cycle: '1' })), 'REHIRE_OPEN_CASE', status)
    assert.equal(codeOf(await judge({ cases: [closed('2018-01-01', { id: 4, status }), closed()], cycle: '1' })), 'REHIRE_OPEN_CASE', `${status} قديم`)
  }
  for (const extra of [{ status: 'ARCHIVED' }, { status: '' }, { status: 'closed' }, { lastWorkingDay: null }, { lastWorkingDay: '2025-02-30' }]) {
    assert.equal(codeOf(await judge({ cases: [closed(), closed('2025-06-30', { id: 4, ...extra })], cycle: '1' })), 'REHIRE_CASE_UNKNOWN', JSON.stringify(extra))
  }
  assert.equal(codeOf(await judge({ cases: [closed(), closed('2025-05-31', { id: 4 })], cycle: '1' })), 'REHIRE_AMBIGUOUS_END')

  // أول يوم مقبول = اليوم اللي بعد الأبعد من: آخر يوم عمل، ونهاية شهر الرواتب بالدورة، ونهاية أي مسير بيغطّي اليوم ده
  const minOf = async state => (await judge({ cases: [closed(state.lastWorkingDay ?? '2025-06-30')], ...state })).minStartDate
  assert.deepEqual([await minOf({ cycle: '1' }), await minOf({ cycle: '1', lastWorkingDay: '2025-06-10' }), await minOf({ cycle: '23' }), await minOf({ cycle: '23', lastWorkingDay: '2025-06-22' }),
    await minOf({ cycle: '1', runEnd: '2025-07-15' }), await minOf({ cycle: '23', runEnd: '2025-07-15' }), await minOf({ cycle: '1', runEnd: '2025-06-15' })],
  ['2025-07-01', '2025-07-01', '2025-07-23', '2025-06-23', '2025-07-16', '2025-07-23', '2025-07-01'])
  // دورة مش مثبتة أو مش صالحة = 23 (زي باقي النظام)
  for (const cycle of [undefined, '', '0', '32', '1.5', 'غلط', ' 1']) assert.equal(await minOf({ cycle }), '2025-07-23', String(cycle))

  // مسير لسه مسودة أو محسوب والموظف داخل فيه: مرفوض، والرسالة بشهر المسير بس
  assert.deepEqual((await judge({ cases: [closed()], cycle: '1', pending: [{ period: '2025-06' }], settledMonth: [{ id: 9 }] })).blocked, { code: 'REHIRE_PENDING_OLD_RUN',
    message: 'الموظف داخل في مسير لسه مااتعتمدش بيغطّي أيام من خدمته القديمة (مسير شهر 2025-06) — اعتمده أو ألغيه قبل إعادة التعيين' })
  assert.match((await judge({ cases: [closed()], cycle: '1', pending: [{ period: null }] })).blocked.message, /\(مسير شهر —\) — اعتمده/)
  // الرسائل من غير رقم ملف الإنهاء ولا رقم واسم المسير
  assert.deepEqual((await judge({ cases: [closed(), closed('2025-06-30', { id: 44, status: 'SETTLED' })], cycle: '1' })).blocked,
    { code: 'REHIRE_OPEN_CASE', message: 'للموظف ملف إنهاء خدمة لسه مفتوح — اقفله قبل إعادة التعيين' })
  // شهر آخر يوم عمل: مسير معتمد والموظف فيه = متاحة؛ من غيره والنظام فيه مسير بدأ قبل اليوم ده = مرفوض؛ ومن غير أي مسير قبله = متاحة
  assert.equal(codeOf(await judge({ cases: [closed()], cycle: '1', settledMonth: [{ id: 9 }], payrollBefore: [{ id: 9 }] })), null)
  assert.deepEqual((await judge({ cases: [closed()], cycle: '1', payrollBefore: [{ id: 5 }] })).blocked, { code: 'REHIRE_LAST_MONTH_OPEN',
    message: 'مسير شهر آخر يوم عمل (2025-06-30) لسه مااتعتمدش أو الموظف مش فيه — راتب أيامه الأخيرة مصدره المسير ده؛ اعتمده قبل إعادة التعيين' })
  assert.equal(codeOf(await judge({ cases: [closed()], cycle: '1' })), null)
  // الرفض مابيرجّعش حد أدنى يتبني عليه؛ والاستعلامات كلها على الجداول المقصودة: المسير المعلّق للمشمول بس، وشهر آخر يوم عمل لمسير عادي معتمد وبند مش معكوس
  const manager = fakeManager({ cases: [closed()], cycle: '1' })
  await rules.rehireGate(manager, ended(), '2026-10-06')
  const pendingSql = manager.seen.find(text => text.includes(`IN ('DRAFT', 'CALCULATED')`)), settledSql = manager.seen.find(text => text.includes(`IN ('APPROVED', 'PAID')`))
  assert.ok(pendingSql.includes('SELECT TOP (1) r.[period] FROM dbo.payroll_runs r') && pendingSql.includes('r.[startDate] <= @1') && pendingSql.includes(`(m.[membershipStatus] IS NULL OR m.[membershipStatus] = 'INCLUDED')`) && pendingSql.includes('dbo.payroll_items'))
  assert.ok(settledSql.includes(`ISNULL(r.[runType], 'REGULAR') = 'REGULAR'`) && settledSql.includes('r.[startDate] <= @1 AND r.[endDate] >= @1') && settledSql.includes(`[status]='POSTED'`)
    && settledSql.includes('dbo.payroll_run_members') && !settledSql.includes('membershipStatus'))
  assert.ok(manager.seen.find(text => text.includes('FROM dbo.offboarding_cases')).includes(`[status] <> 'CANCELLED'`))
})
