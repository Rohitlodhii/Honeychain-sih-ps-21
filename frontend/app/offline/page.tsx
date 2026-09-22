import Link from 'next/link'

export const metadata = {
  title: 'Offline — HoneyChain',
  description: 'You are offline. HoneyChain will sync when connectivity returns.',
}

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-espresso via-surface to-espresso flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="text-5xl mb-4" aria-hidden>
          🍯
        </div>
        <h1 className="text-3xl font-serif font-bold text-honey mb-3">You&apos;re offline</h1>
        <p className="text-cream/80 mb-6">
          HoneyChain works in low-connectivity areas. Your cached pages are available, and
          new harvests or readings will sync when you&apos;re back online.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link href="/" className="btn-primary">
            Try Home Again
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            Open Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
