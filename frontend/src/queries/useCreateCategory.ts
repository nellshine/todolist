import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCategory } from '../api/category-api';

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
