import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from './enums/user-role.enum';
import { OtpPurpose } from 'src/auth/enums/otp-purpose.enum';

@Schema({
  timestamps: true,
  toJSON: {
    transform: (doc, ret: Record<string, any>) => {
      delete ret.password;
      delete ret.otp;
      delete ret.refreshToken;
      return ret;
    },
  },
})
export class User extends Document {
  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  firstName: string;

  @Prop({
    type: String,
    required: false,
    trim: true,
  })
  lastName?: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  })
  email: string;

  @Prop({
    type: String,
    required: true,
  })
  password: string;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Prop({
    type: Boolean,
    default: false,
  })
  isVerified: boolean;

  @Prop({
    type: String,
    required: false,
  })
  otp?: string;

  @Prop({
    type: Date,
    required: false,
  })
  otpExpires?: Date;

  @Prop({
    type: String,
    enum: OtpPurpose,
    required: false,
  })
  otpPurpose?: OtpPurpose;

  @Prop({
    type: Date,
    required: false,
  })
  lastOtpSentAt?: Date;

  @Prop({
    type: String,
    required: false,
  })
  refreshToken?: string;

  @Prop({
    type: String,
    required: false,
  })
  avatar?: string;

  @Prop({
    type: String,
    required: false,
  })
  avatarPublicId?: string;

  @Prop({
    type: String,
    required: false,
    trim: true,
  })
  bio?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
