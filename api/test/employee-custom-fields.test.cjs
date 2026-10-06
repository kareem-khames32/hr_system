'use strict'
// B2.9-ب: قواعد الحقول المخصصة على ملف الموظف (من غير قاعدة):
//  CF-01) قيمة الشاشة ← أعمدة التخزين لكل نوع، والقيمة الغلط برسالتها، والفاضي = من غير قيمة.
//  CF-02) أعمدة التخزين ← قيمة الرد لكل نوع.
//  CF-03) اختيارات القايمة: لنوع «اختيار» بس، من غير تكرار ولا فاضي، وبحدودها.
//  CF-04) شرط الجمهور بالحقل المخصص: قيمة الموظف من القايمة؛ ومن غير قيمة أو من غير قراءة = مش من الجمهور؛ وأسماء Object مش مفاتيح؛
//         وصفات الموضوع من غير قيم مخصصة شكلها زي ما هو.
// Run (من api/): node --test test/employee-custom-fields.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const rules = require('../src/employees/employee-custom-fields')
const audience = require('../src/requests/request-audience')

const field = (type, options) => ({ label: 'حقل', type, options: options ? JSON.stringify(options) : null })
const NONE = { textValue: null, numberValue: null, dateValue: null }
const refused = (type, raw, message, options) => assert.throws(() => rules.customValueColumns(field(type, options), raw), { message: `«حقل»: ${message}` }, `${type} ${JSON.stringify(raw)}`)

test('CF-01: قيمة الشاشة ← أعمدة التخزين لكل نوع، والغلط برسالته، والفاضي من غير قيمة', () => {
  assert.deepEqual(rules.CUSTOM_FIELD_TYPES, ['TEXT', 'NUMBER', 'DATE', 'CHOICE', 'YESNO'])
  for (const type of rules.CUSTOM_FIELD_TYPES) for (const empty of [null, undefined, '', '   ']) assert.equal(rules.customValueColumns(field(type, ['a']), empty), null, `${type} ${JSON.stringify(empty)}`)
  assert.deepEqual(rules.customValueColumns(field('TEXT'), '  أبو علي '), { ...NONE, textValue: 'أبو علي' })
  assert.deepEqual(rules.customValueColumns(field('TEXT'), 'ن'.repeat(500)).textValue.length, 500)
  for (const raw of ['ن'.repeat(501), 5, true, ['x'], {}]) refused('TEXT', raw, 'نص بحد أقصى 500 حرف')
  assert.deepEqual([rules.customValueColumns(field('NUMBER'), '12.5'), rules.customValueColumns(field('NUMBER'), 7), rules.customValueColumns(field('NUMBER'), ' -3 '), rules.customValueColumns(field('NUMBER'), '0.1234')],
    [{ ...NONE, numberValue: 12.5 }, { ...NONE, numberValue: 7 }, { ...NONE, numberValue: -3 }, { ...NONE, numberValue: 0.1234 }])
  for (const raw of ['1e5', '12.34567', 'abc', '1,5', '٥', 1e14, -1e14, NaN, Infinity, true, [1]]) refused('NUMBER', raw, 'رقم غير صحيح')
  assert.deepEqual(rules.customValueColumns(field('DATE'), ' 2028-02-29 '), { ...NONE, dateValue: '2028-02-29' })
  for (const raw of ['2027-02-29', '2027-13-01', '31/01/2027', '2027-1-5', 20270131, new Date('2027-01-31')]) refused('DATE', raw, 'تاريخ غير صحيح')
  assert.deepEqual(rules.customValueColumns(field('CHOICE', ['S', 'M']), ' M '), { ...NONE, textValue: 'M' })
  for (const raw of ['XL', 'm', 1, true]) refused('CHOICE', raw, 'اختار قيمة من القايمة', ['S', 'M'])
  // حقل اختيار قايمته تالفة: ولا قيمة مقبولة
  assert.throws(() => rules.customValueColumns({ label: 'حقل', type: 'CHOICE', options: '{oops' }, 'S'), { message: '«حقل»: اختار قيمة من القايمة' })
  assert.deepEqual([true, 'yes', false, 'no'].map(raw => rules.customValueColumns(field('YESNO'), raw).numberValue), [1, 1, 0, 0])
  for (const raw of ['maybe', 'true', 1, 0, 'نعم']) refused('YESNO', raw, 'نعم أو لا')
  refused('FILE', 'x', 'نوع الحقل غير معروف')
})

