"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BilliardSimulator = void 0;
const vector_1 = require("../utils/vector");
const detector_1 = require("../collision/detector");
const resolver_1 = require("../collision/resolver");
class BilliardSimulator {
    static simulate3CushionPaths(cueBall, object1, object2, table, shotAngles = []) {
        const paths = [];
        if (shotAngles.length === 0) {
            shotAngles = this.generateShotAngles(cueBall, object1, object2, 16);
        }
        for (const angle of shotAngles) {
            const speed = 8.0;
            const path = this.simulateSinglePath(cueBall, object1, object2, table, angle, speed);
            if (path.isValid) {
                paths.push(path);
            }
        }
        return paths.sort((a, b) => b.successRate - a.successRate).slice(0, 5);
    }
    static simulateSinglePath(cueBall, object1, object2, table, angle, speed) {
        const balls = [
            { ...cueBall, velocity: vector_1.Vector.fromAngle(angle, speed) },
            { ...object1, velocity: { x: 0, y: 0 } },
            { ...object2, velocity: { x: 0, y: 0 } }
        ];
        const steps = [];
        let time = 0;
        let cushionHits = 0;
        let ballHits = 0;
        let isValid = false;
        while (time < this.MAX_SIMULATION_TIME) {
            const nextCollision = this.findNextCollision(balls, table);
            if (!nextCollision) {
                time += this.TIME_STEP;
                this.updateBalls(balls, this.TIME_STEP);
                this.applyFriction(balls);
                steps.push({
                    time,
                    balls: balls.map(b => ({ ...b }))
                });
                if (this.allBallsStopped(balls))
                    break;
                continue;
            }
            const timeToCollision = Math.min(nextCollision.time, this.TIME_STEP);
            this.updateBalls(balls, timeToCollision);
            time += timeToCollision;
            if (nextCollision.time <= this.TIME_STEP) {
                if (nextCollision.type === 'cushion') {
                    const ball = balls.find(b => b.id === nextCollision.ballId);
                    if (ball) {
                        resolver_1.CollisionResolver.resolveCushionCollision(ball, nextCollision, table);
                        cushionHits++;
                    }
                }
                else if (nextCollision.type === 'ball') {
                    const ball1 = balls.find(b => b.id === nextCollision.ballId);
                    const ball2 = balls.find(b => b.id !== nextCollision.ballId && b.id !== ball1?.id);
                    if (ball1 && ball2) {
                        resolver_1.CollisionResolver.resolveBallCollision(ball1, ball2, nextCollision);
                        ballHits++;
                    }
                }
                isValid = cushionHits >= 3 && ballHits >= 2;
            }
            this.applyFriction(balls);
            steps.push({
                time,
                balls: balls.map(b => ({ ...b })),
                collision: nextCollision
            });
            if (this.allBallsStopped(balls))
                break;
        }
        const difficulty = this.calculateDifficulty(steps, cushionHits);
        const successRate = this.calculateSuccessRate(difficulty, cushionHits, ballHits);
        return {
            steps,
            cushionHits,
            isValid,
            endTime: time,
            difficulty,
            successRate
        };
    }
    static findNextCollision(balls, table) {
        let earliestCollision = null;
        let minTime = Infinity;
        for (let i = 0; i < balls.length; i++) {
            const ball = balls[i];
            const cushionResult = detector_1.CollisionDetector.getTimeToCushion(ball, table);
            if (cushionResult.time < minTime) {
                minTime = cushionResult.time;
                earliestCollision = {
                    point: ball.position,
                    normal: this.getCushionNormal(cushionResult.side),
                    time: cushionResult.time,
                    type: 'cushion',
                    ballId: ball.id,
                    cushionSide: cushionResult.side
                };
            }
            for (let j = i + 1; j < balls.length; j++) {
                const otherBall = balls[j];
                const collisionTime = detector_1.CollisionDetector.getTimeToCollision(ball, otherBall);
                if (collisionTime < minTime) {
                    minTime = collisionTime;
                    earliestCollision = {
                        point: vector_1.Vector.add(ball.position, vector_1.Vector.multiply(ball.velocity, collisionTime)),
                        normal: vector_1.Vector.normalize(vector_1.Vector.subtract(otherBall.position, ball.position)),
                        time: collisionTime,
                        type: 'ball',
                        ballId: ball.id
                    };
                }
            }
        }
        return earliestCollision;
    }
    static getCushionNormal(side) {
        switch (side) {
            case 'left': return { x: 1, y: 0 };
            case 'right': return { x: -1, y: 0 };
            case 'top': return { x: 0, y: 1 };
            case 'bottom': return { x: 0, y: -1 };
            default: return { x: 0, y: 0 };
        }
    }
    static updateBalls(balls, deltaTime) {
        for (const ball of balls) {
            ball.position = vector_1.Vector.add(ball.position, vector_1.Vector.multiply(ball.velocity, deltaTime));
        }
    }
    static applyFriction(balls) {
        for (const ball of balls) {
            ball.velocity = vector_1.Vector.multiply(ball.velocity, this.FRICTION);
            if (vector_1.Vector.magnitude(ball.velocity) < this.MIN_VELOCITY) {
                ball.velocity = { x: 0, y: 0 };
            }
        }
    }
    static allBallsStopped(balls) {
        return balls.every(ball => vector_1.Vector.magnitude(ball.velocity) < this.MIN_VELOCITY);
    }
    static generateShotAngles(cueBall, object1, object2, count) {
        const angles = [];
        const baseAngle = vector_1.Vector.angle(vector_1.Vector.subtract(object1.position, cueBall.position));
        const range = Math.PI / 2;
        for (let i = 0; i < count; i++) {
            const offset = (i / (count - 1) - 0.5) * range;
            angles.push(baseAngle + offset);
        }
        return angles;
    }
    static calculateDifficulty(steps, cushionHits) {
        if (cushionHits < 3)
            return 0;
        let totalDistance = 0;
        for (let i = 1; i < steps.length; i++) {
            const prev = steps[i - 1].balls[0];
            const curr = steps[i].balls[0];
            totalDistance += vector_1.Vector.distance(prev.position, curr.position);
        }
        const angleComplexity = Math.min(cushionHits / 5, 1);
        const distanceComplexity = Math.min(totalDistance / 1000, 1);
        return (angleComplexity + distanceComplexity) / 2;
    }
    static calculateSuccessRate(difficulty, cushionHits, ballHits) {
        if (cushionHits < 3 || ballHits < 2)
            return 0;
        const baseProbability = 0.8;
        const difficultyPenalty = difficulty * 0.6;
        const cushionBonus = Math.min((cushionHits - 3) * 0.05, 0.1);
        return Math.max(0.1, Math.min(0.95, baseProbability - difficultyPenalty + cushionBonus));
    }
}
exports.BilliardSimulator = BilliardSimulator;
BilliardSimulator.FRICTION = 0.985;
BilliardSimulator.MIN_VELOCITY = 0.01;
BilliardSimulator.MAX_SIMULATION_TIME = 10.0;
BilliardSimulator.TIME_STEP = 0.016;
//# sourceMappingURL=simulator.js.map