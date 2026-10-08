// B4.8 (ب): «حماية البيانات» — سجل حوادث التسريب (موعد الإخطار 72 ساعة) ومدد الاحتفاظ. لحساب بكل الفروع بصلاحية الإعدادات.
import { apiFetch } from './api'

export interface ApiBreachIncident {
  id: number; title: string; details: string | null; discoveredAt: string; notifyBy: string
  status: 'OPEN' | 'NOTIFIED' | 'CLOSED'; statusLabel: string
  notifiedAt: string | null; notificationNote: string | null; affectedCount: number | null; closedAt: string | null; closeNote: string | null; createdAt: string
  /** الساعات الباقية على موعد الإخطار (سالبة = فات) للحادثة اللي لسه مااتبلّغتش */
  hoursLeft: number | null; overdue: boolean
  /** اتبلّغت بعد الموعد */
  notifiedLate: boolean
}
export interface ApiRetentionType { key: string; label: string; hint: string; months: number | null; cutoff: string | null; expired: number }
export interface ApiDataProtection { notifyHours: number; incidentsAvailable: boolean; incidents: ApiBreachIncident[]; retention: ApiRetentionType[] }

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })
const D = '/settings/data-protection'
export const fetchDataProtection = () => apiFetch<ApiDataProtection>(D)
export const createBreachIncident = (body: { title: string; details?: string; discoveredAt: string; affectedCount?: number }) => apiFetch<ApiDataProtection>(`${D}/incidents`, json('POST', body))
export const notifyBreachIncident = (id: number, note: string) => apiFetch<ApiDataProtection>(`${D}/incidents/${id}/notify`, json('POST', { note }))
export const closeBreachIncident = (id: number, note?: string) => apiFetch<ApiDataProtection>(`${D}/incidents/${id}/close`, json('POST', { note: note ?? '' }))
export const setRetentionMonths = (key: string, months: number | null) => apiFetch<ApiDataProtection>(`${D}/retention/${key}`, json('PUT', { months }))
