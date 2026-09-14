import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import puppeteer from 'puppeteer'
import type { IssuedLetterSnapshot } from './letter-template.entities'

const escape = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

@Injectable()
export class LetterRenderer {
  private running = 0
  async pdf(snapshot: IssuedLetterSnapshot, preview = false): Promise<Uint8Array> {
    if (this.running >= 2) throw new ServiceUnavailableException('يجري تجهيز مستندات أخرى؛ أعد المحاولة بعد لحظات')
    this.running++
    try {
      const font = await readFile(resolve(__dirname, '../../assets/fonts/NotoNaskhArabic.ttf'))
      const c = snapshot.content
      const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
      @font-face{font-family:Naskh;src:url(data:font/ttf;base64,${font.toString('base64')})}*{box-sizing:border-box}body{font-family:Naskh,serif;color:#162d40;margin:0;font-size:17px;line-height:2}header{border-bottom:3px solid #117b80;padding-bottom:22px;display:flex;justify-content:space-between;gap:20px}h1{font-size:27px;margin:0}small{font-size:12px;color:#607486}.meta{font-size:13px;text-align:left;white-space:nowrap}h2{text-align:center;font-size:25px;margin:36px 0;overflow-wrap:anywhere}.text{white-space:pre-wrap;overflow-wrap:anywhere;orphans:3;widows:3}.body{margin:24px 0;text-align:justify}.closing{margin-top:35px;text-align:left}footer{border-top:1px solid #dce5e9;margin-top:45px;padding-top:13px;font-size:12px;color:#607486}.preview{text-align:center;color:#b45309;background:#fffbeb;padding:5px;margin-bottom:20px}</style></head><body>
      ${preview ? '<div class="preview">معاينة فقط — ليست مستندًا صادرًا</div>' : ''}
      <header><div><h1>${escape(snapshot.companyName)}</h1><small>${escape(snapshot.companyNameEn)}</small></div><div class="meta">التاريخ: <bdi>${escape(snapshot.issuedDate)}</bdi><br>المرجع: <bdi>${escape(snapshot.requestRef)}</bdi></div></header>
      <h2>${escape(c.title)}</h2><div class="text">${escape(c.greeting)}</div><div class="text body">${escape(c.body)}</div><div class="text closing">${escape(c.closing)}</div>
      <footer><div class="text">${escape(c.footer)}</div>${escape(snapshot.companyAddress)}${snapshot.companyPhone ? ` | ${escape(snapshot.companyPhone)}` : ''}${snapshot.commercialRegister ? `<br>السجل التجاري: <bdi>${escape(snapshot.commercialRegister)}</bdi>` : ''}</footer></body></html>`
      const browser = await puppeteer.launch({ headless: true, ...(process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {}) })
      try {
        const page = await browser.newPage()
        await page.setJavaScriptEnabled(false)
        await page.setRequestInterception(true)
        page.on('request', r => r.url().startsWith('data:') ? void r.continue() : void r.abort())
        await page.setContent(html, { waitUntil: 'load', timeout: 20000 })
        return await page.pdf({ format: 'A4', printBackground: true, timeout: 20000, margin: { top: '20mm', bottom: '20mm', right: '23mm', left: '23mm' } })
      } finally { await browser.close() }
    } finally { this.running-- }
  }
}
