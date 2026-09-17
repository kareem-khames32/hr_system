// ===== مجال الهيكل التنظيمي وبيانات الشركة (org) =====
// المصدر: الـAPI القديم (logic-leap) — settings/company، settings/branches، settings/departments، settings/teams،
// settings/job-titles، settings/grades، settings/cost-centers، leaves/holidays + ملف الشعار.
// الهدف: requests_config (company.* / system.*) + stored_files (الشعار) + branches/departments/teams/job_titles/grades/
// cost_centers/public_holidays — كتابة مباشرة بلا خدمات ولا عزل فروع ولا تحقق DTO.
//
// خريطة المعرّفات لباقي المجالات (ctx.ids):
//   branch / department / team / job_title / grade / cost_center  ← المعرّف القديم
//   holiday ← أول صف مُنشأ للعطلة، holiday_row ← "<id>:<سنة>" للعطلات المتكررة، company_logo ← "logo"
// مديرو الفروع (branch_manager_id = معرّف موظف) ومديرو الأقسام وقادة الفرق (manager_id/leader_id = معرّف مستخدم)
// لا تُحل هنا: مجال الموظفين يقرأ raw/branches وraw/departments وraw/teams ويكتب managerEmployeeId/leaderEmployeeId.
// العطلة الأسبوعية (attendance.weekend_days) من work-days يملكها مجال الحضور.
//
// ما لا يعيده الـAPI القديم أصلًا: الصفوف المحذوفة ناعمًا، وbranch_id/name_ar الصريح للعطلات (الاسم حسب Accept-Language).

import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import type { DeepPartial } from 'typeorm'
import { rawDir, readRaw, type Ctx, type Source } from './framework'
import { Branch } from '../../src/org/entities/branch.entity'
import { Department } from '../../src/org/entities/department.entity'
import { Team } from '../../src/org/entities/team.entity'
import { CostCenter, Grade, JobTitle, PublicHoliday } from '../../src/assets/assets.entities'
import { RequestsConfig } from '../../src/requests/entities/requests-config.entity'
import { StoredFile } from '../../src/files/stored-file.entity'
import { uploadsRoot } from '../../src/files/storage'
import { companyProfileConfigError } from '../../src/settings/company-profile'
import { isDataPlaceholder } from '../../src/common/data-placeholders'

export const DOMAIN = 'org'
export const DEPENDS_ON: string[] = []

// per_page: أقصى قيمة يقبلها BaseController::perPage = 200 (config pagination.max_per_page)؛
// العطلات عبر HolidayService::list بلا سقف. القوائم تعيد أعمدة الجدول كاملة (لا Resource للإعدادات)،
// فلا حاجة لمسارات التفاصيل. الأقسام وتكلفة المراكز مقيّدة بفروع المستخدم — جلسة أدمن على مستوى الشركة.
export const SOURCES: Source[] = [
  { key: 'company', path: 'settings/company' },
  // الشعار يُخدم من قرص public خارج /api (logo_url رابط مطلق، أو رابط خارجي كما هو):
  // المستخرج يعامل المعرّف المطلق كرابط كامل ويحفظ ملفًا واحدًا بأي اسم آمن داخل raw/company-logo/
  { key: 'company-logo', path: '{id}', each: { from: 'company', idField: 'logo_url' }, binary: true },
  { key: 'branches', path: 'settings/branches', paginated: true, params: { per_page: 200 } },
  { key: 'departments', path: 'settings/departments', paginated: true, params: { per_page: 200 } },
  { key: 'teams', path: 'settings/teams', paginated: true, params: { per_page: 200 } },
  { key: 'job-titles', path: 'settings/job-titles', paginated: true, params: { per_page: 200 } },
  { key: 'grades', path: 'settings/grades', paginated: true, params: { per_page: 200 } },
  { key: 'cost-centers', path: 'settings/cost-centers', paginated: true, params: { per_page: 200 } },
  // HolidayResource: name مترجم حسب Accept-Language — المستخرج يرسل Accept-Language: ar
  { key: 'holidays', path: 'leaves/holidays', paginated: true, params: { per_page: 200 } },
]

// ===================== أدوات صغيرة =====================

type Row = Record<string, unknown>

