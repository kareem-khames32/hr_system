/** @type {import('next').NextConfig} */
// B1.3: رؤوس حماية المتصفح لصفحات الواجهة (نفس روح رؤوس الـAPI): مايتفتحش جوه iframe، ومايخمّنش نوع الملف،
// والرابط مابيتبعتش كامل لمواقع تانية، ومن غير كاميرا ولا مايك ولا موقع. مفيش CSP كامل عشان سكريبتات Next الداخلية.
const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
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
