// ===== إطار استيراد بيانات النظام القديم (logic-leap) =====
// المسار: استخراج JSON من الـAPI القديم (قراءة فقط) → D:/projects/migration/raw/<key>/ → وحدات المجالات تكتب مباشرة بـTypeORM
// → idmap.json (معرّف قديم → جديد) + report.json/report.md (أعداد وتنبيهات بمعرّفات قديمة فقط، بلا بيانات شخصية).
//
// التشغيل (من مجلد api):
//   npx ts-node --transpile-only scripts/legacy-import/framework.ts --manifest      ← يكتب sources.json لخطوة الاستخراج
//   npx ts-node --transpile-only scripts/legacy-import/framework.ts --check         ← يعرض ترتيب المجالات وعدد عناصر raw لكل مصدر
//   npx ts-node --transpile-only scripts/legacy-import/framework.ts [--only=a,b] [--fresh] [--no-transaction]
//
// شكل ملفات raw/<key>/ (تكتبها خطوة الاستخراج — انظر rawFileName/writeRaw):
//   قائمة مُقسّمة صفحات:  page-0001.json, page-0002.json …   (الغلاف كما هو: {success,message,data:[…],meta,links})
//   مصدر واحد:            data.json
//   مصدر each:            <id>.json   أو   <id>.page-0001.json …  (لو المسار الفرعي مُقسّم)
//   مصدر binary:          <id>.<ext> + <id>.meta.json {contentType, filename}
//
// ----- مثال وحدة مجال (ملف مستقل داخل scripts/legacy-import/، يُكتشف تلقائيًا) -----
//
//   import { readRaw, type Ctx, type Source } from './framework'
//   import { Branch } from '../../src/org/entities/branch.entity'
//
//   export const DOMAIN = 'org'
//   export const DEPENDS_ON: string[] = []
//   export const SOURCES: Source[] = [
//     { key: 'branches', path: 'branches', paginated: true, params: { per_page: 200 } },
//     { key: 'branch-details', path: 'branches/{id}', each: { from: 'branches' } },
//   ]
//
//   export async function run(ctx: Ctx): Promise<void> {
//     for (const row of readRaw<{ id: number; name: string | null }>('branches')) {
//       if (ctx.ids.get('branch', row.id)) continue                    // إعادة التشغيل لا تكرر الصفوف
//       if (!row.name) ctx.flag('BRANCH_NAME_MISSING', row.id, 'فرع بلا اسم — استُورد باسم مؤقت')
//       const saved = await ctx.em.save(ctx.em.create(Branch, { name: row.name || `فرع ${row.id}` }))
//       ctx.ids.set('branch', row.id, saved.id)
//       ctx.count('branch')
//     }
//   }
// (رسائل flag بلا أسماء/هويات/أرقام جوال — المعرّف القديم يكفي؛ الملف المرفق: rawFilePath(key, id).)

import 'reflect-metadata'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { randomBytes } from 'crypto'

const API_DIR = path.resolve(__dirname, '..', '..')
// قبل تحميل أي كيان أو خدمة: قراءة api/.env بلا طباعة (TZ وUPLOADS_ROOT وبيانات القاعدة)
dotenv.config({ path: path.join(API_DIR, '.env'), quiet: true })

import * as bcrypt from 'bcryptjs'
import { DataSource, DataSourceOptions, EntityManager, getMetadataArgsStorage, type QueryRunner } from 'typeorm'

// ===================== العقد =====================

export type Source = {
  key: string
  path: string
  paginated?: boolean
  params?: Record<string, string | number>
  each?: { from: string; idField?: string }
  binary?: boolean
}

export interface Ctx {
  ds: DataSource
  em: EntityManager
  ids: {
    get(kind: string, legacyId: string | number): number | undefined
    set(kind: string, legacyId: string | number, newId: number): void
  }
  flag(kind: string, legacyId: string | number | null, message: string): void
  count(kind: string, n?: number): void
  now: Date
}

export interface DomainModule {
  DOMAIN: string
  DEPENDS_ON: string[]
  SOURCES: Source[]
  run(ctx: Ctx): Promise<void>
}

// ===================== المسارات =====================

