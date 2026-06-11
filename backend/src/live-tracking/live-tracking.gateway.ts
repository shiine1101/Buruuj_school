import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, "");
}

function parseOrigins(value?: string) {
  return (value ?? "")
    .split(",")
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter(Boolean);
}

function isAllowedSocketOrigin(origin: string | undefined) {
  if (!origin) return true;

  const allowedOrigins = parseOrigins(process.env.CORS_ORIGINS);
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(normalizeOrigin(process.env.FRONTEND_URL));
  }
  if (process.env.VERCEL_URL) {
    allowedOrigins.push(`https://${normalizeOrigin(process.env.VERCEL_URL)}`);
  }

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

@WebSocketGateway({
  namespace: "/tracking",
  cors: {
    origin(origin, callback) {
      callback(null, isAllowedSocketOrigin(origin));
    },
    credentials: true
  }
})
export class LiveTrackingGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(LiveTrackingGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers.authorization?.replace("Bearer ", "") as string | undefined);

      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = await this.jwt.verifyAsync<{ sub: string; email: string; role: string }>(token, {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET")
      });

      client.data.user = payload;
      if (payload.role === "ADMIN") {
        client.join("admins");
      }
      if (payload.role === "DRIVER") {
        client.join("drivers");
      }
    } catch {
      this.logger.warn(`Rejected websocket connection ${client.id}`);
      client.disconnect(true);
    }
  }

  broadcastTrackingEvent(event: string, payload: unknown) {
    this.server.to("admins").emit(event, payload);
    this.server.emit(event, payload);
  }

  @SubscribeMessage("join-tracking")
  handleJoin(@ConnectedSocket() client: Socket) {
    if (client.data.user?.role === "ADMIN") {
      client.join("admins");
    }
    return { ok: true };
  }

  @SubscribeMessage("ping-tracking")
  handlePing(@MessageBody() data: { ts: number }) {
    return { ok: true, ts: data?.ts ?? Date.now() };
  }
}
