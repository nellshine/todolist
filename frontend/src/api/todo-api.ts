import { apiFetch } from './fetch-client';
import type { CreateTodoRequest, Todo, TodoStatus, UpdateTodoRequest } from '../types';

export interface GetTodosParams {
  categoryId?: string;
  status?: TodoStatus;
}

export function getTodos(params?: GetTodosParams): Promise<Todo[]> {
  const query = new URLSearchParams();
  if (params?.categoryId) query.set('categoryId', params.categoryId);
  if (params?.status) query.set('status', params.status);
  const queryString = query.toString();
  return apiFetch<Todo[]>(`/todos${queryString ? `?${queryString}` : ''}`);
}

export function createTodo(body: CreateTodoRequest): Promise<Todo> {
  return apiFetch<Todo>('/todos', { method: 'POST', body });
}

export function getTodo(id: string): Promise<Todo> {
  return apiFetch<Todo>(`/todos/${id}`);
}

export function updateTodo(id: string, body: UpdateTodoRequest): Promise<Todo> {
  return apiFetch<Todo>(`/todos/${id}`, { method: 'PATCH', body });
}

export function deleteTodo(id: string): Promise<void> {
  return apiFetch<void>(`/todos/${id}`, { method: 'DELETE' });
}
