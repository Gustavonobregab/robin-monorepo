import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { addHours } from 'date-fns';
import { ulid } from 'ulidx';
import type { HydratedDocument } from 'mongoose';
import { s3, S3_BUCKET } from '../../config/storage';
import { UploadModel } from './upload.model';
import { ApiError } from '../../utils/api-error';
import {
  validateMagicBytes,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  type CreateUploadResponse,
  type UploadDocument,
} from './upload.types';
import { UserModel } from '../users/users.model';
import { PlanModel } from '../plans/plans.model';

const MIME_MAP: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
};

const UPLOAD_URL_TTL = 15 * 60; // seconds
const UPLOAD_RETENTION_HOURS = 24;

export class UploadService {
  async createUpload(
    userId: string,
    input: { filename: string; size: number },
  ): Promise<CreateUploadResponse> {
    const ext = this.getExtension(input.filename);

    if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
      throw new ApiError('INVALID_FORMAT', `Only ${ALLOWED_EXTENSIONS.join(', ')} files are accepted`, 422);
    }

    const maxSize = await this.getMaxFileSize(userId);

    if (input.size > maxSize) {
      throw new ApiError('FILE_TOO_LARGE', `File exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit on your plan`, 413);
    }

    const s3Key = `uploads/${userId}/${ulid()}${ext}`;
    const mimeType = MIME_MAP[ext];

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: S3_BUCKET, Key: s3Key, ContentType: mimeType }),
      { expiresIn: UPLOAD_URL_TTL },
    );

    const expiresAt = addHours(new Date(), UPLOAD_RETENTION_HOURS);

    const doc = await UploadModel.create({
      userId,
      originalName: input.filename,
      mimeType,
      size: input.size,
      s3Key,
      status: 'pending',
      expiresAt,
    });

    return {
      id: doc._id.toString(),
      uploadUrl,
      contentType: mimeType,
      uploadUrlExpiresIn: UPLOAD_URL_TTL,
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

    if (doc.expiresAt < new Date()) {
      throw new ApiError('UPLOAD_EXPIRED', 'Upload has expired', 410);
    }

    await this.finalizeUpload(doc);

    return doc;
  }

  // Every consumption, not just the first: the presigned PUT stays valid and the object can be swapped
  private async finalizeUpload(doc: HydratedDocument<UploadDocument>) {
    let contentLength: number;

    try {
      const head = await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: doc.s3Key }));
      contentLength = head.ContentLength ?? 0;
    } catch {
      throw new ApiError('UPLOAD_NOT_COMPLETED', 'File was not uploaded to the provided URL', 409);
    }

    const maxSize = await this.getMaxFileSize(doc.userId);

    if (contentLength > maxSize) {
      throw new ApiError('FILE_TOO_LARGE', `File exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit on your plan`, 413);
    }

    if (doc.mimeType !== 'text/plain') {
      const range = await s3.send(
        new GetObjectCommand({ Bucket: S3_BUCKET, Key: doc.s3Key, Range: 'bytes=0-11' }),
      );
      const headerBytes = await range.Body!.transformToByteArray();
      const detected = validateMagicBytes(headerBytes);

      // Must match the declared type, or a PDF named .mp3 reaches the audio pipeline
      if (!detected || MIME_MAP[`.${detected}`] !== doc.mimeType) {
        throw new ApiError('INVALID_FORMAT', 'File content does not match the declared format', 422);
      }
    }

    doc.size = contentLength;
    doc.status = 'ready';
    await doc.save();
  }

  private async getMaxFileSize(userId: string): Promise<number> {
    const user = await UserModel.findOne({
      $or: [{ oderId: userId }, { _id: userId }],
    }).lean();

    if (user?.plan) {
      const plan = await PlanModel.findById(user.plan).lean();
      if (plan) return plan.features.maxFileSize;
    }

    return MAX_FILE_SIZE;
  }

  private getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : '';
  }
}

export const uploadService = new UploadService();
