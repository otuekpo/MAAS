import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Payment, User } from "@app/database/pg-entities";

@Injectable()
export class SmartTicketingService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async issueTicket(
    tripId: string,
    userId: string,
    amount: number,
  ): Promise<Payment> {
    const payment = this.paymentRepository.create({
      amount: amount.toFixed(2),
      trip_id: tripId,
      user: { id: userId } as User,
    });
    return this.paymentRepository.save(payment);
  }
}