const str = (v: unknown): string | null => {
  if (v == null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}
const bool = (v: unknown, fallback = true): boolean => {
  if (v == null || v === '') return fallback
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  const s = String(v).trim().toLowerCase()
  return !(s === '0' || s === 'false' || s === 'no' || s === 'inactive')
}
const num = (v: unknown): number | null => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const legacyIdOf = (row: Row): number | null => {
  const n = num(row.id)
  return n != null && Number.isInteger(n) && n > 0 ? n : null
}
const dateOnly = (v: unknown): string | null => {
  const s = str(v)
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (!m) return null
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? `${m[1]}-${m[2]}-${m[3]}` : null
}
const byLegacyId = (rows: Row[]): Row[] => {
  const seen = new Set<number>()
  return rows
    .filter((r) => {
      const id = legacyIdOf(r)
      if (id == null || seen.has(id)) return false
      seen.add(id)
      return true
    })
    .sort((a, b) => legacyIdOf(a)! - legacyIdOf(b)!)
}
const uniqueKey = (s: string) => s.trim().toLocaleLowerCase('ar')

// يقص للطول المسموح ويسجّل تنبيهًا باسم الحقل فقط (بلا القيمة)
function fit(ctx: Ctx, kind: string, legacyId: number | string | null, field: string, value: string | null, max: number): string | null {
  if (value == null) return null
  if (value.length <= max) return value
  ctx.flag('TRUNCATED', legacyId, `${kind}.${field} قُصّ إلى ${max} حرف`)
  return value.slice(0, max)
}

// تحديث صف موجود من خريطة المعرّفات (إعادة التشغيل) أو إنشاء جديد
async function upsertMapped<T extends { id: number }>(
  ctx: Ctx,
  entity: new () => T,
  kind: string,
  legacyId: number | string,
  values: Partial<T>,
  adopt?: () => Promise<T | null>,
): Promise<T> {
  const repo = ctx.em.getRepository(entity)
  const mappedId = ctx.ids.get(kind, legacyId)
  let current: T | null = mappedId ? await repo.findOneBy({ id: mappedId } as never) : null
  if (!current && adopt) {
    current = await adopt()
    if (current) ctx.flag('ADOPTED_EXISTING', legacyId, `${kind}: صف موجود عندنا بنفس المفتاح الفريد رُبط وحُدّث`)
  }
  const entityLike = values as unknown as DeepPartial<T>
  const row: T = current ? repo.merge(current, entityLike) : repo.create(entityLike)
  const saved = (await repo.save(row)) as T
  ctx.ids.set(kind, legacyId, saved.id)
  ctx.count(kind)
  return saved
}

// ===================== بيانات الشركة =====================

const ISO2: Record<string, string> = {
  SA: 'SA', 'SAUDI ARABIA': 'SA', KSA: 'SA', SAUDI: 'SA', 'السعودية': 'SA', 'المملكة العربية السعودية': 'SA',
  EG: 'EG', EGYPT: 'EG', 'مصر': 'EG', 'جمهورية مصر العربية': 'EG',
  AE: 'AE', 'UNITED ARAB EMIRATES': 'AE', UAE: 'AE', 'الإمارات': 'AE', 'الامارات': 'AE',
  KW: 'KW', KUWAIT: 'KW', 'الكويت': 'KW', BH: 'BH', BAHRAIN: 'BH', 'البحرين': 'BH',
  QA: 'QA', QATAR: 'QA', 'قطر': 'QA', OM: 'OM', OMAN: 'OM', 'عمان': 'OM', 'عُمان': 'OM',
  JO: 'JO', JORDAN: 'JO', 'الأردن': 'JO', 'الاردن': 'JO',
}
const resolveCountry = (raw: string | null): string | null => (raw ? ISO2[raw.trim().toUpperCase()] ?? ISO2[raw.trim()] ?? null : null)

const NEEDS_COMPLETION_KEYS = [
  'company.commercial_register_expiry',
  'company.unified_number',
  'company.qiwa_establishment_number',
  'company.national_address_building_no',
  'company.national_address_street',
  'company.national_address_district',
  'company.national_address_postal_code',
  'company.national_address_additional_no',
  'company.payroll_bank_name',
  'company.payroll_iban',
  'company.wps_establishment_id',
]

async function setConfig(ctx: Ctx, key: string, value: string): Promise<void> {
  let v = value
  if (v.length > 500) {
    ctx.flag('TRUNCATED', 'company', `${key} قُصّ إلى 500 حرف`)
    v = v.slice(0, 500)
  }
  await ctx.em.getRepository(RequestsConfig).save({ key, value: v })
  ctx.count('company_setting')
}

async function importCompany(ctx: Ctx): Promise<string | null> {
  const company = readRaw<Row>('company')[0]
  if (!company) {
    ctx.flag('COMPANY_INFO_MISSING', null, 'بيانات الشركة غير موجودة في النظام القديم (أو لم تُستخرج) — مفاتيح company.* بقيت كما هي')
    return null
  }
  const W = (k: string, v: string | null) => setConfig(ctx, k, v ?? '')

  const name = str(company.name_ar)
  if (!name) ctx.flag('NEEDS_COMPLETION', 'company', 'اسم الشركة بالعربي فارغ — الخطابات الرسمية لن تُصدر حتى يُستكمل')
  else if (isDataPlaceholder(name)) ctx.flag('INVALID_FORMAT', 'company', 'اسم الشركة قيمة مؤقتة وليست اسمًا حقيقيًا')
  await W('company.name', name)
  await W('company.name_en', str(company.name_en))
  await W('company.commercial_register', str(company.cr_number))
  await W('company.address', str(company.address_ar))
  await W('company.phone', str(company.phone))
  await W('company.national_address_city', str(company.city))

  const checked = async (key: string, value: string | null) => {
    if (value && companyProfileConfigError(key, value)) ctx.flag('INVALID_FORMAT', 'company', `${key}: صيغة لا يقبلها نظامنا عند التعديل — كُتبت كما هي`)
    await W(key, value)
  }
  await checked('company.vat_number', str(company.tax_number)?.replace(/\s+/g, '') ?? null)
  await checked('company.email', str(company.email))
  await checked('company.website', str(company.website))

  const countryRaw = str(company.country)
  const country = resolveCountry(countryRaw)
  if (country) await W('system.country', country)
  else if (countryRaw) ctx.flag('UNSUPPORTED_VALUE', 'company', 'دولة الشركة نص غير معروف — system.country لم يُضبط')
  else ctx.flag('NEEDS_COMPLETION', 'company', 'دولة الشركة غير محددة في النظام القديم')

  const insurance = str(company.insurance_number)?.replace(/\s+/g, '') ?? null
  if (insurance) {
    const key = country === 'EG' ? 'company.eg_insurance_establishment_number' : 'company.gosi_establishment_number'
    if (country !== 'SA' && country !== 'EG') ctx.flag('AMBIGUOUS', 'company', 'رقم منشأة التأمينات كُتب في مفتاح GOSI لأن دولة الشركة غير محسومة')
    await checked(key, insurance)
  }

  const currency = str(company.currency)?.toUpperCase() ?? null
  if (currency === 'SAR' || currency === 'EGP') await W('system.currency', currency)
  else if (currency) ctx.flag('UNSUPPORTED_VALUE', 'company', 'عملة الشركة غير SAR/EGP — system.currency بقي كما هو')

  const dropped = ['short_name', 'address_en', 'language', 'date_format', 'calendar', 'week_start', 'weekend_days'].filter((f) => {
    const v = company[f]
    return Array.isArray(v) ? v.length > 0 : str(v) != null
  })
  if (dropped.length) ctx.flag('DROPPED_FIELD', 'company', `حقول بلا مكان عندنا (محفوظة في raw/company): ${dropped.join(', ')}`)
  const tz = str(company.timezone)
  if (tz) {
    const shown = /^[A-Za-z_]+(\/[A-Za-z_+-]+)*$/.test(tz) ? ` (${tz})` : ''
    ctx.flag('CHECK_TIMEZONE', 'company', `المنطقة الزمنية للشركة في النظام القديم${shown} — طابقها مع TZ السيرفر لأوقات البصمة`)
  }

  const current = await ctx.em.getRepository(RequestsConfig).findBy(NEEDS_COMPLETION_KEYS.map((key) => ({ key })))
  const filled = new Set(current.filter((r) => str(r.value)).map((r) => r.key))
  const missing = NEEDS_COMPLETION_KEYS.filter((k) => !filled.has(k))
  if (missing.length) ctx.flag('NEEDS_COMPLETION', 'company', `لا مصدر لها في النظام القديم وتُستكمل يدويًا: ${missing.join(', ')}`)

  await importLogo(ctx, company)
  return country
}

const IMAGE_EXT: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/gif': '.gif' }

async function importLogo(ctx: Ctx, company: Row): Promise<void> {
  const repo = ctx.em.getRepository(StoredFile)
  const mapped = ctx.ids.get('company_logo', 'logo')
  if (mapped && (await repo.findOneBy({ id: mapped }))) {
    await setConfig(ctx, 'company.logo_file_id', String(mapped))
    return
  }
  const hasLogo = str(company.logo_url) || str(company.logo_path)
  if (!hasLogo) return

  // ملف واحد في raw/company-logo/ أيًا كان اسمه (المعرّف رابط)
  const dir = rawDir('company-logo')
  let names: string[] = []
  try {
    names = fs.readdirSync(dir)
  } catch {
    names = []
  }
  const fileName = names.filter((n) => !n.endsWith('.meta.json') && !n.endsWith('.tmp')).sort()[0]
  if (!fileName) {
    ctx.flag('FILE_MISSING', 'company', 'شعار الشركة موجود في النظام القديم لكن الملف لم يُستخرج — company.logo_file_id فارغ')
    await setConfig(ctx, 'company.logo_file_id', '')
    return
  }
  const base = fileName.replace(/\.[^.]+$/, '')
  let meta: { contentType?: unknown; filename?: unknown } = {}
  try {
    meta = JSON.parse(fs.readFileSync(path.join(dir, `${base}.meta.json`), 'utf8').replace(/^﻿/, ''))
  } catch {
    meta = {}
  }
  const ext = path.extname(fileName).toLowerCase()
  const byExt: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif' }
  const mime = (typeof meta.contentType === 'string' && meta.contentType.split(';')[0].trim().toLowerCase()) || byExt[ext] || 'application/octet-stream'
  if (!mime.startsWith('image/')) {
    ctx.flag('FILE_MISSING', 'company', 'ملف الشعار المستخرج ليس صورة — لم يُربط')
    await setConfig(ctx, 'company.logo_file_id', '')
    return
  }
  const buffer = fs.readFileSync(path.join(dir, fileName))
  const now = ctx.now
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const storedName = `${month}/${randomUUID()}${IMAGE_EXT[mime] ?? (ext || '.png')}`
  const target = path.join(uploadsRoot(), storedName)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, buffer)

  const sourceName = (typeof meta.filename === 'string' && path.basename(meta.filename.trim())) || path.basename(String(company.logo_path ?? fileName))
  const uploadedAt = str(company.updated_at) ? new Date(String(company.updated_at)) : now
  const saved = await repo.save(
    repo.create({
      originalName: sourceName.slice(0, 300) || `logo${ext}`,
      storedName,
      mime: mime.slice(0, 100),
      size: buffer.length,
      entityType: 'company_logo',
      uploadedAt: Number.isNaN(uploadedAt.getTime()) ? now : uploadedAt,
    } as Partial<StoredFile>),
  )
  ctx.ids.set('company_logo', 'logo', saved.id)
  ctx.count('company_logo')
  await setConfig(ctx, 'company.logo_file_id', String(saved.id))
}

