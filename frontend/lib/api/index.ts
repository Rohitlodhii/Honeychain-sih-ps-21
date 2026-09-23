import { apiClient, API_URL, ApiError, normalizeError, getToken, setToken, clearToken, downloadBlob } from './client'
import { auth } from './auth'
import { hives } from './hives'
import { batches } from './batches'
import { verification } from './verification'

export const api = {
  auth,
  hives,
  batches,
  verification,
  admin: {
    overview: () => apiClient.get('/api/admin/overview'),
  },
}

// Backward-compatible named exports (existing code imports these from '@/lib/api')
export const authAPI = {
  register: auth.register,
  login: auth.login,
  me: auth.me,
}

export const hiveAPI = {
  create: hives.create,
  list: hives.list,
  getReadings: hives.readings,
  getHealth: hives.health,
  createReading: hives.createReading,
  // Dev-only simulate endpoint intentionally NOT exposed in production dashboard.
}

export const batchAPI = {
  create: batches.create,
  list: batches.list,
  getQR: batches.qrUrl,
  complianceReport: batches.complianceReportBlob,
  downloadComplianceReport: batches.downloadComplianceReport,
  addEvent: batches.addEvent,
}

export const verifyAPI = {
  batch: verification.batch,
}

export const adminAPI = {
  overview: () => apiClient.get('/api/admin/overview'),
}

export { apiClient, API_URL, ApiError, normalizeError, getToken, setToken, clearToken, downloadBlob }
export default apiClient
