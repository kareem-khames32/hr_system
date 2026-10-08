import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { BranchScope } from '../auth/guards'

// B6.3 (أ): مفاتيح التكامل — القواعد النقية (شكل المفتاح، بصمته، النطاقات، نطاق الفروع). من غير قاعدة بيانات.
//  المفتاح: `hrk_<8 hex>_<40 hex>`. في القاعدة البادئة والبصمة بس؛ والمقارنة ثابتة الزمن على البصمتين.

export const INTEGRATION_SCOPES = ['employees.read', 'structure.read', 'attendance.read', 'leaves.read', 'payroll.read'] as const
export type IntegrationScope = (typeof INTEGRATION_SCOPES)[number]
export const INTEGRATION_SCOPE_LABELS: Record<IntegrationScope, string> = {
  'employees.read': 'قراءة الموظفين', 'structure.read': 'قراءة الهيكل (الفروع والأقسام)', 'attendance.read': 'قراءة الحضور', 'leaves.read': 'قراءة الإجازات', 'payroll.read': 'قراءة ملخص المسير',
}
export const INTEGRATIONS_MIGRATION_MISSING = 'جدول مفاتيح التكامل ناقص — طبّق ترحيل 183 الأول'
export const KEY_NOT_FOUND = 'المفتاح مش موجود'
export const KEY_INVALID = 'مفتاح التكامل غير صالح'
export const KEY_SCOPE_MISSING = 'المفتاح ده مالوش النطاق المطلوب'
export const KEY_RATE_LIMITED = 'طلبات كتير — استنى دقيقة وجرّب تاني'
export const KEYS_MAX = 50
export const KEY_BRANCHES_MAX = 50
const KEY_SHAPE = /^hrk_([a-f0-9]{8})_([a-f0-9]{40})$/

export interface IntegrationIdentity { id: number; name: string; scopes: IntegrationScope[]; branchScope: BranchScope }

export const hashKey = (key: string): string => createHash('sha256').update(key, 'utf8').digest('hex')
/** مفتاح جديد: النص (بيتعرض مرة واحدة) وبادئته وبصمته */
export function generateKey(bytes: (size: number) => Buffer = randomBytes): { key: string; prefix: string; hash: string } {
  const prefix = bytes(4).toString('hex'), key = `hrk_${prefix}_${bytes(20).toString('hex')}`
  return { key, prefix, hash: hashKey(key) }
}
/** بادئة مفتاح شكله صح، وإلا null */
export function keyPrefixOf(raw: unknown): string | null {
  const match = typeof raw === 'string' ? KEY_SHAPE.exec(raw.trim()) : null
  return match ? match[1] : null
}
/** المفتاح المبعوت بيطابق البصمة المخزنة؟ (مقارنة ثابتة الزمن) */
export function keyMatches(raw: string, storedHash: string): boolean {
  const given = Buffer.from(hashKey(raw.trim()), 'hex'), stored = Buffer.from(String(storedHash), 'hex')
  return given.length === stored.length && stored.length === 32 && timingSafeEqual(given, stored)
}
/** المفتاح من ترويسة الطلب: `Authorization: Bearer hrk_…` أو `X-API-Key` */
export function keyFromHeaders(headers: Record<string, unknown>): string | null {
  const direct = headers['x-api-key']
  if (typeof direct === 'string' && direct.trim()) return direct.trim()
  const authorization = headers.authorization
  const match = typeof authorization === 'string' ? /^Bearer\s+(\S+)$/i.exec(authorization.trim()) : null
  return match ? match[1] : null
}

/** نطاقات القراءة المطلوبة: قايمة مش فاضية من المعروف بس، من غير تكرار — وإلا رسالة */
export function cleanScopes(raw: unknown): { scopes: IntegrationScope[]; issue: string | null } {
  if (!Array.isArray(raw) || !raw.length) return { scopes: [], issue: 'اختار نطاق قراءة واحد على الأقل' }
  const unknown = raw.filter(item => !(INTEGRATION_SCOPES as readonly unknown[]).includes(item))
  if (unknown.length) return { scopes: [], issue: 'نطاق قراءة مش معروف' }
  return { scopes: INTEGRATION_SCOPES.filter(scope => raw.includes(scope)), issue: null }
}
/** فروع المفتاح: null أو قايمة فاضية = كل الفروع؛ وإلا أرقام صحيحة موجبة من غير تكرار */
export function cleanBranchIds(raw: unknown): { branchIds: number[] | null; issue: string | null } {
  if (raw === null || raw === undefined || (Array.isArray(raw) && !raw.length)) return { branchIds: null, issue: null }
  if (!Array.isArray(raw) || raw.some(item => !Number.isSafeInteger(item) || Number(item) < 1)) return { branchIds: null, issue: 'الفروع أرقام فروع صحيحة' }
  const unique = [...new Set(raw.map(Number))].sort((a, b) => a - b)
  if (unique.length > KEY_BRANCHES_MAX) return { branchIds: null, issue: `الفروع ${KEY_BRANCHES_MAX} بالكتير` }
  return { branchIds: unique, issue: null }
}
/** نطاق الفروع المخزن ← نطاق القراءة (نص تالف = ولا فرع، مش كل الفروع) */
export function storedBranchScope(stored: string | null): BranchScope {
  if (stored === null || stored === '') return null
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) && parsed.every(item => Number.isSafeInteger(item) && item > 0) ? parsed : []
  } catch { return [] }
}
/** النطاقات المخزنة (نص تالف = ولا نطاق) */
export function storedScopes(stored: string): IntegrationScope[] {
  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? INTEGRATION_SCOPES.filter(scope => parsed.includes(scope)) : []
  } catch { return [] }
}
