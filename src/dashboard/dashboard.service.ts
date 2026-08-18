import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { calculateCompletionProjection } from '../common/utils/payment-calculations';
import { Payment } from '../payments/entities/payment.entity';
import { MonthlyPayment, SignedUser } from '../types';
import { Vehicle } from '../vehicles/entities/vehicle.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
  ) {}

  async getDashboardStats(user: SignedUser) {
    const vehicles = await this.vehiclesRepository.find({
      relations: { user: true },
      where: { user: { id: user.sub } },
    });
    const payments = await this.paymentsRepository.find({
      relations: { vehicle: { user: true } },
      where: { vehicle: { user: { id: user?.sub } } },
    });

    const totalVehicles = vehicles.length;
    const totalPayments = payments.reduce(
      (prevValue, currentValue) => prevValue + currentValue.amount,
      0,
    );
    const expectedReturn = vehicles.reduce(
      (prevValue, currentValue) => prevValue + currentValue.expectedReturn,
      0,
    );
    const totalCost = vehicles.reduce(
      (prevValue, currentValue) => prevValue + currentValue.cost,
      0,
    );

    return {
      message: 'Dashboard statistics fetched successful',
      data: [
        { label: 'Total Vehicles', value: totalVehicles, format: 'number' },
        { label: 'Total Payments', value: totalPayments, format: 'currency' },
        { label: 'Expected Return', value: expectedReturn, format: 'currency' },
        { label: 'Total Cost', value: totalCost, format: 'currency' },
      ],
    };
  }

  async getMonthlyPayments(user: SignedUser): Promise<MonthlyPayment[]> {
    const payments = await this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoin('payment.vehicle', 'vehicle')
      .leftJoin('vehicle.user', 'user')
      .select("TO_CHAR(payment.paidAt, 'YYYY-MM')", 'month')
      .addSelect('SUM(payment.amount)', 'total')
      .where('user.id = :id', { id: user.sub })
      .groupBy("TO_CHAR(payment.paidAt, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .getRawMany<MonthlyPayment>();

    return payments.map((payment) => ({
      month: payment.month,
      total: Number(payment.total),
    }));
  }

  async getRiderStats(user: SignedUser) {
    const vehicles = await this.vehiclesRepository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.payments', 'payment')
      .leftJoinAndSelect('vehicle.user', 'user')
      .where('user.id = :id', { id: user.sub })
      .getMany();

    const data = vehicles.map((vehicle) => {
      const projection = calculateCompletionProjection(
        {
          expectedReturn: Number(vehicle.expectedReturn),
          weeklyAmount: Number(vehicle.weeklyAmount),
          expectedCompletionDate: vehicle.expectedCompletionDate,
        },
        vehicle.payments ?? [],
      );

      const completionPct =
        vehicle.expectedReturn > 0
          ? Math.min(
              100,
              Math.round(
                (projection.totalPaid / Number(vehicle.expectedReturn)) * 100,
              ),
            )
          : 0;

      return {
        id: vehicle.id,
        riderName: vehicle.rider,
        totalExpectedReturn: Number(vehicle.expectedReturn),
        totalPaid: projection.totalPaid,
        completionPct,
        status: projection.status,
      };
    });

    return {
      message: 'Rider stats fetched successfully',
      data,
    };
  }

  async getRecentPayments(user: SignedUser) {
    const payments = await this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.user', 'user')
      .where('user.id = :id', { id: user?.sub })
      .orderBy('payment.paidAt', 'DESC')
      .limit(4)
      .getMany();

    return payments.map(({ vehicle, ...rest }) => ({
      ...rest,
      vehicleName: vehicle.name,
      riderName: vehicle.rider,
    }));
  }
}
