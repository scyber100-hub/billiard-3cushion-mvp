import { Request, Response } from 'express';
import { BilliardSimulator } from '../../../physics-engine/src';
import { Ball, Table, ApiResponse, ShotPath } from '../types';

export class PathController {
  static async calculatePaths(req: Request, res: Response) {
    try {
      const { cueBall, object1, object2, table } = req.body;
      
      if (!cueBall || !object1 || !object2) {
        return res.status(400).json({
          success: false,
          error: '큐볼, 목적구1, 목적구2 정보가 필요합니다.'
        } as ApiResponse<null>);
      }

      const billiardTable: Table = {
        width: table?.width || 284,
        height: table?.height || 142,
        cushionRestitution: table?.cushionRestitution || 0.8
      };

      const physicsBalls = [
        {
          id: 'cue',
          position: { x: cueBall.x, y: cueBall.y },
          velocity: { x: 0, y: 0 },
          radius: cueBall.radius || 5.25,
          mass: 1
        },
        {
          id: 'object1',
          position: { x: object1.x, y: object1.y },
          velocity: { x: 0, y: 0 },
          radius: object1.radius || 5.25,
          mass: 1
        },
        {
          id: 'object2',
          position: { x: object2.x, y: object2.y },
          velocity: { x: 0, y: 0 },
          radius: object2.radius || 5.25,
          mass: 1
        }
      ];

      const paths = BilliardSimulator.simulate3CushionPaths(
        physicsBalls[0],
        physicsBalls[1],
        physicsBalls[2],
        billiardTable
      );

      const shotPaths: ShotPath[] = paths.map((path, index) => ({
        id: `path_${index}`,
        points: path.steps.map(step => ({
          x: step.balls[0].position.x,
          y: step.balls[0].position.y,
          type: step.collision?.type || 'ball',
          ballId: step.collision?.ballId,
          cushionSide: step.collision?.cushionSide
        })),
        cushionCount: path.cushionHits,
        difficulty: path.difficulty > 0.7 ? 'hard' : path.difficulty > 0.4 ? 'medium' : 'easy',
        successRate: Math.round(path.successRate * 100) / 100,
        description: `${path.cushionHits}쿠션 경로 (성공률: ${Math.round(path.successRate * 100)}%)`
      }));

      const bestPath = shotPaths[0] || null;

      const response: ApiResponse<{ paths: ShotPath[]; bestPath: ShotPath | null }> = {
        success: true,
        data: {
          paths: shotPaths,
          bestPath
        },
        message: `${shotPaths.length}개의 유효한 3쿠션 경로를 찾았습니다.`
      };

      res.json(response);
    } catch (error) {
      console.error('Path calculation error:', error);
      
      const response: ApiResponse<null> = {
        success: false,
        error: '경로 계산 중 오류가 발생했습니다.'
      };
      
      res.status(500).json(response);
    }
  }

  static async analyzeDifficulty(req: Request, res: Response) {
    try {
      const { cueBall, object1, object2, angle, speed } = req.body;
      
      if (!cueBall || !object1 || !object2 || angle === undefined || !speed) {
        return res.status(400).json({
          success: false,
          error: '모든 매개변수가 필요합니다.'
        } as ApiResponse<null>);
      }

      const response: ApiResponse<{ difficulty: string; successRate: number; advice: string }> = {
        success: true,
        data: {
          difficulty: 'medium',
          successRate: 0.65,
          advice: '중간 난이도의 샷입니다. 큐볼의 속도와 각도를 정확히 조절하세요.'
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Difficulty analysis error:', error);
      
      const response: ApiResponse<null> = {
        success: false,
        error: '난이도 분석 중 오류가 발생했습니다.'
      };
      
      res.status(500).json(response);
    }
  }

  static async getTableDimensions(req: Request, res: Response) {
    try {
      const standardTables = {
        carom3cushion: { width: 284, height: 142, name: '캐롬 3쿠션' },
        carom4ball: { width: 284, height: 142, name: '캐롬 4구' },
        pool9ball: { width: 254, height: 127, name: '9볼 풀' }
      };

      const response: ApiResponse<typeof standardTables> = {
        success: true,
        data: standardTables,
        message: '표준 당구대 규격 정보입니다.'
      };

      res.json(response);
    } catch (error) {
      console.error('Table dimensions error:', error);
      
      const response: ApiResponse<null> = {
        success: false,
        error: '당구대 규격 정보를 가져오는 중 오류가 발생했습니다.'
      };
      
      res.status(500).json(response);
    }
  }
}