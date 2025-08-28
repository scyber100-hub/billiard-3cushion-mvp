import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Switch,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BetaTestingService, BetaFeedback, BetaUser } from '../services/BetaTestingService';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

interface FeedbackFormData {
  category: BetaFeedback['category'];
  severity: BetaFeedback['severity'];
  title: string;
  description: string;
  steps: string[];
  expectedBehavior: string;
  actualBehavior: string;
  screenshots: string[];
  tags: string[];
}

export const BetaFeedbackScreen: React.FC = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FeedbackFormData>({
    category: 'bug',
    severity: 'medium',
    title: '',
    description: '',
    steps: ['', '', ''],
    expectedBehavior: '',
    actualBehavior: '',
    screenshots: [],
    tags: [],
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [betaUser, setBetaUser] = useState<BetaUser | null>(null);
  const [myFeedbacks, setMyFeedbacks] = useState<BetaFeedback[]>([]);
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');

  useEffect(() => {
    loadBetaUserInfo();
    loadMyFeedbacks();
  }, []);

  const loadBetaUserInfo = async () => {
    const user = await BetaTestingService.getBetaUserInfo();
    setBetaUser(user);
  };

  const loadMyFeedbacks = async () => {
    const feedbacks = await BetaTestingService.getMyFeedbacks();
    setMyFeedbacks(feedbacks);
  };

  const handleCategoryChange = (category: BetaFeedback['category']) => {
    const template = BetaTestingService.createFeedbackTemplate(category);
    setFormData(prev => ({
      ...prev,
      ...template,
      title: prev.title, // 이미 입력된 제목은 유지
      description: prev.description || template.description || '',
    }));
  };

  const handleStepChange = (index: number, value: string) => {
    const newSteps = [...formData.steps];
    newSteps[index] = value;
    setFormData(prev => ({ ...prev, steps: newSteps }));
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, ''],
    }));
  };

  const removeStep = (index: number) => {
    if (formData.steps.length > 1) {
      const newSteps = formData.steps.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, steps: newSteps }));
    }
  };

  const takeScreenshot = async () => {
    try {
      const screenshotUrl = await BetaTestingService.captureScreenshot();
      if (screenshotUrl) {
        setFormData(prev => ({
          ...prev,
          screenshots: [...prev.screenshots, screenshotUrl],
        }));
        Alert.alert('성공', '스크린샷이 첨부되었습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '스크린샷 촬영에 실패했습니다.');
    }
  };

  const removeScreenshot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, i) => i !== index),
    }));
  };

  const saveDraft = async () => {
    await BetaTestingService.saveFeedbackDraft(formData);
    Alert.alert('저장됨', '피드백 초안이 저장되었습니다.');
  };

  const submitFeedback = async () => {
    if (!formData.title.trim()) {
      Alert.alert('오류', '제목을 입력해주세요.');
      return;
    }

    if (!formData.description.trim()) {
      Alert.alert('오류', '상세 설명을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await BetaTestingService.submitFeedback({
        category: formData.category,
        severity: formData.severity,
        title: formData.title,
        description: formData.description,
        steps: formData.steps.filter(step => step.trim()),
        expectedBehavior: formData.expectedBehavior || undefined,
        actualBehavior: formData.actualBehavior || undefined,
        screenshots: formData.screenshots,
        tags: [...formData.tags, formData.category],
      });

      if (result.success) {
        Alert.alert(
          '피드백 제출 완료!',
          '소중한 피드백 감사합니다. 10 포인트가 지급되었습니다.',
          [
            {
              text: '확인',
              onPress: () => {
                // 폼 초기화
                setFormData({
                  category: 'bug',
                  severity: 'medium',
                  title: '',
                  description: '',
                  steps: ['', '', ''],
                  expectedBehavior: '',
                  actualBehavior: '',
                  screenshots: [],
                  tags: [],
                });
                // 데이터 새로고침
                loadBetaUserInfo();
                loadMyFeedbacks();
              },
            },
          ]
        );
      } else {
        Alert.alert('오류', result.error || '피드백 제출에 실패했습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '피드백 제출 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderNewFeedbackForm = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 베타 사용자 정보 */}
      {betaUser && (
        <View style={styles.userInfoCard}>
          <View style={styles.userInfoHeader}>
            <Icon name="person" size={20} color="#4CAF50" />
            <Text style={styles.userName}>{betaUser.name}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Beta Tester</Text>
            </View>
          </View>
          <View style={styles.userStats}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{betaUser.feedbackCount}</Text>
              <Text style={styles.statLabel}>피드백</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{betaUser.rewardPoints}</Text>
              <Text style={styles.statLabel}>포인트</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{betaUser.testingStreak}</Text>
              <Text style={styles.statLabel}>연속일</Text>
            </View>
          </View>
        </View>
      )}

      {/* 카테고리 선택 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>피드백 유형</Text>
        <View style={styles.categoryGrid}>
          {[
            { key: 'bug', icon: 'bug-report', label: '버그 신고', color: '#F44336' },
            { key: 'feature', icon: 'lightbulb-outline', label: '기능 제안', color: '#FF9800' },
            { key: 'ui', icon: 'palette', label: 'UI/UX', color: '#9C27B0' },
            { key: 'performance', icon: 'speed', label: '성능', color: '#2196F3' },
          ].map(category => (
            <TouchableOpacity
              key={category.key}
              style={[
                styles.categoryCard,
                formData.category === category.key && { borderColor: category.color, backgroundColor: `${category.color}10` }
              ]}
              onPress={() => handleCategoryChange(category.key as BetaFeedback['category'])}
            >
              <Icon name={category.icon} size={24} color={category.color} />
              <Text style={styles.categoryLabel}>{category.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 심각도 선택 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>심각도</Text>
        <View style={styles.severityRow}>
          {[
            { key: 'low', label: '낮음', color: '#4CAF50' },
            { key: 'medium', label: '보통', color: '#FF9800' },
            { key: 'high', label: '높음', color: '#F44336' },
            { key: 'critical', label: '치명적', color: '#9C27B0' },
          ].map(severity => (
            <TouchableOpacity
              key={severity.key}
              style={[
                styles.severityButton,
                formData.severity === severity.key && { backgroundColor: severity.color }
              ]}
              onPress={() => setFormData(prev => ({ ...prev, severity: severity.key as BetaFeedback['severity'] }))}
            >
              <Text style={[
                styles.severityText,
                formData.severity === severity.key && { color: 'white' }
              ]}>
                {severity.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 제목 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>제목 *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.title}
          onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
          placeholder="피드백 제목을 간단히 작성해주세요"
          maxLength={100}
        />
      </View>

      {/* 상세 설명 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>상세 설명 *</Text>
        <TextInput
          style={[styles.textInput, styles.multilineInput]}
          value={formData.description}
          onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
          placeholder="자세한 설명을 작성해주세요"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* 고급 옵션 */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={styles.advancedToggleText}>고급 옵션</Text>
          <Icon 
            name={showAdvanced ? 'expand-less' : 'expand-more'} 
            size={24} 
            color="#666" 
          />
        </TouchableOpacity>

        {showAdvanced && (
          <View style={styles.advancedSection}>
            {/* 재현 단계 (버그인 경우만) */}
            {formData.category === 'bug' && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>재현 단계</Text>
                {formData.steps.map((step, index) => (
                  <View key={index} style={styles.stepRow}>
                    <Text style={styles.stepNumber}>{index + 1}.</Text>
                    <TextInput
                      style={[styles.textInput, styles.stepInput]}
                      value={step}
                      onChangeText={(text) => handleStepChange(index, text)}
                      placeholder={`단계 ${index + 1}`}
                    />
                    {formData.steps.length > 1 && (
                      <TouchableOpacity
                        style={styles.removeStepButton}
                        onPress={() => removeStep(index)}
                      >
                        <Icon name="close" size={20} color="#F44336" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity style={styles.addStepButton} onPress={addStep}>
                  <Icon name="add" size={20} color="#4CAF50" />
                  <Text style={styles.addStepText}>단계 추가</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 예상/실제 동작 (버그인 경우만) */}
            {formData.category === 'bug' && (
              <>
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>예상 동작</Text>
                  <TextInput
                    style={[styles.textInput, styles.multilineInput]}
                    value={formData.expectedBehavior}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, expectedBehavior: text }))}
                    placeholder="어떻게 동작해야 하는지 설명해주세요"
                    multiline
                    numberOfLines={2}
                  />
                </View>

                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>실제 동작</Text>
                  <TextInput
                    style={[styles.textInput, styles.multilineInput]}
                    value={formData.actualBehavior}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, actualBehavior: text }))}
                    placeholder="실제로 어떻게 동작하는지 설명해주세요"
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </>
            )}
          </View>
        )}
      </View>

      {/* 스크린샷 */}
      <View style={styles.section}>
        <View style={styles.screenshotHeader}>
          <Text style={styles.sectionTitle}>스크린샷</Text>
          <TouchableOpacity style={styles.takeScreenshotButton} onPress={takeScreenshot}>
            <Icon name="camera-alt" size={20} color="white" />
            <Text style={styles.buttonText}>촬영</Text>
          </TouchableOpacity>
        </View>
        
        {formData.screenshots.length > 0 && (
          <ScrollView horizontal style={styles.screenshotContainer}>
            {formData.screenshots.map((screenshot, index) => (
              <View key={index} style={styles.screenshotWrapper}>
                <Image source={{ uri: screenshot }} style={styles.screenshot} />
                <TouchableOpacity
                  style={styles.removeScreenshotButton}
                  onPress={() => removeScreenshot(index)}
                >
                  <Icon name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* 제출 버튼 */}
      <View style={styles.submitSection}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.draftButton}
            onPress={saveDraft}
            disabled={isSubmitting}
          >
            <Icon name="save" size={20} color="#666" />
            <Text style={styles.draftButtonText}>임시저장</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={submitFeedback}
            disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
          >
            {isSubmitting ? (
              <Text style={styles.submitButtonText}>제출 중...</Text>
            ) : (
              <>
                <Icon name="send" size={20} color="white" />
                <Text style={styles.submitButtonText}>피드백 제출</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderFeedbackHistory = () => (
    <ScrollView style={styles.container}>
      <Text style={styles.historyTitle}>내 피드백 내역</Text>
      {myFeedbacks.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="feedback" size={64} color="#ccc" />
          <Text style={styles.emptyText}>아직 제출한 피드백이 없습니다.</Text>
        </View>
      ) : (
        myFeedbacks.map((feedback) => (
          <View key={feedback.id} style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <View style={styles.feedbackCategory}>
                <Icon 
                  name={feedback.category === 'bug' ? 'bug-report' : 'lightbulb-outline'} 
                  size={16} 
                  color="white" 
                />
                <Text style={styles.feedbackCategoryText}>{feedback.category}</Text>
              </View>
              <Text style={[
                styles.feedbackStatus,
                { color: feedback.status === 'resolved' ? '#4CAF50' : '#FF9800' }
              ]}>
                {feedback.status}
              </Text>
            </View>
            <Text style={styles.feedbackTitle}>{feedback.title}</Text>
            <Text style={styles.feedbackDescription} numberOfLines={2}>
              {feedback.description}
            </Text>
            <Text style={styles.feedbackDate}>
              {new Date(feedback.timestamp).toLocaleDateString()}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <View style={styles.screen}>
      {/* 탭 헤더 */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'new' && styles.activeTab]}
          onPress={() => setActiveTab('new')}
        >
          <Icon name="feedback" size={20} color={activeTab === 'new' ? '#4CAF50' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'new' && styles.activeTabText]}>
            새 피드백
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Icon name="history" size={20} color={activeTab === 'history' ? '#4CAF50' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            내역
          </Text>
          {myFeedbacks.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{myFeedbacks.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 탭 내용 */}
      {activeTab === 'new' ? renderNewFeedbackForm() : renderFeedbackHistory()}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  
  // 탭 관련
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: '600',
  },

  // 사용자 정보 카드
  userInfoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },

  // 섹션
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },

  // 카테고리
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    minWidth: (width - 64) / 2,
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  categoryLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },

  // 심각도
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  severityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },

  // 입력 필드
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  multilineInput: {
    height: 100,
  },

  // 고급 옵션
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  advancedToggleText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  advancedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  subsection: {
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },

  // 단계
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    width: 24,
    fontSize: 14,
    color: '#666',
  },
  stepInput: {
    flex: 1,
    marginLeft: 8,
  },
  removeStepButton: {
    marginLeft: 8,
    padding: 4,
  },
  addStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 6,
    borderStyle: 'dashed',
  },
  addStepText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#4CAF50',
  },

  // 스크린샷
  screenshotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  takeScreenshotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  buttonText: {
    color: 'white',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  screenshotContainer: {
    flexDirection: 'row',
  },
  screenshotWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  screenshot: {
    width: 80,
    height: 120,
    borderRadius: 8,
  },
  removeScreenshotButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 제출 버튼
  submitSection: {
    marginBottom: 32,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  draftButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  draftButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    marginLeft: 4,
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // 히스토리
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  feedbackCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  feedbackCategoryText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  feedbackStatus: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  feedbackDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#999',
  },
});

export default BetaFeedbackScreen;