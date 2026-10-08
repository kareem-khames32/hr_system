// B5.1 (أ) — سلّم الرواتب: نطاق الدرجة ومنتصفه ونسبة المقارنة. حساب نقي بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const bands = require('../src/compensation/salary-bands')
const registry = require('../src/modules-registry/registry')

test('SBU-01: نطاق الدرجة — المنتصف = (الأدنى + الأقصى) ÷ 2، والنطاق الناقص أو المقلوب = من غير نطاق', () => {
  assert.deepEqual([bands.salaryBandOf({ minSalary: '5000.00', maxSalary: '9000.00' }), bands.salaryBandOf({ minSalary: 8000, maxSalary: 8000 }), bands.salaryBandOf({ minSalary: 0, maxSalary: 3333.33 })],
    [{ min: 5000, mid: 7000, max: 9000 }, { min: 8000, mid: 8000, max: 8000 }, { min: 0, mid: 1666.67, max: 3333.33 }])
  assert.deepEqual([bands.salaryBandOf({ minSalary: null, maxSalary: 9000 }), bands.salaryBandOf({ minSalary: 5000, maxSalary: '' }), bands.salaryBandOf({ minSalary: 9000, maxSalary: 5000 }),
    bands.salaryBandOf({ minSalary: 0, maxSalary: 0 }), bands.salaryBandOf({ minSalary: -1, maxSalary: 5000 }), bands.salaryBandOf(null), bands.salaryBandOf({})], [null, null, null, null, null, null, null])
})

test('SBU-02: نسبة المقارنة = الراتب ÷ المنتصف، والموقع (تحت الأدنى / جوه النطاق / فوق الأقصى)، ومن غير نطاق = null', () => {
  const band = bands.salaryBandOf({ minSalary: 5000, maxSalary: 9000 })
  assert.deepEqual([4999.99, 5000, 7000, 9000, 9000.01, 0].map(salary => [bands.compaRatio(salary, band), bands.bandPosition(salary, band)]),
    [[0.71, 'BELOW'], [0.71, 'WITHIN'], [1, 'WITHIN'], [1.29, 'WITHIN'], [1.29, 'ABOVE'], [0, 'BELOW']])
  assert.deepEqual([bands.compaRatio(7000, null), bands.bandPosition(7000, null), bands.compaRatio(NaN, band), bands.bandPosition(NaN, band)], [null, null, null, null])
  assert.deepEqual(Object.keys(bands.BAND_POSITION_LABELS), ['BELOW', 'WITHIN', 'ABOVE'])
})

test('SBU-03: أساس المقارنة — الأساسي (الافتراضي) أو إجمالي المكونات الثابتة', () => {
  assert.deepEqual([bands.bandBasisOf('GROSS'), bands.bandBasisOf('BASIC'), bands.bandBasisOf(''), bands.bandBasisOf(null), bands.bandBasisOf('gross')], ['GROSS', 'BASIC', 'BASIC', 'BASIC', 'BASIC'])
  assert.deepEqual([bands.bandSalaryOf({ basic: 6000, gross: 8500.555 }, 'BASIC'), bands.bandSalaryOf({ basic: 6000, gross: 8500.555 }, 'GROSS')], [6000, 8500.56])
  const { configSeed } = require('../src/seed/requests-seed.data')
  assert.deepEqual(configSeed.filter(row => row.key === bands.BAND_BASIS_KEY), [{ key: 'compensation.band_basis', value: 'BASIC' }])
})

test('SBU-04: الموديول مقفول افتراضيًا وفي الباقة الكاملة، بصلاحيته، وتقرير السلّم قراءة بصلاحية عرض الرواتب وبنطاق الفروع', () => {
  const module = registry.MODULES.compensation
  assert.deepEqual([module.defaultEnabled, module.preset, module.group, module.dependsOn, module.softUses, module.permissions, module.routes, module.core],
    [false, 'full', 'money', ['payroll'], ['performance', 'positions'], ['compensation.manage'], ['/compensation', '/compensation/*', '/my/raises'], false])
  const read = rel => fs.readFileSync(path.join(apiRoot, 'src', rel), 'utf8').replace(/\r\n/g, '\n')
  const controller = read('compensation/compensation.controller.ts')
  assert.match(controller, /@RequireModule\('compensation'\)\n@UseGuards\(JwtAuthGuard, RolesGuard\)/)
  assert.match(controller, /@Perm\('payroll\.view'\)\n  @Get\('bands'\)/)
  const service = read('compensation/compensation.service.ts')
  assert.match(service, /rows\.filter\(row => inBranchScope\(scope, row\.branchId == null \? null : Number\(row\.branchId\)\)\)/)
  assert.doesNotMatch(service, /UPDATE |INSERT |DELETE |\.save\(|\.update\(/, 'قراءة بس')
  assert.doesNotMatch(read('compensation/salary-bands.ts'), /EntityManager|getRepository|\.query\(/)
  const permissions = require('../src/auth/permissions')
  assert.ok(JSON.stringify(permissions).includes('compensation.manage'))
})
