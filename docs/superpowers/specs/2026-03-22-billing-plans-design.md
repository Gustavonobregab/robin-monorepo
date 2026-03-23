# Billing & Plans System Design

## Overview

Tier-based billing system with a credit-based usage model. Plans define monthly credit allowances, and each pipeline type (text, audio, image, video) consumes credits at different rates. Free tier is assigned automatically on account creation. Enterprise/custom plans are supported via a `plans` collection in MongoDB.

## Decisions

- **Credit-based metering** — single unified currency across all pipeline types, with configurable weights per plan
- **Tier-based, no overage** — users hitting their limit are soft-blocked (not charged extra)
- **Subscription on User model** — no separate subscriptions collection; plan + credits + cycle live on the user document
- **Plans in MongoDB** — source of truth for plan definitions, allows creating custom enterprise plans without deploy
- **Monthly rolling cycle** — 30-day cycle starting from plan assignment date, not calendar month
- **Lazy renewal only** — cycle renews on next request after expiration, no cron job
- **Two-phase credit enforcement** — reserve in HTTP layer (before enqueueing), rollback in worker on failure
- **Manual plan assignment for now** — no Stripe integration yet; paid plans assigned manually
- **Free tier auto-assigned** — user gets the default plan on account creation
- **Track credits consumed per event** — `creditsConsumed` stored on UsageEvent for accurate historical analysis

## Data Model

### Plans Collection

```typescript
{
  _id: ObjectId,
  name: string,                // display name, e.g. "Free", "Pro", "Enterprise - Acme Corp"
  slug: string,                // unique identifier used in code and URLs, e.g. "free", "pro"
  description?: string,        // optional plan description for UI display
  credits: number,             // total credits granted per billing cycle
  creditWeights: {
    text: number,              // credits consumed per text processing request
    image: number,             // credits consumed per image processing request
    audio: number,             // credits consumed per audio processing request
    video: number,             // credits consumed per video processing request
  },
  features: {
    maxFileSize: number,       // maximum upload file size in bytes
    maxApiKeys: number,        // maximum number of active API keys allowed
    webhooks: boolean,         // whether the plan includes webhook access
  },
  isPublic: boolean,           // true = visible on pricing page, false = custom/enterprise plan
  isDefault: boolean,          // true = assigned to new users on signup (only one plan should be default)
  active: boolean,             // false = soft-deleted, no longer assignable
  createdAt: Date,
  updatedAt: Date,
}
```

### User Model (subscription fields)

Replaces the existing `tokens.limit` and `tokens.used` fields:

```typescript
{
  // ... existing fields (name, email, image, etc.)

  plan: ObjectId,                // reference to the active plan document
  subscription: {
    status: string,              // subscription state: "active" or "canceled"
    credits: {
      limit: number,             // total credits for this cycle, snapshotted from plan on cycle start
      used: number,              // credits consumed in the current billing cycle
    },
    currentPeriodStart: Date,    // when the current billing cycle started
    currentPeriodEnd: Date,      // when the current billing cycle ends, triggers renewal
    canceledAt?: Date,           // timestamp when the user canceled, null if active
    planChangedAt?: Date,        // timestamp of last plan change, for audit purposes
  },
}
```

**Status values:**
- `active` — normal state, credits are enforced, cycle renews automatically
- `canceled` — user canceled; credits remain usable until `currentPeriodEnd`, after which no renewal occurs

**Why snapshot `credits.limit`?** If the plan's credit amount changes, existing users keep their current cycle limit until renewal. Prevents unexpected retroactive changes.

### UsageEvent (new field)

Add `creditsConsumed: number` to the existing UsageEvent model. Records the exact credit cost at the time of processing, so historical analysis remains accurate even if plan weights change later.

## Credit Enforcement

Two-phase approach that accounts for the async BullMQ processing architecture.

### Flow

```
HTTP Layer:  Request → Auth → Check Cycle → Reserve Credits → Enqueue Job → 200
Worker:      Process Job → Success → done
                         → Failure → Rollback Credits
```

### Phase 1: HTTP Layer (middleware, before enqueueing)

1. **Check cycle expiration** — if `currentPeriodEnd < now`, renew cycle atomically via `findOneAndUpdate` with condition on `currentPeriodEnd` to prevent double renewal. If the update returns null (another request already renewed), re-read the user document to get the renewed cycle.
2. **Lookup credit cost** — fetch the user's plan `creditWeights` and get the cost for the pipeline type
3. **Reserve credits** — atomic `findOneAndUpdate` with `$inc` on `subscription.credits.used` and condition `credits.used + cost <= credits.limit`. If no match, user has insufficient credits.
4. **Enqueue job** — add the job to BullMQ with the `creditCost` in the job payload
5. **Return response** — 200 with job ID (credits are reserved, processing is async)