export const MIGRATION_DIR = path.resolve(process.env.LEGACY_MIGRATION_DIR || 'D:/projects/migration')
// MIGRATION_RAW_DIR: مجلد raw بديل (تجربة على بيانات مصطنعة) — الخريطة والتقرير يبقيان في MIGRATION_DIR
export const RAW_DIR = process.env.MIGRATION_RAW_DIR ? path.resolve(process.env.MIGRATION_RAW_DIR) : path.join(MIGRATION_DIR, 'raw')
export const IDMAP_FILE = path.join(MIGRATION_DIR, 'idmap.json')
export const REPORT_JSON = path.join(MIGRATION_DIR, 'report.json')
export const REPORT_MD = path.join(MIGRATION_DIR, 'report.md')
export const REPORT_DRY_JSON = path.join(MIGRATION_DIR, 'report.dry-run.json')
export const REPORT_DRY_MD = path.join(MIGRATION_DIR, 'report.dry-run.md')
export const SOURCES_FILE = path.join(MIGRATION_DIR, 'sources.json')
export const EXTRACT_PLAN_FILE = path.join(MIGRATION_DIR, 'extract-plan.json')

const safeSegment = (value: string | number, what: string): string => {
  const s = String(value)
  if (!s || s === '.' || s === '..' || /[\\/:*?"<>|\x00-\x1f]/.test(s)) throw new Error(`${what} غير صالح لمسار raw`)
  return s
}

export const rawDir = (key: string): string => path.join(RAW_DIR, safeSegment(key, 'مفتاح المصدر'))

// اسم ملف raw موحّد لخطوة الاستخراج: page-0001.json / data.json / <id>.json / <id>.page-0001.json
export function rawFileName(opts: { id?: string | number; page?: number } = {}): string {
  const page = opts.page != null ? `page-${String(opts.page).padStart(4, '0')}` : null
  if (opts.id != null) return `${safeSegment(opts.id, 'المعرّف')}${page ? `.${page}` : ''}.json`
  return page ? `${page}.json` : 'data.json'
}

export function writeRaw(key: string, fileName: string, content: unknown): string {
  const dir = rawDir(key)
  fs.mkdirSync(dir, { recursive: true })
  const target = path.join(dir, safeSegment(fileName, 'اسم الملف'))
  const body = Buffer.isBuffer(content) ? content : JSON.stringify(content)
  writeFileAtomic(target, body)
  return target
}

// ===================== قراءة raw =====================

const ENVELOPE_KEYS = new Set(['success', 'message', 'data', 'meta', 'links', 'errors', 'status'])
const naturalCompare = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true })

// غلاف الـAPI القديم {success,message,data,meta,links} → العناصر؛ مصفوفة → عناصرها؛ كائن آخر → نفسه
function unwrap(json: unknown): any[] {
  if (json == null) return []
  if (Array.isArray(json)) return json
  if (typeof json !== 'object') return [json]
  const obj = json as Record<string, unknown>
  const keys = Object.keys(obj)
  if ('data' in obj && keys.every((k) => ENVELOPE_KEYS.has(k))) return unwrap(obj.data)
  return [obj]
}

function listJsonFiles(key: string): string[] {
  const dir = rawDir(key)
  let names: string[]
  try {
    names = fs.readdirSync(dir)
  } catch {
    return []
  }
  const set = new Set(names)
  return names
    .filter((n) => n.toLowerCase().endsWith('.json') && !n.endsWith('.meta.json'))
    .filter((n) => !set.has(`${n.slice(0, -'.json'.length)}.meta.json`)) // ملف ثنائي امتداده json
    .sort(naturalCompare)
}

function parseRawFile(key: string, name: string): unknown {
  const full = path.join(rawDir(key), name)
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8').replace(/^\uFEFF/, ''))
  } catch {
    // لا نطبع المحتوى — اسم الملف فقط
    throw new Error(`ملف raw تالف: ${key}/${name}`)
  }
}

export function readRaw<T = any>(key: string): T[] {
  const out: T[] = []
  for (const name of listJsonFiles(key)) for (const item of unwrap(parseRawFile(key, name))) out.push(item)
  return out
}

// مصادر each: العناصر مجمّعة بمعرّف الأب (من اسم الملف) — مفيد لما المسار الفرعي لا يرجع معرّف الأب
export function readRawEach<T = any>(key: string): Array<{ id: string; items: T[] }> {
  const groups = new Map<string, T[]>()
  for (const name of listJsonFiles(key)) {
    const m = /^(.+?)(?:\.page-\d+)?\.json$/i.exec(name)
    if (!m || /^page-\d+$/i.test(m[1]) || m[1] === 'data') continue
    const list = groups.get(m[1]) ?? []
    for (const item of unwrap(parseRawFile(key, name))) list.push(item)
    groups.set(m[1], list)
  }
  return [...groups.entries()].sort((a, b) => naturalCompare(a[0], b[0])).map(([id, items]) => ({ id, items }))
}

