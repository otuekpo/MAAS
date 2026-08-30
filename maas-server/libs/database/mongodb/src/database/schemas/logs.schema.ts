import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

export type LogDocument = Logs & Document;

@Schema({ timestamps: true })
export class Logs {
  @Prop()
  user_id?: string;

  @Prop()
  email?: string;

  @Prop({ required: true })
  action!: string;

  @Prop()
  module?: string;

  @Prop({ required: true, enum: ["success", "failed", "blocked"] })
  status!: string;

  @Prop()
  ip_address?: string;

  @Prop()
  method?: string;

  @Prop()
  path?: string;

  @Prop()
  status_code?: number;

  @Prop()
  duration_ms?: number;

  @Prop()
  user_agent?: string;

  @Prop()
  role?: number;

  @Prop()
  message?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  data?: any;
}

export const LogsSchema = SchemaFactory.createForClass(Logs);

LogsSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }, // 90-day retention
);
LogsSchema.index({ email: 1, status: 1, module: 1 });
