import { Elysia, t } from 'elysia';
import { validateAuth } from '../../middlewares/auth';
import { textService } from './text.service';
import { TextOperationSchema, TextPresetSchema } from './text.types';

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
        webhookUrl: t.Optional(t.String({ format: 'uri' })),
      }),
      detail: {
        summary: 'Create text processing job',
        tags: ['Text'],
      },
    }
  )

  .get('/presets', () => textService.listPresets())

  .get('/operations', () => textService.listOperations());
