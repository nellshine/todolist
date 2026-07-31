import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SignupPage from './SignupPage';
import { useAuthStore } from '../store/authStore';
import { signup } from '../api/auth-api';
import { ApiError } from '../api/api-error';

vi.mock('../api/auth-api');

function renderSignupPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/signup']}>
        <Routes>
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<div>로그인 화면</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SignupPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, isAuthenticated: false });
    vi.mocked(signup).mockReset();
  });

  it('정상 제출 시 signup이 email/password/nickname 인자로 호출된다', async () => {
    const user = userEvent.setup();
    vi.mocked(signup).mockResolvedValue({
      id: '1',
      email: 'new@example.com',
      nickname: '새유저',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    renderSignupPage();

    await user.type(screen.getByLabelText('이메일'), 'new@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.type(screen.getByLabelText('닉네임'), '새유저');
    await user.click(screen.getByRole('button', { name: '가입하기' }));

    await waitFor(() => {
      expect(signup).toHaveBeenCalledWith(
        { email: 'new@example.com', password: 'password123', nickname: '새유저' },
        expect.anything(),
      );
    });
  });

  it('성공 시 /login으로 전환되고 token은 null로 유지된다', async () => {
    const user = userEvent.setup();
    vi.mocked(signup).mockResolvedValue({
      id: '1',
      email: 'new@example.com',
      nickname: '새유저',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    renderSignupPage();

    await user.type(screen.getByLabelText('이메일'), 'new@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.type(screen.getByLabelText('닉네임'), '새유저');
    await user.click(screen.getByRole('button', { name: '가입하기' }));

    await waitFor(() => {
      expect(screen.getByText('로그인 화면')).toBeInTheDocument();
    });
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('실패 시 에러 메시지가 노출되고 화면 전환은 되지 않는다', async () => {
    const user = userEvent.setup();
    vi.mocked(signup).mockRejectedValue(
      new ApiError(409, 'EMAIL_ALREADY_EXISTS', '이미 가입된 이메일입니다.'),
    );
    renderSignupPage();

    await user.type(screen.getByLabelText('이메일'), 'dup@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.type(screen.getByLabelText('닉네임'), '중복유저');
    await user.click(screen.getByRole('button', { name: '가입하기' }));

    await waitFor(() => {
      expect(screen.getByText('이미 가입된 이메일입니다.')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: '가입하기' })).toBeInTheDocument();
  });

  it('ApiError가 아닌 예외 발생 시 일반 오류 메시지가 노출된다', async () => {
    const user = userEvent.setup();
    vi.mocked(signup).mockRejectedValue(new Error('network error'));
    renderSignupPage();

    await user.type(screen.getByLabelText('이메일'), 'new@example.com');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.type(screen.getByLabelText('닉네임'), '새유저');
    await user.click(screen.getByRole('button', { name: '가입하기' }));

    await waitFor(() => {
      expect(screen.getByText('알 수 없는 오류가 발생했습니다.')).toBeInTheDocument();
    });
  });
});
