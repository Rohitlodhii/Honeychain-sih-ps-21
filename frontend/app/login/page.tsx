'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/api'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()

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
        setNotice('Account created! Sign in with your phone number and password.')
      }
    } catch {
      // ignore
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authAPI.login(phone, password)
      localStorage.setItem('token', response.data.access_token)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-espresso via-surface to-espresso flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-honey rounded transform rotate-45"></div>
            <span className="text-3xl font-serif font-bold text-honey">HoneyChain</span>
          </Link>
          <h1 className="text-2xl font-serif font-bold text-cream">
            Welcome Back
          </h1>
        </div>

        {/* Card */}
        <div className="card mb-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Success notice (e.g. after registration) */}
            {notice && (
              <div role="status" className="p-3 bg-sage/20 border border-sage/50 text-sage rounded-lg text-sm">
                {notice}
              </div>
            )}

            {/* Error Message — React auto-escapes, so render as text (no manual escapeHtml) */}
            {error && (
              <div role="alert" className="p-3 bg-brick/20 border border-brick/50 text-brick rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-honey mb-2">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                className="input-field"
                placeholder="+91 XXXXX XXXXX"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-honey mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter a strong password"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Sign In'}
            </button>
          </form>

          {/* Link to Register */}
          <div className="mt-6 pt-6 border-t border-honey/20 text-center">
            <p className="text-cream/80 mb-3">
              Don&apos;t have an account?
            </p>
            <Link href="/register" className="btn-secondary w-full inline-block">
              Create Account
            </Link>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-cream/60 text-xs">
          HoneyChain is built for KVIC&apos;s Honey Mission. Your data is protected and shared only within the cooperative network.
        </p>
      </div>
    </div>
  )
}
