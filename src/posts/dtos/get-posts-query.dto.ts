import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { postStatus } from '../enums/post-status.enum';
import { PostType } from '../enums/post-type.enum';

export class GetPostsQueryDto {
  @ApiPropertyOptional({
    description: 'Number of posts per page',
    default: 10,
    example: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Page index number (1-based)',
    default: 1,
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    enum: postStatus,
    description: 'Filter posts by publication status',
  })
  @IsEnum(postStatus)
  @IsOptional()
  status?: postStatus;

  @ApiPropertyOptional({
    enum: PostType,
    description: 'Filter posts by type',
  })
  @IsEnum(PostType)
  @IsOptional()
  postType?: PostType;

  @ApiPropertyOptional({
    description: 'Filter by Tag ObjectId or Slug',
  })
  @IsString()
  @IsOptional()
  tag?: string;

  @ApiPropertyOptional({
    description: 'Filter by Author User ObjectId',
  })
  @IsString()
  @IsOptional()
  author?: string;

  @ApiPropertyOptional({
    description: 'Search term matching title or content',
  })
  @IsString()
  @IsOptional()
  search?: string;
}
