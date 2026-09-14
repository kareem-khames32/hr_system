const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('../node_modules/typescript')
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../../src/lib/hr-document-template-editor.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const result = { exports: {} }
new Function('module', 'exports', code)(result, result.exports)
const { transformHrDocument, hrEditorVariables, hrDocumentEditorIssues, hrDocumentAttemptFingerprint, HR_DOCUMENT_STARTERS } = result.exports
const builtins = ['company.name', 'company.address', 'company.phone', 'employee.fullName', 'employee.employeeCode'].map(key => ({ key, label: `تسمية ${key}`, sample: `<${key}>` }))
const customFields = [{ key: 'custom.reference', label: 'رقم الإقرار', required: true }]
const content = { title: 'مستند اختبار', greeting: '', body: '{{employee.fullName}}: {{custom.reference}}', closing: '', footer: '{{company.name}}' }

test('readable Arabic custom and built-in tokens round-trip to stable API keys without expanding custom values', () => {
  const variables = hrEditorVariables(builtins, customFields)
  const readable = transformHrDocument(content, variables, 'readable')
  assert.ok(readable.body.includes('{{حقل إضافي: رقم الإقرار}}'))
  assert.deepEqual(transformHrDocument(readable, variables, 'canonical'), content)
  assert.ok(transformHrDocument(content, variables, 'sample').body.includes('مثال رقم الإقرار'))
  const withWhitespace = hrEditorVariables(builtins, [{ ...customFields[0], label: ' رقم الإقرار ' }])
  assert.deepEqual(transformHrDocument(transformHrDocument(content, withWhitespace, 'readable'), withWhitespace, 'canonical'), content)
  const collidingLabels = hrEditorVariables([{ key: 'employee.fullName', label: 'اسم الموظف', sample: 'مثال' }], [{ key: 'custom.name', label: 'اسم الموظف', required: true }])
  const distinct = { ...content, body: '{{employee.fullName}} / {{custom.name}}', footer: '' }
  const distinctReadable = transformHrDocument(distinct, collidingLabels, 'readable')
  assert.equal(distinctReadable.body, '{{اسم الموظف}} / {{حقل إضافي: اسم الموظف}}')
  assert.deepEqual(transformHrDocument(distinctReadable, collidingLabels, 'canonical'), distinct)
})

test('unknown or removed custom variables, duplicate fields and unclosed tokens block publishing', () => {
  assert.equal(hrDocumentEditorIssues(content, builtins, customFields).length, 0)
  assert.ok(hrDocumentEditorIssues(content, builtins, []).some(issue => issue.includes('custom.reference')))
  assert.ok(hrDocumentEditorIssues(content, builtins, [...customFields, ...customFields]).some(issue => issue.includes('مختلفة')))
  assert.ok(hrDocumentEditorIssues({ ...content, body: 'نص غير مكتمل {{company.name' }, builtins, customFields).some(issue => issue.includes('غير مكتملة')))
  assert.ok(hrDocumentEditorIssues(content, builtins, [{ key: 'custom.bad-key', label: 'مثال', required: false }]).some(issue => issue.includes('رمز حقل')))
})

test('four starter drafts are valid and contract terms must come from user; general draft needs no employee', () => {
  assert.deepEqual(HR_DOCUMENT_STARTERS.map(starter => starter.category), ['contract', 'acknowledgement', 'certificate', 'general'])
  for (const starter of HR_DOCUMENT_STARTERS) assert.deepEqual(hrDocumentEditorIssues(starter.draft, builtins, starter.customFields), [])
  const contract = HR_DOCUMENT_STARTERS[0]
  assert.ok(contract.customFields.some(field => field.key === 'custom.terms' && field.required))
  assert.ok(contract.draft.body.includes('{{custom.terms}}'))
  assert.equal(Object.values(HR_DOCUMENT_STARTERS[3].draft).some(text => /\{\{\s*(employee|contract|salary)\./.test(text)), false)
})

test('issuance retry fingerprint is stable across field order but changes for employee, values and published revision', () => {
  const input = { templateId: 1, revisionId: 2, employeeId: 3, values: { 'custom.b': 'ب', 'custom.a': 'أ' } }
  const original = hrDocumentAttemptFingerprint(input)
  assert.equal(original, hrDocumentAttemptFingerprint({ ...input, values: { 'custom.a': 'أ', 'custom.b': 'ب' } }))
  for (const changed of [{ ...input, revisionId: 4 }, { ...input, employeeId: 5 }, { ...input, values: { 'custom.a': 'ج', 'custom.b': 'ب' } }]) assert.notEqual(original, hrDocumentAttemptFingerprint(changed))
  assert.notEqual(original, hrDocumentAttemptFingerprint({ templateId: 1, revisionId: 2, values: input.values }))
})
