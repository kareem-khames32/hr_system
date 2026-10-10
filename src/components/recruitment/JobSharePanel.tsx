'use client'

// B-ADD.6: «انشر الوظيفة» — بوست جاهز (عربي وإنجليزي) من خانات الوظيفة العامة، وصورة بهوية الشركة (LinkedIn وInstagram)، وأزرار مشاركة
// بتفتح نافذة المنصة بلينك تقديم فيه مصدر (`?src=linkedin`…). النشر من متصفح مسؤول التوظيف: مفيش حاجة بتتنشر من الخادم.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Copy, Download, ExternalLink, Megaphone, X } from 'lucide-react'
import { useBranding } from '@/lib/branding'
import { fetchJobShareKit, type ApiJobShareKit } from '@/lib/job-share-api'
import { drawJobImage, jobImageBlob, loadLogo } from '@/lib/job-share-image'
import {
  SHARE_CHANNELS, SHARE_IMAGE_SIZES, applyLink, jobPost, jobPostBody, shareUrl, type PostLang, type ShareImageSize, type ShareSource,
} from '@/lib/job-share'

const LANGS: ReadonlyArray<{ key: PostLang; label: string }> = [{ key: 'ar', label: 'عربي' }, { key: 'en', label: 'English' }]

// النسخ: الحافظة لو المتصفح سمح — والفشل بيتقال للمستخدم (النص قدامه في الخانة ينسخه بإيده)
const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export default function JobSharePanel({ jobId, onClose }: { jobId: number; onClose: () => void }) {
  const brand = useBranding()
  const [kit, setKit] = useState<ApiJobShareKit | null>(null)
  const [error, setError] = useState('')
  const [lang, setLang] = useState<PostLang>('ar')
  // النص المعدّل لكل لغة (null = النص المولّد)
  const [edited, setEdited] = useState<Record<PostLang, string | null>>({ ar: null, en: null })
  const [size, setSize] = useState<ShareImageSize>('linkedin')
  const [logo, setLogo] = useState<HTMLImageElement | null>(null)
  const [notice, setNotice] = useState('')
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let alive = true
    fetchJobShareKit(jobId)
      .then((data) => alive && setKit(data))
      .catch((cause) => alive && setError(cause instanceof Error ? cause.message : 'تعذر تحميل بيانات النشر'))
    return () => {
      alive = false
    }
  }, [jobId])

  useEffect(() => {
    let alive = true
    loadLogo(brand.logoUrl).then((image) => alive && setLogo(image))
    return () => {
      alive = false
    }
  }, [brand.logoUrl])

  // اسم الشركة في البوست: المضبوط في «بيانات الشركة» بس (من غير اسم = «وظيفة شاغرة» من غير اسم المنتج)
  const company = kit?.company ?? null
  // على الصورة: اسم الشركة وعلامتها لو مضبوطين — من غير اسم شركة مابيتحطش اسم المنتج مكانه
  const imageCompany = company ?? (brand.hasCompanyName ? brand.companyName : '')
  const imageInitials = imageCompany ? brand.initials : ''
  const generated = useMemo(() => (kit ? { ar: jobPostBody(kit.job, company, 'ar'), en: jobPostBody(kit.job, company, 'en') } : { ar: '', en: '' }), [kit, company])
  const body = edited[lang] ?? generated[lang]
  const linkFor = (source?: ShareSource) => (kit?.baseUrl ? applyLink(kit.baseUrl, kit.job.id, source) : '')
  const canShare = !!kit?.baseUrl && body.trim() !== ''

  // الصورة بتترسم تاني مع أي تغيير (اللغة، المقاس، الشعار) — وبعد ما خط الصفحة يتحمّل عشان النص يطلع بيه
  useEffect(() => {
    if (!kit || !canvas.current) return
    let alive = true
    const target = canvas.current
    const input = { job: kit.job, company: imageCompany, initials: imageInitials, lang, size }
    const draw = (withLogo: HTMLImageElement | null) => drawJobImage(target, { ...input, logo: withLogo })
    const fonts = typeof document !== 'undefined' && document.fonts ? document.fonts.load("800 48px 'Tajawal'", kit.job.title).catch(() => undefined) : Promise.resolve()
    void fonts.then(() => {
      if (!alive) return
      try {
        draw(logo)
      } catch {
        draw(null)
      }
    })
    return () => {
      alive = false
    }
  }, [kit, imageCompany, imageInitials, lang, size, logo])

  const copyPost = async () => {
    const copied = await copyText(jobPost(body, linkFor(), lang))
    setNotice(copied ? 'البوست اتنسخ — بلينك من غير مصدر (المتقدّم منه بيتسجّل «لينك عام»).' : 'المتصفح رفض النسخ — حدّد النص من الخانة وانسخه بإيدك.')
  }

  const share = async (channel: (typeof SHARE_CHANNELS)[number]) => {
    const link = linkFor(channel.key)
    // النسخ بيبدأ قبل فتح التبويب (والصفحة لسه قدام المستخدم)، والتبويب بيتفتح في نفس الضغطة
    const copying = copyText(jobPost(body, link, lang))
    const target = shareUrl(channel.key, body, link, lang)
    if (target) window.open(target, '_blank', 'noopener,noreferrer')
    const copied = await copying
    const pasted = copied ? 'البوست اتنسخ' : 'المتصفح رفض النسخ — انسخ النص من الخانة بإيدك'
    if (!channel.opens) setNotice(`${pasted}. Instagram مابيفتحش بوست من لينك: نزّل الصورة المربعة وارفعها من التطبيق والصق النص (اللينك بمصدر Instagram).`)
    else if (channel.pasteText) setNotice(`${pasted}. ${channel.label} بياخد اللينك بس: الصق النص في النافذة اللي اتفتحت، وارفع الصورة بعد ما تنزّلها.`)
    else setNotice(`نافذة ${channel.label} اتفتحت بالبوست واللينك${copied ? '، والبوست اتنسخ كمان لو حبيت تلصقه' : ''}.`)
  }

  const download = async () => {
    if (!kit || !canvas.current) return
    let blob = await jobImageBlob(canvas.current)
    if (!blob) {
      // الشعار منع التصدير (من غير إذن CORS): الصورة بتترسم بعلامة الحروف وتتنزّل
      drawJobImage(canvas.current, { job: kit.job, company: imageCompany, initials: imageInitials, logo: null, lang, size })
      blob = await jobImageBlob(canvas.current)
    }
    if (!blob) {
      setNotice('المتصفح رفض تنزيل الصورة.')
      return
    }
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${kit.job.code}-${size}-${lang}.png`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const dimensions = SHARE_IMAGE_SIZES[size]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="انشر الوظيفة" data-job-share>
      <div className="bg-white rounded-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Megaphone size={20} className="text-primary-600" />
              انشر الوظيفة
            </h2>
            <p className="text-sm text-gray-500 mt-1">{kit ? `${kit.job.code} · ${kit.job.title}` : 'بوست جاهز وصورة وأزرار مشاركة بلينك التقديم'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {error && (
            <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}
          {kit && !kit.baseUrl && (
            <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm" data-share-no-base>
              عنوان صفحة الوظائف العام مش مضبوط على الخادم (CAREERS_PUBLIC_URL أو FRONTEND_URL) — من غيره مفيش لينك تقديم يتبني، والمشاركة مقفولة. اطلب من مسؤول النظام يضبطه.
            </div>
          )}
          {kit && kit.baseUrl && kit.baseInternal && (
            <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm" data-share-internal>
              لينك التقديم على عنوان داخلي (<bdi dir="ltr">{kit.baseUrl}</bdi>): مش هيفتح من برّه شبكة الشركة، والمنصات مش هتعرض معاينته. المشاركة شغالة للتجربة — للنشر الفعلي
              صفحة الوظائف لازم تتاح من الإنترنت.
            </div>
          )}
          {kit && !kit.careersOpen && (
            <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm" data-share-closed>
              صفحة الوظائف العامة مقفولة — اللينك مش هيفتح للمتقدمين لحد ما ميزة «صفحة الوظائف العامة والتقديم من لينك» تتفتح من الإعدادات ← الموديولات.
            </div>
          )}
          {kit && (
            <>
              <section className="space-y-3" data-share-post>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-sm font-bold text-gray-800">البوست</h3>
                  <div className="flex items-center gap-2">
                    {LANGS.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => setLang(item.key)}
                        aria-pressed={lang === item.key}
                        className={`px-3 py-1.5 rounded-full text-sm ${lang === item.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  className="input w-full"
                  rows={8}
                  maxLength={3000}
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  aria-label="نص البوست"
                  value={body}
                  onChange={(e) => setEdited((current) => ({ ...current, [lang]: e.target.value }))}
                />
                <p className="text-xs text-gray-500">
                  النص من بيانات الوظيفة المنشورة بس، وتقدر تعدّله قبل النشر. لينك التقديم بيتضاف في آخره لوحده
                  {lang === 'en' ? ' — والإنجليزي إطار حوالين بيانات الوظيفة زي ما هي مكتوبة.' : '.'}
                </p>
                {kit.baseUrl && (
                  <p className="text-xs text-gray-600">
                    لينك التقديم: <bdi dir="ltr" className="break-all">{linkFor()}</bdi>
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={copyPost} disabled={!canShare} className="btn-secondary text-sm inline-flex items-center gap-1 disabled:opacity-50" data-share-copy>
                    <Copy size={14} />
                    انسخ البوست
                  </button>
                  {SHARE_CHANNELS.map((channel) => (
                    <button
                      key={channel.key}
                      onClick={() => share(channel)}
                      disabled={!canShare}
                      title={`لينك التقديم بمصدر ${channel.label} (?src=${channel.key})`}
                      className="btn-primary text-sm inline-flex items-center gap-1 disabled:opacity-50"
                      data-share-channel={channel.key}
                    >
                      {channel.opens ? <ExternalLink size={14} /> : <Copy size={14} />}
                      {channel.label}
                    </button>
                  ))}
                </div>
                {notice && (
                  <p role="status" className="text-sm text-green-800 bg-green-50 rounded-xl p-3">
                    {notice}
                  </p>
                )}
                <p className="text-xs text-gray-500">كل زرار بيحط مصدره في اللينك — المتقدّم منه بيظهر بمصدره في «أرقام التوظيف ← مصادر المرشحين».</p>
              </section>
              <section className="space-y-3" data-share-image>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-sm font-bold text-gray-800">صورة الوظيفة</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(Object.keys(SHARE_IMAGE_SIZES) as ShareImageSize[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => setSize(key)}
                        aria-pressed={size === key}
                        className={`px-3 py-1.5 rounded-full text-sm ${size === key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        <bdi dir="ltr">{SHARE_IMAGE_SIZES[key].label}</bdi>
                      </button>
                    ))}
                    <button onClick={download} className="btn-secondary text-sm inline-flex items-center gap-1" data-share-download>
                      <Download size={14} />
                      نزّل الصورة
                    </button>
                  </div>
                </div>
                <canvas
                  ref={canvas}
                  width={dimensions.width}
                  height={dimensions.height}
                  className="w-full h-auto rounded-xl border border-gray-100"
                  style={{ maxWidth: size === 'instagram' ? 420 : 640 }}
                  aria-label={`صورة الوظيفة بمقاس ${dimensions.label}`}
                />
                <p className="text-xs text-gray-500">بتترسم على جهازك بشعار الشركة واسمها ولغة البوست — المنصات مابتاخدش صورة من اللينك، فبتترفع بعد التنزيل.</p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
