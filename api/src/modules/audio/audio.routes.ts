import { Elysia, t } from 'elysia';
import { validateAuth } from '../../middlewares/auth';
import { audioService } from './audio.service';
import { AudioOperationSchema, AudioPresetSchema } from './audio.types';
import { jobResponse } from '../jobs/job.http';

export const audioRoutes = new Elysia({ prefix: '/audio' })
  .use(validateAuth)

  .post(
    '/',
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
          t.Array(AudioOperationSchema, {
            minItems: 1,
            maxItems: 10,
          })
        ),
        webhookUrl: t.Optional(t.String({ format: 'uri' })),
      }),
      headers: t.Object({
        'idempotency-key': t.Optional(t.String({ minLength: 1, maxLength: 255 })),
      }),
      detail: {
        summary: 'Create audio processing job',
        tags: ['Audio'],
      },
    }
  )

  .get('/presets', () => audioService.listPresets())

  .get('/operations', () => audioService.listOperations());
