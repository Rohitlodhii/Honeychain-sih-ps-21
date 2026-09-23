"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import type { User } from "@/lib/api/types"
import { normalizeError, clearToken } from "@/lib/api/client"

interface AuthContextValue {
  user: User | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  logout: () => void
}

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  loading: true,
  error: null,
  refresh: async () => {},
  logout: () => {},
})

export function useAuth() {
  return React.useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.auth.me()
      setUser(res.data)
    } catch (err) {
      const e = normalizeError(err)
      setError(e.detail)
      setUser(null)
      if (e.status === 401) {
        clearToken()
        router.replace("/login")
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  React.useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) {
      setLoading(false)
      router.replace("/login")
      return
    }
    load()
  }, [load, router])

  const logout = React.useCallback(() => {
    clearToken()
    setUser(null)
    router.replace("/login")
  }, [router])

  const value = React.useMemo(
    () => ({ user, loading, error, refresh: load, logout }),
    [user, loading, error, load, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
