import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCreateTodo } from './useCreateTodo';
import { useUpdateTodo } from './useUpdateTodo';
import { useDeleteTodo } from './useDeleteTodo';
import { createTodo, updateTodo, deleteTodo } from '../api/todo-api';
import type { Todo, CreateTodoRequest, UpdateTodoRequest } from '../types';

vi.mock('../api/todo-api');

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockTodo: Todo = {
  id: '1',
  ownerId: 'owner-1',
  categoryId: 'cat-1',
  title: '제목',
  description: null,
  startDate: '2026-08-01',
  endDate: '2026-08-02',
  isCompleted: false,
  completedAt: null,
  status: 'NOT_STARTED',
  createdAt: '2026-07-30T00:00:00.000Z',
  updatedAt: '2026-07-30T00:00:00.000Z',
};

describe('useCreateTodo', () => {
  beforeEach(() => {
    vi.mocked(createTodo).mockReset();
  });

  it('mutate 호출 시 createTodo가 전달된 인자로 호출된다', async () => {
    vi.mocked(createTodo).mockResolvedValue(mockTodo);
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useCreateTodo(), { wrapper: createWrapper(queryClient) });

    const body: CreateTodoRequest = {
      title: '제목',
      startDate: '2026-08-01',
      endDate: '2026-08-02',
    };
    result.current.mutate(body);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(createTodo).toHaveBeenCalledWith(body, expect.anything());
  });

  it('성공 시 todos 쿼리를 invalidate한다', async () => {
    vi.mocked(createTodo).mockResolvedValue(mockTodo);
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateTodo(), { wrapper: createWrapper(queryClient) });

    result.current.mutate({ title: '제목', startDate: '2026-08-01', endDate: '2026-08-02' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['todos'] });
  });
});

describe('useUpdateTodo', () => {
  beforeEach(() => {
    vi.mocked(updateTodo).mockReset();
  });

  it('mutate 호출 시 updateTodo가 id/body로 호출된다', async () => {
    vi.mocked(updateTodo).mockResolvedValue(mockTodo);
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useUpdateTodo(), { wrapper: createWrapper(queryClient) });

    const body: UpdateTodoRequest = { isCompleted: true };
    result.current.mutate({ id: '1', body });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateTodo).toHaveBeenCalledWith('1', body);
  });

  it('성공 시 todos 쿼리를 invalidate한다', async () => {
    vi.mocked(updateTodo).mockResolvedValue(mockTodo);
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateTodo(), { wrapper: createWrapper(queryClient) });

    result.current.mutate({ id: '1', body: { isCompleted: true } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['todos'] });
  });
});

describe('useDeleteTodo', () => {
  beforeEach(() => {
    vi.mocked(deleteTodo).mockReset();
  });

  it('mutate 호출 시 deleteTodo가 id로 호출된다', async () => {
    vi.mocked(deleteTodo).mockResolvedValue(undefined);
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useDeleteTodo(), { wrapper: createWrapper(queryClient) });

    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(deleteTodo).toHaveBeenCalledWith('1');
  });

  it('성공 시 todos 쿼리를 invalidate한다', async () => {
    vi.mocked(deleteTodo).mockResolvedValue(undefined);
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteTodo(), { wrapper: createWrapper(queryClient) });

    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['todos'] });
  });
});
