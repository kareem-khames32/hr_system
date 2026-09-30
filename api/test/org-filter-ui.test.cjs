'use strict'
// فلتر «الفرع ← الإدارة ← القسم ← الفريق» الموحد (طلب المالك 30 سبتمبر) — المنطق الصافي بلا قاعدة ولا خادم:
//  OF-01) المطابقة: الإدارة أو القسم بأقسامه الفرعية جوه فرعه بس («الإدارة التنفيذية» مابتسحبش أقسام فرع تاني تحتها)، والفريق بالظبط،
//         والموظف المش معروف مش مطابق والفلتر شغال، والفرع المقفول على حساب الفرع الواحد مش فلتر.
//  OF-02) الاختيارات مترابطة (الإدارات في الفرع، والأقسام تحت الإدارة، والفرق تحت الوحدة) واختيار مستوى أعلى بيشيل اللي تحته.
//  OF-03) شريط الفلتر: أربع قوائم بـ«الكل»، والفرع المقفول، و«مسح الفلتر» لما يشتغل، وبيلف على الموبايل.
//  OF-04) التحميل مرة للجلسة (طلب واحد مشترك) وتحديث بالطلب.
//  OF-05) الخادم: قراءة المعاملات (أرقام موجبة بس) والشروط بمعاملات عمرها ما بتتلزق في نص الاستعلام، وفلاتر المسير والصرف بالأقسام.
//  OF-06) الإجماليات بعد الفلتر بنفس حساب الخادم: كشف البنوك، والبدلات، وإقفال سنة الإجازات، والتأمينات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const Module = require('node:module')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true,
  compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const root = path.resolve(__dirname, '../..')
const load = Module._load
Module._load = function (request, parent, isMain) {
  return load.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, isMain)
}
const React = require('../../node_modules/react')
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server')
const lib = require('../../src/lib/org-filter')
const { OrgFilterBar } = require('../../src/components/OrgFilter')
const server = require('../src/org/org-filter-params')
const overview = require('../src/payroll/payroll-overview-filters')
const disbursement = require('../src/payroll/payroll-disbursement')
const { filterBankSheet } = require('../../src/lib/bank-sheet-filter')
const { allowanceTotalsOf } = require('../../src/lib/payroll-allowances-api')
const { yearEndTotalsOf } = require('../../src/lib/leave-year-end-api')
const { filterSocialInsuranceReport } = require('../../src/lib/social-insurance-api')

// الفرع 1 (الرئيسي): الإدارة التنفيذية (1) ← مكتب الرئيس (2)؛ إدارة العمليات (7) ← التشغيل (8) وفريق الوردية (2).
// الفرع 2 (النصر): إدارة المبيعات (3، تحت الإدارة التنفيذية) ← التجزئة (4) ← فروع التجزئة (5)، وفريق المعرض (1) في التجزئة؛
// خدمة العملاء (6) قسم نصر تحت الإدارة التنفيذية على طول. الموظف 17 في النصر من غير قسم.
const A = 'ADMINISTRATION', D = 'DEPARTMENT'
const unit = (id, name, branchId, parentId, unitType, isExecutive = false) => ({ id, name, branchId, parentId, unitType, isExecutive })
const context = {
  branches: [{ id: 1, name: 'الفرع الرئيسي' }, { id: 2, name: 'فرع النصر' }],
  units: [
    unit(1, 'الإدارة التنفيذية', 1, null, A, true), unit(2, 'مكتب الرئيس', 1, 1, D), unit(3, 'إدارة المبيعات', 2, 1, A),
    unit(4, 'التجزئة', 2, 3, D), unit(5, 'فروع التجزئة', 2, 4, D), unit(6, 'خدمة العملاء', 2, 1, D),
    unit(7, 'إدارة العمليات', 1, null, A), unit(8, 'التشغيل', 1, 7, D),
  ],
  teams: [{ id: 1, name: 'فريق المعرض', departmentId: 4, branchId: 2 }, { id: 2, name: 'فريق الوردية', departmentId: 8, branchId: 1 }],
  employees: [
    { id: 10, branchId: 1, departmentId: 1, teamId: null }, { id: 11, branchId: 1, departmentId: 2, teamId: null },
    { id: 12, branchId: 2, departmentId: 3, teamId: null }, { id: 13, branchId: 2, departmentId: 4, teamId: 1 },
    { id: 14, branchId: 2, departmentId: 5, teamId: null }, { id: 15, branchId: 2, departmentId: 6, teamId: null },
    { id: 16, branchId: 1, departmentId: 8, teamId: 2 }, { id: 17, branchId: 2, departmentId: null, teamId: null },
  ],
}
// حساب فرع النصر: الخادم بيرجّع أب مش ظاهر null (الإدارة التنفيذية في فرع برّه نطاقه) — من غير رقمها ولا اسمها
const nasrOnly = {
  branches: [context.branches[1]],
  units: context.units.filter(u => u.branchId === 2).map(u => ({ ...u, parentId: u.parentId === 1 ? null : u.parentId })),
  teams: context.teams.filter(t => t.branchId === 2),
  employees: context.employees.filter(e => e.branchId === 2),
}
const value = (patch = {}) => ({ ...lib.EMPTY_ORG_FILTER, ...patch })
const matching = (ctx, v, locked = null) => {
  const compiled = lib.compileOrgFilter(ctx, v, locked)
  return ctx.employees.map(e => e.id).filter(id => compiled.matches(id))
}