const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.csv': 'text/csv', '.json': 'application/json',
  '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.zip': 'application/zip',
}

export function rawFilePath(key: string, id: string | number): { path: string; filename: string; contentType: string } | null {
  const dir = rawDir(key)
  const prefix = `${safeSegment(id, 'المعرّف')}.`
  let names: string[]
  try {
    names = fs.readdirSync(dir)
  } catch {
    return null
  }
  const metaName = `${prefix}meta.json`
  const hasMeta = names.includes(metaName)
  const candidate = names
    .filter((n) => n.startsWith(prefix) && n !== metaName && !/\.page-\d+\.json$/i.test(n))
    .filter((n) => hasMeta || !n.toLowerCase().endsWith('.json'))
    .sort(naturalCompare)[0]
  if (!candidate) return null
  let meta: { contentType?: unknown; filename?: unknown } = {}
  if (hasMeta) {
    try {
      meta = JSON.parse(fs.readFileSync(path.join(dir, metaName), 'utf8').replace(/^\uFEFF/, ''))
    } catch {
      meta = {}
    }
  }
  const ext = path.extname(candidate).toLowerCase()
  const filename = typeof meta.filename === 'string' && meta.filename.trim() ? path.basename(meta.filename.trim()) : candidate
  const contentType =
    typeof meta.contentType === 'string' && meta.contentType.trim()
      ? meta.contentType.split(';')[0].trim()
      : CONTENT_TYPES[ext] ?? 'application/octet-stream'
  return { path: path.join(dir, candidate), filename, contentType }
}

// ===================== أدوات مشتركة =====================

// كلمات المرور غير متاحة من الـAPI القديم: هاش bcrypt لسر عشوائي لا يعرفه أحد (المالك يعيد التعيين لاحقًا)
export function unusablePasswordHash(): string {
  return bcrypt.hashSync(`legacy-import:${randomBytes(32).toString('hex')}`, 10)
}

export function chunk<T>(rows: readonly T[], size: number): T[][] {
  const n = Math.max(1, Math.floor(size))
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += n) out.push(rows.slice(i, i + n))
  return out
}

// SQL Server: حد 2100 معامل للاستعلام — حجم دفعة آمن لعدد أعمدة معيّن
export const safeBatchSize = (columns: number): number => Math.max(1, Math.floor(2000 / Math.max(1, columns)))

function writeFileAtomic(target: string, body: string | Buffer): void {
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const tmp = `${target}.${process.pid}.tmp`
  fs.writeFileSync(tmp, body)
  fs.renameSync(tmp, target)
}

function readJsonFile<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) as T
  } catch {
    return fallback
  }
}

// رسائل أخطاء القاعدة قد تحمل قيمًا (مفتاح مكرر، قيمة مقطوعة) — تُحجب قبل التقرير والطباعة
export function sanitizeError(err: unknown): string {
  const name = err instanceof Error ? err.constructor.name || err.name : 'Error'
  const raw = err instanceof Error ? err.message : String(err)
  const msg = raw
    .replace(/(duplicate key value is\s*)\([\s\S]*?\)(?=\.|$)/gi, '$1(…)')
    .replace(/(Truncated value:\s*)'[\s\S]*?'(?=\.|$)/gi, "$1'…'")
    .replace(/(value\s+)'[^']*'/gi, "$1'…'")
    .replace(/(parameters?\s*[:=]\s*)[\s\S]*$/i, '$1…')
    .replace(/\s+/g, ' ')
    .trim()
  return `${name}: ${msg.length > 500 ? `${msg.slice(0, 500)}…` : msg}`
}

// ===================== مصدر البيانات =====================

function entityFiles(dir: string, ext: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) entityFiles(full, ext, out)
    else if (entry.name.endsWith(`.entity${ext}`) || entry.name.endsWith(`.entities${ext}`)) out.push(full)
  }
  return out
}

