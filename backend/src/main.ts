import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './presentation/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정 - 개발 및 프로덕션 도메인 허용
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://frontend-xi-two-52.vercel.app',
        process.env.CORS_ORIGIN,
      ].filter(Boolean);

      // Vercel preview URLs 허용
      if (!origin ||
          allowedOrigins.includes(origin) ||
          origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });

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

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();

