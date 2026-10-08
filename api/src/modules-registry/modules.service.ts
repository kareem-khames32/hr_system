import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource, In, MoreThanOrEqual, Not } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { User } from '../auth/user.entity'
import { Employee } from '../employees/employee.entity'
import { audienceNeedsEmployee, audienceNeedsPositions, parseRequestAudience, requestAudienceAllows, AUDIENCE_WHERE_MODES,
  AUDIENCE_WHO_MODES, type AudienceSubject } from '../requests/request-audience'
import { orgPositionsOf } from '../requests/request-audience-positions'
import {
  enabledDependents, enabledSnapshot, featureEnabled, isFeatureKey, isModuleKey, missingDependencies, moduleDefOf, moduleEnabled, moduleOfJob,
  moduleOfRequestType, modulesOfPreset, MODULE_FEATURES, MODULE_KEYS, MODULE_PRESETS, type ModuleKey, type ModulePreset, type ModulesState,
} from './registry'
import { RequestType } from '../requests/entities/request-type.entity'
import { Request } from '../requests/entities/request.entity'
import { SystemModule, SystemModuleEvent, SystemModuleFeature } from './system-module.entities'

interface Loaded {
  at: number
  state: ModulesState
  /** جمهور التفعيل لكل موديول له جمهور (JSON زي ما هو في القاعدة) */
  audiences: Record<string, string>
  /** الصفوف زي ما هي (شاشة الموديولات) */
  rows: Record<string, { enabledAt: Date | null; enabledBy: number | null }>
  /** فترات قفل كل موديول اللي خلصت (من يوم القفل ليوم الفتح، بالتاريخ المحلي) — من سجل الفتح والقفل */
  offIntervals: Record<string, Array<{ from: string; to: string }>>
}

const localDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const EMPTY_STATE = (): Loaded => ({ at: Date.now(), state: { modules: {}, features: {} }, audiences: {}, rows: {}, offIntervals: {} })

// اللي بيحصل بعد قفل موديول معين غير «شاشاته بتختفي» — بيتعرض في تأكيد القفل
const CLOSE_NOTES: Partial<Record<ModuleKey, string[]>> = {
  attendance: ['من يوم القفل المسير مش هيحسب غياب ولا تأخير: مفيش بصمات بتتجمع. والأيام دي مش هتتحسب غياب بعد ما الموديول يتفتح تاني.'],
  custody: ['طلب عهدة اتعتمد ومستني تأكيد الاستلام أو اعتماد المدير هيستنى لحد ما الموديول يتفتح تاني.'],
}

// رقم خطأ SQL Server «Invalid object name»: الجدولين لسه ماتعملوش (الكود اتنشر قبل ترحيل 076)
const MISSING_TABLE = 208
const sqlErrorNumber = (error: unknown): number | undefined =>
  (error as { driverError?: { number?: number }; number?: number })?.driverError?.number ?? (error as { number?: number })?.number

/**
 * حالة الموديولات والمزايا (خطة التنفيذ B0.2): القراءة من القاعدة بكاش قصير (كل طلب بيسأل الحارس)، والحكم بدوال السجل الصافية.
 * - صف غايب = القيمة الافتراضية في السجل.
 * - الجدولين مش موجودين (قبل ترحيل 076) = الافتراضي كله، فمفيش حاجة شغالة بتقف.
 * - خطأ قراءة عابر والكاش موجود = نكمّل بالكاش القديم (مانفتحش موديول مقفول عشان القاعدة اتأخرت).
 */
@Injectable()
export class ModulesService {
  static readonly CACHE_MS = 5000
  static readonly SUBJECT_CACHE_MS = 30000
  private readonly logger = new Logger(ModulesService.name)
  private cache: Loaded | null = null
  private loading: Promise<Loaded> | null = null
  private missingTablesWarned = false
  // بيزيد مع كل مسح للكاش: قراءة بدأت قبل الكتابة مايتخزنش ناتجها (القديم) بوقت جديد
  private generation = 0
  private readonly subjects = new Map<number, { at: number; subject: AudienceSubject }>()

