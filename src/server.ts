
import { Elysia } from 'elysia';
import { connectDatabase } from './config/database';
import { auth } from './config/auth';
import { apiErrorPlugin } from './utils/api-error';
import { cors } from '@elysiajs/cors';
const { keysRoutes } = await import('./modules/keys/keys.routes');
const { usageRoutes } = await import('./modules/usage/usage.routes');
const { usersRoutes } = await import('./modules/users/users.routes');
const { audioRoutes } = await import('./modules/audio/audio.routes');
const { textRoutes } = await import('./modules/text/text.routes');

await connectDatabase();

const app = new Elysia()
  .use(cors({
      origin: "http://localhost:3333",
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }))
  .all('/api/auth/*', (c) => auth.handler(c.request))
  .use(apiErrorPlugin)
  .use(keysRoutes)
  .use(usageRoutes)
  .use(usersRoutes)
  .use(audioRoutes)
  .use(textRoutes)
  app.listen(3002);
