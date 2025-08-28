import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APIResponse } from '../types';

class APIServiceClass {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Development환경에서는 localhost, 프로덕션에서는 실제 도메인
    this.baseURL = __DEV__ 
      ? 'http://localhost:3001/api' 
      : 'https://api.billiard3cushion.com/api';

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * 요청/응답 인터셉터 설정
   */
  private setupInterceptors(): void {
    // Request interceptor - 모든 요청에 토큰 추가
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const token = await AsyncStorage.getItem('authToken');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Token retrieval error:', error);
        }
        
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - 에러 처리 및 토큰 갱신
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // 401 에러 처리 - 토큰 만료
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await AsyncStorage.getItem('refreshToken');
            
            if (refreshToken) {
              const response = await axios.post(`${this.baseURL}/auth/refresh`, {
                refreshToken,
              });

              const { token, refreshToken: newRefreshToken } = response.data.data;

              await AsyncStorage.multiSet([
                ['authToken', token],
                ['refreshToken', newRefreshToken],
              ]);

              // 새 토큰으로 원래 요청 재시도
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            
            // 토큰 갱신 실패시 로그아웃 처리
            await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData']);
            
            // 앱을 로그인 화면으로 리다이렉트하는 이벤트 발생
            // 여기서는 간단히 콘솔 로그만 출력
            console.log('User needs to re-authenticate');
          }
        }

        console.error('API Error:', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 인증 토큰 설정
   */
  setAuthToken(token: string | null): void {
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
    }
  }

  /**
   * GET 요청
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    try {
      const response = await this.client.get(url, config);
      return this.formatResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * POST 요청
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    try {
      const response = await this.client.post(url, data, config);
      return this.formatResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * PUT 요청
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    try {
      const response = await this.client.put(url, data, config);
      return this.formatResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * DELETE 요청
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    try {
      const response = await this.client.delete(url, config);
      return this.formatResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * PATCH 요청
   */
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    try {
      const response = await this.client.patch(url, data, config);
      return this.formatResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 파일 업로드
   */
  async uploadFile<T>(
    url: string, 
    file: FormData, 
    onProgress?: (progress: number) => void
  ): Promise<APIResponse<T>> {
    try {
      const config: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            onProgress(Math.round(progress));
          }
        },
      };

      const response = await this.client.post(url, file, config);
      return this.formatResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 응답 포맷팅
   */
  private formatResponse<T>(response: AxiosResponse): APIResponse<T> {
    return {
      success: true,
      data: response.data.data || response.data,
      message: response.data.message,
    };
  }

  /**
   * 에러 처리
   */
  private handleError<T>(error: any): APIResponse<T> {
    let errorMessage = '네트워크 오류가 발생했습니다.';
    
    if (error.response) {
      // 서버가 응답했지만 에러 상태
      errorMessage = error.response.data?.message || 
                   error.response.data?.error || 
                   `서버 오류 (${error.response.status})`;
    } else if (error.request) {
      // 요청이 전송되었지만 응답을 받지 못함
      errorMessage = '서버에 연결할 수 없습니다.';
    } else {
      // 요청 설정 중 오류 발생
      errorMessage = error.message || '요청 처리 중 오류가 발생했습니다.';
    }

    console.error('API Error Details:', error);

    return {
      success: false,
      error: errorMessage,
      message: errorMessage,
    };
  }

  /**
   * 네트워크 상태 확인
   */
  async checkNetworkConnection(): Promise<boolean> {
    try {
      await this.client.get('/health', { timeout: 5000 });
      return true;
    } catch (error) {
      console.error('Network check failed:', error);
      return false;
    }
  }

  /**
   * 요청 취소를 위한 AbortController 생성
   */
  createCancelToken() {
    return axios.CancelToken.source();
  }

  /**
   * Base URL 변경 (개발/프로덕션 전환)
   */
  setBaseURL(url: string): void {
    this.baseURL = url;
    this.client.defaults.baseURL = url;
  }

  /**
   * 요청 타임아웃 설정
   */
  setTimeout(timeout: number): void {
    this.client.defaults.timeout = timeout;
  }

  /**
   * 디버그용 - 현재 설정 정보 출력
   */
  getConfig() {
    return {
      baseURL: this.baseURL,
      timeout: this.client.defaults.timeout,
      headers: this.client.defaults.headers,
    };
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const APIService = new APIServiceClass();

// 편의를 위한 개별 함수들도 내보내기
export const {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  patch: apiPatch,
} = APIService;