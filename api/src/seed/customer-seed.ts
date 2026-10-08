import type { DataSource } from 'typeorm'
import { ROLE_PRESETS } from '../auth/permissions'
import { Role } from '../auth/role.entity'
import { User } from '../auth/user.entity'
import { MODULE_KEYS, MODULE_PRESETS, moduleDefOf, modulesOfPreset, type ModulePreset } from '../modules-registry/registry'
import { SystemModule } from '../modules-registry/system-module.entities'
import { BRANCH_COUNTRIES, branchCurrency, type BranchCountry } from '../org/branch-currency'
import { Branch } from '../org/entities/branch.entity'
import { LegalEntity } from '../org/legal-entities'
import { seedRequests } from './seed-requests'

// B6.1 (أ): بذرة عميل جديد — بتكمّل على اللي ترحيلات القاعدة الجديدة حطّته (الإعدادات، صفوف الموديولات، الأدوار الأولى): باقي الأدوار، وأنواع الطلبات
// والإجازات وإعدادات المحرك (نفس `seedRequests` القايم)، وكيان قانوني وفرع رئيسي بدولة العميل، والباقة. من غير أي موظف أو حساب تجريبي ومن غير كلمة مرور:
// حساب مدير النظام بيتعمل مقفول قبل الترحيلات (`customerAdmin`) وكلمته بتتحط بـ`scripts/set-password.cjs`. بذرة التطوير (`seed.ts`) مش للعملاء.

export interface CustomerSeedInput { country: BranchCountry; entityName: string; branchName: string; adminEmail: string; preset: ModulePreset }

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,180}\.[^\s@]{2,}$/
const clean = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null
  const text = value.trim().replace(/\s+/g, ' ')
  return text.length < 2 || text.length > max ? null : text
}

/** مدخلات التجهيز بعد الفحص، أو رسالة الخطأ */
export function customerSeedInput(raw: Record<string, unknown>): { input: CustomerSeedInput | null; error: string | null } {
  if (!(BRANCH_COUNTRIES as readonly unknown[]).includes(raw.country)) return { input: null, error: `الدولة: ${BRANCH_COUNTRIES.join(' أو ')}` }
  const entityName = clean(raw.entityName, 150)
  if (!entityName) return { input: null, error: 'اسم الكيان من حرفين لحد 150 حرف' }
  const branchName = clean(raw.branchName ?? 'الفرع الرئيسي', 150)
  if (!branchName) return { input: null, error: 'اسم الفرع من حرفين لحد 150 حرف' }
  const adminEmail = typeof raw.adminEmail === 'string' ? raw.adminEmail.trim().toLowerCase() : ''
  if (!EMAIL.test(adminEmail)) return { input: null, error: 'بريد مدير النظام مش صحيح' }
  const preset = raw.preset ?? 'standard'
  if (typeof preset !== 'string' || !Object.prototype.hasOwnProperty.call(MODULE_PRESETS, preset)) return { input: null, error: `الباقة: ${Object.keys(MODULE_PRESETS).join(' أو ')}` }
  return { input: { country: raw.country as BranchCountry, entityName, branchName, adminEmail, preset: preset as ModulePreset }, error: null }
}

/**
 * حساب مدير النظام للعميل: مقفول ومن غير كلمة مرور صالحة (القيمة المتخزنة مش ناتج أي كلمة)، ولازم يغيّرها أول دخول. بيتعمل قبل الترحيلات
 * (ترحيل النسخ المؤرخة بيحتاج حساب مدير نظام يوثّق بيه)، ومرة واحدة: لو فيه أي حساب، مفيش حاجة بتتعمل.
 */
export async function customerAdmin(ds: DataSource, adminEmail: string): Promise<number> {
  const users = ds.getRepository(User)
  if (await users.count()) throw new Error('القاعدة فيها حسابات — دي مش قاعدة جديدة')
  const row = await users.save(users.create({ email: adminEmail, displayName: 'مدير النظام', passwordHash: '!', role: 'super_admin', scopeAllBranches: true, permissions: '[]', isActive: false,
    mustChangePassword: true } as Partial<User>))
  return row.id
}

/** بذرة العميل بعد الترحيلات — في معاملة واحدة لكيانه وفرعه وباقته، وبتتكرر بأمان (الموجود مابيتلمسش) */
export async function seedCustomer(ds: DataSource, input: CustomerSeedInput, adminUserId: number): Promise<{ legalEntityId: number; branchId: number; roles: number; modules: number }> {
  const roles = ds.getRepository(Role)
  let addedRoles = 0
  for (const preset of ROLE_PRESETS) {
    if (await roles.findOne({ where: { code: preset.code } })) continue
    await roles.save(roles.create({ code: preset.code, nameAr: preset.nameAr, permissions: JSON.stringify(preset.permissions), isSystem: preset.isSystem }))
    addedRoles++
  }
  // أنواع الطلبات وسلاسلها الفاضية، وأنواع الإجازات، وإعدادات المحرك — نفس دالة البذر القايمة (بتضيف الناقص بس)
  await seedRequests(ds)
  return ds.transaction(async em => {
    const entities = em.getRepository(LegalEntity), branches = em.getRepository(Branch)
    if (await entities.count() || await branches.count()) throw new Error('القاعدة فيها كيان أو فرع — دي مش قاعدة جديدة')
    const now = new Date()
    // عملة الكيان عملة دولته دايمًا (نفس خريطة الفروع)
    const entity = await entities.save(entities.create({ name: input.entityName, country: input.country, currency: branchCurrency(input.country, null), isActive: true, createdAt: now } as Partial<LegalEntity>))
    const branch = await branches.save(branches.create({ name: input.branchName, code: 'HQ', country: input.country, isActive: true, isHeadquarters: true } as Partial<Branch>))
    // عمود ربط الفرع بكيانه برّه الكيان للقراءة والكتابة (ترحيل 134)
    await em.query('UPDATE dbo.branches SET [legalEntityId] = @0 WHERE [id] = @1', [entity.id, branch.id])
    // الباقة: صف صريح لكل موديول اختياري (نفس شكل تطبيق الباقة من الشاشة)
    const modules = em.getRepository(SystemModule), target = new Set<string>(modulesOfPreset(input.preset))
    let written = 0
    for (const key of MODULE_KEYS) {
      if (moduleDefOf(key).core) continue
      const row = (await modules.findOne({ where: { key } })) ?? modules.create({ key, audience: null })
      row.enabled = target.has(key); row.enabledAt = now; row.enabledBy = adminUserId
      await modules.save(row)
      written++
    }
    return { legalEntityId: entity.id, branchId: branch.id, roles: addedRoles, modules: written }
  })
}
