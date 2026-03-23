# Billing & Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a tier-based billing system with credit-based usage metering, free tier auto-assignment, and plan-gated feature enforcement.

**Architecture:** Plans are stored in MongoDB as a separate collection. Subscription data (credits, cycle dates, status) lives embedded on the User document. A credit enforcement middleware reserves credits atomically before job enqueueing, with rollback in workers on failure. Lazy cycle renewal happens on each request.

**Tech Stack:** Bun, Elysia, MongoDB (Mongoose), BullMQ, better-auth

**Spec:** `docs/superpowers/specs/2026-03-22-billing-plans-design.md`

---

### Task 1: Plans module — types, model, service

**Files:**
- Create: `api/src/modules/plans/plans.types.ts`
- Create: `api/src/modules/plans/plans.model.ts`
- Create: `api/src/modules/plans/plans.service.ts`

- [ ] **Step 1: Create plans types**

Create `api/src/modules/plans/plans.types.ts`:

```typescript
import type { ObjectId } from 'mongoose';

export interface CreditWeights {
  text: number;    // credits consumed per text processing request
  image: number;   // credits consumed per image processing request
  audio: number;   // credits consumed per audio processing request
  video: number;   // credits consumed per video processing request
}

export interface PlanFeatures {
  maxFileSize: number;   // maximum upload file size in bytes
  maxApiKeys: number;    // maximum number of active API keys allowed
  webhooks: boolean;     // whether the plan includes webhook access
}

export interface Plan {
  _id?: ObjectId;
  name: string;            // display name, e.g. "Free", "Pro"
  slug: string;            // unique identifier used in code and URLs
  description?: string;    // optional plan description for UI display
  credits: number;         // total credits granted per billing cycle
  creditWeights: CreditWeights;
  features: PlanFeatures;
  isPublic: boolean;       // true = visible on pricing page
  isDefault: boolean;      // true = assigned to new users on signup
  active: boolean;         // false = soft-deleted, no longer assignable
  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionStatus = 'active' | 'canceled';

export interface Subscription {
  status: SubscriptionStatus;         // subscription state
  credits: {
    limit: number;                    // total credits for this cycle, snapshotted from plan
    used: number;                     // credits consumed in the current billing cycle
  };
  currentPeriodStart: Date;           // when the current billing cycle started
  currentPeriodEnd: Date;             // when the current billing cycle ends
  canceledAt?: Date;                  // timestamp when the user canceled
  planChangedAt?: Date;               // timestamp of last plan change
}
```

- [ ] **Step 2: Create plans model**

Create `api/src/modules/plans/plans.model.ts`:

```typescript
import { Schema, model, type Model } from 'mongoose';
import type { Plan } from './plans.types';

const planSchema = new Schema<Plan>(
  {
    name: { type: String, required: true },             // display name, e.g. "Free", "Pro"
    slug: { type: String, required: true, unique: true }, // unique identifier for code and URLs
    description: { type: String },                       // optional description for UI
    credits: { type: Number, required: true },           // credits granted per billing cycle
    creditWeights: {
      text: { type: Number, required: true },            // credits per text request
      image: { type: Number, required: true },           // credits per image request
      audio: { type: Number, required: true },           // credits per audio request
      video: { type: Number, required: true },           // credits per video request
    },
    features: {
      maxFileSize: { type: Number, required: true },     // max upload size in bytes
      maxApiKeys: { type: Number, required: true },      // max active API keys
      webhooks: { type: Boolean, required: true },       // webhook access enabled
    },
    isPublic: { type: Boolean, default: true },          // visible on pricing page
    isDefault: { type: Boolean, default: false },        // auto-assigned to new users
    active: { type: Boolean, default: true },            // soft-delete flag
  },
  { timestamps: true }
);

export const PlanModel: Model<Plan> = model<Plan>('Plan', planSchema);
```

- [ ] **Step 3: Create plans service**

Create `api/src/modules/plans/plans.service.ts`:

