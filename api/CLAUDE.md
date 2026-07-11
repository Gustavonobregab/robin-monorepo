# Robin Wood — API

Bun + Elysia + MongoDB (Mongoose) + Redis (BullMQ) + better-auth. Two surfaces:
session-cookie routes for the dashboard (mounted in `server.ts`) and the public
API under `/v1` (Bearer `sk_live_*` keys).

Commands: `bun run dev` (API + worker) · `bun run worker` · `bunx tsc --noEmit` ·
`bun test` · `bun run seed:plans`

## Modules

Every feature lives in `src/modules/<name>/` with files named `<module>.<layer>.ts`:

- `*.routes.ts` — Elysia routes only: validation schemas (`t.Object`), auth
  plugin, thin handlers that delegate to the service. No business logic.
- `*.service.ts` — business logic, exported as a singleton instance
  (`export const fooService = new FooService()`).
- `*.model.ts` — Mongoose schema + typed model (`Model<Foo>` from `*.types.ts`).
- `*.types.ts` — interfaces and, when routes need them, Elysia `t` schemas
  (types and validation live together per module).

Not every module needs all four files. Config lives in `src/config/` (one file
per concern, validates its env vars at import time and throws if missing).
Cross-cutting helpers go in `src/utils/`, middleware-ish plugins in
`src/middlewares/`.

## Errors

- Services and routes throw `new ApiError(CODE, message, httpStatus)`
  (`src/utils/api-error.ts`). Never throw raw strings or bare `Error` for
  expected failures.
- `CODE` is UPPER_SNAKE, stable, and machine-readable — the dashboard maps
  codes to user-facing messages (`dashboard/app/http/errors.ts`). Adding a
  code = adding one line to that map. Never rename an existing code casually.
- The global `mapResponse` wraps everything: success →
  `{ success: true, data }`, error → `{ success: false, error: { code, message } }`.
  Handlers return plain values; never wrap manually.
- Use proper HTTP status: 400 invalid input, 401 auth, 403 plan/permission,
  404 not found, 409 conflict, 410 expired, 413 too large, 422 unprocessable,
  429 credits/rate limit.

## Auth

- Dashboard routes: `.use(validateAuth)` (better-auth session cookie) →
  `userId` in context.
- `/v1` routes: `apiKeyAuth` (already applied inside `apiRoutes`) → `userId`,
  `apiKeyId`, plus per-key rate limiting. Keys are stored as sha256 hashes;
  the raw key is returned exactly once at creation.
- User lookups match both id shapes:
  `{ $or: [{ oderId: userId }, { _id: userId }] }`.

## Credits (billing core — touch with care)

- `reserveCredits(userId, pipelineType, inputBytes)` runs BEFORE any work is
  queued or executed. Cost is size-based, read from the user's plan document:
  `weight.credits × ceil(inputBytes / weight.perUnitBytes)`, minimum one unit.
- Reservation is a single atomic `findOneAndUpdate` with an `$expr` guard —
  never check-then-update in two steps.
- Store the reserved cost on the job payload (`creditCost`); on FINAL failure
  the worker calls `rollbackCredits` with it. Sync paths roll back in their
  catch. Never charge without a reservation, never roll back twice.
- Plan values (weights, prices, quotas) live in the `plans` collection and are
  retuned by editing `scripts/seed-plans.ts` and re-running it (seeds are
  upserts — they must stay idempotent and update existing docs).

## Jobs, queues, workers

- Mongo is the source of truth for job state; the BullMQ payload carries only
  `jobId`. The BullMQ job id IS the Mongo id (dedupe).
- Queue contracts live in `src/queues/<name>.queue.ts` (payload type + queue
  name const); instances with their job options in `src/queues/queue.ts`;
  processors in `src/worker/`, registered in `src/worker/index.ts` with
  explicit concurrency and included in the graceful-shutdown array.
- Processor failure pattern: BullMQ retries with backoff. Only on the FINAL
  attempt (`job.attemptsMade + 1 >= job.opts.attempts`) mark the job `failed`,
  roll back credits, and enqueue the failure webhook; earlier attempts reset
  status to `pending` and rethrow.
- Audio pipeline: intermediate steps are lossless WAV; only the final `encode`
  op is lossy (Opus mono VBR default, mp3 opt-in). The service guarantees an
  encode op runs last.
- Webhooks are never sent inline from processors — enqueue via
  `webhooksService.enqueueJobWebhook` (dedicated queue, 5 attempts,
  exponential backoff, HMAC-signed delivery).

## Data & idempotency

- Uniqueness and idempotency are enforced by unique indexes, not pre-checks:
  insert and catch `isDuplicateKeyError` (`src/utils/mongo.ts`). Examples:
  usage events (`idempotencyKey`), jobs (`{userId, idempotencyKey}` partial
  index).
- Reads that don't need documents use `.lean()`. Aggregations run in Mongo
  (`$group`), never by loading collections into JS.
- Job results store the S3 `outputKey`; signed download URLs are generated
  on read (`getSignedDownloadUrl`), never persisted.

## Storage (R2 via S3 SDK)

- Client in `config/storage.ts` — keep `requestChecksumCalculation:
  'WHEN_REQUIRED'` (the SDK otherwise signs presigned PUTs with an empty-body
  checksum that R2 rejects).
- Uploads are presigned PUTs direct from the browser; the API validates on
  first consumption (HeadObject size + magic-byte range read). Key layout:
  `uploads/<userId>/<ulid><ext>`, `outputs/<jobId>/result.<ext>`.

## Usage

- Every processed job records one immutable usage event
  (`usageService.record`), idempotent by key (`job:<id>`, `sync:<ulid>`).
  Usage is telemetry — a failed usage write must never fail the request/job.

## Tests

- `bun test`, files colocated as `*.test.ts`. Pure logic tests run anywhere;
  DB tests connect via `MONGODB_URI` to the `robin-wood-test` database and
  `describe.skipIf(!MONGODB_URI)`.
