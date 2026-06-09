import { IsInt, IsString, Min } from "class-validator";

export class CreateBusDto {
  @IsString() busNumber!: string;
  @IsString() plateNumber!: string;
  @IsInt() @Min(1) capacity!: number;
}
