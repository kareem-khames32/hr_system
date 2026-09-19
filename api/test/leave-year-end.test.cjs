// إقفال سنة الإجازات: حساب المُرحّل واللي يسقط والتسوية، وبداية استحقاق السنوي للموظف الجديد
// (بعد كام شهر من التعيين وأول سنة بالنسبة ولا كاملة). اختبار بلا قاعدة بيانات: دوال صرفة + خدمة
// الأرصدة على مستودعات مزيفة في الذاكرة (نفس أسلوب leave-balance-periods.test.cjs).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const { FindOperator } = require('../node_modules/typeorm')
const p = require('../src/requests/leave-balance-periods')
const m = require('../src/requests/leave-year-end.math')
const { LeaveBalancesService } = require('../src/requests/leave-balances.service')
const { LeaveBalance, LeaveType } = require('../src/requests/entities/leave.entities')
const { RequestsConfig } = require('../src/requests/entities/requests-config.entity')
const { Employee } = require('../src/employees/employee.entity')

test('الترحيل واللي يسقط: لحد سقف النوع والباقي يسقط؛ بعد الإقفال اللي يتسوّى هو اللي سقط بس', () => {
  const cap10 = { carryOverEnabled: true, carryOverMaxDays: 10 }
  assert.deepEqual(m.yearEndSplit(16, cap10), { carried: 10, lapsed: 6, settleable: 16, pendingCarry: true })
  // اتقفلت: المُرحّل الفعلي 10 بقى في السنة الجديدة
  assert.deepEqual(m.yearEndSplit(16, cap10, 10), { carried: 10, lapsed: 6, settleable: 6, pendingCarry: false })
  // تحت السقف: كله يترحّل ومفيش حاجة تسقط
  assert.deepEqual(m.yearEndSplit(7.5, cap10), { carried: 7.5, lapsed: 0, settleable: 7.5, pendingCarry: true })
  // بلا سقف / الترحيل مقفول / بعد التسوية
  assert.deepEqual(m.yearEndSplit(30, { carryOverEnabled: true, carryOverMaxDays: null }), { carried: 30, lapsed: 0, settleable: 30, pendingCarry: true })
  assert.deepEqual(m.yearEndSplit(16, { carryOverEnabled: false, carryOverMaxDays: 10 }), { carried: 0, lapsed: 16, settleable: 16, pendingCarry: false })
  assert.deepEqual(m.yearEndSplit(0, cap10), { carried: 0, lapsed: 0, settleable: 0, pendingCarry: false })
  assert.deepEqual(m.yearEndSplit(-3, cap10), { carried: 0, lapsed: 0, settleable: 0, pendingCarry: false })
})

test('بدل الأيام: الراتب الشامل ÷ 30 × الأيام، مقصوص لقرشين من الراتب مباشرة', () => {
  assert.deepEqual(m.leaveSettlementAmount(7.5, 10000), { dailyRate: 333.33, amount: 2500 })
  assert.deepEqual(m.leaveSettlementAmount(3, 1000.01), { dailyRate: 33.33, amount: 100 })
  assert.deepEqual(m.leaveSettlementAmount(1, 100), { dailyRate: 3.33, amount: 3.33 })
  assert.deepEqual(m.leaveSettlementAmount(2.5, 7777.77), { dailyRate: 259.25, amount: 648.14 })
  assert.deepEqual(m.leaveSettlementAmount(0, 5000), { dailyRate: 0, amount: 0 })
  assert.deepEqual(m.leaveSettlementAmount(3, 0), { dailyRate: 0, amount: 0 })
})

