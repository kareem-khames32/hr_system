// B3.3-ب: صفحة الوظائف العامة — من غير دخول ولا جلسة (مسارات /careers في الخادم، بميزة recruitment.public_careers).
// نداءات مباشرة من غير رؤوس جلسة: الصفحة للمتقدمين من برّه الشركة.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'

export interface PublicJob {
  id: number; code: string; title: string; branchName: string | null; openings: number
  description: string | null; requirements: string | null; startDate: string | null; publishedAt: string | null
}
export interface PublicApplication { fullName: string; email: string; phone: string; nationalId?: string; source?: string; cv?: File | null }

/** الصفحة مش متاحة (الميزة مقفولة أو الوظيفة مش منشورة) */
export class CareersUnavailable extends Error {}

const messageOf = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => null)
  const message = body?.message
  return Array.isArray(message) ? message.join('، ') : typeof message === 'string' && !message.startsWith('Cannot ') ? message : fallback
}

async function read<T>(path: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { credentials: 'omit' })
  } catch {
    throw new Error('تعذر الاتصال بالخادم — حاول تاني بعد شوية')
  }
  if (response.status === 404) throw new CareersUnavailable()
  if (!response.ok) throw new Error(await messageOf(response, 'تعذر تحميل الوظائف'))
  return response.json() as Promise<T>
}

export const fetchPublicJobs = () => read<{ jobs: PublicJob[] }>('/careers/jobs')
export const fetchPublicJob = (id: number) => read<PublicJob>(`/careers/jobs/${id}`)

// B3.5-أ: لينك رد المرشح على عرض العمل (الرمز في اللينك هو الحق)
export interface PublicOffer { candidateName: string; positionTitle: string; branchName: string | null; salary: string; startDate: string | null; expiresOn: string | null }
export const fetchPublicOffer = (token: string) => read<PublicOffer>(`/careers/offers/${encodeURIComponent(token)}`)
export async function answerPublicOffer(token: string, answer: 'ACCEPT' | 'DECLINE', note?: string): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}/careers/offers/${encodeURIComponent(token)}`, { credentials: 'omit', method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer, ...(note ? { note } : {}) }) })
  } catch {
    throw new Error('تعذر الاتصال بالخادم — حاول تاني بعد شوية')
  }
  if (response.status === 404) throw new CareersUnavailable()
  if (!response.ok) throw new Error(await messageOf(response, 'تعذر تسجيل الرد'))
}

/** التقديم: نموذج متعدد الأجزاء (السيرة الذاتية اختيارية)، والموافقة صريحة */
export async function applyToPublicJob(id: number, application: PublicApplication): Promise<void> {
  const form = new FormData()
  form.append('fullName', application.fullName)
  form.append('email', application.email)
  form.append('phone', application.phone)
  if (application.nationalId) form.append('nationalId', application.nationalId)
  if (application.source) form.append('source', application.source)
  form.append('consent', 'true')
  if (application.cv) form.append('cv', application.cv, application.cv.name)
  let response: Response
  try {
    response = await fetch(`${API_BASE}/careers/jobs/${id}/apply`, { credentials: 'omit', method: 'POST', body: form })
  } catch {
    throw new Error('تعذر الاتصال بالخادم — حاول تاني بعد شوية')
  }
  if (response.status === 404) throw new CareersUnavailable()
  if (response.status === 413) throw new Error('حجم السيرة الذاتية أكبر من الحد (5 ميجا)')
  if (!response.ok) throw new Error(await messageOf(response, 'تعذر إرسال الطلب'))
}
