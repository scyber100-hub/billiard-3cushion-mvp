import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

export type SupportedLanguage = 'ko' | 'en' | 'ja' | 'zh';

export interface Translation {
  [key: string]: string | Translation;
}

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
}

// 지원되는 언어 설정
export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageConfig> = {
  ko: {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    flag: '🇰🇷',
    rtl: false,
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    rtl: false,
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    rtl: false,
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
    rtl: false,
  },
};

// 번역 데이터
const TRANSLATIONS: Record<SupportedLanguage, Translation> = {
  ko: {
    common: {
      loading: '로딩 중...',
      error: '오류',
      success: '성공',
      cancel: '취소',
      confirm: '확인',
      save: '저장',
      delete: '삭제',
      edit: '편집',
      back: '뒤로',
      next: '다음',
      previous: '이전',
      close: '닫기',
      search: '검색',
      retry: '다시 시도',
      settings: '설정',
    },
    auth: {
      login: '로그인',
      register: '회원가입',
      logout: '로그아웃',
      email: '이메일',
      password: '비밀번호',
      confirmPassword: '비밀번호 확인',
      username: '사용자명',
      forgotPassword: '비밀번호를 잊으셨나요?',
      loginSuccess: '로그인에 성공했습니다',
      loginError: '로그인에 실패했습니다',
      registerSuccess: '회원가입이 완료되었습니다',
      registerError: '회원가입에 실패했습니다',
      passwordMismatch: '비밀번호가 일치하지 않습니다',
      invalidEmail: '올바른 이메일 주소를 입력해주세요',
      passwordTooShort: '비밀번호는 8자 이상이어야 합니다',
    },
    navigation: {
      home: '홈',
      practice: '연습',
      arScan: 'AR 스캔',
      profile: '프로필',
      challenge: '도전과제',
      leaderboard: '리더보드',
      multiplayer: '멀티플레이',
    },
    home: {
      welcome: '안녕하세요!',
      welcomeMessage: '오늘도 3쿠션 실력 향상을 위해 연습해보세요',
      myStats: '나의 통계',
      quickStart: '빠른 시작',
      dailyChallenges: '오늘의 도전과제',
      topPlayers: '이번 주 톱 플레이어',
      seeAll: '전체보기',
      totalShots: '총 샷',
      averageAccuracy: '평균 정확도',
      bestStreak: '최고 연속',
      practiceTime: '연습 시간',
      allChallengesCompleted: '오늘의 모든 도전과제를 완료했습니다!',
    },
    practice: {
      attempts: '시도',
      accuracy: '정확도',
      consecutiveSuccess: '연속 성공',
      pathInfo: '경로 정보',
      success: '성공',
      failed: '실패',
      reset: '리셋',
      difficulty: '난이도',
      successRate: '성공률',
      tips: '팁',
      calculating: '경로 계산 중...',
    },
    arScan: {
      scanTable: '당구대 스캔',
      scanBalls: '공 스캔',
      calibrationComplete: '당구대 캘리브레이션 완료',
      calibrationRequired: '당구대 스캔 필요',
      scanningTable: '당구대를 화면 중앙에 맞춰주세요',
      scanningBalls: '당구공을 스캔 중입니다...',
      tableInstruction: '당구대의 네 모서리가 화면에 보이도록 위치를 조정하세요',
      ballsInstruction: '당구공들이 모두 보이도록 카메라를 조정하세요',
      scanComplete: '스캔 완료!',
      ballsDetected: '개의 공이 감지되었습니다',
      cameraPermissionRequired: '카메라 권한이 필요합니다',
      requestPermission: '권한 요청',
    },
    multiplayer: {
      quickMatch: '빠른 매칭',
      createRoom: '방 만들기',
      joinRoom: '방 참가',
      matchmaking: '매칭 중...',
      matchFound: '상대를 찾았습니다!',
      waitingForPlayers: '플레이어 대기 중...',
      ready: '준비',
      notReady: '준비 취소',
      startGame: '게임 시작',
      yourTurn: '당신의 턴입니다',
      opponentTurn: '상대방의 턴입니다',
      gameWon: '승리!',
      gameLost: '패배',
      forfeit: '포기',
      chat: '채팅',
      sendMessage: '메시지 전송',
    },
    profile: {
      editProfile: '프로필 수정',
      myAchievements: '업적',
      subscription: '구독',
      achievementsEarned: '개 달성',
      noAchievements: '아직 달성한 업적이 없습니다',
      skillLevel: '실력 레벨',
      totalScore: '총 점수',
      practiceHours: '연습 시간',
      challengesCompleted: '완료 도전과제',
      currentLevel: '현재 레벨',
      upgrade: '업그레이드',
      help: '도움말',
      privacy: '개인정보 처리방침',
      terms: '서비스 약관',
      friends: '친구',
    },
    challenges: {
      allChallenges: '전체',
      available: '진행 가능',
      completed: '완료',
      startChallenge: '도전 시작',
      challengeStarted: '도전과제 시작!',
      alreadyCompleted: '이미 완료한 도전과제입니다',
      requiredLevel: '필요 레벨',
      reward: '보상',
      successCriteria: '성공 조건',
      minAccuracy: '최소 정확도',
      maxAttempts: '최대 시도 횟수',
      timeLimit: '시간 제한',
      consecutiveSuccesses: '연속 성공',
      myBestRecord: '나의 최고 기록',
      noChallenges: '도전과제가 없습니다',
      noAvailableChallenges: '현재 진행 가능한 도전과제가 없습니다',
      noCompletedChallenges: '아직 완료한 도전과제가 없습니다',
    },
    leaderboard: {
      daily: '일간',
      weekly: '주간',
      monthly: '월간',
      allTime: '전체',
      myRank: '나의 순위',
      overallRanking: '전체 순위',
      noRankingData: '아직 순위 데이터가 없습니다',
    },
    settings: {
      language: '언어',
      notifications: '알림',
      display: '디스플레이',
      privacy: '개인정보',
      theme: '테마',
      light: '라이트',
      dark: '다크',
      auto: '자동',
      practiceReminders: '연습 알림',
      challengeUpdates: '도전과제 업데이트',
      socialUpdates: '소셜 업데이트',
      marketing: '마케팅',
      profileVisibility: '프로필 공개 설정',
      public: '공개',
      friendsOnly: '친구만',
      private: '비공개',
      showRealName: '실명 공개',
      showStats: '통계 공개',
      allowFriendRequests: '친구 요청 허용',
    },
  },
  en: {
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      close: 'Close',
      search: 'Search',
      retry: 'Retry',
      settings: 'Settings',
    },
    auth: {
      login: 'Login',
      register: 'Sign Up',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      username: 'Username',
      forgotPassword: 'Forgot Password?',
      loginSuccess: 'Login successful',
      loginError: 'Login failed',
      registerSuccess: 'Registration completed',
      registerError: 'Registration failed',
      passwordMismatch: 'Passwords do not match',
      invalidEmail: 'Please enter a valid email address',
      passwordTooShort: 'Password must be at least 8 characters',
    },
    navigation: {
      home: 'Home',
      practice: 'Practice',
      arScan: 'AR Scan',
      profile: 'Profile',
      challenge: 'Challenges',
      leaderboard: 'Leaderboard',
      multiplayer: 'Multiplayer',
    },
    home: {
      welcome: 'Welcome!',
      welcomeMessage: 'Practice today to improve your 3-cushion skills',
      myStats: 'My Statistics',
      quickStart: 'Quick Start',
      dailyChallenges: 'Daily Challenges',
      topPlayers: 'Top Players This Week',
      seeAll: 'See All',
      totalShots: 'Total Shots',
      averageAccuracy: 'Average Accuracy',
      bestStreak: 'Best Streak',
      practiceTime: 'Practice Time',
      allChallengesCompleted: 'All daily challenges completed!',
    },
    practice: {
      attempts: 'Attempts',
      accuracy: 'Accuracy',
      consecutiveSuccess: 'Consecutive Success',
      pathInfo: 'Path Info',
      success: 'Success',
      failed: 'Failed',
      reset: 'Reset',
      difficulty: 'Difficulty',
      successRate: 'Success Rate',
      tips: 'Tips',
      calculating: 'Calculating paths...',
    },
    arScan: {
      scanTable: 'Scan Table',
      scanBalls: 'Scan Balls',
      calibrationComplete: 'Table calibration completed',
      calibrationRequired: 'Table scan required',
      scanningTable: 'Align the billiard table in the center of the screen',
      scanningBalls: 'Scanning billiard balls...',
      tableInstruction: 'Position so all four corners of the table are visible on screen',
      ballsInstruction: 'Adjust camera so all billiard balls are visible',
      scanComplete: 'Scan completed!',
      ballsDetected: 'balls detected',
      cameraPermissionRequired: 'Camera permission required',
      requestPermission: 'Request Permission',
    },
    multiplayer: {
      quickMatch: 'Quick Match',
      createRoom: 'Create Room',
      joinRoom: 'Join Room',
      matchmaking: 'Finding match...',
      matchFound: 'Match found!',
      waitingForPlayers: 'Waiting for players...',
      ready: 'Ready',
      notReady: 'Not Ready',
      startGame: 'Start Game',
      yourTurn: 'Your turn',
      opponentTurn: 'Opponent\'s turn',
      gameWon: 'Victory!',
      gameLost: 'Defeat',
      forfeit: 'Forfeit',
      chat: 'Chat',
      sendMessage: 'Send Message',
    },
    profile: {
      editProfile: 'Edit Profile',
      myAchievements: 'Achievements',
      subscription: 'Subscription',
      achievementsEarned: 'achieved',
      noAchievements: 'No achievements yet',
      skillLevel: 'Skill Level',
      totalScore: 'Total Score',
      practiceHours: 'Practice Hours',
      challengesCompleted: 'Challenges Completed',
      currentLevel: 'Current Level',
      upgrade: 'Upgrade',
      help: 'Help',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      friends: 'Friends',
    },
    challenges: {
      allChallenges: 'All',
      available: 'Available',
      completed: 'Completed',
      startChallenge: 'Start Challenge',
      challengeStarted: 'Challenge started!',
      alreadyCompleted: 'Challenge already completed',
      requiredLevel: 'Required Level',
      reward: 'Reward',
      successCriteria: 'Success Criteria',
      minAccuracy: 'Minimum Accuracy',
      maxAttempts: 'Maximum Attempts',
      timeLimit: 'Time Limit',
      consecutiveSuccesses: 'Consecutive Successes',
      myBestRecord: 'My Best Record',
      noChallenges: 'No challenges available',
      noAvailableChallenges: 'No available challenges at the moment',
      noCompletedChallenges: 'No completed challenges yet',
    },
    leaderboard: {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      allTime: 'All Time',
      myRank: 'My Rank',
      overallRanking: 'Overall Ranking',
      noRankingData: 'No ranking data available yet',
    },
    settings: {
      language: 'Language',
      notifications: 'Notifications',
      display: 'Display',
      privacy: 'Privacy',
      theme: 'Theme',
      light: 'Light',
      dark: 'Dark',
      auto: 'Auto',
      practiceReminders: 'Practice Reminders',
      challengeUpdates: 'Challenge Updates',
      socialUpdates: 'Social Updates',
      marketing: 'Marketing',
      profileVisibility: 'Profile Visibility',
      public: 'Public',
      friendsOnly: 'Friends Only',
      private: 'Private',
      showRealName: 'Show Real Name',
      showStats: 'Show Statistics',
      allowFriendRequests: 'Allow Friend Requests',
    },
  },
  ja: {
    common: {
      loading: '読み込み中...',
      error: 'エラー',
      success: '成功',
      cancel: 'キャンセル',
      confirm: '確認',
      save: '保存',
      delete: '削除',
      edit: '編集',
      back: '戻る',
      next: '次へ',
      previous: '前へ',
      close: '閉じる',
      search: '検索',
      retry: '再試行',
      settings: '設定',
    },
    auth: {
      login: 'ログイン',
      register: '新規登録',
      logout: 'ログアウト',
      email: 'メールアドレス',
      password: 'パスワード',
      confirmPassword: 'パスワード確認',
      username: 'ユーザー名',
      forgotPassword: 'パスワードを忘れましたか？',
      loginSuccess: 'ログインに成功しました',
      loginError: 'ログインに失敗しました',
      registerSuccess: '登録が完了しました',
      registerError: '登録に失敗しました',
      passwordMismatch: 'パスワードが一致しません',
      invalidEmail: '正しいメールアドレスを入力してください',
      passwordTooShort: 'パスワードは8文字以上である必要があります',
    },
    navigation: {
      home: 'ホーム',
      practice: '練習',
      arScan: 'ARスキャン',
      profile: 'プロフィール',
      challenge: 'チャレンジ',
      leaderboard: 'ランキング',
      multiplayer: 'マルチプレイ',
    },
    home: {
      welcome: 'ようこそ！',
      welcomeMessage: '今日も3クッションの技術向上のため練習しましょう',
      myStats: '私の統計',
      quickStart: 'クイックスタート',
      dailyChallenges: '今日のチャレンジ',
      topPlayers: '今週のトッププレイヤー',
      seeAll: 'すべて見る',
      totalShots: '総ショット数',
      averageAccuracy: '平均精度',
      bestStreak: '最高連続',
      practiceTime: '練習時間',
      allChallengesCompleted: '今日のチャレンジをすべて完了しました！',
    },
    practice: {
      attempts: '試行',
      accuracy: '精度',
      consecutiveSuccess: '連続成功',
      pathInfo: 'パス情報',
      success: '成功',
      failed: '失敗',
      reset: 'リセット',
      difficulty: '難易度',
      successRate: '成功率',
      tips: 'ヒント',
      calculating: 'パス計算中...',
    },
    arScan: {
      scanTable: 'テーブルスキャン',
      scanBalls: 'ボールスキャン',
      calibrationComplete: 'テーブル校正完了',
      calibrationRequired: 'テーブルスキャンが必要',
      scanningTable: 'ビリヤードテーブルを画面中央に合わせてください',
      scanningBalls: 'ビリヤードボールをスキャン中...',
      tableInstruction: 'テーブルの四隅が画面に見えるように位置を調整してください',
      ballsInstruction: 'すべてのビリヤードボールが見えるようにカメラを調整してください',
      scanComplete: 'スキャン完了！',
      ballsDetected: '個のボールが検出されました',
      cameraPermissionRequired: 'カメラ権限が必要です',
      requestPermission: '権限を要求',
    },
    multiplayer: {
      quickMatch: 'クイックマッチ',
      createRoom: 'ルーム作成',
      joinRoom: 'ルーム参加',
      matchmaking: 'マッチング中...',
      matchFound: 'マッチが見つかりました！',
      waitingForPlayers: 'プレイヤー待機中...',
      ready: '準備完了',
      notReady: '準備未完了',
      startGame: 'ゲーム開始',
      yourTurn: 'あなたのターン',
      opponentTurn: '相手のターン',
      gameWon: '勝利！',
      gameLost: '敗北',
      forfeit: '棄権',
      chat: 'チャット',
      sendMessage: 'メッセージ送信',
    },
    profile: {
      editProfile: 'プロフィール編集',
      myAchievements: '実績',
      subscription: '購読',
      achievementsEarned: '個達成',
      noAchievements: 'まだ実績がありません',
      skillLevel: 'スキルレベル',
      totalScore: '総スコア',
      practiceHours: '練習時間',
      challengesCompleted: '完了したチャレンジ',
      currentLevel: '現在のレベル',
      upgrade: 'アップグレード',
      help: 'ヘルプ',
      privacy: 'プライバシーポリシー',
      terms: '利用規約',
      friends: '友達',
    },
    challenges: {
      allChallenges: '全て',
      available: '利用可能',
      completed: '完了',
      startChallenge: 'チャレンジ開始',
      challengeStarted: 'チャレンジを開始しました！',
      alreadyCompleted: 'すでに完了したチャレンジです',
      requiredLevel: '必要レベル',
      reward: '報酬',
      successCriteria: '成功基準',
      minAccuracy: '最小精度',
      maxAttempts: '最大試行回数',
      timeLimit: '制限時間',
      consecutiveSuccesses: '連続成功',
      myBestRecord: '私の最高記録',
      noChallenges: 'チャレンジがありません',
      noAvailableChallenges: '現在利用可能なチャレンジがありません',
      noCompletedChallenges: 'まだ完了したチャレンジがありません',
    },
    leaderboard: {
      daily: '日間',
      weekly: '週間',
      monthly: '月間',
      allTime: '全期間',
      myRank: '私のランク',
      overallRanking: '総合ランキング',
      noRankingData: 'まだランキングデータがありません',
    },
    settings: {
      language: '言語',
      notifications: '通知',
      display: 'ディスプレイ',
      privacy: 'プライバシー',
      theme: 'テーマ',
      light: 'ライト',
      dark: 'ダーク',
      auto: '自動',
      practiceReminders: '練習リマインダー',
      challengeUpdates: 'チャレンジ更新',
      socialUpdates: 'ソーシャル更新',
      marketing: 'マーケティング',
      profileVisibility: 'プロフィールの表示設定',
      public: '公開',
      friendsOnly: '友達のみ',
      private: '非公開',
      showRealName: '実名を表示',
      showStats: '統計を表示',
      allowFriendRequests: '友達リクエストを許可',
    },
  },
  zh: {
    common: {
      loading: '加载中...',
      error: '错误',
      success: '成功',
      cancel: '取消',
      confirm: '确认',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      back: '返回',
      next: '下一页',
      previous: '上一页',
      close: '关闭',
      search: '搜索',
      retry: '重试',
      settings: '设置',
    },
    auth: {
      login: '登录',
      register: '注册',
      logout: '退出登录',
      email: '邮箱',
      password: '密码',
      confirmPassword: '确认密码',
      username: '用户名',
      forgotPassword: '忘记密码？',
      loginSuccess: '登录成功',
      loginError: '登录失败',
      registerSuccess: '注册完成',
      registerError: '注册失败',
      passwordMismatch: '密码不匹配',
      invalidEmail: '请输入有效的邮箱地址',
      passwordTooShort: '密码至少需要8个字符',
    },
    navigation: {
      home: '主页',
      practice: '练习',
      arScan: 'AR扫描',
      profile: '个人资料',
      challenge: '挑战',
      leaderboard: '排行榜',
      multiplayer: '多人游戏',
    },
    home: {
      welcome: '欢迎！',
      welcomeMessage: '今天也来练习提高3库台球技巧吧',
      myStats: '我的统计',
      quickStart: '快速开始',
      dailyChallenges: '今日挑战',
      topPlayers: '本周顶级玩家',
      seeAll: '查看全部',
      totalShots: '总击球数',
      averageAccuracy: '平均精度',
      bestStreak: '最佳连击',
      practiceTime: '练习时间',
      allChallengesCompleted: '今日所有挑战已完成！',
    },
    practice: {
      attempts: '尝试',
      accuracy: '精度',
      consecutiveSuccess: '连续成功',
      pathInfo: '路径信息',
      success: '成功',
      failed: '失败',
      reset: '重置',
      difficulty: '难度',
      successRate: '成功率',
      tips: '提示',
      calculating: '正在计算路径...',
    },
    arScan: {
      scanTable: '扫描台桌',
      scanBalls: '扫描球',
      calibrationComplete: '台桌校准完成',
      calibrationRequired: '需要扫描台桌',
      scanningTable: '请将台球桌对准屏幕中央',
      scanningBalls: '正在扫描台球...',
      tableInstruction: '调整位置使台球桌的四个角都在屏幕中可见',
      ballsInstruction: '调整摄像头使所有台球都可见',
      scanComplete: '扫描完成！',
      ballsDetected: '个球被检测到',
      cameraPermissionRequired: '需要摄像头权限',
      requestPermission: '请求权限',
    },
    multiplayer: {
      quickMatch: '快速匹配',
      createRoom: '创建房间',
      joinRoom: '加入房间',
      matchmaking: '匹配中...',
      matchFound: '找到对手！',
      waitingForPlayers: '等待玩家中...',
      ready: '准备',
      notReady: '未准备',
      startGame: '开始游戏',
      yourTurn: '你的回合',
      opponentTurn: '对手的回合',
      gameWon: '胜利！',
      gameLost: '失败',
      forfeit: '认输',
      chat: '聊天',
      sendMessage: '发送消息',
    },
    profile: {
      editProfile: '编辑个人资料',
      myAchievements: '成就',
      subscription: '订阅',
      achievementsEarned: '个已达成',
      noAchievements: '暂无成就',
      skillLevel: '技能等级',
      totalScore: '总分',
      practiceHours: '练习时间',
      challengesCompleted: '已完成挑战',
      currentLevel: '当前等级',
      upgrade: '升级',
      help: '帮助',
      privacy: '隐私政策',
      terms: '服务条款',
      friends: '好友',
    },
    challenges: {
      allChallenges: '全部',
      available: '可用',
      completed: '已完成',
      startChallenge: '开始挑战',
      challengeStarted: '挑战开始！',
      alreadyCompleted: '挑战已完成',
      requiredLevel: '所需等级',
      reward: '奖励',
      successCriteria: '成功标准',
      minAccuracy: '最小精度',
      maxAttempts: '最大尝试次数',
      timeLimit: '时间限制',
      consecutiveSuccesses: '连续成功',
      myBestRecord: '我的最佳记录',
      noChallenges: '暂无挑战',
      noAvailableChallenges: '当前没有可用的挑战',
      noCompletedChallenges: '还没有完成的挑战',
    },
    leaderboard: {
      daily: '日榜',
      weekly: '周榜',
      monthly: '月榜',
      allTime: '总榜',
      myRank: '我的排名',
      overallRanking: '总体排名',
      noRankingData: '暂无排名数据',
    },
    settings: {
      language: '语言',
      notifications: '通知',
      display: '显示',
      privacy: '隐私',
      theme: '主题',
      light: '浅色',
      dark: '深色',
      auto: '自动',
      practiceReminders: '练习提醒',
      challengeUpdates: '挑战更新',
      socialUpdates: '社交更新',
      marketing: '营销',
      profileVisibility: '个人资料可见性',
      public: '公开',
      friendsOnly: '仅好友',
      private: '私密',
      showRealName: '显示真实姓名',
      showStats: '显示统计',
      allowFriendRequests: '允许好友请求',
    },
  },
};

