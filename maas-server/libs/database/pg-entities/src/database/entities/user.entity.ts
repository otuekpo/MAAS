import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";

import { UserRole } from "@app/shared";
import { Payment } from "./payment.entity";

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ nullable: false, unique: true })
  email!: string;

  @Column({ nullable: false })
  password!: string;

  @Column({ nullable: true })
  phone_number?: string;

  @Column({ default: false })
  isEmailVerified!: boolean;

  @Column({ nullable: true })
  emailVerificationToken?: string;

  @Column({ type: "timestamp", nullable: true })
  emailVerificationTokenExpiry?: Date | null;

  @Column({ nullable: true })
  passwordResetToken?: string;

  @Column({ type: "timestamp", nullable: true })
  passwordResetTokenExpiry?: Date | null;

  @Column({ nullable: true })
  refreshToken?: string;

  @Column({ nullable: false, default: false, type: "boolean" })
  is2FAEnabled?: boolean;

  @Column({ nullable: true })
  twoFactorOTP?: string;

  @Column({ nullable: true, type: "timestamp", default: null })
  twoFactorOTPExpiresAt?: Date | null;

  @Column({ type: "boolean", nullable: false, default: false })
  disabled!: boolean;

  @Column({ type: "jsonb", nullable: true, default: null })
  disabledBy?: { adminID: string; timestamp: string } | null;

  @Column({ type: "jsonb", nullable: true, default: null })
  enabledBy?: { adminID: string; timestamp: string } | null;

  @Column({ type: "enum", enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @Column({ nullable: true })
  totpSecret?: string;

  @OneToMany(() => Payment, (payment) => payment.user)
  payments!: Payment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
