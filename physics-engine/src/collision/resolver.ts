import { Ball, Collision, Table } from '../types';
import { Vector } from '../utils/vector';

export class CollisionResolver {
  static resolveBallCollision(ball1: Ball, ball2: Ball, collision: Collision): void {
    const normal = collision.normal;
    const relativeVelocity = Vector.subtract(ball1.velocity, ball2.velocity);
    const velocityAlongNormal = Vector.dot(relativeVelocity, normal);
    
    if (velocityAlongNormal > 0) return;
    
    const restitution = 0.95;
    const impulse = -(1 + restitution) * velocityAlongNormal / (1/ball1.mass + 1/ball2.mass);
    
    const impulseVector = Vector.multiply(normal, impulse);
    
    ball1.velocity = Vector.add(ball1.velocity, Vector.multiply(impulseVector, 1/ball1.mass));
    ball2.velocity = Vector.subtract(ball2.velocity, Vector.multiply(impulseVector, 1/ball2.mass));
    
    this.separateBalls(ball1, ball2);
  }

  static resolveCushionCollision(ball: Ball, collision: Collision, table: Table): void {
    const normal = collision.normal;
    const restitution = table.cushionRestitution || 0.8;
    
    ball.velocity = Vector.multiply(
      Vector.reflect(ball.velocity, normal),
      restitution
    );
    
    this.separateFromCushion(ball, collision, table);
  }

  private static separateBalls(ball1: Ball, ball2: Ball): void {
    const distance = Vector.distance(ball1.position, ball2.position);
    const minDistance = ball1.radius + ball2.radius;
    const overlap = minDistance - distance;
    
    if (overlap > 0) {
      const direction = Vector.normalize(Vector.subtract(ball2.position, ball1.position));
      const correction = Vector.multiply(direction, overlap / 2);
      
      ball1.position = Vector.subtract(ball1.position, correction);
      ball2.position = Vector.add(ball2.position, correction);
    }
  }

  private static separateFromCushion(ball: Ball, collision: Collision, table: Table): void {
    const { width, height } = table;
    const { radius } = ball;
    
    switch (collision.cushionSide) {
      case 'left':
        ball.position.x = radius;
        break;
      case 'right':
        ball.position.x = width - radius;
        break;
      case 'top':
        ball.position.y = radius;
        break;
      case 'bottom':
        ball.position.y = height - radius;
        break;
    }
  }
}