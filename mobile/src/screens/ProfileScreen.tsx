import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { User, UserStats, Achievement, SkillLevel, SubscriptionPlan } from '../types';
import { AuthService } from '../services/AuthService';
import { APIService } from '../services/APIService';

const { width } = Dimensions.get('window');

interface ProfileSection {
  id: string;
  title: string;
  icon: string;
  onPress: () => void;
}

const ProfileScreen: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const [userResponse, statsResponse, achievementsResponse] = await Promise.allSettled([
        AuthService.getCurrentUser(),
        APIService.get<UserStats>('/user/stats'),
        APIService.get<Achievement[]>('/user/achievements'),
      ]);

      if (userResponse.status === 'fulfilled') {
        setUser(userResponse.value);
      }

      if (statsResponse.status === 'fulfilled' && statsResponse.value.data) {
        setUserStats(statsResponse.value.data);
      }

      if (achievementsResponse.status === 'fulfilled' && achievementsResponse.value.data) {
        setAchievements(achievementsResponse.value.data);
      }
    } catch (error) {
      console.error('Profile data loading error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfileData();
  };

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말로 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.logout();
              // 앱이 자동으로 로그인 화면으로 이동
            } catch (error) {
              Alert.alert('오류', '로그아웃 중 문제가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  const getSkillLevelInfo = (level: SkillLevel) => {
    const skillInfo = {
      [SkillLevel.BEGINNER]: { label: '초보자', color: '#4CAF50', progress: 20 },
      [SkillLevel.INTERMEDIATE]: { label: '중급자', color: '#FF9800', progress: 40 },
      [SkillLevel.ADVANCED]: { label: '고급자', color: '#F44336', progress: 60 },
      [SkillLevel.EXPERT]: { label: '전문가', color: '#9C27B0', progress: 80 },
      [SkillLevel.MASTER]: { label: '마스터', color: '#FFD700', progress: 100 },
    };
    return skillInfo[level] || skillInfo[SkillLevel.BEGINNER];
  };

  const renderProfileHeader = () => {
    const skillInfo = getSkillLevelInfo(user?.skillLevel || SkillLevel.BEGINNER);
    
    return (
      <LinearGradient colors={['#2E7D32', '#4CAF50']} style={styles.headerContainer}>
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Icon name="person" size={40} color="#fff" />
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <Icon name="camera-alt" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.username}>{user?.username || '사용자'}</Text>
            <Text style={styles.email}>{user?.email || ''}</Text>
            
            <View style={styles.skillContainer}>
              <View style={[styles.skillBadge, { backgroundColor: skillInfo.color }]}>
                <Text style={styles.skillText}>{skillInfo.label}</Text>
              </View>
              <Text style={styles.totalScore}>{user?.totalScore?.toLocaleString() || '0'}점</Text>
            </View>
          </View>
        </View>

        {/* 실력 진행률 */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressLabel}>실력 진행도</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${skillInfo.progress}%`, backgroundColor: skillInfo.color }]} />
          </View>
          <Text style={styles.progressText}>{skillInfo.progress}%</Text>
        </View>
      </LinearGradient>
    );
  };

  const renderStatsGrid = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>📊 나의 통계</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{userStats?.totalPracticeTime ? `${Math.floor(userStats.totalPracticeTime / 60)}시간` : '0시간'}</Text>
          <Text style={styles.statLabel}>연습 시간</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{userStats?.totalShots || 0}</Text>
          <Text style={styles.statLabel}>총 샷</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {userStats?.averageAccuracy ? `${userStats.averageAccuracy.toFixed(1)}%` : '0%'}
          </Text>
          <Text style={styles.statLabel}>평균 정확도</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{userStats?.bestStreak || 0}</Text>
          <Text style={styles.statLabel}>최고 연속</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{userStats?.challengesCompleted || 0}</Text>
          <Text style={styles.statLabel}>완료 도전과제</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>Lv.{userStats?.currentLevel || 1}</Text>
          <Text style={styles.statLabel}>현재 레벨</Text>
        </View>
      </View>
    </View>
  );

  const renderAchievements = () => (
    <View style={styles.achievementsContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🏆 업적</Text>
        <Text style={styles.achievementCount}>{achievements.length}개 달성</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {achievements.map((achievement) => (
          <View key={achievement.id} style={styles.achievementCard}>
            <Text style={styles.achievementIcon}>{achievement.icon}</Text>
            <Text style={styles.achievementName}>{achievement.name}</Text>
            <Text style={styles.achievementDate}>
              {new Date(achievement.unlockedAt).toLocaleDateString()}
            </Text>
          </View>
        ))}
        {achievements.length === 0 && (
          <View style={styles.emptyAchievements}>
            <Icon name="emoji-events" size={48} color="#ccc" />
            <Text style={styles.emptyText}>아직 달성한 업적이 없습니다</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  const renderSubscription = () => (
    <View style={styles.subscriptionContainer}>
      <Text style={styles.sectionTitle}>💎 구독</Text>
      <View style={styles.subscriptionCard}>
        <View style={styles.subscriptionInfo}>
          <Text style={styles.planName}>{user?.subscription?.name || 'Basic'}</Text>
          <Text style={styles.planPrice}>
            {user?.subscription?.isActive ? '활성화됨' : '비활성화됨'}
          </Text>
        </View>
        <TouchableOpacity style={styles.upgradeButton}>
          <Text style={styles.upgradeButtonText}>업그레이드</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const profileSections: ProfileSection[] = [
    {
      id: 'edit-profile',
      title: '프로필 수정',
      icon: 'edit',
      onPress: () => Alert.alert('준비 중', '프로필 수정 기능을 준비 중입니다.'),
    },
    {
      id: 'settings',
      title: '설정',
      icon: 'settings',
      onPress: () => Alert.alert('준비 중', '설정 기능을 준비 중입니다.'),
    },
    {
      id: 'friends',
      title: '친구',
      icon: 'people',
      onPress: () => Alert.alert('준비 중', '친구 관리 기능을 준비 중입니다.'),
    },
    {
      id: 'help',
      title: '도움말',
      icon: 'help',
      onPress: () => Alert.alert('도움말', '궁금한 점이 있으시면 support@billiard3cushion.com으로 문의해주세요.'),
    },
    {
      id: 'privacy',
      title: '개인정보 처리방침',
      icon: 'privacy-tip',
      onPress: () => Alert.alert('준비 중', '개인정보 처리방침을 준비 중입니다.'),
    },
    {
      id: 'terms',
      title: '서비스 약관',
      icon: 'description',
      onPress: () => Alert.alert('준비 중', '서비스 약관을 준비 중입니다.'),
    },
  ];

  const renderMenuSection = () => (
    <View style={styles.menuContainer}>
      {profileSections.map((section) => (
        <TouchableOpacity
          key={section.id}
          style={styles.menuItem}
          onPress={section.onPress}
          activeOpacity={0.7}
        >
          <View style={styles.menuItemLeft}>
            <Icon name={section.icon} size={24} color="#666" />
            <Text style={styles.menuItemText}>{section.title}</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#ccc" />
        </TouchableOpacity>
      ))}
      
      <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
        <View style={styles.menuItemLeft}>
          <Icon name="logout" size={24} color="#F44336" />
          <Text style={[styles.menuItemText, styles.logoutText]}>로그아웃</Text>
        </View>
        <Icon name="chevron-right" size={24} color="#F44336" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>프로필 로딩 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {renderProfileHeader()}
      {renderStatsGrid()}
      {renderAchievements()}
      {renderSubscription()}
      {renderMenuSection()}
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
  headerContainer: {
    padding: 20,
    paddingBottom: 30,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF9800',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  skillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skillBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  skillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  totalScore: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginTop: 10,
  },
  progressLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'right',
  },
  statsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  achievementsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementCount: {
    fontSize: 14,
    color: '#666',
  },
  achievementCard: {
    alignItems: 'center',
    marginRight: 16,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    width: 100,
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementDate: {
    fontSize: 10,
    color: '#666',
  },
  emptyAchievements: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width - 64,
    height: 120,
  },
  emptyText: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  subscriptionContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  subscriptionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
  },
  subscriptionInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 14,
    color: '#666',
  },
  upgradeButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  menuContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#F44336',
  },
});

export default ProfileScreen;