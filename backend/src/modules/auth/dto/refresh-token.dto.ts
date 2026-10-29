import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh Token được cấp khi đăng nhập' })
  @IsString({ message: 'Refresh Token phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Refresh Token không được để trống' })
  refreshToken: string;
}
