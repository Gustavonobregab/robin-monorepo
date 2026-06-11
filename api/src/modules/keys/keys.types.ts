import type { ObjectId } from 'mongoose';

export interface ApiKey {
  _id: ObjectId;
  userId: string; // Better Auth ID
  keyHash: string; // sha256 of the full key; the raw key is never stored
  keyPrefix: string; // "sk_live_a1b2", for display in the dashboard
  name: string; // "Production", "Development"
  status: 'active' | 'revoked';
  revokedAt?: Date;
  createdAt: Date;
  lastUsedAt?: Date;
}

export type ApiKeyView = Omit<ApiKey, 'keyHash'>;
