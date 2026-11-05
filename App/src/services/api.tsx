// @ts-nocheck
import axios from 'axios';
import { getToken, clearToken } from '../utils/tokenStorage';

/**
 * Backend base URL.
 *
 * - Android emulator → host machine: 10.0.2.2
 * - Physical device: use your PC's LAN IP (e.g. http://192.168.1.10:5000/api)
 * - iOS simulator → host machine: localhost
 *
 * Backend must be running:  cd backend && npm start  (default port 5000)
 */
export const API_BASE_URL = 'http://10.0.2.2:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let onUnauthorized = null;

/** Registered by AuthContext to clear the session on 401/403. */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

api.interceptors.request.use(async config => {
  try {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Storage failures fall through — request goes without a token.
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      const isAuthRoute =
        error.config?.url?.includes('/auth/login') ||
        error.config?.url?.includes('/auth/logout');
      if (!isAuthRoute && onUnauthorized) {
        try {
          await clearToken();
        } catch {
          // Ignore storage cleanup failures.
        }
        onUnauthorized();
      }
    }
    return Promise.reject(error);
  },
);

/**
 * Extracts the API error message from the standard envelope.
 */
export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.message || error?.message || fallback;
}

export default api;