  constructor(private readonly ds: DataSource) {}

  /** بعد أي كتابة (أو في الاختبارات بعد تعديل مباشر في القاعدة) */
  invalidate(): void {
    this.generation += 1
    this.cache = null
    this.loading = null
    this.subjects.clear()
  }

  private async load(): Promise<Loaded> {
    if (this.cache && Date.now() - this.cache.at < ModulesService.CACHE_MS) return this.cache
    if (!this.loading) {
      const reading: Promise<Loaded> = this.read().finally(() => { if (this.loading === reading) this.loading = null })
      this.loading = reading
    }
    return this.loading
  }

  private async read(): Promise<Loaded> {
    const generation = this.generation
    // الناتج بيتخزن لو مفيش كتابة حصلت والقراءة شغالة؛ غير كده بيرجع لصاحبه من غير تخزين والقراءة الجاية بتجيب الجديد
    const keep = (loaded: Loaded) => { if (generation === this.generation) this.cache = loaded; return loaded }
    try {
      const modules = await this.ds.getRepository(SystemModule).find()
      const features = await this.ds.getRepository(SystemModuleFeature).find()
      const events = await this.ds.getRepository(SystemModuleEvent).find({ where: { kind: 'module' }, order: { id: 'ASC' }, select: { id: true, key: true, enabled: true, at: true } })
      const loaded = EMPTY_STATE()
      for (const row of modules) {
        loaded.state.modules[row.key] = !!row.enabled
        loaded.rows[row.key] = { enabledAt: row.enabledAt ?? null, enabledBy: row.enabledBy ?? null }
        if (row.audience && parseRequestAudience(row.audience)) loaded.audiences[row.key] = row.audience
      }
      for (const row of features) loaded.state.features[row.key] = !!row.enabled
      // فترات القفل اللي خلصت: حدث قفل وبعده حدث فتح (حدث تغيير الجمهور enabled = null مابيتحسبش)
      const closedOn: Record<string, string> = {}
      for (const event of events) {
        if (event.enabled === null || event.enabled === undefined) continue
        const day = localDate(new Date(event.at))
        if (!event.enabled) { if (!(event.key in closedOn)) closedOn[event.key] = day; continue }
        if (event.key in closedOn) {
          (loaded.offIntervals[event.key] ??= []).push({ from: closedOn[event.key], to: day })
          delete closedOn[event.key]
        }
      }
      return keep(loaded)
    } catch (error) {
      if (sqlErrorNumber(error) === MISSING_TABLE) {
        if (!this.missingTablesWarned) {
          this.logger.warn('جدولا الموديولات غير موجودين (ترحيل 076 لسه ماتطبقش) — كل الموديولات على قيمها الافتراضية في السجل')
          this.missingTablesWarned = true
        }
        return keep(EMPTY_STATE())
      }
      if (this.cache) {
        this.logger.warn(`تعذرت قراءة حالة الموديولات، مكمّلين بآخر حالة مقروءة: ${(error as Error)?.message ?? error}`)
        return this.cache
      }
      throw error
    }
  }

  async state(): Promise<ModulesState> {
    return (await this.load()).state
  }

  /** كل الموديولات والمزايا دي مفعّلة في الحالة دي؟ (الحارس بيسأل مرة واحدة للطلب) */
  enabledIn(state: ModulesState, modules: readonly ModuleKey[], features: readonly string[] = []): boolean {
    return modules.every((module) => moduleEnabled(state, module)) && features.every((feature) => featureEnabled(state, feature))
  }

  async isEnabled(module: ModuleKey): Promise<boolean> {
    return moduleEnabled(await this.state(), module)
  }

  async isFeatureEnabled(feature: string): Promise<boolean> {
    return featureEnabled(await this.state(), feature)
  }

