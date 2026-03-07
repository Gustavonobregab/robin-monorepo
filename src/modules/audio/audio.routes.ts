import { Elysia, t } from 'elysia';
import { validateApiKey } from '../../middlewares/api-key';
import { audioService } from './audio.service';
import { AudioOperationSchema, AudioPresetSchema } from './audio.types';
import { jobService } from '../jobs/job.service';
import { ApiError } from '../../utils/api-error';

export const audioRoutes = new Elysia({ prefix: '/audio' })
  .use(validateApiKey)

  .post(
    '/',
    async ({ body, userId }) => {
        const { job } = await audioService.processAudio(userId, body);
        return {
          data: job,
        };
      },
    {
      body: t.Object({
        audioUrl: t.String({ format: 'uri' }),
        preset: t.Optional(AudioPresetSchema),
        operations: t.Optional(
          t.Array(AudioOperationSchema, {
            minItems: 1,
            maxItems: 10,
          })
        ),
      }),
      detail: {
        summary: 'Create audio processing job',
        tags: ['Audio'],
      },
    }
  )

  .get(
    '/jobs/:id',
    async ({ params: { id } }) => {
      const job = await jobService.getStatus(id);

      if (!job) {
        throw new ApiError('JOB_NOT_FOUND', 'Job not found', 404);
      }

      return { data: job };
    },
    {
      detail: {
        summary: 'Get audio job status',
        tags: ['Audio'],
      },
    }
  )

  .get('/presets', () => {
    const result = audioService.listPresets();
    return {
      data: result,
    };
  })

  .get('/operations', () => {
    const result = audioService.listOperations();
    return {
      data: result,
    };
  });
