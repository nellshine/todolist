import { describe, it, expect, beforeEach } from 'vitest';
import { getToken, setToken } from './token-storage';

describe('token-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('토큰이 없으면 getToken은 null을 반환한다', () => {
    expect(getToken()).toBeNull();
  });

  it('setToken 호출 시 localStorage에 토큰이 저장되고 getToken으로 조회된다', () => {
    setToken('abc123');
    expect(localStorage.getItem('todolist_token')).toBe('abc123');
    expect(getToken()).toBe('abc123');
  });

  it('setToken(null) 호출 시 localStorage의 토큰이 제거된다', () => {
    setToken('abc123');
    setToken(null);
    expect(localStorage.getItem('todolist_token')).toBeNull();
    expect(getToken()).toBeNull();
  });
});
