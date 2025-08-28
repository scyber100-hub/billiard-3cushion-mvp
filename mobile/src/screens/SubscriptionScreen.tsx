import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { 
  SubscriptionService, 
  SubscriptionOffer, 
  PaymentMethod,
  PurchaseOptions 
} from '../services/SubscriptionService';
import { SubscriptionPlan } from '../types';
import { t } from '../services/i18n';

const { width } = Dimensions.get('window');

const SubscriptionScreen: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionOffer[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionPlan | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<any>(null);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      
      const [plansData, currentSub, paymentMethodsData] = await Promise.all([
        SubscriptionService.getSubscriptionPlans(),
        SubscriptionService.getCurrentSubscription(),
        SubscriptionService.getPaymentMethods(),
      ]);

      setPlans(plansData);
      setCurrentSubscription(currentSub);
      setPaymentMethods(paymentMethodsData);
    } catch (error) {
      console.error('Failed to load subscription data:', error);
      Alert.alert('오류', '구독 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (planId: string) => {
    if (planId === 'basic' || currentSubscription?.id === planId) {
      return; // 무료 플랜이거나 이미 구독 중인 플랜
    }
    
    setSelectedPlan(planId);
    setShowPaymentModal(true);
  };

  const handlePurchase = async () => {
    if (!selectedPlan) return;
    
    try {
      setPurchasing(true);
      
      const options: PurchaseOptions = {
        planId: selectedPlan,
        couponCode: couponCode.trim() || undefined,
      };

      const result = await SubscriptionService.purchaseSubscription(options);
      
      if (result.success) {
        Alert.alert(
          '구독 완료!',
          '프리미엄 기능을 이용해보세요.',
          [
            {
              text: '확인',
              onPress: () => {
                setShowPaymentModal(false);
                setSelectedPlan(null);
                setCouponCode('');
                setCouponDiscount(null);
                loadSubscriptionData(); // 데이터 새로고침
              },
            },
          ]
        );
      } else {
        Alert.alert('구매 실패', result.error || '알 수 없는 오류가 발생했습니다.');
      }
    } catch (error: any) {
      Alert.alert('구매 실패', error.message || '구매 중 오류가 발생했습니다.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await SubscriptionService.cancelSubscription();
      loadSubscriptionData();
    } catch (error) {
      // 에러는 SubscriptionService에서 처리됨
    }
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponDiscount(null);
      return;
    }

    try {
      const result = await SubscriptionService.validateCouponCode(couponCode.trim());
      
      if (result.valid) {
        setCouponDiscount(result.discount);
        Alert.alert('쿠폰 적용', '유효한 쿠폰입니다!');
      } else {
        setCouponDiscount(null);
        Alert.alert('쿠폰 오류', result.error || '유효하지 않은 쿠폰입니다.');
      }
    } catch (error) {
      setCouponDiscount(null);
      Alert.alert('쿠폰 오류', '쿠폰 검증 중 오류가 발생했습니다.');
    }
  };

  const calculateDiscountedPrice = (originalPrice: number) => {
    if (!couponDiscount) return originalPrice;
    
    if (couponDiscount.type === 'percentage') {
      return originalPrice * (1 - couponDiscount.value / 100);
    } else {
      return Math.max(0, originalPrice - couponDiscount.value);
    }
  };

  const renderCurrentSubscription = () => {
    if (!currentSubscription || !currentSubscription.isActive) {
      return null;
    }

    const daysRemaining = Math.ceil(
      (new Date(currentSubscription.id).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return (
      <View style={styles.currentSubscriptionCard}>
        <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.currentSubGradient}>
          <View style={styles.currentSubHeader}>
            <Icon name="stars" size={32} color="#FFD700" />
            <View style={styles.currentSubInfo}>
              <Text style={styles.currentSubTitle}>현재 구독: {currentSubscription.name}</Text>
              <Text style={styles.currentSubExpiry}>
                {daysRemaining > 0 ? `${daysRemaining}일 남음` : '오늘 만료'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelSubscription}
          >
            <Text style={styles.cancelButtonText}>구독 취소</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  };

  const renderPlanCard = (plan: SubscriptionOffer) => {
    const isCurrentPlan = currentSubscription?.id === plan.planId;
    const isSelected = selectedPlan === plan.planId;
    const isFree = plan.price === 0;
    
    return (
      <TouchableOpacity
        key={plan.planId}
        style={[
          styles.planCard,
          plan.isPopular && styles.popularPlan,
          isCurrentPlan && styles.currentPlan,
          isSelected && styles.selectedPlan,
        ]}
        onPress={() => handlePlanSelect(plan.planId)}
        disabled={isCurrentPlan || isFree}
        activeOpacity={0.8}
      >
        {plan.isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>인기</Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <Text style={styles.planName}>{plan.name}</Text>
          <View style={styles.priceContainer}>
            {plan.discount && (
              <Text style={styles.originalPrice}>
                ${plan.discount.originalPrice.toFixed(2)}
              </Text>
            )}
            <Text style={styles.planPrice}>
              {isFree ? '무료' : `$${plan.price.toFixed(2)}`}
            </Text>
            {!isFree && (
              <Text style={styles.pricePeriod}>/ 월</Text>
            )}
          </View>
        </View>

        <Text style={styles.planDescription}>{plan.description}</Text>

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Icon name="check" size={16} color="#4CAF50" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.planFooter}>
          {isCurrentPlan ? (
            <View style={styles.currentPlanButton}>
              <Text style={styles.currentPlanButtonText}>현재 플랜</Text>
            </View>
          ) : (
            <View style={[
              styles.selectButton,
              plan.isPopular && styles.popularSelectButton,
              isFree && styles.freeSelectButton,
            ]}>
              <Text style={[
                styles.selectButtonText,
                plan.isPopular && styles.popularSelectButtonText,
                isFree && styles.freeSelectButtonText,
              ]}>
                {isFree ? '현재 플랜' : '선택하기'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderPaymentModal = () => {
    const selectedPlanData = plans.find(p => p.planId === selectedPlan);
    if (!selectedPlanData) return null;

    const finalPrice = calculateDiscountedPrice(selectedPlanData.price);

    return (
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>결제 정보</Text>
              <TouchableOpacity
                onPress={() => setShowPaymentModal(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.selectedPlanInfo}>
                <Text style={styles.selectedPlanName}>{selectedPlanData.name}</Text>
                <Text style={styles.selectedPlanPrice}>
                  ${finalPrice.toFixed(2)} / 월
                </Text>
                {couponDiscount && (
                  <Text style={styles.discountInfo}>
                    할인 적용: ${(selectedPlanData.price - finalPrice).toFixed(2)} 절약
                  </Text>
                )}
              </View>

              <View style={styles.couponContainer}>
                <Text style={styles.couponLabel}>쿠폰 코드 (선택사항)</Text>
                <View style={styles.couponInputContainer}>
                  <TextInput
                    style={styles.couponInput}
                    value={couponCode}
                    onChangeText={setCouponCode}
                    placeholder="쿠폰 코드 입력"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.validateCouponButton}
                    onPress={validateCoupon}
                  >
                    <Text style={styles.validateCouponButtonText}>적용</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.paymentMethodsContainer}>
                <Text style={styles.paymentMethodsTitle}>결제 방법</Text>
                {paymentMethods.length > 0 ? (
                  paymentMethods.map((method) => (
                    <TouchableOpacity
                      key={method.id}
                      style={styles.paymentMethodItem}
                    >
                      <Icon 
                        name={method.type === 'card' ? 'credit-card' : 'account-balance-wallet'} 
                        size={24} 
                        color="#666" 
                      />
                      <View style={styles.paymentMethodInfo}>
                        <Text style={styles.paymentMethodText}>
                          {method.type === 'card' ? 
                            `**** **** **** ${method.last4}` : 
                            method.type
                          }
                        </Text>
                        {method.brand && (
                          <Text style={styles.paymentMethodBrand}>{method.brand}</Text>
                        )}
                      </View>
                      {method.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>기본</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noPaymentMethods}>
                    등록된 결제 방법이 없습니다. 새 카드를 추가하세요.
                  </Text>
                )}
                
                <TouchableOpacity style={styles.addPaymentMethodButton}>
                  <Icon name="add" size={20} color="#2E7D32" />
                  <Text style={styles.addPaymentMethodText}>새 결제 방법 추가</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
                onPress={handlePurchase}
                disabled={purchasing}
              >
                <Text style={styles.purchaseButtonText}>
                  {purchasing ? '처리 중...' : `$${finalPrice.toFixed(2)} 결제하기`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>구독 정보 로딩 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>프리미엄 구독</Text>
        <Text style={styles.headerSubtitle}>
          더 많은 기능으로 당구 실력을 한 단계 끌어올리세요
        </Text>
      </View>

      {renderCurrentSubscription()}

      <View style={styles.plansContainer}>
        {plans.map(renderPlanCard)}
      </View>

      <View style={styles.benefitsContainer}>
        <Text style={styles.benefitsTitle}>🎯 프리미엄 혜택</Text>
        <View style={styles.benefitsList}>
          <View style={styles.benefitItem}>
            <Icon name="analytics" size={24} color="#2E7D32" />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>AI 맞춤 분석</Text>
              <Text style={styles.benefitDescription}>
                개인의 플레이 스타일을 분석하여 맞춤형 추천 제공
              </Text>
            </View>
          </View>
          
          <View style={styles.benefitItem}>
            <Icon name="remove-red-eye" size={24} color="#2E7D32" />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>AR 기능 무제한</Text>
              <Text style={styles.benefitDescription}>
                실제 당구대를 스캔하여 최적의 경로를 실시간으로 확인
              </Text>
            </View>
          </View>
          
          <View style={styles.benefitItem}>
            <Icon name="people" size={24} color="#2E7D32" />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>1:1 전문가 코칭</Text>
              <Text style={styles.benefitDescription}>
                프로 선수들의 노하우를 개인 맞춤형으로 전수받으세요
              </Text>
            </View>
          </View>
        </View>
      </View>

      {renderPaymentModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  currentSubscriptionCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  currentSubGradient: {
    padding: 20,
  },
  currentSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentSubInfo: {
    flex: 1,
    marginLeft: 16,
  },
  currentSubTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  currentSubExpiry: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  plansContainer: {
    padding: 16,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  popularPlan: {
    borderColor: '#FF9800',
    elevation: 8,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  currentPlan: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  selectedPlan: {
    borderColor: '#2E7D32',
    backgroundColor: '#f0f8f0',
  },
  popularBadge: {
    position: 'absolute',
    top: -1,
    right: 20,
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  originalPrice: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'line-through',
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  pricePeriod: {
    fontSize: 14,
    color: '#666',
  },
  planDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  planFooter: {
    marginTop: 'auto',
  },
  selectButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  popularSelectButton: {
    backgroundColor: '#FF9800',
  },
  freeSelectButton: {
    backgroundColor: '#e0e0e0',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  popularSelectButtonText: {
    color: '#fff',
  },
  freeSelectButtonText: {
    color: '#666',
  },
  currentPlanButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  currentPlanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  benefitsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  benefitsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  benefitsList: {
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  benefitContent: {
    flex: 1,
    marginLeft: 16,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: width - 32,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  selectedPlanInfo: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
  },
  selectedPlanName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  selectedPlanPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  discountInfo: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 4,
  },
  couponContainer: {
    marginBottom: 24,
  },
  couponLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  couponInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  validateCouponButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  validateCouponButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  paymentMethodsContainer: {
    marginBottom: 24,
  },
  paymentMethodsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodText: {
    fontSize: 16,
    color: '#333',
  },
  paymentMethodBrand: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  noPaymentMethods: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  addPaymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 2,
    borderColor: '#2E7D32',
    borderStyle: 'dashed',
    borderRadius: 8,
    marginTop: 8,
  },
  addPaymentMethodText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  purchaseButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    backgroundColor: '#ccc',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SubscriptionScreen;