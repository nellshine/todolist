import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getHealth } from './health-api';

describe('getHealth', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('성공 응답 시 {status: "ok"}를 반환한다', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' }),
    } as Response);

    const result = await getHealth();
    expect(result).toEqual({ status: 'ok' });
  });
});
