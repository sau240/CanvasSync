export interface User {
  user_id: number;
  username: string;
  email: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  user: User;
}

export interface UpdateEmailRequest {
  email: string;
}

export interface UpdateEmailResponse {
  user_id: number;
  email: string;
}