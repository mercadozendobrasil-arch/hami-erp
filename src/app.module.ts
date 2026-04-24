import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ShopeeCommonModule } from './common/shopee/shopee-common.module';
import { PrismaModule } from './infra/database/prisma.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { MediaModule } from './modules/media/media.module';
import { ProductsModule } from './modules/products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: Number(configService.get<string>('REDIS_PORT', '6379')),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
          db: Number(configService.get<string>('REDIS_DB', '0')),
        },
        prefix: configService.get<string>('QUEUE_PREFIX', 'shopee-service'),
      }),
    }),
    PrismaModule,
    ShopeeCommonModule,
    ProductsModule,
    MediaModule,
    LogisticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