// ===================== الفروع =====================

function insuranceSystemFor(country: string | null): string {
  return country === 'SA' ? 'SAUDI' : country === 'EG' ? 'EGYPTIAN' : 'NONE'
}

async function importBranches(ctx: Ctx, country: string | null): Promise<void> {
  const rows = byLegacyId(readRaw<Row>('branches'))
  const repo = ctx.em.getRepository(Branch)
  const usedCodes = new Set<string>()
  // أكواد مستخدمة في قاعدتنا لصفوف ليست من هذا الاستيراد (لا تُعاد تسميتها)
  const mappedIds = new Set(rows.map((r) => ctx.ids.get('branch', legacyIdOf(r)!)).filter((x): x is number => !!x))
  const sourceCodes = new Set(rows.map((r) => str(r.code)).filter((c): c is string => !!c).map(uniqueKey))
  for (const b of await repo.find({ select: { id: true, code: true } }))
    if (!mappedIds.has(b.id) && !sourceCodes.has(uniqueKey(b.code))) usedCodes.add(uniqueKey(b.code))

  const insuranceSystem = insuranceSystemFor(country)
  let hq = 0
  for (const row of rows) {
    const id = legacyIdOf(row)!
    let code = fit(ctx, 'branch', id, 'code', str(row.code), 50)
    if (!code || usedCodes.has(uniqueKey(code))) {
      ctx.flag('GENERATED_CODE', id, code ? 'كود الفرع مكرر — وُلّد BR-<id>' : 'الفرع بلا كود — وُلّد BR-<id>')
      code = `BR-${id}`
      for (let n = 2; usedCodes.has(uniqueKey(code)); n++) code = `BR-${id}-${n}`
    }
    usedCodes.add(uniqueKey(code))
    let name = fit(ctx, 'branch', id, 'name', str(row.name_ar), 200)
    if (!name) {
      name = fit(ctx, 'branch', id, 'name', str(row.name_en), 200) ?? `فرع ${id}`
      ctx.flag('NAME_MISSING', id, 'الفرع بلا اسم عربي — استُخدم الإنجليزي أو اسم مؤقت')
    }
    const isHeadquarters = bool(row.is_headquarters, false)
    if (isHeadquarters) hq++
    const finalCode = code
    await upsertMapped(ctx, Branch, 'branch', id, {
      name,
      nameEn: fit(ctx, 'branch', id, 'nameEn', str(row.name_en), 200) as string,
      code: finalCode,
      city: fit(ctx, 'branch', id, 'city', str(row.city), 100) as string,
      address: fit(ctx, 'branch', id, 'address', str(row.address), 500) as string,
      phone: fit(ctx, 'branch', id, 'phone', str(row.phone), 50) as string,
      email: fit(ctx, 'branch', id, 'email', str(row.email), 200) as string,
      insuranceSystem,
      isActive: bool(row.is_active),
      isHeadquarters,
    }, () => repo.findOneBy({ code: finalCode }))
    if (insuranceSystem !== 'NONE') ctx.flag('DERIVED', id, `نظام التأمينات للفرع = ${insuranceSystem} من دولة الشركة (النظام القديم كان لكل موظف) — راجعه`)
    else ctx.flag('NEEDS_COMPLETION', id, 'نظام التأمينات للفرع = بدون (دولة الشركة غير محسومة) — راجعه قبل المسير')
  }
  if (rows.length && hq === 0) ctx.flag('NO_HEADQUARTERS', null, 'لا يوجد فرع رئيسي محدد في النظام القديم')
  if (hq > 1) ctx.flag('MULTIPLE_HEADQUARTERS', null, `أكثر من فرع رئيسي في النظام القديم (${hq})`)
  if (!rows.length) ctx.flag('NO_SOURCE_ROWS', null, 'لا فروع في raw/branches')
}

