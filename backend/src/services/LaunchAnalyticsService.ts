import { Pool } from 'pg';
import Redis from 'ioredis';
import { EventEmitter } from 'events';

export interface LaunchKPIs {
  timestamp: Date;
  
  // 사용자 지표
  userMetrics: {
    totalUsers: number;
    newUsersToday: number;
    activeUsers: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    retention: {
      day1: number;
      day7: number;
      day30: number;
    };
    regionBreakdown: {
      korea: number;
      japan: number;
      taiwan: number;
      singapore: number;
      others: number;
    };
    deviceBreakdown: {
      ios: number;
      android: number;
    };
  };
  
  // 비즈니스 지표
  businessMetrics: {
    revenue: {
      daily: number;
      monthly: number;
      byRegion: Record<string, number>;
      byPlan: Record<string, number>;
    };
    subscriptions: {
      premium: number;
      pro: number;
      conversion: {
        freeToPremuim: number;
        premiumToPro: number;
      };
    };
    customerLifetimeValue: number;
    customerAcquisitionCost: number;
    monthlyRecurringRevenue: number;
  };
  
  // 기술 지표
  technicalMetrics: {
    appStoreRating: {
      ios: number;
      android: number;
      byRegion: Record<string, number>;
    };
    performance: {
      crashRate: number;
      averageLoadTime: number;
      apiResponseTime: number;
    };
    usage: {
      averageSessionTime: number;
      sessionsPerUser: number;
      featureUsage: Record<string, number>;
    };
  };
  
  // 마케팅 지표
  marketingMetrics: {
    acquisition: {
      organic: number;
      paid: number;
      referral: number;
      social: number;
    };
    campaigns: {
      google: { impressions: number; clicks: number; conversions: number; cost: number; };
      facebook: { impressions: number; clicks: number; conversions: number; cost: number; };
      yahoo: { impressions: number; clicks: number; conversions: number; cost: number; };
      line: { impressions: number; clicks: number; conversions: number; cost: number; };
    };
    influencer: {
      reach: number;
      engagement: number;
      conversions: number;
      cost: number;
    };
  };
  
  // 베타 테스트 지표
  betaMetrics: {
    totalFeedbacks: number;
    criticalIssues: number;
    averageRating: number;
    featureRequests: number;
    resolutionRate: number;
  };
}

export interface RealTimeAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface CompetitorData {
  appName: string;
  ranking: {
    overall: number;
    category: number;
  };
  rating: number;
  downloads: number;
  lastUpdate: Date;
}

class LaunchAnalyticsServiceClass extends EventEmitter {
  private db: Pool;
  private redis: Redis;
  private alerts: RealTimeAlert[] = [];
  private competitors: CompetitorData[] = [];
  
  constructor() {
    super();
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // 실시간 모니터링 시작
    this.startRealTimeMonitoring();
  }

  /**
   * 실시간 KPI 데이터 수집
   */
  async getCurrentKPIs(): Promise<LaunchKPIs> {
    try {
      const [
        userMetrics,
        businessMetrics,
        technicalMetrics,
        marketingMetrics,
        betaMetrics
      ] = await Promise.all([
        this.getUserMetrics(),
        this.getBusinessMetrics(),
        this.getTechnicalMetrics(),
        this.getMarketingMetrics(),
        this.getBetaMetrics(),
      ]);

      const kpis: LaunchKPIs = {
        timestamp: new Date(),
        userMetrics,
        businessMetrics,
        technicalMetrics,
        marketingMetrics,
        betaMetrics,
      };

      // Redis에 캐시
      await this.redis.setex('current_kpis', 300, JSON.stringify(kpis)); // 5분 캐시

      return kpis;
    } catch (error) {
      console.error('Failed to get current KPIs:', error);
      throw error;
    }
  }