// نفس إعداد app.module.ts (DB_TYPE/DB_HOST/…) + كل كيانات src؛ المزامنة مغلقة دائمًا مهما كان DB_SYNCHRONIZE
export function createDataSource(): DataSource {
  const ext = path.extname(__filename) === '.ts' ? '.ts' : '.js'
  const srcDir = path.join(API_DIR, 'src')
  for (const file of entityFiles(srcDir, ext)) require(file)
  const entities = [...new Set(getMetadataArgsStorage().tables.map((t) => t.target).filter((t): t is Function => typeof t === 'function'))]

  const env = process.env
  const dbType = (env.DB_TYPE || 'mssql') as 'mssql' | 'mysql'
  const common = {
    host: env.DB_HOST || 'localhost',
    port: parseInt(env.DB_PORT || (dbType === 'mysql' ? '3306' : '1433'), 10),
    username: env.DB_USERNAME || (dbType === 'mysql' ? 'root' : 'sa'),
    password: env.DB_PASSWORD || '',
    database: env.DB_DATABASE || 'hr_system',
    entities,
    synchronize: false,
    migrationsRun: false,
    logging: false as const,
  }
  const options: DataSourceOptions =
    dbType === 'mysql'
      ? { type: 'mysql', ...common }
      : {
          type: 'mssql',
          ...common,
          requestTimeout: 10 * 60 * 1000,
          pool: { max: 10, min: 0 },
          options: { trustServerCertificate: (env.DB_TRUST_SERVER_CERTIFICATE ?? 'true') === 'true', encrypt: false },
        }
  return new DataSource(options)
}

// ===================== الخريطة والتقرير =====================

type IdMap = Record<string, Record<string, number>>
type FlagRow = { legacyId: string | null; message: string }
export type DomainReport = {
  status: 'ok' | 'failed' | 'skipped'
  startedAt: string
  finishedAt: string
  durationMs: number
  error?: string
  counts: Record<string, number>
  flags: Record<string, FlagRow[]>
}
export type Report = { updatedAt: string; migrationDir: string; domains: Record<string, DomainReport> }

const STATUS_AR: Record<DomainReport['status'], string> = { ok: 'تم', failed: 'فشل (تراجع)', skipped: 'تُخطّي' }
const MD_IDS_LIMIT = 200

export function renderReportMd(report: Report): string {
  const lines: string[] = []
  const flagTotal = (d: DomainReport) => Object.values(d.flags).reduce((s, l) => s + l.length, 0)
  const countTotal = (d: DomainReport) => Object.values(d.counts).reduce((s, n) => s + n, 0)
  const domains = Object.entries(report.domains)
  lines.push('# تقرير استيراد بيانات النظام القديم', '', `آخر تحديث: ${report.updatedAt}`, '')
  lines.push('## ملخص المجالات', '', '| المجال | الحالة | المدة (ث) | السجلات | التنبيهات |', '|---|---|---|---|---|')
  for (const [name, d] of domains)
    lines.push(`| ${name} | ${STATUS_AR[d.status]} | ${(d.durationMs / 1000).toFixed(1)} | ${countTotal(d)} | ${flagTotal(d)} |`)
  lines.push('')
  for (const [name, d] of domains) {
    lines.push(`## المجال: ${name}`, '')
    if (d.error) lines.push(`**الخطأ:** ${d.error}`, '')
    lines.push('### الأعداد', '')
    const counts = Object.entries(d.counts).sort((a, b) => a[0].localeCompare(b[0]))
    if (!counts.length) lines.push('لا شيء.', '')
    else {
      lines.push('| النوع | العدد |', '|---|---|')
      for (const [kind, n] of counts) lines.push(`| ${kind} | ${n} |`)
      lines.push('')
    }
    lines.push('### التنبيهات', '')
    const kinds = Object.entries(d.flags).sort((a, b) => a[0].localeCompare(b[0]))
    if (!kinds.length) lines.push('لا توجد.', '')
    for (const [kind, rows] of kinds) {
      lines.push(`#### ${kind} (${rows.length})`, '')
      const byMessage = new Map<string, string[]>()
      for (const r of rows) {
        const ids = byMessage.get(r.message) ?? []
        ids.push(r.legacyId ?? '—')
        byMessage.set(r.message, ids)
      }
      for (const [message, ids] of byMessage) {
        const shown = ids.slice(0, MD_IDS_LIMIT).join(', ')
        const more = ids.length > MD_IDS_LIMIT ? ` … و${ids.length - MD_IDS_LIMIT} أخرى (القائمة كاملة في report.json)` : ''
        lines.push(`- ${message} — المعرّفات القديمة (${ids.length}): ${shown}${more}`)
      }
      lines.push('')
    }
  }
  return lines.join('\n')
}

// ===================== الاكتشاف والترتيب =====================

export function discoverDomains(dir: string = __dirname): DomainModule[] {
  const files: string[] = []
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) walk(full)
      } else if (/\.(ts|js)$/.test(entry.name) && !entry.name.endsWith('.d.ts') && path.resolve(full) !== path.resolve(__filename)) {
        files.push(full)
      }
    }
  }
  walk(dir)
  const modules: DomainModule[] = []
  const seen = new Map<string, string>()
  for (const file of files.sort(naturalCompare)) {
    const text = fs.readFileSync(file, 'utf8')
    // لا نحمّل إلا ما يعلن DOMAIN وrun صراحة (سكربتات الاستخراج وغيرها لا تُنفّذ)
    if (!/^export\s+const\s+DOMAIN\b/m.test(text) || !/^export\s+(async\s+)?function\s+run\b|^export\s+const\s+run\b/m.test(text)) continue
    const mod = require(file) as Partial<DomainModule>
    if (typeof mod.DOMAIN !== 'string' || typeof mod.run !== 'function') continue
    if (seen.has(mod.DOMAIN)) throw new Error(`المجال ${mod.DOMAIN} مُعرّف مرتين: ${path.basename(seen.get(mod.DOMAIN)!)} و${path.basename(file)}`)
    seen.set(mod.DOMAIN, file)
    modules.push({ DOMAIN: mod.DOMAIN, DEPENDS_ON: mod.DEPENDS_ON ?? [], SOURCES: mod.SOURCES ?? [], run: mod.run })
  }
  return modules
}

export function orderDomains(modules: DomainModule[]): DomainModule[] {
  const byName = new Map(modules.map((m) => [m.DOMAIN, m]))
  const state = new Map<string, 'visiting' | 'done'>()
  const out: DomainModule[] = []
  const visit = (m: DomainModule, trail: string[]) => {
    const s = state.get(m.DOMAIN)
    if (s === 'done') return
    if (s === 'visiting') throw new Error(`اعتماد دائري بين المجالات: ${[...trail, m.DOMAIN].join(' → ')}`)
    state.set(m.DOMAIN, 'visiting')
    for (const dep of m.DEPENDS_ON) {
      const d = byName.get(dep)
      if (d) visit(d, [...trail, m.DOMAIN])
    }
    state.set(m.DOMAIN, 'done')
    out.push(m)
  }
  for (const m of [...modules].sort((a, b) => a.DOMAIN.localeCompare(b.DOMAIN))) visit(m, [])
  return out
}

// بيان المصادر لخطوة الاستخراج: بلا تكرار مفاتيح، ومصادر each بعد مصدرها
export function sourcesManifest(modules: DomainModule[]): Array<Source & { domain: string }> {
  const byKey = new Map<string, Source & { domain: string }>()
  const errors: string[] = []
  for (const m of orderDomains(modules)) {
    for (const s of m.SOURCES) {
      try {
        safeSegment(s.key, 'مفتاح المصدر')
      } catch (e) {
        errors.push(`${m.DOMAIN}: ${(e as Error).message} (${s.key})`)
        continue
      }
      if (s.each && !s.path.includes('{id}')) errors.push(`${m.DOMAIN}/${s.key}: مسار each بلا {id}`)
      if (!s.each && s.path.includes('{id}')) errors.push(`${m.DOMAIN}/${s.key}: {id} بلا each`)
      if (s.binary && !s.each) errors.push(`${m.DOMAIN}/${s.key}: binary يحتاج each`)
      const prev = byKey.get(s.key)
      if (prev) {
        const same = prev.path === s.path && JSON.stringify(prev.params ?? {}) === JSON.stringify(s.params ?? {}) &&
          !!prev.paginated === !!s.paginated && !!prev.binary === !!s.binary && JSON.stringify(prev.each ?? null) === JSON.stringify(s.each ?? null)
        if (!same) errors.push(`${m.DOMAIN}/${s.key}: المفتاح مستخدم بتعريف مختلف في ${prev.domain}`)
        continue
      }
      byKey.set(s.key, { ...s, domain: m.DOMAIN })
    }
  }
  const ordered: Array<Source & { domain: string }> = []
  const placed = new Set<string>()
  const place = (s: Source & { domain: string }, trail: string[]) => {
    if (placed.has(s.key)) return
    if (trail.includes(s.key)) {
      errors.push(`اعتماد دائري بين المصادر: ${[...trail, s.key].join(' → ')}`)
      return
    }
    if (s.each) {
      const parent = byKey.get(s.each.from)
      if (!parent) errors.push(`${s.domain}/${s.key}: each.from=${s.each.from} غير معرّف`)
      else place(parent, [...trail, s.key])
    }
    placed.add(s.key)
    ordered.push(s)
  }
  for (const s of byKey.values()) place(s, [])
  if (errors.length) throw new Error(`بيان المصادر غير صالح:\n- ${errors.join('\n- ')}`)
  return ordered
}

// ===================== التشغيل =====================

