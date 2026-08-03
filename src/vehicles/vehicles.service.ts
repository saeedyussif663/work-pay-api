import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppLogger } from '../common/logger/logger.service';
import { OwnershipService } from '../common/ownership/ownership.service';
import { calculateExpectedCompletionDate } from '../common/utils/payment-calculations';
import { Payment } from '../payments/entities/payment.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { FindVehiclesQueryDto } from './dto/find-vehicles-query.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './entities/vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    private logger: AppLogger,
    private ownershipService: OwnershipService,
  ) {}

  async getAll(userId: number | undefined, query: FindVehiclesQueryDto) {
    if (!userId) return;

    const { limit, page, search } = query;

    const qb = this.vehiclesRepository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.user', 'user')
      .where('vehicle.userId = :userId', { userId })
      .andWhere('vehicle.isActive = :isActive', { isActive: true });

    if (search) {
      qb.andWhere(
        '(vehicle.name ILIKE :search OR vehicle.rider ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await qb.getCount();

    const vehicles = await qb
      .orderBy('vehicle.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const numberOfPages = Math.ceil(total / limit);

    return {
      message: 'Vehicles fetched successfully',
      data: vehicles,
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
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id, isActive: true },
      relations: { user: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    this.ownershipService.check(vehicle.user.id, userId, 'Vehicle', 'access');

    const payments = await this.paymentsRepository.find({
      where: { vehicle: { id } },
    });
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const amountRemaining = vehicle.expectedReturn - totalPaid;
    const expectedCompletionDate = calculateExpectedCompletionDate(
      amountRemaining,
      vehicle.weeklyAmount,
    );

    const { user, ...rest } = vehicle;

    return {
      message: 'Vehicle fetched successfully',
      data: {
        ...rest,
        owner: user.name,
        totalPaid,
        amountRemaining,
        expectedCompletionDate,
      },
    };
  }

  async create(createVehicleBody: CreateVehicleDto, userId: number) {
    const vehicle = this.vehiclesRepository.create({
      ...createVehicleBody,
      user: { id: userId },
    });

    const saved = await this.vehiclesRepository.save(vehicle);

    const full = await this.vehiclesRepository.findOne({
      where: { id: saved.id },
      relations: { user: true },
    });

    const { user, ...rest } = full!;

    this.logger.log(`Vehicle-${saved.id} created successfully`);

    return {
      message: 'Vehicle created successfully',
      data: { ...rest, owner: user.name },
    };
  }

  async update(
    id: number,
    updateVehicleBody: UpdateVehicleDto,
    userId: number,
  ) {
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id, isActive: true },
      relations: { user: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    this.ownershipService.check(vehicle.user.id, userId, 'Vehicle', 'update');

    await this.vehiclesRepository.update(id, updateVehicleBody);

    const updated = await this.vehiclesRepository.findOne({
      where: { id },
      relations: { user: true },
    });

    const { user, ...rest } = updated!;

    this.logger.log(`Vehicle-${id} updated successfully`);

    return {
      message: 'Vehicle updated successfully',
      data: { ...rest, owner: user.name },
    };
  }

  async remove(id: number, userId: number) {
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id, isActive: true },
      relations: { user: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    this.ownershipService.check(vehicle.user.id, userId, 'Vehicle', 'delete');

    await this.vehiclesRepository.update(id, { isActive: false });

    this.logger.log(`Vehicle-${id} deleted successfully`);

    return { message: 'Vehicle deleted successfully' };
  }
}
