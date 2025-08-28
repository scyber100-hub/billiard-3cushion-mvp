export interface Vector2D {
    x: number;
    y: number;
}
export interface Ball {
    position: Vector2D;
    velocity: Vector2D;
    radius: number;
    mass: number;
    id: string;
}
export interface Table {
    width: number;
    height: number;
    cushionRestitution: number;
}
export interface Collision {
    point: Vector2D;
    normal: Vector2D;
    time: number;
    type: 'ball' | 'cushion';
    ballId?: string;
    cushionSide?: 'top' | 'bottom' | 'left' | 'right';
}
export interface SimulationStep {
    time: number;
    balls: Ball[];
    collision?: Collision;
}
export interface ThreeCushionPath {
    steps: SimulationStep[];
    cushionHits: number;
    isValid: boolean;
    endTime: number;
    difficulty: number;
    successRate: number;
}
//# sourceMappingURL=types.d.ts.map