export interface RunOptions {
  only?: string[]
  fresh?: boolean
  transaction?: boolean
  // تجربة كاملة: كل المجالات داخل معاملة واحدة (نقطة حفظ لكل مجال) تُتراجع في النهاية، الملفات المرفوعة إلى مجلد مؤقت يُحذف،
  // عدّادات IDENTITY تُعاد لقيمها، والتقرير إلى report.dry-run.* بلا لمس idmap.json
  dryRun?: boolean
}

type IdentityRow = { table: string; column: string; seed: number; inc: number; last: number | null }

async function readIdentities(ds: DataSource): Promise<IdentityRow[]> {
  if (ds.options.type !== 'mssql') return []
  const rows: Array<Record<string, unknown>> = await ds.query(
    `SELECT QUOTENAME(SCHEMA_NAME(t.schema_id)) + '.' + QUOTENAME(t.name) AS tbl, QUOTENAME(ic.name) AS col,
            CAST(ic.seed_value AS bigint) AS seed, CAST(ic.increment_value AS bigint) AS inc, CAST(ic.last_value AS bigint) AS last
       FROM sys.identity_columns ic JOIN sys.tables t ON t.object_id = ic.object_id WHERE t.is_ms_shipped = 0`,
  )
  return rows.map((r) => ({
    table: String(r.tbl), column: String(r.col), seed: Number(r.seed), inc: Number(r.inc), last: r.last == null ? null : Number(r.last),
  }))
}

// التراجع لا يعيد IDENTITY في SQL Server — نعيد كل عدّاد تحرك إلى قيمته السابقة (أو لأكبر معرّف موجود لو أُدخل غيرنا صفوفًا)
async function restoreIdentities(ds: DataSource, before: IdentityRow[]): Promise<{ restored: number; failed: number }> {
  const prev = new Map(before.map((r) => [r.table, r]))
  let restored = 0
  let failed = 0
  for (const now of await readIdentities(ds)) {
    const old = prev.get(now.table)
    if (!old || now.last == null || now.last === old.last) continue
    try {
      const [{ m }] = await ds.query(`SELECT MAX(${now.column}) AS m FROM ${now.table}`)
      let target = old.last ?? old.seed - old.inc
      if (m != null && Number(m) > target) target = Number(m)
      if (target === now.last) continue
      await ds.query(`DBCC CHECKIDENT (N'${now.table.replace(/'/g, "''")}', RESEED, ${Math.trunc(target)}) WITH NO_INFOMSGS`)
      restored++
    } catch {
      failed++
    }
  }
  return { restored, failed }
}

function countFiles(dir: string): number {
  let n = 0
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) n += entry.isDirectory() ? countFiles(path.join(dir, entry.name)) : 1
  } catch {
    /* مجلد غير موجود */
  }
  return n
}

export type ImportResult = Report & { dryRun: boolean; ordered: string[]; dryRunUploads?: number; identities?: { restored: number; failed: number } }

