# Usage Metering System — Design Spec

## Context

Robin Wood processes audio and text (with image/video planned). Before deciding on a billing model (Free/Pro/Enterprise tiers with per-resource quotas), we need a rich metering layer that records everything that happens — bytes, durations, dimensions, formats, operations — so billing can be built on top without rewriting the metering.

### Decisions Made

- **Approach:** Metering-First — record all dimensions now, billing decides what to charge later
- **Granularity:** Capture every possible dimension per pipeline type (duration, bytes, format, resolution, etc.)
- **Operation categories:** Only `basic` for now (ffmpeg/local). AI tier deferred.
- **Billing model (future):** Free/Pro/Enterprise with quotas per resource (audio, text, image, video separately)
- **Quota reset:** Monthly fixed (day 1 of month or account creation date)
- **Current enforcement:** Removed — no limits enforced until billing is implemented

## 1. UsageEvent Schema (Expanded)

The existing `UsageEvent` model is expanded with type-specific metadata fields and a `jobId` reference.

### Fields

```
UsageEvent
├── idempotencyKey: string (unique)
├── userId: string (indexed)
├── apiKeyId?: string                      // optional — not available from worker context
├── jobId: string                          // NEW — reference to Job._id
├── pipelineType: 'audio' | 'text' | 'image' | 'video'
├── operations: string[]
├── inputBytes: number
├── outputBytes: number
├── processingMs: number                   // NEW — measured in worker with Date.now() delta
├── timestamp: Date (indexed)
│
├── audio?: {                              // NEW — only when pipelineType = 'audio'
│     durationMs: number                   // input duration in milliseconds
│     format: string                       // 'mp3' | 'wav'
│     sampleRate: number                   // e.g. 44100, 48000
│     channels: number                     // 1 (mono) or 2 (stereo)
│   }
├── text?: {                               // NEW — only when pipelineType = 'text'
│     characterCount: number               // input character count
│     wordCount: number                    // input word count
│     encoding: string                     // e.g. 'utf-8'
│   }
├── image?: {                              // NEW — placeholder for future
│     width: number
│     height: number
│     format: string                       // 'png' | 'jpg' | 'webp'
│     megapixels: number                   // width * height / 1_000_000
│   }
└── video?: {                              // NEW — placeholder for future
      durationMs: number
      width: number
      height: number
      format: string                       // 'mp4' | 'webm'
      fps: number
      codec: string                        // 'h264' | 'h265' | 'vp9'
    }
```

### Indexes

Existing indexes are sufficient:
- `{ userId: 1, timestamp: -1 }`
- `{ apiKeyId: 1, timestamp: -1 }`

No new indexes needed at current volume. A `jobId` index can be added later if needed for lookups.

### Removed

- `tokensSaved` field — was mixing metering with billing (input - output). Raw `inputBytes`/`outputBytes` remain; billing interprets them.

## 2. Recording Flow

### Current State

`UsageService.record()` exists but is **never called** from the workers today. This spec introduces the `record()` call into both processors for the first time.

### When: After successful processing only

Failed jobs do not generate usage events — the user consumed nothing.

### Where: In the worker, after job completion

```
Job enters worker
  → const start = Date.now()
  → Download input
  → Extract metadata (ffprobe for audio, char/word count for text)
  → Process
  → Upload output
  → const processingMs = Date.now() - start
  → Update Job (status: completed, metrics)
  → Record UsageEvent with all data    ← NEW — introduced by this spec
```

### Idempotency

Key format: `job:{jobId}`. If BullMQ retries a job, the duplicate `UsageEvent` insert is rejected by the unique index on `idempotencyKey`.

### Obtaining userId

The worker receives only `{ jobId }` in the queue payload. The `userId` is read from the fetched `JobModel` document (`jobDoc.userId`). The `apiKeyId` is **not available** in worker context — it will be `undefined` in usage events created from workers. This is acceptable; `apiKeyId` attribution can be added later if the Job schema is extended.

### Audio processor changes (`audio.processor.ts`)