```typescript
import { PlanModel } from './plans.model';
import { ApiError } from '../../utils/api-error';
import type { Plan } from './plans.types';

export class PlansService {
  async getPublicPlans() {
    return PlanModel.find({ isPublic: true, active: true })
      .sort({ credits: 1 })
      .lean();
  }

  async getPlanBySlug(slug: string) {
    const plan = await PlanModel.findOne({ slug, active: true }).lean();
    if (!plan) {
      throw new ApiError('PLAN_NOT_FOUND', 'Plan not found', 404);
    }
    return plan;
  }

  async getDefaultPlan() {
    const plan = await PlanModel.findOne({ isDefault: true, active: true }).lean();
    if (!plan) {
      throw new ApiError('DEFAULT_PLAN_NOT_FOUND', 'No default plan configured', 500);
    }
    return plan;
  }

  async getPlanById(planId: string) {
    const plan = await PlanModel.findById(planId).lean();
    if (!plan) {
      throw new ApiError('PLAN_NOT_FOUND', 'Plan not found', 404);
    }
    return plan;
  }
}

export const plansService = new PlansService();
```

- [ ] **Step 4: Commit**

```bash
git add api/src/modules/plans/plans.types.ts api/src/modules/plans/plans.model.ts api/src/modules/plans/plans.service.ts
git commit -m "feat(billing): add plans module with types, model, and service"
```

---

### Task 2: Plans routes

**Files:**
- Create: `api/src/modules/plans/plans.routes.ts`
- Modify: `api/src/server.ts`

- [ ] **Step 1: Create plans routes**

Create `api/src/modules/plans/plans.routes.ts`:

```typescript
import { Elysia } from 'elysia';
import { plansService } from './plans.service';

export const plansRoutes = new Elysia({ prefix: '/plans' })
  .get('/', async () => {
    const plans = await plansService.getPublicPlans();
    return plans;
  })
  .get('/:slug', async ({ params }) => {
    const plan = await plansService.getPlanBySlug(params.slug);
    return plan;
  });
```

- [ ] **Step 2: Register plans routes in server.ts**

In `api/src/server.ts`, add the import after the existing route imports (after line 15):

```typescript
const { plansRoutes } = await import('./modules/plans/plans.routes');
```

Add `.use(plansRoutes)` in the Elysia chain. The current chain ends with `.use(uploadRoutes)` on line 31. Add `.use(plansRoutes)` between `.use(uploadRoutes)` and `app.listen(3002)`. Note: line 31 (`.use(uploadRoutes)`) ends the chain, so you need to chain `.use(plansRoutes)` before the line break. The result should be:

```typescript
  .use(uploadRoutes)
  .use(plansRoutes)
  app.listen(3002);
```

- [ ] **Step 3: Commit**

```bash
git add api/src/modules/plans/plans.routes.ts api/src/server.ts
git commit -m "feat(billing): add plans routes and register in server"
```

---

### Task 3: Seed script for default plans

**Files:**
- Create: `api/src/scripts/seed-plans.ts`

- [ ] **Step 1: Create scripts directory and seed script**

Create the directory if it doesn't exist:
```bash
mkdir -p api/src/scripts
```

Create `api/src/scripts/seed-plans.ts`:

