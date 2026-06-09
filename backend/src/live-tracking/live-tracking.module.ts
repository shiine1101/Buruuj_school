import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { LiveTrackingController } from "./live-tracking.controller";
import { LiveTrackingGateway } from "./live-tracking.gateway";
import { LiveTrackingService } from "./live-tracking.service";

@Module({
  imports: [JwtModule.register({})],
  controllers: [LiveTrackingController],
  providers: [LiveTrackingService, LiveTrackingGateway]
})
export class LiveTrackingModule {}
