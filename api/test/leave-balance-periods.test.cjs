// أرصدة الإجازات حسب إعداد النوع: الاستحقاق من annualDays، سنة الرصيد (بداية السنة / ذكرى التعيين)،
// والترحيل وسقفه. اختبار بلا قاعدة بيانات: دوال صرفة + الخدمة على مستودعات مزيفة في الذاكرة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const { FindOperator } = require('../node_modules/typeorm')
const p = require('../src/requests/leave-balance-periods')
const { LeaveBalancesService } = require('../src/requests/leave-balances.service')
const { LeaveBalance, LeaveBalanceAdjustment, LeaveType, Leave } = require('../src/requests/entities/leave.entities')
const { RequestsConfig } = require('../src/requests/entities/requests-config.entity')
const { Request } = require('../src/requests/entities/request.entity')
const { Employee } = require('../src/employees/employee.entity')

const window = (e) => [e.key, e.start, e.end]

test('YEAR_START = السنة الميلادية، HIRE_ANNIVERSARY = من ذكرى التعيين حتى اليوم السابق للذكرى التالية', () => {
  assert.equal(p.periodKeyFor('2027-03-01', '2020-05-10', 'YEAR_START'), '2027')
  assert.equal(p.periodKeyFor('2027-03-01', '2020-05-10', 'HIRE_ANNIVERSARY'), '2026-05-10')
  assert.equal(p.periodKeyFor('2027-05-10', '2020-05-10', 'HIRE_ANNIVERSARY'), '2027-05-10')
  // بلا تاريخ تعيين: بداية السنة
  assert.equal(p.periodKeyFor('2027-03-01', null, 'HIRE_ANNIVERSARY'), '2027')
  assert.deepEqual(p.nominalWindow('2027', '2020-05-10'), { start: '2027-01-01', end: '2027-12-31', calendar: true })
  assert.deepEqual(p.nominalWindow('2026-05-10', '2020-05-10'), { start: '2026-05-10', end: '2027-05-09', calendar: false })
  // 29 فبراير: الذكرى 28 فبراير في السنة غير الكبيسة
  assert.equal(p.periodKeyFor('2027-02-28', '2020-02-29', 'HIRE_ANNIVERSARY'), '2027-02-28')
  assert.deepEqual(p.nominalWindow('2027-02-28', '2020-02-29'), { start: '2027-02-28', end: '2028-02-28', calendar: false })
})

test('الصفوف القائمة تبقى صالحة: صف السنة الميلادية كامل وأول سنة ذكرى بعده تبدأ 1 يناير بنسبة أيامها', () => {
  const rows = [{ id: 1, period: '2026' }, { id: 2, period: '2026-05-10' }, { id: 3, period: '2027-05-10' }]
  const tl = p.balanceTimeline(rows, '2020-05-10', 'HIRE_ANNIVERSARY')
  assert.deepEqual(tl.map(window), [
    ['2026', '2026-01-01', '2026-12-31'],
    ['2026-05-10', '2027-01-01', '2027-05-09'],
    ['2027-05-10', '2027-05-10', '2028-05-09'],
  ])
  assert.equal(p.periodAt(tl, '2026-09-16').key, '2026')
  assert.equal(p.periodAt(tl, '2027-02-01').key, '2026-05-10')
  assert.equal(p.periodAt(tl, '2027-06-01').key, '2027-05-10')
  // السنة الانتقالية 129 يومًا من 365
  assert.equal(p.prorate(21, tl[1]), 7.42)
  assert.equal(p.prorate(21, tl[2]), 21)
  assert.equal(p.previousEntry(tl, tl[2]).key, '2026-05-10')
  // صف سنة أنشأته شاشة أخرى بعد صف الذكرى لا يسرق أيامه
  const stray = p.balanceTimeline([{ id: 1, period: '2026-05-10' }, { id: 2, period: '2027' }], '2020-05-10', 'HIRE_ANNIVERSARY')
  assert.deepEqual(stray.map(window), [['2026-05-10', '2026-05-10', '2027-05-09']])
  // والرجوع لبداية السنة: صف الذكرى يكمل مدته وصف السنة يبدأ بعده
  const back = p.balanceTimeline([{ id: 1, period: '2026-05-10' }, { id: 2, period: '2027' }], '2020-05-10', 'YEAR_START')
  assert.deepEqual(back.map(window), [['2026-05-10', '2026-05-10', '2027-05-09'], ['2027', '2027-05-10', '2027-12-31']])
})

