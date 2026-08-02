import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppLogger } from '../common/logger/logger.service';
import { OwnershipService } from '../common/ownership/ownership.service';
import { calculateExpectedCompletionDate } from '../common/utils/payment-calculations';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    private readonly logger: AppLogger,
    private readonly ownershipService: OwnershipService,
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

    this.ownershipService.check(
      vehicle.user.id,
      userId,
      'Payment',
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

    const allPayments = await this.paymentsRepository.find({
      where: { vehicle: { id: vehicleId } },
    });

    const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const amountRemaining = vehicle.expectedReturn - totalPaid;
    const expectedCompletionDate = calculateExpectedCompletionDate(
      amountRemaining,
      vehicle.weeklyAmount,
    );

    const { vehicle: _vehicle, ...rest } = payment;

    return {
      message: 'Payment logged successfully',
      data: {
        ...rest,
        vehicleName: vehicle.name,
        riderName: vehicle.rider,
        totalPaid,
        amountRemaining,
        expectedCompletionDate,
      },
    };
  }

  async findAllForUser(userId: number) {
    const payments = await this.paymentsRepository.find({
      where: { vehicle: { user: { id: userId } } },
      relations: { vehicle: true },
      order: { paidAt: 'DESC' },
    });

    const data = payments.map(({ vehicle, ...rest }) => ({
      ...rest,
      vehicleName: vehicle.name,
      riderName: vehicle.rider,
    }));

    return {
      message: 'Payments fetched successfully',
      data,
    };
  }

  async findAllForVehicle(vehicleId: number, userId: number) {
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id: vehicleId, isActive: true },
      relations: { user: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    this.ownershipService.check(
      vehicle.user.id,
      userId,
      'Payment',
      'view payments for',
    );

    const payments = await this.paymentsRepository.find({
      where: { vehicle: { id: vehicleId } },
      order: { paidAt: 'DESC' },
    });

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const amountRemaining = vehicle.expectedReturn - totalPaid;
    const expectedCompletionDate = calculateExpectedCompletionDate(
      amountRemaining,
      vehicle.weeklyAmount,
    );

    return {
      message: 'Payments fetched successfully',
      data: {
        vehicleName: vehicle.name,
        riderName: vehicle.rider,
        totalPaid,
        amountRemaining,
        expectedCompletionDate,
        payments,
      },
    };
  }
}
