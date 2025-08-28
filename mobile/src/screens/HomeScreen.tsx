import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { User, UserStats, Challenge, LeaderboardEntry } from '../types';
import { APIService } from '../services/APIService';
import { AuthService } from '../services/AuthService';

const { width } = Dimensions.get('window');

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  action: () => void;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [dailyChallenges, setDailyChallenges] = useState<Challenge[]>([]);
  const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      
      // 병렬로 데이터 로드
      const [userResponse, statsResponse, challengesResponse, leaderboardResponse] = 
        await Promise.allSettled([
          AuthService.getCurrentUser(),
          APIService.get<UserStats>('/user/stats'),
          APIService.get<Challenge[]>('/challenges/daily'),
          APIService.get<LeaderboardEntry[]>('/leaderboard/top?limit=5'),
        ]);

      // 사용자 정보
      if (userResponse.status === 'fulfilled') {
        setUser(userResponse.value);
      }

      // 사용자 통계
      if (statsResponse.status === 'fulfilled' && statsResponse.value.data) {
        setUserStats(statsResponse.value.data);
      }

      // 일일 도전과제
      if (challengesResponse.status === 'fulfilled' && challengesResponse.value.data) {
        setDailyChallenges(challengesResponse.value.data.slice(0, 3));
      }

      // 리더보드
      if (leaderboardResponse.status === 'fulfilled' && leaderboardResponse.value.data) {
        setTopPlayers(leaderboardResponse.value.data);
      }

    } catch (error) {
      console.error('Home data loading error:', error);
      Alert.alert('오류', '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeData();
  };

  const quickActions: QuickAction[] = [
    {
      id: 'practice',
      title: '연습하기',
      icon: 'sports-tennis',
      color: '#4CAF50',
      action: () => navigation.navigate('Practice' as never),
    },
    {
      id: 'challenge',
      title: '도전과제',
      icon: 'emoji-events',
      color: '#FF9800',
      action: () => navigation.navigate('Challenge' as never, { challengeId: 'daily' } as never),
    },
    {
      id: 'ar-scan',
      title: 'AR 스캔',
      icon: 'camera-alt',
      color: '#2196F3',
      action: () => navigation.navigate('AR Scan' as never),
    },
    {
      id: 'leaderboard',
      title: '리더보드',
      icon: 'leaderboard',
      color: '#9C27B0',
      action: () => navigation.navigate('Leaderboard' as never, { period: 'weekly' } as never),
    },
  ];

  const renderWelcomeCard = () => (
    <LinearGradient
      colors={['#2E7D32', '#4CAF50']}
      style={styles.welcomeCard}
    >
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeTitle}>안녕하세요!</Text>
        <Text style={styles.welcomeName}>{user?.username || '당구 마스터'}님</Text>
        <Text style={styles.welcomeSubtitle}>
          오늘도 3쿠션 실력 향상을 위해 연습해보세요
        </Text>
      </View>
      <Icon name="sports-tennis" size={60} color="rgba(255,255,255,0.3)" />
    </LinearGradient>
  );

  const renderStatsCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>나의 통계</Text>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userStats?.totalShots || 0}</Text>
          <Text style={styles.statLabel}>총 샷</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {userStats?.averageAccuracy ? `${userStats.averageAccuracy.toFixed(1)}%` : '0%'}
          </Text>
          <Text style={styles.statLabel}>평균 정확도</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userStats?.bestStreak || 0}</Text>
          <Text style={styles.statLabel}>최고 연속</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {userStats?.totalPracticeTime ? `${Math.floor(userStats.totalPracticeTime / 60)}분` : '0분'}
          </Text>
          <Text style={styles.statLabel}>연습 시간</Text>
        </View>
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>빠른 시작</Text>
      <View style={styles.quickActionsContainer}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.quickActionItem, { backgroundColor: action.color }]}
            onPress={action.action}
            activeOpacity={0.8}
          >
            <Icon name={action.icon} size={32} color="#fff" />
            <Text style={styles.quickActionText}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDailyChallenges = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>오늘의 도전과제</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Challenge' as never, { challengeId: 'all' } as never)}
        >
          <Text style={styles.seeAllText}>전체보기</Text>
        </TouchableOpacity>
      </View>
      {dailyChallenges.length > 0 ? (
        dailyChallenges.map((challenge) => (
          <TouchableOpacity
            key={challenge.id}
            style={styles.challengeItem}
            onPress={() => navigation.navigate('Challenge' as never, { challengeId: challenge.id } as never)}
          >
            <View style={styles.challengeContent}>
              <Text style={styles.challengeTitle}>{challenge.title}</Text>
              <Text style={styles.challengeDescription} numberOfLines={2}>
                {challenge.description}
              </Text>
            </View>
            <View style={styles.challengeReward}>
              <Icon name="stars" size={16} color="#FF9800" />
              <Text style={styles.rewardText}>{challenge.reward.points}p</Text>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Icon name="check-circle" size={48} color="#4CAF50" />
          <Text style={styles.emptyText}>오늘의 모든 도전과제를 완료했습니다!</Text>
        </View>
      )}
    </View>
  );

  const renderLeaderboard = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>이번 주 톱 플레이어</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Leaderboard' as never, { period: 'weekly' } as never)}
        >
          <Text style={styles.seeAllText}>전체보기</Text>
        </TouchableOpacity>
      </View>
      {topPlayers.map((entry, index) => (
        <View key={entry.user.id} style={styles.leaderboardItem}>
          <View style={styles.rankContainer}>
            <Text style={[styles.rankText, index < 3 && styles.topRankText]}>
              {entry.rank}
            </Text>
            {index < 3 && (
              <Icon 
                name={index === 0 ? 'emoji-events' : 'military-tech'} 
                size={16} 
                color={index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'} 
              />
            )}
          </View>
          <Text style={styles.playerName}>{entry.user.username}</Text>
          <Text style={styles.playerScore}>{entry.score.toLocaleString()}점</Text>
        </View>
      ))}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>로딩 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {renderWelcomeCard()}
      {renderStatsCard()}
      {renderQuickActions()}
      {renderDailyChallenges()}
      {renderLeaderboard()}
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
  welcomeCard: {
    margin: 16,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
  },
  welcomeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    width: (width - 64) / 2,
    aspectRatio: 1.5,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  challengeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  challengeContent: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#666',
  },
  challengeReward: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
    marginLeft: 4,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 40,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginRight: 4,
  },
  topRankText: {
    color: '#2E7D32',
  },
  playerName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  playerScore: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default HomeScreen;