import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { Payment } from './entity/payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [VehiclesModule, TypeOrmModule.forFeature([Payment, Vehicle])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
