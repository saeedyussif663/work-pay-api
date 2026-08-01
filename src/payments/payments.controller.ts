import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type Request } from 'express';
import { AuthGuard } from '../guards/auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@UseGuards(AuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':vehicleId')
  create(
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
    @Body() createPaymentBody: CreatePaymentDto,
    @Req() req: Request,
  ) {
    if (!req.user) return;
    return this.paymentsService.create(
      vehicleId,
      createPaymentBody,
      req.user.sub,
    );
  }
}
