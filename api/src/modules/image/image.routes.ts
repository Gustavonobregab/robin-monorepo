import { Elysia, t } from 'elysia';
import { validateAuth } from '../../middlewares/auth';
import { imageService } from './image.service';
import { ImageOperationSchema, ImagePresetSchema } from './image.types';
import { jobResponse } from '../jobs/job.http';

export const imageRoutes = new Elysia({ prefix: '/image' })
  .use(validateAuth)

  .post(
    '/',
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
      detail: { summary: 'Create image compression job', tags: ['Image'] },
    },
  )

  .get('/presets', () => imageService.listPresets(), {
    detail: { summary: 'List image presets', tags: ['Image'] },
  })

  .get('/operations', () => imageService.listOperations(), {
    detail: { summary: 'List image operations', tags: ['Image'] },
  });
