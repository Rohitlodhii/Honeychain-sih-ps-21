import { API_URL, apiClient, downloadBlob } from './client'
import type { Batch, BatchCreateResponse, BatchEventResponse, BatchEventType } from './types'
import type { BatchCreatePayload } from '../farmer-forms'

export const batches = {
  list: () => apiClient.get<Batch[]>('/api/batches'),
  create: (data: BatchCreatePayload) => apiClient.post<BatchCreateResponse>('/api/batches', data),
  addEvent: (batchId: string, data: { event_type: BatchEventType | string; payload: Record<string, unknown> }) =>
    apiClient.post<BatchEventResponse>(`/api/batches/${batchId}/events`, data),
  /** Public QR image URL (no auth required). */
  qrUrl: (batchId: string) => `${API_URL}/api/batches/${batchId}/qr`,
  eventsUrl: (batchId: string) => `/api/batches/${batchId}/events`,
  /** Fetch compliance PDF blob. */
  complianceReportBlob: async (batchId: string) => {
    const res = await apiClient.get(`/api/batches/${batchId}/compliance-report`, {
      responseType: 'blob',
    })
    return res
  },
  /** Fetch + trigger browser download, using backend filename when available. */
  downloadComplianceReport: async (batchId: string) => {
    const res = await apiClient.get(`/api/batches/${batchId}/compliance-report`, {
      responseType: 'blob',
    })
    const disposition = (res.headers?.['content-disposition'] as string | undefined) ?? undefined
    const blob = res.data as Blob
    const pdf = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' })
    return downloadBlob(pdf, `beelink-${batchId}-compliance.pdf`, disposition)
  },
}
