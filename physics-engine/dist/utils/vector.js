"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vector = void 0;
class Vector {
    static add(a, b) {
        return { x: a.x + b.x, y: a.y + b.y };
    }
    static subtract(a, b) {
        return { x: a.x - b.x, y: a.y - b.y };
    }
    static multiply(v, scalar) {
        return { x: v.x * scalar, y: v.y * scalar };
    }
    static dot(a, b) {
        return a.x * b.x + a.y * b.y;
    }
    static magnitude(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    }
    static normalize(v) {
        const mag = Vector.magnitude(v);
        if (mag === 0)
            return { x: 0, y: 0 };
        return { x: v.x / mag, y: v.y / mag };
    }
    static distance(a, b) {
        return Vector.magnitude(Vector.subtract(a, b));
    }
    static reflect(incident, normal) {
        const normalizedNormal = Vector.normalize(normal);
        const dotProduct = Vector.dot(incident, normalizedNormal);
        return Vector.subtract(incident, Vector.multiply(normalizedNormal, 2 * dotProduct));
    }
    static angle(v) {
        return Math.atan2(v.y, v.x);
    }
    static fromAngle(angle, magnitude = 1) {
        return {
            x: Math.cos(angle) * magnitude,
            y: Math.sin(angle) * magnitude
        };
    }
}
exports.Vector = Vector;
//# sourceMappingURL=vector.js.map