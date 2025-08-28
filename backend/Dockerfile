# Multi-stage build for Node.js backend
FROM node:18-alpine AS builder

WORKDIR /app

# 의존성 파일 복사 및 설치
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 물리 엔진 빌드
COPY ../physics-engine ./physics-engine
WORKDIR /app/physics-engine
RUN npm install && npm run build

# 백엔드 소스 복사 및 빌드
WORKDIR /app
COPY . .
RUN npm run build

# Production 이미지
FROM node:18-alpine AS production

WORKDIR /app

# 보안을 위한 non-root 사용자 생성
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 필요한 파일들만 복사
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# 헬스체크용 curl 설치
RUN apk add --no-cache curl

USER nodejs

EXPOSE 3001

# 헬스체크 설정
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "dist/server.js"]