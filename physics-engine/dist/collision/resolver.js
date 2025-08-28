"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollisionResolver = void 0;
const vector_1 = require("../utils/vector");
class CollisionResolver {
    static resolveBallCollision(ball1, ball2, collision) {
        const normal = collision.normal;
        const relativeVelocity = vector_1.Vector.subtract(ball1.velocity, ball2.velocity);
        const velocityAlongNormal = vector_1.Vector.dot(relativeVelocity, normal);
        if (velocityAlongNormal > 0)
            return;
        const restitution = 0.95;
        const impulse = -(1 + restitution) * velocityAlongNormal / (1 / ball1.mass + 1 / ball2.mass);
        const impulseVector = vector_1.Vector.multiply(normal, impulse);
        ball1.velocity = vector_1.Vector.add(ball1.velocity, vector_1.Vector.multiply(impulseVector, 1 / ball1.mass));
        ball2.velocity = vector_1.Vector.subtract(ball2.velocity, vector_1.Vector.multiply(impulseVector, 1 / ball2.mass));
        this.separateBalls(ball1, ball2);
    }
    static resolveCushionCollision(ball, collision, table) {
        const normal = collision.normal;
        const restitution = table.cushionRestitution || 0.8;
        ball.velocity = vector_1.Vector.multiply(vector_1.Vector.reflect(ball.velocity, normal), restitution);
        this.separateFromCushion(ball, collision, table);
    }
    static separateBalls(ball1, ball2) {
        const distance = vector_1.Vector.distance(ball1.position, ball2.position);
        const minDistance = ball1.radius + ball2.radius;
        const overlap = minDistance - distance;
        if (overlap > 0) {
            const direction = vector_1.Vector.normalize(vector_1.Vector.subtract(ball2.position, ball1.position));
            const correction = vector_1.Vector.multiply(direction, overlap / 2);
            ball1.position = vector_1.Vector.subtract(ball1.position, correction);
            ball2.position = vector_1.Vector.add(ball2.position, correction);
        }
    }
    static separateFromCushion(ball, collision, table) {
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
exports.CollisionResolver = CollisionResolver;
//# sourceMappingURL=resolver.js.map