test('OF-01: الإدارة والقسم بأقسامهم الفرعية جوه فرعهم بس، والفريق بالظبط، والمش معروف مش مطابق', () => {
  // الإدارة التنفيذية (الرئيسي): موظفيها ومكتب الرئيس بس — مش إدارة المبيعات ولا خدمة العملاء في النصر اللي تحتها
  assert.deepEqual(matching(context, value({ administrationId: 1 })), [10, 11])
  assert.deepEqual(lib.compileOrgFilter(context, value({ administrationId: 1 })).params, { departmentIds: [1, 2] })
  // إدارة المبيعات (النصر) بأقسامها على مستويين، ومش خدمة العملاء (تحت التنفيذية مش تحت المبيعات)
  assert.deepEqual(matching(context, value({ branchId: 2, administrationId: 3 })), [12, 13, 14])
  // القسم بأقسامه الفرعية، والقسم المختار بيغلب الإدارة
  assert.deepEqual(matching(context, value({ administrationId: 3, departmentId: 4 })), [13, 14])
  assert.deepEqual(lib.compileOrgFilter(context, value({ branchId: 2, departmentId: 4 })).params, { branchId: 2, departmentIds: [4, 5] })
  // الفريق بالظبط
  assert.deepEqual(matching(context, value({ teamId: 1 })), [13])
  assert.deepEqual(matching(context, value({ departmentId: 4, teamId: 1 })), [13])
  assert.deepEqual(lib.compileOrgFilter(context, value({ departmentId: 4, teamId: 1 })).params, { departmentIds: [4, 5], teamId: 1 })
  // الفرع لوحده: كل موظفيه حتى اللي من غير قسم
  assert.deepEqual(matching(context, value({ branchId: 2 })), [12, 13, 14, 15, 17])
  // موظف مش في الشجرة: مش مطابق والفلتر شغال، ومطابق والفلتر مش شغال
  const active = lib.compileOrgFilter(context, value({ branchId: 2 }))
  assert.equal(active.active, true)
  assert.equal(active.matches(99), false); assert.equal(active.matches(null), false); assert.equal(active.matches(undefined), false)
  assert.equal(active.known(99), false); assert.equal(active.known(13), true)
  const idle = lib.compileOrgFilter(context, value())
  assert.equal(idle.active, false); assert.equal(idle.matches(99), true); assert.deepEqual(idle.params, {})
  // الرقم ممكن يرجع نص من الاستعلام
  assert.equal(active.matches('13'), true)
  // مكان الصف نفسه (لقطة المسير مثلًا)
  assert.equal(active.matchesPlacement({ branchId: 2, departmentId: 4, teamId: null }), true)
  assert.equal(lib.compileOrgFilter(context, value({ departmentId: 4 })).matchesPlacement({ branchId: 2, departmentId: null }), false)
  // حساب الفرع الواحد: فرعه مقفول ومش فلتر لوحده، والقسم جوّاه فلتر
  const locked = lib.compileOrgFilter(nasrOnly, lib.initialOrgFilter(2), 2)
  assert.equal(locked.active, false); assert.deepEqual(locked.params, {}); assert.equal(locked.matches(99), true)
  assert.equal(lib.orgFilterActive(value({ branchId: 2 }), 2), false)
  assert.deepEqual(lib.compileOrgFilter(nasrOnly, value({ branchId: 2, departmentId: 4 }), 2).params, { branchId: 2, departmentIds: [4, 5] })
  // الاستعلام للخادم
  assert.equal(lib.orgFilterQuery({ branchId: 2, departmentIds: [4, 5], teamId: 1 }), 'branchId=2&departmentIds=4%2C5&teamId=1')
  assert.equal(lib.orgFilterQuery({}), '')
  assert.deepEqual(lib.orgFilterQueryValues({ departmentIds: [4, 5] }), { departmentIds: '4,5' })
  assert.deepEqual(lib.orgFilterQueryValues({}), {})
  assert.equal(lib.appendOrgFilterParams(new URLSearchParams({ period: '2026-09' }), { teamId: 1 }).toString(), 'period=2026-09&teamId=1')
  assert.equal(lib.describeOrgFilter(context, value({ branchId: 2, administrationId: 3, departmentId: 4, teamId: 1 })),
    'فرع النصر ← إدارة المبيعات ← التجزئة ← فريق المعرض')
  assert.equal(lib.describeOrgFilter(context, value()), '')
})