  /**
   * حالة ميزة لمنادي جوه معاملة: بتتقري بمدير المعاملة نفسه (نفس اتصالها) ومن القاعدة مباشرة — من غير اتصال تاني من المخزن ومن غير الذاكرة
   * المؤقتة (Codex P5A-B07: قراءة بالمخزن جوه معاملة بتستنفد الاتصالات لما كل المعاملات المفتوحة بتستنى اتصال زيادة).
   */
  async isFeatureEnabledIn(em: import('typeorm').EntityManager, feature: string): Promise<boolean> {
    return featureEnabled(await this.freshState(em), feature)
  }

  /**
   * نفس حكم `allowedFor` لمنادي جوه معاملة (Codex P5B-B02): الحالة والجمهور وموقع الموظف بيتقروا بمدير المعاملة نفسه — من غير اتصال تاني
   * من المخزن ومن غير الذاكرة المؤقتة.
   */
  async allowedForIn(em: import('typeorm').EntityManager, module: ModuleKey, user: JwtPayload | null | undefined): Promise<boolean> {
    const fresh = await this.freshLoaded(em)
    const allowed = async (key: ModuleKey, seen: ReadonlySet<string>): Promise<boolean> => {
      if (!moduleEnabled(fresh.state, key)) return false
      if (!user) return true
      const next = new Set(seen).add(key)
      for (const dependency of moduleDefOf(key).dependsOn) {
        if (isModuleKey(dependency) && !next.has(dependency) && !(await allowed(dependency, next))) return false
      }
      const audience = fresh.audiences[key]
      if (!audience || moduleDefOf(key).core) return true
      const base: AudienceSubject = { role: user.role, permissions: user.permissions ?? [], employeeId: user.employeeId ?? null, branchId: user.branchId ?? null }
      if (!user.employeeId || (!audienceNeedsEmployee(audience) && !audienceNeedsPositions(audience))) return requestAudienceAllows(audience, base, 'submit')
      const employee = await em.getRepository(Employee).findOne({ where: { id: user.employeeId }, select: { id: true, departmentId: true, teamId: true, branchId: true } })
      return requestAudienceAllows(audience, { ...base, departmentId: employee?.departmentId ?? null, teamId: employee?.teamId ?? null, branchId: employee?.branchId ?? user.branchId ?? null,
        positions: await orgPositionsOf(em, user.employeeId) }, 'submit')
    }
    return allowed(module, new Set())
  }

  /**
   * الموديول كان مقفول في اليوم ده؟ مقفول دلوقتي = أي يوم؛ ومفتوح دلوقتي = اليوم جوه فترة قفل سابقة (من يوم القفل ليوم الفتح).
   * محرك الحضور بيسأل قبل ما يحسب يوم: والحضور مقفول مفيش بصمات بتتجمع، فاليوم اللي من غير سجل مايتحسبش غياب — لا في المسير
   * ولا في لحاق الغياب بعد ما الموديول يتفتح تاني.
   */
  async wasOffOn(module: ModuleKey, date: string): Promise<boolean> {
    const loaded = await this.load()
    if (!moduleEnabled(loaded.state, module)) return true
    return (loaded.offIntervals[module] ?? []).some((interval) => date >= interval.from && date <= interval.to)
  }

  /** المهمة المجدولة تشتغل؟ (موديولها مفعّل، أو مالهاش موديول مسجّل) */
  async jobEnabled(job: string): Promise<boolean> {
    const module = moduleOfJob(job)
    return module === null || this.isEnabled(module)
  }

  /** نوع الطلب متاح للتقديم؟ (موديوله مفعّل) — الطلبات المفتوحة منه بتكمّل سلسلتها عادي */
  async requestTypeEnabled(type: { code?: string | null; destinationHandler?: string | null }): Promise<boolean> {
    return this.isEnabled(moduleOfRequestType(type))
  }

