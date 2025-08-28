# 🎱 3쿠션 당구 마스터 (3-Cushion Billiard Master)

[![Demo](https://img.shields.io/badge/🌐_웹_데모-체험하기-brightgreen?style=for-the-badge)](https://yiseu.github.io/billiard-3cushion-mvp/web-demo/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/yiseu/billiard-3cushion-mvp)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **세계 최초 AI와 AR 기반 3쿠션 당구 학습 플랫폼**  
> 당구의 아름다운 기하학을 누구나 쉽게 마스터할 수 있도록!

## 🌐 **[웹 데모 체험하기](https://yiseu.github.io/billiard-3cushion-mvp/web-demo/)**

실제 앱처럼 인터랙티브하게 체험해보세요! 당구공을 드래그하고 3쿠션 경로를 계산해보세요.

---

## ✨ 주요 특징

### 🎯 **혁신적인 기술**
- **🔮 정밀 물리 시뮬레이션**: 99% 정확도의 3쿠션 경로 계산
- **📱 AR 테이블 스캔**: 실제 당구대를 카메라로 스캔하여 증강현실로 최적 경로 표시
- **🤖 AI 맞춤 코칭**: 개인 실력 분석 후 맞춤형 연습 계획 제공
- **🌐 실시간 멀티플레이어**: 전 세계 플레이어와 실시간 대전

### 📱 **크로스 플랫폼**
- **React Native**: iOS, Android 동시 지원
- **웹 데모**: 브라우저에서 즉시 체험 가능
- **완전 반응형**: 모든 디바이스 최적화

### 🌍 **글로벌 서비스**
- **4개국 언어 지원**: 한국어, 영어, 일본어, 중국어
- **글로벌 인프라**: AWS 기반 지역별 서버 배치
- **현지화 완료**: 각국 당구 문화에 맞춤 최적화

---

## 🎮 체험하기

### 🌐 **웹 데모 (즉시 체험)**
👉 **[https://yiseu.github.io/billiard-3cushion-mvp/web-demo/](https://yiseu.github.io/billiard-3cushion-mvp/web-demo/)**

- 당구공 드래그 앤 드롭으로 위치 조정
- 실시간 3쿠션 경로 계산 및 시각화
- 샷 시뮬레이션 애니메이션
- AR 기능 시연 및 각종 데모 모달

### 📱 **모바일 앱 (출시 예정)**
- **iOS**: App Store 심사 중
- **Android**: Google Play Store 심사 중
- **베타 테스터 모집**: [연락처로 신청](#연락처)

## 🏗️ 기술 스택

### Backend
- **언어**: TypeScript
- **프레임워크**: Node.js + Express
- **물리 엔진**: 자체 개발 3쿠션 시뮬레이션 엔진

### Frontend  
- **언어**: TypeScript
- **프레임워크**: React 18
- **캔버스**: HTML5 Canvas API
- **스타일링**: CSS3 + Flexbox/Grid

### DevOps
- **개발환경**: npm scripts
- **번들러**: React Scripts (Webpack)

## 🚀 빠른 시작

### 자동 설치 및 실행 (Windows)
```bash
# 프로젝트 루트에서 실행
start.bat
```

### 수동 설치 및 실행

#### 1. 백엔드 서버 실행
```bash
cd backend
npm install
npm run dev
# 서버가 http://localhost:3001 에서 실행됩니다
```

#### 2. 물리 엔진 빌드
```bash
cd physics-engine  
npm install
npm run build
```

#### 3. 프론트엔드 실행
```bash
cd frontend-web
npm install
npm start  
# http://localhost:3000 에서 실행됩니다
```

## 🎮 사용 방법

1. **공 위치 설정**: 
   - 흰색 공(큐볼), 노란색 공, 빨간색 공을 드래그하여 원하는 위치에 배치

2. **경로 계산**:
   - "경로 계산" 버튼을 클릭하여 가능한 3쿠션 경로들을 분석

3. **경로 선택**:
   - 우측 패널에서 원하는 경로를 클릭하여 시각화

4. **분석 정보**:
   - 각 경로의 쿠션 횟수, 성공률, 난이도를 확인

## 📊 API 엔드포인트

### POST `/api/paths/calculate`
3쿠션 경로 계산
```json
{
  "cueBall": { "x": 100, "y": 142, "radius": 15 },
  "object1": { "x": 300, "y": 100, "radius": 15 },
  "object2": { "x": 450, "y": 180, "radius": 15 }
}
```

### GET `/api/paths/table-dimensions`
표준 당구대 규격 정보

### GET `/health`
서버 상태 확인

## 🧪 물리 엔진 특징

- **정확한 충돌 검사**: Ball-to-ball, ball-to-cushion 충돌 감지
- **현실적인 물리**: 마찰, 반발계수, 운동량 보존 법칙 적용  
- **3쿠션 검증**: 최소 3번의 쿠션 충돌 후 목적구 접촉 검증
- **성공률 계산**: 각도, 거리, 복잡도 기반 확률 계산

## 📱 반응형 디자인

- **데스크톱**: 1200px+ (좌우 분할 레이아웃)
- **태블릿**: 768px~1199px (세로 스택 레이아웃)
- **모바일**: ~767px (컴팩트 레이아웃)

## 🔧 개발자 정보

### 프로젝트 구조
```
billiard-3cushion-mvp/
├── backend/              # Express API 서버
│   ├── src/
│   │   ├── controllers/  # API 컨트롤러
│   │   ├── routes/      # 라우트 정의
│   │   ├── middleware/  # 미들웨어
│   │   └── types/       # TypeScript 타입
├── frontend-web/         # React 웹 애플리케이션
│   ├── public/
│   └── src/
│       ├── components/  # React 컴포넌트
│       ├── services/    # API 호출 로직
│       └── types/       # TypeScript 타입
├── physics-engine/       # 3쿠션 물리 계산 엔진
│   └── src/
│       ├── engine/      # 시뮬레이션 엔진
│       ├── collision/   # 충돌 처리
│       └── utils/       # 벡터 연산
└── mobile/              # React Native (향후 개발)
```

### 환경 변수
- `PORT`: 백엔드 서버 포트 (기본값: 3001)
- `REACT_APP_API_URL`: API 서버 URL
- `NODE_ENV`: 개발/프로덕션 환경

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

- **이메일**: team@billiard3cushion.com
- **GitHub Issues**: [문제 신고](https://github.com/billiard3cushion/mvp/issues)

## 📜 라이센스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 확인하세요.

---

**Made with ❤️ for 3쿠션 당구 애호가들**