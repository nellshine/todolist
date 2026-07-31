export type TodoStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export interface Todo {
  id: string;
  ownerId: string;
  categoryId: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  isCompleted: boolean;
  completedAt: string | null;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoRequest {
  title: string;
  description?: string | null;
  categoryId?: string | null;
  startDate: string;
  endDate: string;
}

export interface UpdateTodoRequest {
  title?: string;
  description?: string | null;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  isCompleted?: boolean;
}
