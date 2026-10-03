// B2.3: متابعة الطابور (لحساب الشركة بصلاحية «إدارة الإعدادات») — العدّ بكل حالة، والأحداث اللي لسه ماتوزعتش، والمهام الميتة وإعادتها.
// مسارات نسبية (لا @/) عشان الاختبارات تقرا الملف مباشرة.
import { apiFetch } from './api'

export type QueueJobStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'DEAD'

export const QUEUE_STATUS_LABELS: Record<QueueJobStatus, string> = {
  PENDING: 'مستنية',
  RUNNING: 'شغالة',
  DONE: 'خلصت',
  DEAD: 'ميتة (خلّصت محاولاتها)',
}

export interface ApiQueueDeadJob {
  id: string
  jobType: string
  attempts: number
  maxAttempts: number
  lastError: string | null
  createdAt: string
  finishedAt: string | null
}

export type ApiQueueOverview =
  | { available: false }
  | { available: true; jobs: Record<QueueJobStatus, number>; outboxPending: number; dead: ApiQueueDeadJob[] }

export const fetchQueueOverview = () => apiFetch<ApiQueueOverview>('/queue')

export const retryQueueJob = (id: string) =>
  apiFetch<{ id: string; status: 'PENDING' }>(`/queue/jobs/${encodeURIComponent(id)}/retry`, { method: 'POST' })
