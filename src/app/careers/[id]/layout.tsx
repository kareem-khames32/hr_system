// B-ADD.6: عنوان ووصف صفحة الوظيفة العامة لمعاينة اللينك على السوشيال ميديا (og) — المنصات بتقرا رد الصفحة الأول من غير ما تشغّل
// سكربتها. من خانات الوظيفة العامة بس (نفس نداء الصفحة)، ومن غير صورة. الوظيفة اللي مش متاحة، أو خادم مارَدّش في وقته = عنوان النظام
// العادي والصفحة بتفتح زي ما هي.
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { fetchPublicJob } from '@/lib/careers-api'

const WAIT_MS = 2500

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id < 1) return {}
  try {
    const job = await Promise.race([fetchPublicJob(id), new Promise<null>((resolve) => setTimeout(() => resolve(null), WAIT_MS))])
    if (!job) return {}
    const title = job.branchName ? `${job.title} — ${job.branchName}` : job.title
    const description = (job.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 200)
    return { title, description, openGraph: { title, description, type: 'website' }, twitter: { card: 'summary', title, description } }
  } catch {
    return {}
  }
}

export default function CareerJobLayout({ children }: { children: ReactNode }) {
  return children
}
