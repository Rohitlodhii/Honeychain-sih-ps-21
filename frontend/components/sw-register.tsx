'use client'

import { useEffect } from 'react'

/**
 * Registers /sw.js once (production only — SW + dev HMR don't mix).
 * Silent failure is fine: the app works without a service worker.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      } catch {
        // Offline/PWA is progressive enhancement — ignore registration errors.
      }
    }
    // Defer so first paint isn't blocked.
    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
      return () => window.removeEventListener('load', register)
    }
  }, [])

  return null
}