test('OF-02: الاختيارات مترابطة، واختيار مستوى أعلى بيشيل اللي تحته اللي مابقاش يصلح', () => {
  const ids = options => options.map(o => o.id)
  // من غير فرع: الإدارة التنفيذية أول الإدارات، والأسماء بفرعها
  const all = lib.orgFilterOptions(context, value())
  assert.deepEqual(ids(all.branches).sort(), [1, 2])
  assert.equal(all.administrations[0].id, 1)
  assert.ok(all.administrations.every(o => / — /.test(o.label)), 'كل إدارة بفرعها لما مفيش فرع مختار')
  // فرع النصر: إدارة المبيعات بس (التنفيذية في الرئيسي)، وأقسام النصر بمسارها، وفريق المعرض
  const nasr = lib.orgFilterOptions(context, value({ branchId: 2 }))
  assert.deepEqual(ids(nasr.administrations), [3])
  assert.deepEqual(ids(nasr.departments).sort(), [4, 5, 6])
  assert.ok(nasr.departments.find(o => o.id === 5).label.endsWith('التجزئة ← فروع التجزئة'))
  assert.deepEqual(ids(nasr.teams), [1])
  // إدارة المبيعات مختارة: أقسامها بمسار من تحتها
  const sales = lib.orgFilterOptions(context, value({ branchId: 2, administrationId: 3 }))
  assert.deepEqual(sales.departments.map(o => [o.id, o.label]), [[4, 'التجزئة'], [5, 'التجزئة ← فروع التجزئة']])
  // الفرق تحت الوحدة المختارة بس
  assert.deepEqual(ids(lib.orgFilterOptions(context, value({ departmentId: 8 })).teams), [2])
  // تغيير الفرع بيشيل الإدارة والقسم والفريق اللي مش فيه
  let v = lib.updateOrgFilter(context, value(), 'administration', 3)
  v = lib.updateOrgFilter(context, v, 'department', 4)
  v = lib.updateOrgFilter(context, v, 'team', 1)
  assert.deepEqual(v, value({ administrationId: 3, departmentId: 4, teamId: 1 }))
  assert.deepEqual(lib.updateOrgFilter(context, v, 'branch', 2), value({ branchId: 2, administrationId: 3, departmentId: 4, teamId: 1 }), 'فرعهم نفسه: يفضلوا')
  assert.deepEqual(lib.updateOrgFilter(context, v, 'branch', 1), value({ branchId: 1 }))
  // إدارة تانية بتشيل القسم اللي مش تحتها
  assert.deepEqual(lib.updateOrgFilter(context, value({ departmentId: 4 }), 'administration', 7), value({ administrationId: 7 }))
  // حساب الفرع الواحد: فرعه ثابت مهما اتبعت
  assert.equal(lib.updateOrgFilter(nasrOnly, value({ branchId: 2 }), 'branch', 1, 2).branchId, 2)
  // حساب النصر: مفيش أي أثر للإدارة التنفيذية (لا رقم ولا اسم)، وإدارة المبيعات جذر
  const scoped = lib.orgFilterOptions(nasrOnly, value({ branchId: 2 }))
  assert.equal(JSON.stringify(scoped).includes('الإدارة التنفيذية'), false)
  assert.deepEqual(ids(scoped.administrations), [3])
  assert.deepEqual(matching(nasrOnly, value({ branchId: 2, administrationId: 3 })), [12, 13, 14])
})

