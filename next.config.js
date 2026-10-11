/** @type {import('next').NextConfig} */
// B1.3: رؤوس حماية المتصفح لصفحات الواجهة (نفس روح رؤوس الـAPI): مايتفتحش جوه iframe، ومايخمّنش نوع الملف،
// والرابط مابيتبعتش كامل لمواقع تانية، ومن غير كاميرا ولا مايك، والموقع لصفحات النظام نفسه بس. مفيش CSP كامل عشان سكريبتات Next الداخلية.
const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // الموقع مسموح لصفحات النظام نفسه بس (self): «بصمتي» (B5.6) محتاجاه، والسياسة بتتاخد من أول صفحة اتحمّلت فلازم تبقى على كل الصفحات —
  // كانت geolocation=() فكل متصفح كان بيرفض بصمة الموبايل من غير ما يسأل (ظهرت في أول تجربة للمالك، 12 أكتوبر 2026). جوه iframe أو لموقع تاني لسه ممنوع.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
]

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }]
  },
  // Allow an isolated production build while the development server is running.
  distDir: process.env.NEXT_BUILD_DIR || '.next',
}

module.exports = nextConfig
