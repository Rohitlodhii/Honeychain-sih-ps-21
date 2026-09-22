/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production'

// Next.js dev mode (react-refresh / webpack HMR) evaluates strings as JS,
// so 'unsafe-eval' is required in development. Production does not need it.
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

const csp = [
  "default-src 'self'",
  scriptSrc,
  // Allow Google Fonts stylesheets (fallback) + explicit style-src-elem
  // so 'style-src' is not relied on as an implicit fallback.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  // http: (not just https:) to match NEXT_PUBLIC_API_URL=http://localhost:8000,
  // plus ws:/http: wildcards for Next.js dev HMR.
  "connect-src 'self' http://localhost:8000 https://localhost:8000 http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*",
  // next/font/google self-hosts woff2 at build time, but allow Google's
  // font CDN + data: so no font request is ever blocked.
  "font-src 'self' https://fonts.gstatic.com data:",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ') + ';'

const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/(.*)',
        headers: [
          // Prevent XSS attacks by setting Content-Type to text/html; charset=utf-8
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Enable Cross-Origin Policy
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          // Content Security Policy - restrict sources
          // (see `csp` above: allows Google Fonts + 'unsafe-eval' in dev for react-refresh)
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig