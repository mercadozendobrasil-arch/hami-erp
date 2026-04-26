import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { ErpModule } from './erp/erp.module';
import { PrismaModule } from './infra/database/prisma.module';
import { QueueModule } from './infra/queue/queue.module';
import { AuthModule } from './modules/auth/auth.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { MediaModule } from './modules/media/media.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProductsModule } from './modules/products/products.module';
import { ShopsModule } from './modules/shops/shops.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ShopeeSdkModule } from './shopee-sdk/shopee-sdk.module';

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
    CommonModule,
    PrismaModule,
    ShopeeSdkModule,
    QueueModule,
    AuthModule,
    ShopsModule,
    ProductsModule,
    MediaModule,
    LogisticsModule,
    PaymentsModule,
    OrdersModule,
    ErpModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
