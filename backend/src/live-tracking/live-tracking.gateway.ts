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

@WebSocketGateway({
  namespace: "/tracking",
  cors: {
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
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
