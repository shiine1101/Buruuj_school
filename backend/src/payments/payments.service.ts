import { Injectable } from "@nestjs/common";
import { BaseCrudService } from "../common/base-crud.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PaymentsService extends BaseCrudService {
  constructor(prisma: PrismaService) { super(prisma); }
  findAll() { return this.list("payment", { include: { student: { include: { bus: true } } }, orderBy: [{ academicYear: "desc" }, { month: "asc" }] }); }
  createPayment(data: object) { return this.create("payment", data); }
  updatePayment(id: string, data: object) { return this.update("payment", id, data); }
  async revenue() {
    const result = await this.prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "PAID" } });
    return { monthlyRevenue: result._sum.amount ?? 0 };
  }
}
