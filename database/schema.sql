-- 3쿠션 당구 분석 앱 데이터베이스 스키마
-- PostgreSQL 기준

-- Users 테이블: 사용자 정보
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    profile_image_url TEXT,
    skill_level INTEGER DEFAULT 1 CHECK (skill_level >= 1 AND skill_level <= 10),
    total_practice_time INTEGER DEFAULT 0,
    subscription_type VARCHAR(20) DEFAULT 'free' CHECK (subscription_type IN ('free', 'premium', 'pro')),
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- User Stats 테이블: 사용자 통계
CREATE TABLE user_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_shots INTEGER DEFAULT 0,
    successful_shots INTEGER DEFAULT 0,
    total_practice_sessions INTEGER DEFAULT 0,
    favorite_difficulty VARCHAR(10) DEFAULT 'medium',
    avg_success_rate DECIMAL(5,2) DEFAULT 0.0,
    total_points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shot Sessions 테이블: 샷 세션 기록
CREATE TABLE shot_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    cue_ball_x DECIMAL(6,2) NOT NULL,
    cue_ball_y DECIMAL(6,2) NOT NULL,
    object1_x DECIMAL(6,2) NOT NULL,
    object1_y DECIMAL(6,2) NOT NULL,
    object2_x DECIMAL(6,2) NOT NULL,
    object2_y DECIMAL(6,2) NOT NULL,
    table_width INTEGER DEFAULT 568,
    table_height INTEGER DEFAULT 284,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calculated Paths 테이블: 계산된 경로들
CREATE TABLE calculated_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES shot_sessions(id) ON DELETE CASCADE,
    path_index INTEGER NOT NULL,
    path_points JSONB NOT NULL, -- 경로 점들의 배열
    cushion_count INTEGER NOT NULL,
    difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    success_rate DECIMAL(5,2) NOT NULL,
    description TEXT,
    is_selected BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Practice Sessions 테이블: 연습 세션
CREATE TABLE practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('free_play', 'challenge', 'tutorial')),
    difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
    total_attempts INTEGER DEFAULT 0,
    successful_attempts INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challenges 테이블: 도전 과제
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    difficulty_level INTEGER NOT NULL CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
    cue_ball_x DECIMAL(6,2) NOT NULL,
    cue_ball_y DECIMAL(6,2) NOT NULL,
    object1_x DECIMAL(6,2) NOT NULL,
    object1_y DECIMAL(6,2) NOT NULL,
    object2_x DECIMAL(6,2) NOT NULL,
    object2_y DECIMAL(6,2) NOT NULL,
    target_success_rate DECIMAL(5,2) NOT NULL,
    max_attempts INTEGER DEFAULT 10,
    reward_points INTEGER DEFAULT 0,
    is_daily BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Challenge Progress 테이블: 사용자 도전과제 진행상황
CREATE TABLE user_challenge_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    attempts INTEGER DEFAULT 0,
    successes INTEGER DEFAULT 0,
    best_success_rate DECIMAL(5,2) DEFAULT 0.0,
    completed_at TIMESTAMP WITH TIME ZONE,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, challenge_id)
);

-- Leaderboards 테이블: 리더보드
CREATE TABLE leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    leaderboard_type VARCHAR(20) NOT NULL CHECK (leaderboard_type IN ('daily', 'weekly', 'monthly', 'all_time')),
    metric_type VARCHAR(20) NOT NULL CHECK (metric_type IN ('points', 'success_rate', 'streak', 'challenges')),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboard Entries 테이블: 리더보드 엔트리
CREATE TABLE leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leaderboard_id UUID REFERENCES leaderboards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    score DECIMAL(10,2) NOT NULL,
    metadata JSONB, -- 추가 정보 (예: 상세 통계)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(leaderboard_id, user_id)
);

-- Friends 테이블: 친구 관계
CREATE TABLE friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, friend_id),
    CHECK(user_id != friend_id)
);