1. Record `Date.now()` at the start of processing
2. Run `ffprobe` on the input file (via `fluent-ffmpeg`'s `ffprobe()` method, consistent with existing ffmpeg usage) to extract: `durationMs`, `sampleRate`, `channels`, `format`
3. After successful processing and upload, call `UsageService.record()` with:
   - `userId` from `jobDoc.userId`
   - `jobId`, `pipelineType: 'audio'`, `operations`
   - `inputBytes`, `outputBytes`, `processingMs`
   - `audio: { durationMs, format, sampleRate, channels }`
   - `idempotencyKey: \`job:${jobId}\``

### Text processor changes (`text.processor.ts`)

1. Record `Date.now()` at the start of processing
2. Calculate `characterCount` (string length) and `wordCount` (split by whitespace) from input text
3. After successful processing, call `UsageService.record()` with:
   - `userId` from `jobDoc.userId`
   - `jobId`, `pipelineType: 'text'`, `operations`
   - `inputBytes`, `outputBytes`, `processingMs`
   - `text: { characterCount, wordCount, encoding: 'utf-8' }`
   - `idempotencyKey: \`job:${jobId}\``

## 3. UsageService Changes

### `record(input)` method

- Accept new optional fields: `jobId`, `audio`, `text`, `image`, `video`
- **Remove** the `User.tokens.used` increment — metering no longer touches the User document
- Save the enriched `UsageEvent` to MongoDB
- Return `{ eventId: string }` (simplified from current `RecordUsageResult` which returned `tokensSaved`/`tokensRemaining`)

### `getAnalytics(userId, range)` method — Redesigned

Replaces the current response shape entirely. The old `stats`/`breakdown`/`recent` structure is replaced by a unified `summary` with per-pipeline breakdowns.

**`GET /usage/analytics?range=7d|30d|90d|1y`**

Response:

```typescript
{
  summary: {
    totalRequests: number
    totalInputBytes: number
    totalOutputBytes: number
    byPipeline: {
      audio?: {
        requests: number
        totalMinutes: number        // sum of durationMs → minutes
        totalInputBytes: number
        totalOutputBytes: number
      }
      text?: {
        requests: number
        totalCharacters: number
        totalWords: number
        totalInputBytes: number
        totalOutputBytes: number
      }
      image?: {
        requests: number
        totalMegapixels: number
        totalInputBytes: number
        totalOutputBytes: number
      }
      video?: {
        requests: number
        totalMinutes: number
        totalInputBytes: number
        totalOutputBytes: number
      }
    }
  }
  chart: [{ date: string, requests: number }]  // "DD/MM" format
  recent: UsageEvent[]                          // last 10 raw events — dashboard handles formatting
}
```

### `getCurrentUsage(userId)` method — Redesigned

Fully replaces the old `CurrentUsage` type (`tokensLimit`/`tokensUsed`/`tokensRemaining`). Dashboard code consuming the old type must be updated.

**`GET /usage/current`**

Response:

```typescript
{
  period: { start: Date, end: Date }    // current calendar month
  audio:  { requests: number, minutes: number, inputBytes: number }
  text:   { requests: number, characters: number, inputBytes: number }
  image:  { requests: number, megapixels: number, inputBytes: number }
  video:  { requests: number, minutes: number, inputBytes: number }
}
```

Image and video return zeros until implemented.

### `getUserStats(userId)` method

Kept as-is. Only returns `{ totalRequests }`, no dependency on deprecated token fields.

### Removed

- `checkLimits()` method — no enforcement until billing is built
- `GET /usage/limits` endpoint — removed

## 4. What Gets Deprecated (Not Deleted)

| Item | Action |
|------|--------|
| `User.tokens.limit` | Keep in schema, stop reading |
| `User.tokens.used` | Keep in schema, stop writing |
| `UsageEvent.tokensSaved` | Remove from schema |
| `UsageService.checkLimits()` | Remove method |
| `RecordUsageResult.tokensSaved` | Remove — return type becomes `{ eventId: string }` |
| `RecordUsageResult.tokensRemaining` | Remove — return type becomes `{ eventId: string }` |
| `DEFAULT_TOKENS_LIMIT` in `usage.types.ts` | Keep — still referenced by `users.model.ts` schema default |
| `GET /usage/limits` | Remove route |

The `tokens` field on User stays in the model to avoid a migration — it becomes inert until billing replaces it.

## 5. Files Affected

| File | Change |
|------|--------|
| `api/src/modules/usage/usage.model.ts` | Add `jobId`, `audio`, `text`, `image`, `video` fields; remove `tokensSaved` |
| `api/src/modules/usage/usage.types.ts` | Update `RecordUsageInput`, `RecordUsageResult`, add new analytics response types; keep `DEFAULT_TOKENS_LIMIT` |
| `api/src/modules/usage/usage.service.ts` | Remove token increment, remove `checkLimits()`, accept new fields, redesign `getAnalytics()` and `getCurrentUsage()` |
| `api/src/modules/usage/usage.routes.ts` | Update responses, remove `/usage/limits` |
| `api/src/worker/audio.processor.ts` | Add ffprobe metadata extraction, add `Date.now()` timing, **introduce** `UsageService.record()` call |
| `api/src/worker/text.processor.ts` | Add char/word count, add `Date.now()` timing, **introduce** `UsageService.record()` call |
| `dashboard/types/index.ts` | Replace `UsageAnalytics` and `CurrentUsage` types with new response shapes |
| `dashboard/app/http/usage.ts` | Update functions to match new endpoints, remove `getCurrentUsage` old shape |
| `dashboard/app/components/dashboard/` | Update analytics components for new data structure (raw events, per-pipeline breakdown) |

### Prerequisite fix

`job.types.ts` defines `JobStatus` as `'created' | 'queued' | 'running' | 'succeeded' | 'failed'` but `job.model.ts` uses `'created' | 'pending' | 'processing' | 'completed' | 'failed'`. This mismatch should be resolved (align types to model) before or during implementation to avoid type errors in the new worker code.

## 6. What This Does NOT Include

- Billing tiers / plans / subscriptions
- Payment processing
- Rate limiting
- Quota enforcement
- AI operation category/pricing
- Organizations / teams
