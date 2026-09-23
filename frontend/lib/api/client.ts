import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios'
import type {
  BatchCreatePayload,
  HiveCreatePayload,
  SensorReadingPayload,
} from '../farmer-forms'

// Same-origin reverse proxy -> backend FastAPI (server-side only).
// Browser only talks to `/api/backend`, avoiding mixed-content / CORS issues.
export const API_URL = '/api/backend'

export class ApiError extends Error {
  status: number
  detail: string
  constructor(status: number, detail: string) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export function normalizeError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<any>
    const status = ax.response?.status ?? 0
    const data = ax.response?.data
    let detail = ax.message || 'Request failed'
    if (data) {
      if (typeof data.detail === 'string') detail = data.detail
      else if (Array.isArray(data.detail))
        detail = data.detail
          .map((d: any) => (typeof d === 'string' ? d : d?.msg || JSON.stringify(d)))
          .join('; ')
      else if (typeof data.message === 'string') detail = data.message
      else if (typeof data === 'string') detail = data
    }
    if (status === 0 && !ax.response) detail = 'Unable to reach the server. Check your connection and try again.'
    return new ApiError(status, detail)
  }
  if (err instanceof Error) return new ApiError(0, err.message)
  return new ApiError(0, 'An unexpected error occurred')
}

function handleGlobal401(status: number) {
  if (typeof window !== 'undefined' && status === 401) {
    const path = window.location.pathname || ''
    // Don't redirect loops on login/register/verify pages
    if (!path.startsWith('/login') && !path.startsWith('/register') && !path.startsWith('/verify')) {
      try {
        localStorage.removeItem('token')
      } catch {
        /* ignore */
      }
      window.location.href = '/login'
    }
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
})

apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res: AxiosResponse) => res,
  (err: AxiosError) => {
    const status = err.response?.status
    if (status) handleGlobal401(status)
    return Promise.reject(err)
  }
)

// Helpers
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem('token')
  } catch {
    return null
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem('token', token)
  } catch {
    /* ignore */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem('token')
  } catch {
    /* ignore */
  }
}

/** Download a blob response using backend filename when available. */
export function downloadBlob(blob: Blob, fallbackFilename: string, contentDisposition?: string) {
  let filename = fallbackFilename
  if (contentDisposition) {
    const match = /filename\*?=(?:UTF-8'')?"?([^";\n]+)"?/i.exec(contentDisposition)
    if (match?.[1]) {
      try {
        filename = decodeURIComponent(match[1])
      } catch {
        filename = match[1]
      }
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return filename
}

export type { BatchCreatePayload, HiveCreatePayload, SensorReadingPayload }
