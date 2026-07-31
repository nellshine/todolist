import { describe, it, expect, afterEach, vi } from 'vitest';

describe('API_BASE_URL', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('VITE_API_BASE_URL이 설정되어 있으면 해당 값을 사용한다', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://example.com');
    vi.resetModules();
    const { API_BASE_URL } = await import('./api');
    expect(API_BASE_URL).toBe('http://example.com');
  });

  it('VITE_API_BASE_URL이 없으면 기본값을 사용한다', async () => {
    vi.stubEnv('VITE_API_BASE_URL', undefined);
    vi.resetModules();
    const { API_BASE_URL } = await import('./api');
    expect(API_BASE_URL).toBe('http://localhost:3000');
  });
});
