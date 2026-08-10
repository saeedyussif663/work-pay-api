import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type Request } from 'express';
import { AuthGuard } from '../guards/auth.guard';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { FindVehiclesQueryDto } from './dto/find-vehicles-query.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@UseGuards(AuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  getAll(@Query() query: FindVehiclesQueryDto, @Req() req: Request) {
    return this.vehiclesService.getAll(req?.user?.sub, query);
  }

  @Get('list')
  list(@Req() req: Request) {
    return this.vehiclesService.list(req?.user?.sub);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    if (!req.user) return;
    return this.vehiclesService.findOne(id, req.user.sub);
  }

  @Post()
  create(@Body() createVehicleBody: CreateVehicleDto, @Req() req: Request) {
    if (!req.user) return;
    return this.vehiclesService.create(createVehicleBody, req.user.sub);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVehicleBody: UpdateVehicleDto,
    @Req() req: Request,
  ) {
    if (!req.user) return;
    return this.vehiclesService.update(id, updateVehicleBody, req.user.sub);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    if (!req.user) return;
    return this.vehiclesService.remove(id, req.user.sub);
  }
}