// فرع احتياطي لقسم بلا فرع صالح: الرئيسي، وإلا أول فرع مستورد، وإلا فرع مؤقت واحد
async function fallbackBranchId(ctx: Ctx, cache: { id?: number }): Promise<number> {
  if (cache.id) return cache.id
  const rows = byLegacyId(readRaw<Row>('branches'))
  const hq = rows.find((r) => bool(r.is_headquarters, false) && ctx.ids.get('branch', legacyIdOf(r)!))
  const first = rows.find((r) => ctx.ids.get('branch', legacyIdOf(r)!))
  const pick = hq ?? first
  if (pick) return (cache.id = ctx.ids.get('branch', legacyIdOf(pick)!)!)
  const saved = await upsertMapped(ctx, Branch, 'branch', 'legacy-unassigned', {
    name: 'فرع غير محدد (مرحّل)', code: 'LEGACY-UNASSIGNED', isActive: false, insuranceSystem: 'NONE', isHeadquarters: false,
  }, () => ctx.em.getRepository(Branch).findOneBy({ code: 'LEGACY-UNASSIGNED' }))
  ctx.flag('PLACEHOLDER_CREATED', null, 'أُنشئ فرع مؤقت غير نشط لأقسام بلا فرع')
  return (cache.id = saved.id)
}

