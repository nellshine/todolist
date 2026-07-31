import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './LoginPage';
import { useAuthStore } from '../store/authStore';
import { login } from '../api/auth-api';
import { ApiError } from '../api/api-error';

vi.mock('../api/auth-api');

function renderLoginPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/todos" element={<div>할일 목록 화면</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, isAuthenticated: false });
    vi.mocked(login).mockReset();
  });

  it('정상 입력 후 제출 시 login이 email/password 인자로 호출된다', async () => {
    const user = userEvent.setup();
    vi.mocked(login).mockResolvedValue({
      token: 'abc',
      user: { id: '1', email: 'test@example.com', nickname: '닉네임', createdAt: '2026-01-01T00:00:00.000Z' },
    });
    renderLoginPage();

    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith(
        { email: 'test@example.com', password: 'password123' },
        expect.anything(),
      );
    });
  });

  it('성공 시 토큰이 저장되고 /todos 화면으로 전환된다', async () => {
    const user = userEvent.setup();
    vi.mocked(login).mockResolvedValue({
      token: 'abc',
      user: { id: '1', email: 'test@example.com', nickname: '닉네임', createdAt: '2026-01-01T00:00:00.000Z' },
    });
    renderLoginPage();

    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(screen.getByText('할일 목록 화면')).toBeInTheDocument();
    });
    expect(useAuthStore.getState().token).toBe('abc');
  });

  it('실패 시 에러 메시지가 노출되고 token은 null로 유지된다', async () => {
    const user = userEvent.setup();
    vi.mocked(login).mockRejectedValue(
      new ApiError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 일치하지 않습니다.'),
    );
    renderLoginPage();

    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(
        screen.getByText('이메일 또는 비밀번호가 일치하지 않습니다.'),
      ).toBeInTheDocument();
    });
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('ApiError가 아닌 예외 발생 시 일반 오류 메시지가 노출된다', async () => {
    const user = userEvent.setup();
    vi.mocked(login).mockRejectedValue(new Error('network error'));
    renderLoginPage();

    await user.type(screen.getByLabelText('이메일'), 'test@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(screen.getByText('알 수 없는 오류가 발생했습니다.')).toBeInTheDocument();
    });
    expect(useAuthStore.getState().token).toBeNull();
  });
});
