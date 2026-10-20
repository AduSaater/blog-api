import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Valid JWT refresh token previously issued',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
