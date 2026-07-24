import { Elysia, t } from 'elysia';
import { validateSuperAdmin } from '../../middlewares/super-admin';
import { adminService } from './admin.service';

export const adminRoutes = new Elysia({ prefix: '/admin' })
  .use(validateSuperAdmin)

  .get('/overview', async () => {
    return await adminService.getOverview();
  })

  .get('/users', async ({ query }) => {
    return await adminService.listUsers({
      search: query.search,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }, {
    query: t.Object({
      search: t.Optional(t.String()),
      page: t.Optional(t.Numeric({ minimum: 1 })),
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
    }),
  })

  .get('/users/:id', async ({ params }) => {
    return await adminService.getUser(params.id);
  })

  .get('/jobs', async ({ query }) => {
    return await adminService.listJobs({
      status: query.status,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }, {
    query: t.Object({
      status: t.Optional(t.Union([
        t.Literal('created'),
        t.Literal('pending'),
        t.Literal('processing'),
        t.Literal('completed'),
        t.Literal('failed'),
      ])),
      page: t.Optional(t.Numeric({ minimum: 1 })),
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
    }),
  })

  .get('/metrics', async ({ query }) => {
    return await adminService.getMetrics(query.days ?? 30);
  }, {
    query: t.Object({
      days: t.Optional(t.Numeric({ minimum: 1, maximum: 90 })),
    }),
  })

  .get('/health', async () => {
    return await adminService.getHealth();
  });
