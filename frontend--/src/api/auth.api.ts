import type { AuthResponse, LoginRequest, RegisterRequest, UpdateEmailRequest, UpdateEmailResponse, User } from '../types/auth.types';
import client from './client.api';

export const authApi = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await client.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await client.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await client.post('/auth/logout');
  },

  getMe: async (): Promise<User> => {
    const response = await client.get<User>('/auth/me');
    return response.data;
  },

  updateEmail: async (data: UpdateEmailRequest): Promise<UpdateEmailResponse> => {
    const response = await client.patch<UpdateEmailResponse>('/auth/me/email', data);
    return response.data;
  },

  changePassword: async (data: { currentPassword?: string; newPassword?: string }): Promise<void> => {
    await client.post('/auth/change-password', data);
  },
};