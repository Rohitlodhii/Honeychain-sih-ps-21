/* HoneyChain service worker — app-shell + runtime caching.
 * - Navigations: network-first, fall back to cache, then /offline.
 * - Same-origin static GET (/_next/static, /icons, images): stale-while-revalidate.
 * - API (/api/...) and cross-origin: network-only, never cached (auth/ledger traffic).
 */

const VERSION = 'honeychain-v1'
const APP_SHELL = ['/', '/offline', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

function isApiRequest(url) {
  return url.pathname.startsWith('/api/')
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // network-only for CDN/fonts
  if (isApiRequest(url)) return // never cache backend proxy traffic

  // Navigation requests: try network, fall back to cache/offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(VERSION).then((cache) => cache.put(request, copy))
          return res
        })
        .catch(() =>
          caches.match(request).then((hit) => hit || caches.match('/offline')),
        ),
    )
    return
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((hit) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone()
            caches.open(VERSION).then((cache) => cache.put(request, copy))
          }
          return res
        })
        .catch(() => hit)
      return hit || network
    }),
  )
})
