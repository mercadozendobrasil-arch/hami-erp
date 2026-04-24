import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { ShopeeController } from './shopee.controller';
import { ShopeeService } from './shopee.service';

@Module({
  imports: [ProductsModule, OrdersModule],
  controllers: [ShopeeController],
  providers: [ShopeeService],
  exports: [ShopeeService],
})
export class ShopeeModule {}
