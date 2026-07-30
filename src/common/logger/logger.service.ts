import { Injectable, Logger, LoggerService } from '@nestjs/common';

@Injectable()
export class AppLogger implements LoggerService {
  private logger = new Logger();

  log(message: string, context?: string) {
    this.logger.log(message, ...(context ? [context] : []));
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(
      message,
      ...(trace ? [trace] : []),
      ...(context ? [context] : []),
    );
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, ...(context ? [context] : []));
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, ...(context ? [context] : []));
  }
}
