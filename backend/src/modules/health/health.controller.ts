import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('System Operations & Health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Kiểm tra trạng thái sức khỏe toàn bộ hệ thống (PostgreSQL, Redis, Memory)' })
  @ApiResponse({ status: 200, description: 'Hệ thống hoạt động ổn định' })
  @ApiResponse({ status: 503, description: 'Một hoặc nhiều dịch vụ gặp sự cố' })
  check() {
    return this.health.check([
      // 1. PostgreSQL Database Ping
      async () => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return { database: { status: 'up', message: 'PostgreSQL 16 connection is healthy' } };
        } catch (err: any) {
          return { database: { status: 'down', message: err.message } };
        }
      },
      // 2. Redis Cache Ping
      async () => {
        const isRedisUp = await this.redis.ping();
        return {
          redis: {
            status: isRedisUp ? 'up' : 'down',
            message: isRedisUp ? 'Redis connected' : 'Graceful degradation active (Direct DB)',
          },
        };
      },
      // 3. Memory Heap Check (threshold 300MB)
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
    ]);
  }
}