  /**
   * 사용자 지표 수집
   */
  private async getUserMetrics() {
    const queries = {
      totalUsers: 'SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL',
      newUsersToday: `SELECT COUNT(*) as count FROM users WHERE created_at >= CURRENT_DATE`,
      dailyActiveUsers: `SELECT COUNT(DISTINCT user_id) as count FROM user_sessions WHERE created_at >= CURRENT_DATE`,
      weeklyActiveUsers: `SELECT COUNT(DISTINCT user_id) as count FROM user_sessions WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`,
      monthlyActiveUsers: `SELECT COUNT(DISTINCT user_id) as count FROM user_sessions WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'`,
      
      // 지역별 분류
      regionBreakdown: `
        SELECT country, COUNT(*) as count 
        FROM users 
        WHERE deleted_at IS NULL 
        GROUP BY country
      `,
      
      // 디바이스별 분류
      deviceBreakdown: `
        SELECT platform, COUNT(*) as count 
        FROM user_sessions 
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY platform
      `,
      
      // 리텐션 계산
      day1Retention: `
        WITH new_users AS (
          SELECT user_id, created_at::date as signup_date
          FROM users 
          WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        )
        SELECT 
          COUNT(DISTINCT nu.user_id) as total_users,
          COUNT(DISTINCT CASE WHEN s.created_at::date = nu.signup_date + 1 THEN nu.user_id END) as retained_users
        FROM new_users nu
        LEFT JOIN user_sessions s ON nu.user_id = s.user_id
        WHERE nu.signup_date <= CURRENT_DATE - INTERVAL '1 day'
      `
    };

    const results = await Promise.all(
      Object.entries(queries).map(async ([key, query]) => {
        const result = await this.db.query(query);
        return [key, result.rows];
      })
    );

    const metricsMap = Object.fromEntries(results);

    // 지역별 데이터 처리
    const regionData = metricsMap.regionBreakdown.reduce((acc: any, row: any) => {
      acc[row.country.toLowerCase()] = parseInt(row.count);
      return acc;
    }, {});

    // 디바이스별 데이터 처리
    const deviceData = metricsMap.deviceBreakdown.reduce((acc: any, row: any) => {
      acc[row.platform] = parseInt(row.count);
      return acc;
    }, {});

    // 리텐션 계산
    const retentionData = metricsMap.day1Retention[0] || { total_users: 0, retained_users: 0 };
    const day1Retention = retentionData.total_users > 0 
      ? (retentionData.retained_users / retentionData.total_users) * 100 
      : 0;

    return {
      totalUsers: parseInt(metricsMap.totalUsers[0]?.count || '0'),
      newUsersToday: parseInt(metricsMap.newUsersToday[0]?.count || '0'),
      activeUsers: {
        daily: parseInt(metricsMap.dailyActiveUsers[0]?.count || '0'),
        weekly: parseInt(metricsMap.weeklyActiveUsers[0]?.count || '0'),
        monthly: parseInt(metricsMap.monthlyActiveUsers[0]?.count || '0'),
      },
      retention: {
        day1: parseFloat(day1Retention.toFixed(2)),
        day7: 0, // 추후 계산 로직 추가
        day30: 0, // 추후 계산 로직 추가
      },
      regionBreakdown: {
        korea: regionData.korea || 0,
        japan: regionData.japan || 0,
        taiwan: regionData.taiwan || 0,
        singapore: regionData.singapore || 0,
        others: Object.values(regionData).reduce((a: any, b: any) => a + b, 0) - 
                (regionData.korea + regionData.japan + regionData.taiwan + regionData.singapore || 0),
      },
      deviceBreakdown: {
        ios: deviceData.ios || 0,
        android: deviceData.android || 0,
      },
    };
  }

  /**
   * 비즈니스 지표 수집
   */
  private async getBusinessMetrics() {
    const revenueQuery = `
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        SUM(amount) as daily_revenue,
        COUNT(*) as transactions,
        AVG(amount) as avg_transaction
      FROM payments 
      WHERE status = 'completed' 
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date DESC
    `;

    const subscriptionQuery = `
      SELECT 
        plan_id,
        COUNT(*) as count,
        SUM(amount) as revenue
      FROM subscriptions s
      JOIN payments p ON s.id = p.subscription_id
      WHERE s.status = 'active'
        AND p.status = 'completed'
      GROUP BY plan_id
    `;

    const [revenueResult, subscriptionResult] = await Promise.all([
      this.db.query(revenueQuery),
      this.db.query(subscriptionQuery),
    ]);

    const dailyRevenue = revenueResult.rows[0]?.daily_revenue || 0;
    const monthlyRevenue = revenueResult.rows.reduce((sum, row) => sum + parseFloat(row.daily_revenue), 0);

    const subscriptionData = subscriptionResult.rows.reduce((acc, row) => {
      acc[row.plan_id] = {
        count: parseInt(row.count),
        revenue: parseFloat(row.revenue),
      };
      return acc;
    }, {} as any);

    return {
      revenue: {
        daily: parseFloat(dailyRevenue),
        monthly: monthlyRevenue,
        byRegion: {}, // 추후 구현
        byPlan: {
          premium: subscriptionData.premium?.revenue || 0,
          pro: subscriptionData.pro?.revenue || 0,
        },
      },
      subscriptions: {
        premium: subscriptionData.premium?.count || 0,
        pro: subscriptionData.pro?.count || 0,
        conversion: {
          freeToPremuim: 0, // 추후 구현
          premiumToPro: 0, // 추후 구현
        },
      },
      customerLifetimeValue: 0, // 추후 구현
      customerAcquisitionCost: 0, // 추후 구현
      monthlyRecurringRevenue: monthlyRevenue,
    };
  }

