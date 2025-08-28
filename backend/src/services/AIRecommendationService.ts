import { ShotPath, Ball, PathPoint } from '../types';
import { UserModel } from '../models/User';

interface UserContext {
  userId?: string;
  skillLevel: number;
  avgSuccessRate: number;
  favoritedifficulty: 'easy' | 'medium' | 'hard';
  totalShots: number;
  recentPerformance: number[];
}

interface ShotContext {
  ballPositions: { cue: Ball; object1: Ball; object2: Ball };
  tableSize: { width: number; height: number };
  previousAttempts?: number;
  sessionHistory?: ShotPath[];
}

export class AIRecommendationService {
  
  /**
   * 사용자 맞춤 경로 추천
   */
  static async getPersonalizedRecommendations(
    paths: ShotPath[],
    userContext: UserContext,
    shotContext: ShotContext
  ): Promise<ShotPath[]> {
    if (paths.length === 0) return [];

    // 1. 각 경로에 대한 개인화 점수 계산
    const scoredPaths = paths.map(path => ({
      ...path,
      personalizedScore: this.calculatePersonalizedScore(path, userContext, shotContext)
    }));

    // 2. 개인화 점수로 정렬
    scoredPaths.sort((a, b) => b.personalizedScore - a.personalizedScore);

    // 3. 상위 5개 경로 반환 (개인화 정보 추가)
    return scoredPaths.slice(0, 5).map(path => ({
      ...path,
      description: this.generatePersonalizedDescription(path, userContext),
      successRate: this.adjustSuccessRateForUser(path.successRate, userContext),
      aiInsight: this.generateAIInsight(path, userContext, shotContext)
    }));
  }

