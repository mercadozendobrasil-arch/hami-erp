import { Module } from '@nestjs/common';

import { QueueModule } from 'src/infra/queue/queue.module';
import { AuthSdk } from 'src/shopee-sdk/modules/auth.sdk';
import { ShopSdk } from 'src/shopee-sdk/modules/shop.sdk';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [QueueModule],
  controllers: [AuthController],
  providers: [AuthService, AuthSdk, ShopSdk],
  exports: [AuthService],
})
export class AuthModule {}
