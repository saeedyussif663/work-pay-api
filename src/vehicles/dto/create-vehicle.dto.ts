import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, Min, MinLength } from 'class-validator';

export class CreateVehicleDto {
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @IsNotEmpty()
  @MinLength(2)
  rider!: string;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsNumber()
  @Min(0)
  cost!: number;

  @IsNumber()
  @Min(0)
  expectedReturn!: number;
}
