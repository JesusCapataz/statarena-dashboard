import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // --- Seguridad ---
  app.use(helmet());
  app.enableCors({
    origin: config.get<string[]>('corsOrigins'),
    credentials: true,
  });

  // Validación estricta: descarta props no declaradas y transforma tipos
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  // --- OpenAPI / Swagger ---
  if (config.get<string>('env') !== 'production') {
    const doc = new DocumentBuilder()
      .setTitle('StatArena API')
      .setDescription('Football Intelligence API — datos reales, tiempo real (SSE) y análisis.')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));
  }

  const port = config.get<number>('port')!;
  await app.listen(port);
  logger.log(`StatArena API escuchando en http://localhost:${port}/api`);
}

void bootstrap();