// ===================== الأقسام =====================

async function importDepartments(ctx: Ctx): Promise<void> {
  const rows = byLegacyId(readRaw<Row>('departments'))
  const byId = new Map(rows.map((r) => [legacyIdOf(r)!, r]))
  const fallback: { id?: number } = {}

  // قطع الحلقات والآباء المفقودين: الأب الفعّال لكل قسم
  const parentOf = new Map<number, number | null>()
  for (const row of rows) {
    const id = legacyIdOf(row)!
    const p = num(row.parent_id)
    if (p == null) parentOf.set(id, null)
    else if (!byId.has(p)) {
      parentOf.set(id, null)
      ctx.flag('PARENT_BROKEN', id, 'القسم الأب غير موجود (محذوف أو خارج النطاق) — صار قسمًا رئيسيًا')
    } else parentOf.set(id, p)
  }
  for (const row of rows) {
    const id = legacyIdOf(row)!
    const trail = new Set<number>([id])
    let cur = parentOf.get(id) ?? null
    let depth = 0
    while (cur != null) {
      if (trail.has(cur) || ++depth > 20) {
        parentOf.set(id, null)
        ctx.flag('PARENT_BROKEN', id, 'حلقة في شجرة الأقسام — فُك ربط الأب')
        break
      }
      trail.add(cur)
      cur = parentOf.get(cur) ?? null
    }
  }
  const rootOf = (id: number): number => {
    let cur = id
    for (let i = 0; i < 25; i++) {
      const p = parentOf.get(cur)
      if (p == null) return cur
      cur = p
    }
    return cur
  }

  // المرور 1: الأقسام بفرع جذرها (نظامنا يرفض أبًا في فرع مختلف)
  for (const row of rows) {
    const id = legacyIdOf(row)!
    const root = byId.get(rootOf(id))!
    const rootBranchLegacy = num(root.resolved_branch_id) ?? num(root.branch_id)
    let branchId = rootBranchLegacy != null ? ctx.ids.get('branch', rootBranchLegacy) : undefined
    if (!branchId) {
      branchId = await fallbackBranchId(ctx, fallback)
      ctx.flag('BRANCH_DEFAULTED', id, 'فرع القسم غير موجود في الفروع المستوردة — أُسند للفرع الرئيسي/الأول')
    } else if (num(row.branch_id) != null && num(row.branch_id) !== rootBranchLegacy) {
      ctx.flag('BRANCH_REALIGNED', id, 'فرع القسم المخزن يختلف عن فرع جذره — أُخذ فرع الجذر')
    }
    let name = fit(ctx, 'department', id, 'name', str(row.name_ar), 200)
    if (!name) {
      name = fit(ctx, 'department', id, 'name', str(row.name_en), 200) ?? `قسم ${id}`
      ctx.flag('NAME_MISSING', id, 'القسم بلا اسم عربي — استُخدم الإنجليزي أو اسم مؤقت')
    }
    await upsertMapped(ctx, Department, 'department', id, {
      name,
      nameEn: fit(ctx, 'department', id, 'nameEn', str(row.name_en), 200) as string,
      branchId,
      parentId: null as unknown as number,
      isActive: bool(row.is_active),
    })
    if (num(row.cost_center_id) != null) ctx.flag('DROPPED_FIELD', id, 'مركز تكلفة القسم لا عمود له عندنا (يبقى على مستوى الموظف)')
  }

  // المرور 2: الأب
  const repo = ctx.em.getRepository(Department)
  for (const row of rows) {
    const id = legacyIdOf(row)!
    const p = parentOf.get(id)
    if (p == null) continue
    const selfId = ctx.ids.get('department', id)
    const parentId = ctx.ids.get('department', p)
    if (selfId && parentId) await repo.update({ id: selfId }, { parentId })
  }
  if (rows.length) ctx.flag('EXECUTIVE_DEPT_UNSET', null, 'لا مقابل لـ«الإدارة التنفيذية» في النظام القديم — تُحدد يدويًا إن لزم')
}