```typescript
import { connectDatabase } from '../config/database';
import { PlanModel } from '../modules/plans/plans.model';

const MB = 1024 * 1024;

const DEFAULT_PLANS = [
  {
    name: 'Free',
    slug: 'free',
    description: 'Get started with Robin Wood for free',
    credits: 100,
    creditWeights: { text: 1, image: 3, audio: 5, video: 10 },
    features: { maxFileSize: 25 * MB, maxApiKeys: 2, webhooks: false },
    isPublic: true,
    isDefault: true,
    active: true,
  },
  {
    name: 'Pro',
    slug: 'pro',
    description: 'For professionals who need more processing power',
    credits: 1000,
    creditWeights: { text: 1, image: 3, audio: 5, video: 10 },
    features: { maxFileSize: 100 * MB, maxApiKeys: 5, webhooks: true },
    isPublic: true,
    isDefault: false,
    active: true,
  },
];

async function seed() {
  await connectDatabase();

  for (const plan of DEFAULT_PLANS) {
    const existing = await PlanModel.findOne({ slug: plan.slug });
    if (existing) {
      console.log(`Plan "${plan.slug}" already exists, skipping`);
      continue;
    }
    await PlanModel.create(plan);
    console.log(`Created plan "${plan.slug}" (${plan.credits} credits)`);
  }

  console.log('Done seeding plans');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Add seed script to package.json**

In `api/package.json`, add to the `"scripts"` section:

```json
"seed:plans": "bun run src/scripts/seed-plans.ts"
```

- [ ] **Step 3: Run seed to verify**

```bash
cd api && bun run seed:plans
```

Expected: `Created plan "free" (100 credits)` and `Created plan "pro" (1000 credits)`

- [ ] **Step 4: Commit**

```bash
git add api/src/scripts/seed-plans.ts api/package.json
git commit -m "feat(billing): add seed script for default plans"
```

---

### Task 4: Update User model with subscription fields

**Files:**
- Modify: `api/src/modules/users/users.model.ts`
- Modify: `api/src/modules/users/users.types.ts`

- [ ] **Step 1: Update users.types.ts**

Replace the `tokens` field with `plan` and `subscription` in the `User` interface. In `api/src/modules/users/users.types.ts`:

Remove:
```typescript
  tokens: {
    limit: number;
    used: number;
  };
```

Add:
```typescript
  plan?: ObjectId;                     // reference to the active plan document
  subscription?: {
    status: 'active' | 'canceled';     // subscription state
    credits: {
      limit: number;                   // total credits for this cycle, snapshotted from plan
      used: number;                    // credits consumed in current cycle
    };
    currentPeriodStart: Date;          // when the current billing cycle started
    currentPeriodEnd: Date;            // when the current billing cycle ends
    canceledAt?: Date;                 // timestamp when user canceled
    planChangedAt?: Date;              // timestamp of last plan change
  };
```

- [ ] **Step 2: Update users.model.ts**

Replace the `tokens` schema fields with `plan` and `subscription`. In `api/src/modules/users/users.model.ts`:

Remove the import of `DEFAULT_TOKENS_LIMIT` and the `tokens` field. Add:

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add api/src/modules/users/users.model.ts api/src/modules/users/users.types.ts
git commit -m "feat(billing): replace tokens with plan and subscription on user model"
```

---

### Task 5: Free tier auto-assignment on signup

**Files:**
- Modify: `api/src/config/auth.ts`

- [ ] **Step 1: Add user creation hook to better-auth config**

In `api/src/config/auth.ts`, add a `databaseHooks` config that assigns the default plan when a user is created. The hook runs after better-auth inserts the user document.

Add import at the top:
```typescript
import { PlanModel } from '../modules/plans/plans.model';
import { UserModel } from '../modules/users/users.model';
import { addDays } from 'date-fns';
```

Add `databaseHooks` to the `betterAuth()` config object (after the `user` config):

```typescript
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const defaultPlan = await PlanModel.findOne({ isDefault: true, active: true }).lean();
          if (!defaultPlan) {
            console.error('[AUTH] No default plan found for new user');
            return;
          }

          const now = new Date();
          await UserModel.findOneAndUpdate(
            { email: user.email },
            {
              $set: {
                plan: defaultPlan._id,
                subscription: {
                  status: 'active',
                  credits: {
                    limit: defaultPlan.credits,
                    used: 0,
                  },
                  currentPeriodStart: now,
                  currentPeriodEnd: addDays(now, 30),
                },
              },
            }
          );
        },
      },
    },
  },
```

- [ ] **Step 2: Add date-fns dependency if not present**

Check that `date-fns` is already in the API dependencies. It is (v4.1.0), so no action needed.

