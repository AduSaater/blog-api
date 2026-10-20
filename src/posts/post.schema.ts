import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Tag } from 'src/tags/tag.schema';
import { User } from 'src/users/user.schema';
import { postStatus } from './enums/post-status.enum';
import { PostType } from './enums/post-type.enum';

@Schema({ timestamps: true })
export class Post extends Document {
  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  title: string;

  @Prop({
    type: String,
    required: true,
    enum: PostType,
    default: PostType.POST,
  })
  postType: PostType;

  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  })
  slug: string;

  @Prop({
    type: String,
    required: true,
    enum: postStatus,
    default: postStatus.DRAFT,
  })
  status: postStatus;

  @Prop({
    type: String,
    required: false,
  })
  content?: string;

  @Prop({
    type: String,
    required: false,
  })
  featuredImageUrl?: string;

  @Prop({
    type: String,
    required: false,
  })
  featuredImagePublicId?: string;

  @Prop({
    type: Date,
    required: false,
  })
  publishOn?: Date;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  author: User;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: Tag.name }],
    default: [],
  })
  tags?: Tag[];
}

export const PostSchema = SchemaFactory.createForClass(Post);