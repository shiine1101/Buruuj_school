import { IsNumber, IsString, Min, MinLength } from "class-validator";

export class CreatePickupPointDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsNumber()
  @Min(10)
  radius!: number;
}
