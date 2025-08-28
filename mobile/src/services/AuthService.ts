import AsyncStorage from '@react-native-async-storage/async-storage';
import { APIService } from './APIService';
import { User, APIResponse } from '../types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export class AuthService {
  private static readonly TOKEN_KEY = 'authToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private static readonly USER_KEY = 'userData';

  /**
   * 사용자 로그인
   */
  static async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await APIService.post<LoginResponse>('/auth/login', credentials);
      
      if (response.data) {
        await AsyncStorage.multiSet([
          [this.TOKEN_KEY, response.data.token],
          [this.REFRESH_TOKEN_KEY, response.data.refreshToken],
          [this.USER_KEY, JSON.stringify(response.data.user)],
        ]);
        
        // Set the token for future API calls
        APIService.setAuthToken(response.data.token);
        
        return response.data;
      }
      
      throw new Error(response.message || '로그인에 실패했습니다');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * 사용자 회원가입
   */
  static async register(userData: RegisterData): Promise<LoginResponse> {
    try {
      if (userData.password !== userData.confirmPassword) {
        throw new Error('비밀번호가 일치하지 않습니다');
      }

      const { confirmPassword, ...registrationData } = userData;
      
      const response = await APIService.post<LoginResponse>('/auth/register', registrationData);
      
      if (response.data) {
        await AsyncStorage.multiSet([
          [this.TOKEN_KEY, response.data.token],
          [this.REFRESH_TOKEN_KEY, response.data.refreshToken],
          [this.USER_KEY, JSON.stringify(response.data.user)],
        ]);
        
        // Set the token for future API calls
        APIService.setAuthToken(response.data.token);
        
        return response.data;
      }
      
      throw new Error(response.message || '회원가입에 실패했습니다');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * 사용자 로그아웃
   */
  static async logout(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem(this.TOKEN_KEY);
      
      if (token) {
        // Notify server about logout
        await APIService.post('/auth/logout', {});
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of server response
      await AsyncStorage.multiRemove([
        this.TOKEN_KEY,
        this.REFRESH_TOKEN_KEY,
        this.USER_KEY,
      ]);
      
      // Clear API service token
      APIService.setAuthToken(null);
    }
  }

  /**
   * 저장된 토큰 확인 및 유효성 검증
   */
  static async verifyToken(token?: string): Promise<boolean> {
    try {
      const authToken = token || await AsyncStorage.getItem(this.TOKEN_KEY);
      
      if (!authToken) {
        return false;
      }

      // Check if token is expired locally (optional)
      if (this.isTokenExpired(authToken)) {
        await this.refreshAuthToken();
        return true;
      }

      // Verify with server
      const response = await APIService.post<{ valid: boolean }>('/auth/verify', {
        token: authToken,
      });

      if (!response.data?.valid) {
        // Try to refresh token
        await this.refreshAuthToken();
      }

      return true;
    } catch (error) {
      console.error('Token verification error:', error);
      await this.logout(); // Clear invalid tokens
      return false;
    }
  }

  /**
   * 토큰 만료 확인 (로컬)
   */
  private static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      return payload.exp < currentTime;
    } catch (error) {
      return true; // 파싱 오류시 만료된 것으로 처리
    }
  }

  /**
   * 리프레시 토큰을 사용하여 새 토큰 발급
   */
  static async refreshAuthToken(): Promise<boolean> {
    try {
      const refreshToken = await AsyncStorage.getItem(this.REFRESH_TOKEN_KEY);
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await APIService.post<{ token: string; refreshToken: string }>('/auth/refresh', {
        refreshToken,
      });

      if (response.data) {
        await AsyncStorage.multiSet([
          [this.TOKEN_KEY, response.data.token],
          [this.REFRESH_TOKEN_KEY, response.data.refreshToken],
        ]);
        
        APIService.setAuthToken(response.data.token);
        return true;
      }

      throw new Error('Failed to refresh token');
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.logout();
      return false;
    }
  }

  /**
   * 현재 사용자 정보 가져오기
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      // First try to get from local storage
      const storedUser = await AsyncStorage.getItem(this.USER_KEY);
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        
        // Optionally fetch fresh data from server
        try {
          const response = await APIService.get<User>('/auth/me');
          if (response.data) {
            await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(response.data));
            return response.data;
          }
        } catch (error) {
          console.warn('Failed to fetch fresh user data:', error);
        }
        
        return userData;
      }

      // Fetch from server if not in local storage
      const response = await APIService.get<User>('/auth/me');
      if (response.data) {
        await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(response.data));
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * 사용자 프로필 업데이트
   */
  static async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      const response = await APIService.put<User>('/auth/profile', updates);
      
      if (response.data) {
        await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(response.data));
        return response.data;
      }
      
      throw new Error(response.message || '프로필 업데이트에 실패했습니다');
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }

  /**
   * 비밀번호 변경
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const response = await APIService.put('/auth/password', {
        currentPassword,
        newPassword,
      });

      if (!response.success) {
        throw new Error(response.message || '비밀번호 변경에 실패했습니다');
      }
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  }

  /**
   * 비밀번호 재설정 이메일 발송
   */
  static async requestPasswordReset(email: string): Promise<void> {
    try {
      const response = await APIService.post('/auth/reset-password', { email });

      if (!response.success) {
        throw new Error(response.message || '비밀번호 재설정 이메일 발송에 실패했습니다');
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }

  /**
   * 저장된 토큰 가져오기
   */
  static async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Get stored token error:', error);
      return null;
    }
  }

  /**
   * 인증 상태 확인
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem(this.TOKEN_KEY);
      return token !== null && await this.verifyToken(token);
    } catch (error) {
      console.error('Authentication check error:', error);
      return false;
    }
  }

  /**
   * 소셜 로그인 (Google, Apple 등)
   */
  static async socialLogin(provider: 'google' | 'apple', token: string): Promise<LoginResponse> {
    try {
      const response = await APIService.post<LoginResponse>(`/auth/social/${provider}`, {
        token,
      });

      if (response.data) {
        await AsyncStorage.multiSet([
          [this.TOKEN_KEY, response.data.token],
          [this.REFRESH_TOKEN_KEY, response.data.refreshToken],
          [this.USER_KEY, JSON.stringify(response.data.user)],
        ]);
        
        APIService.setAuthToken(response.data.token);
        return response.data;
      }

      throw new Error(response.message || '소셜 로그인에 실패했습니다');
    } catch (error) {
      console.error('Social login error:', error);
      throw error;
    }
  }
}