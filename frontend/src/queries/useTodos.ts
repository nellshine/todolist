import { useQuery } from '@tanstack/react-query';
import { getTodos } from '../api/todo-api';
import type { GetTodosParams } from '../api/todo-api';

export function useTodos(params?: GetTodosParams) {
  return useQuery({
    queryKey: ['todos', params ?? {}],
    queryFn: () => getTodos(params),
  });
}
