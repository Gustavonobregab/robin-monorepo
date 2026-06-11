import { Schema, model, Model } from 'mongoose';
import type { ApiKey } from './keys.types';

const apiKeySchema = new Schema<ApiKey>({
  userId: { type: String, required: true },
  keyHash: { type: String, required: true },
  keyPrefix: { type: String, required: true },
  name: { type: String, required: true },
  status: { type: String, enum: ['active', 'revoked'], default: 'active' },
  revokedAt: Date,
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: Date,
});

apiKeySchema.index({ keyHash: 1 }, { unique: true });
apiKeySchema.index({ userId: 1 });

export const ApiKeyModel: Model<ApiKey> = model<ApiKey>('ApiKey', apiKeySchema);
