import { Global, Module } from '@nestjs/common';
import { LoggerModule } from './logger/logger.module';
import { OwnershipService } from './ownership/ownership.service';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [OwnershipService],
  exports: [OwnershipService],
})
export class CommonModule {}
