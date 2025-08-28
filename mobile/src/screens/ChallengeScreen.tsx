import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { Challenge, DifficultyLevel, SkillLevel } from '../types';
import { APIService } from '../services/APIService';

const { width } = Dimensions.get('window');

const ChallengeScreen: React.FC = () => {
  const route = useRoute();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'available'>('all');

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      const response = await APIService.get<Challenge[]>('/challenges');
      if (response.data) {
        setChallenges(response.data);
      }
    } catch (error) {
      console.error('Challenges loading error:', error);
      Alert.alert('오류', '도전과제를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: DifficultyLevel) => {
    const colors = {
      [DifficultyLevel.VERY_EASY]: '#4CAF50',
      [DifficultyLevel.EASY]: '#8BC34A',
      [DifficultyLevel.MEDIUM]: '#FF9800',
      [DifficultyLevel.HARD]: '#F44336',
      [DifficultyLevel.VERY_HARD]: '#9C27B0',
      [DifficultyLevel.EXPERT]: '#000000',
    };
    return colors[difficulty];
  };

  const getDifficultyText = (difficulty: DifficultyLevel) => {
    const texts = {
      [DifficultyLevel.VERY_EASY]: '매우 쉬움',
      [DifficultyLevel.EASY]: '쉬움',
      [DifficultyLevel.MEDIUM]: '보통',
      [DifficultyLevel.HARD]: '어려움',
      [DifficultyLevel.VERY_HARD]: '매우 어려움',
      [DifficultyLevel.EXPERT]: '전문가',
    };
    return texts[difficulty];
  };

  const getSkillLevelText = (level: SkillLevel) => {
    const texts = {
      [SkillLevel.BEGINNER]: '초보자',
      [SkillLevel.INTERMEDIATE]: '중급자',
      [SkillLevel.ADVANCED]: '고급자',
      [SkillLevel.EXPERT]: '전문가',
      [SkillLevel.MASTER]: '마스터',
    };
    return texts[level];
  };

  const handleChallengePress = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setShowChallengeModal(true);
  };

  const startChallenge = async (challenge: Challenge) => {
    try {
      if (challenge.isCompleted) {
        Alert.alert('알림', '이미 완료한 도전과제입니다.');
        return;
      }

      const response = await APIService.post(`/challenges/${challenge.id}/start`);
      
      if (response.success) {
        Alert.alert(
          '도전과제 시작!',
          `${challenge.title} 도전과제를 시작합니다. 연습 화면으로 이동하세요.`,
          [
            {
              text: '연습 시작',
              onPress: () => {
                setShowChallengeModal(false);
                // Navigate to practice screen with challenge data
              },
            },
            { text: '나중에', style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      Alert.alert('오류', '도전과제를 시작할 수 없습니다.');
    }
  };

  const filteredChallenges = challenges.filter(challenge => {
    switch (filter) {
      case 'completed':
        return challenge.isCompleted;
      case 'available':
        return !challenge.isCompleted;
      default:
        return true;
    }
  });

  const completedCount = challenges.filter(c => c.isCompleted).length;
  const totalCount = challenges.length;

  const renderChallengeCard = (challenge: Challenge) => (
    <TouchableOpacity
      key={challenge.id}
      style={[
        styles.challengeCard,
        challenge.isCompleted && styles.completedCard,
      ]}
      onPress={() => handleChallengePress(challenge)}
      activeOpacity={0.8}
    >
      <View style={styles.challengeHeader}>
        <View style={styles.challengeInfo}>
          <Text style={[styles.challengeTitle, challenge.isCompleted && styles.completedTitle]}>
            {challenge.title}
          </Text>
          <Text style={styles.challengeDescription} numberOfLines={2}>
            {challenge.description}
          </Text>
        </View>
        
        <View style={styles.challengeStatus}>
          {challenge.isCompleted ? (
            <Icon name="check-circle" size={32} color="#4CAF50" />
          ) : (
            <Icon name="radio-button-unchecked" size={32} color="#ccc" />
          )}
        </View>
      </View>

      <View style={styles.challengeDetails}>
        <View style={styles.difficultyContainer}>
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(challenge.difficulty) }]}>
            <Text style={styles.difficultyText}>{getDifficultyText(challenge.difficulty)}</Text>
          </View>
          <Text style={styles.skillRequirement}>
            {getSkillLevelText(challenge.requiredLevel)} 이상
          </Text>
        </View>

        <View style={styles.rewardContainer}>
          <Icon name="stars" size={16} color="#FF9800" />
          <Text style={styles.rewardText}>{challenge.reward.points}점</Text>
          {challenge.reward.badge && (
            <>
              <Icon name="emoji-events" size={16} color="#FFD700" style={{ marginLeft: 8 }} />
              <Text style={styles.badgeText}>뱃지</Text>
            </>
          )}
        </View>
      </View>

      {challenge.bestScore && (
        <View style={styles.bestScoreContainer}>
          <Text style={styles.bestScoreLabel}>최고 점수:</Text>
          <Text style={styles.bestScoreValue}>{challenge.bestScore}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderChallengeModal = () => (
    <Modal
      visible={showChallengeModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowChallengeModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {selectedChallenge && (
            <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedChallenge.title}</Text>
                <TouchableOpacity
                  onPress={() => setShowChallengeModal(false)}
                  style={styles.closeButton}
                >
                  <Icon name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalDescription}>
                  {selectedChallenge.description}
                </Text>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>난이도:</Text>
                  <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(selectedChallenge.difficulty) }]}>
                    <Text style={styles.difficultyText}>{getDifficultyText(selectedChallenge.difficulty)}</Text>
                  </View>
                </View>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>필요 레벨:</Text>
                  <Text style={styles.modalInfoValue}>
                    {getSkillLevelText(selectedChallenge.requiredLevel)} 이상
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>보상:</Text>
                  <View style={styles.rewardContainer}>
                    <Icon name="stars" size={16} color="#FF9800" />
                    <Text style={styles.rewardText}>{selectedChallenge.reward.points}점</Text>
                    {selectedChallenge.reward.badge && (
                      <>
                        <Icon name="emoji-events" size={16} color="#FFD700" style={{ marginLeft: 8 }} />
                        <Text style={styles.badgeText}>특별 뱃지</Text>
                      </>
                    )}
                  </View>
                </View>

                {selectedChallenge.successCriteria && (
                  <View style={styles.criteriaContainer}>
                    <Text style={styles.criteriaTitle}>성공 조건:</Text>
                    {selectedChallenge.successCriteria.minAccuracy && (
                      <Text style={styles.criteriaText}>
                        • 최소 정확도: {selectedChallenge.successCriteria.minAccuracy}%
                      </Text>
                    )}
                    {selectedChallenge.successCriteria.maxAttempts && (
                      <Text style={styles.criteriaText}>
                        • 최대 시도 횟수: {selectedChallenge.successCriteria.maxAttempts}회
                      </Text>
                    )}
                    {selectedChallenge.successCriteria.timeLimit && (
                      <Text style={styles.criteriaText}>
                        • 시간 제한: {selectedChallenge.successCriteria.timeLimit}초
                      </Text>
                    )}
                    {selectedChallenge.successCriteria.consecutiveSuccesses && (
                      <Text style={styles.criteriaText}>
                        • 연속 성공: {selectedChallenge.successCriteria.consecutiveSuccesses}회
                      </Text>
                    )}
                  </View>
                )}

                {selectedChallenge.bestScore && (
                  <View style={styles.bestScoreInfo}>
                    <Text style={styles.bestScoreInfoLabel}>나의 최고 기록</Text>
                    <Text style={styles.bestScoreInfoValue}>{selectedChallenge.bestScore}</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                {selectedChallenge.isCompleted ? (
                  <View style={styles.completedButton}>
                    <Icon name="check-circle" size={20} color="#4CAF50" />
                    <Text style={styles.completedButtonText}>완료됨</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.startButton}
                    onPress={() => startChallenge(selectedChallenge)}
                  >
                    <Icon name="play-arrow" size={20} color="#fff" />
                    <Text style={styles.startButtonText}>도전 시작</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      {[
        { key: 'all', label: '전체', count: totalCount },
        { key: 'available', label: '진행 가능', count: totalCount - completedCount },
        { key: 'completed', label: '완료', count: completedCount },
      ].map(({ key, label, count }) => (
        <TouchableOpacity
          key={key}
          style={[styles.filterButton, filter === key && styles.activeFilterButton]}
          onPress={() => setFilter(key as typeof filter)}
        >
          <Text style={[styles.filterButtonText, filter === key && styles.activeFilterButtonText]}>
            {label} ({count})
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>도전과제 로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>도전과제</Text>
        <Text style={styles.headerSubtitle}>
          {completedCount}/{totalCount} 완료
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }
            ]} 
          />
        </View>
      </View>

      {renderFilterButtons()}

      <ScrollView style={styles.challengesList}>
        {filteredChallenges.map(renderChallengeCard)}
        
        {filteredChallenges.length === 0 && (
          <View style={styles.emptyChallenges}>
            <Icon name="emoji-events" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {filter === 'completed' 
                ? '아직 완료한 도전과제가 없습니다'
                : filter === 'available'
                ? '현재 진행 가능한 도전과제가 없습니다'
                : '도전과제가 없습니다'
              }
            </Text>
          </View>
        )}
      </ScrollView>

      {renderChallengeModal()}
    </View>
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
  headerContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  activeFilterButton: {
    backgroundColor: '#2E7D32',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  challengesList: {
    flex: 1,
    padding: 16,
  },
  challengeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedCard: {
    backgroundColor: '#f8f8f8',
    opacity: 0.8,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  challengeDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  challengeStatus: {
    marginLeft: 12,
  },
  challengeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  skillRequirement: {
    fontSize: 12,
    color: '#666',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
    marginLeft: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#FFD700',
    marginLeft: 4,
  },
  bestScoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  bestScoreLabel: {
    fontSize: 12,
    color: '#666',
  },
  bestScoreValue: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },
  emptyChallenges: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 16,
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
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalDescription: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 20,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalInfoLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
    marginRight: 12,
  },
  modalInfoValue: {
    fontSize: 14,
    color: '#333',
  },
  criteriaContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  criteriaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  criteriaText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  bestScoreInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    alignItems: 'center',
  },
  bestScoreInfoLabel: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 4,
  },
  bestScoreInfoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  completedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    paddingVertical: 16,
    borderRadius: 12,
  },
  completedButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ChallengeScreen;