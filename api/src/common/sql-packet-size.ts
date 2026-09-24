// حجم حزمة TDS بين الـAPI وSQL Server (المراجعة المستقلة 24 سبتمبر — بطء حساب المسير وشاشة الحضور).
// الدرايفر (tedious) افتراضيه 4,096 بايت، وأي استعلام نصه أطول من كده بيتقسم على أكتر من حزمة. ثبت بالقياس
// إن الطلب المتقسم بيقف حوالي 48 مللي ثانية زيادة: نفس SELECT طوله 11 كيلوبايت أخد 51 مللي بحزمة 4 كيلو و3 مللي
// بحزمة 32 كيلو، و«اختيار موظف» كامل الأعمدة لوحده بيعدّي 10 كيلو. حساب مسير 20 موظف نزل من 26.3 ثانية لـ8.4
// بنفس عدد الاستعلامات بالظبط — مفيش أي تغيير في المنطق. 32,767 أقصى حد بيقبله SQL Server (بيفاوض عليه).
// DB_PACKET_SIZE في .env بيغيّره (من 512 لـ32,767)، وأي قيمة غلط بترجع للافتراضي.
export const DEFAULT_DB_PACKET_SIZE = 32767

export function dbPacketSize(raw: string | undefined | null): number {
  const value = Number(raw)
  return Number.isInteger(value) && value >= 512 && value <= 32767 ? value : DEFAULT_DB_PACKET_SIZE
}