export async function runImport(modules: DomainModule[], options: RunOptions = {}): Promise<ImportResult> {
  const dryRun = !!options.dryRun
  const ordered = orderDomains(modules)
  const known = new Set(ordered.map((m) => m.DOMAIN))
  for (const name of options.only ?? []) if (!known.has(name)) throw new Error(`مجال غير موجود: ${name}`)
  const selected = options.only?.length ? ordered.filter((m) => options.only!.includes(m.DOMAIN)) : ordered

  fs.mkdirSync(MIGRATION_DIR, { recursive: true })
  if (options.fresh && !dryRun) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    for (const f of [IDMAP_FILE, REPORT_JSON, REPORT_MD]) if (fs.existsSync(f)) fs.renameSync(f, `${f}.${stamp}.bak`)
  }
  const idmap: IdMap = options.fresh && dryRun ? {} : readJsonFile<IdMap>(IDMAP_FILE, {})
  // حالة الاعتماديات غير المختارة تُقرأ من تقرير التشغيل الحقيقي حتى في التجربة
  const baseline: Report = options.fresh && dryRun ? { updatedAt: '', migrationDir: MIGRATION_DIR, domains: {} } : readJsonFile<Report>(REPORT_JSON, { updatedAt: '', migrationDir: MIGRATION_DIR, domains: {} })
  baseline.domains ??= {}
  const report: Report = dryRun ? { updatedAt: '', migrationDir: MIGRATION_DIR, domains: {} } : baseline
  const persist = (withIds: boolean) => {
    report.updatedAt = new Date().toISOString()
    if (dryRun) {
      writeFileAtomic(REPORT_DRY_JSON, JSON.stringify({ ...report, dryRun: true }, null, 1))
      writeFileAtomic(REPORT_DRY_MD, `> تشغيل تجريبي (--dry-run): كل الكتابات تُتراجع ولا يُحدَّث idmap.json\n\n${renderReportMd(report)}`)
      return
    }
    if (withIds) writeFileAtomic(IDMAP_FILE, JSON.stringify(idmap, null, 1))
    writeFileAtomic(REPORT_JSON, JSON.stringify(report, null, 1))
    writeFileAtomic(REPORT_MD, renderReportMd(report))
  }

  const extra: Pick<ImportResult, 'dryRunUploads' | 'identities'> = {}
  const ds = createDataSource()
  await ds.initialize()
  const now = new Date()
  const failed = new Set<string>()

  // ---- التجربة: مجلد رفع مؤقت + لقطة IDENTITY + معاملة خارجية واحدة ----
  const uploadsBefore = process.env.UPLOADS_ROOT
  let dryUploads: string | null = null
  let identities: IdentityRow[] = []
  let qr: QueryRunner | null = null
  if (dryRun) {
    dryUploads = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-import-dry-uploads-'))
    process.env.UPLOADS_ROOT = dryUploads
    identities = await readIdentities(ds)
    qr = ds.createQueryRunner()
    await qr.connect()
    await qr.startTransaction()
  }
  const depthOf = (runner: QueryRunner) => (runner as unknown as { transactionDepth: number }).transactionDepth
  let aborted: string | null = null

  try {
    for (const mod of selected) {
      const startedAt = new Date()
      const entry: DomainReport = { status: 'ok', startedAt: startedAt.toISOString(), finishedAt: '', durationMs: 0, counts: {}, flags: {} }
      const finish = () => {
        entry.finishedAt = new Date().toISOString()
        entry.durationMs = Date.now() - startedAt.getTime()
        report.domains[mod.DOMAIN] = entry
      }

      const depState = (dep: string) => (selected.some((m) => m.DOMAIN === dep) ? (report.domains[dep]?.status ?? 'skipped') : baseline.domains[dep]?.status)
      const blocked = aborted ? mod.DEPENDS_ON : mod.DEPENDS_ON.filter((dep) => failed.has(dep) || depState(dep) !== 'ok')
      if (aborted || blocked.length) {
        entry.status = 'skipped'
        entry.error = aborted ?? `اعتماديات لم تُستورد بنجاح: ${blocked.join(', ')}`
        failed.add(mod.DOMAIN)
        finish()
        persist(false)
        console.log(`[${mod.DOMAIN}] تُخطّي — ${entry.error}`)
        continue
      }

      const snapshot = JSON.stringify(idmap)
      const makeCtx = (em: EntityManager): Ctx => ({
        ds,
        em,
        now,
        ids: {
          get: (kind, legacyId) => idmap[kind]?.[String(legacyId)],
          set: (kind, legacyId, newId) => {
            if (!Number.isFinite(newId)) throw new Error(`معرّف جديد غير صالح للنوع ${kind}`)
            ;(idmap[kind] ??= {})[String(legacyId)] = newId
          },
        },
        flag: (kind, legacyId, message) => {
          ;(entry.flags[kind] ??= []).push({ legacyId: legacyId == null ? null : String(legacyId), message: String(message) })
        },
        count: (kind, n = 1) => {
          entry.counts[kind] = (entry.counts[kind] ?? 0) + n
        },
      })

      console.log(`[${mod.DOMAIN}] بدء…${dryRun ? ' (تجريبي)' : ''}`)
      const useTx = dryRun || options.transaction !== false
      try {
        if (qr) {
          const depth = depthOf(qr)
          await qr.startTransaction() // SAVE TRANSACTION داخل المعاملة الخارجية
          try {
            await mod.run(makeCtx(qr.manager))
          } catch (err) {
            if (qr.isTransactionActive && depthOf(qr) === depth + 1) {
              try {
                await qr.rollbackTransaction() // ROLLBACK إلى نقطة حفظ المجال
              } catch {
                aborted = 'تعذر التراجع إلى نقطة حفظ المجال السابق — أُوقفت التجربة'
              }
            } else aborted = 'المعاملة الخارجية لم تعد سليمة بعد فشل مجال سابق — أُوقفت التجربة'
            throw err
          }
          if (!qr.isTransactionActive || depthOf(qr) !== depth + 1) {
            aborted = 'المجال غيّر حالة المعاملة الخارجية — أُوقفت التجربة'
            throw new Error(aborted)
          }
          await qr.commitTransaction() // عمق > 1: إنقاص العمق فقط، لا COMMIT فعلي
        } else if (useTx) {
          await ds.transaction((em) => mod.run(makeCtx(em)))
        } else {
          await mod.run(makeCtx(ds.manager))
        }
        finish()
        persist(true)
      } catch (err) {
        // تراجع المعاملة ⇒ المعرّفات والأعداد الجديدة لهذا المجال لم تعد صحيحة
        if (useTx) {
          for (const k of Object.keys(idmap)) delete idmap[k]
          Object.assign(idmap, JSON.parse(snapshot))
          entry.counts = {}
        }
        entry.status = 'failed'
        entry.error = sanitizeError(err)
        failed.add(mod.DOMAIN)
        finish()
        persist(!useTx)
        const frames = err instanceof Error && err.stack ? err.stack.split('\n').filter((l) => /^\s+at /.test(l)).slice(0, 6).join('\n') : ''
        console.error(`[${mod.DOMAIN}] فشل — ${entry.error}${frames ? `\n${frames}` : ''}`)
        continue
      }
      const flags = Object.values(entry.flags).reduce((s, l) => s + l.length, 0)
      const counts = Object.values(entry.counts).reduce((s, n) => s + n, 0)
      console.log(`[${mod.DOMAIN}] تم — سجلات: ${counts}، تنبيهات: ${flags}، ${(entry.durationMs / 1000).toFixed(1)}ث`)
    }
  } finally {
    if (qr) {
      // لا COMMIT أبدًا في التجربة: تراجع كامل (وإن تعذر، إغلاق الاتصال يُسقط المعاملة في الخادم)
      try {
        while (qr.isTransactionActive) await qr.rollbackTransaction()
      } catch {
        /* يُغلق الاتصال أدناه */
      }
      try {
        await qr.release()
      } catch {
        /* الاتصال مغلق */
      }
    }
    try {
      if (dryRun && ds.isInitialized) {
        if (qr && qr.isTransactionActive) {
          // المعاملة ما زالت مفتوحة على اتصال محرر: إغلاق المجمع يُسقطها قبل إعادة العدادات
          await ds.destroy()
          const fresh = createDataSource()
          await fresh.initialize()
          try {
            extra.identities = await restoreIdentities(fresh, identities)
          } finally {
            await fresh.destroy()
          }
        } else {
          extra.identities = await restoreIdentities(ds, identities)
        }
      }
    } finally {
      if (ds.isInitialized) await ds.destroy()
      if (dryUploads) {
        extra.dryRunUploads = countFiles(dryUploads)
        fs.rmSync(dryUploads, { recursive: true, force: true })
        if (uploadsBefore === undefined) delete process.env.UPLOADS_ROOT
        else process.env.UPLOADS_ROOT = uploadsBefore
      }
    }
  }
  if (dryRun) persist(false)
  console.log(`التقرير: ${dryRun ? REPORT_DRY_MD : REPORT_MD}`)
  return { ...report, dryRun, ordered: selected.map((m) => m.DOMAIN), ...extra }
}

