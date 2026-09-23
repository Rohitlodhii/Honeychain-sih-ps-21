import { apiClient } from './client'
import type { VerifyBatchResponse } from './types'

export const verification = {
  batch: (batchId: string) => apiClient.get<VerifyBatchResponse>(`/api/verify/${batchId}`),
}
