import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { login } from '../api/auth-api';
import { ApiError } from '../api/api-error';
import { useAuthStore } from '../store/authStore';
import FormField from '../components/FormField';
import './AuthForm.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setToken(data.token);
      navigate('/todos');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate({ email, password });
  };

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? '알 수 없는 오류가 발생했습니다.'
        : null;

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1 className="auth-form__title">로그인</h1>
      <FormField
        label="이메일"
        type="email"
        value={email}
        onChange={setEmail}
        required
        autoComplete="email"
      />
      <FormField
        label="비밀번호"
        type="password"
        value={password}
        onChange={setPassword}
        required
        minLength={8}
        autoComplete="current-password"
      />
      {errorMessage && <p className="auth-form__error">{errorMessage}</p>}
      <button className="auth-form__submit" type="submit" disabled={mutation.isPending}>
        로그인
      </button>
      <p className="auth-form__footer">
        계정이 없으신가요? <Link to="/signup">회원가입</Link>
      </p>
    </form>
  );
}
