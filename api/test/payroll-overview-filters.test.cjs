// فلاتر تبويبي «المدرجين بالمسير» و«موظفين ليس لديهم مسير» والجدول الموحد (طلب المالك 20 سبتمبر) — بلا قاعدة بيانات:
// قراءة الاستعلام، والمطابقة بكل فلتر ومع بعض، وعدّاد الفلاتر المفعّلة، وتقسيم الاختيار المختلط (نقل / إضافة / متخطى بسببه).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const f = require('../src/payroll/payroll-overview-filters')
const m = require('../src/payroll/payroll-run-membership-moves')

const row = (overrides = {}) => ({
  fullName: 'أحمد سعيد', employeeCode: 'EMP-001', branchId: 1, departmentId: 5, teamId: 7,
  jobTitle: 'محاسب', employmentStatus: 'active', hireDate: '2024-03-15', runId: 11, reasonCode: null, ...overrides,
})
const match = (rowValue, input) => f.matchesPayrollOverviewFilter(rowValue, f.normalizePayrollOverviewFilters(input))

test('قراءة الاستعلام: القيم غير الصالحة تسقط، والحالات من نص مفصول بفاصلة، ومن/إلى المقلوبين يتصححوا', () => {
  const empty = f.normalizePayrollOverviewFilters(null)
  assert.deepEqual(empty, { search: '', branchId: null, departmentId: null, teamId: null, jobTitle: '', statuses: [],
    hiredFrom: null, hiredTo: null, runId: null, reasonCode: '', membership: 'all' })
  const parsed = f.normalizePayrollOverviewFilters({ search: '  أحمد  ', branchId: '3', departmentId: '0', teamId: 'x',
    statuses: 'active,suspended,لا_وجود_له', hiredFrom: '2026-05-01', hiredTo: '2025-01-01', runId: '12', reasonCode: ' OUT_OF_ALL_RUNS ', membership: 'unassigned' })
  assert.equal(parsed.search, 'أحمد')
  assert.deepEqual([parsed.branchId, parsed.departmentId, parsed.teamId, parsed.runId], [3, null, null, 12])
  assert.deepEqual(parsed.statuses, ['active', 'suspended'], 'الحالة غير المعروفة تسقط')
  assert.deepEqual([parsed.hiredFrom, parsed.hiredTo], ['2025-01-01', '2026-05-01'], 'من/إلى المقلوبين يتصححوا')
  assert.equal(parsed.reasonCode, 'OUT_OF_ALL_RUNS')
  assert.equal(parsed.membership, 'unassigned')
  assert.equal(f.normalizePayrollOverviewFilters({ membership: 'حاجة تانية' }).membership, 'all', 'منظور غير معروف = الكل')
})

test('البحث بالاسم أو الكود بلا حساسية لحالة الحروف، والباقي مطابقة دقيقة', () => {
  assert.ok(match(row(), { search: 'سعيد' }))
  assert.ok(match(row(), { search: 'emp-001' }), 'الكود بلا حساسية للحالة')
  assert.ok(!match(row(), { search: 'منى' }))
  assert.ok(match(row(), { branchId: 1, departmentId: 5, teamId: 7 }))
  assert.ok(!match(row(), { branchId: 2 }))
  assert.ok(!match(row({ departmentId: null }), { departmentId: 5 }))
  assert.ok(match(row(), { jobTitle: 'محاسب' }) && !match(row(), { jobTitle: 'سائق' }))
  assert.ok(match(row(), { statuses: 'active,probation' }) && !match(row({ employmentStatus: 'archived' }), { statuses: 'active' }))
  assert.ok(match(row(), { runId: 11 }) && !match(row(), { runId: 12 }))
  assert.ok(match(row({ reasonCode: 'OUT_OF_ALL_RUNS', runId: null }), { reasonCode: 'OUT_OF_ALL_RUNS' }))
  assert.ok(!match(row({ reasonCode: 'SUSPENDED', runId: null }), { reasonCode: 'OUT_OF_ALL_RUNS' }))
})

test('مدى تاريخ التعيين شامل الطرفين، وبلا تاريخ = خارج المدى، و«كل التواريخ» ما بتفلترش', () => {
  assert.ok(match(row(), { hiredFrom: '2024-03-15', hiredTo: '2024-03-15' }), 'الطرفان داخل المدى')
  assert.ok(match(row(), { hiredFrom: '2024-01-01' }) && match(row(), { hiredTo: '2024-12-31' }))
  assert.ok(!match(row(), { hiredFrom: '2024-04-01' }) && !match(row(), { hiredTo: '2024-03-14' }))
  assert.ok(!match(row({ hireDate: null }), { hiredFrom: '2024-01-01' }), 'بلا تاريخ تعيين يخرج لما المدى مطلوب')
  assert.ok(match(row({ hireDate: null }), {}), '«كل التواريخ» ما بتستبعدش حد')
})

test('المنظور: الكل / المدرجين في مسير / بلا مسير على نفس الصفوف', () => {
  const assigned = row(), unassigned = row({ runId: null, reasonCode: 'OUT_OF_ALL_RUNS' })
  for (const value of [assigned, unassigned]) assert.ok(match(value, { membership: 'all' }))
  assert.ok(match(assigned, { membership: 'assigned' }) && !match(unassigned, { membership: 'assigned' }))
  assert.ok(match(unassigned, { membership: 'unassigned' }) && !match(assigned, { membership: 'unassigned' }))
})

