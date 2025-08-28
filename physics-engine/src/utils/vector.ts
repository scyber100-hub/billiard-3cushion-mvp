import { Vector2D } from '../types';

export class Vector {
  static add(a: Vector2D, b: Vector2D): Vector2D {
    return { x: a.x + b.x, y: a.y + b.y };
  }

  static subtract(a: Vector2D, b: Vector2D): Vector2D {
    return { x: a.x - b.x, y: a.y - b.y };
  }

  static multiply(v: Vector2D, scalar: number): Vector2D {
    return { x: v.x * scalar, y: v.y * scalar };
  }

  static dot(a: Vector2D, b: Vector2D): number {
    return a.x * b.x + a.y * b.y;
  }

  static magnitude(v: Vector2D): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  }

  static normalize(v: Vector2D): Vector2D {
    const mag = Vector.magnitude(v);
    if (mag === 0) return { x: 0, y: 0 };
    return { x: v.x / mag, y: v.y / mag };
  }

  static distance(a: Vector2D, b: Vector2D): number {
    return Vector.magnitude(Vector.subtract(a, b));
  }

  static reflect(incident: Vector2D, normal: Vector2D): Vector2D {
    const normalizedNormal = Vector.normalize(normal);
    const dotProduct = Vector.dot(incident, normalizedNormal);
    return Vector.subtract(incident, Vector.multiply(normalizedNormal, 2 * dotProduct));
  }

  static angle(v: Vector2D): number {
    return Math.atan2(v.y, v.x);
  }

  static fromAngle(angle: number, magnitude: number = 1): Vector2D {
    return {
      x: Math.cos(angle) * magnitude,
      y: Math.sin(angle) * magnitude
    };
  }
}