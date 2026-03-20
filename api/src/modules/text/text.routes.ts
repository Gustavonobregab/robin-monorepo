import { Elysia, t } from 'elysia';
import { validateAuth } from '../../middlewares/auth';
import { textService } from './text.service';
import { TextOperationSchema, TextPresetSchema } from './text.types';
import { jobService } from '../jobs/job.service';
import { ApiError } from '../../utils/api-error';

export const textRoutes = new Elysia({ prefix: '/text' })
  .use(validateAuth)

  .post(
    '/',
    async ({ body, userId }) => textService.processText(userId, body),
    {
      body: t.Object({
        text: t.Optional(t.String({ maxLength: 5_000_000 })),
        fileId: t.Optional(t.String()),
        preset: t.Optional(TextPresetSchema),
        operations: t.Optional(
          t.Array(TextOperationSchema, {
            minItems: 1,
            maxItems: 10,
          })
        ),
      }),
      detail: {
        summary: 'Create text processing job',
        tags: ['Text'],
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

      return job;
    },
    {
      detail: {
        summary: 'Get text job status',
        tags: ['Text'],
      },
    }
  )

  .get('/presets', () => textService.listPresets())

  .get('/operations', () => textService.listOperations());
