import { IsDateString, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateBreakdownDto {
  @IsString() busId!: string;
  @IsString() problem!: string;
  @IsString() description!: string;
  @IsOptional() @IsNumber() @Min(0) repairCost?: number;
  @IsDateString() date!: string;
}
