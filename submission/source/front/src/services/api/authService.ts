/**
 * src/services/api/authService.ts
 * Authentication service communicating with real Backend API.
 */
import { axiosClient } from './axiosClient';
import type { AuthResponse } from '../../types';

export const authService = {
  /** 
   * POST /api/auth/login
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await axiosClient.post('/auth/login', { email, password });
    const { accessToken, user } = res.data;
    
    // Map backend response { accessToken, user } to matching frontend format
    return {
      user,
      token: accessToken,
      councilRole: user.councilRole,
    };
  },

  /** 
   * POST /api/auth/logout
   */
  async logout(_userName: string): Promise<void> {
    await axiosClient.post('/auth/logout');
  },

  async forgotPassword(email: string): Promise<void> {
    await axiosClient.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await axiosClient.post('/auth/reset-password', { token, newPassword });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await axiosClient.put('/auth/change-password', { currentPassword, newPassword });
  },
};
