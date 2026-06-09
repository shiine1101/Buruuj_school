import { IsOptional, IsString } from "class-validator";

export class CreateDriverDto {
  @IsString() fullName!: string;
  @IsString() phone!: string;
  @IsString() licenseNumber!: string;
  @IsOptional() @IsString() busId?: string;
  @IsOptional() @IsString() userId?: string;
}