-- AI Learning Data 테이블: AI 학습용 데이터
CREATE TABLE ai_learning_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES shot_sessions(id) ON DELETE CASCADE,
    selected_path_id UUID REFERENCES calculated_paths(id) ON DELETE CASCADE,
    actual_success BOOLEAN,
    user_skill_level INTEGER,
    session_context JSONB, -- 세션 컨텍스트 정보
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription Plans 테이블: 구독 플랜
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(8,2) NOT NULL,
    price_yearly DECIMAL(8,2),
    features JSONB NOT NULL, -- 기능 목록
    max_daily_calculations INTEGER,
    max_saved_sessions INTEGER,
    has_ai_recommendations BOOLEAN DEFAULT false,
    has_advanced_analytics BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_subscription ON users(subscription_type);
CREATE INDEX idx_shot_sessions_user_id ON shot_sessions(user_id);
CREATE INDEX idx_shot_sessions_created_at ON shot_sessions(created_at);
CREATE INDEX idx_calculated_paths_session_id ON calculated_paths(session_id);
CREATE INDEX idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX idx_practice_sessions_created_at ON practice_sessions(created_at);
CREATE INDEX idx_user_challenge_progress_user_id ON user_challenge_progress(user_id);
CREATE INDEX idx_user_challenge_progress_challenge_id ON user_challenge_progress(challenge_id);
CREATE INDEX idx_leaderboard_entries_leaderboard_id ON leaderboard_entries(leaderboard_id);
CREATE INDEX idx_leaderboard_entries_rank ON leaderboard_entries(rank);
CREATE INDEX idx_friends_user_id ON friends(user_id);
CREATE INDEX idx_friends_status ON friends(status);
CREATE INDEX idx_ai_learning_data_user_id ON ai_learning_data(user_id);

-- 기본 데이터 삽입
INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, features, max_daily_calculations, max_saved_sessions) VALUES 
('Free', '기본 무료 플랜', 0.00, 0.00, '["basic_path_calculation", "3_paths_per_session"]', 10, 5, false, false),
('Premium', '프리미엄 플랜', 4.99, 49.99, '["unlimited_calculations", "ai_recommendations", "progress_tracking"]', -1, 100, true, false),
('Pro', '프로 플랜', 19.99, 199.99, '["all_premium_features", "advanced_analytics", "coaching_mode", "tournament_mode"]', -1, -1, true, true);

-- 기본 도전과제 생성
INSERT INTO challenges (title, description, difficulty_level, cue_ball_x, cue_ball_y, object1_x, object1_y, object2_x, object2_y, target_success_rate, reward_points) VALUES 
('초보자의 첫걸음', '간단한 3쿠션 경로로 기초를 익혀보세요', 1, 100, 142, 200, 100, 300, 180, 0.60, 50),
('코너 마스터', '코너를 활용한 3쿠션 경로에 도전해보세요', 2, 80, 200, 400, 80, 500, 220, 0.45, 100),
('정밀 타격', '높은 정확도가 필요한 까다로운 구간입니다', 3, 150, 100, 350, 200, 450, 100, 0.35, 200),
('고수의 도전', '프로 수준의 복잡한 3쿠션 경로입니다', 4, 120, 220, 320, 60, 480, 180, 0.25, 300),
('마스터의 길', '완벽한 실력이 필요한 최고 난이도입니다', 5, 90, 180, 380, 120, 520, 80, 0.20, 500);

-- 리더보드 생성
INSERT INTO leaderboards (name, description, leaderboard_type, metric_type) VALUES 
('일간 랭킹', '하루 동안의 점수를 기준으로 한 랭킹', 'daily', 'points'),
('주간 랭킹', '일주일 동안의 점수를 기준으로 한 랭킹', 'weekly', 'points'),
('월간 마스터', '한 달 동안의 성공률을 기준으로 한 랭킹', 'monthly', 'success_rate'),
('전체 챔피언', '전체 기간 점수 기준 랭킹', 'all_time', 'points');