  // ===== جمهور التفعيل =====
  private async subjectOf(user: JwtPayload, audience: string): Promise<AudienceSubject> {
    const base: AudienceSubject = { role: user.role, permissions: user.permissions ?? [], employeeId: user.employeeId ?? null, branchId: user.branchId ?? null }
    if (!user.employeeId || (!audienceNeedsEmployee(audience) && !audienceNeedsPositions(audience))) return base
    const hit = this.subjects.get(user.sub)
    if (hit && Date.now() - hit.at < ModulesService.SUBJECT_CACHE_MS) return { ...hit.subject, role: user.role, permissions: user.permissions ?? [] }
    const employee = await this.ds.getRepository(Employee).findOne({ where: { id: user.employeeId }, select: { id: true, departmentId: true, teamId: true, branchId: true } })
    const subject: AudienceSubject = {
      ...base,
      departmentId: employee?.departmentId ?? null, teamId: employee?.teamId ?? null, branchId: employee?.branchId ?? user.branchId ?? null,
      positions: await orgPositionsOf(this.ds.manager, user.employeeId),
    }
    this.subjects.set(user.sub, { at: Date.now(), subject })
    return subject
  }

  /** الموديول مفعّل للمستخدم ده؟ (الحالة العامة + جمهور التفعيل لو له جمهور). مدير النظام بيعدّي الجمهور. */
  async allowedFor(module: ModuleKey, user: JwtPayload | null | undefined, seen: ReadonlySet<string> = new Set()): Promise<boolean> {
    const loaded = await this.load()
    if (!moduleEnabled(loaded.state, module)) return false
    if (!user) return true // مسار عام: الجمهور بيتفحص بعد الدخول
    // الجمهور بينزل على اللي بيعتمد على الموديول: اللي برّه جمهور الحضور برّه الورديات والإضافي كمان
    const next = new Set(seen).add(module)
    for (const dependency of moduleDefOf(module).dependsOn) {
      if (isModuleKey(dependency) && !next.has(dependency) && !(await this.allowedFor(dependency, user, next))) return false
    }
    const audience = loaded.audiences[module]
    if (!audience || moduleDefOf(module).core) return true
    return requestAudienceAllows(audience, await this.subjectOf(user, audience), 'submit')
  }

  /** المفعّل للمستخدم الحالي (بعد الجمهور): الواجهة بتبني عليه القايمة وحارس المسارات. من غير مستخدم = المفعّل للشركة. */
  async enabledFor(user: JwtPayload | null): Promise<{ modules: ModuleKey[]; features: string[] }> {
    const loaded = await this.load()
    const snapshot = enabledSnapshot(loaded.state)
    const modules: ModuleKey[] = []
    for (const module of snapshot.modules) if (await this.allowedFor(module, user)) modules.push(module)
    return { modules, features: snapshot.features.filter((feature) => modules.includes(MODULE_FEATURES[feature].module)) }
  }

  // ===== شاشة «الإعدادات ← الموديولات» =====
  /** الكتالوج كله بحالته: للشاشة ولمعاينة الباقات. */
  async catalog() {
    const loaded = await this.load()
    return {
      presets: (Object.keys(MODULE_PRESETS) as ModulePreset[]).map((key) => ({ key, ...MODULE_PRESETS[key] })),
      modules: MODULE_KEYS.map((key) => {
        const def = moduleDefOf(key)
        return {
          key, nameAr: def.nameAr, description: def.description, group: def.group, core: def.core, preset: def.preset,
          dependsOn: def.dependsOn, softUses: def.softUses,
          // «مفعّل» = الصف أو الافتراضي؛ «شغال فعليًا» = مفعّل وكل اللي بيعتمد عليهم مفعّلين
          enabled: def.core || (Object.prototype.hasOwnProperty.call(loaded.state.modules, key) ? loaded.state.modules[key] : def.defaultEnabled),
          effective: moduleEnabled(loaded.state, key),
          audience: loaded.audiences[key] ? parseRequestAudience(loaded.audiences[key]) : null,
          enabledAt: loaded.rows[key]?.enabledAt ?? null,
          features: Object.entries(def.features).map(([featureKey, feature]) => ({
            key: featureKey, nameAr: feature.nameAr, description: feature.description,
            enabled: Object.prototype.hasOwnProperty.call(loaded.state.features, featureKey) ? loaded.state.features[featureKey] : feature.default,
          })),
        }
      }),
    }
  }

