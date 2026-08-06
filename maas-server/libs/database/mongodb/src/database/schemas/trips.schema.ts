import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type TripDocument = Trips & Document;

@Schema({ timestamps: true })
export class Trips {
  @Prop({ required: true })
  user_id!: string;

  @Prop({ required: true })
  route!: string;

  @Prop({ required: true })
  transport!: string;

  @Prop({ required: true })
  date!: Date;

  @Prop()
  description?: string;

  @Prop({ required: true })
  cost!: number;

  @Prop()
  eta!: string;
}

export const TripsSchema = SchemaFactory.createForClass(Trips);
