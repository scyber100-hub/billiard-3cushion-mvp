import { Platform, DeviceInfo } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APIService } from './APIService';
import DeviceInfo from 'react-native-device-info';

export interface BetaFeedback {
  id: string;
  userId: string;
  category: 'bug' | 'feature' | 'ui' | 'performance' | 'crash' | 'suggestion';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  steps?: string[]; // 재현 단계
  expectedBehavior?: string;
  actualBehavior?: string;
  screenshots?: string[]; // base64 또는 URL
  deviceInfo: DeviceDetails;
  appVersion: string;
  timestamp: Date;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'duplicate';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
}

export interface DeviceDetails {
  platform: 'ios' | 'android';
  osVersion: string;
  appVersion: string;
  buildNumber: string;
  deviceModel: string;
  deviceId: string;
  screenResolution: string;
  availableMemory: number;
  totalMemory: number;
  batterylevel?: number;
  isTablet: boolean;
  hasCamera: boolean;
  hasARSupport: boolean;
  networkType: string;
}

export interface BetaTestMetrics {
  totalFeedbacks: number;
  categoryBreakdown: Record<string, number>;
  severityBreakdown: Record<string, number>;
  platformBreakdown: Record<string, number>;
  resolutionRate: number;
  averageResolutionTime: number;
  topIssues: Array<{
    title: string;
    count: number;
    severity: string;
  }>;
  userSatisfactionScore: number;
}

export interface BetaUser {
  id: string;
  email: string;
  name: string;
  country: string;
  language: string;
  joinedAt: Date;
  feedbackCount: number;
  isActive: boolean;
  testingStreak: number; // 연속 테스트 일수
  rewardPoints: number;
}

class BetaTestingServiceClass {
  private readonly STORAGE_KEYS = {
    BETA_USER_ID: 'betaUserId',
    FEEDBACK_DRAFTS: 'feedbackDrafts',
    TESTING_SESSION: 'testingSession',
  };

  /**
   * 베타 테스터 등록
   */
  async registerBetaTester(userInfo: {
    email: string;
    name: string;
    country: string;
    language: string;
    referralCode?: string;
  }): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      const deviceInfo = await this.getDeviceInfo();
      
      const response = await APIService.post('/beta/register', {
        ...userInfo,
        deviceInfo,
        registeredAt: new Date(),
      });

      if (response.success && response.data?.userId) {
        await AsyncStorage.setItem(this.STORAGE_KEYS.BETA_USER_ID, response.data.userId);
        
        // 첫 가입 환영 메시지
        this.showWelcomeMessage();
        
        return { success: true, userId: response.data.userId };
      }

