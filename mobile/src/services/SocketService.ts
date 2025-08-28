import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  MultiplayerSession, 
  Player, 
  GameState, 
  DifficultyLevel,
  Ball,
  User 
} from '../types';

export interface SocketEvents {
  // 연결 관련
  authenticated: (data: { success: boolean }) => void;
  disconnect: (reason: string) => void;
  
  // 매칭 관련
  matchmaking_started: (data: { difficulty: DifficultyLevel }) => void;
  match_found: (data: { sessionId: string; session: MultiplayerSession }) => void;
  matchmaking_cancelled: () => void;
  matchmaking_error: (data: { message: string }) => void;
  
  // 세션 관련
  session_created: (data: { sessionId: string; session: MultiplayerSession }) => void;
  player_joined: (data: { player: Player; session: MultiplayerSession }) => void;
  player_left: (data: { userId: number; session: MultiplayerSession }) => void;
  player_ready_changed: (data: { userId: number; isReady: boolean; session: MultiplayerSession }) => void;
  join_error: (data: { message: string }) => void;
  
  // 게임 관련
  game_started: (data: { session: MultiplayerSession }) => void;
  turn_started: (data: { currentPlayer: number; gameState: GameState; ballSetup: Ball[] }) => void;
  turn_completed: (data: { playerId: number; result: any; newScore: number }) => void;
  turn_timeout: () => void;
  time_warning: (data: { timeRemaining: number }) => void;
  opponent_shot: (data: { playerId: number; shotData: any }) => void;
  game_ended: (data: { winner: number; finalScores: Player[]; reason: string }) => void;
  player_forfeited: (data: { playerId: number; username: string }) => void;
  
  // 채팅 관련
  chat_message: (data: { playerId: number; username: string; message: string; timestamp: string }) => void;
  
  // 에러 관련
  start_game_error: (data: { message: string }) => void;
  shot_error: (data: { message: string }) => void;
}

export type SocketEventName = keyof SocketEvents;

