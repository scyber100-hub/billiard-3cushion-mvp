import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';

import pathRoutes from './routes/pathRoutes';
import authRoutes from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';
import { MultiplayerService } from './services/MultiplayerService';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: '3쿠션 당구 분석 API 서버가 정상 동작 중입니다.',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/paths', pathRoutes);
app.use('/api/auth', authRoutes);

app.use(errorHandler);

// 멀티플레이어 서비스 초기화
const multiplayerService = new MultiplayerService(server);
console.log('🎮 멀티플레이어 서비스가 초기화되었습니다.');

// 멀티플레이어 관련 API 엔드포인트
app.get('/api/multiplayer/sessions', (req, res) => {
  const sessions = multiplayerService.getActiveSessions();
  res.json({ 
    success: true, 
    data: sessions.map(session => ({
      id: session.id,
      hostId: session.hostId,
      playerCount: session.players.length,
      maxPlayers: session.settings.maxPlayers,
      difficulty: session.settings.difficulty,
      gameMode: session.settings.gameMode,
      createdAt: session.createdAt,
    }))
  });
});

app.get('/api/multiplayer/matchmaking-stats', (req, res) => {
  const stats = multiplayerService.getMatchmakingStats();
  res.json({ success: true, data: stats });
});

server.listen(PORT, () => {
  console.log(`🎱 3쿠션 당구 분석 API 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🎮 실시간 멀티플레이 지원`);
});