async function main(argv: string[]): Promise<number> {
  const arg = (name: string) => argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`))
  const modules = discoverDomains()

  if (arg('manifest')) {
    const sources = sourcesManifest(modules)
    fs.mkdirSync(MIGRATION_DIR, { recursive: true })
    writeFileAtomic(SOURCES_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), rawDir: RAW_DIR, sources }, null, 1))
    console.log(`مصادر: ${sources.length} من ${modules.length} مجال → ${SOURCES_FILE}`)
    return 0
  }

  if (arg('check')) {
    for (const m of orderDomains(modules)) {
      console.log(`${m.DOMAIN}${m.DEPENDS_ON.length ? ` ← ${m.DEPENDS_ON.join(', ')}` : ''}`)
      for (const s of m.SOURCES) {
        if (!fs.existsSync(rawDir(s.key))) {
          console.log(`  - ${s.key}: غير مستخرج`)
          continue
        }
        const n = s.binary ? fs.readdirSync(rawDir(s.key)).filter((f) => f.endsWith('.meta.json')).length : readRaw(s.key).length
        console.log(`  - ${s.key}: ${n}${s.binary ? ' ملف' : ' عنصر'}`)
      }
    }
    return 0
  }

  const onlyArg = arg('only')
  const only = onlyArg?.includes('=') ? onlyArg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean) : undefined
  const report = await runImport(modules, { only, fresh: !!arg('fresh'), transaction: !arg('no-transaction'), dryRun: !!arg('dry-run') })
  return Object.values(report.domains).some((d) => d.status !== 'ok') ? 1 : 0
}

if (require.main === module) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error(`فشل الاستيراد — ${sanitizeError(err)}`)
      process.exit(1)
    },
  )
}
