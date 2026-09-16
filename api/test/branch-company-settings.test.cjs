// عزل الفروع (قرار المالك 16 سبتمبر): حساب الفرع ما يعدّلش إعداد بيسري على كل الشركة،
// وما ينزلش خصم/مكافأة على موظف في فرع تاني، وفحوص التنفيذ الرخيصة بتترفض من التقديم.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { assertCompanyWideWrite } = require('../src/auth/guards')

const src = (file) => fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8')

test('company-wide write: only an account with no branch scope passes', () => {
  assertCompanyWideWrite({ role: 'super_admin', branchId: 1 })
  for (const user of [{ role: 'hr_manager', branchId: 1 }, { role: 'branch_manager', branchId: 4 }, { role: 'hr_manager', branchId: null }]) {
    assert.throws(() => assertCompanyWideWrite(user), (err) => err.getStatus?.() === 403 && /لكل الشركة/.test(err.message))
  }
})

test('company-wide settings endpoints call the guard before writing', () => {
  assert.match(src('settings/settings.controller.ts'), /async upsertConfig\(@Body\(\) dto: UpsertConfigDto, @CurrentUser\(\) user: JwtPayload\) \{\s+assertCompanyWideWrite\(user\)/)
  const rules = src('payroll/payroll-rules.controller.ts')
  assert.match(rules, /createTierSet\([^)]*\)[^{]*\{\s+assertCompanyWideWrite\(user\)/)
  assert.match(rules, /deactivateTierSet\([^{]*\{\s+assertCompanyWideWrite\(user\)/)
  const loans = src('loans/loans.controller.ts')
  for (const fn of ['createPolicy', 'createPolicyVersion', 'deactivatePolicy']) {
    assert.match(loans, new RegExp(`${fn}\\([^{]*\\{\\s+assertCompanyWideWrite\\(user\\)`))
  }
})

test('deductions and bonuses: a branch account gets no creator basis and no candidate outside its branch', () => {
  for (const file of ['payroll/typed-deductions.service.ts', 'payroll/bonuses.service.ts']) {
    const text = src(file)
    assert.match(text, /private scopedBases\([^{]*\{[\s\S]{0,200}if \(!this\.inBranchScope\(user, employee\)\) return \[\]/, file)
    assert.match(text, /!facts\.superiors\.has\(row\.id\) && this\.inBranchScope\(user, row\)\)/, file)
  }
})

test('submit refuses a non-positive money amount and a bad punch correction date/time', () => {
  const text = src('requests/requests.service.ts')
  assert.match(text, /\['expense_register', 'payroll_allowance', 'payroll_adjustment'\]\.includes\(type\.destinationHandler \?\? ''\) && p\.amount != null && p\.amount !== ''\) obligationAmount\(p\.amount\)/)
  assert.match(text, /type\.code === 'PUNCH_CORRECTION'[\s\S]{0,200}isValidYmd\(String\(p\.date\)\)/)
  assert.match(text, /if \(time && !PUNCH_TIME_PATTERN\.test\(time\)\)/)
  // الفحص نفسه بيتشغّل: الوقت الصح بيعدي والغلط بيترفض
  const pattern = new RegExp(text.match(/export const PUNCH_TIME_PATTERN = \/(.+)\/\r?\n/)[1])
  for (const ok of ['09:30', '23:45', '00:00', '17:05:30']) assert.ok(pattern.test(ok), ok)
  for (const bad of ['25:00', '9:30', '12:60', '0d:5d', '']) assert.ok(!pattern.test(bad), bad)
  const { obligationAmount } = require('../src/requests/destinations.service')
  assert.equal(obligationAmount('12.349'), 12.34)
  assert.equal(obligationAmount(100), 100)
  assert.throws(() => obligationAmount(0), /رقمًا موجبًا/)
  assert.throws(() => obligationAmount('abc'), /رقمًا موجبًا/)
})
