import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') || 6379;
    const password = this.configService.get<string>('REDIS_PASSWORD') || undefined;

    try {
      this.client = new Redis({
        host,
        port,
        password,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) {
            // Stop aggressive retries to avoid flooding logs
            return null;
          }
          return Math.min(times * 100, 1000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`✅ Connected to Redis cache service at ${host}:${port}`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`⚠️  Redis warning: ${err.message}. System operating in Graceful Degradation mode (Direct DB).`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      // Attempt initial connection
      this.client.connect().catch((err) => {
        this.isConnected = false;
        this.logger.warn(`⚠️  Initial Redis connection failed (${err.message}). Caching disabled; using direct database queries.`);
      });
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(`⚠️  Could not initialize Redis client: ${err.message}.`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
        this.logger.log('Redis client connection closed.');
      } catch (err: any) {
        this.logger.warn(`Error closing Redis connection: ${err.message}`);
      }
    }
  }

  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable() || !this.client) {
      return null;
    }

    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err: any) {
      this.logger.warn(`Failed to GET cache key "${key}": ${err.message}`);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    if (!this.isAvailable() || !this.client) {
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to SET cache key "${key}": ${err.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isAvailable() || !this.client) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (err: any) {
      this.logger.warn(`Failed to DEL cache key "${key}": ${err.message}`);
    }
  }

  /**
   * F04 Cache Invalidation by pattern (e.g. "products:*")
   * Uses SCAN instead of KEYS to avoid blocking the Redis event loop.
   */
  async delByPattern(pattern: string): Promise<number> {
    if (!this.isAvailable() || !this.client) {
      return 0;
    }

    try {
      let cursor = '0';
      let totalDeleted = 0;

      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.client.del(...keys);
          totalDeleted += keys.length;
        }
      } while (cursor !== '0');

      if (totalDeleted > 0) {
        this.logger.log(`🧹 Cache Invalidation: purged ${totalDeleted} key(s) matching "${pattern}"`);
      }

      return totalDeleted;
    } catch (err: any) {
      this.logger.warn(`Failed to DEL by pattern "${pattern}": ${err.message}`);
      return 0;
    }
  }

  async ping(): Promise<boolean> {
    if (!this.isAvailable() || !this.client) {
      return false;
    }

    try {
      const res = await this.client.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }
}
