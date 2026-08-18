import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { type Request } from 'express';
import { AuthGuard } from '../guards/auth.guard';
import { DashboardService } from './dashboard.service';

@UseGuards(AuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getDashboardStats(@Req() req: Request) {
    if (!req?.user) return;
    return this.dashboardService.getDashboardStats(req.user);
  }

  @Get('monthly-payments')
  getMonthlyPayments(@Req() req: Request) {
    if (!req?.user) return;
    return this.dashboardService.getMonthlyPayments(req.user);
  }

  @Get('rider-stats')
  getRiderStats(@Req() req: Request) {
    if (!req?.user) return;
    return this.dashboardService.getRiderStats(req.user);
  }

  @Get('recent-payments')
  getRecentPayments(@Req() req: Request) {
    if (!req?.user) return;
    return this.dashboardService.getRecentPayments(req.user);
  }
}
