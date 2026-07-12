import { Elysia, t } from 'elysia';
import { apiKeyAuth } from './api.middleware';
import { audioService } from '../modules/audio/audio.service';
import { textService } from '../modules/text/text.service';
import { imageService } from '../modules/image/image.service';
import { ImageOperationSchema, ImagePresetSchema } from '../modules/image/image.types';
import { uploadService } from '../modules/upload/upload.service';
import { usageService } from '../modules/usage/usage.service';
import { jobService } from '../modules/jobs/job.service';
import { JobListQuerySchema } from '../modules/jobs/job.types';
import { jobResponse } from '../modules/jobs/job.http';
import { AudioOperationSchema, AudioPresetSchema } from '../modules/audio/audio.types';
import { TextOperationSchema, TextPresetSchema } from '../modules/text/text.types';
import { ApiError } from '../utils/api-error';

export const apiRoutes = new Elysia()
  .use(apiKeyAuth)

  // ─── Audio ─────────────────────────────────────────
  .post(
    '/audio',
    async ({ body, userId, headers, set }) =>
      jobResponse(set, await audioService.processAudio(userId, {
        ...body,
        idempotencyKey: headers['idempotency-key'],
      })),
    {
      body: t.Object({
        audioId: t.String(),
        preset: t.Optional(AudioPresetSchema),
        operations: t.Optional(
          t.Array(AudioOperationSchema, { minItems: 1, maxItems: 10 })
        ),
        webhookUrl: t.Optional(t.String({ format: 'uri' })),
      }),
      headers: t.Object({
        'idempotency-key': t.Optional(t.String({ minLength: 1, maxLength: 255 })),
      }),
      detail: {
        summary: 'Create audio compression job',
        description:
          'Queues compression of a previously uploaded audio file, using either a preset or a custom list of operations. Supports Idempotency-Key.',
        tags: ['Audio'],
      },
    }
  )

  .get('/audio/presets', () => audioService.listPresets(), {
    detail: { summary: 'List audio presets', tags: ['Audio'] },
  })

  .get('/audio/operations', () => audioService.listOperations(), {
    detail: { summary: 'List audio operations', tags: ['Audio'] },
  })

  // ─── Text ──────────────────────────────────────────
  .post(
    '/text',
    async ({ body, userId, headers, set }) =>
      jobResponse(set, await textService.processText(userId, { ...body, idempotencyKey: headers['idempotency-key'] })),
    {
      body: t.Object({
        text: t.Optional(t.String({ maxLength: 5_000_000 })),
        fileId: t.Optional(t.String()),
        preset: t.Optional(TextPresetSchema),
        operations: t.Optional(
          t.Array(TextOperationSchema, { minItems: 1, maxItems: 10 })
        ),
        webhookUrl: t.Optional(t.String({ format: 'uri' })),
      }),
      headers: t.Object({
        'idempotency-key': t.Optional(t.String({ minLength: 1, maxLength: 255 })),
      }),
      detail: {
        summary: 'Create text compression job',
        description:
          'Queues compression of inline text or a previously uploaded file, using either a preset or a custom list of operations. Supports Idempotency-Key.',
        tags: ['Text'],
      },
    }
  )

  .get('/text/presets', () => textService.listPresets(), {
    detail: { summary: 'List text presets', tags: ['Text'] },
  })

  .get('/text/operations', () => textService.listOperations(), {
    detail: { summary: 'List text operations', tags: ['Text'] },
  })

  // ─── Image ─────────────────────────────────────────
  .post(
    '/image',
    async ({ body, userId, headers, set }) =>
      jobResponse(set, await imageService.processImage(userId, {
        ...body,
        idempotencyKey: headers['idempotency-key'],
      })),
    {
      body: t.Object({
        imageId: t.String(),
        preset: t.Optional(ImagePresetSchema),
        operations: t.Optional(t.Array(ImageOperationSchema, { minItems: 1, maxItems: 10 })),
        webhookUrl: t.Optional(t.String({ format: 'uri' })),
      }),
      headers: t.Object({
        'idempotency-key': t.Optional(t.String({ minLength: 1, maxLength: 255 })),
      }),
      detail: {
        summary: 'Create image compression job',
        description: 'Small non-AVIF images return completed immediately (200); larger or AVIF jobs are queued (202). Supports Idempotency-Key.',
        tags: ['Image'],
      },
    },
  )

  .get('/image/presets', () => imageService.listPresets(), {
    detail: { summary: 'List image presets', tags: ['Image'] },
  })

  .get('/image/operations', () => imageService.listOperations(), {
    detail: { summary: 'List image operations', tags: ['Image'] },
  })

  // ─── Jobs ──────────────────────────────────────────
  .get(
    '/jobs',
    async ({ query, userId }) => jobService.list(userId, query),
    {
      query: JobListQuerySchema,
      detail: { summary: 'List jobs', tags: ['Jobs'] },
    }
  )

  .get(
    '/jobs/:id',
    async ({ params: { id }, query, userId }) => {
      const job = await jobService.getStatus(userId, id, query.wait ?? 0);
      if (!job) throw new ApiError('JOB_NOT_FOUND', 'Job not found', 404);
      return job;
    },
    {
      query: t.Object({
        wait: t.Optional(t.Numeric({ minimum: 0, maximum: 30 })),
      }),
      detail: {
        summary: 'Get job status',
        description: 'Pass ?wait=N (max 30s) to long-poll: the response is held until the job finishes or the timeout passes.',
        tags: ['Jobs'],
      },
    }
  )

  // ─── Upload ────────────────────────────────────────
  .post(
    '/upload',
    async ({ body, userId }) => uploadService.createUpload(userId, body),
    {
      body: t.Object({
        filename: t.String({ minLength: 1, maxLength: 255 }),
        size: t.Number({ minimum: 1 }),
      }),
      detail: {
        summary: 'Create presigned upload',
        description: 'Returns a presigned URL to upload a file, plus the file id to reference in audio/text jobs.',
        tags: ['Upload'],
      },
    }
  )

  // ─── Usage ─────────────────────────────────────────
  .get(
    '/usage/current',
    async ({ userId }) => usageService.getCurrentUsage(userId),
    {
      detail: { summary: 'Get current billing period usage', tags: ['Usage'] },
    }
  );
