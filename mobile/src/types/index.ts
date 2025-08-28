// User Types
export interface User {
  id: number;
  username: string;
  email: string;
  skillLevel: SkillLevel;
  totalScore: number;
  practiceHours: number;
  achievements: Achievement[];
  subscription: SubscriptionPlan;
  createdAt: string;
}

export interface UserStats {
  totalPracticeTime: number;
  totalShots: number;
  successfulShots: number;
  averageAccuracy: number;
  bestStreak: number;
  challengesCompleted: number;
  currentLevel: number;
}

// Skill Levels
export enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
  MASTER = 'master'
}

// Ball and Table Types
export interface Ball {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  type: BallType;
}

export enum BallType {
  CUE = 'cue',
  OBJECT1 = 'object1',
  OBJECT2 = 'object2'
}

export interface Table {
  width: number;
  height: number;
  cushionWidth: number;
}

// Path and Shot Analysis
export interface ShotPath {
  id: string;
  ballPositions: Ball[];
  trajectories: Trajectory[];
  difficulty: DifficultyLevel;
  successRate: number;
  description: string;
  tips: string[];
}

export interface Trajectory {
  points: Point[];
  ballId: string;
  segments: TrajectorySegment[];
}

export interface TrajectorySegment {
  start: Point;
  end: Point;
  type: SegmentType;
  cushionHit?: number;
}

export enum SegmentType {
  DIRECT = 'direct',
  CUSHION = 'cushion',
  BALL_CONTACT = 'ball_contact'
}

export interface Point {
  x: number;
  y: number;
}

export enum DifficultyLevel {
  VERY_EASY = 1,
  EASY = 2,
  MEDIUM = 3,
  HARD = 4,
  VERY_HARD = 5,
  EXPERT = 6
}

// Challenge System
export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: DifficultyLevel;
  requiredLevel: SkillLevel;
  targetSetup: Ball[];
  successCriteria: SuccessCriteria;
  reward: Reward;
  isCompleted: boolean;
  bestScore?: number;
}

export interface SuccessCriteria {
  minAccuracy?: number;
  maxAttempts?: number;
  timeLimit?: number;
  consecutiveSuccesses?: number;
}

export interface Reward {
  points: number;
  badge?: string;
  unlockFeature?: string;
}

// Achievement System
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
  category: AchievementCategory;
}

export enum AchievementCategory {
  PRACTICE = 'practice',
  ACCURACY = 'accuracy',
  STREAK = 'streak',
  SOCIAL = 'social',
  SPECIAL = 'special'
}

// Practice Session
export interface PracticeSession {
  id: string;
  userId: number;
  startTime: string;
  endTime?: string;
  shots: Shot[];
  totalScore: number;
  averageAccuracy: number;
  challengesAttempted: string[];
}

export interface Shot {
  id: string;
  ballPositions: Ball[];
  selectedPath: string;
  actualPath?: Trajectory;
  success: boolean;
  accuracy: number;
  timestamp: string;
}

// Subscription Plans
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration: number; // in days
  features: string[];
  isActive: boolean;
}

// Leaderboard
export interface LeaderboardEntry {
  rank: number;
  user: User;
  score: number;
  change: number; // position change from last period
}

export interface Leaderboard {
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  userRank?: number;
}

export enum LeaderboardPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ALL_TIME = 'all_time'
}

// AR and Camera Types
export interface ARSession {
  id: string;
  tableCorners: Point[];
  ballPositions: Ball[];
  calibrationMatrix: number[][];
  isCalibrated: boolean;
}

export interface CameraFrame {
  uri: string;
  width: number;
  height: number;
  timestamp: number;
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

// Navigation Types
export type RootStackParamList = {
  Main: undefined;
  Challenge: { challengeId: string };
  Leaderboard: { period: LeaderboardPeriod };
  Auth: undefined;
  Login: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Practice: undefined;
  'AR Scan': undefined;
  Profile: undefined;
};

// Settings and Preferences
export interface UserPreferences {
  language: string;
  notifications: NotificationSettings;
  display: DisplaySettings;
  privacy: PrivacySettings;
}

export interface NotificationSettings {
  practiceReminders: boolean;
  challengeUpdates: boolean;
  socialUpdates: boolean;
  marketing: boolean;
}

export interface DisplaySettings {
  theme: 'light' | 'dark' | 'auto';
  tableStyle: 'classic' | 'modern' | 'neon';
  showTrajectoryAnimation: boolean;
  showDifficultyNumbers: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  showRealName: boolean;
  showStats: boolean;
  allowFriendRequests: boolean;
}

// Multiplayer Types
export interface MultiplayerSession {
  id: string;
  hostId: number;
  players: Player[];
  currentTurn: number;
  gameState: GameState;
  settings: GameSettings;
  createdAt: string;
}

export interface Player {
  userId: number;
  username: string;
  avatar?: string;
  score: number;
  isReady: boolean;
}

export interface GameState {
  currentBallSetup: Ball[];
  turn: number;
  round: number;
  timeRemaining?: number;
  lastShot?: Shot;
}

export interface GameSettings {
  maxPlayers: number;
  timeLimit?: number;
  difficulty: DifficultyLevel;
  gameMode: GameMode;
}

export enum GameMode {
  TURN_BASED = 'turn_based',
  REAL_TIME = 'real_time',
  TOURNAMENT = 'tournament'
}

// Event and Tournament Types
export interface Tournament {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  maxParticipants: number;
  currentParticipants: number;
  prizePool: number;
  entryFee: number;
  status: TournamentStatus;
  rules: TournamentRules;
}

export enum TournamentStatus {
  UPCOMING = 'upcoming',
  REGISTRATION = 'registration',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface TournamentRules {
  format: 'single_elimination' | 'double_elimination' | 'round_robin';
  matchFormat: 'best_of_3' | 'best_of_5' | 'time_limit';
  skillLevelRestriction?: SkillLevel[];
}