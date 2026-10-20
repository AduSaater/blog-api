import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ActiveUser } from 'src/auth/decorators/active-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UploadsService } from 'src/uploads/uploads.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { UserRole } from './enums/user-role.enum';
import { UsersService } from './providers/users.service';

@Controller('users')
@ApiTags('Users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Fetches a paginated list of registered users (Admin only)',
    description:
      'Restricted to administrative users. Requires a valid JWT token with ADMIN role.',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    description: 'Number of users to return per page',
    required: false,
    example: 10,
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    description: 'Page index number (1-based)',
    required: false,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Users fetched successfully with pagination metadata',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid Bearer token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have the ADMIN role',
  })
  public getUsers(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.usersService.findAll(limit, page);
  }

  @Get('profile/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile (authenticated)',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile data of currently logged in user',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  public getMyProfile(@ActiveUser('sub') userId: string) {
    return this.usersService.findOneByIdOrThrow(userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update user profile with optional Cloudinary avatar upload',
    description:
      'Allows updating first name, last name, bio, and uploading a new avatar image to Cloudinary.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
        bio: {
          type: 'string',
          example: 'Passionate software engineer and tech blogger.',
        },
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Profile avatar image file (JPG, PNG, WebP up to 5MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or unsupported image format.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  public async updateProfile(
    @ActiveUser('sub') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() avatarFile?: Express.Multer.File,
  ) {
    const user = await this.usersService.findOneByIdOrThrow(userId);

    let avatar = user.avatar;
    let avatarPublicId = user.avatarPublicId;

    if (avatarFile) {
      // If user already had an existing Cloudinary avatar, remove it first
      if (avatarPublicId) {
        await this.uploadsService.deleteImage(avatarPublicId);
      }

      // Upload new image to Cloudinary
      const uploadResult = await this.uploadsService.uploadImage(
        avatarFile,
        'blog-app/avatars',
      );
      avatar = uploadResult.url;
      avatarPublicId = uploadResult.publicId;
    }

    const updatedUser = await this.usersService.updateUser(userId, {
      ...updateProfileDto,
      avatar,
      avatarPublicId,
    });

    return {
      message: 'Profile updated successfully.',
      user: updatedUser,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Find a single user by MongoDB ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'User MongoDB ObjectId',
  })
  @ApiResponse({
    status: 200,
    description: 'User details found',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  public getOneUser(@Param('id') id: string) {
    return this.usersService.findOneByIdOrThrow(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Internal user creation',
  })
  public createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }
}
