import { Elysia, t } from 'elysia';
import { validateAuth } from '../../middlewares/auth';
import { uploadService } from './upload.service';

export const uploadRoutes = new Elysia({ prefix: '/upload' })
  .use(validateAuth)
  .post(
    '/',
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
      detail: {
        summary: 'Upload audio file',
        tags: ['Upload'],
      },
    }
  )
  .post(
    '/document',
    async ({ body, userId }) => {
      const { file } = body;
      return uploadService.uploadFile(userId, file);
    },
    {
      body: t.Object({
        file: t.File({
          maxSize: '100m',
        }),
      }),
      detail: {
        summary: 'Upload document file',
        tags: ['Upload'],
      },
    }
  );
