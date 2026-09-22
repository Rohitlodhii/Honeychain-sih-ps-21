'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/api'
import Link from 'next/link'

type Role = 'beekeeper' | 'cooperative_admin'

export default function RegisterPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<Role>('beekeeper')
  const [cluster, setCluster] = useState('')
  const [email, setEmail] = useState('')
  const [adminInviteCode, setAdminInviteCode] = useState('')

  useEffect(() => {
    // Already logged in -> go to dashboard
    try {
      const token = localStorage.getItem('token')
      if (token) {
        router.replace('/dashboard')
      }
    } catch {
      // localStorage unavailable (private mode) — stay on register
    }
  }, [router])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()
    const trimmedCluster = cluster.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) {
      setError('Please enter your full name.')
      return
    }
    if (!trimmedPhone) {
      setError('Please enter your phone number.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (role === 'cooperative_admin' && !adminInviteCode.trim()) {
      setError('Admin invite code is required for cooperative admins.')
      return
    }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address (or leave it blank).')
      return
    }

    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        name: trimmedName,
        phone: trimmedPhone,
        password,
        role,
      }
      if (trimmedCluster) payload.cluster = trimmedCluster
      if (trimmedEmail) payload.email = trimmedEmail
      if (role === 'cooperative_admin') payload.admin_invite_code = adminInviteCode.trim()

      await authAPI.register(payload)

      // Register returns no token — log the user in immediately for a
      // smooth "Get Started" flow, fall back to /login on failure.
      try {
        const loginRes = await authAPI.login(trimmedPhone, password)
        localStorage.setItem('token', loginRes.data.access_token)
        router.push('/dashboard')
      } catch {
        router.push('/login?registered=1')
      }
    } catch (err: unknown) {
      // FastAPI returns { detail: string } on 400 (duplicate phone / bad invite)
      let message = 'Registration failed. Please try again.'
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const resp = (err as { response?: { data?: { detail?: unknown } } }).response
        const detail = resp?.data?.detail
        if (typeof detail === 'string' && detail) message = detail
        else if (Array.isArray(detail)) {
          // Pydantic validation errors: [{ loc, msg, ... }]
          const first = detail[0] as { msg?: string; loc?: (string | number)[] } | undefined
          if (first?.msg) {
            const field = first.loc ? String(first.loc[first.loc.length - 1]) : ''
            message = field ? `${field}: ${first.msg}` : first.msg
          }
        }
      } else if (err instanceof Error && !navigator.onLine) {
        message = 'You appear to be offline. Connect to the internet to create your account.'
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-espresso via-surface to-espresso flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-honey rounded transform rotate-45" aria-hidden />
            <span className="text-3xl font-serif font-bold text-honey">HoneyChain</span>
          </Link>
          <h1 className="text-2xl font-serif font-bold text-cream">Create your account</h1>
          <p className="text-cream/70 text-sm mt-2">
            Join as a beekeeper or a KVIC cooperative admin.
          </p>
        </div>

        {/* Card */}
        <div className="card mb-6">
          <form onSubmit={handleRegister} className="space-y-4" noValidate>
            {error && (
              <div role="alert" className="p-3 bg-brick/20 border border-brick/50 text-brick rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label htmlFor="register-name" className="block text-sm font-semibold text-honey mb-2">
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                className="input-field"
                placeholder="e.g. Ramesh Kumar"
                autoComplete="name"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="register-phone" className="block text-sm font-semibold text-honey mb-2">
                Phone Number
              </label>
              <input
                id="register-phone"
                type="tel"
                value={phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                className="input-field"
                placeholder="+91 XXXXX XXXXX"
                autoComplete="tel"
                required
              />
              <p className="text-xs text-cream/60 mt-1">You will use this phone number to sign in.</p>
            </div>

            {/* Role */}
            <div>
              <label htmlFor="register-role" className="block text-sm font-semibold text-honey mb-2">
                I am joining as
              </label>
              <select
                id="register-role"
                value={role}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setRole(e.target.value as Role)
                }
                className="input-field"
              >
                <option value="beekeeper">Beekeeper</option>
                <option value="cooperative_admin">Cooperative Admin (KVIC)</option>
              </select>
            </div>

            {/* Cluster */}
            <div>
              <label htmlFor="register-cluster" className="block text-sm font-semibold text-honey mb-2">
                Cluster / Village <span className="text-cream/50 font-normal">(optional)</span>
              </label>
              <input
                id="register-cluster"
                type="text"
                value={cluster}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCluster(e.target.value)}
                className="input-field"
                placeholder="e.g. Bharatpur Cluster"
                autoComplete="organization"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="register-email" className="block text-sm font-semibold text-honey mb-2">
                Email <span className="text-cream/50 font-normal">(optional)</span>
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            {/* Admin invite code (conditional) */}
            {role === 'cooperative_admin' && (
              <div>
                <label htmlFor="register-invite" className="block text-sm font-semibold text-honey mb-2">
                  Admin Invite Code
                </label>
                <input
                  id="register-invite"
                  type="text"
                  value={adminInviteCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAdminInviteCode(e.target.value)
                  }
                  className="input-field"
                  placeholder="Ask your KVIC coordinator"
                  autoComplete="off"
                  required={role === 'cooperative_admin'}
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label htmlFor="register-password" className="block text-sm font-semibold text-honey mb-2">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="register-confirm" className="block text-sm font-semibold text-honey mb-2">
                Confirm Password
              </label>
              <input
                id="register-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setConfirmPassword(e.target.value)
                }
                className="input-field"
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-honey/20 text-center">
            <p className="text-cream/80 mb-3">Already have an account?</p>
            <Link href="/login" className="btn-secondary w-full inline-block">
              Sign In
            </Link>
          </div>
        </div>

        <p className="text-center text-cream/60 text-xs">
          HoneyChain is built for KVIC&apos;s Honey Mission. Your data is protected and shared
          only within the cooperative network.
        </p>
      </div>
    </div>
  )
}
