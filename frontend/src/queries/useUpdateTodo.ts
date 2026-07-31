import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTodo } from '../api/todo-api';
import type { UpdateTodoRequest } from '../types';

export function useUpdateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTodoRequest }) => updateTodo(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}
