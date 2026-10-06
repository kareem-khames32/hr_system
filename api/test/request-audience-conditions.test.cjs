'use strict'
// B2.9-أ: شروط صفات الموظف في جمهور نوع الطلب — المقيّم نفسه (request-audience.ts)، اختبارات نقية من غير قاعدة بيانات.
//  AC-01) «السعوديين على عقد محدد المدة»: للي ينطبق عليه بس؛ والمالك برّه القيد، وبانِي الأنواع بيشوف ومايقدّمش.
//  AC-02) كل شرط لوحده: الجنسية بمصنّفها، ونوع العقد، والدرجة، وتاريخ التعيين (قبل / من).
//  AC-03) الشرط قيد: موضوع من غير صفات، وشرط تالف أو مش معروف = مش من الجمهور؛ ومن غير شروط الشكل القديم زي ما هو.
//  AC-04) الصفات بتتحط على الموضوع لما صف الموظف شايلها بس؛ و«مين» و«فين» لازم يتحققوا مع الشروط.
// Run (من api/): node --test test/request-audience-conditions.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const audience = require('../src/requests/request-audience')

const json = value => JSON.stringify(value)
const allows = (visibleTo, subject, purpose = 'submit') => audience.requestAudienceAllows(visibleTo, subject, purpose)
const subject = (attributes, over = {}) => ({ role: 'employee', permissions: [], employeeId: 7, departmentId: 3, teamId: null, branchId: 1, positions: {},
  ...(attributes === undefined ? {} : { attributes }), ...over })
const person = (over = {}) => ({ nationality: 'سعودي', contractType: 'fixed_term', gradeId: 3, joinDate: '2024-06-15', ...over })
const only = condition => json({ mode: 'all', ids: [], conditions: [condition] })
const SAUDI_FIXED = json({ mode: 'all', ids: [], conditions: [{ field: 'nationality', values: ['SAUDI'] }, { field: 'contractType', values: ['fixed_term'] }] })

test('AC-01: «السعوديين على عقد محدد المدة» — للي ينطبق عليه بس؛ والمالك برّه القيد، وبانِي الأنواع بيشوف ومايقدّمش', () => {
  const people = [person(), person({ contractType: 'permanent' }), person({ nationality: 'مصري' }), person({ nationality: 'هندي', contractType: 'permanent' })]
  assert.deepEqual(people.map(one => allows(SAUDI_FIXED, subject(one))), [true, false, false, false])
  // كتابات الجنسية كلها بمصنّفها الموجود
  for (const nationality of ['سعودية', 'Saudi', ' KSA ']) assert.equal(allows(SAUDI_FIXED, subject(person({ nationality }))), true, nationality)
  const other = person({ nationality: 'مصري' })
  assert.equal(allows(SAUDI_FIXED, subject(other, { role: 'super_admin' })), true)
  assert.equal(allows(SAUDI_FIXED, subject(other, { permissions: ['*'] })), true)
  const builder = subject(other, { permissions: ['request_types.manage'] })
  assert.deepEqual([allows(SAUDI_FIXED, builder, 'catalog'), allows(SAUDI_FIXED, builder, 'submit')], [true, false])
})

test('AC-02: كل شرط لوحده — الجنسية، ونوع العقد، والدرجة، وتاريخ التعيين', () => {
  const foreign = only({ field: 'nationality', values: ['EGYPTIAN', 'RESIDENT'] })
  assert.deepEqual(['سعودي', 'مصري', 'هندي', '', 'أخرى', null].map(nationality => allows(foreign, subject(person({ nationality })))), [false, true, true, false, false, false])
  const contract = only({ field: 'contractType', values: ['permanent', 'seasonal'] })
  assert.deepEqual(['permanent', 'seasonal', 'fixed_term', 'part_time', null].map(contractType => allows(contract, subject(person({ contractType })))), [true, true, false, false, false])
  const grade = only({ field: 'grade', values: [3, '5'] })
  assert.deepEqual([3, 5, 4, null].map(gradeId => allows(grade, subject(person({ gradeId })))), [true, true, false, false])
  const before = only({ field: 'joinDate', op: 'before', value: '2024-06-15' }), from = only({ field: 'joinDate', op: 'from', value: '2024-06-15' })
  assert.deepEqual(['2024-06-14', '2024-06-15', '2024-06-16', null].map(joinDate => [allows(before, subject(person({ joinDate }))), allows(from, subject(person({ joinDate })))]),
    [[true, false], [false, true], [false, true], [false, false]])
})

