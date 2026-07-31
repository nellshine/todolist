import type { TodoStatus } from '../types';

export const STATUS_LABEL: Record<TodoStatus, string> = {
  NOT_STARTED: '시작 전',
  IN_PROGRESS: '진행중',
  COMPLETED: '완료',
  OVERDUE: '기한초과',
};
