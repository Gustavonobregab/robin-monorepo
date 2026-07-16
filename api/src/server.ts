
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
const { imageRoutes } = await import('./modules/image/image.routes');
const { jobRoutes } = await import('./modules/jobs/job.routes');
const { uploadRoutes } = await import('./modules/upload/upload.routes');
const { plansRoutes } = await import('./modules/plans/plans.routes');
const { healthRoutes } = await import('./modules/health/health.routes');
const { billingRoutes } = await import('./modules/billing/billing.routes');
const { billingWebhookRoutes } = await import('./modules/billing/billing.webhook.routes');
const { v1Routes } = await import('./v1/index');

const app = new Elysia()
  .use(cors({
      origin: ['http://localhost:3000', 'http://localhost:3333', 'http://localhost:3002', 'https://robin-dashboard-amber.vercel.app', 'https://robinzip.app', 'https://www.robinzip.app'],
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
          title: 'Robin API',
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
          { name: 'Image', description: 'Image compression jobs' },
          { name: 'Jobs', description: 'Job status and listing' },
          { name: 'Upload', description: 'Presigned file uploads' },
          { name: 'Usage', description: 'Usage and quota' },
          { name: 'Health', description: 'Service health' },
        ],
      },
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
  .use(imageRoutes)
  .use(jobRoutes)
  .use(uploadRoutes)
  .use(plansRoutes)
  .use(billingRoutes)
  .use(billingWebhookRoutes)
  .use(v1Routes)
  app.listen(3002);
