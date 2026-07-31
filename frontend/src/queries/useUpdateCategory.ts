import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateCategory } from '../api/category-api';
import type { UpdateCategoryRequest } from '../types';

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateCategoryRequest }) => updateCategory(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