test('OF-03: شريط الفلتر — أربع قوائم بـ«الكل»، والفرع المقفول، و«مسح الفلتر» لما يشتغل، وبيلف على الموبايل', () => {
  const render = props => renderToStaticMarkup(React.createElement(OrgFilterBar, { onChange() {}, ...props }))
  assert.equal(render({ context: null, value: value() }), '', 'لحد ما الشجرة تيجي مفيش شريط')
  const idle = render({ context, value: value(), companyWide: true })
  for (const label of ['الفرع', 'الإدارة', 'القسم', 'الفريق']) assert.ok(idle.includes(`aria-label="${label}"`), label)
  for (const all of ['كل الفروع', 'كل الإدارات', 'كل الأقسام', 'كل الفرق']) assert.ok(idle.includes(all), all)
  assert.ok(idle.includes('data-org-filter-active="false"'))
  assert.equal(idle.includes('مسح الفلتر'), false, '«مسح الفلتر» بس لما الفلتر يشتغل')
  // بيلف: عمودين على الموبايل وسطر بيلف على الشاشة الأعرض، والقوائم مابتفرضش عرض أكبر من الشاشة
  assert.ok(idle.includes('grid grid-cols-2 gap-2 min-w-0 w-full sm:flex sm:flex-wrap'))
  assert.ok(idle.includes('class="input min-w-0 sm:w-44"'))
  const active = render({ context, value: value({ branchId: 2, administrationId: 3 }), companyWide: true })
  assert.ok(active.includes('data-org-filter-active="true"') && active.includes('data-org-filter-clear') && active.includes('مسح الفلتر'))
  // حساب الفروع (مش الشركة كلها): «كل فروعك»
  assert.ok(render({ context, value: value() }).includes('كل فروعك'))
  // حساب الفرع الواحد: فرعه مختار ومقفول ومفيش «كل الفروع»، والفرع المقفول لوحده مش فلتر
  const locked = render({ context: nasrOnly, value: lib.initialOrgFilter(2), lockedBranchId: 2 })
  const branchSelect = locked.slice(locked.indexOf('aria-label="الفرع"') - 10, locked.indexOf('</select>'))
  assert.ok(branchSelect.includes('disabled=""'), locked)
  assert.ok(branchSelect.includes('فرع النصر') && !branchSelect.includes('كل الفروع') && !branchSelect.includes('الفرع الرئيسي'))
  assert.ok(locked.includes('data-org-filter-active="false"'))
  // من غير إدارات أو فرق في الفرع: القائمة دي مابتظهرش
  const bare = { branches: [{ id: 5, name: 'فرع صغير' }], units: [unit(50, 'المخزن', 5, null, D)], teams: [], employees: [] }
  const small = render({ context: bare, value: value() })
  assert.equal(small.includes('aria-label="الإدارة"'), false); assert.equal(small.includes('aria-label="الفريق"'), false)
  assert.ok(small.includes('aria-label="القسم"'))
})

test('OF-04: الشجرة مرة للجلسة — طلب واحد مشترك، والنسخة الجديدة من غير طلب، والتحديث بالطلب', async () => {
  const realFetch = global.fetch
  let calls = 0
  global.fetch = async (url) => {
    calls++
    assert.match(String(url), /\/org\/filter-context$/)
    return { ok: true, status: 200, text: async () => JSON.stringify(nasrOnly) }
  }
  try {
    lib.clearOrgFilterContextCache()
    assert.equal(lib.peekOrgFilterContext(), null)
    const [first, second] = await Promise.all([lib.loadOrgFilterContext(), lib.loadOrgFilterContext()])
    assert.equal(calls, 1, 'طلب واحد للشاشات اللي فتحت مع بعض')
    assert.deepEqual(first, nasrOnly); assert.equal(first, second)
    await lib.loadOrgFilterContext()
    assert.equal(calls, 1, 'النسخة الجديدة من غير طلب')
    assert.deepEqual(lib.peekOrgFilterContext().data, nasrOnly)
    await lib.loadOrgFilterContext(true)
    assert.equal(calls, 2, 'التحديث بالطلب')
  } finally {
    global.fetch = realFetch
    lib.clearOrgFilterContextCache()
  }
})

