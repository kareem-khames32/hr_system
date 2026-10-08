import type { EntityManager } from 'typeorm'
import type { BranchScope } from '../auth/guards'
import { readBranchEntityIds } from './legal-entities'

// B4.6 (ج): عرض التاريخ الهجري جنب الميلادي — إعداد لكل كيان قانوني (C-SA-05). التخزين والحساب ميلادي زي ما هم؛ ده عرض بس.
// الإعداد قايمة أرقام الكيانات المفعّل ليها العرض في مفتاح واحد (نفس نمط قايمة فروع التأمين الصحي)، من غير عمود ولا ترحيل.
// فاضي (الافتراضي) = الشاشات ميلادي بس زي الأول. بيتكتب من شاشة الكيانات القانونية بس (مش من الإعدادات العامة).

export const HIJRI_DISPLAY_KEY = 'display.hijri.entity_ids'
export const HIJRI_DISPLAY_REFUSAL = 'عرض التاريخ الهجري بيتغيّر من «الإعدادات ← الكيانات القانونية» — مش من هنا'

/** أرقام الكيانات من نص الإعداد («3,7»): أرقام صحيحة موجبة فريدة مرتّبة؛ الغلط بيتشال */
export function parseHijriEntityIds(value: string | null | undefined): number[] {
  const ids = String(value ?? '').split(',').map(part => part.trim()).filter(part => /^[1-9]\d{0,8}$/.test(part)).map(Number)
  return [...new Set(ids)].sort((a, b) => a - b)
}

/** القايمة بعد تفعيل أو قفل كيان */
export function withHijriEntity(ids: readonly number[], entityId: number, enabled: boolean): number[] {
  const next = new Set(ids)
  if (enabled) next.add(entityId)
  else next.delete(entityId)
  return [...next].sort((a, b) => a - b)
}

export async function readHijriEntityIds(em: EntityManager): Promise<number[]> {
  const [row]: Array<{ value: string }> = await em.query('SELECT [value] FROM [requests_config] WHERE [key] = @0', [HIJRI_DISPLAY_KEY])
  return parseHijriEntityIds(row?.value)
}

/**
 * الحساب ده يشوف الهجري؟ حساب الفروع: لو كيان أي فرع من فروعه مفعّل له العرض. حساب بكل الفروع: لو أي كيان مفعّل له.
 * الحكم بفروع الحساب نفسه، فمابيكشفش حاجة عن كيانات فروع تانية.
 */
export async function hijriDisplayFor(em: EntityManager, scope: BranchScope): Promise<boolean> {
  const ids = await readHijriEntityIds(em)
  if (!ids.length) return false
  if (scope === null) return true
  if (!scope.length) return false
  const mine = new Set((await readBranchEntityIds(em, [...scope])).values())
  return ids.some(id => mine.has(id))
}

/** تفعيل أو قفل العرض لكيان — تحت قفل مدى على صف الإعداد (تغييرين مع بعض مايكتبوش فوق بعض). بيرجّع القيمة قبل وبعد */
export async function setHijriEntity(em: EntityManager, entityId: number, enabled: boolean): Promise<{ before: number[]; after: number[] }> {
  const rows: Array<{ value: string }> = await em.query('SELECT [value] FROM [requests_config] WITH (UPDLOCK, HOLDLOCK) WHERE [key] = @0', [HIJRI_DISPLAY_KEY])
  const before = parseHijriEntityIds(rows[0]?.value), after = withHijriEntity(before, entityId, enabled)
  if (!rows.length) await em.query('INSERT INTO [requests_config] ([key], [value]) VALUES (@0, @1)', [HIJRI_DISPLAY_KEY, after.join(',')])
  else if (before.join(',') !== after.join(',') || rows[0].value !== after.join(',')) await em.query('UPDATE [requests_config] SET [value] = @1 WHERE [key] = @0', [HIJRI_DISPLAY_KEY, after.join(',')])
  return { before, after }
}
