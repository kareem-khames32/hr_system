import type { INestApplication } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

// أمان الدخول (خطة التنفيذ B1.3): رؤوس حماية المتصفح لكل ردود الـAPI — من غير مكتبة جديدة.
// - nosniff: المتصفح مايخمّنش نوع الملف (ملف مرفوع مايتفتحش كسكريبت).
// - منع الفتح جوه iframe (X-Frame-Options + frame-ancestors) — الواجهة مابتعرضش أي حاجة من الـAPI جوه iframe.
// - Referrer-Policy: روابط الـAPI مابتتبعتش لمواقع تانية. وCache-Control: no-store افتراضيًا (بيانات موظفين) — المسار يقدر يغيّره.
// - مفيش HSTS: السيرفر الحالي HTTP على الشبكة الداخلية. مفيش CSP كامل: الردود JSON وملفات (PDF وصور) ومش صفحات.
export const API_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

/**
 * بيتنده من main.ts (والاختبارات بتنده نفسه): بيشيل X-Powered-By، وبيحط الرؤوس، وبيضبط «trust proxy» لو فيه proxy قدام النظام
 * (TRUST_PROXY = عدد الـproxies أو true أو عنوان) عشان الـIP في سجل الدخول يبقى الحقيقي بدل عنوان الـproxy.
 */
export function applySecurityHeaders(app: INestApplication, env: Record<string, string | undefined> = process.env) {
  const express = app.getHttpAdapter().getInstance()
  express.disable('x-powered-by')
  const trustProxy = String(env.TRUST_PROXY ?? '').trim()
  if (trustProxy) express.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy === 'true' ? true : trustProxy)
  app.use((_req: Request, res: Response, next: NextFunction) => {
    for (const [name, value] of Object.entries(API_SECURITY_HEADERS)) res.setHeader(name, value)
    res.setHeader('Cache-Control', 'no-store')
    next()
  })
}
