import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTodos } from './useTodos';
import { getTodos } from '../api/todo-api';
import type { Todo } from '../types';

vi.mock('../api/todo-api');

function createWrapper() {
  const queryClient = new QueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useTodos', () => {
  it('getTodos를 params 없이 호출한다', async () => {
    vi.mocked(getTodos).mockResolvedValue([] as Todo[]);
    const { result } = renderHook(() => useTodos(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getTodos).toHaveBeenCalledWith(undefined);
  });

  it('params를 전달하면 getTodos에 그대로 전달된다', async () => {
    vi.mocked(getTodos).mockResolvedValue([] as Todo[]);
    const params = { categoryId: 'cat-1' };
    const { result } = renderHook(() => useTodos(params), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getTodos).toHaveBeenCalledWith(params);
  });
});
