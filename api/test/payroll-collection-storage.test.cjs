// محول TypeORM الحقيقي دون اتصال قاعدة بيانات؛ يختبر حفظ الخام الفاسد عبر النسخ.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { getMetadataArgsStorage } = require('../node_modules/typeorm')
const { PayrollPolicyVersion } = require('../src/payroll/payroll-policy.entities')
const { inspectPayrollCollectionPolicy, PAYROLL_COLLECTION_POLICY_VERSION } = require('../src/payroll/payroll-collection-policy')
const metadata = getMetadataArgsStorage().columns.find(column => column.target === PayrollPolicyVersion && column.propertyName === 'collectionPolicy')
const transformer = metadata.options.transformer
const definition = { components: [], parameters: [], tierSets: [] }
const jsonClone = value => JSON.parse(JSON.stringify(value))
function roundTripInvalid(raw) {
  const decoded = transformer.from(raw)
  assert.equal(inspectPayrollCollectionPolicy(definition, decoded).state, 'INVALID', raw)
  assert.equal(transformer.to(jsonClone(decoded)), raw, `clone must retain exact raw storage: ${raw}`)
  const repeated = transformer.to(jsonClone(transformer.from(transformer.to(jsonClone(decoded)))))
  assert.equal(repeated, raw, `repeated round-trip: ${raw}`)
  return decoded
}

test('actual metadata declares nullable nvarchar MAX and SQL null alone is MISSING', () => {
  assert.equal(metadata.options.type, 'nvarchar'); assert.equal(metadata.options.length, 'MAX'); assert.equal(metadata.options.nullable, true)
  assert.equal(transformer.from(null), null); assert.equal(transformer.to(null), null)
  assert.equal(inspectPayrollCollectionPolicy(definition, transformer.from(null)).state, 'MISSING')
})

test('JSON literal null and surrounding whitespace remain INVALID raw text rather than SQL null', () => {
  for (const raw of ['null', ' null ', '\r\nnull\t']) {
    const decoded = roundTripInvalid(raw)
    assert.equal(decoded.storageState, 'INVALID_COLLECTION_JSON'); assert.equal(decoded.rawValue, raw)
  }
})

test('JSON scalars including unsafe numbers are wrapped before reserialization can change them', () => {
  for (const raw of ['false', 'true', '0', '-0', '1e400', '9007199254740993', '"null"', '"{broken"', ' "نص تاريخي" ']) {
    const decoded = roundTripInvalid(raw); assert.equal(decoded.storageState, 'INVALID_COLLECTION_JSON')
  }
})

test('arrays and syntax errors survive clone byte-for-byte and never become a usable collection', () => {
  for (const raw of ['[]', ' [null,1e400] ', '[{"schemaVersion":"x"}]', '', ' ', '{broken', '{"collectionOrder":', '\uFEFFnull', '{"x":1,}']) roundTripInvalid(raw)
})

test('persisted objects resembling the internal wrapper cannot unwrap or replace their own raw value', () => {
  for (const value of [
    { storageState: 'INVALID_COLLECTION_JSON', rawValue: 'null' },
    { storageState: 'INVALID_COLLECTION_JSON', rawValue: '{"schemaVersion":"pretend"}', extra: true },
    { storageState: null, rawValue: 'DELETE_NOT_EXECUTED' },
    { storageState: 'OTHER', rawValue: null },
  ]) {
    const raw = `  ${JSON.stringify(value)}\n`, decoded = roundTripInvalid(raw)
    assert.equal(decoded.rawValue, raw); assert.notEqual(decoded.rawValue, value.rawValue)
  }
})

test('valid policy document stays usable and retains values after JSON cloning through actual transformer', () => {
  const collection = { schemaVersion: PAYROLL_COLLECTION_POLICY_VERSION, classifications: [], collectionOrder: [] }
  const raw = JSON.stringify(collection), decoded = transformer.from(raw)
  assert.deepEqual(decoded, collection); assert.equal(inspectPayrollCollectionPolicy(definition, decoded).state, 'COMPLETE')
  assert.equal(transformer.to(jsonClone(decoded)), raw)
  assert.deepEqual(transformer.from(transformer.to(collection)), collection)
})

test('invalid object values cannot lose nonfinite or unsafe numeric content during clone', () => {
  for (const raw of [
    '{"schemaVersion":1e400,"classifications":[],"collectionOrder":[]}',
    '{"schemaVersion":"bad","classifications":[{"componentCode":9007199254740993,"kind":"OTHER"}],"collectionOrder":[]}',
    '{"unexpected":{"x":1e400,"y":9007199254740993}}',
  ]) {
    const decoded = roundTripInvalid(raw)
    assert.equal(decoded.storageState, 'INVALID_COLLECTION_JSON')
  }
})

test('wrapper to only unwraps the exact internal two-field marker and raw string shape', () => {
  const wrong = { storageState: 'INVALID_COLLECTION_JSON', rawValue: 'raw', extra: true }
  assert.equal(transformer.to(wrong), JSON.stringify(wrong))
  const numeric = { storageState: 'INVALID_COLLECTION_JSON', rawValue: 1 }
  assert.equal(transformer.to(numeric), JSON.stringify(numeric))
  assert.equal(transformer.to({ storageState: 'INVALID_COLLECTION_JSON', rawValue: '\n malformed \n' }), '\n malformed \n')
})
