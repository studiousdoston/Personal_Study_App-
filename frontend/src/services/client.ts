import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const baseURL = import.meta.env.VITE_API_URL;

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;
let onAuthFailure: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setAuthFailureHandler(handler: (() => void) | null) {
  onAuthFailure = handler;
}

export const api = axios.create({ baseURL, withCredentials: true });

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  config.headers["X-Timezone"] = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return config;
});

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ access_token: string }>(`${baseURL}/auth/refresh`, null, { withCredentials: true })
      .then((res) => {
        accessToken = res.data.access_token;
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const SKIP_REFRESH = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const shouldSkip = SKIP_REFRESH.some((path) => original?.url?.startsWith(path));

    if (error.response?.status != 401 || !original || original._retry || shouldSkip) {
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      await refreshAccessToken();
      return api(original);
    } catch (refreshError) {
      accessToken = null;
      onAuthFailure?.();
      return Promise.reject(refreshError);
    }
  },
);
