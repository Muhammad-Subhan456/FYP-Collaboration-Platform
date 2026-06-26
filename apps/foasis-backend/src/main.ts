import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

import { AppModule } from './app.module';
import { PerformanceInterceptor } from './common/performance/performance.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  if (process.env.PERF_LOG === 'true') {
    app.useGlobalInterceptors(new PerformanceInterceptor());
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
  origin: true,
  credentials: true,
});

  const uploadDir =
    process.env.UPLOAD_DIR ||
    join(process.cwd(), '..', '..', 'uploads');

  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  app.useStaticAssets(uploadDir, {
    prefix: '/files',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`FOASIS backend listening on http://localhost:${port}`);
}

bootstrap();
