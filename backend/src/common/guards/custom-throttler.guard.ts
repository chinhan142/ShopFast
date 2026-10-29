import { ExecutionContext, Injectable, HttpStatus, HttpException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request, Response } from 'express';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  /**
   * F03: Exempt safe, read-only cacheable endpoints (Products catalog, Categories, Health)
   * from rate limiting so normal browsing and F5 refreshing never trigger a 429 lockout.
   * Rate limiting focuses on mutations, auth attempts, and resource-heavy APIs.
   */
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (req.method === 'GET' && (req.url.includes('/products') || req.url.includes('/health'))) {
      return true;
    }
    return false;
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // F03 Identification Key:
    // If user is authenticated, track by user ID; otherwise, track by client IP address
    if (req.user && req.user.userId) {
      return `user_${req.user.userId}`;
    }

    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? (forwarded as string).split(',')[0].trim() : req.ip || req.socket.remoteAddress;
    return `ip_${ip}`;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: any,
  ): Promise<void> {
    const response = context.switchToHttp().getResponse<Response>();
    const timeToWait = Math.ceil(throttlerLimitDetail.timeToBlockExpire / 1000) || 60;

    // F03: Set HTTP standard Retry-After header
    response.setHeader('Retry-After', timeToWait);

    throw new HttpException(
      {
        success: false,
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'TooManyRequests',
        message: `Bạn đang gửi yêu cầu quá thường xuyên. Vui lòng thử lại sau ${timeToWait} giây.`,
        retryAfterSeconds: timeToWait,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