### Phase 2: Worker (on job failure)

In the worker's `catch` block (alongside the existing `JobModel.findByIdAndUpdate(id, { status: 'failed' })`):
- **Rollback credits** — `$inc: { "subscription.credits.used": -creditCost }` using the cost from the job payload
- **Record UsageEvent** — store `creditsConsumed: 0` for failed jobs

On success, the worker records the UsageEvent with `creditsConsumed: creditCost`.

### Insufficient Credits Response

The source of the request determines the response:

- **Dashboard** (session cookie auth): `429` with upgrade message
- **API** (API key auth, future): `200` with original payload echoed back + `X-Robin-Processed: false` header, so the client application never breaks

## Enforcement Points

Plan features are enforced at these specific locations:

| Feature | Where | How |
|---------|-------|-----|
| Credits | Credit enforcement middleware | Reserve before enqueue, rollback on worker failure |
| `maxFileSize` | Upload route/service | Check file size against plan limit before accepting upload |
| `maxApiKeys` | `KeysService.createKey()` | Replace hardcoded `5` with user's plan `features.maxApiKeys` |
| `webhooks` | `UsersService` webhook update | Check plan `features.webhooks` before allowing `webhookUrl` to be set |

## Cycle Renewal

Lazy renewal only — triggered when a request arrives and `currentPeriodEnd < now`.

On renewal:
- `currentPeriodStart` = previous `currentPeriodEnd` (continuous cycles, no gaps)
- `currentPeriodEnd` = new start + 30 days
- `credits.used` = 0
- `credits.limit` = re-snapshot from current plan (picks up plan changes)

If `subscription.status` is `canceled` and `currentPeriodEnd < now`, do not renew — the subscription has ended.

## Free Tier Auto-Assignment

On user creation (better-auth hook after Google OAuth):

1. Query plan with `isDefault: true`
2. Set user fields:
   - `plan` = Free plan ID
   - `subscription.status` = "active"
   - `subscription.credits.limit` = plan credits
   - `subscription.credits.used` = 0
   - `subscription.currentPeriodStart` = now
   - `subscription.currentPeriodEnd` = now + 30 days

## Plan Changes

When changing a user's plan (manual for now):

- Update `plan` to new plan ID
- Re-snapshot `credits.limit` from new plan
- Keep `credits.used` as-is (no mid-cycle reset)
- Set `planChangedAt` = now
- Keep current cycle dates unchanged

## API Routes

### Plans module (`api/src/modules/plans/`)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/plans` | None | List all public active plans (for pricing page) |
| GET | `/plans/:slug` | None | Get a specific plan by slug |
| POST | `/plans` | Admin | Create a new plan |
| PATCH | `/plans/:slug` | Admin | Update a plan |

### User billing (on existing user routes)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/users/me` | Session | Already exists — extend response to include plan + subscription data |
| PATCH | `/users/me/plan` | Admin | Change a user's plan (manual assignment) |

## Usage Service Update

The existing `getCurrentUsage()` in `usage.service.ts` uses calendar months (`startOfMonth`/`endOfMonth`). This must be updated to use the user's rolling cycle dates (`currentPeriodStart` / `currentPeriodEnd`) instead.

## Module Structure

Following the project's existing conventions:

```
api/src/modules/plans/
├── plans.model.ts        # Mongoose schema for Plan
├── plans.service.ts      # CRUD, default plan lookup, plan assignment
├── plans.types.ts        # TypeScript interfaces
└── plans.routes.ts       # Elysia route definitions
```

Credit enforcement middleware lives at `api/src/middlewares/credits.ts`.

## Seed Data

Default plans to seed:

| Plan | Slug | Credits | Text | Image | Audio | Video | maxFileSize | maxApiKeys | webhooks | Public | Default |
|------|------|---------|------|-------|-------|-------|-------------|------------|----------|--------|---------|
| Free | free | 100 | 1 | 3 | 5 | 10 | 25MB | 2 | false | true | true |
| Pro | pro | 1000 | 1 | 3 | 5 | 10 | 100MB | 5 | true | true | false |

Enterprise plans are created manually per client with custom credits, weights, and features.

## Future Considerations (not in scope)

- Stripe integration (checkout, subscriptions, webhooks)
- Overage billing
- Usage alerts/notifications
- Organization/team billing
- Proration on plan changes
