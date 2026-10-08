'use strict'
// B2.10: قواعد فترات الخدمة وإعادة التعيين — دوال صرفة وحكم الإتاحة على قاعدة مصطنعة (من غير SQL).
//  EU-01) اليوم الحقيقي وجمع الأيام؛ ومفتاح الصف المتجمّد مش سنة ولا تاريخ، فخط رصيد الإجازات الزمني مابيشوفوش.
//  EU-02) حدود تاريخ المباشرة: أول يوم مقبول وآخر يوم مسموح؛ وسطر سجل الموظف: التسمية ثم السبب، والسبب الطويل بيتحفظ كامل.
//  EU-03) حكم الإتاحة: الحالة، وملف الفترة الحالية (مقفول واحد، من غير مفتوح ولا مجهول)، وإجازة معتمدة بعد آخر يوم عمل، وأول يوم
//         مقبول (آخر يوم عمل، ودورة الرواتب، ونهاية أي مسير بيغطّي اليوم ده)، والمسير المعلّق، وشهر آخر يوم عمل.
//  EU-04) مرجع المسير بقاعدة رؤيته: شهر المسير المعلّق للي يشوف المسير بس، وحد تاريخ جاي من مسير مخفي بيقفل الإتاحة من غير تاريخ.
//  EU-05) (CRP2W، نص الكود) مفيش كاتب لرصيد الإجازات برّه قفل صف الموظف: بوابة الفحص مابتكتبش، وأثر ملف الموظف على الرصيد جوه معاملته،
//         ومعالجات الطلبات اللي بتحفظ كيان الموظف كله بتقراه بقفل.
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

test('EU-02: حدود تاريخ المباشرة (أول يوم وآخر يوم)، وسطر السجل بيحفظ السبب الطويل كامل', () => {
  const gate = { minStartDate: '2025-07-01', maxStartDate: '2027-10-07', lastWorkingDay: '2025-06-10' }
  for (const day of ['2025-07-01', '2026-01-01', '2027-10-07']) assert.equal(rules.rehireStartIssue(day, gate), null, day)
  for (const day of ['2025-06-30', '2025-06-10', '2025-06-11', '2019-01-01']) {
    assert.deepEqual(rules.rehireStartIssue(day, gate), { code: 'REHIRE_START_TOO_EARLY',
      message: 'تاريخ المباشرة الجديد من 2025-07-01 أو بعده: آخر يوم عمل في خدمته القديمة 2025-06-10، وراتب شهر الرواتب اللي فيه اليوم ده اتحسب مع التصفية' }, day)
  }
  assert.deepEqual(rules.rehireStartIssue('2027-10-08', gate), { code: 'REHIRE_START_TOO_LATE', message: 'تاريخ المباشرة الجديد بحد أقصى سنة قدام (2027-10-07)' })
  // حد أدنى مش معروف = مرفوض (القيمة المجهولة بتقفل)
  assert.equal(rules.rehireStartIssue('2026-01-01', { ...gate, minStartDate: null }).code, 'REHIRE_START_TOO_EARLY')

  // سطر سجل الموظف: التسمية ثم السبب؛ من غير سبب التسمية بس؛ ولو الاتنين أطول من 500 حرف السبب لوحده كامل بآخره (CRP2V-A-N01)
  assert.equal(rules.HISTORY_REASON_MAX, 500)
  assert.equal(rules.reasonWithLabel('عودة على رأس العمل', 'رجع بعد إجازة'), 'عودة على رأس العمل — رجع بعد إجازة')
  assert.equal(rules.reasonWithLabel('عودة على رأس العمل', ''), 'عودة على رأس العمل')
  const long = 'س'.repeat(475) + ' آخر جملة في السبب مهمة.'
  assert.equal(long.length, 499)
  assert.equal(rules.reasonWithLabel('عودة على رأس العمل بعد انتهاء خدمة', long), long)
  const fits = 'س'.repeat(500 - 'تسمية — '.length)
  assert.deepEqual([rules.reasonWithLabel('تسمية', fits).length, rules.reasonWithLabel('تسمية', fits).startsWith('تسمية — '), rules.reasonWithLabel('تسمية', fits + 'ص')], [500, true, fits + 'ص'])
})

