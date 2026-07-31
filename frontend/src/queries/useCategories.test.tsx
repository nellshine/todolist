import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCategories } from './useCategories';
import { getCategories } from '../api/category-api';
import type { Category } from '../types';

vi.mock('../api/category-api');

function createWrapper() {
  const queryClient = new QueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useCategories', () => {
  it('getCategories를 호출한다', async () => {
    vi.mocked(getCategories).mockResolvedValue([] as Category[]);
    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getCategories).toHaveBeenCalled();
  });
});
