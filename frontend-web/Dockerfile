# Multi-stage build for React frontend
FROM node:18-alpine AS builder

WORKDIR /app

# 의존성 파일 복사 및 설치
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 소스 코드 복사
COPY . .

# 빌드 아규먼트로 환경변수 설정
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# 프로덕션 빌드
RUN npm run build

# Production 이미지 (Nginx)
FROM nginx:alpine AS production

# 보안 헤더를 위한 Nginx 설정
COPY --from=builder /app/build /usr/share/nginx/html

# 커스텀 Nginx 설정
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/

# 보안을 위한 불필요한 정보 제거
RUN rm -rf /usr/share/nginx/html/static/js/*.map && \
    rm -rf /usr/share/nginx/html/static/css/*.map

EXPOSE 80

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]