test('بداية الاستحقاق وأول سنة: قبل يوم الاستحقاق صفر، وأول سنة بالنسبة من يومه أو كاملة', () => {
  const [w26] = p.balanceTimeline([{ id: 1, period: '2026' }], null, 'YEAR_START')
  const [w27] = p.balanceTimeline([{ id: 1, period: '2027' }], null, 'YEAR_START')
  const a = (o) => p.accruedDays({ balanceType: 'annual', fullYear: 21, entitlement: 21, probationMonths: 0, ...o })
  assert.equal(p.entitlementEligibleDate('2026-03-01', 6), '2026-09-01')
  assert.equal(p.entitlementEligibleDate('2026-03-01', 0), '2026-03-01')
  assert.equal(p.entitlementEligibleDate(null, 6), null)
  // سنوي، من يوم التعيين: بالنسبة = 21 × 306 يوم ÷ 365، وكاملة = 21 (السلوك القديم)
  assert.equal(a({ mode: 'yearly', joinDate: '2026-03-01', onDate: '2026-06-01', window: w26 }), 17.61)
  assert.equal(a({ mode: 'yearly', joinDate: '2026-03-01', prorateFirstYear: false, onDate: '2026-06-01', window: w26 }), 21)
  // بعد 6 شهور: قبلها صفر، وفي يومها بالنسبة (122 يوم) أو كاملة
  assert.equal(a({ mode: 'yearly', joinDate: '2026-03-01', probationMonths: 6, onDate: '2026-08-31', window: w26 }), 0)
  assert.equal(a({ mode: 'yearly', joinDate: '2026-03-01', probationMonths: 6, onDate: '2026-09-01', window: w26 }), 7.02)
  assert.equal(a({ mode: 'yearly', joinDate: '2026-03-01', probationMonths: 6, prorateFirstYear: false, onDate: '2026-09-01', window: w26 }), 21)
  // الاستحقاق في السنة اللي بعدها: سنة التعيين صفر لآخرها، وأول سنة يستحق فيها بالنسبة أو كاملة
  assert.equal(a({ mode: 'yearly', joinDate: '2026-09-01', probationMonths: 6, onDate: '2026-12-31', inclusiveEnd: true, window: w26 }), 0)
  assert.equal(a({ mode: 'yearly', joinDate: '2026-09-01', probationMonths: 6, onDate: '2027-12-31', window: w27 }), 17.61)
  assert.equal(a({ mode: 'yearly', joinDate: '2026-09-01', probationMonths: 6, prorateFirstYear: false, onDate: '2027-03-01', window: w27 }), 21)
  // شهري: بالنسبة = الشهور من يوم الاستحقاق؛ كاملة = شهور ما قبل الاستحقاق تتحسب لما يستحق
  assert.equal(a({ mode: 'monthly', joinDate: '2026-01-01', probationMonths: 6, onDate: '2026-07-01', window: w26 }), 0)
  assert.equal(a({ mode: 'monthly', joinDate: '2026-01-01', probationMonths: 6, onDate: '2026-12-31', inclusiveEnd: true, window: w26 }), 10.5)
  assert.equal(a({ mode: 'monthly', joinDate: '2026-01-01', probationMonths: 6, prorateFirstYear: false, onDate: '2026-06-30', window: w26 }), 0)
  assert.equal(a({ mode: 'monthly', joinDate: '2026-01-01', probationMonths: 6, prorateFirstYear: false, onDate: '2026-07-01', window: w26 }), 10.5)
  assert.equal(a({ mode: 'monthly', joinDate: '2026-01-01', probationMonths: 6, prorateFirstYear: false, onDate: '2026-12-31', inclusiveEnd: true, window: w26 }), 21)
  // موظف قديم: زي ما هو
  assert.equal(a({ mode: 'monthly', joinDate: '2020-05-10', onDate: '2026-09-16', window: w26 }), 14)
  assert.equal(a({ mode: 'yearly', joinDate: '2020-05-10', onDate: '2026-01-01', window: w26 }), 21)
  // المرضي مالوش بوابة
  assert.equal(a({ balanceType: 'sick', fullYear: 120, entitlement: 120, mode: 'yearly', joinDate: '2026-03-01', probationMonths: 6, onDate: '2026-04-01', window: w26 }), 120)
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
    return {
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

const annualType = (o = {}) => ({ id: 1, code: 'ANNUAL', category: 'ANNUAL', balanceType: 'annual', isActive: true, annualDays: 21, renewalBasis: 'YEAR_START',
  carryOverEnabled: true, carryOverMaxDays: 10, entitlementStartMonths: null, firstYearProrated: true, ...o })
const sickType = { id: 2, code: 'SICK', category: 'SICK', balanceType: 'sick', isActive: true, annualDays: 120, renewalBasis: 'YEAR_START', carryOverEnabled: false, carryOverMaxDays: null }
const config = (extra = {}) => Object.entries({ 'leave.accrual_mode': 'yearly', 'leave.annual_entitled': '21', 'leave.sick_entitled': '120',
  'leave.carryover_max_days': '10', 'leave.carryover_expiry_months': '3', 'leave.probation_months': '0', ...extra }).map(([key, value]) => ({ key, value }))
const bal = (o) => ({ taken: 0, openingDays: 0, openingTaken: 0, openingExpiry: null, adjustmentDays: 0, settledDays: 0, ...o })
const emp = (o) => ({ fullName: 'E' + o.id, employeeCode: 'C' + o.id, branchId: 1, departmentId: 1, annualLeaveEntitled: true, status: 'active', ...o })
const findBal = (db, employeeId, period) => db.rows(LeaveBalance).find((r) => r.employeeId === employeeId && r.balanceType === 'annual' && r.period === period)
const TODAY = '2041-01-10'

function seedYear(typeOverrides) {
  return fakeDb([
    [LeaveType, [annualType(typeOverrides), sickType]],
    [RequestsConfig, config()],
    [Employee, [
      emp({ id: 1, joinDate: '2030-01-01' }),
      // بلا أي صف: اتعيّن نص السنة وماخدش إجازة — كان متبقيه بيضيع من الترحيل
      emp({ id: 2, joinDate: '2040-07-01' }),
      emp({ id: 3, joinDate: '2030-01-01', status: 'terminated' }),
      // اتعيّن بعد السنة: مالوش سنة رصيد فيها
      emp({ id: 4, joinDate: '2041-01-05' }),
      emp({ id: 5, joinDate: '2030-01-01', branchId: 2 }),
    ]],
    [LeaveBalance, [
      bal({ id: 1, employeeId: 1, balanceType: 'annual', period: '2040', entitled: 21, taken: 5 }),
      bal({ id: 3, employeeId: 3, balanceType: 'annual', period: '2040', entitled: 21 }),
      bal({ id: 5, employeeId: 5, balanceType: 'annual', period: '2040', entitled: 21, taken: 1 }),
    ]],
  ])
}

test('المعاينة: المستحق والمستخدم والمتبقي واللي يترحّل واللي يسقط لكل موظف في النطاق، والإقفال يرحّل ويكمّل الناقص ومايتكررش', async () => {
  const db = seedYear()
  const before = await db.service.yearEndPreview('2040', null, TODAY)
  const by = (preview, id) => preview.rows.find((r) => r.employee.id === id)
  assert.deepEqual(before.rows.map((r) => r.employee.id), [1, 2, 5], 'المنتهية خدمته واللي اتعيّن بعد السنة برّه')
  const one = by(before, 1)
  assert.deepEqual([one.period, one.entitledTotal, one.used, one.remaining, one.carried, one.lapsed, one.settleable, one.closed], ['2040', 21, 5, 16, 10, 6, 16, false])
  // من غير صف: صف افتراضي، 21 × 184 ÷ 366 يوم (أول سنة بالنسبة)
  const two = by(before, 2)
  assert.deepEqual([two.period, two.entitledTotal, two.remaining, two.carried, two.lapsed, two.eligibleFrom], ['2040', 10.56, 10.56, 10, 0.56, '2040-07-01'])
  // الفرع
  assert.deepEqual((await db.service.yearEndPreview('2040', 2, TODAY)).rows.map((r) => r.employee.id), [5])

  // إقفال فرع 1 بس
  const closed = await db.service.closeYear('2040', 1)
  assert.equal(closed.closingEnsured, 1, 'صف 2040 للموظف 2 اتعمل عشان متبقيه يترحّل')
  assert.deepEqual([findBal(db, 1, '2041').openingDays, findBal(db, 1, '2041').openingExpiry], [10, '2041-03-31'])
  assert.equal(findBal(db, 2, '2041').openingDays, 10)
  assert.equal(findBal(db, 5, '2041'), undefined, 'فرع تاني ماتلمسش')
  const after = await db.service.yearEndPreview('2040', 1, TODAY)
  assert.deepEqual([by(after, 1).closed, by(after, 1).carried, by(after, 1).lapsed, by(after, 1).settleable], [true, 10, 6, 6])
  // تكرار الإقفال: مفيش ترحيل تاني
  const again = await db.service.closeYear('2040', 1)
  assert.deepEqual([again.created, again.closingEnsured, again.ensured], [0, 0, 0])
  assert.equal(findBal(db, 1, '2041').openingDays, 10)
})

test('التسوية قبل الإقفال: المتبقي كله يتصفّر ومايترحّلش؛ بعد الإقفال اللي سقط بس', async () => {
  const db = seedYear()
  const employee1 = db.rows(Employee).find((e) => e.id === 1)
  // رقم الشاشة اتغير = تعارض
  await assert.rejects(db.service.settleYearEnd(db.manager, employee1, '2040', 15, TODAY), /الرصيد اتغير/)
  const r = await db.service.settleYearEnd(db.manager, employee1, '2040', 16, TODAY)
  assert.deepEqual([r.period, r.days, r.beforeRemaining, r.after.remaining, r.after.settled, r.after.carried, r.after.lapsed], ['2040', 16, 16, 0, 16, 0, 0])
  assert.equal(findBal(db, 1, '2040').settledDays, 16)
  await assert.rejects(db.service.settleYearEnd(db.manager, employee1, '2040', undefined, TODAY), /مفيش رصيد متبقي/)
  await db.service.closeYear('2040', null)
  const next = findBal(db, 1, '2041')
  assert.ok(next, 'صف السنة الجديدة اتفتح')
  assert.equal(Number(next.openingDays), 0, 'اللي اتسوّى مايترحّلش')

  // الموظف 5: اتقفل الأول (اترحّل 10 من 20)، والتسوية بعدها = اللي سقط (10) بس
  const employee5 = db.rows(Employee).find((e) => e.id === 5)
  const s5 = await db.service.settleYearEnd(db.manager, employee5, '2040', 10, TODAY)
  assert.deepEqual([s5.days, s5.after.remaining, s5.after.carried, s5.after.lapsed, s5.after.settleable], [10, 10, 10, 0, 0])
  assert.equal(findBal(db, 5, '2041').openingDays, 10, 'المُرحّل في السنة الجديدة زي ما هو')
  // الموظف 2 من غير صف: التسوية تحفظ الصف
  const db2 = seedYear({ carryOverEnabled: false })
  const employee2 = db2.rows(Employee).find((e) => e.id === 2)
  const s2 = await db2.service.settleYearEnd(db2.manager, employee2, '2040', undefined, TODAY)
  assert.deepEqual([s2.days, findBal(db2, 2, '2040').settledDays], [10.56, 10.56])
})

test('بداية الاستحقاق من نوع السنوية: الرصيد والتقديم قبل يوم الاستحقاق برسالة واضحة', async () => {
  const db = fakeDb([
    [LeaveType, [annualType({ entitlementStartMonths: 6 }), sickType]],
    [RequestsConfig, config({ 'leave.probation_months': '3' })],
    [Employee, [emp({ id: 1, joinDate: '2040-03-01' }), emp({ id: 2, joinDate: '2030-01-01' })]],
  ])
  assert.equal((await db.service.balanceOf(1, 'annual', '2040-08-31')), null)
  await assert.rejects(db.service.assertSufficient(1, 'annual', 2, '2040-05-01'), /الإجازة السنوية بتبدأ بعد 6 شهر من التعيين — أول يوم مستحق 2040-09-01/)
  // يوم الاستحقاق: 21 × 122 ÷ 366
  await db.service.assertSufficient(1, 'annual', 7, '2040-09-01')
  assert.equal((await db.service.balanceOf(1, 'annual', '2040-09-01')).remaining, 7)
  // موظف قديم مايتأثرش
  await db.service.assertSufficient(2, 'annual', 21, '2040-02-01')
  // النوع من غير شهور = الإعداد العام (3 شهور)
  const fallback = fakeDb([[LeaveType, [annualType(), sickType]], [RequestsConfig, config({ 'leave.probation_months': '3' })], [Employee, [emp({ id: 1, joinDate: '2040-03-01' })]]])
  await assert.rejects(fallback.service.assertSufficient(1, 'annual', 1, '2040-05-01'), /بعد 3 شهر من التعيين — أول يوم مستحق 2040-06-01/)
  // أول سنة كاملة: 21 يوم من يوم الاستحقاق
  const full = fakeDb([[LeaveType, [annualType({ entitlementStartMonths: 6, firstYearProrated: false }), sickType]], [RequestsConfig, config()], [Employee, [emp({ id: 1, joinDate: '2040-03-01' })]]])
  await full.service.assertSufficient(1, 'annual', 21, '2040-09-01')
})
