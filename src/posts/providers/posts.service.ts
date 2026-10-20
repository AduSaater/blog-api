import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { UploadsService } from 'src/uploads/uploads.service';
import { UserRole } from 'src/users/enums/user-role.enum';
import { UsersService } from 'src/users/providers/users.service';
import { CreatePostDto } from '../dtos/create-post.dto';
import { GetPostsQueryDto } from '../dtos/get-posts-query.dto';
import { PatchPostDto } from '../dtos/patch-post.dto';
import { postStatus } from '../enums/post-status.enum';
import { Post } from '../post.schema';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name)
    private readonly postModel: Model<Post>,
    private readonly usersService: UsersService,
    private readonly uploadsService: UploadsService,
  ) {}

  /**
   * Helper: Generate URL-safe slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Create a new post with optional Cloudinary featured image upload
   */
  public async createPost(
    authorId: string,
    createPostDto: CreatePostDto,
    featuredImageFile?: Express.Multer.File,
  ) {
    const author = await this.usersService.findOneByIdOrThrow(authorId);

    // Slug generation and uniqueness check
    let slug = createPostDto.slug
      ? this.generateSlug(createPostDto.slug)
      : this.generateSlug(createPostDto.title);

    const existingSlug = await this.postModel.findOne({ slug });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    let featuredImageUrl = createPostDto.featuredImageUrl;
    let featuredImagePublicId: string | undefined;

    // Handle Cloudinary image upload
    if (featuredImageFile) {
      const uploadResult = await this.uploadsService.uploadImage(
        featuredImageFile,
        'blog-app/posts',
      );
      featuredImageUrl = uploadResult.url;
      featuredImagePublicId = uploadResult.publicId;
    }

    const newPost = new this.postModel({
      ...createPostDto,
      slug,
      featuredImageUrl,
      featuredImagePublicId,
      author: author._id,
    });

    const savedPost = await newPost.save();

    return await this.postModel
      .findById(savedPost._id)
      .populate('author', 'firstName lastName email avatar')
      .populate('tags')
      .exec();
  }

  /**
   * Find paginated list of posts with filtering
   */
  public async findAll(query: GetPostsQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<Post> = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.postType) {
      filter.postType = query.postType;
    }

    if (query.author) {
      filter.author = query.author;
    }

    if (query.tag) {
      filter.tags = query.tag;
    }

    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { content: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [posts, totalCount] = await Promise.all([
      this.postModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('author', 'firstName lastName email avatar')
        .populate('tags')
        .exec(),
      this.postModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: posts,
      meta: {
        totalItems: totalCount,
        itemCount: posts.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  /**
   * Find a single post by MongoDB ID
   */
  public async findOneById(id: string) {
    const post = await this.postModel
      .findById(id)
      .populate('author', 'firstName lastName email avatar bio')
      .populate('tags')
      .exec();

    if (!post) {
      throw new NotFoundException(`Post with ID "${id}" was not found.`);
    }

    return post;
  }

  /**
   * Find a single post by its unique slug
   */
  public async findOneBySlug(slug: string) {
    const post = await this.postModel
      .findOne({ slug })
      .populate('author', 'firstName lastName email avatar bio')
      .populate('tags')
      .exec();

    if (!post) {
      throw new NotFoundException(`Post with slug "${slug}" was not found.`);
    }

    return post;
  }

  /**
   * Update an existing blog post with authorization check and image replacement
   */
  public async updatePost(
    postId: string,
    userId: string,
    userRole: UserRole,
    patchPostDto: PatchPostDto,
    featuredImageFile?: Express.Multer.File,
  ) {
    const post = await this.findOneById(postId);

    // Authorization check: Only author or ADMIN can update
    const isAuthor =
      (post.author as any)._id?.toString() === userId ||
      (post.author as any).toString() === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException(
        'You are not authorized to modify this post.',
      );
    }

    let featuredImageUrl = post.featuredImageUrl;
    let featuredImagePublicId = post.featuredImagePublicId;

    if (featuredImageFile) {
      // Clean up previous image from Cloudinary
      if (featuredImagePublicId) {
        await this.uploadsService.deleteImage(featuredImagePublicId);
      }

      const uploadResult = await this.uploadsService.uploadImage(
        featuredImageFile,
        'blog-app/posts',
      );
      featuredImageUrl = uploadResult.url;
      featuredImagePublicId = uploadResult.publicId;
    } else if (patchPostDto.featuredImageUrl) {
      featuredImageUrl = patchPostDto.featuredImageUrl;
    }

    let slug = post.slug;
    if (patchPostDto.slug && patchPostDto.slug !== post.slug) {
      slug = this.generateSlug(patchPostDto.slug);
      const existingSlug = await this.postModel.findOne({
        slug,
        _id: { $ne: postId },
      });
      if (existingSlug) {
        throw new BadRequestException('A post with this slug already exists.');
      }
    }

    const updatedPost = await this.postModel
      .findByIdAndUpdate(
        postId,
        {
          ...patchPostDto,
          slug,
          featuredImageUrl,
          featuredImagePublicId,
        },
        { new: true },
      )
      .populate('author', 'firstName lastName email avatar')
      .populate('tags')
      .exec();

    return {
      message: 'Post updated successfully.',
      post: updatedPost,
    };
  }

  /**
   * Delete a blog post with authorization check and Cloudinary cleanup
   */
  public async deletePost(
    postId: string,
    userId: string,
    userRole: UserRole,
  ) {
    const post = await this.findOneById(postId);

    const isAuthor =
      (post.author as any)._id?.toString() === userId ||
      (post.author as any).toString() === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException(
        'You are not authorized to delete this post.',
      );
    }

    // Clean up Cloudinary asset if present
    if (post.featuredImagePublicId) {
      await this.uploadsService.deleteImage(post.featuredImagePublicId);
    }

    await this.postModel.findByIdAndDelete(postId);

    return {
      message: 'Post deleted successfully.',
      postId,
    };
  }
}
