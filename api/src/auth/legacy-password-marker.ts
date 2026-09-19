import * as fs from 'fs'
import * as path from 'path'

// الحسابات المنقولة من النظام القديم: القديم مابيطلّعش كلمات المرور، فالمستورد حطّ لكل حساب جديد hash لسر عشوائي
// (unusablePasswordHash في scripts/legacy-import/framework.ts = bcrypt لـ «legacy-import:<عشوائي>»). الـhash ده شكله زي
// أي bcrypt عادي ومايتعرفش منه، ومحدش يعرف سره فمايدخلش بيه أبدًا.
// اللي بيعرّف الحسابات دي هو سجل المستورد نفسه في مجلد الترحيل (نفس LEGACY_MIGRATION_DIR بتاع المستورد):
//   report.json — بند USER_PASSWORD_RESET_REQUIRED بالمعرّف القديم لكل حساب اتعمل بكلمة غير قابلة للاستخدام
//   idmap.json  — القديم → الجديد (النوع user)
// الحسابات القديمة اللي اترَبطت بحساب قائم بنفس البريد مش في البند ده (كلمتها ماتلمستش).
// مفيش hashes بتتقري ولا بتطلع — بس أرقام الحسابات.
export const legacyMigrationDir = (): string =>
  path.resolve(process.env.LEGACY_MIGRATION_DIR || 'D:/projects/migration')

const RESET_FLAG = 'USER_PASSWORD_RESET_REQUIRED'

let cache: { key: string; ids: ReadonlySet<number> } | null = null

const readJson = (file: string): unknown =>
  JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))

// أرقام الحسابات (عندنا) اللي المستورد عملها بكلمة غير قابلة للاستخدام — فاضية لو السجل مش موجود أو تالف
export function legacyUnusablePasswordUserIds(dir: string = legacyMigrationDir()): ReadonlySet<number> {
  const reportFile = path.join(dir, 'report.json')
  const idmapFile = path.join(dir, 'idmap.json')
  let key: string
  try {
    key = [reportFile, idmapFile]
      .map((file) => {
        const stat = fs.statSync(file)
        return `${file}:${stat.mtimeMs}:${stat.size}`
      })
      .join('|')
  } catch {
    return new Set()
  }
  if (cache?.key === key) return cache.ids

  const ids = new Set<number>()
  try {
    const report = readJson(reportFile) as { domains?: Record<string, { flags?: Record<string, Array<{ legacyId?: unknown }>> }> }
    const idmap = readJson(idmapFile) as { user?: Record<string, unknown> }
    const users = idmap?.user && typeof idmap.user === 'object' ? idmap.user : {}
    for (const domain of Object.values(report?.domains ?? {})) {
      const flags = domain?.flags?.[RESET_FLAG]
      if (!Array.isArray(flags)) continue
      for (const flag of flags) {
        if (flag?.legacyId == null) continue
        const id = Number(users[String(flag.legacyId)])
        if (Number.isInteger(id) && id > 0) ids.add(id)
      }
    }
  } catch {
    ids.clear() // سجل تالف = مفيش علامات (بدل علامات ناقصة)
  }
  cache = { key, ids }
  return ids
}

// «مستخدم منقول — محتاج باسورد»: المستورد عمله بكلمة غير قابلة للاستخدام، ولسه محدش عيّن له كلمة على النظام ده
export const needsPasswordFromLegacy = (
  user: { id: number; passwordChangedAt?: Date | null },
  legacyIds: ReadonlySet<number>
): boolean => legacyIds.has(user.id) && !user.passwordChangedAt
