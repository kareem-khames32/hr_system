const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.resolve(__dirname, '../tsconfig.json'), transpileOnly: true })
const { validateHrFields, validateHrContent, validateHrValues, resolveHrContent, hrContentVariables } = require('../src/hr-documents/hr-document-content')
const draft = body => ({ title: 'نموذج اختبار', greeting: '', body, closing: '', footer: '' })

test('HR content accepts exactly the configured custom keys and rejects malformed or unauthorized placeholders', () => {
  const fields = validateHrFields([{ key: 'custom.reference', label: 'مرجع خارجي', required: true }])
  const content = validateHrContent(draft('مرجع {{custom.reference}} والعقد {{contract.number}}'), fields)
  assert.deepEqual([...hrContentVariables(content)], ['custom.reference', 'contract.number'])
  for (const body of ['بيانات {{employee.iban}}', 'بيانات {{custom.unconfigured}}', 'بيانات {{company.name}', 'بيانات {{employee.fullName}} }}', 'بيانات {{constructor}}']) {
    assert.throws(() => validateHrContent(draft(body), fields))
  }
  assert.throws(() => validateHrContent({ ...draft('نص عادي وصالح'), script: 'alert(1)' }, []))
})

test('HR custom fields have bounded unique keys, explicit required flags and text-only values', () => {
  const fields = validateHrFields([{ key: 'custom.reference', label: '  المرجع  ', required: true }, { key: 'custom.note', label: 'ملاحظة', required: false }])
  assert.equal(fields[0].label, 'المرجع')
  assert.deepEqual(validateHrValues({ 'custom.reference': '  ABC-1  ' }, fields), { 'custom.reference': 'ABC-1' })
  for (const values of [{}, { 'custom.reference': '  ' }, { 'custom.reference': 123 }, { 'custom.reference': 'ok', 'employee.fullName': 'Forged employee' }, { 'custom.reference': 'x'.repeat(4001) }]) {
    assert.throws(() => validateHrValues(values, fields))
  }
  for (const invalid of [[...fields, fields[0]], [{ key: 'employee.phone', label: 'هاتف', required: true }], [{ key: 'custom.a', label: 'اسم', required: 'true' }],
    [{ key: 'custom.a', label: 'اسم', required: true, expression: 'process.env' }]]) assert.throws(() => validateHrFields(invalid))
  assert.equal(validateHrFields(Array.from({ length: 20 }, (_, i) => ({ key: `custom.k${i}`, label: `حقل ${i}`, required: false }))).length, 20)
  assert.throws(() => validateHrFields(Array.from({ length: 21 }, (_, i) => ({ key: `custom.k${i}`, label: `حقل ${i}`, required: false }))))
})

test('HR document values are replaced once and contract/date/financial values retain direction in Arabic text', () => {
  const fields = validateHrFields([{ key: 'custom.note', label: 'ملاحظة', required: false }])
  const content = validateHrContent(draft('العقد {{contract.number}} من {{contract.startDate}} للموظف {{employee.fullName}} بقيمة {{salary.total}}. {{custom.note}}'), fields)
  const result = resolveHrContent(content, { 'contract.number': 'CON-01', 'contract.startDate': '2026-01-01', 'employee.fullName': 'موظف الاختبار',
    'salary.total': '8500.00', 'custom.note': '{{employee.nationalId}}' })
  assert.ok(result.body.includes('\u2066CON-01\u2069'))
  assert.ok(result.body.includes('\u20662026-01-01\u2069'))
  assert.ok(result.body.includes('\u20668500.00\u2069'))
  assert.ok(result.body.includes('موظف الاختبار'))
  assert.ok(result.body.endsWith('{{employee.nationalId}}'), 'custom values cannot inject another template expansion')
})

test('HR document content bounds also limit repeated expansion of long custom values', () => {
  const fields = validateHrFields([{ key: 'custom.note', label: 'ملاحظة', required: false }])
  const content = validateHrContent(draft('{{custom.note}} '.repeat(30)), fields)
  assert.throws(() => resolveHrContent(content, { 'custom.note': 'x'.repeat(4000) }), /طويل/)
})
