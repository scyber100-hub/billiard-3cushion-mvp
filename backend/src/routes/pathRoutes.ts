import { Router } from 'express';
import { PathController } from '../controllers/pathController';

const router = Router();

router.post('/calculate', PathController.calculatePaths);

router.post('/analyze-difficulty', PathController.analyzeDifficulty);

router.get('/table-dimensions', PathController.getTableDimensions);

export default router;