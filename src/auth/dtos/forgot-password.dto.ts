import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Registered user email requesting password reset',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