test('CF-02: أعمدة التخزين ← قيمة الرد لكل نوع', () => {
  assert.equal(rules.customValueOf({ type: 'TEXT' }, undefined), null)
  assert.deepEqual([rules.customValueOf({ type: 'TEXT' }, { ...NONE, textValue: 'نص' }), rules.customValueOf({ type: 'CHOICE' }, { ...NONE, textValue: 'M' })], ['نص', 'M'])
  // الرقم بيرجع من القاعدة نص عشري
  assert.deepEqual([rules.customValueOf({ type: 'NUMBER' }, { ...NONE, numberValue: '12.5000' }), rules.customValueOf({ type: 'NUMBER' }, { ...NONE, numberValue: 0 }), rules.customValueOf({ type: 'NUMBER' }, NONE)], [12.5, 0, null])
  assert.deepEqual([rules.customValueOf({ type: 'YESNO' }, { ...NONE, numberValue: '1.0000' }), rules.customValueOf({ type: 'YESNO' }, { ...NONE, numberValue: 0 }), rules.customValueOf({ type: 'YESNO' }, NONE)], [true, false, null])
  assert.deepEqual([rules.customValueOf({ type: 'DATE' }, { ...NONE, dateValue: '2027-01-31' }), rules.customValueOf({ type: 'DATE' }, NONE)], ['2027-01-31', null])
})

test('CF-03: اختيارات القايمة — لنوع «اختيار» بس، من غير تكرار ولا فاضي، وبحدودها؛ والمفتاح بقاعدته', () => {
  for (const type of ['TEXT', 'NUMBER', 'DATE', 'YESNO']) assert.equal(rules.cleanCustomFieldOptions(type, ['a', 'b']), null)
  assert.equal(rules.cleanCustomFieldOptions('CHOICE', [' S ', 'M', 'M', '', '  ', 5, 'L']), '["S","M","L"]')
  for (const raw of [[], undefined, 'S', [' ', ''], [1, 2]]) assert.throws(() => rules.cleanCustomFieldOptions('CHOICE', raw), { message: 'حقل «اختيار» محتاج اختيار واحد على الأقل' })
  assert.equal(JSON.parse(rules.cleanCustomFieldOptions('CHOICE', Array.from({ length: 30 }, (_, index) => `اختيار ${index}`))).length, 30)
  for (const raw of [Array.from({ length: 31 }, (_, index) => `اختيار ${index}`), ['ن'.repeat(101)]]) assert.throws(() => rules.cleanCustomFieldOptions('CHOICE', raw), { message: 'الاختيارات بحد أقصى 30، وكل اختيار 100 حرف' })
  assert.deepEqual([rules.customFieldOptions({ options: '["S",1,"M",null]' }), rules.customFieldOptions({ options: '{oops' }), rules.customFieldOptions({ options: '"S"' }), rules.customFieldOptions({ options: null })], [['S', 'M'], [], [], []])
  assert.deepEqual(['uniform_size', 'a1', 'x'.repeat(40)].map(key => rules.CUSTOM_FIELD_KEY.test(key)), [true, true, true])
  assert.deepEqual(['a', 'x'.repeat(41), 'Uniform', '1size', 'size-x', 'size x', '', '_size', 'مقاس'].map(key => rules.CUSTOM_FIELD_KEY.test(key)), Array(9).fill(false))
})

