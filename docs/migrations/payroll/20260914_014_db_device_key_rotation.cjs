'use strict'
// مراجعة الخطوة 1 (S1): مفتاح جهاز البصمة يجب أن يكون ≥24 حرفًا وليس قيمة منشورة.
// القيمة على hr_system كانت 'zk-device-key-change-me' المبذورة في الريبو (23 حرفًا)، فاستقبال البصمات مرفوض
// وأي أحد يعرف القيمة المنشورة كان سيدفع بصمات لو خُفّف الفحص. نولّد مفتاحًا عشوائيًا (24 بايت = 48 hex)
// داخل معاملة الترحيل؛ لا يُطبع ولا يُسجَّل في سجل التشغيل (الطول فقط). يقرؤه مدير النظام من «الإعدادات ← الحضور»
// لضبط الجهاز. المفتاح القوي الموجود يُترك، والقيمة الفارغة (استقبال موقوف عمدًا) تُترك.
const crypto = require('node:crypto')

module.exports = {
  description: 'تدوير مفتاح جهاز البصمة المنشور/القصير إلى مفتاح عشوائي 48 حرفًا دون طباعته',
  async up({ query, requireApi }) {
    const { deviceKeyWeakness, DEVICE_KEY_PLACEHOLDER, DEVICE_KEY_MIN_LENGTH } = requireApi('src/attendance/device-key')
    const rows = await query("SELECT [value] FROM dbo.requests_config WHERE [key] = N'attendance.device_key'")
    if (!rows.length) return { action: 'NONE', reason: 'المفتاح غير موجود؛ الإقلاع يضيفه فارغًا (الاستقبال موقوف حتى ضبطه)' }
    const current = String(rows[0].value ?? '')
    if (!current.trim()) return { action: 'KEPT_EMPTY', reason: 'قيمة فارغة = استقبال موقوف عمدًا' }
    if (!deviceKeyWeakness(current)) return { action: 'KEPT_STRONG', length: current.trim().length }
    const key = crypto.randomBytes(24).toString('hex')
    if (key.length < DEVICE_KEY_MIN_LENGTH || deviceKeyWeakness(key)) throw new Error('المفتاح المولد لا يحقق الحد الأدنى')
    await query("UPDATE dbo.requests_config SET [value] = @0 WHERE [key] = N'attendance.device_key' AND [value] = @1", [key, current])
    const [after] = await query("SELECT LEN([value]) AS len FROM dbo.requests_config WHERE [key] = N'attendance.device_key'")
    if (Number(after.len) !== key.length) throw new Error('تعذر تثبيت المفتاح الجديد (تغيّرت القيمة أثناء الترحيل)')
    return { action: 'ROTATED', previous: current.trim() === DEVICE_KEY_PLACEHOLDER ? 'PUBLISHED_PLACEHOLDER' : 'TOO_SHORT', previousLength: current.length, newLength: key.length }
  },
}
