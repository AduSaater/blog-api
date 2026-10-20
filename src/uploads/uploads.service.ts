import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  UploadApiErrorResponse,
  UploadApiResponse,
  v2 as cloudinary,
} from 'cloudinary';
import { Readable } from 'stream';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Upload an image buffer to Cloudinary
   */
  public async uploadImage(
    file: Express.Multer.File,
    folder: string = 'blog-app/avatars',
  ): Promise<CloudinaryUploadResult> {
    if (!file) {
      throw new BadRequestException('No image file provided for upload.');
    }

    // Validate MIME types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type (${file.mimetype}). Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }

    // Enforce 5MB limit
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('Image size exceeds 5MB limit.');
    }

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');

    // Development fallback if Cloudinary is not configured yet
    if (!cloudName || !apiKey) {
      this.logger.warn(
        'Cloudinary credentials are not configured in .env. Returning a simulated image URL for development.',
      );
      return {
        url: `https://res.cloudinary.com/demo/image/upload/sample.jpg`,
        publicId: `mock_${Date.now()}_${file.originalname}`,
      };
    }

    return new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error) {
            this.logger.error('Cloudinary upload error:', error.message);
            return reject(
              new BadRequestException(`Image upload failed: ${error.message}`),
            );
          }
          if (!result) {
            return reject(
              new BadRequestException('Image upload failed: Empty result'),
            );
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      const readableStream = Readable.from(file.buffer);
      readableStream.pipe(uploadStream);
    });
  }

  /**
   * Delete an image from Cloudinary by its publicId
   */
  public async deleteImage(publicId?: string): Promise<boolean> {
    if (!publicId || publicId.startsWith('mock_')) {
      return true;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      this.logger.warn(`Failed to delete Cloudinary asset (${publicId}): ${error.message}`);
      return false;
    }
  }
}
