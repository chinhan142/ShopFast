import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '@prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@shopfast.vn',
    password: 'hashedPassword',
    fullName: 'Test User',
    phone: '0912345678',
    role: Role.CUSTOMER,
    refreshToken: null,
    failedLogins: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ConflictException if email is already taken', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.create({
          email: 'test@shopfast.vn',
          password: 'pass',
          fullName: 'Test',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create new user and sanitize password from return', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.create({
        email: 'test@shopfast.vn',
        password: 'pass',
        fullName: 'Test User',
      });

      expect(result.email).toBe('test@shopfast.vn');
      expect((result as any).password).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should return sanitized user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findById('user-1');
      expect(result?.id).toBe('user-1');
      expect((result as any).password).toBeUndefined();
    });
  });

  describe('recordFailedLogin (Brute-force Escalation Block)', () => {
    it('should lock account after 5 consecutive failures for 15 minutes', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        failedLogins: 4, // 5th attempt
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const status = await service.recordFailedLogin('test@shopfast.vn');

      expect(status.isLocked).toBe(true);
      expect(status.lockMinutes).toBe(15);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ failedLogins: 5, lockedUntil: expect.any(Date) }),
        }),
      );
    });
  });

  describe('resetFailedLogins', () => {
    it('should reset failedLogins counter and clear lockedUntil', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await service.resetFailedLogins('user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { failedLogins: 0, lockedUntil: null },
      });
    });
  });
});
