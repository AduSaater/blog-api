import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendOtpDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email of the account requesting a new verification code',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
