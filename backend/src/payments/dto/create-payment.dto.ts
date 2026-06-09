import { PaymentStatus } from "@prisma/client";
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class CreatePaymentDto {
  @IsString() studentId!: string;
  @IsString() academicYear!: string;
  @IsInt() @Min(1) @Max(12) month!: number;
  @IsNumber() @Min(0) amount!: number;
  @IsEnum(PaymentStatus) status!: PaymentStatus;
  @IsOptional() @IsString() notes?: string;
}
