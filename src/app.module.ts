import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import ms from 'ms';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { LoggerModule } from './common/logger/logger.module';
import { HealthModule } from './health/health.module';
import { PaymentsModule } from './payments/payments.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('PGHOST'),
        port: config.get('PGPORT'),
        username: config.get('PGUSER'),
        password: config.get('PGPASSWORD'),
        database: config.get('PGDATABASE'),
        autoLoadEntities: true,
        synchronize: process.env.NODE_ENV === 'development',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
      }),
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ??
            '7d') as ms.StringValue,
        },
      }),
    }),
    HealthModule,
    LoggerModule,
    CommonModule,
    AuthModule,
    VehiclesModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
