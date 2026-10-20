import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyAccountDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email of the account to verify',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: '482910',
    description: '6-digit OTP code sent via Gmail',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^[0-9]{6}$/, { message: 'OTP must consist only of numbers' })
  otp: string;
}
