import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MultiGroupConfigEntity } from './entities/multiGroupConfig.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => ({
        type: 'postgres',
        url: process.env.TYPEORM_URL,
        autoLoadEntities: true,
        synchronize: process.env.TYPEORM_SYNCHRONIZE == 'true',
      }),
      dataSourceFactory: async (options) => {
        return  await new DataSource(options).initialize();
      },
    }),
    TypeOrmModule.forFeature([MultiGroupConfigEntity]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
}