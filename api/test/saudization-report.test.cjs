// B4.6 (أ) — تقرير نسبة السعودة ونوعي مستند الإقامة: حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const report = require('../src/payroll/saudization-report')
const { DOC_TYPES_SEED, DOC_TYPE_CODE_RE } = require('../src/assets/doc-types')

test('SZU-01: نسبة السعوديين لكل كيان — السعودي بقاعدة التأمينات، ومن غير جنسية متعدّين لوحدهم، وفروع من غير كيان في مجموعة', () => {
  const row = (entityId, entityName, nationality) => ({ entityId, entityName, nationality })
  const groups = report.saudizationGroups([row(2, 'كيان جدة', 'سعودي'), row(2, 'كيان جدة', 'مصري'), row(2, 'كيان جدة', 'هندي'), row(1, 'كيان الرياض', 'سعودي'), row(1, 'كيان الرياض', 'سعودية'),
    row(null, null, 'سعودي'), row(null, null, ''), row(null, null, null)])
  assert.deepEqual(groups, [
    { entityId: 1, name: 'كيان الرياض', headcount: 2, saudis: 2, unknownNationality: 0, percent: 100 },
    { entityId: 2, name: 'كيان جدة', headcount: 3, saudis: 1, unknownNationality: 0, percent: 33.33 },
    { entityId: null, name: report.SAUDIZATION_NO_ENTITY, headcount: 3, saudis: 1, unknownNationality: 2, percent: 33.33 }])
  assert.deepEqual(report.saudizationGroups([]), [])
})

test('SZU-02: رخصة العمل وتوثيق العقد في قوى نوعين في بذرة كتالوج المستندات ومرآتها، من غير تغيير في الباقي', () => {
  const codes = DOC_TYPES_SEED.map(row => row.code)
  assert.deepEqual(DOC_TYPES_SEED.filter(row => ['work_permit', 'qiwa_contract'].includes(row.code)), [{ code: 'work_permit', nameAr: 'رخصة عمل' }, { code: 'qiwa_contract', nameAr: 'توثيق العقد في قوى' }])
  assert.deepEqual([codes.length, new Set(codes).size, codes.every(code => DOC_TYPE_CODE_RE.test(code)), codes.at(-1), codes.includes('iqama')], [15, 15, true, 'other', true]) // B5.2 (ب): + بطاقة التأمين الطبي
  const mirror = fs.readFileSync(path.join(apiRoot, '..', 'src', 'lib', 'doc-types.ts'), 'utf8')
  for (const row of DOC_TYPES_SEED) assert.ok(mirror.includes(`{ code: '${row.code}', label: '${row.nameAr}' }`), row.code)
})

test('SZU-03: مصدر الكود — تقرير قراءة لحساب بكل الفروع، ومن غير عمود إقامة جديد على الموظف', () => {
  const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
  const source = read('payroll/saudization-report.ts')
  assert.match(source, /if \(branchScopeOf\(user\) !== null\) throw new ForbiddenException\(SAUDIZATION_COMPANY_ONLY\)/)
  assert.doesNotMatch(source, /\.save\(|\.update\(|\.insert\(|UPDATE |INSERT |DELETE /)
  assert.doesNotMatch(read('employees/employee.entity.ts'), /iqama|workPermit|qiwa/i)
})
