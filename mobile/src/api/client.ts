import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Expo exposes EXPO_PUBLIC_* vars at build time.
// For a physical device, set this to your PC's LAN IP, e.g. http://192.168.1.5:8000
// Android emulator uses http://10.0.2.2:8000 instead of localhost.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

const TOKEN_KEY = 'honeychain_token';

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data: {
    name: string;
    phone: string;
    password: string;
    role: 'beekeeper' | 'cooperative_admin';
    cluster?: string;
    email?: string;
  }) => apiClient.post('/api/auth/register', data),
  login: (phone: string, password: string) =>
    apiClient.post('/api/auth/login', { phone, password }),
  me: () => apiClient.get('/api/auth/me'),
};

export const hiveAPI = {
  create: (data: { name: string; location: string; species?: string }) =>
    apiClient.post('/api/hives', data),
  list: () => apiClient.get('/api/hives'),
  getHealth: (hiveId: string) => apiClient.get(`/api/hives/${hiveId}/health`),
  createReading: (
    hiveId: string,
    data: {
      temperature_c: number;
      humidity_pct: number;
      weight_kg: number;
      sound_hz: number;
    },
  ) => apiClient.post(`/api/hives/${hiveId}/readings`, data),
};

export const batchAPI = {
  create: (data: {
    hive_id: string;
    honey_type: string;
    quantity_kg: number;
    apiary_location: string;
    moisture_pct: number;
  }) => apiClient.post('/api/batches', data),
  list: () => apiClient.get('/api/batches'),
  addEvent: (batchId: string, data: { event_type: string; [k: string]: unknown }) =>
    apiClient.post(`/api/batches/${batchId}/events`, data),
  getQR: (batchId: string) => `${API_URL}/api/batches/${batchId}/qr`,
};

export const verifyAPI = {
  batch: (batchId: string) => apiClient.get(`/api/verify/${batchId}`),
};

export const adminAPI = {
  overview: () => apiClient.get('/api/admin/overview'),
};

export default apiClient;
