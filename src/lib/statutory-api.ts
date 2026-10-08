// B4.2: «حزمة الدولة» — القيم القانونية المؤرخة لكل دولة. العرض بصلاحية الإعدادات، والتعديل لمدير النظام بس (الخادم بيحكم).
import { apiFetch } from './api'

export interface ApiStatutoryRow { id: number; effectiveFrom: string; verified: boolean; source: string | null; current: boolean; values: Record<string, string> }
export interface ApiStatutoryKey {
  country: 'EG' | 'SA'; key: string; label: string; card: string
  /** الحاسبة اللي بتقرا المفتاح دلوقتي — null = بيانات مرجعية مابتدخلش في أي حساب */
  usedBy: string | null
  codes: Array<{ code: string; label: string }>; rows: ApiStatutoryRow[]
}
export interface ApiStatutoryPack { available: boolean; message?: string; canEdit: boolean; countries: Array<{ code: 'EG' | 'SA'; label: string }>; keys: ApiStatutoryKey[] }

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })
const S = '/settings/statutory'
export const fetchStatutoryPack = () => apiFetch<ApiStatutoryPack>(S)
export const addStatutoryRow = (body: { country: string; key: string; effectiveFrom: string; values: Record<string, string>; source?: string | null; verified?: boolean }) => apiFetch<ApiStatutoryPack>(S, json('POST', body))
export const updateStatutoryRow = (id: number, body: { values?: Record<string, string>; source?: string | null; verified?: boolean }) => apiFetch<ApiStatutoryPack>(`${S}/${id}`, json('PATCH', body))
