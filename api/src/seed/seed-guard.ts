// ===== حارس سكربتات البذر والتصفير =====
// seed.ts كان ينشئ DataSource خاصًا به بـ synchronize: true على DB_DATABASE (والافتراضي hr_system)،
// وreset.ts يمسح الجداول — كلاهما يتجاوز validateEnv. القاعدة 1: لا مزامنة ولا مسح لقاعدة الشركة.
import { isDisposableTestDatabase } from '../auth/jwt-secret'

export const SEED_FRESH_INSTALL_FLAG = '--fresh-install'

export interface SeedPreflight {
  database: string
  disposable: boolean
  freshInstall: boolean
}

// قبل أي اتصال: القاعدة المؤقتة مسموحة؛ غيرها للبذر فقط وبتصريح --fresh-install (تثبيت جديد على قاعدة غير موجودة أو فارغة)
export function seedPreflight(databaseValue: string | undefined, argv: readonly string[], script: 'seed' | 'reset'): SeedPreflight {
  const database = typeof databaseValue === 'string' && databaseValue.trim() ? databaseValue.trim() : 'hr_system'
  if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error(`اسم قاعدة البيانات غير صالح: ${database}`)
  const disposable = isDisposableTestDatabase(database)
  const freshInstall = argv.includes(SEED_FRESH_INSTALL_FLAG)
  if (script === 'reset' && !disposable) {
    throw new Error(
      `التصفير مرفوض على قاعدة البيانات "${database}" — يمسح بيانات التشغيل، ومسموح فقط لقواعد الاختبار المؤقتة (hr_<اسم>_test_<16 حرف hex>). ` +
      'لا يوجد تجاوز: عطّل الصفوف أو غيّر حالتها بترحيل موثق (docs/migrations/README.md)'
    )
  }
  if (script === 'seed' && !disposable && !freshInstall) {
    throw new Error(
      `البذر مرفوض على قاعدة البيانات "${database}" — ينشئ الجداول بالمزامنة التلقائية ويضيف حسابات بكلمات مرور منشورة. ` +
      `مسموح لقواعد الاختبار المؤقتة، أو لتثبيت جديد على قاعدة غير موجودة أو فارغة بتصريح ${SEED_FRESH_INSTALL_FLAG}. ` +
      'قاعدة قائمة تُحدَّث بالمُرحّل المجمّع فقط (docs/migrations/README.md)'
    )
  }
  return { database, disposable, freshInstall }
}

// بعد فحص القاعدة: المزامنة للقاعدة المؤقتة، أو لقاعدة غير موجودة/بلا جداول مع --fresh-install فقط
export function seedSchemaDecision(preflight: SeedPreflight, state: { exists: boolean; userTables: number }): { synchronize: true } {
  if (preflight.disposable) return { synchronize: true }
  if (!preflight.freshInstall) throw new Error(`البذر مرفوض على قاعدة البيانات "${preflight.database}" بلا ${SEED_FRESH_INSTALL_FLAG}`)
  if (state.exists && state.userTables > 0) {
    throw new Error(
      `البذر مرفوض: القاعدة "${preflight.database}" فيها ${state.userTables} جدول — ${SEED_FRESH_INSTALL_FLAG} لقاعدة جديدة أو فارغة فقط. ` +
      'القاعدة القائمة لا تُزامن؛ طبّق الترحيلات بالمُرحّل المجمّع'
    )
  }
  return { synchronize: true }
}
