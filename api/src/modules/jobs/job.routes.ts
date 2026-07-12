import { Elysia, t } from 'elysia';
import { validateAuth } from '../../middlewares/auth';
import { jobService } from './job.service';
import { JobListQuerySchema } from './job.types';
import { ApiError } from '../../utils/api-error';

export const jobRoutes = new Elysia({ prefix: '/jobs' })
  .use(validateAuth)

  .get(
    '/',
    async ({ query, userId }) => jobService.list(userId, query),
    {
      query: JobListQuerySchema,
      detail: {
        summary: 'List jobs',
        tags: ['Jobs'],
      },
    },
  )

  .get(
    '/:id',
    async ({ params: { id }, query, userId }) => {
      const job = await jobService.getStatus(userId, id, query.wait ?? 0);

      if (!job) {
        throw new ApiError('JOB_NOT_FOUND', 'Job not found', 404);
      }

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
    },
  );