// قسم مؤقت غير نشط لفريق يشير لقسم غير موجود (محذوف ناعمًا في القديم) — يُسجل بنفس المعرّف القديم
async function placeholderDepartment(ctx: Ctx, legacyDeptId: number, fallback: { id?: number }): Promise<number> {
  const existing = ctx.ids.get('department', legacyDeptId)
  if (existing) return existing
  const saved = await upsertMapped(ctx, Department, 'department', legacyDeptId, {
    name: `قسم محذوف في النظام القديم (${legacyDeptId})`,
    branchId: await fallbackBranchId(ctx, fallback),
    isActive: false,
  })
  ctx.flag('PLACEHOLDER_CREATED', legacyDeptId, 'قسم غير موجود في القائمة (محذوف غالبًا) — أُنشئ قسم مؤقت غير نشط')
  return saved.id
}

// ===================== الفرق =====================

async function importTeams(ctx: Ctx): Promise<void> {
  const fallback: { id?: number } = {}
  for (const row of byLegacyId(readRaw<Row>('teams'))) {
    const id = legacyIdOf(row)!
    const deptLegacy = num(row.department_id)
    let departmentId = deptLegacy != null ? ctx.ids.get('department', deptLegacy) : undefined
    if (!departmentId) {
      if (deptLegacy != null) departmentId = await placeholderDepartment(ctx, deptLegacy, fallback)
      else {
        departmentId = await placeholderDepartment(ctx, 0, fallback)
        ctx.flag('DEPARTMENT_MISSING', id, 'الفريق بلا قسم — رُبط بقسم مؤقت')
      }
    }
    let name = fit(ctx, 'team', id, 'name', str(row.name_ar), 200)
    if (!name) {
      name = fit(ctx, 'team', id, 'name', str(row.name_en), 200) ?? `فريق ${id}`
      ctx.flag('NAME_MISSING', id, 'الفريق بلا اسم عربي — استُخدم الإنجليزي أو اسم مؤقت')
    } else if (str(row.name_en)) ctx.flag('DROPPED_FIELD', id, 'الاسم الإنجليزي للفريق لا عمود له عندنا')
    await upsertMapped(ctx, Team, 'team', id, { name, departmentId, isActive: bool(row.is_active) })
  }
}

// ===================== الكتالوجات =====================