test('الفلاتر بتشتغل مع بعض (AND)، والعدّاد بيعد المفعّل بس والمنظور مش فلتر', () => {
  const input = { search: 'أحمد', branchId: 1, statuses: 'active', hiredFrom: '2024-01-01', hiredTo: '2024-12-31' }
  assert.ok(match(row(), input))
  assert.ok(!match(row({ branchId: 2 }), input), 'فلتر واحد ما يطابقش = الصف يخرج')
  assert.equal(f.payrollOverviewActiveFilterCount(f.normalizePayrollOverviewFilters(input)), 4, 'مدى التاريخ فلتر واحد')
  assert.equal(f.payrollOverviewActiveFilterCount(f.normalizePayrollOverviewFilters({ membership: 'unassigned' })), 0)
  assert.equal(f.payrollOverviewActiveFilterCount(f.normalizePayrollOverviewFilters(null)), 0)
})

test('الموقوف بيدخل التقرير بس لما يتفلتر بالاسم', () => {
  assert.equal(f.payrollOverviewNeedsSuspended(f.normalizePayrollOverviewFilters({ statuses: 'active' })), false)
  assert.equal(f.payrollOverviewNeedsSuspended(f.normalizePayrollOverviewFilters({ statuses: 'active,suspended' })), true)
})

test('تقسيم الاختيار المختلط: مين ينتقل من أنهي مسير، مين يتضاف، ومين يتخطى وليه', () => {
  const open = (id, name = `مسير ${id}`) => ({ id, name, status: 'CALCULATED', runType: 'REGULAR', visible: true })
  const candidate = (employeeId, homes, overrides = {}) => ({ employeeId, exists: true, fullName: `موظف ${employeeId}`,
    employeeCode: `E${employeeId}`, branchId: 1, homes, ...overrides })
  const split = m.splitPayrollBulkMembership([
    candidate(1, []),                                                        // بلا مسير → إضافة
    candidate(2, [open(20)]),                                                // في مسير مفتوح → نقل
    candidate(3, [open(20)]),                                                // نفس المصدر → نفس المجموعة
    candidate(4, [open(30)]),                                                // مصدر تاني → مجموعة تانية
    candidate(5, [{ ...open(40), status: 'APPROVED' }]),                     // شهر معتمد
    candidate(6, [{ ...open(50), visible: false }]),                         // مسيره خارج نطاق الفرع
    candidate(7, [{ ...open(60), name: null }]),                             // مسير قديم بلا اسم
    candidate(8, [open(99)]),                                                // موجود في المسير الهدف
    candidate(9, [], { branchId: 2 }),                                       // موظف خارج نطاق الفرع
    candidate(10, [], { exists: false }),                                    // ملف مش موجود
  ], { targetRunId: 99, branchScope: [1] })

  assert.deepEqual(split.groups, [
    { fromRunId: null, employeeIds: [1] },
    { fromRunId: 20, employeeIds: [2, 3] },
    { fromRunId: 30, employeeIds: [4] },
  ], 'الإضافة أولًا ثم النقل من كل مسير مرة واحدة')
  assert.deepEqual(split.skipped.map(row => [row.employeeId, row.skipCode]), [
    [5, 'LOCKED_RUN'], [6, 'SOURCE_OUT_OF_SCOPE'], [7, 'SOURCE_NO_NAME'], [8, 'ALREADY_IN_RUN'],
    [9, 'OUT_OF_BRANCH_SCOPE'], [10, 'EMPLOYEE_NOT_FOUND'],
  ])
  for (const row of split.skipped) assert.ok(row.skipReason && row.skipReason.length > 3, `سبب عربي مكتوب لـ${row.employeeId}`)
  assert.equal(split.skipped.find(row => row.employeeId === 5).fromRunName, 'مسير 40', 'اسم المسير المقفول يظهر مع السبب')
  assert.equal(split.fromNames.get(20), 'مسير 20')
  // بلا نطاق فرع: الموظف اللي في فرع تاني يعدي عادي
  const company = m.splitPayrollBulkMembership([candidate(9, [], { branchId: 2 })], { targetRunId: 99, branchScope: null })
  assert.deepEqual(company.groups, [{ fromRunId: null, employeeIds: [9] }])
  assert.equal(company.skipped.length, 0)
  // نطاق فرعين: موظف الفرع التاني جوه النطاق، وحساب غير مسند (نطاق فاضي) يتخطى الكل — مش «الكل»
  const twoBranches = m.splitPayrollBulkMembership([candidate(9, [], { branchId: 2 }), candidate(11, [], { branchId: 3 })], { targetRunId: 99, branchScope: [1, 2] })
  assert.deepEqual(twoBranches.groups, [{ fromRunId: null, employeeIds: [9] }])
  assert.deepEqual(twoBranches.skipped.map(row => [row.employeeId, row.skipCode]), [[11, 'OUT_OF_BRANCH_SCOPE']])
  const unassigned = m.splitPayrollBulkMembership([candidate(1, [])], { targetRunId: 99, branchScope: [] })
  assert.deepEqual(unassigned.groups, [])
  assert.deepEqual(unassigned.skipped.map(row => row.skipCode), ['OUT_OF_BRANCH_SCOPE'])
})
