'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { authAPI } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n/context'

const SIMPLE_INPUT_CLASS =
  'shadow-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-input active:outline-none'

const TOTAL_STEPS = 5

type EntityRole = 'beekeeper' | 'cooperative_admin'

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useI18n()

  const ENTITY_OPTIONS: { value: EntityRole; label: string; hint: string }[] = [
    { value: 'beekeeper', label: t.register.beekeeper, hint: t.register.beekeeperHint },
    { value: 'cooperative_admin', label: t.register.cooperative, hint: t.register.cooperativeHint },
  ]

  const STEP_SUBTITLES = [
    t.register.s1,
    t.register.s2,
    t.register.s3,
    t.register.s4,
    t.register.s5,
  ]

  const [step, setStep] = useState(1)
  const [entity, setEntity] = useState<EntityRole | ''>('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [adminInviteCode, setAdminInviteCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      if (token) router.replace('/dashboard')
    } catch {
      // stay on register when storage is unavailable
    }
  }, [router])

  const goTo = (next: number) => {
    setError('')
    setStep(next)
  }

  const fail = (message: string) => {
    setError(message)
    toast.error(message)
  }

  const handleEntityContinue = (e: React.FormEvent) => {
    e.preventDefault()
    if (!entity) {
      fail(t.register.errEntity)
      return
    }
    goTo(2)
  }

  const handlePhoneContinue = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = phone.trim()
    if (trimmed.replace(/\D/g, '').length < 10) {
      fail(t.register.errPhone)
      return
    }
    goTo(3)
  }

  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length < 4) {
      fail(t.register.errOtp)
      return
    }
    goTo(4)
  }

  const handleProfileContinue = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      fail(t.register.errName)
      return
    }
    const trimmedEmail = email.trim()
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      fail(t.register.errEmail)
      return
    }
    if (entity === 'cooperative_admin' && !adminInviteCode.trim()) {
      fail(t.register.errInvite)
      return
    }
    goTo(5)
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!entity) {
      fail(t.register.errEntityFirst)
      goTo(1)
      return
    }
    if (password.length < 6) {
      fail(t.register.errPassLen)
      return
    }
    if (password !== confirmPassword) {
      fail(t.register.errPassMatch)
      return
    }

    setSubmitting(true)
    try {
      const payload: {
        name: string
        phone: string
        password: string
        role: 'beekeeper' | 'cooperative_admin'
        email?: string
        admin_invite_code?: string
      } = {
        name: name.trim(),
        phone: phone.trim(),
        password,
        role: entity,
      }
      if (email.trim()) payload.email = email.trim()
      if (entity === 'cooperative_admin')
        payload.admin_invite_code = adminInviteCode.trim()

      await authAPI.register(payload)

      toast.success(t.register.createdSigningIn)
      try {
        const loginRes = await authAPI.login(phone.trim(), password)
        localStorage.setItem('token', loginRes.data.access_token)
        const role = loginRes.data?.user?.role
        router.push(role === 'cooperative_admin' ? '/admin' : '/dashboard')
      } catch {
        router.push('/login?registered=1')
      }
    } catch (err: unknown) {
      let message = t.register.registerFailed
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const resp = (err as { response?: { data?: { detail?: unknown } } })
          .response
        const detail = resp?.data?.detail
        if (typeof detail === 'string' && detail) message = detail
        else if (Array.isArray(detail)) {
          const first = detail[0] as
            | { msg?: string; loc?: (string | number)[] }
            | undefined
          if (first?.msg) {
            const field = first.loc ? String(first.loc[first.loc.length - 1]) : ''
            message = field ? `${field}: ${first.msg}` : first.msg
          }
        }
      } else if (err instanceof Error && !navigator.onLine) {
        message = t.register.offlineErr
      }
      fail(message)
    } finally {
      setSubmitting(false)
    }
  }

  const progressDeg = (step / TOTAL_STEPS) * 360

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 font-sans">
      <Card className="w-full max-w-4xl overflow-hidden p-0 grid grid-cols-1 md:grid-cols-2">
        {/* Left — form side */}
        <div className="flex min-h-[480px] flex-col p-6 sm:p-8 md:min-h-[560px]">
          {/* Top row: branding + progress disc + counter */}
          <div className="flex items-start justify-between">
            <Link href="/" className="flex items-center gap-2" aria-label="Beelink home">
              <Image
                src="/logo.png"
                alt="Beelink logo"
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
                priority
              />
              <span className="text-xl font-semibold tracking-tight">Beelink</span>
            </Link>
            <div
              className="flex shrink-0 items-center gap-2"
              aria-label={`${t.register.stepAria} ${step} ${t.register.of} ${TOTAL_STEPS}`}
            >
              <span
                aria-hidden
                className="flex h-6 w-6 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(hsl(var(--primary)) ${progressDeg}deg, hsl(var(--muted)) ${progressDeg}deg)`,
                }}
              >
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-card" />
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {step} {t.register.of} {TOTAL_STEPS}
              </span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t.register.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {STEP_SUBTITLES[step - 1]}
          </p>

          {/* Fields — just below the subtitle, empty space left in the middle */}
          <div className="flex flex-1 flex-col justify-start gap-4 mt-4 pb-6">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                {step === 1 && (
                  <form
                    id="register-step-1"
                    onSubmit={handleEntityContinue}
                    className="space-y-4"
                  >
                    <div className="space-y-4">
                      <Label htmlFor="register-entity">{t.register.entity}</Label>
                      <Select
                        value={entity}
                        onValueChange={(value) => {
                          setError('')
                          setEntity(value as EntityRole)
                        }}
                      >
                        <SelectTrigger
                          id="register-entity"
                          className="shadow-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        >
                          <SelectValue placeholder={t.register.entityPh} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>{t.register.entity}</SelectLabel>
                            {ENTITY_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {entity && (
                        <p className="text-xs text-muted-foreground">
                          {
                            ENTITY_OPTIONS.find((o) => o.value === entity)
                              ?.hint
                          }
                        </p>
                      )}
                    </div>
                  </form>
                )}

                {step === 2 && (
                  <form
                    id="register-step-2"
                    onSubmit={handlePhoneContinue}
                    className="space-y-4"
                  >
                    <div className="space-y-4">
                      <Label htmlFor="register-phone">{t.register.mobile}</Label>
                      <Input
                        id="register-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder={t.register.mobilePh}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className={SIMPLE_INPUT_CLASS}
                      />
                    </div>
                  </form>
                )}

                {step === 3 && (
                  <form
                    id="register-step-3"
                    onSubmit={handleOtpVerify}
                    className="space-y-4"
                  >
                    <div className="space-y-4">
                      <Label>
                        {t.register.otpTo} {phone.trim() || t.register.otpFallback}
                      </Label>
                      <InputOTP
                        maxLength={4}
                        value={otp}
                        onChange={(value) => {
                          setError('')
                          setOtp(value)
                        }}
                      >
                        <InputOTPGroup className="gap-2">
                          {[0, 1, 2, 3].map((index) => (
                            <InputOTPSlot
                              key={index}
                              index={index}
                              className="h-8 w-8 rounded-md border text-sm shadow-none first:rounded-md last:rounded-md"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </form>
                )}

                {step === 4 && (
                  <form
                    id="register-step-4"
                    onSubmit={handleProfileContinue}
                    className="space-y-4"
                  >
                    <div className="space-y-4">
                      <Label htmlFor="register-name">{t.register.fullName}</Label>
                      <Input
                        id="register-name"
                        type="text"
                        autoComplete="name"
                        placeholder={t.register.fullNamePh}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className={SIMPLE_INPUT_CLASS}
                      />
                    </div>
                    <div className="space-y-4">
                      <Label htmlFor="register-email">
                        {t.register.email}{' '}
                        <span className="font-normal text-muted-foreground">
                          {t.register.optional}
                        </span>
                      </Label>
                      <Input
                        id="register-email"
                        type="email"
                        autoComplete="email"
                        placeholder={t.register.emailPh}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={SIMPLE_INPUT_CLASS}
                      />
                    </div>
                    {entity === 'cooperative_admin' && (
                      <div className="space-y-4">
                        <Label htmlFor="register-invite">
                          {t.register.invite}
                        </Label>
                        <Input
                          id="register-invite"
                          type="text"
                          autoComplete="off"
                          placeholder={t.register.invitePh}
                          value={adminInviteCode}
                          onChange={(e) =>
                            setAdminInviteCode(e.target.value)
                          }
                          required
                          className={SIMPLE_INPUT_CLASS}
                        />
                      </div>
                    )}
                  </form>
                )}

                {step === 5 && (
                  <form
                    id="register-step-5"
                    onSubmit={handleCreateAccount}
                    className="space-y-4"
                  >
                    <div className="space-y-4">
                      <Label htmlFor="register-password">{t.register.password}</Label>
                      <Input
                        id="register-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder={t.register.passwordPh}
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className={SIMPLE_INPUT_CLASS}
                      />
                    </div>
                    <div className="space-y-4">
                      <Label htmlFor="register-confirm">{t.register.confirm}</Label>
                      <Input
                        id="register-confirm"
                        type="password"
                        autoComplete="new-password"
                        placeholder={t.register.confirmPh}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className={SIMPLE_INPUT_CLASS}
                      />
                    </div>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Primary actions — above the separator */}
          <div className="pb-4">
            {step === 1 && (
              <Button
                type="submit"
                form="register-step-1"
                className="w-full"
              >
                {t.register.next}
              </Button>
            )}

            {step === 2 && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => goTo(1)}
                >
                  {t.register.back}
                </Button>
                <Button
                  type="submit"
                  form="register-step-2"
                  className="flex-1"
                >
                  {t.register.next}
                </Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <Button
                  type="submit"
                  form="register-step-3"
                  className="w-full"
                >
                  {t.register.next}
                </Button>
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => goTo(2)}
                  >
                    {t.register.back}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtp('')
                    }}
                    className="text-xs text-primary underline-offset-4 hover:underline"
                  >
                    {t.register.resendOtp}
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => goTo(3)}
                >
                  {t.register.back}
                </Button>
                <Button
                  type="submit"
                  form="register-step-4"
                  className="flex-1"
                >
                  {t.register.next}
                </Button>
              </div>
            )}

            {step === 5 && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => goTo(4)}
                  disabled={submitting}
                >
                  {t.register.back}
                </Button>
                <Button
                  type="submit"
                  form="register-step-5"
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? t.register.creating : t.register.createBtn}
                </Button>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          <p className="text-center text-sm text-muted-foreground">
            {t.register.haveAccount}{' '}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t.register.signInLink}
            </Link>
          </p>
        </div>

        {/* Right — image side (hidden on small screens, form only) */}
        <div className="relative hidden min-h-[560px] md:block">
          <Image
            src="/images/login.png"
            alt={t.register.imgAlt}
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
