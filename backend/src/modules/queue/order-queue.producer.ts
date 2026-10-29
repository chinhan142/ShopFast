import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ORDER_QUEUE_NAME, ORDER_JOBS } from './queue.constants';

@Injectable()
export class OrderQueueProducer {
  private readonly logger = new Logger(OrderQueueProducer.name);

  constructor(@InjectQueue(ORDER_QUEUE_NAME) private readonly orderQueue: Queue) {}

  /**
   * F05: Push order confirmation email to queue with Idempotency Key & Exponential Backoff
   */
  async addOrderConfirmationJob(order: {
    id: string;
    orderCode: string;
    totalAmount: number;
    email: string;
  }) {
    try {
      // Idempotency: Use deterministic jobId so repeated pushes never duplicate emails
      const jobId = `order_email_${order.id}`;

      await this.orderQueue.add(
        ORDER_JOBS.SEND_CONFIRMATION_EMAIL,
        {
          orderId: order.id,
          orderCode: order.orderCode,
          totalAmount: order.totalAmount,
          customerEmail: order.email,
        },
        {
          jobId,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 3000, // 3s, 6s, 12s...
          },
          removeOnComplete: 100,
          removeOnFail: false, // Retain in DLQ on complete failure
        },
      );

      this.logger.log(`📥 [BullMQ] Queued email confirmation job: ${jobId}`);
    } catch (err: any) {
      this.logger.warn(`Failed to queue order email job: ${err.message}`);
    }
  }

  /**
   * F05: Asynchronous Invoice Generation
   */
  async addInvoiceGenerationJob(order: {
    id: string;
    orderCode: string;
    totalAmount: number;
  }) {
    try {
      const jobId = `invoice_${order.id}`;

      await this.orderQueue.add(
        ORDER_JOBS.GENERATE_INVOICE,
        {
          orderId: order.id,
          orderCode: order.orderCode,
          totalAmount: order.totalAmount,
        },
        {
          jobId,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: false,
        },
      );

      this.logger.log(`📥 [BullMQ] Queued invoice generation job: ${jobId}`);
    } catch (err: any) {
      this.logger.warn(`Failed to queue invoice job: ${err.message}`);
    }
  }

  /**
   * F05: Scheduled 30-minute Payment Reminder Job
   */
  async addPaymentReminderJob(order: { id: string; orderCode: string; email: string }) {
    try {
      const jobId = `payment_reminder_${order.id}`;
      // In production: 30 * 60 * 1000. In demo environment: 30 seconds for quick testing!
      const delayMs = process.env.NODE_ENV === 'production' ? 30 * 60 * 1000 : 30 * 1000;

      await this.orderQueue.add(
        ORDER_JOBS.PAYMENT_REMINDER,
        {
          orderId: order.id,
          orderCode: order.orderCode,
          email: order.email,
        },
        {
          jobId,
          delay: delayMs,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      this.logger.log(`⏰ [BullMQ] Scheduled payment reminder for order ${order.orderCode} (Delay: ${delayMs / 1000}s)`);
    } catch (err: any) {
      this.logger.warn(`Failed to schedule payment reminder: ${err.message}`);
    }
  }
}