test('المتراكم الشهري واليومي على نافذة الذكرى مطابق لحساب السنة الميلادية', () => {
  const [anniv] = p.balanceTimeline([{ id: 1, period: '2026-05-10' }], '2020-05-10', 'HIRE_ANNIVERSARY')
  const base = { balanceType: 'annual', fullYear: 21, entitlement: 21, joinDate: '2020-05-10', probationMonths: 0 }
  assert.equal(p.accruedDays({ ...base, mode: 'monthly', onDate: '2026-09-16', window: anniv }), 7)
  assert.equal(p.accruedDays({ ...base, mode: 'monthly', onDate: '2027-05-09', inclusiveEnd: true, window: anniv }), 21)
  assert.equal(p.accruedDays({ ...base, mode: 'yearly', onDate: '2026-05-10', window: anniv }), 21)
  assert.equal(p.accruedDays({ ...base, mode: 'daily', onDate: '2026-05-10', window: anniv }), 0.06)
  const [cal] = p.balanceTimeline([{ id: 1, period: '2026' }], '2020-05-10', 'YEAR_START')
  assert.equal(p.accruedDays({ ...base, mode: 'monthly', onDate: '2026-09-16', window: cal }), 14)
  // المرضي رصيد سنوي كامل
  assert.equal(p.accruedDays({ ...base, balanceType: 'sick', fullYear: 120, entitlement: 120, mode: 'monthly', onDate: '2026-05-10', window: anniv }), 120)
})

test('الترحيل: مفعّل بسقف، null بلا سقف، معطّل = صفر؛ والصلاحية من بداية السنة الجديدة', () => {
  assert.equal(p.carryOverDays({ carryOverEnabled: true, carryOverMaxDays: 21 }, 30), 21)
  assert.equal(p.carryOverDays({ carryOverEnabled: true, carryOverMaxDays: 21 }, 12.5), 12.5)
  assert.equal(p.carryOverDays({ carryOverEnabled: true, carryOverMaxDays: null }, 30), 30)
  assert.equal(p.carryOverDays({ carryOverEnabled: false, carryOverMaxDays: 21 }, 30), 0)
  assert.equal(p.carryOverDays({ carryOverEnabled: true, carryOverMaxDays: 21 }, -4), 0)
  assert.equal(p.carryOverExpiry('2027-01-01', 3), '2027-03-31')
  assert.equal(p.carryOverExpiry('2027-05-10', 3), '2027-08-09')
})

test('إعداد النوع: ANNUAL بالكود قبل أنواع فئة السنوية الأخرى، والأيام الفارغة ترجع للإعداد العام', () => {
  const globals = { annual: 21, sick: 180, carryOverMaxDays: 10 }
  const types = [
    { id: 3, code: 'CASUAL', category: 'ANNUAL', balanceType: 'annual', annualDays: null, renewalBasis: 'YEAR_START', carryOverEnabled: false, carryOverMaxDays: null },
    { id: 1, code: 'ANNUAL', category: 'ANNUAL', balanceType: 'annual', annualDays: '30.00', renewalBasis: 'HIRE_ANNIVERSARY', carryOverEnabled: true, carryOverMaxDays: null },
    { id: 2, code: 'SICK', category: 'SICK', balanceType: 'sick', annualDays: null, renewalBasis: 'YEAR_START', carryOverEnabled: false, carryOverMaxDays: null },
  ]
  assert.deepEqual(p.balanceTypeSettings(types, 'annual', globals), { annualDays: 30, renewalBasis: 'HIRE_ANNIVERSARY', carryOverEnabled: true, carryOverMaxDays: null })
  assert.deepEqual(p.balanceTypeSettings(types, 'sick', globals), { annualDays: 180, renewalBasis: 'YEAR_START', carryOverEnabled: false, carryOverMaxDays: null })
  // بلا أنواع: السلوك القديم بالكامل
  assert.deepEqual(p.balanceTypeSettings([], 'annual', globals), { annualDays: 21, renewalBasis: 'YEAR_START', carryOverEnabled: true, carryOverMaxDays: 10 })
})

