/** @type {import('next').NextConfig} */
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
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://localhost:8000; font-src 'self'; frame-src 'none'; base-uri 'self'; form-action 'self';",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig