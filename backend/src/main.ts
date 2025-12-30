import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './presentation/app.module';
import { GlobalExceptionFilter } from './infrastructure/middleware/error-handler.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 전역 예외 필터 설정
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  // CORS 설정 - 환경 변수로 제어 가능하도록
  const frontendUrl = process.env.FRONTEND_URL || process.env.NODE_ENV === 'production' 
    ? 'http://localhost:80' 
    : 'http://localhost:5173';
  
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  // 전역 ValidationPipe 설정
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
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();

