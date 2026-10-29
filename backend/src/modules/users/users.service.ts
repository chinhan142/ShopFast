import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role, User } from '@prisma/client';

export type UserWithoutSensitiveData = Omit<User, 'password' | 'refreshToken'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role?: Role;
  }): Promise<UserWithoutSensitiveData> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng trong hệ thống.');
    }

    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        password: data.password,
        fullName: data.fullName.trim(),
        phone: data.phone?.trim(),
        role: data.role || Role.CUSTOMER,
      },
    });

    return this.sanitizeUser(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findById(id: string): Promise<UserWithoutSensitiveData | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    return this.sanitizeUser(user);
  }

  async updateRefreshToken(userId: string, hashedRefreshToken: string | null): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken },
    });
  }

  async recordFailedLogin(email: string): Promise<{ isLocked: boolean; lockMinutes?: number }> {
    const user = await this.findByEmail(email);
    if (!user) return { isLocked: false };

    const newFailedCount = user.failedLogins + 1;
    let lockedUntil: Date | null = null;
    let isLocked = false;
    let lockMinutes = 0;

    // F03 Escalation block: > 5 consecutive failures locks account for 15 minutes
    if (newFailedCount >= 5) {
      lockMinutes = 15;
      lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
      isLocked = true;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: newFailedCount,
        lockedUntil,
      },
    });

    return { isLocked, lockMinutes };
  }

  async resetFailedLogins(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLogins: 0,
        lockedUntil: null,
      },
    });
  }

  sanitizeUser(user: User): UserWithoutSensitiveData {
    const { password, refreshToken, ...sanitized } = user;
    return sanitized;
  }
}
