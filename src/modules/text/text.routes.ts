import { Elysia, t } from 'elysia';
import { validateApiKey } from '../../middlewares/api-key';
import { textService } from './text.service';
import { TextOperationSchema, TextPresetSchema } from './text.types';
import { jobService } from '../jobs/job.service';
import { ApiError } from '../../utils/api-error';

export const textRoutes = new Elysia({ prefix: '/text' })
  .use(validateApiKey)

  .post(
    '/',
    async ({ body, userId }) => {
      const { job } = await textService.processText(userId, body);
      return {
        data: job,
      };
    },
    {
      body: t.Object({
        textUrl: t.String({ format: 'uri' }),
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

      return { data: job };
    },
    {
      detail: {
        summary: 'Get text job status',
        tags: ['Text'],
      },
    }
  )

  .get('/presets', () => {
    const result = textService.listPresets();
    return {
      data: result,
    };
  })

  .get('/operations', () => {
    const result = textService.listOperations();
    return {
      data: result,
    };
  });
