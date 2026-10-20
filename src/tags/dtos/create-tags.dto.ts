import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTagDto {
  @ApiProperty({
    example: 'NestJS',
    description: 'Unique display name of the tag',
  })
  @IsString()
  @MinLength(2)
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'nestjs',
    description:
      'Unique URL slug. Lowercase alphanumeric and hyphens. Auto-generated from name if omitted.',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'A slug should be lowercase alphanumeric characters separated by hyphens (e.g. "my-tag")',
  })
  @MaxLength(120)
  slug?: string;

  @ApiPropertyOptional({
    example: 'All articles and guides covering the NestJS framework.',
    description: 'Optional description of the topic/tag',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}