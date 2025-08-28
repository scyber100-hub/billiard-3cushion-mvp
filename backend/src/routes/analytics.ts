import { Router, Request, Response } from 'express';
import { LaunchAnalyticsService } from '../services/LaunchAnalyticsService';
import { authenticateToken } from '../middleware/auth';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// 관리자 권한 확인 미들웨어
const requireAdmin = (req: Request, res: Response, next: Function) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// 대시보드 접근 제한 (분당 60회)
const dashboardRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Too many requests to analytics dashboard',
});

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get real-time dashboard summary
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                     alerts:
 *                       type: number
 *                     trends:
 *                       type: object
 *                     regionalPerformance:
 *                       type: object
 */
router.get('/dashboard', 
  authenticateToken, 
  requireAdmin, 
  dashboardRateLimit,
  async (req: Request, res: Response) => {
    try {
      const dashboardData = await LaunchAnalyticsService.getDashboardSummary();
      
      res.json({
        success: true,
        data: dashboardData,
        timestamp: new Date(),
      });
    } catch (error: any) {
      console.error('Dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard data',
        message: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/analytics/kpis:
 *   get:
 *     summary: Get current KPIs
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Filter by region (korea, japan, taiwan, etc.)
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, 30d]
 *         description: Time frame for metrics
 *     responses:
 *       200:
 *         description: Current KPI metrics
 */
router.get('/kpis',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { region, timeframe = '24h' } = req.query;
      
      const kpis = await LaunchAnalyticsService.getCurrentKPIs();
      
      // 지역 필터링
      if (region && typeof region === 'string') {
        const filteredKPIs = {
          ...kpis,
          userMetrics: {
            ...kpis.userMetrics,
            regionBreakdown: {
              [region]: kpis.userMetrics.regionBreakdown[region as keyof typeof kpis.userMetrics.regionBreakdown] || 0
            }
          }
        };
        
        return res.json({
          success: true,
          data: filteredKPIs,
          filters: { region, timeframe },
        });
      }
      
      res.json({
        success: true,
        data: kpis,
        filters: { timeframe },
      });
    } catch (error: any) {
      console.error('KPIs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get KPIs',
        message: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/analytics/alerts:
 *   get:
 *     summary: Get active alerts
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [critical, warning, info]
 *         description: Filter by alert type
 *       - in: query
 *         name: resolved
 *         schema:
 *           type: boolean
 *         description: Include resolved alerts
 *     responses:
 *       200:
 *         description: List of alerts
 */
router.get('/alerts',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { type, resolved = 'false' } = req.query;
      
      let alerts = LaunchAnalyticsService['alerts'] || [];
      
      // 필터링
      if (type && typeof type === 'string') {
        alerts = alerts.filter(alert => alert.type === type);
      }
      
      if (resolved === 'false') {
        alerts = alerts.filter(alert => !alert.resolved);
      }
      
      // 최신순 정렬
      alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      res.json({
        success: true,
        data: alerts,
        count: alerts.length,
        filters: { type, resolved },
      });
    } catch (error: any) {
      console.error('Alerts error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get alerts',
        message: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/analytics/alerts/{alertId}/resolve:
 *   post:
 *     summary: Resolve an alert
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert ID to resolve
 *     responses:
 *       200:
 *         description: Alert resolved successfully
 */
router.post('/alerts/:alertId/resolve',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      const alerts = LaunchAnalyticsService['alerts'] || [];
      
      const alertIndex = alerts.findIndex(alert => alert.id === alertId);
      
      if (alertIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found',
        });
      }
      
      alerts[alertIndex].resolved = true;
      
      res.json({
        success: true,
        message: 'Alert resolved successfully',
        data: alerts[alertIndex],
      });
    } catch (error: any) {
      console.error('Resolve alert error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resolve alert',
        message: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/analytics/competitors:
 *   get:
 *     summary: Get competitor analysis data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Competitor data
 */
router.get('/competitors',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const competitorData = await LaunchAnalyticsService.updateCompetitorData();
      
      res.json({
        success: true,
        data: competitorData,
        lastUpdated: new Date(),
      });
    } catch (error: any) {
      console.error('Competitors error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get competitor data',
        message: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/analytics/export:
 *   get:
 *     summary: Export analytics data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *         description: Export format
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for data range
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for data range
 *     responses:
 *       200:
 *         description: Exported data file
 */
router.get('/export',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { format = 'json', startDate, endDate } = req.query;
      
      const kpis = await LaunchAnalyticsService.getCurrentKPIs();
      
      if (format === 'csv') {
        // CSV 형식으로 변환
        const csvData = convertToCSV(kpis);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvData);
      } else {
        // JSON 형식
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="analytics_${new Date().toISOString().split('T')[0]}.json"`);
        res.json({
          exportDate: new Date(),
          dateRange: { startDate, endDate },
          data: kpis,
        });
      }
    } catch (error: any) {
      console.error('Export error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export data',
        message: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/analytics/regional-performance:
 *   get:
 *     summary: Get regional performance breakdown
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Specific region to analyze
 *     responses:
 *       200:
 *         description: Regional performance data
 */
router.get('/regional-performance',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { region } = req.query;
      
      const kpis = await LaunchAnalyticsService.getCurrentKPIs();
      
      const regionalData = {
        overview: kpis.userMetrics.regionBreakdown,
        details: {
          korea: {
            users: kpis.userMetrics.regionBreakdown.korea,
            revenue: kpis.businessMetrics.revenue.byRegion.korea || 0,
            engagement: 85, // Mock data
            topFeatures: ['Practice Mode', 'AR Scan', 'Challenges'],
          },
          japan: {
            users: kpis.userMetrics.regionBreakdown.japan,
            revenue: kpis.businessMetrics.revenue.byRegion.japan || 0,
            engagement: 72,
            topFeatures: ['Practice Mode', 'Multiplayer', 'Tournaments'],
          },
          taiwan: {
            users: kpis.userMetrics.regionBreakdown.taiwan,
            revenue: kpis.businessMetrics.revenue.byRegion.taiwan || 0,
            engagement: 68,
            topFeatures: ['Social', 'Leaderboard', 'Practice Mode'],
          },
        },
        trends: {
          growthRate: {
            korea: '+5.2%',
            japan: '+15.8%',
            taiwan: '+12.3%',
          },
          retentionRate: {
            korea: 78,
            japan: 65,
            taiwan: 70,
          },
        },
      };
      
      if (region && typeof region === 'string') {
        const specificRegion = regionalData.details[region as keyof typeof regionalData.details];
        if (specificRegion) {
          return res.json({
            success: true,
            data: {
              region,
              ...specificRegion,
              trend: regionalData.trends.growthRate[region as keyof typeof regionalData.trends.growthRate],
            },
          });
        }
      }
      
      res.json({
        success: true,
        data: regionalData,
      });
    } catch (error: any) {
      console.error('Regional performance error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get regional performance',
        message: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/analytics/beta-insights:
 *   get:
 *     summary: Get beta testing insights
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Beta testing insights
 */
router.get('/beta-insights',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const kpis = await LaunchAnalyticsService.getCurrentKPIs();
      
      const betaInsights = {
        summary: kpis.betaMetrics,
        topIssues: [
          { category: 'performance', count: 12, severity: 'medium' },
          { category: 'ui', count: 8, severity: 'low' },
          { category: 'feature', count: 15, severity: 'low' },
        ],
        userSatisfaction: {
          overall: 4.2,
          byCategory: {
            ui: 4.5,
            performance: 3.8,
            features: 4.3,
          },
        },
        recommendations: [
          'UI 개선사항 우선 처리 권장',
          '성능 최적화 필요',
          '신규 기능 개발 계속 진행',
        ],
      };
      
      res.json({
        success: true,
        data: betaInsights,
      });
    } catch (error: any) {
      console.error('Beta insights error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get beta insights',
        message: error.message,
      });
    }
  }
);

// CSV 변환 헬퍼 함수
function convertToCSV(data: any): string {
  const headers = [
    'Timestamp',
    'Total Users',
    'Daily Active Users',
    'Monthly Revenue',
    'App Store Rating iOS',
    'App Store Rating Android',
    'Crash Rate',
    'Korea Users',
    'Japan Users',
    'Taiwan Users',
  ];
  
  const row = [
    data.timestamp,
    data.userMetrics.totalUsers,
    data.userMetrics.activeUsers.daily,
    data.businessMetrics.revenue.monthly,
    data.technicalMetrics.appStoreRating.ios,
    data.technicalMetrics.appStoreRating.android,
    data.technicalMetrics.performance.crashRate,
    data.userMetrics.regionBreakdown.korea,
    data.userMetrics.regionBreakdown.japan,
    data.userMetrics.regionBreakdown.taiwan,
  ];
  
  return [headers.join(','), row.join(',')].join('\n');
}

export default router;