export interface Ball {
  id: 'cue' | 'object1' | 'object2';
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface Table {
  width: number;
  height: number;
  cushionWidth: number;
}

export interface Shot {
  cueBall: Ball;
  object1: Ball;
  object2: Ball;
  tableId: string;
}

export enum DifficultyLevel {
  BEGINNER = 1,
  INTERMEDIATE = 2,
  ADVANCED = 3,
  EXPERT = 4
}

export enum GameMode {
  PRACTICE = 'practice',
  MULTIPLAYER = 'multiplayer',
  TOURNAMENT = 'tournament'
}

export interface Player {
  id: number;
  username: string;
  rating: number;
  gamesPlayed: number;
  winRate: number;
}

export interface GameSettings {
  mode: GameMode;
  difficulty: DifficultyLevel;
  timeLimit?: number;
  maxShots?: number;
}

export interface GameState {
  id: string;
  players: Player[];
  currentTurn: number;
  shots: Shot[];
  score: { [playerId: number]: number };
  status: 'waiting' | 'active' | 'finished';
  settings: GameSettings;
}

export interface MultiplayerSession {
  id: string;
  players: Player[];
  gameState: GameState;
  createdAt: Date;
  updatedAt: Date;
}

export interface PathPoint {
  x: number;
  y: number;
  type: 'ball' | 'cushion';
  ballId?: string;
  cushionSide?: 'top' | 'bottom' | 'left' | 'right';
}

export interface ShotPath {
  id: string;
  points: PathPoint[];
  cushionCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  successRate: number;
  description: string;
}

export interface PathAnalysis {
  shotId: string;
  paths: ShotPath[];
  bestPath: ShotPath;
  createdAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}