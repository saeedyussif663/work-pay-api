import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppLogger } from '../common/logger/logger.service';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './entity/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    private readonly logger: AppLogger,
    private readonly vehiclesServe: VehiclesService,
  ) {}

  async create(
    vehicleId: number,
    createPaymentBody: CreatePaymentDto,
    userId: number,
  ) {
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id: vehicleId, isActive: true },
      relations: { user: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    this.vehiclesServe.checkOwnership(
      vehicle.user.id,
      userId,
      'log a payment for',
    );

    const payment = this.paymentsRepository.create({
      ...createPaymentBody,
      vehicle: { id: vehicleId },
    });

    await this.paymentsRepository.save(payment);

    this.logger.log(
      `Payment-${payment.id} of ${payment.amount} logged for Vehicle-${vehicleId}`,
    );

    return {
      message: 'Payment logged successfully',
      data: { ...payment, vehicle: vehicle.name },
    };
  }
}
