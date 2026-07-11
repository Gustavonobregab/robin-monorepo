
import { Elysia } from 'elysia';
import { connectDatabase } from './config/database';
import { apiErrorPlugin } from './utils/api-error';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';

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
const { healthRoutes } = await import('./modules/health/health.routes');
const { v1Routes } = await import('./v1/index');

const app = new Elysia()
  .use(cors({
      origin: ['http://localhost:3000', 'http://localhost:3333', 'http://localhost:3002', 'https://robin-dashboard-amber.vercel.app'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Idempotency-Key'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }))
  .all('/api/auth/*', (c) => auth.handler(c.request))
  // Mounted before apiErrorPlugin: its global mapResponse would wrap the docs HTML in { success, data }
  .use(
    swagger({
      path: '/v1/docs',
      documentation: {
        info: {
          title: 'Robin Wood API',
          version: '1.0.0',
          description:
            'Public API for audio and text compression jobs. Authenticate every /v1 request with an API key: `Authorization: Bearer sk_live_...`. Responses are wrapped as `{ success, data }`.',
        },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              description: 'API key in the form sk_live_...',
            },
          },
        },
        security: [{ bearerAuth: [] }],
        tags: [
          { name: 'Audio', description: 'Audio compression jobs' },
          { name: 'Text', description: 'Text compression jobs' },
          { name: 'Jobs', description: 'Job status and listing' },
          { name: 'Upload', description: 'Presigned file uploads' },
          { name: 'Usage', description: 'Usage and quota' },
          { name: 'Health', description: 'Service health' },
        ],
      },
      // Allowlist: only /v1/* and /health are public API surface; everything
      // else (dashboard session routes) must never leak into the docs
      exclude: [/^\/(?!v1(\/|$)|health$)/],
    })
  )
  .use(apiErrorPlugin)
  .use(healthRoutes)
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
