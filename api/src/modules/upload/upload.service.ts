import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3, S3_BUCKET } from '../../config/storage';
import { UploadModel } from './upload.model';
import { ApiError } from '../../utils/api-error';
import {
  validateMagicBytes,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  type UploadResponse,
} from './upload.types';
import { addHours } from 'date-fns';
import { UserModel } from '../users/users.model';
import { PlanModel } from '../plans/plans.model';

const MIME_MAP: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  pdf: 'application/pdf',
  txt: 'text/plain',
};

export class UploadService {
  async uploadAudio(userId: string, file: File): Promise<UploadResponse> {
    return this.uploadFile(userId, file);
  }

  async uploadFile(userId: string, file: File): Promise<UploadResponse> {

    if (!file) {
      throw new ApiError('MISSING_FILE', 'File is required', 400);
    }

    // Use plan-based file size limit, fallback to global MAX_FILE_SIZE
    let maxSize = MAX_FILE_SIZE;
    const user = await UserModel.findOne({
      $or: [{ oderId: userId }, { _id: userId }],
    }).lean();

    if (user?.plan) {
      const plan = await PlanModel.findById(user.plan).lean();
      if (plan) {
        maxSize = plan.features.maxFileSize;
      }
    }

    if (file.size > maxSize) {
      throw new ApiError('FILE_TOO_LARGE', `File exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit on your plan`, 413);
    }

    const ext = this.getExtension(file.name);

    if (!ALLOWED_EXTENSIONS.includes(ext as any)) {
      throw new ApiError('INVALID_FORMAT', `Only ${ALLOWED_EXTENSIONS.join(', ')} files are accepted`, 422);
    }

    const buffer = new Uint8Array(await file.arrayBuffer());

    let format: string;

    if (ext === '.txt') {
      format = 'txt';
    } else {
      const detectedFormat = validateMagicBytes(buffer);

      if (!detectedFormat) {
        throw new ApiError('INVALID_FORMAT', 'File content does not match a valid format', 422);
      }

      format = detectedFormat;
    }

    const { ulid } = await import('ulidx');

    const uploadId = ulid();

    const s3Key = `uploads/${userId}/${uploadId}.${format}`;

    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: MIME_MAP[format],
    }));

    const expiresAt = addHours(new Date(), 24);
    
    const doc = await UploadModel.create({
      userId,
      originalName: file.name,
      mimeType: MIME_MAP[format],
      size: file.size,
      s3Key,
      status: 'ready',
      expiresAt,
    });

    return {
      id: doc._id.toString(),
      originalName: doc.originalName,
      size: doc.size,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async getUpload(uploadId: string, userId: string) {
    if (!uploadId.match(/^[a-f0-9]{24}$/)) {
      throw new ApiError('UPLOAD_NOT_FOUND', 'Upload not found', 404);
    }

    const doc = await UploadModel.findById(uploadId);

    if (!doc || doc.userId !== userId) {
      throw new ApiError('UPLOAD_NOT_FOUND', 'Upload not found', 404);
    }

    if (doc.status !== 'ready') {
      throw new ApiError('UPLOAD_NOT_FOUND', 'Upload not found', 404);
    }

    if (doc.expiresAt < new Date()) {
      throw new ApiError('UPLOAD_EXPIRED', 'Upload has expired', 410);
    }

    return doc;
  }

  private getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : '';
  }
}

export const uploadService = new UploadService();
