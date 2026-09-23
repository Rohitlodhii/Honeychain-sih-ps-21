'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n/context'
import { LanguageSwitcher } from '@/components/language-switcher'

export function OfflineContent() {
  const { t } = useI18n()

  return (
    <main className="min-h-screen bg-gradient-to-b from-espresso via-surface to-espresso flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-2">
          <LanguageSwitcher />
        </div>
        <div className="text-5xl mb-4" aria-hidden>
          🍯
        </div>
        <h1 className="text-3xl font-serif font-bold text-honey mb-3">{t.offline.title}</h1>
        <p className="text-cream/80 mb-6">{t.offline.desc}</p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link href="/" className="btn-primary">
            {t.offline.homeBtn}
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            {t.offline.dashBtn}
          </Link>
        </div>
      </div>
    </main>
  )
}