// ===== الخدمة على مستودعات مزيفة =====
function matchValue(value, cond) {
  if (cond instanceof FindOperator) {
    if (cond.type === 'in') return cond.value.includes(value)
    if (cond.type === 'like') return new RegExp('^' + String(cond.value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$').test(String(value))
    if (cond.type === 'not') return !matchValue(value, cond.child ?? cond.value)
    throw new Error('unsupported operator ' + cond.type)
  }
  return value === cond
}
const matches = (row, where) => !where ? true : Array.isArray(where) ? where.some((w) => matches(row, w)) : Object.entries(where).every(([k, v]) => matchValue(row[k], v))

function fakeDb(seed) {
  const tables = new Map()
  const unique = { LeaveBalance: ['employeeId', 'balanceType', 'period'] }
  let nextId = 1000
  const repoFor = (Entity) => {
    if (!tables.has(Entity)) tables.set(Entity, [])
    const rows = tables.get(Entity)
    const repo = {
      manager: null,
      create: (o) => Object.assign(Object.create(Entity.prototype), o),
      find: async (opts = {}) => rows.filter((r) => matches(r, opts.where)),
      findOne: async (opts = {}) => rows.find((r) => matches(r, opts.where)) ?? null,
      findOneBy: async (where) => rows.find((r) => matches(r, where)) ?? null,
      findOneOrFail: async (opts) => { const r = rows.find((x) => matches(x, opts.where)); if (!r) throw new Error('not found'); return r },
      save: async (o) => {
        if (o.id == null || !rows.includes(o)) {
          const keys = unique[Entity.name]
          if (o.id == null && keys && rows.some((r) => keys.every((k) => r[k] === o[k]))) throw new Error('UNIQUE violation')
          if (o.id == null) o.id = nextId++
          if (!rows.includes(o)) rows.push(o)
        }
        return o
      },
    }
    return repo
  }
  const repos = new Map()
  const manager = {
    getRepository: (E) => { if (!repos.has(E)) { const r = repoFor(E); r.manager = manager; repos.set(E, r) } return repos.get(E) },
    transaction: async (fn) => fn(manager),
  }
  for (const [E, list] of seed) for (const row of list) tables.set(E, [...(tables.get(E) ?? []), Object.assign(Object.create(E.prototype), row)])
  const service = new LeaveBalancesService(manager.getRepository(LeaveBalance), manager.getRepository(Employee), manager.getRepository(RequestsConfig))
  return { manager, service, rows: (E) => tables.get(E) ?? [] }
}

const leaveTypes = (annual, sick) => [
  { id: 1, code: 'ANNUAL', category: 'ANNUAL', balanceType: 'annual', isActive: true, annualDays: 21, renewalBasis: 'YEAR_START', carryOverEnabled: true, carryOverMaxDays: 21, ...annual },
  { id: 2, code: 'SICK', category: 'SICK', balanceType: 'sick', isActive: true, annualDays: 120, renewalBasis: 'YEAR_START', carryOverEnabled: false, carryOverMaxDays: null, ...sick },
  { id: 3, code: 'CASUAL', category: 'ANNUAL', balanceType: 'annual', isActive: true, annualDays: null, renewalBasis: 'YEAR_START', carryOverEnabled: false, carryOverMaxDays: null },
]
const config = (extra = {}) => Object.entries({ 'leave.accrual_mode': 'yearly', 'leave.annual_entitled': '15', 'leave.sick_entitled': '180', 'leave.carryover_max_days': '10', 'leave.carryover_expiry_months': '3', ...extra }).map(([key, value]) => ({ key, value }))
const bal = (o) => ({ taken: 0, openingDays: 0, openingTaken: 0, openingExpiry: null, adjustmentDays: 0, ...o })
const findBal = (db, employeeId, balanceType, period) => db.rows(LeaveBalance).find((r) => r.employeeId === employeeId && r.balanceType === balanceType && r.period === period)

test('YEAR_START: الاستحقاق من annualDays والترحيل عند التجديد بسقف النوع، والمرضي المعطّل لا يترحّل', async () => {
  const db = fakeDb([
    [LeaveType, leaveTypes()],
    [RequestsConfig, config()],
    [Employee, [{ id: 1, joinDate: '2020-05-10', annualLeaveEntitled: true, status: 'active' }]],
    [LeaveBalance, [
      bal({ id: 1, employeeId: 1, balanceType: 'annual', period: '2040', entitled: 21, openingDays: 15, openingExpiry: null }),
      bal({ id: 2, employeeId: 1, balanceType: 'sick', period: '2040', entitled: 120, taken: 20 }),
    ]],
  ])
  const annual = await db.service.balanceOf(1, 'annual', '2040-06-01')
  assert.deepEqual([annual.period, annual.periodStart, annual.periodEnd, annual.annualEntitlement, annual.remaining], ['2040', '2040-01-01', '2040-12-31', 21, 36])
  assert.equal((await db.service.balanceOf(1, 'sick', '2040-06-01')).remaining, 100)
  const result = await db.service.rollover('2040')
  assert.equal(result.maxCarry, 21)
  const next = findBal(db, 1, 'annual', '2041')
  assert.deepEqual([Number(next.entitled), next.openingDays, next.openingExpiry], [21, 21, '2041-03-31'], '36 متبقي → 21 سقف النوع')
  const sick = findBal(db, 1, 'sick', '2041')
  assert.deepEqual([Number(sick.entitled), sick.openingDays, sick.openingExpiry ?? null], [120, 0, null])

  // بلا سقف: كل المتبقي؛ والمعطّل: لا شيء
  const noCap = fakeDb([[LeaveType, leaveTypes({ carryOverMaxDays: null })], [RequestsConfig, config()], [Employee, [{ id: 1, joinDate: '2020-05-10', status: 'active' }]],
    [LeaveBalance, [bal({ id: 1, employeeId: 1, balanceType: 'annual', period: '2040', entitled: 21, openingDays: 15 })]]])
  await noCap.service.rollover('2040')
  assert.equal(findBal(noCap, 1, 'annual', '2041').openingDays, 36)
  const off = fakeDb([[LeaveType, leaveTypes({ carryOverEnabled: false })], [RequestsConfig, config()], [Employee, [{ id: 1, joinDate: '2020-05-10', status: 'active' }]],
    [LeaveBalance, [bal({ id: 1, employeeId: 1, balanceType: 'annual', period: '2040', entitled: 21, openingDays: 15 })]]])
  const offResult = await off.service.rollover('2040')
  assert.equal(offResult.maxCarry, 0)
  assert.equal(findBal(off, 1, 'annual', '2041').openingDays, 0)
})

test('HIRE_ANNIVERSARY: السنة تتجدد في ذكرى التعيين مع ترحيل بالسقف مرة واحدة، والخصم على سنة الرصيد الصحيحة', async () => {
  const db = fakeDb([
    [LeaveType, leaveTypes({ renewalBasis: 'HIRE_ANNIVERSARY', carryOverMaxDays: 5 }, { renewalBasis: 'HIRE_ANNIVERSARY' })],
    [RequestsConfig, config()],
    [Employee, [
      { id: 1, joinDate: '2020-05-10', annualLeaveEntitled: true, status: 'active' },
      { id: 2, joinDate: '2021-02-01', annualLeaveEntitled: true, status: 'active' },
    ]],
    [LeaveBalance, [
      bal({ id: 1, employeeId: 1, balanceType: 'annual', period: '2039-05-10', entitled: 21, taken: 3 }),
      bal({ id: 2, employeeId: 1, balanceType: 'sick', period: '2039-05-10', entitled: 120, taken: 10 }),
    ]],
  ])
  const before = await db.service.balanceOf(1, 'annual', '2040-05-09')
  assert.deepEqual([before.period, before.periodStart, before.periodEnd, before.remaining], ['2039-05-10', '2039-05-10', '2040-05-09', 18])
  // يوم قبل الذكرى: لا تجديد
  assert.deepEqual(await db.service.renewBalancePeriods('2040-05-09'), { created: 2, carried: 0, synced: 0 }, 'الموظف 2 بلا صفوف: سنة ذكراه الجارية تتعمل')
  assert.equal(findBal(db, 1, 'annual', '2040-05-10'), undefined)
  const renewed = await db.service.renewBalancePeriods('2040-05-10')
  assert.deepEqual([renewed.created, renewed.carried], [2, 1])
  const annual = findBal(db, 1, 'annual', '2040-05-10')
  assert.deepEqual([annual.entitled, annual.openingDays, annual.openingExpiry], [21, 5, '2040-08-09'], '18 متبقي → 5 سقف النوع')
  const sick = findBal(db, 1, 'sick', '2040-05-10')
  assert.deepEqual([sick.entitled, sick.openingDays], [120, 0], 'المرضي: ترحيل معطّل و120 يوم من النوع')
  // مرة واحدة فقط
  assert.deepEqual(await db.service.renewBalancePeriods('2040-05-11'), { created: 0, carried: 0, synced: 0 })
  assert.equal(findBal(db, 1, 'annual', '2040-05-10').openingDays, 5)

  // إجازة داخل صلاحية المُرحّل تستهلكه أولًا
  await db.service.deduct(db.manager, 1, 'annual', 3, '2040-06-01')
  assert.deepEqual([annual.taken, annual.openingTaken], [3, 3])
  // إجازة تعدّي 31 ديسمبر: الجزءان على نفس سنة الذكرى (2040-05-10) لا على صف 2041
  await db.service.assertSufficient(1, 'annual', 3, '2040-12-28')
  await db.service.assertSufficient(1, 'annual', 2, '2041-12-31')
  await db.service.deduct(db.manager, 1, 'annual', 3, '2040-12-28', '2040-12-28')
  await db.service.deduct(db.manager, 1, 'annual', 2, '2041-12-31', '2041-01-01')
  assert.equal(findBal(db, 1, 'annual', '2041'), undefined)
  assert.deepEqual([annual.taken, annual.openingTaken], [8, 3])
  // المُرحّل انتهى 2040-08-09: المتبقي 21 − 5
  assert.equal((await db.service.balanceOf(1, 'annual', '2041-01-02')).remaining, 16)
  await assert.rejects(db.service.assertSufficient(1, 'annual', 17, '2041-02-01'), /الرصيد غير كافٍ/)
  // الإلغاء يرجع لنفس سنة الذكرى
  await db.service.restoreLeave(db.manager, { employeeId: 1, fromDate: '2040-12-28', days: 5, requestId: null }, 'annual')
  assert.deepEqual([annual.taken, annual.openingTaken], [3, 3])
})

test('التحوّل من بداية السنة إلى الذكرى: صف 2040 يبقى كما هو، والترحيل السنوي ينشئ سنة انتقالية حتى الذكرى', async () => {
  const db = fakeDb([
    [LeaveType, leaveTypes({ renewalBasis: 'HIRE_ANNIVERSARY' })],
    [RequestsConfig, config()],
    [Employee, [{ id: 1, joinDate: '2020-05-10', annualLeaveEntitled: true, status: 'active' }]],
    [LeaveBalance, [
      bal({ id: 1, employeeId: 1, balanceType: 'annual', period: '2040', entitled: 21, taken: 1 }),
      bal({ id: 2, employeeId: 1, balanceType: 'sick', period: '2040', entitled: 120 }),
    ]],
  ])
  const current = await db.service.balanceOf(1, 'annual', '2040-09-16')
  assert.deepEqual([current.period, current.periodStart, current.periodEnd, current.remaining], ['2040', '2040-01-01', '2040-12-31', 20])
  const result = await db.service.rollover('2040')
  assert.equal(result.ensured, 1, 'المرضي: صف سنته الانتقالية')
  const stub = findBal(db, 1, 'annual', '2040-05-10')
  assert.deepEqual([stub.openingDays, stub.openingExpiry], [20, '2041-03-31'])
  const view = await db.service.balanceOf(1, 'annual', '2041-02-01')
  assert.deepEqual([view.period, view.periodStart, view.periodEnd, view.annualEntitlement, view.remaining], ['2040-05-10', '2041-01-01', '2041-05-09', 7.42, 27.42])
  assert.equal((await db.service.balanceOf(1, 'annual', '2040-12-31')).period, '2040')
  // وفي الذكرى: سنة كاملة بترحيل من الانتقالية
  await db.service.renewBalancePeriods('2041-05-10')
  const full = findBal(db, 1, 'annual', '2041-05-10')
  // مُرحّل 2040 انتهى 31 مارس، فالمتبقي من الانتقالية 7.42 فقط
  assert.deepEqual([full.entitled, full.openingDays, full.openingExpiry], [21, 7.42, '2041-08-09'])
})
