import { Ball, Table, Collision, Vector2D } from '../types';
import { Vector } from '../utils/vector';

export class CollisionDetector {
  static detectBallCollision(ball1: Ball, ball2: Ball): Collision | null {
    const distance = Vector.distance(ball1.position, ball2.position);
    const minDistance = ball1.radius + ball2.radius;
    
    if (distance >= minDistance) return null;
    
    const collisionPoint = Vector.add(
      ball1.position,
      Vector.multiply(
        Vector.normalize(Vector.subtract(ball2.position, ball1.position)),
        ball1.radius
      )
    );
    
    const normal = Vector.normalize(Vector.subtract(ball2.position, ball1.position));
    
    return {
      point: collisionPoint,
      normal,
      time: 0,
      type: 'ball',
      ballId: ball2.id
    };
  }

  static detectCushionCollision(ball: Ball, table: Table): Collision | null {
    const { position, radius } = ball;
    const { width, height } = table;
    
    let collision: Collision | null = null;
    let minDistance = Infinity;
    
    const checks = [
      { side: 'left' as const, distance: position.x - radius, normal: { x: 1, y: 0 }, point: { x: 0, y: position.y } },
      { side: 'right' as const, distance: width - position.x - radius, normal: { x: -1, y: 0 }, point: { x: width, y: position.y } },
      { side: 'top' as const, distance: position.y - radius, normal: { x: 0, y: 1 }, point: { x: position.x, y: 0 } },
      { side: 'bottom' as const, distance: height - position.y - radius, normal: { x: 0, y: -1 }, point: { x: position.x, y: height } }
    ];
    
    for (const check of checks) {
      if (check.distance <= 0 && Math.abs(check.distance) < minDistance) {
        minDistance = Math.abs(check.distance);
        collision = {
          point: check.point,
          normal: check.normal,
          time: 0,
          type: 'cushion',
          cushionSide: check.side
        };
      }
    }
    
    return collision;
  }

  static getTimeToCollision(ball1: Ball, ball2: Ball): number {
    const relativePosition = Vector.subtract(ball2.position, ball1.position);
    const relativeVelocity = Vector.subtract(ball2.velocity, ball1.velocity);
    
    const a = Vector.dot(relativeVelocity, relativeVelocity);
    const b = 2 * Vector.dot(relativePosition, relativeVelocity);
    const c = Vector.dot(relativePosition, relativePosition) - Math.pow(ball1.radius + ball2.radius, 2);
    
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0 || a === 0) return Infinity;
    
    const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
    
    const t = Math.min(t1, t2);
    return t > 0 ? t : Infinity;
  }

  static getTimeToCushion(ball: Ball, table: Table): { time: number; side: string } {
    const { position, velocity, radius } = ball;
    const { width, height } = table;
    
    let minTime = Infinity;
    let hitSide = '';
    
    if (velocity.x > 0) {
      const time = (width - position.x - radius) / velocity.x;
      if (time > 0 && time < minTime) {
        minTime = time;
        hitSide = 'right';
      }
    } else if (velocity.x < 0) {
      const time = (position.x - radius) / Math.abs(velocity.x);
      if (time > 0 && time < minTime) {
        minTime = time;
        hitSide = 'left';
      }
    }
    
    if (velocity.y > 0) {
      const time = (height - position.y - radius) / velocity.y;
      if (time > 0 && time < minTime) {
        minTime = time;
        hitSide = 'bottom';
      }
    } else if (velocity.y < 0) {
      const time = (position.y - radius) / Math.abs(velocity.y);
      if (time > 0 && time < minTime) {
        minTime = time;
        hitSide = 'top';
      }
    }
    
    return { time: minTime, side: hitSide };
  }
}