class I18nService {
  private currentLanguage: SupportedLanguage = 'ko';
  private translations: Translation = TRANSLATIONS.ko;
  private fallbackTranslations: Translation = TRANSLATIONS.en;

  constructor() {
    this.initializeLanguage();
  }

  /**
   * 언어 초기화
   */
  private async initializeLanguage() {
    try {
      // 저장된 언어 설정 확인
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      
      if (savedLanguage && this.isValidLanguage(savedLanguage)) {
        this.currentLanguage = savedLanguage as SupportedLanguage;
      } else {
        // 시스템 언어 감지
        const systemLanguage = this.getSystemLanguage();
        this.currentLanguage = systemLanguage;
      }

      this.translations = TRANSLATIONS[this.currentLanguage];
    } catch (error) {
      console.error('Failed to initialize language:', error);
      this.currentLanguage = 'ko';
      this.translations = TRANSLATIONS.ko;
    }
  }

  /**
   * 시스템 언어 감지
   */
  private getSystemLanguage(): SupportedLanguage {
    let systemLanguage = 'ko';

    try {
      if (Platform.OS === 'ios') {
        systemLanguage = NativeModules.SettingsManager?.settings?.AppleLocale?.split('_')[0] || 'ko';
      } else {
        systemLanguage = NativeModules.I18nManager?.localeIdentifier?.split('_')[0] || 'ko';
      }
    } catch (error) {
      console.warn('Could not detect system language:', error);
    }

    // 지원되는 언어인지 확인
    if (this.isValidLanguage(systemLanguage)) {
      return systemLanguage as SupportedLanguage;
    }

    return 'ko'; // 기본값
  }

