import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MinLength,
} from 'class-validator';
import { postStatus } from '../enums/post-status.enum';
import { PostType } from '../enums/post-type.enum';

export class CreatePostDto {
  @ApiProperty({
    example: 'Getting Started with NestJS and MongoDB',
    description: 'Title of the blog post',
  })
  @IsString()
  @MinLength(4)
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    enum: PostType,
    default: PostType.POST,
    description: "Type of post: 'post', 'page', 'story', 'series'",
  })
  @IsEnum(PostType)
  @IsOptional()
  postType?: PostType;

  @ApiPropertyOptional({
    example: 'getting-started-with-nestjs-and-mongodb',
    description:
      'Slug for URL. Lowercase alphanumeric and hyphens. Auto-generated from title if omitted.',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'A slug should be lowercase alphanumeric characters separated by hyphens (e.g. "my-first-post")',
  })
  slug?: string;

  @ApiPropertyOptional({
    enum: postStatus,
    default: postStatus.DRAFT,
    description: "Status: 'draft', 'scheduled', 'review', 'published'",
  })
  @IsEnum(postStatus)
  @IsOptional()
  status?: postStatus;

  @ApiPropertyOptional({
    example: 'Detailed markdown or HTML article content...',
    description: 'Main body content of the blog post',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    description: 'Direct URL to featured image (or upload file via multipart)',
  })
  @IsOptional()
  @IsUrl()
  featuredImageUrl?: string;

  @ApiPropertyOptional({
    description: 'Scheduled publishing date in ISO8601 format',
    example: '2026-10-25T12:00:00Z',
  })
  @IsISO8601()
  @IsOptional()
  publishOn?: Date;

  @ApiPropertyOptional({
    description: 'List of Tag MongoDB ObjectIds',
    example: ['6674a2b9f939e60012a9bc41'],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}