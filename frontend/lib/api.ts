import axios from 'axios'

// Same-origin reverse proxy -> EC2 FastAPI over http (server-side only).
// The browser only ever talks to `/api/backend`, so the http:// EC2 URL is
// never fetched from the page: no mixed-content block, no backend CORS issue.
const API_URL = '/api/backend'

// Create axios instance with default headers
const apiClient = axios.create({
  baseURL: API_URL,
})

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const authAPI = {
  register: (data: any) => apiClient.post('/api/auth/register', data),
  login: (phone: string, password: string) =>
    apiClient.post('/api/auth/login', { phone, password }),
  me: () => apiClient.get('/api/auth/me'),
}

export const hiveAPI = {
  create: (data: any) => apiClient.post('/api/hives', data),
  list: () => apiClient.get('/api/hives'),
  getReadings: (hiveId: string) => apiClient.get(`/api/hives/${hiveId}/readings`),
  getHealth: (hiveId: string) => apiClient.get(`/api/hives/${hiveId}/health`),
  createReading: (hiveId: string, data: any) => apiClient.post(`/api/hives/${hiveId}/readings`, data),
  simulate: (hiveId: string, anomaly?: boolean) =>
    apiClient.post(`/api/hives/${hiveId}/simulate?anomaly=${anomaly || false}`),
}

export const batchAPI = {
  create: (data: any) => apiClient.post('/api/batches', data),
  list: () => apiClient.get('/api/batches'),
  getQR: (batchId: string) => `${API_URL}/api/batches/${batchId}/qr`,
  complianceReport: (batchId: string) => apiClient.get(`/api/batches/${batchId}/compliance-report`, { responseType: 'blob' }),
  addEvent: (batchId: string, data: any) => apiClient.post(`/api/batches/${batchId}/events`, data),
}

export const verifyAPI = {
  batch: (batchId: string) => apiClient.get(`/api/verify/${batchId}`),
}

export const adminAPI = {
  overview: () => apiClient.get('/api/admin/overview'),
}

export default apiClient
