import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuthStore } from '../store/authStore';

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={['/todos']}>
      <Routes>
        <Route path="/login" element={<div>로그인 화면</div>} />
        <Route
          path="/todos"
          element={
            <ProtectedRoute>
              <div>보호된 화면</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, isAuthenticated: false });
  });

  it('isAuthenticated가 false면 children 대신 /login으로 리다이렉트한다', () => {
    useAuthStore.setState({ isAuthenticated: false });
    renderProtectedRoute();
    expect(screen.getByText('로그인 화면')).toBeInTheDocument();
    expect(screen.queryByText('보호된 화면')).not.toBeInTheDocument();
  });

  it('isAuthenticated가 true면 children이 노출된다', () => {
    useAuthStore.setState({ isAuthenticated: true, token: 'abc' });
    renderProtectedRoute();
    expect(screen.getByText('보호된 화면')).toBeInTheDocument();
  });
});