// قاعدة مصطنعة: كل استعلام بيتعرف بنصه
function fakeManager(state) {
  const seen = []
  return { seen,
    // قاعدة رؤية المسير (payrollRunRefVisibility) بتقرا عضوية الموظف في المسير بلقطة فرعها
    getRepository: () => ({ find: async () => state.members ?? [] }),
    query: async (text, params) => {
      seen.push(text)
      if (text.includes('FROM dbo.employment_periods')) return [{ next: state.nextPeriod ?? 1 }]
      if (text.includes('FROM dbo.offboarding_cases')) return state.cases ?? []
      if (text.includes('FROM dbo.leaves')) { assert.deepEqual(params, [state.employeeId ?? 7, state.lastWorkingDay ?? '2025-06-30']); return [{ count: state.futureLeaves ?? 0 }] }
      if (text.includes('FROM dbo.requests_config')) return state.cycle === undefined ? [] : [{ value: state.cycle }]
      if (text.includes('r.[endDate] >= @0 ORDER BY r.[id]')) { assert.deepEqual(params, [state.lastWorkingDay ?? '2025-06-30']); return state.covering ?? [] }
      if (text.includes(`IN ('DRAFT', 'CALCULATED')`)) { assert.deepEqual(params, [state.employeeId ?? 7, state.lastWorkingDay ?? '2025-06-30']); return state.pending ?? [] }
      if (text.includes(`IN ('APPROVED', 'PAID')`)) { assert.deepEqual(params, [state.employeeId ?? 7, state.lastWorkingDay ?? '2025-06-30']); return state.settled ?? [] }
      if (text.includes(`r.[status] <> 'CANCELLED' AND r.[startDate] <= @0`)) return state.payrollBefore ?? []
      // بيانات المسير لقاعدة الرؤية: الافتراضي مسير له أعضاء على فرع 2، وstate.runs بيغيّر مسير بعينه
      if (text.includes('OPENJSON(@0)')) return JSON.parse(params[0]).map(id => ({ id, branchId: 2, hasMembers: 1, runType: null, parentRunId: null, ...(state.runs?.[id] ?? {}) }))
      throw new Error('unexpected query: ' + text.slice(0, 120))
    } }
}
const closed = (lastWorkingDay = '2025-06-30', extra = {}) => ({ id: 3, status: 'CLOSED', terminationReason: 'termination', lastWorkingDay, ...extra })
const ended = (extra = {}) => ({ id: 7, status: 'terminated', joinDate: '2020-01-01', createdAt: new Date('2019-12-01T08:00:00Z'), ...extra })
// حساب الشركة (نطاقه كل الفروع) إلا لو اتحدد غير كده
const judge = (state, employee = ended(), today = '2026-10-06', scope = null) => rules.rehireGate(fakeManager(state), employee, today, scope)
const codeOf = gate => gate.blocked?.code ?? null
const june = (extra = {}) => ({ id: 9, endDate: '2025-06-30', ...extra })

