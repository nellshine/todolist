import { describe, it, expect, beforeEach } from 'vitest';
import { useTodoFilterStore } from './todoFilterStore';

describe('useTodoFilterStore', () => {
  beforeEach(() => {
    useTodoFilterStore.setState({ categoryId: null, status: null });
  });

  it('초기값은 categoryId와 status 모두 null이다', () => {
    const state = useTodoFilterStore.getState();
    expect(state.categoryId).toBeNull();
    expect(state.status).toBeNull();
  });

  it('setCategoryId는 categoryId만 갱신하고 status는 유지한다', () => {
    useTodoFilterStore.getState().setStatus('IN_PROGRESS');
    useTodoFilterStore.getState().setCategoryId('cat-1');

    const state = useTodoFilterStore.getState();
    expect(state.categoryId).toBe('cat-1');
    expect(state.status).toBe('IN_PROGRESS');
  });

  it('setStatus는 status만 갱신하고 categoryId는 유지한다', () => {
    useTodoFilterStore.getState().setCategoryId('cat-1');
    useTodoFilterStore.getState().setStatus('COMPLETED');

    const state = useTodoFilterStore.getState();
    expect(state.categoryId).toBe('cat-1');
    expect(state.status).toBe('COMPLETED');
  });

  it('reset 호출 시 categoryId와 status가 모두 null로 복원된다', () => {
    useTodoFilterStore.getState().setCategoryId('cat-1');
    useTodoFilterStore.getState().setStatus('COMPLETED');

    useTodoFilterStore.getState().reset();

    const state = useTodoFilterStore.getState();
    expect(state.categoryId).toBeNull();
    expect(state.status).toBeNull();
  });
});
