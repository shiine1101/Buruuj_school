import { IsDateString, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateFuelRecordDto {
  @IsString() busId!: string;
  @IsNumber() @Min(0) liters!: number;
  @IsNumber() @Min(0) cost!: number;
  @IsDateString() date!: string;
  @IsOptional() @IsString() notes?: string;
}
