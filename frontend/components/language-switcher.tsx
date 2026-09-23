'use client'

import { Globe } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { LOCALES, type Locale } from '@/lib/i18n/dictionaries'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

/** Compact language picker (English / हिन्दी / मराठी). Persists to localStorage. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n()

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
        <SelectTrigger
          className="h-8 w-auto min-w-28 gap-1 border-muted text-xs"
          aria-label={t.language.label}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LOCALES.map((l) => (
            <SelectItem key={l.code} value={l.code}>
              {l.native}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