test('OF-05: الخادم — قراءة المعاملات والشروط بمعاملات، وفلاتر المسير والصرف بأقسام الإدارة/القسم', () => {
  assert.deepEqual(server.parseOrgFilter({}), server.EMPTY_ORG_FILTER)
  assert.deepEqual(server.parseOrgFilter({ branchId: '2', departmentIds: '5, 4,4', teamId: 7 }), { branchId: 2, departmentIds: [4, 5], teamId: 7 })
  assert.deepEqual(server.parseOrgFilter({ departmentIds: ['3', 9] }), { branchId: null, departmentIds: [3, 9], teamId: null })
  assert.deepEqual(server.parseOrgFilter({ branchId: '', departmentIds: '', teamId: null }), server.EMPTY_ORG_FILTER)
  for (const bad of [{ branchId: '0' }, { branchId: 'x' }, { teamId: '-1' }, { departmentIds: '3,abc' }, { departmentIds: '1.5' }, { departmentIds: ' , ' }]) {
    assert.throws(() => server.parseOrgFilter(bad), /غير صالح/, JSON.stringify(bad))
  }
  assert.throws(() => server.parseOrgFilter({ departmentIds: Array.from({ length: server.ORG_FILTER_MAX_UNITS + 1 }, (_, i) => i + 1).join(',') }), /أكتر من/)
  assert.equal(server.orgFilterIsEmpty(server.EMPTY_ORG_FILTER), true)
  const filter = { branchId: 2, departmentIds: [4, 5], teamId: null }
  assert.equal(server.orgFilterMatches({ branchId: 2, departmentId: 5 }, filter), true)
  assert.equal(server.orgFilterMatches({ branchId: 2, departmentId: 6 }, filter), false)
  assert.equal(server.orgFilterMatches({ branchId: 2, departmentId: null }, filter), false)
  assert.equal(server.orgFilterMatches({ branchId: 1, departmentId: 4 }, filter), false)
  // SQL خام: الأرقام معاملات بعد اللي موجود، عمرها ما بتتلزق في النص
  const params = ['2026-09']
  const clauses = server.orgFilterSql({ branch: 'e.branchId', department: 'e.departmentId', team: 'e.teamId' }, { branchId: 2, departmentIds: [4, 5], teamId: 7 }, params)
  assert.deepEqual(clauses, ['e.branchId = @1', 'e.departmentId IN (@2, @3)', 'e.teamId = @4'])
  assert.deepEqual(params, ['2026-09', 2, 4, 5, 7])
  assert.deepEqual(server.orgFilterSql({ branch: 'b', department: 'd', team: 't' }, server.EMPTY_ORG_FILTER, []), [])
  assert.deepEqual(server.orgFilterQb({ branchId: null, departmentIds: [4], teamId: 1 }, { branch: 'e.branchId', department: 'e.departmentId', team: 'e.teamId' }),
    [['e.departmentId IN (:...orgFilterDepartmentIds)', { orgFilterDepartmentIds: [4] }], ['e.teamId = :orgFilterTeamId', { orgFilterTeamId: 1 }]])
  // شاشة المسير: من غير الأقسام نفس الشكل القديم بالظبط، ومعاها أي قسم منها، وقايمة كل قيمها غلط ماتطابقش حد
  assert.equal('departmentIds' in overview.normalizePayrollOverviewFilters(null), false)
  const withUnits = overview.normalizePayrollOverviewFilters({ departmentIds: '5,4' })
  assert.deepEqual(withUnits.departmentIds, [4, 5])
  assert.equal(overview.matchesPayrollOverviewFilter({ departmentId: 5 }, withUnits), true)
  assert.equal(overview.matchesPayrollOverviewFilter({ departmentId: 6 }, withUnits), false)
  assert.equal(overview.matchesPayrollOverviewFilter({ departmentId: null }, withUnits), false)
  assert.equal(overview.matchesPayrollOverviewFilter({ departmentId: 5 }, overview.normalizePayrollOverviewFilters({ departmentIds: 'x' })), false)
  assert.equal(overview.payrollOverviewActiveFilterCount(withUnits), 1)
  // صرف الرواتب: نفس الشرط على مكان الموظف في لقطة المسير
  const row = (employeeId, departmentId) => ({ employeeId, branchId: 2, departmentId, teamId: null, payMethod: 'cash', state: 'UNPAID', fullName: `م${employeeId}`, employeeCode: `E${employeeId}` })
  const rows = [row(1, 4), row(2, 5), row(3, 6), row(4, null)]
  assert.deepEqual(disbursement.filterPayrollDisbursementRows(rows, { departmentIds: [4, 5] }).map(r => r.employeeId), [1, 2])
  assert.deepEqual(disbursement.filterPayrollDisbursementRows(rows, {}).map(r => r.employeeId), [1, 2, 3, 4])
})