  /**
   * 기술 지표 수집
   */
  private async getTechnicalMetrics() {
    const crashQuery = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN crash_count > 0 THEN 1 END) as crashed_sessions
      FROM user_sessions 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    `;

    const performanceQuery = `
      SELECT 
        AVG(load_time) as avg_load_time,
        AVG(session_duration) as avg_session_time,
        AVG(api_response_time) as avg_api_response
      FROM performance_logs 
      WHERE created_at >= CURRENT_DATE
    `;

    const [crashResult, performanceResult] = await Promise.all([
      this.db.query(crashQuery),
      this.db.query(performanceQuery),
    ]);

    const crashData = crashResult.rows[0] || { total_sessions: 0, crashed_sessions: 0 };
    const crashRate = crashData.total_sessions > 0 
      ? (crashData.crashed_sessions / crashData.total_sessions) * 100 
      : 0;

    const perfData = performanceResult.rows[0] || {
      avg_load_time: 0,
      avg_session_time: 0,
      avg_api_response: 0,
    };

    return {
      appStoreRating: {
        ios: await this.getAppStoreRating('ios'),
        android: await this.getAppStoreRating('android'),
        byRegion: {}, // 추후 구현
      },
      performance: {
        crashRate: parseFloat(crashRate.toFixed(4)),
        averageLoadTime: parseFloat(perfData.avg_load_time || '0'),
        apiResponseTime: parseFloat(perfData.avg_api_response || '0'),
      },
      usage: {
        averageSessionTime: parseFloat(perfData.avg_session_time || '0'),
        sessionsPerUser: 0, // 추후 구현
        featureUsage: await this.getFeatureUsage(),
      },
    };
  }

  /**
   * 마케팅 지표 수집
   */
  private async getMarketingMetrics() {
    const acquisitionQuery = `
      SELECT 
        acquisition_channel,
        COUNT(*) as count,
        SUM(acquisition_cost) as cost
      FROM users 
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND acquisition_channel IS NOT NULL
      GROUP BY acquisition_channel
    `;

    const result = await this.db.query(acquisitionQuery);
    
    const acquisitionData = result.rows.reduce((acc, row) => {
      acc[row.acquisition_channel] = parseInt(row.count);
      return acc;
    }, {} as any);

    return {
      acquisition: {
        organic: acquisitionData.organic || 0,
        paid: acquisitionData.paid || 0,
        referral: acquisitionData.referral || 0,
        social: acquisitionData.social || 0,
      },
      campaigns: {
        google: { impressions: 0, clicks: 0, conversions: 0, cost: 0 },
        facebook: { impressions: 0, clicks: 0, conversions: 0, cost: 0 },
        yahoo: { impressions: 0, clicks: 0, conversions: 0, cost: 0 },
        line: { impressions: 0, clicks: 0, conversions: 0, cost: 0 },
      },
      influencer: {
        reach: 0,
        engagement: 0,
        conversions: 0,
        cost: 0,
      },
    };
  }

  /**
   * 베타 테스트 지표 수집
   */
  private async getBetaMetrics() {
    const betaQuery = `
      SELECT 
        COUNT(*) as total_feedbacks,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_issues,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN category = 'feature' THEN 1 END) as feature_requests,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count
      FROM beta_feedbacks 
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `;

    const result = await this.db.query(betaQuery);
    const data = result.rows[0] || {
      total_feedbacks: 0,
      critical_issues: 0,
      average_rating: 0,
      feature_requests: 0,
      resolved_count: 0,
    };

    const resolutionRate = data.total_feedbacks > 0 
      ? (data.resolved_count / data.total_feedbacks) * 100 
      : 0;

    return {
      totalFeedbacks: parseInt(data.total_feedbacks),
      criticalIssues: parseInt(data.critical_issues),
      averageRating: parseFloat(data.average_rating || '0'),
      featureRequests: parseInt(data.feature_requests),
      resolutionRate: parseFloat(resolutionRate.toFixed(2)),
    };
  }

  /**
   * 실시간 모니터링 시작
   */
  private startRealTimeMonitoring() {
    // 5분마다 KPI 수집 및 알림 체크
    setInterval(async () => {
      try {
        const kpis = await this.getCurrentKPIs();
        await this.checkAlerts(kpis);
        this.emit('kpis-updated', kpis);
      } catch (error) {
        console.error('Real-time monitoring error:', error);
      }
    }, 5 * 60 * 1000); // 5분

    // 1분마다 빠른 성능 체크
    setInterval(async () => {
      try {
        await this.checkCriticalMetrics();
      } catch (error) {
        console.error('Critical metrics check error:', error);
      }
    }, 60 * 1000); // 1분
  }

  /**
   * 알림 임계값 체크
   */
  private async checkAlerts(kpis: LaunchKPIs) {
    const alertConditions = [
      {
        metric: 'crashRate',
        value: kpis.technicalMetrics.performance.crashRate,
        threshold: 0.5, // 0.5% 이상
        type: 'critical' as const,
        message: '크래시율이 임계값을 초과했습니다',
      },
      {
        metric: 'apiResponseTime', 
        value: kpis.technicalMetrics.performance.apiResponseTime,
        threshold: 1000, // 1초 이상
        type: 'warning' as const,
        message: 'API 응답시간이 지연되고 있습니다',
      },
      {
        metric: 'dailyActiveUsers',
        value: kpis.userMetrics.activeUsers.daily,
        threshold: 1000, // 1,000명 이하
        type: 'info' as const,
        message: '일일 활성 사용자가 목표에 미달합니다',
        condition: 'below',
      },
    ];

    for (const condition of alertConditions) {
      const isTriggered = condition.condition === 'below' 
        ? condition.value < condition.threshold
        : condition.value > condition.threshold;

      if (isTriggered) {
        await this.createAlert({
          metric: condition.metric,
          value: condition.value,
          threshold: condition.threshold,
          type: condition.type,
          message: condition.message,
        });
      }
    }
  }

  /**
   * 알림 생성
   */
  private async createAlert(alertData: Omit<RealTimeAlert, 'id' | 'timestamp' | 'resolved'>) {
    const alert: RealTimeAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...alertData,
      timestamp: new Date(),
      resolved: false,
    };

    this.alerts.push(alert);
    this.emit('alert-created', alert);

    // Slack, 이메일 등으로 알림 발송
    await this.sendAlertNotification(alert);

    return alert;
  }

  /**
   * 알림 발송
   */
  private async sendAlertNotification(alert: RealTimeAlert) {
    // 실제 구현에서는 Slack, 이메일, SMS 등으로 알림
    console.log(`🚨 [${alert.type.toUpperCase()}] ${alert.message}`);
    console.log(`   Metric: ${alert.metric} = ${alert.value} (threshold: ${alert.threshold})`);
    
    // 웹훅이나 푸시 알림으로 실시간 대시보드에 전송
    this.emit('notification-sent', alert);
  }

  /**
   * 경쟁사 데이터 수집
   */
  async updateCompetitorData(): Promise<CompetitorData[]> {
    // 실제로는 App Annie, Sensor Tower 등의 API 사용
    const mockCompetitorData: CompetitorData[] = [
      {
        appName: "ビリヤード練習",
        ranking: { overall: 245, category: 12 },
        rating: 3.8,
        downloads: 52000,
        lastUpdate: new Date('2024-01-15'),
      },
      {
        appName: "Pool Break 3D", 
        ranking: { overall: 89, category: 3 },
        rating: 4.2,
        downloads: 520000,
        lastUpdate: new Date('2024-01-10'),
      },
    ];

    this.competitors = mockCompetitorData;
    return mockCompetitorData;
  }

  /**
   * 대시보드용 요약 데이터
   */
  async getDashboardSummary() {
    const kpis = await this.getCurrentKPIs();
    const activeAlerts = this.alerts.filter(a => !a.resolved);
    
    return {
      summary: {
        totalUsers: kpis.userMetrics.totalUsers,
        monthlyRevenue: kpis.businessMetrics.revenue.monthly,
        dailyActiveUsers: kpis.userMetrics.activeUsers.daily,
        appStoreRating: (kpis.technicalMetrics.appStoreRating.ios + kpis.technicalMetrics.appStoreRating.android) / 2,
      },
      alerts: activeAlerts.length,
      trends: {
        userGrowth: '+12.5%', // 전날 대비
        revenueGrowth: '+8.2%',
        retentionRate: kpis.userMetrics.retention.day1,
      },
      regionalPerformance: kpis.userMetrics.regionBreakdown,
      competitors: this.competitors,
    };
  }

  // 헬퍼 메서드들
  private async getAppStoreRating(platform: 'ios' | 'android'): Promise<number> {
    // App Store/Play Store API 연동 또는 스크래핑
    return 4.5; // Mock data
  }

  private async getFeatureUsage(): Promise<Record<string, number>> {
    const query = `
      SELECT 
        feature_name,
        COUNT(*) as usage_count
      FROM feature_usage 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY feature_name
    `;

    const result = await this.db.query(query);
    return result.rows.reduce((acc, row) => {
      acc[row.feature_name] = parseInt(row.usage_count);
      return acc;
    }, {});
  }

  private async checkCriticalMetrics() {
    // 빠른 건강 체크 (DB 연결, API 상태 등)
    try {
      await this.db.query('SELECT 1');
      await this.redis.ping();
    } catch (error) {
      await this.createAlert({
        metric: 'system_health',
        value: 0,
        threshold: 1,
        type: 'critical',
        message: '시스템 연결에 문제가 발생했습니다',
      });
    }
  }
}

export const LaunchAnalyticsService = new LaunchAnalyticsServiceClass();