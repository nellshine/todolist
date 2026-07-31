import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteTodo } from '../api/todo-api';

export function useDeleteTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTodo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}