async function importJobTitles(ctx: Ctx): Promise<void> {
  const repo = ctx.em.getRepository(JobTitle)
  const used = new Set<string>()
  for (const row of byLegacyId(readRaw<Row>('job-titles'))) {
    const id = legacyIdOf(row)!
    let title = str(row.name_ar) ?? str(row.name_en)
    if (!str(row.name_ar)) ctx.flag('NAME_MISSING', id, 'مسمى بلا اسم عربي — استُخدم الإنجليزي أو اسم مؤقت')
    title = fit(ctx, 'job_title', id, 'title', title ?? `مسمى ${id}`, 200)!
    if (used.has(uniqueKey(title))) {
      title = `${title.slice(0, 200 - ` (${id})`.length)} (${id})`
      ctx.flag('RENAMED_DUPLICATE', id, 'مسمى مكرر — أضيف المعرّف القديم للاسم')
    }
    used.add(uniqueKey(title))
    const final = title
    await upsertMapped(ctx, JobTitle, 'job_title', id, {
      title: final,
      titleEn: fit(ctx, 'job_title', id, 'titleEn', str(row.name_en), 200) as string,
      isActive: bool(row.is_active),
    }, () => repo.findOneBy({ title: final }))
    if (str(row.description)) ctx.flag('DROPPED_FIELD', id, 'وصف المسمى لا عمود له عندنا')
  }
}

async function importGrades(ctx: Ctx): Promise<void> {
  const repo = ctx.em.getRepository(Grade)
  const used = new Set<string>()
  for (const row of byLegacyId(readRaw<Row>('grades'))) {
    const id = legacyIdOf(row)!
    let name = fit(ctx, 'grade', id, 'name', str(row.name) ?? `درجة ${id}`, 100)!
    if (!str(row.name)) ctx.flag('NAME_MISSING', id, 'درجة بلا اسم — اسم مؤقت')
    if (used.has(uniqueKey(name))) {
      name = `${name.slice(0, 100 - ` (${id})`.length)} (${id})`
      ctx.flag('RENAMED_DUPLICATE', id, 'درجة مكررة — أضيف المعرّف القديم للاسم')
    }
    used.add(uniqueKey(name))
    const minSalary = num(row.min_salary)
    const maxSalary = num(row.max_salary)
    if ((minSalary != null && minSalary < 0) || (maxSalary != null && maxSalary < 0) || (minSalary != null && maxSalary != null && minSalary > maxSalary))
      ctx.flag('INVALID_RANGE', id, 'نطاق راتب الدرجة غير منطقي — نُقل كما هو')
    const final = name
    await upsertMapped(ctx, Grade, 'grade', id, {
      name: final,
      minSalary: minSalary as number,
      maxSalary: maxSalary as number,
      isActive: bool(row.is_active),
    }, () => repo.findOneBy({ name: final }))
    if (num(row.level) != null) ctx.flag('DROPPED_FIELD', id, 'مستوى الدرجة (level) لا عمود له عندنا')
  }
}

async function importCostCenters(ctx: Ctx): Promise<void> {
  const repo = ctx.em.getRepository(CostCenter)
  const used = new Set<string>()
  for (const row of byLegacyId(readRaw<Row>('cost-centers'))) {
    const id = legacyIdOf(row)!
    let code = fit(ctx, 'cost_center', id, 'code', str(row.code), 50)
    if (!code || used.has(uniqueKey(code))) {
      ctx.flag('GENERATED_CODE', id, code ? 'كود مركز التكلفة مكرر — وُلّد CC-<id>' : 'مركز تكلفة بلا كود — وُلّد CC-<id>')
      code = `CC-${id}`
      for (let n = 2; used.has(uniqueKey(code)); n++) code = `CC-${id}-${n}`
    }
    used.add(uniqueKey(code))
    let name = fit(ctx, 'cost_center', id, 'name', str(row.name), 200)
    if (!name) {
      name = code
      ctx.flag('NAME_MISSING', id, 'مركز تكلفة بلا اسم — استُخدم الكود')
    }
    const status = str(row.status)?.toLowerCase()
    const final = code
    await upsertMapped(ctx, CostCenter, 'cost_center', id, {
      code: final,
      name,
      isActive: status == null ? true : status === 'active',
    }, () => repo.findOneBy({ code: final }))
    if (num(row.branch_id) != null) ctx.flag('BRANCH_SCOPE_LOST', id, 'مركز تكلفة خاص بفرع في القديم — صار لكل الشركة عندنا')
  }
}

// ===================== العطلات =====================

const asDateKey = (v: unknown): string | null => (v instanceof Date ? (Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10)) : dateOnly(v))
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000)
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)

