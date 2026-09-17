const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '../tsconfig.json'), transpileOnly: true })
const { overtimeMinutes, selectOvertimePunches, overtimeEvidenceFingerprint } = require('../src/attendance/overtime-evidence')
const policy = { thresholdMinutes: 30, roundingMinutes: 15, roundingDirection: 'DOWN', maxDailyMinutes: 0 }

test('25 دقيقة لا تتجاوز عتبة 30', () => {
  assert.deepEqual(overtimeMinutes(25, policy), { rawMinutes: 25, detectedMinutes: 0, capped: false })
})
test('155 دقيقة تبقى خامًا وتصبح 150 بعد التقريب', () => {
  assert.deepEqual(overtimeMinutes(155, policy), { rawMinutes: 155, detectedMinutes: 150, capped: false })
})
test('العتبة تفحص الثواني قبل إسقاطها من مقدار التقرير', () => {
  assert.equal(overtimeMinutes(30.7, { ...policy, thresholdMinutes: 30.6 }).detectedMinutes, 30)
  assert.equal(overtimeMinutes(30.5, { ...policy, thresholdMinutes: 30.6 }).detectedMinutes, 0)
})
test('السقف يأتي بعد التقريب مع علامة واضحة والصفري غير مفعل', () => {
  assert.deepEqual(overtimeMinutes(155, { ...policy, maxDailyMinutes: 120 }), { rawMinutes: 155, detectedMinutes: 120, capped: true })
  assert.equal(overtimeMinutes(480, policy).detectedMinutes, 480)
})
test('الدقائق السالبة أو ما دون وحدة التقريب لا ينشئ ساعات', () => {
  assert.equal(overtimeMinutes(-15, policy).detectedMinutes, 0)
  assert.equal(overtimeMinutes(0.9, { ...policy, thresholdMinutes: 0, roundingMinutes: 1 }).detectedMinutes, 0)
})

