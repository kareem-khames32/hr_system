'use strict'
// بيثبّت «دلوقتي» في عملية الاختبار على لحظة معينة والوقت بيمشي منها عادي — للاختبارات الشاملة اللي سيناريوهاتها بتواريخ ثابتة
// (إضافي «يوم ماضي قريب»، يوم «لسه من غير صف حضور»): من غير التثبيت بتنجح في أيام وتقع في أيام حسب تاريخ التشغيل.
// بيتنادى أول سطر في ملف الاختبار قبل تحميل أي كود. ساعة قاعدة البيانات نفسها مابتتغيّرش.
exports.pin = iso => {
  const Real = Date, offset = new Real(iso).getTime() - Real.now()
  if (!Number.isFinite(offset)) throw new Error('pinned-clock: لحظة غير صالحة')
  class PinnedDate extends Real {
    constructor(...args) { if (args.length === 0) super(Real.now() + offset); else super(...args) }
    static now() { return Real.now() + offset }
    // تاريخ اتعمل بالساعة الأصلية (من جوه المحرك) لسه «تاريخ»
    static [Symbol.hasInstance](value) { return Real.prototype.isPrototypeOf(value) }
  }
  global.Date = PinnedDate
  return { restore() { global.Date = Real } }
}
