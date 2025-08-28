import { Request, Response } from 'express';
import pool from '../config/database';
import { UserModel } from '../models/User';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export class SocialController {
  
  /**
   * 리더보드 조회
   */
  static async getLeaderboard(req: Request, res: Response) {
    try {
      const { type = 'weekly', metric = 'points', limit = 50 } = req.query;

      const leaderboard = await UserModel.getLeaderboard(
        type as 'daily' | 'weekly' | 'monthly' | 'all_time',
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: {
          type,
          metric,
          entries: leaderboard,
          total: leaderboard.length
        },
        message: '리더보드를 조회했습니다.'
      });

    } catch (error) {
      console.error('Get leaderboard error:', error);
      res.status(500).json({
        success: false,
        error: '리더보드 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 내 랭킹 조회
   */
  static async getMyRank(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { type = 'weekly' } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '인증이 필요합니다.'
        });
      }

      const query = `
        SELECT 
          le.rank,
          le.score,
          l.name as leaderboard_name,
          l.metric_type
        FROM leaderboard_entries le
        JOIN leaderboards l ON le.leaderboard_id = l.id
        WHERE le.user_id = $1 AND l.leaderboard_type = $2 AND l.is_active = true
        ORDER BY le.rank ASC
        LIMIT 1
      `;

      const result = await pool.query(query, [userId, type]);

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          data: {
            rank: null,
            score: 0,
            message: '아직 랭킹에 등록되지 않았습니다.'
          }
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: '내 랭킹을 조회했습니다.'
      });

    } catch (error) {
      console.error('Get my rank error:', error);
      res.status(500).json({
        success: false,
        error: '랭킹 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 친구 목록 조회
   */
  static async getFriends(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { status = 'accepted' } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '인증이 필요합니다.'
        });
      }

      const query = `
        SELECT 
          f.*,
          u.username,
          u.display_name,
          u.profile_image_url,
          u.skill_level,
          u.last_active_at,
          us.total_points,
          us.avg_success_rate
        FROM friends f
        JOIN users u ON f.friend_id = u.id
        LEFT JOIN user_stats us ON f.friend_id = us.user_id
        WHERE f.user_id = $1 AND f.status = $2
        ORDER BY u.last_active_at DESC
      `;

      const result = await pool.query(query, [userId, status]);

      res.json({
        success: true,
        data: {
          friends: result.rows,
          total: result.rows.length
        },
        message: '친구 목록을 조회했습니다.'
      });

    } catch (error) {
      console.error('Get friends error:', error);
      res.status(500).json({
        success: false,
        error: '친구 목록 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 친구 요청 보내기
   */
  static async sendFriendRequest(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { friendId } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '인증이 필요합니다.'
        });
      }

      if (userId === friendId) {
        return res.status(400).json({
          success: false,
          error: '자기 자신에게는 친구 요청을 보낼 수 없습니다.'
        });
      }

      // 친구가 존재하는지 확인
      const friend = await UserModel.findById(friendId);
      if (!friend) {
        return res.status(404).json({
          success: false,
          error: '사용자를 찾을 수 없습니다.'
        });
      }

      // 이미 친구이거나 요청이 있는지 확인
      const existingQuery = `
        SELECT * FROM friends 
        WHERE (user_id = $1 AND friend_id = $2) 
           OR (user_id = $2 AND friend_id = $1)
      `;

      const existingResult = await pool.query(existingQuery, [userId, friendId]);

      if (existingResult.rows.length > 0) {
        const existing = existingResult.rows[0];
        if (existing.status === 'accepted') {
          return res.status(409).json({
            success: false,
            error: '이미 친구입니다.'
          });
        } else if (existing.status === 'pending') {
          return res.status(409).json({
            success: false,
            error: '이미 친구 요청이 전송되었습니다.'
          });
        }
      }

      // 친구 요청 생성
      const insertQuery = `
        INSERT INTO friends (user_id, friend_id, status)
        VALUES ($1, $2, 'pending')
        RETURNING *
      `;

      const result = await pool.query(insertQuery, [userId, friendId]);

      res.json({
        success: true,
        data: result.rows[0],
        message: '친구 요청을 보냈습니다.'
      });

    } catch (error) {
      console.error('Send friend request error:', error);
      res.status(500).json({
        success: false,
        error: '친구 요청 전송 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 친구 요청 응답 (승인/거절)
   */
  static async respondToFriendRequest(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { requestId } = req.params;
      const { action } = req.body; // 'accept' or 'decline'

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '인증이 필요합니다.'
        });
      }

      if (!['accept', 'decline'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: '올바른 액션을 선택해주세요.'
        });
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // 친구 요청 확인
        const requestQuery = `
          SELECT * FROM friends 
          WHERE id = $1 AND friend_id = $2 AND status = 'pending'
        `;

        const requestResult = await client.query(requestQuery, [requestId, userId]);

        if (requestResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({
            success: false,
            error: '친구 요청을 찾을 수 없습니다.'
          });
        }

        const request = requestResult.rows[0];

        if (action === 'accept') {
          // 양방향 친구 관계 생성
          await client.query(`
            UPDATE friends 
            SET status = 'accepted', updated_at = NOW()
            WHERE id = $1
          `, [requestId]);

          await client.query(`
            INSERT INTO friends (user_id, friend_id, status)
            VALUES ($1, $2, 'accepted')
            ON CONFLICT (user_id, friend_id) DO UPDATE 
            SET status = 'accepted', updated_at = NOW()
          `, [userId, request.user_id]);

        } else {
          // 요청 삭제
          await client.query('DELETE FROM friends WHERE id = $1', [requestId]);
        }

        await client.query('COMMIT');

        res.json({
          success: true,
          message: action === 'accept' ? '친구 요청을 승인했습니다.' : '친구 요청을 거절했습니다.'
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Respond to friend request error:', error);
      res.status(500).json({
        success: false,
        error: '친구 요청 응답 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 사용자 검색
   */
  static async searchUsers(req: Request, res: Response) {
    try {
      const { query, limit = 20 } = req.query;

      if (!query || (query as string).length < 2) {
        return res.status(400).json({
          success: false,
          error: '검색어는 최소 2자 이상이어야 합니다.'
        });
      }

      const users = await UserModel.searchUsers(query as string, parseInt(limit as string));

      res.json({
        success: true,
        data: {
          users,
          total: users.length
        },
        message: '사용자 검색 결과입니다.'
      });

    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({
        success: false,
        error: '사용자 검색 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 친구 랭킹 비교
   */
  static async getFriendsRanking(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      const { metric = 'points' } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '인증이 필요합니다.'
        });
      }

      const query = `
        WITH friend_stats AS (
          SELECT 
            u.id,
            u.username,
            u.display_name,
            u.profile_image_url,
            u.skill_level,
            CASE 
              WHEN $2 = 'points' THEN us.total_points
              WHEN $2 = 'success_rate' THEN ROUND(us.avg_success_rate * 100, 2)
              WHEN $2 = 'streak' THEN us.longest_streak
              ELSE us.total_points
            END as score
          FROM friends f
          JOIN users u ON f.friend_id = u.id
          JOIN user_stats us ON u.id = us.user_id
          WHERE f.user_id = $1 AND f.status = 'accepted'
          
          UNION ALL
          
          SELECT 
            u.id,
            u.username,
            u.display_name,
            u.profile_image_url,
            u.skill_level,
            CASE 
              WHEN $2 = 'points' THEN us.total_points
              WHEN $2 = 'success_rate' THEN ROUND(us.avg_success_rate * 100, 2)
              WHEN $2 = 'streak' THEN us.longest_streak
              ELSE us.total_points
            END as score
          FROM users u
          JOIN user_stats us ON u.id = us.user_id
          WHERE u.id = $1
        )
        SELECT 
          *,
          ROW_NUMBER() OVER (ORDER BY score DESC) as rank,
          CASE WHEN id = $1 THEN true ELSE false END as is_me
        FROM friend_stats
        ORDER BY score DESC
      `;

      const result = await pool.query(query, [userId, metric]);

      res.json({
        success: true,
        data: {
          ranking: result.rows,
          metric,
          total: result.rows.length
        },
        message: '친구 랭킹을 조회했습니다.'
      });

    } catch (error) {
      console.error('Get friends ranking error:', error);
      res.status(500).json({
        success: false,
        error: '친구 랭킹 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 리더보드 업데이트 (관리자 기능 - 배치 작업으로 실행)
   */
  static async updateLeaderboards(req: Request, res: Response) {
    try {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // 일간 리더보드 업데이트
        await this.updateDailyLeaderboard(client);
        
        // 주간 리더보드 업데이트
        await this.updateWeeklyLeaderboard(client);
        
        // 월간 리더보드 업데이트
        await this.updateMonthlyLeaderboard(client);

        await client.query('COMMIT');

        res.json({
          success: true,
          message: '리더보드가 업데이트되었습니다.'
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Update leaderboards error:', error);
      res.status(500).json({
        success: false,
        error: '리더보드 업데이트 중 오류가 발생했습니다.'
      });
    }
  }

  private static async updateDailyLeaderboard(client: any) {
    // 오늘 획득한 포인트 기준으로 일간 리더보드 업데이트
    const query = `
      WITH daily_points AS (
        SELECT 
          ps.user_id,
          SUM(ps.points_earned) as daily_score,
          ROW_NUMBER() OVER (ORDER BY SUM(ps.points_earned) DESC) as rank
        FROM practice_sessions ps
        WHERE DATE(ps.created_at) = CURRENT_DATE
        GROUP BY ps.user_id
        HAVING SUM(ps.points_earned) > 0
      )
      INSERT INTO leaderboard_entries (leaderboard_id, user_id, rank, score)
      SELECT 
        (SELECT id FROM leaderboards WHERE leaderboard_type = 'daily' AND metric_type = 'points' LIMIT 1),
        user_id,
        rank,
        daily_score
      FROM daily_points
      ON CONFLICT (leaderboard_id, user_id) 
      DO UPDATE SET 
        rank = EXCLUDED.rank,
        score = EXCLUDED.score,
        created_at = NOW()
    `;

    await client.query(query);
  }

  private static async updateWeeklyLeaderboard(client: any) {
    // 이번 주 획득한 포인트 기준으로 주간 리더보드 업데이트
    const query = `
      WITH weekly_points AS (
        SELECT 
          us.user_id,
          us.total_points as weekly_score,
          ROW_NUMBER() OVER (ORDER BY us.total_points DESC) as rank
        FROM user_stats us
        WHERE us.total_points > 0
      )
      INSERT INTO leaderboard_entries (leaderboard_id, user_id, rank, score)
      SELECT 
        (SELECT id FROM leaderboards WHERE leaderboard_type = 'weekly' AND metric_type = 'points' LIMIT 1),
        user_id,
        rank,
        weekly_score
      FROM weekly_points
      ON CONFLICT (leaderboard_id, user_id) 
      DO UPDATE SET 
        rank = EXCLUDED.rank,
        score = EXCLUDED.score,
        created_at = NOW()
    `;

    await client.query(query);
  }

  private static async updateMonthlyLeaderboard(client: any) {
    // 이번 달 성공률 기준으로 월간 리더보드 업데이트
    const query = `
      WITH monthly_success_rate AS (
        SELECT 
          us.user_id,
          ROUND(us.avg_success_rate * 100, 2) as monthly_score,
          ROW_NUMBER() OVER (ORDER BY us.avg_success_rate DESC) as rank
        FROM user_stats us
        WHERE us.avg_success_rate > 0 AND us.total_shots >= 10
      )
      INSERT INTO leaderboard_entries (leaderboard_id, user_id, rank, score)
      SELECT 
        (SELECT id FROM leaderboards WHERE leaderboard_type = 'monthly' AND metric_type = 'success_rate' LIMIT 1),
        user_id,
        rank,
        monthly_score
      FROM monthly_success_rate
      ON CONFLICT (leaderboard_id, user_id) 
      DO UPDATE SET 
        rank = EXCLUDED.rank,
        score = EXCLUDED.score,
        created_at = NOW()
    `;

    await client.query(query);
  }
}