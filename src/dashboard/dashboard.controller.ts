import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getDashboardStats() {
    return this.dashboardService.getDashboardStats();
  }

  @Get('monthly-payments')
  getMonthlyPayments() {
    return this.dashboardService.getMonthlyPayments();
  }

  @Get('rider-stats')
  getRiderStats() {
    return this.dashboardService.getRiderStats();
  }

  @Get('recent-payments')
  getRecentPayments() {
    return this.dashboardService.getRecentPayments();
  }
}
