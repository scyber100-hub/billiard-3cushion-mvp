import { Request, Response } from 'express';
import pool from '../config/database';
import { APIResponse } from '../types';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export class PracticeController {
  
  /**
   * 도전과제 목록 조회
   */
  static async getChallenges(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { difficulty, category, limit = 20 } = req.query;

      let query = `
        SELECT 
          c.*,
          CASE 
            WHEN ucp.user_id IS NOT NULL THEN jsonb_build_object(
              'attempts', ucp.attempts,
              'successes', ucp.successes,
              'best_success_rate', ucp.best_success_rate,
              'completed_at', ucp.completed_at,
              'points_earned', ucp.points_earned
            )
            ELSE NULL
          END as user_progress
        FROM challenges c
        LEFT JOIN user_challenge_progress ucp ON c.id = ucp.challenge_id AND ucp.user_id = $1
        WHERE c.is_active = true
      `;

      const params = [userId];
      let paramIndex = 2;

      if (difficulty) {
        query += ` AND c.difficulty_level = $${paramIndex}`;
        params.push(difficulty);
        paramIndex++;
      }

      if (category === 'daily') {
        query += ` AND c.is_daily = true`;
      }

      query += ` ORDER BY c.difficulty_level ASC, c.created_at DESC LIMIT $${paramIndex}`;
      params.push(parseInt(limit as string));

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: {
          challenges: result.rows,
          total: result.rows.length
        },
        message: '도전과제 목록을 가져왔습니다.'
      });

    } catch (error) {
      console.error('Get challenges error:', error);
      res.status(500).json({
        success: false,
        error: '도전과제 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 특정 도전과제 시작
   */
  static async startChallenge(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { challengeId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '인증이 필요합니다.'
        });
      }

      // 도전과제 정보 조회
      const challengeQuery = 'SELECT * FROM challenges WHERE id = $1 AND is_active = true';
      const challengeResult = await pool.query(challengeQuery, [challengeId]);

      if (challengeResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '도전과제를 찾을 수 없습니다.'
        });
      }

      const challenge = challengeResult.rows[0];

      // 사용자 진행상황 조회 또는 생성
      const progressQuery = `
        INSERT INTO user_challenge_progress (user_id, challenge_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, challenge_id) 
        DO UPDATE SET updated_at = NOW()
        RETURNING *
      `;

      const progressResult = await pool.query(progressQuery, [userId, challengeId]);

      res.json({
        success: true,
        data: {
          challenge,
          progress: progressResult.rows[0]
        },
        message: '도전과제를 시작했습니다.'
      });

    } catch (error) {
      console.error('Start challenge error:', error);
      res.status(500).json({
        success: false,
        error: '도전과제 시작 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 도전과제 결과 제출
   */
  static async submitChallengeResult(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { challengeId } = req.params;
      const { success, successRate, duration } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '인증이 필요합니다.'
        });
      }

      // 트랜잭션 시작
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        // 도전과제 정보 조회
        const challengeQuery = 'SELECT * FROM challenges WHERE id = $1 AND is_active = true';
        const challengeResult = await client.query(challengeQuery, [challengeId]);

        if (challengeResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({
            success: false,
            error: '도전과제를 찾을 수 없습니다.'
          });
        }

        const challenge = challengeResult.rows[0];

        // 진행상황 업데이트
        const updateProgressQuery = `
          UPDATE user_challenge_progress 
          SET 
            attempts = attempts + 1,
            successes = successes + $3,
            best_success_rate = GREATEST(best_success_rate, $4),
            completed_at = CASE 
              WHEN $3 = 1 AND $4 >= $5 AND completed_at IS NULL THEN NOW()
              ELSE completed_at
            END,
            points_earned = CASE
              WHEN $3 = 1 AND $4 >= $5 AND completed_at IS NULL THEN $6
              ELSE points_earned
            END,
            updated_at = NOW()
          WHERE user_id = $1 AND challenge_id = $2
          RETURNING *
        `;

        const progressResult = await client.query(updateProgressQuery, [
          userId,
          challengeId,
          success ? 1 : 0,
          successRate,
          challenge.target_success_rate,
          challenge.reward_points
        ]);

        const progress = progressResult.rows[0];
        const isNewCompletion = success && successRate >= challenge.target_success_rate && !progress.completed_at;

        // 사용자 통계 업데이트
        if (success) {
          await client.query(`
            UPDATE user_stats 
            SET 
              total_shots = total_shots + 1,
              successful_shots = successful_shots + 1,
              total_points = total_points + $2,
              current_streak = current_streak + 1,
              longest_streak = GREATEST(longest_streak, current_streak + 1),
              updated_at = NOW()
            WHERE user_id = $1
          `, [userId, isNewCompletion ? challenge.reward_points : 0]);
        } else {
          await client.query(`
            UPDATE user_stats 
            SET 
              total_shots = total_shots + 1,
              current_streak = 0,
              updated_at = NOW()
            WHERE user_id = $1
          `, [userId]);
        }

        // 연습 세션 기록
        await client.query(`
          INSERT INTO practice_sessions (
            user_id, session_type, difficulty_level, 
            total_attempts, successful_attempts, duration_seconds, 
            points_earned, completed_at
          ) VALUES ($1, 'challenge', $2, 1, $3, $4, $5, NOW())
        `, [
          userId,
          challenge.difficulty_level,
          success ? 1 : 0,
          duration || 0,
          isNewCompletion ? challenge.reward_points : 0
        ]);

        await client.query('COMMIT');

        res.json({
          success: true,
          data: {
            progress: progressResult.rows[0],
            isNewCompletion,
            pointsEarned: isNewCompletion ? challenge.reward_points : 0
          },
          message: isNewCompletion 
            ? `축하합니다! 도전과제를 완료하여 ${challenge.reward_points}점을 획득했습니다.`
            : '결과가 기록되었습니다.'
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Submit challenge result error:', error);
      res.status(500).json({
        success: false,
        error: '결과 제출 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 개인 맞춤 연습 계획 조회
   */
  static async getPracticePlan(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '인증이 필요합니다.'
        });
      }

      // 사용자 정보 및 통계 조회
      const userQuery = `
        SELECT 
          u.*,
          us.total_shots,
          us.successful_shots,
          us.avg_success_rate,
          us.current_streak,
          us.longest_streak,
          us.favorite_difficulty,
          us.total_practice_sessions
        FROM users u
        LEFT JOIN user_stats us ON u.id = us.user_id
        WHERE u.id = $1
      `;

      const userResult = await pool.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '사용자를 찾을 수 없습니다.'
        });
      }

      const user = userResult.rows[0];

      // 최근 연습 성과 조회 (최근 10회)
      const recentPerformanceQuery = `
        SELECT successful_attempts::float / NULLIF(total_attempts, 0) as success_rate
        FROM practice_sessions
        WHERE user_id = $1 AND total_attempts > 0
        ORDER BY created_at DESC
        LIMIT 10
      `;

      const performanceResult = await pool.query(recentPerformanceQuery, [userId]);
      const recentPerformance = performanceResult.rows.map(row => row.success_rate || 0);

      // 개인화된 연습 계획 생성
      const practicePlan = this.generatePersonalizedPracticePlan(user, recentPerformance);

      // 추천 도전과제 (사용자 레벨에 맞는)
      const recommendedChallengesQuery = `
        SELECT c.*, 
          CASE WHEN ucp.user_id IS NOT NULL THEN 'in_progress' ELSE 'not_started' END as status
        FROM challenges c
        LEFT JOIN user_challenge_progress ucp ON c.id = ucp.challenge_id 
          AND ucp.user_id = $1 AND ucp.completed_at IS NULL
        WHERE c.is_active = true 
          AND c.difficulty_level BETWEEN $2 AND $3
        ORDER BY 
          CASE WHEN ucp.user_id IS NOT NULL THEN 0 ELSE 1 END,
          c.difficulty_level ASC,
          c.reward_points DESC
        LIMIT 5
      `;

      const skillLevel = user.skill_level || 1;
      const minDifficulty = Math.max(1, skillLevel - 1);
      const maxDifficulty = Math.min(5, skillLevel + 1);

      const challengesResult = await pool.query(recommendedChallengesQuery, [
        userId, minDifficulty, maxDifficulty
      ]);

      res.json({
        success: true,
        data: {
          practicePlan,
          recommendedChallenges: challengesResult.rows,
          userStats: {
            currentLevel: skillLevel,
            totalShots: user.total_shots || 0,
            successRate: user.avg_success_rate || 0,
            currentStreak: user.current_streak || 0,
            longestStreak: user.longest_streak || 0
          }
        },
        message: '개인 맞춤 연습 계획을 생성했습니다.'
      });

    } catch (error) {
      console.error('Get practice plan error:', error);
      res.status(500).json({
        success: false,
        error: '연습 계획 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 개인화된 연습 계획 생성
   */
  private static generatePersonalizedPracticePlan(user: any, recentPerformance: number[]) {
    const skillLevel = user.skill_level || 1;
    const avgSuccessRate = user.avg_success_rate || 0;
    const totalSessions = user.total_practice_sessions || 0;
    const recentAvg = recentPerformance.length > 0 
      ? recentPerformance.reduce((a, b) => a + b) / recentPerformance.length 
      : 0;

    // 레벨별 기본 계획
    let plan = {
      currentLevel: skillLevel,
      nextGoal: skillLevel + 1,
      dailyTarget: {
        easy: 0,
        medium: 0,
        hard: 0,
        totalTime: 30
      },
      weeklyGoals: {
        totalShots: 50,
        targetSuccessRate: 0.6,
        newChallenges: 2
      },
      focusAreas: [] as string[],
      recommendations: [] as string[]
    };

    // 실력 레벨별 맞춤 계획
    if (skillLevel <= 3) {
      plan.dailyTarget = { easy: 5, medium: 2, hard: 0, totalTime: 30 };
      plan.focusAreas = ['기본 각도 계산', '안정적인 큐 컨트롤'];
      plan.recommendations = [
        '쉬운 난이도 위주로 기본기를 다져보세요',
        '매일 30분씩 꾸준히 연습하는 것이 중요합니다'
      ];
    } else if (skillLevel <= 6) {
      plan.dailyTarget = { easy: 2, medium: 4, hard: 1, totalTime: 45 };
      plan.focusAreas = ['중급 패턴 학습', '다양한 상황 대응'];
      plan.recommendations = [
        '중간 난이도 문제로 실력을 늘려보세요',
        '다양한 공 배치로 경험을 쌓아보세요'
      ];
    } else {
      plan.dailyTarget = { easy: 1, medium: 2, hard: 4, totalTime: 60 };
      plan.focusAreas = ['고난도 테크닉', '정밀 컨트롤'];
      plan.recommendations = [
        '어려운 상황에 도전하여 실력을 완성해보세요',
        '프로 수준의 정밀함을 목표로 연습하세요'
      ];
    }

    // 최근 성과에 따른 조정
    if (recentAvg > 0.8) {
      plan.recommendations.unshift('최근 성과가 우수합니다! 더 어려운 도전에 임해보세요');
      if (skillLevel < 10) {
        plan.dailyTarget.hard += 1;
        plan.dailyTarget.easy = Math.max(0, plan.dailyTarget.easy - 1);
      }
    } else if (recentAvg < 0.4) {
      plan.recommendations.unshift('기본기 다지기에 집중해보세요');
      plan.dailyTarget.easy += 2;
      plan.dailyTarget.hard = Math.max(0, plan.dailyTarget.hard - 1);
    }

    // 목표 조정
    plan.weeklyGoals.targetSuccessRate = Math.min(0.9, Math.max(0.3, avgSuccessRate + 0.05));
    plan.weeklyGoals.totalShots = Math.max(30, totalSessions * 3);

    return plan;
  }

  /**
   * 연습 통계 조회
   */
  static async getPracticeStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { period = 'week' } = req.query; // week, month, all

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '인증이 필요합니다.'
        });
      }

      let dateFilter = '';
      if (period === 'week') {
        dateFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
      } else if (period === 'month') {
        dateFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
      }

      // 기간별 통계
      const statsQuery = `
        SELECT 
          COUNT(*) as total_sessions,
          SUM(total_attempts) as total_attempts,
          SUM(successful_attempts) as successful_attempts,
          SUM(duration_seconds) as total_duration,
          SUM(points_earned) as points_earned,
          AVG(successful_attempts::float / NULLIF(total_attempts, 0)) as avg_success_rate,
          COUNT(CASE WHEN difficulty_level = 1 THEN 1 END) as easy_sessions,
          COUNT(CASE WHEN difficulty_level = 2 THEN 1 END) as medium_sessions,
          COUNT(CASE WHEN difficulty_level >= 3 THEN 1 END) as hard_sessions
        FROM practice_sessions 
        WHERE user_id = $1 ${dateFilter}
      `;

      const statsResult = await pool.query(statsQuery, [userId]);

      // 일별 진행상황 (최근 7일)
      const dailyProgressQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as sessions,
          SUM(successful_attempts) as successes,
          SUM(total_attempts) as attempts,
          SUM(points_earned) as points
        FROM practice_sessions
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      const dailyResult = await pool.query(dailyProgressQuery, [userId]);

      // 완료된 도전과제
      const completedChallengesQuery = `
        SELECT COUNT(*) as completed_challenges
        FROM user_challenge_progress
        WHERE user_id = $1 AND completed_at IS NOT NULL ${dateFilter.replace('created_at', 'completed_at')}
      `;

      const challengesResult = await pool.query(completedChallengesQuery, [userId]);

      res.json({
        success: true,
        data: {
          period,
          overall: statsResult.rows[0],
          dailyProgress: dailyResult.rows,
          completedChallenges: challengesResult.rows[0].completed_challenges
        },
        message: '연습 통계를 조회했습니다.'
      });

    } catch (error) {
      console.error('Get practice stats error:', error);
      res.status(500).json({
        success: false,
        error: '통계 조회 중 오류가 발생했습니다.'
      });
    }
  }
}