test('CF-04: شرط الجمهور بالحقل المخصص — قيمة الموظف من القايمة، ومن غير قيمة أو قراءة مش من الجمهور', () => {
  const sized = values => JSON.stringify({ mode: 'all', ids: [], conditions: [{ field: 'custom', key: 'uniform_size', values }] })
  const subject = customValues => ({ role: 'employee', permissions: [], employeeId: 7, attributes: { nationality: 'سعودي', contractType: 'permanent', gradeId: null, joinDate: '2020-01-01', ...(customValues === undefined ? {} : { customValues }) } })
  const allows = (visibleTo, who) => audience.requestAudienceAllows(visibleTo, who, 'submit')
  assert.deepEqual([{ uniform_size: 'M' }, { uniform_size: 'L' }, { uniform_size: 'XL' }, { other: 'M' }, {}, null, undefined].map(values => allows(sized(['M', 'L']), subject(values))), [true, true, false, false, false, false, false])
  // موضوع من غير صفات خالص (حساب من غير موظف): برّه
  assert.equal(allows(sized(['M']), { role: 'employee', permissions: [], employeeId: null }), false)
  // شرط تالف: من غير مفتاح، أو مفتاح مش نص، أو قيم مش قايمة، أو اسم من أسماء Object
  for (const condition of [{ field: 'custom', values: ['M'] }, { field: 'custom', key: 5, values: ['M'] }, { field: 'custom', key: 'uniform_size', values: 'M' }, { field: 'custom', key: 'uniform_size' },
    { field: 'custom', key: 'constructor', values: ['function Object() { [native code] }'] }, { field: 'custom', key: '__proto__', values: ['[object Object]'] }, { field: 'custom', key: 'toString', values: ['x'] }]) {
    assert.equal(allows(JSON.stringify({ mode: 'all', ids: [], conditions: [condition] }), subject({ uniform_size: 'M' })), false, JSON.stringify(condition))
  }
  // قيمة متخزّنة مش نص مابتطابقش
  assert.equal(allows(sized(['1']), subject({ uniform_size: 1 })), false)
  // مع شرط تاني: الاتنين لازم يتحققوا
  const both = JSON.stringify({ mode: 'all', ids: [], conditions: [{ field: 'nationality', values: ['EGYPTIAN'] }, { field: 'custom', key: 'uniform_size', values: ['M'] }] })
  assert.equal(allows(both, subject({ uniform_size: 'M' })), false)
  assert.equal(allows(both, { ...subject({ uniform_size: 'M' }), attributes: { ...subject({ uniform_size: 'M' }).attributes, nationality: 'مصري' } }), true)
  // المالك برّه القيد زي الأول
  assert.equal(allows(sized(['M']), { role: 'super_admin', permissions: [] }), true)
  // مين محتاج قراءة قيم الحقول: جمهور فيه شرط حقل مخصص بس
  assert.deepEqual([sized(['M']), both, JSON.stringify({ mode: 'all', ids: [], conditions: [{ field: 'nationality', values: ['SAUDI'] }] }), JSON.stringify({ mode: 'all', ids: [] }),
    JSON.stringify({ mode: 'all', ids: [], conditions: 'x' }), JSON.stringify({ mode: 'all', ids: [], conditions: [null] }), '{oops', null].map(audience.audienceNeedsCustomValues), [true, true, false, false, false, false, false, false])
  // صفات الموضوع: القيم المخصصة بتتحط لما الصف شايلها بس، ومن غيرها الشكل زي ما هو بالحرف
  const user = { sub: 1, role: 'employee', permissions: [], employeeId: 7, branchId: 2 }
  const row = { departmentId: 3, teamId: 4, branchId: 2, nationality: 'سعودي', contractType: 'permanent', gradeId: 5, joinDate: '2020-01-01' }
  assert.deepEqual(audience.audienceSubjectOf(user, row).attributes, { nationality: 'سعودي', contractType: 'permanent', gradeId: 5, joinDate: '2020-01-01' })
  assert.deepEqual(audience.audienceSubjectOf(user, { ...row, customValues: { uniform_size: 'M' } }).attributes, { nationality: 'سعودي', contractType: 'permanent', gradeId: 5, joinDate: '2020-01-01', customValues: { uniform_size: 'M' } })
  assert.equal('attributes' in audience.audienceSubjectOf(user, { departmentId: 3, teamId: 4, branchId: 2 }), false)
})
