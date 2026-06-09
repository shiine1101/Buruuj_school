import { IsBoolean, IsDateString, IsString } from "class-validator";

export class CreateAttendanceDto {
  @IsString() studentId!: string;
  @IsDateString() date!: string;
  @IsBoolean() pickedUp!: boolean;
  @IsBoolean() droppedHome!: boolean;
}
