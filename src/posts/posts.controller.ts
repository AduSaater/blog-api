import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ActiveUser } from 'src/auth/decorators/active-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ActiveUserData } from 'src/auth/interfaces/active-user-data.interface';
import { CreatePostDto } from './dtos/create-post.dto';
import { GetPostsQueryDto } from './dtos/get-posts-query.dto';
import { PatchPostDto } from './dtos/patch-post.dto';
import { PostsService } from './providers/posts.service';

@Controller('posts')
@ApiTags('Posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get paginated list of blog posts with filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Posts retrieved successfully with pagination metadata',
  })
  public getPosts(@Query() query: GetPostsQueryDto) {
    return this.postsService.findAll(query);
  }

  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Find a single post by unique slug',
  })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'Post slug (e.g. "my-first-post")',
  })
  @ApiResponse({
    status: 200,
    description: 'Post found successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  public getPostBySlug(@Param('slug') slug: string) {
    return this.postsService.findOneBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Find a single post by MongoDB ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'MongoDB ObjectId of the post',
  })
  @ApiResponse({
    status: 200,
    description: 'Post found successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  public getPostById(@Param('id') id: string) {
    return this.postsService.findOneById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('featuredImage'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a new blog post with optional Cloudinary image upload',
    description:
      'Creates a new post. Author is automatically set to the authenticated user. Supports file upload for featuredImage.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: {
          type: 'string',
          example: 'Building Scalable APIs with NestJS',
        },
        postType: {
          type: 'string',
          enum: ['post', 'page', 'story', 'series'],
          example: 'post',
        },
        slug: {
          type: 'string',
          example: 'building-scalable-apis-with-nestjs',
        },
        status: {
          type: 'string',
          enum: ['draft', 'scheduled', 'review', 'published'],
          example: 'published',
        },
        content: {
          type: 'string',
          example: 'Complete guide to building production-ready REST APIs...',
        },
        publishOn: {
          type: 'string',
          format: 'date-time',
          example: '2026-10-25T12:00:00Z',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          example: [],
        },
        featuredImage: {
          type: 'string',
          format: 'binary',
          description: 'Featured cover image for the blog post (PNG, JPG, WebP)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Post created successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  public createPost(
    @ActiveUser('sub') authorId: string,
    @Body() createPostDto: CreatePostDto,
    @UploadedFile() featuredImageFile?: Express.Multer.File,
  ) {
    return this.postsService.createPost(
      authorId,
      createPostDto,
      featuredImageFile,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('featuredImage'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update an existing blog post (Author or Admin only)',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Post MongoDB ObjectId',
  })
  @ApiResponse({
    status: 200,
    description: 'Post updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: not author or admin',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  public updatePost(
    @Param('id') postId: string,
    @ActiveUser() user: ActiveUserData,
    @Body() patchPostDto: PatchPostDto,
    @UploadedFile() featuredImageFile?: Express.Multer.File,
  ) {
    return this.postsService.updatePost(
      postId,
      user.sub,
      user.role,
      patchPostDto,
      featuredImageFile,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a blog post (Author or Admin only)',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Post MongoDB ObjectId',
  })
  @ApiResponse({
    status: 200,
    description: 'Post deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: not author or admin',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  public deletePost(
    @Param('id') postId: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.postsService.deletePost(postId, user.sub, user.role);
  }
}
