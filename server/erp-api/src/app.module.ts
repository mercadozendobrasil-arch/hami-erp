import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RuntimeConfigModule } from './common/config/runtime-config.module';
import { DatabaseModule } from './modules/database/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';
import { ShopeeModule } from './modules/shopee/shopee.module';
import { ShopsModule } from './modules/shops/shops.module';
import { validateEnvironment } from './common/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnvironment,
    }),
    RuntimeConfigModule,
    DatabaseModule,
    HealthModule,
    ShopeeModule,
    ShopsModule,
    ProductsModule,
    OrdersModule,
  ],
})
export class AppModule {}
