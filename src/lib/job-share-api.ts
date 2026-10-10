// B-ADD.6: «انشر الوظيفة» وقنوات النشر — قراءة بس، بصلاحية إدارة التوظيف وبنطاق فروع الحساب (الخادم بيحكم)
import { apiFetch } from './api'
import type { ShareSource, SharedJob } from './job-share'

/** حالة النشر العامة: صفحة الوظائف مفتوحة؟ وعنوانها العام (CAREERS_PUBLIC_URL وإلا FRONTEND_URL) مضبوط ومتاح من برّه؟ */
export interface ApiJobShareState { careersOpen: boolean; baseUrl: string | null; baseInternal: boolean }
export interface ApiJobShareKit extends ApiJobShareState {
  company: string | null
  job: SharedJob & { publishedAt: string | null }
  sources: Array<{ key: ShareSource; label: string }>
}
export interface ApiPublishingChannels extends ApiJobShareState {
  feeds: Array<{ name: string; label: string }>
  /** النشر التلقائي بالـAPI الرسمي: مقفول لحد ما بيانات الربط تتحط */
  autoPublish: Array<{ key: string; label: string; needs: string; enabled: boolean }>
}

export const fetchJobShareKit = (jobId: number) => apiFetch<ApiJobShareKit>(`/recruitment/share/jobs/${jobId}`)
export const fetchPublishingChannels = () => apiFetch<ApiPublishingChannels>('/recruitment/share/channels')
