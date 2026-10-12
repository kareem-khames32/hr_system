'use strict'
// B-ADD.11: «زيادة بالنسبة» في دورة الزيادات، على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_raise_percent_test_<16 hex>)، عبر HTTP
// بتوكنات موقّعة محليًا ومن غير كلمات مرور.
//  RP-01) النسبة العامة على الشركة ← نسبة مختلفة لقسم ← صفر لموظف بالاسم: آخر تطبيق هو اللي بيسري، والمبلغ من الأساسي بالقرش،
//         ومن الإجمالي لما يتطلب، واللي من غير أساسي بيتساب، والراتب نفسه مابيتغيّرش.
//  RP-02) القواعد: الصلاحيتين (إدارة الزيادات + عرض الرواتب)، حالة الدورة، النسبة والوعاء والجمهور الصح، نطاق الفروع،
//         وورقة المدير مابتعرضش مبلغ سطر النسبة، وسطر تدقيق واحد لكل تطبيق.
// Run (من api/): node --test test/raise-percent.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { disposableApp } = require('./helpers/disposable-app.cjs')
const { moduleTools } = require('./helpers/modules.cjs')
const t = disposableApp('raise_percent')
const B = {}, D = {}, E = {}, U = {}, S = {}
const C = '/compensation/cycles'
let sequence = 0
const employee = (name, branch, department, basic, extra = {}) => t.repo('Employee').save({ employeeCode: 'RP' + ++sequence, fullName: name, branchId: branch.id, departmentId: department?.id ?? null,
  joinDate: '2020-01-01', basicSalary: basic, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (branch, permissions, extra = {}) => t.user({ role: 'employee', branchId: branch?.id ?? null, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const apply = (user, body, cycle = S.cycle) => t.request(user, 'POST', `${C}/${cycle}/percent`, body)
const answer = response => [response.status, response.body?.message]
const lineOf = (detail, person) => detail.lines.find(line => line.employeeId === person.id) ?? null
const finals = (detail, ...people) => people.map(person => lineOf(detail, person)?.finalAmount ?? null)
const audits = () => t.repo('AuditLog').countBy({ action: 'RAISE_PERCENT_APPLIED' })

before(async () => {
  await t.start()
  await moduleTools(t.app).enable('compensation')
  B.riyadh = await t.repo('Branch').save({ code: 'RP_1', name: 'فرع الرياض', country: 'SA' })
  B.jeddah = await t.repo('Branch').save({ code: 'RP_2', name: 'فرع جدة', country: 'SA' })
  D.sales = await t.repo('Department').save({ branchId: B.riyadh.id, name: 'المبيعات' })
  D.ops = await t.repo('Department').save({ branchId: B.riyadh.id, name: 'التشغيل' })
  E.boss = await employee('مدير المبيعات', B.riyadh, D.sales, 10000)
  E.seller = await employee('بايع أول', B.riyadh, D.sales, 6000, { housingAllowance: 1500, transportAllowance: 500, managerEmployeeId: E.boss.id })
  E.odd = await employee('بايع بكسور', B.riyadh, D.sales, 3333.33, { managerEmployeeId: E.boss.id })
  E.operator = await employee('موظف تشغيل', B.riyadh, D.ops, 4000)
  E.unpaid = await employee('موظف من غير أساسي', B.riyadh, D.ops, 0)
  E.gone = await employee('موظف منتهي', B.riyadh, D.ops, 5000, { status: 'terminated', isActive: false })
  E.jeddah = await employee('موظف جدة', B.jeddah, null, 8000)
  U.admin = await t.user({ scopeAllBranches: true })
  U.hr = await account(B.riyadh, ['compensation.manage', 'payroll.view'])
  U.hrNoPay = await account(B.riyadh, ['compensation.manage'])
  U.payOnly = await account(B.riyadh, ['payroll.view'])
  U.boss = await account(B.riyadh, [], { employeeId: E.boss.id })
  const made = t.expectStatus(await t.request(U.admin, 'POST', C, { name: 'زيادة 2027', effectivePayrollPeriod: '2027-01' }), 201)
  S.cycle = made.cycle.id
  t.expectStatus(await t.request(U.admin, 'POST', `${C}/${S.cycle}/steps/open`, {}), 201)
}, { timeout: 120000 })
after(context => t.stop(context))

test('RP-01: النسبة العامة ← نسبة مختلفة لقسم ← صفر لموظف: آخر تطبيق بيسري، بالقرش، ومن الإجمالي لما يتطلب، واللي من غير أساسي بيتساب', async () => {
  // 5% على الشركة كلها (حساب كل الفروع)
  const all = t.expectStatus(await apply(U.admin, { percent: 5, audience: null }), 201)
  assert.deepEqual(all.percentApplied, { applied: 5, noSalary: 1 })
  assert.deepEqual(finals(all, E.boss, E.seller, E.odd, E.operator, E.unpaid, E.gone, E.jeddah), [500, 300, 166.67, 200, null, null, 400])
  const seller = lineOf(all, E.seller)
  assert.deepEqual([seller.currentBasic, seller.newBasic, seller.percent, seller.adjusted, seller.adjustNote, seller.note], [6000, 6300, 5, true, 'نسبة 5% من الأساسي', null])
  // 8% لقسم المبيعات بس (استثناء بنسبة تانية) — التشغيل وجدة زي ما هم
  const sales = t.expectStatus(await apply(U.hr, { percent: 8, audience: { mode: 'all', where: { mode: 'units', ids: [D.sales.id], branchId: B.riyadh.id } }, note: 'قسم المبيعات' }), 201)
  assert.deepEqual(sales.percentApplied, { applied: 3, noSalary: 0 })
  assert.deepEqual(finals(sales, E.boss, E.seller, E.odd, E.operator), [800, 480, 266.67, 200])
  assert.equal(lineOf(sales, E.seller).adjustNote, 'نسبة 8% من الأساسي — قسم المبيعات')
  // صفر لموظف بالاسم (استثناء من الزيادة)
  const zero = t.expectStatus(await apply(U.hr, { percent: 0, audience: { mode: 'employees', ids: [E.odd.id] } }), 201)
  assert.deepEqual([zero.percentApplied, finals(zero, E.odd, E.seller)], [{ applied: 1, noSalary: 0 }, [0, 480]])
  // من إجمالي الراتب: (6000 + 1500 + 500) × 2.5% = 200، والزيادة على الأساسي
  const total = t.expectStatus(await apply(U.hr, { percent: 2.5, basis: 'TOTAL', audience: { mode: 'employees', ids: [E.seller.id] } }), 201)
  assert.deepEqual([lineOf(total, E.seller).finalAmount, lineOf(total, E.seller).newBasic, lineOf(total, E.seller).adjustNote], [200, 6200, 'نسبة 2.5% من إجمالي الراتب (الأساسي + البدلات الثابتة)'])
  // الراتب نفسه مااتغيّرش (الدورة لسه مااتطبّقتش)
  assert.equal(Number((await t.repo('Employee').findOneBy({ id: E.seller.id })).basicSalary), 6000)
  assert.equal(await t.repo('CompensationProposal').countBy({ cycleId: S.cycle }), 5)
})

test('RP-02: الصلاحيتين وحالة الدورة والقيم الصح ونطاق الفروع، وورقة المدير مابتعرضش مبلغ سطر النسبة، وسطر تدقيق لكل تطبيق', async () => {
  const count = await audits()
  assert.equal(count, 4)
  assert.deepEqual(answer(await apply(U.hrNoPay, { percent: 5, audience: null })), [403, 'الزيادة بالنسبة محتاجة «عرض الرواتب» — المبلغ والنسبة مع بعض بيكشفوا الراتب'])
  assert.equal((await apply(U.payOnly, { percent: 5, audience: null })).status, 403)
  for (const percent of [-1, 100.01, 5.123, '5', null, undefined, NaN]) assert.equal((await apply(U.hr, { percent, audience: null })).status, 400, String(percent))
  assert.equal((await apply(U.hr, { percent: 5, basis: 'GROSS', audience: null })).status, 400)
  for (const audience of [{ mode: 'roles', ids: ['employee'] }, { mode: 'all', where: { mode: 'units', ids: [] } }, 'الكل', { mode: 'all', where: { mode: 'units', ids: [999999], branchId: B.riyadh.id } }]) {
    assert.equal((await apply(U.hr, { percent: 5, audience })).status, 400, JSON.stringify(audience))
  }
  // موظفين مش على رأس العمل أو من غير أساسي: مفيش مبلغ يتحسب
  assert.equal((await apply(U.hr, { percent: 5, audience: { mode: 'employees', ids: [E.gone.id] } })).status, 400)
  assert.deepEqual(answer(await apply(U.hr, { percent: 5, audience: { mode: 'employees', ids: [E.unpaid.id] } })), [400, 'المختارين مالهمش أساسي مسجّل — مفيش مبلغ يتحسب'])
  assert.equal(await audits(), count, 'الرفض من غير تدقيق ولا كتابة')
  // نطاق الفروع: حساب الرياض بيطبّق «الشركة كلها» على موظفين الرياض بس، وموظف جدة بالاسم مش موجود بالنسبة له
  const scoped = t.expectStatus(await apply(U.hr, { percent: 10, audience: null }), 201)
  assert.deepEqual(scoped.percentApplied, { applied: 4, noSalary: 1 })
  const full = t.expectStatus(await t.request(U.admin, 'GET', `${C}/${S.cycle}`), 200)
  assert.deepEqual(finals(full, E.boss, E.jeddah), [1000, 400], 'سطر جدة زي ما هو')
  assert.equal((await apply(U.hr, { percent: 10, audience: { mode: 'employees', ids: [E.jeddah.id] } })).status, 400)
  // ورقة المدير: سطور النسبة من غير مبلغ (متعلّمة إن المراجعة عدّلتها)، ولما يقترح هو بيشوف اقتراحه والنهائي زي ما هو
  const sheet = () => t.request(U.boss, 'GET', '/compensation/my-team')
  const mine = t.expectStatus(await sheet(), 200).cycles.find(row => row.id === S.cycle)
  assert.deepEqual(mine.team.map(row => [row.fullName, row.amount, row.adjusted]), [['بايع أول', null, true], ['بايع بكسور', null, true]])
  assert.ok(!JSON.stringify(mine).includes('نسبة'), 'ولا سبب النسبة')
  t.expectStatus(await t.request(U.boss, 'PUT', `${C}/${S.cycle}/my-team/${E.seller.id}`, { amount: 250 }), 200)
  const after = t.expectStatus(await sheet(), 200).cycles.find(row => row.id === S.cycle)
  assert.deepEqual(after.team.find(row => row.employeeId === E.seller.id).amount, 250)
  assert.equal(lineOf(t.expectStatus(await t.request(U.admin, 'GET', `${C}/${S.cycle}`), 200), E.seller).finalAmount, 600)
  // الدورة بعد الاعتماد: النسبة مابتتطبّقش
  t.expectStatus(await t.request(U.admin, 'POST', `${C}/${S.cycle}/steps/review`, {}), 201)
  t.expectStatus(await apply(U.hr, { percent: 3, audience: { mode: 'employees', ids: [E.operator.id] } }), 201)
  t.expectStatus(await t.request(U.admin, 'POST', `${C}/${S.cycle}/steps/cancel`, {}), 201)
  assert.deepEqual(answer(await apply(U.hr, { percent: 3, audience: null })), [400, 'السطور مابتتعدّلش والدورة «ملغاة»'])
})