- [ ] **Step 3: Commit**

```bash
git add api/src/config/auth.ts
git commit -m "feat(billing): auto-assign free tier on user signup via better-auth hook"
```

---

### Task 6: Credit enforcement middleware

**Files:**
- Create: `api/src/middlewares/credits.ts`

- [ ] **Step 1: Create credits middleware**

Create `api/src/middlewares/credits.ts`:

```typescript
import { Elysia } from 'elysia';
import { UserModel } from '../modules/users/users.model';
import { PlanModel } from '../modules/plans/plans.model';
import { ApiError } from '../utils/api-error';
import { addDays } from 'date-fns';
import type { PipelineType } from '../modules/usage/usage.types';

async function renewCycleIfExpired(userId: string) {
  const now = new Date();

  // Atomically try to renew the cycle. The condition on currentPeriodEnd prevents double renewal.
  const renewed = await UserModel.findOneAndUpdate(
    {
      $or: [{ oderId: userId }, { _id: userId }],
      'subscription.currentPeriodEnd': { $lt: now },
      'subscription.status': 'active',
    },
    [
      {
        $set: {
          'subscription.currentPeriodStart': '$subscription.currentPeriodEnd',
          'subscription.currentPeriodEnd': {
            $dateAdd: { startDate: '$subscription.currentPeriodEnd', unit: 'day', amount: 30 },
          },
          'subscription.credits.used': 0,
        },
      },
    ],
    { new: true }
  );

  if (renewed) {
    // Re-snapshot credits.limit from the plan
    const plan = await PlanModel.findById(renewed.plan).lean();
    if (plan) {
      await UserModel.updateOne(
        { _id: renewed._id },
        { $set: { 'subscription.credits.limit': plan.credits } }
      );
    }
  }
}

export async function reserveCredits(userId: string, pipelineType: PipelineType): Promise<number> {
  await renewCycleIfExpired(userId);

  // Get the user's plan to look up credit weight
  const user = await UserModel.findOne({
    $or: [{ oderId: userId }, { _id: userId }],
  }).lean();

  if (!user?.plan) {
    throw new ApiError('NO_PLAN', 'No active plan found. Please contact support.', 403);
  }

  // Check if subscription is canceled and period has ended
  if (user.subscription?.status === 'canceled' && user.subscription.currentPeriodEnd < new Date()) {
    throw new ApiError('SUBSCRIPTION_ENDED', 'Your subscription has ended. Please reactivate your plan.', 403);
  }

  const plan = await PlanModel.findById(user.plan).lean();
  if (!plan) {
    throw new ApiError('PLAN_NOT_FOUND', 'Plan not found', 500);
  }

  const cost = plan.creditWeights[pipelineType];

  // Atomic reservation: only succeeds if user has enough credits
  const result = await UserModel.findOneAndUpdate(
    {
      $or: [{ oderId: userId }, { _id: userId }],
      $expr: {
        $lte: [
          { $add: ['$subscription.credits.used', cost] },
          '$subscription.credits.limit',
        ],
      },
    },
    { $inc: { 'subscription.credits.used': cost } },
    { new: true }
  );

  if (!result) {
    throw new ApiError(
      'INSUFFICIENT_CREDITS',
      'You have reached your credit limit for this billing cycle. Please upgrade your plan.',
      429
    );
  }

  return cost;
}

export async function rollbackCredits(userId: string, cost: number) {
  await UserModel.findOneAndUpdate(
    { $or: [{ oderId: userId }, { _id: userId }] },
    { $inc: { 'subscription.credits.used': -cost } }
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add api/src/middlewares/credits.ts
git commit -m "feat(billing): add credit reservation middleware with atomic ops and rollback"
```

---

### Task 7: Integrate credit enforcement into audio and text services

**Files:**
- Modify: `api/src/modules/audio/audio.service.ts`
- Modify: `api/src/modules/text/text.service.ts`
- Modify: `api/src/modules/jobs/job.types.ts`

