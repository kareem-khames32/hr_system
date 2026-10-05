'use strict'
// CRP2C-D-N01 (مراجعة Codex): تصليح دقة الأعمدة العشرية (common/typeorm-mssql-output-precision) لازم يتحمّل في كل ملف بيعمل اتصال قاعدة
// بـTypeORM برّه الاختبارات — التطبيق نفسه، وسكربتات البذر والاستيراد والترحيل والمزامنة. سكربت جديد بيعمل اتصال من غيره = الاختبار ده بيفشل.
// Run (من api/): node --test test/typeorm-output-precision-guard.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')

function sources(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) { if (entry.name !== 'node_modules') sources(full, out) }
    else if (/\.(ts|cjs|mjs|js)$/.test(entry.name)) out.push(full)
  }
  return out
}

test('OP-G1: كل ملف بيعمل اتصال TypeORM (new DataSource أو TypeOrmModule.forRoot) محمّل تصليح دقة الأعمدة العشرية', () => {
  const connecting = [...sources(path.join(apiRoot, 'src')), ...sources(path.join(apiRoot, 'scripts'))]
    .filter(file => /new DataSource\(|TypeOrmModule\.forRoot(?:Async)?\(/.test(fs.readFileSync(file, 'utf8')))
    .map(file => path.relative(apiRoot, file).replace(/\\/g, '/')).sort()
  // القايمة مثبّتة بالاسم: ملف جديد بيعمل اتصال لازم يبان هنا في المراجعة
  assert.deepEqual(connecting, ['scripts/import-salaries.ts', 'scripts/legacy-import/framework.ts', 'scripts/migrations-lib.cjs', 'scripts/payroll-migrations.cjs',
    'scripts/sync-domain-users.cjs', 'src/app.module.ts', 'src/seed/reset.ts', 'src/seed/seed.ts'])
  for (const file of connecting) {
    assert.match(fs.readFileSync(path.join(apiRoot, file), 'utf8'), /typeorm-mssql-output-precision/, `${file}: بيعمل اتصال من غير تصليح دقة الأعمدة العشرية`)
  }
})

test('OP-G2: السكربتات بتحمّل التصليح فعلًا — اتصال الاستيراد والترحيل والمزامنة بيعرّف جدول الإخراج بدقة العمود', () => {
  require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
  require('../node_modules/reflect-metadata')
  const marker = Symbol.for('hr.typeorm.mssql.output-table-precision')
  const { SqlServerDriver } = require('../node_modules/typeorm/driver/sqlserver/SqlServerDriver')
  const original = Object.getOwnPropertyDescriptor(SqlServerDriver.prototype, 'buildTableVariableDeclaration')
  // كل ملف لوحده: التصليح بيتشال قبله (والملف وكل اللي حمّله بيتنسوا) عشان التحميل يبقى من الملف نفسه
  const forget = () => { for (const key of Object.keys(require.cache)) if (/[\\/]api[\\/](src|scripts)[\\/]/.test(key)) delete require.cache[key] }
  const unpatch = () => {
    delete SqlServerDriver.prototype[marker]
    if (original) Object.defineProperty(SqlServerDriver.prototype, 'buildTableVariableDeclaration', original); else delete SqlServerDriver.prototype.buildTableVariableDeclaration
  }
  try {
    for (const file of ['scripts/legacy-import/framework.ts', 'scripts/migrations-lib.cjs']) {
      forget(); unpatch()
      assert.equal(SqlServerDriver.prototype[marker], undefined)
      require(path.join(apiRoot, file))
      assert.equal(SqlServerDriver.prototype[marker], true, `${file}: التصليح اتحمّل`)
    }
  } finally { forget(); unpatch(); require('../src/common/typeorm-mssql-output-precision') }
})
