'use strict'
// B2.11: قواعد الوظائف المعتمدة النقية، من غير قاعدة بيانات —
//  PQ-01) مين بيشغل مقعد (الحالة والوحدة).
//  PQ-02) أرقام الوظيفة: المعتمد والمشغول والشاغر والزيادة، للنشطة والمجمّدة والملغية.
//  PQ-03) حكم شغل مقعد: الفرع (نفس رد «غير موجودة»)، والقسم والفريق، والحالة، والشاغر مع الإنفاذ.
//  PQ-04) تنضيف مدخلات وظيفة جديدة، والميزانية، والعدد.
//  PQ-05) كود الوظيفة، وتطبيع المسمى ومفتاح التوليد.
// Run (من api/): node --test test/positions-rules.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/positions/position-rules')

const position = (extra = {}) => ({ branchId: 1, departmentId: 10, teamId: null, headcount: 2, status: 'ACTIVE', ...extra })

test('PQ-01: مين بيشغل مقعد — خدمته ماانتهتش، وفي وحدة الوظيفة', () => {
  for (const status of ['active', 'probation', 'notice_period', 'suspended']) assert.equal(rules.occupiesSeat(status), true, status)
  for (const status of ['terminated', 'archived']) assert.equal(rules.occupiesSeat(status), false, status)
  // حالة مش معروفة = شاغل (الأشد على الإنفاذ)
  for (const status of [null, undefined, '', 'something']) assert.equal(rules.occupiesSeat(status), true, String(status))
  const inUnit = (pos, employee) => rules.inPositionUnit(pos, employee)
  assert.equal(inUnit(position(), { branchId: 1, departmentId: 10, teamId: 5 }), true)
  assert.equal(inUnit(position(), { branchId: 1, departmentId: 11 }), false)
  assert.equal(inUnit(position(), { branchId: 2, departmentId: 10 }), false)
  assert.equal(inUnit(position(), { branchId: 1, departmentId: null }), false)
  // وظيفة على مستوى الفرع: أي قسم وأي فريق في الفرع
  assert.equal(inUnit(position({ departmentId: null }), { branchId: 1, departmentId: 99, teamId: 7 }), true)
  assert.equal(inUnit(position({ departmentId: null }), { branchId: 1 }), true)
  // وظيفة على فريق: الفريق نفسه بس
  assert.equal(inUnit(position({ teamId: 5 }), { branchId: 1, departmentId: 10, teamId: 5 }), true)
  assert.equal(inUnit(position({ teamId: 5 }), { branchId: 1, departmentId: 10, teamId: 6 }), false)
  assert.equal(inUnit(position({ teamId: 5 }), { branchId: 1, departmentId: 10 }), false)
  // من غير فرع: مش في أي وحدة
  assert.equal(inUnit(position({ departmentId: null }), { branchId: null }), false)
  assert.equal(inUnit(position({ departmentId: null }), {}), false)
})

test('PQ-02: أرقام الوظيفة — المعتمد والمشغول والشاغر والزيادة', () => {
  const counts = (pos, occupied) => (({ approved, vacant, over }) => [approved, occupied, vacant, over])(rules.seatCounts(pos, occupied))
  assert.deepEqual(counts(position({ headcount: 3 }), 0), [3, 0, 3, 0])
  assert.deepEqual(counts(position({ headcount: 3 }), 2), [3, 2, 1, 0])
  assert.deepEqual(counts(position({ headcount: 3 }), 3), [3, 3, 0, 0])
  assert.deepEqual(counts(position({ headcount: 3 }), 5), [3, 5, 0, 2])
  // المجمّدة: معتمدة ومن غير شاغر
  assert.deepEqual(counts(position({ headcount: 3, status: 'FROZEN' }), 1), [3, 1, 0, 0])
  assert.deepEqual(counts(position({ headcount: 3, status: 'FROZEN' }), 4), [3, 4, 0, 1])
  // الملغية: معتمدها صفر وكل شاغليها زيادة
  assert.deepEqual(counts(position({ headcount: 3, status: 'CANCELLED' }), 0), [0, 0, 0, 0])
  assert.deepEqual(counts(position({ headcount: 3, status: 'CANCELLED' }), 2), [0, 2, 0, 2])
  assert.equal(rules.seatCounts(position(), 1).occupied, 1)
})

