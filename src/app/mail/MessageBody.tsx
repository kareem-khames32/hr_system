'use client'

import { useEffect, useMemo, useState } from 'react'
import { Maximize2, Minimize2, ShieldCheck } from 'lucide-react'

/**
 * B-ADD.16: عرض نص الرسالة بأمان. الرسالة HTML من برّه الشركة، فبتتعرض جوه iframe معزول تمامًا:
 *  - sandbox من غير allow-scripts ولا allow-same-origin ولا allow-forms: مفيش سكربت بيشتغل، ومالهاش أصل النظام (لا cookie ولا تخزين ولا نداء
 *    على الخادم بجلسة الموظف)، ومفيش نموذج بيتبعت. الروابط بس بتفتح في تبويب جديد.
 *  - سياسة محتوى جوه المستند نفسه: ولا مصدر خارجي بيتحمّل، والصور البعيدة مقفولة لحد ما القارئ يطلبها (فتحها بيعرّف المرسل إن الرسالة اتقرت).
 * عشان الإطار مالوش نفس الأصل، ارتفاعه مابيتقاسش من جوه: ارتفاع ثابت بتمرير داخلي، وزرار بيكبّره.
 */
export default function MessageBody({ html }: { html: string }) {
  const [images, setImages] = useState(false)
  const [tall, setTall] = useState(false)
  const hasRemote = useMemo(() => /<img[^>]+src\s*=\s*["']?(?:https?:)?\/\//i.test(html) || /url\(\s*['"]?(?:https?:)?\/\//i.test(html), [html])

  useEffect(() => {
    setImages(false)
  }, [html])

  const doc = useMemo(() => {
    // <meta refresh> كان هينقل الإطار برّه الرسالة، و<base> بتاع الرسالة كان هيغيّر وجهة الروابط. و<base href="about:blank"> بتاعنا بيخلّي أي رابط
    // أو صورة بعنوان نسبي (‎/path‎) مايتحلّش على عنوان النظام نفسه — العناوين الكاملة بس هي اللي بتشتغل
    const body = html.replace(/<meta[^>]*http-equiv\s*=\s*["']?refresh[^>]*>/gi, '').replace(/<base\b[^>]*>/gi, '')
    const csp = `default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data: ${images ? 'https: http:' : ''}`
    return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="referrer" content="no-referrer">
<base href="about:blank" target="_blank">
<style>
  html,body{margin:0;padding:0;background:#fff;color:#1f1f1f}
  body{padding:16px 18px;font:14px/1.6 'Segoe UI',Tahoma,Arial,sans-serif;word-wrap:break-word;overflow-wrap:anywhere}
  img{max-width:100%;height:auto}
  table{max-width:100%}
  blockquote{margin:0;margin-inline-start:.8em;padding-inline-start:.8em;border-inline-start:3px solid #ddd}
  pre{white-space:pre-wrap}
</style></head><body>${body}</body></html>`
  }, [html, images])

  return (
    <div className="space-y-2" data-mail-body>
      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
        {hasRemote && !images && (
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 rounded-lg px-2 py-1">
            <ShieldCheck size={14} />
            الصور الخارجية مقفولة لحماية خصوصيتك
            <button type="button" onClick={() => setImages(true)} className="text-primary-600 hover:underline font-medium">
              اعرض الصور
            </button>
          </span>
        )}
        <button type="button" onClick={() => setTall(!tall)} className="inline-flex items-center gap-1 ms-auto hover:text-gray-700" title={tall ? 'صغّر مساحة الرسالة' : 'كبّر مساحة الرسالة'}>
          {tall ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          {tall ? 'تصغير' : 'تكبير'}
        </button>
      </div>
      <iframe
        title="نص الرسالة"
        // من غير allow-scripts ولا allow-same-origin: الرسالة معزولة عن النظام تمامًا
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        srcDoc={doc}
        className="w-full bg-white border border-gray-100 rounded-xl"
        style={{ height: tall ? '80vh' : '26rem' }}
      />
    </div>
  )
}
