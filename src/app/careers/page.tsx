'use client'

// B3.3-ب: صفحة الوظائف العامة (من غير دخول) — الوظائف المنشورة «خارجي»، وكل وظيفة بلينك تقديمها
// B-ADD.6: `?src=` (المصدر المعروف بس) بيكمّل مع المتقدّم للينك الوظيفة اللي بيختارها
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Briefcase, MapPin } from 'lucide-react'
import { useBranding } from '@/lib/branding'
import { formatDate } from '@/lib/dates'
import { CareersUnavailable, fetchPublicJobs, type PublicJob } from '@/lib/careers-api'
import { knownShareSource } from '@/lib/job-share'

export default function CareersPage() {
  const brand = useBranding()
  const [jobs, setJobs] = useState<PublicJob[] | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [error, setError] = useState('')
  const [source, setSource] = useState('')

  useEffect(() => {
    setSource(knownShareSource(new URLSearchParams(window.location.search).get('src')))
  }, [])

  useEffect(() => {
    fetchPublicJobs()
      .then((list) => setJobs(list.jobs))
      .catch((cause) => {
        if (cause instanceof CareersUnavailable) setUnavailable(true)
        else setError(cause instanceof Error ? cause.message : 'تعذر تحميل الوظائف')
      })
  }, [])

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <p className="text-sm text-gray-500">
            <bdi>{brand.companyName}</bdi>
          </p>
          <h1 className="text-2xl font-bold text-gray-800 mt-1">الوظائف المتاحة</h1>
        </header>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {unavailable && (
          <div role="status" className="bg-white rounded-xl border border-gray-100 p-6 text-gray-600">
            صفحة الوظائف مش متاحة دلوقتي.
          </div>
        )}
        {jobs && jobs.length === 0 && (
          <div role="status" className="bg-white rounded-xl border border-gray-100 p-6 text-gray-600">
            مفيش وظائف مفتوحة للتقديم دلوقتي.
          </div>
        )}
        {jobs && jobs.length > 0 && (
          <ul className="space-y-3" data-public-jobs>
            {jobs.map((job) => (
              <li key={job.id}>
                <Link href={`/careers/${job.id}${source ? `?src=${source}` : ''}`} className="block bg-white rounded-xl border border-gray-100 p-5 hover:border-primary-300 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Briefcase size={18} className="text-primary-600" />
                        {job.title}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                        {job.branchName && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={14} />
                            {job.branchName}
                          </span>
                        )}
                        <span>العدد المطلوب {job.openings}</span>
                        {job.startDate && <span>البدء {formatDate(job.startDate)}</span>}
                      </p>
                    </div>
                    <span className="btn-primary text-sm whitespace-nowrap">التفاصيل والتقديم</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