Credit reservation happens in the service layer (HTTP context), before the job is enqueued. The `creditCost` is stored on the Job document so the worker can roll back on failure.

- [ ] **Step 1: Add creditCost to job payload types**

In `api/src/modules/jobs/job.types.ts`, add `creditCost?: number` to `AudioJobPayload` and `TextJobPayload`:

In `AudioJobPayload`, add after `name?: string;`:
```typescript
    creditCost?: number;   // credits reserved for this job, used for rollback on failure
```

In `TextJobPayload`, add after `operations: TextOperation[];`:
```typescript
    creditCost?: number;   // credits reserved for this job, used for rollback on failure
```

- [ ] **Step 2: Add creditCost to job model schema**

In `api/src/modules/jobs/job.model.ts`, add to the `payload` object in the schema (after `name: { type: String },`):

```typescript
      creditCost: { type: Number },    // credits reserved, for rollback on failure
```

- [ ] **Step 3: Integrate credit reservation into AudioService**

In `api/src/modules/audio/audio.service.ts`:

Add import at top:
```typescript
import { reserveCredits } from '../../middlewares/credits';
```

In the `processAudio` method, add credit reservation after upload validation and before job creation. Insert after `const operations = this.resolveOperations(preset, customOps);` (line 29):

```typescript
    // Reserve credits before enqueueing
    const creditCost = await reserveCredits(userId, 'audio');
```

Add `creditCost` to the job payload. Change the `jobService.create` call to include it:

```typescript
    const job = await jobService.create({ userId,
     payload:
     { type: 'audio',
       preset,
       operations,
       source: { kind: 'storage', ref: upload.s3Key },
       name: upload.originalName,
       creditCost,
     } });
```

- [ ] **Step 4: Integrate credit reservation into TextService**

In `api/src/modules/text/text.service.ts`:

Add import at top:
```typescript
import { reserveCredits } from '../../middlewares/credits';
```

In `processTextSync`, add credit reservation with try/catch for rollback on failure. Replace the body of `processTextSync` (lines 44-76) with:

```typescript
  async processTextSync(
    userId: string,
    input: ProcessTextInput
  ): Promise<{ output: string; metrics: Record<string, unknown> }> {
    const { preset, operations: customOps, text } = input;

    if (!preset && (!customOps || customOps.length === 0)) {
      throw new ApiError(
        'TEXT_INVALID_INPUT',
        'Either preset or operations must be provided',
        400
      );
    }

    const operations = this.resolveOperations(preset, customOps);

    // Reserve credits before processing
    const creditCost = await reserveCredits(userId, 'text');

    try {
      const inputText = text!;
      const inputSize = Buffer.byteLength(inputText, 'utf8');
      const start = performance.now();
      const output = await processText(inputText, operations);
      const processingMs = Math.round(performance.now() - start);
      const outputSize = Buffer.byteLength(output, 'utf8');

      return {
        output,
        metrics: {
          inputSize,
          outputSize,
          compressionRatio: inputSize > 0 ? +(outputSize / inputSize).toFixed(4) : 0,
          processingMs,
          operationsApplied: operations.map((op) => op.type),
        },
      };
    } catch (err) {
      // Rollback credits on sync processing failure
      await rollbackCredits(userId, creditCost);
      throw err;
    }
  }
```

Also add `rollbackCredits` to the import:
```typescript
import { reserveCredits, rollbackCredits } from '../../middlewares/credits';
```

In `processTextAsync`, add credit reservation and pass `creditCost` to the job payload. Insert after `const operations = this.resolveOperations(preset, customOps);` (line 92):

```typescript
    // Reserve credits before enqueueing
    const creditCost = await reserveCredits(userId, 'text');
```

Update the `jobService.create` call to include `creditCost` in the payload:

```typescript
    const job = await jobService.create({
      userId,
      payload: {
        type: 'text',
        preset,
        operations,
        source,
        creditCost,
      },
    });
```

- [ ] **Step 5: Commit**