  private moduleKey(key: string): ModuleKey {
    if (!isModuleKey(key)) throw new NotFoundException('الموديول غير موجود')
    return key
  }

  private audienceJson(audience: unknown): string | null {
    if (audience === null || audience === undefined) return null
    if (typeof audience !== 'object' || Array.isArray(audience)) throw new BadRequestException('جمهور التفعيل بصيغة غير صحيحة')
    const value = audience as { mode?: unknown; ids?: unknown; where?: { mode?: unknown; ids?: unknown } | null }
    const mode = String(value.mode ?? 'all')
    if (!(AUDIENCE_WHO_MODES as readonly string[]).includes(mode)) throw new BadRequestException('اختيار «مين» في جمهور التفعيل غير معروف')
    const ids = Array.isArray(value.ids) ? value.ids.map(String).filter(Boolean).slice(0, 500) : []
    const whereMode = String(value.where?.mode ?? 'company')
    if (!(AUDIENCE_WHERE_MODES as readonly string[]).includes(whereMode)) throw new BadRequestException('اختيار «فين» في جمهور التفعيل غير معروف')
    const whereIds = Array.isArray(value.where?.ids) ? value.where!.ids.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0).slice(0, 500) : []
    // «الكل» في «كل الشركة» = من غير جمهور
    if (mode === 'all' && (whereMode === 'company' || whereIds.length === 0)) return null
    if (mode !== 'all' && ids.length === 0) throw new BadRequestException('اختار مين الموديول مفعّل لهم، أو خلّيه «الكل»')
    return JSON.stringify({ mode, ids, where: whereMode === 'company' || whereIds.length === 0 ? null : { mode: whereMode, ids: whereIds } })
  }

  /**
   * تفعيل أو قفل موديول (أو تغيير جمهوره). الفحص والكتابة جوه معاملة واحدة تحت قفل، فتغييرين متزامنين مايسيبوش موديول مفعّل
   * واللي بيعتمد عليه مقفول. القفل مابيمسحش بيانات.
   */
  async setModule(user: JwtPayload, key: string, change: { enabled?: boolean; audience?: unknown }) {
    const module = this.moduleKey(key)
    const def = moduleDefOf(module)
    if (def.core && change.enabled === false) throw new BadRequestException(`«${def.nameAr}» موديول أساسي ومايتقفلش`)
    if (def.core && change.audience) throw new BadRequestException(`«${def.nameAr}» موديول أساسي ومفعّل لكل الشركة`)
    // طلب من غير تغيير: مفيش كتابة ولا حدث في السجل
    if (change.enabled === undefined && change.audience === undefined) return this.catalog()
    await this.write(async (em) => {
      await this.lock(em)
      const state = await this.freshState(em)
      if (change.enabled === true) {
        const missing = missingDependencies(state, module)
        if (missing.length) {
          throw new ConflictException(`فعّل ${missing.map((item) => `«${moduleDefOf(item).nameAr}»`).join(' و')} الأول — «${def.nameAr}» بيعتمد عليه`)
        }
      }
      if (change.enabled === false) {
        const dependents = enabledDependents(state, module)
        if (dependents.length) {
          throw new ConflictException(`اقفل ${dependents.map((item) => `«${moduleDefOf(item).nameAr}»`).join(' و')} الأول — بيعتمد على «${def.nameAr}»`)
        }
      }
      const repo = em.getRepository(SystemModule)
      const row = (await repo.findOne({ where: { key: module } })) ?? repo.create({ key: module, enabled: def.core || def.defaultEnabled, audience: null })
      if (change.enabled !== undefined) row.enabled = def.core ? true : change.enabled
      if (change.audience !== undefined) row.audience = this.audienceJson(change.audience)
      const at = new Date()
      // «مين فتح أو قفل وإمتى» بيتغيّر مع الفتح والقفل بس؛ تغيير الجمهور لوحده حدث enabled = null («غيّر جمهور»)
      if (change.enabled !== undefined || !row.enabledAt) {
        row.enabledAt = at
        row.enabledBy = user.sub
      }
      await repo.save(row)
      await this.record(em, { kind: 'module', key: module, enabled: change.enabled === undefined ? null : !!row.enabled, audience: row.audience ?? null, byUserId: user.sub, at })
    })
    this.invalidate()
    return this.catalog()
  }

  async setFeature(user: JwtPayload, key: string, enabled: boolean) {
    if (!isFeatureKey(key)) throw new NotFoundException('الميزة غير موجودة')
    await this.write(async (em) => {
      await this.lock(em)
      const repo = em.getRepository(SystemModuleFeature)
      const row = (await repo.findOne({ where: { key } })) ?? repo.create({ key })
      row.enabled = enabled
      row.updatedAt = new Date()
      row.updatedBy = user.sub
      await repo.save(row)
      await this.record(em, { kind: 'feature', key, enabled, audience: null, byUserId: user.sub, at: row.updatedAt })
    })
    this.invalidate()
    return this.catalog()
  }

  /** الفرق لو الباقة اتطبقت: إيه اللي هيتفعّل وإيه اللي هيتقفل (الأساسي مابيتلمسش). */
  async presetDiff(preset: string) {
    if (!Object.prototype.hasOwnProperty.call(MODULE_PRESETS, preset)) throw new NotFoundException('الباقة غير موجودة')
    const state = await this.state()
    const target = new Set(modulesOfPreset(preset as ModulePreset))
    const enable: ModuleKey[] = [], disable: ModuleKey[] = []
    for (const module of MODULE_KEYS) {
      const def = moduleDefOf(module)
      if (def.core) continue
      const now = Object.prototype.hasOwnProperty.call(state.modules, module) ? state.modules[module] : def.defaultEnabled
      if (target.has(module) && !now) enable.push(module)
      if (!target.has(module) && now) disable.push(module)
    }
    const view = (keys: ModuleKey[]) => keys.map((key) => ({ key, nameAr: moduleDefOf(key).nameAr }))
    return { preset, nameAr: MODULE_PRESETS[preset as ModulePreset].nameAr, enable: view(enable), disable: view(disable) }
  }

  /** تطبيق الباقة: نقطة بداية بس — أي موديول يتفتح أو يتقفل لوحده بعدها. */
  async applyPreset(user: JwtPayload, preset: string) {
    if (!Object.prototype.hasOwnProperty.call(MODULE_PRESETS, preset)) throw new NotFoundException('الباقة غير موجودة')
    const target = new Set(modulesOfPreset(preset as ModulePreset))
    const enable: ModuleKey[] = [], disable: ModuleKey[] = []
    await this.write(async (em) => {
      await this.lock(em)
      const repo = em.getRepository(SystemModule)
      const now = new Date()
      await this.record(em, { kind: 'preset', key: preset, enabled: null, audience: null, byUserId: user.sub, at: now })
      for (const module of MODULE_KEYS) {
        const def = moduleDefOf(module)
        if (def.core) continue
        const existing = await repo.findOne({ where: { key: module } })
        const before = existing ? !!existing.enabled : def.defaultEnabled, after = target.has(module)
        // صف صريح لكل موديول اختياري (حالة الشركة ماتتغيرش لو افتراضي السجل اتغيّر بعدين)؛ والحدث للي حالته اتغيّرت بس
        if (existing && before === after) continue
        const row = existing ?? repo.create({ key: module, audience: null })
        row.enabled = after
        row.enabledAt = now
        row.enabledBy = user.sub
        await repo.save(row)
        if (before === after) continue
        ;(after ? enable : disable).push(module)
        await this.record(em, { kind: 'module', key: module, enabled: after, audience: row.audience ?? null, byUserId: user.sub, at: now })
      }
    })
    this.invalidate()
    const view = (keys: ModuleKey[]) => keys.map((key) => ({ key, nameAr: moduleDefOf(key).nameAr }))
    return { applied: { preset, nameAr: MODULE_PRESETS[preset as ModulePreset].nameAr, enable: view(enable), disable: view(disable) }, catalog: await this.catalog() }
  }

  /** آخر التغييرات للشاشة: مين فتح أو قفل إيه وإمتى (بالأسماء). */
  async events(limit = 30) {
    // قبل ترحيل 076 مفيش جدول ولا تغييرات: قايمة فاضية
    const rows = await this.ds.getRepository(SystemModuleEvent).find({ order: { id: 'DESC' }, take: limit })
      .catch((error) => { if (sqlErrorNumber(error) === MISSING_TABLE) return [] as SystemModuleEvent[]; throw error })
    const userIds = [...new Set(rows.map((row) => row.byUserId))]
    const users = userIds.length ? await this.ds.getRepository(User).find({ where: { id: In(userIds) }, select: { id: true, displayName: true } }) : []
    const names = new Map(users.map((row) => [row.id, row.displayName]))
    const nameOf = (row: SystemModuleEvent) => row.kind === 'module' && isModuleKey(row.key) ? moduleDefOf(row.key).nameAr
      : row.kind === 'feature' && isFeatureKey(row.key) ? MODULE_FEATURES[row.key].nameAr
        : row.kind === 'preset' && Object.prototype.hasOwnProperty.call(MODULE_PRESETS, row.key) ? MODULE_PRESETS[row.key as ModulePreset].nameAr : row.key
    return rows.map((row) => ({ id: row.id, kind: row.kind, key: row.key, nameAr: nameOf(row), enabled: row.enabled,
      audience: row.audience ? parseRequestAudience(row.audience) : null, byName: names.get(row.byUserId) ?? null, at: row.at }))
  }

  /**
   * أثر قفل موديول قبل ما يتقفل: الطلبات المفتوحة من أنواعه (بتكمّل سلسلتها، ومفيش جديد بيتقدّم) وبياناته الشغالة (بتفضل زي ما هي).
   * أعداد بس على مستوى الشركة — الشاشة لمدير النظام.
   */
  async impact(key: string) {
    const module = this.moduleKey(key)
    const types = await this.ds.getRepository(RequestType).find({ select: { id: true, code: true, destinationHandler: true } })
    const codes = types.filter((type) => moduleOfRequestType(type) === module).map((type) => type.code)
    const open = { status: In(['SUBMITTED', 'UNDER_REVIEW', 'RETURNED_FOR_INFO', 'IN_EXECUTION']) }
    // الإجازة بتتخزن بالنوع الموحّد LEAVE وتعريفها في definitionCode
    const openRequests = codes.length ? await this.ds.getRepository(Request).count({ where: [{ ...open, typeCode: In(codes) }, { ...open, definitionCode: In(codes) }] }) : 0
    const items: Array<{ label: string; count: number }> = []
    for (const [label, count] of await this.liveData(module)) if (count > 0) items.push({ label, count })
    return { key: module, nameAr: moduleDefOf(module).nameAr, openRequests, items, notes: CLOSE_NOTES[module] ?? [] }
  }

  // بيانات الموديول الشغالة دلوقتي (للتنبيه قبل القفل) — أسماء الكيانات نصوص عشان السجل مايستوردش كل الموديولات
  private async liveData(module: ModuleKey): Promise<Array<[string, number]>> {
    const count = (entity: string, where: Record<string, unknown>) => this.ds.getRepository(entity).count({ where }).catch(() => 0)
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    switch (module) {
      case 'attendance': return [['أجهزة بصمة مفعّلة', await count('BiometricDevice', { isActive: true })]]
      case 'overtime': return [['إضافي مكتشف مستني اعتماد', await count('OvertimeEntry', { status: In(['DETECTED', 'SUBMITTED']) })]]
      case 'leave': return [['إجازات معتمدة لسه ماخلصتش', await count('Leave', { status: 'APPROVED', toDate: MoreThanOrEqual(today) })]]
      case 'payroll': return [['مسيرات مفتوحة (مسودة أو محسوبة)', await count('PayrollRun', { status: In(['DRAFT', 'CALCULATED']) })],
        ['مسيرات معتمدة لسه ما اتصرفتش', await count('PayrollRun', { status: 'APPROVED' })]]
      case 'loans': return [['سلف لسه بتتسدد', await count('Loan', { status: Not('SETTLED') })]]
      case 'custody': return [['عهد عند الموظفين', await count('CustodyAssignment', { status: In(['PENDING_ACK', 'PENDING_MANAGER_CONFIRM', 'ACTIVE', 'RETURN_REQUESTED']) })]]
      case 'offboarding': return [['ملفات إنهاء خدمة مفتوحة', await count('OffboardingCase', { status: In(['IN_CLEARANCE', 'IN_SETTLEMENT', 'SETTLED']) })]]
      case 'onboarding': return [['مهام تهيئة مفتوحة', await count('OnboardingTask', { status: 'PENDING' })]]
      case 'recruitment': return [['مرشحين في المسار', await count('Candidate', { stage: Not(In(['hired', 'rejected'])) })]]
      default: return []
    }
  }

  // كتابة حالة الموديولات في معاملة واحدة. لو الجداول لسه ماتعملتش (الكود نزل قبل ترحيل 076): رسالة واضحة بدل خطأ خادم
  private async write(work: (em: import('typeorm').EntityManager) => Promise<void>) {
    try {
      await this.ds.transaction(work)
    } catch (error) {
      if (sqlErrorNumber(error) === MISSING_TABLE) throw new ConflictException('جداول الموديولات لسه ماتعملتش في قاعدة البيانات — طبّق ترحيل 076 الأول، وبعدها غيّر من هنا')
      throw error
    }
  }

  // سجل التغييرات (مين فتح أو قفل إيه وإمتى) جوه نفس معاملة التغيير
  private async record(em: import('typeorm').EntityManager, event: Omit<SystemModuleEvent, 'id'>) {
    await em.getRepository(SystemModuleEvent).insert(event)
  }

  private async lock(em: import('typeorm').EntityManager) {
    if (em.connection.options.type !== 'mssql') return
    const rows = await em.query(`DECLARE @result int;
      EXEC @result = sys.sp_getapplock @Resource = 'hr:system-modules', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 15000;
      SELECT @result AS lockResult;`)
    if (!rows.length || Number(rows[0].lockResult) < 0) throw new ConflictException('إعدادات الموديولات بتتعدل دلوقتي من حد تاني؛ جرّب تاني بعد شوية')
  }

  private async freshState(em: import('typeorm').EntityManager): Promise<ModulesState> {
    return (await this.freshLoaded(em)).state
  }

  // Codex P5B-N02: قاعدة قبل ترحيل 076 (جدولَي الموديولات مش موجودين) = القيم الافتراضية، زي القارئ اللي بالذاكرة المؤقتة بالظبط
  private async freshLoaded(em: import('typeorm').EntityManager): Promise<{ state: ModulesState; audiences: Record<string, string> }> {
    const state: ModulesState = { modules: {}, features: {} }, audiences: Record<string, string> = {}
    try {
      for (const row of await em.getRepository(SystemModule).find()) {
        state.modules[row.key] = !!row.enabled
        if (row.audience && parseRequestAudience(row.audience)) audiences[row.key] = row.audience
      }
      for (const row of await em.getRepository(SystemModuleFeature).find()) state.features[row.key] = !!row.enabled
    } catch (error) {
      if (sqlErrorNumber(error) !== MISSING_TABLE) throw error
      return { state: { modules: {}, features: {} }, audiences: {} }
    }
    return { state, audiences }
  }
}
