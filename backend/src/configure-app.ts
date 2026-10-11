import type { Request, Response, NextFunction } from 'express';

import compression from 'compression';

import cookieParser from 'cookie-parser';

import helmet from 'helmet';

import { ValidationPipe } from '@nestjs/common';

import type { INestApplication } from '@nestjs/common';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { Logger as PinoLogger } from 'nestjs-pino';

import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

import { ResponseInterceptor } from './common/interceptors/response.interceptor';

import { SanitizePipe } from './common/pipes/sanitize.pipe';

export function configureApp(app: INestApplication) {
  const logger = app.get(PinoLogger);

  app.useLogger(logger);

  app.enableShutdownHooks();

  app.setGlobalPrefix('v1');

  app.use(
    helmet({
      contentSecurityPolicy: false,

      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(compression());

  app.use(cookieParser());

  const allowedOrigins = (
    process.env.CORS_ORIGIN ??
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080,http://localhost:3000'
  )
    .split(',')
    .map((origin) => origin.trim());

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      (req.cookies?.erp_access ||
        req.cookies?.erp_refresh ||
        req.headers.origin) &&
      !req.headers.authorization &&
      !allowedOrigins.includes(req.headers.origin ?? '')
    ) {
      res.status(403).json({ message: 'Origem não autorizada' });

      return;
    }

    next();
  });

  app.enableCors({
    origin: (
      process.env.CORS_ORIGIN ??
      'http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080,http://localhost:3000'
    )

      .split(',')

      .map((origin) => origin.trim()),

    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],

    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],

    credentials: true,

    maxAge: 86400,
  });

  app.useGlobalPipes(
    new SanitizePipe(),

    new ValidationPipe({
      whitelist: true,

      forbidNonWhitelisted: true,

      transform: true,

      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());

  app.useGlobalFilters(new GlobalExceptionFilter());

  const swaggerConfig = new DocumentBuilder()

    .setTitle('Distribuidora ERP API')

    .setDescription(
      'API segura e modular para gestao de distribuidora de bebidas.',
    )

    .setVersion('1.0.0')

    .addBearerAuth()

    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  if (process.env.NODE_ENV !== 'production')
    SwaggerModule.setup('docs', app, document);
}
