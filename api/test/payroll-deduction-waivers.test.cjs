// «شيل خصم» (تبويب الاستقطاعات في شاشة المسير) — مطابقة النوع والاستهداف وتطبيقه على مبالغ الحساب، بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const w = require('../src/payroll/payroll-deduction-waivers')

const org = (overrides = {}) => ({ employeeId: 10, branchId: 1, departmentId: 5, teamId: 7, ...overrides })
const rule = (overrides = {}) => ({ kind: 'LATENESS', targetLevel: 'company', branchId: null, targetIds: [], ...overrides })

test('الشركة كلها بتطابق أي موظف في أي فرع', () => {
  assert.equal(w.deductionWaiverMatches(rule(), org()), true)
  assert.equal(w.deductionWaiverMatches(rule(), org({ branchId: 99, departmentId: null, teamId: null })), true)
})

test('الفرع بيطابق موظفين الفرع بس', () => {
  assert.equal(w.deductionWaiverMatches(rule({ targetLevel: 'branch', branchId: 1 }), org()), true)
  assert.equal(w.deductionWaiverMatches(rule({ targetLevel: 'branch', branchId: 2 }), org()), false)
  assert.equal(w.deductionWaiverMatches(rule({ targetLevel: 'branch', branchId: null }), org()), false)
})

test('الأقسام والفرق جوه فرع القاعدة بس', () => {
  assert.equal(w.deductionWaiverMatches(rule({ targetLevel: 'departments', branchId: 1, targetIds: [5, 6] }), org()), true)
  assert.equal(w.deductionWaiverMatches(rule({ targetLevel: 'departments', branchId: 1, targetIds: [6] }), org()), false)
  // نفس رقم القسم بس الموظف اتنقل لفرع تاني
  assert.equal(w.deductionWaiverMatches(rule({ targetLevel: 'departments', branchId: 1, targetIds: [5] }), org({ branchId: 2 })), false)
  assert.equal(w.deductionWaiverMatches(rule({ targetLevel: 'departments', branchId: 1, targetIds: [5] }), org({ departmentId: null })), false)
  assert.equal(w.deductionWaiverMatches(rule({ targetLevel: 'teams', branchId: 1, targetIds: [7] }), org()), true)
  assert.equal(w.deductionWaiverMatches(rule({ targetLevel: 'teams', branchId: 1, targetIds: [8] }), org()), false)
  assert.equal(w.deductionWaiverMatches(rule({ targetLevel: 'teams', branchId: 3, targetIds: [7] }), org()), false)
  assert.equal(w.deductionWaiverMatches(rule({ targetLevel: 'teams', branchId: 1, targetIds: [7] }), org({ teamId: null })), false)
})

test('الموظفين بالاسم، ومستوى غير معروف ما يطابقش', () => {
  assert.equal(w.deductionWaiverMatches(rule({ targetLevel: 'employees', branchId: 1, targetIds: [10] }), org()), true)
  assert.equal(w.deductionWaiverMatches(rule({ targetLevel: 'employees', branchId: 1, targetIds: [11] }), org()), false)
  assert.equal(w.deductionWaiverMatches(rule({ targetLevel: 'costCenters', branchId: 1, targetIds: [10] }), org()), false)
})

test('الأنواع المشالة: كل قاعدة مطابقة بنوعها، والنوع الغلط يتجاهل', () => {
  const kinds = w.waivedDeductionKinds([
    rule({ kind: 'ABSENCE' }),
    rule({ kind: 'LOAN', targetLevel: 'teams', branchId: 1, targetIds: [7] }),
    rule({ kind: 'SICK_LEAVE', targetLevel: 'departments', branchId: 2, targetIds: [5] }),
    rule({ kind: 'BONUS', targetLevel: 'company' }),
  ], org())
  assert.deepEqual([...kinds].sort(), ['ABSENCE', 'LOAN'])
  assert.equal(w.waivedDeductionKinds([], org()).size, 0)
})

