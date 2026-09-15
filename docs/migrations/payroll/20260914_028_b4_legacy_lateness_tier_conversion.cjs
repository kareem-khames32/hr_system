'use strict'
// 20260914_028 (مسار path-core، الجزء B4 — الخطوة 21): تحويل شرائح التأخير القديمة المفعّلة (lateness_tiers) إلى مجموعة شرائح مؤرخة متحقق منها.
// - الجدول القديم لا يُعدّل (يبقى أرشيفًا للقراءة)؛ تُضاف مجموعة واحدة source = LEGACY_CONVERSION تسري من شهر 2000-01 (أي كل المسيرات السابقة واللاحقة
//   حتى تُنشأ مجموعة أحدث)، بنفس الحدود الشاملة والقيم: FRACTION = كسر يوم، MINUTES = بالدقيقة، وكسر صفر = بلا خصم.
// - التحقق بدالة الشاشة نفسها (validatePayrollLatenessTiers): أي تداخل بين الشرائح المفعّلة يوقف الترحيل بدل قص صامت بقاعدة «أول مطابقة».
// - البصمة بدالة الحساب نفسها، ثم قراءة المجموعة المكتوبة والتحقق من بصمتها داخل المعاملة.
// - قابل لإعادة التشغيل: إن وُجدت مجموعة تحويل لا يُضاف شيء.

const EFFECTIVE_PERIOD = '2000-01'

function legacyRowsToTiers(rows) {
  return rows.map(row => {
    const fraction = String(row.mode) === 'FRACTION'
    const zero = Number(row.value) === 0
    return { fromMinutes: Number(row.fromMinutes), toMinutes: row.toMinutes === null ? null : Number(row.toMinutes),
      mode: fraction ? (zero ? 'NONE' : 'FRACTION') : 'MINUTES', value: fraction && !zero ? String(row.value) : '0', label: row.label ?? null }
  })
}

module.exports = {
  description: 'تحويل شرائح التأخير القديمة المفعّلة إلى مجموعة شرائح مؤرخة (من 2000-01) ببصمة محتوى، دون تعديل الجدول القديم',
  EFFECTIVE_PERIOD,
  legacyRowsToTiers,
  async up({ manager: em, requireApi, log }) {
    const tiers = requireApi('src/payroll/payroll-lateness-tiers')
    const [existing] = await em.query("SELECT COUNT(*) AS n FROM dbo.payroll_lateness_tier_sets WHERE [source] = N'LEGACY_CONVERSION'")
    if (Number(existing.n) > 0) return { skipped: 'مجموعة التحويل موجودة بالفعل' }
    const legacy = await em.query('SELECT [id], [fromMinutes], [toMinutes], [mode], CAST([value] AS nvarchar(40)) AS [value], [label] FROM dbo.lateness_tiers WHERE [isActive] = 1 ORDER BY [fromMinutes], [id]')
    if (!legacy.length) return { converted: 0, note: 'لا شرائح قديمة مفعّلة؛ الخصم بالدقيقة حتى تُنشأ مجموعة من الشاشة' }
    const { tiers: normalized, gaps } = tiers.validatePayrollLatenessTiers(legacyRowsToTiers(legacy))
    const contentHash = tiers.payrollLatenessTierSetHash(EFFECTIVE_PERIOD, normalized)
    const reason = `ترحيل 20260914_028: تحويل ${legacy.length} شريحة تأخير قديمة مفعّلة (${legacy.map(row => `#${row.id}`).join('، ')}) إلى مجموعة مؤرخة بنفس الحدود والقيم`.slice(0, 500)
    await em.query("INSERT INTO dbo.payroll_lateness_tier_sets ([effectivePeriod], [contentHash], [source], [reason], [isActive], [createdBy]) VALUES (@0, @1, N'LEGACY_CONVERSION', @2, 1, NULL)",
      [EFFECTIVE_PERIOD, contentHash, reason])
    const [set] = await em.query("SELECT TOP (1) [id] FROM dbo.payroll_lateness_tier_sets WHERE [source] = N'LEGACY_CONVERSION' AND [contentHash] = @0 ORDER BY [id] DESC", [contentHash])
    for (const tier of normalized) {
      await em.query('INSERT INTO dbo.payroll_lateness_tier_set_tiers ([setId], [sequence], [fromMinutes], [toMinutes], [mode], [value], [label]) VALUES (@0, @1, @2, @3, @4, CAST(@5 AS DECIMAL(9,3)), @6)',
        [Number(set.id), tier.sequence, tier.fromMinutes, tier.toMinutes, tier.mode, tier.value, tier.label])
    }
    // تحقق بعد الكتابة: المقروء يطابق البصمة (يرمي داخل المعاملة لو لم يطابق)
    const verified = await tiers.readPayrollLatenessTierSetById(em, Number(set.id))
    if (log) log(`مجموعة الشرائح #${verified.setId}: ${verified.tiers.length} شريحة، فجوات بالدقيقة ${gaps.length}`)
    return { setId: verified.setId, effectivePeriod: EFFECTIVE_PERIOD, tiers: verified.tiers.length, legacyActiveRows: legacy.length, gaps: gaps.length, contentHash }
  },
}
