import { Elysia, t } from 'elysia';
import { audioService } from '../modules/audio/audio.service';
import { textService } from '../modules/text/text.service';
import { uploadService } from '../modules/upload/upload.service';
import { usageService } from '../modules/usage/usage.service';
import { jobService } from '../modules/jobs/job.service';
import { AudioOperationSchema, AudioPresetSchema } from '../modules/audio/audio.types';
import { TextOperationSchema, TextPresetSchema } from '../modules/text/text.types';
import { ApiError } from '../utils/api-error';
import { UserModel } from '../modules/users/users.model';

export const apiRoutes = new Elysia()

  // ─── Audio ─────────────────────────────────────────
  .post(
    '/audio',
    async ({ body, userId }) => {
      const { job } = await audioService.processAudio(userId, body);
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
    }
  )

  .get('/audio/jobs/:id', async ({ params: { id }, userId }) => {
    const job = await jobService.getStatus(userId, id);
    if (!job) throw new ApiError('JOB_NOT_FOUND', 'Job not found', 404);
    return job;
  })

  .get('/audio/presets', () => audioService.listPresets())

  .get('/audio/operations', () => audioService.listOperations())

  // ─── Text ──────────────────────────────────────────
  .post(
    '/text',
    async ({ body, userId }) => textService.processText(userId, body),
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
    }
  )

  .get('/text/jobs/:id', async ({ params: { id }, userId }) => {
    const job = await jobService.getStatus(userId, id);
    if (!job) throw new ApiError('JOB_NOT_FOUND', 'Job not found', 404);
    return job;
  })

  .get('/text/presets', () => textService.listPresets())

  .get('/text/operations', () => textService.listOperations())

  // ─── Upload ────────────────────────────────────────
  .post(
    '/upload',
    async ({ body, userId }) => {
      const { audio } = body;
      return uploadService.uploadAudio(userId, audio);
    },
    {
      body: t.Object({
        audio: t.File({
          maxSize: '100m',
          type: ['audio/mpeg', 'audio/wav', 'audio/x-wav'],
        }),
      }),
    }
  )

  .post(
    '/upload/document',
    async ({ body, userId }) => {
      const { file } = body;
      return uploadService.uploadFile(userId, file);
    },
    {
      body: t.Object({
        file: t.File({ maxSize: '100m' }),
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
