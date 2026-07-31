export interface User {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  nickname: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UpdateMeRequest {
  nickname?: string;
  password?: string;
}
