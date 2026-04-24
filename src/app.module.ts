import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './infra/database/prisma.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

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
    PaymentsModule,
    OrdersModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
