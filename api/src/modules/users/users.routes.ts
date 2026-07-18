import { Elysia, t } from 'elysia';
import { validateAuth } from '../../middlewares/auth';
import { usersService } from './users.service';

export const usersRoutes = new Elysia({ prefix: '/users' })
  .use(validateAuth)

  .get('/me', async ({ userId }) => {
    return await usersService.getProfile(userId);
  })

  .patch('/me', async ({ userId, body }) => {
    return await usersService.updateProfile(userId, body);
  }, {
    body: t.Object({
      name: t.String({ minLength: 2 }),
    }),
  })

  .patch('/me/onboarding', async ({ userId, body }) => {
    return await usersService.updateOnboarding(userId, body);
  }, {
    body: t.Object({
      role: t.Optional(t.Union([
        t.Literal('developer'),
        t.Literal('founder'),
        t.Literal('agency'),
        t.Literal('company'),
      ])),
      useCases: t.Optional(t.Array(
        t.Union([t.Literal('text'), t.Literal('audio'), t.Literal('image')]),
        { minItems: 1 },
      )),
      usageMode: t.Optional(t.Union([
        t.Literal('site'),
        t.Literal('api'),
        t.Literal('both'),
      ])),
      completed: t.Optional(t.Boolean()),
    }),
  })

  .put('/webhook-config', async ({ userId, body }) => {
    return await usersService.updateWebhookUrl(userId, body.url);
  }, {
    body: t.Object({ url: t.String({ format: 'uri' }) }),
  });
