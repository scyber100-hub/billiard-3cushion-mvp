import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: '액세스 토큰이 필요합니다.'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err: any, user: any) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: '토큰이 만료되었습니다. 다시 로그인해주세요.'
        });
      }
      
      if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({
          success: false,
          error: '유효하지 않은 토큰입니다.'
        });
      }

      return res.status(403).json({
        success: false,
        error: '토큰 검증에 실패했습니다.'
      });
    }

    req.user = user;
    next();
  });
};

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err: any, user: any) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
};

export const requireSubscription = (subscriptionType: 'premium' | 'pro') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // 여기서는 간단한 예시만 구현
    // 실제로는 데이터베이스에서 사용자의 구독 상태를 확인해야 함
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '인증이 필요합니다.'
      });
    }

    // 구독 확인 로직 (실제 구현에서는 DB 조회 필요)
    // 현재는 모든 사용자가 기본 기능 사용 가능하도록 설정
    next();
  };
};