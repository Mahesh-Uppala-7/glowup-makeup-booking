import { config } from '../config';
import { storage } from '../utils/storage';
import { AuthTokens } from '../types';

const ACCESS_KEY = 'glowup.access';
const REFRESH_KEY = 'glowup.refresh';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let onAuthFailure: (() => void) | null = null;

export const tokenStore = {
  async load(): Promise<void> {
    accessToken = await storage.getItem(ACCESS_KEY);
    refreshToken = await storage.getItem(REFRESH_KEY);
  },
  async set(tokens: AuthTokens): Promise<void> {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    await storage.setItem(ACCESS_KEY, tokens.accessToken);
    await storage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  async clear(): Promise<void> {
    accessToken = null;
    refreshToken = null;
    await storage.removeItem(ACCESS_KEY);
    await storage.removeItem(REFRESH_KEY);
  },
  get access(): string | null {
    return accessToken;
  },
  hasSession(): boolean {
    return Boolean(accessToken && refreshToken);
  },
  setAuthFailureHandler(fn: () => void): void {
    onAuthFailure = fn;
  },
};

export class ApiRequestError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  _retry?: boolean;
}

async function refreshSession(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${config.apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) return false;
    await tokenStore.set(json.data as AuthTokens);
    return true;
  } catch {
    return false;
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, _retry = false } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Attempt a single transparent token refresh on 401.
  if (res.status === 401 && auth && !_retry) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return request<T>(path, { ...options, _retry: true });
    }
    await tokenStore.clear();
    onAuthFailure?.();
  }

  let json: { success: boolean; data?: T; error?: { message: string; details?: unknown } };
  try {
    json = await res.json();
  } catch {
    throw new ApiRequestError(res.status, 'Unexpected server response');
  }

  if (!res.ok || !json.success) {
    throw new ApiRequestError(
      res.status,
      json.error?.message ?? 'Request failed',
      json.error?.details,
    );
  }

  return json.data as T;
}

/* Multipart upload (e.g. portfolio images). Retries once after a token refresh. */
export async function uploadRequest<T>(
  path: string,
  formData: FormData,
  _retry = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  // Content-Type is intentionally omitted so fetch sets the multipart boundary.

  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (res.status === 401 && !_retry) {
    const refreshed = await refreshSession();
    if (refreshed) return uploadRequest<T>(path, formData, true);
    await tokenStore.clear();
    onAuthFailure?.();
  }

  let json: { success: boolean; data?: T; error?: { message: string } };
  try {
    json = await res.json();
  } catch {
    throw new ApiRequestError(res.status, 'Unexpected server response');
  }
  if (!res.ok || !json.success) {
    throw new ApiRequestError(res.status, json.error?.message ?? 'Upload failed');
  }
  return json.data as T;
}
