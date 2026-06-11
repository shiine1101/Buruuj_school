import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { IoAdapter } from "@nestjs/platform-socket.io";
import helmet from "helmet";
import { AppModule } from "./app.module";

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, "");
}

function parseConfiguredOrigins(config: ConfigService) {
  const values = [
    config.get<string>("FRONTEND_URL"),
    config.get<string>("CORS_ORIGINS"),
    config.get<string>("VERCEL_URL") ? `https://${config.get<string>("VERCEL_URL")}` : undefined,
  ];

  return values
    .flatMap((value) => value?.split(",") ?? [])
    .map((value) => normalizeOrigin(value.trim()))
    .filter(Boolean);
}

function isAllowedOrigin(origin: string | undefined, allowedOrigins: string[]) {
  if (!origin) return true;

  const normalized = normalizeOrigin(origin);
  if (allowedOrigins.includes(normalized)) return true;

  try {
    const url = new URL(normalized);
    const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    const isVercelPreview = url.protocol === "https:" && url.hostname.endsWith(".vercel.app");
    const isRailwayService = url.protocol === "https:" && url.hostname.endsWith(".up.railway.app");

    return isLocalhost || isVercelPreview || isRailwayService;
  } catch {
    return false;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const allowedOrigins = parseConfiguredOrigins(config);

  // Configure Socket.IO adapter
  const ioAdapter = new IoAdapter(app);
  app.useWebSocketAdapter(ioAdapter);

  app.use(helmet());

  app.enableCors({
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin, allowedOrigins));
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = config.get<number>("PORT", 4000);
  await app.listen(port);

  console.log(`🚀 Backend running on port ${port}`);
}

void bootstrap();
