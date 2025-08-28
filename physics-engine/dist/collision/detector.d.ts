import { Ball, Table, Collision } from '../types';
export declare class CollisionDetector {
    static detectBallCollision(ball1: Ball, ball2: Ball): Collision | null;
    static detectCushionCollision(ball: Ball, table: Table): Collision | null;
    static getTimeToCollision(ball1: Ball, ball2: Ball): number;
    static getTimeToCushion(ball: Ball, table: Table): {
        time: number;
        side: string;
    };
}
//# sourceMappingURL=detector.d.ts.map