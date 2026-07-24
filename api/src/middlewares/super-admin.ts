import { Elysia } from 'elysia';
import { auth } from '../config/auth';
import { ApiError } from '../utils/api-error';

const allowlist = new Set(
  (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export function isSuperAdminEmail(email: string): boolean {
  return allowlist.has(email.toLowerCase());
}

export const validateSuperAdmin = new Elysia({ name: 'validate-super-admin' })
  .derive({ as: 'scoped' }, async ({ request }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      throw new ApiError('UNAUTHORIZED', 'Unauthorized', 401);
    }

    if (!isSuperAdminEmail(session.user.email)) {
      throw new ApiError('FORBIDDEN', 'Forbidden', 403);
    }

    return {
      userId: session.user.id,
    };
  });
