// مفتاح جهاز البصمة (x-device-key) لاستقبال POST /attendance/punches بلا JWT:
// القيمة المبذورة منشورة في الريبو، والمفتاح القصير سهل التخمين — كلاهما
// يُرفض في الاستقبال وعند الحفظ من الإعدادات (مرآة الواجهة: src/app/settings/page.tsx)
export const DEVICE_KEY_PLACEHOLDER = 'zk-device-key-change-me'
export const DEVICE_KEY_MIN_LENGTH = 24

// سبب ضعف المفتاح للرسالة — null = مفتاح صالح
export const deviceKeyWeakness = (key?: string | null): string | null => {
  const k = (key ?? '').trim()
  if (!k) return 'مفتاح جهاز البصمة غير مضبوط في الإعدادات'
  if (k === DEVICE_KEY_PLACEHOLDER) {
    return 'مفتاح جهاز البصمة ما زال القيمة الافتراضية المنشورة'
  }
  if (k.length < DEVICE_KEY_MIN_LENGTH) {
    return `مفتاح جهاز البصمة أقصر من ${DEVICE_KEY_MIN_LENGTH} حرفاً`
  }
  return null
}
