import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: false });
  app.setGlobalPrefix("api/v1");
  app.use(cookieParser());
  const origin = process.env.WEB_ORIGIN ?? "http://localhost:3100";
  app.enableCors({
    origin,
    credentials: true,
  });
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`ELO-everything API on http://localhost:${port}/api/v1`);
}

bootstrap();
