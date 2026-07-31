import { describe, it, expect } from 'vitest';
import { TODO_STATUS } from './todo-status';

describe('TODO_STATUS', () => {
  it('도메인 정의서 4장 상태 표기와 일치하는 4개 키/값을 가진다', () => {
    expect(TODO_STATUS).toEqual({
      NOT_STARTED: 'NOT_STARTED',
      IN_PROGRESS: 'IN_PROGRESS',
      COMPLETED: 'COMPLETED',
      OVERDUE: 'OVERDUE',
    });
  });
});
