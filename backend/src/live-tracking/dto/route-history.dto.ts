import { IsIn, IsOptional, IsString } from "class-validator";

export class RouteHistoryQueryDto {
  @IsIn(["today", "yesterday", "last7days", "last30days"])
  period!: "today" | "yesterday" | "last7days" | "last30days";

  @IsOptional()
  @IsString()
  busId?: string;
}