test('EU-03: حكم الإتاحة — الحالة، وملف الفترة الحالية، وإجازة بعد آخر يوم عمل، وأول يوم مقبول، والمسير المعلّق، وشهر آخر يوم عمل', async () => {
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
  // مفتوح (حتى لو قبل البداية الحالية) أو حالته مش معروفة أو آخر يوم عمل فيه مش صالح: مرفوض قبل أي حساب، والرسالة من غير رقم الملف
  for (const status of ['IN_CLEARANCE', 'IN_SETTLEMENT', 'SETTLED']) {
    assert.equal(codeOf(await judge({ cases: [closed(), closed('2025-06-30', { id: 4, status })], cycle: '1' })), 'REHIRE_OPEN_CASE', status)
    assert.equal(codeOf(await judge({ cases: [closed('2018-01-01', { id: 4, status }), closed()], cycle: '1' })), 'REHIRE_OPEN_CASE', `${status} قديم`)
  }
  assert.deepEqual((await judge({ cases: [closed(), closed('2025-06-30', { id: 44, status: 'SETTLED' })], cycle: '1' })).blocked,
    { code: 'REHIRE_OPEN_CASE', message: 'للموظف ملف إنهاء خدمة لسه مفتوح — اقفله قبل إعادة التعيين' })
  for (const extra of [{ status: 'ARCHIVED' }, { status: '' }, { status: 'closed' }, { lastWorkingDay: null }, { lastWorkingDay: '2025-02-30' }]) {
    assert.equal(codeOf(await judge({ cases: [closed(), closed('2025-06-30', { id: 4, ...extra })], cycle: '1' })), 'REHIRE_CASE_UNKNOWN', JSON.stringify(extra))
  }
  assert.equal(codeOf(await judge({ cases: [closed(), closed('2025-05-31', { id: 4 })], cycle: '1' })), 'REHIRE_AMBIGUOUS_END')

  // إجازة معتمدة بعد آخر يوم عمل: خصمها على الرصيد اللي هيتجمّد، فلازم تتلغى الأول (CRP2V-B-B01)
  assert.deepEqual((await judge({ cases: [closed()], cycle: '1', futureLeaves: 2, settled: [june()] })).blocked, { code: 'REHIRE_FUTURE_LEAVES',
    message: 'للموظف إجازات معتمدة بعد آخر يوم عمل (2025-06-30)، عددها 2 — ألغها قبل إعادة التعيين عشان رصيدها يرجع على خدمته القديمة' })
  assert.equal(codeOf(await judge({ cases: [closed()], cycle: '1', futureLeaves: 0 })), null)
  // الإتاحة المقفولة مافيهاش تاريخ مباشرة (بأي سبب)
  for (const state of [{ cases: [] }, { cases: [closed()], futureLeaves: 1 }, { cases: [closed()], pending: [{ id: 12, period: '2025-06' }] }, { cases: [closed()], payrollBefore: [{ id: 5 }] }]) {
    const blockedGate = await judge({ cycle: '1', ...state })
    assert.deepEqual([!!blockedGate.blocked, blockedGate.minStartDate], [true, null], JSON.stringify(state))
  }

  // أول يوم مقبول = اليوم اللي بعد الأبعد من: آخر يوم عمل، ونهاية شهر الرواتب بالدورة، ونهاية مسير الشهر اللي الموظف فيه،
  // ونهاية أي مسير تاني بيغطّي اليوم ده (حساب الشركة شايف كل المسيرات)
  const boundOf = async state => (await judge({ cases: [closed(state.lastWorkingDay ?? '2025-06-30')], ...state })).minStartDate
  const wide = { id: 20, endDate: '2025-07-15' }
  assert.deepEqual([await boundOf({ cycle: '1' }), await boundOf({ cycle: '1', lastWorkingDay: '2025-06-10' }), await boundOf({ cycle: '23' }), await boundOf({ cycle: '23', lastWorkingDay: '2025-06-22' }),
    await boundOf({ cycle: '1', settled: [june({ endDate: '2025-07-15' })] }), await boundOf({ cycle: '23', settled: [june({ endDate: '2025-07-15' })] }), await boundOf({ cycle: '1', settled: [june({ endDate: '2025-06-15' })] }),
    await boundOf({ cycle: '1', covering: [wide] }), await boundOf({ cycle: '1', covering: [wide], settled: [june({ endDate: '2025-07-10' })] }), await boundOf({ cycle: '1', settled: [june(), june({ id: 10, endDate: '2025-07-20' })] }),
    await boundOf({ cycle: '1', covering: [wide, { id: 21, endDate: null }, { id: 22, endDate: 'غلط' }] })],
  ['2025-07-01', '2025-07-01', '2025-07-23', '2025-06-23', '2025-07-16', '2025-07-23', '2025-07-01', '2025-07-16', '2025-07-16', '2025-07-21', '2025-07-16'])
  // دورة مش مثبتة أو مش صالحة = 23 (زي باقي النظام)
  for (const cycle of [undefined, '', '0', '32', '1.5', 'غلط', ' 1']) assert.equal(await boundOf({ cycle }), '2025-07-23', String(cycle))

  // مسير لسه مسودة أو محسوب والموظف داخل فيه: مرفوض، والرسالة بشهر المسير بس (حساب الشركة شايف كل المسيرات)
  assert.deepEqual((await judge({ cases: [closed()], cycle: '1', pending: [{ id: 12, period: '2025-06' }], settled: [june()] })).blocked, { code: 'REHIRE_PENDING_OLD_RUN',
    message: 'الموظف داخل في مسير لسه مااتعتمدش بيغطّي أيام من خدمته القديمة (مسير شهر 2025-06) — اعتمده أو ألغيه قبل إعادة التعيين' })
  assert.match((await judge({ cases: [closed()], cycle: '1', pending: [{ id: 12, period: null }] })).blocked.message, /\(مسير شهر —\) — اعتمده/)
  // شهر آخر يوم عمل: مسير محسوم والموظف فيه = متاحة؛ من غيره والنظام فيه مسير بدأ قبل اليوم ده = مرفوض؛ ومن غير أي مسير قبله = متاحة
  assert.equal(codeOf(await judge({ cases: [closed()], cycle: '1', settled: [june()], payrollBefore: [{ id: 9 }] })), null)
  assert.deepEqual((await judge({ cases: [closed()], cycle: '1', payrollBefore: [{ id: 5 }] })).blocked, { code: 'REHIRE_LAST_MONTH_OPEN',
    message: 'مسير شهر آخر يوم عمل (2025-06-30) لسه مااتعتمدش أو الموظف مش فيه — راتب أيامه الأخيرة مصدره المسير ده؛ اعتمده قبل إعادة التعيين' })
  assert.equal(codeOf(await judge({ cases: [closed()], cycle: '1' })), null)
  // الاستعلامات على الجداول المقصودة: المسير المعلّق للمشمول بس، وشهر آخر يوم عمل لمسير عادي محسوم وبند مش معكوس، والإجازات المعتمدة بعد آخر يوم
  const manager = fakeManager({ cases: [closed()], cycle: '1' })
  await rules.rehireGate(manager, ended(), '2026-10-06', null)
  const sql = needle => manager.seen.find(text => text.includes(needle))
  const pendingSql = sql(`IN ('DRAFT', 'CALCULATED')`), settledSql = sql(`IN ('APPROVED', 'PAID')`)
  assert.ok(pendingSql.includes('SELECT TOP (1) r.[id], r.[period] FROM dbo.payroll_runs r') && pendingSql.includes('r.[startDate] <= @1')
    && pendingSql.includes(`(m.[membershipStatus] IS NULL OR m.[membershipStatus] = 'INCLUDED')`) && pendingSql.includes('dbo.payroll_items'))
  assert.ok(settledSql.includes(`ISNULL(r.[runType], 'REGULAR') = 'REGULAR'`) && settledSql.includes('r.[startDate] <= @1 AND r.[endDate] >= @1') && settledSql.includes(`[status]='POSTED'`)
    && settledSql.includes('dbo.payroll_run_members') && !settledSql.includes('membershipStatus'))
  assert.ok(sql('FROM dbo.offboarding_cases').includes(`[status] <> 'CANCELLED'`))
  assert.ok(sql('FROM dbo.leaves').includes(`[status] = N'APPROVED' AND [toDate] > @1`))
  assert.ok(sql('r.[endDate] >= @0 ORDER BY r.[id]').includes(`WHERE r.[status] <> 'CANCELLED' AND r.[startDate] <= @0 AND r.[endDate] >= @0`))
})

