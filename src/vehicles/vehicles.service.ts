import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AppLogger } from '../common/logger/logger.service';
import { OwnershipService } from '../common/ownership/ownership.service';
import {
  calculateCompletionProjection,
  calculateExpectedCompletionDate,
} from '../common/utils/payment-calculations';
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

    const vehicleIds = vehicles.map((v) => v.id);
    const payments = vehicleIds.length
      ? await this.paymentsRepository.find({
          where: { vehicle: { id: In(vehicleIds) } },
          relations: { vehicle: true },
        })
      : [];

    const paymentsByVehicleId = new Map<number, Payment[]>();
    for (const payment of payments) {
      const list = paymentsByVehicleId.get(payment.vehicle.id) ?? [];
      list.push(payment);
      paymentsByVehicleId.set(payment.vehicle.id, list);
    }

    const data = vehicles.map((vehicle) => {
      const { user, ...rest } = vehicle;
      const projection = calculateCompletionProjection(
        vehicle,
        paymentsByVehicleId.get(vehicle.id) ?? [],
      );

      return { ...rest, owner: user.name, ...projection };
    });

    return {
      message: 'Vehicles fetched successfully',
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

  async list(userId: number | undefined) {
    if (!userId) return;

    const vehicles = await this.vehiclesRepository
      .createQueryBuilder('vehicle')
      .select(['vehicle.id', 'vehicle.name'])
      .where('vehicle.userId = :userId', { userId })
      .andWhere('vehicle.isActive = :isActive', { isActive: true })
      .orderBy('vehicle.name', 'ASC')
      .getMany();

    const data = vehicles.map((vehicle) => ({
      id: vehicle.id,
      label: vehicle.name,
    }));

    return {
      message: 'Vehicles list fetched successfully',
      data,
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
    const projection = calculateCompletionProjection(vehicle, payments);

    const { user, ...rest } = vehicle;

    return {
      message: 'Vehicle fetched successfully',
      data: {
        ...rest,
        owner: user.name,
        ...projection,
      },
    };
  }

  async create(createVehicleBody: CreateVehicleDto, userId: number) {
    const expectedCompletionDate = calculateExpectedCompletionDate(
      createVehicleBody.expectedReturn,
      createVehicleBody.weeklyAmount,
      createVehicleBody.startDate,
    );

    const vehicle = this.vehiclesRepository.create({
      ...createVehicleBody,
      expectedCompletionDate,
      user: { id: userId },
    });

    const saved = await this.vehiclesRepository.save(vehicle);

    const full = await this.vehiclesRepository.findOne({
      where: { id: saved.id },
      relations: { user: true },
    });

    const { user, ...rest } = full!;
    const projection = calculateCompletionProjection(full!, []);

    this.logger.log(`Vehicle-${saved.id} created successfully`);

    return {
      message: 'Vehicle created successfully',
      data: { ...rest, owner: user.name, ...projection },
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
