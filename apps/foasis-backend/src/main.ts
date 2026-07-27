import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { existsSync, mkdirSync } from 'fs';
import helmet from 'helmet';
import { join } from 'path';

import { AppModule } from './app.module';
import {
  assertProductionConfig,
  resolveCorsOrigin,
} from './common/cors.config';
import { assertEmailConfig } from './email/email.config';
import { PerformanceInterceptor } from './common/performance/performance.interceptor';

async function bootstrap() {
  assertProductionConfig();
  assertEmailConfig();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));

  app.use(
    helmet({
      // Uploaded files are served from /files; keep cross-origin reads usable.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

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

  Logger.log(
    `FOASIS backend listening on http://localhost:${port}`,
    'Bootstrap',
  );
}

bootstrap();
