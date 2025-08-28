import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 회원가입
router.post('/register', AuthController.register);

// 로그인
router.post('/login', AuthController.login);

// 프로필 조회 (인증 필요)
router.get('/profile', authenticateToken, AuthController.getProfile);

// 프로필 수정 (인증 필요)
router.put('/profile', authenticateToken, AuthController.updateProfile);

// 패스워드 변경 (인증 필요)
router.put('/change-password', authenticateToken, AuthController.changePassword);

// 계정 삭제 (인증 필요)
router.delete('/account', authenticateToken, AuthController.deleteAccount);

export default router;