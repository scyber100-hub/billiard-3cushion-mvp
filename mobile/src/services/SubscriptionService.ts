import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APIService } from './APIService';
import { SubscriptionPlan, User } from '../types';

export interface PaymentProvider {
  id: 'stripe' | 'paypal' | 'apple' | 'google';
  name: string;
  supported: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
  last4?: string;
  brand?: string;
  isDefault: boolean;
}

export interface SubscriptionOffer {
  planId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration: number; // days
  features: string[];
  isPopular: boolean;
  discount?: {
    percentage: number;
    originalPrice: number;
  };
}

export interface PurchaseOptions {
  planId: string;
  paymentMethodId?: string;
  couponCode?: string;
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  subscription?: SubscriptionPlan;
  error?: string;
}

class SubscriptionServiceClass {
  private paymentProviders: PaymentProvider[] = [
    {
      id: 'stripe',
      name: 'Stripe',
      supported: true,
    },
    {
      id: 'paypal',
      name: 'PayPal',
      supported: true,
    },
    {
      id: 'apple',
      name: 'Apple Pay',
      supported: Platform.OS === 'ios',
    },
    {
      id: 'google',
      name: 'Google Pay',
      supported: Platform.OS === 'android',
    },
  ];

  /**
   * 구독 플랜 목록 가져오기
   */
  async getSubscriptionPlans(): Promise<SubscriptionOffer[]> {
    try {
      const response = await APIService.get<SubscriptionOffer[]>('/subscription/plans');
      
      if (response.data) {
        return response.data;
      }

      // 기본 플랜 반환 (오프라인 대응)
      return this.getDefaultPlans();
    } catch (error) {
      console.error('Failed to fetch subscription plans:', error);
      return this.getDefaultPlans();
    }
  }

  /**
   * 기본 구독 플랜
   */
  private getDefaultPlans(): SubscriptionOffer[] {
    return [
      {
        planId: 'basic',
        name: 'Basic',
        description: '기본 기능 사용',
        price: 0,
        currency: 'USD',
        duration: 30,
        features: [
          '일일 경로 계산 10회',
          '기본 3가지 경로 제시',
          '기초 도전과제',
          '광고 포함',
        ],
        isPopular: false,
      },
      {
        planId: 'premium',
        name: 'Premium',
        description: '프리미엄 기능으로 실력 향상',
        price: 4.99,
        currency: 'USD',
        duration: 30,
        features: [
          '무제한 경로 계산',
          'AI 맞춤 추천',
          '상세 분석 리포트',
          '모든 도전과제',
          '친구 대전',
          '광고 제거',
        ],
        isPopular: true,
      },
      {
        planId: 'pro',
        name: 'Pro',
        description: '프로 수준의 모든 기능',
        price: 19.99,
        currency: 'USD',
        duration: 30,
        features: [
          '프리미엄 모든 기능',
          '1:1 코칭 세션 (월 2회)',
          '대회 정보 & 참가 지원',
          '고급 통계 분석',
          '우선 고객 지원',
          'AR 기능 무제한',
        ],
        isPopular: false,
      },
    ];
  }

  /**
   * 현재 사용자의 구독 상태 확인
   */
  async getCurrentSubscription(): Promise<SubscriptionPlan | null> {
    try {
      const response = await APIService.get<SubscriptionPlan>('/subscription/current');
      return response.data || null;
    } catch (error) {
      console.error('Failed to get current subscription:', error);
      return null;
    }
  }

