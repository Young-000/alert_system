import {
  Controller,
  Post,
  Delete,
  Get,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '@infrastructure/auth/public.decorator';
import {
  seedSampleData,
  clearSampleData,
  SAMPLE_USER,
  SAMPLE_ROUTES,
  SAMPLE_ALERTS,
} from '@infrastructure/persistence/seeds/sample-data.seed';

/**
 * 개발/테스트용 API 컨트롤러
 * 프로덕션에서는 app.module.ts에서 제외됨
 * 이중 안전: NODE_ENV === 'production'이면 모든 요청 거부
 */
@Controller('dev')
@Public()
export class DevController {
  private assertNotProduction(): void {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Dev endpoints are not available in production');
    }
  }

  private readonly logger = new Logger(DevController.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  /**
   * 샘플 데이터 삽입
   * POST /dev/seed
   */
  @Post('seed')
  async seedSampleData(): Promise<{ success: boolean; message: string; data: object }> {
    this.assertNotProduction();
    this.logger.log('Seeding sample data...');

    try {
      await seedSampleData(this.dataSource);

      return {
        success: true,
        message: 'Sample data seeded successfully',
        data: {
          user: { id: SAMPLE_USER.id, name: SAMPLE_USER.name },
          routes: SAMPLE_ROUTES.map((r) => ({ id: r.id, name: r.name })),
          alerts: SAMPLE_ALERTS.map((a) => ({ id: a.id, name: a.name, routeId: a.routeId })),
        },
      };
    } catch (error) {
      this.logger.error('Failed to seed sample data', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: {},
      };
    }
  }

  /**
   * 샘플 데이터 삭제
   * DELETE /dev/seed
   */
  @Delete('seed')
  async clearSampleData(): Promise<{ success: boolean; message: string }> {
    this.assertNotProduction();
    this.logger.log('Clearing sample data...');

    try {
      await clearSampleData(this.dataSource);
      return { success: true, message: 'Sample data cleared successfully' };
    } catch (error) {
      this.logger.error('Failed to clear sample data', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 샘플 데이터 조회
   * GET /dev/seed
   */
  @Get('seed')
  getSampleDataInfo(): object {
    this.assertNotProduction();
    return {
      user: SAMPLE_USER,
      routes: SAMPLE_ROUTES,
      alerts: SAMPLE_ALERTS,
      usage: {
        seed: 'POST /dev/seed - 샘플 데이터 삽입',
        clear: 'DELETE /dev/seed - 샘플 데이터 삭제',
        testNotification: `POST /scheduler/trigger - body: { alertId: "${SAMPLE_ALERTS[0].id}" }`,
        testRecommendation: `GET /routes/user/${SAMPLE_USER.id}/recommend?weather=맑음`,
      },
    };
  }

  /**
   * Phase 2 기능 테스트 가이드
   * GET /dev/phase2-guide
   */
  @Get('phase2-guide')
  getPhase2Guide(): object {
    this.assertNotProduction();
    return {
      title: 'Phase 2 기능 테스트 가이드',
      steps: [
        {
          step: 1,
          description: '샘플 데이터 삽입',
          request: 'POST /dev/seed',
          expected: '사용자, 경로, 통근 기록, 알림이 생성됨',
        },
        {
          step: 2,
          description: '경로 추천 테스트',
          request: `GET /routes/user/${SAMPLE_USER.id}/recommend?weather=맑음`,
          expected: '출근 경로 A가 추천됨 (평균 43분, 안정적)',
        },
        {
          step: 3,
          description: '비오는 날 경로 추천',
          request: `GET /routes/user/${SAMPLE_USER.id}/recommend?weather=비`,
          expected: '날씨 영향도가 반영된 추천',
        },
        {
          step: 4,
          description: '알림 트리거 테스트 (경로 연동)',
          request: `POST /scheduler/trigger`,
          body: { alertId: SAMPLE_ALERTS[0].id },
          expected: '알림에 추천 경로 정보 포함',
        },
        {
          step: 5,
          description: '프론트엔드 테스트',
          url: 'http://localhost:5173',
          actions: [
            'localStorage.setItem("userId", "550e8400-e29b-41d4-a716-446655440000")',
            '경로 설정 페이지에서 저장된 경로 확인',
            '알림 설정 페이지에서 알림 확인',
          ],
        },
      ],
      sampleIds: {
        userId: SAMPLE_USER.id,
        routeA: SAMPLE_ROUTES[0].id,
        routeB: SAMPLE_ROUTES[1].id,
        morningAlert: SAMPLE_ALERTS[0].id,
        eveningAlert: SAMPLE_ALERTS[1].id,
      },
    };
  }
}
