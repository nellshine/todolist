import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCreateCategory } from './useCreateCategory';
import { useUpdateCategory } from './useUpdateCategory';
import { useDeleteCategory } from './useDeleteCategory';
import { createCategory, updateCategory, deleteCategory } from '../api/category-api';
import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../types';

vi.mock('../api/category-api');

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockCategory: Category = {
  id: 'cat-1',
  ownerId: 'owner-1',
  name: '업무',
  isDefault: false,
  createdAt: '2026-07-30T00:00:00.000Z',
};

describe('useCreateCategory', () => {
  beforeEach(() => {
    vi.mocked(createCategory).mockReset();
  });

  it('mutate 호출 시 createCategory가 전달된 인자로 호출된다', async () => {
    vi.mocked(createCategory).mockResolvedValue(mockCategory);
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useCreateCategory(), { wrapper: createWrapper(queryClient) });

    const body: CreateCategoryRequest = { name: '업무' };
    result.current.mutate(body);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(createCategory).toHaveBeenCalledWith(body, expect.anything());
  });

  it('성공 시 categories 쿼리를 invalidate한다', async () => {
    vi.mocked(createCategory).mockResolvedValue(mockCategory);
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateCategory(), { wrapper: createWrapper(queryClient) });

    result.current.mutate({ name: '업무' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['categories'] });
  });
});

describe('useUpdateCategory', () => {
  beforeEach(() => {
    vi.mocked(updateCategory).mockReset();
  });

  it('mutate 호출 시 updateCategory가 id/body로 호출된다', async () => {
    vi.mocked(updateCategory).mockResolvedValue(mockCategory);
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useUpdateCategory(), { wrapper: createWrapper(queryClient) });

    const body: UpdateCategoryRequest = { name: '업무2' };
    result.current.mutate({ id: 'cat-1', body });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateCategory).toHaveBeenCalledWith('cat-1', body);
  });

  it('성공 시 categories 쿼리를 invalidate한다', async () => {
    vi.mocked(updateCategory).mockResolvedValue(mockCategory);
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateCategory(), { wrapper: createWrapper(queryClient) });

    result.current.mutate({ id: 'cat-1', body: { name: '업무2' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['categories'] });
  });
});

describe('useDeleteCategory', () => {
  beforeEach(() => {
    vi.mocked(deleteCategory).mockReset();
  });

  it('mutate 호출 시 deleteCategory가 id로 호출된다', async () => {
    vi.mocked(deleteCategory).mockResolvedValue(undefined);
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useDeleteCategory(), { wrapper: createWrapper(queryClient) });

    result.current.mutate('cat-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(deleteCategory).toHaveBeenCalledWith('cat-1');
  });

  it('성공 시 categories와 todos 쿼리를 모두 invalidate한다', async () => {
    vi.mocked(deleteCategory).mockResolvedValue(undefined);
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteCategory(), { wrapper: createWrapper(queryClient) });

    result.current.mutate('cat-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['categories'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['todos'] });
  });
});
