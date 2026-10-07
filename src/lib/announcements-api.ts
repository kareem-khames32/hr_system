// B2.16: الإعلانات — لوحة الموظف (الإعلانات السارية اللي هو في جمهورها) وإدارة الإعلانات وتقرير القراءة
import { apiFetch } from './api'

export interface AnnouncementItem {
  id: number; title: string; body: string; publishDate: string; expiryDate: string | null; pinned: boolean; requiresRead: boolean
}
export interface BoardAnnouncement extends AnnouncementItem { read: boolean; readAt: string | null }
export const fetchAnnouncementsBoard = () => apiFetch<{ available: boolean; items: BoardAnnouncement[] }>('/announcements/board')
export const markAnnouncementRead = (id: number) => apiFetch<{ read: boolean; readAt: string }>(`/announcements/${id}/read`, { method: 'POST' })

export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN'
export const ANNOUNCEMENT_STATUS_LABELS: Record<AnnouncementStatus, string> = { DRAFT: 'مسودة', PUBLISHED: 'منشور', WITHDRAWN: 'مسحوب' }
/** جمهور الإعلان بصيغة جمهور أنواع الطلبات: null = كل الشركة */
export type AnnouncementAudience = { mode?: string; ids?: Array<number | string>; where?: { mode?: string; ids?: Array<number | string> } | null } | null
export interface ManagedAnnouncement extends AnnouncementItem { status: AnnouncementStatus; audience: AnnouncementAudience; createdAt: string; publishedAt: string | null }
export interface AnnouncementInput {
  title: string; body: string; audience: AnnouncementAudience; publishDate?: string | null; expiryDate?: string | null; pinned?: boolean; requiresRead?: boolean
}
export const fetchAnnouncements = () => apiFetch<{ available: boolean; message: string | null; items: ManagedAnnouncement[] }>('/announcements')
export const createAnnouncement = (body: AnnouncementInput) => apiFetch<ManagedAnnouncement>('/announcements', { method: 'POST', body: JSON.stringify(body) })
export const updateAnnouncement = (id: number, body: Partial<AnnouncementInput>) =>
  apiFetch<ManagedAnnouncement>(`/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const publishAnnouncement = (id: number) => apiFetch<ManagedAnnouncement>(`/announcements/${id}/publish`, { method: 'POST' })
export const withdrawAnnouncement = (id: number) => apiFetch<ManagedAnnouncement>(`/announcements/${id}/withdraw`, { method: 'POST' })

export interface AnnouncementReport {
  announcement: ManagedAnnouncement
  summary: { audience: number; read: number }
  rows: Array<{ employeeId: number; employeeCode: string; fullName: string; branchName: string | null; readAt: string | null }>
}
export const fetchAnnouncementReport = (id: number) => apiFetch<AnnouncementReport>(`/announcements/${id}/report`)

/** جمهور «فروع محددة» أو كل الشركة من اختيار الشاشة */
export const branchesAudience = (branchIds: number[]): AnnouncementAudience =>
  branchIds.length ? { mode: 'all', ids: [], where: { mode: 'branches', ids: [...branchIds].sort((a, b) => a - b) } } : null

/** وصف الجمهور كنص: كل الشركة، أو أسماء الفروع، أو «جمهور مخصص» للأوضاع التانية */
export function announcementAudienceText(audience: AnnouncementAudience, branchName: (id: number) => string | undefined): string {
  if (!audience) return 'كل الشركة'
  if ((audience.mode ?? 'all') === 'all' && audience.where?.mode === 'branches') {
    return (audience.where.ids ?? []).map((id) => branchName(Number(id)) ?? `فرع #${id}`).join('، ')
  }
  return 'جمهور مخصص'
}
