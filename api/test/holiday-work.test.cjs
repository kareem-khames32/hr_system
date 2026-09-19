// «بدل دوام أيام العطلات» — معادلة المبلغ، واستحقاق اليوم، ومطابقة الأمر، وقراءة الأيام والمضاعف، بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const hw = require('../src/attendance/holiday-work')

const basis = (overrides = {}) => ({ grossMonthly: 9000, monthlyDays: 30, dailyHours: 8, ...overrides })
const day = (overrides = {}) => ({ status: 'holiday', checkIn: '08:00', checkOut: '14:30', workMinutes: 390, ...overrides })
const result = (overrides = {}) => hw.holidayWorkDayResult({ date: '2026-07-10', today: '2026-07-20', day: day(), unpaidBreakMinutes: 0, maxSessionMinutes: 900, ...overrides })
const grant = (overrides = {}) => ({ id: 1, kind: 'ORDER', name: 'جمعة الجرد', targetLevel: 'company', branchId: null, targetIds: [], dates: ['2026-07-10'],
  multiplier: 1.5, sourceRequestId: null, ...overrides })
const org = (overrides = {}) => ({ employeeId: 10, branchId: 1, departmentId: 5, teamId: 7, ...overrides })

test('المبلغ = الساعات × (الإجمالي ÷ 30 ÷ ساعات اليوم) × المضاعف، مقصوص لقرشين (مش مقرّب)', () => {
  // 9000 ÷ 30 ÷ 8 = 37.5 للساعة؛ 6.5 ساعة × 37.5 × 1.5 = 365.625 → 365.62
  assert.equal(hw.holidayWorkHourlyRate(basis()), 37.5)
  assert.equal(hw.holidayWorkAmount(basis(), 390, 1.5), 365.62)
  assert.equal(hw.holidayWorkAmount(basis(), 240, 1.5), 225)
  assert.equal(hw.holidayWorkAmount(basis(), 60, 2), 75)
  // 7000 ÷ 30 ÷ 8 = 29.1666…؛ 5 ساعات × 1.25 = 182.2916… → 182.29 (قص مش تقريب لـ182.30)
  assert.equal(hw.holidayWorkAmount(basis({ grossMonthly: 7000 }), 300, 1.25), 182.29)
  // ساعات اليوم من إعداد المسير (نفس أساس الإضافي): 9 ساعات بدل 8
  assert.equal(hw.holidayWorkAmount(basis({ dailyHours: 9 }), 540, 1), 300)
  assert.equal(hw.holidayWorkAmount(basis({ grossMonthly: 0 }), 390, 1.5), 0)
  assert.throws(() => hw.holidayWorkAmount(basis({ monthlyDays: 0 }), 60, 1), /أساس سعر ساعة/)
  assert.throws(() => hw.holidayWorkAmount(basis(), -1, 1), /أساس سعر ساعة/)
})

test('الاستحقاق: يوم عطلة ببصمة دخول وخروج بس — والساعات ناقص الاستراحة غير المدفوعة', () => {
  assert.deepEqual(result(), { eligible: true, minutes: 390, rawMinutes: 390 })
  assert.deepEqual(result({ unpaidBreakMinutes: 30 }), { eligible: true, minutes: 360, rawMinutes: 390 })
  const skip = overrides => { const r = result(overrides); assert.equal(r.eligible, false); return r.code }
  // اللي ماجاش: لا بدل ولا خصم
  assert.equal(skip({ day: null }), 'NO_PUNCH')
  assert.equal(skip({ day: day({ checkIn: null, checkOut: null, workMinutes: 0 }) }), 'NO_PUNCH')
  // اليوم مش عطلة للموظف (فرع تاني ويك إنده مختلف): دوام عادي بقواعده
  assert.equal(skip({ day: day({ status: 'present' }) }), 'NOT_HOLIDAY')
  assert.equal(skip({ day: day({ checkOut: null }) }), 'MISSING_PUNCH')
  assert.equal(skip({ date: '2026-07-25' }), 'FUTURE_DATE')
  assert.equal(skip({ suspended: true }), 'SUSPENDED')
  assert.equal(skip({ day: day({ workMinutes: 901 }) }), 'SESSION_TOO_LONG')
  assert.equal(skip({ unpaidBreakMinutes: 390 }), 'NO_WORK')
  // يوم له إضافي معتمد: ما يتصرفش مرتين
  assert.equal(skip({ approvedOvertime: true }), 'OVERTIME_APPROVED')
  assert.match(hw.HOLIDAY_WORK_SKIP_LABELS.NO_PUNCH, /ماجاش/)
})

test('مطابقة الأمر: الشركة، الفرع، أقسام وفرق جوه الفرع، والموظفين بالاسم', () => {
  assert.equal(hw.holidayWorkGrantMatches(grant(), org()), true)
  assert.equal(hw.holidayWorkGrantMatches(grant({ targetLevel: 'branch', branchId: 1 }), org()), true)
  assert.equal(hw.holidayWorkGrantMatches(grant({ targetLevel: 'branch', branchId: 2 }), org()), false)
  assert.equal(hw.holidayWorkGrantMatches(grant({ targetLevel: 'departments', branchId: 1, targetIds: [5] }), org()), true)
  assert.equal(hw.holidayWorkGrantMatches(grant({ targetLevel: 'departments', branchId: 1, targetIds: [5] }), org({ branchId: 2 })), false)
  assert.equal(hw.holidayWorkGrantMatches(grant({ targetLevel: 'teams', branchId: 1, targetIds: [8] }), org()), false)
  assert.equal(hw.holidayWorkGrantMatches(grant({ targetLevel: 'employees', branchId: 1, targetIds: [10] }), org({ branchId: 3 })), true)
  assert.equal(hw.holidayWorkGrantMatches(grant({ targetLevel: 'employees', branchId: 1, targetIds: [11] }), org()), false)
})

