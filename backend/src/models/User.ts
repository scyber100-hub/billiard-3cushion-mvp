import pool from '../config/database';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  username: string;
  display_name?: string;
  profile_image_url?: string;
  skill_level: number;
  total_practice_time: number;
  subscription_type: 'free' | 'premium' | 'pro';
  subscription_expires_at?: Date;
  created_at: Date;
  updated_at: Date;
  last_active_at: Date;
  is_active: boolean;
}

export interface UserStats {
  user_id: string;
  total_shots: number;
  successful_shots: number;
  total_practice_sessions: number;
  favorite_difficulty: string;
  avg_success_rate: number;
  total_points: number;
  current_streak: number;
  longest_streak: number;
}

export class UserModel {
  static async create(userData: {
    email: string;
    password: string;
    username: string;
    display_name?: string;
  }): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const query = `
      WITH new_user AS (
        INSERT INTO users (email, password_hash, username, display_name)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      ), new_stats AS (
        INSERT INTO user_stats (user_id)
        SELECT id FROM new_user
        RETURNING user_id
      )
      SELECT * FROM new_user
    `;
    
    const result = await pool.query(query, [
      userData.email,
      hashedPassword,
      userData.username,
      userData.display_name || userData.username
    ]);
    
    return result.rows[0];
  }

  static async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1 AND is_active = true';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updateLastActive(userId: string): Promise<void> {
    const query = 'UPDATE users SET last_active_at = NOW() WHERE id = $1';
    await pool.query(query, [userId]);
  }

  static async updateSkillLevel(userId: string, skillLevel: number): Promise<void> {
    const query = 'UPDATE users SET skill_level = $1, updated_at = NOW() WHERE id = $2';
    await pool.query(query, [skillLevel, userId]);
  }

  static async getUserStats(userId: string): Promise<UserStats | null> {
    const query = 'SELECT * FROM user_stats WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  static async updateUserStats(userId: string, stats: Partial<UserStats>): Promise<void> {
    const fields = Object.keys(stats).filter(key => key !== 'user_id');
    const values = fields.map((_, index) => `$${index + 2}`);
    const assignments = fields.map((field, index) => `${field} = $${index + 2}`);
    
    const query = `
      UPDATE user_stats 
      SET ${assignments.join(', ')}, updated_at = NOW()
      WHERE user_id = $1
    `;
    
    await pool.query(query, [userId, ...fields.map(field => stats[field as keyof UserStats])]);
  }

  static async getLeaderboard(type: 'daily' | 'weekly' | 'monthly' | 'all_time', limit: number = 50) {
    const query = `
      SELECT 
        u.username,
        u.display_name,
        u.profile_image_url,
        le.rank,
        le.score,
        le.metadata
      FROM leaderboard_entries le
      JOIN users u ON le.user_id = u.id
      JOIN leaderboards l ON le.leaderboard_id = l.id
      WHERE l.leaderboard_type = $1 AND l.is_active = true
      ORDER BY le.rank ASC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [type, limit]);
    return result.rows;
  }

  static async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    const searchQuery = `
      SELECT id, username, display_name, profile_image_url, skill_level
      FROM users 
      WHERE (username ILIKE $1 OR display_name ILIKE $1) 
      AND is_active = true
      ORDER BY 
        CASE 
          WHEN username = $2 THEN 1
          WHEN username ILIKE $3 THEN 2
          WHEN display_name ILIKE $3 THEN 3
          ELSE 4
        END,
        username ASC
      LIMIT $4
    `;
    
    const result = await pool.query(searchQuery, [
      `%${query}%`,
      query,
      `${query}%`,
      limit
    ]);
    
    return result.rows;
  }
}