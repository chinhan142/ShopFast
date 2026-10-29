import { Global, Module } from '@nestjs/common';
import { OrdersGateway } from './orders.gateway';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
  imports: [JwtModule],
  providers: [OrdersGateway],
  exports: [OrdersGateway],
})
export class RealtimeModule {}
