
import { Elysia } from 'elysia';
import { connectDatabase } from './config/database';
import { apiErrorPlugin } from './utils/api-error';
import { cors } from '@elysiajs/cors';

await connectDatabase();

const { auth } = await import('./config/auth');
const { keysRoutes } = await import('./modules/keys/keys.routes');
const { usageRoutes } = await import('./modules/usage/usage.routes');
const { usersRoutes } = await import('./modules/users/users.routes');
const { audioRoutes } = await import('./modules/audio/audio.routes');
const { textRoutes } = await import('./modules/text/text.routes');
const { jobRoutes } = await import('./modules/jobs/job.routes');
const { uploadRoutes } = await import('./modules/upload/upload.routes');
const { plansRoutes } = await import('./modules/plans/plans.routes');
const { v1Routes } = await import('./v1/index');

const app = new Elysia()
  .use(cors({
      origin: ['http://localhost:3000', 'http://localhost:3333', 'http://localhost:3002', 'https://robin-dashboard-amber.vercel.app'],
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
  .use(jobRoutes)
  .use(uploadRoutes)
  .use(plansRoutes)
  .use(v1Routes)
  app.listen(3002);
