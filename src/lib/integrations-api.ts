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

// B6.3 (ج): نقاط استقبال الأحداث (webhooks). سر التوقيع بييجي في رد الإنشاء بس.
export interface ApiWebhookEndpoint {
  id: number; name: string; url: string; events: string[]
  /** null = كل الفروع */
  branchIds: number[] | null
  isActive: boolean; createdAt: string; lastStatus: string | null; lastAttemptAt: string | null; failures: number
}
export interface ApiWebhookEndpoints { available: boolean; events: Array<{ key: string; label: string }>; endpoints: ApiWebhookEndpoint[] }

const W = '/integrations/webhooks'
export const fetchWebhookEndpoints = () => apiFetch<ApiWebhookEndpoints>(W)
export const createWebhookEndpoint = (body: { name: string; url: string; events: string[]; branchIds: number[] | null }) =>
  apiFetch<ApiWebhookEndpoint & { secret: string }>(W, { method: 'POST', body: JSON.stringify(body) })
export const setWebhookEndpointActive = (id: number, isActive: boolean) => apiFetch<ApiWebhookEndpoint>(`${W}/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive }) })
