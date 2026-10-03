// B2.1: شاشة سجل التدقيق وتسجيل التصدير من الشاشات — اختبارات نقية بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true, compilerOptions: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node' } })
const ui = require('../../src/lib/audit-api')
const { AUDIT_CATEGORIES, AUDIT_CATEGORY_LABELS } = require('../src/audit/audit')
const root = path.join(__dirname, '..', '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

test('AUI-01: فئات الشاشة هي فئات الخادم بنفس أسمائها، وعرض قبل/بعد', () => {
  assert.deepEqual(ui.AUDIT_CATEGORY_OPTIONS.map(option => [option.value, option.label]), AUDIT_CATEGORIES.map(category => [category, AUDIT_CATEGORY_LABELS[category]]))
  assert.equal(ui.auditValueText(null), '—')
  assert.equal(ui.auditValueText({ iban: '****1234' }), '{"iban":"****1234"}')
  assert.equal(ui.auditValueText('نص'), 'نص')
})

test('AUI-02: تسجيل التصدير في المتصفح بس — downloadCsv بيناديه بعدد الصفوف، وبرّه المتصفح مفيش نداء', async () => {
  const calls = []
  const savedFetch = global.fetch
  global.fetch = async (...args) => { calls.push(args); return new Response('{}', { status: 201 }) }
  try {
    ui.recordScreenExport('payroll.csv', 5)
    await new Promise(resolve => setTimeout(resolve, 10))
    assert.equal(calls.length, 0, 'من غير window مفيش تسجيل')
  } finally { global.fetch = savedFetch }
  assert.match(read('src/lib/csv.ts'), /recordScreenExport\(filename, rows\.length\)/)
})

test('AUI-03: الشاشة في القايمة وحراسة المسار بصلاحية «سجل التدقيق»، والجدول والفلاتر والاحتفاظ', () => {
  assert.match(read('src/components/layout/Sidebar.tsx'), /\{ label: 'سجل التدقيق', href: '\/settings\/audit', perm: 'audit\.view' \}/)
  assert.match(read('src/components/layout/MainLayout.tsx'), /\['\/settings\/audit', 'audit\.view'\]/)
  const page = read('src/app/settings/audit/page.tsx')
  for (const marker of ['data-audit-filters', 'data-audit-table', 'data-audit-retention', 'منتهي الاحتفاظ']) assert.ok(page.includes(marker), marker)
  assert.match(read('src/app/settings/policies/page.tsx'), /key: 'audit\.retention_months'.*min: 12/)
})
