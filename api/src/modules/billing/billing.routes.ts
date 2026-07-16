import { Elysia, t } from 'elysia';
import { validateAuth } from '../../middlewares/auth';
import { billingService } from './billing.service';

export const billingRoutes = new Elysia({ prefix: '/billing' })
  .use(validateAuth)

  .post(
    '/checkout',
    async ({ userId, body }) => {
      return await billingService.checkout(userId, body.planSlug, body.gateway);
    },
    {
      body: t.Object({
        planSlug: t.String({ minLength: 1 }),
        gateway: t.Optional(t.Union([t.Literal('stripe'), t.Literal('abacatepay')])),
      }),
    },
  )

  .post('/cancel', async ({ userId }) => {
    return await billingService.cancel(userId);
  });
