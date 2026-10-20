import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'John',
    description: 'Updated first name',
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(64)
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Doe',
    description: 'Updated last name',
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(64)
  lastName?: string;

  @ApiPropertyOptional({
    example: 'Passionate software engineer and tech blogger.',
    description: 'User biography / about me',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;
}
