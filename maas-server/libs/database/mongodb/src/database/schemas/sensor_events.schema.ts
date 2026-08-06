import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type SensorEventDocument = SensorEvents & Document;

@Schema({ timestamps: true })
export class SensorEvents {
  @Prop({ required: true })
  trip_id!: string;

  @Prop({ type: { lat: Number, lng: Number }, required: true })
  location!: { lat: number; lng: number };

  @Prop({ required: true })
  timestamp!: Date;
}

export const SensorEventsSchema = SchemaFactory.createForClass(SensorEvents);
