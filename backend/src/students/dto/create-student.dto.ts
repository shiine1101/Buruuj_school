import { Shift } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class CreateStudentDto {
  @IsString() studentId!: string;
  @IsString() fullName!: string;
  @IsEnum(Shift) shift!: Shift;
  @IsOptional() @IsString() parentName?: string;
  @IsOptional() @IsString() parentPhone?: string;
  @IsOptional() @IsString() emergencyContact?: string;
  @IsString() pickupPoint!: string;
  @IsOptional() @IsString() busId?: string;
  @IsString() academicYear!: string;
}