```bash
git add api/src/modules/audio/audio.service.ts api/src/modules/text/text.service.ts api/src/modules/jobs/job.types.ts api/src/modules/jobs/job.model.ts
git commit -m "feat(billing): integrate credit reservation into audio and text services"
```

---

### Task 8: Worker credit rollback on failure

**Files:**
- Modify: `api/src/worker/audio.processor.ts`
- Modify: `api/src/worker/text.processor.ts`
- Modify: `api/src/modules/usage/usage.model.ts`
- Modify: `api/src/modules/usage/usage.types.ts`

- [ ] **Step 1: Add creditsConsumed to UsageEvent**

In `api/src/modules/usage/usage.types.ts`, add to the `UsageEvent` interface after `timestamp: Date;`:

```typescript
  creditsConsumed?: number;    // credits consumed for this event, for accurate historical billing
```

In `api/src/modules/usage/usage.types.ts`, add to the `RecordUsageInput` interface after `video?: VideoMetadata;`:

```typescript
  creditsConsumed?: number;
```

In `api/src/modules/usage/usage.model.ts`, add to the schema after `timestamp: { type: Date, default: Date.now, index: true },`:

```typescript
  creditsConsumed: { type: Number },   // credits consumed for this event
```

- [ ] **Step 2: Update usage.service.ts `record()` to persist creditsConsumed**

In `api/src/modules/usage/usage.service.ts`, add `creditsConsumed` to the `UsageEventModel.create()` call inside the `record` method. Add after `video: input.video,` (line 35):

```typescript
      creditsConsumed: input.creditsConsumed,
```

- [ ] **Step 3: Add rollback to audio processor**

In `api/src/worker/audio.processor.ts`:

Add import at top:
```typescript
import { rollbackCredits } from '../middlewares/credits';
```

The `payload` variable is cast at line 31 as `AudioJobPayload`. Since we added `creditCost` to `AudioJobPayload` in Task 7, `payload.creditCost` is now properly typed.

In the `usageService.record()` call (around line 113), add `creditsConsumed` to the record input object:

```typescript
      creditsConsumed: payload.creditCost || 0,
```

In the catch block (around line 131), add credit rollback before the `throw err`:

```typescript
    // Rollback reserved credits on failure
    const creditCost = payload.creditCost;
    if (creditCost) {
      await rollbackCredits(jobDoc.userId, creditCost);
      log(id, `Rolled back ${creditCost} credits`);
    }
```

- [ ] **Step 4: Add rollback to text processor**

In `api/src/worker/text.processor.ts`:

Add import at top:
```typescript
import { rollbackCredits } from '../middlewares/credits';
```

The `payload` variable is cast at line 89 as `TextJobPayload`. Since we added `creditCost` to `TextJobPayload` in Task 7, `payload.creditCost` is now properly typed.

In the `usageService.record()` call (around line 128), add `creditsConsumed` to the record input object:

```typescript
      creditsConsumed: payload.creditCost || 0,
```

In the catch block (around line 144), add credit rollback before the `throw err`:

```typescript
    // Rollback reserved credits on failure
    const creditCost = payload.creditCost;
    if (creditCost) {
      await rollbackCredits(jobDoc.userId, creditCost);
      log(id, `Rolled back ${creditCost} credits`);
    }
```

- [ ] **Step 5: Commit**

```bash
git add api/src/worker/audio.processor.ts api/src/worker/text.processor.ts api/src/modules/usage/usage.model.ts api/src/modules/usage/usage.types.ts
git commit -m "feat(billing): add credit rollback on worker failure and creditsConsumed tracking"
```

---

### Task 9: Update usage service for rolling billing cycle

**Files:**
- Modify: `api/src/modules/usage/usage.service.ts`

- [ ] **Step 1: Update getCurrentUsage to use rolling cycle**

In `api/src/modules/usage/usage.service.ts`, modify the `getCurrentUsage` method to accept cycle dates instead of using calendar months.

