import { API_BASE_URL } from '../constants/api';
import { getToken } from './token-storage';
import { ApiError, type ApiErrorDetail } from './api-error';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let parsed: { code?: string; message?: string; details?: ApiErrorDetail[] | null } = {};
    try {
      parsed = await response.json();
    } catch {
      /* 본문 없음 */
    }
    throw new ApiError(
      response.status,
      parsed.code ?? 'UNKNOWN_ERROR',
      parsed.message ?? `요청이 실패했습니다 (status: ${response.status})`,
      parsed.details ?? null,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
