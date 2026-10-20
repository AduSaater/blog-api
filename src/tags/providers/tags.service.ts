import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { CreateTagDto } from '../dtos/create-tags.dto';
import { GetTagsQueryDto } from '../dtos/get-tags-query.dto';
import { UpdateTagDto } from '../dtos/update-tag.dto';
import { Tag } from '../tag.schema';

@Injectable()
export class TagsService {
  constructor(
    @InjectModel(Tag.name)
    private readonly tagsModel: Model<Tag>,
  ) {}

  /**
   * Helper: Generate URL-friendly slug from string
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Create a new tag with duplicate detection and slug auto-generation
   */
  public async createTag(createTagDto: CreateTagDto): Promise<Tag> {
    const slug = createTagDto.slug
      ? this.generateSlug(createTagDto.slug)
      : this.generateSlug(createTagDto.name);

    // Check for duplicate name or slug
    const existing = await this.tagsModel.findOne({
      $or: [
        { name: { $regex: `^${createTagDto.name.trim()}$`, $options: 'i' } },
        { slug },
      ],
    });

    if (existing) {
      throw new ConflictException(
        `A tag with the name "${createTagDto.name}" or slug "${slug}" already exists.`,
      );
    }

    const newTag = new this.tagsModel({
      name: createTagDto.name.trim(),
      slug,
      description: createTagDto.description?.trim(),
    });

    return await newTag.save();
  }

  /**
   * Get paginated tags with search capabilities
   */
  public async findAll(query: GetTagsQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<Tag> = {};

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { slug: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [tags, totalCount] = await Promise.all([
      this.tagsModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ name: 1 })
        .exec(),
      this.tagsModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: tags,
      meta: {
        totalItems: totalCount,
        itemCount: tags.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  /**
   * Find tag by MongoDB ObjectId
   */
  public async findById(id: string): Promise<Tag> {
    const tag = await this.tagsModel.findById(id).exec();
    if (!tag) {
      throw new NotFoundException(`Tag with ID "${id}" was not found.`);
    }
    return tag;
  }

  /**
   * Find tag by unique URL slug
   */
  public async findBySlug(slug: string): Promise<Tag> {
    const tag = await this.tagsModel.findOne({ slug: slug.toLowerCase() }).exec();
    if (!tag) {
      throw new NotFoundException(`Tag with slug "${slug}" was not found.`);
    }
    return tag;
  }

  /**
   * Update an existing tag
   */
  public async updateTag(id: string, updateTagDto: UpdateTagDto): Promise<Tag> {
    const tag = await this.findById(id);

    const updatePayload: Partial<Tag> = {};

    if (updateTagDto.name) {
      updatePayload.name = updateTagDto.name.trim();
    }

    if (updateTagDto.description !== undefined) {
      updatePayload.description = updateTagDto.description.trim();
    }

    if (updateTagDto.slug || updateTagDto.name) {
      const slug = updateTagDto.slug
        ? this.generateSlug(updateTagDto.slug)
        : updateTagDto.name
        ? this.generateSlug(updateTagDto.name)
        : tag.slug;

      // Ensure no collision with another tag
      const existing = await this.tagsModel.findOne({
        _id: { $ne: id },
        $or: [
          ...(updateTagDto.name
            ? [{ name: { $regex: `^${updateTagDto.name.trim()}$`, $options: 'i' } }]
            : []),
          { slug },
        ],
      });

      if (existing) {
        throw new ConflictException(
          'Another tag with that name or slug already exists.',
        );
      }

      updatePayload.slug = slug;
    }

    const updated = await this.tagsModel.findByIdAndUpdate(id, updatePayload, {
      new: true,
    });

    if (!updated) {
      throw new NotFoundException(`Tag with ID "${id}" was not found.`);
    }

    return updated;
  }

  /**
   * Delete a tag
   */
  public async deleteTag(id: string) {
    const tag = await this.findById(id);
    await this.tagsModel.findByIdAndDelete(id);

    return {
      message: `Tag "${tag.name}" deleted successfully.`,
      id,
    };
  }
}