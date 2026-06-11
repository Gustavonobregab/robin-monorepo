import { Elysia, t } from 'elysia';
import { apiKeyAuth } from './api.middleware';
import { audioService } from '../modules/audio/audio.service';
import { textService } from '../modules/text/text.service';
import { uploadService } from '../modules/upload/upload.service';
import { usageService } from '../modules/usage/usage.service';
import { jobService } from '../modules/jobs/job.service';
import { JobListQuerySchema } from '../modules/jobs/job.types';
import { AudioOperationSchema, AudioPresetSchema } from '../modules/audio/audio.types';
import { TextOperationSchema, TextPresetSchema } from '../modules/text/text.types';
import { ApiError } from '../utils/api-error';
import { UserModel } from '../modules/users/users.model';

export const apiRoutes = new Elysia()
  .use(apiKeyAuth)

  // ─── Audio ─────────────────────────────────────────
  .post(
    '/audio',
    async ({ body, userId, headers }) => {
      const { job } = await audioService.processAudio(userId, {
        ...body,
        idempotencyKey: headers['idempotency-key'],
      });
      return job;
    },
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
    }
  )

  .get('/audio/presets', () => audioService.listPresets())

  .get('/audio/operations', () => audioService.listOperations())

  // ─── Text ──────────────────────────────────────────
  .post(
    '/text',
    async ({ body, userId, headers }) =>
      textService.processText(userId, { ...body, idempotencyKey: headers['idempotency-key'] }),
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
    }
  )

  .get('/text/presets', () => textService.listPresets())

  .get('/text/operations', () => textService.listOperations())

  // ─── Jobs ──────────────────────────────────────────
  .get(
    '/jobs',
    async ({ query, userId }) => jobService.list(userId, query),
    { query: JobListQuerySchema }
  )

  .get('/jobs/:id', async ({ params: { id }, userId }) => {
    const job = await jobService.getStatus(userId, id);
    if (!job) throw new ApiError('JOB_NOT_FOUND', 'Job not found', 404);
    return job;
  })

  // ─── Upload ────────────────────────────────────────
  .post(
    '/upload',
    async ({ body, userId }) => uploadService.createUpload(userId, body),
    {
      body: t.Object({
        filename: t.String({ minLength: 1, maxLength: 255 }),
        size: t.Number({ minimum: 1 }),
      }),
    }
  )

  // ─── Usage ─────────────────────────────────────────
  .get('/usage/current', async ({ userId }) => {
    const user = await UserModel.findOne({
      $or: [{ oderId: userId }, { _id: userId }],
    }).lean();

    const periodStart = user?.subscription?.currentPeriodStart;
    const periodEnd = user?.subscription?.currentPeriodEnd;

    return usageService.getCurrentUsage(userId, periodStart, periodEnd);
  });
