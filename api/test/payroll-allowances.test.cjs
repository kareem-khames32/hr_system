// «تابة البدلات» — الاستهداف (شركة ← فرع ← أقسام ← فرق ← موظفين) وحساب السطور، والمبلغ والاسم والكود، وحالة السطر، بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const a = require('../src/payroll/allowances-grants')

const employees = [
  { id: 1, branchId: 10, departmentId: 100, teamId: 1000, status: 'active' },
  { id: 2, branchId: 10, departmentId: 100, teamId: 1001, status: 'probation' },
  { id: 3, branchId: 10, departmentId: 101, teamId: null, status: 'active' },
  { id: 4, branchId: 20, departmentId: 200, teamId: 2000, status: 'active' },
  { id: 5, branchId: 10, departmentId: 100, teamId: 1000, status: 'terminated' },
  { id: 6, branchId: 20, departmentId: 200, teamId: 2000, status: 'active', isActive: false },
  { id: 7, branchId: null, departmentId: null, teamId: null, status: 'suspended' },
]
const target = (overrides = {}) => ({ level: 'company', branchId: null, departmentIds: [], teamIds: [], employeeIds: [], ...overrides })

test('الشركة كلها: كل الشغالين في أي فرع (واللي ساب الشغل أو متوقف حسابه برا)', () => {
  assert.deepEqual(a.resolveAllowanceTargetEmployees(target(), employees), [1, 2, 3, 4, 7])
})

test('الفرع: موظفين الفرع بس، ومن غير فرع مفيش حد', () => {
  assert.deepEqual(a.resolveAllowanceTargetEmployees(target({ level: 'branch', branchId: 10 }), employees), [1, 2, 3])
  assert.deepEqual(a.resolveAllowanceTargetEmployees(target({ level: 'branch', branchId: 20 }), employees), [4])
  assert.deepEqual(a.resolveAllowanceTargetEmployees(target({ level: 'branch', branchId: null }), employees), [])
})

test('الأقسام والفرق جوه فرع الاستهداف بس', () => {
  assert.deepEqual(a.resolveAllowanceTargetEmployees(target({ level: 'departments', branchId: 10, departmentIds: [100] }), employees), [1, 2])
  assert.deepEqual(a.resolveAllowanceTargetEmployees(target({ level: 'departments', branchId: 10, departmentIds: [100, 101] }), employees), [1, 2, 3])
  // قسم فرع تاني مع فرع غلط ما يجيبش حد
  assert.deepEqual(a.resolveAllowanceTargetEmployees(target({ level: 'departments', branchId: 10, departmentIds: [200] }), employees), [])
  assert.deepEqual(a.resolveAllowanceTargetEmployees(target({ level: 'teams', branchId: 10, teamIds: [1000] }), employees), [1])
  assert.deepEqual(a.resolveAllowanceTargetEmployees(target({ level: 'teams', branchId: 20, teamIds: [1000] }), employees), [])
})

test('الموظفين بالاسم جوه الفرع، من غير تكرار ومرتبين', () => {
  assert.deepEqual(a.resolveAllowanceTargetEmployees(target({ level: 'employees', branchId: 10, employeeIds: [3, 1, 3, 4, 5] }), employees), [1, 3])
  assert.deepEqual(a.resolveAllowanceTargetEmployees(target({ level: 'costCenters', branchId: 10, employeeIds: [1] }), employees), [])
})

test('مبلغ البدل: موجب بمنزلتين بحد أقصى ومن غير تقريب صامت', () => {
  assert.equal(a.allowanceAmount('150'), '150.00')
  assert.equal(a.allowanceAmount('150.5'), '150.50')
  assert.equal(a.allowanceAmount(99.99), '99.99')
  for (const bad of ['0', '-5', '1.234', 'abc', '', null, undefined, Number.NaN, '1000000.01']) assert.throws(() => a.allowanceAmount(bad), undefined, String(bad))
  assert.equal(a.allowanceAmount('1000000'), '1000000.00')
})

test('اسم البدل والكود: بدل العطلات محجوز لأوامر الشغل، والكود بيتولد لو فاضي', () => {
  assert.equal(a.allowanceTypeName('  بدل   انتقالات إضافي '), 'بدل انتقالات إضافي')
  assert.throws(() => a.allowanceTypeName('بدل دوام أيام العطلات'), /أوامر الشغل/)
  assert.throws(() => a.allowanceTypeName(' '), /اسم البدل/)
  assert.equal(a.allowanceTypeCode(' transport_x ', () => 'GEN'), 'TRANSPORT_X')
  assert.equal(a.allowanceTypeCode('', () => 'GEN'), 'GEN')
  assert.throws(() => a.allowanceTypeCode('بدل', () => 'GEN'), /الكود/)
})

test('أرقام قيود الدفتر من نافذة التفصيل', () => {
  assert.deepEqual(a.parseObligationIdWindow('12,5,12],"obligationLines":[{"id":5}]'), [5, 12])
  assert.deepEqual(a.parseObligationIdWindow('],"x":1'), [])
  assert.deepEqual(a.parseObligationIdWindow(null), [])
  assert.deepEqual(a.parseObligationIdWindow('{"id":1}]'), [])
})

test('حالة السطر: ملغى، اتصرف/اتعكس، في مسير معتمد، محسوب أو محتاج إعادة حساب، مستني', () => {
  const pending = { status: 'PENDING', reservedPayrollRunId: null, appliedPayrollRunId: null, payrollReversalRunId: null }
  assert.deepEqual(a.allowanceLineState({ lineStatus: 'CANCELLED', obligation: pending, openRun: null }), { state: 'CANCELLED', runId: null })
  assert.deepEqual(a.allowanceLineState({ lineStatus: 'ACTIVE', obligation: { ...pending, status: 'APPLIED', appliedPayrollRunId: 9 }, openRun: null }), { state: 'PAID', runId: 9 })
  assert.deepEqual(a.allowanceLineState({ lineStatus: 'ACTIVE', obligation: { ...pending, status: 'APPLIED', appliedPayrollRunId: 9, payrollReversalRunId: 11 }, openRun: null }).state, 'REVERSED')
  assert.deepEqual(a.allowanceLineState({ lineStatus: 'ACTIVE', obligation: { ...pending, reservedPayrollRunId: 8 }, openRun: { id: 3, includesObligation: true } }), { state: 'APPROVED', runId: 8 })
  assert.deepEqual(a.allowanceLineState({ lineStatus: 'ACTIVE', obligation: pending, openRun: { id: 3, includesObligation: true } }), { state: 'IN_RUN', runId: 3 })
  assert.deepEqual(a.allowanceLineState({ lineStatus: 'ACTIVE', obligation: pending, openRun: { id: 3, includesObligation: false } }), { state: 'NEEDS_RECALC', runId: 3 })
  assert.deepEqual(a.allowanceLineState({ lineStatus: 'ACTIVE', obligation: pending, openRun: null }), { state: 'PENDING', runId: null })
  assert.equal(a.allowanceLineCancellable('IN_RUN'), true)
  assert.equal(a.allowanceLineCancellable('APPROVED'), false)
  assert.equal(a.allowanceLineCancellable('PAID'), false)
})
