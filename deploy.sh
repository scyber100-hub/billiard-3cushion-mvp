#!/bin/bash

# 3쿠션 당구 분석 앱 배포 스크립트
# Usage: ./deploy.sh [environment]
# environment: dev, staging, production (default: dev)

set -e  # 에러 발생시 스크립트 중단

ENVIRONMENT=${1:-dev}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="billiard-3cushion"

echo "🚀 3쿠션 당구 분석 앱 배포 시작 (환경: $ENVIRONMENT)"

# 환경 설정
case $ENVIRONMENT in
  "dev")
    COMPOSE_FILE="docker-compose.yml"
    ENV_FILE=".env"
    ;;
  "staging")
    COMPOSE_FILE="docker-compose.staging.yml"
    ENV_FILE=".env.staging"
    ;;
  "production")
    COMPOSE_FILE="docker-compose.yml"
    ENV_FILE=".env.production"
    ;;
  *)
    echo "❌ 지원하지 않는 환경입니다: $ENVIRONMENT"
    echo "사용법: ./deploy.sh [dev|staging|production]"
    exit 1
    ;;
esac

# 환경 변수 파일 확인
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ 환경 변수 파일을 찾을 수 없습니다: $ENV_FILE"
    exit 1
fi

echo "📋 환경 설정 로드: $ENV_FILE"
source "$ENV_FILE"

# Docker 및 Docker Compose 설치 확인
if ! command -v docker &> /dev/null; then
    echo "❌ Docker가 설치되어 있지 않습니다."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose가 설치되어 있지 않습니다."
    exit 1
fi

# Git에서 최신 코드 가져오기 (프로덕션 환경에서만)
if [ "$ENVIRONMENT" = "production" ]; then
    echo "📥 Git에서 최신 코드 가져오기..."
    git fetch --all
    git checkout main
    git pull origin main
fi

# 이전 컨테이너 정리
echo "🧹 이전 컨테이너 정리..."
docker-compose -f "$COMPOSE_FILE" down --remove-orphans || true

# 사용하지 않는 이미지 정리 (프로덕션에서만)
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🗑️ 사용하지 않는 Docker 이미지 정리..."
    docker image prune -f
fi

# 물리 엔진 빌드
echo "⚙️ 물리 엔진 빌드..."
cd physics-engine
npm install
npm run build
cd ..

# Docker 이미지 빌드 및 컨테이너 시작
echo "🔨 Docker 이미지 빌드 및 컨테이너 시작..."
docker-compose -f "$COMPOSE_FILE" up -d --build

# 서비스 상태 확인
echo "🔍 서비스 상태 확인..."
sleep 30

# 백엔드 헬스체크
echo "🏥 백엔드 헬스체크..."
for i in {1..10}; do
    if curl -f http://localhost:3001/health &> /dev/null; then
        echo "✅ 백엔드 서비스가 정상 동작 중입니다."
        break
    else
        echo "⏳ 백엔드 서비스 시작 대기 중... ($i/10)"
        sleep 10
    fi
    
    if [ $i -eq 10 ]; then
        echo "❌ 백엔드 서비스 시작에 실패했습니다."
        docker-compose -f "$COMPOSE_FILE" logs backend
        exit 1
    fi
done

# 프론트엔드 헬스체크
echo "🌐 프론트엔드 헬스체크..."
for i in {1..5}; do
    if curl -f http://localhost:3000 &> /dev/null; then
        echo "✅ 프론트엔드 서비스가 정상 동작 중입니다."
        break
    else
        echo "⏳ 프론트엔드 서비스 시작 대기 중... ($i/5)"
        sleep 5
    fi
    
    if [ $i -eq 5 ]; then
        echo "❌ 프론트엔드 서비스 시작에 실패했습니다."
        docker-compose -f "$COMPOSE_FILE" logs frontend
        exit 1
    fi
done

# 데이터베이스 마이그레이션 (프로덕션에서만)
if [ "$ENVIRONMENT" = "production" ]; then
    echo "📊 데이터베이스 마이그레이션..."
    docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U billiard_user -d billiard3cushion -f /docker-entrypoint-initdb.d/schema.sql || true
fi

# 서비스 정보 출력
echo ""
echo "🎉 배포가 완료되었습니다! ($ENVIRONMENT)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 프론트엔드: http://localhost:3000"
echo "🔧 백엔드 API: http://localhost:3001"
echo "🏥 헬스체크: http://localhost:3001/health"
echo "📊 데이터베이스: localhost:5432"
echo "⚡ Redis: localhost:6379"
echo ""

if [ "$ENVIRONMENT" = "production" ]; then
    echo "📈 프로덕션 모니터링:"
    echo "   - 로그 확인: docker-compose -f $COMPOSE_FILE logs -f"
    echo "   - 상태 확인: docker-compose -f $COMPOSE_FILE ps"
    echo "   - 재시작: docker-compose -f $COMPOSE_FILE restart [service-name]"
    echo ""
fi

echo "🎯 사용법:"
echo "   - 중단: docker-compose -f $COMPOSE_FILE down"
echo "   - 로그 확인: docker-compose -f $COMPOSE_FILE logs [service-name]"
echo "   - 컨테이너 상태: docker-compose -f $COMPOSE_FILE ps"
echo ""
echo "✨ 3쿠션 당구 마스터가 되어보세요!"