import type { TextOperationHandler } from '../types';
import type { TextOperationType } from '../../../modules/text/text.types';
import { trim } from './trim';
import { shorten } from './shorten';
import { minify } from './minify';
import { compress } from './compress';
import { jsonToToon } from './json-to-toon';

const handlers = new Map<string, TextOperationHandler<TextOperationType>>();

function register(handler: TextOperationHandler<TextOperationType>) {
  handlers.set(handler.type, handler);
}

register(trim);
register(shorten);
register(minify);
register(compress);
register(jsonToToon);

export function getHandler(type: string): TextOperationHandler<TextOperationType> {
  const handler = handlers.get(type);

  if (!handler) {
    throw new Error(`No handler registered for text operation: ${type}`);
  }

  return handler;
}
