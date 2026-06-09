import { IsArray, IsString, MinLength } from "class-validator";

export class CreateOperatingAreaDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsArray()
  polygon!: number[][];
}

export class UpdateOperatingAreaDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsArray()
  polygon!: number[][];
}
