import { Elysia } from 'elysia';
import { keysService } from '../modules/keys/keys.service';
import { redisConnection } from '../config/redis';
import { ApiError } from '../utils/api-error';

const RATE_LIMIT_PER_MINUTE = Number(process.env.API_RATE_LIMIT_PER_MINUTE ?? 60);
const WINDOW_MS = 60_000;

async function consumeRateLimit(keyId: string): Promise<{ remaining: number; allowed: boolean }> {
  const window = Math.floor(Date.now() / WINDOW_MS);
  const counterKey = `ratelimit:${keyId}:${window}`;

  const count = await redisConnection.incr(counterKey);
  if (count === 1) {
    await redisConnection.expire(counterKey, WINDOW_MS / 1000);
  }

  return {
    remaining: Math.max(0, RATE_LIMIT_PER_MINUTE - count),
    allowed: count <= RATE_LIMIT_PER_MINUTE,
  };
}

export const apiKeyAuth = new Elysia({ name: 'api-key-auth' })
  .derive({ as: 'scoped' }, async ({ request, set }) => {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      throw new ApiError('API_KEY_REQUIRED', 'Authorization header is required', 401);
    }

    if (!authHeader.startsWith('Bearer sk_live_')) {
      throw new ApiError('INVALID_API_KEY_FORMAT', 'Invalid API key format. Expected: Bearer sk_live_*', 401);
    }

    const apiKey = authHeader.replace('Bearer ', '');
    const { userId, keyId } = await keysService.validateApiKey(apiKey);

    const { remaining, allowed } = await consumeRateLimit(keyId);

    set.headers['X-RateLimit-Limit'] = String(RATE_LIMIT_PER_MINUTE);
    set.headers['X-RateLimit-Remaining'] = String(remaining);

    if (!allowed) {
      set.headers['Retry-After'] = String(Math.ceil((WINDOW_MS - (Date.now() % WINDOW_MS)) / 1000));
      throw new ApiError('RATE_LIMITED', 'Rate limit exceeded. Try again shortly.', 429);
    }

    const requestId = `req_${crypto.randomUUID()}`;
    set.headers['X-Request-Id'] = requestId;

    return {
      userId,
      apiKeyId: keyId,
      requestId,
    };
  });
