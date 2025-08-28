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
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { Tournament, TournamentStatus, TournamentRules } from '../types';
import { APIService } from '../services/APIService';
import { t } from '../services/i18n';

const { width } = Dimensions.get('window');

interface TournamentRegistration {
  tournamentId: string;
  userId: number;
  registeredAt: string;
  status: 'registered' | 'confirmed' | 'withdrawn';
}

interface TournamentMatch {
  id: string;
  tournamentId: string;
  round: number;
  player1Id: number;
  player2Id: number;
  player1Username: string;
  player2Username: string;
  winner?: number;
  scheduledAt: string;
  completedAt?: string;
  score?: {
    player1: number;
    player2: number;
  };
}

const TournamentScreen: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<TournamentRegistration[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [tournamentMatches, setTournamentMatches] = useState<TournamentMatch[]>([]);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'active' | 'my'>('all');

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      
      const [tournamentsResponse, registrationsResponse] = await Promise.all([
        APIService.get<Tournament[]>('/tournaments'),
        APIService.get<TournamentRegistration[]>('/tournaments/my-registrations'),
      ]);

      if (tournamentsResponse.data) {
        setTournaments(tournamentsResponse.data);
      }

      if (registrationsResponse.data) {
        setMyRegistrations(registrationsResponse.data);
      }
    } catch (error) {
      console.error('Failed to load tournaments:', error);
      Alert.alert('오류', '토너먼트 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTournaments();
  };

  const handleTournamentPress = async (tournament: Tournament) => {
    setSelectedTournament(tournament);
    
    try {
      // 토너먼트 매치 정보 로드
      const response = await APIService.get<TournamentMatch[]>(`/tournaments/${tournament.id}/matches`);
      if (response.data) {
        setTournamentMatches(response.data);
      }
    } catch (error) {
      console.error('Failed to load tournament matches:', error);
      setTournamentMatches([]);
    }
    
    setShowTournamentModal(true);
  };

  const handleTournamentRegistration = async (tournamentId: string) => {
    try {
      const response = await APIService.post(`/tournaments/${tournamentId}/register`);
      
      if (response.success) {
        Alert.alert(
          '등록 완료',
          '토너먼트에 성공적으로 등록되었습니다!',
          [
            {
              text: '확인',
              onPress: () => {
                setShowTournamentModal(false);
                loadTournaments();
              },
            },
          ]
        );
      } else {
        throw new Error(response.message || '등록에 실패했습니다');
      }
    } catch (error: any) {
      Alert.alert('등록 실패', error.message || '토너먼트 등록 중 오류가 발생했습니다.');
    }
  };

  const handleWithdraw = async (tournamentId: string) => {
    Alert.alert(
      '등록 취소',
      '정말로 토너먼트 등록을 취소하시겠습니까?',
      [
        { text: '아니오', style: 'cancel' },
        {
          text: '예, 취소합니다',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await APIService.delete(`/tournaments/${tournamentId}/register`);
              
              if (response.success) {
                Alert.alert('취소 완료', '토너먼트 등록이 취소되었습니다.');
                setShowTournamentModal(false);
                loadTournaments();
              } else {
                throw new Error(response.message || '취소에 실패했습니다');
              }
            } catch (error: any) {
              Alert.alert('취소 실패', error.message);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: TournamentStatus) => {
    switch (status) {
      case TournamentStatus.UPCOMING:
        return '#2196F3';
      case TournamentStatus.REGISTRATION:
        return '#4CAF50';
      case TournamentStatus.ACTIVE:
        return '#FF9800';
      case TournamentStatus.COMPLETED:
        return '#666';
      case TournamentStatus.CANCELLED:
        return '#F44336';
      default:
        return '#666';
    }
  };

  const getStatusText = (status: TournamentStatus) => {
    switch (status) {
      case TournamentStatus.UPCOMING:
        return '예정';
      case TournamentStatus.REGISTRATION:
        return '등록 중';
      case TournamentStatus.ACTIVE:
        return '진행 중';
      case TournamentStatus.COMPLETED:
        return '완료';
      case TournamentStatus.CANCELLED:
        return '취소';
      default:
        return '알 수 없음';
    }
  };

  const getFormatText = (format: string) => {
    switch (format) {
      case 'single_elimination':
        return '단일 토너먼트';
      case 'double_elimination':
        return '더블 토너먼트';
      case 'round_robin':
        return '라운드 로빈';
      default:
        return format;
    }
  };

  const isRegistered = (tournamentId: string) => {
    return myRegistrations.some(reg => 
      reg.tournamentId === tournamentId && 
      reg.status !== 'withdrawn'
    );
  };

  const canRegister = (tournament: Tournament) => {
    return tournament.status === TournamentStatus.REGISTRATION &&
           tournament.currentParticipants < tournament.maxParticipants &&
           !isRegistered(tournament.id);
  };

  const filteredTournaments = tournaments.filter(tournament => {
    switch (filter) {
      case 'upcoming':
        return tournament.status === TournamentStatus.UPCOMING || 
               tournament.status === TournamentStatus.REGISTRATION;
      case 'active':
        return tournament.status === TournamentStatus.ACTIVE;
      case 'my':
        return isRegistered(tournament.id);
      default:
        return true;
    }
  });

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      {[
        { key: 'all', label: '전체', count: tournaments.length },
        { 
          key: 'upcoming', 
          label: '예정', 
          count: tournaments.filter(t => 
            t.status === TournamentStatus.UPCOMING || 
            t.status === TournamentStatus.REGISTRATION
          ).length 
        },
        { 
          key: 'active', 
          label: '진행 중', 
          count: tournaments.filter(t => t.status === TournamentStatus.ACTIVE).length 
        },
        { 
          key: 'my', 
          label: '내 토너먼트', 
          count: myRegistrations.filter(r => r.status !== 'withdrawn').length 
        },
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

  const renderTournamentCard = (tournament: Tournament) => (
    <TouchableOpacity
      key={tournament.id}
      style={styles.tournamentCard}
      onPress={() => handleTournamentPress(tournament)}
      activeOpacity={0.8}
    >
      <View style={styles.tournamentHeader}>
        <View style={styles.tournamentTitle}>
          <Text style={styles.tournamentName}>{tournament.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tournament.status) }]}>
            <Text style={styles.statusText}>{getStatusText(tournament.status)}</Text>
          </View>
        </View>
        {isRegistered(tournament.id) && (
          <View style={styles.registeredBadge}>
            <Icon name="check-circle" size={20} color="#4CAF50" />
          </View>
        )}
      </View>

      <Text style={styles.tournamentDescription} numberOfLines={2}>
        {tournament.description}
      </Text>

      <View style={styles.tournamentInfo}>
        <View style={styles.infoItem}>
          <Icon name="calendar-today" size={16} color="#666" />
          <Text style={styles.infoText}>
            {new Date(tournament.startDate).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Icon name="people" size={16} color="#666" />
          <Text style={styles.infoText}>
            {tournament.currentParticipants}/{tournament.maxParticipants}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Icon name="attach-money" size={16} color="#666" />
          <Text style={styles.infoText}>
            상금: ${tournament.prizePool.toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.tournamentFooter}>
        <Text style={styles.entryFee}>
          참가비: ${tournament.entryFee === 0 ? '무료' : tournament.entryFee.toFixed(2)}
        </Text>
        <Text style={styles.format}>
          {getFormatText(tournament.rules.format)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderTournamentModal = () => {
    if (!selectedTournament) return null;

    const registered = isRegistered(selectedTournament.id);
    const canJoin = canRegister(selectedTournament);

    return (
      <Modal
        visible={showTournamentModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTournamentModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedTournament.name}</Text>
              <TouchableOpacity
                onPress={() => setShowTournamentModal(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.tournamentDetails}>
                <LinearGradient
                  colors={[getStatusColor(selectedTournament.status), getStatusColor(selectedTournament.status) + '80']}
                  style={styles.statusHeader}
                >
                  <Icon name="emoji-events" size={32} color="#fff" />
                  <Text style={styles.statusHeaderText}>
                    {getStatusText(selectedTournament.status)}
                  </Text>
                </LinearGradient>

                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>시작일</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedTournament.startDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>종료일</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedTournament.endDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>참가자</Text>
                    <Text style={styles.detailValue}>
                      {selectedTournament.currentParticipants}/{selectedTournament.maxParticipants}명
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>상금</Text>
                    <Text style={styles.detailValue}>
                      ${selectedTournament.prizePool.toLocaleString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.description}>
                  <Text style={styles.descriptionTitle}>토너먼트 설명</Text>
                  <Text style={styles.descriptionText}>
                    {selectedTournament.description}
                  </Text>
                </View>

                <View style={styles.rules}>
                  <Text style={styles.rulesTitle}>규칙</Text>
                  <View style={styles.ruleItem}>
                    <Text style={styles.ruleLabel}>형식:</Text>
                    <Text style={styles.ruleValue}>
                      {getFormatText(selectedTournament.rules.format)}
                    </Text>
                  </View>
                  <View style={styles.ruleItem}>
                    <Text style={styles.ruleLabel}>매치 형식:</Text>
                    <Text style={styles.ruleValue}>
                      {selectedTournament.rules.matchFormat === 'best_of_3' ? '3전 2승' :
                       selectedTournament.rules.matchFormat === 'best_of_5' ? '5전 3승' : '시간 제한'}
                    </Text>
                  </View>
                </View>

                {tournamentMatches.length > 0 && (
                  <View style={styles.matches}>
                    <Text style={styles.matchesTitle}>경기 일정</Text>
                    {tournamentMatches.slice(0, 5).map(match => (
                      <View key={match.id} style={styles.matchItem}>
                        <View style={styles.matchPlayers}>
                          <Text style={styles.playerName}>{match.player1Username}</Text>
                          <Text style={styles.vs}>vs</Text>
                          <Text style={styles.playerName}>{match.player2Username}</Text>
                        </View>
                        {match.score && (
                          <Text style={styles.matchScore}>
                            {match.score.player1} : {match.score.player2}
                          </Text>
                        )}
                        <Text style={styles.matchTime}>
                          {new Date(match.scheduledAt).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                    {tournamentMatches.length > 5 && (
                      <Text style={styles.moreMatches}>
                        +{tournamentMatches.length - 5}개 경기 더보기
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              {registered ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.withdrawButton]}
                  onPress={() => handleWithdraw(selectedTournament.id)}
                >
                  <Icon name="exit-to-app" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>등록 취소</Text>
                </TouchableOpacity>
              ) : canJoin ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.registerButton]}
                  onPress={() => handleTournamentRegistration(selectedTournament.id)}
                >
                  <Icon name="add" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    참가 등록 (${selectedTournament.entryFee === 0 ? '무료' : selectedTournament.entryFee.toFixed(2)})
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.actionButton, styles.disabledButton]}>
                  <Text style={styles.disabledButtonText}>
                    {selectedTournament.status === TournamentStatus.COMPLETED ? '완료된 토너먼트' :
                     selectedTournament.currentParticipants >= selectedTournament.maxParticipants ? '정원 초과' :
                     '등록 불가'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>토너먼트 로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>토너먼트</Text>
        <Text style={styles.headerSubtitle}>
          전 세계 플레이어들과 경쟁하세요
        </Text>
      </View>

      {renderFilterButtons()}

      <ScrollView
        style={styles.tournamentsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredTournaments.length > 0 ? (
          filteredTournaments.map(renderTournamentCard)
        ) : (
          <View style={styles.emptyState}>
            <Icon name="emoji-events" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {filter === 'my' 
                ? '참가한 토너먼트가 없습니다'
                : '진행 중인 토너먼트가 없습니다'
              }
            </Text>
          </View>
        )}
      </ScrollView>

      {renderTournamentModal()}
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
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
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
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  tournamentsList: {
    flex: 1,
    padding: 16,
  },
  tournamentCard: {
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
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tournamentTitle: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  registeredBadge: {
    marginLeft: 8,
  },
  tournamentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  tournamentInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  tournamentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  entryFee: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  format: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
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
  },
  modalBody: {
    maxHeight: 500,
  },
  tournamentDetails: {
    padding: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusHeaderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  detailItem: {
    width: '50%',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  description: {
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  rules: {
    marginBottom: 20,
  },
  rulesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  ruleItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  ruleLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  ruleValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  matches: {
    marginBottom: 20,
  },
  matchesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  matchItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  matchPlayers: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  vs: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 8,
  },
  matchScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 4,
  },
  matchTime: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  moreMatches: {
    fontSize: 12,
    color: '#2E7D32',
    textAlign: 'center',
    marginTop: 8,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  registerButton: {
    backgroundColor: '#2E7D32',
  },
  withdrawButton: {
    backgroundColor: '#F44336',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disabledButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

export default TournamentScreen;