      return { success: false, error: response.message || '등록에 실패했습니다' };
    } catch (error: any) {
      console.error('Beta registration failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 피드백 제출
   */
  async submitFeedback(feedback: Omit<BetaFeedback, 'id' | 'userId' | 'deviceInfo' | 'appVersion' | 'timestamp' | 'status' | 'priority'>): Promise<{
    success: boolean;
    feedbackId?: string;
    error?: string;
  }> {
    try {
      const userId = await this.getBetaUserId();
      if (!userId) {
        throw new Error('베타 테스터 등록이 필요합니다');
      }

      const deviceInfo = await this.getDeviceInfo();
      const appVersion = await DeviceInfo.getVersion();

      const completeFeedback: Omit<BetaFeedback, 'id' | 'status' | 'priority'> = {
        ...feedback,
        userId,
        deviceInfo,
        appVersion,
        timestamp: new Date(),
      };

      const response = await APIService.post('/beta/feedback', completeFeedback);

      if (response.success && response.data?.feedbackId) {
        // 피드백 제출 보상 지급
        await this.addRewardPoints(10, 'feedback_submitted');
        
        // 로컬 임시 저장소에서 해당 draft 제거
        await this.removeFeedbackDraft(feedback.title);

        return { success: true, feedbackId: response.data.feedbackId };
      }

      return { success: false, error: response.message || '피드백 제출에 실패했습니다' };
    } catch (error: any) {
      console.error('Feedback submission failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 크래시 리포트 자동 제출
   */
  async submitCrashReport(errorInfo: {
    errorMessage: string;
    stackTrace: string;
    componentStack?: string;
    userAction?: string;
    screenName?: string;
  }): Promise<void> {
    try {
      const userId = await this.getBetaUserId();
      const deviceInfo = await this.getDeviceInfo();
      
      const crashReport: Omit<BetaFeedback, 'id' | 'status' | 'priority'> = {
        userId: userId || 'anonymous',
        category: 'crash',
        severity: 'critical',
        title: `앱 크래시: ${errorInfo.errorMessage.substring(0, 50)}`,
        description: `오류 메시지: ${errorInfo.errorMessage}\n\n스택 트레이스:\n${errorInfo.stackTrace}`,
        steps: errorInfo.userAction ? [errorInfo.userAction] : undefined,
        deviceInfo,
        appVersion: await DeviceInfo.getVersion(),
        timestamp: new Date(),
        tags: ['auto-generated', 'crash', errorInfo.screenName || 'unknown-screen'],
      };

      await APIService.post('/beta/crash-report', crashReport);
    } catch (error) {
      console.error('Failed to submit crash report:', error);
    }
  }

  /**
   * 피드백 초안 저장 (오프라인 지원)
   */
  async saveFeedbackDraft(draft: Partial<BetaFeedback>): Promise<void> {
    try {
      const drafts = await this.getFeedbackDrafts();
      const draftKey = draft.title || `draft_${Date.now()}`;
      
      drafts[draftKey] = {
        ...draft,
        savedAt: new Date(),
      };

      await AsyncStorage.setItem(this.STORAGE_KEYS.FEEDBACK_DRAFTS, JSON.stringify(drafts));
    } catch (error) {
      console.error('Failed to save feedback draft:', error);
    }
  }

  /**
   * 저장된 피드백 초안 목록
   */
  async getFeedbackDrafts(): Promise<Record<string, any>> {
    try {
      const draftsString = await AsyncStorage.getItem(this.STORAGE_KEYS.FEEDBACK_DRAFTS);
      return draftsString ? JSON.parse(draftsString) : {};
    } catch (error) {
      console.error('Failed to get feedback drafts:', error);
      return {};
    }
  }

  /**
   * 피드백 초안 제거
   */
  async removeFeedbackDraft(draftKey: string): Promise<void> {
    try {
      const drafts = await this.getFeedbackDrafts();
      delete drafts[draftKey];
      await AsyncStorage.setItem(this.STORAGE_KEYS.FEEDBACK_DRAFTS, JSON.stringify(drafts));
    } catch (error) {
      console.error('Failed to remove feedback draft:', error);
    }
  }

  /**
   * 베타 테스트 통계
   */
  async getBetaMetrics(): Promise<BetaTestMetrics | null> {
    try {
      const response = await APIService.get('/beta/metrics');
      return response.data || null;
    } catch (error) {
      console.error('Failed to get beta metrics:', error);
      return null;
    }
  }

  /**
   * 내 피드백 목록
   */
  async getMyFeedbacks(): Promise<BetaFeedback[]> {
    try {
      const userId = await this.getBetaUserId();
      if (!userId) return [];

      const response = await APIService.get(`/beta/feedbacks/${userId}`);
      return response.data || [];
    } catch (error) {
      console.error('Failed to get my feedbacks:', error);
      return [];
    }
  }

  /**
   * 베타 사용자 정보
   */
  async getBetaUserInfo(): Promise<BetaUser | null> {
    try {
      const userId = await this.getBetaUserId();
      if (!userId) return null;

      const response = await APIService.get(`/beta/user/${userId}`);
      return response.data || null;
    } catch (error) {
      console.error('Failed to get beta user info:', error);
      return null;
    }
  }

  /**
   * 보상 포인트 추가
   */
  async addRewardPoints(points: number, reason: string): Promise<void> {
    try {
      const userId = await this.getBetaUserId();
      if (!userId) return;

      await APIService.post('/beta/rewards', {
        userId,
        points,
        reason,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to add reward points:', error);
    }
  }

  /**
   * 일일 테스팅 체크인
   */
  async dailyCheckIn(): Promise<{ success: boolean; streak: number; reward: number }> {
    try {
      const userId = await this.getBetaUserId();
      if (!userId) return { success: false, streak: 0, reward: 0 };

      const response = await APIService.post('/beta/checkin', { userId });
      
      if (response.success) {
        return {
          success: true,
          streak: response.data.streak,
          reward: response.data.rewardPoints,
        };
      }

      return { success: false, streak: 0, reward: 0 };
    } catch (error) {
      console.error('Daily check-in failed:', error);
      return { success: false, streak: 0, reward: 0 };
    }
  }

  /**
   * 스크린샷 촬영 및 첨부
   */
  async captureScreenshot(): Promise<string | null> {
    try {
      // 실제 구현에서는 react-native-view-shot 사용
      const { captureScreen } = require('react-native-view-shot');
      
      const uri = await captureScreen({
        format: 'jpg',
        quality: 0.8,
      });

      // 서버에 업로드하고 URL 반환
      const uploadResponse = await this.uploadImage(uri);
      return uploadResponse.data?.url || null;
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      return null;
    }
  }

  /**
   * 이미지 업로드
   */
  private async uploadImage(imageUri: string): Promise<any> {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'screenshot.jpg',
    } as any);

    return await APIService.post('/beta/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  /**
   * 디바이스 정보 수집
   */
  private async getDeviceInfo(): Promise<DeviceDetails> {
    const [
      osVersion,
      appVersion,
      buildNumber,
      deviceModel,
      deviceId,
      availableMemory,
      totalMemory,
      batterylevel,
      isTablet,
    ] = await Promise.all([
      DeviceInfo.getSystemVersion(),
      DeviceInfo.getVersion(),
      DeviceInfo.getBuildNumber(),
      DeviceInfo.getModel(),
      DeviceInfo.getUniqueId(),
      DeviceInfo.getFreeDiskStorage(),
      DeviceInfo.getTotalMemory(),
      DeviceInfo.getBatteryLevel(),
      DeviceInfo.isTablet(),
    ]);

    return {
      platform: Platform.OS as 'ios' | 'android',
      osVersion,
      appVersion,
      buildNumber,
      deviceModel,
      deviceId,
      screenResolution: `${Platform.OS === 'ios' ? 'iOS' : 'Android'} Screen`,
      availableMemory: Math.round(availableMemory / (1024 * 1024)), // MB
      totalMemory: Math.round(totalMemory / (1024 * 1024)), // MB
      batterylevel: Math.round((batterylevel || 0) * 100),
      isTablet,
      hasCamera: true, // 대부분의 현대 기기에서 지원
      hasARSupport: Platform.OS === 'ios' || Platform.Version >= 24,
      networkType: 'unknown', // 실제로는 NetInfo로 확인
    };
  }

  /**
   * 베타 사용자 ID 가져오기
   */
  private async getBetaUserId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.STORAGE_KEYS.BETA_USER_ID);
    } catch (error) {
      return null;
    }
  }

  /**
   * 환영 메시지 표시
   */
  private showWelcomeMessage(): void {
    // 실제 구현에서는 모달이나 토스트 메시지
    console.log('🎉 베타 테스터로 가입해주셔서 감사합니다!');
    console.log('피드백을 제출하면 포인트를 받을 수 있습니다.');
  }

  /**
   * 피드백 템플릿 생성
   */
  createFeedbackTemplate(category: BetaFeedback['category']): Partial<BetaFeedback> {
    const templates = {
      bug: {
        category: 'bug' as const,
        title: '',
        description: '',
        steps: ['1. ', '2. ', '3. '],
        expectedBehavior: '',
        actualBehavior: '',
        severity: 'medium' as const,
        tags: ['bug'],
      },
      feature: {
        category: 'feature' as const,
        title: '',
        description: '제안하고 싶은 새로운 기능에 대해 설명해주세요.',
        severity: 'low' as const,
        tags: ['enhancement', 'feature-request'],
      },
      ui: {
        category: 'ui' as const,
        title: '',
        description: 'UI/UX 개선사항에 대해 설명해주세요.',
        severity: 'low' as const,
        tags: ['ui', 'ux', 'design'],
      },
      performance: {
        category: 'performance' as const,
        title: '',
        description: '성능 관련 이슈에 대해 설명해주세요.',
        severity: 'medium' as const,
        tags: ['performance', 'optimization'],
      },
    };

    return templates[category] || templates.bug;
  }
}

// 전역 에러 핸들러 설정
export const setupBetaCrashReporting = (betaService: BetaTestingServiceClass) => {
  const originalHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error, isFatal) => {
    // 베타 크래시 리포트 제출
    betaService.submitCrashReport({
      errorMessage: error.message,
      stackTrace: error.stack || '',
      userAction: 'Unknown action',
    });

    // 기존 핸들러 호출
    originalHandler?.(error, isFatal);
  });
};

export const BetaTestingService = new BetaTestingServiceClass();