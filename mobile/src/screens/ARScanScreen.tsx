import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
} from 'react-native';
import { Camera, useCameraDevices, useFrameProcessor } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Svg, {
  Rect,
  Circle,
  Path,
  Line,
  G,
  Polygon,
  Text as SvgText,
} from 'react-native-svg';

import { Ball, Point, ARSession, CameraFrame } from '../types';
import { APIService } from '../services/APIService';

const { width, height } = Dimensions.get('window');

interface TableCorner {
  x: number;
  y: number;
  detected: boolean;
}

interface DetectedBall {
  x: number;
  y: number;
  color: string;
  confidence: number;
  type: 'cue' | 'object1' | 'object2';
}

const ARScanScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [arSession, setArSession] = useState<ARSession | null>(null);
  const [tableCorners, setTableCorners] = useState<TableCorner[]>([
    { x: 0, y: 0, detected: false },
    { x: 0, y: 0, detected: false },
    { x: 0, y: 0, detected: false },
    { x: 0, y: 0, detected: false },
  ]);
  const [detectedBalls, setDetectedBalls] = useState<DetectedBall[]>([]);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [scanMode, setScanMode] = useState<'table' | 'balls'>('table');

  const devices = useCameraDevices();
  const device = devices.back;

  useEffect(() => {
    checkCameraPermission();
    return () => {
      setIsActive(false);
    };
  }, []);

  const checkCameraPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'AR 스캔 기능을 위해 카메라 권한이 필요합니다.',
            buttonNeutral: '나중에',
            buttonNegative: '취소',
            buttonPositive: '허용',
          }
        );
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        const status = await Camera.requestCameraPermission();
        setHasPermission(status === 'authorized');
      }
    } catch (error) {
      console.error('Permission error:', error);
      Alert.alert('오류', '카메라 권한을 확인할 수 없습니다.');
    }
  };

  // 프레임 처리기 - 실시간 객체 탐지
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    
    if (!isScanning) return;

    // 여기서 실제로는 ML Kit나 TensorFlow Lite를 사용하여 객체 탐지
    // 현재는 시뮬레이션된 탐지 결과 사용
    const mockDetection = () => {
      if (scanMode === 'table') {
        // 당구대 모서리 탐지 시뮬레이션
        const corners: TableCorner[] = [
          { x: 50, y: 100, detected: true },
          { x: width - 50, y: 100, detected: true },
          { x: width - 50, y: height - 200, detected: true },
          { x: 50, y: height - 200, detected: true },
        ];
        runOnJS(setTableCorners)(corners);
      } else {
        // 당구공 탐지 시뮬레이션
        const balls: DetectedBall[] = [
          {
            x: width * 0.3,
            y: height * 0.4,
            color: '#FFFFFF',
            confidence: 0.95,
            type: 'cue',
          },
          {
            x: width * 0.6,
            y: height * 0.3,
            color: '#FF0000',
            confidence: 0.87,
            type: 'object1',
          },
          {
            x: width * 0.7,
            y: height * 0.6,
            color: '#FFFF00',
            confidence: 0.92,
            type: 'object2',
          },
        ];
        runOnJS(setDetectedBalls)(balls);
      }
    };

    // 매 5프레임마다 탐지 실행 (성능 최적화)
    if (frame.timestamp % 5 === 0) {
      runOnJS(mockDetection)();
    }
  }, [isScanning, scanMode]);

  const startTableScan = () => {
    setScanMode('table');
    setIsScanning(true);
    setTableCorners(prev => prev.map(corner => ({ ...corner, detected: false })));
    
    // 3초 후 자동으로 스캔 완료
    setTimeout(() => {
      setIsScanning(false);
      checkTableCalibration();
    }, 3000);
  };

  const startBallScan = () => {
    if (!isCalibrated) {
      Alert.alert('알림', '먼저 당구대를 스캔해주세요.');
      return;
    }
    
    setScanMode('balls');
    setIsScanning(true);
    setDetectedBalls([]);
    
    // 3초 후 자동으로 스캔 완료
    setTimeout(() => {
      setIsScanning(false);
      processBallDetection();
    }, 3000);
  };

  const checkTableCalibration = () => {
    const detectedCorners = tableCorners.filter(corner => corner.detected).length;
    
    if (detectedCorners >= 4) {
      setIsCalibrated(true);
      
      // AR 세션 생성
      const session: ARSession = {
        id: Date.now().toString(),
        tableCorners: tableCorners.map(corner => ({ x: corner.x, y: corner.y })),
        ballPositions: [],
        calibrationMatrix: [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ],
        isCalibrated: true,
      };
      
      setArSession(session);
      Alert.alert('성공!', '당구대 스캔이 완료되었습니다. 이제 공을 스캔할 수 있습니다.');
    } else {
      Alert.alert('실패', '당구대의 네 모서리를 모두 감지해야 합니다. 다시 시도해주세요.');
    }
  };

  const processBallDetection = async () => {
    if (detectedBalls.length === 0) {
      Alert.alert('알림', '당구공이 감지되지 않았습니다. 다시 시도해주세요.');
      return;
    }

    try {
      // 감지된 공 위치를 정규화된 좌표로 변환
      const normalizedBalls = detectedBalls.map(ball => {
        // 카메라 좌표를 당구대 좌표계로 변환
        const tableX = (ball.x - tableCorners[0].x) / (tableCorners[1].x - tableCorners[0].x);
        const tableY = (ball.y - tableCorners[0].y) / (tableCorners[2].y - tableCorners[0].y);
        
        return {
          type: ball.type,
          x: Math.max(0, Math.min(1, tableX)),
          y: Math.max(0, Math.min(1, tableY)),
          confidence: ball.confidence,
        };
      });

      // 서버에 공 위치 전송하여 경로 계산
      const response = await APIService.post('/ar/calculate-paths', {
        arSessionId: arSession?.id,
        ballPositions: normalizedBalls,
        tableCalibration: arSession?.calibrationMatrix,
      });

      if (response.success) {
        Alert.alert(
          '스캔 완료!', 
          `${detectedBalls.length}개의 공이 감지되었습니다. 추천 경로를 확인하세요.`,
          [
            {
              text: '연습 화면으로',
              onPress: () => {
                // 연습 화면으로 이동하면서 감지된 공 위치 전달
                // navigation.navigate('Practice', { arBalls: normalizedBalls });
              },
            },
            { text: '확인', style: 'default' },
          ]
        );
      }

    } catch (error) {
      console.error('Ball processing error:', error);
      Alert.alert('오류', '공 위치 처리에 실패했습니다.');
    }
  };

  const resetCalibration = () => {
    setIsCalibrated(false);
    setArSession(null);
    setTableCorners(prev => prev.map(corner => ({ ...corner, detected: false })));
    setDetectedBalls([]);
  };

  const renderOverlay = () => (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 당구대 모서리 표시 */}
      {scanMode === 'table' && (
        <G>
          {tableCorners.map((corner, index) => (
            <G key={index}>
              <Circle
                cx={corner.x}
                cy={corner.y}
                r={corner.detected ? 15 : 10}
                fill={corner.detected ? '#4CAF50' : '#FF5722'}
                fillOpacity={0.7}
              />
              <SvgText
                x={corner.x}
                y={corner.y - 25}
                fontSize="12"
                fill="#fff"
                textAnchor="middle"
              >
                {index + 1}
              </SvgText>
            </G>
          ))}
          
          {/* 당구대 윤곽선 */}
          {tableCorners.every(corner => corner.detected) && (
            <Polygon
              points={tableCorners.map(corner => `${corner.x},${corner.y}`).join(' ')}
              fill="none"
              stroke="#4CAF50"
              strokeWidth="3"
              strokeDasharray="10,5"
            />
          )}
        </G>
      )}

      {/* 감지된 당구공 표시 */}
      {scanMode === 'balls' && detectedBalls.map((ball, index) => (
        <G key={index}>
          <Circle
            cx={ball.x}
            cy={ball.y}
            r={20}
            fill={ball.color}
            stroke="#fff"
            strokeWidth="2"
          />
          <SvgText
            x={ball.x}
            y={ball.y + 35}
            fontSize="10"
            fill="#fff"
            textAnchor="middle"
          >
            {Math.round(ball.confidence * 100)}%
          </SvgText>
        </G>
      ))}

      {/* 스캔 영역 가이드 */}
      {isScanning && (
        <G>
          <Rect
            x={20}
            y={height * 0.2}
            width={width - 40}
            height={height * 0.6}
            fill="none"
            stroke="#FFD700"
            strokeWidth="2"
            strokeDasharray="15,10"
          />
          <SvgText
            x={width / 2}
            y={height * 0.15}
            fontSize="16"
            fill="#FFD700"
            textAnchor="middle"
            fontWeight="bold"
          >
            {scanMode === 'table' ? '당구대를 화면 중앙에 맞춰주세요' : '당구공을 스캔 중입니다...'}
          </SvgText>
        </G>
      )}
    </Svg>
  );

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>카메라 권한이 필요합니다</Text>
        <TouchableOpacity style={styles.button} onPress={checkCameraPermission}>
          <Text style={styles.buttonText}>권한 요청</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>카메라를 사용할 수 없습니다</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        frameProcessor={frameProcessor}
        frameProcessorFps={30}
      />

      {showOverlay && renderOverlay()}

      {/* 상단 정보 패널 */}
      <View style={styles.topPanel}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: isCalibrated ? '#4CAF50' : '#FF5722' }]} />
          <Text style={styles.statusText}>
            {isCalibrated ? '당구대 캘리브레이션 완료' : '당구대 스캔 필요'}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.overlayToggle}
          onPress={() => setShowOverlay(!showOverlay)}
        >
          <Icon 
            name={showOverlay ? 'visibility' : 'visibility-off'} 
            size={24} 
            color="#fff" 
          />
        </TouchableOpacity>
      </View>

      {/* 하단 컨트롤 패널 */}
      <View style={styles.bottomPanel}>
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            {scanMode === 'table' 
              ? '당구대의 네 모서리가 화면에 보이도록 위치를 조정하세요'
              : '당구공들이 모두 보이도록 카메라를 조정하세요'
            }
          </Text>
        </View>

        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[styles.controlButton, !isCalibrated && styles.primaryButton]}
            onPress={startTableScan}
            disabled={isScanning}
          >
            {isScanning && scanMode === 'table' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Icon name="crop-free" size={24} color="#fff" />
            )}
            <Text style={styles.controlButtonText}>
              {isScanning && scanMode === 'table' ? '스캔 중...' : '당구대 스캔'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton, 
              isCalibrated && styles.primaryButton,
              !isCalibrated && styles.disabledButton
            ]}
            onPress={startBallScan}
            disabled={!isCalibrated || isScanning}
          >
            {isScanning && scanMode === 'balls' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Icon name="sports-tennis" size={24} color="#fff" />
            )}
            <Text style={styles.controlButtonText}>
              {isScanning && scanMode === 'balls' ? '스캔 중...' : '공 스캔'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={resetCalibration}
            disabled={isScanning}
          >
            <Icon name="refresh" size={24} color="#fff" />
            <Text style={styles.controlButtonText}>리셋</Text>
          </TouchableOpacity>
        </View>

        {/* 감지 결과 정보 */}
        {detectedBalls.length > 0 && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>감지된 공: {detectedBalls.length}개</Text>
            <View style={styles.ballList}>
              {detectedBalls.map((ball, index) => (
                <View key={index} style={styles.ballInfo}>
                  <View style={[styles.ballColor, { backgroundColor: ball.color }]} />
                  <Text style={styles.ballText}>
                    {ball.type} ({Math.round(ball.confidence * 100)}%)
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  topPanel: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  overlayToggle: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 20,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  instructionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  instructionText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(46, 125, 50, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  primaryButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
  },
  disabledButton: {
    backgroundColor: 'rgba(96, 96, 96, 0.6)',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  resultContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  resultTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  ballList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  ballInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  ballColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#fff',
  },
  ballText: {
    color: '#fff',
    fontSize: 12,
  },
});

export default ARScanScreen;