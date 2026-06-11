import { Elysia } from 'elysia';
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
    async ({ params: { id }, userId }) => {
      const job = await jobService.getStatus(userId, id);

      if (!job) {
        throw new ApiError('JOB_NOT_FOUND', 'Job not found', 404);
      }

      return job;
    },
    {
      detail: {
        summary: 'Get job status',
        tags: ['Jobs'],
      },
    },
  );