Replace the method signature and the date range logic (lines 125-133):

```typescript
  async getCurrentUsage(userId: string, periodStart?: Date, periodEnd?: Date): Promise<CurrentUsage> {
    const now = new Date();
    const start = periodStart || startOfMonth(now);
    const end = periodEnd || endOfMonth(now);

    const events = await UsageEventModel.find({
      userId,
      timestamp: { $gte: start, $lte: end },
    }).lean();
```

Update the `period` in the return value (line 140-141):

```typescript
      period: { start, end },
```

- [ ] **Step 2: Commit**

```bash
git add api/src/modules/usage/usage.service.ts
git commit -m "feat(billing): update getCurrentUsage to support rolling billing cycle dates"
```

---

### Task 10: Update users service and profile response

**Files:**
- Modify: `api/src/modules/users/users.service.ts`

- [ ] **Step 1: Update getProfile to include plan and subscription data**

In `api/src/modules/users/users.service.ts`:

Add import at top:
```typescript
import { PlanModel } from '../plans/plans.model';
```

Replace the `getProfile` method to include plan data and use rolling cycle for usage:

```typescript
  async getProfile(userId: string) {
    const user = await UserModel.findOne({
      $or: [{ oderId: userId }, { _id: userId }],
    }).lean();

    if (!user) {
      throw new ApiError('USER_NOT_FOUND', 'User not found', 404);
    }

    const stats = await usageService.getUserStats(userId);

    // Fetch plan details if user has one
    let plan = null;
    if (user.plan) {
      plan = await PlanModel.findById(user.plan).lean();
    }

    // Use rolling cycle dates for current usage if available
    const currentUsage = await usageService.getCurrentUsage(
      userId,
      user.subscription?.currentPeriodStart,
      user.subscription?.currentPeriodEnd,
    );

    return {
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt,
      totalRequests: stats.totalRequests,
      plan: plan ? { name: plan.name, slug: plan.slug, credits: plan.credits } : null,
      subscription: user.subscription ? {
        status: user.subscription.status,
        credits: user.subscription.credits,
        currentPeriodStart: user.subscription.currentPeriodStart,
        currentPeriodEnd: user.subscription.currentPeriodEnd,
      } : null,
      currentUsage,
    };
  }
```

- [ ] **Step 2: Gate webhook updates behind plan feature**

In the `updateWebhookUrl` method, add a plan check before allowing the update:

```typescript
  async updateWebhookUrl(userId: string, url: string) {
    const user = await UserModel.findOne({
      $or: [{ oderId: userId }, { _id: userId }],
    }).lean();

    if (!user) {
      throw new ApiError('USER_NOT_FOUND', 'User not found', 404);
    }

    // Check if plan allows webhooks
    if (user.plan) {
      const plan = await PlanModel.findById(user.plan).lean();
      if (plan && !plan.features.webhooks) {
        throw new ApiError('FEATURE_NOT_AVAILABLE', 'Webhooks are not available on your current plan. Please upgrade.', 403);
      }
    }

    const updated = await UserModel.findOneAndUpdate(
      { $or: [{ oderId: userId }, { _id: userId }] },
      { $set: { webhookUrl: url } },
      { new: true },
    );

    return { webhookUrl: updated!.webhookUrl! };
  }
```

- [ ] **Step 3: Commit**

```bash
git add api/src/modules/users/users.service.ts
git commit -m "feat(billing): update profile to include plan data and gate webhooks"
```

---

### Task 11: Update keys service for plan-based limits

**Files:**
- Modify: `api/src/modules/keys/keys.service.ts`

- [ ] **Step 1: Replace hardcoded key limit with plan-based limit**

In `api/src/modules/keys/keys.service.ts`:

Add imports at top:
```typescript
import { UserModel } from '../users/users.model';
import { PlanModel } from '../plans/plans.model';
```

Replace the `createKey` method's limit check (lines 13-17). Replace:

