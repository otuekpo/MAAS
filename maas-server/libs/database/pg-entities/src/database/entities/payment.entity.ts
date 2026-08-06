import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from "typeorm";
import { User } from "./user.entity";

@Entity()
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "boolean", nullable: false, default: false })
  disabled!: boolean;

  @Column({ type: "decimal", precision: 20, scale: 2 })
  amount!: string;

  @Column({ nullable: true })
  trip_id?: string;

  @ManyToOne(() => User, (user) => user.payments)
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
