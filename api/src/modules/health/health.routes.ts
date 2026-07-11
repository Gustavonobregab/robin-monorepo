import { Elysia } from 'elysia';
import mongoose from 'mongoose';
import { redisConnection } from '../../config/redis';

const REDIS_PING_TIMEOUT_MS = 2_000;

async function checkRedis(): Promise<boolean> {
  // With maxRetriesPerRequest: null, a ping against a down Redis queues forever
  // instead of rejecting — only ping when the connection is actually ready
  if (redisConnection.status !== 'ready') return false;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      redisConnection.ping(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('redis ping timeout')), REDIS_PING_TIMEOUT_MS);
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export const healthRoutes = new Elysia().get(
  '/health',
  async () => {
    const mongo = mongoose.connection.readyState === 1;
    const redis = await checkRedis();

    return {
      status: mongo && redis ? ('ok' as const) : ('degraded' as const),
      mongo,
      redis,
      uptime: process.uptime(),
    };
  },
  {
    detail: {
      summary: 'Service health check',
      description: 'Public endpoint reporting MongoDB and Redis connectivity. No authentication required.',
      tags: ['Health'],
      security: [],
    },
  }
);