test('PQ-03: حكم شغل مقعد — الفرع، والقسم والفريق، والحالة، والشاغر مع الإنفاذ', () => {
  const verdict = (pos, employee, occupied, enforce) => rules.seatVerdict(pos, employee, occupied, enforce)
  const employee = { branchId: 1, departmentId: 10, teamId: null }
  assert.equal(verdict(position(), employee, 0, false), null)
  assert.equal(verdict(position(), employee, 1, true), null)
  // مش موجودة، أو في فرع تاني: نفس الرد (مفيش كاشف لوظائف فرع تاني)
  const missing = { status: 400, message: 'الوظيفة المعتمدة غير موجودة في فرع الموظف' }
  assert.deepEqual(verdict(null, employee, 0, false), missing)
  assert.deepEqual(verdict(position({ branchId: 2 }), employee, 0, true), missing)
  assert.deepEqual(verdict(position({ departmentId: null }), { branchId: null }, 0, false), missing)
  // قسم أو فريق تاني
  const otherUnit = { status: 400, message: 'الوظيفة دي تبع قسم أو فريق غير اللي الموظف فيه' }
  assert.deepEqual(verdict(position({ departmentId: 11 }), employee, 0, false), otherUnit)
  assert.deepEqual(verdict(position({ teamId: 5 }), employee, 0, false), otherUnit)
  // مش نشطة: مرفوضة حتى من غير إنفاذ
  assert.deepEqual(verdict(position({ status: 'FROZEN' }), employee, 0, false), { status: 400, message: 'الوظيفة دي مجمّدة: مفيش تعيين عليها' })
  assert.deepEqual(verdict(position({ status: 'CANCELLED' }), employee, 0, true), { status: 400, message: 'الوظيفة دي ملغية: مفيش تعيين عليها' })
  // المليانة: مرفوضة مع الإنفاذ بس
  assert.equal(verdict(position(), employee, 2, false), null)
  assert.equal(verdict(position(), employee, 9, false), null)
  assert.deepEqual(verdict(position(), employee, 2, true), { status: 409, message: 'الوظيفة دي مليانة: معتمد لها 2 ومشغول 2' })
  assert.deepEqual(verdict(position(), employee, 3, true), { status: 409, message: 'الوظيفة دي مليانة: معتمد لها 2 ومشغول 3' })
  // الترتيب: الفرع قبل الوحدة قبل الحالة قبل الشاغر
  assert.deepEqual(verdict(position({ branchId: 2, departmentId: 11, status: 'FROZEN' }), employee, 9, true), missing)
  assert.deepEqual(verdict(position({ departmentId: 11, status: 'FROZEN' }), employee, 9, true), otherUnit)
})

test('PQ-04: تنضيف مدخلات وظيفة جديدة، والميزانية، والعدد', () => {
  const good = { jobTitleId: 3, branchId: 1, departmentId: 10, headcount: 2 }
  assert.deepEqual(rules.cleanNewPosition(good), { value: { jobTitleId: 3, gradeId: null, branchId: 1, departmentId: 10, teamId: null, costCenterId: null, headcount: 2, status: 'ACTIVE', budget: null } })
  assert.deepEqual(rules.cleanNewPosition({ ...good, teamId: 5, gradeId: 2, costCenterId: 4, status: 'FROZEN', budget: '1500.5' }).value,
    { jobTitleId: 3, gradeId: 2, branchId: 1, departmentId: 10, teamId: 5, costCenterId: 4, headcount: 2, status: 'FROZEN', budget: '1500.50' })
  const error = input => rules.cleanNewPosition(input).error
  assert.equal(error({ ...good, jobTitleId: undefined }), 'اختار المسمى الوظيفي من الكتالوج')
  assert.equal(error({ ...good, jobTitleId: 0 }), 'اختار المسمى الوظيفي من الكتالوج')
  assert.equal(error({ ...good, branchId: 'x' }), 'اختار فرع الوظيفة')
  assert.equal(error({ ...good, departmentId: null, teamId: 5 }), 'الفريق محتاج قسمه: اختار القسم الأول')
  for (const key of ['departmentId', 'teamId', 'gradeId', 'costCenterId']) assert.equal(error({ ...good, [key]: -1 }), 'رقم القسم أو الفريق أو الدرجة أو مركز التكلفة مش صحيح', key)
  for (const headcount of [0, -3, 1.5, 10001, '2', null, undefined]) assert.equal(error({ ...good, headcount }), 'العدد المعتمد رقم صحيح من 1 لـ10000', String(headcount))
  assert.equal(error({ ...good, status: 'OPEN' }), 'حالة الوظيفة: نشطة أو مجمّدة أو ملغية')
  assert.equal(error({ ...good, budget: '-1' }), 'الميزانية رقم مش سالب بخانتين عشريتين بالكتير')
  // الميزانية
  assert.deepEqual(rules.cleanBudget(null), { ok: true, value: null })
  assert.deepEqual(rules.cleanBudget(''), { ok: true, value: null })
  assert.deepEqual(rules.cleanBudget(0), { ok: true, value: '0.00' })
  assert.deepEqual(rules.cleanBudget(' 250 '), { ok: true, value: '250.00' })
  assert.deepEqual(rules.cleanBudget(1234.5), { ok: true, value: '1234.50' })
  assert.deepEqual(rules.cleanBudget('999999999999.99'), { ok: true, value: '999999999999.99' })
  for (const value of ['-1', '1.234', 'abc', '1e5', '1000000000000', {}, [], true]) assert.deepEqual(rules.cleanBudget(value), { ok: false }, String(value))
  // العدد
  assert.equal(rules.cleanHeadcount(1), 1)
  assert.equal(rules.cleanHeadcount(10000), 10000)
  for (const value of [0, 10001, 2.5, '3', null]) assert.equal(rules.cleanHeadcount(value), null, String(value))
  for (const status of ['ACTIVE', 'FROZEN', 'CANCELLED']) assert.equal(rules.isPositionStatus(status), true, status)
  for (const status of ['active', 'OPEN', null, 1]) assert.equal(rules.isPositionStatus(status), false, String(status))
})

test('PQ-05: كود الوظيفة، وتطبيع المسمى ومفتاح التوليد', () => {
  assert.equal(rules.positionCode(7), 'P-0007')
  assert.equal(rules.positionCode(12345), 'P-12345')
  assert.equal(rules.normalTitle('  محاسب   أول '), 'محاسب أول')
  for (const value of [null, undefined, 5, '   ']) assert.equal(rules.normalTitle(value), '', String(value))
  assert.equal(rules.generationKey(1, 10, 'محاسب'), '1:10:محاسب')
  assert.equal(rules.generationKey(1, null, 'محاسب'), '1:0:محاسب')
  assert.notEqual(rules.generationKey(1, 10, 'محاسب'), rules.generationKey(2, 10, 'محاسب'))
})
