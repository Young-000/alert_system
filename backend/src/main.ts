import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './presentation/app.module';
import { AllExceptionsFilter } from './presentation/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 보안 헤더 설정 (Helmet)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false, // PWA 호환성
  }));

  // CORS 설정 - 명시적 도메인만 허용 (보안 강화)
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'http://localhost:5178',
    'https://frontend-xi-two-52.vercel.app',
    'https://alert-commute-test.vercel.app', // Commute tracking test site
    process.env.CORS_ORIGIN,
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, callback) => {
      // 서버 간 요청 또는 허용된 origin만 통과
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Vercel 프리뷰 URL은 정확한 프로젝트 패턴만 허용
        const vercelPattern = /^https:\/\/frontend-xi-two-52(-[a-z0-9]+)*\.vercel\.app$/;
        if (vercelPattern.test(origin)) {
          callback(null, true);
        } else {
          logger.warn(`CORS blocked origin: ${origin}`);
          callback(null, false);
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // 전역 예외 필터 적용 (스택 트레이스 노출 방지)
  app.useGlobalFilters(new AllExceptionsFilter());

  // 전역 ValidationPipe 적용
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성 제거
      forbidNonWhitelisted: true, // 정의되지 않은 속성이 있으면 에러
      transform: true, // 자동 타입 변환
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger API 문서 설정 - 개발 환경에서만 활성화
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Alert System API')
      .setDescription('출퇴근 알림 시스템 - 날씨, 미세먼지, 교통 정보 통합 제공 및 스마트 알림')
      .setVersion('2.0')
      .addTag('users', '사용자 관리')
      .addTag('alerts', '알림 설정')
      .addTag('behavior', '행동 추적 및 패턴 분석')
      .addTag('notifications', '푸시 알림')
      .addTag('privacy', '개인정보 관리 (GDPR)')
      .addTag('air-quality', '미세먼지 정보')
      .addTag('subway', '지하철 정보')
      .addTag('bus', '버스 정보')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    logger.log('Swagger API Docs enabled (non-production)');
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();

