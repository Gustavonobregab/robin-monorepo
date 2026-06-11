# Usage + Idempotency-Key — Design

Date: 2026-06-11
Status: approved

## Goal

Make usage tracking complete and scalable without touching billing, and make
job creation safe to retry from API clients.

## Decisions

- Approach: raw immutable `UsageEvent`s as source of truth, aggregation done
  by MongoDB pipelines at read time. No rollup collections, no external
  metering service.
- Retention: TTL index deletes events older than 365 days.
- Idempotency-Key: optional request header on job-creation endpoints, stored
  on the job document, unique per user.

## Usage changes

1. `UsageEvent.jobId` becomes optional; new `sync: boolean` field (default
   false) marks events from the synchronous text path.
2. `usageService.record()` inserts directly and treats duplicate-key errors
   (E11000) as "already recorded", returning the existing event. The unique
   index on `idempotencyKey` is the concurrency guarantee, not a pre-check.
3. `getAnalytics` / `getCurrentUsage` are rewritten as aggregation pipelines
   (`$match` + `$group`); the API no longer loads all events into memory.
   Response shapes do not change (dashboard untouched).
4. Sync text processing records an event with key `sync:<ulid>` after
   success. A failed usage write is logged and never fails the request.
5. TTL index on `timestamp` with `expireAfterSeconds = 365 days`.

## Idempotency-Key

- Optional header `Idempotency-Key` (1–255 chars) on `POST /text`,
  `POST /audio` (dashboard and /v1).
- Stored as `idempotencyKey` on the job document. Unique compound index
  `{ userId, idempotencyKey }` with `partialFilterExpression` so jobs
  without a key are not constrained.
- Flow: key present → look up existing job for that user; found → return it
  without reserving credits. Not found → normal flow, job created with key.
- Race (two concurrent requests, same key): the loser hits the unique index,
  rolls back its credit reservation and returns the winner's job.
- Same key with a different body returns the existing job (documented
  behavior; simpler than Stripe's 422).
- The sync text path ignores the header.

## Error semantics

- Retrying the key of a job that ended `failed` returns that failed job; the
  key identifies the attempt, not a success guarantee.
- Worker retries cannot double-record usage (`job:<id>` key dedupes).

## Tests

`bun test` (requires `MONGODB_URI`; uses a dedicated test database):

- record(): duplicate key returns existing event; concurrent records with the
  same key produce exactly one event.
- Aggregations: fixture events produce expected totals per pipeline.
- Jobs index: same user + same key cannot create two jobs; jobs without key
  are unconstrained.

## Out of scope

Billing/pricing model, rollup collections, sync-response replay.

## Dev migration note

Existing dev databases carry the old non-TTL `timestamp_1` index on
`usageevents`; drop it (or the collection) so the TTL index can be created.
