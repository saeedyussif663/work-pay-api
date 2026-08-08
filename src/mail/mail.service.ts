import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../auth/entities/user.entity';
import { AppLogger } from '../common/logger/logger.service';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly logger: AppLogger,
    private readonly configService: ConfigService,
  ) {}

  async sendPasswordResetEmail(user: User, token: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Password Reset Request',
        template: 'reset-password',
        context: {
          firstName: user.name,
          email: user.email,
          resetUrl: `${this.configService.get<string>('FRONTEND_URL')}/forgot-password/${token}`,
          year: new Date().getFullYear(),
          duration: this.configService.get<string>('JWT_RESET_EXPIRES_IN'),
        },
      });
      this.logger.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${user.email}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async sendWelcomeEmail(user: User): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Welcome to Work/Pay',
        template: 'welcome',
        context: {
          name: user.name,
          email: user.email,
          ctaUrl: `${this.configService.get<string>('FRONTEND_URL')}/signin`,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`Welcome email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to ${user.email}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
