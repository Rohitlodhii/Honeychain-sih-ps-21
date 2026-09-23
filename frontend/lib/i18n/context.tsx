'use client'

import * as React from 'react'
import {
  DEFAULT_LOCALE,
  LOCALE_TAGS,
  STORAGE_KEY,
  dictionaries,
  isLocale,
  type Dict,
  type Locale,
} from './dictionaries'

interface I18nValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: Dict
  /** BCP-47 tag for date/number formatting, e.g. 'hi-IN'. */
  tag: string
}

const I18nContext = React.createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(DEFAULT_LOCALE)

  // Hydrate from localStorage on mount (avoids SSR mismatch).
  // Falls back to the legacy 'honeychain-locale' key after the Beelink rebrand.
  React.useEffect(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_KEY) ??
        localStorage.getItem('honeychain-locale')
      if (saved && isLocale(saved)) setLocaleState(saved)
    } catch {
      // storage unavailable — keep default
    }
  }, [])

  // Keep <html lang> in sync for accessibility / SEO.
  React.useEffect(() => {
    try {
      document.documentElement.lang = locale
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // ignore
    }
  }, [locale])

  const value = React.useMemo<I18nValue>(
    () => ({
      locale,
      setLocale: setLocaleState,
      t: dictionaries[locale],
      tag: LOCALE_TAGS[locale],
    }),
    [locale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = React.useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>')
  return ctx
}
