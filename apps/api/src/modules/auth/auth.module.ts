import { Module } from '@nestjs/common';

import { QueueModule } from 'src/infra/queue/queue.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [QueueModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
