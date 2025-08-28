@echo off
echo 🎱 3쿠션 당구 분석 앱 MVP 시작하기
echo ======================================
echo.

echo 1. 백엔드 의존성 설치 중...
cd backend
call npm install
if errorlevel 1 (
    echo ❌ 백엔드 의존성 설치 실패
    pause
    exit /b 1
)

echo 2. 물리 엔진 의존성 설치 중...
cd ..\physics-engine
call npm install
if errorlevel 1 (
    echo ❌ 물리 엔진 의존성 설치 실패
    pause
    exit /b 1
)

echo 3. 물리 엔진 빌드 중...
call npm run build
if errorlevel 1 (
    echo ❌ 물리 엔진 빌드 실패
    pause
    exit /b 1
)

echo 4. 프론트엔드 의존성 설치 중...
cd ..\frontend-web
call npm install
if errorlevel 1 (
    echo ❌ 프론트엔드 의존성 설치 실패
    pause
    exit /b 1
)

echo.
echo ✅ 설치 완료! 이제 서버를 시작합니다.
echo.
echo 📋 사용 방법:
echo   1. 백엔드 서버가 http://localhost:3001 에서 실행됩니다
echo   2. 프론트엔드가 http://localhost:3000 에서 실행됩니다
echo   3. 브라우저에서 http://localhost:3000 을 열어보세요
echo   4. 공을 드래그하여 위치를 설정하고 '경로 계산' 버튼을 클릭하세요
echo.

start "백엔드 서버" cmd /k "cd ..\backend && npm run dev"
timeout /t 3 /nobreak > nul
start "프론트엔드" cmd /k "npm start"

echo 🚀 서버들이 시작되었습니다!
echo 💡 팁: Ctrl+C를 눌러 서버를 중단할 수 있습니다
pause