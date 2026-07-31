import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { signup } from '../api/auth-api';
import { ApiError } from '../api/api-error';
import FormField from '../components/FormField';
import './AuthForm.css';

export default function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  const mutation = useMutation({
    mutationFn: signup,
    onSuccess: () => {
      navigate('/login');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate({ email, password, nickname });
  };

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? '알 수 없는 오류가 발생했습니다.'
        : null;

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1 className="auth-form__title">회원가입</h1>
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
        autoComplete="new-password"
      />
      <FormField
        label="닉네임"
        type="text"
        value={nickname}
        onChange={setNickname}
        required
        autoComplete="nickname"
      />
      {errorMessage && <p className="auth-form__error">{errorMessage}</p>}
      <button className="auth-form__submit" type="submit" disabled={mutation.isPending}>
        가입하기
      </button>
      <p className="auth-form__footer">
        이미 계정이 있으신가요? <Link to="/login">로그인</Link>
      </p>
    </form>
  );
}
