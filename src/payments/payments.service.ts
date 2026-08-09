import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppLogger } from '../common/logger/logger.service';
import { OwnershipService } from '../common/ownership/ownership.service';
import { calculateCompletionProjection } from '../common/utils/payment-calculations';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FindPaymentsQueryDto } from './dto/find-payments-query.dto';
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

    const projection = calculateCompletionProjection(vehicle, allPayments);

    const { vehicle: _vehicle, ...rest } = payment;

    return {
      message: 'Payment logged successfully',
      data: {
        ...rest,
        vehicleName: vehicle.name,
        riderName: vehicle.rider,
        ...projection,
      },
    };
  }

  async findAllForUser(userId: number, query: FindPaymentsQueryDto) {
    const { limit, page, search } = query;

    const qb = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.vehicle', 'vehicle')
      .where('vehicle.userId = :userId', { userId });

    if (search) {
      qb.andWhere(
        '(vehicle.name ILIKE :search OR vehicle.rider ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await qb.getCount();

    const payments = await qb
      .orderBy('payment.paidAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const data = payments.map(({ vehicle, ...rest }) => ({
      ...rest,
      vehicleName: vehicle.name,
      riderName: vehicle.rider,
    }));

    const numberOfPages = Math.ceil(total / limit);

    return {
      message: 'Payments fetched successfully',
      data,
      metadata: {
        total,
        numberOfPages,
        currentPage: page,
        hasPreviousPage: page > 1,
        hasNextPage: page < numberOfPages,
      },
    };
  }

  async findOne(id: number, userId: number) {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: { vehicle: { user: true } },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    this.ownershipService.check(
      payment.vehicle.user.id,
      userId,
      'Payment',
      'view',
    );

    const { vehicle, ...rest } = payment;

    return {
      message: 'Payment fetched successfully',
      data: { ...rest, vehicleName: vehicle.name, riderName: vehicle.rider },
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

    const projection = calculateCompletionProjection(vehicle, payments);

    return {
      message: 'Payments fetched successfully',
      data: {
        vehicleName: vehicle.name,
        riderName: vehicle.rider,
        ...projection,
        payments,
      },
    };
  }
}
