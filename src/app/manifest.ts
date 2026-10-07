import type { MetadataRoute } from 'next'
import { PRODUCT_NAME } from '@/lib/product'

// B2.12 (ب): ملف تعريف التطبيق (‎/manifest.webmanifest — Next بيخدمه وبيربطه في رأس كل صفحة): بيخلّي المتصفح يعرض «تثبيت» فيتفتح
// النظام من أيقونة على شاشة الموبايل بملء الشاشة. التثبيت محتاج HTTPS (أو localhost) — docs/ops/deploy.md.
// الأيقونات ملفات ثابتة مرسومة من نفس أشكال icon.svg؛ و«maskable» خلفيتها ملء المربع والحروف جوه المنطقة الآمنة (أندرويد بيقصّها).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PRODUCT_NAME,
    short_name: PRODUCT_NAME,
    description: 'نظام متكامل لإدارة الموارد البشرية',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    dir: 'rtl',
    lang: 'ar',
    background_color: '#f9fafb',
    theme_color: '#1d4ed8',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
