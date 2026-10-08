// B4.6 (ج) — عرض التاريخ الهجري جنب الميلادي: قايمة كيانات الإعداد، ودالة العرض الموحدة في الواجهة. بلا قاعدة بيانات.
// مقفول (الافتراضي) = التاريخ ميلادي بس زي الأول بالحرف؛ مفتوح = التاريخ الكامل بياخد الهجري (أم القرى) بين قوسين.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const hijri = require('../src/org/hijri-display')
const dates = require('../../src/lib/dates')

test('HJU-01: قايمة كيانات الإعداد — أرقام صحيحة موجبة فريدة مرتّبة، والغلط بيتشال، والتفعيل والقفل', () => {
  assert.deepEqual([hijri.parseHijriEntityIds('7, 3,3,x,0,-1,2.5, 12'), hijri.parseHijriEntityIds(''), hijri.parseHijriEntityIds(null), hijri.parseHijriEntityIds('abc')], [[3, 7, 12], [], [], []])
  assert.deepEqual([hijri.withHijriEntity([3, 7], 5, true), hijri.withHijriEntity([3, 7], 7, true), hijri.withHijriEntity([3, 7], 7, false), hijri.withHijriEntity([], 4, false)], [[3, 5, 7], [3, 7], [3], []])
})

test('HJU-02: دالة عرض التاريخ — مقفول = ميلادي بس؛ مفتوح = الهجري بين قوسين للتاريخ الكامل بس، بتقويم أم القرى', () => {
  const plain = dates.formatDate('2025-06-26')
  assert.equal(plain, '26 يونيو 2025')
  assert.equal(dates.formatHijriDate('2025-06-26'), '1 محرم 1447 هـ')
  assert.deepEqual([dates.formatHijriDate('2025-03-01'), dates.formatHijriDate(null), dates.formatHijriDate('bad')], ['1 رمضان 1446 هـ', '-', '-'])
  dates.setHijriDisplay(true)
  try {
    assert.equal(dates.formatDate('2025-06-26'), '26 يونيو 2025 (1 محرم 1447 هـ)')
    // خيارات مخصوصة (شهر وسنة، يوم الأسبوع…) زي ما هي، والفاضي «-»، والتاريخ والوقت من غير هجري
    assert.deepEqual([dates.formatDate('2025-06-26', { year: 'numeric', month: 'long' }), dates.formatDate(null), dates.formatDate('')], ['يونيو 2025', '-', '-'])
    assert.doesNotMatch(dates.formatDateTime('2025-06-26T10:00:00'), /هـ/)
  } finally {
    dates.setHijriDisplay(false)
  }
  assert.equal(dates.formatDate('2025-06-26'), plain)
})

test('HJU-03: مصدر الكود — الإعداد بيتكتب من مسار الكيانات بس، والحكم بفروع الحساب نفسه، والهيكل بيقراه مرة للجلسة', () => {
  const read = rel => fs.readFileSync(path.join(apiRoot, '..', rel), 'utf8').replace(/\r\n/g, '\n')
  const source = read('api/src/org/hijri-display.ts')
  assert.match(source, /if \(!ids\.length\) return false\n  if \(scope === null\) return true\n  if \(!scope\.length\) return false/)
  assert.match(source, /FROM \[requests_config\] WITH \(UPDLOCK, HOLDLOCK\) WHERE \[key\] = @0/)
  assert.match(read('api/src/settings/settings.controller.ts'), /if \(dto\.key === HIJRI_DISPLAY_KEY\) throw new BadRequestException\(HIJRI_DISPLAY_REFUSAL\)/)
  const controller = read('api/src/org/legal-entities.controller.ts')
  assert.match(controller, /  @Get\('display'\)\n  display\(/, 'إعداد الحساب نفسه من غير صلاحية الإعدادات')
  assert.match(controller, /@Perm\('settings\.manage'\)\n  @Put\(':id\/hijri-display'\)/)
  assert.match(read('src/components/layout/MainLayout.tsx'), /fetchDisplaySettings\(\)\.then\(\(settings\) => \{ if \(!cancelled\) setHijriDisplay\(settings\.hijri === true\) \}\)\.catch\(\(\) => undefined\)/)
  const { configSeed } = require('../src/seed/requests-seed.data')
  assert.equal(configSeed.some(row => row.key === hijri.HIJRI_DISPLAY_KEY), false, 'مش مبذور: بيتعمل أول ما كيان يتفعّل له')
})
