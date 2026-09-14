'use client'

import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist'

// Render the actual PDF locally so preview also works in browsers without a built-in PDF plugin.
export default function PdfPreview({ url }: { url: string }) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [width, setWidth] = useState(750)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const container = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let cancelled = false
    let task: PDFDocumentLoadingTask | undefined
    setLoading(true); setError(''); setDocument(null); setPageNumber(1)
    import('pdfjs-dist').then(async library => {
      if (cancelled) return
      const assets = `/vendor/pdfjs/${library.version}/`
      library.GlobalWorkerOptions.workerSrc = assets + 'pdf.worker.min.mjs'
      task = library.getDocument({ url, enableXfa: false, cMapUrl: assets + 'cmaps/', cMapPacked: true, standardFontDataUrl: assets + 'standard_fonts/', wasmUrl: assets + 'wasm/' })
      const loaded = await task.promise
      if (!cancelled) setDocument(loaded)
    }).catch(err => { if (!cancelled) { setError(err instanceof Error ? err.message : 'تعذر عرض الملف'); setLoading(false) } })
    return () => { cancelled = true; void task?.destroy() }
  }, [url])
  useEffect(() => {
    const element = container.current
    if (!element) return
    const observer = new ResizeObserver(entries => setWidth(Math.max(240, Math.floor(entries[0].contentRect.width - 32))))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!document) return
    let cancelled = false
    let render: RenderTask | undefined
    setLoading(true); setError('')
    document.getPage(pageNumber).then(async page => {
      const target = canvas.current
      if (cancelled || !target) return
      const scale = Math.min(width, 1000) / page.getViewport({ scale: 1 }).width
      const viewport = page.getViewport({ scale })
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      target.width = Math.ceil(viewport.width * pixelRatio)
      target.height = Math.ceil(viewport.height * pixelRatio)
      target.style.width = `${viewport.width}px`; target.style.height = `${viewport.height}px`
      render = page.render({ canvas: target, viewport, transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0] })
      await render.promise
      if (!cancelled) setLoading(false)
    }).catch(err => { if (!cancelled) { setError(err instanceof Error ? err.message : 'تعذر عرض الصفحة'); setLoading(false) } })
    return () => { cancelled = true; render?.cancel() }
  }, [document, pageNumber, width])
  return <div ref={container} className="bg-gray-100">
    <div className="flex items-center justify-center gap-4 border-b bg-white p-2 text-sm">
      <button type="button" disabled={loading || pageNumber <= 1} onClick={() => setPageNumber(value => value - 1)} className="rounded-lg px-3 py-1 hover:bg-gray-100 disabled:opacity-30">السابق</button>
      <span>صفحة {pageNumber} من {document?.numPages ?? '…'}</span>
      <button type="button" disabled={loading || !document || pageNumber >= document.numPages} onClick={() => setPageNumber(value => value + 1)} className="rounded-lg px-3 py-1 hover:bg-gray-100 disabled:opacity-30">التالي</button>
    </div>
    <div className="h-[68vh] overflow-auto p-4">
      {loading && <p role="status" className="py-2 text-center text-sm text-gray-500">جارٍ عرض ملف الخطاب…</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">تعذر عرض المعاينة. يمكنك تحميل ملف PDF من الزر أعلاه.</p>}
      <canvas ref={canvas} aria-label={`صفحة ${pageNumber} من معاينة الخطاب`} className={`mx-auto bg-white shadow ${error ? 'hidden' : ''}`} />
    </div>
  </div>
}
