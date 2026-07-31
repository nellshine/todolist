import { apiFetch } from './fetch-client';
import type { UpdateMeRequest, User } from '../types';

export function getMe(): Promise<User> {
  return apiFetch<User>('/users/me');
}

export function updateMe(body: UpdateMeRequest): Promise<User> {
  return apiFetch<User>('/users/me', { method: 'PATCH', body });
}
