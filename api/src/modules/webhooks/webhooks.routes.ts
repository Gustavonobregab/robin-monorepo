import { Elysia, t } from 'elysia';
import { validateAuth } from '../../middlewares/auth';
import { webhooksService } from './webhooks.service';

export const webhooksRoutes = new Elysia({ prefix: '/webhooks' })
  .use(validateAuth)

  .get(
    '/deliveries',
    async ({ userId, query }) => webhooksService.listDeliveries(userId, query),
    {
      query: t.Object({
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        cursor: t.Optional(t.String()),
      }),
    }
  );