  /**
   * 개인화 점수 계산 (0-100)
   */
  private static calculatePersonalizedScore(
    path: ShotPath,
    userContext: UserContext,
    shotContext: ShotContext
  ): number {
    let score = 50; // 기본 점수

    // 1. 사용자 실력 레벨 고려 (30점 배분)
    const skillFactor = this.getSkillFactor(path.difficulty, userContext.skillLevel);
    score += skillFactor * 30;

    // 2. 성공률 가중치 (25점 배분)
    const successFactor = Math.min(path.successRate * 1.2, 1.0);
    score += successFactor * 25;

    // 3. 사용자 선호도 고려 (20점 배분)
    const preferenceFactor = this.getPreferenceFactor(path, userContext);
    score += preferenceFactor * 20;

    // 4. 학습 진도 고려 (15점 배분)
    const learningFactor = this.getLearningFactor(path, userContext);
    score += learningFactor * 15;

    // 5. 컨텍스트 보너스 (10점 배분)
    const contextBonus = this.getContextBonus(path, shotContext);
    score += contextBonus * 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 실력 레벨에 따른 가중치 (-1 to 1)
   */
  private static getSkillFactor(difficulty: string, skillLevel: number): number {
    const difficultyScore = { easy: 1, medium: 5, hard: 9 }[difficulty] || 5;
    const skillGap = Math.abs(skillLevel - difficultyScore);
    
    // 실력과 난이도가 비슷하면 높은 점수
    if (skillGap <= 2) return 1.0;
    if (skillGap <= 4) return 0.5;
    return -0.5; // 너무 쉽거나 어려우면 감점
  }

  /**
   * 사용자 선호도 팩터 (0 to 1)
   */
  private static getPreferenceFactor(path: ShotPath, userContext: UserContext): number {
    // 즐겨하는 난이도와 일치하면 보너스
    if (path.difficulty === userContext.favoritedifficulty) return 1.0;
    
    // 경험이 많은 사용자는 다양성 추구
    if (userContext.totalShots > 1000) return 0.8;
    
    return 0.6;
  }

  /**
   * 학습 진도에 따른 팩터 (0 to 1)
   */
  private static getLearningFactor(path: ShotPath, userContext: UserContext): number {
    const recentAvg = userContext.recentPerformance.length > 0 
      ? userContext.recentPerformance.reduce((a, b) => a + b) / userContext.recentPerformance.length 
      : 0.5;

    // 최근 성과가 좋으면 더 어려운 도전 추천
    if (recentAvg > 0.8 && path.difficulty === 'hard') return 1.0;
    if (recentAvg > 0.6 && path.difficulty === 'medium') return 1.0;
    if (recentAvg < 0.4 && path.difficulty === 'easy') return 1.0;
    
    return 0.7;
  }

  /**
   * 상황별 컨텍스트 보너스 (0 to 1)
   */
  private static getContextBonus(path: ShotPath, shotContext: ShotContext): number {
    let bonus = 0.5;

    // 이전 시도에서 실패했던 경우 쉬운 경로 추천
    if (shotContext.previousAttempts && shotContext.previousAttempts > 3) {
      bonus += path.difficulty === 'easy' ? 0.3 : -0.1;
    }

    // 세션 히스토리 고려 (다양성)
    if (shotContext.sessionHistory) {
      const usedDifficulties = shotContext.sessionHistory.map(p => p.difficulty);
      const isUnique = !usedDifficulties.includes(path.difficulty);
      bonus += isUnique ? 0.2 : -0.1;
    }

    return Math.max(0, Math.min(1, bonus));
  }

  /**
   * 사용자 실력에 맞는 성공률 조정
   */
  private static adjustSuccessRateForUser(baseSuccessRate: number, userContext: UserContext): number {
    const skillMultiplier = Math.max(0.3, Math.min(1.5, userContext.skillLevel / 5.0));
    const experienceBonus = Math.min(0.2, userContext.totalShots / 5000);
    const recentFormFactor = userContext.avgSuccessRate / 0.6; // 0.6을 기준으로 정규화
    
    const adjustedRate = baseSuccessRate * skillMultiplier * recentFormFactor + experienceBonus;
    return Math.max(0.05, Math.min(0.95, adjustedRate));
  }

  /**
   * 개인화된 설명 생성
   */
  private static generatePersonalizedDescription(path: ShotPath, userContext: UserContext): string {
    const difficulty = path.difficulty;
    const skillLevel = userContext.skillLevel;
    const cushions = path.cushionCount;

    let description = `${cushions}쿠션 경로`;

    // 실력 레벨에 따른 조언
    if (skillLevel <= 3) {
      if (difficulty === 'easy') {
        description += ' - 초보자에게 적합한 안전한 경로입니다';
      } else {
        description += ' - 도전적이지만 실력 향상에 도움됩니다';
      }
    } else if (skillLevel <= 7) {
      if (difficulty === 'medium') {
        description += ' - 현재 실력에 딱 맞는 경로입니다';
      } else if (difficulty === 'easy') {
        description += ' - 확실한 성공을 위한 안정적인 경로입니다';
      } else {
        description += ' - 한 단계 도약을 위한 도전 경로입니다';
      }
    } else {
      if (difficulty === 'hard') {
        description += ' - 고수를 위한 테크니컬 경로입니다';
      } else {
        description += ' - 연습용으로 적합한 기본 경로입니다';
      }
    }

    return description;
  }

  /**
   * AI 인사이트 생성
   */
  private static generateAIInsight(
    path: ShotPath, 
    userContext: UserContext, 
    shotContext: ShotContext
  ): string {
    const insights: string[] = [];

    // 실력 기반 인사이트
    if (userContext.skillLevel < 4 && path.difficulty === 'hard') {
      insights.push('💡 이 경로는 도전적입니다. 각도와 힘 조절에 집중하세요');
    }

    if (userContext.avgSuccessRate < 0.4 && path.difficulty === 'easy') {
      insights.push('🎯 기본기 다지기에 좋은 경로입니다');
    }

    // 경로 특성 기반 인사이트
    if (path.cushionCount >= 4) {
      insights.push('⚡ 정확한 큐볼 컨트롤이 핵심입니다');
    }

    if (path.successRate > 0.8) {
      insights.push('✅ 높은 성공률을 기대할 수 있습니다');
    }

    // 맥락 기반 인사이트
    if (shotContext.previousAttempts && shotContext.previousAttempts > 2) {
      insights.push('🔄 반복 연습으로 감각을 익혀보세요');
    }

    return insights.length > 0 ? insights[0] : '📈 꾸준한 연습이 실력 향상의 열쇠입니다';
  }

  /**
   * 사용자별 맞춤 연습 계획 생성
   */
  static async generatePracticePlan(userId: string): Promise<any> {
    const user = await UserModel.findById(userId);
    const stats = await UserModel.getUserStats(userId);
    
    if (!user || !stats) {
      throw new Error('사용자 정보를 찾을 수 없습니다');
    }

    const plan = {
      currentLevel: user.skill_level,
      nextGoal: user.skill_level + 1,
      recommendedSessions: this.getRecommendedSessions(user.skill_level, stats),
      weeklyTargets: this.getWeeklyTargets(stats),
      focusAreas: this.getFocusAreas(stats),
      estimatedTimeToNext: this.estimateTimeToNextLevel(stats)
    };

    return plan;
  }

  private static getRecommendedSessions(skillLevel: number, stats: any) {
    if (skillLevel <= 3) {
      return {
        easy: 5,
        medium: 2,
        hard: 0,
        dailyTime: 30
      };
    } else if (skillLevel <= 6) {
      return {
        easy: 2,
        medium: 4,
        hard: 1,
        dailyTime: 45
      };
    } else {
      return {
        easy: 1,
        medium: 2,
        hard: 4,
        dailyTime: 60
      };
    }
  }

  private static getWeeklyTargets(stats: any) {
    const currentSuccessRate = stats.avg_success_rate || 0;
    return {
      targetShots: Math.max(50, stats.total_shots * 0.1),
      targetSuccessRate: Math.min(0.9, currentSuccessRate + 0.05),
      targetStreak: Math.max(5, stats.longest_streak + 1)
    };
  }

  private static getFocusAreas(stats: any) {
    const areas = [];
    
    if (stats.avg_success_rate < 0.5) {
      areas.push('기본 각도 계산');
    }
    
    if (stats.current_streak < 3) {
      areas.push('안정적인 큐 컨트롤');
    }
    
    if (stats.favorite_difficulty === 'easy') {
      areas.push('중급 난이도 도전');
    }
    
    return areas.length > 0 ? areas : ['전반적인 실력 향상'];
  }

  private static estimateTimeToNextLevel(stats: any): string {
    const progressRate = stats.total_practice_sessions > 0 
      ? stats.avg_success_rate / stats.total_practice_sessions * 1000 
      : 0.1;
    
    if (progressRate > 0.8) return '1-2주';
    if (progressRate > 0.5) return '3-4주';
    if (progressRate > 0.3) return '1-2개월';
    return '2-3개월';
  }
}