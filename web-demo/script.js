// 전역 변수
let isDragging = false;
let currentBall = null;
let balls = {
    white: { x: 100, y: 120, element: null },
    red: { x: 400, y: 120, element: null },
    yellow: { x: 600, y: 120, element: null }
};

// DOM이 로드되면 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeBalls();
    initializePhoneDemo();
});

// 공 초기화
function initializeBalls() {
    balls.white.element = document.getElementById('white-ball');
    balls.red.element = document.getElementById('red-ball');
    balls.yellow.element = document.getElementById('yellow-ball');
    
    // 각 공에 드래그 이벤트 추가
    Object.keys(balls).forEach(color => {
        const ball = balls[color].element;
        if (ball) {
            ball.addEventListener('mousedown', startDrag);
            ball.addEventListener('touchstart', startDrag, { passive: false });
        }
    });
    
    // 전역 이벤트 리스너
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', endDrag);
}

// 드래그 시작
function startDrag(e) {
    e.preventDefault();
    isDragging = true;
    currentBall = e.target.closest('.ball');
    
    if (currentBall) {
        currentBall.style.zIndex = '20';
        currentBall.style.cursor = 'grabbing';
        currentBall.style.transform = 'scale(1.1)';
    }
}

// 드래그 중
function drag(e) {
    if (!isDragging || !currentBall) return;
    
    e.preventDefault();
    
    const table = document.querySelector('.table-surface');
    const rect = table.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.type.includes('touch')) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    // 테이블 내에서의 상대 위치 계산
    let x = clientX - rect.left - 15; // 공 반지름 고려
    let y = clientY - rect.top - 15;
    
    // 경계 제한 (쿠션 고려)
    const minX = 25; // 왼쪽 쿠션
    const maxX = rect.width - 45; // 오른쪽 쿠션
    const minY = 25; // 위쪽 쿠션
    const maxY = rect.height - 45; // 아래쪽 쿠션
    
    x = Math.max(minX, Math.min(maxX, x));
    y = Math.max(minY, Math.min(maxY, y));
    
    currentBall.style.left = x + 'px';
    currentBall.style.top = y + 'px';
    
    // 실시간으로 정보 업데이트
    updateBallInfo();
}

// 드래그 종료
function endDrag() {
    if (currentBall) {
        currentBall.style.zIndex = '10';
        currentBall.style.cursor = 'grab';
        currentBall.style.transform = 'scale(1)';
        
        // 공 위치 저장
        saveBallPosition(currentBall);
    }
    
    isDragging = false;
    currentBall = null;
}

// 공 위치 저장
function saveBallPosition(ballElement) {
    const id = ballElement.id;
    const color = id.split('-')[0]; // 'white-ball' -> 'white'
    
    if (balls[color]) {
        balls[color].x = parseInt(ballElement.style.left);
        balls[color].y = parseInt(ballElement.style.top);
    }
}

// 공 정보 업데이트
function updateBallInfo() {
    // 거리 계산 (임시)
    const distance = Math.random() * 3 + 1.5;
    document.getElementById('distance').textContent = distance.toFixed(1) + 'm';
    
    // 성공률 계산 (임시)
    const successRate = Math.floor(Math.random() * 40) + 60;
    document.getElementById('success-rate').textContent = successRate + '%';
    
    // 난이도 계산
    const difficulties = ['초급', '중급', '고급', '전문가'];
    const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
    document.getElementById('difficulty').textContent = difficulty;
}

