import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ORDER_QUEUE_NAME, ORDER_JOBS } from './queue.constants';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Processor(ORDER_QUEUE_NAME)
export class OrderQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderQueueProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`⚙️  [Worker] Processing Job ${job.id} (${job.name}) - Attempt ${job.attemptsMade + 1}/${job.opts.attempts || 1}`);

    switch (job.name) {
      case ORDER_JOBS.SEND_CONFIRMATION_EMAIL:
        return this.handleSendEmail(job.data);

      case ORDER_JOBS.GENERATE_INVOICE:
        return this.handleGenerateInvoice(job.data);

      case ORDER_JOBS.PAYMENT_REMINDER:
        return this.handlePaymentReminder(job.data);

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return { acknowledged: true };
    }
  }

  private async handleSendEmail(data: {
    orderId: string;
    orderCode: string;
    totalAmount: number;
    customerEmail: string;
  }) {
    // Simulated Mailer Service (Idempotent delivery)
    this.logger.log(
      `📧 [Email Service] Sending order confirmation email to ${data.customerEmail} for order ${data.orderCode} (Amount: ${data.totalAmount} VND)...`
    );

    // Simulate work duration
    await new Promise((resolve) => setTimeout(resolve, 800));

    this.logger.log(`✅ [Email Service] Email sent successfully to ${data.customerEmail}`);
    return { sent: true, sentAt: new Date().toISOString() };
  }

  private async handleGenerateInvoice(data: {
    orderId: string;
    orderCode: string;
    totalAmount: number;
  }) {
    this.logger.log(`🧾 [Invoice Service] Generating e-invoice PDF for order ${data.orderCode}...`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const invoiceNumber = `INV-${Date.now()}`;
    this.logger.log(`✅ [Invoice Service] E-invoice generated: ${invoiceNumber}`);
    return { invoiceNumber, status: 'GENERATED' };
  }

  private async handlePaymentReminder(data: {
    orderId: string;
    orderCode: string;
    email: string;
  }) {
    const order = await this.prisma.order.findUnique({
      where: { id: data.orderId },
      select: { id: true, orderCode: true, status: true },
    });

    if (order && order.status === OrderStatus.PENDING) {
      this.logger.log(`⏰ [Reminder Service] Order ${order.orderCode} is still PENDING after 30 minutes. Dispatching payment reminder email to ${data.email}...`);
      return { reminded: true, orderCode: order.orderCode };
    } else {
      this.logger.log(`ℹ️  [Reminder Service] Order ${data.orderCode} is already paid or confirmed (Status: ${order?.status}). Reminder skipped.`);
      return { reminded: false, reason: 'ORDER_NOT_PENDING' };
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`🎉 [Job Completed] Job ${job.id} (${job.name}) finished successfully.`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `❌ [Job Failed / DLQ] Job ${job.id} (${job.name}) failed on attempt ${job.attemptsMade}: ${err.message}`,
      err.stack,
    );
  }
}