test('OF-06: الإجماليات بعد الفلتر بنفس حساب الخادم — كشف البنوك والبدلات وإقفال السنة والتأمينات', () => {
  const bankRow = (employeeId, bankName, netPay, bankAmount, cashAmount, issue = null) =>
    ({ employeeId, employeeCode: `E${employeeId}`, fullName: `م${employeeId}`, payMethod: 'transfer', payMethodLabel: 'تحويل', bankName, iban: null, netPay, bankAmount, cashAmount, issue })
  const sheet = {
    run: { id: 1, name: null, period: '2026-09', status: 'APPROVED', startDate: '2026-08-23', endDate: '2026-09-22' },
    rows: [bankRow(1, 'بنك أ', 1000.1, 1000.1, 0), bankRow(2, 'بنك ب', 500.2, 300.1, 200.1, 'مفيش آيبان'), bankRow(3, 'بنك أ', 700, 700, 0), bankRow(4, null, 90.05, 0, 90.05)],
    banks: [], totals: { employees: 4, bank: 2000.2, cash: 290.15, net: 2290.35 }, issues: { employees: 1, bank: 300.1, cash: 200.1, rows: [] },
    settlement: { employees: 2, total: 1500, rows: [{ employeeId: 5, employeeCode: 'E5', fullName: 'م5', netPay: 1000, lastWorkingDay: '2026-09-10', caseId: 3 },
      { employeeId: 6, employeeCode: 'E6', fullName: 'م6', netPay: 500, lastWorkingDay: '2026-09-11', caseId: 4 }] },
  }
  const keep = new Set([1, 2, 4, 6])
  const filtered = filterBankSheet(sheet, id => keep.has(id))
  assert.deepEqual(filtered.rows.map(r => r.employeeId), [1, 2, 4])
  assert.deepEqual(filtered.totals, { employees: 3, bank: 1300.2, cash: 290.15, net: 1590.35 })
  assert.deepEqual(filtered.banks, [{ bankName: 'بنك أ', employees: 1, total: 1000.1 }, { bankName: 'بنك ب', employees: 1, total: 300.1 }], 'البنك للي ليه تحويل بس')
  assert.deepEqual([filtered.issues.employees, filtered.issues.bank, filtered.issues.cash], [1, 300.1, 200.1])
  assert.deepEqual([filtered.settlement.employees, filtered.settlement.total, filtered.settlement.rows.map(r => r.employeeId)], [1, 500, [6]])

  const line = (id, employeeId, allowanceTypeId, typeName, amount, state = 'PENDING') => ({ id, employeeId, allowanceTypeId, typeName, amount, state })
  const totals = allowanceTotalsOf([line(1, 1, 1, 'بدل سكن', 100.1), line(2, 1, 2, 'بدل انتقال', 50.05), line(3, 2, 1, 'بدل سكن', 99.9),
    line(4, 3, 1, 'بدل سكن', 1000, 'CANCELLED')])
  assert.deepEqual(totals, { count: 3, employees: 2, amount: 250.05,
    byType: [{ allowanceTypeId: 2, typeName: 'بدل انتقال', count: 1, amount: 50.05 }, { allowanceTypeId: 1, typeName: 'بدل سكن', count: 2, amount: 200 }] })

  const yearRow = (patch) => ({ employee: { id: 1 }, entitledTotal: 21, used: 5.5, settled: 0, remaining: 15.5, carried: 10, lapsed: 5.5, settleable: 15.5, closed: false, ended: true, ...patch })
  assert.deepEqual(yearEndTotalsOf([yearRow({}), yearRow({ closed: true, remaining: 1.1, carried: 1.1, lapsed: 0, settleable: 0, used: 0.1 }), yearRow({ error: 'x', remaining: 99 })]),
    { entitledTotal: 42, used: 5.6, settled: 0, remaining: 16.6, carried: 11.1, lapsed: 5.5, settleable: 15.5, employees: 2, closed: 1, pending: 1 })

  const insured = (employeeId, insuredSalary, employeeShare, employerShare) => ({ employeeId, insuredSalary, employeeShare, employerShare })
  const report = { period: '2026-09', branchId: null, rows: [insured(1, 10000, 975, 1175), insured(2, 5000.5, 487.55, 587.56), insured(3, 3000, 300, 400)],
    totals: { employees: 3, insuredSalary: '18000.50', employeeShare: '1762.55', employerShare: '2162.56', total: '3925.11' } }
  assert.deepEqual(filterSocialInsuranceReport(report, id => id !== 3).totals,
    { employees: 2, insuredSalary: '15000.50', employeeShare: '1462.55', employerShare: '1762.56', total: '3225.11' })
})
