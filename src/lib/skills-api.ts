// B5.4: «المهارات والإحلال» — موديول skills (مقفول افتراضيًا). المكتبة تعريف للشركة كلها؛ الفجوة بفرع الموظف الحالي.
import { apiFetch } from './api'

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export type SkillSource = 'ASSESSMENT' | 'CERTIFICATE'
export type GapStatus = 'MET' | 'BELOW' | 'MISSING' | 'EXPIRED'
export interface ApiSkill { id: number; name: string; category: string | null; description: string | null; isActive: boolean }
export interface ApiSkillCatalog { ready: boolean; canEdit: boolean; levels: Array<{ code: SkillLevel; label: string }>; skills: ApiSkill[] }
export interface ApiSkillPosition {
  id: number; code: string; title: string; branchName: string | null; departmentName: string | null; status: string; holders: number
  requirements: Array<{ skillId: number; level: SkillLevel }>
}
export interface ApiSkillCell {
  skillId: number; skillName: string; required: SkillLevel; requiredLabel: string
  /** مستوى الموظف المتقيّم (null = مش متقيّمة) */
  level: SkillLevel | null; levelLabel: string | null; source: SkillSource | null; validUntil: string | null
  status: GapStatus; statusLabel: string
}
export interface ApiSkillRow {
  employeeId: number; fullName: string; employeeCode: string | null; positionId: number | null; positionTitle: string | null
  cells: ApiSkillCell[]
  /** عدد المهارات المطلوبة اللي مش مستوفاة */
  gaps: number
  extra: Array<{ skillId: number; skillName: string; level: SkillLevel | null; levelLabel: string | null; source: SkillSource | null; validUntil: string | null }>
}
export interface SkillInput { name: string; category?: string; description?: string; isActive?: boolean }
export interface AssessmentInput { level: SkillLevel; source?: SkillSource; validUntil?: string | null }

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })
export const fetchSkillCatalog = () => apiFetch<ApiSkillCatalog>('/skills/catalog')
export const createSkill = (body: SkillInput) => apiFetch<{ id: number }>('/skills/catalog', json('POST', body))
export const updateSkill = (id: number, body: SkillInput) => apiFetch<{ id: number }>(`/skills/catalog/${id}`, json('PATCH', body))
export const fetchSkillPositions = () => apiFetch<{ positions: ApiSkillPosition[] }>('/skills/positions')
export const setPositionSkills = (positionId: number, requirements: Array<{ skillId: number; level: SkillLevel }>) =>
  apiFetch<{ positionId: number }>(`/skills/positions/${positionId}`, json('PUT', { requirements }))
export const fetchSkillMatrix = () => apiFetch<{ rows: ApiSkillRow[] }>('/skills/matrix')
export const fetchMyTeamSkills = () => apiFetch<{ rows: ApiSkillRow[]; levels?: Array<{ code: SkillLevel; label: string }>; skills?: Array<{ id: number; name: string }> }>('/skills/my-team')
export const fetchMySkills = () => apiFetch<{ ready: boolean; row: ApiSkillRow | null }>('/skills/my')
export const assessEmployeeSkill = (employeeId: number, skillId: number, body: AssessmentInput) => apiFetch<{ employeeId: number }>(`/skills/employees/${employeeId}/${skillId}`, json('PUT', body))

// ===== (ب) الإحلال — سرّي (succession.manage) =====
export type Readiness = 'READY_NOW' | 'ONE_TO_TWO' | 'THREE_PLUS'
export interface ApiSuccessionNominee {
  id: number; rank: number; readiness: Readiness; readinessLabel: string; note: string | null; nominatedAt: string; nominatedByName: string | null
  /** مرشح فرعه الحالي برّه نطاقك: من غير اسم ولا رقم */
  hidden: boolean; employeeId: number | null; fullName: string; employeeCode: string | null
  /** كام مهارة من المطلوب للوظيفة مش مستوفيها (null للمرشح المخفي) */
  gaps: number | null
}
export interface ApiSuccessionPosition {
  id: number; code: string; title: string; branchName: string | null; departmentName: string | null; critical: boolean; reason: string | null
  requirements: number; holders: string[]; hiddenHolders: number; nominations: ApiSuccessionNominee[]
}
export interface ApiSuccession {
  ready: boolean; readiness: Array<{ code: Readiness; label: string }>; positions: ApiSuccessionPosition[]
  candidates: Array<{ id: number; fullName: string; employeeCode: string | null }>
}
const S = '/skills/succession'
export const fetchSuccession = () => apiFetch<ApiSuccession>(S)
export const setCriticalPosition = (positionId: number, critical: boolean, reason?: string) => apiFetch<{ positionId: number }>(`${S}/positions/${positionId}`, json('PUT', { critical, reason }))
export const nominateSuccessor = (positionId: number, body: { employeeId: number; readiness: Readiness; note?: string }) => apiFetch<{ id: number }>(`${S}/positions/${positionId}/nominations`, json('POST', body))
export const updateSuccessor = (id: number, body: { readiness: Readiness; note?: string; rank?: number }) => apiFetch<{ id: number }>(`${S}/nominations/${id}`, json('PATCH', body))
export const removeSuccessor = (id: number) => apiFetch<{ removed: boolean }>(`${S}/nominations/${id}`, { method: 'DELETE' })

// ===== (ج) شبكة 9-box — ميزة فرعية skills.nine_box (مقفولة افتراضيًا) =====
export type Band = 'LOW' | 'MEDIUM' | 'HIGH'
export interface ApiNineBoxRow {
  employeeId: number; fullName: string; employeeCode: string | null
  /** درجة آخر تقييم أداء معلن (من 100) وشريحتها */
  score: number | null; performance: Band | null; performanceLabel: string | null
  potential: Band | null; potentialLabel: string | null; note: string | null
  /** رقم الخانة 1..9 (null = محور ناقص) */
  box: number | null
}
export interface ApiNineBox { ready: boolean; thresholds: { mediumFrom: number; highFrom: number }; rows: ApiNineBoxRow[] }
export const fetchNineBox = () => apiFetch<ApiNineBox>(`${S}/nine-box`)
export const setTalentPotential = (employeeId: number, potential: Band, note?: string) => apiFetch<{ employeeId: number }>(`${S}/nine-box/${employeeId}`, json('PUT', { potential, note }))
