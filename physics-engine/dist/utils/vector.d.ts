import { Vector2D } from '../types';
export declare class Vector {
    static add(a: Vector2D, b: Vector2D): Vector2D;
    static subtract(a: Vector2D, b: Vector2D): Vector2D;
    static multiply(v: Vector2D, scalar: number): Vector2D;
    static dot(a: Vector2D, b: Vector2D): number;
    static magnitude(v: Vector2D): number;
    static normalize(v: Vector2D): Vector2D;
    static distance(a: Vector2D, b: Vector2D): number;
    static reflect(incident: Vector2D, normal: Vector2D): Vector2D;
    static angle(v: Vector2D): number;
    static fromAngle(angle: number, magnitude?: number): Vector2D;
}
//# sourceMappingURL=vector.d.ts.map