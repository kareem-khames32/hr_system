import type { PDFDocumentLoadingTask } from 'pdfjs-dist'

// The source is the saved PDF, rendered locally; no HTML template is regenerated for print.
export async function printHrDocument(loadPdf: () => Promise<Blob>, title: string): Promise<void> {
  const popup = window.open('', '_blank')
  if (!popup) throw new Error('لم يفتح المتصفح نافذة الطباعة. اسمح بالنوافذ المنبثقة لهذا الموقع ثم أعد المحاولة، أو حمّل PDF واطبعه.')
  popup.opener = null
  popup.document.title = title
  popup.document.documentElement.lang = 'ar'
  popup.document.documentElement.dir = 'rtl'
  const status = popup.document.createElement('p')
  status.textContent = 'جارٍ تجهيز صفحات ملف PDF المحفوظ للطباعة...'
  popup.document.body.append(status)
  let task: PDFDocumentLoadingTask | undefined
  try {
    const [blob, library] = await Promise.all([loadPdf(), import('pdfjs-dist')])
    if (popup.closed) return
    const assets = `/vendor/pdfjs/${library.version}/`
    library.GlobalWorkerOptions.workerSrc = assets + 'pdf.worker.min.mjs'
    task = library.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), enableXfa: false, cMapUrl: assets + 'cmaps/', cMapPacked: true, standardFontDataUrl: assets + 'standard_fonts/', wasmUrl: assets + 'wasm/' })
    const pdf = await task.promise
    const style = popup.document.createElement('style')
    style.textContent = '@page{size:A4;margin:0}body{margin:0;background:#eee;font-family:Arial,sans-serif}p,button{margin:16px}canvas{display:block;width:210mm;height:auto;max-width:100%;margin:16px auto;background:#fff;break-after:page;page-break-after:always}canvas:last-child{break-after:auto;page-break-after:auto}@media print{body{background:white}p,button{display:none}canvas{margin:0;width:210mm;max-width:100%;break-inside:avoid}}'
    popup.document.head.append(style)
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      if (popup.closed) return
      status.textContent = `تجهيز صفحة ${pageNumber} من ${pdf.numPages}...`
      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 2 })
      const canvas = popup.document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height)
      canvas.setAttribute('aria-label', `صفحة ${pageNumber}`)
      popup.document.body.append(canvas)
      await page.render({ canvas, viewport }).promise
      page.cleanup()
    }
    if (popup.closed) return
    status.textContent = 'تم تجهيز ملف PDF المحفوظ. إن لم يظهر مربع الطباعة تلقائيًا، استخدم زر الطباعة.'
    const button = popup.document.createElement('button')
    button.textContent = 'طباعة المستند'
    button.addEventListener('click', () => { popup.focus(); popup.print() })
    popup.document.body.insertBefore(button, popup.document.body.firstChild)
    popup.focus(); popup.print()
  } catch (error) {
    if (!popup.closed) popup.close()
    throw error
  } finally { await task?.destroy() }
}
