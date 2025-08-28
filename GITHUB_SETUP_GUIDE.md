# 🚀 GitHub 업로드 및 GitHub Pages 설정 가이드

## 1️⃣ GitHub에서 새 저장소 만들기

### **GitHub 웹사이트에서:**
1. [GitHub.com](https://github.com) 로그인
2. 오른쪽 상단 **"+"** 클릭 → **"New repository"** 선택
3. **Repository name**: `billiard-3cushion-mvp` 입력
4. **Description**: `🎱 World's First AI & AR-Based 3-Cushion Billiards Learning Platform` 입력
5. **Public** 선택 (GitHub Pages를 위해 필요)
6. **✅ README 체크 해제** (이미 만들어져 있음)
7. **Create repository** 클릭

### **생성된 저장소 URL 복사**
- 예시: `https://github.com/yiseu/billiard-3cushion-mvp.git`

---

## 2️⃣ 로컬에서 GitHub에 연결

```bash
# 현재 위치에서 실행 (이미 Git 초기화 완료)
cd "C:\Users\yiseu\billiard-3cushion-mvp"

# GitHub 저장소와 연결 (본인의 GitHub 사용자명으로 변경)
git remote add origin https://github.com/yiseu/billiard-3cushion-mvp.git

# GitHub에 업로드
git branch -M main
git push -u origin main
```

---

## 3️⃣ GitHub Pages 설정

### **웹사이트에서 설정:**
1. GitHub 저장소 페이지에서 **"Settings"** 탭 클릭
2. 왼쪽 메뉴에서 **"Pages"** 클릭
3. **Source** 섹션에서:
   - **"Deploy from a branch"** 선택
   - **Branch**: `main` 선택
   - **Folder**: `/ (root)` 선택
4. **Save** 클릭

### **5-10분 후 확인:**
- 웹 데모 URL: `https://yiseu.github.io/billiard-3cushion-mvp/web-demo/`
- 자동으로 생성되며 전 세계 어디서나 접근 가능

---

## 4️⃣ 완료 후 확인사항

### ✅ **GitHub 저장소 확인**
- [ ] 모든 파일이 업로드되었는지 확인
- [ ] README.md가 제대로 표시되는지 확인
- [ ] 웹 데모 링크가 작동하는지 확인

### ✅ **GitHub Pages 확인** 
- [ ] `https://yiseu.github.io/billiard-3cushion-mvp/web-demo/` 접속
- [ ] 당구공 드래그 앤 드롭 작동 확인
- [ ] 경로 계산 버튼 작동 확인
- [ ] 모바일에서도 정상 작동 확인

### ✅ **공유 준비**
- [ ] 웹 데모 URL 저장
- [ ] QR 코드 생성 (URL을 QR 코드로 변환)
- [ ] 소셜 미디어 공유 준비

---

## 🎯 활용 방법

### **👥 다른 사람에게 보여주기**
```
🌐 웹 데모 URL만 보내주면 됩니다:
https://yiseu.github.io/billiard-3cushion-mvp/web-demo/

📱 스마트폰에서도 완벽하게 작동하므로:
- 카카오톡으로 링크 공유
- QR 코드로 즉시 접속
- 이메일에 링크 첨부
```

### **💼 비즈니스 활용**
- **명함에 QR 코드** 인쇄
- **이메일 서명**에 링크 추가
- **프레젠테이션**에서 실시간 시연
- **SNS 프로필**에 링크 등록

### **🔗 추가 기능**
- **GitHub Issues**: 버그 신고 및 기능 제안
- **GitHub Discussions**: 커뮤니티 소통
- **Releases**: 버전 관리 및 배포
- **Actions**: 자동 배포 및 테스트

---

## 💡 Pro Tips

### **🎨 커스터마이징**
- `web-demo/index.html`에서 연락처 정보 수정
- `web-demo/styles.css`에서 색상 테마 변경
- `README.md`에서 GitHub 사용자명 업데이트

### **🚀 성능 최적화**
- GitHub Pages는 CDN을 통해 전 세계에서 빠른 로딩
- 자동 HTTPS 적용으로 보안 인증
- 모바일 최적화로 모든 디바이스에서 완벽

### **📊 방문자 추적**
```html
<!-- Google Analytics 추가 (선택사항) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

---

## ❗ 문제 해결

### **GitHub Pages가 작동하지 않는 경우:**
1. Settings → Pages에서 올바른 브랜치 선택 확인
2. 5-10분 기다린 후 다시 시도
3. 브라우저 캐시 삭제 후 새로고침

### **웹 데모가 로딩되지 않는 경우:**
1. `web-demo/index.html` 파일이 존재하는지 확인
2. GitHub 저장소가 Public으로 설정되었는지 확인
3. 파일 경로가 정확한지 확인

### **모바일에서 터치가 작동하지 않는 경우:**
1. HTTPS로 접속하는지 확인 (GitHub Pages는 자동 HTTPS)
2. 최신 브라우저 사용
3. JavaScript가 활성화되어 있는지 확인

---

**🎉 완료되면 전 세계 어디서든 URL 하나로 당신의 3쿠션 당구 앱을 시연할 수 있습니다!**

**🌐 https://yiseu.github.io/billiard-3cushion-mvp/web-demo/**