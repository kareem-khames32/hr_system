// قواعد نوع الإجازة عند التقديم (شاشة أنواع الإجازات 16 سبتمبر) — اختبارات نقية بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const rules = require('../src/requests/leave-type-rules')

const base = {
  nameAr: 'سنوية', isPaid: true, category: 'ANNUAL', maxDays: null, minDaysPerRequest: null, noticeDays: 0,
  backdateAllowed: true, backdateMaxDays: null, countingMode: 'WORKING_DAYS', halfDayAllowed: true, fixedDays: null,
  maxTimesPerYear: null, attachmentRule: 'NONE', attachmentAboveDays: null, requiredAttachment: null, attachmentTiming: 'WITH_REQUEST',
}
const type = (over) => ({ ...base, ...over })
const today = '2026-09-16'
const rejects = (fn, re) => assert.throws(fn, (err) => err.getStatus?.() === 400 && re.test(err.message))

test('counting mode: ALL_DAYS counts the calendar, WORKING_DAYS working days; unpaid and sick always calendar; no category falls back to paid/unpaid', () => {
  assert.equal(rules.leaveCountsAllDays(type({ countingMode: 'ALL_DAYS' })), true)
  assert.equal(rules.leaveCountsAllDays(type({ countingMode: 'WORKING_DAYS' })), false)
  // بدون راتب والمرضية بكل الأيام دائمًا (المسير يخصمهما على التقويم)
  assert.equal(rules.leaveCountsAllDays(type({ category: 'UNPAID', isPaid: false, countingMode: 'WORKING_DAYS' })), true)
  assert.equal(rules.leaveCountsAllDays(type({ category: 'SICK', countingMode: 'WORKING_DAYS' })), true)
  // نوع لم يُضبط من الشاشة: السلوك القديم
  assert.equal(rules.leaveCountsAllDays(type({ category: null, countingMode: 'WORKING_DAYS', isPaid: false })), true)
  assert.equal(rules.leaveCountsAllDays(type({ category: null, countingMode: 'WORKING_DAYS' })), false)
})

test('min and max days per request, in the type unit', () => {
  const lt = type({ minDaysPerRequest: 2, maxDays: 5 })
  rejects(() => rules.assertLeaveTypeDaysRules(lt, { days: 1 }), /أقل مدة للطلب 2 يوم \(أيام عمل\)/)
  rejects(() => rules.assertLeaveTypeDaysRules(type({ maxDays: 5, countingMode: 'ALL_DAYS' }), { days: 6 }), /أقصى مدة للطلب الواحد 5 يوم \(أيام تقويم\)/)
  rules.assertLeaveTypeDaysRules(lt, { days: 2 })
  rules.assertLeaveTypeDaysRules(lt, { days: 5 })
  // الفاضي أو الصفر = بلا حد
  rules.assertLeaveTypeDaysRules(type({ maxDays: 0, minDaysPerRequest: null }), { days: 40 })
})

test('notice days: fromDate at least N days after today, 0 allows today', () => {
  rules.assertLeaveTypeDateRules(type({}), { fromDate: today, today })
  const lt = type({ noticeDays: 3 })
  rejects(() => rules.assertLeaveTypeDateRules(lt, { fromDate: '2026-09-18', today }), /قبلها بـ3 يوم.*2026-09-19/)
  rules.assertLeaveTypeDateRules(lt, { fromDate: '2026-09-19', today })
  // الموارد البشرية نيابةً عن موظف معفية من التوقيت
  rules.assertLeaveTypeDateRules(lt, { fromDate: '2026-09-10', today, exemptTiming: true })
})

test('backdate: not allowed, allowed up to N days, or left to the global setting', () => {
  const none = type({ backdateAllowed: false, backdateMaxDays: 10 })
  assert.equal(rules.leaveTypeBackdateLimit(none), 0)
  rejects(() => rules.assertLeaveTypeDateRules(none, { fromDate: '2026-09-15', today }), /بأثر رجعي/)
  rules.assertLeaveTypeDateRules(none, { fromDate: today, today })
  const five = type({ backdateMaxDays: 5 })
  assert.equal(rules.leaveTypeBackdateLimit(five), 5)
  rules.assertLeaveTypeDateRules(five, { fromDate: '2026-09-11', today })
  rejects(() => rules.assertLeaveTypeDateRules(five, { fromDate: '2026-09-10', today }), /لحد 5 يوم.*2026-09-11/)
  // النوع ما حددش: الإعداد العام هو اللي بيحكم (التقديم بيفحصه)
  assert.equal(rules.leaveTypeBackdateLimit(type({})), null)
  rules.assertLeaveTypeDateRules(type({}), { fromDate: '2025-01-01', today })
})

