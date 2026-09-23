import { apiClient } from './client'
import type { Hive, HiveHealthResponse, SensorReading } from './types'
import type { HiveCreatePayload, SensorReadingPayload } from '../farmer-forms'

export const hives = {
  list: () => apiClient.get<Hive[]>('/api/hives'),
  create: (data: HiveCreatePayload) => apiClient.post<Hive>('/api/hives', data),
  readings: (hiveId: string) => apiClient.get<SensorReading[]>(`/api/hives/${hiveId}/readings`),
  health: (hiveId: string) => apiClient.get<HiveHealthResponse>(`/api/hives/${hiveId}/health`),
  createReading: (hiveId: string, data: SensorReadingPayload & { recorded_at?: string }) =>
    apiClient.post<SensorReading>(`/api/hives/${hiveId}/readings`, data),
}
