import { Min, MinLength } from 'class-validator';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Payment } from '../../payments/entities/payment.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false })
  @MinLength(2)
  name!: string;

  @Column({ nullable: false })
  @MinLength(2)
  rider!: string;

  @Column({ nullable: false })
  startDate!: Date;

  @Column({ nullable: false })
  @Min(0)
  cost!: number;

  @Column({ nullable: false })
  @Min(0)
  expectedReturn!: number;

  @OneToMany(() => Payment, (payment) => payment.vehicle)
  payments!: Payment[];

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn()
  user!: User;

  @Column({ nullable: false })
  @Min(0)
  weeklyAmount!: number;

  @Column({ default: true, select: false })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
