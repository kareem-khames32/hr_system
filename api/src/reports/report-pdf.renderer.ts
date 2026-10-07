import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import puppeteer from 'puppeteer'

// B2.13: رسم صفحة تقرير PDF على الخادم — نفس أسلوب خطابات الموظفين (letter-renderer.service.ts): من غير JavaScript، وكل طلب
// خارجي مرفوض (الخط مضمّن في الصفحة)، وبحد أقصى رسمتين في نفس الوقت.
@Injectable()
export class ReportPdfRenderer {
  private running = 0

  /** الخط العربي المضمّن في الصفحة (base64) */
  async font(): Promise<string> {
    return (await readFile(resolve(__dirname, '../../assets/fonts/NotoNaskhArabic.ttf'))).toString('base64')
  }

  async pdf(html: string): Promise<Uint8Array> {
    if (this.running >= 2) throw new ServiceUnavailableException('يجري تجهيز مستندات أخرى؛ أعد المحاولة بعد لحظات')
    this.running++
    try {
      const browser = await puppeteer.launch({ headless: true, ...(process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {}) })
      try {
        const page = await browser.newPage()
        await page.setJavaScriptEnabled(false)
        await page.setRequestInterception(true)
        page.on('request', request => request.url().startsWith('data:') ? void request.continue() : void request.abort())
        await page.setContent(html, { waitUntil: 'load', timeout: 30000 })
        return await page.pdf({ format: 'A4', landscape: true, printBackground: true, timeout: 30000, margin: { top: '12mm', bottom: '12mm', right: '10mm', left: '10mm' } })
      } finally { await browser.close() }
    } finally { this.running-- }
  }
}
