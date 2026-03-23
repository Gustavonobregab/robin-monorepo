import { Schema, model, type Model } from 'mongoose';
import type { User } from './users.types';

const userSchema = new Schema<User>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  emailVerified: { type: Boolean, default: false },
  image: { type: String },
  oderId: { type: String, unique: true, sparse: true },
  webhookUrl: { type: String },
  plan: { type: Schema.Types.ObjectId, ref: 'Plan' },            // reference to active plan
  subscription: {
    status: {                                                      // subscription state
      type: String,
      enum: ['active', 'canceled'],
      default: 'active',
    },
    credits: {
      limit: { type: Number, default: 0 },                        // credits for this cycle
      used: { type: Number, default: 0 },                         // credits consumed this cycle
    },
    currentPeriodStart: { type: Date },                            // billing cycle start
    currentPeriodEnd: { type: Date },                              // billing cycle end
    canceledAt: { type: Date },                                    // when user canceled
    planChangedAt: { type: Date },                                 // last plan change
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const UserModel: Model<User> = model<User>('User', userSchema);