  /**
   * 유효한 언어인지 확인
   */
  private isValidLanguage(language: string): boolean {
    return Object.keys(SUPPORTED_LANGUAGES).includes(language);
  }

  /**
   * 번역 문자열 가져오기
   */
  t(key: string, params?: Record<string, string | number>): string {
    const translation = this.getNestedValue(this.translations, key) ||
                       this.getNestedValue(this.fallbackTranslations, key) ||
                       key;

    if (params && typeof translation === 'string') {
      return this.interpolate(translation, params);
    }

    return typeof translation === 'string' ? translation : key;
  }

  /**
   * 중첩된 객체에서 값 가져오기
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * 문자열 보간
   */
  private interpolate(template: string, params: Record<string, string | number>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key]?.toString() || match;
    });
  }

  /**
   * 현재 언어 가져오기
   */
  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * 현재 언어 설정 정보 가져오기
   */
  getCurrentLanguageConfig(): LanguageConfig {
    return SUPPORTED_LANGUAGES[this.currentLanguage];
  }

  /**
   * 언어 변경
   */
  async changeLanguage(language: SupportedLanguage): Promise<boolean> {
    try {
      if (!this.isValidLanguage(language)) {
        console.error('Invalid language:', language);
        return false;
      }

      this.currentLanguage = language;
      this.translations = TRANSLATIONS[language];

      // 선택한 언어 저장
      await AsyncStorage.setItem('selectedLanguage', language);
      
      console.log('Language changed to:', language);
      return true;
    } catch (error) {
      console.error('Failed to change language:', error);
      return false;
    }
  }

  /**
   * 지원되는 언어 목록 가져오기
   */
  getSupportedLanguages(): LanguageConfig[] {
    return Object.values(SUPPORTED_LANGUAGES);
  }

  /**
   * 언어별 숫자 형식
   */
  formatNumber(number: number): string {
    try {
      return new Intl.NumberFormat(this.getLocale()).format(number);
    } catch (error) {
      return number.toString();
    }
  }

  /**
   * 언어별 날짜 형식
   */
  formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
    try {
      return new Intl.DateTimeFormat(this.getLocale(), options).format(date);
    } catch (error) {
      return date.toLocaleDateString();
    }
  }

  /**
   * 언어별 상대 시간 형식
   */
  formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return this.t('common.justNow', { seconds: diffInSeconds });
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return this.t('common.minutesAgo', { minutes });
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return this.t('common.hoursAgo', { hours });
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return this.t('common.daysAgo', { days });
    }
  }

  /**
   * 로케일 가져오기
   */
  private getLocale(): string {
    const locales: Record<SupportedLanguage, string> = {
      ko: 'ko-KR',
      en: 'en-US',
      ja: 'ja-JP',
      zh: 'zh-CN',
    };
    
    return locales[this.currentLanguage] || 'ko-KR';
  }

  /**
   * RTL 지원 여부
   */
  isRTL(): boolean {
    return SUPPORTED_LANGUAGES[this.currentLanguage].rtl;
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const i18n = new I18nService();

// 편의 함수들
export const t = (key: string, params?: Record<string, string | number>) => i18n.t(key, params);
export const getCurrentLanguage = () => i18n.getCurrentLanguage();
export const changeLanguage = (language: SupportedLanguage) => i18n.changeLanguage(language);
export const getSupportedLanguages = () => i18n.getSupportedLanguages();
export const formatNumber = (number: number) => i18n.formatNumber(number);
export const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions) => i18n.formatDate(date, options);
export const isRTL = () => i18n.isRTL();