test('يوم الحضور: التأخير ومعاه الإذن، والخروج المبكر على الثابتة ونقص الساعات على المرنة', () => {
  const day = { date: '2026-09-01', latenessAmount: 10, permissionAmount: 2.5, shortfallAmount: 7.25, totalAmount: 19.75 }
  assert.equal(w.waiveAttendanceDeductionDay(day, new Set(), true), day)
  assert.deepEqual(w.waiveAttendanceDeductionDay(day, new Set(['LATENESS']), true),
    { ...day, latenessAmount: 0, permissionAmount: 0, totalAmount: 7.25 })
  assert.deepEqual(w.waiveAttendanceDeductionDay(day, new Set(['EARLY_LEAVE']), true), { ...day, shortfallAmount: 0, totalAmount: 12.5 })
  assert.equal(w.waiveAttendanceDeductionDay(day, new Set(['EARLY_LEAVE']), false), day)
  assert.deepEqual(w.waiveAttendanceDeductionDay(day, new Set(['SHORTFALL']), false), { ...day, shortfallAmount: 0, totalAmount: 12.5 })
  assert.equal(w.waiveAttendanceDeductionDay(day, new Set(['SHORTFALL']), true), day)
})

test('قيود الدفتر: المسجلة والأخرى بتتشال، والإضافات لا', () => {
  const rows = [
    { id: 1, type: 'DEBIT', deductionRequestId: 44 },
    { id: 2, type: 'DEBIT', deductionRequestId: null },
    { id: 3, type: 'CREDIT', deductionRequestId: null },
  ]
  assert.deepEqual(w.withoutWaivedObligations(rows, new Set(['TYPED_DEDUCTION'])).map(row => row.id), [2, 3])
  assert.deepEqual(w.withoutWaivedObligations(rows, new Set(['OTHER'])).map(row => row.id), [1, 3])
  assert.deepEqual(w.withoutWaivedObligations(rows, new Set(['ABSENCE'])).map(row => row.id), [1, 2, 3])
})

test('مجاميع ظل الحضور بنفس القرار، والنقص يتصفر بس لما النوعين مشالين', () => {
  const totals = { lateness: '5.00', shortfall: '3.00', absence: '100.00' }
  assert.deepEqual(w.waivePolicyShadowTotals(totals, new Set(['LATENESS', 'ABSENCE'])), { lateness: '0.00', shortfall: '3.00', absence: '0.00' })
  assert.deepEqual(w.waivePolicyShadowTotals(totals, new Set(['EARLY_LEAVE'])), totals)
  assert.deepEqual(w.waivePolicyShadowTotals(totals, new Set(['EARLY_LEAVE', 'SHORTFALL'])).shortfall, '0.00')
})

test('أرقام الاستهداف المحفوظة JSON', () => {
  assert.deepEqual(w.parseWaiverTargetIds('[3,"4",0,-1,"x"]'), [3, 4])
  assert.deepEqual(w.parseWaiverTargetIds('bad'), [])
  assert.deepEqual(w.parseWaiverTargetIds(null), [])
})

test('الحساب موصول بالقاعدة: الخدمة بتقرا القواعد وتطبقها على كل نوع', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'payroll', 'payroll.service.ts'), 'utf8')
  assert.match(source, /readActiveDeductionWaivers\(em, run\.period\)/)
  for (const kind of ['ABSENCE', 'UNPAID_LEAVE', 'SICK_LEAVE', 'SUSPENSION', 'LOAN', 'SOCIAL_INSURANCE']) {
    assert.match(source, new RegExp(`waived\\.has\\('${kind}'\\)`), kind)
  }
  assert.match(source, /withoutWaivedObligations\(/)
  assert.match(source, /waiveAttendanceDeductionDay\(/)
  const migration = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'migrations', 'payroll', '20260916_048_payroll_deduction_waivers.sql'), 'utf8')
  assert.match(migration, /IF OBJECT_ID\(N'dbo\.payroll_deduction_waivers', N'U'\) IS NULL/)
  assert.doesNotMatch(migration.replace(/^--.*$/gm, ''), /\bDROP\b|\bDELETE\b|\bUPDATE\b/)
})
