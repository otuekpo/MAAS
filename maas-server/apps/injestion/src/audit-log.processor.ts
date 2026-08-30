import { Processor, Process } from "@nestjs/bull";
import type { Job } from "bull";
import { Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Logs } from "@app/database/mongodb";
import { AuditLogPayload } from "@app/shared";
import { AUDIT_LOG_JOB, AUDIT_LOG_QUEUE } from "./injestion.constants";

@Processor(AUDIT_LOG_QUEUE)
export class AuditLogProcessor {
  private readonly logger = new Logger(AuditLogProcessor.name);

  constructor(
    @InjectModel(Logs.name) private readonly logsModel: Model<Logs>,
  ) {}

  @Process({
    name: AUDIT_LOG_JOB,
    concurrency: Number(process.env.AUDIT_LOG_PROCESSOR_CONCURRENCY ?? 5),
  })
  async writeAuditLog(job: Job<AuditLogPayload>) {
    try {
      await this.logsModel.create(job.data);
    } catch (error: any) {
      this.logger.error(
        `Audit log job ${job.id} failed: ${error?.message}`,
        error?.stack,
      );
      throw error;
    }
  }
}
