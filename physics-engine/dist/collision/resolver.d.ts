import { Ball, Collision, Table } from '../types';
export declare class CollisionResolver {
    static resolveBallCollision(ball1: Ball, ball2: Ball, collision: Collision): void;
    static resolveCushionCollision(ball: Ball, collision: Collision, table: Table): void;
    private static separateBalls;
    private static separateFromCushion;
}
//# sourceMappingURL=resolver.d.ts.map