test('half day refused when the type does not allow it, even for HR on behalf', () => {
  const lt = type({ halfDayAllowed: false })
  rejects(() => rules.assertLeaveTypeDateRules(lt, { fromDate: today, period: 'MORNING', today, exemptTiming: true }), /نص يوم/)
  rejects(() => rules.assertLeaveTypeDateRules(lt, { fromDate: today, period: 'EVENING', today }), /نص يوم/)
  rules.assertLeaveTypeDateRules(lt, { fromDate: today, period: 'FULL', today })
  rules.assertLeaveTypeDateRules(type({}), { fromDate: today, period: 'MORNING', today })
})

test('occasion: fixed days and times per year', () => {
  const lt = type({ nameAr: 'زواج', category: 'OCCASION', fixedDays: 3, maxTimesPerYear: 2 })
  rejects(() => rules.assertLeaveTypeDaysRules(lt, { days: 4 }), /أيامها 3 يوم/)
  rules.assertLeaveTypeDaysRules(lt, { days: 3, timesThisYear: 1, year: '2026' })
  rejects(() => rules.assertLeaveTypeDaysRules(lt, { days: 3, timesThisYear: 2, year: '2026' }), /مسموحة 2 مرة في السنة، وعندك 2 في 2026/)
  // الحدين للمناسبة بس
  rules.assertLeaveTypeDaysRules({ ...lt, category: 'ANNUAL' }, { days: 4, timesThisYear: 9 })
})

test('attachment at submit: required, required above days, and never for after-return', () => {
  const req = type({ nameAr: 'امتحانات', attachmentRule: 'REQUIRED', requiredAttachment: 'جدول الامتحانات' })
  rejects(() => rules.assertLeaveTypeDaysRules(req, { days: 1 }), /لازم ترفع جدول الامتحانات مع الطلب/)
  rules.assertLeaveTypeDaysRules(req, { days: 1, attachmentRef: 'file:12' })
  const above = type({ attachmentRule: 'REQUIRED_ABOVE_DAYS', attachmentAboveDays: 2, requiredAttachment: 'تقرير طبي' })
  rules.assertLeaveTypeDaysRules(above, { days: 2 })
  rejects(() => rules.assertLeaveTypeDaysRules(above, { days: 3 }), /تقرير طبي/)
  const afterReturn = type({ category: 'SICK', attachmentRule: 'REQUIRED', attachmentTiming: 'AFTER_RETURN', requiredAttachment: 'تقرير طبي' })
  assert.equal(rules.leaveAttachmentRequiredAtSubmit(afterReturn, 30), false)
  rules.assertLeaveTypeDaysRules(afterReturn, { days: 30 })
  rules.assertLeaveTypeDaysRules(type({ attachmentRule: 'OPTIONAL', requiredAttachment: 'أي حاجة' }), { days: 3 })
})

test('submit path wires the rules: counting mode for stored days, type backdate overrides global, times per year counted', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'requests', 'requests.service.ts'), 'utf8')
  assert.match(src, /const allDays = leaveTypeDef \? leaveCountsAllDays\(leaveTypeDef\) : false/)
  assert.match(src, /const countedDays = allDays \? total : working/)
  assert.match(src, /const segDays = allDays \? seg\.total : seg\.working/)
  assert.match(src, /if \(!leaveTypeDef \|\| leaveTypeBackdateLimit\(leaveTypeDef\) === null\)/)
  assert.match(src, /assertLeaveTypeDateRules\(leaveTypeDef,/)
  assert.match(src, /assertLeaveTypeDaysRules\(leaveTypeDef,/)
  assert.match(src, /this\.leaveTimesInYear\(em, req, leaveTypeDef\.code, year\)/)
  // المرفق القديم (أي اسم مرفق = مطلوب) اتشال لصالح قاعدة النوع
  assert.doesNotMatch(src, /leaveTypeDef\.requiredAttachment &&/)
})
