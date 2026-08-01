// payment.entity.ts
import { Min } from 'class-validator';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.payments, { nullable: false })
  @JoinColumn()
  vehicle!: Vehicle;

  @Column({ nullable: false })
  @Min(0)
  amount!: number;

  @CreateDateColumn()
  paidAt!: Date;
}
