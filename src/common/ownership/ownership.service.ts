import { ForbiddenException, Injectable } from '@nestjs/common';
import { AppLogger } from '../logger/logger.service';

@Injectable()
export class OwnershipService {
  constructor(private logger: AppLogger) {}

  check(ownerId: number, userId: number, resource: string, action: string) {
    if (ownerId !== userId) {
      this.logger.warn(
        `User-${userId} attempted to ${action} ${resource}-${ownerId} they do not own`,
      );
      throw new ForbiddenException('You do not have access to this resource');
    }
  }
}
