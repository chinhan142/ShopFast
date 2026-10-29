import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ORDER_QUEUE_NAME } from './queue.constants';
import { OrderQueueProducer } from './order-queue.producer';
import { OrderQueueProcessor } from './order-queue.processor';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') || 'localhost',
          port: config.get<number>('REDIS_PORT') || 6379,
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          lazyConnect: true,
          maxRetriesPerRequest: null,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: ORDER_QUEUE_NAME,
    }),
    // F07 Bull-Board Dashboard UI at /admin/queues
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: ORDER_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
  ],
  providers: [OrderQueueProducer, OrderQueueProcessor],
  exports: [OrderQueueProducer],
})
export class QueueModule {}
