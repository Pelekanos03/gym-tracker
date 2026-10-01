import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Frontend (Vite dev server) runs on 5173 by default.
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' });

  app.setGlobalPrefix('api');

  // The session lives in an httpOnly cookie (see auth/session.ts).
  app.use(cookieParser());

  // Behind nginx: take the client IP from X-Forwarded-For, so login rate
  // limiting counts per visitor rather than per proxy. One hop (nginx) by
  // default; 2 when a Cloudflare tunnel sits in front of nginx too.
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

  // Validate and strip request bodies against the DTO classes.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // Applies @Exclude()/@Expose() on entities to every response (hides passwordHash).
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`gym-app API listening on http://localhost:${port}/api`);
}
bootstrap();
