import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService, UserWithoutSensitiveData } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';

export interface AuthResponse {
  user: UserWithoutSensitiveData;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
      fullName: dto.fullName,
      phone: dto.phone,
      role: Role.CUSTOMER,
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateHashedRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`New customer registered: ${user.email} (ID: ${user.id})`);

    return { user, tokens };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    // F03 Check Account Lockout (Brute-force protection)
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      throw new ForbiddenException(
        `Tài khoản đã bị tạm khóa do nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau ${remainingMinutes} phút.`
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      const lockStatus = await this.usersService.recordFailedLogin(dto.email);
      if (lockStatus.isLocked) {
        throw new ForbiddenException(
          `Bạn đã nhập sai mật khẩu 5 lần. Tài khoản bị tạm khóa trong ${lockStatus.lockMinutes} phút để bảo đảm an toàn.`
        );
      }
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    // Login succeeded: reset failed counter
    if (user.failedLogins > 0 || user.lockedUntil) {
      await this.usersService.resetFailedLogins(user.id);
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateHashedRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`User logged in successfully: ${user.email} [Role: ${user.role}]`);

    return {
      user: this.usersService.sanitizeUser(user),
      tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: string }> {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      throw new Error('[SECURITY FATAL] JWT_REFRESH_SECRET is not configured.');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn.');
    }

    const user = await this.usersService.findByEmail(payload.email);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Yêu cầu làm mới phiên đăng nhập bị từ chối.');
    }

    const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isMatch) {
      throw new UnauthorizedException('Refresh token không trùng khớp. Vui lòng đăng nhập lại.');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateHashedRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Đăng xuất thành công. Token đã được thu hồi.' };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const accessExpiration = this.configService.get<string>('JWT_EXPIRATION');
    const refreshExpiration = this.configService.get<string>('JWT_REFRESH_EXPIRATION');

    if (!jwtSecret || !refreshSecret) {
      throw new Error('[SECURITY FATAL] Mandatory JWT secrets are missing.');
    }

    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtSecret,
        expiresIn: accessExpiration,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiration,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiration || '15m',
    };
  }

  private async updateHashedRefreshToken(userId: string, refreshToken: string) {
    const saltRounds = 10;
    const hashed = await bcrypt.hash(refreshToken, saltRounds);
    await this.usersService.updateRefreshToken(userId, hashed);
  }
}
