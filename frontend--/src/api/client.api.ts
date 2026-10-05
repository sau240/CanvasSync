import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '../utils/token_storage';

// 1. Point default fallback directly to Render production backend with /api/v1
const rawBase = import.meta.env.VITE_API_BASE_URL || 'https://canvassync-l565.onrender.com/api/v1';

// 2. Ensure /api/v1 is appended exactly once regardless of how Vercel env is formatted
const API_BASE_URL = rawBase.endsWith('/api/v1')
  ? rawBase
  : `${rawBase.replace(/\/$/, '')}/api/v1`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      tokenStorage.clearTokens();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;