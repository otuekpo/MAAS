import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type LogDocument = Logs & Document;

@Schema({ timestamps: true })
export class Logs {
  @Prop({ required: true })
  user_id!: string;

  @Prop({ required: true })
  action!: string;

  @Prop({ required: true, enum: ["success", "blocked"] })
  status!: string;

  @Prop()
  ip_address?: string;
}

export const LogsSchema = SchemaFactory.createForClass(Logs);
