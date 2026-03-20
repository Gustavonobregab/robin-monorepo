import { Schema, model } from 'mongoose';

const uploadSchema = new Schema(
  {
    userId: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true, enum: ['audio/mpeg', 'audio/wav', 'application/pdf', 'text/plain'] },
    size: { type: Number, required: true },
    s3Key: { type: String, required: true },
    status: { type: String, enum: ['ready'], default: 'ready' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

uploadSchema.index({ userId: 1, createdAt: -1 });
uploadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const UploadModel = model('Upload', uploadSchema);
