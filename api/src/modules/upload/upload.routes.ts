import { Elysia, t } from 'elysia';
import { validateAuth } from '../../middlewares/auth';
import { uploadService } from './upload.service';

export const uploadRoutes = new Elysia({ prefix: '/upload' })
  .use(validateAuth)
  .post(
    '/',
    async ({ body, userId }) => uploadService.createUpload(userId, body),
    {
      body: t.Object({
        filename: t.String({ minLength: 1, maxLength: 255 }),
        size: t.Number({ minimum: 1 }),
      }),
      detail: {
        summary: 'Create a presigned upload URL',
        tags: ['Upload'],
      },
    },
  );
