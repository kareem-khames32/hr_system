'use client'

// شاشة «الإعدادات ← الموديولات» (خطة التنفيذ B0.3): قراءة كتالوج الموديولات بحالته، وتفعيل وقفل الموديول والميزة الفرعية،
// وجمهور التفعيل، والباقات بمعاينة الفرق. بصلاحية settings.modules (لمدير النظام بس) — والخادم هو اللي بيفرض.
import { apiFetch } from './api'
import { invalidateModules, type ModuleGroup, type ModulePreset } from './modules'

// «مين + فين» بنفس شكل جمهور أنواع الطلبات
export interface ModuleAudience {
  mode?: string
  ids?: Array<number | string>
  where?: { mode?: string; ids?: Array<number | string> } | null
}
export interface ModuleCatalogFeature { key: string; nameAr: string; description: string; enabled: boolean }
export interface ModuleCatalogRow {
  key: string; nameAr: string; description: string; group: ModuleGroup; core: boolean; preset: ModulePreset | null
  dependsOn: string[]; softUses: string[]
  // مفعّل = اختيار الموديول نفسه؛ شغال فعليًا = مفعّل وكل اللي بيعتمد عليهم مفعّلين
  enabled: boolean; effective: boolean
  audience: ModuleAudience | null; enabledAt: string | null
  features: ModuleCatalogFeature[]
}
export interface ModulesCatalog {
  presets: Array<{ key: ModulePreset; nameAr: string; description: string }>
  modules: ModuleCatalogRow[]
}
export interface ModuleRef { key: string; nameAr: string }
export interface ModuleImpact {
  key: string; nameAr: string
  // طلبات مفتوحة من أنواع الموديول: بتكمّل سلسلتها بعد القفل
  openRequests: number
  // بيانات شغالة تانية (عهد مسلّمة، مسيرات مفتوحة…) بتفضل زي ما هي
  items: Array<{ label: string; count: number }>
  // اللي بيحصل بعد قفل الموديول ده بالذات غير اختفاء شاشاته
  notes: string[]
}
export interface PresetDiff { preset: ModulePreset; nameAr: string; enable: ModuleRef[]; disable: ModuleRef[] }
export interface ModuleEvent {
  id: number; kind: 'module' | 'feature' | 'preset'; key: string; nameAr: string
  enabled: boolean | null; audience: ModuleAudience | null; byName: string | null; at: string
}

const send = <T>(path: string, method: 'PUT' | 'POST', body?: unknown) =>
  apiFetch<T>(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
// بعد أي تغيير: القايمة الجانبية وحارس المسارات يقروا الحالة الجديدة فورًا
const refreshed = <T>(result: Promise<T>) => result.then((value) => { invalidateModules(); return value })

export const fetchModulesCatalog = () => apiFetch<ModulesCatalog>('/modules/catalog')
export const fetchModuleEvents = () => apiFetch<ModuleEvent[]>('/modules/events')
export const fetchModuleImpact = (key: string) => apiFetch<ModuleImpact>(`/modules/${encodeURIComponent(key)}/impact`)
export const setModuleState = (key: string, change: { enabled?: boolean; audience?: ModuleAudience | null }) =>
  refreshed(send<ModulesCatalog>(`/modules/${encodeURIComponent(key)}`, 'PUT', change))
export const setModuleFeature = (key: string, enabled: boolean) =>
  refreshed(send<ModulesCatalog>(`/modules/features/${encodeURIComponent(key)}`, 'PUT', { enabled }))
export const fetchPresetDiff = (preset: ModulePreset) => apiFetch<PresetDiff>(`/modules/presets/${preset}/diff`)
export const applyModulesPreset = (preset: ModulePreset) =>
  refreshed(send<{ applied: PresetDiff; catalog: ModulesCatalog }>(`/modules/presets/${preset}/apply`, 'POST'))