test('الإضافي والبدل ما يجتمعوش: يوم العطلة المغطى بأمر/طلب للموظف بيرفض الإضافي، ويوم العمل العادي للموظف لأ', () => {
  const grants = [grant({ id: 1, targetLevel: 'departments', branchId: 1, targetIds: [5], dates: ['2026-07-10'] }),
    grant({ id: 2, kind: 'REQUEST', targetLevel: 'employees', branchId: 1, targetIds: [11], dates: ['2026-07-11'], sourceRequestId: 9 })]
  // عطلة للموظف (أو تقويم مش مثبت) وعليها أمر قسمه / طلبه المعتمد
  assert.equal(hw.holidayWorkCoversOvertimeDay(grants, org(), '2026-07-10', false), true)
  assert.equal(hw.holidayWorkCoversOvertimeDay(grants, org(), '2026-07-10', null), true)
  assert.equal(hw.holidayWorkCoversOvertimeDay(grants, org({ employeeId: 11, departmentId: 6 }), '2026-07-11', false), true)
  // أمر شركة/فرع وفرع الموظف شغال اليوم ده: دوام عادي والإضافي بقواعده
  assert.equal(hw.holidayWorkCoversOvertimeDay(grants, org(), '2026-07-10', true), false)
  // مش مستهدف، أو يوم تاني
  assert.equal(hw.holidayWorkCoversOvertimeDay(grants, org({ departmentId: 6 }), '2026-07-10', false), false)
  assert.equal(hw.holidayWorkCoversOvertimeDay(grants, org(), '2026-07-11', false), false)
  assert.equal(hw.holidayWorkCoversOvertimeDay([], org(), '2026-07-10', false), false)
  assert.equal(hw.HOLIDAY_WORK_OVERTIME_REFUSAL, 'اليوم ده متغطي بأمر/طلب دوام يوم عطلة وبيتحسب «بدل دوام أيام العطلات» مش إضافي')
  // والعكس: يوم له إضافي معتمد/مصروف بيتخطى في البدل
  assert.equal(result({ approvedOvertime: true }).code, 'OVERTIME_APPROVED')
})

test('يوم عليه أكتر من أمر/طلب بيتحسب مرة واحدة بأعلى مضاعف ثم الأقدم، وجوه المدى بس', () => {
  const grants = [grant({ id: 3, multiplier: 1.5, dates: ['2026-07-10', '2026-07-11'] }), grant({ id: 2, multiplier: 2, dates: ['2026-07-11'] }),
    grant({ id: 1, multiplier: 1.5, dates: ['2026-07-10'] }), grant({ id: 4, multiplier: 3, targetLevel: 'branch', branchId: 9, dates: ['2026-07-10'] })]
  const byDate = hw.holidayWorkGrantsByDate(grants, org(), '2026-07-01', '2026-07-10')
  assert.deepEqual([...byDate.entries()].map(([date, g]) => [date, g.id]), [['2026-07-10', 1]])
  const wide = hw.holidayWorkGrantsByDate(grants, org(), '2026-07-01', '2026-07-31')
  assert.equal(wide.get('2026-07-11').id, 2)
})

test('أيام الطلب: مصفوفة أو نص مفصول بفواصل عربية/إنجليزية، مرتبة بلا تكرار، والطلب ما يسبقش النهارده', () => {
  assert.deepEqual(hw.parseHolidayWorkDates('2026-07-11، 2026-07-10,2026-07-10'), ['2026-07-10', '2026-07-11'])
  assert.deepEqual(hw.parseHolidayWorkDates(['2026-07-11', '2026-07-10']), ['2026-07-10', '2026-07-11'])
  assert.throws(() => hw.parseHolidayWorkDates(''), /يوم عطلة واحد على الأقل/)
  assert.throws(() => hw.parseHolidayWorkDates('2026-02-30'), /مش تاريخ صحيح/)
  assert.throws(() => hw.parseHolidayWorkDates('10/07/2026'), /YYYY-MM-DD/)
  assert.throws(() => hw.parseHolidayWorkDates('2026-07-30', { notAfter: '2026-07-20' }), /لسه ماجاش/)
  assert.throws(() => hw.parseHolidayWorkDates(Array.from({ length: 63 }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10))), /62/)
})

test('المضاعف: من 0.01 لـ 99.99 بمنزلتين بالكتير', () => {
  assert.equal(hw.parseHolidayWorkMultiplier('1.5'), 1.5)
  assert.equal(hw.parseHolidayWorkMultiplier(2), 2)
  for (const bad of ['', '0', '-1', '100', '1.255', 'abc', null]) assert.throws(() => hw.parseHolidayWorkMultiplier(bad), /المضاعف/)
})

test('مرجع القيد في الدفتر وبيانه: الأمر واليوم، والبيان بالساعات والمضاعف', () => {
  assert.equal(hw.holidayWorkSourceRef(12, '2026-07-10'), 'holiday_work:12:2026-07-10')
  assert.deepEqual(hw.parseHolidayWorkSourceRef('holiday_work:12:2026-07-10'), { grantId: 12, date: '2026-07-10' })
  assert.equal(hw.parseHolidayWorkSourceRef('asset:37'), null)
  assert.equal(hw.holidayWorkLabel(grant(), '2026-07-10', 390), 'بدل دوام أيام العطلات — 2026-07-10: 6.5 ساعة × 1.5 (أمر «جمعة الجرد»)')
  assert.match(hw.holidayWorkLabel(grant({ kind: 'REQUEST', sourceRequestId: 44 }), '2026-07-11', 240), /طلب #44/)
})