class SocketServiceClass {
  private socket: Socket | null = null;
  private currentUser: User | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * 소켓 연결
   */
  async connect(user: User): Promise<boolean> {
    try {
      const serverUrl = __DEV__ 
        ? 'http://localhost:3001' 
        : 'https://api.billiard3cushion.com';

      this.socket = io(serverUrl, {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 10000,
      });

      this.currentUser = user;
      this.setupSocketEventHandlers();

      // 연결 시작
      this.socket.connect();

      // 연결 완료 대기
      return new Promise((resolve) => {
        this.socket!.on('connect', () => {
          console.log('Socket connected:', this.socket!.id);
          
          // 사용자 인증
          this.socket!.emit('authenticate', {
            userId: user.id,
            username: user.username,
          });
          
          this.socket!.once('authenticated', (data) => {
            if (data.success) {
              this.reconnectAttempts = 0;
              resolve(true);
            } else {
              resolve(false);
            }
          });
        });

        this.socket!.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          resolve(false);
        });
      });

    } catch (error) {
      console.error('Socket connection failed:', error);
      return false;
    }
  }

  /**
   * 소켓 연결 해제
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentUser = null;
      this.eventListeners.clear();
      console.log('Socket disconnected');
    }
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners() {
    // 기본 이벤트 핸들러들을 여기에 등록
  }

  /**
   * 소켓 이벤트 핸들러 설정
   */
  private setupSocketEventHandlers() {
    if (!this.socket) return;

    // 연결 상태 관련
    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.emit('disconnect', reason);
      
      if (reason === 'io server disconnect') {
        // 서버가 연결을 끊은 경우 재연결 시도
        this.handleReconnect();
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
      this.reconnectAttempts++;
    });

    // 매칭 관련 이벤트
    this.socket.on('matchmaking_started', (data) => this.emit('matchmaking_started', data));
    this.socket.on('match_found', (data) => this.emit('match_found', data));
    this.socket.on('matchmaking_cancelled', () => this.emit('matchmaking_cancelled'));
    this.socket.on('matchmaking_error', (data) => this.emit('matchmaking_error', data));

    // 세션 관련 이벤트
    this.socket.on('session_created', (data) => this.emit('session_created', data));
    this.socket.on('player_joined', (data) => this.emit('player_joined', data));
    this.socket.on('player_left', (data) => this.emit('player_left', data));
    this.socket.on('player_ready_changed', (data) => this.emit('player_ready_changed', data));
    this.socket.on('join_error', (data) => this.emit('join_error', data));

    // 게임 관련 이벤트
    this.socket.on('game_started', (data) => this.emit('game_started', data));
    this.socket.on('turn_started', (data) => this.emit('turn_started', data));
    this.socket.on('turn_completed', (data) => this.emit('turn_completed', data));
    this.socket.on('turn_timeout', () => this.emit('turn_timeout'));
    this.socket.on('time_warning', (data) => this.emit('time_warning', data));
    this.socket.on('opponent_shot', (data) => this.emit('opponent_shot', data));
    this.socket.on('game_ended', (data) => this.emit('game_ended', data));
    this.socket.on('player_forfeited', (data) => this.emit('player_forfeited', data));

    // 채팅 관련 이벤트
    this.socket.on('chat_message', (data) => this.emit('chat_message', data));

    // 에러 관련 이벤트
    this.socket.on('start_game_error', (data) => this.emit('start_game_error', data));
    this.socket.on('shot_error', (data) => this.emit('shot_error', data));
  }

  /**
   * 재연결 처리
   */
  private async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    if (this.currentUser) {
      console.log(`Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      
      setTimeout(async () => {
        this.reconnectAttempts++;
        await this.connect(this.currentUser!);
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts)); // Exponential backoff
    }
  }

  /**
   * 빠른 매칭 시작
   */
  startMatchmaking(difficulty: DifficultyLevel) {
    if (!this.socket || !this.isConnected()) {
      throw new Error('소켓이 연결되지 않았습니다.');
    }

    this.socket.emit('start_matchmaking', { difficulty });
  }

  /**
   * 매칭 취소
   */
  cancelMatchmaking() {
    if (!this.socket || !this.isConnected()) return;
    this.socket.emit('cancel_matchmaking');
  }

  /**
   * 게임 세션 생성
   */
  createSession(settings: {
    maxPlayers: number;
    difficulty: DifficultyLevel;
    timeLimit?: number;
  }) {
    if (!this.socket || !this.isConnected()) {
      throw new Error('소켓이 연결되지 않았습니다.');
    }

    this.socket.emit('create_session', {
      ...settings,
      gameMode: 'real_time',
    });
  }

  /**
   * 게임 세션 참가
   */
  joinSession(sessionId: string) {
    if (!this.socket || !this.isConnected()) {
      throw new Error('소켓이 연결되지 않았습니다.');
    }

    this.socket.emit('join_session', sessionId);
  }

  /**
   * 게임 세션 떠나기
   */
  leaveSession() {
    if (!this.socket || !this.isConnected()) return;
    this.socket.emit('leave_session');
  }

  /**
   * 준비 상태 토글
   */
  toggleReady() {
    if (!this.socket || !this.isConnected()) return;
    this.socket.emit('toggle_ready');
  }

  /**
   * 게임 시작
   */
  startGame() {
    if (!this.socket || !this.isConnected()) return;
    this.socket.emit('start_game');
  }

  /**
   * 샷 실행
   */
  makeShot(shotData: {
    ballPositions: Ball[];
    selectedPath: string;
    power: number;
  }) {
    if (!this.socket || !this.isConnected()) return;
    this.socket.emit('make_shot', shotData);
  }

  /**
   * 턴 종료
   */
  endTurn(result: {
    success: boolean;
    score: number;
    accuracy: number;
  }) {
    if (!this.socket || !this.isConnected()) return;
    this.socket.emit('end_turn', result);
  }

  /**
   * 채팅 메시지 전송
   */
  sendMessage(message: string) {
    if (!this.socket || !this.isConnected() || !message.trim()) return;
    this.socket.emit('send_message', message.trim());
  }

  /**
   * 게임 포기
   */
  forfeitGame() {
    if (!this.socket || !this.isConnected()) return;
    this.socket.emit('forfeit_game');
  }

  /**
   * 이벤트 리스너 등록
   */
  on<T extends SocketEventName>(eventName: T, callback: SocketEvents[T]) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName)!.push(callback);
  }

  /**
   * 이벤트 리스너 제거
   */
  off<T extends SocketEventName>(eventName: T, callback?: SocketEvents[T]) {
    const listeners = this.eventListeners.get(eventName);
    if (!listeners) return;

    if (callback) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    } else {
      // 콜백이 없으면 모든 리스너 제거
      listeners.length = 0;
    }
  }

  /**
   * 이벤트 발생
   */
  private emit(eventName: string, ...args: any[]) {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in socket event listener for ${eventName}:`, error);
        }
      });
    }
  }

  /**
   * 현재 사용자 정보 반환
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * 연결 상태 진단
   */
  getDiagnostics() {
    return {
      connected: this.isConnected(),
      socketId: this.socket?.id,
      currentUser: this.currentUser?.username,
      reconnectAttempts: this.reconnectAttempts,
      eventListeners: Array.from(this.eventListeners.entries()).map(([event, listeners]) => ({
        event,
        listenerCount: listeners.length,
      })),
    };
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const SocketService = new SocketServiceClass();

// 타입 정의 내보내기
export type { SocketEvents };