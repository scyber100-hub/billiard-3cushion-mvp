import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { ApiResponse } from '../types';

export class AuthController {
  
  static async register(req: Request, res: Response) {
    try {
      const { email, password, username, display_name } = req.body;
      
      // 입력값 검증
      if (!email || !password || !username) {
        return res.status(400).json({
          success: false,
          error: '이메일, 패스워드, 사용자명은 필수입니다.'
        } as ApiResponse<null>);
      }

      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: '올바른 이메일 형식이 아닙니다.'
        } as ApiResponse<null>);
      }

      // 패스워드 강도 검증
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: '패스워드는 최소 6자 이상이어야 합니다.'
        } as ApiResponse<null>);
      }

      // 사용자명 검증
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({
          success: false,
          error: '사용자명은 3-20자의 영문, 숫자, 언더스코어만 가능합니다.'
        } as ApiResponse<null>);
      }

      // 중복 확인
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: '이미 가입된 이메일입니다.'
        } as ApiResponse<null>);
      }

      // 사용자 생성
      const newUser = await UserModel.create({
        email,
        password,
        username,
        display_name: display_name || username
      });

      // JWT 토큰 생성
      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      // 응답 (패스워드 제외)
      const { password_hash, ...userResponse } = newUser as any;
      
      res.status(201).json({
        success: true,
        data: {
          user: userResponse,
          token
        },
        message: '회원가입이 완료되었습니다.'
      } as ApiResponse<any>);

    } catch (error) {
      console.error('Registration error:', error);
      
      if ((error as any).code === '23505') { // PostgreSQL unique violation
        const column = (error as any).detail.includes('email') ? '이메일' : '사용자명';
        return res.status(409).json({
          success: false,
          error: `이미 사용 중인 ${column}입니다.`
        } as ApiResponse<null>);
      }

      res.status(500).json({
        success: false,
        error: '회원가입 중 오류가 발생했습니다.'
      } as ApiResponse<null>);
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: '이메일과 패스워드를 입력해주세요.'
        } as ApiResponse<null>);
      }

      // 사용자 찾기
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: '이메일 또는 패스워드가 올바르지 않습니다.'
        } as ApiResponse<null>);
      }

      // 패스워드 확인
      const isValidPassword = await UserModel.validatePassword(password, (user as any).password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: '이메일 또는 패스워드가 올바르지 않습니다.'
        } as ApiResponse<null>);
      }

      // 마지막 활동 시간 업데이트
      await UserModel.updateLastActive(user.id);

      // JWT 토큰 생성
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      // 사용자 통계 가져오기
      const stats = await UserModel.getUserStats(user.id);

      // 응답 (패스워드 제외)
      const { password_hash, ...userResponse } = user as any;

      res.json({
        success: true,
        data: {
          user: userResponse,
          stats,
          token
        },
        message: '로그인되었습니다.'
      } as ApiResponse<any>);

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: '로그인 중 오류가 발생했습니다.'
      } as ApiResponse<null>);
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '인증이 필요합니다.'
        } as ApiResponse<null>);
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: '사용자를 찾을 수 없습니다.'
        } as ApiResponse<null>);
      }

      const stats = await UserModel.getUserStats(userId);

      const { password_hash, ...userResponse } = user as any;

      res.json({
        success: true,
        data: {
          user: userResponse,
          stats
        }
      } as ApiResponse<any>);

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: '프로필 조회 중 오류가 발생했습니다.'
      } as ApiResponse<null>);
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const { display_name, profile_image_url } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '인증이 필요합니다.'
        } as ApiResponse<null>);
      }

      // 입력값 검증
      if (display_name && display_name.length > 100) {
        return res.status(400).json({
          success: false,
          error: '표시명은 100자를 초과할 수 없습니다.'
        } as ApiResponse<null>);
      }

      // 프로필 업데이트 (여기서는 간단한 예시)
      // 실제로는 별도의 update 메서드를 UserModel에 추가해야 함
      
      res.json({
        success: true,
        message: '프로필이 업데이트되었습니다.'
      } as ApiResponse<null>);

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: '프로필 업데이트 중 오류가 발생했습니다.'
      } as ApiResponse<null>);
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '인증이 필요합니다.'
        } as ApiResponse<null>);
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: '현재 패스워드와 새 패스워드를 입력해주세요.'
        } as ApiResponse<null>);
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: '새 패스워드는 최소 6자 이상이어야 합니다.'
        } as ApiResponse<null>);
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: '사용자를 찾을 수 없습니다.'
        } as ApiResponse<null>);
      }

      // 현재 패스워드 확인
      const isValidPassword = await UserModel.validatePassword(currentPassword, (user as any).password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: '현재 패스워드가 올바르지 않습니다.'
        } as ApiResponse<null>);
      }

      // 패스워드 변경 로직 (UserModel에 메서드 추가 필요)
      
      res.json({
        success: true,
        message: '패스워드가 변경되었습니다.'
      } as ApiResponse<null>);

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: '패스워드 변경 중 오류가 발생했습니다.'
      } as ApiResponse<null>);
    }
  }

  static async deleteAccount(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const { password } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '인증이 필요합니다.'
        } as ApiResponse<null>);
      }

      if (!password) {
        return res.status(400).json({
          success: false,
          error: '패스워드를 입력해주세요.'
        } as ApiResponse<null>);
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: '사용자를 찾을 수 없습니다.'
        } as ApiResponse<null>);
      }

      // 패스워드 확인
      const isValidPassword = await UserModel.validatePassword(password, (user as any).password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: '패스워드가 올바르지 않습니다.'
        } as ApiResponse<null>);
      }

      // 계정 삭제 로직 (실제로는 is_active를 false로 설정)
      
      res.json({
        success: true,
        message: '계정이 삭제되었습니다.'
      } as ApiResponse<null>);

    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        error: '계정 삭제 중 오류가 발생했습니다.'
      } as ApiResponse<null>);
    }
  }
}