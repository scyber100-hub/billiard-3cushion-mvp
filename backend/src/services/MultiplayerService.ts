import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { 
  MultiplayerSession, 
  Player, 
  GameState, 
  GameSettings, 
  GameMode, 
  DifficultyLevel,
  Ball,
  Shot 
} from '../types';

export interface SocketData {
  userId: number;
  username: string;
  currentSessionId?: string;
}

export class MultiplayerService {
  private io: SocketIOServer;
  private sessions: Map<string, MultiplayerSession> = new Map();
  private userSockets: Map<number, Socket> = new Map();
  private matchmakingQueue: Map<DifficultyLevel, number[]> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.initializeSocketHandlers();
    this.initializeMatchmakingQueue();
  }

  private initializeMatchmakingQueue() {
    Object.values(DifficultyLevel).forEach(difficulty => {
      if (typeof difficulty === 'number') {
        this.matchmakingQueue.set(difficulty, []);
      }
    });
  }

  private initializeSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // 사용자 인증
      socket.on('authenticate', (data: { userId: number; username: string }) => {
        socket.data = {
          userId: data.userId,
          username: data.username
        } as SocketData;

        this.userSockets.set(data.userId, socket);
        console.log(`User authenticated: ${data.username} (${data.userId})`);

        // 사용자에게 현재 상태 전송
        socket.emit('authenticated', { success: true });
      });

      // 빠른 매칭 시작
      socket.on('start_matchmaking', (data: { difficulty: DifficultyLevel }) => {
        this.handleStartMatchmaking(socket, data.difficulty);
      });

      // 매칭 취소
      socket.on('cancel_matchmaking', () => {
        this.handleCancelMatchmaking(socket);
      });

      // 게임 세션 생성
      socket.on('create_session', (settings: GameSettings) => {
        this.handleCreateSession(socket, settings);
      });

      // 게임 세션 참가
      socket.on('join_session', (sessionId: string) => {
        this.handleJoinSession(socket, sessionId);
      });

      // 게임 세션 떠나기
      socket.on('leave_session', () => {
        this.handleLeaveSession(socket);
      });

      // 준비 상태 변경
      socket.on('toggle_ready', () => {
        this.handleToggleReady(socket);
      });

      // 게임 시작
      socket.on('start_game', () => {
        this.handleStartGame(socket);
      });

      // 샷 실행
      socket.on('make_shot', (shotData: { 
        ballPositions: Ball[]; 
        selectedPath: string; 
        power: number;
      }) => {
        this.handleMakeShot(socket, shotData);
      });

      // 턴 완료
      socket.on('end_turn', (result: { success: boolean; score: number; accuracy: number }) => {
        this.handleEndTurn(socket, result);
      });

      // 채팅 메시지
      socket.on('send_message', (message: string) => {
        this.handleSendMessage(socket, message);
      });

      // 게임 중단
      socket.on('forfeit_game', () => {
        this.handleForfeitGame(socket);
      });

      // 연결 해제 처리
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleStartMatchmaking(socket: Socket, difficulty: DifficultyLevel) {
    const userData = socket.data as SocketData;
    if (!userData?.userId) return;

    console.log(`Starting matchmaking for user ${userData.username} with difficulty ${difficulty}`);

    // 이미 매칭 중인지 확인
    const isAlreadyInQueue = Array.from(this.matchmakingQueue.values())
      .some(queue => queue.includes(userData.userId));

    if (isAlreadyInQueue) {
      socket.emit('matchmaking_error', { message: '이미 매칭 중입니다.' });
      return;
    }

    const queue = this.matchmakingQueue.get(difficulty) || [];
    
    if (queue.length > 0) {
      // 매칭된 상대방 찾기
      const opponentId = queue.shift()!;
      const opponentSocket = this.userSockets.get(opponentId);

      if (opponentSocket) {
        // 게임 세션 생성
        const sessionId = this.generateSessionId();
        const session = this.createMultiplayerSession(
          sessionId,
          userData.userId,
          opponentId,
          {
            maxPlayers: 2,
            difficulty,
            gameMode: GameMode.REAL_TIME,
            timeLimit: 60,
          }
        );

        this.sessions.set(sessionId, session);

        // 양쪽 플레이어를 세션에 추가
        socket.join(sessionId);
        opponentSocket.join(sessionId);

        socket.data.currentSessionId = sessionId;
        opponentSocket.data.currentSessionId = sessionId;

        // 매칭 완료 알림
        this.io.to(sessionId).emit('match_found', {
          sessionId,
          session: this.getPublicSessionData(session),
        });

        console.log(`Match found: ${userData.username} vs ${(opponentSocket.data as SocketData).username}`);
      } else {
        // 상대방 소켓이 없으면 큐에 다시 추가
        queue.push(userData.userId);
        this.matchmakingQueue.set(difficulty, queue);
      }
    } else {
      // 큐에 추가하고 대기
      queue.push(userData.userId);
      this.matchmakingQueue.set(difficulty, queue);
      
      socket.emit('matchmaking_started', { difficulty });
      console.log(`User ${userData.username} added to matchmaking queue`);
    }
  }

  private handleCancelMatchmaking(socket: Socket) {
    const userData = socket.data as SocketData;
    if (!userData?.userId) return;

    // 모든 큐에서 사용자 제거
    this.matchmakingQueue.forEach((queue, difficulty) => {
      const index = queue.indexOf(userData.userId);
      if (index !== -1) {
        queue.splice(index, 1);
        this.matchmakingQueue.set(difficulty, queue);
        socket.emit('matchmaking_cancelled');
        console.log(`User ${userData.username} cancelled matchmaking`);
      }
    });
  }

  private handleCreateSession(socket: Socket, settings: GameSettings) {
    const userData = socket.data as SocketData;
    if (!userData?.userId) return;

    const sessionId = this.generateSessionId();
    const session = this.createMultiplayerSession(sessionId, userData.userId, null, settings);

    this.sessions.set(sessionId, session);
    socket.join(sessionId);
    socket.data.currentSessionId = sessionId;

    socket.emit('session_created', {
      sessionId,
      session: this.getPublicSessionData(session),
    });

    console.log(`Session created: ${sessionId} by ${userData.username}`);
  }

  private handleJoinSession(socket: Socket, sessionId: string) {
    const userData = socket.data as SocketData;
    const session = this.sessions.get(sessionId);

    if (!userData?.userId || !session) {
      socket.emit('join_error', { message: '세션을 찾을 수 없습니다.' });
      return;
    }

    if (session.players.length >= session.settings.maxPlayers) {
      socket.emit('join_error', { message: '세션이 가득 찼습니다.' });
      return;
    }

    // 이미 참가 중인지 확인
    const existingPlayer = session.players.find(p => p.userId === userData.userId);
    if (existingPlayer) {
      socket.emit('join_error', { message: '이미 참가 중입니다.' });
      return;
    }

    // 플레이어 추가
    const newPlayer: Player = {
      userId: userData.userId,
      username: userData.username,
      score: 0,
      isReady: false,
    };

    session.players.push(newPlayer);
    socket.join(sessionId);
    socket.data.currentSessionId = sessionId;

    // 세션의 모든 플레이어에게 업데이트 전송
    this.io.to(sessionId).emit('player_joined', {
      player: newPlayer,
      session: this.getPublicSessionData(session),
    });

    console.log(`User ${userData.username} joined session ${sessionId}`);
  }

  private handleLeaveSession(socket: Socket) {
    const userData = socket.data as SocketData;
    const sessionId = socket.data.currentSessionId;

    if (!userData?.userId || !sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    // 플레이어 제거
    session.players = session.players.filter(p => p.userId !== userData.userId);
    socket.leave(sessionId);
    socket.data.currentSessionId = undefined;

    if (session.players.length === 0) {
      // 세션 삭제
      this.sessions.delete(sessionId);
      console.log(`Session ${sessionId} deleted - no players`);
    } else {
      // 호스트가 나갔으면 다음 플레이어를 호스트로 지정
      if (session.hostId === userData.userId && session.players.length > 0) {
        session.hostId = session.players[0].userId;
      }

      // 남은 플레이어들에게 알림
      this.io.to(sessionId).emit('player_left', {
        userId: userData.userId,
        session: this.getPublicSessionData(session),
      });
    }

    console.log(`User ${userData.username} left session ${sessionId}`);
  }

  private handleToggleReady(socket: Socket) {
    const userData = socket.data as SocketData;
    const sessionId = socket.data.currentSessionId;

    if (!userData?.userId || !sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const player = session.players.find(p => p.userId === userData.userId);
    if (!player) return;

    player.isReady = !player.isReady;

    this.io.to(sessionId).emit('player_ready_changed', {
      userId: userData.userId,
      isReady: player.isReady,
      session: this.getPublicSessionData(session),
    });

    console.log(`User ${userData.username} ready status: ${player.isReady}`);
  }

  private handleStartGame(socket: Socket) {
    const userData = socket.data as SocketData;
    const sessionId = socket.data.currentSessionId;

    if (!userData?.userId || !sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    // 호스트만 게임을 시작할 수 있음
    if (session.hostId !== userData.userId) {
      socket.emit('start_game_error', { message: '호스트만 게임을 시작할 수 있습니다.' });
      return;
    }

    // 모든 플레이어가 준비되었는지 확인
    const allReady = session.players.every(p => p.isReady);
    if (!allReady) {
      socket.emit('start_game_error', { message: '모든 플레이어가 준비되어야 합니다.' });
      return;
    }

    // 게임 상태 초기화
    session.gameState = {
      currentBallSetup: this.generateRandomBallSetup(),
      turn: 0,
      round: 1,
      timeRemaining: session.settings.timeLimit,
    };

    this.io.to(sessionId).emit('game_started', {
      session: this.getPublicSessionData(session),
    });

    // 첫 번째 턴 시작
    this.startTurn(sessionId);

    console.log(`Game started in session ${sessionId}`);
  }

  private handleMakeShot(
    socket: Socket, 
    shotData: { ballPositions: Ball[]; selectedPath: string; power: number }
  ) {
    const userData = socket.data as SocketData;
    const sessionId = socket.data.currentSessionId;

    if (!userData?.userId || !sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session || !session.gameState) return;

    const currentPlayer = session.players[session.gameState.turn % session.players.length];
    if (currentPlayer.userId !== userData.userId) {
      socket.emit('shot_error', { message: '당신의 턴이 아닙니다.' });
      return;
    }

    // 샷 데이터를 세션의 다른 플레이어들에게 브로드캐스트
    socket.to(sessionId).emit('opponent_shot', {
      playerId: userData.userId,
      shotData,
    });

    console.log(`User ${userData.username} made a shot in session ${sessionId}`);
  }

  private handleEndTurn(
    socket: Socket, 
    result: { success: boolean; score: number; accuracy: number }
  ) {
    const userData = socket.data as SocketData;
    const sessionId = socket.data.currentSessionId;

    if (!userData?.userId || !sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session || !session.gameState) return;

    const currentPlayer = session.players[session.gameState.turn % session.players.length];
    if (currentPlayer.userId !== userData.userId) return;

    // 점수 업데이트
    currentPlayer.score += result.score;

    // 턴 결과 브로드캐스트
    this.io.to(sessionId).emit('turn_completed', {
      playerId: userData.userId,
      result,
      newScore: currentPlayer.score,
    });

    // 다음 턴으로 진행
    session.gameState.turn += 1;

    // 게임 종료 조건 확인 (예: 5라운드)
    if (session.gameState.turn >= session.players.length * 5) {
      this.endGame(sessionId);
    } else {
      this.startTurn(sessionId);
    }
  }

  private handleSendMessage(socket: Socket, message: string) {
    const userData = socket.data as SocketData;
    const sessionId = socket.data.currentSessionId;

    if (!userData?.userId || !sessionId || !message.trim()) return;

    this.io.to(sessionId).emit('chat_message', {
      playerId: userData.userId,
      username: userData.username,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    });
  }

  private handleForfeitGame(socket: Socket) {
    const userData = socket.data as SocketData;
    const sessionId = socket.data.currentSessionId;

    if (!userData?.userId || !sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.io.to(sessionId).emit('player_forfeited', {
      playerId: userData.userId,
      username: userData.username,
    });

    // 게임 강제 종료
    this.endGame(sessionId, userData.userId);
  }

  private handleDisconnect(socket: Socket) {
    const userData = socket.data as SocketData;
    
    if (userData?.userId) {
      console.log(`User disconnected: ${userData.username} (${userData.userId})`);
      
      // 매칭 큐에서 제거
      this.handleCancelMatchmaking(socket);
      
      // 세션에서 제거
      this.handleLeaveSession(socket);
      
      // 소켓 맵에서 제거
      this.userSockets.delete(userData.userId);
    }
  }

  private startTurn(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.gameState) return;

    const currentPlayer = session.players[session.gameState.turn % session.players.length];
    
    // 새로운 공 배치 생성 (필요한 경우)
    if (session.gameState.turn % session.players.length === 0) {
      session.gameState.currentBallSetup = this.generateRandomBallSetup();
      session.gameState.round += 1;
    }

    // 턴 타이머 리셋
    session.gameState.timeRemaining = session.settings.timeLimit || 60;

    this.io.to(sessionId).emit('turn_started', {
      currentPlayer: currentPlayer.userId,
      gameState: session.gameState,
      ballSetup: session.gameState.currentBallSetup,
    });

    // 턴 타이머 시작
    if (session.settings.timeLimit) {
      this.startTurnTimer(sessionId);
    }
  }

  private startTurnTimer(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.gameState) return;

    const interval = setInterval(() => {
      if (!session.gameState || session.gameState.timeRemaining! <= 0) {
        clearInterval(interval);
        
        // 시간 초과로 턴 종료
        this.io.to(sessionId).emit('turn_timeout');
        session.gameState!.turn += 1;
        
        if (session.gameState!.turn >= session.players.length * 5) {
          this.endGame(sessionId);
        } else {
          this.startTurn(sessionId);
        }
        return;
      }

      session.gameState.timeRemaining! -= 1;
      
      // 남은 시간 브로드캐스트 (10초 이하일 때만)
      if (session.gameState.timeRemaining! <= 10) {
        this.io.to(sessionId).emit('time_warning', {
          timeRemaining: session.gameState.timeRemaining,
        });
      }
    }, 1000);
  }

  private endGame(sessionId: string, forfeitPlayerId?: number) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // 최종 점수 계산
    const sortedPlayers = [...session.players].sort((a, b) => b.score - a.score);
    
    let winner = sortedPlayers[0];
    if (forfeitPlayerId) {
      // 포기한 플레이어가 아닌 다른 플레이어가 승자
      winner = session.players.find(p => p.userId !== forfeitPlayerId) || winner;
    }

    this.io.to(sessionId).emit('game_ended', {
      winner: winner.userId,
      finalScores: sortedPlayers,
      reason: forfeitPlayerId ? 'forfeit' : 'completed',
    });

    // 게임 결과를 데이터베이스에 저장 (구현 필요)
    this.saveGameResult(session, winner, forfeitPlayerId);

    // 세션 정리
    setTimeout(() => {
      this.sessions.delete(sessionId);
      console.log(`Game session ${sessionId} ended and cleaned up`);
    }, 30000); // 30초 후 세션 삭제
  }

  private async saveGameResult(
    session: MultiplayerSession, 
    winner: Player, 
    forfeitPlayerId?: number
  ) {
    // TODO: 데이터베이스에 게임 결과 저장
    console.log(`Game result: Winner ${winner.username}, Session: ${session.id}`);
  }

  private generateRandomBallSetup(): Ball[] {
    // 랜덤한 공 배치 생성
    return [
      {
        id: 'cue',
        x: Math.random() * 0.3 + 0.1,
        y: Math.random() * 0.6 + 0.2,
        radius: 0.02,
        color: '#FFFFFF',
        type: 'cue' as any,
      },
      {
        id: 'object1',
        x: Math.random() * 0.3 + 0.4,
        y: Math.random() * 0.6 + 0.2,
        radius: 0.02,
        color: '#FF0000',
        type: 'object1' as any,
      },
      {
        id: 'object2',
        x: Math.random() * 0.3 + 0.7,
        y: Math.random() * 0.6 + 0.2,
        radius: 0.02,
        color: '#FFFF00',
        type: 'object2' as any,
      },
    ];
  }

  private createMultiplayerSession(
    sessionId: string,
    hostId: number,
    opponentId: number | null,
    settings: GameSettings
  ): MultiplayerSession {
    const hostSocket = this.userSockets.get(hostId);
    const hostData = hostSocket?.data as SocketData;

    const players: Player[] = [{
      userId: hostId,
      username: hostData?.username || 'Unknown',
      score: 0,
      isReady: false,
    }];

    if (opponentId) {
      const opponentSocket = this.userSockets.get(opponentId);
      const opponentData = opponentSocket?.data as SocketData;
      
      players.push({
        userId: opponentId,
        username: opponentData?.username || 'Unknown',
        score: 0,
        isReady: false,
      });
    }

    return {
      id: sessionId,
      hostId,
      players,
      currentTurn: 0,
      gameState: {
        currentBallSetup: [],
        turn: 0,
        round: 1,
      },
      settings,
      createdAt: new Date().toISOString(),
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private getPublicSessionData(session: MultiplayerSession) {
    return {
      id: session.id,
      hostId: session.hostId,
      players: session.players,
      currentTurn: session.currentTurn,
      gameState: session.gameState,
      settings: session.settings,
      createdAt: session.createdAt,
    };
  }

  // 공개 메서드들
  public getActiveSessions(): MultiplayerSession[] {
    return Array.from(this.sessions.values());
  }

  public getSessionById(sessionId: string): MultiplayerSession | undefined {
    return this.sessions.get(sessionId);
  }

  public getMatchmakingStats() {
    const stats: any = {};
    this.matchmakingQueue.forEach((queue, difficulty) => {
      stats[difficulty] = queue.length;
    });
    return stats;
  }
}