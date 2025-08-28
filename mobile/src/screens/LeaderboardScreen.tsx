import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

import { LeaderboardEntry, LeaderboardPeriod, User } from '../types';
import { APIService } from '../services/APIService';
import { AuthService } from '../services/AuthService';

const { width } = Dimensions.get('window');

const LeaderboardScreen: React.FC = () => {
  const route = useRoute();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardPeriod>(LeaderboardPeriod.WEEKLY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCurrentUser();
    loadLeaderboard();
  }, [selectedPeriod]);

  const loadCurrentUser = async () => {
    try {
      const user = await AuthService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Current user loading error:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await APIService.get<{
        entries: LeaderboardEntry[];
        userRank?: number;
      }>(`/leaderboard/${selectedPeriod}`);

      if (response.data) {
        setLeaderboard(response.data.entries);
        setUserRank(response.data.userRank || null);
      }
    } catch (error) {
      console.error('Leaderboard loading error:', error);
      Alert.alert('오류', '리더보드를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaderboard();
  };

  const getPeriodText = (period: LeaderboardPeriod) => {
    const texts = {
      [LeaderboardPeriod.DAILY]: '일간',
      [LeaderboardPeriod.WEEKLY]: '주간',
      [LeaderboardPeriod.MONTHLY]: '월간',
      [LeaderboardPeriod.ALL_TIME]: '전체',
    };
    return texts[period];
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return { name: 'emoji-events', color: '#FFD700' };
      case 2:
        return { name: 'military-tech', color: '#C0C0C0' };
      case 3:
        return { name: 'military-tech', color: '#CD7F32' };
      default:
        return null;
    }
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) {
      return { name: 'trending-up', color: '#4CAF50' };
    } else if (change < 0) {
      return { name: 'trending-down', color: '#F44336' };
    } else {
      return { name: 'trending-flat', color: '#666' };
    }
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {Object.values(LeaderboardPeriod).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.activePeriodButton,
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.activePeriodButtonText,
            ]}
          >
            {getPeriodText(period)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTopThree = () => {
    const topThree = leaderboard.slice(0, 3);
    
    return (
      <View style={styles.topThreeContainer}>
        {topThree.length >= 2 && (
          <View style={styles.secondPlace}>
            <View style={styles.podiumAvatar}>
              <Icon name="person" size={32} color="#fff" />
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>
              {topThree[1].user.username}
            </Text>
            <Text style={styles.podiumScore}>
              {topThree[1].score.toLocaleString()}
            </Text>
            <View style={[styles.podium, styles.silverPodium]}>
              <Icon name="military-tech" size={20} color="#C0C0C0" />
              <Text style={styles.podiumRank}>2</Text>
            </View>
          </View>
        )}

        {topThree.length >= 1 && (
          <View style={styles.firstPlace}>
            <View style={[styles.podiumAvatar, styles.goldAvatar]}>
              <Icon name="person" size={40} color="#fff" />
              <View style={styles.crownIcon}>
                <Icon name="emoji-events" size={24} color="#FFD700" />
              </View>
            </View>
            <Text style={[styles.podiumName, styles.goldName]} numberOfLines={1}>
              {topThree[0].user.username}
            </Text>
            <Text style={[styles.podiumScore, styles.goldScore]}>
              {topThree[0].score.toLocaleString()}
            </Text>
            <View style={[styles.podium, styles.goldPodium]}>
              <Icon name="emoji-events" size={24} color="#FFD700" />
              <Text style={styles.podiumRank}>1</Text>
            </View>
          </View>
        )}

        {topThree.length >= 3 && (
          <View style={styles.thirdPlace}>
            <View style={styles.podiumAvatar}>
              <Icon name="person" size={32} color="#fff" />
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>
              {topThree[2].user.username}
            </Text>
            <Text style={styles.podiumScore}>
              {topThree[2].score.toLocaleString()}
            </Text>
            <View style={[styles.podium, styles.bronzePodium]}>
              <Icon name="military-tech" size={20} color="#CD7F32" />
              <Text style={styles.podiumRank}>3</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderUserRankCard = () => {
    if (!userRank || !currentUser) return null;

    return (
      <View style={styles.userRankCard}>
        <LinearGradient colors={['#2E7D32', '#4CAF50']} style={styles.userRankGradient}>
          <View style={styles.userRankInfo}>
            <Text style={styles.userRankLabel}>나의 순위</Text>
            <View style={styles.userRankRow}>
              <Text style={styles.userRankPosition}>#{userRank}</Text>
              <Text style={styles.userRankName}>{currentUser.username}</Text>
              <Text style={styles.userRankScore}>
                {currentUser.totalScore.toLocaleString()}점
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderLeaderboardList = () => {
    const listEntries = leaderboard.slice(3); // 상위 3명 제외

    return (
      <View style={styles.leaderboardList}>
        <Text style={styles.listTitle}>전체 순위</Text>
        
        {listEntries.map((entry) => {
          const rankIcon = getRankIcon(entry.rank);
          const changeIcon = getChangeIcon(entry.change);
          
          return (
            <View
              key={entry.user.id}
              style={[
                styles.leaderboardItem,
                currentUser?.id === entry.user.id && styles.currentUserItem,
              ]}
            >
              <View style={styles.rankContainer}>
                <Text
                  style={[
                    styles.rankText,
                    currentUser?.id === entry.user.id && styles.currentUserRankText,
                  ]}
                >
                  {entry.rank}
                </Text>
                {rankIcon && (
                  <Icon
                    name={rankIcon.name}
                    size={16}
                    color={rankIcon.color}
                    style={styles.rankIcon}
                  />
                )}
              </View>

              <View style={styles.userAvatar}>
                <Icon name="person" size={24} color="#fff" />
              </View>

              <View style={styles.userInfoContainer}>
                <Text
                  style={[
                    styles.userName,
                    currentUser?.id === entry.user.id && styles.currentUserName,
                  ]}
                  numberOfLines={1}
                >
                  {entry.user.username}
                </Text>
                <Text style={styles.userLevel}>
                  Lv.{/* entry.user.level || */1}
                </Text>
              </View>

              <View style={styles.scoreContainer}>
                <Text
                  style={[
                    styles.scoreText,
                    currentUser?.id === entry.user.id && styles.currentUserScore,
                  ]}
                >
                  {entry.score.toLocaleString()}
                </Text>
                {entry.change !== 0 && (
                  <View style={styles.changeContainer}>
                    <Icon
                      name={changeIcon.name}
                      size={12}
                      color={changeIcon.color}
                    />
                    <Text style={[styles.changeText, { color: changeIcon.color }]}>
                      {Math.abs(entry.change)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {listEntries.length === 0 && (
          <View style={styles.emptyLeaderboard}>
            <Icon name="leaderboard" size={64} color="#ccc" />
            <Text style={styles.emptyText}>아직 순위 데이터가 없습니다</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>리더보드 로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderPeriodSelector()}
      
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {leaderboard.length > 0 && renderTopThree()}
        {renderUserRankCard()}
        {renderLeaderboardList()}
      </ScrollView>
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
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  activePeriodButton: {
    backgroundColor: '#2E7D32',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activePeriodButtonText: {
    color: '#fff',
  },
  topThreeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingTop: 32,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  firstPlace: {
    alignItems: 'center',
    marginHorizontal: 12,
  },
  secondPlace: {
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 20,
  },
  thirdPlace: {
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 40,
  },
  podiumAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  goldAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF9800',
  },
  crownIcon: {
    position: 'absolute',
    top: -12,
    right: -8,
  },
  podiumName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
    maxWidth: 80,
  },
  goldName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  podiumScore: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  goldScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  podium: {
    width: 60,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  goldPodium: {
    width: 80,
    height: 50,
    backgroundColor: '#FFD700',
  },
  silverPodium: {
    backgroundColor: '#C0C0C0',
  },
  bronzePodium: {
    backgroundColor: '#CD7F32',
  },
  podiumRank: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  userRankCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  userRankGradient: {
    padding: 16,
  },
  userRankInfo: {
    alignItems: 'center',
  },
  userRankLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  userRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userRankPosition: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 12,
  },
  userRankName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  userRankScore: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  leaderboardList: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  currentUserItem: {
    backgroundColor: '#E8F5E8',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  rankContainer: {
    width: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    width: 24,
    textAlign: 'center',
  },
  currentUserRankText: {
    color: '#2E7D32',
  },
  rankIcon: {
    marginLeft: 4,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  userInfoContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  currentUserName: {
    color: '#2E7D32',
  },
  userLevel: {
    fontSize: 12,
    color: '#666',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  currentUserScore: {
    color: '#2E7D32',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  changeText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  emptyLeaderboard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default LeaderboardScreen;