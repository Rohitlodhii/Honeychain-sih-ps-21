'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { authAPI } from '@/lib/api'
import Link from 'next/link'
import { motion } from 'motion/react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n/context'
import { LanguageSwitcher } from '@/components/language-switcher'

const SIMPLE_INPUT_CLASS =
  'shadow-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-input active:outline-none'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useI18n()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    // Check if already logged in
    try {
      const token = localStorage.getItem('token')
      if (token) {
        router.replace('/dashboard')
        return
      }
    } catch {
      // localStorage unavailable — stay on login
    }
    // Show "account created" notice after register -> /login?registered=1.
    // (Read via window.location to avoid a Suspense boundary for useSearchParams.)
    try {
      if (typeof window !== 'undefined' && window.location.search.includes('registered=1')) {
        const message = t.login.accountCreated
        setNotice(message)
        toast.success(message)
      }
    } catch {
      // ignore
    }
  }, [router, t])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // NOTE: login API accepts only { phone, password } — no entity/role
    // field (backend/app/schemas.py UserLoginRequest). The role comes back
    // on the user object, so we route farmers -> /dashboard and
    // cooperatives -> /admin after login instead of asking upfront.
    try {
      const response = await authAPI.login(phone, password)
      localStorage.setItem('token', response.data.access_token)
      const role = response.data?.user?.role
      toast.success(t.login.signedInOk)
      router.push(role === 'cooperative_admin' ? '/admin' : '/dashboard')
    } catch (err: any) {
      const message = err.response?.data?.detail || t.login.loginFailed
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 font-sans">
      <Card className="w-full max-w-4xl overflow-hidden p-0 grid grid-cols-1 md:grid-cols-2">
        {/* Left — form side */}
        <div className="flex min-h-[480px] flex-col p-6 sm:p-8 md:min-h-[560px]">
          <div className="flex items-start justify-end">
            <LanguageSwitcher />
          </div>
          {/* Heading */}
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t.login.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.login.subtitle}
          </p>

          {/* Fields — just below the subtitle, empty space left in the middle */}
          <div className="flex flex-1 flex-col justify-start gap-4 mt-4 pb-6">
            {notice && (
              <div
                role="status"
                className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm"
              >
                {notice}
              </div>
            )}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <form
                id="login-form"
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <div className="space-y-4">
                  <Label htmlFor="login-phone">{t.login.mobile}</Label>
                  <Input
                    id="login-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder={t.login.mobilePh}
                    value={phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPhone(e.target.value)
                    }
                    required
                    className={SIMPLE_INPUT_CLASS}
                  />
                </div>
                <div className="space-y-4">
                  <Label htmlFor="login-password">{t.login.password}</Label>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder={t.login.passwordPh}
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPassword(e.target.value)
                    }
                    required
                    className={SIMPLE_INPUT_CLASS}
                  />
                </div>
              </form>
            </motion.div>
          </div>

          {/* Primary action — above the separator */}
          <div className="pb-4">
            <Button
              type="submit"
              form="login-form"
              className="w-full"
              disabled={loading}
            >
              {loading ? t.login.signingIn : t.login.signIn}
            </Button>
          </div>

          <Separator className="my-4" />

          <p className="text-center text-sm text-muted-foreground">
            {t.login.noAccount}{' '}
            <Link
              href="/register"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t.login.createAccount}
            </Link>
          </p>
        </div>

        {/* Right — image side (hidden on small screens, form only) */}
        <div className="relative hidden min-h-[560px] md:block">
          <Image
            src="/images/login.png"
            alt={t.login.imgAlt}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 0vw, 50vw"
          />
        </div>
      </Card>
    </div>
  )
}
