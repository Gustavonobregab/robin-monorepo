import { Elysia } from 'elysia';
import { apiRoutes } from './api.routes';

export const v1Routes = new Elysia({ prefix: '/v1' }).use(apiRoutes);
