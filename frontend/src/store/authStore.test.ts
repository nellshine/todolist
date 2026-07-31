import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, isAuthenticated: false });
  });

  it('초기 상태는 token: null, isAuthenticated: false 이다', () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('setToken 호출 시 token과 isAuthenticated가 갱신된다', () => {
    useAuthStore.getState().setToken('abc');
    const state = useAuthStore.getState();
    expect(state.token).toBe('abc');
    expect(state.isAuthenticated).toBe(true);
  });

  it('logout 호출 시 초기 상태로 되돌아간다', () => {
    useAuthStore.getState().setToken('abc');
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('setToken 호출 시 localStorage에도 토큰이 저장된다', () => {
    useAuthStore.getState().setToken('xyz');
    expect(localStorage.getItem('todolist_token')).toBe('xyz');
  });

  it('logout 호출 시 localStorage의 토큰도 제거된다', () => {
    useAuthStore.getState().setToken('xyz');
    useAuthStore.getState().logout();
    expect(localStorage.getItem('todolist_token')).toBeNull();
  });
});
