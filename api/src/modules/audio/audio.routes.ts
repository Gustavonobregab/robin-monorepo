import { Elysia, t } from 'elysia';
import { validateAuth } from '../../middlewares/auth';
import { audioService } from './audio.service';
import { AudioOperationSchema, AudioPresetSchema } from './audio.types';

export const audioRoutes = new Elysia({ prefix: '/audio' })
  .use(validateAuth)

  .post(
    '/',
    async ({ body, userId }) => {
        const { job } = await audioService.processAudio(userId, body);
        return job;
      },
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
      detail: {
        summary: 'Create audio processing job',
        tags: ['Audio'],
      },
    }
  )

  .get('/presets', () => audioService.listPresets())

  .get('/operations', () => audioService.listOperations());
