import { Ball, Table, ThreeCushionPath } from '../types';
export declare class BilliardSimulator {
    private static readonly FRICTION;
    private static readonly MIN_VELOCITY;
    private static readonly MAX_SIMULATION_TIME;
    private static readonly TIME_STEP;
    static simulate3CushionPaths(cueBall: Ball, object1: Ball, object2: Ball, table: Table, shotAngles?: number[]): ThreeCushionPath[];
    private static simulateSinglePath;
    private static findNextCollision;
    private static getCushionNormal;
    private static updateBalls;
    private static applyFriction;
    private static allBallsStopped;
    private static generateShotAngles;
    private static calculateDifficulty;
    private static calculateSuccessRate;
}
//# sourceMappingURL=simulator.d.ts.map