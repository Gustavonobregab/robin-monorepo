import { Elysia } from 'elysia';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400
  ) {
    super(message);
  }
}

export const apiErrorPlugin = new Elysia({ name: 'api-error' })
  .error({ API_ERROR: ApiError })
  .onError({ as: 'global' }, ({ error, code, set }) => {
    if (code === 'API_ERROR') {
      set.status = error.status;
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      };
    }

    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message
        }
      };
    }

    if (code === 'NOT_FOUND') {
      set.status = 404;
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found'
        }
      };
    }

    const message = error instanceof Error ? error.message : 'Internal server error';
    
    console.error(`[INTERNAL_ERROR]`, error);

    const isDev = process.env.NODE_ENV !== 'production';

    set.status = 500;
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: isDev ? message : 'Internal server error',
      }
    };
  })
  .mapResponse({ as: 'global' }, ({ response, set }) => {
    if (response && typeof response === 'object' && 'error' in (response as object)) {
      return Response.json(response);
    }

    return Response.json({
      success: true,
      data: response
    });
  });