async function importHolidays(ctx: Ctx): Promise<void> {
  const repo = ctx.em.getRepository(PublicHoliday)
  // غير المتكررة أولًا حتى لا يحجز توسيع متكررة تاريخ عطلة صريحة
  const rows = byLegacyId(readRaw<Row>('holidays')).sort((a, b) => Number(bool(a.is_recurring, false)) - Number(bool(b.is_recurring, false)))
  const lastYear = Math.max(2027, ctx.now.getFullYear() + 1)
  const importedIds = new Set<number>()
  // تواريخ بداية موجودة عندنا (من غير هذا الاستيراد) — للتبنّي ومنع التكرار
  const existing = new Map<string, PublicHoliday>()
  for (const h of await repo.find()) {
    const d = asDateKey(h.date)
    if (d && !existing.has(d)) existing.set(d, h)
  }
  const taken = new Set<string>()

  const put = async (mapKind: string, mapKey: string, legacyId: number, values: Partial<PublicHoliday>) => {
    const date = values.date!
    const adoptable = existing.get(date)
    const saved = await upsertMapped(ctx, PublicHoliday, mapKind, mapKey, values, async () =>
      adoptable && !importedIds.has(adoptable.id) ? adoptable : null)
    importedIds.add(saved.id)
    taken.add(date)
    if (!ctx.ids.get('holiday', legacyId)) ctx.ids.set('holiday', legacyId, saved.id)
    return saved
  }

  for (const row of rows) {
    const id = legacyIdOf(row)!
    const start = dateOnly(row.date)
    if (!start) {
      ctx.flag('INVALID_DATE', id, 'عطلة بلا تاريخ صالح — لم تُستورد')
      continue
    }
    let end = dateOnly(row.end_date)
    if (end && end < start) {
      ctx.flag('INVALID_RANGE', id, 'نهاية العطلة قبل بدايتها — اعتُبرت يومًا واحدًا')
      end = null
    }
    let name = fit(ctx, 'holiday', id, 'name', str(row.name), 200)
    if (!name) {
      name = 'عطلة رسمية'
      ctx.flag('NAME_MISSING', id, 'عطلة بلا اسم — اسم عام')
    }
    if (str(row.country)) ctx.flag('DROPPED_FIELD', id, 'دولة العطلة في القديم وصفية فقط — عندنا تسري على كل الفروع')

    if (!bool(row.is_recurring, false)) {
      await put('holiday_row', `${id}:once`, id, { name, date: start, endDate: end as string, country: '' })
      continue
    }
    // متكررة: صف لكل سنة من سنة المصدر حتى lastYear بنفس الشهر/اليوم والمدة (29 فبراير يُتخطى في غير الكبيسة)
    const span = end ? daysBetween(start, end) : 0
    const [y0, mm, dd] = start.split('-')
    let made = 0
    for (let year = +y0; year <= lastYear; year++) {
      if (mm === '02' && dd === '29' && !isLeap(year)) continue
      const date = `${year}-${mm}-${dd}`
      const mapKey = `${id}:${year}`
      if (taken.has(date) && !ctx.ids.get('holiday_row', mapKey)) continue
      await put('holiday_row', mapKey, id, { name, date, endDate: (span ? addDays(date, span) : null) as string, country: '' })
      made++
    }
    ctx.flag('RECURRING_EXPANDED', id, `عطلة متكررة سنويًا — وُلّدت صفوف حتى ${lastYear} وتحتاج تجديدًا بعده`)
    if (!made) ctx.flag('RECURRING_EXPANDED', id, 'عطلة متكررة لم يُولّد لها صف (تواريخها موجودة بالفعل)')
  }

  const extra = [...existing.values()].filter((h) => !importedIds.has(h.id)).length
  if (extra) ctx.flag('EXTRA_EXISTING', null, `عطلات موجودة عندنا من قبل وليست في النظام القديم: ${extra} (لم تُحذف — راجعها)`)
  if (rows.length) ctx.flag('BRANCH_SCOPE_UNKNOWN', null, 'الـAPI القديم لا يعيد فرع العطلة — كل العطلات صارت لكل الفروع؛ راجع أي عطلة خاصة بفرع')
}

// ===================== التشغيل =====================

export async function run(ctx: Ctx): Promise<void> {
  const country = await importCompany(ctx)
  await importCostCenters(ctx)
  await importJobTitles(ctx)
  await importGrades(ctx)
  await importBranches(ctx, country)
  await importDepartments(ctx)
  await importTeams(ctx)
  await importHolidays(ctx)
}
