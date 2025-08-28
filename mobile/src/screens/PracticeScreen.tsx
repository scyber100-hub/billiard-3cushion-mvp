import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  PanResponder,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import Svg, {
  Rect,
  Circle,
  Path,
  Line,
  G,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { Ball, ShotPath, Point, BallType, DifficultyLevel } from '../types';
import { APIService } from '../services/APIService';

const { width, height } = Dimensions.get('window');

// 당구대 비율 (실제 3쿠션 당구대: 2.84m x 1.42m = 2:1)
const TABLE_ASPECT_RATIO = 2;
const SVG_WIDTH = width - 32;
const SVG_HEIGHT = SVG_WIDTH / TABLE_ASPECT_RATIO;
const CUSHION_WIDTH = 8;
const BALL_RADIUS = 12;

interface BilliardTableProps {
  balls: Ball[];
  shotPaths: ShotPath[];
  selectedPath: string | null;
  onBallMove: (ballId: string, x: number, y: number) => void;
  onPathSelect: (pathId: string) => void;
}

const BilliardTable: React.FC<BilliardTableProps> = ({
  balls,
  shotPaths,
  selectedPath,
  onBallMove,
  onPathSelect,
}) => {
  const [dragging, setDragging] = useState<string | null>(null);

  const createPanResponder = (ballId: string) =>
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setDragging(ballId);
      },
      onPanResponderMove: (evt, gestureState) => {
        const { moveX, moveY } = gestureState;
        
        // SVG 좌표로 변환
        const svgX = Math.max(BALL_RADIUS + CUSHION_WIDTH, 
                     Math.min(SVG_WIDTH - BALL_RADIUS - CUSHION_WIDTH, moveX - 16));
        const svgY = Math.max(BALL_RADIUS + CUSHION_WIDTH,
                     Math.min(SVG_HEIGHT - BALL_RADIUS - CUSHION_WIDTH, moveY - 100));
        
        onBallMove(ballId, svgX, svgY);
      },
      onPanResponderRelease: () => {
        setDragging(null);
      },
    });

  const renderCushions = () => (
    <G>
      {/* 상단 쿠션 */}
      <Rect
        x={0}
        y={0}
        width={SVG_WIDTH}
        height={CUSHION_WIDTH}
        fill="#8B4513"
      />
      {/* 하단 쿠션 */}
      <Rect
        x={0}
        y={SVG_HEIGHT - CUSHION_WIDTH}
        width={SVG_WIDTH}
        height={CUSHION_WIDTH}
        fill="#8B4513"
      />
      {/* 좌측 쿠션 */}
      <Rect
        x={0}
        y={0}
        width={CUSHION_WIDTH}
        height={SVG_HEIGHT}
        fill="#8B4513"
      />
      {/* 우측 쿠션 */}
      <Rect
        x={SVG_WIDTH - CUSHION_WIDTH}
        y={0}
        width={CUSHION_WIDTH}
        height={SVG_HEIGHT}
        fill="#8B4513"
      />
    </G>
  );

  const renderPlayArea = () => (
    <Rect
      x={CUSHION_WIDTH}
      y={CUSHION_WIDTH}
      width={SVG_WIDTH - 2 * CUSHION_WIDTH}
      height={SVG_HEIGHT - 2 * CUSHION_WIDTH}
      fill="#0F7B0F"
    />
  );

  const renderBalls = () =>
    balls.map((ball) => {
      const panResponder = createPanResponder(ball.id);
      
      return (
        <G key={ball.id} {...panResponder.panHandlers}>
          <Circle
            cx={ball.x}
            cy={ball.y}
            r={BALL_RADIUS}
            fill={ball.color}
            stroke={dragging === ball.id ? '#FFD700' : '#333'}
            strokeWidth={dragging === ball.id ? 3 : 1}
          />
          {/* 공 번호 또는 타입 표시 */}
          <Circle
            cx={ball.x}
            cy={ball.y}
            r={6}
            fill="white"
            opacity={0.8}
          />
        </G>
      );
    });

  const renderShotPaths = () =>
    shotPaths.map((shotPath) => (
      <G key={shotPath.id}>
        {shotPath.trajectories.map((trajectory, trajIndex) =>
          trajectory.segments.map((segment, segIndex) => (
            <Line
              key={`${shotPath.id}-${trajIndex}-${segIndex}`}
              x1={segment.start.x}
              y1={segment.start.y}
              x2={segment.end.x}
              y2={segment.end.y}
              stroke={selectedPath === shotPath.id ? '#FFD700' : '#FF4444'}
              strokeWidth={selectedPath === shotPath.id ? 3 : 2}
              strokeDasharray={selectedPath === shotPath.id ? '0' : '5,5'}
              opacity={0.8}
            />
          ))
        )}
      </G>
    ));

  return (
    <View style={styles.tableContainer}>
      <Svg width={SVG_WIDTH} height={SVG_HEIGHT} style={styles.svg}>
        <Defs>
          <LinearGradient id="tableGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#0F7B0F" />
            <Stop offset="100%" stopColor="#0A5A0A" />
          </LinearGradient>
        </Defs>
        
        {renderPlayArea()}
        {renderCushions()}
        {renderShotPaths()}
        {renderBalls()}
      </Svg>
    </View>
  );
};

