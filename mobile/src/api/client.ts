import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

function normalizeUrl(url: string) {
  return url.replace(/\/+$/, '');
}

// Deployed backend. Local dev can override with EXPO_PUBLIC_API_URL in
// .env.local (see .env.example).
export const DEPLOYED_API_URL = 'http://3.109.3.187:8001';

function getDefaultApiUrl() {
  const extraApiUrl = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  if (extraApiUrl && normalizeUrl(extraApiUrl) !== 'http://localhost:8000') {
    return normalizeUrl(extraApiUrl);
  }

  return DEPLOYED_API_URL;
}

// Priority: EXPO_PUBLIC_API_URL (.env.local) > app.json extra.apiUrl > deployed default.
export const API_URL = normalizeUrl(
  process.env.EXPO_PUBLIC_API_URL || getDefaultApiUrl(),
);

// This is the public, unauthenticated page encoded into each QR code. It is
// deliberately separate from API_URL because mobile talks to the API server,
// while consumers must receive a browser-safe verification link.
export const PUBLIC_VERIFY_URL = normalizeUrl(
  process.env.EXPO_PUBLIC_VERIFY_URL || 'https://beelink21.vercel.app',
);

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
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

let unauthorizedHandler: (() => void) | undefined;
export function setUnauthorizedHandler(handler?: () => void) {
  unauthorizedHandler = handler;
}

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await setToken(null);
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);

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
  create: (data: { name: string; location: string; species: string; latitude?: number; longitude?: number }) =>
    apiClient.post('/api/hives', data),
  list: () => apiClient.get('/api/hives'),
  readings: (hiveId: string) => apiClient.get(`/api/hives/${hiveId}/readings`),
  getHealth: (hiveId: string) => apiClient.get(`/api/hives/${hiveId}/health`),
  createReading: (
    hiveId: string,
    data: {
      temperature_c: number;
      humidity_pct: number;
      weight_kg: number;
      sound_hz?: number;
      recorded_at?: string;
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
  verifyUrl: (batchId: string) => `${PUBLIC_VERIFY_URL}/verify/${batchId}`,
  complianceReport: (batchId: string) =>
    apiClient.get(`/api/batches/${batchId}/compliance-report`, { responseType: 'arraybuffer' }),
};

export const verifyAPI = {
  batch: (batchId: string) => apiClient.get(`/api/verify/${batchId}`),
};

export const adminAPI = {
  overview: () => apiClient.get('/api/admin/overview'),
};

export default apiClient;
