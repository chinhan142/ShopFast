import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'customer@shopfast.vn',
    password: 'hashedPassword123',
    fullName: 'Nguyen Van A',
    phone: '0912345678',
    role: Role.CUSTOMER,
    refreshToken: null,
    failedLogins: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockUsersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      updateRefreshToken: jest.fn(),
      recordFailedLogin: jest.fn(),
      resetFailedLogins: jest.fn(),
      sanitizeUser: jest.fn((u) => {
        const { password, refreshToken, ...rest } = u;
        return rest;
      }),
    };

    const mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mocked_jwt_token'),
      verifyAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'mock_secret_key_minimum_32_characters_length';
          case 'JWT_REFRESH_SECRET':
            return 'mock_refresh_secret_key_minimum_32_characters';
          case 'JWT_EXPIRATION':
            return '15m';
          case 'JWT_REFRESH_EXPIRATION':
            return '7d';
          default:
            return null;
        }
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a customer and return tokens', async () => {
      usersService.create.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        fullName: mockUser.fullName,
        phone: mockUser.phone,
        role: mockUser.role,
        failedLogins: 0,
        lockedUntil: null,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });

      const result = await service.register({
        email: 'customer@shopfast.vn',
        password: 'Password123!',
        fullName: 'Nguyen Van A',
      });

      expect(result.user.email).toBe('customer@shopfast.vn');
      expect(result.tokens.accessToken).toBe('mocked_jwt_token');
      expect(usersService.create).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException when email does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nonexistent@shopfast.vn', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException if account is currently locked', async () => {
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // locked for 10 more minutes
      });

      await expect(
        service.login({ email: mockUser.email, password: 'Password123!' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully login and reset failed logins on valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 10);
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
        failedLogins: 2,
      });

      const result = await service.login({
        email: mockUser.email,
        password: 'CorrectPassword123!',
      });

      expect(result.user.email).toBe(mockUser.email);
      expect(result.tokens.accessToken).toBe('mocked_jwt_token');
      expect(usersService.resetFailedLogins).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
