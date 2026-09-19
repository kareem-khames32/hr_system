// الإذن بيغطي فترته المعتمدة بالظبط (قرار المالك): إذن صباحي ساعة ووصول 10:30 = تأخير 30 دقيقة عادي،
// وإذن مسائي ساعة وخروج 16:30 = انصراف بدري 30 دقيقة. ومدة الإذن أساس الحد للمرة الواحدة ورصيد الشهر. بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '../tsconfig.json'), transpileOnly: true })
const { calculateAttendanceFlex } = require('../src/attendance/attendance-flex-calculator')
const { permissionDurationMinutes, permissionClockMinutes } = require('../src/requests/permission-allowance')

// وردية ثابتة 09:00 → 18:00 بسماح 15 دقيقة (من غير مرونة)
const fixed = input => calculateAttendanceFlex({ startMinute: 540, endMinute: 1080, flexEnabled: false, flexWindowMinutes: null,
  requiredWorkMinutes: 540, graceMinutes: 15, checkInMinute: 540, checkOutMinute: 1080, ...input })
const clock = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
const free = (from, to, coverage) => ({ from: clock(from), to: clock(to), deductible: false, deductRatio: 1, coverage })

test('إذن صباحي 60 دقيقة (09:00–10:00) ووصول 10:30: الإذن يغطي ساعة والباقي 30 تأخير عادي', () => {
  const r = fixed({ checkInMinute: clock('10:30'), permissions: [free('09:00', '10:00', 'morning')] })
  assert.equal(r.rawLateMinutes, 90)
  assert.equal(r.unexcusedLateMinutes, 30)
  assert.equal(r.lateMinutes, 30, 'الـ30 دقيقة بعد نهاية الإذن تأخير بيتخصم بقواعد التأخير')
  assert.equal(r.excusedMinutes, 60)
})

test('إذن صباحي 120 دقيقة (09:00–11:00) ووصول 11:00: مفيش تأخير', () => {
  const r = fixed({ checkInMinute: clock('11:00'), permissions: [free('09:00', '11:00', 'morning')] })
  assert.equal(r.unexcusedLateMinutes, 0)
  assert.equal(r.lateMinutes, 0)
  assert.equal(r.shortfallMinutes, 0)
})

test('إذن مش من أول الوردية (09:30–10:30) ووصول 10:30: أول نص ساعة مش متغطي فيتحسب تأخير', () => {
  const r = fixed({ checkInMinute: clock('10:30'), permissions: [free('09:30', '10:30', 'morning')] })
  assert.equal(r.lateMinutes, 30)
})

test('إذن مسائي 60 دقيقة (17:00–18:00) وخروج 17:00: مفيش نقص، وخروج 16:30: نقص 30 دقيقة بس', () => {
  const at1700 = fixed({ checkOutMinute: clock('17:00'), permissions: [free('17:00', '18:00', 'evening')] })
  assert.equal(at1700.shortfallMinutes, 0)
  assert.equal(at1700.lateMinutes, 0)
  const at1630 = fixed({ checkOutMinute: clock('16:30'), permissions: [free('17:00', '18:00', 'evening')] })
  assert.equal(at1630.shortfallMinutes, 30, 'نص الساعة قبل بداية الإذن انصراف بدري عادي')
  assert.equal(at1630.excusedMinutes, 60)
})

test('الإذن الصباحي ما بيغطيش الخروج بدري والمسائي ما بيغطيش التأخير', () => {
  assert.equal(fixed({ checkInMinute: clock('10:00'), permissions: [free('09:00', '10:00', 'evening')] }).lateMinutes, 60)
  assert.equal(fixed({ checkOutMinute: clock('17:00'), permissions: [free('17:00', '18:00', 'morning')] }).shortfallMinutes, 60)
})

test('مدة الإذن من وقتيه: HH:MM وH:MM، ونص الليل، والوقت الغلط', () => {
  assert.equal(permissionDurationMinutes('09:00', '10:00'), 60)
  assert.equal(permissionDurationMinutes('9:00', '11:00'), 120)
  assert.equal(permissionDurationMinutes('09:00:00', '09:15:00'), 15)
  assert.equal(permissionDurationMinutes('23:30', '00:30'), 60, 'النهاية قبل البداية = بيعدّي نص الليل')
  assert.equal(permissionDurationMinutes('10:00', '10:00'), 0)
  for (const [a, b] of [['', '10:00'], ['09:00', undefined], ['24:00', '10:00'], ['09:60', '10:00'], ['٩:٠٠', '10:00'], ['9', '10']]) {
    assert.equal(permissionDurationMinutes(a, b), null, `${a} → ${b}`)
  }
  assert.equal(permissionClockMinutes('17:45'), 1065)
})
