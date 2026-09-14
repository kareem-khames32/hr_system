/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow an isolated production build while the development server is running.
  distDir: process.env.NEXT_BUILD_DIR || '.next',
}

module.exports = nextConfig