test('EU-04: مرجع المسير بقاعدة رؤيته — شهر المسير المعلّق للي يشوف المسير بس، وحد تاريخ جاي من مسير مخفي بيقفل الإتاحة من غير تاريخ', async () => {
  // عضوية الموظف في المسيرين محفوظة بلقطة فرع 2: حساب فرع 2 (وحساب الشركة) يشوفهم، وحساب فرع 1 لأ
  const members = [{ runId: 12, employeeId: 7, snapshot: { branchId: 2 } }, { runId: 9, employeeId: 7, snapshot: { branchId: 2 } }]
  const pendingState = { cases: [closed()], cycle: '1', pending: [{ id: 12, period: '2025-04' }], settled: [june()], members }
  const WITH_MONTH = 'الموظف داخل في مسير لسه مااتعتمدش بيغطّي أيام من خدمته القديمة (مسير شهر 2025-04) — اعتمده أو ألغيه قبل إعادة التعيين'
  const GENERIC = 'الموظف داخل في مسير لسه مااتعتمدش بيغطّي أيام من خدمته القديمة — لازم يتعتمد أو يتلغى قبل إعادة التعيين'
  const blockedFor = async scope => (await judge(pendingState, ended(), '2026-10-06', scope)).blocked
  assert.deepEqual([await blockedFor(null), await blockedFor([2]), await blockedFor([1, 2])].map(blocked => [blocked.code, blocked.message]), Array(3).fill(['REHIRE_PENDING_OLD_RUN', WITH_MONTH]))
  // حساب فرع تاني: نفس المنع بنفس الكود، من غير شهر المسير ولا رقمه (CRP2V-B-B04)
  for (const scope of [[1], [3, 4], []]) {
    const blocked = await blockedFor(scope)
    assert.deepEqual([blocked.code, blocked.message, /2025-04|#12|\b12\b/.test(blocked.message)], ['REHIRE_PENDING_OLD_RUN', GENERIC, false], JSON.stringify(scope))
  }

  // نهاية مسير شهر آخر يوم عمل (15 يوليو، أبعد من نهاية الدورة): للي يشوف المسير هي الحد؛ ولغيره الإتاحة مقفولة بسبب عام،
  // من غير تاريخ ولا شهر — فمفيش تاريخ يتجرّب عشان نهاية المسير تتخمّن
  const HIDDEN = { code: 'REHIRE_HIDDEN_RUN', message: 'أيام من خدمته القديمة داخلة في مسير خارج نطاق صلاحيتك — إعادة التعيين محتاجة حساب يشوف المسير ده' }
  const forScope = async (state, scope) => { const gate = await judge(state, ended(), '2026-10-06', scope); return [gate.blocked, gate.minStartDate] }
  const settledState = { cases: [closed()], cycle: '1', settled: [june({ endDate: '2025-07-15' })], members }
  assert.deepEqual([await forScope(settledState, null), await forScope(settledState, [2]), await forScope(settledState, [1, 2]), await forScope(settledState, [1]), await forScope(settledState, [])],
    [[null, '2025-07-16'], [null, '2025-07-16'], [null, '2025-07-16'], [HIDDEN, null], [HIDDEN, null]])
  assert.equal(/2025-07|\b9\b/.test(JSON.stringify(await judge(settledState, ended(), '2026-10-06', [1]))), false, 'ولا شهر المسير ولا نهايته ولا رقمه في الحكم كله')
  // مسير مخفي نهايته مش أبعد من اللي القارئ شايفه (نهاية الدورة، أو مسير تاني شايفه): مابيقفلش، والحد زي ما هو
  assert.deepEqual(await forScope({ ...settledState, settled: [june()] }, [1]), [null, '2025-07-01'])
  assert.deepEqual(await forScope({ ...settledState, settled: [june({ id: 30, endDate: '2025-07-10' }), june({ endDate: '2025-07-15' })], members: [...members, { runId: 30, employeeId: 7, snapshot: { branchId: 1 } }] }, [2]),
    [null, '2025-07-16'])
  assert.deepEqual(await forScope({ ...settledState, settled: [june({ id: 30, endDate: '2025-07-15' }), june({ endDate: '2025-07-15' })], members: [...members, { runId: 30, employeeId: 7, snapshot: { branchId: 1 } }] }, [1]),
    [null, '2025-07-16'], 'نفس النهاية من مسير شايفه')
  // مسير تاني بيغطّي آخر يوم عمل والموظف مش فيه: لحساب الشركة نهايته هي الحد؛ ولحساب فرع مش شايفه الإتاحة مقفولة؛
  // ومسير قديم من غير أعضاء خالص على فرع من نطاق القارئ بيتشاف (قاعدة الرؤية نفسها)
  const coveringState = { cases: [closed()], cycle: '1', settled: [june()], covering: [{ id: 9, endDate: '2025-06-30' }, { id: 20, endDate: '2025-07-15' }], members }
  assert.deepEqual([await forScope(coveringState, null), await forScope(coveringState, [2]), await forScope({ ...coveringState, runs: { 20: { hasMembers: 0, branchId: 2 } } }, [2]),
    await forScope({ ...coveringState, runs: { 20: { hasMembers: 0, branchId: 1 } } }, [2]), await forScope({ ...coveringState, runs: { 20: { hasMembers: 0, branchId: null } } }, [2])],
  [[null, '2025-07-16'], [HIDDEN, null], [null, '2025-07-16'], [HIDDEN, null], [HIDDEN, null]])
  // المسير المعلّق والشهر المش محسوم أسبق من الحد المخفي (سببهم بيتحل الأول)
  assert.equal(codeOf(await judge({ ...settledState, pending: [{ id: 12, period: '2025-04' }] }, ended(), '2026-10-06', [1])), 'REHIRE_PENDING_OLD_RUN')
  assert.equal(codeOf(await judge({ cases: [closed()], cycle: '1', covering: [{ id: 20, endDate: '2025-07-15' }], payrollBefore: [{ id: 5 }], members }, ended(), '2026-10-06', [1])), 'REHIRE_LAST_MONTH_OPEN')
})

test('EU-05: مفيش كاتب لرصيد الإجازات برّه قفل صف الموظف، ومعالجات الطلبات اللي بتحفظ كيان الموظف كله بتقراه بقفل', () => {
  const fs = require('node:fs')
  const read = file => fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8').replace(/\r\n/g, '\n')
  const body = (source, start, end) => { const from = source.indexOf(start); assert.ok(from >= 0, start); const to = source.indexOf(end, from + start.length); assert.ok(to > from, end); return source.slice(from, to) }
  const leaves = read('requests/leave-balances.service.ts')
  // بوابة الفحص بتحسب على صف افتراضي ومابتحفظش؛ وإنشاء الصف الناقص (ensureAt) من مكانين بس، الاتنين على مخزن معاملة ماسكة صف الموظف
  const gate = body(leaves, '  async assertSufficient(', '\n  async adjust(')
  // CRP5D: البوابة بتقرا بمستودع مدير المعاملة لو المنادي بعته (`repo`)، وغير كده المحقون — ولسه مابتحفظش
  assert.ok(gate.includes('await this.entryAt(repo, employeeId, balanceType, segment.start, ctx)') && !gate.includes('ensureAt(') && !/\.save\(/.test(gate))
  assert.ok(!/\.save\(/.test(body(leaves, '  private async entryAt(', '\n  // بوابة الاعتماد تمرر 31 ديسمبر')))
  assert.deepEqual([...leaves.matchAll(/this\.ensureAt\(([^,]+),/g)].map(match => match[1]), ['repo', 'repo'])
  const deduct = body(leaves, '  async deduct(', '\n  // الإرجاع: يعكس بترتيب عكسي')
  assert.ok(deduct.indexOf('await this.lockEmployee(em, employeeId, false)') < deduct.indexOf('await this.ensureAt(repo,') && deduct.indexOf('await this.lockEmployee(em, employeeId, false)') > 0)
  const yearRows = body(leaves, '  private async ensureRowsOf(', '\n  // قبل إقفال سنة')
  assert.ok(yearRows.indexOf('await this.lockEmployee(em, e.id, true)') > 0 && yearRows.indexOf('await this.lockEmployee(em, e.id, true)') < yearRows.indexOf('await this.ensureAt(repo,'))
  // كل حفظ لصف رصيد في الخدمة على مخزن معاملة (مش المخزن المحقون)
  assert.equal(/this\.balances\.save\(/.test(leaves), false)

  // ملف الموظف: أثر التعديل على الرصيد جوه معاملة التعديل (قبل ما ترجع)، وتحت صف الموظف، ومفيش كتابة رصيد بالمخزن المحقون
  const employees = read('employees/employees.service.ts')
  assert.equal(/this\.balances\./.test(employees), false)
  const update = body(employees, '  async update(id: number, dto: UpdateEmployeeDto', '\n  // الأرشفة بدل الحذف')
  const inside = update.slice(0, update.indexOf('      return result\n    })'))
  assert.ok(inside.includes('await this.annualEntitlementIn(em, id, dto.annualLeaveEntitled)') && inside.includes('await this.openingBalanceIn(em, id, openingBalanceDays, openingBalanceExpiry)'))
  assert.equal(/openingBalanceIn|annualEntitlementIn|currentYearBalancesIn/.test(update.slice(update.indexOf('      return result\n    })'))), false)
  for (const name of ['openingBalanceIn', 'annualEntitlementIn', 'currentYearBalancesIn']) {
    const writer = body(employees, `  private async ${name}(`, '\n  }\n')
    assert.ok(writer.includes('await this.lockBalanceOwner(em, employeeId)') && writer.indexOf('await this.lockBalanceOwner(em, employeeId)') < writer.indexOf('em.getRepository(LeaveBalance)'), name)
  }
  assert.ok(body(employees, '  private async lockBalanceOwner(', '\n  }\n').includes('FROM dbo.employees WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0'))

  // معالجات الطلبات: كل قراءة لصاحب الطلب قبل حفظ كيانه كله بقفل الصف
  const destinations = read('requests/destinations.service.ts')
  const reads = [...destinations.matchAll(/findOne\(\{\n\s+where: \{ id: req\.requesterId \},\n([\s\S]*?)\n\s+\}\)/g)].map(match => match[1])
  assert.equal(reads.length, 4)
  for (const options of reads) assert.ok(options.includes("lock: { mode: 'pessimistic_write' },"))
  // وإلغاء ملف الإنهاء بيكتب حالة الموظف بس (مش الكيان كله من قراءة من غير قفل)
  const offboarding = read('offboarding/offboarding.service.ts')
  assert.ok(offboarding.includes("await this.employees.update({ id: emp.id }, { status: 'active', isActive: true })") && !/this\.employees\.save\(/.test(offboarding))
  for (const handler of ['promotionHandler', 'bankChangeHandler', 'employeeStatusHandler']) {
    const source = body(destinations, `  private ${handler}: Handler = async (`, 'await em.getRepository(Employee).save(emp)')
    assert.ok(source.includes("lock: { mode: 'pessimistic_write' },"), handler)
  }
})
