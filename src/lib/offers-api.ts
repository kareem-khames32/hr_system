// B3.5-أ: عروض العمل — مسؤول التوظيف بيعمل العرض ويبعته للاعتماد ثم للمرشح، ومعتمد العروض بيعتمد أو يرجّع. الخادم بيحكم كل إجراء.
import { apiFetch } from './api'

export type OfferStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN'
export type OfferAction = 'submit' | 'approve' | 'return' | 'send' | 'withdraw' | 'record'

export interface ApiOffer {
  id: number; candidateId: number; candidateName: string; positionTitle: string | null
  /** الراتب المعروض: نص بخانتين (رقم في العرض بس) */
  salary: string; startDate: string | null; expiresOn: string | null; notes: string | null
  status: OfferStatus; statusLabel: string
  /** نطاق راتب الوظيفة (لو المرشح على وظيفة)، وتحذير لما المعروض برّاه */
  rangeFrom: string | null; rangeTo: string | null; outOfRange: boolean
  returnReason: string | null; approvedAt: string | null; sentAt: string | null
  respondedAt: string | null; respondedVia: 'LINK' | 'RECRUITER' | null; respondedNote: string | null
  mine: boolean; canApprove: boolean
  /** مع الإرسال بس: رمز لينك الرد — بيطلع مرة واحدة */
  linkToken?: string
}
export interface ApiOffersList { available: boolean; message?: string; canApprove: boolean; offers: ApiOffer[] }
export interface OfferBody { candidateId: number; salary: string; startDate: string; expiresOn?: string | null; notes?: string | null }

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

export const fetchOffers = () => apiFetch<ApiOffersList>('/recruitment/offers')
export const createOffer = (body: OfferBody) => apiFetch<ApiOffer>('/recruitment/offers', json('POST', body))
export const updateOffer = (id: number, body: Partial<Omit<OfferBody, 'candidateId'>>) => apiFetch<ApiOffer>(`/recruitment/offers/${id}`, json('PATCH', body))
export const actOnOffer = (id: number, action: OfferAction, extra: { reason?: string; answer?: 'ACCEPT' | 'DECLINE'; note?: string } = {}) =>
  apiFetch<ApiOffer>(`/recruitment/offers/${id}/act`, json('POST', { action, ...extra }))
