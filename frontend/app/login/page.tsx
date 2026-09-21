'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authAPI } from '@/lib/api'
import Link from 'next/link'

// XSS Prevention: Escape HTML special characters
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') || 'login'

  const [isRegister, setIsRegister] = useState(mode === 'register')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('beekeeper')
  const [cluster, setCluster] = useState('')
  const [adminInviteCode, setAdminInviteCode] = useState('')

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('token')
    if (token) {
      router.push('/dashboard')
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await authAPI.register({
        name: name,
        phone: phone,
        password: password,
        role: role,
        cluster: cluster,
        admin_invite_code: adminInviteCode || undefined,
      })

      // Auto-login after registration
      const loginResponse = await authAPI.login(phone, password)
      localStorage.setItem('token', loginResponse.data.access_token)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Try again.')
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
            {isRegister ? 'Join HoneyChain' : 'Welcome Back'}
          </h1>
        </div>

        {/* Card */}
        <div className="card mb-6">
          <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-brick/20 border border-brick/50 text-brick rounded-lg text-sm">
                {escapeHtml(error)}
              </div>
            )}

            {/* Register Mode: Name */}
            {isRegister && (
              <div>
                <label className="block text-sm font-semibold text-honey mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  className="input-field"
                  placeholder="Your full name"
                  required
                />
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

            {/* Register Mode: Role */}
            {isRegister && (
              <div>
                <label className="block text-sm font-semibold text-honey mb-2">I am a...</label>
                <select
                  value={role}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRole(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="beekeeper">Beekeeper</option>
                  <option value="cooperative_admin">Cooperative Admin (KVIC)</option>
                </select>
              </div>
            )}

            {/* Register Mode: Cluster */}
            {isRegister && role === 'beekeeper' && (
              <div>
                <label className="block text-sm font-semibold text-honey mb-2">Cluster / District</label>
                <input
                  type="text"
                  value={cluster}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCluster(e.target.value)}
                  className="input-field"
                  placeholder="e.g., Vidarbha, Uttarakhand"
                />
              </div>
            )}

            {isRegister && role === 'cooperative_admin' && (
              <div>
                <label className="block text-sm font-semibold text-honey mb-2">KVIC Admin Invite Code</label>
                <input
                  type="password"
                  value={adminInviteCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdminInviteCode(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Mode Toggle */}
          <div className="mt-6 pt-6 border-t border-honey/20 text-center">
            <p className="text-cream/80 mb-3">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}
            </p>
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="btn-secondary w-full"
            >
              {isRegister ? 'Sign In' : 'Create Account'}
            </button>
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