// 경로 계산
function calculatePath() {
    const canvas = document.getElementById('path-canvas');
    const ctx = canvas.getContext('2d');
    
    // 캔버스 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 현재 공 위치 가져오기
    const whiteX = parseInt(balls.white.element.style.left) + 15;
    const whiteY = parseInt(balls.white.element.style.top) + 15;
    const redX = parseInt(balls.red.element.style.left) + 15;
    const redY = parseInt(balls.red.element.style.top) + 15;
    
    // 경로 그리기 (간단한 3쿠션 시뮬레이션)
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    ctx.moveTo(whiteX, whiteY);
    
    // 첫 번째 쿠션 (상단)
    const firstCushionX = whiteX + (redX - whiteX) * 0.3;
    const firstCushionY = 20;
    ctx.lineTo(firstCushionX, firstCushionY);
    
    // 두 번째 쿠션 (우측)
    const secondCushionX = canvas.width - 20;
    const secondCushionY = firstCushionY + (redY - firstCushionY) * 0.5;
    ctx.lineTo(secondCushionX, secondCushionY);
    
    // 세 번째 쿠션 (하단)
    const thirdCushionX = secondCushionX - (secondCushionX - redX) * 0.4;
    const thirdCushionY = canvas.height - 20;
    ctx.lineTo(thirdCushionX, thirdCushionY);
    
    // 목표 공까지
    ctx.lineTo(redX, redY);
    
    ctx.stroke();
    
    // 쿠션 포인트 표시
    ctx.fillStyle = '#FF4444';
    ctx.beginPath();
    ctx.arc(firstCushionX, firstCushionY, 4, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(secondCushionX, secondCushionY, 4, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(thirdCushionX, thirdCushionY, 4, 0, 2 * Math.PI);
    ctx.fill();
    
    // 정보 업데이트
    updateBallInfo();
    
    // 성공 메시지
    showToast('경로 계산 완료! 3쿠션 경로가 표시되었습니다.');
}

// 공 위치 리셋
function resetBalls() {
    balls.white.element.style.left = '100px';
    balls.white.element.style.top = '120px';
    balls.red.element.style.left = '400px';
    balls.red.element.style.top = '120px';
    balls.yellow.element.style.left = '600px';
    balls.yellow.element.style.top = '120px';
    
    // 캔버스 클리어
    const canvas = document.getElementById('path-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 정보 초기화
    document.getElementById('success-rate').textContent = '85%';
    document.getElementById('difficulty').textContent = '중급';
    document.getElementById('distance').textContent = '2.4m';
    
    showToast('공 위치가 초기화되었습니다.');
}

// 샷 시뮬레이션
function simulateShot() {
    const whiteBall = balls.white.element;
    
    // 애니메이션 효과
    whiteBall.classList.add('animate');
    
    // 성공/실패 랜덤 결정
    const isSuccess = Math.random() > 0.3; // 70% 성공률
    
    setTimeout(() => {
        whiteBall.classList.remove('animate');
        
        if (isSuccess) {
            showToast('🎉 성공! 훌륭한 3쿠션 샷입니다!', 'success');
            // 성공 시 점수 증가 애니메이션 등 추가 가능
        } else {
            showToast('😅 아쉬워요! 다시 도전해보세요.', 'info');
        }
    }, 600);
}

// 토스트 메시지 표시
function showToast(message, type = 'info') {
    // 기존 토스트 제거
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // 스타일 적용
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 3000;
        font-weight: 500;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        opacity: 0;
        transform: translateX(100px);
        transition: all 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // 애니메이션
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // 자동 제거
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 폰 데모 초기화
function initializePhoneDemo() {
    // 폰 화면 전환 애니메이션 등 추가 가능
}

// 폰 메뉴 클릭 핸들러
function showPracticeMode() {
    showToast('연습 모드가 실행됩니다! 📱');
    scrollToDemo();
}

function showARMode() {
    showToast('📷 AR 카메라가 실행됩니다!');
    showARDemo();
}

function showMultiplayer() {
    showToast('👥 친구와의 대전 모드입니다!');
}

function showProfile() {
    showToast('📊 개인 통계를 확인할 수 있습니다!');
}

// AR 데모 표시
function showARDemo() {
    const modal = document.getElementById('feature-modal');
    const modalBody = document.getElementById('modal-body');
    
    modalBody.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h2 style="color: #2E7D32; margin-bottom: 20px;">📷 AR 테이블 스캔 데모</h2>
            <div style="background: #f0f0f0; border-radius: 15px; padding: 30px; margin: 20px 0;">
                <div style="background: #228B22; width: 300px; height: 150px; margin: 0 auto; border-radius: 10px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 18px;">
                        📱 카메라 뷰
                    </div>
                    <div style="position: absolute; top: 20px; left: 50px; width: 20px; height: 20px; background: white; border-radius: 50%; box-shadow: 0 0 10px rgba(255,215,0,0.8);"></div>
                    <div style="position: absolute; top: 80px; left: 150px; width: 20px; height: 20px; background: red; border-radius: 50%; box-shadow: 0 0 10px rgba(255,215,0,0.8);"></div>
                    <div style="position: absolute; top: 60px; right: 50px; width: 20px; height: 20px; background: yellow; border-radius: 50%; box-shadow: 0 0 10px rgba(255,215,0,0.8);"></div>
                    
                    <!-- AR 경로 표시 -->
                    <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                        <path d="M 60 30 Q 120 10 200 40 Q 250 60 240 90 Q 220 120 170 80" 
                              stroke="#FFD700" stroke-width="3" stroke-dasharray="5,5" fill="none" opacity="0.8"/>
                        <circle cx="120" cy="20" r="3" fill="#FF4444"/>
                        <circle cx="240" cy="50" r="3" fill="#FF4444"/>
                        <circle cx="230" cy="110" r="3" fill="#FF4444"/>
                    </svg>
                </div>
                <p style="margin-top: 20px; color: #666; line-height: 1.6;">
                    📱 실제 당구대를 카메라로 스캔하면<br>
                    🎯 AI가 공 위치를 자동 인식하고<br>
                    ✨ 증강현실로 최적 경로를 표시합니다
                </p>
                <div style="display: flex; justify-content: center; gap: 15px; margin-top: 20px;">
                    <span style="background: #4CAF50; color: white; padding: 8px 15px; border-radius: 20px; font-size: 14px;">
                        🎯 자동 인식
                    </span>
                    <span style="background: #2196F3; color: white; padding: 8px 15px; border-radius: 20px; font-size: 14px;">
                        📐 정밀 계산
                    </span>
                    <span style="background: #FF9800; color: white; padding: 8px 15px; border-radius: 20px; font-size: 14px;">
                        ✨ AR 표시
                    </span>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

// 스크롤 함수들
function scrollToDemo() {
    document.getElementById('demo').scrollIntoView({ behavior: 'smooth' });
}

function scrollToFeatures() {
    document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
}

// 앱 스토어 다운로드
function showAppStore() {
    showToast('🚀 곧 출시 예정입니다! 베타 테스터를 모집 중이에요.');
}

// 기능 데모 표시
function showFeatureDemo(feature) {
    const modal = document.getElementById('feature-modal');
    const modalBody = document.getElementById('modal-body');
    
    const demos = {
        precision: {
            title: '🎯 정밀 경로 계산',
            content: `
                <div style="text-align: center;">
                    <h3 style="color: #2E7D32; margin-bottom: 20px;">99% 정확도의 물리 엔진</h3>
                    <div style="background: #f8f9fa; border-radius: 15px; padding: 30px;">
                        <div style="display: flex; justify-content: space-around; margin-bottom: 20px;">
                            <div>
                                <div style="font-size: 32px; color: #2E7D32;">99%</div>
                                <div style="font-size: 14px; color: #666;">정확도</div>
                            </div>
                            <div>
                                <div style="font-size: 32px; color: #2E7D32;">0.1초</div>
                                <div style="font-size: 14px; color: #666;">계산 속도</div>
                            </div>
                            <div>
                                <div style="font-size: 32px; color: #2E7D32;">∞</div>
                                <div style="font-size: 14px; color: #666;">경로 수</div>
                            </div>
                        </div>
                        <p style="color: #666;">
                            실제 당구장에서 검증된 물리 엔진으로<br>
                            마찰력, 회전력, 충격력까지 모두 고려한<br>
                            정밀한 3쿠션 경로를 계산합니다.
                        </p>
                    </div>
                </div>
            `
        },
        ar: {
            title: '📱 AR 테이블 스캔',
            content: `
                <div style="text-align: center;">
                    <h3 style="color: #2E7D32; margin-bottom: 20px;">세계 최초 AR 당구 기술</h3>
                    <div style="background: #228B22; width: 100%; max-width: 400px; height: 200px; margin: 0 auto 20px; border-radius: 15px; position: relative;">
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 16px;">
                            📱 실시간 AR 뷰
                        </div>
                        <div style="position: absolute; top: 40px; left: 80px; width: 25px; height: 25px; background: white; border-radius: 50%; animation: pulse 2s infinite;"></div>
                        <div style="position: absolute; top: 100px; left: 200px; width: 25px; height: 25px; background: red; border-radius: 50%; animation: pulse 2s infinite;"></div>
                        <div style="position: absolute; top: 70px; right: 80px; width: 25px; height: 25px; background: yellow; border-radius: 50%; animation: pulse 2s infinite;"></div>
                    </div>
                    <div style="background: #f8f9fa; border-radius: 15px; padding: 20px;">
                        <p style="color: #666; margin-bottom: 15px;">
                            📷 카메라로 테이블 스캔 → 🎯 AI 공 인식 → ✨ AR 경로 표시
                        </p>
                        <div style="display: flex; justify-content: center; gap: 10px;">
                            <span style="background: #4CAF50; color: white; padding: 5px 12px; border-radius: 15px; font-size: 12px;">ML Kit</span>
                            <span style="background: #2196F3; color: white; padding: 5px 12px; border-radius: 15px; font-size: 12px;">ARCore</span>
                            <span style="background: #FF9800; color: white; padding: 5px 12px; border-radius: 15px; font-size: 12px;">ARKit</span>
                        </div>
                    </div>
                </div>
                <style>
                    @keyframes pulse {
                        0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.7); }
                        70% { box-shadow: 0 0 0 10px rgba(255, 215, 0, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }
                    }
                </style>
            `
        },
        ai: {
            title: '🧠 AI 맞춤 코칭',
            content: `
                <div style="text-align: center;">
                    <h3 style="color: #2E7D32; margin-bottom: 20px;">개인 맞춤 AI 당구 코치</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div style="background: #f8f9fa; border-radius: 15px; padding: 20px;">
                            <h4 style="color: #2E7D32; margin-bottom: 15px;">📊 실력 분석</h4>
                            <div style="margin-bottom: 10px;">성공률: <strong>73%</strong></div>
                            <div style="margin-bottom: 10px;">선호 각도: <strong>45°</strong></div>
                            <div style="margin-bottom: 10px;">약점: <strong>장거리 샷</strong></div>
                            <div>레벨: <strong>중급자</strong></div>
                        </div>
                        <div style="background: #f8f9fa; border-radius: 15px; padding: 20px;">
                            <h4 style="color: #2E7D32; margin-bottom: 15px;">🎯 맞춤 추천</h4>
                            <div style="margin-bottom: 10px;">✅ 쿠션 각도 연습</div>
                            <div style="margin-bottom: 10px;">✅ 중거리 정확도</div>
                            <div style="margin-bottom: 10px;">✅ 회전력 조절</div>
                            <div>✅ 스핀 기술</div>
                        </div>
                    </div>
                    <div style="background: linear-gradient(135deg, #2E7D32, #388E3C); color: white; border-radius: 15px; padding: 20px; margin-top: 20px;">
                        <p>💡 <strong>AI 코치의 조언</strong></p>
                        <p style="margin-top: 10px; font-style: italic;">
                            "장거리 샷에서 힘 조절이 부족합니다.<br>
                            오늘은 중거리 뱅크샷 위주로 연습해보세요!"
                        </p>
                    </div>
                </div>
            `
        },
        multiplayer: {
            title: '👥 실시간 멀티플레이어',
            content: `
                <div style="text-align: center;">
                    <h3 style="color: #2E7D32; margin-bottom: 20px;">전 세계와 실시간 대전</h3>
                    <div style="background: #f8f9fa; border-radius: 15px; padding: 20px; margin-bottom: 20px;">
                        <h4 style="color: #2E7D32; margin-bottom: 15px;">🏆 현재 진행중인 대전</h4>
                        <div style="display: flex; justify-content: space-between; align-items: center; background: white; border-radius: 10px; padding: 15px; margin-bottom: 10px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 40px; height: 40px; background: #2E7D32; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">김</div>
                                <span>김당구</span>
                            </div>
                            <div style="font-size: 24px; font-weight: bold; color: #2E7D32;">2 : 1</div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span>이마스터</span>
                                <div style="width: 40px; height: 40px; background: #FF9800; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">이</div>
                            </div>
                        </div>
                        <div style="font-size: 14px; color: #666;">⏱️ 김당구님의 차례 (남은 시간: 45초)</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="background: #4CAF50; color: white; border-radius: 10px; padding: 15px;">
                            <div style="font-size: 20px; margin-bottom: 5px;">1,247</div>
                            <div style="font-size: 14px;">온라인 플레이어</div>
                        </div>
                        <div style="background: #2196F3; color: white; border-radius: 10px; padding: 15px;">
                            <div style="font-size: 20px; margin-bottom: 5px;">156</div>
                            <div style="font-size: 14px;">대기중인 경기</div>
                        </div>
                    </div>
                </div>
            `
        }
    };
    
    const demo = demos[feature];
    if (demo) {
        modalBody.innerHTML = `
            <h2 style="color: #2E7D32; margin-bottom: 30px;">${demo.title}</h2>
            ${demo.content}
        `;
        modal.style.display = 'block';
    }
}

// 모달 닫기
function closeModal() {
    document.getElementById('feature-modal').style.display = 'none';
}

// 연락처 폼
function showContactForm() {
    showToast('📞 문의해 주셔서 감사합니다! 빠른 시일 내에 연락드리겠습니다.');
}

// 클릭 외부 영역으로 모달 닫기
window.onclick = function(event) {
    const modal = document.getElementById('feature-modal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// 스크롤에 따른 헤더 스타일 변경
window.addEventListener('scroll', function() {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.style.background = 'rgba(255, 255, 255, 0.98)';
        header.style.boxShadow = '0 2px 30px rgba(0,0,0,0.15)';
    } else {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
        header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.1)';
    }
});

// 부드러운 스크롤 네비게이션
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
        }
    });
});