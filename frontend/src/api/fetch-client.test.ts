import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { apiFetch } from './fetch-client';
import { ApiError } from './api-error';
import { setToken } from './token-storage';

function mockFetchResponse(init: {
  ok: boolean;
  status: number;
  json?: () => Promise<unknown>;
}) {
  return {
    ok: init.ok,
    status: init.status,
    json: init.json ?? (async () => ({})),
  } as Response;
}

describe('apiFetch', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('토큰이 있으면 Authorization 헤더에 포함한다', async () => {
    setToken('mock-token');
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ ok: true, status: 200, json: async () => ({ status: 'ok' }) }),
    );

    await apiFetch('/health');

    const [, requestInit] = vi.mocked(fetch).mock.calls[0];
    const headers = requestInit?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer mock-token');
  });

  it('토큰이 없으면 Authorization 헤더가 없다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ ok: true, status: 200, json: async () => ({ status: 'ok' }) }),
    );

    await apiFetch('/health');

    const [, requestInit] = vi.mocked(fetch).mock.calls[0];
    const headers = requestInit?.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('401 응답 시 ApiError를 던지고 code/message/details가 일치한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        ok: false,
        status: 401,
        json: async () => ({ code: 'UNAUTHORIZED', message: '인증이 필요합니다.', details: null }),
      }),
    );

    await expect(apiFetch('/users/me')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
      message: '인증이 필요합니다.',
      details: null,
    });
  });

  it('404 응답 시 ApiError를 던지고 code/message/details가 일치한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        ok: false,
        status: 404,
        json: async () => ({ code: 'NOT_FOUND', message: '리소스를 찾을 수 없습니다.', details: null }),
      }),
    );

    const error = await apiFetch('/todos/some-id').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
    expect((error as ApiError).code).toBe('NOT_FOUND');
    expect((error as ApiError).message).toBe('리소스를 찾을 수 없습니다.');
    expect((error as ApiError).details).toBeNull();
  });

  it('400 응답 시 ApiError를 던지고 details 배열이 포함된다', async () => {
    const details = [{ field: 'endDate', reason: '종료일자는 시작일자보다 이전일 수 없습니다.' }];
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        ok: false,
        status: 400,
        json: async () => ({ code: 'VALIDATION_ERROR', message: '유효성 오류', details }),
      }),
    );

    const error = await apiFetch('/todos').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).code).toBe('VALIDATION_ERROR');
    expect((error as ApiError).details).toEqual(details);
  });

  it('204 응답 시 undefined를 반환한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse({ ok: true, status: 204 }));

    const result = await apiFetch('/todos/some-id');
    expect(result).toBeUndefined();
  });

  it('2xx 정상 응답 시 JSON을 파싱해 반환한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ ok: true, status: 200, json: async () => ({ status: 'ok' }) }),
    );

    const result = await apiFetch('/health');
    expect(result).toEqual({ status: 'ok' });
  });
});