test('AC-03: الشرط قيد — موضوع من غير صفات، وشرط تالف أو مش معروف = مش من الجمهور؛ ومن غير شروط الشكل القديم زي ما هو', () => {
  // حساب من غير موظف، أو صف اتقري من غير الصفات
  assert.deepEqual([allows(SAUDI_FIXED, subject(undefined)), allows(SAUDI_FIXED, subject(null))], [false, false])
  const broken = [{ field: 'religion', values: ['x'] }, { values: ['SAUDI'] }, { field: 'nationality' }, { field: 'nationality', values: 'SAUDI' },
    { field: 'joinDate', op: 'after', value: '2024-01-01' }, { field: 'joinDate', op: 'from', value: 'bad' }, { field: 'joinDate', value: '2024-01-01' }, null, 'x']
  for (const condition of broken) assert.equal(allows(only(condition), subject(person())), false, json(condition))
  // قيمة مش قايمة = شرط تالف
  for (const conditions of ['x', {}, 5]) assert.equal(allows(json({ mode: 'all', ids: [], conditions }), subject(person())), false, json(conditions))
  // غايبة أو فاضية = من غير شروط
  for (const visibleTo of [json({ mode: 'all', ids: [] }), json({ mode: 'all', ids: [], conditions: null }), json({ mode: 'all', ids: [], conditions: [] }), null, 'not json']) {
    assert.equal(allows(visibleTo, subject(undefined)), true, String(visibleTo))
  }
  assert.deepEqual([SAUDI_FIXED, json({ mode: 'all', ids: [] }), json({ mode: 'all', ids: [], conditions: [] }), null].map(audience.audienceHasConditions), [true, false, false, false])
  assert.deepEqual([SAUDI_FIXED, json({ mode: 'all', ids: [], conditions: [] })].map(audience.audienceNeedsEmployee), [true, false])
})

test('AC-04: الصفات بتتحط على الموضوع لما صف الموظف شايلها بس؛ و«مين» و«فين» لازم يتحققوا مع الشروط', () => {
  const user = { sub: 1, role: 'employee', permissions: [], employeeId: 7, branchId: 1 }
  assert.deepEqual(audience.audienceSubjectOf(user, { departmentId: 3, teamId: 40, branchId: 1 }),
    { role: 'employee', permissions: [], employeeId: 7, departmentId: 3, teamId: 40, branchId: 1 })
  assert.deepEqual(audience.audienceSubjectOf(user, { departmentId: 3, teamId: 40, branchId: 1, nationality: 'سعودي', contractType: 'fixed_term', gradeId: null, joinDate: '2024-06-15' }).attributes,
    { nationality: 'سعودي', contractType: 'fixed_term', gradeId: null, joinDate: '2024-06-15' })
  assert.deepEqual(audience.audienceSubjectOf(user, { branchId: 1, gradeId: 2 }).attributes, { nationality: null, contractType: null, gradeId: 2, joinDate: null })
  assert.equal(audience.audienceSubjectOf(user, null).attributes, undefined)
  // صف اتقري من غير الصفات = أي شرط مابيتحققش
  assert.equal(allows(SAUDI_FIXED, audience.audienceSubjectOf(user, { departmentId: 3, branchId: 1 })), false)
  assert.equal(allows(SAUDI_FIXED, audience.audienceSubjectOf(user, { departmentId: 3, branchId: 1, nationality: 'سعودي', contractType: 'fixed_term' })), true)
  // مين + فين + الشروط
  const narrow = json({ mode: 'roles', ids: ['hr_manager'], where: { mode: 'branches', ids: [1] }, conditions: [{ field: 'nationality', values: ['SAUDI'] }] })
  const subjects = [subject(person(), { role: 'hr_manager' }), subject(person(), { role: 'employee' }), subject(person(), { role: 'hr_manager', branchId: 2 }), subject(person({ nationality: 'مصري' }), { role: 'hr_manager' })]
  assert.deepEqual(subjects.map(one => allows(narrow, one)), [true, false, false, false])
  assert.deepEqual([[...audience.AUDIENCE_NATIONALITY_KINDS], [...audience.AUDIENCE_CONTRACT_TYPES], [...audience.AUDIENCE_JOIN_DATE_OPS]],
    [['SAUDI', 'EGYPTIAN', 'RESIDENT'], ['permanent', 'fixed_term', 'part_time', 'seasonal'], ['before', 'from']])
})