  /**
   * 결제 수단 목록 가져오기
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await APIService.get<PaymentMethod[]>('/payment/methods');
      return response.data || [];
    } catch (error) {
      console.error('Failed to get payment methods:', error);
      return [];
    }
  }

  /**
   * 결제 수단 추가
   */
  async addPaymentMethod(paymentData: {
    type: 'card' | 'paypal';
    cardNumber?: string;
    expiryMonth?: number;
    expiryYear?: number;
    cvc?: string;
    paypalEmail?: string;
  }): Promise<PaymentMethod | null> {
    try {
      const response = await APIService.post<PaymentMethod>('/payment/methods', paymentData);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.message || '결제 수단 추가에 실패했습니다');
    } catch (error: any) {
      console.error('Failed to add payment method:', error);
      throw error;
    }
  }

  /**
   * 구독 구매
   */
  async purchaseSubscription(options: PurchaseOptions): Promise<PurchaseResult> {
    try {
      // 결제 전 유효성 검사
      const plans = await this.getSubscriptionPlans();
      const selectedPlan = plans.find(plan => plan.planId === options.planId);
      
      if (!selectedPlan) {
        throw new Error('선택한 플랜을 찾을 수 없습니다');
      }

      // 이미 구독 중인지 확인
      const currentSubscription = await this.getCurrentSubscription();
      if (currentSubscription?.isActive) {
        throw new Error('이미 활성화된 구독이 있습니다');
      }

      // 서버에 결제 요청
      const response = await APIService.post<{
        transactionId: string;
        subscription: SubscriptionPlan;
        paymentUrl?: string;
      }>('/subscription/purchase', {
        planId: options.planId,
        paymentMethodId: options.paymentMethodId,
        couponCode: options.couponCode,
      });

      if (response.success && response.data) {
        // 외부 결제 처리가 필요한 경우 (PayPal 등)
        if (response.data.paymentUrl) {
          return await this.handleExternalPayment(response.data.paymentUrl, response.data.transactionId);
        }

        // 즉시 결제 완료
        return {
          success: true,
          transactionId: response.data.transactionId,
          subscription: response.data.subscription,
        };
      }

      throw new Error(response.message || '구독 구매에 실패했습니다');
    } catch (error: any) {
      console.error('Purchase failed:', error);
      return {
        success: false,
        error: error.message || '구독 구매 중 오류가 발생했습니다',
      };
    }
  }

  /**
   * 외부 결제 처리 (PayPal, Apple Pay 등)
   */
  private async handleExternalPayment(paymentUrl: string, transactionId: string): Promise<PurchaseResult> {
    try {
      // 실제 구현에서는 해당 결제 SDK를 사용
      Alert.alert(
        '외부 결제',
        '결제 페이지로 이동하여 결제를 완료해주세요.',
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '결제 페이지로 이동', 
            onPress: () => {
              // 실제로는 브라우저나 결제 앱을 열어야 함
              console.log('Opening payment URL:', paymentUrl);
            }
          },
        ]
      );

      // 결제 완료 확인 (실제로는 웹훅이나 폴링으로 처리)
      return await this.verifyPayment(transactionId);
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 결제 확인
   */
  private async verifyPayment(transactionId: string): Promise<PurchaseResult> {
    try {
      const response = await APIService.get<{
        subscription: SubscriptionPlan;
        status: 'completed' | 'pending' | 'failed';
      }>(`/subscription/verify/${transactionId}`);

      if (response.data?.status === 'completed') {
        return {
          success: true,
          transactionId,
          subscription: response.data.subscription,
        };
      } else if (response.data?.status === 'pending') {
        return {
          success: false,
          error: '결제 처리 중입니다. 잠시 후 다시 확인해주세요.',
        };
      } else {
        return {
          success: false,
          error: '결제가 실패했습니다.',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 구독 취소
   */
  async cancelSubscription(): Promise<boolean> {
    try {
      const currentSubscription = await this.getCurrentSubscription();
      
      if (!currentSubscription?.isActive) {
        throw new Error('활성화된 구독이 없습니다');
      }

      Alert.alert(
        '구독 취소',
        '정말로 구독을 취소하시겠습니까? 취소 후에도 현재 결제 기간이 끝날 때까지는 프리미엄 기능을 사용할 수 있습니다.',
        [
          { text: '아니오', style: 'cancel' },
          {
            text: '예, 취소합니다',
            style: 'destructive',
            onPress: async () => {
              const response = await APIService.post('/subscription/cancel');
              
              if (response.success) {
                Alert.alert('구독 취소 완료', '구독이 성공적으로 취소되었습니다.');
                return true;
              } else {
                throw new Error(response.message || '구독 취소에 실패했습니다');
              }
            },
          },
        ]
      );

      return false; // 사용자가 취소를 선택한 경우
    } catch (error: any) {
      console.error('Cancel subscription failed:', error);
      Alert.alert('오류', error.message);
      return false;
    }
  }

  /**
   * 구독 플랜 변경
   */
  async changeSubscriptionPlan(newPlanId: string): Promise<PurchaseResult> {
    try {
      const plans = await this.getSubscriptionPlans();
      const newPlan = plans.find(plan => plan.planId === newPlanId);
      
      if (!newPlan) {
        throw new Error('선택한 플랜을 찾을 수 없습니다');
      }

      const currentSubscription = await this.getCurrentSubscription();
      
      if (!currentSubscription?.isActive) {
        // 현재 구독이 없으면 새로 구매
        return await this.purchaseSubscription({ planId: newPlanId });
      }

      // 플랜 변경 요청
      const response = await APIService.post<{
        transactionId: string;
        subscription: SubscriptionPlan;
      }>('/subscription/change-plan', {
        newPlanId,
      });

      if (response.success && response.data) {
        return {
          success: true,
          transactionId: response.data.transactionId,
          subscription: response.data.subscription,
        };
      }

      throw new Error(response.message || '플랜 변경에 실패했습니다');
    } catch (error: any) {
      console.error('Change plan failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 쿠폰 코드 검증
   */
  async validateCouponCode(couponCode: string): Promise<{
    valid: boolean;
    discount?: {
      type: 'percentage' | 'fixed';
      value: number;
    };
    error?: string;
  }> {
    try {
      const response = await APIService.post<{
        valid: boolean;
        discount?: {
          type: 'percentage' | 'fixed';
          value: number;
        };
      }>('/subscription/validate-coupon', { couponCode });

      return response.data || { valid: false, error: '쿠폰 검증에 실패했습니다' };
    } catch (error: any) {
      console.error('Coupon validation failed:', error);
      return {
        valid: false,
        error: error.message || '쿠폰 검증 중 오류가 발생했습니다',
      };
    }
  }

  /**
   * 구독 이력 가져오기
   */
  async getSubscriptionHistory(): Promise<Array<{
    id: string;
    planName: string;
    amount: number;
    currency: string;
    startDate: string;
    endDate: string;
    status: 'active' | 'cancelled' | 'expired';
    transactionId: string;
  }>> {
    try {
      const response = await APIService.get('/subscription/history');
      return response.data || [];
    } catch (error) {
      console.error('Failed to get subscription history:', error);
      return [];
    }
  }

  /**
   * 사용 가능한 결제 방법 확인
   */
  getAvailablePaymentProviders(): PaymentProvider[] {
    return this.paymentProviders.filter(provider => provider.supported);
  }

  /**
   * 구독 혜택 확인
   */
  async checkSubscriptionBenefits(featureId: string): Promise<{
    hasAccess: boolean;
    isLimited: boolean;
    usageCount?: number;
    limit?: number;
    upgradeRequired?: boolean;
  }> {
    try {
      const response = await APIService.get(`/subscription/benefits/${featureId}`);
      return response.data || { hasAccess: false, isLimited: true, upgradeRequired: true };
    } catch (error) {
      console.error('Failed to check subscription benefits:', error);
      return { hasAccess: false, isLimited: true, upgradeRequired: true };
    }
  }

  /**
   * 로컬 구독 상태 캐싱
   */
  async cacheSubscriptionStatus(subscription: SubscriptionPlan | null) {
    try {
      await AsyncStorage.setItem('cachedSubscription', JSON.stringify(subscription));
    } catch (error) {
      console.error('Failed to cache subscription status:', error);
    }
  }

  /**
   * 캐시된 구독 상태 가져오기
   */
  async getCachedSubscriptionStatus(): Promise<SubscriptionPlan | null> {
    try {
      const cached = await AsyncStorage.getItem('cachedSubscription');
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Failed to get cached subscription status:', error);
      return null;
    }
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const SubscriptionService = new SubscriptionServiceClass();