```typescript
    if (existingKeys >= 5) {
      throw new ApiError('KEY_LIMIT_REACHED', 'Maximum of 5 active API keys allowed', 400);
    }
```

With:

```typescript
    // Get max keys from user's plan, fallback to 5
    let maxKeys = 5;
    const user = await UserModel.findOne({
      $or: [{ oderId: userId }, { _id: userId }],
    }).lean();

    if (user?.plan) {
      const plan = await PlanModel.findById(user.plan).lean();
      if (plan) {
        maxKeys = plan.features.maxApiKeys;
      }
    }

    if (existingKeys >= maxKeys) {
      throw new ApiError('KEY_LIMIT_REACHED', `Maximum of ${maxKeys} active API keys allowed on your plan`, 400);
    }
```

- [ ] **Step 2: Commit**

```bash
git add api/src/modules/keys/keys.service.ts
git commit -m "feat(billing): use plan-based API key limits instead of hardcoded value"
```

---

### Task 12: Update upload service for plan-based file size limit

**Files:**
- Modify: `api/src/modules/upload/upload.service.ts`

- [ ] **Step 1: Add plan-based file size check**

In `api/src/modules/upload/upload.service.ts`:

Add imports:
```typescript
import { UserModel } from '../users/users.model';
import { PlanModel } from '../plans/plans.model';
```

In the `uploadFile` method, replace the hardcoded `MAX_FILE_SIZE` check (lines 31-33). Replace:

```typescript
    if (file.size > MAX_FILE_SIZE) {
      throw new ApiError('FILE_TOO_LARGE', `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`, 413);
    }
```

With:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add api/src/modules/upload/upload.service.ts
git commit -m "feat(billing): use plan-based file size limits for uploads"
```

---

### Task 13: Clean up unused tokens references

**Files:**
- Modify: `api/src/modules/usage/usage.types.ts`

- [ ] **Step 1: Remove DEFAULT_TOKENS_LIMIT**

In `api/src/modules/usage/usage.types.ts`, remove line 127-128:

```typescript
// Default free tier (500MB); kept for users.model.ts schema default
export const DEFAULT_TOKENS_LIMIT = 500_000_000;
```

- [ ] **Step 2: Verify no other files reference DEFAULT_TOKENS_LIMIT**

Run:
```bash
cd /Users/gustavonobregab/Programming/robin-monorepo && grep -r "DEFAULT_TOKENS_LIMIT" api/src/
```

Expected: no results (users.model.ts import was already removed in Task 4).

- [ ] **Step 3: Commit**

```bash
git add api/src/modules/usage/usage.types.ts
git commit -m "chore: remove unused DEFAULT_TOKENS_LIMIT constant"
```

---

### Task 14: Verify the system works end-to-end

- [ ] **Step 1: Start the API dev server**

```bash
cd /Users/gustavonobregab/Programming/robin-monorepo && bun run dev
```

Expected: server starts on port 3002 without errors.

- [ ] **Step 2: Run seed:plans**

```bash
cd /Users/gustavonobregab/Programming/robin-monorepo/api && bun run seed:plans
```

Expected: plans created successfully.

- [ ] **Step 3: Test GET /plans endpoint**

```bash
curl http://localhost:3002/plans | jq
```

Expected: returns Free and Pro plans with credits, weights, and features.

- [ ] **Step 4: Test GET /plans/free endpoint**

```bash
curl http://localhost:3002/plans/free | jq
```

Expected: returns the Free plan details.

---

### Out of Scope (future tasks)

- **Admin routes**: `POST /plans`, `PATCH /plans/:slug` (create/update plans), `PATCH /users/me/plan` (change user's plan). Plans are managed manually via seed script or direct DB for now.
- **API-specific insufficient credits handling**: When the public API is implemented, API key auth requests should return `200` with original payload + `X-Robin-Processed: false` header instead of `429`. Current implementation always returns `429`.
- **Sync text usage recording**: `processTextSync` does not record UsageEvents. This is a pre-existing gap — billing makes it more visible but does not introduce it.
