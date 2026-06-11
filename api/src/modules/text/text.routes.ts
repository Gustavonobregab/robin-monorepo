import { Elysia, t } from 'elysia';
import { validateAuth } from '../../middlewares/auth';
import { textService } from './text.service';
import { TextOperationSchema, TextPresetSchema } from './text.types';

export const textRoutes = new Elysia({ prefix: '/text' })
  .use(validateAuth)

  .post(
    '/',
    async ({ body, userId, headers }) =>
      textService.processText(userId, { ...body, idempotencyKey: headers['idempotency-key'] }),
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
      headers: t.Object({
        'idempotency-key': t.Optional(t.String({ minLength: 1, maxLength: 255 })),
      }),
      detail: {
        summary: 'Create text processing job',
        tags: ['Text'],
      },
    }
  )

  .get('/presets', () => textService.listPresets())

  .get('/operations', () => textService.listOperations());
