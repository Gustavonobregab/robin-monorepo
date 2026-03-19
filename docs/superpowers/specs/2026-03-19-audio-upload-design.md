# Audio File Upload — Design Spec

## Overview

Replace the current URL-based audio input (`audioUrl`) with direct file upload via `multipart/form-data`. Audio files are uploaded to S3 with auto-delete, and referenced by ID when creating processing jobs.

**Pattern**: AssemblyAI-style two-step (upload → process), storage like ElevenLabs (ephemeral, no permanent retention).

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Upload method | `multipart/form-data` | Simple, covers 90%+ of use cases under 100MB |
| Storage | AWS S3 | Industry standard, native lifecycle policies |
| Size limit | 100MB | Permissive; plan-based limits in the future |
| Accepted formats | `.mp3`, `.wav` | Minimal, covers most use cases |
| Retention | 24h uploads, 72h outputs | Auto-delete via S3 lifecycle + MongoDB TTL |
| Billing on upload | No | Only on processing (future) |
| URL-based input | Removed | Replaced entirely by upload flow |

## Flow

```
Client                    API                      S3                    Worker
  |                        |                       |                      |
  |-- POST /upload ------->|                       |                      |
  |   (multipart: file)    |-- validate magic bytes|                      |
  |                        |-- PutObject ---------->|                      |
  |                        |<-- ok ----------------|                      |
  |<-- { id, expiresAt } --|                       |                      |
  |                        |                       |                      |
  |-- POST /audio -------->|                       |                      |
  |   { audioId, ops }     |-- verify ownership ---|                      |
  |                        |-- create job + enqueue |--------------------->|
  |<-- { job } ------------|                       |                      |
  |                        |                       |  GetObject            |
  |                        |                       |<---------------------|
  |                        |                       |  (FFmpeg pipeline)    |
  |                        |                       |  PutObject (output)   |
  |                        |                       |<---------------------|
```

## New Module: `upload`

### File Structure

```
api/src/modules/upload/
├── upload.routes.ts
├── upload.service.ts
├── upload.model.ts
└── upload.types.ts
```

### MongoDB Schema (`upload.model.ts`)

```typescript
{
  userId: string            // indexed — who uploaded
  originalName: string      // original filename (e.g. "podcast.mp3")
  mimeType: string          // "audio/mpeg" or "audio/wav"
  size: number              // bytes
  s3Key: string             // "uploads/{userId}/{uploadId}.mp3"
  status: "pending" | "ready" | "expired"
  expiresAt: Date           // 24h after creation
}
```

**Indexes**: `(userId, createdAt)`, `expiresAt` (TTL — MongoDB auto-deletes expired docs).

### Endpoint: `POST /upload`

**Input**: `multipart/form-data` with field `audio` (file).

**Validation**:
1. Size: max 100MB (Elysia body limit)
2. Extension: `.mp3` or `.wav`
3. Magic bytes verification (not just Content-Type):
   - MP3: starts with `FF FB`, `FF F3`, `FF F2`, or `ID3`
   - WAV: starts with `RIFF`
4. S3 key: `uploads/{userId}/{ulid}.{ext}` — no user-controlled path segments

**Response**:
```json
{
  "id": "01HX...",
  "originalName": "podcast.mp3",
  "size": 5242880,
  "expiresAt": "2026-03-20T14:00:00.000Z"
}
```

## New Config: `storage.ts`

```
api/src/config/
└── storage.ts    — S3Client instance from @aws-sdk/client-s3
```

Reads `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET` from env.

## Changes to Existing Files

### `audio.routes.ts`

- `POST /audio`: body changes from `{ audioUrl, preset?, operations? }` to `{ audioId, preset?, operations? }`
- `audioId` is a string referencing an upload document

### `audio.service.ts`

- `processAudio` receives `audioId` instead of `audioUrl`
- Resolves `audioId` → upload document → validates ownership and status
- Creates job with `source: { kind: "storage", ref: upload.s3Key }`

### `audio.types.ts`

- Remove `audioUrl` references
- Remove URL-related schemas

### `job.types.ts`

- Remove `source.kind: "url"` variant
- Keep only `source.kind: "storage"`

### `audio.processor.ts` (Worker)

Current flow:
1. `fetch(url)` → temp file → FFmpeg → TODO upload output

New flow:
1. `GetObject(s3Key)` → temp file → FFmpeg → `PutObject` output to `outputs/{jobId}/result.mp3`
2. Generate presigned download URL (72h expiry) for output
3. Save `outputUrl` (presigned) in job result
4. Clean up temp dir

### `server.ts`

- Register `uploadRoutes` under the Elysia app

## S3 Configuration

**Bucket**: single bucket with prefix-based lifecycle rules

| Prefix | Lifecycle | Purpose |
|--------|-----------|---------|
| `uploads/` | Delete after 24h | Input files |
| `outputs/` | Delete after 72h | Processed results |

**Access**: Bucket is private. Outputs served via presigned URLs.

## New Dependency

- `@aws-sdk/client-s3` — AWS SDK v3 (modular, only S3 client)
- `@aws-sdk/s3-request-presigner` — for generating presigned download URLs

## Security

- Magic bytes validation prevents disguised file uploads
- S3 keys use server-generated ULIDs, no user input in paths
- Ownership check: upload must belong to the authenticated user
- Status check: upload must be `ready` and not expired
- No public S3 access; outputs via time-limited presigned URLs
