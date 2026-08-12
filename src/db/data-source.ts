import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm/browser';

config();

const configService = new ConfigService();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: configService.get<string>('PGHOST'),
  port: configService.get<number>('PGPORT'),
  username: configService.get<string>('PGUSER'),
  password: configService.get<string>('PGPASSWORD'),
  database: configService.get<string>('PGDATABASE'),

  // url: configService.get<string>('DBURL'),
  synchronize: true,

  entities: [__dirname + '/../**/*.entity{.ts,.js}'],

  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
};

export const dataSource = new DataSource(dataSourceOptions);