const PracticeScreen: React.FC = () => {
  const [balls, setBalls] = useState<Ball[]>([
    {
      id: 'cue',
      x: SVG_WIDTH * 0.2,
      y: SVG_HEIGHT * 0.5,
      radius: BALL_RADIUS,
      color: '#FFFFFF',
      type: BallType.CUE,
    },
    {
      id: 'object1',
      x: SVG_WIDTH * 0.6,
      y: SVG_HEIGHT * 0.3,
      radius: BALL_RADIUS,
      color: '#FF0000',
      type: BallType.OBJECT1,
    },
    {
      id: 'object2',
      x: SVG_WIDTH * 0.8,
      y: SVG_HEIGHT * 0.7,
      radius: BALL_RADIUS,
      color: '#FFFF00',
      type: BallType.OBJECT2,
    },
  ]);
  
  const [shotPaths, setShotPaths] = useState<ShotPath[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPathDetails, setShowPathDetails] = useState(false);
  const [practiceStats, setPracticeStats] = useState({
    attempts: 0,
    successes: 0,
    currentStreak: 0,
  });

  useEffect(() => {
    calculatePaths();
  }, [balls]);

  const calculatePaths = async () => {
    setLoading(true);
    try {
      const ballPositions = balls.map(ball => ({
        type: ball.type,
        x: ball.x / SVG_WIDTH,
        y: ball.y / SVG_HEIGHT,
      }));

      const response = await APIService.post<ShotPath[]>('/practice/calculate-paths', {
        ballPositions,
        tableWidth: SVG_WIDTH - 2 * CUSHION_WIDTH,
        tableHeight: SVG_HEIGHT - 2 * CUSHION_WIDTH,
      });

      if (response.data) {
        // SVG 좌표로 변환
        const scaledPaths = response.data.map(path => ({
          ...path,
          trajectories: path.trajectories.map(trajectory => ({
            ...trajectory,
            segments: trajectory.segments.map(segment => ({
              ...segment,
              start: {
                x: segment.start.x * (SVG_WIDTH - 2 * CUSHION_WIDTH) + CUSHION_WIDTH,
                y: segment.start.y * (SVG_HEIGHT - 2 * CUSHION_WIDTH) + CUSHION_WIDTH,
              },
              end: {
                x: segment.end.x * (SVG_WIDTH - 2 * CUSHION_WIDTH) + CUSHION_WIDTH,
                y: segment.end.y * (SVG_HEIGHT - 2 * CUSHION_WIDTH) + CUSHION_WIDTH,
              },
            })),
          })),
        }));

        setShotPaths(scaledPaths);
        if (scaledPaths.length > 0) {
          setSelectedPath(scaledPaths[0].id);
        }
      }
    } catch (error) {
      console.error('Path calculation error:', error);
      Alert.alert('오류', '경로 계산에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleBallMove = (ballId: string, x: number, y: number) => {
    setBalls(prevBalls =>
      prevBalls.map(ball =>
        ball.id === ballId ? { ...ball, x, y } : ball
      )
    );
  };

  const handlePathSelect = (pathId: string) => {
    setSelectedPath(pathId);
    setShowPathDetails(true);
  };

  const handleShotAttempt = async (success: boolean) => {
    try {
      const newStats = {
        attempts: practiceStats.attempts + 1,
        successes: success ? practiceStats.successes + 1 : practiceStats.successes,
        currentStreak: success ? practiceStats.currentStreak + 1 : 0,
      };

      setPracticeStats(newStats);

      // 서버에 연습 기록 전송
      await APIService.post('/practice/record-shot', {
        ballPositions: balls,
        selectedPathId: selectedPath,
        success,
        accuracy: success ? 85 + Math.random() * 15 : Math.random() * 50, // 임시 정확도
      });

      Alert.alert(
        success ? '성공!' : '아쉽네요',
        success 
          ? `훌륭합니다! 현재 연속 성공: ${newStats.currentStreak}회`
          : '다시 도전해보세요!'
      );
    } catch (error) {
      console.error('Shot recording error:', error);
    }
  };

  const resetBallPositions = () => {
    setBalls([
      {
        id: 'cue',
        x: SVG_WIDTH * 0.2,
        y: SVG_HEIGHT * 0.5,
        radius: BALL_RADIUS,
        color: '#FFFFFF',
        type: BallType.CUE,
      },
      {
        id: 'object1',
        x: SVG_WIDTH * 0.6 + (Math.random() - 0.5) * 100,
        y: SVG_HEIGHT * 0.3 + (Math.random() - 0.5) * 100,
        radius: BALL_RADIUS,
        color: '#FF0000',
        type: BallType.OBJECT1,
      },
      {
        id: 'object2',
        x: SVG_WIDTH * 0.8 + (Math.random() - 0.5) * 100,
        y: SVG_HEIGHT * 0.7 + (Math.random() - 0.5) * 100,
        radius: BALL_RADIUS,
        color: '#FFFF00',
        type: BallType.OBJECT2,
      },
    ]);
  };

  const selectedPathData = shotPaths.find(path => path.id === selectedPath);
  const difficultyColors = {
    [DifficultyLevel.VERY_EASY]: '#4CAF50',
    [DifficultyLevel.EASY]: '#8BC34A',
    [DifficultyLevel.MEDIUM]: '#FF9800',
    [DifficultyLevel.HARD]: '#F44336',
    [DifficultyLevel.VERY_HARD]: '#9C27B0',
    [DifficultyLevel.EXPERT]: '#000000',
  };

  return (
    <View style={styles.container}>
      {/* 상단 통계 */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{practiceStats.attempts}</Text>
          <Text style={styles.statLabel}>시도</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {practiceStats.attempts > 0 
              ? `${Math.round((practiceStats.successes / practiceStats.attempts) * 100)}%`
              : '0%'
            }
          </Text>
          <Text style={styles.statLabel}>정확도</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{practiceStats.currentStreak}</Text>
          <Text style={styles.statLabel}>연속 성공</Text>
        </View>
      </View>

      {/* 당구대 */}
      <BilliardTable
        balls={balls}
        shotPaths={shotPaths}
        selectedPath={selectedPath}
        onBallMove={handleBallMove}
        onPathSelect={handlePathSelect}
      />

      {/* 경로 선택 */}
      {shotPaths.length > 0 && (
        <ScrollView horizontal style={styles.pathSelector}>
          {shotPaths.map((path, index) => (
            <TouchableOpacity
              key={path.id}
              style={[
                styles.pathButton,
                selectedPath === path.id && styles.selectedPathButton,
                { borderColor: difficultyColors[path.difficulty] },
              ]}
              onPress={() => handlePathSelect(path.id)}
            >
              <Text style={[
                styles.pathButtonText,
                selectedPath === path.id && styles.selectedPathButtonText,
              ]}>
                경로 {index + 1}
              </Text>
              <Text style={styles.difficultyText}>
                난이도: {path.difficulty}
              </Text>
              <Text style={styles.successRateText}>
                성공률: {Math.round(path.successRate)}%
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* 하단 컨트롤 */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setShowPathDetails(true)}
          disabled={!selectedPath}
        >
          <Icon name="info" size={24} color="#fff" />
          <Text style={styles.controlButtonText}>경로 정보</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.successButton]}
          onPress={() => handleShotAttempt(true)}
        >
          <Icon name="check" size={24} color="#fff" />
          <Text style={styles.controlButtonText}>성공</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.failButton]}
          onPress={() => handleShotAttempt(false)}
        >
          <Icon name="close" size={24} color="#fff" />
          <Text style={styles.controlButtonText}>실패</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={resetBallPositions}
        >
          <Icon name="refresh" size={24} color="#fff" />
          <Text style={styles.controlButtonText}>리셋</Text>
        </TouchableOpacity>
      </View>

      {/* 경로 상세 정보 모달 */}
      <Modal
        visible={showPathDetails}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPathDetails(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>경로 상세 정보</Text>
              <TouchableOpacity
                onPress={() => setShowPathDetails(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedPathData && (
              <ScrollView>
                <Text style={styles.modalDescription}>
                  {selectedPathData.description}
                </Text>
                
                <View style={styles.pathInfo}>
                  <Text style={styles.infoLabel}>난이도:</Text>
                  <Text style={[
                    styles.infoValue,
                    { color: difficultyColors[selectedPathData.difficulty] }
                  ]}>
                    {selectedPathData.difficulty}
                  </Text>
                </View>

                <View style={styles.pathInfo}>
                  <Text style={styles.infoLabel}>성공률:</Text>
                  <Text style={styles.infoValue}>
                    {Math.round(selectedPathData.successRate)}%
                  </Text>
                </View>

                <Text style={styles.tipsTitle}>💡 팁:</Text>
                {selectedPathData.tips.map((tip, index) => (
                  <Text key={index} style={styles.tipText}>
                    • {tip}
                  </Text>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>경로 계산 중...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 16,
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  tableContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  svg: {
    borderRadius: 8,
  },
  pathSelector: {
    maxHeight: 100,
    marginTop: 16,
  },
  pathButton: {
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    minWidth: 100,
  },
  selectedPathButton: {
    backgroundColor: '#E8F5E8',
    borderColor: '#2E7D32',
  },
  pathButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  selectedPathButtonText: {
    color: '#2E7D32',
  },
  difficultyText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  successRateText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  controlButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 70,
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  failButton: {
    backgroundColor: '#F44336',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: width - 32,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    lineHeight: 24,
  },
  pathInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
    marginTop: 8,
  },
});

export default PracticeScreen;