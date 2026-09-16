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
