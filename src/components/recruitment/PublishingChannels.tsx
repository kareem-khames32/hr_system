'use client'

// B-ADD.6: «قنوات النشر» — فيد XML العام للوظائف (Indeed وLinkedIn Limited Listings) بلينكه الثابت، ومكان النشر التلقائي على صفحة الشركة
// بالـAPI الرسمي لكل منصة: مقفول لحد ما بيانات الربط تتحط (مفيش حقل توكن بيتحفظ، ومفيش نداء لأي منصة).
import { useEffect, useState } from 'react'
import { Copy, Lock, Rss, X } from 'lucide-react'
import { publicFeedUrl } from '@/lib/careers-api'
import { fetchPublishingChannels, type ApiPublishingChannels } from '@/lib/job-share-api'

export default function PublishingChannels({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<ApiPublishingChannels | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  useEffect(() => {
    fetchPublishingChannels()
      .then(setData)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل قنوات النشر'))
  }, [])

  const copy = async (name: string) => {
    const link = publicFeedUrl(name)
    try {
      await navigator.clipboard.writeText(link)
      setCopied(name)
      setTimeout(() => setCopied(''), 2500)
    } catch {
      window.prompt('لينك الفيد', link)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="قنوات النشر" data-publishing-channels>
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">قنوات النشر</h2>
            <p className="text-sm text-gray-500 mt-1">فين الوظائف المنشورة «خارجي» بتوصل برّه النظام</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {error && (
            <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}
          {data && (
            <>
              <section className="space-y-3" data-job-feeds>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Rss size={16} className="text-primary-600" />
                  فيد XML للوظائف
                </h3>
                <p className="text-xs text-gray-500">
                  لينك ثابت بتسجّله عند المنصة مرة واحدة، وهي بتسحب منه الوظائف المنشورة «خارجي» بنفس بيانات صفحة الوظائف العامة (من غير راتب ولا أي بيان داخلي).
                </p>
                {!data.careersOpen && (
                  <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">
                    صفحة الوظائف العامة مقفولة — الفيد مش هيرد لحد ما ميزة «صفحة الوظائف العامة والتقديم من لينك» تتفتح من الإعدادات ← الموديولات.
                  </div>
                )}
                {!data.baseUrl && (
                  <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
                    عنوان صفحة الوظائف العام مش مضبوط على الخادم (CAREERS_PUBLIC_URL أو FRONTEND_URL) — الفيد مش هيرد من غيره (لينك التقديم جوّاه بيتبني عليه).
                  </div>
                )}
                {data.baseUrl && data.baseInternal && (
                  <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">
                    عنوان صفحة الوظائف داخلي (<bdi dir="ltr">{data.baseUrl}</bdi>): المنصات مش هتقدر تسحب الفيد ولا تفتح لينكاته لحد ما صفحة الوظائف تتاح من الإنترنت.
                  </div>
                )}
                <ul className="space-y-2">
                  {data.feeds.map((feed) => (
                    <li key={feed.name} className="rounded-xl border border-gray-100 p-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">{feed.label}</p>
                        <p className="text-xs text-gray-600 break-all">
                          <bdi dir="ltr">{publicFeedUrl(feed.name)}</bdi>
                        </p>
                      </div>
                      <button onClick={() => copy(feed.name)} className="btn-secondary text-sm inline-flex items-center gap-1">
                        <Copy size={14} />
                        {copied === feed.name ? 'اتنسخ' : 'انسخ اللينك'}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="space-y-3" data-auto-publish>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Lock size={16} className="text-gray-500" />
                  النشر التلقائي على صفحة الشركة
                </h3>
                <p className="text-xs text-gray-500">
                  النشر التلقائي بيتم بالـAPI الرسمي لكل منصة، ومحتاج تطبيق مطوّر معتمد منها. يتفعّل لاحقًا لما بيانات الربط تتحط — ولحد وقتها النشر بزرار «انشر
                  الوظيفة» قدام كل وظيفة.
                </p>
                <ul className="space-y-2">
                  {data.autoPublish.map((channel) => (
                    <li key={channel.key} className="rounded-xl border border-gray-100 bg-gray-50 p-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          {channel.label} <span className="inline-block ms-2 px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-700">يتفعّل لاحقًا</span>
                        </p>
                        <p className="text-xs text-gray-600 mt-1">المطلوب: {channel.needs}</p>
                      </div>
                      <button disabled title="يتفعّل لاحقًا — لما بيانات الربط مع المنصة تتحط" className="btn-secondary text-sm inline-flex items-center gap-1 disabled:opacity-50">
                        <Lock size={14} />
                        ربط الحساب
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
