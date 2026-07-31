import { create } from 'zustand';
import type { TodoStatus } from '../types';

interface TodoFilterState {
  categoryId: string | null;
  status: TodoStatus | null;
  setCategoryId: (categoryId: string | null) => void;
  setStatus: (status: TodoStatus | null) => void;
  reset: () => void;
}

const initialState = { categoryId: null, status: null };

export const useTodoFilterStore = create<TodoFilterState>((set) => ({
  ...initialState,
  setCategoryId: (categoryId) => set({ categoryId }),
  setStatus: (status) => set({ status }),
  reset: () => set({ ...initialState }),
}));
