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