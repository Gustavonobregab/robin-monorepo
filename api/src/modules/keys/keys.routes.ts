import { Elysia, t } from 'elysia';
import { keysService } from './keys.service';
import { validateAuth } from '../../middlewares/auth';

export const keysRoutes = new Elysia({ prefix: '/keys' })
  .use(validateAuth)
  .get('/', async ({ userId }) => {
    return await keysService.getKeysByUserId(userId);
  })
  .post(
    '/',
    async ({ userId, body }) => {
      return await keysService.createKey(userId, body.name);
    },
    {
      body: t.Object({ name: t.String({ minLength: 1, maxLength: 50 }) }),
    }
  )
  .get(
    '/:id',
    async ({ userId, params }) => {
      return await keysService.getKeyById(userId, params.id);
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )
  .delete(
    '/:id',
    async ({ userId, params }) => {
      await keysService.revokeKey(userId, params.id);
      return { revoked: true };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  );