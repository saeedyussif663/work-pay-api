import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppLogger } from '../common/logger/logger.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './entities/vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private vehiclesRepository: Repository<Vehicle>,
    private logger: AppLogger,
  ) {}

  async getAll() {
    const vehicles = await this.vehiclesRepository.find({
      where: { isActive: true },
    });

    return {
      message: 'Vehicles fetched successfully',
      data: vehicles,
    };
  }

  async findOne(id: number) {
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id, isActive: true },
      relations: { user: true },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const { user, ...rest } = vehicle;

    return {
      message: 'Vehicle fetched successfully',
      data: { ...rest, owner: user.name },
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

  async update(id: number, updateVehicleBody: UpdateVehicleDto) {
    const vehicle = await this.vehiclesRepository.findOneBy({
      id,
      isActive: true,
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

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

  async remove(id: number) {
    const vehicle = await this.vehiclesRepository.findOneBy({
      id,
      isActive: true,
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    await this.vehiclesRepository.update(id, { isActive: false });

    this.logger.log(`Vehicle-${id} deleted successfully`);

    return { message: 'Vehicle deleted successfully' };
  }
}
