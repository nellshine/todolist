import { apiFetch } from './fetch-client';
import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../types';

export function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/categories');
}

export function createCategory(body: CreateCategoryRequest): Promise<Category> {
  return apiFetch<Category>('/categories', { method: 'POST', body });
}

export function updateCategory(id: string, body: UpdateCategoryRequest): Promise<Category> {
  return apiFetch<Category>(`/categories/${id}`, { method: 'PATCH', body });
}

export function deleteCategory(id: string): Promise<void> {
  return apiFetch<void>(`/categories/${id}`, { method: 'DELETE' });
}
