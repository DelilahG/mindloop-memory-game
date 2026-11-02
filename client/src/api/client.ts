import type { PlayerProfile } from '@mindloop/shared';

export interface AuthResponse {
  accessToken: string;
  player: PlayerProfile;
}

export interface MeResponse {
  player: PlayerProfile;
}

export interface ApiError {
  error: string;
}

let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setToken(token: string): void {
  accessToken = token;
}

export function getToken(): string | null {
  return accessToken;
}

export function clearToken(): void {
  accessToken = null;
}

async function attemptRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return false;
      const data = (await res.json()) as AuthResponse;
      accessToken = data.accessToken;
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  retried = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !retried) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      return request<T>(method, url, body, true);
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error((data as ApiError).error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body),
  patch: <T>(url: string, body?: unknown) => request<T>('PATCH', url, body),
  delete: <T>(url: string) => request<T>('DELETE', url),
};