const date = '2026-09-01'
const clock = d => `${String(d.getHours() + (d.getDate() > 1 ? 24 : 0)).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const frame = { clock, onLine: t => t }
const punches = (...times) => times.map(time => ({ punchTime: new Date(`${date}T${time}`) }))
test('المعاينة تحفظ ثواني بصمة الدخول والخروج', () => {
  const r = selectOvertimePunches(date, frame, null, punches('09:00:59', '20:35:43'), [])
  assert.equal(r.checkIn, '09:00'); assert.equal(r.checkOut, '20:35')
  assert.equal(r.checkInInstant.getSeconds(), 59); assert.equal(r.checkOutInstant.getSeconds(), 43)
})
test('تكرار نفس دقيقة الحضور لا يصنع بصمة خروج', () => {
  const r = selectOvertimePunches(date, frame, null, punches('09:00:01', '09:00:34'), [])
  assert.equal(r.checkOut, null); assert.equal(r.duplicatePunches, true)
})
test('اتجاه تصحيح الخروج لا يتحول إلى دخول ولو كان الدليل الوحيد', () => {
  const r = selectOvertimePunches(date, frame, null, [], [{ correctedPunch: '{"out":"19:20"}' }])
  assert.equal(r.checkIn, null); assert.equal(r.checkOut, '19:20')
})
test('التصحيح المعتمد يغلب الخام باتجاهه', () => {
  const r = selectOvertimePunches(date, frame, null, punches('09:00:00', '18:00:00'), [{ correctedPunch: '{"in":"08:00","out":"19:20"}' }])
  assert.equal(r.checkIn, '08:00'); assert.equal(r.checkOut, '19:20')
})
test('نوافذ البصمة تميز خروجًا وحيدًا ولا تختلق دخولًا', () => {
  const r = selectOvertimePunches(date, frame, { checkinFrom: '07:00', checkinTo: '11:00', checkoutFrom: '16:00', checkoutTo: '23:00' }, punches('19:20:00'), [])
  assert.equal(r.checkIn, null); assert.equal(r.checkOut, '19:20')
})
test('خروج الليلية يمتد على خط يوم بدء الوردية', () => {
  const night = { clock, onLine: (t, anchor) => anchor === 'end' ? `${Number(t.slice(0, 2)) + 24}${t.slice(2)}` : t }
  const r = selectOvertimePunches(date, night, null, [
    { punchTime: new Date(`${date}T22:00:00`) }, { punchTime: new Date('2026-09-02T08:35:00') },
  ], [])
  assert.equal(r.checkIn, '22:00'); assert.equal(r.checkOut, '32:35')
  assert.equal(r.checkOutInstant.getDate(), 2)
})
test('التصحيح التالف يصبح سبب مراجعة ولا يختلق وقتًا', () => {
  const r = selectOvertimePunches(date, frame, null, [], [{ correctedPunch: '{"out":"29:90"}' }])
  assert.equal(r.malformedCorrection, true); assert.equal(r.checkOut, null)
})
test('بصمة الأدلة ثابتة حتى قراءة جديدة وتتغير بتغير الدليل', () => {
  const value = { rawMinutes: 155, workDate: date, policy }
  assert.equal(overtimeEvidenceFingerprint(value), overtimeEvidenceFingerprint(JSON.parse(JSON.stringify(value))))
  assert.notEqual(overtimeEvidenceFingerprint(value), overtimeEvidenceFingerprint({ ...value, rawMinutes: 160 }))
})

// «مكتشف» لا يصل لدورة الاعتماد: الشاشة تقول السبب بدل أن يبقى صامتًا
test('سجل العمل الإضافي يعرض سبب النافذة المقفولة وحد الأثر الرجعي', () => {
  const fs = require('node:fs')
  const page = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'app', 'attendance', 'overtime', 'page.tsx'), 'utf8')
  assert.match(page, /نافذة الإضافي مقفولة/)
  assert.match(page, /حد الأثر الرجعي/)
  assert.match(page, /policy\?\.backdateDays/)
  assert.match(page, /window\?\.open/)
  assert.match(page, /routingBlock\(e\)/)
})

// ===== قاعدة المالك (17 سبتمبر): الإضافي = الشغل الفعلي − الساعات المطلوبة، مش الوقت بعد نهاية الوردية =====
const { workedOvertime, overtimeSubmissionBlockers } = require('../src/attendance/overtime-evidence')
const hm = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
// وردية 08:00–17:00 مطلوب 9 ساعات، شرط الاستحقاق ساعة، التقريب كل 15 دقيقة لتحت
const ownerPolicy = { thresholdMinutes: 60, roundingMinutes: 15, roundingDirection: 'DOWN', maxDailyMinutes: 0 }
const ownerDay = (checkIn, checkOut, extra = {}) => {
  const work = workedOvertime({ checkInMinute: hm(checkIn), checkOutMinute: hm(checkOut), requiredWorkMinutes: 540,
    shiftStartMinute: hm('08:00'), shiftEndMinute: hm('17:00'), ...extra })
  return { ...work, ...overtimeMinutes(work.extraMinutes, extra.policy ?? ownerPolicy) }
}
test('المالك: اشتغل 10 ساعات ← 60 دقيقة', () => {
  const r = ownerDay('08:00', '18:00')
  assert.equal(r.workedMinutes, 600); assert.equal(r.requiredMinutes, 540); assert.equal(r.detectedMinutes, 60)
  assert.equal(r.completedAtMinute, hm('17:00'))
})
test('المالك: اشتغل 9 ساعات و40 دقيقة ← صفر (40 أقل من شرط الساعة)', () => {
  const r = ownerDay('08:00', '17:40')
  assert.equal(r.extraMinutes, 40); assert.equal(r.detectedMinutes, 0)
})
test('المالك: جه متأخر ساعة ومشي بعد الميعاد بساعة (9 ساعات) ← صفر', () => {
  const r = ownerDay('09:00', '18:00')
  assert.equal(r.workedMinutes, 540); assert.equal(r.extraMinutes, 0); assert.equal(r.detectedMinutes, 0)
  assert.equal(r.completedAtMinute, hm('18:00'))
})
test('المالك: جه بدري ساعة ومشي في ميعاده (10 ساعات) ← 60 دقيقة', () => {
  const r = ownerDay('07:00', '17:00')
  assert.equal(r.detectedMinutes, 60); assert.equal(r.completedAtMinute, hm('16:00'))
})
test('المالك: لو الزيادة وصلت الشرط بتتحسب كلها ثم التقريب لتحت والسقف اليومي', () => {
  assert.equal(ownerDay('08:00', '18:50').detectedMinutes, 105) // 110 كلها (مش 50 بعد الشرط) ← 105
  assert.equal(ownerDay('08:00', '17:59').detectedMinutes, 0) // 59 دقيقة
  assert.deepEqual(overtimeMinutes(300, { ...ownerPolicy, maxDailyMinutes: 120 }), { rawMinutes: 300, detectedMinutes: 120, capped: true })
  const precise = workedOvertime({ checkInMinute: hm('08:00'), checkOutMinute: hm('18:00') - 1 / 60, requiredWorkMinutes: 540, shiftStartMinute: hm('08:00'), shiftEndMinute: hm('17:00') })
  assert.equal(overtimeMinutes(precise.extraMinutes, ownerPolicy).detectedMinutes, 0, 'ثانية ناقصة عن الشرط = صفر')
})
test('المالك: ماكملش الساعات المطلوبة ← صفر ومفيش دقيقة بداية إضافي', () => {
  const r = ownerDay('08:00', '16:00')
  assert.equal(r.extraMinutes, 0); assert.equal(r.completedAtMinute, null); assert.equal(r.detectedMinutes, 0)
})
test('الاستراحة غير المدفوعة ووقت الإذن جوه المدة بيتخصموا من الشغل الفعلي', () => {
  const withBreak = ownerDay('08:00', '19:00', { unpaidBreakMinutes: 60 })
  assert.equal(withBreak.workedMinutes, 600); assert.equal(withBreak.detectedMinutes, 60)
  const withPermission = ownerDay('08:00', '19:00', { permissionWindows: [{ from: hm('12:00'), to: hm('13:30') }] })
  assert.equal(withPermission.workedMinutes, 570); assert.equal(withPermission.detectedMinutes, 0)
  // إذن برا مدة البصمات (الصبح قبل الدخول) مابيزودش ولا بيقلل الشغل الفعلي
  assert.equal(ownerDay('10:00', '19:00', { permissionWindows: [{ from: hm('08:00'), to: hm('10:00') }] }).detectedMinutes, 0)
})
test('نص يوم إجازة بيقلل الساعات المطلوبة زي الحضور', () => {
  const r = ownerDay('12:30', '18:30', { halfLeaveWindows: [{ from: hm('08:00'), to: hm('12:30') }] })
  assert.equal(r.requiredMinutes, 270); assert.equal(r.workedMinutes, 360); assert.equal(r.detectedMinutes, 90)
})
test('وردية ليلية: الشغل على خط يوم البداية', () => {
  const r = workedOvertime({ checkInMinute: hm('22:00'), checkOutMinute: hm('08:00') + 1440, requiredWorkMinutes: 480,
    shiftStartMinute: hm('22:00'), shiftEndMinute: hm('06:00') + 1440 })
  assert.equal(r.workedMinutes, 600); assert.equal(r.extraMinutes, 120)
})
test('الفترة المقفولة: نقص البصمات أو الزيادة الأقل من الشرط مابيمنعوش التقديم، والمفتوحة والمستثنى والمكتشف زي ما هم', () => {
  const blockers = [{ code: 'NO_PUNCH_EVIDENCE', message: 'x' }, { code: 'FUTURE_DATE', message: 'y' }, { code: 'LEAVE_CONFLICT', message: 'z' }]
  const closed = overtimeSubmissionBlockers({ window: { open: false }, evidenceMode: 'PUNCH', blockers })
  assert.deepEqual(closed.deferred.map(b => b.code), ['NO_PUNCH_EVIDENCE', 'FUTURE_DATE'])
  assert.deepEqual(closed.blockers.map(b => b.code), ['LEAVE_CONFLICT'])
  assert.equal(overtimeSubmissionBlockers({ window: { open: true }, evidenceMode: 'PUNCH', blockers }).blockers.length, 3)
  assert.equal(overtimeSubmissionBlockers({ window: { open: false }, evidenceMode: 'PUNCH', blockers }, true).deferred.length, 0)
  assert.equal(overtimeSubmissionBlockers({ window: { open: false }, evidenceMode: 'EXEMPT_APPROVAL', blockers }).deferred.length, 0)
})
test('خدمة الحضور بتقيس إضافي يوم العمل بالشغل الفعلي مش بنهاية الوردية', () => {
  const fs = require('node:fs')
  const service = fs.readFileSync(path.join(__dirname, '..', 'src', 'attendance', 'attendance.service.ts'), 'utf8')
  assert.match(service, /workedOvertime\(\{/)
  assert.doesNotMatch(service, /policy\.earlyOvertime \?/)
  const page = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'app', 'attendance', 'overtime', 'page.tsx'), 'utf8')
  assert.match(page, /شرط استحقاق الإضافي: الزيادة عن ساعات العمل المطلوبة لازم توصل/)
  assert.match(page, /ولو وصلت بتتحسب كلها/)
  assert.match(page, /overtime\.detection_threshold_hours/)
})
