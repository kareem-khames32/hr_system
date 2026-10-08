// B6.3 (أ): «التكاملات» — مفاتيح الـAPI العام. نص المفتاح بييجي في رد الإنشاء بس.
import { apiFetch } from './api'

export interface ApiIntegrationKey {
  id: number; name: string; keyPrefix: string; scopes: string[]
  /** null = كل الفروع */
  branchIds: number[] | null
  isActive: boolean; createdAt: string; lastUsedAt: string | null; revokedAt: string | null
}
export interface ApiIntegrationKeys { available: boolean; scopes: Array<{ key: string; label: string }>; keys: ApiIntegrationKey[] }

const S = '/integrations/keys'
export const fetchIntegrationKeys = () => apiFetch<ApiIntegrationKeys>(S)
export const createIntegrationKey = (body: { name: string; scopes: string[]; branchIds: number[] | null }) =>
  apiFetch<ApiIntegrationKey & { key: string }>(S, { method: 'POST', body: JSON.stringify(body) })
export const revokeIntegrationKey = (id: number) => apiFetch<{ id: number; revoked: boolean }>(`${S}/${id}`, { method: 'DELETE' })
