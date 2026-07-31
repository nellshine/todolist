import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import App from './App';
import { useAuthStore } from './store/authStore';

function renderApp(initialEntry: string) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('App 라우팅', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, isAuthenticated: false });
  });

  it('/login 진입 시 로그인 화면이 렌더링된다', () => {
    renderApp('/login');
    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument();
  });

  it('/signup 진입 시 회원가입 화면이 렌더링된다', () => {
    renderApp('/signup');
    expect(screen.getByRole('heading', { name: '회원가입' })).toBeInTheDocument();
  });

  it('/todos 진입 시 미인증 상태면 로그인 화면으로 리다이렉트된다', () => {
    renderApp('/todos');
    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument();
  });

  it('/todos 진입 시 인증 상태면 할일 목록 화면이 렌더링된다', () => {
    useAuthStore.setState({ isAuthenticated: true, token: 'x' });
    renderApp('/todos');
    expect(screen.getByRole('heading', { name: '할일 목록' })).toBeInTheDocument();
  });

  it('/ 진입 시 /login으로 리다이렉트된다', () => {
    renderApp('/');
    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument();
  });
});
