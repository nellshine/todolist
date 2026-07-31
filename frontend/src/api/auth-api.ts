import { apiFetch } from './fetch-client';
import type { AuthResponse, LoginRequest, SignupRequest, User } from '../types';

export function signup(body: SignupRequest): Promise<User> {
  return apiFetch<User>('/auth/signup', { method: 'POST', body });
}

export function login(body: LoginRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', { method: 'POST', body });
}
