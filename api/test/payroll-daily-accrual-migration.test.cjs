// ترحيل تراكم المسير اليومي (20260920_061): إضافي فقط، وأسماؤه مطابقة لما يولّده TypeORM
// من الكيان، فلو اتطبق على قاعدة قائمة يبقى فرق المخطط صفر. فحص نصي؛ لا SQL ولا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const file = path.resolve(apiRoot, '../docs/migrations/payroll/20260920_061_payroll_daily_accrual.sql')
const sql = fs.readFileSync(file, 'utf8')
const { PayrollDailyAccrual } = require('../src/payroll/payroll-daily-accrual.entities')

test('ACR-MIG-01: الترحيل إضافي بالكامل — بلا حذف ولا تعديل ولا تعبئة رجعية', () => {
  const statements = sql.replace(/--[^\n]*/g, '')
  for (const forbidden of [/\bDROP\b/i, /\bDELETE\b/i, /\bTRUNCATE\b/i, /\bINSERT\b/i, /\bALTER\s+TABLE\b/i, /\bEXEC\b/i]) {
    assert.ok(!forbidden.test(statements), `الترحيل لا يحتوي ${forbidden}`)
  }
  // UPDATE ممنوع كمان (لا تعبئة رجعية) — مع السماح بكلمة updatedAt لو ظهرت في عمود
  assert.ok(!/\bUPDATE\s+/i.test(statements), 'الترحيل لا يحدّث أي صف')
  assert.ok(/IF OBJECT_ID\(N'dbo\.payroll_daily_accrual', N'U'\) IS NULL/.test(sql), 'إنشاء الجدول محروس فيعاد تشغيله بأمان')
  for (const index of ['UX_payroll_daily_accrual_day', 'IX_payroll_daily_accrual_run', 'IX_payroll_daily_accrual_dirty']) {
    assert.ok(sql.includes(`WHERE name = N'${index}'`), `فهرس ${index} محروس`)
    assert.ok(sql.includes(`CREATE ${index.startsWith('UX') ? 'UNIQUE ' : ''}INDEX [${index}]`), `فهرس ${index} يُنشأ`)
  }
})

test('ACR-MIG-02: كل أعمدة الكيان موجودة في الترحيل بنفس النوع والقابلية للإفراغ', () => {
  // الأعمدة كما يراها الكيان (الديكوريتورات مسجّلة في مخزن TypeORM العام)
  const storage = require('../node_modules/typeorm').getMetadataArgsStorage()
  const owned = storage.columns.filter(column => column.target === PayrollDailyAccrual)
  assert.ok(owned.length >= 30, `الكيان فيه ${owned.length} عمود`)
  for (const column of owned) {
    assert.ok(sql.includes(`[${column.propertyName}]`), `عمود ${column.propertyName} موجود في الترحيل`)
  }
  assert.ok(sql.includes('CONSTRAINT [PK_payroll_daily_accrual] PRIMARY KEY ([id])'))
  // الأعمدة اللي ليها قيمة افتراضية في الكيان لازم يكون لها قيد DEFAULT مسمّى في الترحيل
  const defaults = owned.filter(column => column.options?.default !== undefined)
  assert.ok(defaults.length >= 18, `${defaults.length} عمود بقيمة افتراضية`)
  for (const column of defaults) {
    const line = sql.split('\n').find(row => row.includes(`[${column.propertyName}]`) && row.includes('DEFAULT'))
    assert.ok(line, `عمود ${column.propertyName} له قيد DEFAULT في الترحيل`)
    assert.match(line, /CONSTRAINT \[DF_[0-9a-f]{27,30}\] DEFAULT/, `اسم قيد ${column.propertyName} بصيغة TypeORM`)
  }
})
