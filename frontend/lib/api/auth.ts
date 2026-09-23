import { apiClient } from './client'
import type { TokenResponse, User } from './types'

export const auth = {
  register: (data: {
    name: string
    phone: string
    password: string
    role: 'beekeeper' | 'cooperative_admin'
    cluster?: string
    email?: string
    admin_invite_code?: string
  }) => apiClient.post<User>('/api/auth/register', data),
  login: (phone: string, password: string) =>
    apiClient.post<TokenResponse>('/api/auth/login', { phone, password }),
  me: () => apiClient.get<User>('/api/auth/me'),
}
