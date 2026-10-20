import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateTagDto } from './dtos/create-tags.dto';
import { GetTagsQueryDto } from './dtos/get-tags-query.dto';
import { UpdateTagDto } from './dtos/update-tag.dto';
import { TagsService } from './providers/tags.service';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get paginated list of blog tags with optional search',
  })
  @ApiResponse({
    status: 200,
    description: 'List of tags returned with pagination metadata.',
  })
  public getTags(@Query() query: GetTagsQueryDto) {
    return this.tagsService.findAll(query);
  }

  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Find a tag by its unique URL slug',
  })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'Tag URL slug (e.g. "nestjs")',
  })
  @ApiResponse({
    status: 200,
    description: 'Tag found successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Tag not found.',
  })
  public getTagBySlug(@Param('slug') slug: string) {
    return this.tagsService.findBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Find a tag by its MongoDB ObjectId',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Tag MongoDB ObjectId',
  })
  @ApiResponse({
    status: 200,
    description: 'Tag found successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Tag not found.',
  })
  public getTagById(@Param('id') id: string) {
    return this.tagsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new blog tag (authenticated)',
  })
  @ApiResponse({
    status: 201,
    description: 'Tag created successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid tag input.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: 409,
    description: 'Tag with name or slug already exists.',
  })
  public createTag(@Body() createTagDto: CreateTagDto) {
    return this.tagsService.createTag(createTagDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update an existing blog tag (authenticated)',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Tag MongoDB ObjectId',
  })
  @ApiResponse({
    status: 200,
    description: 'Tag updated successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: 404,
    description: 'Tag not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict with another tag name or slug.',
  })
  public updateTag(
    @Param('id') id: string,
    @Body() updateTagDto: UpdateTagDto,
  ) {
    return this.tagsService.updateTag(id, updateTagDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a blog tag (authenticated)',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Tag MongoDB ObjectId',
  })
  @ApiResponse({
    status: 200,
    description: 'Tag deleted successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  @ApiResponse({
    status: 404,
    description: 'Tag not found.',
  })
  public deleteTag(@Param('id') id: string) {
    return this.tagsService.deleteTag(id);
  }
}