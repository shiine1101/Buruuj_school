import { Module } from "@nestjs/common";
import { StudentsModule } from "../students/students.module";
import { DriversController } from "./drivers.controller";
import { DriversService } from "./drivers.service";

@Module({ imports: [StudentsModule], controllers: [DriversController], providers: [DriversService] })
export class DriversModule {}
